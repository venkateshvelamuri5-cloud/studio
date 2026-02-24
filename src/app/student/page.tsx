
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  ShieldCheck,
  Star,
  Leaf,
  LayoutGrid,
  Share2,
  ShieldAlert,
  Phone,
  Zap,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

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

export default function StudentApp() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'radar' | 'history' | 'me'>('home');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); 
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [pickupStop, setPickupStop] = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  const { data: activeTrips } = useCollection(useMemo(() => (db) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db) ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]));
  
  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.verifiedPassengers?.includes(user.uid) || t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  const { data: pastTrips } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('status', '==', 'completed'), where('verifiedPassengers', 'array-contains', user.uid));
  }, [db, user?.uid]));

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

  const mapCenter = useMemo(() => {
    if (currentPosition) return currentPosition;
    if (activeTrips && activeTrips.length > 0) {
      const first = activeTrips.find(t => t.currentLat && t.currentLng);
      if (first) return { lat: first.currentLat, lng: first.currentLng };
    }
    return DEFAULT_CENTER;
  }, [currentPosition, activeTrips]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const refreshRadar = () => {
    if (map && mapCenter) {
      map.panTo(mapCenter);
      toast({ title: "Signal Synced", description: "Grid scan complete." });
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

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
    toast({ variant: "destructive", title: "SOS Sent", description: "Team has your location." });
  };

  const handleCallContact = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleReferral = async () => {
    if (!profile?.referralCode) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Aago!',
          text: `Use my code ${profile.referralCode} to ride with Aago!`,
          url: window.location.origin
        });
      } else {
        await navigator.clipboard.writeText(profile.referralCode);
        toast({ title: "Copied", description: "Share it with a friend!" });
      }
    } catch (e) {}
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

  const handleConfirmPayment = async () => {
    if (!db || !userRef || !selectedTrip || !destinationStop) return;
    setIsBooking(true);
    try {
      const finalFare = Math.max(0, selectedTrip.farePerRider - appliedDiscount);
      const pointsEarned = Math.floor(finalFare / 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      await updateDoc(userRef, { activeOtp: otp, destinationStopName: destinationStop, loyaltyPoints: increment(pointsEarned) });
      await updateDoc(doc(db, 'trips', selectedTrip.id), { passengers: arrayUnion(user!.uid) });
      setBookingStep(3);
      toast({ title: "Ride Booked" });
    } catch (e) { toast({ variant: "destructive", title: "Failed" }); } finally { setIsBooking(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
  if (!user) return null;

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
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-destructive bg-destructive/10 h-11 w-11 rounded-2xl border border-destructive/20 active:scale-95 transition-all"><ShieldAlert className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={handleReferral} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20 active:scale-95 transition-all"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic leading-none">Scholar,</p>
                <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter leading-tight mt-1">{profile?.fullName?.split(' ')[0]}</h2>
                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full mt-2 tracking-widest">Verified</Badge>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/10 shadow-sm min-w-[100px] backdrop-blur-3xl">
                 <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Points</p>
                 <div className="flex items-center justify-center gap-1 text-primary">
                   <Star className="h-5 w-5 fill-primary animate-pulse" />
                   <span className="text-2xl font-black text-foreground italic leading-none">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                <Card className="glass-card rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden border-primary/20">
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground mb-4 relative z-10 italic">Your Code</p>
                  <h3 className="text-7xl font-black tracking-tighter italic font-headline leading-none mb-8 relative z-10 text-primary text-glow">{profile.activeOtp}</h3>
                  <div className="bg-white/5 p-5 rounded-2xl text-left border border-white/10 relative z-10">
                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Destination</p>
                    <p className="text-sm font-black italic uppercase text-foreground">{profile.destinationStopName}</p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-12 bg-primary text-black rounded-[3rem] shadow-2xl shadow-primary/20 flex items-center justify-between cursor-pointer active:scale-95 transition-all group overflow-hidden relative">
                      <div className="absolute -right-8 -top-8 p-12 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><ConnectingDotsLogo className="h-32 w-32" /></div>
                      <div className="space-y-1 relative z-10">
                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">Find <br/> Ride</h3>
                      </div>
                      <div className="h-20 w-20 rounded-2xl bg-black/5 flex items-center justify-center text-black relative z-10 backdrop-blur-sm">
                        <Navigation className="h-10 w-10" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-white/5 rounded-[2.5rem] p-8 h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                    <DialogHeader className="shrink-0 mb-6 border-b border-white/5 pb-4">
                      <DialogTitle className="text-3xl font-black italic uppercase text-primary tracking-tighter">Book Seat</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Pick Stops</Label>
                            <div className="space-y-3">
                               <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-black italic text-lg outline-none text-foreground appearance-none shadow-sm">
                                 <option value="" className="bg-background">Start Point?</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                               </select>
                               <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-black italic text-lg outline-none text-foreground appearance-none shadow-sm">
                                 <option value="" className="bg-background">End Point?</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-4 pb-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Active Shuttles</Label>
                            {filteredTrips.length === 0 ? (
                               <div className="p-16 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground italic bg-white/5 rounded-3xl border border-dashed border-white/10">Scanning...</div>
                            ) : filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-8 rounded-3xl border-[3px] transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-primary/10 border-primary text-primary shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10'}`}>
                                <h4 className="font-black uppercase italic text-2xl tracking-tighter leading-none">{trip.routeName}</h4>
                                <div className="flex justify-between items-center mt-4">
                                   <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-4 py-1.5 rounded-full">₹{trip.farePerRider}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-500 py-4">
                          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center space-y-3">
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest">Pay UPI</p>
                             <h4 className="text-xl font-black text-foreground italic truncate">{(globalConfig as any)?.[profile?.city === 'Vizag' ? 'vizagUpiId' : 'vzmUpiId'] || 'pay@aago'}</h4>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Promo Code</Label>
                            <div className="flex gap-3">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="CODE" className="h-16 bg-white/5 border-white/10 rounded-2xl font-black italic text-xl px-8 text-primary uppercase" />
                               <Button onClick={handleApplyVoucher} variant="outline" className="h-16 px-8 rounded-2xl font-black uppercase italic text-xs border-primary text-primary">Apply</Button>
                            </div>
                          </div>
                          <div className="p-10 bg-primary/10 rounded-[2.5rem] text-center shadow-2xl">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">Total</p>
                            <h3 className="text-6xl font-black italic text-foreground leading-none tracking-tighter">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-8 shrink-0 border-t border-white/5">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 active:scale-95 transition-all">Next</Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 active:scale-95 transition-all">{isBooking ? <Loader2 className="animate-spin h-8 w-8" /> : "Pay & Book"}</Button>}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-8 bg-white/5 border border-white/10 shadow-xl rounded-[2rem] space-y-2 group active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.3em] mb-1">Rides</p>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary"><Bus className="h-6 w-6" /></div>
                      <span className="text-3xl font-black text-foreground italic leading-none tracking-tighter">{pastTrips?.length || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-8 bg-primary/5 border border-primary/10 shadow-xl rounded-[2rem] space-y-2 group active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-[0.3em] mb-1">Eco Score</p>
                    <div className="flex items-center gap-3 text-primary">
                      <div className="p-2 bg-primary/10 rounded-lg"><Leaf className="h-6 w-6" /></div>
                      <span className="text-3xl font-black italic leading-none tracking-tighter">{((pastTrips?.length || 0) * 0.4).toFixed(1)}kg</span>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            <Card className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
               <h3 className="text-lg font-black italic uppercase tracking-tighter text-foreground leading-none">Safe Mode</h3>
               <div className="p-5 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
                  <div>
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{profile?.emergencyContactName || 'ICE Contact'}</p>
                     <p className="text-sm font-black italic text-foreground">{profile?.emergencyContactPhone || 'Not Set'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleCallContact(profile?.emergencyContactPhone)} className="text-primary rounded-xl h-10 w-10 border border-white/10 active:scale-95 transition-all"><Phone className="h-5 w-5" /></Button>
               </div>
            </Card>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Radar</h2>
              <Button variant="ghost" size="icon" onClick={refreshRadar} className="text-primary h-10 w-10 rounded-xl bg-white/5"><RefreshCw className="h-5 w-5" /></Button>
            </div>
            
            <div className="flex-1 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 relative min-h-[350px]">
               {isLoaded ? (
                 <GoogleMap 
                    mapContainerStyle={mapContainerStyle} 
                    center={mapCenter} 
                    zoom={15} 
                    options={mapOptions}
                    onLoad={onMapLoad}
                    onUnmount={onMapUnmount}
                 >
                   {currentPosition && (
                     <Marker 
                        position={currentPosition} 
                        title="Me"
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          fillColor: '#00FFFF',
                          fillOpacity: 1,
                          strokeColor: '#FFFFFF',
                          strokeWeight: 2,
                          scale: 8
                        }}
                      />
                   )}
                   {activeTrips?.map((trip: any) => (
                     trip.currentLat && trip.currentLng && (
                       <Marker 
                          key={trip.id} 
                          position={{ lat: trip.currentLat, lng: trip.currentLng }} 
                          title={trip.routeName}
                          icon={{
                            url: "https://maps.google.com/mapfiles/ms/icons/bus.png",
                            scaledSize: new google.maps.Size(32, 32)
                          }}
                        />
                     )
                   ))}
                 </GoogleMap>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                   <Loader2 className="animate-spin h-8 w-8 text-primary" />
                   <p className="text-[10px] font-black uppercase tracking-widest italic">Syncing Grid...</p>
                 </div>
               )}
            </div>

            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
               <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Live Signal</h3>
               {!activeTrips || activeTrips.length === 0 ? (
                 <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-white/20">Empty...</div>
               ) : (
                 activeTrips.map((trip: any) => (
                   <div key={trip.id} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm"><Bus className="h-5 w-5" /></div>
                        <div>
                           <p className="font-black italic uppercase text-foreground text-sm leading-none">{trip.routeName}</p>
                           <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">Live Tracking</p>
                        </div>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">{trip.riderCount} Seats</Badge>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">History</h2>
             <div className="space-y-4">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">No past rides.</div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex justify-between items-center shadow-lg">
                      <div className="space-y-1">
                        <h4 className="font-black text-foreground uppercase italic text-2xl leading-none tracking-tighter">{trip.routeName}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">{new Date(trip.endTime).toLocaleDateString()}</p>
                      </div>
                      <span className="text-2xl font-black italic text-primary">₹{trip.farePerRider}</span>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 animate-in fade-in text-center pb-24 pt-10 px-4">
             <div className="flex flex-col items-center gap-8">
                <div className="h-40 w-40 rounded-full bg-primary/10 border-[6px] border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-primary/20" />}
                </div>
                <div className="space-y-3">
                   <h2 className="text-5xl font-black text-foreground italic uppercase leading-none tracking-tighter">{profile?.fullName}</h2>
                   <Badge className="bg-primary text-black border-none text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest shadow-2xl">Scholar ID: {profile?.studentId}</Badge>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-4 text-left">
                <div className="bg-white/5 p-7 rounded-[2rem] flex items-center gap-6 border border-white/10 shadow-xl group">
                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20"><Copy className="h-7 w-7" /></div>
                    <div className="flex-1">
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">My Code</p>
                       <p className="font-black italic text-foreground uppercase text-xl leading-none tracking-tighter">{profile?.referralCode || 'N/A'}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleReferral} className="text-primary hover:bg-primary/10 rounded-xl"><Share2 className="h-5 w-5" /></Button>
                </div>
                {[
                  { label: "Hub", value: profile?.city || 'Vizag', icon: MapPin },
                  { label: "Points", value: `${profile?.loyaltyPoints || 0} Saved`, icon: Star }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 p-7 rounded-[2rem] flex items-center gap-6 border border-white/10 shadow-xl">
                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20"><item.icon className="h-7 w-7" /></div>
                    <div>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">{item.label}</p>
                       <p className="font-black italic text-foreground uppercase text-xl leading-none tracking-tighter">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-20 bg-destructive/10 text-destructive rounded-[2rem] font-black uppercase italic mt-10 border border-destructive/20 active:scale-95 transition-all text-xl">
                Sign Out
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <LayoutGrid className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Find Ride</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('radar')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'radar' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <Zap className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <History className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'me' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <UserIcon className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
