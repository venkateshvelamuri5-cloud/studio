"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Bus, 
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
  ClipboardList,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  Trash2,
  MapPin,
  Search,
  Tag,
  Ticket,
  Percent,
  Settings,
  ShieldCheck,
  Cpu,
  Globe
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, limit, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';

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
      toast({ title: "Grid Config Synced", description: "Payment IDs updated globally." });
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
      toast({ title: "Corridor Engaged", description: `${newRoute.routeName} is now live.` });
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
      toast({ title: "Market Price Updated", description: "New corridor fare is active." });
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
      toast({ title: "Voucher Deployed", description: `${newVoucherCode.toUpperCase()} ready for use.` });
      setNewVoucherCode('');
    } catch {
      toast({ variant: "destructive", title: "Creation Failed" });
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'vouchers', id));
      toast({ title: "Voucher Terminated" });
    } catch {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', id));
      toast({ title: "Route Scuttled", description: "Corridor removed from regional grid." });
    } catch {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const resolveAlert = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'alerts', id));
      toast({ title: "SOS Resolved", description: "Emergency protocol concluded." });
    } catch {
      toast({ variant: "destructive", title: "Resolution Failed" });
    }
  };

  const handleAiGeneration = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
      toast({ title: "AI Synthesis Optimized", description: "New corridors identified." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Generation Failed", description: e.message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-950 text-white font-body overflow-hidden">
      <aside className="w-72 bg-slate-900 flex flex-col shrink-0 border-r border-white/5 shadow-2xl z-20">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/20 rounded-xl"><Bus className="h-5 w-5 text-primary" /></div>
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase text-primary leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Grid Stats', icon: LayoutDashboard },
            { id: 'routes', label: 'Corridors', icon: RouteIcon },
            { id: 'vouchers', label: 'Voucher Hub', icon: Ticket },
            { id: 'users', label: 'Identity Vault', icon: Users },
            { id: 'payments', label: 'Payment Grid', icon: QrCode },
            { id: 'alerts', label: 'SOS Radar', icon: AlertTriangle },
            { id: 'ai-architect', label: 'AI Architect', icon: Sparkles },
          ].map((item) => (
            <Button 
              key={item.id} variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all border-none ${activeTab === item.id ? 'bg-primary text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </Button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 font-black uppercase italic h-14 px-5" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Terminate
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-slate-900/40 border-b border-white/5 px-10 flex items-center justify-between backdrop-blur-3xl">
          <div>
            <h2 className="text-3xl font-black font-headline text-white italic uppercase tracking-tighter leading-none text-glow">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-2">Regional Command Terminal</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-none font-black uppercase text-[9px] tracking-widest px-6 py-2 rounded-full shadow-inner">Hub Pulse: 100%</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Grid Revenue', value: `₹${stats.revenue.toFixed(0)}`, icon: IndianRupee, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Captain Payouts', value: `₹${stats.payouts.toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Hub Earnings', value: `₹${stats.commissions.toFixed(0)}`, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
                  { label: 'Active Missions', value: allTrips?.filter(t => t.status === 'active').length || 0, icon: Navigation, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-slate-900 border border-white/5 rounded-[2.5rem] shadow-xl">
                    <CardContent className="p-8">
                      <div className={`p-4 ${metric.bg} rounded-2xl w-fit mb-6 shadow-inner`}><metric.icon className={`h-6 w-6 ${metric.color}`} /></div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{metric.label}</p>
                      <h3 className="text-3xl font-black text-white font-headline italic leading-none tracking-tighter text-glow">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-900 border border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardHeader className="p-10 border-b border-white/5 bg-white/5"><CardTitle className="text-xl font-black italic uppercase text-white flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /> Active Missions</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                          <th className="py-6 px-10">Corridor</th>
                          <th className="py-6">Captain</th>
                          <th className="py-6">Status</th>
                          <th className="py-8 px-10 text-right">Yield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {!allTrips || allTrips.length === 0 ? (
                          <tr><td colSpan={4} className="py-16 text-center text-sm font-black text-slate-700 uppercase italic">No telemetry</td></tr>
                        ) : (
                          allTrips.map((trip: any) => (
                            <tr key={trip.id} className="hover:bg-white/5 transition-all">
                              <td className="py-8 px-10"><span className="font-black text-white uppercase italic text-xs">{trip.routeName}</span></td>
                              <td className="py-8 text-[11px] font-bold text-slate-400 italic uppercase">{trip.driverName}</td>
                              <td className="py-8">
                                <Badge className={`${trip.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'} border-none text-[8px] font-black uppercase tracking-widest px-3 py-1`}>
                                  {trip.status}
                                </Badge>
                              </td>
                              <td className="py-8 px-10 text-right font-black text-white italic text-lg">₹{(trip.totalYield || 0).toFixed(0)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardHeader className="p-10 border-b border-white/5 bg-white/5"><CardTitle className="text-xl font-black italic uppercase text-white flex items-center gap-3"><Users className="h-6 w-6 text-primary" /> Captain Hub</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {allUsers?.filter(u => u.role === 'driver').map((driver: any) => (
                        <div key={driver.uid} className="p-8 flex items-center justify-between hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-6">
                             <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center font-black text-slate-700 overflow-hidden shadow-inner">
                               {driver.photoUrl ? <img src={driver.photoUrl} className="h-full w-full object-cover" /> : <span className="text-xl italic">{driver.fullName?.[0]}</span>}
                             </div>
                             <div>
                               <p className="font-black text-white uppercase italic text-sm leading-none tracking-tight">{driver.fullName}</p>
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{driver.vehicleNumber} • {driver.city}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Lifetime</p>
                             <p className="text-xl font-black text-primary italic leading-none">₹{(driver.totalEarnings || 0).toFixed(0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-center">
                 <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter text-glow">Corridor Grid</h3>
                 <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
                    <DialogTrigger asChild>
                       <Button className="bg-primary text-slate-950 rounded-[1.5rem] font-black uppercase italic h-14 px-8 shadow-xl hover:scale-105 transition-all text-sm"><Plus className="mr-2 h-5 w-5" /> Deploy Corridor</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-slate-950 border border-white/10 rounded-[3rem] p-12 shadow-2xl text-white">
                       <DialogHeader><DialogTitle className="text-4xl font-black italic uppercase text-primary leading-none tracking-tighter text-glow">New Corridor</DialogTitle></DialogHeader>
                       <div className="space-y-8 py-8 max-h-[50vh] overflow-y-auto px-2 custom-scrollbar">
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Corridor Name</Label>
                                <Input value={newRoute.routeName} onChange={e => setNewRoute({...newRoute, routeName: e.target.value})} placeholder="e.g. Express Line" className="h-14 rounded-2xl bg-white/5 border-white/5 font-black italic text-lg px-6 text-white" />
                             </div>
                             <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Regional Hub</Label>
                                <select value={newRoute.city} onChange={e => setNewRoute({...newRoute, city: e.target.value})} className="w-full h-14 rounded-2xl bg-white/5 border border-white/5 font-black italic text-lg px-6 text-white appearance-none">
                                   <option value="Vizag" className="bg-slate-950">Vizag</option>
                                   <option value="Vizianagaram" className="bg-slate-950">Vizianagaram</option>
                                </select>
                             </div>
                          </div>
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Base Fare (₹)</Label>
                             <Input type="number" value={newRoute.baseFare} onChange={e => setNewRoute({...newRoute, baseFare: parseInt(e.target.value)})} className="h-14 rounded-2xl bg-white/5 border-white/5 font-black italic text-lg px-6 text-white" />
                          </div>
                          
                          <div className="space-y-4">
                             <div className="flex justify-between items-center px-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Station Telemetry</Label>
                                <Button variant="ghost" size="sm" onClick={() => setNewRoute({...newRoute, stops: [...newRoute.stops, {name: '', lat: 0, lng: 0}]})} className="text-primary font-black uppercase italic text-[10px] tracking-widest"><Plus className="mr-1 h-3 w-3" /> Add Station</Button>
                             </div>
                             <div className="space-y-3">
                                {newRoute.stops.map((stop, i) => (
                                   <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                      <Input placeholder="Hub Name" value={stop.name} onChange={e => {
                                         const s = [...newRoute.stops]; s[i].name = e.target.value; setNewRoute({...newRoute, stops: s});
                                      }} className="h-12 rounded-xl bg-slate-950 border-white/5 font-black italic text-xs px-4" />
                                      <Input placeholder="Lat" type="number" value={stop.lat} onChange={e => {
                                         const s = [...newRoute.stops]; s[i].lat = parseFloat(e.target.value); setNewRoute({...newRoute, stops: s});
                                      }} className="h-12 rounded-xl bg-slate-950 border-white/5 font-black italic text-xs px-4" />
                                      <Input placeholder="Lng" type="number" value={stop.lng} onChange={e => {
                                         const s = [...newRoute.stops]; s[i].lng = parseFloat(e.target.value); setNewRoute({...newRoute, stops: s});
                                      }} className="h-12 rounded-xl bg-slate-950 border-white/5 font-black italic text-xs px-4" />
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       <DialogFooter className="pt-6">
                          <Button onClick={handleCreateRoute} disabled={isSaving} className="w-full h-16 bg-primary text-slate-950 rounded-2xl font-black uppercase italic text-xl shadow-xl">
                             {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Deploy to Grid"}
                          </Button>
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {allRoutes?.map((route: any) => (
                    <Card key={route.id} className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-10 shadow-xl group overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><RouteIcon className="h-24 w-24" /></div>
                       <div className="flex justify-between items-start mb-8 relative z-10">
                          <div>
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">{route.city} Hub</p>
                             <h4 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">{route.routeName}</h4>
                          </div>
                          <Badge className={`${route.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-950 text-slate-700'} border-none text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-inner`}>{route.status}</Badge>
                       </div>
                       <div className="space-y-4 mb-10 relative z-10">
                          <div className="flex items-center gap-4 text-slate-500">
                             <MapPin className="h-5 w-5" />
                             <span className="text-xs font-black italic uppercase tracking-widest">{route.stops?.length || 0} Stations Mapped</span>
                          </div>
                          <div className="flex items-center gap-4 text-primary font-black italic">
                             <IndianRupee className="h-5 w-5" />
                             {editingRouteId === route.id ? (
                               <div className="flex gap-3 items-center">
                                 <Input type="number" value={newFareValue} onChange={e => setNewFareValue(parseInt(e.target.value))} className="h-10 w-24 bg-slate-950 border-white/5 rounded-lg text-sm font-black" />
                                 <Button size="sm" onClick={() => handleUpdateFare(route.id, newFareValue)} className="h-10 px-4 bg-white text-slate-950 font-black">Sync</Button>
                               </div>
                             ) : (
                               <div className="flex items-center gap-3">
                                 <span className="text-xl font-black tracking-tighter">Fare: ₹{route.baseFare}</span>
                                 <Button variant="ghost" size="icon" onClick={() => { setEditingRouteId(route.id); setNewFareValue(route.baseFare); }} className="h-8 w-8 p-0 text-slate-700 hover:text-primary transition-colors"><Settings className="h-4 w-4" /></Button>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="flex gap-3 relative z-10">
                          <Button variant="ghost" onClick={() => handleDeleteRoute(route.id)} className="flex-1 bg-red-500/5 text-red-500 h-14 rounded-2xl font-black uppercase italic text-[10px] border border-red-500/10 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="mr-2 h-4 w-4" /> Terminate</Button>
                       </div>
                    </Card>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="max-w-2xl bg-slate-900 border border-white/5 rounded-[3rem] p-12 shadow-xl space-y-10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                  <div className="flex items-center gap-5 relative z-10">
                     <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner"><Tag className="h-8 w-8" /></div>
                     <div>
                        <h3 className="text-3xl font-black italic uppercase text-white leading-none tracking-tighter">Savings Hub</h3>
                        <p className="text-[11px] font-bold text-slate-500 italic mt-2">Deploy regional discount keys.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 relative z-10">
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Voucher Key</Label>
                        <Input value={newVoucherCode} onChange={e => setNewVoucherCode(e.target.value)} placeholder="e.g. AAGO10" className="h-16 rounded-2xl bg-slate-950 border-white/5 font-black italic text-2xl px-8 text-primary uppercase placeholder:text-slate-800" />
                     </div>
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Savings Value (₹)</Label>
                        <Input type="number" value={newVoucherDiscount} onChange={e => setNewVoucherDiscount(parseInt(e.target.value))} className="h-16 rounded-2xl bg-slate-950 border-white/5 font-black italic text-2xl px-8 text-white" />
                     </div>
                  </div>

                  <Button onClick={handleCreateVoucher} className="w-full h-18 bg-primary text-slate-950 font-black uppercase italic text-xl rounded-2xl shadow-xl hover:scale-[1.02] transition-all relative z-10">
                     Engage Key
                  </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {allVouchers?.map((v: any) => (
                    <Card key={v.id} className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><Percent className="h-16 w-16" /></div>
                       <div className="space-y-1 relative z-10">
                          <h4 className="text-3xl font-black italic text-white uppercase tracking-tighter text-glow">{v.code}</h4>
                          <p className="text-[10px] font-bold text-primary italic uppercase tracking-widest">₹{v.discountAmount} Reduction</p>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(v.id)} className="text-red-500 hover:bg-red-500/10 rounded-xl h-12 w-12 border border-white/5 relative z-10"><Trash2 className="h-5 w-5" /></Button>
                    </Card>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter text-glow">Identity Vault</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                     <Input placeholder="Search Scholar or Captain..." className="h-14 pl-14 rounded-2xl bg-slate-900 border-white/5 shadow-xl font-black italic text-sm text-white" />
                  </div>
               </div>
               
               <Card className="bg-slate-900 border border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                          <th className="py-6 px-10">User Identity</th>
                          <th className="py-6">Protocol Role</th>
                          <th className="py-6">Regional Hub</th>
                          <th className="py-6">Sync Date</th>
                          <th className="py-6 px-10 text-right">Telemetry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers?.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-700 font-black overflow-hidden italic shadow-inner">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <span className="text-lg italic">{u.fullName?.[0]}</span>}
                                   </div>
                                   <div>
                                      <p className="font-black text-white uppercase italic text-sm leading-none tracking-tight">{u.fullName}</p>
                                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{u.phoneNumber}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-6">
                                <Badge className={`${u.role === 'admin' ? 'bg-orange-500/10 text-orange-400' : u.role === 'driver' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-400'} border-none text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full`}>
                                   {u.role}
                                </Badge>
                             </td>
                             <td className="py-6 font-black italic text-slate-400 text-xs uppercase">{u.city} Hub</td>
                             <td className="py-6 font-black italic text-slate-600 text-[10px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                             <td className="py-6 px-10 text-right">
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-xl h-10 w-10 border border-white/5"><ArrowUpRight className="h-5 w-5" /></Button>
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
              <Card className="bg-slate-900 border border-white/5 rounded-[3rem] p-12 shadow-xl space-y-10">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-red-500/10 rounded-2xl shadow-inner"><AlertTriangle className="h-8 w-8 text-red-500" /></div>
                  <div>
                    <h3 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter text-glow">Emergency Radar</h3>
                    <p className="text-[11px] font-bold text-slate-500 italic mt-2">Live feed of regional safety signals.</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  {!allAlerts || allAlerts.length === 0 ? (
                    <div className="p-24 text-center bg-slate-950 rounded-[3rem] border border-dashed border-white/5 shadow-inner">
                       <Activity className="h-16 w-16 text-slate-900 mx-auto mb-6 animate-pulse" />
                       <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 italic">No emergency signals.</p>
                    </div>
                  ) : (
                    allAlerts.map((alert: any) => (
                      <Card key={alert.id} className="p-10 bg-red-500/5 border border-red-500/20 rounded-[2.5rem] flex items-center justify-between shadow-xl hover:bg-red-500/10 transition-all">
                         <div className="flex items-center gap-8">
                            <div className="p-4 bg-red-500 rounded-2xl text-white animate-pulse shadow-lg"><AlertTriangle className="h-8 w-8" /></div>
                            <div>
                               <h4 className="font-black text-white uppercase italic text-2xl leading-none tracking-tighter mb-1">{alert.type} - {alert.userName}</h4>
                               <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest italic">{alert.city} Hub • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                            </div>
                         </div>
                         <div className="flex gap-4">
                            <Button onClick={() => resolveAlert(alert.id)} className="bg-red-500 text-white rounded-2xl h-16 px-8 font-black uppercase italic text-lg shadow-xl hover:scale-105 transition-all">Dispatch Ops</Button>
                            <Button variant="ghost" onClick={() => resolveAlert(alert.id)} className="text-red-500/60 font-black uppercase italic text-[9px] tracking-widest hover:text-red-500">Clear</Button>
                         </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'ai-architect' && (
            <div className="space-y-10 animate-in fade-in duration-700 max-w-4xl mx-auto">
              <Card className="bg-slate-900 border border-white/5 rounded-[3rem] p-12 shadow-xl space-y-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                <div className="flex items-center gap-5 relative z-10">
                   <div className="p-4 bg-primary/10 rounded-2xl shadow-inner"><Sparkles className="h-8 w-8 text-primary" /></div>
                   <div>
                     <h3 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter text-glow">AI Grid Architect</h3>
                     <p className="text-[11px] font-bold text-slate-500 italic mt-2">Synthesize optimized regional corridors.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8 relative z-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-3">Regional Demand Telemetry</Label>
                    <Textarea 
                      value={aiInput.studentDemandPatterns} 
                      onChange={e => setAiInput({...aiInput, studentDemandPatterns: e.target.value})}
                      placeholder="e.g. High volume detected from South Hub..."
                      className="min-h-[150px] rounded-[2rem] bg-slate-950 border-white/5 font-black italic p-8 focus:ring-4 focus:ring-primary/20 outline-none text-lg text-white custom-scrollbar"
                    />
                  </div>
                  <Button onClick={handleAiGeneration} disabled={isAiLoading} className="h-20 bg-primary text-slate-950 font-black uppercase italic text-2xl rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all">
                    {isAiLoading ? <Loader2 className="animate-spin h-8 w-8" /> : "Initiate Grid Synthesis"}
                  </Button>
                </div>
              </Card>

              {aiResult && (
                <Card className="bg-slate-900 border border-white/5 rounded-[3rem] p-12 shadow-xl space-y-10 animate-in zoom-in-95 duration-700">
                  <h4 className="text-3xl font-black italic uppercase text-primary border-b border-white/5 pb-8 flex items-center gap-4 text-glow"><ClipboardList className="h-6 w-6" /> Corridor Output</h4>
                  <div className="space-y-8">
                    {aiResult.optimizedRoutes.map((route: any, i: number) => (
                      <div key={i} className="p-10 bg-slate-950 rounded-[2.5rem] space-y-4 border border-white/5 group hover:bg-white/5 transition-all">
                        <div className="flex justify-between items-start">
                          <h5 className="text-2xl font-black uppercase italic text-white tracking-tighter">{route.routeName}</h5>
                          <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest">{route.estimatedDurationMinutes} MINS</Badge>
                        </div>
                        <p className="text-[11px] font-black italic text-slate-500 leading-relaxed uppercase tracking-wider">{route.description}</p>
                        <div className="flex flex-wrap gap-2">
                           {route.stops.map((stop: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="border-white/10 text-slate-600 text-[9px] font-black uppercase italic px-4 py-1.5 rounded-lg">{stop}</Badge>
                           ))}
                        </div>
                      </div>
                    ))}
                    <div className="p-10 bg-primary/5 rounded-[2.5rem] border border-primary/20 shadow-inner">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3 italic">Architect Summary</p>
                      <p className="text-sm font-bold text-white italic leading-relaxed">{aiResult.optimizationSummary}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
