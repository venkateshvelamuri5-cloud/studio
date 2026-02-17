
"use client";

import { useState, useMemo } from 'react';
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
  Map as MapIcon,
  MessageSquareShare,
  IndianRupee,
  Wallet,
  Users,
  AlertTriangle,
  TrendingUp,
  Settings2,
  CheckCircle2,
  XCircle,
  Phone,
  Clock,
  MapPin
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { generateShuttleRoutes } from '@/ai/flows/admin-generate-shuttle-routes';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, addDoc, deleteDoc, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '2rem'
};

const mapOptions = {
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  ],
  disableDefaultUI: true,
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'drivers' | 'scholars' | 'suggestions' | 'finance' | 'safety'>('dashboard');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes')) : null, [db]));
  const { data: allTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips')) : null, [db]));
  const { data: allAlerts } = useCollection(useMemo(() => db ? query(collection(db, 'alerts')) : null, [db]));

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const riders = useMemo(() => allUsers?.filter(u => u.role === 'rider') || [], [allUsers]);
  const activeTrips = useMemo(() => allTrips?.filter(t => t.status === 'active') || [], [allTrips]);
  const activeAlerts = useMemo(() => allAlerts?.filter(a => a.status === 'active' || a.status === 'pending') || [], [allAlerts]);
  
  const savedRoutes = useMemo(() => allRoutes?.filter(r => r.status === 'active') || [], [allRoutes]);
  const suggestions = useMemo(() => allRoutes?.filter(r => r.status === 'suggested') || [], [allRoutes]);

  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];
  const fleetHealth = drivers.length > 0 ? Math.round((onTripDrivers.length / drivers.length) * 100) : 0;
  
  const totalCommission = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.commissionAmount || 0), 0) || 0, [allTrips]);
  const totalDriverPayouts = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.payoutAmount || 0), 0) || 0, [allTrips]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleUpdateRoutePricing = async (routeId: string, updates: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', routeId), updates);
      toast({ title: "Pricing Engine Updated", description: "Regional fares have been synchronized." });
    } catch {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', suggestionId), { status: 'active', isActive: true });
      toast({ title: "Proposal Approved", description: "Route deployed to regional mission log." });
    } catch {
      toast({ variant: "destructive", title: "Approval Protocol Failed" });
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', suggestionId));
      toast({ title: "Proposal Rejected", description: "Route removed from suggest log." });
    } catch {
      toast({ variant: "destructive", title: "Rejection Protocol Failed" });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'alerts', alertId), { status: 'resolved', resolvedAt: new Date().toISOString() });
      toast({ title: "Incident Resolved", description: "Safety status restored." });
    } catch {
      toast({ variant: "destructive", title: "Resolution Failed" });
    }
  };

  const [isOptimizing, setIsOptimizing] = useState(false);
  const handleOptimize = async () => {
    if (!db) return;
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: "High peak morning load in Vizag corridor.",
        historicalTrafficData: "Congestion at primary intersections between 8-10 AM.",
        preferredServiceHours: "06:00 to 22:00",
        numberOfShuttlesAvailable: drivers.length || 5
      });
      for (const route of result.optimizedRoutes) {
        addDoc(collection(db, 'routes'), {
          ...route,
          city: profile?.city || 'Vizag',
          baseFare: 50,
          surgeFare: 0,
          busMultiplier: 1.0,
          miniBusMultiplier: 1.2,
          vanMultiplier: 1.5,
          isActive: true,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "AI Sync Complete", description: "Optimized routes deployed to regional fleet." });
    } catch {
      toast({ variant: "destructive", title: "AI Sync Error" });
    } finally {
      setIsOptimizing(false);
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-primary"><Loader2 className="animate-spin h-10 w-10 text-white" /></div>;

  return (
    <div className="flex h-screen bg-[#F8F9FC] font-body text-slate-900">
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-6 h-20 flex items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-accent" />
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Terminal', icon: LayoutDashboard },
            { id: 'fleet', label: 'Fleet Radar', icon: Navigation },
            { id: 'routes', label: 'Pricing Hub', icon: Settings2 },
            { id: 'suggestions', label: 'Proposals', icon: MessageSquareShare, badge: suggestions?.length },
            { id: 'drivers', label: 'Workforce', icon: Truck },
            { id: 'scholars', label: 'Scholars', icon: Users },
            { id: 'finance', label: 'Revenue', icon: Wallet },
            { id: 'safety', label: 'Incidents', icon: AlertTriangle, badge: activeAlerts?.length },
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start text-white rounded-xl font-bold h-12 ${activeTab === item.id ? 'bg-white/10' : 'hover:bg-white/5 opacity-70'}`}
            >
              <item.icon className="mr-3 h-4 w-4" /> {item.label}
              {item.badge ? <Badge className="ml-auto bg-accent text-[8px] h-4 min-w-4 p-0 flex items-center justify-center">{item.badge}</Badge> : null}
            </Button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/10">
            <Button variant="ghost" className="w-full justify-start text-red-300 hover:bg-red-500/10" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" /> Exit terminal
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">{activeTab}</h2>
          <Badge className="bg-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">{profile?.city} Regional Hub</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Fleet', value: onTripDrivers.length, icon: Activity, color: 'text-green-600' },
                { label: 'Platform Rev', value: `₹${totalCommission.toFixed(0)}`, icon: TrendingUp, color: 'text-accent' },
                { label: 'Fleet Health', value: `${fleetHealth}%`, icon: Zap, color: 'text-primary' },
                { label: 'Scholar Base', value: riders.length, icon: Users, color: 'text-blue-600' },
              ].map((metric, i) => (
                <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-secondary rounded-2xl group-hover:rotate-12 transition-transform">
                        <metric.icon className={`h-6 w-6 ${metric.color}`} />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                    <h3 className="text-3xl font-black text-primary font-headline italic">{metric.value}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="h-[calc(100vh-12rem)] relative">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={{ lat: profile?.currentLat || 17.6868, lng: profile?.currentLng || 83.2185 }}
                  zoom={12}
                  options={mapOptions}
                >
                  {drivers.filter(d => d.currentLat).map((driver: any) => (
                    <Marker
                      key={driver.uid}
                      position={{ lat: driver.currentLat, lng: driver.currentLng }}
                      onClick={() => setSelectedDriver(driver)}
                      icon={{
                        url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                    />
                  ))}

                  {selectedDriver && (
                    <InfoWindow
                      position={{ lat: selectedDriver.currentLat, lng: selectedDriver.currentLng }}
                      onCloseClick={() => setSelectedDriver(null)}
                    >
                      <div className="p-4 bg-white rounded-xl shadow-2xl min-w-[200px]">
                        <h4 className="font-black text-primary uppercase italic text-sm">{selectedDriver.fullName}</h4>
                        <Badge variant="outline" className="text-[8px] uppercase mt-1">{selectedDriver.vehicleType}</Badge>
                        <hr className="my-2" />
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Status: <span className="text-primary">{selectedDriver.status}</span></p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Contact: {selectedDriver.phoneNumber}</p>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-900 rounded-[2rem]">
                  <Loader2 className="animate-spin text-white h-12 w-12" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black italic uppercase text-primary">Workforce Proposals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions.length === 0 ? (
                  <p className="text-slate-500 font-bold italic">No pending route proposals from workforce.</p>
                ) : (
                  suggestions.map((route: any) => (
                    <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                      <CardHeader className="bg-accent/5">
                        <h4 className="font-black text-primary uppercase italic text-lg leading-none">{route.routeName}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1 italic">{route.city} Hub Proposal</p>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-1">
                           <Label className="text-[9px] font-black uppercase text-muted-foreground">Proposed Path</Label>
                           <div className="flex flex-wrap gap-1">
                              {route.stops?.map((stop: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[8px] font-bold">{stop}</Badge>
                              ))}
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Button onClick={() => handleApproveSuggestion(route.id)} className="bg-green-500 hover:bg-green-600 rounded-xl font-black uppercase italic text-xs h-10">
                            Approve
                          </Button>
                          <Button onClick={() => handleRejectSuggestion(route.id)} variant="destructive" className="rounded-xl font-black uppercase italic text-xs h-10">
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic uppercase text-primary">Incident Command Center</h3>
                <Badge className="bg-red-500 text-white font-black animate-pulse px-4 py-2">{activeAlerts.length} Active Alerts</Badge>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {activeAlerts.length === 0 ? (
                  <Card className="p-12 text-center bg-green-500/5 border-dashed border-green-500/20 rounded-[2.5rem]">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-600 font-black uppercase italic">All hub nodes secured. No active incidents.</p>
                  </Card>
                ) : (
                  activeAlerts.map((alert: any) => (
                    <Card key={alert.id} className="border-none shadow-xl bg-white rounded-[2rem] p-6 flex flex-col md:row items-center justify-between gap-6 border-l-8 border-red-500">
                      <div className="flex items-center gap-6">
                        <div className="bg-red-500/10 p-4 rounded-2xl">
                          <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-black text-red-500 uppercase italic text-lg leading-none">SOS: {alert.userName || 'Scholar'}</h4>
                          <div className="flex items-center gap-3 mt-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase">{alert.city || 'Vizag'}</Badge>
                             <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                               <Clock className="h-3 w-3" /> {new Date(alert.createdAt).toLocaleTimeString()}
                             </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl font-black uppercase italic h-12 px-6">
                          <Phone className="h-4 w-4 mr-2" /> Call User
                        </Button>
                        <Button onClick={() => handleResolveAlert(alert.id)} className="bg-primary hover:bg-primary/90 rounded-xl font-black uppercase italic h-12 px-6">
                          Resolve Incident
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
               <h3 className="text-xl font-black italic uppercase text-primary">Fleet Workforce</h3>
               <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-secondary/20 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          <th className="py-6 pl-8">Operator Name</th>
                          <th className="py-6">Asset ID</th>
                          <th className="py-6">Class</th>
                          <th className="py-6">Status</th>
                          <th className="py-6 pr-8 text-right">Net Missions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {drivers.map((driver: any) => (
                          <tr key={driver.uid} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{driver.fullName}</td>
                            <td className="py-6 font-bold text-xs uppercase">{driver.vehicleNumber || 'N/A'}</td>
                            <td className="py-6 font-bold text-xs uppercase">{driver.vehicleType}</td>
                            <td className="py-6">
                               <Badge className={`${driver.status === 'on-trip' ? 'bg-green-500' : driver.status === 'available' ? 'bg-blue-500' : 'bg-slate-400'} text-[8px] font-black uppercase`}>
                                 {driver.status}
                               </Badge>
                            </td>
                            <td className="py-6 pr-8 text-right font-black text-slate-900 text-sm">{driver.totalTrips || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                   </div>
                </CardContent>
               </Card>
            </div>
          )}

          {activeTab === 'scholars' && (
            <div className="space-y-6">
               <h3 className="text-xl font-black italic uppercase text-primary">Scholar Database</h3>
               <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-secondary/20 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          <th className="py-6 pl-8">Student Name</th>
                          <th className="py-6">University Node</th>
                          <th className="py-6">Scholar ID</th>
                          <th className="py-6">Hub City</th>
                          <th className="py-6 pr-8 text-right">Wallet Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {riders.map((rider: any) => (
                          <tr key={rider.uid} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{rider.fullName}</td>
                            <td className="py-6 font-bold text-xs uppercase text-slate-400">{rider.collegeName || 'N/A'}</td>
                            <td className="py-6 font-bold text-xs uppercase text-slate-400">{rider.studentId || 'N/A'}</td>
                            <td className="py-6 font-bold text-xs uppercase text-slate-400">{rider.city}</td>
                            <td className="py-6 pr-8 text-right font-black text-accent text-sm">₹{(rider.credits || 0).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                   </div>
                </CardContent>
               </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic uppercase text-primary">Mission & Pricing Hub</h3>
                <Button onClick={handleOptimize} disabled={isOptimizing} className="bg-accent rounded-xl font-black italic uppercase h-12 px-8">
                  {isOptimizing ? <Loader2 className="animate-spin" /> : "Run AI Optimization"}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRoutes.map((route: any) => (
                  <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="pb-4 bg-secondary/5">
                      <h4 className="font-black text-primary uppercase italic text-lg leading-none">{route.routeName}</h4>
                      <Badge variant="outline" className="text-[8px] font-black w-fit mt-2">Active Path</Badge>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground">Base Fare</Label>
                          <Input 
                            type="number" 
                            defaultValue={route.baseFare} 
                            onBlur={(e) => handleUpdateRoutePricing(route.id, { baseFare: Number(e.target.value) })}
                            className="h-12 rounded-xl bg-secondary/20 border-none font-bold text-sm" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground">Surge Modifier</Label>
                          <Input 
                            type="number" 
                            defaultValue={route.surgeFare} 
                            onBlur={(e) => handleUpdateRoutePricing(route.id, { surgeFare: Number(e.target.value) })}
                            className="h-12 rounded-xl bg-accent/10 border-none font-bold text-sm text-accent" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-4 border-t">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Vehicle Class Multipliers</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-400">Bus</span>
                            <Input 
                              type="number" step="0.1" 
                              defaultValue={route.busMultiplier || 1.0} 
                              onBlur={(e) => handleUpdateRoutePricing(route.id, { busMultiplier: Number(e.target.value) })}
                              className="h-10 rounded-xl bg-secondary/10 border-none text-xs font-bold" 
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-400">Mini-Bus</span>
                            <Input 
                              type="number" step="0.1" 
                              defaultValue={route.miniBusMultiplier || 1.2} 
                              onBlur={(e) => handleUpdateRoutePricing(route.id, { miniBusMultiplier: Number(e.target.value) })}
                              className="h-10 rounded-xl bg-secondary/10 border-none text-xs font-bold" 
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-400">Van</span>
                            <Input 
                              type="number" step="0.1" 
                              defaultValue={route.vanMultiplier || 1.5} 
                              onBlur={(e) => handleUpdateRoutePricing(route.id, { vanMultiplier: Number(e.target.value) })}
                              className="h-10 rounded-xl bg-secondary/10 border-none text-xs font-bold" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t flex flex-wrap gap-1">
                        {route.stops?.map((stop: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[8px] font-bold uppercase">{stop}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Hub Commission (10%)</p>
                    <h3 className="text-6xl font-black italic font-headline mt-2 tracking-tighter">₹{totalCommission.toFixed(2)}</h3>
                    <p className="text-[10px] font-bold mt-6 opacity-80 uppercase tracking-widest">Platform operating revenue</p>
                  </div>
                  <TrendingUp className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
                <Card className="bg-accent text-white border-none shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Workforce Payouts (90%)</p>
                    <h3 className="text-6xl font-black italic font-headline mt-2 tracking-tighter">₹{totalDriverPayouts.toFixed(2)}</h3>
                    <p className="text-[10px] font-bold mt-6 opacity-80 uppercase tracking-widest">Total regional fleet earnings</p>
                  </div>
                  <Wallet className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
              </div>

              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="bg-secondary/5 border-b p-8">
                  <CardTitle className="font-black font-headline text-xl italic uppercase text-primary leading-none">Workforce Payout Terminal</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-secondary/20 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          <th className="py-6 pl-8">Operator Name</th>
                          <th className="py-6">Vehicle Asset</th>
                          <th className="py-6">Total Missions</th>
                          <th className="py-6 pr-8 text-right">Net Wallet (90%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {drivers?.map((driver: any) => (
                          <tr key={driver.uid} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{driver.fullName}</td>
                            <td className="py-6 font-bold text-xs uppercase">{driver.vehicleType}</td>
                            <td className="py-6 font-bold text-xs">{driver.totalTrips || 0}</td>
                            <td className="py-6 pr-8 text-right font-black text-accent text-lg">₹{(driver.totalEarnings || 0).toFixed(2)}</td>
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
