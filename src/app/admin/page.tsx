
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
  Search
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'routes' | 'users' | 'alerts' | 'ai-architect'>('dashboard');
  const [vizagUpi, setVizagUpi] = useState('');
  const [vzmUpi, setVzmUpi] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Route Creator State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    routeName: '',
    city: 'Vizag',
    baseFare: 20,
    status: 'active',
    stops: [{ name: '', lat: 0, lng: 0 }]
  });

  // AI Architect State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    studentDemandPatterns: "High demand from South Campus to Beach Road during 4-6 PM.",
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
      toast({ title: "Network Config Saved", description: "Payment IDs updated." });
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
      toast({ title: "Corridor Deployed", description: `${newRoute.routeName} is now live.` });
      setIsRouteModalOpen(false);
      setNewRoute({ routeName: '', city: 'Vizag', baseFare: 20, status: 'active', stops: [{ name: '', lat: 0, lng: 0 }] });
    } catch {
      toast({ variant: "destructive", title: "Creation Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', id));
      toast({ title: "Route Removed", description: "Shuttle corridor decommissioned." });
    } catch {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const resolveAlert = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'alerts', id));
      toast({ title: "Signal Resolved", description: "Emergency protocol concluded." });
    } catch {
      toast({ variant: "destructive", title: "Resolution Failed" });
    }
  };

  const handleAiGeneration = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
      toast({ title: "AI Synthesis Complete", description: "New corridors generated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Generation Failed", description: e.message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-body text-slate-900">
      <aside className="w-72 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-2xl z-20">
        <div className="p-8 h-24 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Bus className="h-5 w-5 text-primary" /></div>
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase text-primary leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'routes', label: 'Fleet Grid', icon: RouteIcon },
            { id: 'users', label: 'Identity Vault', icon: Users },
            { id: 'payments', label: 'Payment Hub', icon: QrCode },
            { id: 'alerts', label: 'SOS Radar', icon: AlertTriangle },
            { id: 'ai-architect', label: 'AI Architect', icon: Sparkles },
          ].map((item) => (
            <Button 
              key={item.id} variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-black uppercase italic h-12 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-primary hover:bg-slate-50'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </Button>
          ))}
          <div className="pt-8 mt-8 border-t border-slate-100">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 font-black uppercase italic h-12" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 px-10 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-3xl font-black font-headline text-slate-900 italic uppercase tracking-tighter leading-none">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2">Regional Hub Management Terminal</p>
          </div>
          <Badge className="bg-green-500/10 text-green-600 border-none font-black uppercase text-[10px] tracking-widest px-6 py-2 rounded-full">Network Pulse: 100%</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'Network Revenue', value: `₹${stats.revenue.toFixed(0)}`, icon: IndianRupee, color: 'text-green-500', bg: 'bg-green-50' },
                  { label: 'Driver Payouts (90%)', value: `₹${stats.payouts.toFixed(0)}`, icon: IndianRupee, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Hub Commission (10%)', value: `₹${stats.commissions.toFixed(0)}`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
                  { label: 'Active Missions', value: allTrips?.filter(t => t.status === 'active').length || 0, icon: Navigation, color: 'text-primary', bg: 'bg-primary/10' },
                ].map((metric, i) => (
                  <Card key={i} className="border-none bg-white rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-8">
                      <div className={`p-4 ${metric.bg} rounded-2xl w-fit mb-6`}><metric.icon className={`h-6 w-6 ${metric.color}`} /></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{metric.label}</p>
                      <h3 className="text-3xl font-black text-slate-900 font-headline italic leading-none">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="border-none bg-white rounded-[3rem] shadow-sm overflow-hidden">
                  <CardHeader className="p-10 border-b border-slate-50"><CardTitle className="text-xl font-black italic uppercase text-slate-900 flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /> Active Missions</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                          <th className="py-6 px-10">Corridor</th>
                          <th className="py-6">Operator</th>
                          <th className="py-6">Status</th>
                          <th className="py-6 px-10 text-right">Yield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {!allTrips || allTrips.length === 0 ? (
                          <tr><td colSpan={4} className="py-20 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No mission data detected</td></tr>
                        ) : (
                          allTrips.map((trip: any) => (
                            <tr key={trip.id} className="hover:bg-slate-50 transition-all">
                              <td className="py-8 px-10"><span className="font-black text-slate-900 uppercase italic text-xs">{trip.routeName}</span></td>
                              <td className="py-8 text-xs font-bold text-slate-500 italic uppercase">{trip.driverName}</td>
                              <td className="py-8">
                                <Badge className={`${trip.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'} border-none text-[8px] font-black uppercase`}>
                                  {trip.status}
                                </Badge>
                              </td>
                              <td className="py-8 px-10 text-right font-black text-slate-900 italic text-base">₹{(trip.totalYield || 0).toFixed(0)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="border-none bg-white rounded-[3rem] shadow-sm overflow-hidden">
                  <CardHeader className="p-10 border-b border-slate-50"><CardTitle className="text-xl font-black italic uppercase text-slate-900 flex items-center gap-3"><Users className="h-6 w-6 text-primary" /> Workforce Summary</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {allUsers?.filter(u => u.role === 'driver').map((driver: any) => (
                        <div key={driver.uid} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-6">
                             <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 overflow-hidden">
                               {driver.photoUrl ? <img src={driver.photoUrl} className="h-full w-full object-cover" /> : driver.fullName?.[0]}
                             </div>
                             <div>
                               <p className="font-black text-slate-900 uppercase italic text-sm">{driver.fullName}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase italic">{driver.vehicleNumber} • {driver.city}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Lifetime Earnings</p>
                             <p className="text-lg font-black text-primary italic">₹{(driver.totalEarnings || 0).toFixed(0)}</p>
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
            <div className="space-y-10 animate-in fade-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-3xl font-black italic uppercase text-slate-900">Corridor Management</h3>
                 <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
                    <DialogTrigger asChild>
                       <Button className="bg-primary text-white rounded-2xl font-black uppercase italic h-14 px-8 shadow-xl shadow-primary/20"><Plus className="mr-2 h-5 w-5" /> Deploy New Corridor</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white border-none rounded-[3rem] p-10 overflow-hidden">
                       <DialogHeader><DialogTitle className="text-3xl font-black italic uppercase text-primary">Deploy Corridor</DialogTitle></DialogHeader>
                       <div className="space-y-6 py-6 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Route Name</Label>
                                <Input value={newRoute.routeName} onChange={e => setNewRoute({...newRoute, routeName: e.target.value})} placeholder="e.g. Coastal Express" className="h-14 rounded-xl bg-slate-50 border-none font-bold italic" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Hub City</Label>
                                <select value={newRoute.city} onChange={e => setNewRoute({...newRoute, city: e.target.value})} className="w-full h-14 rounded-xl bg-slate-50 border-none font-bold italic px-4">
                                   <option value="Vizag">Vizag</option>
                                   <option value="Vizianagaram">Vizianagaram</option>
                                </select>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-slate-400">Base Fare (₹)</Label>
                             <Input type="number" value={newRoute.baseFare} onChange={e => setNewRoute({...newRoute, baseFare: parseInt(e.target.value)})} className="h-14 rounded-xl bg-slate-50 border-none font-bold italic" />
                          </div>
                          
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Stops & Coordinates</Label>
                                <Button variant="ghost" size="sm" onClick={() => setNewRoute({...newRoute, stops: [...newRoute.stops, {name: '', lat: 0, lng: 0}]})} className="text-primary font-black uppercase italic text-[10px]"><Plus className="mr-1 h-3 w-3" /> Add Stop</Button>
                             </div>
                             {newRoute.stops.map((stop, i) => (
                                <div key={i} className="grid grid-cols-3 gap-3">
                                   <Input placeholder="Stop Name" value={stop.name} onChange={e => {
                                      const s = [...newRoute.stops]; s[i].name = e.target.value; setNewRoute({...newRoute, stops: s});
                                   }} className="h-12 rounded-xl bg-slate-50 border-none font-bold italic text-xs" />
                                   <Input placeholder="Lat" type="number" value={stop.lat} onChange={e => {
                                      const s = [...newRoute.stops]; s[i].lat = parseFloat(e.target.value); setNewRoute({...newRoute, stops: s});
                                   }} className="h-12 rounded-xl bg-slate-50 border-none font-bold italic text-xs" />
                                   <Input placeholder="Lng" type="number" value={stop.lng} onChange={e => {
                                      const s = [...newRoute.stops]; s[i].lng = parseFloat(e.target.value); setNewRoute({...newRoute, stops: s});
                                   }} className="h-12 rounded-xl bg-slate-50 border-none font-bold italic text-xs" />
                                </div>
                             ))}
                          </div>
                       </div>
                       <DialogFooter>
                          <Button onClick={handleCreateRoute} disabled={isSaving} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-primary/20">
                             {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Deploy to Network"}
                          </Button>
                       </DialogFooter>
                    </DialogContent>
                 </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {allRoutes?.map((route: any) => (
                    <Card key={route.id} className="border-none bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><RouteIcon className="h-20 w-20" /></div>
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{route.city}</p>
                             <h4 className="text-xl font-black italic uppercase text-slate-900">{route.routeName}</h4>
                          </div>
                          <Badge className={`${route.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'} border-none text-[8px] font-black uppercase`}>{route.status}</Badge>
                       </div>
                       <div className="space-y-4 mb-8">
                          <div className="flex items-center gap-3 text-slate-500">
                             <MapPin className="h-4 w-4" />
                             <span className="text-xs font-bold italic">{route.stops?.length || 0} Stations Mapped</span>
                          </div>
                          <div className="flex items-center gap-3 text-primary font-black italic">
                             <IndianRupee className="h-4 w-4" />
                             <span>Base Fare: ₹{route.baseFare}</span>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <Button variant="ghost" onClick={() => handleDeleteRoute(route.id)} className="flex-1 bg-red-50 text-red-500 h-12 rounded-xl font-black uppercase italic text-[10px]"><Trash2 className="mr-2 h-4 w-4" /> Decommission</Button>
                       </div>
                    </Card>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-10 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-slate-900">Identity Vault</h3>
                  <div className="relative w-72">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                     <Input placeholder="Search Scholar or Driver..." className="h-12 pl-12 rounded-xl bg-white border-none shadow-sm font-bold italic" />
                  </div>
               </div>
               
               <Card className="border-none bg-white rounded-[3rem] shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                          <th className="py-6 px-10">User Identity</th>
                          <th className="py-6">Role</th>
                          <th className="py-6">Regional Hub</th>
                          <th className="py-6">Joined Date</th>
                          <th className="py-6 px-10 text-right">Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allUsers?.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-slate-50 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-4">
                                   <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black overflow-hidden italic">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : u.fullName?.[0]}
                                   </div>
                                   <div>
                                      <p className="font-black text-slate-900 uppercase italic text-xs">{u.fullName}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{u.phoneNumber}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-6">
                                <Badge className={`${u.role === 'admin' ? 'bg-orange-50 text-orange-600' : u.role === 'driver' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} border-none text-[8px] font-black uppercase tracking-widest`}>
                                   {u.role}
                                </Badge>
                             </td>
                             <td className="py-6 font-bold italic text-slate-500 text-xs">{u.city} Hub</td>
                             <td className="py-6 font-bold italic text-slate-400 text-[10px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                             <td className="py-6 px-10 text-right">
                                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 rounded-lg"><ArrowUpRight className="h-4 w-4" /></Button>
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
            <div className="space-y-10 animate-in fade-in max-w-4xl">
              <Card className="border-none bg-white rounded-[3rem] p-12 shadow-sm space-y-10">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-red-50 rounded-2xl"><AlertTriangle className="h-8 w-8 text-red-500" /></div>
                  <div>
                    <h3 className="text-3xl font-black italic uppercase text-slate-900 leading-none">Emergency SOS Radar</h3>
                    <p className="text-sm font-bold text-slate-400 italic mt-2">Live feed of regional safety alerts from scholars and operators.</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {!allAlerts || allAlerts.length === 0 ? (
                    <div className="p-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-100">
                       <Activity className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No emergency signals detected.</p>
                    </div>
                  ) : (
                    allAlerts.map((alert: any) => (
                      <Card key={alert.id} className="p-8 bg-red-50 border-red-100 rounded-[2.5rem] flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="p-3 bg-red-500 rounded-xl text-white animate-pulse"><AlertTriangle className="h-6 w-6" /></div>
                            <div>
                               <h4 className="font-black text-red-900 uppercase italic text-base leading-none mb-1">{alert.type} - {alert.userName}</h4>
                               <p className="text-[10px] font-bold text-red-700 uppercase italic">{alert.city} • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                            </div>
                         </div>
                         <div className="flex gap-4">
                            <Button onClick={() => resolveAlert(alert.id)} className="bg-red-500 text-white rounded-xl h-12 px-8 font-black uppercase italic shadow-lg shadow-red-200">Dispatch Response</Button>
                            <Button variant="ghost" onClick={() => resolveAlert(alert.id)} className="text-red-900 font-black uppercase italic text-[10px]">Mark as Resolved</Button>
                         </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="max-w-2xl space-y-10 animate-in fade-in">
              <Card className="border-none bg-white rounded-[3rem] p-12 shadow-sm space-y-10">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black italic uppercase text-slate-900 leading-none">Regional Payment Config</h3>
                  <p className="text-sm font-bold text-slate-400 italic">Set official UPI IDs for regional hubs.</p>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vizag Hub Payment ID</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      <Input value={vizagUpi} onChange={e => setVizagUpi(e.target.value)} placeholder="vizag.aago@upi" className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-black italic text-lg outline-none" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vizianagaram Hub Payment ID</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      <Input value={vzmUpi} onChange={e => setVzmUpi(e.target.value)} placeholder="vzm.aago@upi" className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-black italic text-lg outline-none" />
                    </div>
                  </div>

                  <Button onClick={saveConfig} disabled={isSaving} className="w-full h-18 bg-primary text-white font-black uppercase italic text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Deploy Regional Endpoints"}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'ai-architect' && (
            <div className="space-y-10 animate-in fade-in max-w-4xl">
              <Card className="border-none bg-white rounded-[3rem] p-12 shadow-sm space-y-10">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-primary/10 rounded-2xl"><Sparkles className="h-8 w-8 text-primary" /></div>
                   <div>
                     <h3 className="text-3xl font-black italic uppercase text-slate-900 leading-none">AI Route Architect</h3>
                     <p className="text-sm font-bold text-slate-400 italic mt-2">Generate optimized shuttle corridors using regional demand patterns.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Demand Patterns</Label>
                    <Textarea 
                      value={aiInput.studentDemandPatterns} 
                      onChange={e => setAiInput({...aiInput, studentDemandPatterns: e.target.value})}
                      placeholder="e.g. High volume from South Campus between 4-6 PM..."
                      className="min-h-[120px] rounded-2xl bg-slate-50 border-none font-bold italic p-6 focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <Button onClick={handleAiGeneration} disabled={isAiLoading} className="h-18 bg-primary text-white font-black uppercase italic text-lg rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
                    {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Initiate AI Synthesis"}
                  </Button>
                </div>
              </Card>

              {aiResult && (
                <Card className="border-none bg-white rounded-[3rem] p-12 shadow-xl space-y-8 animate-in zoom-in-95">
                  <h4 className="text-2xl font-black italic uppercase text-primary border-b border-slate-50 pb-6 flex items-center gap-3"><ClipboardList className="h-6 w-6" /> Optimized Corridor Schematics</h4>
                  <div className="space-y-8">
                    {aiResult.optimizedRoutes.map((route: any, i: number) => (
                      <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
                        <div className="flex justify-between items-start">
                          <h5 className="text-xl font-black uppercase italic text-slate-900">{route.routeName}</h5>
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">{route.estimatedDurationMinutes} MINS</Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-500 italic leading-relaxed">{route.description}</p>
                        <div className="flex flex-wrap gap-2">
                           {route.stops.map((stop: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="border-slate-200 text-slate-400 text-[8px] font-bold">{stop}</Badge>
                           ))}
                        </div>
                      </div>
                    ))}
                    <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                      <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-3">AI Synthesis Summary</p>
                      <p className="text-sm font-bold text-blue-900 italic leading-relaxed">{aiResult.optimizationSummary}</p>
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
