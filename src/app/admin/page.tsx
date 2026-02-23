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

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin h-16 w-16 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-950 text-white font-body overflow-hidden">
      <aside className="w-80 bg-slate-900 flex flex-col shrink-0 border-r border-white/5 shadow-2xl z-20">
        <div className="p-10 h-32 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-2xl"><Bus className="h-6 w-6 text-primary" /></div>
            <span className="text-3xl font-black font-headline italic tracking-[calc(-0.05em)] uppercase text-primary leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-8 space-y-4 overflow-y-auto custom-scrollbar">
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
              className={`w-full justify-start rounded-2xl font-black uppercase italic h-16 px-6 transition-all border-none ${activeTab === item.id ? 'bg-primary text-slate-950 shadow-[0_0_40px_rgba(0,255,255,0.2)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon className="mr-5 h-6 w-6" /> {item.label}
            </Button>
          ))}
          <div className="pt-10 mt-10 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 font-black uppercase italic h-16 px-6" onClick={handleSignOut}>
              <LogOut className="mr-5 h-6 w-6" /> Terminate
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-32 bg-slate-900/40 border-b border-white/5 px-12 flex items-center justify-between backdrop-blur-3xl">
          <div>
            <h2 className="text-5xl font-black font-headline text-white italic uppercase tracking-tighter leading-none text-glow">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.5em] mt-3">Regional Network Command Terminal</p>
          </div>
          <div className="flex items-center gap-6">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-none font-black uppercase text-[10px] tracking-widest px-8 py-3 rounded-full shadow-inner">Hub Pulse: 100%</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'Grid Revenue', value: `₹${stats.revenue.toFixed(0)}`, icon: IndianRupee, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Captain Payouts (90%)', value: `₹${stats.payouts.toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Hub Earnings (10%)', value: `₹${stats.commissions.toFixed(0)}`, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
                  { label: 'Active Missions', value: allTrips?.filter(t => t.status === 'active').length || 0, icon: Navigation, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-slate-900 border border-white/5 rounded-[4rem] shadow-2xl group hover:scale-[1.02] transition-transform">
                    <CardContent className="p-10">
                      <div className={`p-5 ${metric.bg} rounded-[2rem] w-fit mb-8 shadow-inner`}><metric.icon className={`h-8 w-8 ${metric.color}`} /></div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">{metric.label}</p>
                      <h3 className="text-5xl font-black text-white font-headline italic leading-none tracking-tighter text-glow">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <Card className="bg-slate-900 border border-white/5 rounded-[4.5rem] shadow-2xl overflow-hidden">
                  <CardHeader className="p-12 border-b border-white/5 bg-white/5"><CardTitle className="text-2xl font-black italic uppercase text-white flex items-center gap-4"><Activity className="h-7 w-7 text-primary" /> Active Missions</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                          <th className="py-8 px-12">Corridor</th>
                          <th className="py-8">Captain</th>
                          <th className="py-8">Status</th>
                          <th className="py-8 px-12 text-right">Yield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {!allTrips || allTrips.length === 0 ? (
                          <tr><td colSpan={4} className="py-24 text-center text-sm font-black text-slate-700 uppercase italic">No active telemetry</td></tr>
                        ) : (
                          allTrips.map((trip: any) => (
                            <tr key={trip.id} className="hover:bg-white/5 transition-all">
                              <td className="py-10 px-12"><span className="font-black text-white uppercase italic text-sm">{trip.routeName}</span></td>
                              <td className="py-10 text-xs font-bold text-slate-400 italic uppercase">{trip.driverName}</td>
                              <td className="py-10">
                                <Badge className={`${trip.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'} border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5`}>
                                  {trip.status}
                                </Badge>
                              </td>
                              <td className="py-10 px-12 text-right font-black text-white italic text-xl">₹{(trip.totalYield || 0).toFixed(0)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border border-white/5 rounded-[4.5rem] shadow-2xl overflow-hidden">
                  <CardHeader className="p-12 border-b border-white/5 bg-white/5"><CardTitle className="text-2xl font-black italic uppercase text-white flex items-center gap-4"><Users className="h-7 w-7 text-primary" /> Captain Hub</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {allUsers?.filter(u => u.role === 'driver').map((driver: any) => (
                        <div key={driver.uid} className="p-10 flex items-center justify-between hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-8">
                             <div className="h-16 w-16 rounded-[2rem] bg-slate-950 border border-white/5 flex items-center justify-center font-black text-slate-700 overflow-hidden shadow-inner">
                               {driver.photoUrl ? <img src={driver.photoUrl} className="h-full w-full object-cover" /> : <span className="text-2xl italic">{driver.fullName?.[0]}</span>}
                             </div>
                             <div>
                               <p className="font-black text-white uppercase italic text-base leading-none tracking-tight">{driver.fullName}</p>
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">{driver.vehicleNumber} • {driver.city}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Lifetime Payout</p>
                             <p className="text-2xl font-black text-primary italic leading-none">₹{(driver.totalEarnings || 0).toFixed(0)}</p>
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
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex justify-between items-center">
                 <h3 className="text-5xl font-black italic uppercase text-white tracking-tighter text-glow">Corridor Grid</h3>
                 <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
                    <DialogTrigger asChild>
                       <Button className="bg-primary text-slate-950 rounded-[2.5rem] font-black uppercase italic h-20 px-12 shadow-[0_0_40px_rgba(0,255,255,0.2)] hover:scale-105 transition-all text-xl"><Plus className="mr-3 h-7 w-7" /> Deploy Corridor</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl bg-slate-950 border border-white/10 rounded-[5rem] p-16 shadow-[0_0_150px_rgba(0,0,0,1)] text-white">
                       <DialogHeader><DialogTitle className="text-6xl font-black italic uppercase text-primary leading-none tracking-tighter text-glow">New Corridor</DialogTitle></DialogHeader>
                       <div className="space-y-10 py-10 max-h-[60vh] overflow-y-auto px-4 custom-scrollbar">
                          <div className="grid grid-cols-2 gap-10">
                             <div className="space-y-4">
                                <Label className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em] ml-4">Corridor Name</Label>
                                <Input value={newRoute.routeName} onChange={e => setNewRoute({...newRoute, routeName: e.target.value})} placeholder="e.g. Coastline Express" className="h-20 rounded-[2.5rem] bg-white/5 border-white/5 font-black italic text-2xl px-10 text-white" />
                             </div>
                             <div className="space-y-4">
                                <Label className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em] ml-4">Regional Hub</Label>
                                <select value={newRoute.city} onChange={e => setNewRoute({...newRoute, city: e.target.value})} className="w-full h-20 rounded-[2.5rem] bg-white/5 border border-white/5 font-black italic text-2xl px-10 text-white appearance-none">
                                   <option value="Vizag" className="bg-slate-950">Vizag</option>
                                   <option value="Vizianagaram" className="bg-slate-950">Vizianagaram</option>
                                </select>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <Label className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em] ml-4">Base Fare (₹)</Label>
                             <Input type="number" value={newRoute.baseFare} onChange={e => setNewRoute({...newRoute, baseFare: parseInt(e.target.value)})} className="h-20 rounded-[2.5rem] bg-white/5 border-white/5 font-black italic text-2xl px-10 text-white" />
                          </div>
                          
                          <div className="space-y-6">
                             <div className="flex justify-between items-center px-4">
                                <Label className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em]">Station Telemetry</Label>
                                <Button variant="ghost" size="sm" onClick={() => setNewRoute({...newRoute, stops: [...newRoute.stops, {name: '', lat: 0, lng: 0}]})} className="text-primary font-black uppercase italic text-[11px] tracking-widest"><Plus className="mr-2 h-4 w-4" /> Add Station</Button>
                             </div>
                             <div className="space-y-4">
                                {newRoute.stops.map((stop, i) => (
                                   <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/5">
                                      <Input placeholder="Hub Name" value={stop.name} onChange={e => {
                                         const s = [...newRoute.stops]; s[i].name = e.target.value; setNewRoute({...newRoute, stops: s});
                                      }} className="h-16 rounded-2xl bg-slate-950 border-white/5 font-black italic text-sm px-6" />
                                      <Input placeholder="Lat" type="number" value={stop.lat} onChange={e => {
                                         const s = [...newRoute.stops]; s[i].lat = parseFloat(e.target.value); setNewRoute({...newRoute, stops: s});
                                      }} className="h-16 rounded-2xl bg-slate-950 border-white/5 font-black italic text-sm px-6" />
                                      <Input placeholder="Lng" type="number" value={stop.lng} onChange={e => {
                                         const s = [...newRoute.stops]; s[i].lng = parseFloat(e.target.value); setNewRoute({...newRoute, stops: s});
                                      }} className="h-16 rounded-2xl bg-slate-950 border-white/5 font-black italic text-sm px-6" />
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       <DialogFooter className="pt-8">
                          <Button onClick={handleCreateRoute} disabled={isSaving} className="w-full h-24 bg-primary text-slate-950 rounded-[3rem] font-black uppercase italic text-2xl shadow-2xl">
                             {isSaving ? <Loader2 className="animate-spin h-10 w-10" /> : "Deploy to Grid"}
                          </Button>
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 {allRoutes?.map((route: any) => (
                    <Card key={route.id} className="bg-slate-900 border border-white/5 rounded-[4rem] p-12 shadow-2xl hover:shadow-[0_0_80px_rgba(0,255,255,0.1)] transition-all group overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><RouteIcon className="h-32 w-32" /></div>
                       <div className="flex justify-between items-start mb-10 relative z-10">
                          <div>
                             <p className="text-[11px] font-black uppercase text-primary tracking-[0.5em] mb-2">{route.city} Hub</p>
                             <h4 className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none">{route.routeName}</h4>
                          </div>
                          <Badge className={`${route.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-950 text-slate-700'} border-none text-[9px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-inner`}>{route.status}</Badge>
                       </div>
                       <div className="space-y-6 mb-12 relative z-10">
                          <div className="flex items-center gap-5 text-slate-500">
                             <MapPin className="h-6 w-6" />
                             <span className="text-sm font-black italic uppercase tracking-widest">{route.stops?.length || 0} Stations Mapped</span>
                          </div>
                          <div className="flex items-center gap-5 text-primary font-black italic">
                             <IndianRupee className="h-6 w-6" />
                             {editingRouteId === route.id ? (
                               <div className="flex gap-4 items-center">
                                 <Input type="number" value={newFareValue} onChange={e => setNewFareValue(parseInt(e.target.value))} className="h-12 w-28 bg-slate-950 border-white/5 rounded-xl text-lg font-black" />
                                 <Button size="sm" onClick={() => handleUpdateFare(route.id, newFareValue)} className="h-12 px-6 bg-white text-slate-950 font-black">Sync</Button>
                               </div>
                             ) : (
                               <div className="flex items-center gap-4">
                                 <span className="text-2xl font-black tracking-tighter">Fare: ₹{route.baseFare}</span>
                                 <Button variant="ghost" size="icon" onClick={() => { setEditingRouteId(route.id); setNewFareValue(route.baseFare); }} className="h-10 w-10 p-0 text-slate-700 hover:text-primary transition-colors"><Settings className="h-5 w-5" /></Button>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="flex gap-4 relative z-10">
                          <Button variant="ghost" onClick={() => handleDeleteRoute(route.id)} className="flex-1 bg-red-500/5 text-red-500 h-16 rounded-[2rem] font-black uppercase italic text-xs border border-red-500/10 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="mr-3 h-5 w-5" /> Terminate</Button>
                       </div>
                    </Card>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <div className="max-w-3xl bg-slate-900 border border-white/5 rounded-[5rem] p-16 shadow-2xl space-y-12 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                  <div className="flex items-center gap-6 relative z-10">
                     <div className="p-5 bg-primary/10 rounded-[2rem] text-primary shadow-inner"><Tag className="h-10 w-10" /></div>
                     <div>
                        <h3 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter">Savings Hub</h3>
                        <p className="text-sm font-bold text-slate-500 italic mt-3">Deploy regional discount keys for scholars.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10 relative z-10">
                     <div className="space-y-4">
                        <Label className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em] ml-4">Voucher Key</Label>
                        <Input value={newVoucherCode} onChange={e => setNewVoucherCode(e.target.value)} placeholder="e.g. AAGO10" className="h-20 rounded-[2.5rem] bg-slate-950 border-white/5 font-black italic text-3xl px-10 text-primary uppercase placeholder:text-slate-800" />
                     </div>
                     <div className="space-y-4">
                        <Label className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em] ml-4">Savings Value (₹)</Label>
                        <Input type="number" value={newVoucherDiscount} onChange={e => setNewVoucherDiscount(parseInt(e.target.value))} className="h-20 rounded-[2.5rem] bg-slate-950 border-white/5 font-black italic text-3xl px-10 text-white" />
                     </div>
                  </div>

                  <Button onClick={handleCreateVoucher} className="w-full h-24 bg-primary text-slate-950 font-black uppercase italic text-2xl rounded-[3rem] shadow-[0_0_40px_rgba(0,255,255,0.2)] hover:scale-[1.02] transition-all relative z-10">
                     Engage Key
                  </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {allVouchers?.map((v: any) => (
                    <Card key={v.id} className="bg-slate-900 border border-white/5 rounded-[4rem] p-12 shadow-2xl flex items-center justify-between relative overflow-hidden group hover:shadow-[0_0_60px_rgba(0,255,255,0.1)] transition-all">
                       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><Percent className="h-20 w-20" /></div>
                       <div className="space-y-2 relative z-10">
                          <h4 className="text-4xl font-black italic text-white uppercase tracking-tighter text-glow">{v.code}</h4>
                          <p className="text-sm font-bold text-primary italic uppercase tracking-widest">₹{v.discountAmount} Reduction</p>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteVoucher(v.id)} className="text-red-500 hover:bg-red-500/10 rounded-2xl h-14 w-14 border border-white/5 relative z-10"><Trash2 className="h-6 w-6" /></Button>
                    </Card>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-5xl font-black italic uppercase text-white tracking-tighter text-glow">Identity Vault</h3>
                  <div className="relative w-96">
                     <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-600" />
                     <Input placeholder="Search Scholar or Captain..." className="h-16 pl-16 rounded-[2rem] bg-slate-900 border-white/5 shadow-2xl font-black italic text-lg text-white" />
                  </div>
               </div>
               
               <Card className="bg-slate-900 border border-white/5 rounded-[5rem] shadow-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                          <th className="py-8 px-12">User Identity</th>
                          <th className="py-8">Protocol Role</th>
                          <th className="py-8">Regional Hub</th>
                          <th className="py-8">Sync Date</th>
                          <th className="py-8 px-12 text-right">Telemetry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers?.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-8 px-12">
                                <div className="flex items-center gap-6">
                                   <div className="h-14 w-14 rounded-[1.75rem] bg-slate-950 border border-white/5 flex items-center justify-center text-slate-700 font-black overflow-hidden italic shadow-inner">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <span className="text-xl italic">{u.fullName?.[0]}</span>}
                                   </div>
                                   <div>
                                      <p className="font-black text-white uppercase italic text-base leading-none tracking-tight">{u.fullName}</p>
                                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">{u.phoneNumber}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-8">
                                <Badge className={`${u.role === 'admin' ? 'bg-orange-500/10 text-orange-400' : u.role === 'driver' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-400'} border-none text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full`}>
                                   {u.role}
                                </Badge>
                             </td>
                             <td className="py-8 font-black italic text-slate-400 text-sm uppercase">{u.city} Hub</td>
                             <td className="py-8 font-black italic text-slate-600 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                             <td className="py-8 px-12 text-right">
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-2xl h-12 w-12 border border-white/5"><ArrowUpRight className="h-6 w-6" /></Button>
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
            <div className="space-y-12 animate-in fade-in duration-700 max-w-5xl mx-auto">
              <Card className="bg-slate-900 border border-white/5 rounded-[5rem] p-16 shadow-2xl space-y-12">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-red-500/10 rounded-[2rem] shadow-inner"><AlertTriangle className="h-10 w-10 text-red-500" /></div>
                  <div>
                    <h3 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter text-glow">Emergency Radar</h3>
                    <p className="text-sm font-bold text-slate-500 italic mt-3">Live feed of regional safety signals from scholars and captains.</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {!allAlerts || allAlerts.length === 0 ? (
                    <div className="p-32 text-center bg-slate-950 rounded-[4rem] border border-dashed border-white/5 shadow-inner">
                       <Activity className="h-20 w-20 text-slate-900 mx-auto mb-8 animate-pulse" />
                       <p className="text-sm font-black uppercase tracking-[0.5em] text-slate-800 italic">No emergency signals detected on grid.</p>
                    </div>
                  ) : (
                    allAlerts.map((alert: any) => (
                      <Card key={alert.id} className="p-12 bg-red-500/5 border border-red-500/20 rounded-[4rem] flex items-center justify-between shadow-2xl hover:bg-red-500/10 transition-all">
                         <div className="flex items-center gap-10">
                            <div className="p-5 bg-red-500 rounded-[2rem] text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]"><AlertTriangle className="h-10 w-10" /></div>
                            <div>
                               <h4 className="font-black text-white uppercase italic text-3xl leading-none tracking-tighter mb-2">{alert.type} - {alert.userName}</h4>
                               <p className="text-[12px] font-black text-red-500/60 uppercase tracking-[0.4em] italic">{alert.city} Hub • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                            </div>
                         </div>
                         <div className="flex gap-6">
                            <Button onClick={() => resolveAlert(alert.id)} className="bg-red-500 text-white rounded-[2.5rem] h-20 px-12 font-black uppercase italic text-xl shadow-2xl hover:scale-105 transition-all">Dispatch Ops</Button>
                            <Button variant="ghost" onClick={() => resolveAlert(alert.id)} className="text-red-500/60 font-black uppercase italic text-[11px] tracking-widest hover:text-red-500">Mark Clear</Button>
                         </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="max-w-3xl space-y-12 animate-in fade-in duration-700">
              <Card className="bg-slate-900 border border-white/5 rounded-[5rem] p-16 shadow-2xl space-y-12 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(0,255,255,0.05),transparent_70%)]" />
                <div className="space-y-4 relative z-10">
                  <h3 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter text-glow">Regional Payout Config</h3>
                  <p className="text-sm font-bold text-slate-500 italic mt-2">Set official UPI endpoints for the regional hubs.</p>
                </div>
                
                <div className="space-y-10 relative z-10">
                  <div className="space-y-4">
                    <Label className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-600 ml-4">Vizag Hub Payment Terminal</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-8 top-1/2 -translate-y-1/2 h-7 w-7 text-primary" />
                      <Input value={vizagUpi} onChange={e => setVizagUpi(e.target.value)} placeholder="vizag.aago@upi" className="h-24 pl-20 rounded-[3rem] bg-slate-950 border-white/5 font-black italic text-3xl text-white outline-none shadow-inner" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-600 ml-4">VZM Hub Payment Terminal</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-8 top-1/2 -translate-y-1/2 h-7 w-7 text-primary" />
                      <Input value={vzmUpi} onChange={e => setVzmUpi(e.target.value)} placeholder="vzm.aago@upi" className="h-24 pl-20 rounded-[3rem] bg-slate-950 border-white/5 font-black italic text-3xl text-white outline-none shadow-inner" />
                    </div>
                  </div>

                  <Button onClick={saveConfig} disabled={isSaving} className="w-full h-28 bg-primary text-slate-950 font-black uppercase italic text-2xl rounded-[3.5rem] shadow-[0_0_50px_rgba(0,255,255,0.2)] hover:scale-[1.02] transition-all">
                    {isSaving ? <Loader2 className="animate-spin h-10 w-10" /> : "Deploy Grid Endpoints"}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'ai-architect' && (
            <div className="space-y-12 animate-in fade-in duration-700 max-w-5xl mx-auto">
              <Card className="bg-slate-900 border border-white/5 rounded-[5rem] p-16 shadow-2xl space-y-12 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                <div className="flex items-center gap-6 relative z-10">
                   <div className="p-5 bg-primary/10 rounded-[2rem] shadow-inner"><Sparkles className="h-10 w-10 text-primary" /></div>
                   <div>
                     <h3 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter text-glow">AI Grid Architect</h3>
                     <p className="text-sm font-bold text-slate-500 italic mt-3">Synthesize optimized regional shuttle corridors using AI-driven demand patterns.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-10 relative z-10">
                  <div className="space-y-4">
                    <Label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-600 ml-4">Regional Demand Telemetry</Label>
                    <Textarea 
                      value={aiInput.studentDemandPatterns} 
                      onChange={e => setAiInput({...aiInput, studentDemandPatterns: e.target.value})}
                      placeholder="e.g. High volume detected from South Hub between 16:00 and 18:00..."
                      className="min-h-[180px] rounded-[3rem] bg-slate-950 border-white/5 font-black italic p-10 focus:ring-4 focus:ring-primary/20 outline-none text-xl text-white custom-scrollbar"
                    />
                  </div>
                  <Button onClick={handleAiGeneration} disabled={isAiLoading} className="h-28 bg-primary text-slate-950 font-black uppercase italic text-3xl rounded-[3.5rem] shadow-2xl hover:scale-[1.02] transition-all">
                    {isAiLoading ? <Loader2 className="animate-spin h-10 w-10" /> : "Initiate Grid Synthesis"}
                  </Button>
                </div>
              </Card>

              {aiResult && (
                <Card className="bg-slate-900 border border-white/5 rounded-[5rem] p-16 shadow-2xl space-y-12 animate-in zoom-in-95 duration-700">
                  <h4 className="text-4xl font-black italic uppercase text-primary border-b border-white/5 pb-10 flex items-center gap-5 text-glow"><ClipboardList className="h-8 w-8" /> Corridor Synthesis Output</h4>
                  <div className="space-y-10">
                    {aiResult.optimizedRoutes.map((route: any, i: number) => (
                      <div key={i} className="p-12 bg-slate-950 rounded-[4rem] space-y-6 border border-white/5 group hover:bg-white/5 transition-all">
                        <div className="flex justify-between items-start">
                          <h5 className="text-3xl font-black uppercase italic text-white tracking-tighter">{route.routeName}</h5>
                          <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest">{route.estimatedDurationMinutes} MINS</Badge>
                        </div>
                        <p className="text-sm font-black italic text-slate-500 leading-relaxed uppercase tracking-wider">{route.description}</p>
                        <div className="flex flex-wrap gap-3">
                           {route.stops.map((stop: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="border-white/10 text-slate-600 text-[10px] font-black uppercase italic px-5 py-2 rounded-xl">{stop}</Badge>
                           ))}
                        </div>
                      </div>
                    ))}
                    <div className="p-12 bg-primary/5 rounded-[4rem] border border-primary/20 shadow-inner">
                      <p className="text-[11px] font-black uppercase text-primary tracking-[0.5em] mb-4 italic">Architect Summary</p>
                      <p className="text-base font-bold text-white italic leading-relaxed">{aiResult.optimizationSummary}</p>
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