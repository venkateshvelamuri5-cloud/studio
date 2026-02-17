"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChevronRight,
  MapPin
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { generateShuttleRoutes } from '@/ai/flows/admin-generate-shuttle-routes';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem'
};

const mapOptions = {
  styles: [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
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
    updateDoc(doc(db, 'routes', routeId), updates);
    toast({ title: "Pricing Updated", description: "Fare protocols synchronized." });
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    if (!db) return;
    updateDoc(doc(db, 'routes', suggestionId), { status: 'active', isActive: true });
    toast({ title: "Proposal Approved", description: "Route deployed to regional mission log." });
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    if (!db) return;
    deleteDoc(doc(db, 'routes', suggestionId));
    toast({ title: "Proposal Rejected", description: "Route removed from suggestion log." });
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!db) return;
    updateDoc(doc(db, 'alerts', alertId), { status: 'resolved', resolvedAt: new Date().toISOString() });
    toast({ title: "Incident Resolved", description: "Safety status restored." });
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
      toast({ title: "AI Sync Complete", description: "Optimized routes deployed." });
    } catch {
      toast({ variant: "destructive", title: "AI Sync Error" });
    } finally {
      setIsOptimizing(false);
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-[#020617] font-body text-slate-200">
      <aside className="w-64 bg-slate-950 flex flex-col shrink-0 shadow-2xl z-20 border-r border-white/5">
        <div className="p-6 h-20 flex items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Bus className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-black font-headline italic tracking-tighter uppercase leading-none text-glow">AAGO OPS</span>
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
              className={`w-full justify-start rounded-xl font-bold h-11 px-4 transition-all ${activeTab === item.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <item.icon className={`mr-3 h-4 w-4 ${activeTab === item.id ? 'text-primary' : ''}`} /> {item.label}
              {item.badge ? <Badge className="ml-auto bg-primary text-[8px] h-4 min-w-4 p-0 flex items-center justify-center font-black">{item.badge}</Badge> : null}
            </Button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" /> Exit Terminal
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-slate-950 border-b border-white/5 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black font-headline text-white italic uppercase tracking-tight leading-none">{activeTab}</h2>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">Operational Environment: {profile?.city}</p>
          </div>
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5">Hub Node v4.0</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Fleet', value: onTripDrivers.length, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
                { label: 'Platform Rev', value: `₹${totalCommission.toFixed(0)}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Fleet Health', value: `${fleetHealth}%`, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                { label: 'Scholar Base', value: riders.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
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
          )}

          {activeTab === 'fleet' && (
            <div className="h-[calc(100vh-14rem)] relative border border-white/5 rounded-[1.5rem] overflow-hidden shadow-2xl">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={{ lat: profile?.currentLat || 17.6868, lng: profile?.currentLng || 83.2185 }}
                  zoom={13}
                  options={mapOptions}
                >
                  {drivers.filter(d => d.currentLat).map((driver: any) => (
                    <Marker
                      key={driver.uid}
                      position={{ lat: driver.currentLat, lng: driver.currentLng }}
                      onClick={() => setSelectedDriver(driver)}
                      icon={{
                        url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
                        scaledSize: new window.google.maps.Size(32, 32)
                      }}
                    />
                  ))}

                  {selectedDriver && (
                    <InfoWindow
                      position={{ lat: selectedDriver.currentLat, lng: selectedDriver.currentLng }}
                      onCloseClick={() => setSelectedDriver(null)}
                    >
                      <div className="p-4 bg-slate-900 border border-white/10 rounded-xl shadow-2xl min-w-[220px]">
                        <h4 className="font-black text-white uppercase italic text-sm">{selectedDriver.fullName}</h4>
                        <Badge variant="outline" className="text-[8px] uppercase mt-1 border-primary/20 text-primary">{selectedDriver.vehicleType}</Badge>
                        <hr className="my-3 border-white/5" />
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Status: <span className="text-primary">{selectedDriver.status}</span></p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Contact: {selectedDriver.phoneNumber}</p>
                        </div>
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

          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <MessageSquareShare className="h-5 w-5 text-primary" /> Workforce Proposals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions.length === 0 ? (
                  <Card className="col-span-full p-12 text-center bg-slate-900/30 border-dashed border-white/5 rounded-[1.5rem]">
                    <p className="text-slate-500 font-bold italic uppercase tracking-widest text-xs">No pending proposals in regional log.</p>
                  </Card>
                ) : (
                  suggestions.map((route: any) => (
                    <Card key={route.id} className="bg-slate-900/50 border-white/5 rounded-[1.5rem] overflow-hidden group hover:border-primary/20 transition-all">
                      <div className="p-6 border-b border-white/5 flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-white uppercase italic text-lg leading-none">{route.routeName}</h4>
                          <p className="text-[9px] font-black text-slate-500 mt-2 uppercase tracking-widest">{route.city} Node</p>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">Pending</Badge>
                      </div>
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-3">
                           <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Proposed Network Nodes</Label>
                           <div className="flex flex-wrap gap-1.5">
                              {route.stops?.map((stop: string, i: number) => (
                                <Badge key={i} variant="secondary" className="bg-white/5 text-slate-400 text-[8px] font-bold border-none">{stop}</Badge>
                              ))}
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
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
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" /> Incident Command
                </h3>
                <Badge className="bg-red-500 text-white font-black animate-pulse px-4 py-1.5 rounded-lg text-[10px] tracking-widest">{activeAlerts.length} Active Alerts</Badge>
              </div>
              <div className="space-y-4">
                {activeAlerts.length === 0 ? (
                  <Card className="p-16 text-center bg-green-500/5 border-dashed border-green-500/20 rounded-[1.5rem]">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-4" />
                    <p className="text-green-500 font-black uppercase italic tracking-widest text-xs">All regional hub nodes secured.</p>
                  </Card>
                ) : (
                  activeAlerts.map((alert: any) => (
                    <Card key={alert.id} className="bg-slate-900/50 border-white/5 rounded-[1.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-red-500">
                      <div className="flex items-center gap-6">
                        <div className="bg-red-500/10 p-4 rounded-xl">
                          <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-black text-red-500 uppercase italic text-lg leading-none">SOS: {alert.userName || 'Unknown Scholar'}</h4>
                          <div className="flex items-center gap-4 mt-3">
                             <Badge variant="outline" className="text-[9px] font-black border-red-500/20 text-red-400 uppercase">{alert.city || 'Vizag'}</Badge>
                             <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                               <Clock className="h-3 w-3" /> {new Date(alert.createdAt).toLocaleTimeString()}
                             </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl font-black uppercase italic h-11 px-6 border-white/10 hover:bg-white/5">
                          <Phone className="h-4 w-4 mr-2" /> Voice Protocol
                        </Button>
                        <Button onClick={() => handleResolveAlert(alert.id)} className="bg-primary hover:bg-primary/90 rounded-xl font-black uppercase italic h-11 px-6 shadow-lg shadow-primary/20">
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
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Workforce Terminal
               </h3>
               <Card className="bg-slate-900/50 border-white/5 rounded-[1.5rem] overflow-hidden">
                 <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                        <th className="py-5 pl-8">Operator Name</th>
                        <th className="py-5">Vehicle ID</th>
                        <th className="py-5">Class</th>
                        <th className="py-5">Shift Status</th>
                        <th className="py-5 pr-8 text-right">Net Missions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {drivers.map((driver: any) => (
                        <tr key={driver.uid} className="hover:bg-white/5 transition-colors group">
                          <td className="py-5 pl-8 font-black text-white uppercase italic text-sm">{driver.fullName}</td>
                          <td className="py-5 font-bold text-xs text-slate-400">{driver.vehicleNumber || '---'}</td>
                          <td className="py-5">
                            <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary">{driver.vehicleType}</Badge>
                          </td>
                          <td className="py-5">
                             <Badge className={`${driver.status === 'on-trip' ? 'bg-green-500' : driver.status === 'available' ? 'bg-blue-500' : 'bg-slate-700'} text-[8px] font-black uppercase border-none`}>
                               {driver.status}
                             </Badge>
                          </td>
                          <td className="py-5 pr-8 text-right font-black text-white text-sm">{driver.totalTrips || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                 </div>
               </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Mission Configuration
                </h3>
                <Button onClick={handleOptimize} disabled={isOptimizing} className="bg-primary hover:bg-primary/90 rounded-xl font-black italic uppercase h-11 px-8 shadow-lg shadow-primary/20">
                  {isOptimizing ? <Loader2 className="animate-spin" /> : "Initiate AI Sync"}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900/50 border-white/5 rounded-[1.5rem] overflow-hidden group hover:border-primary/20 transition-all">
                    <div className="p-6 border-b border-white/5 bg-slate-950/30">
                      <h4 className="font-black text-white uppercase italic text-lg leading-none">{route.routeName}</h4>
                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase mt-3 tracking-widest px-3">Active Terminal</Badge>
                    </div>
                    <CardContent className="space-y-6 p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Base Protocol (₹)</Label>
                          <Input 
                            type="number" 
                            defaultValue={route.baseFare} 
                            onBlur={(e) => handleUpdateRoutePricing(route.id, { baseFare: Number(e.target.value) })}
                            className="h-11 rounded-xl bg-slate-950 border-white/5 font-black text-white text-sm focus:border-primary/50 transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Surge Modifier</Label>
                          <Input 
                            type="number" 
                            defaultValue={route.surgeFare} 
                            onBlur={(e) => handleUpdateRoutePricing(route.id, { surgeFare: Number(e.target.value) })}
                            className="h-11 rounded-xl bg-slate-950 border-white/5 font-black text-primary text-sm focus:border-primary/50 transition-all" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Fleet Multipliers</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'busMultiplier', label: 'Bus' },
                            { id: 'miniBusMultiplier', label: 'Mini' },
                            { id: 'vanMultiplier', label: 'Van' }
                          ].map((cls) => (
                            <div key={cls.id} className="space-y-1.5">
                              <span className="text-[8px] font-black text-slate-500 uppercase ml-1">{cls.label}</span>
                              <Input 
                                type="number" step="0.1" 
                                defaultValue={route[cls.id] || 1.0} 
                                onBlur={(e) => handleUpdateRoutePricing(route.id, { [cls.id]: Number(e.target.value) })}
                                className="h-10 rounded-xl bg-slate-950 border-white/5 text-xs font-black text-white" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex flex-wrap gap-1.5">
                        {route.stops?.map((stop: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-white/5 text-slate-500 text-[8px] font-bold uppercase border-none">{stop}</Badge>
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
                <Card className="bg-primary text-white border-none shadow-[0_20px_40px_rgba(59,130,246,0.2)] rounded-[2rem] p-10 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Hub Commission (10%)</p>
                    <h3 className="text-5xl font-black italic font-headline mt-3 tracking-tighter">₹{totalCommission.toFixed(2)}</h3>
                    <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/10 rounded-full w-fit">
                      <TrendingUp className="h-3 w-3" />
                      <p className="text-[9px] font-black uppercase tracking-widest">Platform Yield Active</p>
                    </div>
                  </div>
                  <TrendingUp className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                </Card>
                <Card className="bg-slate-900 border-white/5 text-white shadow-xl rounded-[2rem] p-10 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Fleet Net Pay (90%)</p>
                    <h3 className="text-5xl font-black italic font-headline mt-3 tracking-tighter">₹{totalDriverPayouts.toFixed(2)}</h3>
                    <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/5 rounded-full w-fit">
                      <Wallet className="h-3 w-3 text-primary" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Regional Workforce Share</p>
                    </div>
                  </div>
                  <Wallet className="absolute -right-8 -bottom-8 h-48 w-48 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                </Card>
              </div>

              <Card className="bg-slate-900/50 border-white/5 rounded-[1.5rem] overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h4 className="font-black text-white uppercase italic text-lg leading-none">Workforce Payout Terminal</h4>
                  <Badge variant="outline" className="border-white/10 text-slate-500 text-[9px] uppercase tracking-widest">Auto-Settlement v1.0</Badge>
                </div>
                 <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                        <th className="py-5 pl-8">Operator Name</th>
                        <th className="py-5">Vehicle Asset</th>
                        <th className="py-5">Missions</th>
                        <th className="py-5 pr-8 text-right">Net Wallet (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {drivers?.map((driver: any) => (
                        <tr key={driver.uid} className="hover:bg-white/5 transition-colors group">
                          <td className="py-5 pl-8 font-black text-white uppercase italic text-sm">{driver.fullName}</td>
                          <td className="py-5 font-bold text-xs text-slate-400 uppercase">{driver.vehicleType}</td>
                          <td className="py-5 font-bold text-xs text-slate-400">{driver.totalTrips || 0}</td>
                          <td className="py-5 pr-8 text-right font-black text-primary text-lg">₹{(driver.totalEarnings || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                 </div>
              </Card>
            </div>
          )}

          {activeTab === 'scholars' && (
            <div className="space-y-6">
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Scholar Database
               </h3>
               <Card className="bg-slate-900/50 border-white/5 rounded-[1.5rem] overflow-hidden">
                 <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                        <th className="py-5 pl-8">Student Name</th>
                        <th className="py-5">University Hub</th>
                        <th className="py-5">Scholar ID</th>
                        <th className="py-5">Regional Hub</th>
                        <th className="py-5 pr-8 text-right">Credit Wallet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {riders.map((rider: any) => (
                        <tr key={rider.uid} className="hover:bg-white/5 transition-colors group">
                          <td className="py-5 pl-8 font-black text-white uppercase italic text-sm">{rider.fullName}</td>
                          <td className="py-5 font-bold text-xs text-slate-400 uppercase">{rider.collegeName || '---'}</td>
                          <td className="py-5 font-bold text-xs text-slate-400 uppercase">{rider.studentId || '---'}</td>
                          <td className="py-5 font-bold text-xs text-slate-400 uppercase">{rider.city}</td>
                          <td className="py-5 pr-8 text-right font-black text-primary text-sm">₹{(rider.credits || 0).toFixed(0)}</td>
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