
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  LayoutDashboard, 
  LogOut,
  Loader2,
  Users,
  Route as RouteIcon,
  Car,
  Target,
  BarChart3,
  Smile,
  Plus,
  Trash2,
  ChevronRight,
  Ticket,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  MapPin,
  CalendarDays
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, orderBy, addDoc, deleteDoc, getDocs, updateDoc, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
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

type AdminTab = 'dashboard' | 'customers' | 'drivers' | 'routes' | 'analytics' | 'vouchers';

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isCleaning, setIsCleaning] = useState(false);

  // Route Creation State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', schedule: '', stops: [] as any[] });
  const [tempStopName, setTempStopName] = useState("");

  // Voucher Creation State
  const [newVoucher, setNewVoucher] = useState({ code: '', discount: '', limit: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) router.push('/admin/login');
  }, [mounted, authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: trips } = useCollection(useMemo(() => db ? query(collection(db, 'trips')) : null, [db]));
  const { data: vouchers } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers')) : null, [db]));

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const customers = useMemo(() => allUsers?.filter(u => u.role === 'rider' || u.role === 'customer') || [], [allUsers]);

  const stats = useMemo(() => {
    if (!allUsers) return { totalCustomers: 0, totalDrivers: 0, activeDrivers: 0, avgNps: 8.8, repeatRate: 0 };
    
    const completedTrips = (trips || []).filter(t => t.status === 'completed');
    const riderVisits: Record<string, number> = {};
    completedTrips.forEach(t => {
      t.passengerManifest?.forEach((m: any) => {
        if (m.uid) riderVisits[m.uid] = (riderVisits[m.uid] || 0) + 1;
      });
    });
    const repeatCustomersCount = Object.values(riderVisits).filter(count => count > 1).length;
    const repeatRate = customers.length > 0 ? Math.round((repeatCustomersCount / customers.length) * 100) : 0;

    return {
      totalCustomers: customers.length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(d => d.status === 'available' || d.status === 'on-trip').length,
      avgNps: 8.8,
      repeatRate
    };
  }, [allUsers, trips, drivers, customers]);

  const chartData = useMemo(() => {
    if (!mounted || !allUsers || !trips) return { growth: [], repeatData: [] };

    const growth = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = allUsers.filter(u => {
        if (!u.createdAt) return false;
        try {
          return isSameDay(parseISO(u.createdAt), date);
        } catch (e) {
          return false;
        }
      }).length;
      return { name: format(date, 'MMM dd'), users: count };
    });

    const repeatData = [
      { name: 'Repeat', value: stats.repeatRate, fill: 'hsl(var(--primary))' },
      { name: 'New', value: Math.max(0, 100 - stats.repeatRate), fill: 'rgba(255,255,255,0.1)' }
    ];

    return { growth, repeatData };
  }, [mounted, allUsers, trips, stats.repeatRate]);

  const handleApproveDriver = async (driverId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', driverId), { isVerified: true });
      toast({ title: "Driver Approved", description: "This driver can now pick rides and earn." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Could not approve driver." });
    }
  };

  const handleAddStop = () => {
    if (!tempStopName) return;
    setNewRoute({ ...newRoute, stops: [...newRoute.stops, { name: tempStopName }] });
    setTempStopName("");
  };

  const handleAddRoute = async () => {
    if (!db || !newRoute.name || newRoute.stops.length < 2) {
      toast({ variant: 'destructive', title: "Missing Info", description: "Route needs a name and at least 2 landmarks." });
      return;
    }

    try {
      await addDoc(collection(db, 'routes'), {
        routeName: newRoute.name,
        baseFare: Number(newRoute.fare),
        schedule: newRoute.schedule,
        stops: newRoute.stops,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Route Live", description: "Customers can now book this route." });
      setNewRoute({ name: '', fare: '', schedule: '', stops: [] });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Could not save route." });
    }
  };

  const handleAddVoucher = async () => {
    if (!db || !newVoucher.code || !newVoucher.discount) return;
    try {
      await addDoc(collection(db, 'vouchers'), {
        code: newVoucher.code.toUpperCase(),
        discount: Number(newVoucher.discount),
        usageLimit: Number(newVoucher.limit) || null,
        usedBy: [],
        createdAt: new Date().toISOString()
      });
      toast({ title: "Discount Created", description: "Code is now active." });
      setNewVoucher({ code: '', discount: '', limit: '' });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Could not create code." });
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  const handleClearData = async () => {
    if (!db) return;
    setIsCleaning(true);
    try {
      const collections = ['trips', 'routes', 'vouchers'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        const deletions = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletions);
      }
      toast({ title: "Cleared", description: "Test data has been removed." });
      setIsCleaning(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not clear data." });
      setIsCleaning(false);
    }
  };

  if (!mounted || authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden">
      <aside className="w-72 bg-black/40 flex flex-col shrink-0 border-r border-white/5 backdrop-blur-xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary rounded-xl text-black"><Logo className="h-5 w-5" /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase text-primary">AAGO</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'drivers', label: 'Drivers', icon: Car },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'vouchers', label: 'Discounts', icon: Ticket },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as AdminTab)} className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}>
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
        <header className="h-28 border-b border-white/5 px-10 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md">
          <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{activeTab}</h2>
          <Button onClick={() => setIsCleaning(true)} variant="outline" className="border-destructive/20 text-destructive h-12 rounded-xl font-black uppercase italic">Clear System</Button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Drivers Ready', value: stats.activeDrivers, icon: Car },
                  { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
                  { label: 'User Happiness', value: stats.avgNps, icon: Smile },
                  { label: 'Repeat Rate', value: `${stats.repeatRate}%`, icon: Target },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl border-b-4 border-b-primary/20">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4"><metric.icon className="h-5 w-5 text-primary" /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground italic">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black italic uppercase text-primary">New Users</h3>
                    <Badge variant="outline" className="text-[10px] font-black italic uppercase">Last 7 Days</Badge>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.growth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '1rem', color: '#fff' }} />
                        <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8">
                   <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black italic uppercase text-primary">Customer Loyalty</h3>
                    <Badge variant="outline" className="text-[10px] font-black italic uppercase">Total Share</Badge>
                  </div>
                  <div className="h-[300px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData.repeatData} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value">
                          {chartData.repeatData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black italic text-primary">{stats.repeatRate}%</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Repeat</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="animate-in fade-in space-y-6">
              <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Full Name</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Contact</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">ID Number</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Points</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c: any) => (
                      <TableRow key={c.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-black italic py-6">{c.fullName}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{c.phoneNumber}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">{c.identityNumber || 'N/A'}</TableCell>
                        <TableCell><Badge className="bg-primary/10 text-primary border-none font-black italic">{c.loyaltyPoints || 0}</Badge></TableCell>
                        <TableCell className="text-[10px] text-muted-foreground uppercase">
                          {c.lastLogin ? format(parseISO(c.lastLogin), 'MMM dd, HH:mm') : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground uppercase font-bold italic opacity-40">No customers registered yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="animate-in fade-in space-y-10">
              <div className="grid grid-cols-1 gap-6">
                <h3 className="text-xl font-black italic uppercase text-primary">Pending Verification</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {drivers.filter(d => !d.isVerified).map((d: any) => (
                    <Card key={d.id} className="bg-white/5 border-primary/20 rounded-[2.5rem] p-8 space-y-6">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                             <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                {d.photoUrl ? <img src={d.photoUrl} className="h-full w-full object-cover" /> : <Car className="h-6 w-6 text-muted-foreground" />}
                             </div>
                             <div>
                                <h4 className="text-xl font-black italic uppercase leading-none">{d.fullName}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">{d.phoneNumber}</p>
                             </div>
                          </div>
                          <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black px-3 py-1">UNVERIFIED</Badge>
                       </div>
                       <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase text-muted-foreground">Vehicle</p>
                             <p className="text-xs font-bold uppercase italic">{d.vehicleNumber} ({d.vehicleType})</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase text-muted-foreground">License</p>
                             <p className="text-xs font-bold uppercase italic">{d.licenseNumber}</p>
                          </div>
                       </div>
                       <Button onClick={() => handleApproveDriver(d.id)} className="w-full h-14 bg-primary text-black font-black uppercase italic rounded-xl shadow-lg shadow-primary/10">Approve Driver</Button>
                    </Card>
                  ))}
                  {drivers.filter(d => !d.isVerified).length === 0 && (
                    <p className="text-[10px] font-bold text-muted-foreground uppercase py-10 italic">No pending applications</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-black italic uppercase text-foreground">Verified Drivers</h3>
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
                   <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5">
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Name</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Vehicle</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Preferred Route</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.filter(d => d.isVerified).map((d: any) => (
                          <TableRow key={d.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-black italic py-6">{d.fullName}</TableCell>
                            <TableCell className="text-xs font-bold uppercase italic">{d.vehicleNumber}</TableCell>
                            <TableCell className="text-xs italic text-primary">{d.preferredRoute || 'None'}</TableCell>
                            <TableCell>
                              <Badge className={`border-none text-[8px] font-black px-2.5 py-1 ${d.status === 'on-trip' ? 'bg-primary text-black' : d.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-muted-foreground'}`}>
                                {d.status?.toUpperCase() || 'OFFLINE'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-black italic text-sm">₹{d.totalEarnings?.toFixed(0) || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                   <div className="space-y-4">
                      <h3 className="text-2xl font-black italic uppercase text-primary">Route Builder</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Add landmarks in order. First is Pickup, Last is Drop-off.</p>
                   </div>

                   <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Route Name</Label>
                           <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Metro Express" className="h-14 bg-white/5 rounded-xl font-black italic" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Fare (₹)</Label>
                              <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-14 bg-white/5 rounded-xl font-black italic" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Times</Label>
                              <Input value={newRoute.schedule} onChange={e => setNewRoute({...newRoute, schedule: e.target.value})} placeholder="08:00 AM, 05:00 PM" className="h-14 bg-white/5 rounded-xl font-black italic" />
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Add Landmark</Label>
                        <div className="flex gap-4">
                           <Input value={tempStopName} onChange={e => setTempStopName(e.target.value)} placeholder="Name (e.g. City Mall)" className="h-14 bg-white/5 rounded-xl font-black italic flex-1" />
                           <Button onClick={handleAddStop} className="h-14 w-14 rounded-xl bg-primary text-black"><Plus /></Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Landmarks ({newRoute.stops.length})</Label>
                        <div className="space-y-2">
                           {newRoute.stops.map((s, i) => (
                             <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                   <Badge className="bg-primary/20 text-primary border-none h-6 w-6 flex items-center justify-center p-0 rounded-full">{i + 1}</Badge>
                                   <span className="font-black italic text-sm">{s.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setNewRoute({...newRoute, stops: newRoute.stops.filter((_, idx) => idx !== i)})} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                             </div>
                           ))}
                           {newRoute.stops.length === 0 && <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-4 italic border-2 border-dashed border-white/5 rounded-xl">No landmarks added</p>}
                        </div>
                      </div>
                   </div>

                   <Button onClick={handleAddRoute} disabled={newRoute.stops.length < 2 || !newRoute.name} className="w-full h-18 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 text-lg">Create Route</Button>
                </Card>

                <div className="space-y-6">
                   <h3 className="text-2xl font-black italic uppercase text-foreground">Live Routes</h3>
                   <div className="grid gap-4">
                      {allRoutes?.map((r: any) => (
                        <Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/20 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><RouteIcon className="h-6 w-6" /></div>
                              <div>
                                 <p className="text-xl font-black italic uppercase text-foreground leading-none">{r.routeName}</p>
                                 <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">{r.stops?.length || 0} Landmarks • ₹{r.baseFare}</p>
                              </div>
                           </div>
                           <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, 'routes', r.id))}><Trash2 className="h-5 w-5" /></Button>
                        </Card>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-in fade-in pb-20">
              <div className="grid grid-cols-1 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10">
                   <div className="flex items-center justify-between mb-10">
                      <h3 className="text-2xl font-black italic uppercase text-primary">Route Performance Pivot</h3>
                      <Badge className="bg-primary/10 text-primary border-none font-black italic uppercase">Trip Density</Badge>
                   </div>
                   <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase italic">Route Name</TableHead>
                          <TableHead className="text-[10px] font-black uppercase italic">Total Trips</TableHead>
                          <TableHead className="text-[10px] font-black uppercase italic">Total Riders</TableHead>
                          <TableHead className="text-[10px] font-black uppercase italic">Revenue Share (est)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRoutes?.map((r: any) => {
                          const routeTrips = trips?.filter(t => t.routeName === r.routeName) || [];
                          const riderCount = routeTrips.reduce((acc, curr) => acc + (curr.riderCount || 0), 0);
                          const revenue = riderCount * r.baseFare;
                          return (
                            <TableRow key={r.id} className="border-white/5">
                              <TableCell className="font-black italic py-6">{r.routeName}</TableCell>
                              <TableCell className="font-bold italic">{routeTrips.length}</TableCell>
                              <TableCell className="font-bold italic text-primary">{riderCount}</TableCell>
                              <TableCell className="font-black italic text-lg">₹{revenue.toFixed(0)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                   </Table>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                   <div className="space-y-4">
                      <h3 className="text-2xl font-black italic uppercase text-primary">Discount Codes</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Create one-time or limited-use codes.</p>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Code</Label>
                         <Input value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher, code: e.target.value})} placeholder="e.g. WELCOME10" className="h-14 bg-white/5 rounded-xl font-black italic uppercase" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Discount (₹)</Label>
                           <Input type="number" value={newVoucher.discount} onChange={e => setNewVoucher({...newVoucher, discount: e.target.value})} placeholder="50" className="h-14 bg-white/5 rounded-xl font-black italic" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Max Uses</Label>
                           <Input type="number" value={newVoucher.limit} onChange={e => setNewVoucher({...newVoucher, limit: e.target.value})} placeholder="100" className="h-14 bg-white/5 rounded-xl font-black italic" />
                        </div>
                      </div>
                      <Button onClick={handleAddVoucher} disabled={!newVoucher.code || !newVoucher.discount} className="w-full h-18 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl text-lg">Create Code</Button>
                   </div>
                </Card>

                <div className="space-y-6">
                   <h3 className="text-2xl font-black italic uppercase text-foreground">Active Codes</h3>
                   <div className="grid gap-4">
                      {vouchers?.map((v: any) => (
                        <Card key={v.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Ticket className="h-6 w-6" /></div>
                              <div>
                                 <p className="text-xl font-black italic uppercase text-foreground leading-none">{v.code}</p>
                                 <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">₹{v.discount} OFF • Used: {v.usedBy?.length || 0} / {v.usageLimit || '∞'}</p>
                              </div>
                           </div>
                           <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, 'vouchers', v.id))}><Trash2 className="h-5 w-5" /></Button>
                        </Card>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isCleaning} onOpenChange={setIsCleaning}>
        <DialogContent className="bg-background border-white/5 rounded-3xl p-8 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic text-primary">Clear System?</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground text-sm font-bold uppercase italic">This will delete all trips, routes, and discount codes for clean testing.</p>
          </div>
          <DialogFooter className="flex gap-4">
            <Button variant="ghost" onClick={() => setIsCleaning(false)} className="flex-1 rounded-xl font-black uppercase">Cancel</Button>
            <Button onClick={handleClearData} className="flex-1 bg-destructive text-white rounded-xl font-black uppercase hover:bg-destructive/90">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
