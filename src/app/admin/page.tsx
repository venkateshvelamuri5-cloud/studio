"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Users,
  TrendingUp,
  QrCode,
  IndianRupee,
  Route as RouteIcon,
  Sparkles,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  Tag,
  Ticket,
  Settings,
  Wallet
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, limit, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'routes' | 'users' | 'alerts' | 'ai-architect' | 'vouchers'>('dashboard');
  const [vizagUpi, setVizagUpi] = useState('');
  const [vzmUpi, setVzmUpi] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Route Management State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    routeName: '',
    city: 'Vizag',
    baseFare: 20,
    status: 'active',
    stops: [{ name: '', lat: 0, lng: 0 }]
  });
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [newFareValue, setNewFareValue] = useState(20);

  // Voucher Management State
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(5);

  // AI Architect State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    studentDemandPatterns: "High demand from South Campus hub between 4-6 PM.",
    historicalTrafficData: "Heavy congestion on NH-16 during peak morning hours.",
    preferredServiceHours: "6 AM to 11 PM",
  });
  const [aiResult, setAiResult] = useState<any>(null);

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  useEffect(() => {
    if (globalConfig) {
      setVizagUpi((globalConfig as any).vizagUpiId || '');
      setVzmUpi((globalConfig as any).vzmUpiId || '');
    }
  }, [globalConfig]);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && !authLoading) {
      router.push('/admin/login');
    }
  }, [profile, authLoading, router]);

  const tripsQuery = useMemo(() => db ? query(collection(db, 'trips'), orderBy('startTime', 'desc'), limit(100)) : null, [db]);
  const { data: allTrips } = useCollection(tripsQuery);
  
  const usersQuery = useMemo(() => db ? query(collection(db, 'users')) : null, [db]);
  const { data: allUsers } = useCollection(usersQuery);

  const routesQuery = useMemo(() => db ? query(collection(db, 'routes')) : null, [db]);
  const { data: allRoutes } = useCollection(routesQuery);

  const alertsQuery = useMemo(() => db ? query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(50)) : null, [db]);
  const { data: allAlerts } = useCollection(alertsQuery);

  const vouchersQuery = useMemo(() => db ? query(collection(db, 'vouchers'), orderBy('createdAt', 'desc')) : null, [db]);
  const { data: allVouchers } = useCollection(vouchersQuery);

  const stats = useMemo(() => {
    if (!allTrips) return { revenue: 0, payouts: 0, commissions: 0 };
    const completed = allTrips.filter(t => t.status === 'completed');
    const revenue = completed.reduce((acc, t) => acc + (t.totalYield || 0), 0);
    const payouts = completed.reduce((acc, t) => acc + (t.driverShare || 0), 0);
    return { revenue, payouts, commissions: revenue - payouts };
  }, [allTrips]);

  const saveConfig = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'global'), {
        vizagUpiId: vizagUpi,
        vzmUpiId: vzmUpi,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Grid Config Synced" });
    } catch {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'routes'), {
        ...newRoute,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Route Deployed" });
      setIsRouteModalOpen(false);
      setNewRoute({ routeName: '', city: 'Vizag', baseFare: 20, status: 'active', stops: [{ name: '', lat: 0, lng: 0 }] });
    } catch {
      toast({ variant: "destructive", title: "Creation Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateFare = async (id: string, fare: number) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', id), { baseFare: fare });
      toast({ title: "Fare Updated" });
      setEditingRouteId(null);
    } catch {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleCreateVoucher = async () => {
    if (!db || !newVoucherCode) return;
    try {
      await addDoc(collection(db, 'vouchers'), {
        code: newVoucherCode.toUpperCase(),
        discountAmount: newVoucherDiscount,
        isActive: true,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Voucher Active" });
      setNewVoucherCode('');
    } catch {
      toast({ variant: "destructive", title: "Creation Failed" });
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'vouchers', id));
      toast({ title: "Voucher Removed" });
    } catch {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', id));
      toast({ title: "Route Removed" });
    } catch {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const resolveAlert = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'alerts', id));
      toast({ title: "SOS Resolved" });
    } catch {
      toast({ variant: "destructive", title: "Resolution Failed" });
    }
  };

  const handleAiGeneration = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
      toast({ title: "AI Optimization Complete" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Generation Failed" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden">
      <aside className="w-72 bg-black/20 flex flex-col shrink-0 border-r border-white/5 shadow-sm z-20 backdrop-blur-3xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary rounded-xl text-black shadow-lg shadow-primary/20"><ConnectingDotsLogo className="h-5 w-5" /></div>
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase text-primary text-glow leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'routes', label: 'Corridors', icon: RouteIcon },
            { id: 'vouchers', label: 'Vouchers', icon: Ticket },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'payments', label: 'Payments', icon: QrCode },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
            { id: 'ai-architect', label: 'AI Architect', icon: Sparkles },
          ].map((item) => (
            <Button 
              key={item.id} variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all border-none ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </Button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 font-black uppercase italic h-14 px-5" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-background border-b border-white/5 px-10 flex items-center justify-between backdrop-blur-3xl">
          <div>
            <h2 className="text-3xl font-black font-headline text-foreground italic uppercase tracking-tighter leading-none">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">Central Ops Control</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[9px] tracking-widest px-6 py-2 rounded-full">System Pulse: 100%</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Revenue', value: `₹${stats.revenue.toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Payouts', value: `₹${stats.payouts.toFixed(0)}`, icon: Wallet, color: 'text-primary/80', bg: 'bg-primary/10' },
                  { label: 'Earnings', value: `₹${stats.commissions.toFixed(0)}`, icon: TrendingUp, color: 'text-primary/60', bg: 'bg-primary/10' },
                  { label: 'Trips', value: allTrips?.filter(t => t.status === 'active').length || 0, icon: Navigation, color: 'text-primary/40', bg: 'bg-primary/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl shadow-sm">
                    <CardContent className="p-8">
                      <div className={`p-4 ${metric.bg} rounded-2xl w-fit mb-6 shadow-sm`}><metric.icon className={`h-6 w-6 ${metric.color}`} /></div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground font-headline italic leading-none tracking-tighter">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="glass-card rounded-3xl shadow-sm overflow-hidden">
                <CardHeader className="p-10 border-b border-white/5 bg-white/5"><CardTitle className="text-xl font-black italic uppercase text-foreground flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /> Active Corridors</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                        <th className="py-6 px-10">Route</th>
                        <th className="py-6">Operator</th>
                        <th className="py-6">Status</th>
                        <th className="py-8 px-10 text-right">Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allTrips?.map((trip: any) => (
                        <tr key={trip.id} className="hover:bg-white/5 transition-all">
                          <td className="py-8 px-10"><span className="font-black text-foreground uppercase italic text-xs">{trip.routeName}</span></td>
                          <td className="py-8 text-[11px] font-bold text-muted-foreground italic uppercase">{trip.driverName}</td>
                          <td className="py-8">
                            <Badge className={`${trip.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'} border-none text-[8px] font-black uppercase px-3 py-1`}>
                              {trip.status}
                            </Badge>
                          </td>
                          <td className="py-8 px-10 text-right font-black text-foreground italic text-lg">₹{(trip.totalYield || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-center">
                 <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Route Matrix</h3>
                 <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
                    <DialogTrigger asChild>
                       <Button className="bg-primary text-black rounded-2xl font-black uppercase italic h-14 px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-all text-sm"><Plus className="mr-2 h-5 w-5" /> Create Route</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-background border border-white/10 rounded-3xl p-12 shadow-2xl">
                       <DialogHeader><DialogTitle className="text-4xl font-black italic uppercase text-primary leading-none tracking-tighter">New Corridor</DialogTitle></DialogHeader>
                       <div className="space-y-8 py-8 max-h-[50vh] overflow-y-auto px-2 custom-scrollbar">
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Route Name</Label>
                                <Input value={newRoute.routeName} onChange={e => setNewRoute({...newRoute, routeName: e.target.value})} placeholder="e.g. Express Line" className="h-14 rounded-2xl bg-white/5 border-white/10 font-black italic text-lg px-6" />
                             </div>
                             <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">City Node</Label>
                                <select value={newRoute.city} onChange={e => setNewRoute({...newRoute, city: e.target.value})} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 font-black italic text-lg px-6 appearance-none">
                                   <option value="Vizag" className="bg-background">Vizag</option>
                                   <option value="Vizianagaram" className="bg-background">Vizianagaram</option>
                                </select>
                             </div>
                          </div>
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Base Fare (₹)</Label>
                             <Input type="number" value={newRoute.baseFare} onChange={e => setNewRoute({...newRoute, baseFare: parseInt(e.target.value)})} className="h-14 rounded-2xl bg-white/5 border-white/10 font-black italic text-lg px-6" />
                          </div>
                       </div>
                       <DialogFooter className="pt-6">
                          <Button onClick={handleCreateRoute} disabled={isSaving} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-xl shadow-primary/20">
                             {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Deploy Route"}
                          </Button>
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {allRoutes?.map((route: any) => (
                    <Card key={route.id} className="glass-card rounded-3xl p-10 shadow-sm group overflow-hidden relative">
                       <div className="flex justify-between items-start mb-8 relative z-10">
                          <div>
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">{route.city}</p>
                             <h4 className="text-2xl font-black italic uppercase text-foreground tracking-tighter leading-none">{route.routeName}</h4>
                          </div>
                          <Badge className={`${route.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'} border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full`}>{route.status}</Badge>
                       </div>
                       <div className="space-y-4 mb-10 relative z-10">
                          <div className="flex items-center gap-4 text-primary font-black italic">
                             <IndianRupee className="h-5 w-5" />
                             {editingRouteId === route.id ? (
                               <div className="flex gap-3 items-center">
                                 <Input type="number" value={newFareValue} onChange={e => setNewFareValue(parseInt(e.target.value))} className="h-10 w-24 bg-white/5 border-white/10 rounded-lg text-sm font-black" />
                                 <Button size="sm" onClick={() => handleUpdateFare(route.id, newFareValue)} className="h-10 px-4 bg-primary text-black font-black">Sync</Button>
                               </div>
                             ) : (
                               <div className="flex items-center gap-3">
                                 <span className="text-xl font-black tracking-tighter">₹{route.baseFare}</span>
                                 <Button variant="ghost" size="icon" onClick={() => { setEditingRouteId(route.id); setNewFareValue(route.baseFare); }} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Settings className="h-4 w-4" /></Button>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="flex gap-3 relative z-10">
                          <Button variant="ghost" onClick={() => handleDeleteRoute(route.id)} className="flex-1 bg-destructive/10 text-destructive h-14 rounded-2xl font-black uppercase italic text-[10px] border border-destructive/20 hover:bg-destructive hover:text-white transition-all"><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
                       </div>
                    </Card>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="max-w-2xl glass-card rounded-3xl p-12 shadow-sm space-y-10">
                  <div className="flex items-center gap-5">
                     <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Tag className="h-8 w-8" /></div>
                     <div>
                        <h3 className="text-3xl font-black italic uppercase text-foreground leading-none tracking-tighter">Voucher Hub</h3>
                        <p className="text-[11px] font-bold text-muted-foreground italic mt-2">Deploy regional promo keys.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 relative z-10">
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Key</Label>
                        <Input value={newVoucherCode} onChange={e => setNewVoucherCode(e.target.value)} placeholder="AAGO10" className="h-16 rounded-2xl bg-white/5 border-white/10 font-black italic text-2xl px-8 text-primary uppercase" />
                     </div>
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Amount (₹)</Label>
                        <Input type="number" value={newVoucherDiscount} onChange={e => setNewVoucherDiscount(parseInt(e.target.value))} className="h-16 rounded-2xl bg-white/5 border-white/10 font-black italic text-2xl px-8 text-foreground" />
                     </div>
                  </div>

                  <Button onClick={handleCreateVoucher} className="w-full h-18 bg-primary text-black font-black uppercase italic text-xl rounded-2xl shadow-xl shadow-primary/20">
                     Activate Key
                  </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {allVouchers?.map((v: any) => (
                    <Card key={v.id} className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-sm flex items-center justify-between">
                       <div className="space-y-1">
                          <h4 className="text-3xl font-black italic text-foreground uppercase tracking-tighter">{v.code}</h4>
                          <p className="text-[10px] font-bold text-primary italic uppercase tracking-widest">₹{v.discountAmount} Discount</p>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(v.id)} className="text-destructive hover:bg-destructive/10 rounded-xl h-12 w-12 border border-white/5"><Trash2 className="h-5 w-5" /></Button>
                    </Card>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">User Vault</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input placeholder="Search user..." className="h-14 pl-14 rounded-2xl bg-white/5 border-white/10 shadow-sm font-black italic text-sm" />
                  </div>
               </div>
               
               <Card className="glass-card rounded-3xl shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                          <th className="py-6 px-10">User</th>
                          <th className="py-6">Role</th>
                          <th className="py-6">City</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers?.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden italic">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <span>{u.fullName?.[0]}</span>}
                                   </div>
                                   <div>
                                      <p className="font-black text-foreground uppercase italic text-sm leading-none">{u.fullName}</p>
                                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">{u.phoneNumber}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-6">
                                <Badge className={`${u.role === 'admin' ? 'bg-primary text-black' : u.role === 'driver' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'} border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full`}>
                                   {u.role}
                                </Badge>
                             </td>
                             <td className="py-6 font-black italic text-muted-foreground text-xs uppercase">{u.city} Hub</td>
                             <td className="py-6 px-10 text-right">
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-xl h-10 w-10 border border-white/10"><ArrowUpRight className="h-5 w-5" /></Button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
               </Card>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-10 animate-in fade-in duration-700 max-w-4xl mx-auto">
              <Card className="glass-card rounded-3xl p-12 shadow-sm space-y-10">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-destructive/10 rounded-2xl"><AlertTriangle className="h-8 w-8 text-destructive" /></div>
                  <div>
                    <h3 className="text-4xl font-black italic uppercase text-foreground leading-none tracking-tighter">Emergency Hub</h3>
                    <p className="text-[11px] font-bold text-muted-foreground italic mt-2">Live safety telemetry.</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  {allAlerts?.map((alert: any) => (
                    <Card key={alert.id} className="p-10 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-8">
                          <div className="p-4 bg-destructive rounded-2xl text-foreground animate-pulse"><AlertTriangle className="h-8 w-8" /></div>
                          <div>
                             <h4 className="font-black text-foreground uppercase italic text-2xl leading-none tracking-tighter mb-1">{alert.type}</h4>
                             <p className="text-[10px] font-black text-destructive uppercase tracking-widest italic">{alert.userName} • {alert.city}</p>
                          </div>
                       </div>
                       <Button onClick={() => resolveAlert(alert.id)} className="bg-destructive text-foreground rounded-2xl h-16 px-8 font-black uppercase italic text-lg shadow-xl">Resolve</Button>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
