
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bus, 
  Activity, 
  Zap, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Truck,
  MessageSquareShare,
  IndianRupee,
  Wallet,
  Users,
  AlertTriangle,
  TrendingUp,
  Settings2,
  CheckCircle2,
  Phone,
  Clock,
  MapPin,
  Plus,
  BarChart3,
  ChevronRight,
  Route as RouteIcon,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowRight,
  MapPinned,
  GanttChart
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem'
};

const mapOptions = {
  mapId: "da87e9c90896eba04be76dde",
  disableDefaultUI: true,
};

type Stop = {
  name: string;
  lat: number;
  lng: number;
};

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'drivers' | 'students' | 'suggestions' | 'finance' | 'safety'>('dashboard');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  
  const [newRoute, setNewRoute] = useState({ 
    routeName: '', 
    city: 'Vizag',
    baseFare: 50,
    surgeFare: 0,
    stops: [] as Stop[] 
  });
  
  const [tempStop, setTempStop] = useState<Stop>({ name: '', lat: 17.6868, lng: 83.2185 });

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Security check: Redirect non-admins
  useEffect(() => {
    if (profile && profile.role !== 'admin' && !authLoading && !profileLoading) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "This terminal is reserved for administrators."
      });
      router.push('/');
    }
  }, [profile, authLoading, profileLoading, router, toast]);

  const { data: allUsers } = useCollection(useMemo(() => (db && user && profile?.role === 'admin') ? query(collection(db, 'users')) : null, [db, user, profile?.role]));
  const { data: allRoutes } = useCollection(useMemo(() => (db && user && profile?.role === 'admin') ? query(collection(db, 'routes')) : null, [db, user, profile?.role]));
  const { data: allTrips } = useCollection(useMemo(() => (db && user && profile?.role === 'admin') ? query(collection(db, 'trips')) : null, [db, user, profile?.role]));
  const { data: allAlerts } = useCollection(useMemo(() => (db && user && profile?.role === 'admin') ? query(collection(db, 'alerts')) : null, [db, user, profile?.role]));

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const students = useMemo(() => allUsers?.filter(u => u.role === 'rider') || [], [allUsers]);
  const activeTrips = useMemo(() => allTrips?.filter(t => t.status === 'active') || [], [allTrips]);
  const activeAlerts = useMemo(() => allAlerts?.filter(a => a.status === 'active' || a.status === 'pending') || [], [allAlerts]);
  
  const savedRoutes = useMemo(() => allRoutes?.filter(r => r.status === 'active') || [], [allRoutes]);
  const suggestions = useMemo(() => allRoutes?.filter(r => r.status === 'suggested') || [], [allRoutes]);

  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];
  
  const routeDemand = useMemo(() => {
    const demand: Record<string, number> = {};
    allTrips?.forEach(trip => {
      demand[trip.routeName] = (demand[trip.routeName] || 0) + (trip.verifiedPassengers?.length || 0);
    });
    return Object.entries(demand)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [allTrips]);

  const totalCommission = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.commissionAmount || 0), 0) || 0, [allTrips]);
  const totalPayout = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.payoutAmount || 0), 0) || 0, [allTrips]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const addStopToRoute = () => {
    if (!tempStop.name || !tempStop.lat || !tempStop.lng) return;
    setNewRoute({
      ...newRoute,
      stops: [...newRoute.stops, tempStop]
    });
    setTempStop({ name: '', lat: 17.6868, lng: 83.2185 });
  };

  const removeStop = (index: number) => {
    const updatedStops = [...newRoute.stops];
    updatedStops.splice(index, 1);
    setNewRoute({ ...newRoute, stops: updatedStops });
  };

  const handleCreateRoute = async () => {
    if (!db || !newRoute.routeName || newRoute.stops.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "Route needs a name and at least 2 stops." });
      return;
    }
    try {
      await addDoc(collection(db, 'routes'), {
        ...newRoute,
        status: 'active',
        isActive: true,
        busMultiplier: 1.0,
        miniBusMultiplier: 1.2,
        vanMultiplier: 1.5,
        createdAt: new Date().toISOString()
      });
      setIsAddingRoute(false);
      setNewRoute({ routeName: '', city: profile?.city || 'Vizag', baseFare: 50, surgeFare: 0, stops: [] });
      toast({ title: "Route Created", description: "The new route is now available for drivers." });
    } catch {
      toast({ variant: "destructive", title: "Could not create route" });
    }
  };

  const handleUpdateRoutePricing = async (routeId: string, updates: any) => {
    if (!db) return;
    updateDoc(doc(db, 'routes', routeId), updates);
    toast({ title: "Price Updated", description: "Fare changes applied successfully." });
  };

  const handleApproveSuggestion = async (routeId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', routeId), { status: 'active' });
      toast({ title: "Approved", description: "This suggested route is now active." });
    } catch {
      toast({ variant: "destructive", title: "Approval failed" });
    }
  };

  const handleRejectSuggestion = async (routeId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', routeId));
      toast({ title: "Rejected", description: "Route suggestion has been removed." });
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (profile && profile.role !== 'admin') return null;

  return (
    <div className="flex h-screen bg-[#020617] font-body text-slate-200">
      <aside className="w-64 bg-slate-950 flex flex-col shrink-0 shadow-2xl z-20 border-r border-white/5">
        <div className="p-6 h-20 flex items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Bus className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-black font-headline italic tracking-tighter uppercase text-glow">AAGO ADMIN</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'fleet', label: 'Live Map', icon: Navigation },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
            { id: 'suggestions', label: 'Suggestions', icon: MessageSquareShare, badge: suggestions?.length },
            { id: 'drivers', label: 'Drivers', icon: Truck },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'finance', label: 'Payments', icon: Wallet },
            { id: 'safety', label: 'SOS Alerts', icon: AlertTriangle, badge: activeAlerts?.length },
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-bold h-11 px-4 transition-all ${activeTab === item.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <item.icon className={`mr-3 h-4 w-4 ${activeTab === item.id ? 'text-primary' : ''}`} /> {item.label}
              {item.badge ? <Badge className="ml-auto bg-primary text-[8px] h-4 min-w-4 p-0 flex items-center justify-center font-black">{item.badge}</Badge> : null}
            </Button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-slate-950 border-b border-white/5 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black font-headline text-white italic uppercase tracking-tight">{activeTab}</h2>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">HUB: {profile?.city}</p>
          </div>
          <div className="flex items-center gap-4">
             <Badge className="bg-primary/10 text-primary border border-primary/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5">System Online</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Live Trips', value: onTripDrivers.length, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
                  { label: 'Admin Profit', value: `₹${totalCommission.toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Fleet Active', value: `${drivers.length > 0 ? Math.round((onTripDrivers.length / drivers.length) * 100) : 0}%`, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                  { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-slate-900/50 border-white/5 shadow-xl rounded-[1.5rem] group hover:border-primary/20 transition-all duration-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 ${metric.bg} rounded-xl group-hover:scale-110 transition-transform duration-500`}>
                          <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-white font-headline italic">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <Card className="lg:col-span-2 bg-slate-900/50 border-white/5 rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5 bg-slate-950/30">
                       <CardTitle className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" /> Popular Routes
                       </CardTitle>
                       <CardDescription className="text-slate-500 font-bold text-xs uppercase italic">Number of students booked per route</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                       <div className="space-y-6">
                          {routeDemand.map(([routeName, studentsCount], i) => (
                            <div key={i} className="space-y-3">
                               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                  <span className="text-white italic">{routeName}</span>
                                  <span className="text-primary">{studentsCount} Bookings</span>
                               </div>
                               <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (studentsCount / 50) * 100)}%` }} 
                                  />
                               </div>
                            </div>
                          ))}
                          {routeDemand.length === 0 && (
                            <p className="text-center py-12 text-slate-500 font-bold italic uppercase text-xs tracking-widest">No trip data available yet...</p>
                          )}
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center group">
                    <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                       <Plus className="h-10 w-10 text-primary" />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">New Route</h4>
                    <p className="text-xs font-bold text-slate-500 italic mb-6 leading-relaxed">Add a new route to the student network.</p>
                    <Button 
                      onClick={() => { setActiveTab('routes'); setIsAddingRoute(true); }}
                      className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl font-black italic uppercase"
                    >
                      Create Route
                    </Button>
                 </Card>
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="h-[calc(100vh-14rem)] relative border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={{ lat: 17.6868, lng: 83.2185 }}
                  zoom={12}
                  options={mapOptions}
                >
                  {drivers.filter(d => d.currentLat).map((driver: any) => {
                    const driverTrip = activeTrips.find(t => t.driverId === driver.uid);
                    const driverRoute = allRoutes?.find(r => r.routeName === driverTrip?.routeName);
                    
                    return (
                      <div key={driver.uid}>
                        <Marker
                          position={{ lat: driver.currentLat, lng: driver.currentLng }}
                          onClick={() => setSelectedDriver({ ...driver, activeTrip: driverTrip, activeRoute: driverRoute })}
                          icon={{
                            url: driver.status === 'on-trip' 
                              ? 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png' 
                              : 'https://cdn-icons-png.flaticon.com/512/3448/3448564.png',
                            scaledSize: new window.google.maps.Size(32, 32)
                          }}
                        />
                        {selectedDriver?.uid === driver.uid && driverRoute?.stops && (
                          <>
                            <Polyline
                              path={driverRoute.stops.map((s: Stop) => ({ lat: s.lat, lng: s.lng }))}
                              options={{
                                strokeColor: "#3b82f6",
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                              }}
                            />
                            {driverRoute.stops.map((stop: Stop, i: number) => (
                              <Marker 
                                key={i}
                                position={{ lat: stop.lat, lng: stop.lng }}
                                icon={{
                                  url: i === 0 
                                    ? 'https://cdn-icons-png.flaticon.com/512/8157/8157580.png' 
                                    : i === driverRoute.stops.length - 1 
                                      ? 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png' 
                                      : 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                                  scaledSize: new window.google.maps.Size(20, 20)
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {selectedDriver && (
                    <InfoWindow
                      position={{ lat: selectedDriver.currentLat, lng: selectedDriver.currentLng }}
                      onCloseClick={() => setSelectedDriver(null)}
                    >
                      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl min-w-[300px]">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h4 className="font-black text-white uppercase italic text-sm leading-none">{selectedDriver.fullName}</h4>
                              <p className="text-[8px] font-black text-slate-500 uppercase mt-1 tracking-widest">{selectedDriver.vehicleType}</p>
                           </div>
                           <Badge className={`${selectedDriver.status === 'on-trip' ? 'bg-green-500' : 'bg-primary'} text-[8px] border-none font-black uppercase`}>
                             {selectedDriver.status}
                           </Badge>
                        </div>
                        
                        {selectedDriver.activeTrip ? (
                          <div className="space-y-4 pt-4 border-t border-white/5">
                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Route</span>
                                <span className="text-primary">{selectedDriver.activeTrip.routeName}</span>
                             </div>
                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Students Boarded</span>
                                <span className="text-white">{selectedDriver.activeTrip.verifiedPassengers?.length || 0}</span>
                             </div>
                          </div>
                        ) : (
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 italic">Not on a trip right now.</p>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-950">
                  <Loader2 className="animate-spin text-primary h-10 w-10" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                  <RouteIcon className="h-5 w-5 text-primary" /> Manage Routes
                </h3>
                <Button 
                  onClick={() => setIsAddingRoute(!isAddingRoute)} 
                  className="bg-primary hover:bg-primary/90 rounded-xl font-black italic uppercase h-11 px-8 shadow-lg shadow-primary/20"
                >
                  {isAddingRoute ? "View All Routes" : "Add New Route"}
                </Button>
              </div>

              {isAddingRoute ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="bg-slate-900/50 border-white/5 rounded-[2.5rem] p-10 shadow-2xl border-l-8 border-primary overflow-hidden relative">
                    <div className="space-y-8 relative z-10">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Route Name</Label>
                           <Input 
                             value={newRoute.routeName} 
                             onChange={(e) => setNewRoute({ ...newRoute, routeName: e.target.value })}
                             placeholder="e.g. Campus Direct" 
                             className="h-14 bg-slate-950 border-white/10 rounded-2xl font-black text-white italic" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">City</Label>
                           <Input 
                             value={newRoute.city} 
                             readOnly
                             className="h-14 bg-slate-950/50 border-white/10 rounded-2xl font-black text-slate-500 italic cursor-not-allowed" 
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 p-6 bg-slate-950/50 rounded-[2rem] border border-white/5">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1">Base Price (₹)</Label>
                           <Input 
                             type="number"
                             value={newRoute.baseFare} 
                             onChange={(e) => setNewRoute({ ...newRoute, baseFare: Number(e.target.value) })}
                             className="h-14 bg-slate-900 border-none rounded-xl font-black text-white" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-accent tracking-[0.2em] ml-1">Extra Surge (₹)</Label>
                           <Input 
                             type="number"
                             value={newRoute.surgeFare} 
                             onChange={(e) => setNewRoute({ ...newRoute, surgeFare: Number(e.target.value) })}
                             className="h-14 bg-slate-900 border-none rounded-xl font-black text-white" 
                           />
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2">
                           <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Add Stops</Label>
                           <Badge variant="outline" className="text-[8px] uppercase border-white/10 text-slate-400">
                             {newRoute.stops.length === 0 ? 'Add Start' : 'Add Stop'}
                           </Badge>
                        </div>
                        <div className="space-y-4 bg-slate-950/30 p-6 rounded-[2rem] border border-dashed border-white/10">
                           <Input 
                             placeholder="Stop Name (e.g. Main Gate)" 
                             value={tempStop.name}
                             onChange={(e) => setTempStop({...tempStop, name: e.target.value})}
                             className="h-12 bg-slate-900 border-none rounded-xl"
                           />
                           <div className="grid grid-cols-2 gap-4">
                                <Input 
                                  type="number" 
                                  placeholder="Latitude"
                                  value={tempStop.lat}
                                  onChange={(e) => setTempStop({...tempStop, lat: Number(e.target.value)})}
                                  className="h-12 bg-slate-900 border-none rounded-xl"
                                />
                                <Input 
                                  type="number" 
                                  placeholder="Longitude"
                                  value={tempStop.lng}
                                  onChange={(e) => setTempStop({...tempStop, lng: Number(e.target.value)})}
                                  className="h-12 bg-slate-900 border-none rounded-xl"
                                />
                           </div>
                           <Button onClick={addStopToRoute} variant="secondary" className="w-full h-12 rounded-xl font-black uppercase italic shadow-lg">
                              Add Stop to Route
                           </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-6">
                         <Button 
                           onClick={handleCreateRoute}
                           disabled={!newRoute.routeName || newRoute.stops.length < 2}
                           className="h-16 bg-primary hover:bg-primary/90 rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-primary/20"
                         >
                           Save Route
                         </Button>
                         <Button variant="ghost" onClick={() => setIsAddingRoute(false)} className="h-16 text-slate-500 font-black uppercase italic hover:text-white">
                           Cancel
                         </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-slate-900/50 border-white/5 rounded-[2.5rem] p-10 flex flex-col shadow-2xl">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Route Preview</h4>
                        {newRoute.stops.length > 0 && <Badge className="bg-primary/10 text-primary border-none">{newRoute.stops.length} Stops</Badge>}
                     </div>
                     <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-4 custom-scrollbar">
                        {newRoute.stops.map((stop, i) => (
                          <div key={i} className="flex items-center justify-between p-6 bg-slate-950/50 rounded-[2rem] border border-white/5 group relative overflow-hidden">
                             <div className="flex items-center gap-6 relative z-10">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-[10px] shadow-lg ${i === 0 ? 'bg-green-500 text-white' : i === newRoute.stops.length - 1 ? 'bg-red-500 text-white' : 'bg-primary/20 text-primary border border-primary/20'}`}>
                                   {i === 0 ? 'START' : i === newRoute.stops.length - 1 ? 'END' : i}
                                </div>
                                <div>
                                   <p className="text-sm font-black uppercase italic text-white leading-none">{stop.name}</p>
                                </div>
                             </div>
                             <Button size="icon" variant="ghost" onClick={() => removeStop(i)} className="text-red-500 h-10 w-10 rounded-xl hover:bg-red-500/10 relative z-10">
                                <Trash2 className="h-4 w-4" />
                             </Button>
                             {i < newRoute.stops.length - 1 && (
                               <div className="absolute left-12 top-full w-0.5 h-10 bg-slate-800 -translate-x-1/2" />
                             )}
                          </div>
                        ))}
                        {newRoute.stops.length === 0 && (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border-2 border-dashed border-white/5 rounded-[3rem]">
                             <MapPinned className="h-16 w-16 text-slate-800 mb-6" />
                             <p className="text-slate-500 font-bold italic uppercase tracking-widest text-xs leading-relaxed">Please add stops above.</p>
                          </div>
                        )}
                     </div>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedRoutes.map((route: any) => (
                    <Card key={route.id} className="bg-slate-900/50 border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-primary/20 transition-all shadow-xl">
                      <div className="p-8 border-b border-white/5 bg-slate-950/30">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-white uppercase italic text-xl leading-tight">{route.routeName}</h4>
                          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-widest px-3">Active</Badge>
                        </div>
                        <p className="text-[8px] font-black text-slate-500 uppercase mt-2 tracking-widest">{route.stops?.[0]?.name} <ArrowRight className="inline h-2 w-2 mx-1" /> {route.stops?.[route.stops.length-1]?.name}</p>
                      </div>
                      <CardContent className="p-8 space-y-6">
                         <div className="grid grid-cols-2 gap-6 p-4 bg-slate-950 rounded-2xl border border-white/5">
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Price</p>
                              <p className="text-xl font-black text-white italic">₹{route.baseFare}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Surge</p>
                              <p className="text-xl font-black text-primary italic">+₹{route.surgeFare}</p>
                           </div>
                         </div>
                         <div className="flex gap-3">
                           <Dialog>
                             <DialogTrigger asChild>
                               <Button variant="outline" className="flex-1 rounded-xl h-11 font-black uppercase italic border-white/10 text-[10px] hover:bg-white/5">
                                 Update Price
                               </Button>
                             </DialogTrigger>
                             <DialogContent className="bg-slate-950 border-white/10 text-white rounded-[2rem]">
                               <DialogHeader>
                                 <DialogTitle className="font-black italic uppercase">Price Change: {route.routeName}</DialogTitle>
                                 <DialogDescription className="text-slate-500 font-bold italic">Update the fare for this route.</DialogDescription>
                               </DialogHeader>
                               <div className="space-y-6 pt-4">
                                 <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                     <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Base Fare (₹)</Label>
                                     <Input 
                                       type="number" 
                                       defaultValue={route.baseFare} 
                                       className="bg-slate-900 border-none h-12 rounded-xl font-black"
                                       id={`base-${route.id}`}
                                     />
                                   </div>
                                   <div className="space-y-2">
                                     <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Surge (₹)</Label>
                                     <Input 
                                       type="number" 
                                       defaultValue={route.surgeFare} 
                                       className="bg-slate-900 border-none h-12 rounded-xl font-black"
                                       id={`surge-${route.id}`}
                                     />
                                   </div>
                                 </div>
                                 <Button 
                                   onClick={() => {
                                     const base = (document.getElementById(`base-${route.id}`) as HTMLInputElement).value;
                                     const surge = (document.getElementById(`surge-${route.id}`) as HTMLInputElement).value;
                                     handleUpdateRoutePricing(route.id, { baseFare: Number(base), surgeFare: Number(surge) });
                                   }}
                                   className="w-full h-14 bg-primary font-black uppercase italic rounded-xl"
                                 >
                                   Apply Changes
                                 </Button>
                               </div>
                             </DialogContent>
                           </Dialog>
                           <Button size="icon" variant="ghost" className="rounded-xl h-11 w-11 text-red-500 hover:bg-red-500/10" onClick={() => deleteDoc(doc(db, 'routes', route.id))}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-6">
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <MessageSquareShare className="h-5 w-5 text-primary" /> Driver Route Suggestions
               </h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {suggestions.map((route: any) => (
                   <Card key={route.id} className="bg-slate-900 border-white/5 rounded-[2rem] overflow-hidden border-l-4 border-yellow-500/50 shadow-2xl">
                     <div className="p-8 bg-slate-950/30 border-b border-white/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-white uppercase italic text-xl leading-none">{route.routeName}</h4>
                            <p className="text-[8px] font-black text-slate-500 uppercase mt-2 tracking-widest">Suggested by a driver</p>
                          </div>
                          <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-black uppercase tracking-widest">Waiting Approval</Badge>
                        </div>
                     </div>
                     <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Suggested Stops</p>
                           <div className="flex flex-wrap gap-2">
                              {route.stops?.map((stop: any, i: number) => (
                                <Badge key={i} variant="outline" className="border-white/10 text-slate-400 text-[8px] font-black uppercase">
                                  {i === 0 ? 'START: ' : i === route.stops.length - 1 ? 'END: ' : ''}{stop.name}
                                </Badge>
                              ))}
                           </div>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-white/5">
                           <Button onClick={() => handleApproveSuggestion(route.id)} className="flex-1 bg-green-500 hover:bg-green-600 rounded-xl font-black uppercase italic h-12">
                              <CheckCircle className="h-4 w-4 mr-2" /> Approve
                           </Button>
                           <Button onClick={() => handleRejectSuggestion(route.id)} variant="ghost" className="text-red-500 hover:bg-red-500/10 rounded-xl font-black uppercase italic h-12">
                              <XCircle className="h-4 w-4 mr-2" /> Delete
                           </Button>
                        </div>
                     </CardContent>
                   </Card>
                 ))}
                 {suggestions.length === 0 && (
                   <div className="lg:col-span-2 p-20 text-center bg-slate-900/50 rounded-[3rem] border border-dashed border-white/10">
                     <p className="text-slate-500 font-bold italic uppercase tracking-widest">No new suggestions from drivers.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Registered Students
               </h3>
               <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                         <th className="py-6 pl-10">Name</th>
                         <th className="py-6">College</th>
                         <th className="py-6">ID Number</th>
                         <th className="py-6">Wallet (₹)</th>
                         <th className="py-6 pr-10 text-right">Joined</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                       {students.map((student: any) => (
                         <tr key={student.uid} className="hover:bg-white/5 transition-colors">
                           <td className="py-6 pl-10 font-black text-white uppercase italic text-sm">{student.fullName}</td>
                           <td className="py-6 font-bold text-xs text-slate-400">{student.collegeName || 'N/A'}</td>
                           <td className="py-6 font-mono text-[10px] text-slate-500">{student.studentId || 'N/A'}</td>
                           <td className="py-6">
                              <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">₹{student.credits || 0}</Badge>
                           </td>
                           <td className="py-6 pr-10 text-right text-[10px] font-bold text-slate-500 uppercase">
                              {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '---'}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </Card>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Registered Drivers
               </h3>
               <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                        <th className="py-6 pl-10">Name</th>
                        <th className="py-6">Vehicle</th>
                        <th className="py-6">Total Trips</th>
                        <th className="py-6">Status</th>
                        <th className="py-6 pr-10 text-right">Earnings (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {drivers.map((driver: any) => (
                        <tr key={driver.uid} className="hover:bg-white/5 transition-colors">
                          <td className="py-6 pl-10 font-black text-white uppercase italic text-sm">{driver.fullName}</td>
                          <td className="py-6">
                             <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400">{driver.vehicleNumber || '---'}</p>
                                <Badge className="bg-white/5 text-slate-500 text-[7px] border-none uppercase">{driver.vehicleType}</Badge>
                             </div>
                          </td>
                          <td className="py-6 font-black text-white text-lg italic">{driver.totalTrips || 0}</td>
                          <td className="py-6">
                             <Badge className={`${driver.status === 'on-trip' ? 'bg-green-500' : driver.status === 'available' ? 'bg-blue-500' : 'bg-slate-800'} text-[8px] font-black uppercase border-none`}>
                               {driver.status}
                             </Badge>
                          </td>
                          <td className="py-6 pr-10 text-right font-black text-primary text-sm italic">
                             ₹{(driver.totalEarnings || 0).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                 </div>
               </Card>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Admin Profit (10%)</p>
                    <h3 className="text-5xl font-black italic font-headline mt-3 tracking-tighter">₹{totalCommission.toFixed(2)}</h3>
                    <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/10 rounded-full w-fit">
                      <TrendingUp className="h-3 w-3" />
                      <p className="text-[9px] font-black uppercase tracking-widest">Yielding Profit</p>
                    </div>
                  </div>
                  <GanttChart className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
                <Card className="bg-slate-900 border-white/5 text-white shadow-xl rounded-[2.5rem] p-10 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Driver Total Pay (90%)</p>
                    <h3 className="text-5xl font-black italic font-headline mt-3 tracking-tighter">
                      ₹{totalPayout.toFixed(2)}
                    </h3>
                    <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/5 rounded-full w-fit">
                      <Wallet className="h-3 w-3 text-primary" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Paid to Drivers</p>
                    </div>
                  </div>
                  <TrendingUp className="absolute -right-8 -bottom-8 h-48 w-48 text-primary opacity-5" />
                </Card>
              </div>

              <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-white/5">
                  <CardTitle className="text-lg font-black italic uppercase">Recent Trip Payments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950/50 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                          <th className="py-4 pl-10">Time</th>
                          <th className="py-4">Route</th>
                          <th className="py-4">Total Collected</th>
                          <th className="py-4">Our Fee</th>
                          <th className="py-4 pr-10 text-right">Driver Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allTrips?.filter(t => t.status === 'completed').slice(0, 10).map((trip: any) => (
                          <tr key={trip.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-5 pl-10 text-[10px] font-bold text-slate-500">
                              {new Date(trip.endTime).toLocaleString()}
                            </td>
                            <td className="py-5 font-black text-white uppercase italic text-xs">{trip.routeName}</td>
                            <td className="py-5 font-bold text-white text-xs">₹{trip.totalFareCollected?.toFixed(2)}</td>
                            <td className="py-5 text-primary font-black text-xs">₹{trip.commissionAmount?.toFixed(2)}</td>
                            <td className="py-5 pr-10 text-right font-black text-green-400 text-xs">₹{trip.payoutAmount?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" /> Emergency SOS Center
                </h3>
              </div>
              <div className="space-y-4">
                {activeAlerts.length === 0 ? (
                  <Card className="p-20 text-center bg-green-500/5 border-dashed border-green-500/20 rounded-[3rem]">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6 opacity-40" />
                    <p className="text-green-500 font-black uppercase italic tracking-[0.4em] text-sm">All Students Safe</p>
                  </Card>
                ) : (
                  activeAlerts.map((alert: any) => (
                    <Card key={alert.id} className="bg-slate-900/50 border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-l-8 border-red-500 shadow-2xl">
                      <div className="flex items-center gap-8">
                        <div className="bg-red-500/10 p-6 rounded-2xl shadow-inner">
                          <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-black text-red-500 uppercase italic text-2xl leading-none">SOS: {alert.userName || 'Unknown'}</h4>
                          <p className="text-[11px] font-bold text-slate-500 uppercase">TIME: {new Date(alert.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button 
                          onClick={() => updateDoc(doc(db, 'alerts', alert.id), { status: 'resolved' })} 
                          className="bg-primary hover:bg-primary/90 rounded-xl font-black uppercase italic h-14 px-10"
                        >
                          Mark as Resolved
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
