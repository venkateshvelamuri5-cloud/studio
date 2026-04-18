"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Users,
  Route as RouteIcon,
  Sparkles,
  Search,
  Car,
  User,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Target,
  TrendingUp,
  Map as MapIcon,
  Clock,
  Bus,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, orderBy, addDoc, where, deleteDoc, getDocs } from 'firebase/firestore';
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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'fleet' | 'ai-architect'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Corridor Deployment State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', stops: '' });

  // AI Architect State
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    startPoint: "Main Railway Station",
    endPoint: "Industrial Hub North",
    demandVolume: "Peak hour commute, 500+ professionals daily",
    trafficContext: "Heavy congestion near the IT park exit"
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/admin/login');
  }, [authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: activeTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), where('status', 'in', ['active', 'scheduled', 'on-trip'])) : null, [db]));

  const stats = useMemo(() => {
    if (!allUsers) return { totalRiders: 0, totalDrivers: 0, utilization: 0, pendingDrivers: 0 };
    const drivers = allUsers.filter(u => u.role === 'driver');
    const onTrip = drivers.filter(d => d.status === 'on-trip').length;
    return {
      totalRiders: allUsers.filter(u => u.role === 'rider').length,
      totalDrivers: drivers.length,
      utilization: drivers.length > 0 ? Math.round((onTrip / drivers.length) * 100) : 0,
      pendingDrivers: drivers.filter(u => !u.isVerified).length
    };
  }, [allUsers]);

  const handleVerifyUser = (uid: string) => {
    if (!db) return;
    updateDoc(doc(db, 'users', uid), { isVerified: true })
      .then(() => toast({ title: "Operator Authorized" }));
  };

  const handleDeleteUser = async (uid: string) => {
    if (!db) return;
    if (!confirm("Are you sure you want to remove this user from the grid?")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast({ title: "User Removed", description: "Identity purged from the grid." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Delete Failed" });
    }
  };

  const handlePurgeTestData = async () => {
    if (!db || !confirm("CRITICAL: This will delete all test trips and non-admin users. Continue?")) return;
    setIsPurging(true);
    try {
      const tripsSnap = await getDocs(collection(db, 'trips'));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '!=', 'admin')));
      
      const tripsDeletes = tripsSnap.docs.map(d => deleteDoc(d.ref));
      const usersDeletes = usersSnap.docs.map(d => deleteDoc(d.ref));
      
      await Promise.all([...tripsDeletes, ...usersDeletes]);
      toast({ title: "Grid Reset", description: "All test data has been purged." });
    } finally {
      setIsPurging(false);
    }
  };

  const deployRoute = (routeData: any) => {
    if (!db) return;
    const stopsArray = Array.isArray(routeData.stops) 
      ? routeData.stops.map((s: any) => ({ name: typeof s === 'string' ? s : s.name }))
      : routeData.stops.split(',').map((s: string) => ({ name: s.trim() }));
    
    addDoc(collection(db, 'routes'), {
      routeName: routeData.routeName || routeData.name,
      baseFare: Number(routeData.suggestedBaseFare || routeData.fare),
      stops: stopsArray,
      status: 'active',
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Corridor Deployed", description: "Grid nodes synchronized with landmarks." });
      setNewRoute({ name: '', fare: '', stops: '' });
    });
  };

  const handleProcessGridQueue = async () => {
    if (!db || !activeTrips) return;
    setIsProcessingQueue(true);
    try {
      const queuedTrips = activeTrips.filter(t => t.status === 'active');
      for (const trip of queuedTrips) {
        await updateDoc(doc(db, 'trips', trip.id), { status: 'scheduled' });
      }
      toast({ title: "Grid Sync Complete", description: "3-Hour window processed. Operator details released." });
    } finally { setIsProcessingQueue(false); }
  };

  const handleRunAiArchitect = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Architect Error' });
    } finally { setIsAiLoading(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden">
      <aside className="w-72 bg-black/40 flex flex-col shrink-0 border-r border-white/5 shadow-sm z-20 backdrop-blur-3xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary rounded-xl text-black shadow-lg shadow-primary/20"><ConnectingDotsLogo className="h-5 w-5" /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase text-primary leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', label: 'Command Hub', icon: LayoutDashboard },
            { id: 'routes', label: 'Corridor Deploy', icon: RouteIcon },
            { id: 'fleet', label: 'Fleet Intel', icon: Car },
            { id: 'ai-architect', label: 'AI Architect', icon: Sparkles },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-primary hover:bg-white/5'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <button className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 font-black uppercase italic h-14 px-5 rounded-xl transition-all" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Logout
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-background/50 border-b border-white/5 px-10 flex items-center justify-between backdrop-blur-3xl">
          <div>
            <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter leading-none">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2 flex items-center gap-2">
               <Activity className="h-3 w-3 text-primary animate-pulse" /> Live Operational Terminal
            </p>
          </div>
          <div className="flex items-center gap-4">
             <Button onClick={handlePurgeTestData} disabled={isPurging} variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white h-12 px-6 rounded-xl font-black uppercase italic">
                {isPurging ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} Reset Grid
             </Button>
             <Button onClick={handleProcessGridQueue} disabled={isProcessingQueue} className="bg-white/5 border border-white/10 text-foreground font-black uppercase italic h-12 px-6 rounded-xl hover:bg-primary hover:text-black transition-all">
                {isProcessingQueue ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Clock className="h-4 w-4 mr-2" />} Process Grid (3H)
             </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Grid Demand', value: stats.totalRiders, icon: Users },
                  { label: 'Fleet Sync', value: stats.totalDrivers, icon: Car },
                  { label: 'Capacity Yield', value: `${stats.utilization}%`, icon: Target },
                  { label: 'Active Corridors', value: allRoutes?.length || 0, icon: RouteIcon },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl group hover:border-primary/50 transition-all">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4"><metric.icon className="h-5 w-5 text-primary" /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground italic leading-none tracking-tighter">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                       <CardTitle className="text-xl font-black italic uppercase text-primary">Live Mission Hub</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y divide-white/5">
                          {activeTrips?.slice(0, 5).map((trip: any) => (
                            <div key={trip.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${trip.status === 'scheduled' ? 'bg-primary text-black' : 'bg-white/10 text-white/40'}`}><Bus className="h-5 w-5" /></div>
                                  <div>
                                     <p className="font-black italic uppercase text-foreground leading-none">{trip.routeName}</p>
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 italic">{trip.riderCount} / {trip.maxCapacity} Seats • {trip.status.toUpperCase()}</p>
                                  </div>
                               </div>
                               <Badge className={`${trip.riderCount >= trip.maxCapacity ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'} border-none text-[8px] font-black uppercase px-3 py-1 rounded-full`}>{trip.riderCount >= trip.maxCapacity ? 'MAX' : 'FILLING'}</Badge>
                            </div>
                          ))}
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center space-y-6">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-2xl animate-pulse"><TrendingUp className="h-10 w-10" /></div>
                    <div className="space-y-2">
                       <h3 className="text-4xl font-black italic uppercase tracking-tighter">Yield Optimization</h3>
                       <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest max-w-xs">Maximizing vehicle capacity by filling first cars before deploying fleet units.</p>
                    </div>
                    <Button onClick={() => setActiveTab('ai-architect')} className="bg-primary text-black font-black uppercase italic px-10 h-14 rounded-2xl shadow-xl shadow-primary/20">Architect Growth</Button>
                 </Card>
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Corridor Deployer</h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Corridor Name</Label>
                        <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Airport Express" className="h-14 bg-white/5 border-white/10 font-black italic" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Base Fare (₹)</Label>
                        <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-14 bg-white/5 border-white/10 font-black italic" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Landmark Stops (Comma Separated)</Label>
                        <textarea value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Hub 1, Landmark A, Station X" className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                     </div>
                     <Button onClick={() => deployRoute(newRoute)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl transition-all">
                        <Plus className="mr-2 h-5 w-5" /> Deploy to Grid
                     </Button>
                  </Card>

                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Active Corridors</h4>
                     {allRoutes?.map((r: any) => (
                       <Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/50 transition-all">
                          <div>
                             <p className="text-xl font-black italic uppercase text-foreground leading-none">{r.routeName}</p>
                             <div className="flex items-center gap-3 mt-2">
                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">₹{r.baseFare}</Badge>
                                <span className="text-[8px] font-black text-muted-foreground uppercase">{r.stops?.length || 0} Landmarks</span>
                             </div>
                          </div>
                          <div className="flex -space-x-2">
                             {r.stops?.slice(0, 3).map((_: any, i: number) => (
                               <div key={i} className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-black text-primary">{i+1}</div>
                             ))}
                          </div>
                       </Card>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Fleet Intelligence</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input placeholder="Search Operator..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-14 rounded-2xl bg-white/5 border-white/10 font-black italic text-sm" />
                  </div>
               </div>
               
               <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                          <th className="py-6 px-10">Operator</th>
                          <th className="py-6">Mission Status</th>
                          <th className="py-6">Grid Authorization</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers?.filter(u => (u.role === 'driver' || u.role === 'rider') && (searchQuery === '' || u.phoneNumber?.includes(searchQuery) || u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()))).map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden italic border border-white/5">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <User className="h-6 w-6 opacity-30" />}
                                   </div>
                                   <div>
                                      <p className="font-black text-foreground uppercase italic text-sm leading-none">{u.fullName}</p>
                                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">{u.phoneNumber}</p>
                                      <Badge variant="outline" className="text-[7px] border-white/5 mt-1">{u.role?.toUpperCase()}</Badge>
                                   </div>
                                </div>
                             </td>
                             <td className="py-6">
                                <Badge className={`${u.status === 'on-trip' ? 'bg-primary text-black' : u.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-muted-foreground'} border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full`}>
                                   {u.status === 'on-trip' ? `On Corridor` : u.status || 'Offline'}
                                </Badge>
                             </td>
                             <td className="py-6">
                                <div className="flex items-center gap-2">
                                   {u.isVerified ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                                   <span className={`text-[8px] font-black uppercase tracking-widest ${u.isVerified ? 'text-primary' : 'text-destructive'}`}>
                                      {u.isVerified ? 'Synchronized' : 'Pending Verification'}
                                   </span>
                                </div>
                             </td>
                             <td className="py-6 px-10 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   {!u.isVerified && u.role === 'driver' && (
                                      <Button onClick={() => handleVerifyUser(u.uid)} className="bg-primary text-black font-black uppercase italic text-[9px] h-10 px-6 rounded-xl">Authorize</Button>
                                   )}
                                   <Button onClick={() => handleDeleteUser(u.uid)} variant="ghost" className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
               </Card>
            </div>
          )}

          {activeTab === 'ai-architect' && (
             <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Sparkles className="h-6 w-6" /></div>
                   <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Grid Architect AI</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Start Node</Label>
                            <Input value={aiInput.startPoint} onChange={e => setAiInput({...aiInput, startPoint: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Terminal Node</Label>
                            <Input value={aiInput.endPoint} onChange={e => setAiInput({...aiInput, endPoint: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Demand Context (e.g. 500+ Daily Residents)</Label>
                         <textarea value={aiInput.demandVolume} onChange={e => setAiInput({...aiInput, demandVolume: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                      </div>
                      <Button onClick={handleRunAiArchitect} disabled={isAiLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl transition-all active:scale-95">
                         {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Plan Corridor"}
                      </Button>
                   </Card>

                   <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 overflow-hidden relative min-h-[500px]">
                      {!aiResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                           <MapIcon className="h-24 w-24 mb-6" />
                           <p className="font-black italic uppercase tracking-widest text-[10px]">Architect Awaiting Mission</p>
                        </div>
                      ) : (
                        <div className="space-y-10 animate-in fade-in">
                           <div className="space-y-3">
                              <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full">Proposed Architecture</Badge>
                              <p className="text-sm font-medium italic text-muted-foreground leading-relaxed">{aiResult.optimizationSummary}</p>
                           </div>
                           <div className="space-y-6">
                              {aiResult.optimizedRoutes.map((r: any, i: number) => (
                                <Card key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6 group">
                                   <div className="flex justify-between items-start">
                                      <div className="space-y-1">
                                         <h5 className="text-2xl font-black italic uppercase text-foreground">{r.routeName}</h5>
                                         <p className="text-[10px] font-black text-primary uppercase italic">{r.schedule}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-3xl font-black italic text-foreground tracking-tighter">₹{r.suggestedBaseFare}</p>
                                      </div>
                                   </div>
                                   <div className="p-6 bg-black/60 rounded-2xl space-y-3">
                                      <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Target className="h-3 w-3" /> AI Justification</p>
                                      <p className="text-xs italic text-muted-foreground leading-relaxed">{r.aiJustification}</p>
                                   </div>
                                   <div className="space-y-3">
                                      <p className="text-[9px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Landmark Nodes</p>
                                      <div className="flex flex-wrap gap-2">
                                         {r.stops.map((s: string, idx: number) => (
                                           <Badge key={idx} variant="outline" className="bg-white/5 border-white/10 text-[8px] font-black italic">{s}</Badge>
                                         ))}
                                      </div>
                                   </div>
                                   <Button onClick={() => deployRoute(r)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl transition-all">
                                      Deploy Corridor
                                   </Button>
                                </Card>
                              ))}
                           </div>
                        </div>
                      )}
                   </Card>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}