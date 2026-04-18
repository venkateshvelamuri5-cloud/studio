
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
  DialogFooter
} from "@/components/ui/dialog";
import { 
  LayoutDashboard, 
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
  Plus,
  Trash2,
  FileText,
  UserCheck,
  Zap,
  Gift,
  Edit
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, orderBy, addDoc, where, deleteDoc, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';
import { analyzeDemandIntelligence, DemandIntelligenceInput } from '@/ai/flows/admin-demand-intelligence-flow';

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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'fleet' | 'riders' | 'ai-architect' | 'coupons'>('dashboard');
  const [aiSubTab, setAiSubTab] = useState<'generator' | 'intelligence'>('generator');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Edit State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingDocs, setViewingDocs] = useState<any>(null);

  // New Coupon State
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: 0, status: 'active' });

  // Route Deployment State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', stops: '', schedule: '' });

  // AI Architect State
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    startPoint: "Main Station",
    endPoint: "IT Park",
    demandVolume: "High demand",
    trafficContext: "Heavy traffic at 9 AM"
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Demand Intel State
  const [demandInput, setDemandInput] = useState<DemandIntelligenceInput>({
    gridSnapshot: "Capacity at 40%",
    unmetRequests: "High demand for Airport route",
    externalContext: "Rains expected"
  });
  const [demandResult, setDemandResult] = useState<any>(null);
  const [isDemandLoading, setIsDemandLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/admin/login');
  }, [authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: activeTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), where('status', 'in', ['active', 'scheduled', 'on-trip'])) : null, [db]));
  const { data: allCoupons } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers')) : null, [db]));

  const stats = useMemo(() => {
    if (!allUsers) return { totalRiders: 0, totalDrivers: 0, utilization: 0, pendingDrivers: 0, activeFleet: 0 };
    const drivers = allUsers.filter(u => u.role === 'driver');
    const riders = allUsers.filter(u => u.role === 'rider');
    const onTrip = drivers.filter(d => d.status === 'on-trip').length;
    return {
      totalRiders: riders.length,
      totalDrivers: drivers.length,
      activeFleet: drivers.filter(d => d.status === 'available' || d.status === 'on-trip').length,
      utilization: drivers.length > 0 ? Math.round((onTrip / drivers.length) * 100) : 0,
      pendingDrivers: drivers.filter(u => u.role === 'driver' && !u.isVerified).length
    };
  }, [allUsers]);

  const handleUpdateUser = async (uid: string, data: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', uid), data);
      toast({ title: "User Updated" });
      setEditingUser(null);
    } catch (e) {
      toast({ variant: 'destructive', title: "Update Failed" });
    }
  };

  const handleVerifyUser = (uid: string) => {
    if (!db) return;
    updateDoc(doc(db, 'users', uid), { isVerified: true })
      .then(() => toast({ title: "Driver Approved" }));
  };

  const handleDeleteUser = async (uid: string) => {
    if (!db) return;
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast({ title: "User Deleted" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Action Failed" });
    }
  };

  const handlePurgeTestData = async () => {
    if (!db || !confirm("Clear all test rides and data?")) return;
    setIsPurging(true);
    try {
      const tripsSnap = await getDocs(collection(db, 'trips'));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '!=', 'admin')));
      const tripsDeletes = tripsSnap.docs.map(d => deleteDoc(d.ref));
      const usersDeletes = usersSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all([...tripsDeletes, ...usersDeletes]);
      toast({ title: "Hub Reset" });
    } finally { setIsPurging(false); }
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
      schedule: routeData.schedule || "08:00 AM, 05:30 PM",
      status: 'active',
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Route Deployed" });
      setNewRoute({ name: '', fare: '', stops: '', schedule: '' });
      setActiveTab('routes');
    });
  };

  const handleAddCoupon = async () => {
    if (!db || !newCoupon.code) return;
    try {
      await addDoc(collection(db, 'vouchers'), { ...newCoupon, code: newCoupon.code.toUpperCase() });
      toast({ title: "Coupon Added" });
      setNewCoupon({ code: '', discount: 0, status: 'active' });
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to add coupon" });
    }
  };

  const handleRunAiArchitect = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
    } catch (e) {
      toast({ variant: 'destructive', title: 'AI Architect Error' });
    } finally { setIsAiLoading(false); }
  };

  const handleRunDemandIntel = async () => {
    setIsDemandLoading(true);
    try {
      const result = await analyzeDemandIntelligence(demandInput);
      setDemandResult(result);
    } catch (e) {
      toast({ variant: 'destructive', title: 'AI Demand Intel Error' });
    } finally { setIsDemandLoading(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  const filteredUsers = allUsers?.filter(u => {
    const matchesSearch = searchQuery === '' || u.phoneNumber?.includes(searchQuery) || u.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'fleet') return u.role === 'driver' && matchesSearch;
    if (activeTab === 'riders') return u.role === 'rider' && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden">
      <aside className="w-72 bg-black/40 flex flex-col shrink-0 border-r border-white/5 backdrop-blur-xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary rounded-xl text-black"><ConnectingDotsLogo className="h-5 w-5" /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase text-primary">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fleet', label: 'Drivers', icon: Car },
            { id: 'riders', label: 'Riders', icon: Users },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
            { id: 'ai-architect', label: 'AI Planner', icon: Sparkles },
            { id: 'coupons', label: 'Coupons', icon: Gift },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-black' : 'text-muted-foreground hover:bg-white/5'}`}>
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
            <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{activeTab}</h2>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2 flex items-center gap-2">
               <Activity className="h-3 w-3 text-primary animate-pulse" /> Hub Status: Online
            </p>
          </div>
          <div className="flex items-center gap-4">
             <Button onClick={handlePurgeTestData} disabled={isPurging} variant="outline" className="border-destructive/20 text-destructive h-12 px-6 rounded-xl font-black uppercase italic">
                {isPurging ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Clear Data
             </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Active Fleet', value: stats.activeFleet, icon: Car },
                  { label: 'Total Riders', value: stats.totalRiders, icon: Users },
                  { label: 'Utilization', value: `${stats.utilization}%`, icon: Target },
                  { label: 'Live Routes', value: allRoutes?.length || 0, icon: RouteIcon },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl group hover:border-primary/50 transition-all">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4"><metric.icon className="h-5 w-5 text-primary" /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground italic leading-none">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {stats.pendingDrivers > 0 && (
                <Card className="bg-destructive/10 border-destructive/20 rounded-2xl p-6 flex items-center justify-between border">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-destructive/20 rounded-xl flex items-center justify-center text-destructive"><ShieldAlert className="h-5 w-5" /></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-destructive">Approval Required</p>
                         <p className="text-sm font-bold italic uppercase">{stats.pendingDrivers} drivers are waiting for approval.</p>
                      </div>
                   </div>
                   <Button onClick={() => setActiveTab('fleet')} className="bg-destructive text-white font-black uppercase italic h-10 px-6 rounded-xl">Review</Button>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                       <CardTitle className="text-xl font-black italic uppercase text-primary">Live Rides</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y divide-white/5">
                          {activeTrips?.slice(0, 5).map((trip: any) => (
                            <div key={trip.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-white/10 text-white/40 flex items-center justify-center"><RouteIcon className="h-5 w-5" /></div>
                                  <div>
                                     <p className="font-black italic uppercase text-foreground leading-none">{trip.routeName}</p>
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 italic">{trip.riderCount} Seats • {trip.status}</p>
                                  </div>
                               </div>
                               <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">{trip.status}</Badge>
                            </div>
                          ))}
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center space-y-6">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-2xl animate-pulse"><TrendingUp className="h-10 w-10" /></div>
                    <div className="space-y-2">
                       <h3 className="text-4xl font-black italic uppercase tracking-tighter">AI Planner</h3>
                       <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest max-w-xs">Optimized Route Creation</p>
                    </div>
                    <Button onClick={() => setActiveTab('ai-architect')} className="bg-primary text-black font-black uppercase italic px-10 h-14 rounded-2xl">Open AI Planner</Button>
                 </Card>
              </div>
            </div>
          )}

          {(activeTab === 'fleet' || activeTab === 'riders') && (
            <div className="space-y-10 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">{activeTab === 'fleet' ? 'Drivers' : 'Riders'}</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input placeholder="Search name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-14 rounded-2xl bg-white/5 border-white/10 font-black italic" />
                  </div>
               </div>
               
               <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                          <th className="py-6 px-10">Name</th>
                          <th className="py-6">Status</th>
                          <th className="py-6">Approval</th>
                          <th className="py-6 px-10 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers?.map((u: any) => (
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
                                <Badge className={`${u.status === 'on-trip' ? 'bg-primary text-black' : u.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-muted-foreground'} border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full`}>
                                   {u.status || 'Offline'}
                                </Badge>
                             </td>
                             <td className="py-6">
                                <div className="flex items-center gap-2">
                                   {u.isVerified ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                                </div>
                             </td>
                             <td className="py-6 px-10 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   {u.role === 'driver' && !u.isVerified && (
                                      <Button onClick={() => setViewingDocs(u)} variant="ghost" className="h-10 px-4 bg-primary/10 text-primary font-black uppercase italic text-[9px] rounded-xl hover:bg-primary hover:text-black">Check Docs</Button>
                                   )}
                                   <Button onClick={() => setEditingUser(u)} variant="ghost" className="h-10 w-10 p-0 text-white/40 hover:text-primary"><Edit className="h-4 w-4" /></Button>
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

          {activeTab === 'coupons' && (
            <div className="space-y-10 animate-in fade-in">
              <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Coupon Hub</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Coupon Code</Label>
                      <Input value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} placeholder="e.g. AAGO20" className="h-14 bg-white/5 border-white/10 font-black italic uppercase" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Discount (₹)</Label>
                      <Input type="number" value={newCoupon.discount} onChange={e => setNewCoupon({...newCoupon, discount: parseInt(e.target.value)})} placeholder="20" className="h-14 bg-white/5 border-white/10 font-black italic" />
                   </div>
                   <Button onClick={handleAddCoupon} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl">
                      Add Coupon
                   </Button>
                </Card>
                <div className="space-y-4">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Active Coupons</Label>
                   <div className="grid gap-4">
                      {allCoupons?.map((c: any) => (
                        <Card key={c.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center">
                           <div>
                              <p className="text-xl font-black italic uppercase text-foreground leading-none">{c.code}</p>
                              <p className="text-[9px] font-bold text-primary uppercase mt-1">₹{c.discount} OFF</p>
                           </div>
                           <Button variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => deleteDoc(doc(db!, 'vouchers', c.id))}><Trash2 className="h-4 w-4" /></Button>
                        </Card>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in">
               <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Routes</h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Route Name</Label>
                        <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Airport Express" className="h-14 bg-white/5 border-white/10 font-black italic" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Fare (₹)</Label>
                           <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-14 bg-white/5 border-white/10 font-black italic" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Departure Times</Label>
                           <Input value={newRoute.schedule} onChange={e => setNewRoute({...newRoute, schedule: e.target.value})} placeholder="08:00 AM, 05:30 PM" className="h-14 bg-white/5 border-white/10 font-black italic" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Landmarks (Stop 1, Stop 2...)</Label>
                        <textarea value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Landmark 1, Landmark 2" className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                     </div>
                     <Button onClick={() => deployRoute(newRoute)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl">
                        Deploy Route
                     </Button>
                  </Card>

                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Active Routes</Label>
                     <div className="grid gap-4">
                        {allRoutes?.map((r: any) => (
                        <Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/50 transition-all">
                           <div>
                              <p className="text-xl font-black italic uppercase text-foreground leading-none">{r.routeName}</p>
                              <div className="flex items-center gap-3 mt-2">
                                 <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">₹{r.baseFare}</Badge>
                                 <span className="text-[8px] font-black text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> {r.schedule}</span>
                              </div>
                           </div>
                           <Button variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => deleteDoc(doc(db!, 'routes', r.id))}><Trash2 className="h-4 w-4" /></Button>
                        </Card>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ai-architect' && (
             <div className="space-y-10 animate-in fade-in">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Sparkles className="h-6 w-6" /></div>
                      <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">AI Planner</h3>
                   </div>
                   <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <Button onClick={() => setAiSubTab('generator')} className={`h-12 px-6 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${aiSubTab === 'generator' ? 'bg-primary text-black' : 'bg-transparent text-muted-foreground'}`}>Generator</Button>
                      <Button onClick={() => setAiSubTab('intelligence')} className={`h-12 px-6 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${aiSubTab === 'intelligence' ? 'bg-primary text-black' : 'bg-transparent text-muted-foreground'}`}>Demand Intel</Button>
                   </div>
                </div>

                {aiSubTab === 'generator' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Start Node</Label>
                              <Input value={aiInput.startPoint} onChange={e => setAiInput({...aiInput, startPoint: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">End Node</Label>
                              <Input value={aiInput.endPoint} onChange={e => setAiInput({...aiInput, endPoint: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                           </div>
                        </div>
                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Context</Label>
                           <textarea value={aiInput.demandVolume} onChange={e => setAiInput({...aiInput, demandVolume: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                        </div>
                        <Button onClick={handleRunAiArchitect} disabled={isAiLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg">
                           {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Plan Route with AI"}
                        </Button>
                     </Card>

                     <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 overflow-hidden min-h-[500px]">
                        {!aiResult ? (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                              <MapIcon className="h-24 w-24 mb-6" />
                              <p className="font-black italic uppercase tracking-widest text-[10px]">Ready to Plan</p>
                           </div>
                        ) : (
                           <div className="space-y-10">
                              <div className="space-y-3">
                                 <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full">Proposal</Badge>
                                 <p className="text-sm font-medium italic text-muted-foreground leading-relaxed">{aiResult.optimizationSummary}</p>
                              </div>
                              <div className="space-y-6">
                                 {aiResult.optimizedRoutes.map((r: any, i: number) => (
                                 <Card key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6">
                                    <div className="flex justify-between items-start">
                                       <div className="space-y-1">
                                          <h5 className="text-2xl font-black italic uppercase text-foreground">{r.routeName}</h5>
                                          <p className="text-[10px] font-black text-primary uppercase italic flex items-center gap-1"><Clock className="h-3 w-3" /> {r.schedule}</p>
                                       </div>
                                       <p className="text-3xl font-black italic text-foreground">₹{r.suggestedBaseFare}</p>
                                    </div>
                                    <Button onClick={() => deployRoute(r)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl">
                                       Deploy Route
                                    </Button>
                                 </Card>
                                 ))}
                              </div>
                           </div>
                        )}
                     </Card>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Grid Snapshot</Label>
                           <textarea value={demandInput.gridSnapshot} onChange={e => setDemandInput({...demandInput, gridSnapshot: e.target.value})} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                        </div>
                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Unmet Demand</Label>
                           <textarea value={demandInput.unmetRequests} onChange={e => setDemandInput({...demandInput, unmetRequests: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                        </div>
                        <Button onClick={handleRunDemandIntel} disabled={isDemandLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg">
                           {isDemandLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Run AI Intel"}
                        </Button>
                     </Card>

                     <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 overflow-hidden min-h-[500px]">
                        {!demandResult ? (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                              <Zap className="h-24 w-24 mb-6" />
                              <p className="font-black italic uppercase tracking-widest text-[10px]">Analyzing Hub Patterns</p>
                           </div>
                        ) : (
                           <div className="space-y-10">
                              <div className="space-y-3">
                                 <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full">Analysis Report</Badge>
                                 <p className="text-sm font-medium italic text-muted-foreground leading-relaxed">{demandResult.strategicSummary}</p>
                              </div>
                              <div className="space-y-6">
                                 {demandResult.hotspots.map((h: any, i: number) => (
                                 <Card key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                                    <h5 className="text-2xl font-black italic uppercase text-foreground">{h.locationName}</h5>
                                    <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">{h.demandLevel}</Badge>
                                    <p className="text-xs italic text-muted-foreground">{h.justification}</p>
                                 </Card>
                                 ))}
                              </div>
                           </div>
                        )}
                     </Card>
                  </div>
                )}
             </div>
          )}
        </div>
      </main>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="bg-background border-white/10 rounded-[2.5rem] p-10 max-w-md">
            <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Edit Member</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Full Name</Label>
                  <Input value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} className="h-12 bg-white/5 border-white/10 font-black italic" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Phone</Label>
                  <Input value={editingUser.phoneNumber} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} className="h-12 bg-white/5 border-white/10 font-black italic" />
               </div>
            </div>
            <DialogFooter className="flex gap-4">
               <Button onClick={() => handleUpdateUser(editingUser.uid, editingUser)} className="bg-primary text-black font-black uppercase italic px-10 rounded-xl">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {viewingDocs && (
        <Dialog open={!!viewingDocs} onOpenChange={() => setViewingDocs(null)}>
          <DialogContent className="bg-background border-white/10 rounded-[2.5rem] p-10 max-w-2xl">
            <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">ID Verification</DialogTitle></DialogHeader>
            <div className="space-y-10 py-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">License</p>
                     <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/5">
                        {viewingDocs.dlPhotoUrl ? <img src={viewingDocs.dlPhotoUrl} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><FileText className="h-10 w-10 opacity-10" /></div>}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Aadhaar</p>
                     <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/5">
                        {viewingDocs.aadhaarPhotoUrl ? <img src={viewingDocs.aadhaarPhotoUrl} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><FileText className="h-10 w-10 opacity-10" /></div>}
                     </div>
                  </div>
               </div>
               <div className="flex gap-4">
                  <Button onClick={() => { handleVerifyUser(viewingDocs.uid); setViewingDocs(null); }} className="flex-1 bg-primary text-black font-black uppercase italic h-14 rounded-2xl">Approve Driver</Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
