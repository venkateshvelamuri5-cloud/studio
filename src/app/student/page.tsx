
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Bus, 
  MapPin, 
  Search, 
  Bell, 
  QrCode,
  Map as MapIcon,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight,
  Plus,
  Loader2,
  Fingerprint,
  CheckCircle2,
  Phone,
  History,
  User as UserIcon,
  Wallet,
  Clock,
  ArrowRight,
  Info,
  Ticket,
  ShieldCheck,
  Tag,
  PlusCircle,
  Banknote,
  GanttChart,
  MapPinned,
  Zap,
  LocateFixed
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, orderBy, limit, addDoc, getDocs, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Polyline, Marker, Circle } from '@react-google-maps/api';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '2.5rem' };
const mapOptions = { 
  mapId: "da87e9c90896eba04be76dde", 
  disableDefaultUI: true, 
  zoomControl: false,
  styles: [
    {
      "featureType": "all",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#7c93a3"}]
    }
  ]
};

export default function StudentDashboard() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'history' | 'profile'>('home');
  const [isBooking, setIsBooking] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [pickupStop, setPickupStop] = useState<string>("");
  const [destinationStop, setDestinationStop] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: firebaseConfig.apiKey });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: pastTrips } = useCollection(useMemo(() => (db && user?.uid) ? query(collection(db, 'trips'), where('passengers', 'array-contains', user.uid), where('status', '==', 'completed'), orderBy('endTime', 'desc'), limit(10)) : null, [db, user?.uid]));
  const { data: userPasses } = useCollection(useMemo(() => (db && user?.uid) ? query(collection(db, 'users', user.uid, 'passes'), where('remainingRides', '>', 0)) : null, [db, user?.uid]));
  const { data: availablePasses } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'passes'), where('city', '==', profile.city), where('isActive', '==', true)) : null, [db, profile?.city]));

  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  
  // Get all unique stops in the city for search
  const allStops = useMemo(() => {
    const stops = new Set<string>();
    activeRoutes?.forEach(r => r.stops?.forEach((s: any) => stops.add(s.name)));
    return Array.from(stops);
  }, [activeRoutes]);

  // Find trips that pass through pickup and destination in order
  const filteredTrips = useMemo(() => {
    if (!pickupStop || !destinationStop) return [];
    return activeTrips?.filter(trip => {
      const route = activeRoutes?.find(r => r.routeName === trip.routeName);
      if (!route) return false;
      const pickupIdx = route.stops?.findIndex((s: any) => s.name === pickupStop);
      const destIdx = route.stops?.findIndex((s: any) => s.name === destinationStop);
      return pickupIdx !== -1 && destIdx !== -1 && pickupIdx < destIdx;
    }) || [];
  }, [activeTrips, activeRoutes, pickupStop, destinationStop]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Geolocation denied")
      );
    }
  }, []);

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  const handleTopUp = async (amount: number) => {
    if (!db || !userRef || !profile) return;
    try {
      await updateDoc(userRef, { credits: increment(amount) });
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        userName: profile.fullName,
        amount,
        type: 'top-up',
        timestamp: new Date().toISOString()
      });
      toast({ title: "Wallet Updated", description: `Added ₹${amount} to your wallet.` });
    } catch {
      toast({ variant: "destructive", title: "Could not add money" });
    }
  };

  const redeemPromo = async () => {
    if (!db || !userRef || !promoCode) return;
    setIsRedeeming(true);
    try {
      const q = query(collection(db, 'promoCodes'), where('code', '==', promoCode.toUpperCase().trim()), where('isActive', '==', true), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "This code is not working or expired." });
      } else {
        const promo = snap.docs[0].data();
        await updateDoc(userRef, { credits: increment(promo.value) });
        await updateDoc(doc(db, 'promoCodes', snap.docs[0].id), { usageCount: increment(1) });
        toast({ title: "Promo Applied!", description: `₹${promo.value} added to your wallet.` });
        setPromoCode("");
      }
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsRedeeming(false);
    }
  };

  const buyPass = async (pass: any) => {
    if (!db || !userRef || !profile) return;
    if (profile.credits < pass.price) {
      toast({ variant: "destructive", title: "Low Balance", description: "Please top up your wallet first." });
      return;
    }
    try {
      await updateDoc(userRef, { credits: increment(-pass.price) });
      await addDoc(collection(db, 'users', user!.uid, 'passes'), {
        passId: pass.id,
        name: pass.name,
        totalRides: pass.totalRides,
        remainingRides: pass.totalRides,
        routeName: pass.routeName,
        purchasedAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        userName: profile.fullName,
        amount: pass.price,
        type: 'pass-purchase',
        timestamp: new Date().toISOString()
      });
      toast({ title: "Pass Bought!", description: `You have ${pass.totalRides} rides to use.` });
    } catch {
      toast({ variant: "destructive", title: "Purchase failed" });
    }
  };

  const handleBoardRequest = async () => {
    if (!db || !userRef || !user?.uid || !selectedTrip || !destinationStop) return;
    
    const compatiblePass = userPasses?.find(p => p.routeName === 'All Routes' || p.routeName === selectedTrip.routeName);
    
    if (!compatiblePass && (profile?.credits || 0) < selectedTrip.farePerRider) {
      toast({ variant: "destructive", title: "No Money", description: "Please add money to your wallet." });
      return;
    }

    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      if (compatiblePass) {
        const passRef = doc(db, 'users', user.uid, 'passes', (compatiblePass as any).id);
        await updateDoc(passRef, {
          remainingRides: increment(-1)
        });
        toast({ title: "Pass Used", description: "One ride used from your pass." });
      } else {
        await updateDoc(userRef, { credits: increment(-selectedTrip.farePerRider) });
      }

      await updateDoc(userRef, { activeOtp: otp, destinationStopName: destinationStop });
      await updateDoc(doc(db, 'trips', selectedTrip.id), { passengers: arrayUnion(user.uid) });

      setSelectedTrip(null);
      setPickupStop("");
      setDestinationStop("");
      toast({ title: "Booking Confirmed", description: "Your boarding code is ready." });
    } catch {
      toast({ variant: "destructive", title: "Booking failed" });
    } finally {
      setIsBooking(false);
    }
  };

  const useMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // In a real app, we'd reverse-geocode to find the nearest station
        // For this MVP, we'll just show a toast
        toast({ title: "Location Updated", description: "Found your coordinates. Showing nearby corridors." });
      });
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Bus className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">AAGO</h1><p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">{profile?.city} HUB</p></div>
        </div>
        <div className="flex items-center gap-3">
           <Badge className="bg-green-500/10 text-green-600 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1.5 hidden sm:flex">Radar Live</Badge>
           <Button variant="ghost" size="icon" onClick={() => setActiveTab('wallet')} className="h-10 w-10 rounded-xl bg-slate-100 text-primary hover:bg-primary/10 transition-colors"><Wallet className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}</h2>
              <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">Your regional travel command center</p>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <Card className="bg-primary text-white border-none rounded-[3rem] p-10 text-center shadow-2xl shadow-primary/30 relative overflow-hidden transition-all group">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                  <QrCode className="h-8 w-8" />
                </div>
                <h3 className="text-8xl font-black tracking-[0.1em] italic font-headline leading-none mb-3 text-white">{profile.activeOtp}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-10 opacity-70">Show code to driver to board</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/10 text-left">
                    <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mb-1">Bus Route</p>
                    <p className="text-sm font-black italic uppercase truncate">{currentBooking.routeName}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/10 text-left">
                    <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mb-1">Destination</p>
                    <p className="text-sm font-black italic uppercase truncate">{profile.destinationStopName}</p>
                  </div>
                </div>
                <Zap className="absolute -left-4 -bottom-4 h-24 w-24 opacity-10" />
              </Card>
            ) : (
              <div className="space-y-8">
                <div className="h-72 w-full rounded-[3rem] overflow-hidden border border-slate-200 shadow-xl bg-white relative group">
                  {isLoaded ? (
                    <GoogleMap 
                      mapContainerStyle={mapContainerStyle} 
                      center={currentPosition || { lat: 17.6868, lng: 83.2185 }} 
                      zoom={13} 
                      options={mapOptions}
                    >
                      {currentPosition && (
                        <>
                          <Marker position={currentPosition} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png', scaledSize: new window.google.maps.Size(32, 32) }} />
                          <Circle center={currentPosition} radius={1000} options={{ fillColor: '#3b82f6', fillOpacity: 0.1, strokeColor: '#3b82f6', strokeWeight: 1 }} />
                        </>
                      )}
                      {activeTrips?.map((trip: any, i: number) => (
                        <Marker 
                          key={i} 
                          position={{ lat: 17.6868 + (Math.random() - 0.5) * 0.05, lng: 83.2185 + (Math.random() - 0.5) * 0.05 }} 
                          icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(24, 24) }} 
                        />
                      ))}
                    </GoogleMap>
                  ) : <div className="h-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary" /></div>}
                  <div className="absolute top-6 left-6 flex gap-2">
                    <Badge className="bg-white/80 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase px-3 shadow-lg">Network Map</Badge>
                  </div>
                  <Button onClick={useMyLocation} className="absolute bottom-6 right-6 h-12 w-12 rounded-2xl bg-white text-primary shadow-2xl hover:scale-110 active:scale-95 transition-all p-0">
                    <LocateFixed className="h-6 w-6" />
                  </Button>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-10 bg-white border border-slate-100 rounded-[3rem] text-slate-900 flex items-center justify-between cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all shadow-md group border-b-4 border-b-primary">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Regional Transit</p>
                        <h3 className="text-4xl font-black italic uppercase leading-none">Find a Bus</h3>
                      </div>
                      <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                        <Navigation className="h-8 w-8" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none text-slate-900 rounded-[3rem] p-8 max-w-[95vw] mx-auto w-full shadow-2xl h-[80vh] flex flex-col">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-3xl font-black italic uppercase text-primary leading-none">Plan Your Trip</DialogTitle>
                      <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Select your stations to see active shuttles</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
                      <div className="space-y-4">
                        <div className="relative">
                          <MapPinned className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                          <select 
                            value={pickupStop} 
                            onChange={(e) => setPickupStop(e.target.value)}
                            className="w-full h-16 bg-slate-50 border-none rounded-2xl pl-12 pr-6 font-black italic text-sm appearance-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Where are you now?</option>
                            {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="relative">
                          <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                          <select 
                            value={destinationStop} 
                            onChange={(e) => setDestinationStop(e.target.value)}
                            className="w-full h-16 bg-slate-50 border-none rounded-2xl pl-12 pr-6 font-black italic text-sm appearance-none focus:ring-2 focus:ring-accent/20"
                          >
                            <option value="">Where are you going?</option>
                            {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 italic">Active Corridors Matching Your Trip</p>
                        {filteredTrips.length > 0 ? filteredTrips.map((trip: any) => (
                          <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-6 rounded-[2rem] border-2 flex justify-between items-center group cursor-pointer transition-all ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-white shadow-xl' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                            <div>
                              <h4 className="font-black uppercase italic text-lg leading-none">{trip.routeName}</h4>
                              <p className={`text-[9px] font-bold uppercase mt-1.5 ${selectedTrip?.id === trip.id ? 'text-white/70' : 'text-slate-400'}`}>₹{trip.farePerRider.toFixed(0)} • Next stop in 5 mins</p>
                            </div>
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${selectedTrip?.id === trip.id ? 'bg-white text-primary' : 'bg-white text-slate-300 group-hover:text-primary'}`}>
                              {selectedTrip?.id === trip.id ? <CheckCircle2 className="h-6 w-6" /> : <ChevronRight className="h-5 w-5" />}
                            </div>
                          </div>
                        )) : (
                          <div className="py-10 text-center space-y-4">
                            <Info className="h-10 w-10 text-slate-200 mx-auto" />
                            <p className="text-slate-400 font-bold italic uppercase text-[10px]">Select both points to see buses</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={handleBoardRequest} 
                      disabled={isBooking || !selectedTrip || !destinationStop} 
                      className="w-full h-18 bg-primary hover:bg-primary/90 text-white rounded-[1.5rem] font-black uppercase italic text-xl shadow-2xl shadow-primary/20 mt-6 active:scale-95 transition-all"
                    >
                      {isBooking ? <Loader2 className="animate-spin" /> : "Secure My Seat"}
                    </Button>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Card onClick={() => setActiveTab('wallet')} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-white transition-all"><Wallet className="h-6 w-6" /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Wallet Credits</p>
                      <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">₹{(profile?.credits || 0).toFixed(0)}</h3>
                    </div>
                  </Card>
                  <Card onClick={() => setActiveTab('wallet')} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all"><Ticket className="h-6 w-6" /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Active Passes</p>
                      <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">{userPasses?.length || 0}</h3>
                    </div>
                  </Card>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Regional Corridors</h4>
                     <Button variant="ghost" className="text-[9px] font-black uppercase tracking-widest text-primary h-auto p-0 hover:bg-transparent">See All</Button>
                   </div>
                   <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar">
                     {activeRoutes?.slice(0, 4).map((route: any) => (
                       <div key={route.id} className="min-w-[200px] p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all shrink-0">
                         <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4"><MapPinned className="h-4 w-4" /></div>
                         <h5 className="font-black uppercase italic text-sm text-slate-900 leading-none mb-2">{route.routeName}</h5>
                         <p className="text-[8px] font-bold text-slate-400 uppercase italic truncate">{route.stops?.[0]?.name} to {route.stops?.[route.stops.length-1]?.name}</p>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-primary text-white border-none rounded-[3.5rem] p-12 relative overflow-hidden shadow-2xl shadow-primary/30">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Regional Credits</p>
                <h3 className="text-7xl font-black italic mt-4 tracking-tighter leading-none text-white">₹{(profile?.credits || 0).toFixed(0)}</h3>
              </div>
              <Banknote className="absolute -right-12 -bottom-12 h-64 w-64 opacity-10" />
            </Card>

            <Tabs defaultValue="passes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-200/50 p-1.5 rounded-2xl h-16">
                <TabsTrigger value="passes" className="rounded-xl font-black uppercase italic text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Passes</TabsTrigger>
                <TabsTrigger value="topup" className="rounded-xl font-black uppercase italic text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Top Up</TabsTrigger>
                <TabsTrigger value="promo" className="rounded-xl font-black uppercase italic text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Redeem</TabsTrigger>
              </TabsList>

              <TabsContent value="passes" className="space-y-8 pt-8">
                <div className="space-y-5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-2">Your Active Portfolio</h4>
                  {userPasses && userPasses.length > 0 ? userPasses.map((p: any) => (
                    <Card key={p.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 relative overflow-hidden shadow-sm group hover:shadow-xl transition-all">
                      <div className="relative z-10 flex justify-between items-center mb-6">
                        <div>
                          <h4 className="font-black text-slate-900 uppercase italic text-lg leading-none mb-2">{p.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase italic tracking-widest">{p.remainingRides} / {p.totalRides} Rides left • {p.routeName}</p>
                        </div>
                        <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><Ticket className="h-6 w-6" /></div>
                      </div>
                      <div className="mt-4 h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                        <div className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${(p.remainingRides / p.totalRides) * 100}%` }} />
                      </div>
                    </Card>
                  )) : (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-[3rem] text-slate-400 space-y-3">
                      <Ticket className="h-10 w-10 mx-auto opacity-20" />
                      <p className="text-[10px] font-bold uppercase italic tracking-widest">No active passes in your portfolio</p>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-2">Scholar Specials</h4>
                  {availablePasses?.map((p: any) => (
                    <Card key={p.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex justify-between items-center hover:shadow-2xl hover:scale-[1.02] transition-all shadow-md group">
                       <div>
                         <h4 className="font-black text-slate-900 uppercase italic text-lg leading-none mb-2">{p.name}</h4>
                         <p className="text-[9px] font-bold text-slate-400 uppercase italic tracking-widest">{p.totalRides} Rides • {p.routeName}</p>
                       </div>
                       <Button onClick={() => buyPass(p)} className="bg-slate-900 hover:bg-primary text-white font-black uppercase italic h-14 px-8 rounded-2xl shadow-xl transition-all">₹{p.price}</Button>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="topup" className="space-y-8 pt-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-2">Instant Reload</h4>
                <div className="grid grid-cols-2 gap-6">
                  {[200, 500, 1000, 2000].map(amt => (
                    <Button key={amt} onClick={() => handleTopUp(amt)} className="h-24 bg-white border border-slate-100 hover:border-primary/50 hover:bg-primary/5 text-slate-900 rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all shadow-md group">
                      <Plus className="h-5 w-5 text-primary group-hover:scale-125 transition-transform" />
                      <span className="text-2xl font-black italic tracking-tighter">₹{amt}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="promo" className="space-y-8 pt-8">
                <Card className="bg-white border border-slate-100 rounded-[3rem] p-10 text-center shadow-xl">
                  <div className="h-20 w-20 bg-accent/10 rounded-[1.5rem] flex items-center justify-center text-accent mx-auto mb-6 shadow-inner"><Tag className="h-10 w-10" /></div>
                  <h4 className="text-2xl font-black uppercase italic text-slate-900 mb-2">Redeem Signal</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-10 italic tracking-widest">Enter campaign code for instant credits</p>
                  <div className="flex flex-col gap-5">
                    <Input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="ENTER CODE" className="h-18 bg-slate-50 border-none text-center font-black tracking-[0.4em] text-2xl text-slate-900 rounded-2xl shadow-inner italic" />
                    <Button onClick={redeemPromo} disabled={isRedeeming || !promoCode} className="w-full h-18 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase italic text-lg shadow-2xl active:scale-95 transition-all">
                      {isRedeeming ? <Loader2 className="animate-spin" /> : "Redeem Now"}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-1">
               <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">My Ledger</h2>
               <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">History of your network movements</p>
             </div>
             <div className="space-y-4">
                {pastTrips && pastTrips.length > 0 ? pastTrips.map((trip: any) => (
                  <Card key={trip.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex justify-between items-center shadow-sm hover:shadow-xl hover:translate-x-2 transition-all">
                     <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-green-50 rounded-[1.25rem] flex items-center justify-center text-green-500 shadow-inner"><CheckCircle2 className="h-7 w-7" /></div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase italic text-lg leading-none mb-1.5">{trip.routeName}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                            {new Date(trip.endTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {new Date(trip.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                     </div>
                     <div className="text-right">
                       <p className="text-2xl font-black text-primary italic leading-none">₹{trip.farePerRider?.toFixed(0)}</p>
                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter mt-1">Settled</p>
                     </div>
                  </Card>
                )) : (
                  <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-[3rem] space-y-4">
                    <History className="h-12 w-12 mx-auto text-slate-200" />
                    <p className="text-slate-400 font-bold italic uppercase text-[10px]">No movement history on record</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col items-center gap-8 py-10 text-center">
                <div className="h-40 w-40 rounded-[3.5rem] bg-white border-4 border-primary/10 flex items-center justify-center text-primary shadow-2xl relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent group-hover:opacity-100 transition-opacity" />
                  <span className="text-7xl font-black italic relative z-10 text-primary">{profile?.fullName?.[0]}</span>
                </div>
                <div>
                   <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-3">{profile?.fullName}</h2>
                   <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.5em] px-6 py-2 rounded-full">Scholar Verified</Badge>
                </div>
             </div>
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 italic">Scholar Credentials</h4>
                {[ 
                  { label: 'College / Hub', value: profile?.collegeName, icon: Info }, 
                  { label: 'Scholar ID', value: profile?.studentId, icon: Fingerprint },
                  { label: 'Main Station', value: profile?.city, icon: MapPin } 
                ].map((item, i) => (
                  <div key={i} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex items-center gap-6 shadow-sm hover:shadow-md transition-all">
                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner"><item.icon className="h-6 w-6" /></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{item.label}</p><p className="text-lg font-black text-slate-900 uppercase italic mt-1 leading-tight">{item.value || 'N/A'}</p></div>
                  </div>
                ))}
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-20 bg-red-50 hover:bg-red-100 text-red-500 rounded-[2.5rem] font-black uppercase italic transition-all active:scale-95 shadow-sm mt-8"><LogOut className="mr-3 h-6 w-6" /> Terminate Session</Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl border-t border-slate-100 z-50 rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center max-w-lg mx-auto relative">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Radar</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('wallet')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'wallet' ? 'text-primary scale-110' : 'text-slate-400'}`}><Wallet className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Bank</span></Button>
          
          <div className="relative -mt-20 group">
            <div className="absolute -inset-4 bg-primary/20 blur-[30px] rounded-full group-hover:bg-primary/30 transition-all duration-1000" />
            <Button onClick={() => setActiveTab('home')} className="relative h-24 w-24 rounded-[2.5rem] bg-primary text-white border-[10px] border-white shadow-2xl hover:scale-110 active:scale-95 transition-all">
              <QrCode className="h-12 w-12" />
            </Button>
          </div>
          
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><History className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Rides</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Me</span></Button>
        </div>
      </nav>
    </div>
  );
}
