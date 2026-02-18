
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

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '2rem' };
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

  // Today's Stats Logic
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

  // Periodic Location Updates
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
      type: 'DRIVER_SOS', 
      userId: user.uid, 
      userName: profile.fullName, 
      city: profile.city, 
      timestamp: new Date().toISOString() 
    });
    toast({ variant: "destructive", title: "Emergency Alert Sent", description: "The regional safety hub has been notified." });
  };

  const handleToggleStatus = async () => {
    if (!userRef || !profile) return;
    const isGoingOnline = profile.status === 'offline';
    const newStatus = isGoingOnline ? 'available' : 'offline';
    if (isGoingOnline) setShiftStartTime(new Date().toISOString());
    else setShiftStartTime(null);
    
    await updateDoc(userRef, { status: newStatus });
    toast({ title: isGoingOnline ? "Shift Started" : "Shift Ended", description: isGoingOnline ? "You are now online for missions." : "Shift records saved." });
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
      toast({ title: "Mission Active", description: `Route: ${route.routeName}` });
    } catch (e) { 
      toast({ variant: "destructive", title: "Failed to Start" }); 
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
        toast({ variant: "destructive", title: "Invalid Code", description: "Double check the scholar's ID code." });
      } else {
        const rider = snap.docs[0].data();
        const riderId = snap.docs[0].id;
        await updateDoc(doc(db, 'trips', activeTrip.id), { 
          verifiedPassengers: arrayUnion(riderId),
          riderCount: increment(1)
        });
        await updateDoc(doc(db, 'users', riderId), { activeOtp: null });
        toast({ title: "Scholar Boarded", description: `${rider.fullName} verified successfully.` });
        setVerificationOtp("");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Verification Failed" });
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
      toast({ title: "Mission Ended", description: `Payout of ₹${driverPayout.toFixed(0)} credited.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error ending trip" });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitRating = async () => {
    if (!db || !unratedTrip || !rating) return;
    await updateDoc(doc(db, 'trips', unratedTrip.id), { driverRating: rating });
    setIsRatingOpen(false);
    setRating(0);
    toast({ title: "Rating Saved", description: "Thanks for your feedback!" });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="p-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-slate-100">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-6 w-6 text-slate-300" />}
          </div>
          <div>
            <h1 className="font-black text-sm uppercase italic text-slate-900 leading-none">{profile?.fullName}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-100 text-slate-400' : 'bg-green-500/10 text-green-600'} border-none text-[8px] font-black uppercase mt-1 tracking-widest`}>
              {profile?.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-50 rounded-xl h-11 w-11"><AlertTriangle className="h-5 w-5" /></Button>
           <Button onClick={handleToggleStatus} className={`rounded-2xl h-11 w-11 p-0 transition-all ${profile?.status === 'offline' ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-xl'}`}>
             <Power className="h-5 w-5" />
           </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'trips' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in">
            {/* Mission Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-900 text-white border-none rounded-[2rem] p-6 space-y-4 shadow-xl">
                 <p className="text-[9px] font-black uppercase text-primary tracking-widest">Today's Earnings</p>
                 <h2 className="text-3xl font-black italic uppercase leading-none">₹{stats.earnings.toFixed(0)}</h2>
                 <Progress value={(stats.earnings / 2000) * 100} className="h-1 bg-white/10" />
              </Card>
              <Card className="bg-white border-none rounded-[2rem] p-6 space-y-4 shadow-sm">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Missions Run</p>
                 <h2 className="text-3xl font-black italic text-slate-900 leading-none">{stats.count}</h2>
                 <p className="text-[8px] font-bold text-slate-400 uppercase italic">Across {profile?.city} Hub</p>
              </Card>
            </div>

            {/* Eco Impact */}
            <Card className="bg-green-50 border-none rounded-[2.5rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Leaf className="h-16 w-16 text-green-600" /></div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-green-600 tracking-widest">Eco Impact</p>
                  <h3 className="text-2xl font-black italic uppercase text-slate-900 leading-none">{stats.carbon} kg</h3>
                  <p className="text-[8px] font-bold text-green-700/60 uppercase">Carbon Footprint Saved</p>
               </div>
               <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                  <Leaf className="h-6 w-6" />
               </div>
            </Card>

            <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none">Open Corridors</h2>
            <div className="space-y-4">
              {availableRoutes.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                  <MapPinned className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-xs font-bold text-slate-400 italic">No routes active in {profile?.city}</p>
                </div>
              ) : (
                availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-white border-none rounded-[2rem] shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    <CardContent className="p-8 flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-black text-xl text-slate-900 uppercase italic leading-none">{route.routeName}</h3>
                        <div className="flex gap-2">
                           <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase">₹{route.baseFare} Fare</Badge>
                           <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase">{route.stops?.length || 0} Stops</Badge>
                        </div>
                      </div>
                      <Button 
                        onClick={() => startTrip(route)} 
                        disabled={profile?.status === 'offline' || isUpdating} 
                        className="rounded-xl h-12 px-8 bg-primary text-white font-black uppercase italic shadow-lg"
                      >
                        Start
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="h-72 rounded-[3.5rem] overflow-hidden border border-slate-200 shadow-2xl bg-slate-100 relative">
              {isLoaded && (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={routeStops[0] ? { lat: routeStops[0].lat, lng: routeStops[0].lng } : DEFAULT_CENTER} zoom={13} options={mapOptions}>
                  <Marker position={profile?.currentLat ? { lat: profile.currentLat, lng: profile.currentLng } : DEFAULT_CENTER} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(40, 40) }} />
                  <Polyline path={routeStops.map((s: any) => ({ lat: s.lat, lng: s.lng }))} options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 6 }} />
                </GoogleMap>
              )}
            </div>
            
            <Card className="bg-white border-none rounded-[3.5rem] p-10 space-y-10 shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter">{activeTrip.routeName}</h2>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Mission Radar</p>
                </div>
                <Badge className="bg-green-500/10 text-green-600 border-none text-[9px] font-black uppercase px-5 py-2.5 rounded-full">{activeTrip.verifiedPassengers?.length || 0} Scholars</Badge>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">Boarding ID Code</Label>
                <div className="flex gap-4">
                  <input 
                    value={verificationOtp} 
                    onChange={(e) => setVerificationOtp(e.target.value)} 
                    placeholder="000000" 
                    className="h-18 w-full text-center font-black tracking-[0.5em] text-3xl rounded-2xl bg-white border-none shadow-inner outline-none focus:ring-2 focus:ring-primary" 
                    maxLength={6} 
                  />
                  <Button 
                    onClick={verifyPassenger} 
                    disabled={isVerifying || !verificationOtp} 
                    className="h-18 w-18 rounded-2xl bg-primary text-white shadow-xl p-0"
                  >
                    {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-10 w-10" />}
                  </Button>
                </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-24 bg-slate-900 text-white rounded-[2rem] font-black uppercase italic text-xl shadow-2xl">Complete Mission</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black italic uppercase text-slate-900">Mission Ledger</h3>
                <div className="text-right">
                   <p className="text-[8px] font-black uppercase text-slate-400">Total Earnings</p>
                   <p className="text-2xl font-black italic text-primary">₹{(profile?.totalEarnings || 0).toFixed(0)}</p>
                </div>
             </div>
             <div className="space-y-4">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-16 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                    <History className="h-10 w-10 text-slate-100 mx-auto mb-4" />
                    <p className="text-xs font-bold text-slate-400 italic uppercase">No mission history</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white border-none rounded-[2.5rem] p-8 flex justify-between items-center shadow-sm">
                      <div className="space-y-1">
                          <h4 className="font-black text-base uppercase italic">{trip.routeName}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase italic">{new Date(trip.endTime).toLocaleDateString()} • {trip.finalRiderCount || trip.riderCount} Scholars</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                         <Badge className="bg-slate-100 text-slate-400 border-none text-[7px] font-black uppercase tracking-tighter">90% SHARE</Badge>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-8 animate-in fade-in">
             <h3 className="text-3xl font-black italic uppercase text-slate-900">Fleet Health</h3>
             <div className="grid grid-cols-1 gap-6">
                {[
                  { label: "Vehicle Status", value: "Optimal", icon: Bus, color: "text-green-500", progress: 95 },
                  { label: "Brake Lining", value: "Verified", icon: ShieldCheck, color: "text-blue-500", progress: 88 },
                  { label: "Sanitation Status", value: "Excellent", icon: CheckCircle2, color: "text-green-500", progress: 100 },
                  { label: "Engine Pulse", value: "Stable", icon: Activity, color: "text-orange-500", progress: 92 },
                ].map((item, i) => (
                  <Card key={i} className="bg-white border-none rounded-[2.5rem] p-8 shadow-sm space-y-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className={`p-3 bg-slate-50 rounded-xl ${item.color}`}><item.icon className="h-6 w-6" /></div>
                           <p className="font-black text-slate-900 uppercase italic text-sm">{item.label}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase ${item.color}`}>{item.value}</span>
                     </div>
                     <Progress value={item.progress} className="h-2" />
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in text-center">
            <div className="flex flex-col items-center gap-8 py-10">
              <div className="h-44 w-44 rounded-[4rem] overflow-hidden border-4 border-primary/10 bg-white flex items-center justify-center shadow-2xl">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-slate-200" />}
              </div>
              <div>
                <h2 className="text-5xl font-black italic uppercase text-slate-900 leading-none tracking-tighter">{profile?.fullName}</h2>
                <div className="flex items-center justify-center gap-3 mt-3">
                   <Badge className="bg-slate-900 text-white border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full">{profile?.vehicleType} Operator</Badge>
                   <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full">{profile?.city} Hub</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              {[
                { label: "Vehicle Number", value: profile?.vehicleNumber, icon: Car },
                { label: "License ID", value: profile?.licenseNumber, icon: ShieldCheck },
                { label: "Safety Rating", value: "4.9 / 5.0", icon: Star },
                { label: "Total Payouts", value: `₹${(profile?.totalEarnings || 0).toFixed(0)}`, icon: Wallet }
              ].map((item, i) => (
                <div key={i} className="p-8 bg-white rounded-[2.5rem] flex items-center gap-6 shadow-sm">
                   <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary"><item.icon className="h-6 w-6" /></div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{item.label}</p>
                      <p className="font-black text-slate-900 italic uppercase text-lg">{item.value}</p>
                   </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSignOut} className="w-full h-24 bg-red-50 text-red-500 rounded-[3rem] font-black uppercase italic mt-10 shadow-sm border border-red-100">
              <LogOut className="h-8 w-8 mr-4" /> End Shift
            </Button>
          </div>
        )}
      </main>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-white border-none rounded-[4rem] p-12 text-center shadow-2xl">
          <DialogHeader><h3 className="text-4xl font-black italic uppercase text-primary tracking-tighter text-center leading-none">Mission Feedback</h3></DialogHeader>
          <div className="py-10 space-y-10">
            <p className="text-sm font-bold text-slate-400 italic">How was the boarding on {unratedTrip?.routeName}?</p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-5 rounded-3xl transition-all ${rating >= star ? 'bg-accent text-white scale-110 shadow-xl' : 'bg-slate-50 text-slate-200'}`}><Star className="h-10 w-10 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-24 bg-primary text-white font-black uppercase italic text-2xl rounded-[2.5rem]">Save Rating</Button>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-0 left-0 right-0 p-10 bg-white/90 backdrop-blur-3xl border-t border-slate-200 flex justify-around items-center rounded-t-[5rem] z-50 shadow-sm">
        <Button variant="ghost" onClick={() => setActiveTab('trips')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'trips' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-10 w-10" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Missions</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><IndianRupee className="h-10 w-10" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Ledger</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('fleet')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'fleet' ? 'text-primary scale-110' : 'text-slate-400'}`}><Settings className="h-10 w-10" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Fleet</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-10 w-10" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Profile</span></Button>
      </nav>
    </div>
  );
}
