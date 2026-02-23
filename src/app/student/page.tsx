
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
  Target,
  LayoutGrid,
  Map as MapIcon
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, limit, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '2.5rem' };
const mapOptions = { 
  mapId: "da87e9c90896eba04be76dde", 
  disableDefaultUI: true, 
  zoomControl: false,
};
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 };

export default function StudentApp() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'history' | 'profile'>('home');
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
      city: profile.city || 'Global',
      timestamp: new Date().toISOString(),
      location: currentPosition || 'Regional Hub'
    });
    toast({ variant: "destructive", title: "SOS Alert Sent", description: "Security team is monitoring your signal." });
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    try {
      const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(vQuery);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Voucher", description: "Code not recognized." });
        setAppliedDiscount(0);
      } else {
        setAppliedDiscount(snap.docs[0].data().discountAmount);
        toast({ title: "Discount Applied", description: `Saved ₹${snap.docs[0].data().discountAmount}` });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Network Error" });
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
      toast({ title: "Booking Confirmed", description: `Earned ${pointsEarned} Scholar Points!` });
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
    toast({ title: "Feedback Saved", description: "Thanks for helping us improve!" });
  };

  const scholarTier = useMemo(() => {
    const points = profile?.loyaltyPoints || 0;
    if (points > 500) return { name: "Platinum Scholar", color: "text-cyan-400", bg: "bg-cyan-500/10" };
    if (points > 200) return { name: "Gold Scholar", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { name: "Regional Scholar", color: "text-primary", bg: "bg-primary/10" };
  }, [profile?.loyaltyPoints]);

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">AAGO APP</h1>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-1">{profile?.city || 'Global'} Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-500/10 h-10 w-10 rounded-xl border border-white/5 shadow-inner active:scale-95 transition-all"><AlertTriangle className="h-5 w-5" /></Button>
           <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 overflow-x-hidden max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold italic">Welcome back,</p>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight text-glow">{profile?.fullName?.split(' ')[0]}</h2>
                <Badge className={`${scholarTier.bg} ${scholarTier.color} border-none text-[8px] font-black uppercase px-3 py-1 rounded-full mt-2 tracking-widest`}>{scholarTier.name}</Badge>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl text-center border border-white/5 shadow-lg min-w-[100px]">
                 <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">My Points</p>
                 <div className="flex items-center justify-center gap-1">
                   <Star className="h-4 w-4 text-accent fill-accent" />
                   <span className="text-xl font-black text-white italic leading-none">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                <Card className="bg-slate-900/80 border-none rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden group border border-white/5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05),transparent_70%)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-2 relative z-10">Boarding Protocol</p>
                  <h3 className="text-6xl font-black tracking-tighter italic font-headline leading-none mb-6 relative z-10 text-glow text-primary">{profile.activeOtp}</h3>
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-slate-950 p-4 rounded-xl text-left border border-white/5">
                      <p className="text-[8px] font-black uppercase text-slate-600 mb-1 tracking-widest">Route</p>
                      <p className="text-[10px] font-black italic uppercase truncate text-white">{currentBooking.routeName}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl text-left border border-white/5">
                      <p className="text-[8px] font-black uppercase text-slate-600 mb-1 tracking-widest">Target Hub</p>
                      <p className="text-[10px] font-black italic uppercase truncate text-white">{profile.destinationStopName}</p>
                    </div>
                  </div>
                </Card>
                <div className="h-64 w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-xl bg-slate-900 relative">
                  {isLoaded ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={driverProfile?.currentLat ? { lat: driverProfile.currentLat, lng: driverProfile.currentLng } : (currentPosition || DEFAULT_CENTER)} zoom={14} options={mapOptions}>
                      {driverProfile?.currentLat && (
                        <Marker 
                          position={{ lat: driverProfile.currentLat, lng: driverProfile.currentLng }} 
                          icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(35, 35) }}
                        />
                      )}
                      {activeRouteData?.stops && (
                        <Polyline 
                          path={activeRouteData.stops.map((s: any) => ({ lat: s.lat, lng: s.lng }))}
                          options={{ strokeColor: "#00ffff", strokeOpacity: 0.8, strokeWeight: 4 }}
                        />
                      )}
                    </GoogleMap>
                  ) : <div className="h-full flex items-center justify-center text-slate-700 font-black italic text-sm uppercase tracking-widest animate-pulse">Scanning Grid...</div>}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-10 bg-primary text-slate-950 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,255,255,0.3)] flex items-center justify-between cursor-pointer active:scale-95 transition-all group relative overflow-hidden">
                      <div className="space-y-1 relative z-10">
                        <Badge className="bg-slate-950/20 text-slate-950 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">New Mission</Badge>
                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">Find <br/> my Bus</h3>
                      </div>
                      <div className="h-16 w-16 rounded-2xl bg-slate-950/10 flex items-center justify-center text-slate-950 transition-all relative z-10">
                        <Navigation className="h-8 w-8" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-950 border-none rounded-[3rem] p-8 h-[90vh] flex flex-col overflow-hidden shadow-2xl text-white">
                    <DialogHeader className="shrink-0 mb-6">
                      <DialogTitle className="text-3xl font-black italic uppercase text-primary tracking-tighter">Commute Grid</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Route Hubs</Label>
                            <div className="space-y-3">
                               <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-5 font-black italic text-sm outline-none text-white appearance-none">
                                 <option value="" className="bg-slate-950">Pick Start Hub</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-slate-950">{s}</option>)}
                               </select>
                               <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-5 font-black italic text-sm outline-none text-white appearance-none">
                                 <option value="" className="bg-slate-950">Pick Destination</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-slate-950">{s}</option>)}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-4 pb-4">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Active Missions</Label>
                            {filteredTrips.length === 0 ? (
                               <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-slate-700 italic bg-slate-900/50 rounded-2xl border border-dashed border-white/5">No active shuttles</div>
                            ) : filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-6 rounded-2xl border-[2px] transition-all cursor-pointer active:scale-95 ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-slate-950 shadow-lg' : 'bg-slate-900 border-transparent'}`}>
                                <h4 className="font-black uppercase italic text-xl tracking-tighter leading-none">{trip.routeName}</h4>
                                <div className="flex justify-between items-center mt-3">
                                   <Badge className={`${selectedTrip?.id === trip.id ? 'bg-slate-950 text-white' : 'bg-primary/20 text-primary'} border-none text-[8px] font-black uppercase px-3 py-1 rounded-full`}>₹{trip.farePerRider}</Badge>
                                   <p className={`text-[8px] font-black uppercase tracking-widest ${selectedTrip?.id === trip.id ? 'text-slate-950/60' : 'text-slate-500'}`}>{trip.verifiedPassengers?.length || 0} Boarded</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-500">
                          <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-lg text-center">
                             <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-2">Regional UPI ID</p>
                             <h4 className="text-sm font-black text-white italic truncate tracking-tighter">{(globalConfig as any)?.[profile?.city === 'Vizag' ? 'vizagUpiId' : 'vzmUpiId'] || 'hub.aago@upi'}</h4>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Discount Code</Label>
                            <div className="flex gap-2">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="ENTER KEY" className="h-14 bg-slate-900 border-white/5 rounded-xl font-black italic text-lg px-6 text-primary" />
                               <Button onClick={handleApplyVoucher} className="h-14 px-6 bg-white text-slate-950 rounded-xl font-black uppercase italic text-[10px] active:scale-95">Apply</Button>
                            </div>
                          </div>
                          <div className="p-8 bg-primary/10 rounded-[2.5rem] border-[4px] border-primary/20 text-center shadow-inner">
                            <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1 italic">Final Amount</p>
                            <h3 className="text-5xl font-black italic text-white leading-none tracking-tighter">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-6 shrink-0">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-16 bg-primary text-slate-950 rounded-2xl font-black uppercase italic text-lg shadow-lg active:scale-95 transition-all">Confirm Selection</Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-16 bg-green-500 text-slate-950 rounded-2xl font-black uppercase italic text-lg shadow-lg active:scale-95 transition-all">{isBooking ? <Loader2 className="animate-spin h-6 w-6" /> : "Pay & Verify"}</Button>}
                      {bookingStep === 3 && <Button onClick={() => { setBookingStep(1); setSelectedTrip(null); }} className="w-full h-16 bg-white text-slate-950 rounded-2xl font-black uppercase italic text-lg active:scale-95 transition-all">Finish</Button>}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6 bg-slate-900 border border-white/5 shadow-xl rounded-2xl space-y-2 active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Life Missions</p>
                    <div className="flex items-center gap-2">
                      <Bus className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-black text-white italic leading-none">{pastTrips?.length || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-6 bg-accent border-none shadow-xl rounded-2xl space-y-2 active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-900/60 tracking-widest">Eco Savings</p>
                    <div className="flex items-center gap-2 text-slate-900">
                      <Leaf className="h-5 w-5" />
                      <span className="text-2xl font-black italic leading-none">{( (pastTrips?.length || 0) * 0.4 ).toFixed(1)}kg</span>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter pl-1">Live Grid</h2>
            <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900 relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={currentPosition || DEFAULT_CENTER} zoom={13} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} />}
                   {activeTrips?.map((trip: any) => null)}
                 </GoogleMap>
               ) : <div className="h-full flex items-center justify-center text-slate-700 font-black italic animate-pulse">Scanning Satellite...</div>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
             <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter text-glow pl-1">Ride Ledger</h2>
             <div className="space-y-3">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/50 rounded-[2rem] border border-dashed border-white/5 shadow-inner">
                    <History className="h-10 w-10 text-slate-800 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">No mission records</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex justify-between items-center shadow-lg active:scale-95 transition-all">
                      <div className="space-y-1">
                        <h4 className="font-black text-white uppercase italic text-lg leading-none tracking-tighter">{trip.routeName}</h4>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{new Date(trip.endTime).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-lg font-black italic text-primary">₹{trip.farePerRider}</span>
                         <div className="flex items-center justify-end gap-1 mt-1">
                           <span className="text-[10px] font-black text-accent italic">{trip.studentRating || "-"}</span>
                           <Star className="h-3 w-3 fill-accent text-accent" />
                         </div>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in text-center pb-20 pt-6">
             <div className="flex flex-col items-center gap-6">
                <div className="h-32 w-32 rounded-[2.5rem] bg-slate-900 border-4 border-primary/10 flex items-center justify-center shadow-2xl overflow-hidden relative">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-12 w-12 text-slate-800" />}
                </div>
                <div className="space-y-2">
                   <h2 className="text-4xl font-black text-white italic uppercase leading-none tracking-tighter text-glow">{profile?.fullName}</h2>
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{profile?.collegeName}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-3 text-left">
                {[
                  { label: "Identity Check", value: profile?.studentId, icon: ShieldCheck },
                  { label: "Hub Location", value: profile?.city || 'Not Set', icon: MapPin },
                  { label: "Protocol Tier", value: scholarTier.name, icon: Zap }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl flex items-center gap-4 border border-white/5 active:scale-98 transition-all">
                    <div className="h-10 w-10 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-center text-primary shadow-lg"><item.icon className="h-5 w-5" /></div>
                    <div>
                       <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{item.label}</p>
                       <p className="font-black italic text-white uppercase text-lg leading-none tracking-tighter">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-16 bg-red-500/5 text-red-500 rounded-2xl font-black uppercase italic mt-6 border border-red-500/10 active:scale-95 active:bg-red-500 active:text-white transition-all">
                <LogOut className="mr-3 h-5 w-5" /> End Session
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'home' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <LayoutGrid className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('map')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'map' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <MapIcon className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'history' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <History className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Ledger</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'profile' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <UserIcon className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-slate-950 border-none rounded-[3rem] p-10 text-center shadow-2xl text-white">
          <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary tracking-tighter text-center leading-none mb-4 text-glow">Trip Rate</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            <p className="text-sm font-bold text-slate-500 italic">How was your commute hub?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-4 rounded-xl transition-all active:scale-90 ${rating >= star ? 'bg-accent text-slate-950 shadow-lg scale-110' : 'bg-slate-900 text-slate-700'}`}><Star className="h-8 w-8 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-16 w-full bg-primary text-slate-950 font-black uppercase italic text-lg rounded-2xl shadow-xl active:scale-95 transition-all">Sync Feedback</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
