
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Bus, 
  Users, 
  Map as MapIcon, 
  Activity, 
  Zap, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  ShieldAlert,
  Loader2,
  UserPlus,
  Settings2,
  Search,
  PlusCircle,
  Clock,
  MapPin,
  Trash2
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
import { collection, query, where, limit, doc, updateDoc, addDoc, deleteDoc, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const ridershipData = [
  { name: 'Vizag', riders: 8500 },
  { name: 'VZM', riders: 3200 },
  { name: 'Highway', riders: 4500 },
  { name: 'Gitam', riders: 5100 },
  { name: 'AU', riders: 3800 },
];

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'drivers'>('dashboard');
  
  // Profile Query
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Collections
  const { data: drivers, loading: driversLoading } = useCollection(
    useMemo(() => db ? query(collection(db, 'users'), where('role', '==', 'driver')) : null, [db])
  );
  
  const { data: activeTrips, loading: tripsLoading } = useCollection(
    useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db])
  );

  const { data: savedRoutes, loading: routesLoading } = useCollection(
    useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db])
  );

  // Dashboard Stats
  const availableDrivers = drivers?.filter(d => d.status === 'available') || [];
  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];

  // AI & Route State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [demandPatterns, setDemandPatterns] = useState("High demand from Vizianagaram to GITAM/AU campuses between 7-9 AM.");
  
  // Driver Management
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleSearchDriver = async () => {
    if (!db || !searchPhone) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('phoneNumber', '==', searchPhone.startsWith('+91') ? searchPhone : `+91${searchPhone}`), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSearchResult({ ...snap.docs[0].data(), id: snap.docs[0].id });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "No user found with this phone number." });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!db) return;
    setIsUpdatingRole(true);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast({ title: "Update Successful", description: `User role changed to ${newRole}.` });
      setSearchResult(null);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update user role." });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleOptimize = async () => {
    if (!db) return;
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: demandPatterns,
        historicalTrafficData: "Heavy congestion at Maddilapalem and VZM Highway junctions.",
        preferredServiceHours: "6 AM to 9 PM Monday-Saturday",
        numberOfShuttlesAvailable: 15
      });
      
      // Persist generated routes
      for (const route of result.optimizedRoutes) {
        await addDoc(collection(db, 'routes'), {
          ...route,
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "Engine Synced", description: "AI routes have been deployed to the regional registry." });
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate routes." });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', id));
      toast({ title: "Route Removed" });
    } catch (err) {
      console.error(err);
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
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'dashboard' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('fleet')}
            className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'fleet' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <Navigation className="mr-2 h-4 w-4" /> Fleet Tracking
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('routes')}
            className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'routes' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <MapIcon className="mr-2 h-4 w-4" /> Route Engine
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('drivers')}
            className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'drivers' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <Users className="mr-2 h-4 w-4" /> Driver Registry
          </Button>
          <div className="pt-4 border-t border-white/10 mt-4">
            <Button variant="ghost" className="w-full justify-start text-red-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-bold" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </div>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center font-black uppercase">
              {profile?.fullName?.[0]}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Administrator</p>
              <p className="text-[8px] text-white/60 font-bold">Vizag Head Office</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View
          </h2>
          <div className="flex items-center gap-4">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-4 py-1.5 font-black text-[10px] rounded-full uppercase tracking-widest">
              Live Fleet: {drivers?.length || 0}
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Available Drivers', value: availableDrivers.length, trend: 'READY', icon: Activity, color: 'text-green-600' },
                  { label: 'Drivers On Route', value: onTripDrivers.length, trend: 'BUSY', icon: Navigation, color: 'text-accent' },
                  { label: 'Active Trips', value: activeTrips?.length || 0, trend: 'LIVE', icon: Bus, color: 'text-primary' },
                  { label: 'Deployed Routes', value: savedRoutes?.length || 0, trend: 'STABLE', icon: MapIcon, color: 'text-blue-600' },
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Trips Monitor */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
                  <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Regional Active Movement</CardTitle>
                    <CardDescription className="font-bold">Currently tracked shuttles in AP region</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tripsLoading ? (
                        <div className="py-6 text-center animate-pulse">Scanning Shuttles...</div>
                      ) : activeTrips?.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed rounded-3xl opacity-50">
                          <Bus className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                          <p className="font-bold text-muted-foreground italic">No active regional movement detected.</p>
                        </div>
                      ) : (
                        activeTrips?.map((trip: any) => (
                          <div key={trip.id} className="p-4 bg-secondary/50 rounded-2xl flex items-center justify-between border border-secondary group hover:border-primary/20 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/10 p-3 rounded-xl">
                                <Navigation className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-black text-primary text-sm uppercase italic tracking-tighter">{trip.routeName}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {trip.riderCount || 0} Students • {trip.driverName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase tracking-widest px-3">Live Tracking</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Ridership Context */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
                  <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Hub Volume Metrics</CardTitle>
                    <CardDescription className="font-bold">Daily scholar volume across Vizag & VZM</CardDescription>
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
            </>
          )}

          {activeTab === 'fleet' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black font-headline italic uppercase text-primary">GPS Fleet Monitor</h3>
                  <p className="font-bold text-muted-foreground">Real-time driver location and duty status</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drivers?.map((driver: any) => (
                  <Card key={driver.id} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black">
                            {driver.fullName?.[0]}
                          </div>
                          <div>
                            <h4 className="font-black text-primary uppercase italic text-sm">{driver.fullName}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{driver.phoneNumber}</p>
                          </div>
                        </div>
                        <Badge className={`rounded-full px-3 text-[8px] font-black uppercase ${
                          driver.status === 'available' ? 'bg-green-100 text-green-700' : 
                          driver.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {driver.status || 'offline'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-secondary/50 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Live Lat/Lng</span>
                          <span className="text-primary">{driver.currentLat?.toFixed(4) || '0.0000'}, {driver.currentLng?.toFixed(4) || '0.0000'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Total Lifetime Trips</span>
                          <span className="text-primary">{driver.totalTrips || 0}</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full rounded-xl font-bold border-2 text-xs">View Full Logs</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Route Engine Controller */}
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden lg:col-span-1">
                <CardHeader>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="font-black font-headline text-3xl italic uppercase text-white">Route AI Engine</CardTitle>
                  <CardDescription className="text-white/60 font-bold">Optimize schedules based on live demand</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Demand Intelligence</Label>
                    <Textarea 
                      value={demandPatterns} 
                      onChange={(e) => setDemandPatterns(e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-accent rounded-2xl font-bold min-h-[120px]"
                    />
                  </div>
                  <Button 
                    onClick={handleOptimize} 
                    disabled={isOptimizing}
                    className="w-full bg-accent hover:bg-accent/90 text-white h-14 rounded-2xl font-black uppercase italic tracking-tighter"
                  >
                    {isOptimizing ? <Loader2 className="animate-spin h-5 w-5" /> : "Initiate AI Deployment"}
                  </Button>
                </CardContent>
              </Card>

              {/* Saved Routes List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Active Route Registry</h3>
                  <Badge variant="outline" className="font-bold border-2">{savedRoutes?.length || 0} Routes</Badge>
                </div>
                {routesLoading ? (
                  <div className="py-10 text-center font-bold text-muted-foreground">Syncing Route Registry...</div>
                ) : savedRoutes?.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed">
                    <MapIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-2" />
                    <p className="font-bold text-muted-foreground italic">No routes deployed yet. Run the AI Engine.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedRoutes?.map((route: any) => (
                      <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-primary uppercase italic text-lg leading-none">{route.routeName}</h4>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{route.schedule}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {route.stops?.map((stop: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[8px] font-black uppercase">{stop}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-black uppercase text-muted-foreground pt-4 border-t border-secondary">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.estimatedDurationMinutes} Mins</span>
                            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Peak Optimized</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Driver Registry</h3>
                  <p className="font-bold text-muted-foreground">Official AAGO Mobility workforce management</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-bold gap-2 h-12 px-6 shadow-xl shadow-primary/20">
                      <UserPlus className="h-5 w-5" /> Promote New Driver
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-headline font-black italic uppercase text-2xl">Promote Driver</DialogTitle>
                      <DialogDescription className="font-bold">Search for a registered student to promote to the driving fleet.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number (with +91)</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="+91 9876543210" 
                            value={searchPhone} 
                            onChange={(e) => setSearchPhone(e.target.value)}
                            className="rounded-xl h-12 border-2 font-bold"
                          />
                          <Button onClick={handleSearchDriver} disabled={isSearching} className="h-12 w-12 rounded-xl">
                            {isSearching ? <Loader2 className="animate-spin" /> : <Search className="h-5 w-5" />}
                          </Button>
                        </div>
                      </div>

                      {searchResult && (
                        <div className="p-6 bg-secondary/50 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-black">
                              {searchResult.fullName?.[0]}
                            </div>
                            <div>
                              <p className="font-black text-primary uppercase italic">{searchResult.fullName}</p>
                              <p className="text-[10px] font-bold text-muted-foreground">Role: {searchResult.role}</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleUpdateRole(searchResult.id, 'driver')} 
                            disabled={isUpdatingRole || searchResult.role === 'driver'}
                            className="w-full bg-accent hover:bg-accent/90 h-14 rounded-xl font-black uppercase italic"
                          >
                            {isUpdatingRole ? "Updating..." : "Promote to Aago Driver"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                          <th className="py-6 pl-8">Driver Profile</th>
                          <th className="py-6">Official Status</th>
                          <th className="py-6">Hub Coordinates</th>
                          <th className="py-6 text-center">Performance</th>
                          <th className="py-6 text-right pr-8">Registry Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {drivers?.map((driver: any) => (
                          <tr key={driver.id} className="group hover:bg-secondary/30 transition-colors">
                            <td className="py-6 pl-8">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                                  {driver.fullName?.[0]}
                                </div>
                                <div>
                                  <p className="font-black text-primary uppercase italic text-sm leading-none">{driver.fullName || 'Unnamed'}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{driver.phoneNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-6">
                              <Badge className={`rounded-full px-4 text-[8px] font-black uppercase border-none ${
                                driver.status === 'available' ? 'bg-green-100 text-green-700' : 
                                driver.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'
                              }`}>
                                {driver.status || 'offline'}
                              </Badge>
                            </td>
                            <td className="py-6">
                              <span className="font-mono text-[10px] font-bold text-muted-foreground block">LAT: {driver.currentLat?.toFixed(4) || '0.0000'}</span>
                              <span className="font-mono text-[10px] font-bold text-muted-foreground block">LNG: {driver.currentLng?.toFixed(4) || '0.0000'}</span>
                            </td>
                            <td className="py-6 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-black text-primary text-lg leading-none">{driver.totalTrips || 0}</span>
                                <span className="text-[8px] font-bold uppercase text-muted-foreground mt-1">Trips</span>
                              </div>
                            </td>
                            <td className="py-6 text-right pr-8">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                                    <Settings2 className="h-5 w-5 text-primary" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2rem]">
                                  <DialogHeader>
                                    <DialogTitle className="font-headline font-black italic uppercase text-2xl">Modify Registry</DialogTitle>
                                    <DialogDescription className="font-bold">Change system permissions for {driver.fullName}.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 space-y-6">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Permission Level</Label>
                                      <Select defaultValue={driver.role} onValueChange={(val) => handleUpdateRole(driver.id, val)}>
                                        <SelectTrigger className="rounded-xl h-12 border-2 font-bold">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="rider">Demote to Rider</SelectItem>
                                          <SelectItem value="driver">Official Driver</SelectItem>
                                          <SelectItem value="admin">Regional Admin</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="destructive" className="w-full rounded-xl font-black uppercase italic h-14">Revoke System Access</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
