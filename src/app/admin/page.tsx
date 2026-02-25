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
  Plus,
  Trash2,
  Search,
  Ticket,
  UserCheck,
  MapPin,
  Save,
  Car,
  User,
  Zap,
  Clock,
  ChevronRight,
  Brain,
  CheckCircle2
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'routes' | 'users' | 'ai-architect' | 'vouchers'>('dashboard');
  const [vizagUpi, setVizagUpi] = useState('');
  const [vzmUpi, setVzmUpi] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);

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
    if (!authLoading && profile && profile.role !== 'admin' && user?.email !== 'admin@aago.in') {
      router.push('/admin/login');
    }
  }, [profile, authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
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
    if (!allUsers) return { totalScholars: 0, totalDrivers: 0, activeDrivers: 0 };
    return {
      totalScholars: allUsers.filter(u => u.role === 'rider').length,
      totalDrivers: allUsers.filter(u => u.role === 'driver').length,
      activeDrivers: allUsers.filter(u => u.role === 'driver' && u.status !== 'offline').length,
    };
  }, [allUsers]);

  const handleUpdateConfig = () => {
    if (!globalConfigRef) return;
    setIsSaving(true);
    const data = { vizagUpiId: vizagUpi, vzmUpiId: vzmUpi };
    
    toast({ title: "Grid Config Updated" });
    
    setDoc(globalConfigRef, data, { merge: true })
      .then(() => setIsSaving(false))
      .catch(async (err) => {
        setIsSaving(false);
        const permissionError = new FirestorePermissionError({
          path: globalConfigRef.path,
          operation: 'write',
          requestResourceData: data,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleAddRoute = () => {
    if (!db || !newRoute.name) return;
    const stopsArray = newRoute.stops.split(',').map(s => ({ name: s.trim() }));
    const routeData = {
      routeName: newRoute.name,
      baseFare: Number(newRoute.fare),
      stops: stopsArray,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setNewRoute({ name: '', fare: 40, stops: '' });
    setIsRouteDialogOpen(false);
    toast({ title: "Route Deployed" });

    addDoc(collection(db, 'routes'), routeData)
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'routes',
          operation: 'create',
          requestResourceData: routeData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDeleteRoute = (id: string) => {
    if (!db) return;
    const routeRef = doc(db, 'routes', id);
    toast({ title: "Route Removed" });
    deleteDoc(routeRef).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: routeRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleAddVoucher = () => {
    if (!db || !newVoucher.code) return;
    const voucherData = {
      code: newVoucher.code.toUpperCase(),
      discountAmount: Number(newVoucher.amount),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setNewVoucher({ code: '', amount: 50 });
    setIsVoucherDialogOpen(false);
    toast({ title: "Voucher Issued" });

    addDoc(collection(db, 'vouchers'), voucherData)
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'vouchers',
          operation: 'create',
          requestResourceData: voucherData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDeleteVoucher = (id: string) => {
    if (!db) return;
    const vRef = doc(db, 'vouchers', id);
    toast({ title: "Voucher Revoked" });
    deleteDoc(vRef).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: vRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleRunAiArchitect = async () => {
    setIsAiLoading(true);
    setAiResult(null);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
      toast({ title: "AI Generation Complete" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error", description: "The grid brain is recalibrating." });
    } finally {
      setIsAiLoading(false);
    }
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
            { id: 'users', label: 'User Vault', icon: Users },
            { id: 'payments', label: 'Payments', icon: QrCode },
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[
                  { label: 'Total Scholars', value: stats.totalScholars, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Fleet Size', value: stats.totalDrivers, icon: Car, color: 'text-primary/60', bg: 'bg-primary/10' },
                  { label: 'Active Fleet', value: stats.activeDrivers, icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
                  { label: 'Live Trips', value: 0, icon: Navigation, color: 'text-primary/20', bg: 'bg-primary/10' },
                  { label: 'Active Corridors', value: allRoutes?.length || 0, icon: RouteIcon, color: 'text-primary/40', bg: 'bg-primary/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl shadow-sm">
                    <CardContent className="p-6">
                      <div className={`p-3 ${metric.bg} rounded-xl w-fit mb-4 shadow-sm`}><metric.icon className={`h-5 w-5 ${metric.color}`} /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-2xl font-black text-foreground font-headline italic leading-none tracking-tighter">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="glass-card rounded-3xl shadow-sm overflow-hidden border-white/10">
                <CardHeader className="p-10 border-b border-white/5 bg-white/5"><CardTitle className="text-xl font-black italic uppercase text-foreground flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /> Recent Grid Activity</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="p-20 text-center italic text-muted-foreground">Grid scanning for new missions...</div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Corridor Grid</h3>
                  <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-black font-black uppercase italic rounded-xl h-12 px-6"><Plus className="mr-2 h-5 w-5" /> Add Route</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-white/10">
                      <DialogHeader><DialogTitle>New Corridor</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Route Name</Label>
                          <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="Express Route" />
                        </div>
                        <div className="space-y-2">
                          <Label>Base Fare (₹)</Label>
                          <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Stops (Comma Separated)</Label>
                          <Textarea value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Stop A, Stop B, Stop C" />
                        </div>
                      </div>
                      <DialogFooter><Button onClick={handleAddRoute} className="bg-primary text-black font-black">Deploy Route</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {allRoutes?.map((route: any) => (
                   <Card key={route.id} className="bg-white/5 border-white/10 rounded-2xl p-6 relative group hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="text-xl font-black italic uppercase text-foreground">{route.routeName}</h4>
                          <p className="text-[10px] font-black text-primary uppercase">₹{route.baseFare} / Base</p>
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
                  <Dialog open={isVoucherDialogOpen} onOpenChange={setIsVoucherDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-black font-black uppercase italic rounded-xl h-12 px-6"><Plus className="mr-2 h-5 w-5" /> Issue Voucher</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-white/10">
                      <DialogHeader><DialogTitle>New Promo Code</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher, code: e.target.value})} placeholder="AAGO50" className="uppercase" />
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
                   <Card key={v.id} className="bg-white/5 border-white/10 rounded-2xl p-8 relative group border-dashed">
                      <div className="flex justify-between items-center mb-4">
                        <Badge className="bg-primary text-black text-lg font-black italic px-4 py-1">{v.code}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(v.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-5 w-5" /></Button>
                      </div>
                      <p className="text-2xl font-black italic text-foreground">₹{v.discountAmount} OFF</p>
                      <p className="text-[9px] font-black uppercase text-muted-foreground mt-2">Active in Grid</p>
                   </Card>
                 ))}
               </div>
             </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Scholar & Fleet Vault</h3>
                  </div>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input 
                      placeholder="Search name or phone..." 
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
                          <th className="py-6">Referral</th>
                          <th className="py-6">Role</th>
                          <th className="py-6">Status / Hub</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden italic border border-white/5">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <User className="h-6 w-6 opacity-30" />}
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
                             <td className="py-6">
                               <div className="flex flex-col gap-1">
                                 <p className="font-black italic text-foreground text-xs uppercase leading-none">{u.city}</p>
                                 {u.role === 'driver' && (
                                   <p className={`text-[8px] font-black uppercase tracking-widest ${u.status === 'offline' ? 'text-muted-foreground' : 'text-accent'}`}>
                                     {u.status}
                                   </p>
                                 )}
                               </div>
                             </td>
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

          {activeTab === 'ai-architect' && (
             <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex items-center justify-between">
                   <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">AI Architect</h3>
                   <Badge className="bg-primary/20 text-primary border-none px-4 py-1.5 font-black uppercase text-[9px]">GenAI Engine Active</Badge>
                </div>

                <div className="grid lg:grid-cols-2 gap-10 items-start">
                   <Card className="bg-white/5 border-white/10 rounded-3xl p-10 space-y-8">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Brain className="h-6 w-6" /></div>
                         <h4 className="text-xl font-black italic uppercase">Demand Synthesis</h4>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Student Demand Patterns</Label>
                          <Textarea 
                            className="bg-black/20 border-white/10 h-32" 
                            value={aiInput.studentDemandPatterns} 
                            onChange={e => setAiInput({...aiInput, studentDemandPatterns: e.target.value})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Historical Traffic Data</Label>
                          <Textarea 
                            className="bg-black/20 border-white/10 h-24" 
                            value={aiInput.historicalTrafficData} 
                            onChange={e => setAiInput({...aiInput, historicalTrafficData: e.target.value})} 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Preferred Hours</Label>
                            <Input value={aiInput.preferredServiceHours} onChange={e => setAiInput({...aiInput, preferredServiceHours: e.target.value})} className="bg-black/20 border-white/10" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Available Fleet</Label>
                            <Input type="number" value={aiInput.numberOfShuttlesAvailable} onChange={e => setAiInput({...aiInput, numberOfShuttlesAvailable: Number(e.target.value)})} className="bg-black/20 border-white/10" />
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={handleRunAiArchitect} 
                        disabled={isAiLoading} 
                        className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20"
                      >
                        {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <><Sparkles className="mr-3 h-6 w-6" /> Run Architect</>}
                      </Button>
                   </Card>

                   <div className="space-y-6">
                      {!aiResult && !isAiLoading && (
                         <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                            <Brain className="h-16 w-16 text-white/5 mb-6" />
                            <p className="text-muted-foreground font-black uppercase italic text-sm">Input demand data to generate optimized corridors</p>
                         </div>
                      )}

                      {isAiLoading && (
                         <div className="p-20 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl animate-pulse">
                            <Sparkles className="h-12 w-12 text-primary animate-bounce mb-6" />
                            <p className="text-primary font-black uppercase italic">AI Grid Processing...</p>
                         </div>
                      )}

                      {aiResult && (
                         <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <Card className="bg-primary/10 border-primary/20 rounded-3xl p-8">
                               <h4 className="text-xl font-black italic uppercase text-primary mb-4 flex items-center gap-2"><CheckCircle2 className="h-6 w-6" /> Architect Summary</h4>
                               <p className="text-sm font-bold text-foreground/80 leading-relaxed italic">{aiResult.optimizationSummary}</p>
                            </Card>

                            <div className="space-y-4">
                               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Recommended Corridors</p>
                               {aiResult.optimizedRoutes.map((route: any, i: number) => (
                                 <Card key={i} className="bg-white/5 border-white/10 rounded-2xl p-6">
                                    <div className="flex justify-between items-start mb-4">
                                       <h5 className="text-lg font-black italic uppercase text-foreground">{route.routeName}</h5>
                                       <Badge variant="outline" className="border-primary/30 text-primary text-[8px]">{route.estimatedDurationMinutes}m</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-bold italic mb-4">{route.description}</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                       {route.stops.map((stop: string, j: number) => (
                                         <Badge key={j} className="bg-white/5 text-[8px] border-none">{stop}</Badge>
                                       ))}
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-black uppercase text-primary">
                                       <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.schedule}</span>
                                       <Button size="sm" variant="ghost" className="h-8 text-primary hover:bg-primary/10" onClick={() => {
                                          setNewRoute({ name: route.routeName, fare: 40, stops: route.stops.join(', ') });
                                          setIsRouteDialogOpen(true);
                                       }}>
                                          Deploy <ChevronRight className="h-3 w-3" />
                                       </Button>
                                    </div>
                                 </Card>
                               ))}
                            </div>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
