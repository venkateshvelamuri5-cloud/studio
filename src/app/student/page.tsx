
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Bus, 
  MapPin, 
  Navigation,
  LogOut,
  Loader2,
  History,
  User as UserIcon,
  Star,
  LayoutGrid,
  Share2,
  ShieldAlert,
  Zap,
  CheckCircle2,
  ChevronRight,
  Clock,
  Target,
  CreditCard,
  Gift,
  Copy,
  ShieldCheck,
  ArrowRight,
  ZapIcon,
  Info
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc, limit, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/signOut';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';
import { format, addDays } from 'date-fns';

const mapContainerStyle = { width: '100%', height: '100%' };
const mapOptions = { 
  disableDefaultUI: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#020617" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#00FFFF" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] }
  ]
};
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 };

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function RiderApp() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'radar' | 'history' | 'me'>('home');
  const [bookingStep, setBookingStep] = useState(1); 
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [pickupStop, setPickupStop] = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: googleMapsApiKey });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: activeRoutes } = useCollection(useMemo(() => (db) ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]));
  
  const { data: activeTrips } = useCollection(useMemo(() => (db) ? query(collection(db, 'trips'), where('status', 'in', ['active', 'scheduled'])) : null, [db]));
  
  const currentBooking = useMemo(() => {
    if (!activeTrips || !user?.uid) return null;
    return activeTrips.find(t => 
      t.verifiedPassengers?.includes(user.uid) || 
      t.passengerManifest?.some((m: any) => m.uid === user.uid)
    );
  }, [activeTrips, user?.uid]);

  const isVerified = useMemo(() => {
    return currentBooking?.verifiedPassengers?.includes(user?.uid);
  }, [currentBooking, user?.uid]);

  const pastTrips = useMemo(() => {
    if (!activeTrips || !user?.uid) return [];
    return activeTrips.filter(t => t.status === 'completed');
  }, [activeTrips, user?.uid]);

  const calculatedFare = useMemo(() => {
    if (!selectedRoute || !pickupStop || !destinationStop) return 0;
    const stops = selectedRoute.stops || [];
    const pIdx = stops.findIndex((s: any) => s.name === pickupStop);
    const dIdx = stops.findIndex((s: any) => s.name === destinationStop);
    if (pIdx === -1 || dIdx === -1 || dIdx <= pIdx) return 0;
    
    const segmentLength = dIdx - pIdx;
    const totalSegments = stops.length - 1;
    const proration = segmentLength / totalSegments;
    return Math.ceil(selectedRoute.baseFare * proration);
  }, [selectedRoute, pickupStop, destinationStop]);

  const mapCenter = useMemo(() => {
    if (currentBooking?.currentLat && currentBooking?.currentLng) return { lat: currentBooking.currentLat, lng: currentBooking.currentLng };
    if (currentPosition) return currentPosition;
    return DEFAULT_CENTER;
  }, [currentPosition, currentBooking]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true), limit(1));
    const snap = await getDocs(vQuery);
    if (snap.empty) {
      toast({ variant: "destructive", title: "Invalid Voucher" });
      setAppliedDiscount(0);
    } else {
      const vData = snap.docs[0].data();
      setAppliedDiscount(vData.discountAmount || vData.amount);
      toast({ title: "Discount Active" });
    }
  };

  const processPaymentSuccess = async (paymentId: string) => {
    if (!db || !userRef || !selectedRoute || !profile) return;
    setIsPaying(true);

    try {
      const finalFare = Math.max(0, calculatedFare - appliedDiscount);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const riderEntry = {
        uid: user!.uid,
        name: profile.fullName,
        pickup: pickupStop,
        destination: destinationStop,
        bookingDate: bookingDate,
        farePaid: finalFare,
        paymentId: paymentId,
        bookedAt: new Date().toISOString()
      };

      // Fill first car logic: Find existing active trip for this route/date that is NOT full
      const tripQuery = query(
        collection(db, 'trips'), 
        where('routeName', '==', selectedRoute.routeName), 
        where('scheduledDate', '==', bookingDate), 
        where('status', '==', 'active')
      );
      const tripSnap = await getDocs(tripQuery);
      
      // Find the trip with the most passengers that still has room (Maximized Capacity)
      const existingTrips = tripSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const targetTrip = existingTrips
        .filter((t: any) => (t.passengerManifest?.length || 0) < (t.maxCapacity || 7))
        .sort((a: any, b: any) => (b.passengerManifest?.length || 0) - (a.passengerManifest?.length || 0))[0];

      if (targetTrip) {
        await updateDoc(doc(db, 'trips', targetTrip.id), {
          passengerManifest: arrayUnion(riderEntry),
          riderCount: increment(1)
        });
      } else {
        // Create new queued trip if none exist or all are full
        await addDoc(collection(db, 'trips'), {
          routeName: selectedRoute.routeName,
          scheduledDate: bookingDate,
          status: 'active',
          riderCount: 1,
          maxCapacity: 7,
          farePerRider: selectedRoute.baseFare,
          passengerManifest: [riderEntry],
          verifiedPassengers: [],
          createdAt: new Date().toISOString()
        });
      }

      await updateDoc(userRef, { 
        activeOtp: otp, 
        loyaltyPoints: increment(Math.floor(finalFare / 10)) 
      });
      
      setIsPaying(false);
      setBookingStep(4);
      toast({ title: "Joined Demand Pool", description: "Successfully queued for the grid." });
    } catch (e) {
      setIsPaying(false);
      toast({ variant: "destructive", title: "Booking Error" });
    }
  };

  const initiatePayment = async () => {
    if (typeof window === 'undefined' || !selectedRoute) return;
    const finalAmount = Math.max(0, calculatedFare - appliedDiscount);
    if (finalAmount === 0) {
      await processPaymentSuccess('FREE_GRID_PROMO_' + Date.now());
      return;
    }

    const options = {
      key: "rzp_test_SbhAeIVwQu3pji",
      amount: finalAmount * 100, 
      currency: "INR",
      name: "AAGO GRID",
      description: `Ride: ${selectedRoute.routeName}`,
      handler: (res: any) => processPaymentSuccess(res.razorpay_payment_id),
      prefill: { name: profile?.fullName || "", contact: profile?.phoneNumber || "" },
      theme: { color: "#00FFFF" },
      modal: { ondismiss: () => setIsPaying(false) }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset overflow-x-hidden">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black">
            <ConnectingDotsLogo className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-black italic uppercase text-primary">AAGO GRID</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => toast({ title: "SOS ALERT SENT" })} className="text-destructive bg-destructive/10 h-11 w-11 rounded-2xl border border-destructive/20"><ShieldAlert className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic">Grid Member</p>
                <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{profile?.fullName?.split(' ')[0]}</h2>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-2">
                 <Star className="h-4 w-4 text-primary fill-primary" />
                 <span className="text-xl font-black">{profile?.loyaltyPoints || 0}</span>
              </div>
            </div>

            {currentBooking ? (
              <Card className="glass-card rounded-[3rem] p-8 shadow-2xl border-primary/30 relative overflow-hidden">
                 <div className="flex flex-col items-center gap-4 mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground italic">
                      {currentBooking.status === 'scheduled' ? 'Journey Status' : 'Queued for Grid'}
                    </p>
                    <h3 className="text-6xl font-black tracking-tighter italic text-primary text-glow leading-none">
                      {isVerified ? 'LIVE' : profile?.activeOtp}
                    </h3>
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                      <Clock className="h-3 w-3 text-primary" />
                      <span className="text-[9px] font-black uppercase text-primary">Departure: {currentBooking.scheduledDate}</span>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="bg-black/40 p-5 rounded-3xl border border-white/5 flex items-center gap-4">
                       <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Navigation className="h-5 w-5" /></div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Active Corridor</p>
                          <p className="text-lg font-black italic uppercase text-foreground leading-none">{currentBooking.routeName}</p>
                       </div>
                    </div>

                    {currentBooking.driverId ? (
                      <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/30 space-y-4">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary overflow-hidden">
                              {currentBooking.driverPhoto ? <img src={currentBooking.driverPhoto} className="h-full w-full object-cover" /> : <UserIcon className="h-6 w-6 text-primary" />}
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase text-primary">Assigned Driver</p>
                              <p className="text-lg font-black italic uppercase leading-none">{currentBooking.driverName}</p>
                           </div>
                        </div>
                        <div className="p-4 bg-black/60 rounded-2xl flex items-center gap-3">
                           <Info className="h-4 w-4 text-primary" />
                           <p className="text-[9px] font-black text-muted-foreground uppercase leading-relaxed">
                             Vehicle details will be shared 2 hours before the ride.
                           </p>
                        </div>
                        <Button onClick={() => setActiveTab('radar')} className="w-full h-14 bg-primary text-black rounded-2xl font-black uppercase italic shadow-lg flex items-center justify-center gap-3">
                           <Zap className="h-5 w-5" /> Live Radar
                        </Button>
                      </div>
                    ) : (
                      <div className="p-10 bg-black/40 border border-dashed border-white/10 rounded-[2.5rem] text-center space-y-4">
                         <div className="flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary opacity-50" /></div>
                         <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase italic text-primary tracking-widest">Maximizing Capacity</p>
                           <p className="text-[9px] font-bold text-white/30 uppercase max-w-[200px] mx-auto">Details shared 2 hours before departure as grid stabilizes.</p>
                         </div>
                      </div>
                    )}
                 </div>
              </Card>
            ) : (
              <Dialog onOpenChange={(open) => { if (!open) setBookingStep(1); }}>
                <DialogTrigger asChild>
                  <div className="p-12 bg-primary text-black rounded-[3rem] shadow-2xl flex flex-col gap-2 cursor-pointer active:scale-95 transition-all group overflow-hidden relative">
                    <h3 className="text-5xl font-black italic uppercase tracking-tighter relative z-10 leading-none">Find <br/> Ride</h3>
                    <div className="flex items-center justify-between mt-4 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Join Demand Pool</p>
                      <ArrowRight className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-background border-white/5 rounded-[2.5rem] p-8 h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                  <DialogHeader className="shrink-0 mb-4">
                    <DialogTitle className="text-3xl font-black italic uppercase text-primary">
                      {bookingStep === 1 ? "Corridors" : bookingStep === 2 ? "Schedule" : bookingStep === 3 ? "Payment" : "Synced"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                    {bookingStep === 1 && (
                      <div className="space-y-3">
                        {activeRoutes?.map((route: any) => (
                          <div key={route.id} onClick={() => { setSelectedRoute(route); setBookingStep(2); }} className="p-8 bg-white/5 border border-white/10 rounded-3xl cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group">
                             <div>
                                <h4 className="text-xl font-black italic uppercase group-hover:text-primary transition-colors">{route.routeName}</h4>
                                <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">₹{route.baseFare} Base Fare</p>
                             </div>
                             <ChevronRight className="h-6 w-6 text-white/10" />
                          </div>
                        ))}
                      </div>
                    )}

                    {bookingStep === 2 && (
                      <div className="space-y-8 animate-in slide-in-from-right-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Travel Date</Label>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                             {[0, 1, 2, 3].map((day) => {
                               const d = addDays(new Date(), day);
                               const dStr = format(d, 'yyyy-MM-dd');
                               return (
                                 <Button key={day} onClick={() => setBookingDate(dStr)} variant={bookingDate === dStr ? 'default' : 'outline'} className={`h-14 rounded-2xl shrink-0 font-black italic px-6 ${bookingDate === dStr ? 'bg-primary text-black' : 'border-white/10 text-muted-foreground'}`}>
                                   {day === 0 ? 'Today' : format(d, 'EEE, dd')}
                                 </Button>
                               );
                             })}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Stops</Label>
                          <div className="grid gap-2">
                             {selectedRoute?.stops.map((s: any, i: number) => (
                               <button key={i} onClick={() => !pickupStop ? setPickupStop(s.name) : setDestinationStop(s.name)} className={`p-5 rounded-2xl border text-left font-black italic text-sm transition-all ${pickupStop === s.name ? 'bg-primary/20 border-primary text-primary' : destinationStop === s.name ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/5 text-muted-foreground'}`}>
                                 {s.name} {pickupStop === s.name && "(Pickup)"} {destinationStop === s.name && "(Drop)"}
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-8 py-4 text-center">
                         <div className="p-12 bg-primary/5 rounded-[3.5rem] border-2 border-primary/20 shadow-2xl">
                            <p className="text-[10px] font-black uppercase text-primary mb-3 tracking-[0.4em]">Fixed Fare</p>
                            <h3 className="text-7xl font-black italic tracking-tighter leading-none">₹{Math.max(0, calculatedFare - appliedDiscount)}</h3>
                         </div>
                         <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground">Redeem Points</Label>
                           <div className="flex gap-2">
                              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="CODE" className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl font-black italic px-6 uppercase tracking-widest outline-none focus:border-primary" />
                              <Button onClick={handleApplyVoucher} variant="outline" className="h-16 px-8 rounded-2xl font-black italic text-primary border-primary/30">Apply</Button>
                           </div>
                         </div>
                         <div className="p-6 bg-black/60 rounded-[2rem] border border-white/5 text-left space-y-2">
                            <p className="text-[9px] font-black uppercase text-primary flex items-center gap-2"><Info className="h-3 w-3" /> Demand Pool Logic</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase italic leading-relaxed">
                              You are joining a queue to maximize vehicle capacity. Confirmation and driver details will be shared 2 hours before the trip.
                            </p>
                         </div>
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="flex flex-col items-center justify-center text-center space-y-8 py-20">
                         <div className="h-32 w-32 bg-primary text-black rounded-full flex items-center justify-center shadow-2xl animate-bounce"><CheckCircle2 className="h-16 w-16" /></div>
                         <h3 className="text-5xl font-black italic uppercase text-primary tracking-tighter leading-none">Queued <br/> Successfully</h3>
                         <p className="text-xs font-bold text-muted-foreground italic uppercase tracking-widest px-6">Grid is being synchronized. Details shared 2h before departure.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 shrink-0 border-t border-white/5">
                    {bookingStep === 2 && <Button onClick={() => setBookingStep(3)} disabled={!pickupStop || !destinationStop} className="w-full h-18 bg-primary text-black rounded-[2rem] font-black uppercase italic text-xl shadow-2xl active:scale-95">Continue</Button>}
                    {bookingStep === 3 && <Button onClick={initiatePayment} disabled={isPaying} className="w-full h-20 bg-primary text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-2xl flex items-center justify-center gap-3">
                      {isPaying ? <Loader2 className="animate-spin h-8 w-8" /> : <><ZapIcon className="h-6 w-6" /> Pay with UPI ₹{Math.max(0, calculatedFare - appliedDiscount)}</>}
                    </Button>}
                    {bookingStep === 4 && <DialogTrigger asChild><Button className="w-full h-18 bg-white/5 rounded-[2rem] font-black uppercase italic">Back to Home</Button></DialogTrigger>}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Gift className="h-6 w-6" /></div>
                 <h4 className="text-xl font-black italic uppercase">Grid Referrals</h4>
              </div>
              <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">Refer a community member and get 50 loyalty points instantly. More friends, cheaper rides.</p>
              <div className="flex gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                 <p className="flex-1 font-black italic text-foreground uppercase tracking-widest pt-2.5 px-2">{profile?.referralCode || '...'}</p>
                 <Button variant="ghost" className="text-primary"><Copy className="h-5 w-5" /></Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="flex-1 flex flex-col space-y-6 h-[calc(100vh-220px)] animate-in fade-in">
            <h2 className="text-3xl font-black italic uppercase text-foreground tracking-tighter pl-2">Live Radar</h2>
            <div className="flex-1 rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={15} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: '#00FFFF', fillOpacity: 1, scale: 8, strokeColor: '#FFFFFF', strokeWeight: 2 }} />}
                   {currentBooking?.currentLat && (
                     <Marker position={{ lat: currentBooking.currentLat, lng: currentBooking.currentLng }} icon={{ path: 'M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z', fillColor: '#00FFFF', fillOpacity: 1, scale: 1.5, strokeColor: '#FFFFFF', strokeWeight: 1 }} />
                   )}
                 </GoogleMap>
               ) : <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-12">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">Journey Log</h2>
             <div className="space-y-4">
                {pastTrips.length === 0 ? (
                  <div className="p-20 text-center italic text-muted-foreground bg-white/5 rounded-[3rem] border border-dashed border-white/10 opacity-30">No recorded missions</div>
                ) : pastTrips.map((t: any) => (
                  <Card key={t.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex justify-between items-center shadow-xl">
                    <div className="space-y-1">
                      <h4 className="font-black text-foreground uppercase italic text-xl leading-none">{t.routeName}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{t.scheduledDate}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-2xl font-black italic text-primary">₹{t.farePerRider}</span>
                    </div>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in">
             <div className="flex flex-col items-center gap-6">
                <div className="h-40 w-40 rounded-full border-[8px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-2xl relative">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-primary/20" />}
                </div>
                <div className="space-y-2">
                   <h2 className="text-5xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                   <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black tracking-widest px-6 py-1.5 rounded-full">GRID MEMBER</Badge>
                </div>
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full max-w-sm mx-auto h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border border-destructive/20 text-xl shadow-xl hover:bg-destructive hover:text-white transition-all">
                <LogOut className="mr-3 h-6 w-6" /> Logout
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <LayoutGrid className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Grid</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('radar')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'radar' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <Zap className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <History className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'me' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <UserIcon className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
