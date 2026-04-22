
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
  Gift,
  Edit,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Smile,
  MapPin
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, orderBy, addDoc, where, deleteDoc, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';
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

const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '1.5rem' };
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 };

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: googleMapsApiKey });
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'drivers' | 'customers' | 'ai-planner' | 'discounts' | 'analytics'>('dashboard');
  const [isCleaning, setIsCleaning] = useState(false);

  // Route Creation State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', schedule: '', stops: [] as any[] });
  const [tempStopName, setTempStopName] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) router.push('/admin/login');
  }, [mounted, authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: trips } = useCollection(useMemo(() => db ? query(collection(db, 'trips')) : null, [db]));

  const stats = useMemo(() => {
    if (!allUsers) return { totalCustomers: 0, totalDrivers: 0, utilization: 0, activeDrivers: 0, avgNps: 8.8, repeatRate: 0 };
    const drivers = allUsers.filter(u => u.role === 'driver');
    const customers = allUsers.filter(u => u.role === 'rider');
    const onTrip = drivers.filter(d => d.status === 'on-trip').length;
    
    const completedTrips = (trips || []).filter(t => t.status === 'completed');
    const riderVisits: Record<string, number> = {};
    completedTrips.forEach(t => {
      t.passengerManifest?.forEach((m: any) => {
        if (m.uid) riderVisits[m.uid] = (riderVisits[m.uid] || 0) + 1;
      });
    });
    const repeatCustomers = Object.values(riderVisits).filter(count => count > 1).length;
    const repeatRate = customers.length > 0 ? Math.round((repeatCustomers / customers.length) * 100) : 0;

    return {
      totalCustomers: customers.length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(d => d.status === 'available' || d.status === 'on-trip').length,
      utilization: drivers.length > 0 ? Math.round((onTrip / drivers.length) * 100) : 0,
      avgNps: 8.8,
      repeatRate
    };
  }, [allUsers, trips]);

  const chartData = useMemo(() => {
    if (!mounted || !allUsers || !trips) return { growth: [], repeatData: [], routeRevenue: [] };

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

    const revenueMap: Record<string, number> = {};
    (trips || []).filter(t => t.status === 'completed').forEach(t => {
      const routeName = t.routeName || 'Unknown';
      const fare = t.farePerRider || 0;
      const count = t.passengerManifest?.length || 0;
      revenueMap[routeName] = (revenueMap[routeName] || 0) + (fare * count);
    });
    const routeRevenue = Object.entries(revenueMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

    return { growth, repeatData, routeRevenue };
  }, [mounted, allUsers, trips, stats]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const label = newRoute.stops.length === 0 ? "Pickup" : "Drop-off";
    const newStop = {
      name: tempStopName || `${label} Point`,
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setNewRoute({ ...newRoute, stops: [...newRoute.stops, newStop] });
    setTempStopName("");
  };

  const handleAddRoute = async () => {
    if (!db || !newRoute.name || newRoute.stops.length < 2) {
      toast({ variant: 'destructive', title: "Error", description: "Route needs a name and at least 2 points." });
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
      toast({ title: "Route Created", description: "The new route path is live." });
      setNewRoute({ name: '', fare: '', schedule: '', stops: [] });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to save route." });
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
      toast({ title: "Data Cleared", description: "All test data removed." });
      setIsCleaning(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to clear data." });
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
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
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
        <header className="h-28 border-b border-white/5 px-10 flex items-center justify-between shrink-0">
          <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{activeTab}</h2>
          <Button onClick={() => setIsCleaning(true)} variant="outline" className="border-destructive/20 text-destructive h-12 rounded-xl font-black uppercase italic">Clear Data</Button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Drivers Ready', value: stats.activeDrivers, icon: Car },
                  { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
                  { label: 'Happiness', value: stats.avgNps, icon: Smile },
                  { label: 'Loyalty Rate', value: `${stats.repeatRate}%`, icon: Target },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4"><metric.icon className="h-5 w-5 text-primary" /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground italic">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit">
                   <div className="space-y-4">
                      <h3 className="text-2xl font-black italic uppercase text-primary">Route Builder</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Click the map to add stops. First click is Pickup, Last click is Drop-off.</p>
                   </div>

                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Next Stop Name</Label>
                           <Input value={tempStopName} onChange={e => setTempStopName(e.target.value)} placeholder="e.g. City Mall" className="h-12 bg-white/5 rounded-xl font-black italic" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Route Name</Label>
                           <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Metro Express" className="h-12 bg-white/5 rounded-xl font-black italic" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Fare (₹)</Label>
                           <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-12 bg-white/5 rounded-xl font-black italic" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Daily Schedule</Label>
                           <Input value={newRoute.schedule} onChange={e => setNewRoute({...newRoute, schedule: e.target.value})} placeholder="08:00 AM, 05:00 PM" className="h-12 bg-white/5 rounded-xl font-black italic" />
                        </div>
                      </div>
                   </div>

                   {isLoaded ? (
                     <GoogleMap 
                        mapContainerStyle={mapContainerStyle} 
                        center={newRoute.stops.length > 0 ? { lat: newRoute.stops[newRoute.stops.length-1].lat, lng: newRoute.stops[newRoute.stops.length-1].lng } : DEFAULT_CENTER} 
                        zoom={14} 
                        onClick={handleMapClick}
                     >
                        {newRoute.stops.map((stop, idx) => (
                          <Marker key={idx} position={{ lat: stop.lat, lng: stop.lng }} label={{ text: stop.name.charAt(0), color: 'white', fontWeight: 'bold' }} />
                        ))}
                        {newRoute.stops.length > 1 && (
                          <Polyline path={newRoute.stops.map(s => ({ lat: s.lat, lng: s.lng }))} options={{ strokeColor: '#EAB308', strokeOpacity: 1, strokeWeight: 4 }} />
                        )}
                     </GoogleMap>
                   ) : <div className="h-[400px] bg-white/5 rounded-[1.5rem] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}

                   <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Stops List ({newRoute.stops.length})</Label>
                      <div className="flex flex-wrap gap-2">
                         {newRoute.stops.map((s, i) => (
                           <Badge key={i} className="bg-primary/20 text-primary border-none font-black px-3 py-1.5 rounded-xl flex items-center gap-2">
                              {s.name} <button onClick={() => setNewRoute({...newRoute, stops: newRoute.stops.filter((_, idx) => idx !== i)})}><Trash2 className="h-3 w-3" /></button>
                           </Badge>
                         ))}
                      </div>
                   </div>

                   <Button onClick={handleAddRoute} className="w-full h-18 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 text-lg">Launch Route</Button>
                </Card>

                <div className="space-y-6">
                   <h3 className="text-2xl font-black italic uppercase text-foreground">Active Routes</h3>
                   <div className="grid gap-4">
                      {allRoutes?.map((r: any) => (
                        <Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/20 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><RouteIcon className="h-6 w-6" /></div>
                              <div>
                                 <p className="text-xl font-black italic uppercase text-foreground leading-none">{r.routeName}</p>
                                 <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">{r.stops?.length || 0} Stops • ₹{r.baseFare}</p>
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
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8">
                  <CardHeader className="px-0 pt-0 pb-8"><CardTitle className="text-xl font-black italic uppercase text-primary">Daily New People</CardTitle></CardHeader>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.growth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '1rem' }} />
                        <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8">
                  <CardHeader className="px-0 pt-0 pb-8"><CardTitle className="text-xl font-black italic uppercase text-primary">Repeat Customer Logic</CardTitle></CardHeader>
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
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Loyalty</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isCleaning} onOpenChange={setIsCleaning}>
        <DialogContent className="bg-background border-white/5 rounded-3xl p-8 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic text-primary">Clear Test Data?</DialogTitle>
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
