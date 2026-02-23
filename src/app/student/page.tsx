
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
  Map as MapIcon,
  Share2,
  ShieldAlert,
  Phone
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, limit, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1.5rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true };
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

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: googleMapsApiKey });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db, profile?.city]));
  
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
    toast({ variant: "destructive", title: "SOS Active", description: "Grid safety team is monitoring your signal." });
  };

  const handleReferral = async () => {
    if (!userRef) return;
    await updateDoc(userRef, { loyaltyPoints: increment(50) });
    toast({ title: "Signal Shared", description: "50 Scholar Points added to your vault!" });
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true));
    const snap = await getDocs(vQuery);
    if (snap.empty) {
      toast({ variant: "destructive", title: "Invalid Protocol", description: "Voucher key refused." });
      setAppliedDiscount(0);
    } else {
      setAppliedDiscount(snap.docs[0].data().discountAmount);
      toast({ title: "Discount Synced", description: `Grid balance reduced by ₹${snap.docs[0].data().discountAmount}` });
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
      toast({ title: "Seat Secured", description: `Identity code generated. Earned ${pointsEarned} Points.` });
    } catch (e) { toast({ variant: "destructive", title: "Sync Failed" }); } finally { setIsBooking(false); }
  };

  const scholarTier = useMemo(() => {
    const points = profile?.loyaltyPoints || 0;
    if (points > 1000) return { name: "Platinum Grid", color: "text-primary", bg: "bg-primary/20" };
    if (points > 500) return { name: "Gold Scholar", color: "text-primary/80", bg: "bg-primary/10" };
    return { name: "Bronze Node", color: "text-muted-foreground", bg: "bg-white/5" };
  }, [profile?.loyaltyPoints]);

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset overflow-x-hidden">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none text-primary text-glow">AAGO</h1>
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-1">Scholar App</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-destructive bg-destructive/10 h-11 w-11 rounded-2xl border border-destructive/20 active:scale-95 transition-all shadow-lg"><ShieldAlert className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={handleReferral} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20 active:scale-95 transition-all shadow-lg"><Share2 className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic leading-none">Status: Connected</p>
                <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter leading-tight mt-1">{profile?.fullName?.split(' ')[0]}</h2>
                <Badge className={`${scholarTier.bg} ${scholarTier.color} border-none text-[8px] font-black uppercase px-3 py-1 rounded-full mt-2 tracking-widest shadow-sm`}>{scholarTier.name}</Badge>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/10 shadow-sm min-w-[100px] backdrop-blur-3xl">
                 <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Scholar Points</p>
                 <div className="flex items-center justify-center gap-1">
                   <Star className="h-5 w-5 text-primary fill-primary animate-pulse" />
                   <span className="text-2xl font-black text-foreground italic leading-none">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                <Card className="glass-card rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden border-primary/20">
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground mb-4 relative z-10 italic">Live Identity Code</p>
                  <h3 className="text-7xl font-black tracking-tighter italic font-headline leading-none mb-8 relative z-10 text-primary text-glow">{profile.activeOtp}</h3>
                  <div className="grid grid-cols-1 gap-4 relative z-10">
                    <div className="bg-white/5 p-5 rounded-2xl text-left border border-white/10 shadow-inner">
                      <div className="flex items-center gap-3 mb-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Target Node</p>
                      </div>
                      <p className="text-sm font-black italic uppercase text-foreground">{profile.destinationStopName}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-12 bg-primary text-black rounded-[3rem] shadow-2xl shadow-primary/20 flex items-center justify-between cursor-pointer active:scale-95 transition-all group overflow-hidden relative">
                      <div className="absolute -right-8 -top-8 p-12 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Bus className="h-32 w-32" /></div>
                      <div className="space-y-1 relative z-10">
                        <Badge className="bg-black/10 text-black border-none text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-2">Instant Booking</Badge>
                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">Locate <br/> Shuttles</h3>
                      </div>
                      <div className="h-20 w-20 rounded-2xl bg-black/5 flex items-center justify-center text-black relative z-10 backdrop-blur-sm">
                        <Navigation className="h-10 w-10" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-white/5 rounded-[2.5rem] p-8 h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                    <DialogHeader className="shrink-0 mb-6 border-b border-white/5 pb-4">
                      <DialogTitle className="text-3xl font-black italic uppercase text-primary tracking-tighter">Corridor Access</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Selection Matrix</Label>
                            <div className="space-y-3">
                               <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-black italic text-lg outline-none text-foreground appearance-none shadow-sm">
                                 <option value="" className="bg-background">Current Hub</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                               </select>
                               <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-black italic text-lg outline-none text-foreground appearance-none shadow-sm">
                                 <option value="" className="bg-background">Target Hub</option>
                                 {allStops.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-4 pb-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Active Units</Label>
                            {filteredTrips.length === 0 ? (
                               <div className="p-16 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground italic bg-white/5 rounded-3xl border border-dashed border-white/10">Scanning for signal...</div>
                            ) : filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-8 rounded-3xl border-[3px] transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-primary/10 border-primary text-primary shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10'}`}>
                                <h4 className="font-black uppercase italic text-2xl tracking-tighter leading-none">{trip.routeName}</h4>
                                <div className="flex justify-between items-center mt-4">
                                   <Badge className={`${selectedTrip?.id === trip.id ? 'bg-primary text-black' : 'bg-primary/20 text-primary'} border-none text-[10px] font-black uppercase px-4 py-1.5 rounded-full`}>₹{trip.farePerRider}</Badge>
                                   <p className="text-[9px] font-black text-muted-foreground uppercase">{trip.verifiedPassengers?.length || 0} Boarded</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-500 py-4">
                          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-inner text-center space-y-3">
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest">Grid Payment Node</p>
                             <h4 className="text-xl font-black text-foreground italic truncate tracking-tighter">{(globalConfig as any)?.[profile?.city === 'Vizag' ? 'vizagUpiId' : 'vzmUpiId'] || 'aago.hub@upi'}</h4>
                             <p className="text-[8px] font-bold text-muted-foreground uppercase italic tracking-widest">Verify via UPI Interface</p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-3">Voucher Protocol</Label>
                            <div className="flex gap-3">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="PROTOCOL-KEY" className="h-16 bg-white/5 border-white/10 rounded-2xl font-black italic text-xl px-8 text-primary uppercase shadow-sm" />
                               <Button onClick={handleApplyVoucher} variant="outline" className="h-16 px-8 rounded-2xl font-black uppercase italic text-xs border-primary text-primary shadow-lg active:scale-95 transition-all">Sync</Button>
                            </div>
                          </div>
                          <div className="p-10 bg-primary/10 rounded-[2.5rem] border-[4px] border-white/5 text-center shadow-2xl scale-105">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 italic">Final Settlement</p>
                            <h3 className="text-6xl font-black italic text-foreground leading-none tracking-tighter">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-8 shrink-0 border-t border-white/5">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 transition-all active:scale-95">Verify Fare</Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 transition-all active:scale-95">{isBooking ? <Loader2 className="animate-spin h-8 w-8" /> : "Confirm Clearance"}</Button>}
                      {bookingStep === 3 && <Button onClick={() => { setBookingStep(1); setSelectedTrip(null); }} className="w-full h-18 bg-white/10 text-foreground rounded-2xl font-black uppercase italic text-xl shadow-lg">Session End</Button>}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-8 bg-white/5 border border-white/10 shadow-xl rounded-[2rem] space-y-2 active:scale-95 transition-all group backdrop-blur-3xl">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.3em] mb-1">Missions</p>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:rotate-12 transition-transform"><Bus className="h-6 w-6" /></div>
                      <span className="text-3xl font-black text-foreground italic leading-none tracking-tighter">{pastTrips?.length || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-8 bg-primary/5 border border-primary/10 shadow-xl rounded-[2rem] space-y-2 active:scale-95 transition-all group backdrop-blur-3xl">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-[0.3em] mb-1">Eco-Yield</p>
                    <div className="flex items-center gap-3 text-primary">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform"><Leaf className="h-6 w-6" /></div>
                      <span className="text-3xl font-black italic leading-none tracking-tighter">{( (pastTrips?.length || 0) * 0.4 ).toFixed(1)}kg</span>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><ShieldCheck className="h-6 w-6" /></div>
                  <h3 className="text-lg font-black italic uppercase tracking-tighter leading-none text-foreground">Safety Contacts</h3>
               </div>
               <div className="grid grid-cols-1 gap-3">
                  <div className="p-5 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5 group active:bg-white/10 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground"><UserIcon className="h-5 w-5" /></div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{profile?.emergencyContactName || 'ICE Contact'}</p>
                           <p className="text-sm font-black italic text-foreground">{profile?.emergencyContactPhone || '0000000000'}</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="icon" className="text-primary rounded-xl h-10 w-10 border border-white/10 group-hover:bg-primary group-hover:text-black"><Phone className="h-5 w-5" /></Button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black italic uppercase text-foreground tracking-tighter pl-2">Radar Grid</h2>
            <div className="flex-1 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={currentPosition || DEFAULT_CENTER} zoom={14} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }} />}
                   {activeTrips?.map((trip: any) => (
                     <Marker key={trip.id} position={{ lat: trip.lat || 17.68, lng: trip.lng || 83.21 }} icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/bus.png' }} />
                   ))}
                 </GoogleMap>
               ) : <div className="h-full flex items-center justify-center text-muted-foreground font-black italic animate-pulse text-xs tracking-widest uppercase">Syncing Satellite...</div>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
             <h2 className="text-4xl font-black text-foreground italic uppercase tracking-tighter pl-2">Identity Logs</h2>
             <div className="space-y-4">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 shadow-inner">
                    <History className="h-16 w-16 text-white/5 mx-auto mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">No data fragments found</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex justify-between items-center shadow-lg hover:bg-white/10 transition-all cursor-pointer">
                      <div className="space-y-1">
                        <h4 className="font-black text-foreground uppercase italic text-2xl leading-none tracking-tighter">{trip.routeName}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">{new Date(trip.endTime).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-2xl font-black italic text-primary">₹{trip.farePerRider}</span>
                         <p className="text-[8px] font-black text-muted-foreground uppercase mt-1">Confirmed</p>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-12 animate-in fade-in text-center pb-24 pt-10 px-4">
             <div className="flex flex-col items-center gap-8">
                <div className="h-40 w-40 rounded-full bg-primary/10 border-[6px] border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden relative">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-primary/20" />}
                </div>
                <div className="space-y-3">
                   <h2 className="text-5xl font-black text-foreground italic uppercase leading-none tracking-tighter">{profile?.fullName}</h2>
                   <p className="text-[12px] font-black uppercase text-primary tracking-[0.4em] italic leading-none">{profile?.collegeName}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-4 text-left">
                {[
                  { label: "Identity Hash", value: profile?.studentId, icon: ShieldCheck },
                  { label: "Hub Locale", value: profile?.city || 'Vizag Hub', icon: MapPin },
                  { label: "Status Tier", value: scholarTier.name, icon: Zap }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 p-7 rounded-[2rem] flex items-center gap-6 border border-white/10 shadow-xl active:scale-98 transition-all backdrop-blur-3xl">
                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg border border-primary/20"><item.icon className="h-7 w-7" /></div>
                    <div>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">{item.label}</p>
                       <p className="font-black italic text-foreground uppercase text-xl leading-none tracking-tighter">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-20 bg-destructive/10 text-destructive rounded-[2rem] font-black uppercase italic mt-10 border border-destructive/20 active:scale-95 transition-all shadow-xl">
                <LogOut className="mr-4 h-6 w-6" /> Terminate Session
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground hover:bg-white/5'}`}>
          <LayoutGrid className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Grid</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('map')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'map' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground hover:bg-white/5'}`}>
          <MapIcon className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground hover:bg-white/5'}`}>
          <History className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Logs</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground hover:bg-white/5'}`}>
          <UserIcon className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Bio</span>
        </Button>
      </nav>
    </div>
  );
}
