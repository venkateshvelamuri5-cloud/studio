
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { 
  Bus, 
  Activity, 
  Zap, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  ShieldAlert,
  Loader2,
  Trash2,
  Truck,
  Map as MapIcon,
  MessageSquareShare,
  IndianRupee,
  Wallet,
  Users,
  Search,
  AlertTriangle,
  BarChart3,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { generateShuttleRoutes } from '@/ai/flows/admin-generate-shuttle-routes';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, where, limit, doc, updateDoc, addDoc, deleteDoc, getDocs, orderBy, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 17.6868,
  lng: 83.2185
};

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyD_zDTswXAQsW62BC1hSsW24zPs675qv78"
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'drivers' | 'scholars' | 'suggestions' | 'finance' | 'safety'>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Simplified queries to avoid Index-related Permission Denied errors
  const { data: allUsers } = useCollection(
    useMemo(() => db ? query(collection(db, 'users')) : null, [db])
  );

  const { data: allRoutes } = useCollection(
    useMemo(() => db ? query(collection(db, 'routes')) : null, [db])
  );

  const { data: activeTrips } = useCollection(
    useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db])
  );

  const { data: activeAlerts } = useCollection(
    useMemo(() => db ? query(collection(db, 'alerts'), where('status', '==', 'active')) : null, [db])
  );

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const riders = useMemo(() => allUsers?.filter(u => u.role === 'rider') || [], [allUsers]);
  
  const savedRoutes = useMemo(() => 
    allRoutes?.filter(r => r.status === 'active')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) || [], 
    [allRoutes]
  );

  const suggestions = useMemo(() => 
    allRoutes?.filter(r => r.status === 'suggested')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) || [], 
    [allRoutes]
  );

  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];
  const fleetHealth = drivers.length > 0 ? Math.round((onTripDrivers.length / drivers.length) * 100) : 0;
  const totalRegionalDebt = drivers?.reduce((acc, d) => acc + (d.weeklyEarnings || 0), 0) || 0;

  const ridershipByRouteData = useMemo(() => {
    if (!activeTrips) return [];
    return activeTrips.map(trip => ({
      name: trip.routeName.length > 10 ? trip.routeName.substring(0, 10) + '...' : trip.routeName,
      riders: trip.riderCount || 0
    }));
  }, [activeTrips]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleResolveAlert = async (id: string) => {
    if (!db) return;
    updateDoc(doc(db, 'alerts', id), { status: 'resolved' });
    toast({ title: "Signal Resolved", description: "Emergency protocol cleared." });
  };

  const handleRegisterDriver = async () => {
    if (!db || !newDriverPhone || !newDriverName) return;
    setIsRegistering(true);
    try {
      const formattedPhone = newDriverPhone.startsWith('+91') ? newDriverPhone : `+91${newDriverPhone}`;
      const q = query(collection(db, 'users'), where('phoneNumber', '==', formattedPhone), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        updateDoc(doc(db, 'users', snap.docs[0].id), { 
          role: 'driver',
          fullName: newDriverName,
          city: newDriverCity,
          status: 'offline'
        });
      } else {
        const driverId = `DRV_${Date.now()}`;
        setDoc(doc(db, 'users', driverId), {
          uid: driverId,
          fullName: newDriverName,
          phoneNumber: formattedPhone,
          role: 'driver',
          city: newDriverCity,
          status: 'offline',
          totalTrips: 0,
          totalEarnings: 0,
          weeklyEarnings: 0,
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "Registry Updated" });
      setNewDriverName("");
      setNewDriverPhone("");
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Registry Error" });
    } finally {
      setIsRegistering(false);
    }
  };

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [demandPatterns, setDemandPatterns] = useState("Analyzing demand patterns...");
  const [targetCity, setTargetCity] = useState("Vizag");
  const [isRegistering, setIsRegistering] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverCity, setNewDriverCity] = useState("Vizag");

  const handleOptimize = async () => {
    if (!db) return;
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: demandPatterns || "Standard academic year demand.",
        historicalTrafficData: "Congestion at primary hub intersections.",
        preferredServiceHours: "6 AM to 10 PM",
        numberOfShuttlesAvailable: drivers.length || 10
      });
      
      for (const route of result.optimizedRoutes) {
        addDoc(collection(db, 'routes'), {
          ...route,
          city: targetCity,
          scheduledTime: "08:00", 
          basePayout: 150,
          isActive: true,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "Engine Synced", description: `${targetCity} routes deployed.` });
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReviewSuggestion = async (id: string, action: 'approve' | 'reject') => {
    if (!db) return;
    updateDoc(doc(db, 'routes', id), {
      status: action === 'approve' ? 'active' : 'rejected',
      isActive: action === 'approve',
      basePayout: 150,
      approvedAt: action === 'approve' ? new Date().toISOString() : null,
      scheduledTime: action === 'approve' ? "08:00" : null
    });
    toast({ title: action === 'approve' ? "Route Approved" : "Suggestion Rejected" });
  };

  const handleDeleteRoute = async (id: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'routes', id));
    toast({ title: "Route Removed" });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary font-body">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="font-black uppercase tracking-widest text-xs italic">Verifying Terminal Access...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-8">
        <div className="text-center space-y-6 max-w-sm">
          <ShieldAlert className="h-20 w-20 text-destructive mx-auto" />
          <h2 className="text-2xl font-black font-headline uppercase italic">Security Restricted</h2>
          <p className="font-bold text-muted-foreground">Admin credentials required.</p>
          <Button onClick={() => router.push('/')} className="w-full h-14 rounded-2xl font-black uppercase italic">Exit</Button>
        </div>
      </div>
    );
  }

  const filteredRiders = riders.filter(r => 
    r.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.collegeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#F8F9FC] font-body">
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-6 h-20 flex items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-accent" />
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fleet', label: 'Fleet Radar', icon: Navigation },
            { id: 'routes', label: 'Route Engine', icon: MapIcon },
            { id: 'suggestions', label: 'Suggestions', icon: MessageSquareShare, badge: suggestions?.length },
            { id: 'drivers', label: 'Workforce', icon: Truck },
            { id: 'scholars', label: 'Scholars', icon: Users },
            { id: 'finance', label: 'Finance', icon: Wallet },
            { id: 'safety', label: 'Safety Hub', icon: AlertTriangle, badge: activeAlerts?.length },
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === item.id ? 'bg-white/10 shadow-inner' : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}
            >
              <item.icon className="mr-3 h-4 w-4" /> {item.label}
              {item.badge ? <Badge className="ml-auto bg-accent text-[8px] h-4 min-w-4 p-0 flex items-center justify-center shadow-lg">{item.badge}</Badge> : null}
            </Button>
          ))}
          <div className="pt-4 border-t border-white/10 mt-4">
            <Button variant="ghost" className="w-full justify-start text-red-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-bold" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">
              {activeTab.toUpperCase()}
            </h2>
            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold border-none px-3 uppercase text-[9px] tracking-wider">{profile?.city} HUB</Badge>
          </div>
          {activeAlerts && activeAlerts.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-100 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{activeAlerts.length} EMERGENCY SIGNALS ACTIVE</span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Active Fleet', value: onTripDrivers.length, trend: 'MOVING', icon: Activity, color: 'text-green-600' },
                  { label: 'Regional Debt', value: `₹${totalRegionalDebt}`, trend: 'ACCOUNTS', icon: IndianRupee, color: 'text-primary' },
                  { label: 'Fleet Health', value: `${fleetHealth}%`, trend: 'CAPACITY', icon: Zap, color: 'text-accent' },
                  { label: 'Scholar Base', value: riders.length, trend: 'TOTAL', icon: Users, color: 'text-blue-600' },
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
                        <h3 className="text-3xl font-black text-primary font-headline italic">{metric.value}</h3>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden lg:col-span-2">
                   <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Live Ridership Engine</CardTitle>
                      <CardDescription className="font-bold">Active passengers per mission</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 h-[350px]">
                    {ridershipByRouteData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ridershipByRouteData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="riders" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                        <BarChart3 className="h-12 w-12 opacity-20" />
                        <p className="text-xs font-black uppercase italic">Awaiting Regional Data Feed...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
                  <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Live Manifest</CardTitle>
                    <CardDescription className="font-bold">Real-time scholar tracking</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                    {activeTrips?.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 font-bold italic border-2 border-dashed rounded-3xl">No missions active.</div>
                    ) : (
                      activeTrips?.map((trip: any) => (
                        <div key={trip.id} className="p-5 bg-secondary/50 rounded-3xl border border-secondary flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-primary uppercase italic text-sm">{trip.routeName}</h4>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">{trip.driverName}</p>
                            </div>
                            <Badge className="bg-accent/10 text-accent uppercase font-black text-[10px] border-none">{trip.riderCount || 0} Boarded</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {trip.passengers?.slice(0, 3).map((pid: string) => {
                              const rider = riders.find(r => r.uid === pid);
                              return (
                                <Badge key={pid} variant="outline" className="bg-white text-[8px] font-bold py-1 px-3">
                                  {rider?.fullName?.split(' ')[0] || "Scholar"}
                                </Badge>
                              );
                            })}
                            {(trip.riderCount > 3) && <Badge variant="outline" className="bg-white text-[8px] font-bold">+{trip.riderCount - 3}</Badge>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="h-[calc(100vh-12rem)] flex gap-8">
              <Card className="flex-1 border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden relative">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={12}
                    options={{ disableDefaultUI: true, styles: [{ featureType: 'all', elementType: 'all', stylers: [{ saturation: -100 }] }] }}
                  >
                    {drivers?.map((driver: any) => {
                      const activeTrip = activeTrips?.find(t => t.driverId === driver.uid);
                      const route = allRoutes?.find(r => r.routeName === activeTrip?.routeName);

                      return driver.currentLat && driver.currentLng && (
                        <Marker 
                          key={driver.uid} 
                          position={{ lat: driver.currentLat, lng: driver.currentLng }}
                          title={driver.fullName}
                          onClick={() => setSelectedDriverId(driver.uid)}
                          icon={driver.status === 'on-trip' ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'}
                        >
                          {selectedDriverId === driver.uid && (
                            <InfoWindow onCloseClick={() => setSelectedDriverId(null)}>
                              <div className="p-2 min-w-[200px] font-body">
                                <h4 className="font-black text-primary uppercase italic text-sm border-b pb-2 mb-2">{driver.fullName}</h4>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={driver.status === 'on-trip' ? 'bg-accent' : 'bg-green-500'}>{driver.status.toUpperCase()}</Badge>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase">{driver.city}</p>
                                  </div>
                                  {activeTrip && (
                                    <div className="bg-secondary/20 p-2 rounded-xl border border-secondary/30">
                                      <p className="text-[10px] font-black uppercase text-primary mb-1">Active Mission</p>
                                      <p className="font-bold text-xs">{activeTrip.routeName}</p>
                                      {route && (
                                        <div className="mt-2 space-y-1">
                                          <p className="text-[9px] font-black uppercase text-muted-foreground">Drop Protocol</p>
                                          {route.stops?.map((stop: string, i: number) => (
                                            <div key={i} className="flex items-center gap-1 text-[9px] font-bold">
                                              <MapPin className="h-2 w-2 text-primary" /> {stop}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </InfoWindow>
                          )}
                        </Marker>
                      );
                    })}
                  </GoogleMap>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 font-black italic uppercase">
                    Initializing Radar...
                  </div>
                )}
              </Card>

              <Card className="w-80 border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="font-black font-headline text-xl italic uppercase text-primary">Live Assets</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto px-6 space-y-4">
                  {onTripDrivers.length === 0 ? (
                    <div className="p-8 text-center border-4 border-dashed rounded-[2rem] text-slate-300 font-black italic uppercase text-[10px]">
                      No active missions.
                    </div>
                  ) : (
                    onTripDrivers.map(driver => {
                      const trip = activeTrips?.find(t => t.driverId === driver.uid);
                      return (
                        <div 
                          key={driver.uid} 
                          onClick={() => setSelectedDriverId(driver.uid)}
                          className={`p-5 rounded-3xl border cursor-pointer transition-all ${selectedDriverId === driver.uid ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-secondary/50 border-secondary hover:bg-secondary'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-black uppercase italic text-xs leading-none">{driver.fullName}</h4>
                            <Activity className={`h-3 w-3 ${selectedDriverId === driver.uid ? 'text-white' : 'text-accent'} animate-pulse`} />
                          </div>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${selectedDriverId === driver.uid ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {trip?.routeName || "Initializing..."}
                          </p>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden lg:col-span-1">
                <CardHeader>
                  <CardTitle className="font-black font-headline text-3xl italic uppercase text-white text-center">Route Engine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Select value={targetCity} onValueChange={setTargetCity}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl h-12 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vizag">Visakhapatnam</SelectItem>
                      <SelectItem value="Vizianagaram">Vizianagaram</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea value={demandPatterns} onChange={(e) => setDemandPatterns(e.target.value)} className="bg-white/5 border-white/20 text-white rounded-2xl font-bold min-h-[120px]" />
                  <Button onClick={handleOptimize} disabled={isOptimizing} className="w-full bg-accent hover:bg-accent/90 h-14 rounded-2xl font-black uppercase italic">
                    {isOptimizing ? <Loader2 className="animate-spin h-5 w-5" /> : "Deploy Regional Routes"}
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedRoutes?.map((route: any) => (
                    <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-primary uppercase italic text-lg">{route.routeName}</h4>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Payout: ₹{route.basePayout}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6">
              <Card className="bg-primary text-white rounded-[2rem] border-none shadow-xl p-8 max-w-sm">
                <p className="text-xs font-black uppercase tracking-widest opacity-60">Regional Payout Total</p>
                <h3 className="text-5xl font-black italic font-headline mt-2 uppercase tracking-tighter">₹{totalRegionalDebt}</h3>
              </Card>

              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                         <th className="py-6 pl-8">Worker</th>
                         <th className="py-6">Hub</th>
                         <th className="py-6 pr-8 text-right">Weekly Pending</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {drivers?.map((driver: any) => (
                         <tr key={driver.uid} className="hover:bg-secondary/20 transition-colors">
                           <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{driver.fullName}</td>
                           <td className="py-6 font-bold text-xs uppercase">{driver.city}</td>
                           <td className="py-6 pr-8 text-right font-black text-accent">₹{driver.weeklyEarnings || 0}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-2xl font-black font-headline italic uppercase text-red-600">Incident Command</h3>
                <Badge variant="outline" className="font-bold border-2 border-red-200 text-red-600 bg-red-50">{activeAlerts?.length || 0} ACTIVE SIGNALS</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAlerts?.map((alert: any) => (
                  <Card key={alert.id} className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden ring-4 ring-red-500/10">
                    <CardHeader className="bg-red-500 text-white p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Priority Emergency Signal</p>
                      </div>
                      <h4 className="font-black text-2xl font-headline italic uppercase">{alert.senderName}</h4>
                      <Badge className="bg-white/20 text-white uppercase font-black text-[10px] border-none mt-2">{alert.role} TERMINAL</Badge>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="h-48 bg-slate-100 rounded-2xl relative overflow-hidden">
                        {isLoaded && (
                          <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={{ lat: alert.lat || 17.6868, lng: alert.lng || 83.2185 }}
                            zoom={15}
                            options={{ disableDefaultUI: true }}
                          >
                            <Marker position={{ lat: alert.lat || 17.6868, lng: alert.lng || 83.2185 }} />
                          </GoogleMap>
                        )}
                      </div>
                      <Button onClick={() => handleResolveAlert(alert.id)} className="w-full bg-green-500 hover:bg-green-600 h-14 rounded-2xl font-black uppercase italic">Resolve Signal</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ... Other tabs maintained ... */}
          {activeTab === 'scholars' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search scholars..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-2xl border-none shadow-sm font-bold bg-white"
                  />
                </div>
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                         <th className="py-6 pl-8">Profile</th>
                         <th className="py-6">Institution</th>
                         <th className="py-6 text-center">Wallet</th>
                         <th className="py-6 text-right pr-8">Joined</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {filteredRiders.map((rider: any) => (
                         <tr key={rider.uid} className="hover:bg-secondary/30 transition-colors">
                           <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{rider.fullName}</td>
                           <td className="py-6 font-bold text-xs uppercase">{rider.collegeName}</td>
                           <td className="py-6 text-center">₹{rider.credits || 0}</td>
                           <td className="py-6 text-right pr-8 font-bold text-[10px] text-muted-foreground">
                             {rider.createdAt ? new Date(rider.createdAt).toLocaleDateString() : 'N/A'}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Registry</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-bold h-12 bg-primary">Add Driver</Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] bg-white">
                    <DialogHeader>
                      <DialogTitle className="font-black italic uppercase">Register Workforce</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                      <Input placeholder="Driver Name" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} />
                      <Input placeholder="+91..." value={newDriverPhone} onChange={(e) => setNewDriverPhone(e.target.value)} />
                      <Button onClick={handleRegisterDriver} className="w-full bg-accent h-14 rounded-xl font-black uppercase italic">Add to Hub</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground">
                         <th className="py-6 pl-8">Profile</th>
                         <th className="py-6">Status</th>
                         <th className="py-6 text-center">Trips</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {drivers?.map((driver: any) => (
                         <tr key={driver.uid} className="hover:bg-secondary/30 transition-colors">
                           <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{driver.fullName}</td>
                           <td className="py-6">
                             <Badge className={driver.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-green-100 text-green-700'}>{driver.status}</Badge>
                           </td>
                           <td className="py-6 text-center font-black">{driver.totalTrips || 0}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
