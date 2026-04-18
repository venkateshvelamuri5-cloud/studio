
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
  Info,
  CalendarDays
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc, limit, orderBy } from 'firebase/firestore';
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
    { elementType: "labels.text.fill", stylers: [{ color: "#EAB308" }] },
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
  const { data: allTrips } = useCollection(useMemo(() => (db) ? query(collection(db, 'trips'), where('status', 'in', ['active', 'scheduled', 'on-trip'])) : null, [db]));
  
  const currentBooking = useMemo(() => {
    if (!allTrips || !user?.uid) return null;
    return allTrips.find(t => 
      t.passengerManifest?.some((m: any) => m.uid === user.uid)
    );
  }, [allTrips, user?.uid]);

  const bookingManifestEntry = useMemo(() => {
    if (!currentBooking || !user?.uid) return null;
    return currentBooking.passengerManifest?.find((m: any) => m.uid === user.uid);
  }, [currentBooking, user?.uid]);

  const isVerified = useMemo(() => {
    return currentBooking?.verifiedPassengers?.includes(user?.uid);
  }, [currentBooking, user?.uid]);

  const calculatedFare = useMemo(() => {
    if (!selectedRoute || !pickupStop || !destinationStop) return 0;
    const stops = selectedRoute.stops || [];
    const pIdx = stops.findIndex((s: any) => s.name === pickupStop);
    const dIdx = stops.findIndex((s: any) => s.name === destinationStop);
    if (pIdx === -1 || dIdx === -1 || dIdx <= pIdx) return selectedRoute.baseFare;
    
    const segmentsTraveled = dIdx - pIdx;
    const totalSegments = stops.length - 1;
    const fare = (selectedRoute.baseFare / totalSegments) * segmentsTraveled;
    return Math.max(15, Math.ceil(fare));
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

  const handleShareTracking = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AAGO - Live Journey Tracking',
          text: `Track my ride on AAGO: ${currentBooking?.routeName}. Boarding Code: ${profile?.activeOtp}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(`${window.location.href}`);
      toast({ title: "Link Copied", description: "Share the URL to track live." });
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

      const tripQuery = query(
        collection(db, 'trips'), 
        where('routeName', '==', selectedRoute.routeName), 
        where('scheduledDate', '==', bookingDate), 
        where('status', '==', 'active')
      );
      const tripSnap = await getDocs(tripQuery);
      
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
      toast({ title: "Mission Synchronized", description: "Ride locked in the grid." });
    } catch (e) {
      setIsPaying(false);
      toast({ variant: "destructive", title: "Sync Failed" });
    }
  };

  const initiatePayment = async () => {
    if (typeof window === 'undefined' || !selectedRoute) return;
    const finalAmount = Math.max(0, calculatedFare - appliedDiscount);
    
    const options = {
      key: "rzp_test_SbhAeIVwQu3pji",
      amount: finalAmount * 100, 
      currency: "INR",
      name: "AAGO GRID",
      description: `Corridor: ${selectedRoute.routeName}`,
      handler: (res: any) => processPaymentSuccess(res.razorpay_payment_id),
      prefill: { name: profile?.fullName || "", contact: profile?.phoneNumber || "" },
      theme: { color: "#EAB308" },
      modal: { ondismiss: () => setIsPaying(false) },
      config: {
        display: {
          blocks: {
            upi: {
              name: "Pay via UPI",
              instruments: [{ method: "upi" }]
            }
          },
          sequence: ["block.upi"]
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset overflow-x-hidden">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20">
            <ConnectingDotsLogo className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-black italic uppercase text-primary tracking-tighter">AAGO GRID</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => toast({ title: "SOS ALERT SENT" })} className="text-destructive bg-destructive/10 h-11 w-11 rounded-2xl border border-destructive/20"><ShieldAlert className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={handleShareTracking} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-50">Member Terminal</p>
                <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter">{profile?.fullName?.split(' ')[0]}</h2>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center gap-2 shadow-inner">
                 <Star className="h-5 w-5 text-primary fill-primary" />
                 <span className="text-2xl font-black text-primary">{profile?.loyaltyPoints || 0}</span>
              </div>
            </div>

            {currentBooking ? (
              <Card className="glass-card rounded-[3.5rem] p-10 shadow-2xl border-primary/30 relative overflow-hidden bg-gradient-to-b from-card to-background">
                 <div className="flex flex-col items-center gap-4 mb-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">
                      {currentBooking.status === 'active' ? 'Syncing Mission...' : 'Mission Synchronized'}
                    </p>
                    <h3 className="text-7xl font-black tracking-tighter italic text-primary text-glow leading-none">
                      {(currentBooking.status === 'scheduled' || currentBooking.status === 'on-trip' || isVerified) ? 'SYNCED' : profile?.activeOtp}
                    </h3>
                    <div className="flex flex-col gap-2 mt-4">
                       <div className="flex items-center justify-center gap-2 bg-primary/10 px-6 py-2 rounded-full border border-primary/20">
                          <CalendarDays className="h-3 w-3 text-primary" />
                          <span className="text-[9px] font-black uppercase text-primary">Mission: {currentBooking.scheduledDate}</span>
                       </div>
                       {bookingManifestEntry?.bookedAt && (
                         <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Booked: {new Date(bookingManifestEntry.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       )}
                    </div>
                 </div>
                 
                 <div className="space-y-5">
                    <div className="bg-black/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center gap-5 shadow-inner">
                       <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><Navigation className="h-6 w-6" /></div>
                       <div className="flex-1">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Corridor Node</p>
                          <p className="text-xl font-black italic uppercase text-foreground leading-none mt-1">{currentBooking.routeName}</p>
                       </div>
                    </div>

                    {(currentBooking.status === 'scheduled' || currentBooking.status === 'on-trip') ? (
                      <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/30 space-y-6 shadow-xl">
                        <div className="flex items-center gap-5">
                           <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center border-2 border-primary overflow-hidden shadow-lg">
                              {currentBooking.driverPhoto ? <img src={currentBooking.driverPhoto} className="h-full w-full object-cover" /> : <UserIcon className="h-8 w-8 text-primary" />}
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase text-primary tracking-widest">Grid Operator</p>
                              <p className="text-xl font-black italic uppercase leading-none mt-1">{currentBooking.driverName || 'Operator 101'}</p>
                           </div>
                        </div>
                        <Button onClick={() => setActiveTab('radar')} className="w-full h-16 bg-primary text-black rounded-3xl font-black uppercase italic shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                           <Zap className="h-6 w-6" /> Track Grid Radar
                        </Button>
                      </div>
                    ) : (
                      <div className="p-10 bg-black/40 border border-dashed border-white/10 rounded-[3rem] text-center space-y-5">
                         <div className="flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-50" /></div>
                         <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase italic text-primary tracking-widest">Synchronizing Details</p>
                           <p className="text-[9px] font-bold text-white/30 uppercase max-w-[240px] mx-auto leading-relaxed">
                             Grid is optimizing the route for the best possible experience. Operator details will be released 3 hours before departure.
                           </p>
                         </div>
                      </div>
                    )}
                 </div>
              </Card>
            ) : (
              <Dialog onOpenChange={(open) => { if (!open) setBookingStep(1); }}>
                <DialogTrigger asChild>
                  <div className="p-14 bg-primary text-black rounded-[3.5rem] shadow-2xl flex flex-col gap-3 cursor-pointer active:scale-95 transition-all group overflow-hidden relative border-4 border-black/5">
                    <h3 className="text-6xl font-black italic uppercase tracking-tighter relative z-10 leading-none">Book <br/> Ride</h3>
                    <div className="flex items-center justify-between mt-6 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Grid Protocol 1.0</p>
                      <div className="h-12 w-12 bg-black rounded-full flex items-center justify-center text-primary group-hover:translate-x-3 transition-transform">
                        <ArrowRight className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 opacity-10">
                      <ConnectingDotsLogo className="h-40 w-40" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-background border-white/5 rounded-[3.5rem] p-10 h-[92vh] flex flex-col shadow-2xl overflow-hidden border-2">
                  <DialogHeader className="shrink-0 mb-6">
                    <DialogTitle className="text-4xl font-black italic uppercase text-primary leading-none tracking-tighter">
                      {bookingStep === 1 ? "Corridors" : bookingStep === 2 ? "Landmarks" : bookingStep === 3 ? "UPI Sync" : "Synced"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar">
                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        {activeRoutes?.map((route: any) => (
                          <div key={route.id} onClick={() => { setSelectedRoute(route); setBookingStep(2); }} className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-primary/50 transition-all flex justify-between items-center group shadow-md active:bg-white/10">
                             <div className="space-y-2">
                                <h4 className="text-2xl font-black italic uppercase group-hover:text-primary transition-colors leading-none">{route.routeName}</h4>
                                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1 rounded-full">₹{route.baseFare} BASE</Badge>
                             </div>
                             <ChevronRight className="h-8 w-8 text-white/10 group-hover:text-primary transition-all" />
                          </div>
                        ))}
                      </div>
                    )}

                    {bookingStep === 2 && (
                      <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                        <div className="space-y-5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] ml-2">Mission Date</Label>
                          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                             {[0, 1, 2, 3, 4].map((day) => {
                               const d = addDays(new Date(), day);
                               const dStr = format(d, 'yyyy-MM-dd');
                               return (
                                 <Button key={day} onClick={() => setBookingDate(dStr)} variant={bookingDate === dStr ? 'default' : 'outline'} className={`h-16 rounded-[1.5rem] shrink-0 font-black italic px-8 snap-center text-lg ${bookingDate === dStr ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'border-white/10 text-muted-foreground hover:border-primary/40'}`}>
                                   {day === 0 ? 'Today' : format(d, 'EEE, dd')}
                                 </Button>
                               );
                             })}
                          </div>
                        </div>
                        <div className="space-y-5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] ml-2">Safe Landmarks</Label>
                          <div className="grid gap-3">
                             {selectedRoute?.stops.map((s: any, i: number) => (
                               <button 
                                key={i} 
                                onClick={() => !pickupStop ? setPickupStop(s.name) : setDestinationStop(s.name)} 
                                className={`p-8 rounded-[2rem] border-2 text-left font-black italic text-base transition-all flex items-center justify-between active:scale-95 ${pickupStop === s.name ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' : destinationStop === s.name ? 'bg-accent/20 border-accent text-accent shadow-lg shadow-accent/10' : 'bg-white/5 border-white/5 text-muted-foreground'}`}
                               >
                                 <div className="flex items-center gap-5">
                                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-[11px] font-black">{i + 1}</div>
                                    <span className="uppercase tracking-tight">{s.name}</span>
                                 </div>
                                 <div className="flex gap-2">
                                   {pickupStop === s.name && <Badge className="bg-primary text-black text-[9px] font-black px-3 py-1">BOARDING</Badge>}
                                   {destinationStop === s.name && <Badge className="bg-accent text-white text-[9px] font-black px-3 py-1">DROP</Badge>}
                                 </div>
                               </button>
                             ))}
                          </div>
                          <Button variant="ghost" onClick={() => { setPickupStop(""); setDestinationStop(""); }} className="w-full text-[10px] font-black uppercase text-primary/40 hover:text-primary tracking-widest mt-2">Reset Landmark Selections</Button>
                        </div>
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-10 py-6 text-center animate-in zoom-in duration-500">
                         <div className="p-14 bg-primary/5 rounded-[4rem] border-4 border-primary/20 shadow-2xl relative overflow-hidden">
                            <p className="text-[11px] font-black uppercase text-primary mb-5 tracking-[0.5em] italic">Mission Fare</p>
                            <h3 className="text-8xl font-black italic tracking-tighter leading-none text-white drop-shadow-2xl">₹{Math.max(0, calculatedFare - appliedDiscount)}</h3>
                            <div className="absolute top-0 right-0 p-6 opacity-10"><ZapIcon className="h-20 w-20" /></div>
                         </div>
                         <div className="p-8 bg-black/60 rounded-[3rem] border border-white/5 text-left space-y-4 shadow-inner">
                            <p className="text-[10px] font-black uppercase text-primary flex items-center gap-3 tracking-widest"><Info className="h-4 w-4" /> Capacity Synchronization</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase italic leading-relaxed">
                              Route nodes are dynamically optimized. Mission synchronization releases details 3 hours before the journey to maximize efficiency.
                            </p>
                         </div>
                         <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-3 tracking-widest">AAGO Promo</Label>
                           <div className="flex gap-3">
                              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="ENTER CODE" className="h-18 w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] font-black italic px-8 uppercase tracking-widest outline-none focus:border-primary transition-all text-lg" />
                              <Button onClick={handleApplyVoucher} className="h-18 px-10 rounded-[1.5rem] font-black italic bg-primary/10 text-primary border-2 border-primary/20 hover:bg-primary hover:text-black transition-all">Apply</Button>
                           </div>
                         </div>
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="flex flex-col items-center justify-center text-center space-y-10 py-24 animate-in fade-in duration-1000">
                         <div className="h-40 w-40 bg-primary text-black rounded-full flex items-center justify-center shadow-3xl animate-bounce shadow-primary/30 border-8 border-background">
                           <CheckCircle2 className="h-20 w-20" />
                         </div>
                         <div className="space-y-4">
                           <h3 className="text-5xl font-black italic uppercase text-primary tracking-tighter leading-none">Grid Synced</h3>
                           <p className="text-xs font-bold text-muted-foreground italic uppercase tracking-[0.2em] px-8 leading-loose">Seat successfully locked in the optimal grid node. Releasing mission details 3 hours before departure.</p>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-10 shrink-0 border-t border-white/5">
                    {bookingStep === 2 && <Button onClick={() => setBookingStep(3)} disabled={!pickupStop || !destinationStop} className="w-full h-20 bg-primary text-black rounded-[2.5rem] font-black uppercase italic text-2xl shadow-2xl active:scale-95 transition-all">Continue to Pay</Button>}
                    {bookingStep === 3 && <Button onClick={initiatePayment} disabled={isPaying} className="w-full h-24 bg-primary text-black rounded-[2.5rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-95 transition-all">
                      {isPaying ? <Loader2 className="animate-spin h-10 w-10" /> : <><ZapIcon className="h-8 w-8" /> Pay ₹{Math.max(0, calculatedFare - appliedDiscount)} via UPI</>}
                    </Button>}
                    {bookingStep === 4 && <DialogTrigger asChild><Button className="w-full h-20 bg-white/5 rounded-[2.5rem] font-black uppercase italic text-xl border border-white/10 hover:bg-primary hover:text-black transition-all">Close Terminal</Button></DialogTrigger>}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Card className="bg-white/5 border-white/10 rounded-[3rem] p-10 space-y-5 shadow-lg border-2 border-white/5">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Gift className="h-7 w-7" /></div>
                 <h4 className="text-2xl font-black italic uppercase tracking-tighter">Community Referral</h4>
              </div>
              <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">Share your grid identity with friends and earn 50 points on every new synchronization.</p>
              <div className="flex gap-3 bg-black/60 p-5 rounded-3xl border border-white/5 items-center">
                 <p className="flex-1 font-black italic text-primary uppercase tracking-[0.3em] text-lg px-4">{profile?.referralCode || 'SYNCING...'}</p>
                 <Button onClick={() => { navigator.clipboard.writeText(profile?.referralCode || ''); toast({ title: "Identity Copied" }); }} variant="ghost" className="text-primary h-12 w-12 rounded-2xl bg-primary/5 hover:bg-primary hover:text-black">
                   <Copy className="h-6 w-6" />
                 </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="flex-1 flex flex-col space-y-6 h-[calc(100vh-240px)] animate-in fade-in duration-700">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-4xl font-black italic uppercase text-foreground tracking-tighter">Grid Radar</h2>
              <Button onClick={handleShareTracking} variant="outline" className="rounded-2xl border-white/10 text-primary font-black uppercase italic text-[10px] tracking-widest bg-white/5 h-11 px-6"><Share2 className="mr-2 h-4 w-4" /> Share Live</Button>
            </div>
            <div className="flex-1 rounded-[4rem] overflow-hidden border-4 border-white/5 shadow-3xl bg-black relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={15} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: '#EAB308', fillOpacity: 1, scale: 10, strokeColor: '#FFFFFF', strokeWeight: 2 }} />}
                   {currentBooking?.currentLat && (
                     <Marker position={{ lat: currentBooking.currentLat, lng: currentBooking.currentLng }} icon={{ path: 'M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z', fillColor: '#EAB308', fillOpacity: 1, scale: 1.8, strokeColor: '#FFFFFF', strokeWeight: 1 }} />
                   )}
                 </GoogleMap>
               ) : <div className="h-full w-full flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700 pb-12">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">Mission Log</h2>
             <div className="space-y-4">
                {allTrips?.filter(t => t.status === 'completed' || t.passengerManifest?.some((m: any) => m.uid === user?.uid)).length === 0 ? (
                  <div className="p-24 text-center italic text-muted-foreground bg-white/5 rounded-[3.5rem] border-2 border-dashed border-white/5 opacity-40 uppercase tracking-[0.4em] font-black text-[11px] flex flex-col items-center gap-6">
                    <History className="h-12 w-12 opacity-20" />
                    No mission records synchronized.
                  </div>
                ) : allTrips?.filter(t => t.status === 'completed' || t.passengerManifest?.some((m: any) => m.uid === user?.uid)).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((t: any) => (
                  <Card key={t.id} className="bg-card/40 border border-white/5 rounded-[2.5rem] p-10 flex justify-between items-center shadow-xl hover:border-primary/30 transition-all active:scale-95 cursor-pointer">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`${t.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'} border-none text-[8px] font-black uppercase px-3 py-1 rounded-full`}>
                          {t.status.toUpperCase()}
                        </Badge>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t.scheduledDate}</span>
                      </div>
                      <h4 className="font-black text-foreground uppercase italic text-2xl leading-none tracking-tight">{t.routeName}</h4>
                    </div>
                    <div className="text-right">
                       <span className="text-3xl font-black italic text-primary tracking-tighter">₹{t.farePerRider}</span>
                    </div>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in duration-700">
             <div className="flex flex-col items-center gap-8">
                <div className="h-44 w-44 rounded-full border-[10px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-3xl relative p-2 ring-2 ring-primary/20">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover rounded-full" /> : <UserIcon className="h-20 w-20 text-primary/20" />}
                </div>
                <div className="space-y-3">
                   <h2 className="text-6xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                   <Badge className="bg-primary/20 text-primary border-none uppercase text-[10px] font-black tracking-[0.4em] px-8 py-2 rounded-full shadow-lg shadow-primary/10">GRID CERTIFIED</Badge>
                </div>
             </div>
             <div className="grid gap-4 max-w-sm mx-auto">
                <Button variant="ghost" onClick={handleSignOut} className="w-full h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border-2 border-destructive/20 text-xl shadow-xl hover:bg-destructive hover:text-white transition-all active:scale-95">
                   <LogOut className="mr-4 h-7 w-7" /> Logout Hub
                </Button>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">AAGO Mobility Grid v1.2.0-Production</p>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-3xl border-t-2 border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom shadow-3xl">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all active:scale-90 ${activeTab === 'home' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <LayoutGrid className="h-8 w-8" /><span className="text-[10px] font-black uppercase tracking-widest">Grid</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('radar')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all active:scale-90 ${activeTab === 'radar' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <Zap className="h-8 w-8" /><span className="text-[10px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all active:scale-90 ${activeTab === 'history' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <History className="h-8 w-8" /><span className="text-[10px] font-black uppercase tracking-widest">Log</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all active:scale-90 ${activeTab === 'me' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <UserIcon className="h-8 w-8" /><span className="text-[10px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
