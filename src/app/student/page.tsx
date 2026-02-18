
"use client";

import { useState, useMemo, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, limit, addDoc, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '3rem' };
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

  const { isLoaded, loadError } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, [db, profile?.city]));
  
  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  const driverRef = useMemo(() => (db && currentBooking?.driverId) ? doc(db, 'users', currentBooking.driverId) : null, [db, currentBooking?.driverId]);
  const { data: driverProfile } = useDoc(driverRef);

  const pastTripsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('passengers', 'array-contains', user.uid), where('status', '==', 'completed'), limit(20));
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(pastTripsQuery);

  const unratedTrip = useMemo(() => {
    return pastTrips?.find(t => !t.studentRating);
  }, [pastTrips]);

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
    if (!driverProfile?.currentLat || !activeRouteData) return 15;
    return Math.floor(Math.random() * 10) + 5; 
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
      type: 'SOS',
      userId: user.uid,
      userName: profile.fullName,
      city: profile.city,
      timestamp: new Date().toISOString(),
      location: currentPosition || 'Unknown'
    });
    toast({ variant: "destructive", title: "SOS Alert Dispatched" });
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
      toast({ title: "Voucher Applied" });
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
      toast({ title: "Seat Secured", description: `Earned ${pointsEarned} Points.` });
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
    toast({ title: "Feedback Received" });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bus className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">AAGO</h1>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">{profile?.city} Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-50 h-11 w-11 rounded-2xl"><AlertTriangle className="h-5 w-5" /></Button>
           <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-5 py-2 rounded-full">Pulse: 100%</Badge>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}.</h2>
                <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">Aago Smart Transit Grid</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50">
                 <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Scholar Rank</p>
                 <div className="flex items-center gap-1.5">
                   <Star className="h-4 w-4 text-accent fill-accent" />
                   <span className="text-sm font-black text-slate-900 uppercase italic">Active</span>
                 </div>
              </div>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                <div className="h-80 w-full rounded-[4rem] overflow-hidden border border-slate-100 shadow-2xl bg-white relative">
                  {isLoaded ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={driverProfile?.currentLat ? { lat: driverProfile.currentLat, lng: driverProfile.currentLng } : (currentPosition || { lat: 17.6868, lng: 83.2185 })} zoom={14} options={mapOptions}>
                      {driverProfile?.currentLat && (
                        <Marker 
                          position={{ lat: driverProfile.currentLat, lng: driverProfile.currentLng }} 
                          icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(40, 40) }}
                          label={{ text: "Shuttle", className: "font-black uppercase text-[10px] text-primary" }}
                        />
                      )}
                      {activeRouteData?.stops && (
                        <Polyline 
                          path={activeRouteData.stops.map((s: any) => ({ lat: s.lat, lng: s.lng }))}
                          options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 6 }}
                        />
                      )}
                    </GoogleMap>
                  ) : <div className="h-full flex items-center justify-center text-slate-400 font-black italic">Radar Offline</div>}
                  <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-xl flex items-center gap-3 border border-slate-100">
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-xs font-black italic">ETA: {etaMinutes} MINS</span>
                  </div>
                </div>

                <Card className="bg-primary text-white border-none rounded-[4rem] p-12 text-center shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-20"><QrCode className="h-12 w-12" /></div>
                  <h3 className="text-8xl font-black tracking-tighter italic font-headline leading-none mb-4">{profile.activeOtp}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] mb-12 opacity-80">Boarding ID</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-6 rounded-3xl text-left border border-white/10">
                      <p className="text-[8px] font-black uppercase opacity-60 mb-1">Corridor</p>
                      <p className="text-xs font-black italic uppercase truncate">{currentBooking.routeName}</p>
                    </div>
                    <div className="bg-white/10 p-6 rounded-3xl text-left border border-white/10">
                      <p className="text-[8px] font-black uppercase opacity-60 mb-1">Arrival Hub</p>
                      <p className="text-xs font-black italic uppercase truncate">{profile.destinationStopName}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6 bg-white border-none shadow-sm rounded-[2.5rem] space-y-2">
                    <p className="text-[8px] font-black uppercase text-slate-400">Scholar Points</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xl font-black text-slate-900 italic">{profile?.loyaltyPoints || 0}</span>
                    </div>
                  </Card>
                  <Card className="p-6 bg-slate-900 border-none shadow-xl rounded-[2.5rem] space-y-2">
                    <p className="text-[8px] font-black uppercase text-primary tracking-widest">Network Status</p>
                    <div className="flex items-center gap-2 text-white">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-xl font-black italic">OPTIMAL</span>
                    </div>
                  </Card>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-14 bg-white border border-slate-100 rounded-[4rem] shadow-xl flex items-center justify-between cursor-pointer hover:shadow-2xl transition-all border-b-8 border-b-primary group">
                      <div className="space-y-3">
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-4 py-1">Mission Finder</Badge>
                        <h3 className="text-5xl font-black italic uppercase text-slate-900 leading-[0.85] tracking-tighter">Find<br/>a Bus</h3>
                      </div>
                      <div className="h-20 w-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner"><Navigation className="h-10 w-10" /></div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none rounded-[4rem] p-12 h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                    <DialogHeader className="mb-8 shrink-0">
                      <DialogTitle className="text-5xl font-black italic uppercase text-primary leading-none tracking-tighter">Station</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-20 bg-slate-50 border-none rounded-3xl px-8 font-black italic text-lg outline-none">
                              <option value="">Start Station</option>
                              {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-20 bg-slate-50 border-none rounded-3xl px-8 font-black italic text-lg outline-none">
                              <option value="">End Station</option>
                              {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="space-y-4 pb-10">
                            {filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-8 rounded-[3rem] border-4 transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-white shadow-xl' : 'bg-slate-50 border-transparent'}`}>
                                <h4 className="font-black uppercase italic text-2xl mb-1">{trip.routeName}</h4>
                                <Badge className={`${selectedTrip?.id === trip.id ? 'bg-white/20 text-white' : 'bg-white text-slate-400'} border-none text-[8px] font-black uppercase`}>₹{trip.farePerRider}</Badge>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {bookingStep === 2 && (
                        <div className="space-y-8 animate-in zoom-in-95">
                          <div className="bg-slate-900 p-10 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="h-12 w-12 text-primary" /></div>
                             <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Official Hub UPI</p>
                             <h4 className="text-lg font-black text-white italic truncate">{profile?.city === 'Vizag' ? (globalConfig as any)?.vizagUpiId : (globalConfig as any)?.vzmUpiId || 'hub.aago@upi'}</h4>
                          </div>
                          <div className="bg-slate-50 p-8 rounded-[3rem] space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Promo Code</Label>
                            <div className="flex gap-2">
                               <Input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} className="h-14 bg-white rounded-xl font-black italic" />
                               <Button onClick={handleApplyVoucher} className="h-14 bg-slate-900 text-white rounded-xl font-black uppercase italic text-[10px]">Check</Button>
                            </div>
                          </div>
                          <div className="p-10 bg-primary/5 rounded-[3.5rem] border-2 border-primary/10 text-center">
                            <p className="text-[11px] font-black uppercase text-primary tracking-widest mb-2 italic">Fare Clearance</p>
                            <h3 className="text-6xl font-black italic text-slate-900 leading-none">₹{Math.max(0, selectedTrip?.farePerRider - appliedDiscount)}</h3>
                          </div>
                        </div>
                      )}
                      {bookingStep === 3 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-8 py-16">
                           <div className="h-32 w-32 bg-green-500 rounded-[3rem] flex items-center justify-center text-white shadow-xl animate-bounce"><CheckCircle2 className="h-16 w-16" /></div>
                           <h3 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Cleared</h3>
                        </div>
                      )}
                    </div>
                    <div className="pt-10 shrink-0">
                      {bookingStep === 1 && <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-xl">Proceed <ArrowRight className="ml-3 h-6 w-6" /></Button>}
                      {bookingStep === 2 && <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-20 bg-green-600 text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-xl">{isBooking ? <Loader2 className="animate-spin h-8 w-8" /> : "Verify Pay"}</Button>}
                      {bookingStep === 3 && <Button onClick={() => { setBookingStep(1); setSelectedTrip(null); }} className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-xl">Return Home</Button>}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
             <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">My Rides</h2>
             <div className="space-y-4">
                {pastTrips?.map((trip: any) => (
                  <Card key={trip.id} className="bg-white border-none rounded-[3rem] p-8 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-black text-slate-900 uppercase italic text-2xl leading-none mb-1">{trip.routeName}</h4>
                      <div className="flex items-center gap-2">
                         <Badge className="bg-slate-50 text-slate-400 border-none text-[8px] font-black uppercase">{new Date(trip.endTime).toLocaleDateString()}</Badge>
                         <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase">₹{trip.farePerRider}</Badge>
                         {trip.studentRating && <Badge className="bg-accent/10 text-accent border-none text-[8px] font-black uppercase">Rated {trip.studentRating}★</Badge>}
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-slate-200" />
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in text-center">
             <div className="flex flex-col items-center gap-8 py-12">
                <div className="h-40 w-40 rounded-[3.5rem] bg-white border-4 border-primary/10 flex items-center justify-center shadow-2xl overflow-hidden">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <span className="text-7xl font-black italic">{profile?.fullName?.[0]}</span>}
                </div>
                <div>
                   <h2 className="text-4xl font-black text-slate-900 italic uppercase leading-none mb-4">{profile?.fullName}</h2>
                   <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.5em] px-8 py-2.5 rounded-full">Scholar</Badge>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                <div className="bg-white p-8 rounded-[2rem] flex items-center gap-6 border border-slate-100 shadow-sm text-left">
                  <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary"><ShieldCheck className="h-6 w-6" /></div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Scholar ID</p>
                     <p className="font-black italic text-slate-900 uppercase text-lg">{profile?.studentId}</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] flex items-center gap-6 border border-slate-100 shadow-sm text-left">
                  <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary"><MapPin className="h-6 w-6" /></div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Regional Hub</p>
                     <p className="font-black italic text-slate-900 uppercase text-lg">{profile?.city}</p>
                  </div>
                </div>
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-24 bg-red-50 text-red-500 rounded-[3.5rem] font-black uppercase italic mt-12 border border-red-100"><LogOut className="mr-4 h-8 w-8" /> Terminate Session</Button>
          </div>
        )}
      </main>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="bg-white border-none rounded-[4rem] p-12 text-center shadow-2xl">
          <DialogHeader><DialogTitle className="text-4xl font-black italic uppercase text-primary tracking-tighter text-center">Rate your Ride</DialogTitle></DialogHeader>
          <div className="py-10 space-y-8">
            <p className="text-sm font-bold text-slate-400 italic">How was your commute on {unratedTrip?.routeName}?</p>
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`p-4 rounded-2xl transition-all ${rating >= star ? 'bg-accent text-white scale-110 shadow-lg' : 'bg-slate-50 text-slate-200'}`}><Star className="h-8 w-8 fill-current" /></button>
              ))}
            </div>
          </div>
          <Button onClick={submitRating} disabled={!rating} className="h-20 bg-primary text-white font-black uppercase italic text-2xl rounded-3xl shadow-xl">Post Feedback</Button>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl border-t border-slate-200 z-50 rounded-t-[5rem] shadow-xl">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Find Bus</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><History className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Rides</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Identity</span></Button>
        </div>
      </nav>
    </div>
  );
}
