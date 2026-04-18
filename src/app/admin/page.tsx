
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Activity,
  Target,
  TrendingUp,
  Map as MapIcon,
  Clock,
  Plus,
  Trash2,
  FileText,
  Zap,
  Gift,
  Edit,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Smile
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, orderBy, addDoc, where, deleteDoc, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';
import { analyzeDemandIntelligence, DemandIntelligenceInput } from '@/ai/flows/admin-demand-intelligence-flow';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'drivers' | 'customers' | 'ai-planner' | 'discounts' | 'analytics'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);

  // Edit State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingDocs, setViewingDocs] = useState<any>(null);

  // New Discount State
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: 0, status: 'active' });

  // Route State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', stops: '', schedule: '' });

  // AI Planner State
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    startPoint: "Central Hub",
    endPoint: "Main Market",
    demandVolume: "High",
    trafficContext: "Busy"
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/admin/login');
  }, [authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: trips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), where('status', 'in', ['active', 'scheduled', 'on-trip', 'completed'])) : null, [db]));
  const { data: coupons } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers')) : null, [db]));

  const stats = useMemo(() => {
    if (!allUsers) return { totalCustomers: 0, totalDrivers: 0, utilization: 0, activeDrivers: 0, avgNps: 0, repeatRate: 0 };
    const drivers = allUsers.filter(u => u.role === 'driver');
    const customers = allUsers.filter(u => u.role === 'rider');
    const onTrip = drivers.filter(d => d.status === 'on-trip').length;
    
    // Repeat Customer Logic
    const completedTrips = trips?.filter(t => t.status === 'completed') || [];
    const riderVisits: Record<string, number> = {};
    completedTrips.forEach(t => {
      t.passengerManifest?.forEach((m: any) => {
        riderVisits[m.uid] = (riderVisits[m.uid] || 0) + 1;
      });
    });
    const repeatCustomers = Object.values(riderVisits).filter(count => count > 1).length;
    const repeatRate = customers.length > 0 ? Math.round((repeatCustomers / customers.length) * 100) : 0;

    return {
      totalCustomers: customers.length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(d => d.status === 'available' || d.status === 'on-trip').length,
      utilization: drivers.length > 0 ? Math.round((onTrip / drivers.length) * 100) : 0,
      avgNps: 8.4, // Placeholder for NPS
      repeatRate
    };
  }, [allUsers, trips]);

  const chartData = useMemo(() => {
    if (!allUsers || !trips) return { growth: [], repeatData: [], routeRevenue: [] };

    // Growth Data (last 7 days)
    const growth = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = allUsers.filter(u => u.createdAt && isSameDay(parseISO(u.createdAt), date)).length;
      return { name: format(date, 'MMM dd'), users: count };
    });

    // Repeat Data
    const repeatData = [
      { name: 'Repeat People', value: stats.repeatRate, fill: 'hsl(var(--primary))' },
      { name: 'New People', value: 100 - stats.repeatRate, fill: 'rgba(255,255,255,0.1)' }
    ];

    // Route Revenue
    const revenueMap: Record<string, number> = {};
    trips.filter(t => t.status === 'completed').forEach(t => {
      revenueMap[t.routeName] = (revenueMap[t.routeName] || 0) + (t.farePerRider * (t.passengerManifest?.length || 0));
    });
    const routeRevenue = Object.entries(revenueMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

    return { growth, repeatData, routeRevenue };
  }, [allUsers, trips, stats]);

  const handleUpdateUser = async (uid: string, data: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', uid), data);
      toast({ title: "Saved", description: "Details updated." });
      setEditingUser(null);
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to update." });
    }
  };

  const handleApprove = (uid: string) => {
    if (!db) return;
    updateDoc(doc(db, 'users', uid), { isVerified: true })
      .then(() => toast({ title: "Approved", description: "Driver is now active." }));
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
      toast({ title: "Cleaned", description: "Reset complete." });
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
      toast({ title: "Route Added", description: "New route is live." });
      setNewRoute({ name: '', fare: '', stops: '', schedule: '' });
      setActiveTab('routes');
    });
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
            <span className="text-2xl font-black italic tracking-tighter uppercase text-primary tracking-widest">AAGO</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'drivers', label: 'Drivers', icon: Car },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
            { id: 'ai-planner', label: 'Route Help', icon: Sparkles },
            { id: 'discounts', label: 'Discounts', icon: Gift },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}>
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
          <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{activeTab}</h2>
          <Button onClick={handleCleanData} disabled={isCleaning} variant="outline" className="border-destructive/20 text-destructive h-12 px-6 rounded-xl font-black uppercase italic">
            {isCleaning ? "Cleaning..." : "Clear Data"}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Active Drivers', value: stats.activeDrivers, icon: Car },
                  { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
                  { label: 'Happiness (NPS)', value: stats.avgNps, icon: Smile },
                  { label: 'Repeat Rate', value: `${stats.repeatRate}%`, icon: Target },
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
                    <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between">
                       <CardTitle className="text-xl font-black italic uppercase text-primary">Live Trips</CardTitle>
                       <Badge className="bg-primary/20 text-primary border-none uppercase text-[8px] font-black">{trips?.filter(t => t.status !== 'completed').length} Active</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y divide-white/5">
                          {trips?.filter(t => t.status !== 'completed').slice(0, 5).map((trip: any) => (
                            <div key={trip.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-white/10 text-white/40 flex items-center justify-center"><RouteIcon className="h-5 w-5" /></div>
                                  <div>
                                     <p className="font-black italic uppercase text-foreground leading-none">{trip.routeName}</p>
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 italic">{trip.riderCount} Seats Taken</p>
                                  </div>
                               </div>
                               <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">{trip.status}</Badge>
                            </div>
                          ))}
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-primary p-10 rounded-[2.5rem] flex flex-col justify-center items-center text-center space-y-6 shadow-2xl shadow-primary/20">
                    <div className="h-20 w-20 bg-black/10 rounded-full flex items-center justify-center text-black shadow-xl"><Sparkles className="h-10 w-10" /></div>
                    <div className="space-y-2">
                       <h3 className="text-4xl font-black italic uppercase tracking-tighter text-black">Route Help</h3>
                       <p className="text-sm font-bold text-black/60 italic uppercase tracking-widest max-w-xs">AI will find better routes for you</p>
                    </div>
                    <Button onClick={() => setActiveTab('ai-planner')} className="bg-black text-primary font-black uppercase italic px-10 h-14 rounded-2xl hover:bg-black/80">Open Planner</Button>
                 </Card>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* User Growth Chart */}
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8">
                  <CardHeader className="px-0 pt-0 pb-8">
                    <CardTitle className="text-xl font-black italic uppercase text-primary flex items-center gap-3">
                      <TrendingUp className="h-5 w-5" /> New People
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">New signups over the last 7 days</CardDescription>
                  </CardHeader>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.growth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }} />
                        <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Repeat Customers Pie */}
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8">
                  <CardHeader className="px-0 pt-0 pb-8">
                    <CardTitle className="text-xl font-black italic uppercase text-primary flex items-center gap-3">
                      <PieChartIcon className="h-5 w-5" /> Repeated Rides
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Customer loyalty and repeat bookings</CardDescription>
                  </CardHeader>
                  <div className="h-[300px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.repeatData}
                          innerRadius={80}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.repeatData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black italic text-primary">{stats.repeatRate}%</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Repeated</span>
                    </div>
                  </div>
                </Card>

                {/* Route Revenue Pivot */}
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8 lg:col-span-2">
                  <CardHeader className="px-0 pt-0 pb-8">
                    <CardTitle className="text-xl font-black italic uppercase text-primary flex items-center gap-3">
                      <Activity className="h-5 w-5" /> Top Routes
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Highest earning routes in the service</CardDescription>
                  </CardHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.routeRevenue} layout="vertical" margin={{ left: 40 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#666" fontSize={10} width={100} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">People Activity</Label>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {allUsers?.slice(0, 10).sort((a,b) => (b.lastLogin || '').localeCompare(a.lastLogin || '')).map((u: any) => (
                          <div key={u.uid} className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                            <div>
                              <p className="font-black italic uppercase text-foreground text-xs">{u.fullName}</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">{u.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-primary uppercase italic">Last Seen</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">
                                {u.lastLogin ? format(parseISO(u.lastLogin), 'MMM dd, HH:mm') : 'Never'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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
                          <th className="py-6">Verified</th>
                          <th className="py-6 px-10 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers?.map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all group">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden italic border border-primary/20">
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
                                {u.isVerified ? <Badge className="bg-primary/20 text-primary uppercase text-[8px] font-black">Yes</Badge> : <Badge className="bg-destructive/20 text-destructive uppercase text-[8px] font-black">Checking</Badge>}
                             </td>
                             <td className="py-6 px-10 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   {u.role === 'driver' && (
                                      <Button onClick={() => setViewingDocs(u)} variant="ghost" className="h-10 w-10 p-0 text-white/40 hover:text-primary transition-colors"><Eye className="h-4 w-4" /></Button>
                                   )}
                                   <Button onClick={() => setEditingUser(u)} variant="ghost" className="h-10 w-10 p-0 text-white/40 hover:text-primary transition-colors"><Edit className="h-4 w-4" /></Button>
                                   <Button onClick={() => handleDeleteUser(u.uid)} variant="ghost" className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></Button>
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
                   <Button onClick={async () => {
                     if (!db || !newCoupon.code) return;
                     await addDoc(collection(db, 'vouchers'), { ...newCoupon, code: newCoupon.code.toUpperCase() });
                     setNewCoupon({ code: '', discount: 0, status: 'active' });
                     toast({ title: "Added", description: "New code is active." });
                   }} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20">
                      Add Code
                   </Button>
                </Card>
                <div className="space-y-4">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Active Codes</Label>
                   <div className="grid gap-4">
                      {coupons?.map((c: any) => (
                        <Card key={c.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/20 transition-all">
                           <div>
                              <p className="text-xl font-black italic uppercase text-foreground leading-none">{c.code}</p>
                              <p className="text-[9px] font-bold text-primary uppercase mt-1">₹{c.discount} OFF</p>
                           </div>
                           <Button variant="ghost" className="text-destructive h-10 w-10 p-0 hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, 'vouchers', c.id))}><Trash2 className="h-4 w-4" /></Button>
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
                        <input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Airport Express" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Price (₹)</Label>
                           <input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Times</Label>
                           <input value={newRoute.schedule} onChange={e => setNewRoute({...newRoute, schedule: e.target.value})} placeholder="08:00 AM, 05:30 PM" className="h-14 w-full px-6 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none focus:border-primary" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Stops (comma separated)</Label>
                        <textarea value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Point A, Point B" className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none resize-none" />
                     </div>
                     <Button onClick={() => addRoute(newRoute)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20">
                        Add Route
                     </Button>
                  </Card>

                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Active Routes</Label>
                     <div className="grid gap-4">
                        {allRoutes?.map((r: any) => (
                        <Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/20 transition-all">
                           <div>
                              <p className="text-xl font-black italic uppercase text-foreground leading-none">{r.routeName}</p>
                              <div className="flex items-center gap-3 mt-2">
                                 <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">₹{r.baseFare}</Badge>
                                 <span className="text-[8px] font-black text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> {r.schedule}</span>
                              </div>
                           </div>
                           <Button variant="ghost" className="text-destructive h-10 w-10 p-0 hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, 'routes', r.id))}><Trash2 className="h-4 w-4" /></Button>
                        </Card>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ai-planner' && (
             <div className="space-y-10 animate-in fade-in">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-xl shadow-primary/5"><Sparkles className="h-6 w-6" /></div>
                   <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Route Help</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Start Point</Label>
                            <input value={aiInput.startPoint} onChange={e => setAiInput({...aiInput, startPoint: e.target.value})} className="h-14 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic text-foreground outline-none focus:border-primary" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">End Point</Label>
                            <input value={aiInput.endPoint} onChange={e => setAiInput({...aiInput, endPoint: e.target.value})} className="h-14 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic text-foreground outline-none focus:border-primary" />
                         </div>
                      </div>
                      <Button onClick={async () => {
                         setIsAiLoading(true);
                         try {
                           const res = await generateShuttleRoutes(aiInput);
                           setAiResult(res);
                         } finally { setIsAiLoading(false); }
                      }} disabled={isAiLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-primary/20">
                         {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Plan with AI"}
                      </Button>
                   </Card>

                   <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 min-h-[500px]">
                      {!aiResult ? (
                         <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                            <MapIcon className="h-24 w-24 mb-6" />
                            <p className="font-black italic uppercase tracking-widest text-[10px]">AI Planner Ready</p>
                         </div>
                      ) : (
                         <div className="space-y-10">
                            {aiResult.optimizedRoutes.map((r: any, i: number) => (
                               <Card key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6 hover:border-primary/40 transition-all">
                                  <div className="flex justify-between items-start">
                                     <div className="space-y-1">
                                        <h5 className="text-2xl font-black italic uppercase text-foreground">{r.routeName}</h5>
                                        <p className="text-[10px] font-black text-primary uppercase italic"> {r.schedule}</p>
                                     </div>
                                     <p className="text-3xl font-black italic text-foreground">₹{r.suggestedBaseFare}</p>
                                  </div>
                                  <Button onClick={() => addRoute(r)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-lg">
                                     Use this Route
                                  </Button>
                               </Card>
                            ))}
                         </div>
                      )}
                   </Card>
                </div>
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
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Name</Label>
                  <input value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} className="h-12 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Phone</Label>
                  <input value={editingUser.phoneNumber} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} className="h-12 w-full px-4 rounded-xl bg-white/5 border border-white/10 font-black italic outline-none" />
               </div>
            </div>
            <DialogFooter className="flex gap-4">
               <Button onClick={() => handleUpdateUser(editingUser.uid, editingUser)} className="w-full bg-primary text-black font-black uppercase italic h-14 rounded-xl">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {viewingDocs && (
        <Dialog open={!!viewingDocs} onOpenChange={() => setViewingDocs(null)}>
          <DialogContent className="bg-background border-white/10 rounded-[2.5rem] p-10 max-w-2xl">
            <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">ID Check</DialogTitle></DialogHeader>
            <div className="space-y-10 py-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">License</p>
                     <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/5">
                        {viewingDocs.dlPhotoUrl ? <img src={viewingDocs.dlPhotoUrl} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><FileText className="h-10 w-10 opacity-10" /></div>}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">ID Card</p>
                     <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/5">
                        {viewingDocs.aadhaarPhotoUrl ? <img src={viewingDocs.aadhaarPhotoUrl} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><FileText className="h-10 w-10 opacity-10" /></div>}
                     </div>
                  </div>
               </div>
               <div className="flex gap-4">
                  {!viewingDocs.isVerified ? (
                    <Button onClick={() => { handleApprove(viewingDocs.uid); setViewingDocs(null); }} className="flex-1 bg-primary text-black font-black uppercase italic h-16 rounded-2xl shadow-xl">Approve Driver</Button>
                  ) : (
                    <Badge className="w-full justify-center bg-primary/20 text-primary h-16 text-lg font-black italic uppercase rounded-2xl border-none">Already Approved</Badge>
                  )}
               </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
