"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bus, 
  Power, 
  Loader2, 
  LogOut, 
  CheckCircle2,
  Phone,
  History,
  User as UserIcon,
  ShieldCheck,
  MapPinned,
  Activity,
  IndianRupee,
  Wallet,
  TrendingUp,
  Car,
  AlertTriangle,
  Target,
  Zap,
  Star,
  Clock,
  Settings,
  ShieldQuestion,
  Leaf
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, arrayUnion, getDocs, limit, increment, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '4rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true };
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 }; 

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'trips' | 'history' | 'profile' | 'fleet'>('trips');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [rating, setRating] = useState(0);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(null);
  
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const today = new Date().toISOString().split('T')[0];
  const historyQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'));
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(historyQuery);

  const stats = useMemo(() => {
    if (!pastTrips) return { earnings: 0, count: 0, scholars: 0, carbon: 0 };
    const todayTrips = pastTrips.filter(t => t.endTime && t.endTime.startsWith(today));
    const earnings = todayTrips.reduce((acc, t) => acc + (t.driverShare || 0), 0);
    const totalScholars = pastTrips.reduce((acc, t) => acc + (t.finalRiderCount || t.riderCount || 0), 0);
    return { 
      earnings, 
      count: todayTrips.length,
      scholars: totalScholars,
      carbon: (totalScholars * 0.4).toFixed(1)
    };
  }, [pastTrips, today]);

  useEffect(() => {
    if (!profile || profile.status === 'offline' || !userRef) return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateDoc(userRef, { 
            currentLat: pos.coords.latitude, 
            currentLng: pos.coords.longitude,
            lastSeen: new Date().toISOString()
          });
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [profile?.status, userRef]);

  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  const unratedTrip = useMemo(() => pastTrips?.find(t => !t.driverRating), [pastTrips]);

  useEffect(() => {
    if (unratedTrip) setIsRatingOpen(true);
  }, [unratedTrip]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      } else {
        setActiveTrip(null);
      }
    });
  }, [db, user?.uid]);

  const routeStops = useMemo(() => {
    const route = allRoutes?.find((r: any) => r.routeName === activeTrip?.routeName);
    return route?.stops || [];
  }, [activeTrip, allRoutes]);

  const triggerSOS = async () => {
    if (!db || !user || !profile) return;
    addDoc(collection(db, 'alerts'), { 
      type: 'OPERATOR_SOS', 
      userId: user.uid, 
      userName: profile.fullName, 
      city: profile.city, 
      timestamp: new Date().toISOString() 
    });
    toast({ variant: "destructive", title: "Emergency Signal Sent", description: "Operations hub has received your distress call." });
  };

  const handleToggleStatus = async () => {
    if (!userRef || !profile) return;
    const isGoingOnline = profile.status === 'offline';
    const newStatus = isGoingOnline ? 'available' : 'offline';
    if (isGoingOnline) setShiftStartTime(new Date().toISOString());
    else setShiftStartTime(null);
    
    await updateDoc(userRef, { status: newStatus });
    toast({ title: isGoingOnline ? "Mission Clock Started" : "Mission Clock Ended", description: isGoingOnline ? "You are now live on the regional grid." : "Shift telemetry saved." });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const tripData = {
        driverId: user.uid, 
        driverName: profile.fullName, 
        routeName: route.routeName, 
        farePerRider: route.baseFare, 
        status: 'active', 
        riderCount: 0, 
        maxCapacity: profile.vehicleType === 'Van' ? 12 : 45,
        passengers: [], 
        verifiedPassengers: [], 
        startTime: new Date().toISOString()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Corridor Active", description: `Mission engaged on: ${route.routeName}` });
    } catch (e) { 
      toast({ variant: "destructive", title: "Activation Failed" }); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim())));
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Scholar ID not recognized on grid." });
      } else {
        const rider = snap.docs[0].data();
        const riderId = snap.docs[0].id;
        await updateDoc(doc(db, 'trips', activeTrip.id), { 
          verifiedPassengers: arrayUnion(riderId),
          riderCount: increment(1)
        });
        await updateDoc(doc(db, 'users', riderId), { activeOtp: null });
        toast({ title: "Scholar Boarded", description: `Identity ${rider.fullName} synced.` });
        setVerificationOtp("");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !profile || !userRef) return;
    setIsUpdating(true);
    try {
      const riderCount = activeTrip.verifiedPassengers?.length || 0;
      const totalYield = riderCount * activeTrip.farePerRider;
      const driverPayout = totalYield * 0.9; 
      
      await updateDoc(doc(db, 'trips', activeTrip.id), { 
        status: 'completed', 
        endTime: new Date().toISOString(), 
        totalYield: totalYield, 
        driverShare: driverPayout, 
        finalRiderCount: riderCount 
      });
      await updateDoc(userRef, { 
        status: 'available', 
        activeTripId: null, 
        totalEarnings: increment(driverPayout) 
      });
      toast({ title: "Mission Completed", description: `Earnings payout of ₹${driverPayout.toFixed(0)} finalized.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error ending mission" });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitRating = async () => {
    if (!db || !unratedTrip || !rating) return;
    await updateDoc(doc(db, 'trips', unratedTrip.id), { driverRating: rating });
    setIsRatingOpen(false);
    setRating(0);
    toast({ title: "Mission Rated", description: "Captain feedback recorded." });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-40 selection:bg-primary">
      <header className="p-10 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-3xl sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[2rem] overflow-hidden border-[4px] border-primary/20 flex items-center justify-center bg-slate-900 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-8 w-8 text-slate-700" />}
          </div>
          <div>
            <h1 className="font-black text-2xl uppercase italic text-white leading-none tracking-tighter">{profile?.fullName}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-white/5 text-slate-500' : 'bg-green-500/10 text-green-400'} border-none text-[10px] font-black uppercase mt-2 tracking-widest px-4 py-1.5`}>
              {profile?.status} Terminal
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-5">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-500/10 rounded-[2rem] h-16 w-16 border border-white/5"><AlertTriangle className="h-8 w-8" /></Button>
           <Button onClick={handleToggleStatus} className={`rounded-[2rem] h-16 w-16 p-0 transition-all ${profile?.status === 'offline' ? 'bg-white/5 text-slate-700' : 'bg-primary text-slate-950 shadow-[0_0_40px_rgba(0,255,255,0.3)]'}`}>
             <Power className="h-8 w-8" />
           </Button>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-10 max-w-2xl mx-auto w-full">
        {activeTab === 'trips' && (!activeTrip ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Mission Stats */}
            <div className="grid grid-cols-2 gap-8">
              <Card className="bg-slate-900 border border-white/5 rounded-[4rem] p-10 space-y-6 shadow-2xl">
                 <p className="text-[11px] font-black uppercase text-primary tracking-[0.3em]">Shift Payouts</p>
                 <h2 className="text-6xl font-black italic uppercase leading-none tracking-tighter text-glow">₹{stats.earnings.toFixed(0)}</h2>
                 <Progress value={(stats.earnings / 3000) * 100} className="h-2 bg-white/5" />
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Target: ₹3,000</p>
              </Card>
              <Card className="bg-white/5 border border-white/5 rounded-[4rem] p-10 space-y-6 shadow-2xl">
                 <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">Completed Missions</p>
                 <h2 className="text-6xl font-black italic text-white leading-none tracking-tighter">{stats.count}</h2>
                 <p className="text-[9px] font-bold text-slate-500 uppercase italic tracking-widest">{profile?.city} Hub Sync</p>
              </Card>
            </div>

            {/* Eco impact */}
            <Card className="bg-green-500/10 border border-green-500/20 rounded-[4.5rem] p-12 flex items-center justify-between shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Leaf className="h-24 w-24 text-green-400" /></div>
               <div className="space-y-3 relative z-10">
                  <p className="text-[11px] font-black uppercase text-green-400 tracking-[0.4em]">Eco-Mission Stats</p>
                  <h3 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">{stats.carbon} kg</h3>
                  <p className="text-[9px] font-bold text-green-400/60 uppercase tracking-widest">Carbon Footprint Saved</p>
               </div>
               <div className="h-20 w-20 bg-green-500/20 rounded-[2rem] flex items-center justify-center text-green-400 border border-green-500/20 relative z-10">
                  <Leaf className="h-10 w-10" />
               </div>
            </Card>

            <h2 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter pl-4">Active Corridors</h2>
            <div className="space-y-6">
              {availableRoutes.length === 0 ? (
                <div className="p-24 text-center bg-white/5 rounded-[5rem] border border-dashed border-white/5 shadow-inner">
                  <MapPinned className="h-16 w-16 text-slate-800 mx-auto mb-6" />
                  <p className="text-sm font-black text-slate-700 italic uppercase tracking-widest">No routes mapped in {profile?.city}</p>
                </div>
              ) : (
                availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900 border border-white/5 rounded-[4rem] shadow-2xl hover:bg-white/5 transition-all group overflow-hidden">
                    <CardContent className="p-12 flex justify-between items-center">
                      <div className="space-y-3">
                        <h3 className="font-black text-4xl text-white uppercase italic leading-none tracking-tighter">{route.routeName}</h3>
                        <div className="flex gap-4">
                           <Badge className="bg-white/5 text-slate-400 border-none text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest">₹{route.baseFare} Fare</Badge>
                           <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest">{route.stops?.length || 0} Hubs</Badge>
                        </div>
                      </div>
                      <Button 
                        onClick={() => startTrip(route)} 
                        disabled={profile?.status === 'offline' || isUpdating} 
                        className="rounded-[2.5rem] h-20 px-12 bg-primary text-slate-950 font-black uppercase italic text-xl shadow-[0_0_40px_rgba(0,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
                      >
                        Engage
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-700">
            <div className="h-96 rounded-[5rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-slate-900 relative">
              {isLoaded && (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={routeStops[0] ? { lat: routeStops[0].lat, lng: routeStops[0].lng } : DEFAULT_CENTER} zoom={13} options={mapOptions}>
                  <Marker position={profile?.currentLat ? { lat: profile.currentLat, lng: profile.currentLng } : DEFAULT_CENTER} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(60, 60) }} />
                  <Polyline path={routeStops.map((s: any) => ({ lat: s.lat, lng: s.lng }))} options={{ strokeColor: "#00ffff", strokeOpacity: 0.8, strokeWeight: 8 }} />
                </GoogleMap>
              )}
            </div>
            
            <Card className="bg-slate-900 border border-white/5 rounded-[5rem] p-16 space-y-12 shadow-[0_64px_128px_-12px_rgba(0,0,0,0.9)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05),transparent_70%)] group-hover:scale-110 transition-transform duration-1000" />
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-3">
                  <h2 className="text-7xl font-black italic uppercase leading-none tracking-tighter text-glow">{activeTrip.routeName}</h2>
                  <p className="text-[12px] font-black uppercase text-slate-500 tracking-[0.5em] mt-2 pl-2">Mission Active Telemetry</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[11px] font-black uppercase px-8 py-3.5 rounded-full tracking-[0.2em]">{activeTrip.verifiedPassengers?.length || 0} Boarded</Badge>
              </div>

              <div className="bg-slate-950 p-12 rounded-[4rem] space-y-6 border border-white/5 shadow-inner relative z-10">
                <Label className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-500 ml-4">Scholar Verification Key</Label>
                <div className="flex gap-6">
                  <input 
                    value={verificationOtp} 
                    onChange={(e) => setVerificationOtp(e.target.value)} 
                    placeholder="000000" 
                    className="h-24 w-full text-center font-black tracking-[0.6em] text-5xl rounded-[2.5rem] bg-slate-900 border border-white/5 shadow-inner outline-none focus:ring-4 focus:ring-primary/20 text-primary placeholder:text-slate-800" 
                    maxLength={6} 
                  />
                  <Button 
                    onClick={verifyPassenger} 
                    disabled={isVerifying || !verificationOtp} 
                    className="h-24 w-24 rounded-[2.5rem] bg-primary text-slate-950 shadow-[0_0_40px_rgba(0,255,255,0.3)] p-0 hover:scale-105 active:scale-95 transition-all"
                  >
                    {isVerifying ? <Loader2 className="animate-spin h-10 w-10" /> : <CheckCircle2 className="h-14 w-14" />}
                  </Button>
                </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-32 bg-white text-slate-950 rounded-[4rem] font-black uppercase italic text-3xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all relative z-10">Finish Mission</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'history' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="flex justify-between items-center">
                <h3 className="text-6xl font-black italic uppercase text-white tracking-tighter text-glow">Mission Ledger</h3>
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Lifetime Payouts</p>
                   <p className="text-4xl font-black italic text-primary">₹{(profile?.totalEarnings || 0).toFixed(0)}</p>
                </div>
             </div>
             <div className="space-y-6">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-24 text-center bg-white/5 rounded-[5rem] border border-dashed border-white/5 shadow-inner">
                    <History className="h-16 w-16 text-slate-800 mx-auto mb-6" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-700 italic">No mission data on grid.</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white/5 border border-white/5 rounded-[4rem] p-12 flex justify-between items-center shadow-2xl hover:bg-white/10 transition-all">
                      <div className="space-y-3">
                          <h4 className="font-black text-3xl uppercase italic leading-none tracking-tighter">{trip.routeName}</h4>
                          <p className="text-[11px] font-bold text-slate-500 uppercase italic tracking-[0.2em]">{new Date(trip.endTime).toLocaleDateString()} • {trip.finalRiderCount || trip.riderCount} Boarded</p>
                      </div>
                      <div className="text-right">
                         <p className="text-4xl font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                         <Badge className="bg-white/5 text-slate-500 border-none text-[8px] font-black uppercase tracking-[0.4em] mt-2">90% Payout Share</Badge>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <h3 className="text-6xl font-black italic uppercase text-white tracking-tighter text-glow">Fleet Diagnostics</h3>
             <div className="grid grid-cols-1 gap-8">
                {[
                  { label: "Propulsion Grid", value: "Synchronized", icon: Bus, color: "text-green-400", progress: 98 },
                  { label: "Kinetic Dampeners", value: "Verified", icon: ShieldCheck, color: "text-primary", progress: 92 },
                  { label: "Bio-Sanitation", value: "Optimal", icon: CheckCircle2, color: "text-accent", progress: 100 },
                  { label: "Thermal Output", value: "Stable", icon: Activity, color: "text-orange-400", progress: 85 },
                ].map((item, i) => (
                  <Card key={i} className="bg-white/5 border border-white/5 rounded-[4rem] p-12 shadow-2xl space-y-6 hover:bg-white/10 transition-all">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                           <div className={`p-4 bg-slate-950 rounded-[1.5rem] border border-white/5 ${item.color}`}><item.icon className="h-8 w-8" /></div>
                           <p className="font-black text-white uppercase italic text-xl tracking-tighter">{item.label}</p>
                        </div>
                        <span className={`text-[12px] font-black uppercase tracking-[0.3em] ${item.color}`}>{item.value}</span>
                     </div>
                     <Progress value={item.progress} className="h-3 bg-slate-950" />
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-16 animate-in fade-in text-center pb-20">
            <div className="flex flex-col items-center gap-12 pt-16">
              <div className="h-60 w-60 rounded-[5rem] overflow-hidden border-[8px] border-primary/10 bg-slate-900 flex items-center justify-center shadow-[0_64px_128px_-12px_rgba(0,0,0,0.8)] relative group">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-20 w-20 text-slate-800" />}
              </div>
              <div className="space-y-4">
                <h2 className="text-8xl font-black italic uppercase text-white leading-[0.8] tracking-[calc(-0.05em)] text-glow">{profile?.fullName}</h2>
                <div className="flex items-center justify-center gap-4 mt-6">
                   <Badge className="bg-primary text-slate-950 border-none text-[10px] font-black uppercase px-8 py-3 rounded-full tracking-widest shadow-2xl">{profile?.vehicleType} Captain</Badge>
                   <Badge className="bg-white/10 text-slate-400 border-none text-[10px] font-black uppercase px-8 py-3 rounded-full tracking-widest shadow-inner">{profile?.city} Hub</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 text-left">
              {[
                { label: "Fleet Registration", value: profile?.vehicleNumber, icon: Car },
                { label: "Identity Clearance", value: profile?.licenseNumber, icon: ShieldCheck },
                { label: "Grid Standing", value: "4.95 / 5.0", icon: Star },
                { label: "Mission Payouts", value: `₹${(profile?.totalEarnings || 0).toFixed(0)}`, icon: Wallet }
              ].map((item, i) => (
                <div key={i} className="glass-card p-12 rounded-[4rem] flex items-center gap-10 hover:bg-white/10 transition-all group">
                   <div className="h-16 w-16 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-2xl"><item.icon className="h-8 w-8" /></div>
                   <div>
                      <p className="text-[11px] font-black uppercase text-slate-600 tracking-[0.5em] mb-2">{item.label}</p>
                      <p className="font-black text-white italic uppercase text-2xl tracking-tighter leading-none">{item.value}</p>
                   </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSignOut} className="w-full h-32 bg-red-500/5 text-red-500 rounded-[5rem] font-black uppercase italic mt-16 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-xl">
              <LogOut className="h-12 w-12 mr-6" /> Terminate Session
            </Button>
          </div>
        )}
      </main>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-slate-950 border-none rounded-[6rem] p-24 text-center shadow-[0_0_150px_rgba(0,0,0,1)] text-white">
          <DialogHeader><h3 className="text-7xl font-black italic uppercase text-primary tracking-tighter text-center leading-none mb-6 text-glow">Mission Feedback</h3></DialogHeader>
          <div className="py-12 space-y-12">
            <p className="text-xl font-bold text-slate-500 italic">Rate the boarding protocol on corridor {unratedTrip?.routeName}?</p>
            <div className="flex justify-center gap-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-8 rounded-[3rem] transition-all ${rating >= star ? 'bg-primary text-slate-950 scale-110 shadow-[0_0_50px_rgba(0,255,255,0.4)]' : 'bg-white/5 text-slate-800 border border-white/5'}`}><Star className="h-16 w-16 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-32 bg-white text-slate-950 font-black uppercase italic text-4xl rounded-[4rem] shadow-2xl">Sync Rating</Button>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-0 left-0 right-0 p-12 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center rounded-t-[7rem] z-50 shadow-2xl">
        <Button variant="ghost" onClick={() => setActiveTab('trips')} className={`flex-col h-auto py-6 gap-4 rounded-3xl transition-all ${activeTab === 'trips' ? 'text-primary scale-110' : 'text-slate-600'}`}><Bus className="h-14 w-14" /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Grid</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-6 gap-4 rounded-3xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-600'}`}><IndianRupee className="h-14 w-14" /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Ledger</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('fleet')} className={`flex-col h-auto py-6 gap-4 rounded-3xl transition-all ${activeTab === 'fleet' ? 'text-primary scale-110' : 'text-slate-600'}`}><Settings className="h-14 w-14" /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Fleet</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-6 gap-4 rounded-3xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-600'}`}><UserIcon className="h-14 w-14" /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Identity</span></Button>
      </nav>
    </div>
  );
}