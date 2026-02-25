
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Leaf,
  LayoutGrid,
  Share2,
  ShieldAlert,
  Phone,
  Zap,
  RefreshCw,
  Car,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  Calendar,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc, getDoc } from 'firebase/firestore';
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
  const [bookingStep, setBookingStep] = useState(1); // 1: Route, 2: Date & Stops, 3: Payment, 4: Success
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [pickupStop, setPickupStop] = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isBooking, setIsBooking] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: googleMapsApiKey });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: activeRoutes } = useCollection(useMemo(() => (db) ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]));
  const { data: activeTrips } = useCollection(useMemo(() => (db) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]));
  
  const currentBooking = useMemo(() => {
    if (!activeTrips || !user?.uid) return null;
    return activeTrips.find(t => t.verifiedPassengers?.includes(user.uid) || t.passengerManifest?.some((m: any) => m.uid === user.uid));
  }, [activeTrips, user?.uid]);

  const { data: pastTrips } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('status', '==', 'completed'), where('verifiedPassengers', 'array-contains', user.uid));
  }, [db, user?.uid]));

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

  const triggerSOS = async () => {
    if (!db || !user || !profile) return;
    addDoc(collection(db, 'alerts'), {
      type: 'SCHOLAR_SOS', userId: user.uid, userName: profile.fullName,
      city: profile.city || 'Global', timestamp: new Date().toISOString(),
      location: currentPosition || 'Regional Hub'
    });
    toast({ variant: "destructive", title: "SOS Sent" });
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true));
    const snap = await getDocs(vQuery);
    if (snap.empty) {
      toast({ variant: "destructive", title: "Invalid Voucher" });
      setAppliedDiscount(0);
    } else {
      setAppliedDiscount(snap.docs[0].data().discountAmount);
      toast({ title: "Applied!" });
    }
  };

  const handleConfirmBooking = async () => {
    if (!db || !userRef || !selectedRoute || !profile) return;
    setIsBooking(true);
    
    setTimeout(async () => {
      try {
        const finalFare = Math.max(0, calculatedFare - appliedDiscount);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const bookingDetails = {
          uid: user!.uid,
          name: profile.fullName,
          pickup: pickupStop,
          destination: destinationStop,
          bookingDate: bookingDate,
          farePaid: finalFare
        };

        const tripQuery = query(collection(db, 'trips'), where('routeName', '==', selectedRoute.routeName), where('scheduledDate', '==', bookingDate), where('status', '==', 'active'));
        const tripSnap = await getDocs(tripQuery);
        
        if (!tripSnap.empty) {
          const tripDoc = tripSnap.docs[0];
          await updateDoc(doc(db, 'trips', tripDoc.id), {
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
            createdAt: new Date().toISOString()
          });
        }

        await updateDoc(userRef, { 
          activeOtp: otp, 
          destinationStopName: destinationStop, 
          loyaltyPoints: increment(Math.floor(finalFare / 10)) 
        });
        
        setBookingStep(4);
        toast({ title: "Seat Secured", description: "Grid confirmed." });
      } catch (e) {
        toast({ variant: "destructive", title: "Booking Error" });
      } finally { setIsBooking(false); }
    }, 1500);
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

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
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-destructive bg-destructive/10 h-11 w-11 rounded-2xl border border-destructive/20"><ShieldAlert className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={() => { navigator.share({ title: 'Aago', url: window.location.origin }); }} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic leading-none">Scholar,</p>
                <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter mt-1">{profile?.fullName?.split(' ')[0]}</h2>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/10 min-w-[100px]">
                 <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Points</p>
                 <div className="flex items-center justify-center gap-1 text-primary">
                   <Star className="h-4 w-4 fill-primary" />
                   <span className="text-2xl font-black text-foreground italic">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-8">
                <Card className="glass-card rounded-[3rem] p-8 shadow-2xl border-primary/30 relative">
                   <div className="flex flex-col items-center gap-4 mb-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground italic">Boarding Code</p>
                      <h3 className="text-7xl font-black tracking-tighter italic text-primary text-glow leading-none">{profile.activeOtp}</h3>
                   </div>
                   
                   <div className="space-y-4 mb-8">
                      <div className="bg-white/5 p-5 rounded-2xl flex items-center gap-4 border border-white/5">
                         <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Bus className="h-6 w-6" /></div>
                         <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Corridor</p>
                            <p className="text-lg font-black italic uppercase text-foreground leading-none">{currentBooking.routeName}</p>
                         </div>
                      </div>

                      {currentBooking.driverId ? (
                        <div className="bg-primary/5 p-5 rounded-3xl flex items-center justify-between border border-primary/20 animate-in fade-in duration-500">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary bg-primary/10">
                              {currentBooking.driverPhoto ? <img src={currentBooking.driverPhoto} className="h-full w-full object-cover" /> : <UserCheck className="h-full w-full p-2 text-primary" />}
                            </div>
                            <div>
                               <p className="text-[9px] font-black uppercase text-primary">Your Driver</p>
                               <p className="text-sm font-black italic uppercase text-foreground leading-none">{currentBooking.driverName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-foreground uppercase italic">{currentBooking.vehicleNumber}</p>
                             <Badge variant="outline" className="text-[8px] border-primary/30 text-primary mt-1">{currentBooking.vehicleType}</Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
                           <Loader2 className="animate-spin h-5 w-5 text-primary mx-auto mb-2" />
                           <p className="text-[10px] font-black uppercase italic text-muted-foreground">Waiting for Operator...</p>
                        </div>
                      )}
                   </div>
                   <Button onClick={() => setActiveTab('radar')} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-2xl">Track Ride</Button>
                </Card>
              </div>
            ) : (
              <Dialog onOpenChange={(open) => { if (!open) { setBookingStep(1); setSelectedRoute(null); setPickupStop(""); setDestinationStop(""); } }}>
                <DialogTrigger asChild>
                  <div className="p-10 bg-primary text-black rounded-[3rem] shadow-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Find <br/> Ride</h3>
                    <Navigation className="h-10 w-10" />
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-background border-white/5 rounded-[2.5rem] p-8 h-[92vh] flex flex-col shadow-2xl">
                  <DialogHeader className="shrink-0 mb-6">
                    <DialogTitle className="text-3xl font-black italic uppercase text-primary tracking-tighter">
                      {bookingStep === 1 ? "Pick Corridor" : bookingStep === 2 ? "Pick Stops" : bookingStep === 3 ? "Payment" : "Done"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        {activeRoutes?.map((route: any) => (
                          <div key={route.id} onClick={() => { setSelectedRoute(route); setBookingStep(2); }} className="p-6 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:border-primary transition-all">
                             <h4 className="text-xl font-black italic uppercase text-foreground">{route.routeName}</h4>
                             <p className="text-[10px] font-black text-primary uppercase mt-1">Starting at ₹{Math.ceil(route.baseFare/2)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {bookingStep === 2 && selectedRoute && (
                      <div className="space-y-8 animate-in slide-in-from-right-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Select Date</Label>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                             {[0, 1, 2].map((day) => {
                               const date = addDays(new Date(), day);
                               const dateStr = format(date, 'yyyy-MM-dd');
                               return (
                                 <Button key={day} onClick={() => setBookingDate(dateStr)} variant={bookingDate === dateStr ? 'default' : 'outline'} className={`rounded-xl shrink-0 font-black italic text-xs ${bookingDate === dateStr ? 'bg-primary text-black' : 'text-muted-foreground'}`}>
                                   {day === 0 ? 'Today' : format(date, 'EEE, dd')}
                                 </Button>
                               );
                             })}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Boarding Node</Label>
                             <div className="grid grid-cols-1 gap-2">
                               {selectedRoute.stops.map((stop: any, i: number) => (
                                 <button key={i} disabled={i === selectedRoute.stops.length - 1} onClick={() => setPickupStop(stop.name)} className={`p-4 rounded-xl border text-left font-black italic text-sm transition-all ${pickupStop === stop.name ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                                   {stop.name}
                                 </button>
                               ))}
                             </div>
                          </div>

                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Dropping Node</Label>
                             <div className="grid grid-cols-1 gap-2">
                               {selectedRoute.stops.map((stop: any, i: number) => {
                                 const pIdx = selectedRoute.stops.findIndex((s: any) => s.name === pickupStop);
                                 const isDisabled = pIdx === -1 || i <= pIdx;
                                 return (
                                   <button key={i} disabled={isDisabled} onClick={() => setDestinationStop(stop.name)} className={`p-4 rounded-xl border text-left font-black italic text-sm transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed' : destinationStop === stop.name ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                                     {stop.name}
                                   </button>
                                 );
                               })}
                             </div>
                          </div>
                        </div>

                        {calculatedFare > 0 && (
                          <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 text-center">
                             <p className="text-[10px] font-black uppercase text-primary mb-1">Prorated Fare</p>
                             <h4 className="text-3xl font-black italic text-foreground">₹{calculatedFare}</h4>
                          </div>
                        )}
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-8 py-4 animate-in zoom-in-95">
                         <div className="p-8 bg-white/5 rounded-[2.5rem] text-center space-y-2 border border-white/10">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Settlement Portal</p>
                            <h4 className="text-xl font-black italic text-foreground uppercase">hub@upi</h4>
                         </div>
                         <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground ml-3">Voucher</Label>
                           <div className="flex gap-3">
                              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="CODE" className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl font-black italic px-6 uppercase" />
                              <Button onClick={handleApplyVoucher} variant="outline" className="h-16 px-6 rounded-2xl font-black italic text-primary">Apply</Button>
                           </div>
                         </div>
                         <div className="p-10 bg-primary/5 rounded-[3rem] text-center border-2 border-primary/20">
                            <p className="text-[10px] font-black uppercase text-primary mb-2">Total Due</p>
                            <h3 className="text-6xl font-black italic text-foreground tracking-tighter">₹{Math.max(0, calculatedFare - appliedDiscount)}</h3>
                         </div>
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="flex flex-col items-center justify-center text-center space-y-6 py-20 animate-in zoom-in-95">
                         <div className="h-24 w-24 bg-primary text-black rounded-full flex items-center justify-center"><CheckCircle2 className="h-12 w-12" /></div>
                         <h3 className="text-4xl font-black italic uppercase text-primary">Success</h3>
                         <p className="text-sm font-bold text-muted-foreground italic uppercase">Your Boarding Code is active on the home hub.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 shrink-0 border-t border-white/5">
                    {bookingStep === 1 && <Button variant="ghost" onClick={() => setBookingStep(1)} className="w-full text-muted-foreground font-black uppercase italic">Cancel</Button>}
                    {bookingStep === 2 && <Button onClick={() => setBookingStep(3)} disabled={!pickupStop || !destinationStop} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl">Proceed to Pay</Button>}
                    {bookingStep === 3 && <Button onClick={handleConfirmBooking} disabled={isBooking} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl">{isBooking ? "Verifying..." : "Pay & Secure"}</Button>}
                    {bookingStep === 4 && <DialogTrigger asChild><Button className="w-full h-16 bg-white/5 rounded-2xl font-black uppercase italic">Close</Button></DialogTrigger>}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="flex-1 flex flex-col space-y-6 h-[calc(100vh-200px)] animate-in fade-in">
            <h2 className="text-3xl font-black italic uppercase text-foreground tracking-tighter px-2">Radar</h2>
            <div className="flex-1 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={15} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: '#00FFFF', fillOpacity: 1, scale: 8 }} />}
                   {activeTrips?.map((trip: any) => trip.currentLat && (
                     <Marker 
                        key={trip.id} 
                        position={{ lat: trip.currentLat, lng: trip.currentLng }} 
                        title={trip.routeName}
                        icon={trip.driverId === currentBooking?.driverId ? { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, fillColor: '#00FFFF', fillOpacity: 1, scale: 6, strokeColor: '#00FFFF', rotation: 0 } : undefined}
                     />
                   ))}
                 </GoogleMap>
               ) : <Loader2 className="animate-spin text-primary m-auto h-10 w-10" />}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-12">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">History</h2>
             <div className="space-y-4">
                {pastTrips?.length === 0 ? (
                  <div className="p-20 text-center italic text-muted-foreground bg-white/5 rounded-[2rem] border border-dashed border-white/10">No missions yet.</div>
                ) : pastTrips?.map((trip: any) => (
                  <Card key={trip.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex justify-between items-center shadow-lg">
                    <div>
                      <h4 className="font-black text-foreground uppercase italic text-xl leading-none">{trip.routeName}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{new Date(trip.endTime).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xl font-black italic text-primary">₹{trip.farePerRider}</span>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in">
             <div className="flex flex-col items-center gap-6">
                <div className="h-32 w-32 rounded-full border-[6px] border-white/10 bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-12 w-12 text-primary/20" />}
                </div>
                <h2 className="text-4xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px] tracking-widest px-4 py-1">{profile?.city} Scholar</Badge>
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-16 bg-destructive/10 text-destructive rounded-[2rem] font-black uppercase italic border border-destructive/20 text-lg">
                <LogOut className="mr-3 h-5 w-5" /> Sign Out
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutGrid className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Find Ride</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('radar')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'radar' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Zap className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'}`}>
          <History className="h-6 w-6" /><span className="text-[8px] font-black uppercase">History</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'me' ? 'text-primary' : 'text-muted-foreground'}`}>
          <UserIcon className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Me</span>
        </Button>
      </nav>
    </div>
  );
}
