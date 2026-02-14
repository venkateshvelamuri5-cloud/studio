
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bus, 
  Users, 
  Map as MapIcon, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  Zap,
  LayoutDashboard,
  Clock,
  MapPin,
  MoreVertical,
  Navigation,
  LogOut,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { generateShuttleRoutes } from '@/ai/flows/admin-generate-shuttle-routes';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const ridershipData = [
  { name: 'Vizag', riders: 8500 },
  { name: 'VZM', riders: 3200 },
  { name: 'AP-Hway', riders: 4500 },
  { name: 'Gitam', riders: 5100 },
  { name: 'AU', riders: 3800 },
];

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [demandPatterns, setDemandPatterns] = useState("High demand from Vizianagaram to GITAM/AU campuses between 7-9 AM.");

  // Drivers Collection Query
  const driversQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'driver'));
  }, [db]);

  const { data: drivers, loading: driversLoading } = useCollection(driversQuery);

  // Active Trips Query
  const tripsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'trips'), where('status', '==', 'active'), limit(5));
  }, [db]);

  const { data: activeTrips, loading: tripsLoading } = useCollection(tripsQuery);

  const availableDrivers = drivers?.filter(d => d.status === 'available') || [];
  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: demandPatterns,
        historicalTrafficData: "Congestion at Maddilapalem and VZM Highway junctions.",
        preferredServiceHours: "6 AM to 9 PM Monday-Saturday",
        numberOfShuttlesAvailable: 15
      });
      setOptimizationResult(result);
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary font-body">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="font-black uppercase tracking-widest text-xs italic">Verifying Regional Access...</p>
        </div>
      </div>
    );
  }

  // Access check
  if (!user || profile?.role !== 'admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-8">
        <div className="text-center space-y-6 max-w-sm">
          <ShieldAlert className="h-20 w-20 text-destructive mx-auto" />
          <h2 className="text-2xl font-black font-headline uppercase italic">Access Denied</h2>
          <p className="font-bold text-muted-foreground">Your account does not have regional administrative privileges.</p>
          <Button onClick={() => router.push('/')} className="w-full h-14 rounded-2xl font-black uppercase italic">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-secondary/20 font-body">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-6 h-20 flex items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-accent" />
            <span className="text-2xl font-black font-headline italic tracking-tighter">AAGO AP</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-white bg-white/10 hover:bg-white/20 rounded-xl font-bold">
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 rounded-xl font-bold">
            <Navigation className="mr-2 h-4 w-4" /> Fleet Tracking
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 rounded-xl font-bold">
            <MapIcon className="mr-2 h-4 w-4" /> Route Engine
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 rounded-xl font-bold">
            <Users className="mr-2 h-4 w-4" /> Driver Registry
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 rounded-xl font-bold" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center font-black">AP</div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Admin Panel</p>
              <p className="text-[10px] text-white/60 font-bold">Vizag Head Office</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">Regional Dashboard</h2>
          <div className="flex items-center gap-4">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-4 py-1.5 font-black text-[10px] rounded-full uppercase tracking-widest">
              Live Fleet: {drivers?.length || 0} Drivers
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Available Drivers', value: availableDrivers.length, trend: 'READY', icon: Activity, color: 'text-green-600' },
              { label: 'Drivers On Route', value: onTripDrivers.length, trend: 'BUSY', icon: Navigation, color: 'text-accent' },
              { label: 'Active Trips', value: activeTrips?.length || 0, trend: 'LIVE', icon: Bus, color: 'text-primary' },
              { label: 'Total Regional Hubs', value: '2', trend: 'STABLE', icon: MapIcon, color: 'text-blue-600' },
            ].map((metric, i) => (
              <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-secondary rounded-2xl group-hover:rotate-12 transition-transform">
                      <metric.icon className={`h-6 w-6 ${metric.color}`} />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black tracking-widest border-none bg-secondary px-3 py-1">{metric.trend}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                    <h3 className="text-4xl font-black text-primary font-headline italic">{metric.value}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Drivers Status List */}
            <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="font-black font-headline text-2xl italic uppercase tracking-tighter">Driver Fleet Monitor</CardTitle>
                  <CardDescription className="font-bold">Real-time GPS tracking and performance</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-5 w-5" /></Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {driversLoading ? (
                    <div className="py-10 text-center font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Scanning Fleet...</div>
                  ) : drivers?.length === 0 ? (
                    <div className="py-10 text-center font-bold text-muted-foreground italic">No drivers registered in the AP region.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                            <th className="pb-4 pl-2 text-primary">Driver Name</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4">Coordinates</th>
                            <th className="pb-4 text-center">Total Trips</th>
                            <th className="pb-4 text-right pr-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {drivers?.map((driver: any) => (
                            <tr key={driver.uid} className="group hover:bg-secondary/30 transition-colors">
                              <td className="py-4 pl-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs">
                                    {driver.fullName?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-black text-primary text-sm uppercase italic">{driver.fullName}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground">{driver.phoneNumber}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4">
                                <Badge className={`rounded-full px-3 text-[8px] font-black uppercase border-none ${
                                  driver.status === 'available' ? 'bg-green-100 text-green-700' : 
                                  driver.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {driver.status || 'offline'}
                                </Badge>
                              </td>
                              <td className="py-4 font-mono text-[10px] font-bold text-muted-foreground">
                                {driver.currentLat?.toFixed(4) || '0.0000'}, {driver.currentLng?.toFixed(4) || '0.0000'}
                              </td>
                              <td className="py-4 text-center">
                                <span className="font-black text-primary italic text-sm">{driver.totalTrips || 0}</span>
                              </td>
                              <td className="py-4 text-right pr-2">
                                <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-2 font-black text-[10px] uppercase italic tracking-tighter">
                                  Track
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Optimizer Card */}
            <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Zap className="h-32 w-32" />
              </div>
              <CardHeader className="relative z-10">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-black font-headline text-3xl italic uppercase tracking-tighter text-white">Route AI</CardTitle>
                <CardDescription className="text-white/60 font-bold">Optimize for peak student volumes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Demand Patterns</label>
                  <Textarea 
                    value={demandPatterns} 
                    onChange={(e) => setDemandPatterns(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-accent rounded-2xl font-bold min-h-[100px]"
                  />
                </div>
                <Button 
                  onClick={handleOptimize} 
                  disabled={isOptimizing}
                  className="w-full bg-accent hover:bg-accent/90 text-white h-14 rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-accent/20"
                >
                  {isOptimizing ? "Processing Data..." : "Run AI Optimization"}
                </Button>
              </CardContent>
              {optimizationResult && (
                <CardFooter className="pt-0 flex flex-col gap-3 text-xs relative z-10">
                  <div className="w-full h-px bg-white/10 my-2" />
                  <p className="text-accent font-black uppercase tracking-[0.2em] italic">Optimization Complete</p>
                  <div className="w-full space-y-2">
                    {optimizationResult.optimizedRoutes.slice(0, 3).map((route: any, i: number) => (
                      <div key={i} className="bg-white/5 p-3 rounded-2xl flex justify-between items-center border border-white/5 group hover:bg-white/10 transition-colors">
                        <span className="font-bold uppercase italic text-[10px]">{route.routeName}</span>
                        <Badge className="bg-accent text-[8px] font-black">{route.estimatedDurationMinutes}m</Badge>
                      </div>
                    ))}
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Trips Monitor */}
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
              <CardHeader>
                <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter">Live AP Highway Trips</CardTitle>
                <CardDescription className="font-bold">Active shuttles moving across regional hubs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tripsLoading ? (
                    <div className="py-6 text-center animate-pulse">Loading Live Trips...</div>
                  ) : activeTrips?.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed rounded-3xl">
                      <Bus className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-20" />
                      <p className="font-bold text-muted-foreground italic">No active trips currently.</p>
                    </div>
                  ) : (
                    activeTrips?.map((trip: any) => (
                      <div key={trip.id} className="p-4 bg-secondary/50 rounded-2xl flex items-center justify-between border border-secondary">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-xl">
                            <Navigation className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-black text-primary text-sm uppercase italic tracking-tighter">{trip.routeName}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                              <Users className="h-3 w-3" /> {trip.riderCount} Students • {trip.driverName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase tracking-widest px-3">On Schedule</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Regional Traffic Context */}
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
              <CardHeader>
                <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter">Student Ridership Hubs</CardTitle>
                <CardDescription className="font-bold">Daily volume across Vizag & Vizianagaram</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ridershipData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="riders" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
