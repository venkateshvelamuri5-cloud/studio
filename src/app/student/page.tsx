
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
  MapPinned,
  LocateFixed,
  AlertCircle,
  Activity,
  Gift,
  AlertTriangle,
  Zap,
  Star,
  Globe,
  TrendingUp,
  Tag,
  ArrowRight,
  IndianRupee,
  Ticket,
  Clock,
  Leaf
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, limit, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '3.5rem' };
const mapOptions = { 
  mapId: "da87e9c90896eba04be76dde", 
  disableDefaultUI: true, 
  zoomControl: false,
};

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
    toast({ variant: "destructive", title: "SOS Alert Sent", description: "The regional safety hub is monitoring your trip." });
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    try {
      const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(vQuery);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "This voucher is not recognized." });
        setAppliedDiscount(0);
      } else {
        setAppliedDiscount(snap.docs[0].data().discountAmount);
        toast({ title: "Discount Applied", description: `You saved ₹${snap.docs[0].data().discountAmount}!` });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not apply voucher." });
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
      toast({ title: "Booking Confirmed", description: `Boarding ID created. You earned ${pointsEarned} points!` });
    } catch (e) {
      toast({ variant: "destructive", title: "Booking Failed" });
    } finally {
      setIsBooking(false);
    }
  };

  const submitRating = async () => {
    if (!db || !unratedTrip || !rating) return;
    await updateDoc(doc(db, 'trips', unratedTrip.id), { studentRating: rating });
    setIsRatingOpen(false);
    setRating(0);
    toast({ title: "Rating Saved", description: "Thanks for helping us stay smart." });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  const scholarTier = useMemo(() => {
    const points = profile?.loyaltyPoints || 0;
    if (points > 500) return { name: "Gold Scholar", color: "text-amber-500", bg: "bg-amber-50" };
    if (points > 200) return { name: "Silver Scholar", color: "text-slate-400", bg: "bg-slate-50" };
    return { name: "Bronze Scholar", color: "text-orange-500", bg: "bg-orange-50" };
  }, [profile?.loyaltyPoints]);

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="px-8 py-8 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-3xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Bus className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">AAGO</h1>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] mt-1.5">{profile?.city} Regional Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-50 h-12 w-12 rounded-[1.5rem]"><AlertTriangle className="h-6 w-6" /></Button>
           <Badge className="bg-green-500/10 text-green-600 border-none text-[8px] font-black uppercase px-6 py-2.5 rounded-full tracking-widest">Network Pulse: 100%</Badge>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h2 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-[0.85]">Hi, <br/> {profile?.fullName?.split(' ')[0]}.</h2>
                <div className="flex items-center gap-2 mt-3">
                   <Badge className={`${scholarTier.bg} ${scholarTier.color} border-none text-[9px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest`}>{scholarTier.name}</Badge>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 text-center min-w-[120px]">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">My Points</p>
                 <div className="flex items-center justify-center gap-2">
                   <Star className="h-5 w-5 text-accent fill-accent" />
                   <span className="text-2xl font-black text-slate-900 uppercase italic leading-none">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                <div className="h-[22rem] w-full rounded-[4.5rem] overflow-hidden border border-slate-100 shadow-2xl bg-white relative">
                  {isLoaded ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={driverProfile?.currentLat ? { lat: driverProfile.currentLat, lng: driverProfile.currentLng } : (currentPosition || DEFAULT_CENTER)} zoom={14} options={mapOptions}>
                      {driverProfile?.currentLat && (
                        <Marker 
                          position={{ lat: driverProfile.currentLat, lng: driverProfile.currentLng }} 
                          icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(50, 50) }}
                        />
                      )}
                      {activeRouteData?.stops && (
                        <Polyline 
                          path={activeRouteData.stops.map((s: any) => ({ lat: s.lat, lng: s.lng }))}
                          options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 8 }}
                        />
                      )}
                    </GoogleMap>
                  ) : <div className="h-full flex items-center justify-center text-slate-400 font-black italic">Tactical Radar Loading...</div>}
                  <div className="absolute top-10 right-10 bg-white/95 backdrop-blur-md p-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 border border-slate-100">
                    <Clock className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm font-black italic uppercase">ETA: {etaMinutes} MINS</span>
                  </div>
                </div>

                <Card className="bg-slate-900 text-white border-none rounded-[4.5rem] p-16 text-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)]" />
                  <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform"><QrCode className="h-16 w-16" /></div>
                  <h3 className="text-9xl font-black tracking-tighter italic font-headline leading-none mb-4 relative z-10">{profile.activeOtp}</h3>
                  <p className="text-[12px] font-black uppercase tracking-[0.6em] mb-14 opacity-60 relative z-10">Boarding ID Code</p>
                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="bg-white/10 p-8 rounded-[2rem] text-left border border-white/5 backdrop-blur-md">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-2 tracking-widest">Active Corridor</p>
                      <p className="text-sm font-black italic uppercase truncate">{currentBooking.routeName}</p>
                    </div>
                    <div className="bg-white/10 p-8 rounded-[2rem] text-left border border-white/5 backdrop-blur-md">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-2 tracking-widest">Target Hub</p>
                      <p className="text-sm font-black italic uppercase truncate">{profile.destinationStopName}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <Card className="p-8 bg-white border-none shadow-xl rounded-[3rem] space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp className="h-10 w-10" /></div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Rides</p>
                    <div className="flex items-center gap-3">
                      <Bus className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-black text-slate-900 italic leading-none">{pastTrips?.length || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-8 bg-green-500 border-none shadow-xl rounded-[3rem] space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-20"><Leaf className="h-10 w-10 text-white" /></div>
                    <p className="text-[9px] font-black uppercase text-white/60 tracking-widest">Saving Earth</p>
                    <div className="flex items-center gap-3 text-white">
                      <span className="text-3xl font-black italic leading-none">{( (pastTrips?.length || 0) * 0.4 ).toFixed(1)}kg</span>
                    </div>
                    <p className="text-[7px] font-black uppercase text-white/50 leading-none">CO2 SAVED</p>
                  </Card>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-16 bg-white border border-slate-100 rounded-[5rem] shadow-2xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-all border-b-[12px] border-b-primary group">
                      <div className="space-y-4">
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.4em] px-6 py-2 rounded-full">Mission Grid</Badge>
                        <h3 className="text-6xl font-black italic uppercase text-slate-900 leading-[0.8] tracking-tighter">Find <br/> a Bus</h3>
                      </div>
                      <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner"><Navigation className="h-12 w-12" /></div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none rounded-[5rem] p-16 h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                    <DialogHeader className="mb-10 shrink-0">
                      <DialogTitle className="text-6xl font-black italic uppercase text-primary leading-none tracking-tighter">Station</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-6">
                            <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Regional Protocol</Label>
                            <div className="space-y-4">
                               <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-22 bg-slate-50 border-none rounded-[2rem] px-10 font-black italic text-xl outline-none shadow-inner">
                                 <option value="">Start Station</option>
                                 {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                               <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-22 bg-slate-50 border-none rounded-[2rem] px-10 font-black italic text-xl outline-none shadow-inner">
                                 <option value="">End Station</option>
                                 {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-6 pb-12">
                            <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Active Shuttles</Label>
                            {filteredTrips.length === 0 ? (
                               <div className="p-16 text-center text-sm font-bold text-slate-400 italic bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 uppercase">No active missions detected.</div>
                            ) : filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-10 rounded-[3.5rem] border-4 transition-all cursor-pointer relative overflow-hidden ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-white shadow-2xl scale-[1.02]' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                <div className="absolute top-0 right-0 p-8 opacity-5"><Bus className="h-16 w-16" /></div>
                                <h4 className="font-black uppercase italic text-3xl mb-2 tracking-tighter leading-none">{trip.routeName}</h4>
                                <div className="flex justify-between items-center">
                                   <Badge className={`${selectedTrip?.id === trip.id ? 'bg-white/20 text-white' : 'bg-white text-slate-400'} border-none text-[10px] font-black uppercase px-5 py-2 rounded-full`}>Fare: ₹{trip.farePerRider}</Badge>
                                   <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{trip.verifiedPassengers?.length || 0} Scholars On Board</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-10 animate-in zoom-in-95">
                          <div className="bg-slate-900 p-12 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-10"><Zap className="h-16 w-16 text-primary" /></div>
                             <p className="text-[11px] font-black uppercase text-primary tracking-[0.4em] mb-6">Hub Payment Address</p>
                             <h4 className="text-xl font-black text-white italic truncate tracking-tight">{profile?.city === 'Vizag' ? (globalConfig as any)?.vizagUpiId : (globalConfig as any)?.vzmUpiId || 'hub.aago@upi'}</h4>
                          </div>
                          <div className="bg-slate-50 p-10 rounded-[3.5rem] space-y-6">
                            <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Gift Voucher</Label>
                            <div className="flex gap-4">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="ENTER CODE" className="h-18 bg-white rounded-2xl font-black italic text-lg px-8 border-none shadow-inner" />
                               <Button onClick={handleApplyVoucher} className="h-18 px-10 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-xs">Apply</Button>
                            </div>
                          </div>
                          <div className="p-14 bg-primary/5 rounded-[4rem] border-4 border-primary/10 text-center relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 p-10 opacity-5"><IndianRupee className="h-20 w-20" /></div>
                            <p className="text-[12px] font-black uppercase text-primary tracking-[0.5em] mb-4 italic">Final Commute Fare</p>
                            <h3 className="text-8xl font-black italic text-slate-900 leading-none tracking-tighter">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                      {bookingStep === 3 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-10 py-20 animate-in zoom-in">
                           <div className="h-44 w-44 bg-green-500 rounded-[4rem] flex items-center justify-center text-white shadow-2xl animate-bounce"><CheckCircle2 className="h-24 w-24" /></div>
                           <div className="space-y-4">
                              <h3 className="text-5xl font-black italic uppercase text-slate-900 leading-none tracking-tighter">Seat Secured</h3>
                              <p className="text-base font-bold text-slate-400 italic leading-relaxed">Your regional mission is ready. <br/> Access your Boarding ID on the home screen.</p>
                           </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-10 shrink-0">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-24 bg-primary text-white rounded-[2.5rem] font-black uppercase italic text-2xl shadow-2xl hover:scale-[1.02] transition-all">Select Seat <ArrowRight className="ml-4 h-8 w-8" /></Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-24 bg-green-600 text-white rounded-[2.5rem] font-black uppercase italic text-2xl shadow-2xl hover:scale-[1.02] transition-all">{isBooking ? <Loader2 className="animate-spin h-10 w-10" /> : "Verify & Pay"}</Button>}
                      {bookingStep === 3 && <Button onClick={() => { setBookingStep(1); setSelectedTrip(null); }} className="w-full h-24 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase italic text-2xl shadow-2xl">Return to Hub</Button>}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">My Rides</h2>
                <Badge className="bg-slate-900 text-white border-none font-black uppercase text-[8px] px-4 py-1.5 rounded-full tracking-widest">{pastTrips?.length || 0} Total</Badge>
             </div>
             <div className="space-y-6">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-20 text-center bg-white rounded-[4rem] border border-dashed border-slate-200 shadow-sm">
                    <History className="h-12 w-12 text-slate-100 mx-auto mb-6" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">No mission history found.</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white border-none rounded-[3.5rem] p-10 flex justify-between items-center shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform"><History className="h-16 w-16" /></div>
                      <div className="relative z-10">
                        <h4 className="font-black text-slate-900 uppercase italic text-3xl leading-none mb-3 tracking-tighter">{trip.routeName}</h4>
                        <div className="flex items-center gap-3">
                           <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] font-black uppercase px-4 py-1.5 rounded-full">{new Date(trip.endTime).toLocaleDateString()}</Badge>
                           <Badge className="bg-primary/5 text-primary border-none text-[9px] font-black uppercase px-4 py-1.5 rounded-full">₹{trip.farePerRider}</Badge>
                        </div>
                      </div>
                      <div className="relative z-10">
                        {trip.studentRating ? (
                           <div className="flex items-center gap-2 bg-accent/5 px-4 py-2 rounded-2xl text-accent">
                              <span className="text-lg font-black italic">{trip.studentRating}</span>
                              <Star className="h-4 w-4 fill-accent" />
                           </div>
                        ) : (
                           <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200"><Star className="h-6 w-6" /></div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-12 animate-in fade-in text-center">
             <div className="flex flex-col items-center gap-10 py-12">
                <div className="h-44 w-44 rounded-[4.5rem] bg-white border-4 border-primary/10 flex items-center justify-center shadow-2xl overflow-hidden relative group">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <span className="text-8xl font-black italic text-slate-200">{profile?.fullName?.[0]}</span>}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Badge className="bg-white text-primary text-[9px] font-black uppercase tracking-widest shadow-xl">Verified Identity</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                   <h2 className="text-5xl font-black text-slate-900 italic uppercase leading-[0.9] tracking-tighter">{profile?.fullName}</h2>
                   <div className="flex items-center justify-center gap-3">
                      <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase px-5 py-2 rounded-full tracking-widest">{profile?.collegeName}</Badge>
                      <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] font-black uppercase px-5 py-2 rounded-full tracking-widest">{profile?.city} Hub</Badge>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
                {[
                  { label: "Scholar ID Number", value: profile?.studentId, icon: ShieldCheck },
                  { label: "Main Station", value: profile?.city, icon: MapPin },
                  { label: "Eco Impact Score", value: `${(pastTrips?.length || 0) * 12} Trees`, icon: Leaf },
                  { label: "Reward Status", value: scholarTier.name, icon: Gift }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-10 rounded-[2.5rem] flex items-center gap-8 border border-slate-100 shadow-sm text-left group hover:shadow-md transition-all">
                    <div className="h-14 w-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner"><item.icon className="h-7 w-7" /></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</p>
                       <p className="font-black italic text-slate-900 uppercase text-xl tracking-tight leading-none">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-26 bg-red-50 text-red-500 rounded-[3.5rem] font-black uppercase italic mt-12 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                <LogOut className="mr-5 h-10 w-10" /> End Scholar Session
             </Button>
          </div>
        )}
      </main>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-white border-none rounded-[5rem] p-16 text-center shadow-2xl">
          <DialogHeader><DialogTitle className="text-5xl font-black italic uppercase text-primary tracking-tighter text-center leading-none mb-4">Rate Mission</DialogTitle></DialogHeader>
          <div className="py-12 space-y-12">
            <p className="text-base font-bold text-slate-400 italic">How was your commute on {unratedTrip?.routeName}?</p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-6 rounded-[2rem] transition-all ${rating >= star ? 'bg-accent text-white scale-110 shadow-2xl' : 'bg-slate-50 text-slate-200'}`}><Star className="h-12 w-12 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-24 bg-primary text-white font-black uppercase italic text-2xl rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all">Publish Feedback</Button>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-0 left-0 right-0 p-10 bg-white/90 backdrop-blur-3xl border-t border-slate-200 z-50 rounded-t-[6rem] shadow-[0_-15px_60px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 gap-4 rounded-[2rem] transition-all ${activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-10 w-10" /><span className="text-[11px] font-black uppercase tracking-widest">Missions</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 gap-4 rounded-[2rem] transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><History className="h-10 w-10" /><span className="text-[11px] font-black uppercase tracking-widest">My Rides</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-4 gap-4 rounded-[2rem] transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-10 w-10" /><span className="text-[11px] font-black uppercase tracking-widest">Identity</span></Button>
        </div>
      </nav>
    </div>
  );
}
