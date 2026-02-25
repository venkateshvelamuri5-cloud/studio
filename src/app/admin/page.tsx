
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Wallet,
  UserCheck,
  MapPin,
  Clock,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, limit, addDoc, deleteDoc, updateDoc, where } from 'firebase/firestore';
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
  const [searchQuery, setSearchQuery] = useState('');

  // AI Architect State
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    studentDemandPatterns: "High demand from Vizag Central to Engineering College during 8 AM - 10 AM.",
    historicalTrafficData: "Heavy congestion near the main junction between 9 AM and 10 AM.",
    preferredServiceHours: "6 AM to 9 PM daily.",
    numberOfShuttlesAvailable: 5
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New Route State
  const [newRoute, setNewRoute] = useState({ name: '', fare: 40, stops: '' });
  // New Voucher State
  const [newVoucher, setNewVoucher] = useState({ code: '', amount: 50 });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const globalConfigRef = useMemo(() => db ? doc(db, 'config', 'global') : null, [db]);
  const { data: globalConfig } = useDoc(globalConfigRef);

  useEffect(() => {
    if (globalConfig) {
      setVizagUpi((globalConfig as any).vizagUpiId || '');
      setVzmUpi((globalConfig as any).vzmUpiId || '');
    }
  }, [globalConfig]);

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/admin/login');
    }
    // Hard override for admin@aago.in even if profile is not fully loaded or role is wrong
    if (!authLoading && profile && profile.role !== 'admin' && user?.email !== 'admin@aago.in') {
      router.push('/admin/login');
    }
  }, [profile, authLoading, user, router]);

  const { data: allTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), orderBy('startTime', 'desc'), limit(50)) : null, [db]));
  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes')) : null, [db]));
  const { data: allAlerts } = useCollection(useMemo(() => db ? query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(20)) : null, [db]));
  const { data: allVouchers } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers'), orderBy('createdAt', 'desc')) : null, [db]));

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.referralCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber?.includes(searchQuery)
    );
  }, [allUsers, searchQuery]);

  const stats = useMemo(() => {
    if (!allTrips) return { revenue: 0, payouts: 0, commissions: 0 };
    const completed = allTrips.filter(t => t.status === 'completed');
    const revenue = completed.reduce((acc, t) => acc + (t.totalYield || 0), 0);
    const payouts = completed.reduce((acc, t) => acc + (t.driverShare || 0), 0);
    return { revenue, payouts, commissions: revenue - payouts };
  }, [allTrips]);

  const handleUpdateConfig = () => {
    if (!globalConfigRef) return;
    setIsSaving(true);
    setDoc(globalConfigRef, { vizagUpiId: vizagUpi, vzmUpiId: vzmUpi }, { merge: true })
      .then(() => toast({ title: "Grid Config Updated" }))
      .finally(() => setIsSaving(false));
  };

  const handleAddRoute = () => {
    if (!db || !newRoute.name) return;
    const stopsArray = newRoute.stops.split(',').map(s => ({ name: s.trim() }));
    addDoc(collection(db, 'routes'), {
      routeName: newRoute.name,
      baseFare: Number(newRoute.fare),
      stops: stopsArray,
      status: 'active',
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Route Deployed" });
      setNewRoute({ name: '', fare: 40, stops: '' });
    });
  };

  const handleDeleteRoute = (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'routes', id)).then(() => toast({ title: "Route Removed" }));
  };

  const handleAddVoucher = () => {
    if (!db || !newVoucher.code) return;
    addDoc(collection(db, 'vouchers'), {
      code: newVoucher.code.toUpperCase(),
      discountAmount: Number(newVoucher.amount),
      isActive: true,
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Voucher Issued" });
      setNewVoucher({ code: '', amount: 50 });
    });
  };

  const handleDeleteVoucher = (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'vouchers', id)).then(() => toast({ title: "Voucher Cancelled" }));
  };

  const handleRunAiArchitect = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
      toast({ title: "AI Generation Complete" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiRoute = (route: any) => {
    if (!db) return;
    addDoc(collection(db, 'routes'), {
      routeName: route.routeName,
      baseFare: 40,
      stops: route.stops.map((s: string) => ({ name: s })),
      status: 'active',
      createdAt: new Date().toISOString()
    }).then(() => toast({ title: "AI Route Applied" }));
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading || (profileLoading && user?.email !== 'admin@aago.in')) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

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
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all border-none ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <button className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 font-black uppercase italic h-14 px-5 rounded-xl transition-all" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Sign Out
            </button>
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

              <Card className="glass-card rounded-3xl shadow-sm overflow-hidden border-white/10">
                <CardHeader className="p-10 border-b border-white/5 bg-white/5"><CardTitle className="text-xl font-black italic uppercase text-foreground flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /> Recent Missions</CardTitle></CardHeader>
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
                            <Badge className={`${trip.status === 'completed' ? 'bg-primary/20 text-primary' : trip.status === 'active' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-muted-foreground'} border-none text-[8px] font-black uppercase px-3 py-1`}>
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
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Corridor Grid</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-black font-black uppercase italic rounded-xl h-12 px-6"><Plus className="mr-2 h-5 w-5" /> Add Route</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-white/10">
                      <DialogHeader><DialogTitle>New Corridor</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Route Name</Label>
                          <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="Vizag Central Express" />
                        </div>
                        <div className="space-y-2">
                          <Label>Base Fare (₹)</Label>
                          <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Stops (Comma Separated)</Label>
                          <Textarea value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Main Gate, Library, Hostels" />
                        </div>
                      </div>
                      <DialogFooter><Button onClick={handleAddRoute} className="bg-primary text-black font-black">Deploy Route</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {allRoutes?.map((route: any) => (
                   <Card key={route.id} className="bg-white/5 border-white/10 rounded-2xl p-6 relative group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="text-xl font-black italic uppercase text-foreground">{route.routeName}</h4>
                          <p className="text-[10px] font-black text-primary uppercase">₹{route.baseFare} / Scholar</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-5 w-5" /></Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Route Stops</p>
                        <div className="flex flex-wrap gap-2">
                          {route.stops?.map((s: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-[8px] font-black uppercase border-white/10">{s.name}</Badge>
                          ))}
                        </div>
                      </div>
                   </Card>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Voucher Vault</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-black font-black uppercase italic rounded-xl h-12 px-6"><Plus className="mr-2 h-5 w-5" /> Issue Code</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-white/10">
                      <DialogHeader><DialogTitle>New Voucher</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Promo Code</Label>
                          <Input value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})} placeholder="FREERIDE" />
                        </div>
                        <div className="space-y-2">
                          <Label>Discount Amount (₹)</Label>
                          <Input type="number" value={newVoucher.amount} onChange={e => setNewVoucher({...newVoucher, amount: Number(e.target.value)})} />
                        </div>
                      </div>
                      <DialogFooter><Button onClick={handleAddVoucher} className="bg-primary text-black font-black">Issue Voucher</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {allVouchers?.map((v: any) => (
                   <Card key={v.id} className="bg-white/5 border-white/10 rounded-2xl p-6 flex justify-between items-center group">
                      <div>
                        <h4 className="text-2xl font-black italic text-primary">{v.code}</h4>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">₹{v.discountAmount} OFF</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(v.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-5 w-5" /></Button>
                   </Card>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Scholar Vault</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input 
                      placeholder="Search name or code..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-14 pl-14 rounded-2xl bg-white/5 border-white/10 shadow-sm font-black italic text-sm" 
                     />
                  </div>
               </div>
               
               <Card className="glass-card rounded-3xl shadow-sm overflow-hidden border-white/10">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                          <th className="py-6 px-10">Identity</th>
                          <th className="py-6">Code</th>
                          <th className="py-6">Role</th>
                          <th className="py-6">Hub</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((u: any) => (
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
                                <Badge variant="outline" className="text-[9px] font-black uppercase italic border-primary/30 text-primary px-3 py-1">{u.referralCode || 'N/A'}</Badge>
                             </td>
                             <td className="py-6">
                                <Badge className={`${u.role === 'admin' ? 'bg-primary text-black' : u.role === 'driver' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'} border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full`}>
                                   {u.role}
                                </Badge>
                             </td>
                             <td className="py-6 font-black italic text-muted-foreground text-xs uppercase">{u.city}</td>
                             <td className="py-6 px-10 text-right">
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-xl h-10 w-10 border border-white/10"><UserCheck className="h-5 w-5" /></Button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
               </Card>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Hub Settlement</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Card className="bg-white/5 border-white/10 rounded-3xl p-10 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary"><MapPin className="h-6 w-6" /></div>
                      <h4 className="text-xl font-black italic uppercase">Vizag Hub Config</h4>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Merchant UPI ID</Label>
                      <Input value={vizagUpi} onChange={e => setVizagUpi(e.target.value)} placeholder="vizag@upi" className="h-14 font-black italic" />
                    </div>
                    <Button onClick={handleUpdateConfig} disabled={isSaving} className="w-full bg-primary text-black font-black uppercase italic h-14 rounded-xl">
                      {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />} Save Vizag Hub
                    </Button>
                  </Card>

                  <Card className="bg-white/5 border-white/10 rounded-3xl p-10 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary"><MapPin className="h-6 w-6" /></div>
                      <h4 className="text-xl font-black italic uppercase">VZM Hub Config</h4>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Merchant UPI ID</Label>
                      <Input value={vzmUpi} onChange={e => setVzmUpi(e.target.value)} placeholder="vzm@upi" className="h-14 font-black italic" />
                    </div>
                    <Button onClick={handleUpdateConfig} disabled={isSaving} className="w-full bg-primary text-black font-black uppercase italic h-14 rounded-xl">
                      {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />} Save VZM Hub
                    </Button>
                  </Card>
               </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Emergency Monitor</h3>
               <div className="space-y-4">
                 {(!allAlerts || allAlerts.length === 0) ? (
                   <div className="p-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 italic text-muted-foreground">No active SOS signals.</div>
                 ) : allAlerts.map((alert: any) => (
                   <Card key={alert.id} className="bg-destructive/5 border-destructive/20 border rounded-2xl p-8 flex items-center justify-between shadow-xl animate-pulse">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-destructive/10 rounded-2xl text-destructive"><AlertTriangle className="h-8 w-8" /></div>
                        <div>
                          <h4 className="text-xl font-black italic uppercase text-foreground">{alert.userName || 'Anonymous Scholar'}</h4>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{alert.city} • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <Button variant="ghost" onClick={() => deleteDoc(doc(db!, 'alerts', alert.id))} className="text-destructive font-black uppercase italic border border-destructive/20 rounded-xl px-6">Resolve Signal</Button>
                   </Card>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'ai-architect' && (
            <div className="space-y-10 animate-in fade-in duration-700 pb-20">
               <div className="max-w-4xl space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black italic uppercase text-primary text-glow tracking-tighter">AI Architect</h3>
                    <p className="text-lg font-bold text-muted-foreground italic">Optimize your shuttle network with generative intelligence.</p>
                  </div>

                  <Card className="bg-white/5 border-white/10 rounded-3xl p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Student Demand Patterns</Label>
                        <Textarea 
                          value={aiInput.studentDemandPatterns} 
                          onChange={e => setAiInput({...aiInput, studentDemandPatterns: e.target.value})}
                          className="min-h-[120px] bg-white/5 border-white/10 italic" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Historical Traffic Data</Label>
                        <Textarea 
                          value={aiInput.historicalTrafficData} 
                          onChange={e => setAiInput({...aiInput, historicalTrafficData: e.target.value})}
                          className="min-h-[120px] bg-white/5 border-white/10 italic" 
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleRunAiArchitect} 
                      disabled={isAiLoading} 
                      className="w-full bg-primary text-black font-black uppercase italic h-16 rounded-2xl text-lg shadow-2xl shadow-primary/20"
                    >
                      {isAiLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Architect Grid
                    </Button>
                  </Card>

                  {aiResult && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-8">
                      <Card className="bg-primary/5 border-primary/20 rounded-3xl p-10">
                        <h4 className="text-xl font-black italic uppercase mb-6 flex items-center gap-3"><CheckCircle2 className="text-primary" /> Architecture Summary</h4>
                        <p className="text-muted-foreground italic leading-relaxed">{aiResult.optimizationSummary}</p>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {aiResult.optimizedRoutes.map((route: any, i: number) => (
                          <Card key={i} className="bg-white/5 border-white/10 rounded-3xl p-8 space-y-6 group">
                            <div className="flex justify-between items-start">
                              <h5 className="text-2xl font-black italic uppercase text-foreground tracking-tighter">{route.routeName}</h5>
                              <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">{route.estimatedDurationMinutes} MIN</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground italic leading-relaxed">{route.description}</p>
                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase text-muted-foreground">AI Proposed Stops</p>
                              <div className="flex flex-wrap gap-2">
                                {route.stops.map((s: string, j: number) => (
                                  <Badge key={j} variant="outline" className="text-[8px] font-black uppercase border-white/10">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            <Button onClick={() => handleApplyAiRoute(route)} className="w-full bg-white/5 hover:bg-primary hover:text-black border border-white/10 font-black uppercase italic transition-all">Apply AI Route</Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
