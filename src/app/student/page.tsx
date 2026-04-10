
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
  DialogFooter
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
  UserCheck,
  ChevronRight,
  Clock,
  Target,
  CreditCard,
  Gift,
  Copy,
  Info,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
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

export default function StudentApp() {
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
  
  const { data: activeTrips } = useCollection(useMemo(() => (db) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]));
  
  const globalConfigRef = useMemo(() => db ? doc(db, 'config', 'global') : null, [db]);
  const { data: globalConfig } = useDoc(globalConfigRef);
  
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

  const { data: allUserTrips } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('passengerManifest', 'array-contains-any', [{uid: user.uid}]));
  }, [db, user?.uid]));

  const pastTrips = useMemo(() => allUserTrips?.filter(t => t.status === 'completed') || [], [allUserTrips]);
  const upcomingTrips = useMemo(() => allUserTrips?.filter(t => (t.status === 'active' || t.status === 'scheduled') && t.id !== currentBooking?.id) || [], [allUserTrips, currentBooking]);

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
      setAppliedDiscount(vData.discountAmount);
      toast({ title: "Voucher Applied", description: `₹${vData.discountAmount} off.` });
    }
  };

  const processPaymentSuccess = async (paymentId: string) => {
    if (!db || !userRef || !selectedRoute || !profile) return;
    setIsPaying(true);

    try {
      const finalFare = Math.max(0, calculatedFare - appliedDiscount);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const bookingDetails = {
        uid: user!.uid,
        name: profile.fullName,
        pickup: pickupStop,
        destination: destinationStop,
        bookingDate: bookingDate,
        farePaid: finalFare,
        paymentId: paymentId,
        paymentStatus: 'successful',
        bookedAt: new Date().toISOString()
      };

      const tripQuery = query(collection(db, 'trips'), 
        where('routeName', '==', selectedRoute.routeName), 
        where('scheduledDate', '==', bookingDate), 
        where('status', '==', 'active')
      );
      const tripSnap = await getDocs(tripQuery);
      
      const availableTrip = tripSnap.docs.find(d => {
        const tripData = d.data();
        const manifest = tripData.passengerManifest || [];
        const capacity = tripData.maxCapacity || 7;
        return manifest.length < capacity;
      });

      if (availableTrip) {
        await updateDoc(doc(db, 'trips', availableTrip.id), {
          passengerManifest: arrayUnion(bookingDetails)
        });
      } else {
        await addDoc(collection(db, 'trips'), {
          routeName: selectedRoute.routeName,
          scheduledDate: bookingDate,
          farePerRider: selectedRoute.baseFare,
          status: 'active',
          riderCount: 0,
          passengerManifest: [bookingDetails],
          verifiedPassengers: [],
          maxCapacity: 7,
          createdAt: new Date().toISOString()
        });
      }

      await updateDoc(userRef, { 
        activeOtp: otp, 
        destinationStopName: destinationStop, 
        loyaltyPoints: increment(Math.floor(finalFare / 10)) 
      });
      
      setIsPaying(false);
      setBookingStep(4);
      toast({ title: "Seat Secured", description: "Your mission is active." });
    } catch (e) {
      setIsPaying(false);
      toast({ variant: "destructive", title: "Sync Error", description: "Payment recorded, but sync failed. Contact Hub Support." });
    }
  };

  const initiatePayment = async () => {
    if (typeof window === 'undefined' || !selectedRoute) return;

    const finalAmount = Math.max(0, calculatedFare - appliedDiscount);
    if (finalAmount === 0) {
      await processPaymentSuccess('FREE_BOOKING_' + Date.now());
      return;
    }

    const options = {
      key: "rzp_test_SbhAeIVwQu3pji",
      amount: finalAmount * 100, // paise
      currency: "INR",
      name: "AAGO GRID",
      description: `Ride Booking: ${selectedRoute.routeName}`,
      handler: function (response: any) {
        processPaymentSuccess(response.razorpay_payment_id);
      },
      prefill: {
        name: profile?.fullName || "",
        contact: profile?.phoneNumber || "",
      },
      theme: {
        color: "#00FFFF",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  const copyReferral = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      toast({ title: "Code Copied", description: "Share with your community." });
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset overflow-x-hidden">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20">
            <ConnectingDotsLogo className="h-5 w-5 text-black" />
          </div>
          <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none text-primary text-glow">AAGO</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => { addDoc(collection(db!, 'alerts'), { type: 'SOS', uid: user?.uid, name: profile?.fullName, timestamp: new Date().toISOString() }); toast({ variant: 'destructive', title: 'SOS Broadcasted' }); }} className="text-destructive bg-destructive/10 h-11 w-11 rounded-2xl border border-destructive/20"><ShieldAlert className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={() => { navigator.share({ title: 'AAGO - Smart Rides', url: window.location.origin }); }} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic leading-none">Hello,</p>
                <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter mt-1">{profile?.fullName?.split(' ')[0]}</h2>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/10 min-w-[100px]">
                 <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Rewards</p>
                 <div className="flex items-center justify-center gap-1 text-primary">
                   <Star className="h-4 w-4 fill-primary" />
                   <span className="text-2xl font-black text-foreground italic">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {currentBooking ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-8">
                <Card className="glass-card rounded-[3rem] p-8 shadow-2xl border-primary/30 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12"><Bus className="h-32 w-32 text-primary" /></div>
                   
                   {!isVerified && profile?.activeOtp ? (
                     <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground italic">Boarding Code</p>
                        <h3 className="text-7xl font-black tracking-tighter italic text-primary text-glow leading-none">{profile.activeOtp}</h3>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
                        <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-2 shadow-xl shadow-primary/10">
                          <ShieldCheck className="h-10 w-10" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary italic">In Transit</p>
                        <h3 className="text-2xl font-black tracking-tighter italic text-foreground uppercase leading-none">Mission Active</h3>
                     </div>
                   )}
                   
                   <div className="space-y-4 mb-8 relative z-10">
                      <div className="bg-black/40 p-5 rounded-2xl flex items-center gap-4 border border-white/5">
                         <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Bus className="h-5 w-5" /></div>
                         <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Corridor</p>
                            <p className="text-lg font-black italic uppercase text-foreground leading-none">{currentBooking.routeName}</p>
                         </div>
                      </div>

                      {currentBooking.driverId ? (
                        <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/30">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary bg-primary/10">
                                {currentBooking.driverPhoto ? <img src={currentBooking.driverPhoto} className="h-full w-full object-cover" /> : <UserCheck className="h-full w-full p-2 text-primary" />}
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Operator</p>
                                 <p className="text-xl font-black italic uppercase text-foreground leading-none">{currentBooking.driverName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">{currentBooking.vehicleNumber}</p>
                            </div>
                          </div>
                          <Button onClick={() => setActiveTab('radar')} className="w-full h-14 bg-primary text-black rounded-2xl font-black uppercase italic shadow-xl shadow-primary/10 flex items-center justify-center gap-3 active:scale-95">
                             <Navigation className="h-5 w-5" /> Track Live Radar
                          </Button>
                        </div>
                      ) : (
                        <div className="p-8 bg-black/40 border border-dashed border-white/10 rounded-[2.5rem] text-center flex flex-col items-center gap-4">
                           <Loader2 className="animate-spin h-8 w-8 text-primary opacity-50" />
                           <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase italic text-muted-foreground tracking-widest">Operator Pending</p>
                             <p className="text-[9px] font-bold text-white/40 uppercase">Details shared 2 hours before trip</p>
                           </div>
                        </div>
                      )}
                   </div>
                </Card>
              </div>
            ) : (
              <Dialog onOpenChange={(open) => { if (!open) { setBookingStep(1); setSelectedRoute(null); setPickupStop(""); setDestinationStop(""); setAppliedDiscount(0); setVoucherCode(""); } }}>
                <DialogTrigger asChild>
                  <div className="p-12 bg-primary text-black rounded-[3rem] shadow-2xl flex flex-col gap-2 cursor-pointer active:scale-95 transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-5xl font-black italic uppercase tracking-tighter relative z-10 leading-none">Book <br/> Ride</h3>
                    <div className="flex items-center justify-between mt-4 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Scan Active Grid</p>
                      <Navigation className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-background border-white/5 rounded-[2.5rem] p-8 h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                  <DialogHeader className="shrink-0 mb-6">
                    <DialogTitle className="text-3xl font-black italic uppercase text-primary tracking-tighter">
                      {bookingStep === 1 ? "Corridors" : bookingStep === 2 ? "Schedule" : bookingStep === 3 ? "Payment" : "Done"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        {activeRoutes?.length === 0 ? (
                          <div className="p-20 text-center italic text-muted-foreground flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin h-8 w-8 opacity-20" />
                            <p className="text-[10px] uppercase font-black tracking-widest">Updating Grid Corridors...</p>
                          </div>
                        ) : activeRoutes?.map((route: any) => (
                          <div key={route.id} onClick={() => { setSelectedRoute(route); setBookingStep(2); }} className="p-8 bg-white/5 border border-white/10 rounded-3xl cursor-pointer hover:border-primary/50 hover:bg-white/10 transition-all flex justify-between items-center group">
                             <div className="space-y-1">
                                <h4 className="text-xl font-black italic uppercase text-foreground group-hover:text-primary transition-colors">{route.routeName}</h4>
                                <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">₹{route.baseFare} Base Fee</p>
                             </div>
                             <ChevronRight className="h-6 w-6 text-white/10 group-hover:text-primary transition-colors" />
                          </div>
                        ))}
                      </div>
                    )}

                    {bookingStep === 2 && selectedRoute && (
                      <div className="space-y-8 animate-in slide-in-from-right-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Select Date</Label>
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                             {[0, 1, 2, 3, 4].map((day) => {
                               const date = addDays(new Date(), day);
                               const dateStr = format(date, 'yyyy-MM-dd');
                               return (
                                 <Button key={day} onClick={() => setBookingDate(dateStr)} variant={bookingDate === dateStr ? 'default' : 'outline'} className={`h-14 rounded-2xl shrink-0 font-black italic px-6 ${bookingDate === dateStr ? 'bg-primary text-black border-none shadow-lg' : 'text-muted-foreground border-white/10 bg-white/5'}`}>
                                   {day === 0 ? 'Today' : format(date, 'EEE, dd')}
                                 </Button>
                               );
                             })}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-4">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2 flex items-center gap-2"><MapPin className="h-3 w-3" /> Pickup Hub</Label>
                             <div className="grid grid-cols-1 gap-2">
                               {selectedRoute.stops.map((stop: any, i: number) => (
                                 <button key={i} disabled={i === selectedRoute.stops.length - 1} onClick={() => setPickupStop(stop.name)} className={`p-5 rounded-2xl border text-left font-black italic text-sm transition-all ${pickupStop === stop.name ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'}`}>
                                   {stop.name}
                                 </button>
                               ))}
                             </div>
                          </div>

                          <div className="space-y-4">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2 flex items-center gap-2"><Target className="h-3 w-3" /> Destination Hub</Label>
                             <div className="grid grid-cols-1 gap-2">
                               {selectedRoute.stops.map((stop: any, i: number) => {
                                 const pIdx = selectedRoute.stops.findIndex((s: any) => s.name === pickupStop);
                                 const isDisabled = pIdx === -1 || i <= pIdx;
                                 return (
                                   <button key={i} disabled={isDisabled} onClick={() => setDestinationStop(stop.name)} className={`p-5 rounded-2xl border text-left font-black italic text-sm transition-all ${isDisabled ? 'opacity-10 cursor-not-allowed' : destinationStop === stop.name ? 'bg-accent/20 border-accent text-accent shadow-lg shadow-accent/10' : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'}`}>
                                     {stop.name}
                                   </button>
                                 );
                               })}
                             </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-8 py-4 animate-in zoom-in-95">
                         <div className="p-8 bg-black/40 rounded-[2.5rem] text-center space-y-3 border border-white/5">
                            <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Grid Settlement</p>
                            <h4 className="text-xl font-black italic text-foreground uppercase tracking-widest">{profile?.city} Gateway</h4>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-2 italic flex items-center justify-center gap-2">
                               <ShieldCheck className="h-3 w-3 text-primary" /> Secure Razorpay Interface
                            </p>
                         </div>
                         <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-3">Voucher Entry</Label>
                           <div className="flex gap-3">
                              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="AAGO50" className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl font-black italic px-6 uppercase tracking-widest outline-none focus:border-primary transition-colors" />
                              <Button onClick={handleApplyVoucher} variant="outline" className="h-16 px-8 rounded-2xl font-black italic text-primary border-primary/30 hover:bg-primary/10">Apply</Button>
                           </div>
                         </div>
                         <div className="p-12 bg-primary/5 rounded-[3.5rem] text-center border-2 border-primary/20 shadow-2xl">
                            <p className="text-[10px] font-black uppercase text-primary mb-3 tracking-[0.4em]">Final Fare</p>
                            <h3 className="text-7xl font-black italic text-foreground tracking-tighter leading-none">₹{Math.max(0, calculatedFare - appliedDiscount)}</h3>
                         </div>
                         {isPaying && (
                           <div className="fixed inset-0 bg-background/90 z-[100] flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
                              <div className="bg-primary/10 p-10 rounded-[3rem] border border-primary/20 space-y-6">
                                <Loader2 className="animate-spin h-16 w-16 text-primary mx-auto" />
                                <div className="space-y-2">
                                  <h3 className="text-2xl font-black italic uppercase text-primary">Verifying Transaction</h3>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Grid Sync Protocol Active</p>
                                </div>
                              </div>
                           </div>
                         )}
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="flex flex-col items-center justify-center text-center space-y-8 py-20 animate-in zoom-in-95">
                         <div className="h-32 w-32 bg-primary text-black rounded-full flex items-center justify-center shadow-2xl animate-bounce"><CheckCircle2 className="h-16 w-16" /></div>
                         <div className="space-y-3">
                            <h3 className="text-5xl font-black italic uppercase text-primary tracking-tighter leading-none">Mission <br/> Secured</h3>
                            <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest px-6 mt-4">Seat confirmed on the Grid. View boarding pass on Home.</p>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 shrink-0 border-t border-white/5">
                    {bookingStep === 1 && <Button variant="ghost" onClick={() => setBookingStep(1)} className="w-full text-muted-foreground font-black uppercase italic tracking-widest h-14">Close Portal</Button>}
                    {bookingStep === 2 && <Button onClick={() => setBookingStep(3)} disabled={!pickupStop || !destinationStop} className="w-full h-18 bg-primary text-black rounded-[2rem] font-black uppercase italic text-xl shadow-2xl active:scale-95">Next Segment</Button>}
                    {bookingStep === 3 && <Button onClick={initiatePayment} disabled={isPaying} className="w-full h-20 bg-primary text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-2xl active:scale-95 flex items-center justify-center gap-3">
                      {isPaying ? <Loader2 className="animate-spin h-8 w-8" /> : <><CreditCard className="h-7 w-7" /> Pay ₹{Math.max(0, calculatedFare - appliedDiscount)}</>}
                    </Button>}
                    {bookingStep === 4 && <DialogTrigger asChild><Button className="w-full h-18 bg-white/5 rounded-[2rem] font-black uppercase italic text-lg">Return to Grid</Button></DialogTrigger>}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Gift className="h-6 w-6" /></div>
                 <h4 className="text-xl font-black italic uppercase tracking-tighter">Referral Hub</h4>
              </div>
              <p className="text-xs font-bold text-muted-foreground italic px-2 leading-relaxed">Refer a friend to the Grid and earn 50 Scholar Points instantly upon their first journey.</p>
              <div className="flex gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                 <p className="flex-1 font-black italic text-foreground uppercase tracking-widest pt-2.5 px-2">{profile?.referralCode || 'GEN-PENDING'}</p>
                 <Button onClick={copyReferral} variant="ghost" className="h-10 w-10 p-0 text-primary hover:bg-primary/10"><Copy className="h-5 w-5" /></Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="flex-1 flex flex-col space-y-6 h-[calc(100vh-220px)] animate-in fade-in">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Live Radar</h2>
               <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" /> Grid Syncing
               </Badge>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4">
               {isVerified ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-accent animate-pulse" />}
               <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isVerified ? 'text-primary' : 'text-accent'}`}>{isVerified ? 'Mission In Progress' : 'Safety Sync Active'}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 italic leading-tight">{isVerified ? 'Operator hub linked with scholar telemetry.' : `SOS Protocol synchronized with hub alerts.`}</p>
               </div>
            </div>

            <div className="flex-1 rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={15} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: '#00FFFF', fillOpacity: 1, scale: 8, strokeColor: '#FFFFFF', strokeWeight: 2 }} />}
                   {activeTrips?.map((trip: any) => trip.currentLat && (
                     <Marker 
                        key={trip.id} 
                        position={{ lat: trip.currentLat, lng: trip.currentLng }} 
                        title={trip.routeName}
                        icon={trip.driverId === currentBooking?.driverId ? { 
                          path: 'M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z',
                          fillColor: '#00FFFF', 
                          fillOpacity: 1, 
                          scale: 1.5, 
                          strokeColor: '#FFFFFF', 
                          strokeWeight: 1,
                        } : { 
                          path: google.maps.SymbolPath.CIRCLE,
                          fillColor: '#00FFFF', 
                          fillOpacity: 0.3, 
                          scale: 6,
                          strokeColor: '#00FFFF',
                          strokeWeight: 1
                        }}
                     />
                   ))}
                 </GoogleMap>
               ) : <div className="h-full w-full flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-12">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">Mission Log</h2>
             
             <div className="space-y-6">
               {upcomingTrips.length > 0 && (
                 <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-primary ml-4">Scheduled Missions</p>
                   {upcomingTrips.map((trip: any) => (
                      <Card key={trip.id} className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-8 flex justify-between items-center group">
                         <div className="space-y-2">
                            <h4 className="font-black text-foreground uppercase italic text-xl leading-none">{trip.routeName}</h4>
                            <div className="flex items-center gap-3">
                               <Badge className="bg-primary text-black text-[8px] font-black uppercase px-3 py-0.5 rounded-full">Secure</Badge>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2"><Clock className="h-3 w-3" /> {trip.scheduledDate}</p>
                            </div>
                         </div>
                         <ArrowRight className="h-6 w-6 text-primary/40" />
                      </Card>
                   ))}
                 </div>
               )}

               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Past Travels</p>
                  {pastTrips?.length === 0 ? (
                    <div className="p-24 text-center italic text-muted-foreground bg-white/5 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
                       <History className="h-12 w-12 opacity-10" />
                       <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">No past logs found on the Grid.</p>
                    </div>
                  ) : [...pastTrips].sort((a,b) => b.endTime.localeCompare(a.endTime)).map((trip: any) => (
                    <Card key={trip.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex justify-between items-center shadow-xl group hover:border-primary/30 transition-all">
                      <div className="space-y-1">
                        <h4 className="font-black text-foreground uppercase italic text-xl leading-none group-hover:text-primary transition-colors">{trip.routeName}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-2"><Clock className="h-3 w-3" /> {new Date(trip.endTime).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-2xl font-black italic text-primary">₹{trip.passengerManifest?.find((m:any) => m.uid === user?.uid)?.farePaid || trip.farePerRider}</span>
                      </div>
                    </Card>
                  ))}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in">
             <div className="flex flex-col items-center gap-6">
                <div className="h-44 w-44 rounded-full border-[10px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-primary/20" />}
                </div>
                <div className="space-y-2">
                   <h2 className="text-5xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                   <div className="flex flex-col items-center gap-2">
                      <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black tracking-widest px-6 py-1.5 rounded-full">{profile?.city} GRID HUB</Badge>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Scholar ID: {profile?.studentId || 'N/A'}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 text-center">
                   <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Grid Rating</p>
                   <p className="text-2xl font-black italic text-foreground">5.0</p>
                </div>
                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 text-center">
                   <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Tier</p>
                   <p className="text-2xl font-black italic text-primary">Elite</p>
                </div>
             </div>

             <Button variant="ghost" onClick={handleSignOut} className="w-full max-w-sm mx-auto h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border border-destructive/20 text-xl shadow-xl shadow-destructive/5 hover:bg-destructive hover:text-white transition-all group">
                <LogOut className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" /> De-Authenticate Grid
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <LayoutGrid className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Grid</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('radar')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'radar' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <Zap className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <History className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Log</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl transition-all ${activeTab === 'me' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <UserIcon className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
