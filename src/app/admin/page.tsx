
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
  Edit,
  Eye
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, orderBy, addDoc, where, deleteDoc, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';
import { analyzeDemandIntelligence, DemandIntelligenceInput } from '@/ai/flows/admin-demand-intelligence-flow';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'drivers' | 'customers' | 'ai-planner' | 'discounts'>('dashboard');
  const [aiSubTab, setAiSubTab] = useState<'generator' | 'demand'>('generator');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);

  // Edit State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingDocs, setViewingDocs] = useState<any>(null);

  // New Discount State
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: 0, status: 'active' });

  // Route State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', stops: '', schedule: '' });

  // AI Architect State
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    startPoint: "Central Hub",
    endPoint: "Main Market",
    demandVolume: "High",
    trafficContext: "Busy"
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Demand State
  const [demandInput, setDemandInput] = useState<DemandIntelligenceInput>({
    gridSnapshot: "Capacity at 50%",
    unmetRequests: "High demand near airport",
    externalContext: ""
  });
  const [demandResult, setDemandResult] = useState<any>(null);
  const [isDemandLoading, setIsDemandLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/admin/login');
  }, [authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: trips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), where('status', 'in', ['active', 'scheduled', 'on-trip'])) : null, [db]));
  const { data: coupons } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers')) : null, [db]));

  const stats = useMemo(() => {
    if (!allUsers) return { totalCustomers: 0, totalDrivers: 0, utilization: 0, activeDrivers: 0 };
    const drivers = allUsers.filter(u => u.role === 'driver');
    const customers = allUsers.filter(u => u.role === 'rider');
    const onTrip = drivers.filter(d => d.status === 'on-trip').length;
    return {
      totalCustomers: customers.length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(d => d.status === 'available' || d.status === 'on-trip').length,
      utilization: drivers.length > 0 ? Math.round((onTrip / drivers.length) * 100) : 0,
    };
  }, [allUsers]);

  const handleUpdateUser = async (uid: string, data: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', uid), data);
      toast({ title: "Updated", description: "Details saved." });
      setEditingUser(null);
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to update." });
    }
  };

  const handleApprove = (uid: string) => {
    if (!db) return;
    updateDoc(doc(db, 'users', uid), { isVerified: true })
      .then(() => toast({ title: "Approved", description: "Driver can now start working." }));
  };

  const handleDeleteUser = async (uid: string) => {
    if (!db) return;
    if (!confirm("Remove this person permanently?")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast({ title: "Removed", description: "Person deleted." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to remove." });
    }
  };

  const handleCleanData = async () => {
    if (!db || !confirm("Clear all trips and non-admin users?")) return;
    setIsCleaning(true);
    try {
      const tripsSnap = await getDocs(collection(db, 'trips'));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '!=', 'admin')));
      const tripsDeletes = tripsSnap.docs.map(d => deleteDoc(d.ref));
      const usersDeletes = usersSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all([...tripsDeletes, ...usersDeletes]);
      toast({ title: "Cleaned", description: "Service reset." });
    } finally { setIsCleaning(false); }
  };

  const addRoute = (data: any) => {
    if (!db) return;
    const stops = Array.isArray(data.stops) 
      ? data.stops.map((s: any) => ({ name: typeof s === 'string' ? s : s.name }))
      : data.stops.split(',').map((s: string) => ({ name: s.trim() }));
    
    addDoc(collection(db, 'routes'), {
      routeName: data.routeName || data.name,
      baseFare: Number(data.suggestedBaseFare || data.fare),
      stops: stops,
      schedule: data.schedule || "08:00 AM, 05:30 PM",
      status: 'active',
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Route Added", description: "New path is live." });
      setNewRoute({ name: '', fare: '', stops: '', schedule: '' });
      setActiveTab('routes');
    });
  };

  const addDiscount = async () => {
    if (!db || !newCoupon.code) return;
    try {
      await addDoc(collection(db, 'vouchers'), { ...newCoupon, code: newCoupon.code.toUpperCase() });
      toast({ title: "Added", description: "Discount code created." });
      setNewCoupon({ code: '', discount: 0, status: 'active' });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to add code." });
    }
  };

  const runPlanner = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
    } catch (e) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to plan.' });
    } finally { setIsAiLoading(false); }
  };

  const runDemandCheck = async () => {
    setIsDemandLoading(true);
    try {
      const result = await analyzeDemandIntelligence(demandInput);
      setDemandResult(result);
    } catch (e) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Check failed.' });
    } finally { setIsDemandLoading(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  const filteredUsers = allUsers?.filter(u => {
    const matchesSearch = searchQuery === '' || u.phoneNumber?.includes(searchQuery) || u.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'drivers') return u.role === 'driver' && matchesSearch;
    if (activeTab === 'customers') return u.role === 'rider' && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden">
      <aside className="w-72 bg-black/40 flex flex-col shrink-0 border-r border-white/5 backdrop-blur-xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary rounded-xl text-black"><Logo className="h-5 w-5" /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase text-primary">ADMIN</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'drivers', label: 'Drivers', icon: Car },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
            { id: 'ai-planner', label: 'AI Planner', icon: Sparkles },
            { id: 'discounts', label: 'Discounts', icon: Gift },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-black' : 'text-muted-foreground hover:bg-white/5'}`}>
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <button className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 font-black uppercase italic h-14 px-5 rounded-xl" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Logout
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 border-b border-white/5 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
             <Button onClick={handleCleanData} disabled={isCleaning} variant="outline" className="border-destructive/20 text-destructive h-12 px-6 rounded-xl font-black uppercase italic">
                {isCleaning ? "Cleaning..." : "Reset Service"}
             </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Drivers', value: stats.activeDrivers, icon: Car },
                  { label: 'Customers', value: stats.totalCustomers, icon: Users },
                  { label: 'Active Trip %', value: `${stats.utilization}%`, icon: Target },
                  { label: 'Total Routes', value: allRoutes?.length || 0, icon: RouteIcon },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4"><metric.icon className="h-5 w-5 text-primary" /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground italic leading-none">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                       <CardTitle className="text-xl font-black italic uppercase text-primary">Live Trips</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y divide-white/5">
                          {trips?.slice(0, 5).map((trip: any) => (
                            <div key={trip.id} className="p-6 flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-white/10 text-white/40 flex items-center justify-center"><RouteIcon className="h-5 w-5" /></div>
                                  <div>
                                     <p className="font-black italic uppercase text-foreground leading-none">{trip.routeName}</p>
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 italic">{trip.riderCount} Seats Booked</p>
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
                       <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest max-w-xs">Plan better routes</p>
                    </div>
                    <Button onClick={() => setActiveTab('ai-planner')} className="bg-primary text-black font-black uppercase italic px-10 h-14 rounded-2xl">Open Planner</Button>
                 </Card>
              </div>
            </div>
          )}

          {(activeTab === 'drivers' || activeTab === 'customers') && (
            <div className="space-y-10 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">{activeTab === 'drivers' ? 'Drivers' : 'Customers'}</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input placeholder="Search name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-14 rounded-2xl bg-white/5 border-white/10 font-black italic" />
                  </div>
               </div>
               
               <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                          <th className="py-6 px-10">Name</th>
                          <th className="py-6">Status</th>
                          <th className="py-6">Details</th>
                          <th className="py-6 px-10 text-right">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers?.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden italic">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <User className="h-6 w-6 opacity-30" />}
                                   </div>
                                   <div>
                                      <p className="font-black text-foreground uppercase italic text-sm leading-none">{u.fullName}</p>
                                      <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">{u.phoneNumber}</p>
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
                                   {u.isVerified ? <Badge className="bg-primary/20 text-primary uppercase text-[8px]">Verified</Badge> : <Badge className="bg-destructive/20 text-destructive uppercase text-[8px]">Checking</Badge>}
                                </div>
                             </td>
                             <td className="py-6 px-10 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   {u.role === 'driver' && (
                                      <Button onClick={() => setViewingDocs(u)} variant="ghost" className="h-10 w-10 p-0 text-white/40 hover:text-primary"><Eye className="h-4 w-4" /></Button>
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

          {activeTab === 'discounts' && (
            <div className="space-y-10 animate-in fade-in">
              <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Discount Codes</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Code</Label>
                      <input value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} placeholder="e.g. SAVE20" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic uppercase outline-none focus:border-primary" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Discount (₹)</Label>
                      <input type="number" value={newCoupon.discount} onChange={e => setNewCoupon({...newCoupon, discount: parseInt(e.target.value)})} placeholder="20" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                   </div>
                   <Button onClick={addDiscount} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl">
                      Add Code
                   </Button>
                </Card>
                <div className="space-y-4">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Active Codes</Label>
                   <div className="grid gap-4">
                      {coupons?.map((c: any) => (
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
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Name</Label>
                        <input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Airport Express" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Fare (₹)</Label>
                           <input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Times</Label>
                           <input value={newRoute.schedule} onChange={e => setNewRoute({...newRoute, schedule: e.target.value})} placeholder="08:00 AM, 05:30 PM" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Stops (Stop 1, Stop 2...)</Label>
                        <textarea value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Point A, Point B" className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                     </div>
                     <Button onClick={() => addRoute(newRoute)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl">
                        Add Route
                     </Button>
                  </Card>

                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Active Routes</Label>
                     <div className="grid gap-4">
                        {allRoutes?.map((r: any) => (
                        <Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group">
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

          {activeTab === 'ai-planner' && (
             <div className="space-y-10 animate-in fade-in">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Sparkles className="h-6 w-6" /></div>
                      <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">AI Planner</h3>
                   </div>
                   <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <Button onClick={() => setAiSubTab('generator')} className={`h-12 px-6 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${aiSubTab === 'generator' ? 'bg-primary text-black' : 'bg-transparent text-muted-foreground'}`}>Generator</Button>
                      <Button onClick={() => setAiSubTab('demand')} className={`h-12 px-6 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${aiSubTab === 'demand' ? 'bg-primary text-black' : 'bg-transparent text-muted-foreground'}`}>Demand Check</Button>
                   </div>
                </div>

                {aiSubTab === 'generator' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Start</Label>
                              <input value={aiInput.startPoint} onChange={e => setAiInput({...aiInput, startPoint: e.target.value})} className="h-14 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic text-foreground outline-none" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">End</Label>
                              <input value={aiInput.endPoint} onChange={e => setAiInput({...aiInput, endPoint: e.target.value})} className="h-14 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic text-foreground outline-none" />
                           </div>
                        </div>
                        <Button onClick={runPlanner} disabled={isAiLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg">
                           {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Plan Route with AI"}
                        </Button>
                     </Card>

                     <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 min-h-[500px]">
                        {!aiResult ? (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                              <MapIcon className="h-24 w-24 mb-6" />
                              <p className="font-black italic uppercase tracking-widest text-[10px]">Ready to Plan</p>
                           </div>
                        ) : (
                           <div className="space-y-10">
                              {aiResult.optimizedRoutes.map((r: any, i: number) => (
                                 <Card key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6">
                                    <div className="flex justify-between items-start">
                                       <div className="space-y-1">
                                          <h5 className="text-2xl font-black italic uppercase text-foreground">{r.routeName}</h5>
                                          <p className="text-[10px] font-black text-primary uppercase italic"> {r.schedule}</p>
                                       </div>
                                       <p className="text-3xl font-black italic text-foreground">₹{r.suggestedBaseFare}</p>
                                    </div>
                                    <Button onClick={() => addRoute(r)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl">
                                       Add this Route
                                    </Button>
                                 </Card>
                              ))}
                           </div>
                        )}
                     </Card>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Service Status</Label>
                           <textarea value={demandInput.gridSnapshot} onChange={e => setDemandInput({...demandInput, gridSnapshot: e.target.value})} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic outline-none" />
                        </div>
                        <Button onClick={runDemandCheck} disabled={isDemandLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg">
                           {isDemandLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Check Demand"}
                        </Button>
                     </Card>

                     <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 min-h-[500px]">
                        {!demandResult ? (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                              <Zap className="h-24 w-24 mb-6" />
                              <p className="font-black italic uppercase tracking-widest text-[10px]">Analyzing...</p>
                           </div>
                        ) : (
                           <div className="space-y-10">
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
            <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Edit Person</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Full Name</Label>
                  <input value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} className="h-12 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Phone</Label>
                  <input value={editingUser.phoneNumber} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} className="h-12 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none" />
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
            <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Identity Check</DialogTitle></DialogHeader>
            <div className="space-y-10 py-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">License Photo</p>
                     <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/5">
                        {viewingDocs.dlPhotoUrl ? <img src={viewingDocs.dlPhotoUrl} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><FileText className="h-10 w-10 opacity-10" /></div>}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">ID Photo</p>
                     <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/5">
                        {viewingDocs.aadhaarPhotoUrl ? <img src={viewingDocs.aadhaarPhotoUrl} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><FileText className="h-10 w-10 opacity-10" /></div>}
                     </div>
                  </div>
               </div>
               <div className="flex gap-4">
                  {!viewingDocs.isVerified ? (
                    <Button onClick={() => { handleApprove(viewingDocs.uid); setViewingDocs(null); }} className="flex-1 bg-primary text-black font-black uppercase italic h-14 rounded-2xl shadow-xl">Approve Person</Button>
                  ) : (
                    <Badge className="w-full justify-center bg-primary/20 text-primary h-14 text-lg font-black italic uppercase rounded-2xl">Approved</Badge>
                  )}
               </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
