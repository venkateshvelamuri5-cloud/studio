"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Bus, 
  MapPin, 
  QrCode,
  Navigation,
  LogOut,
  ChevronRight,
  Loader2,
  CheckCircle2,
  History,
  User as UserIcon,
  ShieldCheck,
  Activity,
  Gift,
  AlertTriangle,
  Zap,
  Star,
  IndianRupee,
  Clock,
  Leaf,
  Ticket,
  Target
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, limit, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '4rem' };
const mapOptions = { 
  mapId: "da87e9c90896eba04be76dde", 
  disableDefaultUI: true, 
  zoomControl: false,
};
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 };

export default function StudentDashboard() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile' | 'rewards'>('home');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); 
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [pickupStop, setPickupStop] = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [rating, setRating] = useState(0);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, [db, profile?.city]));
  
  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.verifiedPassengers?.includes(user.uid) || t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  const driverRef = useMemo(() => (db && currentBooking?.driverId) ? doc(db, 'users', currentBooking.driverId) : null, [db, currentBooking?.driverId]);
  const { data: driverProfile } = useDoc(driverRef);

  const pastTripsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('status', '==', 'completed'), where('verifiedPassengers', 'array-contains', user.uid));
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(pastTripsQuery);

  const unratedTrip = useMemo(() => pastTrips?.find(t => !t.studentRating), [pastTrips]);

  useEffect(() => {
    if (unratedTrip) setIsRatingOpen(true);
  }, [unratedTrip]);

  const allStops = useMemo(() => {
    const stops = new Set<string>();
    activeRoutes?.forEach(r => r.stops?.forEach((s: any) => stops.add(s.name)));
    return Array.from(stops).sort();
  }, [activeRoutes]);

  const filteredTrips = useMemo(() => {
    let trips = activeTrips || [];
    if (pickupStop && destinationStop) {
      trips = trips.filter(trip => {
        const route = activeRoutes?.find(r => r.routeName === trip.routeName);
        if (!route) return false;
        const pIdx = route.stops?.findIndex((s: any) => s.name === pickupStop);
        const dIdx = route.stops?.findIndex((s: any) => s.name === destinationStop);
        return pIdx !== -1 && dIdx !== -1 && pIdx < dIdx;
      });
    }
    return trips;
  }, [activeTrips, activeRoutes, pickupStop, destinationStop]);

  const activeRouteData = useMemo(() => {
    if (!currentBooking || !activeRoutes) return null;
    return activeRoutes.find((r: any) => r.routeName === currentBooking.routeName);
  }, [currentBooking, activeRoutes]);

  const etaMinutes = useMemo(() => {
    if (!driverProfile?.currentLat || !activeRouteData) return 12;
    return Math.floor(Math.random() * 8) + 4; 
  }, [driverProfile, activeRouteData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const triggerSOS = async () => {
    if (!db || !user || !profile) return;
    addDoc(collection(db, 'alerts'), {
      type: 'SCHOLAR_SOS',
      userId: user.uid,
      userName: profile.fullName,
      city: profile.city,
      timestamp: new Date().toISOString(),
      location: currentPosition || 'Regional Hub'
    });
    toast({ variant: "destructive", title: "SOS Radar Triggered", description: "Dispatch hub alerted." });
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    try {
      const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(vQuery);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Discount code not recognized." });
        setAppliedDiscount(0);
      } else {
        setAppliedDiscount(snap.docs[0].data().discountAmount);
        toast({ title: "Savings Applied", description: `Fare reduced by ₹${snap.docs[0].data().discountAmount}` });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "System Error" });
    }
  };

  const handleConfirmPayment = async () => {
    if (!db || !userRef || !selectedTrip || !destinationStop) return;
    setIsBooking(true);
    try {
      const finalFare = Math.max(0, selectedTrip.farePerRider - appliedDiscount);
      const pointsEarned = Math.floor(finalFare / 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      await updateDoc(userRef, { 
        activeOtp: otp, 
        destinationStopName: destinationStop,
        loyaltyPoints: increment(pointsEarned)
      });
      await updateDoc(doc(db, 'trips', selectedTrip.id), { 
        passengers: arrayUnion(user!.uid)
      });
      setBookingStep(3);
      toast({ title: "Seat Verified", description: `You earned ${pointsEarned} Scholar Points!` });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Error" });
    } finally {
      setIsBooking(false);
    }
  };

  const submitRating = async () => {
    if (!db || !unratedTrip || !rating) return;
    await updateDoc(doc(db, 'trips', unratedTrip.id), { studentRating: rating });
    setIsRatingOpen(false);
    setRating(0);
    toast({ title: "Rating Synced", description: "Thanks for feedback." });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  const scholarTier = useMemo(() => {
    const points = profile?.loyaltyPoints || 0;
    if (points > 500) return { name: "Platinum Scholar", color: "text-cyan-400", bg: "bg-cyan-500/10" };
    if (points > 200) return { name: "Gold Scholar", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { name: "Regional Scholar", color: "text-primary", bg: "bg-primary/10" };
  }, [profile?.loyaltyPoints]);

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-32 selection:bg-primary">
      <header className="px-8 py-8 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-3xl sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">AAGO Hub</h1>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">{profile?.city} Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-500/10 h-12 w-12 rounded-2xl border border-white/5"><AlertTriangle className="h-6 w-6" /></Button>
           <Badge className="bg-cyan-500/10 text-cyan-400 border-none text-[9px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-inner">Live</Badge>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-xl mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.9] text-glow">Hi, <br/> {profile?.fullName?.split(' ')[0]}.</h2>
                <Badge className={`${scholarTier.bg} ${scholarTier.color} border-none text-[10px] font-black uppercase px-5 py-2 rounded-full mt-4 tracking-widest`}>{scholarTier.name}</Badge>
              </div>
              <div className="glass-card p-6 rounded-[2rem] text-center min-w-[130px] shadow-xl">
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Scholar Points</p>
                 <div className="flex items-center justify-center gap-2">
                   <Star className="h-5 w-5 text-accent fill-accent" />
                   <span className="text-3xl font-black text-white uppercase italic leading-none">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-8">
                <div className="h-80 w-full rounded-[3.5rem] overflow-hidden border border-white/10 shadow-lg bg-slate-900 relative">
                  {isLoaded ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={driverProfile?.currentLat ? { lat: driverProfile.currentLat, lng: driverProfile.currentLng } : (currentPosition || DEFAULT_CENTER)} zoom={14} options={mapOptions}>
                      {driverProfile?.currentLat && (
                        <Marker 
                          position={{ lat: driverProfile.currentLat, lng: driverProfile.currentLng }} 
                          icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(40, 40) }}
                        />
                      )}
                      {activeRouteData?.stops && (
                        <Polyline 
                          path={activeRouteData.stops.map((s: any) => ({ lat: s.lat, lng: s.lng }))}
                          options={{ strokeColor: "#00ffff", strokeOpacity: 0.8, strokeWeight: 6 }}
                        />
                      )}
                    </GoogleMap>
                  ) : <div className="h-full flex items-center justify-center text-slate-600 font-black italic text-xl uppercase tracking-widest animate-pulse">Scanning Grid...</div>}
                  <div className="absolute top-6 right-6 bg-slate-950/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10">
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black italic uppercase tracking-widest text-white">ETA: {etaMinutes} MINS</span>
                  </div>
                </div>

                <Card className="bg-slate-900 border-none rounded-[3.5rem] p-12 text-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.1),transparent_70%)]" />
                  <h3 className="text-6xl font-black tracking-tighter italic font-headline leading-none mb-4 relative z-10 text-glow">{profile.activeOtp}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mb-10 relative z-10">Boarding ID</p>
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white/5 p-6 rounded-2xl text-left border border-white/5">
                      <p className="text-[8px] font-black uppercase opacity-40 mb-1 tracking-widest">Corridor</p>
                      <p className="text-xs font-black italic uppercase truncate text-white">{currentBooking.routeName}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl text-left border border-white/5">
                      <p className="text-[8px] font-black uppercase opacity-40 mb-1 tracking-widest">Target Hub</p>
                      <p className="text-xs font-black italic uppercase truncate text-white">{profile.destinationStopName}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <Card className="p-8 bg-white/5 border border-white/5 shadow-xl rounded-[2.5rem] space-y-3 hover:bg-white/10 transition-all">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Scholar Rides</p>
                    <div className="flex items-center gap-3">
                      <Bus className="h-6 w-6 text-primary" />
                      <span className="text-4xl font-black text-white italic leading-none">{pastTrips?.length || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-8 bg-accent border-none shadow-xl rounded-[2.5rem] space-y-3 hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black uppercase text-slate-900/60 tracking-widest">Eco Impact</p>
                    <div className="flex items-center gap-3 text-slate-900">
                      <Leaf className="h-6 w-6" />
                      <span className="text-4xl font-black italic leading-none">{( (pastTrips?.length || 0) * 0.4 ).toFixed(1)}kg</span>
                    </div>
                    <p className="text-[7px] font-black uppercase text-slate-900/50 tracking-widest">CO2 OFFSET</p>
                  </Card>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-16 bg-slate-900 border border-white/5 rounded-[4rem] shadow-2xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-all border-b-[12px] border-b-primary group relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                      <div className="space-y-3 relative z-10">
                        <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full">Scholar Commute</Badge>
                        <h3 className="text-5xl font-black italic uppercase text-white leading-[0.9] tracking-tighter">Find <br/> my Bus</h3>
                      </div>
                      <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-950 transition-all shadow-xl relative z-10">
                        <Navigation className="h-10 w-10" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-950 border-none rounded-[4rem] p-12 h-[80vh] flex flex-col overflow-hidden shadow-2xl text-white">
                    <DialogHeader className="mb-8 shrink-0">
                      <DialogTitle className="text-5xl font-black italic uppercase text-primary leading-none tracking-tighter text-glow">Commute Grid</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Station Selection</Label>
                            <div className="space-y-3">
                               <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 font-black italic text-lg outline-none text-white appearance-none">
                                 <option value="" className="bg-slate-950">Pick Start Hub</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-slate-950">{s}</option>)}
                               </select>
                               <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 font-black italic text-lg outline-none text-white appearance-none">
                                 <option value="" className="bg-slate-950">Pick Destination</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-slate-950">{s}</option>)}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-4 pb-8">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Live Telemetry</Label>
                            {filteredTrips.length === 0 ? (
                               <div className="p-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-700 italic bg-white/5 rounded-[2.5rem] border border-dashed border-white/5">No missions on grid.</div>
                            ) : filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-8 rounded-[2.5rem] border-[3px] transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-slate-950 shadow-lg scale-[1.02]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                <h4 className="font-black uppercase italic text-2xl mb-2 tracking-tighter leading-none">{trip.routeName}</h4>
                                <div className="flex justify-between items-center">
                                   <Badge className={`${selectedTrip?.id === trip.id ? 'bg-slate-950 text-white' : 'bg-primary/20 text-primary'} border-none text-[9px] font-black uppercase px-4 py-1.5 rounded-full`}>₹{trip.farePerRider}</Badge>
                                   <p className={`text-[9px] font-black uppercase tracking-widest ${selectedTrip?.id === trip.id ? 'text-slate-950/60' : 'text-slate-500'}`}>{trip.verifiedPassengers?.length || 0} Boarded</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-10 animate-in zoom-in-95 duration-500">
                          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-center border border-white/5 shadow-xl">
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Hub UPI Protocol</p>
                             <h4 className="text-xl font-black text-white italic truncate tracking-tighter">{profile?.city === 'Vizag' ? (globalConfig as any)?.vizagUpiId : (globalConfig as any)?.vzmUpiId || 'hub.aago@upi'}</h4>
                          </div>
                          <div className="bg-white/5 p-8 rounded-[2.5rem] space-y-4 border border-white/5">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Savings Key</Label>
                            <div className="flex gap-3">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="ENTER CODE" className="h-14 bg-slate-950 border-white/10 rounded-xl font-black italic text-xl px-6 text-primary placeholder:text-slate-800" />
                               <Button onClick={handleApplyVoucher} className="h-14 px-6 bg-white text-slate-950 rounded-xl font-black uppercase italic text-xs hover:scale-105 transition-transform">Apply</Button>
                            </div>
                          </div>
                          <div className="p-12 bg-primary/10 rounded-[3.5rem] border-[6px] border-primary/20 text-center shadow-inner">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 italic">Total Boarding Payout</p>
                            <h3 className="text-5xl font-black italic text-white leading-none tracking-tighter text-glow">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                      {bookingStep === 3 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-8 py-16 animate-in zoom-in duration-700">
                           <div className="h-32 w-32 bg-accent rounded-[3rem] flex items-center justify-center text-slate-950 shadow-2xl animate-bounce"><CheckCircle2 className="h-16 w-16" /></div>
                           <div className="space-y-3">
                              <h3 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter">Mission Active</h3>
                              <p className="text-lg font-bold text-slate-500 italic">Seat verified. Boarding ID live.</p>
                           </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-8 shrink-0">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-20 bg-primary text-slate-950 rounded-[2.5rem] font-black uppercase italic text-xl shadow-lg">Lock Mission</Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-20 bg-green-500 text-slate-950 rounded-[2.5rem] font-black uppercase italic text-xl shadow-lg">{isBooking ? <Loader2 className="animate-spin h-8 w-8" /> : "Initiate Hub Sync"}</Button>}
                      {bookingStep === 3 && <Button onClick={() => { setBookingStep(1); setSelectedTrip(null); }} className="w-full h-20 bg-white text-slate-950 rounded-[2.5rem] font-black uppercase italic text-xl">Return to Terminal</Button>}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none text-glow">Ride Ledger</h2>
                <Badge className="bg-white/10 text-white border-none font-black uppercase text-[9px] px-4 py-2 rounded-full tracking-widest">{pastTrips?.length || 0} Missions</Badge>
             </div>
             <div className="space-y-4">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-16 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/5 shadow-inner">
                    <History className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700 italic">No mission data.</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex justify-between items-center shadow-xl hover:bg-white/10 transition-all">
                      <div className="space-y-1">
                        <h4 className="font-black text-white uppercase italic text-2xl leading-none tracking-tighter">{trip.routeName}</h4>
                        <div className="flex items-center gap-2">
                           <Badge className="bg-white/5 text-slate-400 border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">{new Date(trip.endTime).toLocaleDateString()}</Badge>
                           <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">₹{trip.farePerRider}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-[1.25rem] text-accent border border-accent/20">
                         <span className="text-lg font-black italic">{trip.studentRating || "-"}</span>
                         <Star className="h-4 w-4 fill-accent" />
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-12 animate-in fade-in text-center pb-12">
             <div className="flex flex-col items-center gap-8 pt-8">
                <div className="h-44 w-44 rounded-[3.5rem] bg-slate-900 border-4 border-primary/10 flex items-center justify-center shadow-2xl overflow-hidden relative group">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <span className="text-6xl font-black italic text-slate-800">{profile?.fullName?.[0]}</span>}
                </div>
                <div className="space-y-3">
                   <h2 className="text-5xl font-black text-white italic uppercase leading-none tracking-tighter text-glow">{profile?.fullName}</h2>
                   <div className="flex items-center justify-center gap-3 mt-4">
                      <Badge className="bg-primary text-slate-950 border-none text-[9px] font-black uppercase px-6 py-2 rounded-full tracking-widest">{profile?.collegeName}</Badge>
                      <Badge className="bg-white/10 text-slate-400 border-none text-[9px] font-black uppercase px-6 py-2 rounded-full tracking-widest">{profile?.city} HUB</Badge>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-4 text-left">
                {[
                  { label: "Scholar ID", value: profile?.studentId, icon: ShieldCheck },
                  { label: "Home Port Hub", value: profile?.city, icon: MapPin },
                  { label: "Carbon Offset", value: `${( (pastTrips?.length || 0) * 0.4 ).toFixed(1)} kg CO2`, icon: Leaf },
                  { label: "Protocol Tier", value: scholarTier.name, icon: Gift }
                ].map((item, i) => (
                  <div key={i} className="glass-card p-8 rounded-[2rem] flex items-center gap-6 hover:bg-white/10 transition-all group">
                    <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-950 transition-all border border-white/5 shadow-lg"><item.icon className="h-6 w-6" /></div>
                    <div>
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{item.label}</p>
                       <p className="font-black italic text-white uppercase text-xl leading-none tracking-tighter">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-24 bg-red-500/5 text-red-500 rounded-[3rem] font-black uppercase italic mt-10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-lg">
                <LogOut className="mr-4 h-8 w-8" /> End Sync
             </Button>
          </div>
        )}
      </main>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-slate-950 border-none rounded-[4rem] p-16 text-center shadow-2xl text-white">
          <DialogHeader><DialogTitle className="text-4xl font-black italic uppercase text-primary tracking-tighter text-center leading-none mb-4 text-glow">Feedback</DialogTitle></DialogHeader>
          <div className="py-8 space-y-8">
            <p className="text-lg font-bold text-slate-500 italic">Rate your commute?</p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-6 rounded-[2rem] transition-all ${rating >= star ? 'bg-accent text-slate-950 scale-110 shadow-lg' : 'bg-white/5 text-slate-800 border border-white/5'}`}><Star className="h-10 w-10 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-24 bg-primary text-slate-950 font-black uppercase italic text-2xl rounded-[2.5rem] shadow-xl hover:scale-105 transition-transform">Sync Rating</Button>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 z-50 rounded-t-[5rem] shadow-2xl">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 gap-2 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-600'}`}><Bus className="h-10 w-10" /><span className="text-[9px] font-black uppercase tracking-widest">Home Hub</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 gap-2 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-600'}`}><History className="h-10 w-10" /><span className="text-[9px] font-black uppercase tracking-widest">Ledger</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-4 gap-2 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-600'}`}><UserIcon className="h-10 w-10" /><span className="text-[9px] font-black uppercase tracking-widest">Profile</span></Button>
        </div>
      </nav>
    </div>
  );
}
