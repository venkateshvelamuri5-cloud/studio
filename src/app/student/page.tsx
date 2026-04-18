
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
  MapPin, 
  Navigation,
  LogOut,
  Loader2,
  History,
  User as UserIcon,
  LayoutGrid,
  Share2,
  Zap,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ZapIcon,
  CalendarDays,
  Gift,
  ArrowRight
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
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
  const [pickupStop, setPickupStop] = useState("");
  const [dropStop, setDropStop] = useState("");
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState<string>("");
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
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
    return allTrips.find(t => t.passengerManifest?.some((m: any) => m.uid === user.uid));
  }, [allTrips, user?.uid]);

  useEffect(() => {
    if (!db || !currentBooking?.driverId || activeTab !== 'radar') return;
    const unsub = onSnapshot(doc(db, 'users', currentBooking.driverId), (doc) => {
      const data = doc.data();
      if (data?.currentLat && data?.currentLng) {
        setDriverLocation({ lat: data.currentLat, lng: data.currentLng });
      }
    });
    return () => unsub();
  }, [db, currentBooking?.driverId, activeTab]);

  const calculatedFare = useMemo(() => {
    if (!selectedRoute) return 0;
    return selectedRoute.baseFare || 150;
  }, [selectedRoute]);

  const availableTimeSlots = useMemo(() => {
    if (!selectedRoute?.schedule) return [];
    return selectedRoute.schedule.split(',').map((s: string) => s.trim());
  }, [selectedRoute]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const handleShareTracking = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AAGO Hub - Track My Ride',
          text: `Track my Hub ride. Boarding Code: ${profile?.activeOtp}`,
          url: window.location.href,
        });
      } catch (error) {
        toast({ title: "Link Copied" });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied to Clipboard" });
    }
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    const q = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const v = snap.docs[0].data();
      setAppliedDiscount(v.discount || 0);
      toast({ title: `₹${v.discount} Hub Credit Applied` });
    } else {
      toast({ variant: "destructive", title: "Invalid Voucher" });
    }
  };

  const processPaymentSuccess = async (paymentResponse: any) => {
    if (!db || !userRef || !selectedRoute || !profile) return;
    setIsPaying(true);

    try {
      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentResponse),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.status === 'success') {
        const finalFare = Math.max(0, calculatedFare - appliedDiscount);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const riderEntry = {
          uid: user!.uid,
          name: profile.fullName,
          pickup: pickupStop,
          destination: dropStop,
          bookingDate: bookingDate,
          bookingTime: bookingTime,
          farePaid: finalFare,
          bookedAt: new Date().toISOString()
        };

        const tripQuery = query(
          collection(db, 'trips'), 
          where('routeName', '==', selectedRoute.routeName), 
          where('scheduledDate', '==', bookingDate),
          where('scheduledTime', '==', bookingTime),
          where('status', '==', 'active')
        );
        const tripSnap = await getDocs(tripQuery);
        const targetTrip = tripSnap.docs.find(d => (d.data().riderCount || 0) < 7);

        if (targetTrip) {
          await updateDoc(doc(db, 'trips', targetTrip.id), {
            passengerManifest: arrayUnion(riderEntry),
            riderCount: increment(1)
          });
        } else {
          await addDoc(collection(db, 'trips'), {
            routeName: selectedRoute.routeName,
            scheduledDate: bookingDate,
            scheduledTime: bookingTime,
            status: 'active',
            riderCount: 1,
            maxCapacity: 7,
            farePerRider: selectedRoute.baseFare,
            passengerManifest: [riderEntry],
            verifiedPassengers: [],
            createdAt: new Date().toISOString()
          });
        }

        await updateDoc(userRef, { activeOtp: otp, loyaltyPoints: increment(10) });
        setBookingStep(4);
        toast({ title: "Hub Seat Reserved!" });
      } else {
        throw new Error(verifyData.error || 'Payment failed');
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Payment Error", description: e.message });
    } finally {
      setIsPaying(false);
    }
  };

  const initiatePayment = async () => {
    if (typeof window === 'undefined' || !selectedRoute) return;
    if (!(window as any).Razorpay) {
      toast({ variant: 'destructive', title: 'Payment Error', description: 'Payment gateway loading...' });
      return;
    }
    setIsPaying(true);

    try {
      const finalAmount = Math.max(1, calculatedFare - appliedDiscount);
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount * 100, receipt: `hub_order_${Date.now()}` }),
      });
      
      if (!res.ok) throw new Error('Order creation failed');
      const orderData = await res.json();

      const options = {
        key: 'rzp_live_SeqhV0hEn1PXnz',
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AAGO HUB",
        description: `Hub Ride: ${selectedRoute.routeName}`,
        order_id: orderData.id,
        handler: (res: any) => processPaymentSuccess(res),
        prefill: { name: profile?.fullName || "", contact: profile?.phoneNumber || "" },
        theme: { color: "#EAB308" },
        modal: {
          ondismiss: () => setIsPaying(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Payment Failed", description: e.message });
      setIsPaying(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black">
            <ConnectingDotsLogo className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-black italic uppercase text-primary tracking-tighter">AAGO Hub</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={handleShareTracking} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center px-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest italic opacity-50">Member</p>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">{profile?.fullName?.split(' ')[0]}</h2>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center gap-2">
                 <Zap className="h-5 w-5 text-primary fill-primary" />
                 <span className="text-2xl font-black text-primary">{profile?.loyaltyPoints || 0}</span>
              </div>
            </div>

            {currentBooking ? (
              <Card className="glass-card rounded-[3.5rem] p-10 shadow-2xl border-primary/30 relative overflow-hidden">
                 <div className="flex flex-col items-center gap-4 mb-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Ride Confirmed</p>
                    <h3 className="text-7xl font-black tracking-tighter italic text-primary text-glow leading-none">
                      {currentBooking.status === 'active' ? profile?.activeOtp : 'READY'}
                    </h3>
                    <p className="text-[9px] font-black uppercase text-primary mt-4">{currentBooking.scheduledDate} • {currentBooking.scheduledTime}</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="bg-black/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center gap-5">
                       <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><Navigation className="h-6 w-6" /></div>
                       <div className="flex-1">
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Hub Route</p>
                          <p className="text-xl font-black italic uppercase leading-none mt-1">{currentBooking.routeName}</p>
                       </div>
                    </div>

                    {currentBooking.status === 'active' ? (
                      <div className="p-8 bg-black/40 border border-dashed border-white/10 rounded-[3rem] text-center space-y-3">
                         <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto opacity-50" />
                         <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                           Hub details shared 3 hours before start. Safe travel!
                         </p>
                      </div>
                    ) : (
                      <Button onClick={() => setActiveTab('radar')} className="w-full h-18 bg-primary text-black rounded-3xl font-black uppercase italic shadow-2xl flex items-center justify-center gap-3">
                         <Zap className="h-6 w-6" /> Track Live Hub
                      </Button>
                    )}
                 </div>
              </Card>
            ) : (
              <Dialog onOpenChange={(open) => { if (!open) setBookingStep(1); }}>
                <DialogTrigger asChild>
                  <div className="p-14 bg-primary text-black rounded-[3.5rem] shadow-2xl flex flex-col gap-3 cursor-pointer group relative overflow-hidden border-4 border-black/5">
                    <h3 className="text-6xl font-black italic uppercase tracking-tighter relative z-10 leading-none">Pick <br/> Ride</h3>
                    <div className="flex items-center justify-between mt-6 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Fixed Price Hub</p>
                      <div className="h-12 w-12 bg-black rounded-full flex items-center justify-center text-primary group-hover:translate-x-3 transition-transform">
                        <ChevronRight className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-background border-white/5 rounded-[3.5rem] p-10 h-[90vh] flex flex-col shadow-2xl border-2">
                  <DialogHeader className="shrink-0 mb-6">
                    <DialogTitle className="text-4xl font-black italic uppercase text-primary leading-none tracking-tighter">
                      {bookingStep === 1 ? "Hub Route" : bookingStep === 2 ? "Hub Stops" : bookingStep === 3 ? "Payment" : "Done"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar">
                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        {activeRoutes?.map((route: any) => (
                          <div key={route.id} onClick={() => { setSelectedRoute(route); setBookingStep(2); }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] cursor-pointer flex justify-between items-center group active:bg-white/10">
                             <div className="space-y-2">
                                <h4 className="text-2xl font-black italic uppercase group-hover:text-primary transition-colors leading-none">{route.routeName}</h4>
                                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1 rounded-full">₹{route.baseFare}</Badge>
                             </div>
                             <ChevronRight className="h-8 w-8 text-white/10" />
                          </div>
                        ))}
                      </div>
                    )}

                    {bookingStep === 2 && (
                      <div className="space-y-8 animate-in slide-in-from-right-8">
                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Pickup Landmark</Label>
                           <div className="grid grid-cols-1 gap-2">
                              {selectedRoute?.stops?.map((stop: any, idx: number) => (
                                <Button key={idx} onClick={() => setPickupStop(stop.name)} variant={pickupStop === stop.name ? 'default' : 'outline'} className={`h-14 rounded-xl font-black italic justify-start px-6 ${pickupStop === stop.name ? 'bg-primary text-black' : 'border-white/10 text-muted-foreground'}`}>
                                  {stop.name}
                                </Button>
                              ))}
                           </div>
                        </div>
                        <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Drop Landmark</Label>
                           <div className="grid grid-cols-1 gap-2">
                              {selectedRoute?.stops?.map((stop: any, idx: number) => (
                                <Button key={idx} onClick={() => setDropStop(stop.name)} variant={dropStop === stop.name ? 'default' : 'outline'} className={`h-14 rounded-xl font-black italic justify-start px-6 ${dropStop === stop.name ? 'bg-primary text-black' : 'border-white/10 text-muted-foreground'}`}>
                                  {stop.name}
                                </Button>
                              ))}
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Hub Date</Label>
                              <select value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 font-black italic text-foreground outline-none focus:border-primary">
                                 {[0, 1, 2, 3].map(d => {
                                   const date = addDays(new Date(), d);
                                   return <option key={d} value={format(date, 'yyyy-MM-dd')}>{format(date, 'EEE, dd MMM')}</option>;
                                 })}
                              </select>
                           </div>
                           <div className="space-y-4">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Hub Time</Label>
                              <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 font-black italic text-foreground outline-none focus:border-primary">
                                 <option value="">Select Time</option>
                                 {availableTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                           </div>
                        </div>
                        <Button onClick={() => setBookingStep(3)} disabled={!bookingTime || !pickupStop || !dropStop} className="w-full h-18 bg-primary text-black rounded-[2.5rem] font-black uppercase italic text-xl shadow-2xl">Pay via UPI</Button>
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-10 py-6 text-center animate-in slide-in-from-right-8">
                         <div className="p-10 bg-primary/5 rounded-[4rem] border-4 border-primary/20 shadow-2xl relative">
                            <p className="text-[11px] font-black uppercase text-primary mb-5 tracking-[0.5em] italic">Seat Fare</p>
                            <h3 className="text-8xl font-black italic tracking-tighter leading-none text-white">₹{Math.max(0, calculatedFare - appliedDiscount)}</h3>
                         </div>
                         <div className="space-y-4 text-left">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-3 tracking-widest">Apply Voucher</Label>
                           <div className="flex gap-3">
                              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="AAGO10" className="h-16 w-full bg-white/5 border-2 border-white/10 rounded-2xl font-black italic px-8 uppercase outline-none focus:border-primary" />
                              <Button onClick={handleApplyVoucher} className="h-16 px-8 rounded-2xl font-black italic bg-primary/10 text-primary border-2 border-primary/20">Apply</Button>
                           </div>
                         </div>
                         <Button onClick={initiatePayment} disabled={isPaying} className="w-full h-24 bg-primary text-black rounded-[2.5rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-95 transition-all">
                           {isPaying ? <Loader2 className="animate-spin h-10 w-10" /> : <><ZapIcon className="h-8 w-8" /> Pay via UPI</>}
                         </Button>
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="flex flex-col items-center justify-center text-center space-y-10 py-24 animate-in fade-in duration-1000">
                         <div className="h-32 w-32 bg-primary text-black rounded-full flex items-center justify-center shadow-3xl animate-bounce">
                           <CheckCircle2 className="h-16 w-16" />
                         </div>
                         <div className="space-y-4">
                           <h3 className="text-4xl font-black italic uppercase text-primary tracking-tighter leading-none">Seat Reserved!</h3>
                           <p className="text-[10px] font-bold text-muted-foreground italic uppercase tracking-[0.2em]">Hub details released 3 hours before start.</p>
                         </div>
                         <Button onClick={() => setBookingStep(1)} className="w-full h-18 bg-white/5 rounded-2xl border border-white/10 font-black uppercase italic">Exit</Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Card className="bg-white/5 border-white/10 rounded-[3rem] p-10 space-y-5 shadow-lg">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Gift className="h-7 w-7" /></div>
                 <h4 className="text-2xl font-black italic uppercase tracking-tighter">Hub Referral</h4>
              </div>
              <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">Refer a friend and get ₹50 Hub credit instantly.</p>
              <div className="flex gap-3 bg-black/60 p-5 rounded-3xl border border-white/5 items-center">
                 <p className="flex-1 font-black italic text-primary uppercase tracking-[0.3em] text-lg px-4">{profile?.referralCode || '...'}</p>
                 <Button onClick={() => { navigator.clipboard.writeText(profile?.referralCode || ''); toast({ title: "Referral Copied" }); }} variant="ghost" className="text-primary h-12 w-12 bg-primary/5 rounded-2xl">
                   <Copy className="h-6 w-6" />
                 </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="flex-1 flex flex-col space-y-6 h-[calc(100vh-240px)] animate-in fade-in">
            <h2 className="text-4xl font-black italic uppercase text-foreground tracking-tighter">Live Hub Tracking</h2>
            <div className="flex-1 rounded-[4rem] overflow-hidden border-4 border-white/5 shadow-3xl bg-black relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={driverLocation || DEFAULT_CENTER} zoom={15} options={mapOptions}>
                   {driverLocation && <Marker position={driverLocation} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#EAB308', fillOpacity: 1 }} />}
                 </GoogleMap>
               ) : <Loader2 className="animate-spin text-primary h-10 w-10 absolute inset-0 m-auto" />}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 pb-12 animate-in fade-in">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">Hub History</h2>
             <div className="space-y-4">
                {allTrips?.filter(t => t.passengerManifest?.some((m: any) => m.uid === user?.uid))?.length === 0 ? (
                  <div className="p-24 text-center italic text-muted-foreground bg-white/5 rounded-[3.5rem] border-2 border-dashed border-white/5 opacity-40 uppercase tracking-[0.4em] font-black text-[11px]">
                    No hub rides yet
                  </div>
                ) : allTrips?.filter(t => t.passengerManifest?.some((m: any) => m.uid === user?.uid))?.map((t: any) => (
                  <Card key={t.id} className="bg-card/40 border border-white/5 rounded-[2.5rem] p-8 flex justify-between items-center shadow-xl">
                    <div className="space-y-2">
                      <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">{t.status.toUpperCase()}</Badge>
                      <h4 className="font-black text-foreground uppercase italic text-2xl leading-none">{t.routeName}</h4>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{t.scheduledDate}</p>
                    </div>
                    <span className="text-2xl font-black italic text-primary">₹{t.farePerRider}</span>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in">
             <div className="flex flex-col items-center gap-8">
                <div className="h-40 w-40 rounded-full border-[10px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-3xl p-2 ring-2 ring-primary/20">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover rounded-full" /> : <UserIcon className="h-16 w-16 text-primary/20" />}
                </div>
                <div className="space-y-2">
                   <h2 className="text-5xl font-black italic uppercase text-foreground tracking-tighter">{profile?.fullName}</h2>
                   <Badge className="bg-primary/20 text-primary border-none uppercase text-[10px] font-black tracking-widest px-8 py-2 rounded-full">HUB MEMBER</Badge>
                </div>
             </div>
             <Button onClick={handleSignOut} className="w-full max-w-sm mx-auto h-18 bg-destructive/10 text-destructive rounded-3xl font-black uppercase italic border-2 border-destructive/20 text-lg hover:bg-destructive hover:text-white transition-all">
                <LogOut className="mr-4 h-6 w-6" /> Logout Hub
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-3xl border-t-2 border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl ${activeTab === 'home' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <LayoutGrid className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Hub</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('radar')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl ${activeTab === 'radar' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <MapPin className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl ${activeTab === 'history' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <History className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl ${activeTab === 'me' ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10' : 'text-muted-foreground opacity-50'}`}>
          <UserIcon className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
