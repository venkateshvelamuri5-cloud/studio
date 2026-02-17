
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
  GanttChart,
  CreditCard
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';
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
      toast({ title: "Route Created", description: "The new route is now live for students and drivers." });
    } catch {
      toast({ variant: "destructive", title: "Could not create route" });
    }
  };

  const handleProcessPayout = async (driver: any) => {
    if (!db || !driver.weeklyEarnings || driver.weeklyEarnings <= 0) return;
    const amount = driver.weeklyEarnings;
    try {
      const drRef = doc(db, 'users', driver.uid);
      await updateDoc(drRef, {
        totalEarnings: increment(amount),
        weeklyEarnings: 0,
        payoutHistory: arrayUnion({
          amount,
          date: new Date().toISOString(),
          status: 'processed'
        })
      });
      toast({ title: "Payout Processed", description: `Transferred ₹${amount} to ${driver.fullName}.` });
    } catch {
      toast({ variant: "destructive", title: "Payout failed" });
    }
  };

  const handleApproveSuggestion = async (routeId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', routeId), { status: 'active' });
      toast({ title: "Approved", description: "This route is now part of the active network." });
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  const handleRejectSuggestion = async (routeId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', routeId));
      toast({ title: "Rejected", description: "Suggestion deleted." });
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

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
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fleet', label: 'Live Map', icon: Navigation },
            { id: 'routes', label: 'Manage Routes', icon: RouteIcon },
            { id: 'suggestions', label: 'Proposals', icon: MessageSquareShare, badge: suggestions?.length },
            { id: 'drivers', label: 'Drivers', icon: Truck },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'finance', label: 'Payments', icon: Wallet },
            { id: 'safety', label: 'Emergency', icon: AlertTriangle, badge: activeAlerts?.length },
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-bold h-11 px-4 transition-all ${activeTab === item.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
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
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5">Network Online</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Active Trips', value: activeTrips.length, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
                  { label: 'Platform Fee', value: `₹${totalCommission.toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Active Drivers', value: drivers.filter(d => d.status !== 'offline').length, icon: Truck, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                  { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-slate-900/50 border-white/5 shadow-xl rounded-[1.5rem] group hover:border-primary/20 transition-all duration-500">
                    <CardContent className="p-6">
                      <div className={`p-3 ${metric.bg} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                        <metric.icon className={`h-5 w-5 ${metric.color}`} />
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-white font-headline italic">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="bg-slate-900/50 border-white/5 rounded-[2rem]">
                    <CardHeader className="p-8 border-b border-white/5">
                       <CardTitle className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" /> Popular Corridors
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                       {savedRoutes.slice(0, 5).map((route: any, i: number) => (
                          <div key={i} className="space-y-3">
                             <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                <span className="text-white italic">{route.routeName}</span>
                                <span className="text-primary">{route.baseFare} Base</span>
                             </div>
                             <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: '45%' }} />
                             </div>
                          </div>
                       ))}
                    </CardContent>
                 </Card>

                 <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center group">
                    <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                       <Plus className="h-10 w-10 text-primary" />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Create Corridor</h4>
                    <p className="text-xs font-bold text-slate-500 italic mb-6">Deploy a new route to the regional hub.</p>
                    <Button onClick={() => setActiveTab('routes')} className="w-full bg-primary font-black uppercase h-12 rounded-xl">Add New Route</Button>
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
                  {drivers.filter(d => typeof d.currentLat === 'number' && isFinite(d.currentLat)).map((driver: any) => {
                    const driverTrip = activeTrips.find(t => t.driverId === driver.uid);
                    const driverRoute = allRoutes?.find(r => r.routeName === driverTrip?.routeName);
                    const validStops = driverRoute?.stops?.filter((s: any) => typeof s.lat === 'number' && isFinite(s.lat)) || [];
                    
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
                        {selectedDriver?.uid === driver.uid && validStops.length > 0 && (
                          <Polyline
                            path={validStops.map((s: Stop) => ({ lat: s.lat, lng: s.lng }))}
                            options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 4 }}
                          />
                        )}
                      </div>
                    );
                  })}

                  {selectedDriver && (
                    <InfoWindow
                      position={{ lat: selectedDriver.currentLat, lng: selectedDriver.currentLng }}
                      onCloseClick={() => setSelectedDriver(null)}
                    >
                      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl min-w-[250px]">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="h-10 w-10 rounded-xl overflow-hidden bg-primary/20">
                              {selectedDriver.photoUrl ? (
                                <img src={selectedDriver.photoUrl} className="h-full w-full object-cover" alt="Driver" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-primary font-black">
                                  {selectedDriver.fullName[0]}
                                </div>
                              )}
                           </div>
                           <div>
                              <h4 className="font-black text-white uppercase italic text-sm">{selectedDriver.fullName}</h4>
                              <p className="text-[8px] font-black text-slate-500 uppercase">{selectedDriver.vehicleNumber}</p>
                           </div>
                        </div>
                        {selectedDriver.activeTrip ? (
                          <div className="space-y-2 pt-4 border-t border-white/5">
                             <div className="flex justify-between text-[9px] font-black uppercase">
                                <span className="text-slate-400">Current Trip</span>
                                <span className="text-primary">{selectedDriver.activeTrip.routeName}</span>
                             </div>
                             <div className="flex justify-between text-[9px] font-black uppercase">
                                <span className="text-slate-400">Boarded</span>
                                <span className="text-white">{selectedDriver.activeTrip.verifiedPassengers?.length || 0} Students</span>
                             </div>
                          </div>
                        ) : (
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 italic">Idle - No active trip.</p>
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

          {activeTab === 'finance' && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Network Protocol Revenue (10%)</p>
                    <h3 className="text-5xl font-black italic font-headline mt-3">₹{totalCommission.toFixed(0)}</h3>
                    <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/10 rounded-full w-fit">
                      <TrendingUp className="h-3 w-3" />
                      <p className="text-[9px] font-black uppercase tracking-widest">Platform Fees</p>
                    </div>
                  </div>
                  <GanttChart className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
                <Card className="bg-slate-900 border-white/5 text-white shadow-xl rounded-[2.5rem] p-10 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Driver Earnings (90%)</p>
                    <h3 className="text-5xl font-black italic font-headline mt-3">
                      ₹{totalPayout.toFixed(0)}
                    </h3>
                    <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/5 rounded-full w-fit">
                      <Wallet className="h-3 w-3 text-primary" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sent to Partners</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="bg-slate-900/50 border-white/5 rounded-[2rem]">
                <CardHeader className="p-8 border-b border-white/5">
                  <CardTitle className="text-lg font-black italic uppercase">Pending Driver Payouts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-950/50 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                              <th className="py-4 pl-10">Driver</th>
                              <th className="py-4">Bank Ref (License)</th>
                              <th className="py-4">Pending Pay</th>
                              <th className="py-4 pr-10 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {drivers.filter(d => (d.weeklyEarnings || 0) > 0).map((driver: any) => (
                             <tr key={driver.uid} className="hover:bg-white/5 transition-colors">
                                <td className="py-5 pl-10">
                                   <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-lg overflow-hidden border border-white/10">
                                         <img src={driver.photoUrl || 'https://picsum.photos/seed/dr/40'} className="h-full w-full object-cover" />
                                      </div>
                                      <span className="font-black text-white uppercase italic text-xs">{driver.fullName}</span>
                                   </div>
                                </td>
                                <td className="py-5 font-bold text-slate-500 text-xs">{driver.licenseNumber}</td>
                                <td className="py-5 font-black text-primary text-lg italic">₹{driver.weeklyEarnings.toFixed(0)}</td>
                                <td className="py-5 pr-10 text-right">
                                   <Button 
                                     onClick={() => handleProcessPayout(driver)}
                                     className="bg-green-500 hover:bg-green-600 rounded-xl font-black uppercase italic text-[10px] h-9"
                                   >
                                      Push Payout
                                   </Button>
                                </td>
                             </tr>
                           ))}
                           {drivers.filter(d => (d.weeklyEarnings || 0) > 0).length === 0 && (
                             <tr>
                                <td colSpan={4} className="py-20 text-center text-slate-600 font-black uppercase italic text-xs tracking-widest">
                                   All driver settlements cleared.
                                </td>
                             </tr>
                           )}
                        </tbody>
                      </table>
                   </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Regional Workforce
               </h3>
               <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                        <th className="py-6 pl-10">Identity</th>
                        <th className="py-6">Vehicle</th>
                        <th className="py-6">Status</th>
                        <th className="py-6 pr-10 text-right">Lifetime Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {drivers.map((driver: any) => (
                        <tr key={driver.uid} className="hover:bg-white/5 transition-colors">
                          <td className="py-6 pl-10">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl overflow-hidden border border-white/5">
                                   <img src={driver.photoUrl || 'https://picsum.photos/seed/dr/40'} className="h-full w-full object-cover" />
                                </div>
                                <div>
                                   <p className="font-black text-white uppercase italic text-sm">{driver.fullName}</p>
                                   <p className="text-[8px] font-black text-slate-500 uppercase">{driver.licenseNumber}</p>
                                </div>
                             </div>
                          </td>
                          <td className="py-6">
                             <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400">{driver.vehicleNumber}</p>
                                <Badge className="bg-white/5 text-slate-500 text-[7px] border-none uppercase">{driver.vehicleType}</Badge>
                             </div>
                          </td>
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
        </div>
      </main>
    </div>
  );
}
