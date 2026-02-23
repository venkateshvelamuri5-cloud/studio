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

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1.5rem' };
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
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db, profile?.city]));
  
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
    toast({ variant: "destructive", title: "SOS Alert Sent", description: "Security team notified." });
  };

  const handleApplyVoucher = async () => {
    if (!db || !voucherCode) return;
    try {
      const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(vQuery);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Voucher" });
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
      toast({ title: "Seat Secured", description: `Earned ${pointsEarned} Points!` });
    } catch (e) {
      toast({ variant: "destructive", title: "Booking Failed" });
    } finally {
      setIsBooking(false);
    }
  };

  const scholarTier = useMemo(() => {
    const points = profile?.loyaltyPoints || 0;
    if (points > 500) return { name: "Platinum", color: "text-orange-600", bg: "bg-orange-100" };
    if (points > 200) return { name: "Gold", color: "text-orange-500", bg: "bg-orange-50" };
    return { name: "Bronze", color: "text-slate-500", bg: "bg-slate-50" };
  }, [profile?.loyaltyPoints]);

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/auth/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none text-primary">AAGO</h1>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Scholar Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 bg-red-50 h-10 w-10 rounded-xl border border-red-100 shadow-sm active:scale-95 transition-all"><AlertTriangle className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 overflow-x-hidden max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-slate-400 text-xs font-bold italic">Welcome back,</p>
                <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-tight">{profile?.fullName?.split(' ')[0]}</h2>
                <Badge className={`${scholarTier.bg} ${scholarTier.color} border-none text-[8px] font-black uppercase px-3 py-1 rounded-full mt-2 tracking-widest`}>{scholarTier.name} Tier</Badge>
              </div>
              <div className="bg-white p-4 rounded-2xl text-center border border-slate-100 shadow-sm min-w-[100px]">
                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Points</p>
                 <div className="flex items-center justify-center gap-1">
                   <Star className="h-4 w-4 text-primary fill-primary" />
                   <span className="text-xl font-black text-slate-900 italic leading-none">{profile?.loyaltyPoints || 0}</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                <Card className="bg-white border-orange-100 rounded-[2rem] p-8 text-center shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-orange-50/30" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2 relative z-10">Boarding ID</p>
                  <h3 className="text-6xl font-black tracking-tighter italic font-headline leading-none mb-6 relative z-10 text-primary">{profile.activeOtp}</h3>
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Route</p>
                      <p className="text-[10px] font-black italic uppercase truncate text-slate-900">{currentBooking.routeName}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Target</p>
                      <p className="text-[10px] font-black italic uppercase truncate text-slate-900">{profile.destinationStopName}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-10 bg-primary text-white rounded-[2.5rem] shadow-2xl shadow-orange-200 flex items-center justify-between cursor-pointer active:scale-95 transition-all group">
                      <div className="space-y-1">
                        <Badge className="bg-white/20 text-white border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">New Trip</Badge>
                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">Find <br/> my Bus</h3>
                      </div>
                      <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                        <Navigation className="h-8 w-8" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none rounded-[2rem] p-8 h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                    <DialogHeader className="shrink-0 mb-6">
                      <DialogTitle className="text-3xl font-black italic uppercase text-primary tracking-tighter">Grid Booking</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Stations</Label>
                            <div className="space-y-3">
                               <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black italic text-sm outline-none text-slate-900 appearance-none">
                                 <option value="">Start Station</option>
                                 {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                               <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black italic text-sm outline-none text-slate-900 appearance-none">
                                 <option value="">End Station</option>
                                 {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-4 pb-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Active Shuttles</Label>
                            {filteredTrips.length === 0 ? (
                               <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic bg-slate-50 rounded-2xl border border-dashed border-slate-100">No buses on this corridor</div>
                            ) : filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-6 rounded-2xl border-[2px] transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-orange-50 border-primary text-primary shadow-sm' : 'bg-white border-slate-100'}`}>
                                <h4 className="font-black uppercase italic text-xl tracking-tighter leading-none">{trip.routeName}</h4>
                                <div className="flex justify-between items-center mt-3">
                                   <Badge className={`${selectedTrip?.id === trip.id ? 'bg-primary text-white' : 'bg-orange-100 text-primary'} border-none text-[8px] font-black uppercase px-3 py-1`}>₹{trip.farePerRider}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-500">
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner text-center">
                             <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-2">UPI Gateway</p>
                             <h4 className="text-sm font-black text-slate-900 italic truncate tracking-tighter">{(globalConfig as any)?.[profile?.city === 'Vizag' ? 'vizagUpiId' : 'vzmUpiId'] || 'aago.hub@upi'}</h4>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Promo Code</Label>
                            <div className="flex gap-2">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="CODE" className="h-14 bg-slate-50 border-slate-100 rounded-xl font-black italic text-lg px-6 text-primary" />
                               <Button onClick={handleApplyVoucher} variant="outline" className="h-14 px-6 rounded-xl font-black uppercase italic text-[10px] border-primary text-primary">Apply</Button>
                            </div>
                          </div>
                          <div className="p-8 bg-orange-50 rounded-[2rem] border-[4px] border-white text-center shadow-lg">
                            <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1 italic">Final Fare</p>
                            <h3 className="text-5xl font-black italic text-slate-900 leading-none tracking-tighter">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-6 shrink-0">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-orange-200">Next Step</Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-orange-200">{isBooking ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Payment"}</Button>}
                      {bookingStep === 3 && <Button onClick={() => { setBookingStep(1); setSelectedTrip(null); }} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-lg">Done</Button>}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-2 active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Rides</p>
                    <div className="flex items-center gap-2">
                      <Bus className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-black text-slate-900 italic leading-none">{pastTrips?.length || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-6 bg-orange-50 border border-orange-100 shadow-sm rounded-2xl space-y-2 active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">CO2 Saved</p>
                    <div className="flex items-center gap-2 text-primary">
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
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter pl-1">Live Grid</h2>
            <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-lg bg-white relative">
               {isLoaded ? (
                 <GoogleMap mapContainerStyle={mapContainerStyle} center={currentPosition || DEFAULT_CENTER} zoom={13} options={mapOptions}>
                   {currentPosition && <Marker position={currentPosition} />}
                 </GoogleMap>
               ) : <div className="h-full flex items-center justify-center text-slate-300 font-black italic animate-pulse">Syncing...</div>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
             <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter pl-1">Ride History</h2>
             <div className="space-y-3">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
                    <History className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No records found</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-white border border-slate-100 rounded-2xl p-6 flex justify-between items-center shadow-sm">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 uppercase italic text-lg leading-none tracking-tighter">{trip.routeName}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(trip.endTime).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-lg font-black italic text-primary">₹{trip.farePerRider}</span>
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
                <div className="h-32 w-32 rounded-full bg-orange-50 border-4 border-white flex items-center justify-center shadow-xl overflow-hidden relative">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-12 w-12 text-orange-200" />}
                </div>
                <div className="space-y-2">
                   <h2 className="text-4xl font-black text-slate-900 italic uppercase leading-none tracking-tighter">{profile?.fullName}</h2>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{profile?.collegeName}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-3 text-left">
                {[
                  { label: "Student ID", value: profile?.studentId, icon: ShieldCheck },
                  { label: "City Hub", value: profile?.city || 'Not Set', icon: MapPin },
                  { label: "Rewards Tier", value: scholarTier.name, icon: Zap }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl flex items-center gap-4 border border-slate-100 shadow-sm active:scale-98 transition-all">
                    <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-primary shadow-sm"><item.icon className="h-5 w-5" /></div>
                    <div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                       <p className="font-black italic text-slate-900 uppercase text-lg leading-none tracking-tighter">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-16 bg-red-50 text-red-500 rounded-2xl font-black uppercase italic mt-6 border border-red-100 active:scale-95 transition-all">
                <LogOut className="mr-3 h-5 w-5" /> End Session
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-2xl border-t border-slate-100 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'home' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <LayoutGrid className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('map')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'map' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <MapIcon className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Radar</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'history' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <History className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">History</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'profile' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <UserIcon className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
