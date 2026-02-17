
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowRight
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, limit, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
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

  const { isLoaded, loadError } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, [db, profile?.city]));
  
  const { data: pastTripsRaw } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'trips'), 
      where('passengers', 'array-contains', user.uid), 
      where('status', '==', 'completed'),
      limit(50)
    );
  }, [db, user?.uid]));

  const pastTrips = useMemo(() => {
    if (!pastTripsRaw) return [];
    return [...pastTripsRaw].sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
  }, [pastTripsRaw]);

  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  
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
        const pickupIdx = route.stops?.findIndex((s: any) => s.name === pickupStop);
        const destIdx = route.stops?.findIndex((s: any) => s.name === destinationStop);
        return pickupIdx !== -1 && destIdx !== -1 && pickupIdx < destIdx;
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
    try {
      await addDoc(collection(db, 'alerts'), {
        type: 'SOS',
        userId: user.uid,
        userName: profile.fullName,
        city: profile.city,
        timestamp: new Date().toISOString(),
        location: currentPosition || 'Unknown'
      });
      toast({ variant: "destructive", title: "Emergency SOS Sent", description: "The Aago Ops team has been notified of your location." });
    } catch {
      toast({ variant: "destructive", title: "SOS Failed", description: "Please call local emergency services immediately." });
    }
  };

  const handleConfirmPayment = async () => {
    if (!db || !userRef || !selectedTrip || !destinationStop) return;
    if ((selectedTrip.passengers?.length || 0) >= selectedTrip.maxCapacity) {
      toast({ variant: "destructive", title: "Bus is Full", description: "Please pick another shuttle." });
      return;
    }
    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await updateDoc(userRef, { activeOtp: otp, destinationStopName: destinationStop });
      await updateDoc(doc(db, 'trips', selectedTrip.id), { 
        passengers: arrayUnion(user!.uid)
      });
      setBookingStep(3);
      toast({ title: "Seat Secured!", description: "Your boarding ID is now active." });
    } catch (e) {
      toast({ variant: "destructive", title: "Booking Error", description: "Please try again." });
    } finally {
      setIsBooking(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  const scholarPoints = (pastTrips?.length || 0) * 10 + 50; // Base points
  const carbonSaved = (pastTrips?.length || 0) * 1.2; // kg of CO2 saved

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Bus className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">AAGO</h1>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">{profile?.city} Regional Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 hover:bg-red-50 h-11 w-11 rounded-2xl transition-all hover:scale-110"><AlertTriangle className="h-5 w-5" /></Button>
           <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-5 py-2 rounded-full">Network Pulse: 100%</Badge>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}.</h2>
                <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">Ready for your regional commute?</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col items-center border border-slate-50">
                 <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Scholar Rank</p>
                 <div className="flex items-center gap-1.5">
                   <Star className="h-4 w-4 text-accent fill-accent" />
                   <span className="text-sm font-black text-slate-900 uppercase italic">Elite</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Card className="p-6 bg-white border-none shadow-sm rounded-[2.5rem] space-y-2 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Gift className="h-12 w-12" /></div>
                  <p className="text-[8px] font-black uppercase text-slate-400">Total Points</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-xl font-black text-slate-900 italic">{scholarPoints}</span>
                  </div>
               </Card>
               <Card className="p-6 bg-slate-900 border-none shadow-xl rounded-[2.5rem] space-y-2 group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Globe className="h-12 w-12 text-primary" /></div>
                  <p className="text-[8px] font-black uppercase text-primary tracking-widest">Eco Impact</p>
                  <div className="flex items-center gap-2 text-white">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-xl font-black italic">{carbonSaved.toFixed(1)}kg <span className="text-[10px] opacity-60">CO2</span></span>
                  </div>
               </Card>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <Card className="bg-primary text-white border-none rounded-[4rem] p-12 text-center shadow-[0_40px_80px_-15px_rgba(59,130,246,0.3)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-20 animate-pulse"><QrCode className="h-12 w-12" /></div>
                <h3 className="text-8xl font-black tracking-tighter italic font-headline leading-none mb-6">{profile.activeOtp}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.6em] mb-12 opacity-80 italic">Verified Boarding ID</p>
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-white/10 p-6 rounded-3xl text-left border border-white/10 backdrop-blur-md">
                    <p className="text-[8px] font-black uppercase opacity-60 mb-2">Bus Corridor</p>
                    <p className="text-sm font-black italic uppercase truncate">{currentBooking.routeName}</p>
                  </div>
                  <div className="bg-white/10 p-6 rounded-3xl text-left border border-white/10 backdrop-blur-md">
                    <p className="text-[8px] font-black uppercase opacity-60 mb-2">Arrival Hub</p>
                    <p className="text-sm font-black italic uppercase truncate">{profile.destinationStopName}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-8">
                <div className="h-80 w-full rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-2xl bg-white relative">
                  {isLoaded && !loadError ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={currentPosition || { lat: 17.6868, lng: 83.2185 }} zoom={13} options={mapOptions}>
                      {currentPosition && <Marker position={currentPosition} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png', scaledSize: new window.google.maps.Size(36, 36) }} />}
                    </GoogleMap>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50">
                      <AlertCircle className="h-12 w-12 text-slate-200 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Radar Syncing...</p>
                    </div>
                  )}
                  <Button onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        toast({ title: "Radar Calibrated", description: "Identity located on the regional grid." });
                      });
                    }
                  }} className="absolute bottom-8 right-8 h-14 w-14 rounded-2xl bg-white text-primary shadow-2xl p-0 hover:scale-110 transition-all border border-slate-100">
                    <LocateFixed className="h-7 w-7" />
                  </Button>
                </div>

                <Dialog onOpenChange={(open) => { if (!open) { setBookingStep(1); setSelectedTrip(null); } }}>
                  <DialogTrigger asChild>
                    <div className="p-14 bg-white border border-slate-100 rounded-[4rem] shadow-xl flex items-center justify-between cursor-pointer hover:shadow-2xl transition-all border-b-8 border-b-primary group">
                      <div className="space-y-3">
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-4 py-1">Available Missions</Badge>
                        <h3 className="text-5xl font-black italic uppercase text-slate-900 leading-[0.85] tracking-tighter">Find<br/>a Bus</h3>
                      </div>
                      <div className="h-20 w-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner"><Navigation className="h-10 w-10" /></div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none rounded-[4rem] p-12 max-w-[95vw] sm:max-w-[480px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="mb-8 shrink-0">
                      <DialogTitle className="text-5xl font-black italic uppercase text-primary leading-none tracking-tighter">
                        {bookingStep === 1 ? "Station" : bookingStep === 2 ? "Payment" : "Cleared"}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <div className="relative group">
                              <MapPinned className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-primary group-focus-within:scale-110 transition-all" />
                              <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-20 bg-slate-50 border-none rounded-3xl pl-16 pr-10 font-black italic text-lg appearance-none focus:ring-4 focus:ring-primary/10 outline-none transition-all">
                                <option value="">Starting Station</option>
                                {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="relative group">
                              <Navigation className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-accent group-focus-within:scale-110 transition-all" />
                              <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-20 bg-slate-50 border-none rounded-3xl pl-16 pr-10 font-black italic text-lg appearance-none focus:ring-4 focus:ring-accent/10 outline-none transition-all">
                                <option value="">Arrival Station</option>
                                {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-4 pb-10">
                            <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest ml-4">Live Radar Results</p>
                            {filteredTrips.length === 0 ? (
                              <div className="p-16 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                <Activity className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic leading-relaxed">Scanning for active regional shuttle corridors...</p>
                              </div>
                            ) : (
                              filteredTrips.map((trip: any) => (
                                <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-8 rounded-[3rem] border-4 flex justify-between items-center transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-white shadow-2xl scale-[1.02]' : 'bg-slate-50 border-transparent hover:bg-white hover:shadow-lg'}`}>
                                  <div className="space-y-1.5">
                                    <h4 className="font-black uppercase italic text-2xl leading-none tracking-tight">{trip.routeName}</h4>
                                    <div className="flex items-center gap-2">
                                       <Badge className={`${selectedTrip?.id === trip.id ? 'bg-white/20 text-white' : 'bg-white text-slate-400'} border-none text-[8px] font-black uppercase tracking-widest`}>₹{trip.farePerRider}</Badge>
                                       <Badge className={`${selectedTrip?.id === trip.id ? 'bg-white/20 text-white' : 'bg-green-50 text-green-600'} border-none text-[8px] font-black uppercase tracking-widest`}>{trip.maxCapacity - (trip.passengers?.length || 0)} SEATS</Badge>
                                    </div>
                                  </div>
                                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${selectedTrip?.id === trip.id ? 'bg-white text-primary' : 'bg-white text-slate-200 shadow-inner'}`}>
                                    {selectedTrip?.id === trip.id ? <CheckCircle2 className="h-8 w-8" /> : <ChevronRight className="h-8 w-8" />}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}

                      {bookingStep === 2 && selectedTrip && (
                        <div className="space-y-12 py-8 text-center animate-in zoom-in-95 duration-500">
                          <div className="space-y-4">
                            <div className="h-56 w-56 bg-white border-4 border-primary/10 rounded-[4rem] mx-auto flex items-center justify-center p-10 shadow-2xl relative">
                              <QrCode className="h-full w-full text-slate-900" />
                              <div className="absolute -bottom-4 -right-4 bg-primary p-4 rounded-3xl text-white shadow-xl rotate-12"><Zap className="h-6 w-6" /></div>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Regional UPI Hub Terminal</p>
                          </div>
                          <div className="bg-slate-900 p-10 rounded-[3.5rem] space-y-4 shadow-2xl">
                            <div className="flex items-center justify-center gap-2 text-primary">
                               <IndianRupee className="h-4 w-4" />
                               <p className="text-[9px] font-black uppercase tracking-widest">AAGO Official Endpoint</p>
                            </div>
                            <h4 className="text-2xl font-black text-white italic truncate tracking-tighter">{profile?.city === 'Vizag' ? (globalConfig as any)?.vizagUpiId : (globalConfig as any)?.vzmUpiId || 'hub.aago@upi'}</h4>
                          </div>
                          <div className="p-10 bg-primary/5 rounded-[3.5rem] border-2 border-primary/10 relative overflow-hidden">
                            <div className="absolute top-0 left-0 p-6 opacity-5"><Zap className="h-12 w-12 text-primary" /></div>
                            <p className="text-[11px] font-black uppercase text-primary tracking-widest mb-2 italic">Standard Boarding Fare</p>
                            <h3 className="text-7xl font-black italic text-slate-900 leading-none tracking-tighter">₹{selectedTrip.farePerRider}</h3>
                          </div>
                        </div>
                      )}

                      {bookingStep === 3 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-8 py-16 animate-in zoom-in duration-500">
                           <div className="h-32 w-32 bg-green-500 rounded-[3rem] flex items-center justify-center text-white shadow-[0_20px_50px_rgba(34,197,94,0.3)] animate-bounce">
                             <CheckCircle2 className="h-16 w-16" />
                           </div>
                           <div className="space-y-3">
                             <h3 className="text-4xl font-black italic uppercase text-slate-900 leading-none tracking-tighter">Identity Cleared!</h3>
                             <p className="text-sm font-bold text-slate-400 italic px-6 leading-relaxed">Your regional seat has been secured. Your Boarding ID is now active on the home screen.</p>
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-10 shrink-0">
                      {bookingStep === 1 && (
                        <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-[0_20px_40px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all">Clear Route <ArrowRight className="ml-3 h-6 w-6" /></Button>
                      )}
                      {bookingStep === 2 && (
                        <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-20 bg-green-600 text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-[0_20px_40px_rgba(34,197,94,0.3)] hover:scale-[1.02] transition-all">
                          {isBooking ? <Loader2 className="animate-spin h-8 w-8" /> : "Initiate Boarding"}
                        </Button>
                      )}
                      {bookingStep === 3 && (
                        <Button onClick={() => setBookingStep(1)} className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-xl">Return to Terminal</Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="space-y-1">
               <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">My Rides</h2>
               <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">A secure log of your regional missions</p>
             </div>
             <div className="space-y-4">
                {!pastTrips || pastTrips.length === 0 ? (
                  <Card className="p-20 text-center bg-white rounded-[3.5rem] border-dashed border-4 border-slate-100">
                    <History className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">No mission records found on the regional grid.</p>
                  </Card>
                ) : (
                  pastTrips.map((trip: any) => (
                    <Card key={trip.id} className="bg-white border border-slate-100 rounded-[3rem] p-10 flex justify-between items-center shadow-sm hover:shadow-xl transition-all border-l-8 border-l-primary/10">
                         <div className="flex items-center gap-8">
                            <div className="h-16 w-16 bg-green-50 rounded-[1.5rem] flex items-center justify-center text-green-500 shadow-inner"><CheckCircle2 className="h-8 w-8" /></div>
                            <div>
                              <h4 className="font-black text-slate-900 uppercase italic text-2xl leading-none mb-2 tracking-tight">{trip.routeName}</h4>
                              <div className="flex items-center gap-3">
                                 <Badge className="bg-slate-50 text-slate-400 border-none text-[8px] font-black uppercase tracking-widest">{new Date(trip.endTime).toLocaleDateString()}</Badge>
                                 <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase tracking-widest">₹{trip.farePerRider}</Badge>
                              </div>
                            </div>
                         </div>
                         <ArrowRight className="h-6 w-6 text-slate-200" />
                      </Card>
                    ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-8 animate-in fade-in text-center">
             <div className="p-14 bg-slate-950 text-white rounded-[4rem] shadow-2xl space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-all"><Gift className="h-32 w-32 text-primary" /></div>
                <div className="space-y-4 relative">
                  <Badge className="bg-primary text-slate-950 border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] italic rounded-full">Scholar Rewards</Badge>
                  <h2 className="text-6xl font-black italic uppercase leading-[0.85] tracking-tighter">The<br/>Points<br/>Hub.</h2>
                </div>
                <p className="text-base font-bold text-white/50 italic px-8">Commute across the regional hub to unlock premium scholar status and perks.</p>
                <div className="flex justify-center gap-5 relative">
                   <div className="bg-white/5 backdrop-blur-md px-8 py-5 rounded-3xl border border-white/10 shadow-inner">
                      <p className="text-[8px] font-black uppercase text-primary tracking-widest mb-2">Available Balance</p>
                      <p className="text-3xl font-black text-white italic tracking-tighter">{scholarPoints} PTS</p>
                   </div>
                   <div className="bg-white/5 backdrop-blur-md px-8 py-5 rounded-3xl border border-white/10 shadow-inner">
                      <p className="text-[8px] font-black uppercase text-accent tracking-widest mb-2">Network Status</p>
                      <p className="text-3xl font-black text-white italic tracking-tighter">GOLD</p>
                   </div>
                </div>
             </div>
             
             <div className="space-y-5 text-left pb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-6 italic">Redeemable Scholar Perks</p>
                {[
                  { title: "7-Day Hub Corridor Pass", pts: "1200 PTS", icon: Zap, color: "bg-blue-50 text-blue-500" },
                  { title: "Campus Meal Voucher", pts: "450 PTS", icon: Tag, color: "bg-orange-50 text-orange-500" },
                  { title: "Premium Scholar ID Badge", pts: "250 PTS", icon: ShieldCheck, color: "bg-green-50 text-green-600" },
                  { title: "Hub Hub Discount (20%)", pts: "150 PTS", icon: TrendingUp, color: "bg-purple-50 text-purple-500" },
                ].map((perk, i) => (
                  <Card key={i} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex justify-between items-center shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-6">
                       <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${perk.color} shadow-inner group-hover:scale-110 transition-all`}>
                          <perk.icon className="h-7 w-7" />
                       </div>
                       <div>
                          <h4 className="font-black text-slate-900 uppercase italic text-base leading-none tracking-tight">{perk.title}</h4>
                          <p className="text-[9px] font-black text-slate-300 uppercase mt-1.5 tracking-widest">Network Exclusive</p>
                       </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-black italic px-4 py-2 rounded-xl">{perk.pts}</Badge>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in text-center">
             <div className="flex flex-col items-center gap-10 py-12">
                <div className="h-44 w-44 rounded-[4rem] bg-white border-4 border-primary/10 flex items-center justify-center text-primary shadow-[0_30px_60px_-15px_rgba(59,130,246,0.3)] relative group overflow-hidden">
                  {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-700" /> : <span className="text-8xl font-black italic tracking-tighter">{profile?.fullName?.[0]}</span>}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 p-4 rounded-3xl text-white shadow-2xl border-4 border-white"><ShieldCheck className="h-7 w-7" /></div>
                </div>
                <div>
                   <h2 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-4">{profile?.fullName}</h2>
                   <div className="flex items-center justify-center gap-3">
                      <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.5em] px-8 py-2.5 rounded-full">Verified Scholar</Badge>
                      <Badge className="bg-slate-900 text-white border-none text-[9px] font-black uppercase tracking-[0.4em] px-8 py-2.5 rounded-full">Hub Member</Badge>
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                {[
                  { label: "Scholar Identity ID", val: profile?.studentId, icon: Activity },
                  { label: "Regional Campus", val: profile?.collegeName, icon: Bus },
                  { label: "Primary Terminal", val: profile?.city, icon: MapPin },
                  { label: "Account Status", val: "ACTIVE", icon: ShieldCheck },
                ].map((item, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2rem] flex items-center gap-6 border border-slate-100 shadow-sm text-left hover:shadow-md transition-all">
                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary shadow-inner"><item.icon className="h-6 w-6" /></div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</p>
                       <p className="font-black italic text-slate-900 uppercase text-lg leading-none tracking-tight">{item.val}</p>
                    </div>
                  </div>
                ))}
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-24 bg-red-50 hover:bg-red-100 text-red-500 rounded-[3.5rem] font-black uppercase italic transition-all mt-12 border border-red-100 group">
                <LogOut className="mr-4 h-8 w-8 group-hover:-translate-x-2 transition-transform" /> 
                <span className="text-xl">Terminate Session</span>
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl border-t border-slate-200 z-50 rounded-t-[5rem] shadow-[0_-30px_60px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Find Bus</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><History className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Rides</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('rewards')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'rewards' ? 'text-primary scale-110' : 'text-slate-400'}`}><Gift className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Rewards</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-4 gap-3 rounded-3xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-9 w-9" /><span className="text-[10px] font-black uppercase tracking-widest">Identity</span></Button>
        </div>
      </nav>
    </div>
  );
}

