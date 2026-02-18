
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
  Star
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, arrayUnion, getDocs, limit } from 'firebase/firestore';
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
  
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  useEffect(() => {
    if (!profile || profile.status !== 'available') return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateDoc(userRef!, { currentLat: pos.coords.latitude, currentLng: pos.coords.longitude });
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [profile, userRef]);

  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  const historyQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'), limit(20));
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(historyQuery);

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

  const { data: passengers } = useCollection(useMemo(() => {
    if (!db || !activeTrip?.passengers?.length) return null;
    return query(collection(db, 'users'), where('uid', 'in', activeTrip.passengers));
  }, [db, activeTrip?.passengers]));

  const routeStops = useMemo(() => {
    const route = allRoutes?.find((r: any) => r.routeName === activeTrip?.routeName);
    return route?.stops || [];
  }, [activeTrip, allRoutes]);

  const triggerSOS = async () => {
    if (!db || !user || !profile) return;
    addDoc(collection(db, 'alerts'), { type: 'DRIVER_SOS', userId: user.uid, userName: profile.fullName, timestamp: new Date().toISOString() });
    toast({ variant: "destructive", title: "Operator SOS Dispatched" });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const tripData = {
        driverId: user.uid, driverName: profile.fullName, routeName: route.routeName, 
        farePerRider: route.baseFare, status: 'active', riderCount: 0, 
        maxCapacity: profile.vehicleType === 'Van' ? 12 : 45,
        passengers: [], verifiedPassengers: [], startTime: new Date().toISOString()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Mission Started" });
    } catch (e) { toast({ variant: "destructive", title: "Failed to Start" }); }
    finally { setIsUpdating(false); }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    const snap = await getDocs(query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim())));
    if (snap.empty) {
      toast({ variant: "destructive", title: "Invalid Code" });
    } else {
      const rider = snap.docs[0].data();
      await updateDoc(doc(db, 'trips', activeTrip.id), { verifiedPassengers: arrayUnion(rider.uid) });
      await updateDoc(doc(db, 'users', rider.uid), { activeOtp: null });
      toast({ title: "Student Boarded" });
      setVerificationOtp("");
    }
    setIsVerifying(false);
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !profile) return;
    setIsUpdating(true);
    const yieldAmt = (activeTrip.passengers?.length || 0) * activeTrip.farePerRider;
    const share = yieldAmt * 0.9;
    await updateDoc(doc(db, 'trips', activeTrip.id), { status: 'completed', endTime: new Date().toISOString(), totalYield: yieldAmt, driverShare: share, riderCount: activeTrip.passengers?.length });
    await updateDoc(userRef!, { status: 'available', activeTripId: null, totalEarnings: increment(share) });
    toast({ title: "Mission Closed", description: `Credited ₹${share.toFixed(0)}` });
    setIsUpdating(false);
  };

  const submitRating = async () => {
    if (!db || !unratedTrip || !rating) return;
    await updateDoc(doc(db, 'trips', unratedTrip.id), { driverRating: rating });
    setIsRatingOpen(false);
    setRating(0);
    toast({ title: "Post Verified" });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="p-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-primary/20 flex items-center justify-center text-primary font-black italic">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : profile?.fullName?.[0]}
          </div>
          <div>
            <h1 className="font-black text-sm uppercase italic text-slate-900 leading-none">{profile?.fullName}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-100 text-slate-400' : 'bg-green-500/10 text-green-600'} border-none text-[8px] font-black uppercase mt-1 tracking-widest`}>
              {profile?.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-50 rounded-xl"><AlertTriangle className="h-5 w-5" /></Button>
           <Button onClick={() => updateDoc(userRef!, { status: profile?.status === 'offline' ? 'available' : 'offline' })} className={`rounded-2xl h-11 w-11 p-0 transition-all ${profile?.status === 'offline' ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-xl'}`}>
             <Power className="h-5 w-5" />
           </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'trips' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none">Corridors</h2>
            <div className="space-y-4">
              {availableRoutes.map((route: any) => (
                <Card key={route.id} className="bg-white border-slate-100 rounded-[2rem] shadow-sm">
                  <CardContent className="p-8 flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="font-black text-xl text-slate-900 uppercase italic leading-none">{route.routeName}</h3>
                      <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase">₹{route.baseFare} Base</Badge>
                    </div>
                    <Button onClick={() => startTrip(route)} disabled={profile?.status === 'offline'} className="rounded-xl h-12 px-8 bg-primary text-white font-black uppercase italic">Start</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="h-64 rounded-[3rem] overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
              {isLoaded && (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={routeStops[0] ? { lat: routeStops[0].lat, lng: routeStops[0].lng } : DEFAULT_CENTER} zoom={13} options={mapOptions}>
                  <Polyline path={routeStops.map((s: any) => ({ lat: s.lat, lng: s.lng }))} options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 6 }} />
                </GoogleMap>
              )}
            </div>
            <Card className="bg-white border-none rounded-[3.5rem] p-8 space-y-8 shadow-2xl">
              <div className="flex justify-between items-start">
                <h2 className="text-3xl font-black italic uppercase leading-none">{activeTrip.routeName}</h2>
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">{activeTrip.passengers?.length || 0} Boarded</Badge>
              </div>
              <div className="bg-primary/5 p-8 rounded-[2.5rem] space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.4em]">Verify Boarding Code</Label>
                <div className="flex gap-3">
                  <input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="h-16 w-full text-center font-black tracking-[0.4em] text-2xl rounded-2xl bg-white border-none shadow-inner outline-none focus:ring-2 focus:ring-primary" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-16 w-16 rounded-2xl bg-primary text-white shadow-lg p-0">
                    {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-8 w-8" />}
                  </Button>
                </div>
              </div>
              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-20 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase italic text-lg shadow-xl">End Mission</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
             <h3 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Earnings</h3>
             <div className="space-y-4">
                {pastTrips?.map((trip: any) => (
                  <Card key={trip.id} className="bg-white border-slate-100 rounded-[2rem] p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500"><IndianRupee className="h-6 w-6" /></div>
                       <div>
                          <h4 className="font-black text-sm uppercase italic mb-1">{trip.routeName}</h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(trip.endTime).toLocaleDateString()} • {trip.riderCount} Boarded</p>
                       </div>
                    </div>
                    <p className="text-lg font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in text-center">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-40 w-40 rounded-[3.5rem] overflow-hidden border-4 border-primary/10 bg-white flex items-center justify-center shadow-2xl relative">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-slate-200" />}
              </div>
              <h2 className="text-4xl font-black italic uppercase text-slate-900 leading-none">{profile?.fullName}</h2>
            </div>
            <Button onClick={handleSignOut} className="w-full h-20 bg-red-50 text-red-500 rounded-[2.5rem] font-black uppercase italic mt-10 shadow-sm border border-red-100"><LogOut className="h-6 w-6 mr-3" /> Sign Out</Button>
          </div>
        )}
      </main>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-white border-none rounded-[4rem] p-12 text-center shadow-2xl">
          <DialogHeader><h3 className="text-4xl font-black italic uppercase text-primary tracking-tighter text-center">Rate Scholars</h3></DialogHeader>
          <div className="py-10 space-y-8">
            <p className="text-sm font-bold text-slate-400 italic">How was the boarding quality on {unratedTrip?.routeName}?</p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-4 rounded-2xl transition-all ${rating >= star ? 'bg-accent text-white scale-110 shadow-lg' : 'bg-slate-50 text-slate-200'}`}><Star className="h-8 w-8 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-20 bg-primary text-white font-black uppercase italic text-2xl rounded-3xl shadow-xl">Confirm Rating</Button>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl border-t border-slate-200 flex justify-around items-center rounded-t-[4rem] z-50">
        <Button variant="ghost" onClick={() => setActiveTab('trips')} className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === 'trips' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Shift</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><IndianRupee className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Earnings</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Fleet</span></Button>
      </nav>
    </div>
  );
}
