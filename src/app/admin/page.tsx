
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
  Trash2,
  Truck
} from 'lucide-react';
import Image from 'next/image';
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
import { collection, query, where, limit, doc, updateDoc, addDoc, deleteDoc, getDocs, orderBy, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

const ridershipData = [
  { name: 'Vizag', riders: 8500 },
  { name: 'VZM', riders: 3200 },
  { name: 'Highway', riders: 4500 },
  { name: 'Gitam', riders: 5100 },
  { name: 'AU', riders: 3800 },
];

// Helper to map Lat/Lng to % positions on the visualization map
function getMarkerPos(lat?: number, lng?: number) {
  if (!lat || !lng) return { top: '50%', left: '50%' };
  // Vizag Region Bounds (Approx)
  // Lat: 17.6 to 17.8
  // Lng: 83.1 to 83.4
  const top = 100 - ((lat - 17.6) / (17.8 - 17.6)) * 100;
  const left = ((lng - 83.1) / (83.4 - 83.1)) * 100;
  return { 
    top: `${Math.max(5, Math.min(95, top))}%`, 
    left: `${Math.max(5, Math.min(95, left))}%` 
  };
}

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

  // Images
  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  // Dashboard Stats
  const availableDrivers = drivers?.filter(d => d.status === 'available') || [];
  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];

  // AI & Route State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [demandPatterns, setDemandPatterns] = useState("High demand from Vizianagaram to GITAM/AU campuses between 7-9 AM.");
  
  // Driver Registry State
  const [isRegistering, setIsRegistering] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverCity, setNewDriverCity] = useState("Vizag");

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleRegisterDriver = async () => {
    if (!db || !newDriverPhone || !newDriverName) return;
    setIsRegistering(true);
    try {
      const formattedPhone = newDriverPhone.startsWith('+91') ? newDriverPhone : `+91${newDriverPhone}`;
      const q = query(collection(db, 'users'), where('phoneNumber', '==', formattedPhone), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await updateDoc(doc(db, 'users', snap.docs[0].id), { 
          role: 'driver',
          fullName: newDriverName,
          city: newDriverCity,
          status: 'offline'
        });
        toast({ title: "Workforce Updated", description: `${newDriverName} is now an official driver.` });
      } else {
        const driverId = `DRV_${Date.now()}`;
        await setDoc(doc(db, 'users', driverId), {
          uid: driverId,
          fullName: newDriverName,
          phoneNumber: formattedPhone,
          role: 'driver',
          city: newDriverCity,
          status: 'offline',
          totalTrips: 0,
          createdAt: new Date().toISOString()
        });
        toast({ title: "Driver Registered", description: "Profile created in the regional workforce." });
      }
      setNewDriverName("");
      setNewDriverPhone("");
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Registry Error" });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast({ title: "Profile Modified" });
    } catch (error) {
      console.error(error);
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
      
      for (const route of result.optimizedRoutes) {
        await addDoc(collection(db, 'routes'), {
          ...route,
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "Engine Synced", description: "AI routes deployed." });
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({ variant: "destructive", title: "AI Error" });
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
          <p className="font-black uppercase tracking-widest text-xs italic">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-8">
        <div className="text-center space-y-6 max-w-sm">
          <ShieldAlert className="h-20 w-20 text-destructive mx-auto" />
          <h2 className="text-2xl font-black font-headline uppercase italic">Security Alert</h2>
          <p className="font-bold text-muted-foreground">Administrative credentials required for this terminal.</p>
          <Button onClick={() => router.push('/')} className="w-full h-14 rounded-2xl font-black uppercase italic">Exit Terminal</Button>
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
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase">AAGO HUB</span>
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
            <Navigation className="mr-2 h-4 w-4" /> Fleet Intelligence
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('routes')}
            className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'routes' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <MapIcon className="mr-2 h-4 w-4" /> Route Registry
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('drivers')}
            className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'drivers' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <Truck className="mr-2 h-4 w-4" /> Workforce
          </Button>
          <div className="pt-4 border-t border-white/10 mt-4">
            <Button variant="ghost" className="w-full justify-start text-red-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-bold" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">
            {activeTab.toUpperCase()} Operations
          </h2>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-4 py-1.5 font-black text-[10px] rounded-full uppercase tracking-widest">
            Fleet Online: {drivers?.length || 0}
          </Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Available Drivers', value: availableDrivers.length, trend: 'READY', icon: Activity, color: 'text-green-600' },
                  { label: 'Drivers On Route', value: onTripDrivers.length, trend: 'ACTIVE', icon: Navigation, color: 'text-accent' },
                  { label: 'Active Trips', value: activeTrips?.length || 0, trend: 'LIVE', icon: Bus, color: 'text-primary' },
                  { label: 'Network Routes', value: savedRoutes?.length || 0, trend: 'SYNCED', icon: MapIcon, color: 'text-blue-600' },
                ].map((metric, i) => (
                  <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-secondary rounded-2xl group-hover:rotate-12 transition-transform">
                          <metric.icon className={`h-6 w-6 ${metric.color}`} />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black tracking-widest border-none bg-secondary px-3 py-1 uppercase">{metric.trend}</Badge>
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
                {/* Visual Radar */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                   <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Regional Radar</CardTitle>
                    <CardDescription className="font-bold">Real-time hub activity across AP</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[400px] relative">
                    <Image 
                      src={mapImage?.imageUrl || "https://picsum.photos/seed/radar/800/400"} 
                      fill 
                      className="object-cover opacity-60" 
                      alt="Regional Map"
                    />
                    {/* Live Driver Markers */}
                    {drivers?.filter(d => d.status === 'on-trip').map((driver: any) => {
                      const pos = getMarkerPos(driver.currentLat, driver.currentLng);
                      return (
                        <div key={driver.id} className="absolute transition-all duration-1000" style={pos}>
                          <div className="relative">
                            <div className="bg-primary p-2 rounded-full shadow-2xl animate-pulse">
                              <Bus className="h-4 w-4 text-white" />
                            </div>
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow border border-primary/20 text-[8px] font-black uppercase italic">
                              {driver.fullName?.split(' ')[0]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Hub Performance */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
                  <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Hub Scholarship Volume</CardTitle>
                    <CardDescription className="font-bold">Daily scholars served per hub</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Master Fleet Map */}
                <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-slate-100 h-[600px] relative">
                  <Image 
                    src={mapImage?.imageUrl || "https://picsum.photos/seed/fleet-map/1200/800"} 
                    fill 
                    className="object-cover opacity-80" 
                    alt="Master Map"
                  />
                   {/* GPS Overlays */}
                   {drivers?.map((driver: any) => {
                      const pos = getMarkerPos(driver.currentLat, driver.currentLng);
                      return (
                        <div key={driver.id} className="absolute transition-all duration-1000" style={pos}>
                           <div className={`p-2 rounded-full shadow-2xl ${
                             driver.status === 'on-trip' ? 'bg-accent animate-bounce' : 
                             driver.status === 'available' ? 'bg-green-500' : 'bg-slate-400'
                           }`}>
                             <Bus className="h-5 w-5 text-white" />
                           </div>
                        </div>
                      );
                   })}
                   <div className="absolute top-6 left-6 bg-white/90 backdrop-blur p-4 rounded-3xl shadow-xl border border-white/20">
                      <h4 className="font-black text-primary uppercase italic text-xs mb-2">GPS Legend</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase">
                          <div className="h-2 w-2 rounded-full bg-accent" /> Mission Active
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase">
                          <div className="h-2 w-2 rounded-full bg-green-500" /> Hub Ready
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase">
                          <div className="h-2 w-2 rounded-full bg-slate-400" /> Stationed
                        </div>
                      </div>
                   </div>
                </Card>

                {/* Live Logs */}
                <div className="space-y-4">
                  <h3 className="text-xl font-black font-headline italic uppercase text-primary">Live Operations Log</h3>
                  <div className="space-y-3 h-[540px] overflow-y-auto pr-2">
                    {drivers?.map((driver: any) => (
                      <Card key={driver.id} className="border-none shadow-lg bg-white rounded-2xl p-4 group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                              {driver.fullName?.[0]}
                            </div>
                            <div>
                              <p className="font-black text-primary uppercase italic text-[10px]">{driver.fullName}</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">{driver.status || 'offline'}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-bold border-none bg-secondary">
                            {driver.currentLat?.toFixed(4)}, {driver.currentLng?.toFixed(4)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[8px] font-black uppercase text-muted-foreground pt-3 border-t">
                           <span>{driver.totalTrips || 0} Trips</span>
                           <span className="text-primary">{driver.city || 'AP Region'}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden lg:col-span-1">
                <CardHeader>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="font-black font-headline text-3xl italic uppercase text-white">Route AI Engine</CardTitle>
                  <CardDescription className="text-white/60 font-bold">Smart regional route deployment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Optimization Logic</Label>
                    <Textarea 
                      value={demandPatterns} 
                      onChange={(e) => setDemandPatterns(e.target.value)}
                      className="bg-white/5 border-white/20 text-white focus-visible:ring-accent rounded-2xl font-bold min-h-[120px]"
                    />
                  </div>
                  <Button 
                    onClick={handleOptimize} 
                    disabled={isOptimizing}
                    className="w-full bg-accent hover:bg-accent/90 text-white h-14 rounded-2xl font-black uppercase italic"
                  >
                    {isOptimizing ? <Loader2 className="animate-spin h-5 w-5" /> : "Deploy AI Routes"}
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Regional Network Registry</h3>
                  <Badge variant="outline" className="font-bold border-2">{savedRoutes?.length || 0} DEPLOYED</Badge>
                </div>
                {routesLoading ? (
                  <div className="py-10 text-center font-bold text-muted-foreground uppercase text-xs">Syncing Registry...</div>
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
                              <Badge key={i} variant="secondary" className="text-[8px] font-black uppercase tracking-tighter">{stop}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-black uppercase text-muted-foreground pt-4 border-t border-secondary">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.estimatedDurationMinutes} Mins</span>
                            <span className="flex items-center gap-1 text-primary"><Activity className="h-3 w-3" /> MISSION CRITICAL</span>
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
                  <h3 className="text-2xl font-black font-headline italic uppercase text-primary">AAGO Workforce Registry</h3>
                  <p className="font-bold text-muted-foreground">Official regional driver management</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-bold gap-2 h-12 px-6 shadow-xl shadow-primary/20 bg-primary">
                      <UserPlus className="h-5 w-5" /> Add Regional Driver
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="font-headline font-black italic uppercase text-2xl">Onboard Driver</DialogTitle>
                      <DialogDescription className="font-bold">Register a new official mobility partner.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                        <Input 
                          placeholder="Driver's Full Name" 
                          value={newDriverName} 
                          onChange={(e) => setNewDriverName(e.target.value)}
                          className="rounded-xl h-12 border-2 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number (+91)</Label>
                        <Input 
                          placeholder="+91 9876543210" 
                          value={newDriverPhone} 
                          onChange={(e) => setNewDriverPhone(e.target.value)}
                          className="rounded-xl h-12 border-2 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assigned Hub</Label>
                        <Select value={newDriverCity} onValueChange={setNewDriverCity}>
                          <SelectTrigger className="rounded-xl h-12 border-2 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vizag">Visakhapatnam (Vizag)</SelectItem>
                            <SelectItem value="Vizianagaram">Vizianagaram (VZM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={handleRegisterDriver} 
                        disabled={isRegistering || !newDriverPhone || !newDriverName}
                        className="w-full bg-accent hover:bg-accent/90 h-14 rounded-xl font-black uppercase italic"
                      >
                        {isRegistering ? "Registering..." : "Commit to Workforce"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          <th className="py-6 pl-8">Worker Profile</th>
                          <th className="py-6">Status</th>
                          <th className="py-6">Regional Hub</th>
                          <th className="py-6 text-center">Missions</th>
                          <th className="py-6 text-right pr-8">Registry</th>
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
                              <Badge variant="secondary" className="bg-secondary border-none uppercase font-black text-[8px] px-3">{driver.city || 'AP REGION'}</Badge>
                            </td>
                            <td className="py-6 text-center">
                              <span className="font-black text-primary text-lg">{driver.totalTrips || 0}</span>
                            </td>
                            <td className="py-6 text-right pr-8">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                                    <Settings2 className="h-5 w-5 text-primary" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2rem] bg-white">
                                  <DialogHeader>
                                    <DialogTitle className="font-headline font-black italic uppercase text-2xl">Worker Registry</DialogTitle>
                                    <DialogDescription className="font-bold">Modify permissions for {driver.fullName}.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 space-y-6">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Classification</Label>
                                      <Select defaultValue={driver.role} onValueChange={(val) => handleUpdateRole(driver.id, val)}>
                                        <SelectTrigger className="rounded-xl h-12 border-2 font-bold">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="rider">Decommission to Rider</SelectItem>
                                          <SelectItem value="driver">Regional Driver</SelectItem>
                                          <SelectItem value="admin">Hub Administrator</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="destructive" className="w-full rounded-xl font-black uppercase italic h-14">Revoke Registry Access</Button>
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
