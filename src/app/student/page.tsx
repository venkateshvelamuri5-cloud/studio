
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Search, 
  Bell, 
  QrCode,
  Map as MapIcon,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight,
  Plus,
  Loader2,
  Fingerprint,
  CheckCircle2,
  Phone,
  History,
  User as UserIcon,
  Wallet,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const mapContainerStyle = {
  width: '100%',
  height: '220px',
  borderRadius: '2rem'
};

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
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [destinationStop, setDestinationStop] = useState<string>("");

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Active Buses in the same city
  const { data: activeTrips } = useCollection(useMemo(() => 
    (db && user && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, 
  [db, user, profile?.city]));

  // Active Routes in the same city
  const { data: activeRoutes } = useCollection(useMemo(() => 
    (db && user && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, 
  [db, user, profile?.city]));

  // Trip History for the student
  const { data: pastTrips } = useCollection(useMemo(() => 
    (db && user?.uid) ? query(collection(db, 'trips'), where('passengers', 'array-contains', user.uid), where('status', '==', 'completed'), orderBy('endTime', 'desc'), limit(10)) : null, 
  [db, user?.uid]));

  const currentBooking = useMemo(() => {
    if (!activeTrips || !user?.uid) return null;
    return activeTrips.find(t => t.passengers?.includes(user.uid));
  }, [activeTrips, user?.uid]);

  const currentRoute = useMemo(() => {
    if (!currentBooking || !activeRoutes) return null;
    return activeRoutes.find(r => r.routeName === currentBooking.routeName);
  }, [currentBooking, activeRoutes]);

  const validStops = useMemo(() => {
    if (!currentRoute?.stops) return [];
    return currentRoute.stops.filter((s: any) => typeof s.lat === 'number' && isFinite(s.lat));
  }, [currentRoute]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const handleTopUp = async () => {
    if (!userRef) return;
    updateDoc(userRef, { credits: increment(500) })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update' }));
      });
    toast({ title: "Money Added", description: "₹500 added to your student wallet." });
  };

  const handleBoardRequest = async () => {
    if (!db || !userRef || !user?.uid || !selectedTrip || !destinationStop) return;
    
    if ((profile?.credits || 0) < selectedTrip.farePerRider) {
      toast({ variant: "destructive", title: "Low Balance", description: `You need at least ₹${selectedTrip.farePerRider.toFixed(0)} to book this trip.` });
      return;
    }

    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      updateDoc(userRef, { 
        credits: increment(-selectedTrip.farePerRider),
        activeOtp: otp,
        destinationStopName: destinationStop
      }).catch(() => {});

      updateDoc(doc(db, 'trips', selectedTrip.id), {
        passengers: arrayUnion(user.uid)
      }).catch(() => {});

      setSelectedTrip(null);
      setDestinationStop("");
      toast({ title: "Booking Confirmed", description: "Your boarding code is now active." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not book ride." });
    } finally {
      setIsBooking(false);
    }
  };

  const cancelBooking = async () => {
    if (!userRef || !currentBooking || !db) return;
    try {
      updateDoc(userRef, { activeOtp: null, destinationStopName: null }).catch(() => {});
      // In a real app we might refund, but for MVP we just clear the code
      toast({ title: "Booking Cancelled" });
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-body pb-32">
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">AAGO SCHOLAR</h1>
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.3em] mt-1">{profile?.city} HUB</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 text-slate-400">
             <Bell className="h-5 w-5" />
           </Button>
           <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500">
             <LogOut className="h-5 w-5" />
           </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full overflow-x-hidden">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}</h2>
              <p className="text-slate-500 font-bold italic text-xs uppercase tracking-widest">Ready for your commute?</p>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <div className="space-y-6">
                 {isLoaded && validStops.length > 0 && (
                   <div className="relative h-56 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                     <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={{ lat: validStops[0].lat, lng: validStops[0].lng }}
                        zoom={13}
                        options={mapOptions}
                      >
                        <Polyline
                          path={validStops.map((s: any) => ({ lat: s.lat, lng: s.lng }))}
                          options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 5 }}
                        />
                        {validStops.map((stop: any, i: number) => (
                          <Marker 
                            key={i}
                            position={{ lat: stop.lat, lng: stop.lng }}
                            icon={{
                              url: i === 0 ? 'https://cdn-icons-png.flaticon.com/512/8157/8157580.png' : i === validStops.length - 1 ? 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png' : 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                              scaledSize: new window.google.maps.Size(18, 18)
                            }}
                          />
                        ))}
                      </GoogleMap>
                   </div>
                 )}

                 <Card className="bg-primary text-white border-none rounded-[3rem] p-8 text-center shadow-[0_32px_64px_-12px_rgba(59,130,246,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 animate-pulse" />
                    <Fingerprint className="h-16 w-16 mx-auto mb-6 opacity-40 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 opacity-70">Your Boarding Code</p>
                    <h3 className="text-6xl font-black tracking-[0.2em] italic font-headline leading-none">{profile.activeOtp}</h3>
                    
                    <div className="mt-8 grid grid-cols-2 gap-4">
                       <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-left">
                          <p className="text-[8px] font-black uppercase opacity-60">Route</p>
                          <p className="text-xs font-black italic uppercase truncate">{currentBooking.routeName}</p>
                       </div>
                       <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-left">
                          <p className="text-[8px] font-black uppercase opacity-60">Drop-off</p>
                          <p className="text-xs font-black italic uppercase truncate">{profile.destinationStopName}</p>
                       </div>
                    </div>

                    <div className="mt-8 flex gap-4">
                       <Button 
                         onClick={() => window.open(`tel:${currentBooking.driverPhone || '911'}`, '_self')}
                         className="flex-1 h-14 bg-white text-primary rounded-2xl font-black uppercase italic shadow-lg"
                       >
                          <Phone className="mr-2 h-4 w-4" /> Call Driver
                       </Button>
                       <Button 
                         variant="ghost" 
                         onClick={cancelBooking}
                         className="h-14 w-14 rounded-2xl bg-white/10 text-white"
                       >
                          <ChevronRight className="h-5 w-5" />
                       </Button>
                    </div>
                 </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
                  <DialogTrigger asChild>
                    <div className="p-10 bg-primary rounded-[3.5rem] text-white flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-[0_20px_40px_rgba(59,130,246,0.3)] group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="space-y-2 relative z-10">
                        <h3 className="text-4xl font-black italic uppercase leading-none">Book a Seat</h3>
                        <Badge className="bg-white/20 text-white font-black uppercase text-[9px] tracking-widest border-none">
                          {activeTrips?.length || 0} Buses Available Now
                        </Badge>
                      </div>
                      <Navigation className="h-14 w-14 relative z-10 group-hover:rotate-12 transition-transform" />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-white/5 text-white rounded-[3rem] p-8 max-w-[95vw] mx-auto w-full">
                    {!selectedTrip ? (
                      <div className="space-y-6">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black italic uppercase text-primary">Choose a Bus</DialogTitle>
                          <DialogDescription className="font-bold text-slate-500">Pick an active route near you.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                          {activeTrips?.length === 0 ? (
                            <div className="py-20 text-center">
                               <Info className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                               <p className="text-slate-600 font-black uppercase italic text-xs">No buses are running right now.</p>
                            </div>
                          ) : (
                            activeTrips?.map((trip: any) => (
                              <div 
                                key={trip.id} 
                                onClick={() => setSelectedTrip(trip)}
                                className="p-6 bg-white/5 rounded-[2rem] flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer border border-white/5"
                              >
                                <div>
                                  <h4 className="font-black uppercase italic text-lg leading-none">{trip.routeName}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                     <span className="text-[10px] font-black text-primary italic">₹{trip.farePerRider.toFixed(0)}</span>
                                     <span className="text-[10px] font-bold text-slate-500 uppercase">• {trip.driverName}</span>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-primary transition-colors" />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in slide-in-from-right-4">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black italic uppercase text-primary">Where to get off?</DialogTitle>
                          <DialogDescription className="font-bold text-slate-500">Select your drop-off station.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                          {activeRoutes?.find(r => r.routeName === selectedTrip.routeName)?.stops?.map((stop: any, idx: number) => (
                            <div 
                              key={idx}
                              onClick={() => setDestinationStop(stop.name)}
                              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${destinationStop === stop.name ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                              <span className="font-black italic uppercase text-xs">{stop.name}</span>
                              {destinationStop === stop.name && <CheckCircle2 className="h-5 w-5" />}
                            </div>
                          ))}
                        </div>
                        <Button 
                          onClick={handleBoardRequest} 
                          disabled={isBooking || !destinationStop}
                          className="w-full h-16 bg-primary rounded-2xl font-black uppercase italic text-lg shadow-xl"
                        >
                          {isBooking ? <Loader2 className="animate-spin h-6 w-6" /> : "Confirm & Pay"}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] p-6 shadow-xl group border-none flex flex-col justify-between">
                     <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
                        <Wallet className="h-5 w-5 text-accent" />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">My Balance</p>
                        <div className="flex items-center justify-between">
                           <h3 className="text-3xl font-black text-white italic">₹{(profile?.credits || 0).toFixed(0)}</h3>
                           <Button onClick={handleTopUp} size="icon" className="h-8 w-8 rounded-lg bg-accent text-white hover:bg-accent/90">
                              <Plus className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                  </Card>
                  <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] p-6 shadow-xl flex flex-col items-center justify-center gap-3 group border-none">
                     <QrCode className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-500" />
                     <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-center">Boarding ID</p>
                  </Card>
                </div>
              </div>
            )}

            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 italic px-2">Popular Routes</h4>
               <div className="space-y-4">
                  {activeRoutes?.length === 0 ? (
                    <p className="text-slate-700 font-bold italic text-center py-10 text-xs">No active routes in {profile?.city} right now.</p>
                  ) : (
                    activeRoutes?.slice(0, 3).map((route: any) => (
                      <div key={route.id} className="p-6 bg-slate-900/50 rounded-[2rem] flex items-center justify-between group cursor-pointer active:scale-98 transition-all duration-500 border border-white/5">
                         <div className="flex items-center gap-5">
                            <div className="bg-primary/10 p-4 rounded-2xl group-hover:bg-primary transition-colors duration-500">
                              <MapPin className="h-6 w-6 text-primary group-hover:text-white" />
                            </div>
                            <div>
                              <p className="font-black text-lg italic uppercase text-white leading-none">{route.routeName}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Starting from ₹{route.baseFare}</p>
                            </div>
                         </div>
                         <ChevronRight className="h-6 w-6 text-slate-700 group-hover:text-primary group-hover:translate-x-2 transition-all duration-500" />
                      </div>
                    ))
                  )}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-1">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Ride History</h2>
                <p className="text-slate-500 font-bold italic text-xs uppercase tracking-widest">Your recent activity on the network.</p>
             </div>

             <div className="space-y-4">
                {pastTrips?.map((trip: any) => (
                  <Card key={trip.id} className="bg-slate-900 border-white/5 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-6 flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500">
                             <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                             <h4 className="font-black text-sm text-white uppercase italic leading-none">{trip.routeName}</h4>
                             <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
                                {new Date(trip.endTime).toLocaleDateString()} • {new Date(trip.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-black text-primary italic">₹{trip.farePerRider?.toFixed(0)}</p>
                          <p className="text-[7px] font-black text-slate-600 uppercase">Paid</p>
                       </div>
                    </CardContent>
                  </Card>
                ))}
                {(!pastTrips || pastTrips.length === 0) && (
                  <div className="py-20 text-center opacity-30">
                     <History className="h-12 w-12 mx-auto mb-4" />
                     <p className="text-xs font-black uppercase italic">No ride logs found.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col items-center gap-6 py-6 text-center">
                <div className="h-32 w-32 rounded-[3rem] bg-slate-900 border-4 border-primary/20 flex items-center justify-center text-primary shadow-2xl overflow-hidden">
                  <UserIcon className="h-16 w-16 opacity-20 absolute" />
                  <span className="text-5xl font-black italic relative z-10">{profile?.fullName?.[0]}</span>
                </div>
                <div>
                   <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{profile?.fullName}</h2>
                   <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-[0.3em] mt-2">Verified Scholar</Badge>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem] flex flex-col justify-between">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Rides</p>
                   <h3 className="text-3xl font-black text-white italic">{pastTrips?.length || 0}</h3>
                </Card>
                <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem] flex flex-col justify-between">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">City Hub</p>
                   <h3 className="text-2xl font-black text-white italic">{profile?.city}</h3>
                </Card>
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">Scholar Information</h4>
                <div className="space-y-3">
                   {[
                     { label: 'College / University', value: profile?.collegeName, icon: Info },
                     { label: 'Student ID', value: profile?.studentId, icon: Fingerprint },
                     { label: 'Registered Mobile', value: profile?.phoneNumber, icon: Phone },
                   ].map((item, i) => (
                     <div key={i} className="p-5 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center gap-4">
                        <item.icon className="h-4 w-4 text-slate-500" />
                        <div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                           <p className="text-sm font-black text-white uppercase italic mt-0.5">{item.value}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="w-full h-16 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase italic mt-4"
             >
                <LogOut className="mr-3 h-5 w-5" /> Deactivate Session
             </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-900/90 backdrop-blur-3xl border-t border-white/5 z-50 rounded-t-[3.5rem] shadow-2xl">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('home')}
            className={`flex-col h-auto py-2 gap-1 rounded-2xl ${activeTab === 'home' ? 'text-primary' : 'text-slate-600'}`}
          >
            <Bus className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('history')}
            className={`flex-col h-auto py-2 gap-1 rounded-2xl ${activeTab === 'history' ? 'text-primary' : 'text-slate-600'}`}
          >
            <History className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-widest">Trips</span>
          </Button>
          <div className="relative group -mt-16">
             <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/40 transition-all" />
             <Button 
               onClick={() => setActiveTab('home')}
               className="relative h-20 w-20 rounded-[2.5rem] bg-primary text-white border-[8px] border-slate-950 shadow-2xl hover:scale-110 active:scale-95 transition-all"
             >
               <QrCode className="h-10 w-10" />
             </Button>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => {}} // Placeholder for alerts
            className="flex-col h-auto py-2 gap-1 rounded-2xl text-slate-600"
          >
            <Bell className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-widest">Alerts</span>
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('profile')}
            className={`flex-col h-auto py-2 gap-1 rounded-2xl ${activeTab === 'profile' ? 'text-primary' : 'text-slate-600'}`}
          >
            <UserIcon className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-widest">Account</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
