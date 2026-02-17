
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Bus, 
  MapPin, 
  QrCode,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight,
  Loader2,
  CheckCircle2,
  History,
  User as UserIcon,
  Clock,
  Info,
  ShieldCheck,
  MapPinned,
  LocateFixed,
  Zap,
  Phone,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, orderBy, limit, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { firebaseConfig } from '@/firebase/config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '2.5rem' };
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
  
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Search, 2: Payment, 3: Confirmation
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [pickupStop, setPickupStop] = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: firebaseConfig.apiKey });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: pastTrips } = useCollection(useMemo(() => (db && user?.uid) ? query(collection(db, 'trips'), where('passengers', 'array-contains', user.uid), where('status', '==', 'completed'), orderBy('endTime', 'desc'), limit(10)) : null, [db, user?.uid]));

  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  
  const allStops = useMemo(() => {
    const stops = new Set<string>();
    activeRoutes?.forEach(r => r.stops?.forEach((s: any) => stops.add(s.name)));
    return Array.from(stops);
  }, [activeRoutes]);

  const filteredTrips = useMemo(() => {
    if (!pickupStop || !destinationStop) return [];
    return activeTrips?.filter(trip => {
      const route = activeRoutes?.find(r => r.routeName === trip.routeName);
      if (!route) return false;
      const pickupIdx = route.stops?.findIndex((s: any) => s.name === pickupStop);
      const destIdx = route.stops?.findIndex((s: any) => s.name === destinationStop);
      return pickupIdx !== -1 && destIdx !== -1 && pickupIdx < destIdx;
    }) || [];
  }, [activeTrips, activeRoutes, pickupStop, destinationStop]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleConfirmPayment = async () => {
    if (!db || !userRef || !selectedTrip || !destinationStop) return;
    
    if (selectedTrip.riderCount >= selectedTrip.maxCapacity) {
      toast({ variant: "destructive", title: "Shuttle Full", description: "No seats remaining on this mission." });
      return;
    }

    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      await updateDoc(userRef, { activeOtp: otp, destinationStopName: destinationStop });
      await updateDoc(doc(db, 'trips', selectedTrip.id), { 
        passengers: arrayUnion(user!.uid),
        riderCount: increment(1)
      });

      setBookingStep(3);
      toast({ title: "Seat Secured", description: "Your unique Boarding ID is now active." });
    } catch {
      toast({ variant: "destructive", title: "Allotment failed" });
    } finally {
      setIsBooking(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bus className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">AAGO</h1><p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">{profile?.city} REGION</p></div>
        </div>
        <Badge className="bg-green-500/10 text-green-600 border-none text-[8px] font-black uppercase tracking-widest px-4 py-1.5">Network Live</Badge>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Hello, Scholar.</h2>
              <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">Regional Mobility Terminal</p>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <Card className="bg-primary text-white border-none rounded-[3.5rem] p-12 text-center shadow-2xl shadow-primary/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-20"><QrCode className="h-10 w-10" /></div>
                <h3 className="text-8xl font-black tracking-tight italic font-headline leading-none mb-4">{profile.activeOtp}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-12 opacity-70 italic">Verified Boarding ID</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-5 rounded-2xl text-left border border-white/10">
                    <p className="text-[7px] font-black uppercase opacity-60 mb-1">Active Route</p>
                    <p className="text-sm font-black italic uppercase truncate">{currentBooking.routeName}</p>
                  </div>
                  <div className="bg-white/10 p-5 rounded-2xl text-left border border-white/10">
                    <p className="text-[7px] font-black uppercase opacity-60 mb-1">Drop Point</p>
                    <p className="text-sm font-black italic uppercase truncate">{profile.destinationStopName}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-8">
                <div className="h-72 w-full rounded-[3rem] overflow-hidden border border-slate-200 shadow-sm bg-white relative">
                  {isLoaded && !loadError ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={currentPosition || { lat: 17.6868, lng: 83.2185 }} zoom={13} options={mapOptions}>
                      {currentPosition && <Marker position={currentPosition} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png', scaledSize: new window.google.maps.Size(32, 32) }} />}
                    </GoogleMap>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                      <AlertCircle className="h-10 w-10 text-slate-300 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Network Radar Offline</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase italic">Map API Not Enabled</p>
                    </div>
                  )}
                  {isLoaded && <Button onClick={() => setCurrentPosition(null)} className="absolute bottom-6 right-6 h-12 w-12 rounded-2xl bg-white text-primary shadow-xl p-0"><LocateFixed className="h-6 w-6" /></Button>}
                </div>

                <Dialog onOpenChange={(open) => { if (!open) { setBookingStep(1); setSelectedTrip(null); } }}>
                  <DialogTrigger asChild>
                    <div className="p-12 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm flex items-center justify-between cursor-pointer hover:shadow-xl transition-all border-b-4 border-b-primary group">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Live Commute</p>
                        <h3 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Find a Bus</h3>
                      </div>
                      <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><Navigation className="h-8 w-8" /></div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none rounded-[3.5rem] p-10 max-w-[95vw] sm:max-w-[450px] shadow-2xl h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="mb-6 shrink-0">
                      <DialogTitle className="text-4xl font-black italic uppercase text-primary leading-none">
                        {bookingStep === 1 ? "Route Finder" : bookingStep === 2 ? "Payment ID" : "Success"}
                      </DialogTitle>
                      <DialogDescription className="text-[10px] font-bold uppercase tracking-widest mt-3">
                        {bookingStep === 1 ? "Select terminal stations" : bookingStep === 2 ? "Scan and pay directly" : "Mission clearance granted"}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                      {bookingStep === 1 && (
                        <>
                          <div className="space-y-4">
                            <div className="relative">
                              <MapPinned className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                              <select value={pickupStop} onChange={e => setPickupStop(e.target.value)} className="w-full h-18 bg-slate-50 border-none rounded-2xl pl-14 pr-8 font-black italic text-base appearance-none focus:ring-2 focus:ring-primary">
                                <option value="">Pickup Point</option>
                                {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="relative">
                              <Navigation className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                              <select value={destinationStop} onChange={e => setDestinationStop(e.target.value)} className="w-full h-18 bg-slate-50 border-none rounded-2xl pl-14 pr-8 font-black italic text-base appearance-none focus:ring-2 focus:ring-accent">
                                <option value="">Drop Point</option>
                                {allStops.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-400 italic">Available Regional Shuttles</p>
                            {filteredTrips.map((trip: any) => (
                              <div key={trip.id} onClick={() => setSelectedTrip(trip)} className={`p-8 rounded-[2.5rem] border-2 flex justify-between items-center transition-all cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-primary border-primary text-white shadow-xl scale-[1.02]' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                <div>
                                  <h4 className="font-black uppercase italic text-xl leading-none">{trip.routeName}</h4>
                                  <p className={`text-[9px] font-bold uppercase mt-2 ${selectedTrip?.id === trip.id ? 'opacity-80' : 'text-slate-400'}`}>₹{trip.farePerRider} • {trip.riderCount}/{trip.maxCapacity} Seats</p>
                                </div>
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${selectedTrip?.id === trip.id ? 'bg-white text-primary' : 'bg-white text-slate-300'}`}>
                                  {selectedTrip?.id === trip.id ? <CheckCircle2 className="h-7 w-7" /> : <ChevronRight className="h-6 w-6" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {bookingStep === 2 && selectedTrip && (
                        <div className="space-y-10 py-6 text-center animate-in fade-in slide-in-from-bottom-4">
                          <div className="space-y-4">
                            <div className="h-48 w-48 bg-white border-2 border-primary/10 rounded-[2.5rem] mx-auto flex items-center justify-center p-8 shadow-sm">
                              <QrCode className="h-full w-full text-slate-900" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Scan QR or Use ID Below</p>
                          </div>
                          <div className="bg-slate-900 p-8 rounded-[2rem] space-y-3">
                            <p className="text-[8px] font-black text-primary uppercase tracking-widest">AAGO PAYMENT HUB ID</p>
                            <h4 className="text-xl font-black text-white italic truncate">{profile?.city === 'Vizag' ? globalConfig?.vizagUpiId : globalConfig?.vzmUpiId || 'payments.aago@upi'}</h4>
                          </div>
                          <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">FIXED HUB FARE</p>
                            <h3 className="text-5xl font-black italic text-slate-900 leading-none">₹{selectedTrip.farePerRider}</h3>
                          </div>
                        </div>
                      )}

                      {bookingStep === 3 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                           <div className="h-24 w-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/20">
                             <CheckCircle2 className="h-12 w-12" />
                           </div>
                           <h3 className="text-3xl font-black italic uppercase text-slate-900">Seat Allotted</h3>
                           <p className="text-sm font-bold text-slate-400 italic">Your boarding ID is now active on the dashboard. Use it to board your shuttle.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-8 shrink-0">
                      {bookingStep === 1 && (
                        <Button onClick={() => setBookingStep(2)} disabled={!selectedTrip} className="w-full h-18 bg-primary text-white rounded-[1.5rem] font-black uppercase italic text-xl shadow-xl active:scale-95 transition-all">Initiate Regional Payment</Button>
                      )}
                      {bookingStep === 2 && (
                        <Button onClick={handleConfirmPayment} disabled={isBooking} className="w-full h-18 bg-green-600 text-white rounded-[1.5rem] font-black uppercase italic text-xl shadow-xl active:scale-95 transition-all">Confirm Payment Success</Button>
                      )}
                      {bookingStep === 3 && (
                        <Button onClick={() => window.location.reload()} className="w-full h-18 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase italic text-xl shadow-xl">Back to Dashboard</Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-6">
                  <Card className="bg-white border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6"><Bus className="h-6 w-6" /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Network</p>
                      <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">{activeRoutes?.length || 0} Routes</h3>
                    </div>
                  </Card>
                  <Card onClick={() => setActiveTab('history')} className="bg-white border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-xl transition-all group">
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-white transition-all"><History className="h-6 w-6" /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Trips</p>
                      <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">{pastTrips?.length || 0} Missions</h3>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="space-y-1">
               <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">My Ledger</h2>
               <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">History of regional grid movement</p>
             </div>
             <div className="space-y-4">
                {pastTrips?.length === 0 ? (
                  <Card className="bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center">
                    <History className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Mission Data Yet</p>
                  </Card>
                ) : (
                  pastTrips?.map((trip: any) => (
                    <Card key={trip.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex justify-between items-center shadow-sm hover:translate-x-2 transition-all">
                       <div className="flex items-center gap-6">
                          <div className="h-14 w-14 bg-green-50 rounded-[1.25rem] flex items-center justify-center text-green-500 shadow-inner"><CheckCircle2 className="h-7 w-7" /></div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase italic text-lg leading-none mb-1.5">{trip.routeName}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{new Date(trip.endTime).toLocaleDateString()} • ₹{trip.farePerRider}</p>
                          </div>
                       </div>
                       <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase px-3">Settled</Badge>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in text-center">
             <div className="flex flex-col items-center gap-8 py-10">
                <div className="h-40 w-40 rounded-[3.5rem] bg-white border-4 border-primary/10 flex items-center justify-center text-primary shadow-2xl overflow-hidden group">
                  <span className="text-7xl font-black italic">{profile?.fullName?.[0]}</span>
                </div>
                <div>
                   <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-3">{profile?.fullName}</h2>
                   <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.5em] px-6 py-2 rounded-full">Scholar Identity Verified</Badge>
                </div>
             </div>
             <div className="space-y-4">
                {[ 
                  { label: 'College Hub', value: profile?.collegeName, icon: Info }, 
                  { label: 'Scholar ID', value: profile?.studentId, icon: ShieldCheck },
                  { label: 'Registered Hub', value: profile?.city, icon: MapPin } 
                ].map((item, i) => (
                  <div key={i} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner"><item.icon className="h-6 w-6" /></div>
                    <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{item.label}</p>
                      <p className="text-lg font-black text-slate-900 uppercase italic mt-1 leading-tight">{item.value}</p>
                    </div>
                  </div>
                ))}
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-20 bg-red-50 hover:bg-red-100 text-red-500 rounded-[2.5rem] font-black uppercase italic transition-all mt-8"><LogOut className="mr-3 h-6 w-6" /> Terminate Session</Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl border-t border-slate-200 z-50 rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === 'home' ? 'text-primary' : 'text-slate-400'}`}><Bus className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Radar</span></Button>
          <div className="relative -mt-20 group">
            <div className="absolute -inset-4 bg-primary/20 blur-[30px] rounded-full" />
            <Button onClick={() => setActiveTab('home')} className="relative h-24 w-24 rounded-[2.5rem] bg-primary text-white border-[10px] border-white shadow-2xl hover:scale-110 transition-all"><QrCode className="h-12 w-12" /></Button>
          </div>
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === 'history' ? 'text-primary' : 'text-slate-400'}`}><History className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Ledger</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === 'profile' ? 'text-primary' : 'text-slate-400'}`}><UserIcon className="h-8 w-8" /><span className="text-[9px] font-black uppercase tracking-widest">Me</span></Button>
        </div>
      </nav>
    </div>
  );
}
