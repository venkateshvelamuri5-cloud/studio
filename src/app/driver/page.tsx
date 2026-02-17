
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bus, 
  Power, 
  Loader2, 
  LogOut, 
  IndianRupee, 
  Fingerprint,
  CheckCircle2,
  Navigation,
  Bell,
  MapPin,
  ArrowRight,
  Users,
  TrendingUp,
  Wallet,
  AlertCircle,
  Phone,
  History,
  User as UserIcon,
  ChevronRight,
  Map as MapIcon,
  MapPinned,
  CreditCard,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, increment, arrayUnion, getDocs, limit, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const mapContainerStyle = {
  width: '100%',
  height: '240px',
  borderRadius: '1.5rem'
};

const mapOptions = {
  mapId: "da87e9c90896eba04be76dde",
  disableDefaultUI: true,
  zoomControl: false,
};

type Stop = {
  name: string;
  lat: number;
  lng: number;
};

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'trips' | 'history' | 'profile'>('trips');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const prevPassengerCount = useRef(0);

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Routes for the city
  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  // Trip History
  const historyQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'trips'), 
      where('driverId', '==', user.uid), 
      where('status', '==', 'completed'),
      orderBy('endTime', 'desc'),
      limit(10)
    );
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(historyQuery);

  // Listen for active trip
  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const tripData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        const currentCount = tripData.passengers?.length || 0;
        if (currentCount > prevPassengerCount.current) {
          toast({ title: "New Student Booking!", description: "A student has reserved a seat on your shuttle." });
        }
        prevPassengerCount.current = currentCount;
        setActiveTrip(tripData);
      } else {
        setActiveTrip(null);
        prevPassengerCount.current = 0;
      }
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: 'trips',
        operation: 'list'
      });
      errorEmitter.emit('permission-error', permissionError);
    });
    return unsubscribe;
  }, [db, user?.uid, toast]);

  // Fetch passenger details
  const { data: passengerDetails } = useCollection(useMemo(() => {
    if (!db || !user || !activeTrip?.passengers?.length) return null;
    return query(collection(db, 'users'), where('uid', 'in', activeTrip.passengers));
  }, [db, user, activeTrip?.passengers]));

  const currentRoute = useMemo(() => {
    if (!activeTrip || !allRoutes) return null;
    return allRoutes.find((r: any) => r.routeName === activeTrip.routeName);
  }, [activeTrip, allRoutes]);

  const validStops = useMemo(() => {
    if (!currentRoute?.stops) return [];
    return currentRoute.stops.filter((s: any) => typeof s.lat === 'number' && isFinite(s.lat));
  }, [currentRoute?.stops]);

  const mapCenter = useMemo(() => {
    const lat = Number(profile?.currentLat);
    const lng = Number(profile?.currentLng);
    if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
    return { lat: 17.6868, lng: 83.2185 };
  }, [profile?.currentLat, profile?.currentLng]);

  const currentStopIndex = activeTrip?.currentStopIndex || 0;
  const nextStop = currentRoute?.stops?.[currentStopIndex + 1];

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/driver/login');
  };

  const toggleDuty = async () => {
    if (!userRef) return;
    const newStatus = profile?.status === 'offline' ? 'available' : 'offline';
    updateDoc(userRef, { status: newStatus }).catch((e) => {
      const error = new FirestorePermissionError({ path: userRef.path, operation: 'update' });
      errorEmitter.emit('permission-error', error);
    });
    toast({ title: `You are now ${newStatus.toUpperCase()}` });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      let multiplier = 1.0;
      if (profile.vehicleType === 'Mini-Bus') multiplier = route.miniBusMultiplier || 1.2;
      else if (profile.vehicleType === 'Van') multiplier = route.vanMultiplier || 1.5;
      
      const farePerRider = (route.baseFare + (route.surgeFare || 0)) * multiplier;

      const tripData = {
        driverId: user.uid,
        driverName: profile.fullName,
        driverPhone: profile.phoneNumber,
        routeName: route.routeName,
        farePerRider,
        status: 'active',
        totalFareCollected: 0,
        passengers: [],
        verifiedPassengers: [],
        startTime: new Date().toISOString(),
        currentStopIndex: 0
      };
      
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id }).catch(() => {});
      toast({ title: "Trip Started", description: `Route: ${route.routeName}` });
    } catch {
      toast({ variant: "destructive", title: "Could not start trip" });
    } finally {
      setIsUpdating(false);
    }
  };

  const goToNextStop = async () => {
    if (!db || !activeTrip) return;
    setIsUpdating(true);
    try {
      updateDoc(doc(db, 'trips', activeTrip.id), {
        currentStopIndex: currentStopIndex + 1
      }).catch(() => {});
      toast({ title: "Arrived at Stop", description: `${nextStop?.name}` });
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    try {
      const q = query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim()), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "The boarding ID entered is incorrect." });
      } else {
        const rider = snap.docs[0].data();
        updateDoc(doc(db, 'trips', activeTrip.id), {
          verifiedPassengers: arrayUnion(rider.uid),
          totalFareCollected: increment(activeTrip.farePerRider)
        }).catch(() => {});
        updateDoc(doc(db, 'users', rider.uid), { activeOtp: null }).catch(() => {});
        toast({ title: "Student Verified", description: `${rider.fullName} has boarded.` });
        setVerificationOtp("");
      }
    } catch {
      toast({ variant: "destructive", title: "Verification failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const totalCollected = activeTrip.totalFareCollected || 0;
      const driverPayout = totalCollected * 0.90;

      updateDoc(doc(db, 'trips', activeTrip.id), {
        status: 'completed',
        endTime: new Date().toISOString(),
        commissionAmount: totalCollected * 0.10,
        payoutAmount: driverPayout
      }).catch(() => {});

      updateDoc(userRef, {
        status: 'available',
        activeTripId: null,
        totalTrips: increment(1),
        weeklyEarnings: increment(driverPayout)
      }).catch(() => {});

      toast({ title: "Trip Complete", description: `Earnings: ₹${driverPayout.toFixed(0)}` });
      setActiveTab('history');
    } catch {
      toast({ variant: "destructive", title: "Could not finish trip" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-body pb-28">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl overflow-hidden border border-primary/20">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} className="h-full w-full object-cover" alt="Me" />
            ) : (
              <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-black italic">{profile?.fullName?.[0]}</div>
            )}
          </div>
          <div>
            <h1 className="font-black text-sm uppercase italic text-white leading-none">{profile?.fullName}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-800' : 'bg-green-500/10 text-green-400'} border-none text-[8px] font-black uppercase tracking-widest px-2 mt-1`}>
              {profile?.status === 'offline' ? 'Off Duty' : 'Ready To Board'}
            </Badge>
          </div>
        </div>
        <Button 
          variant="ghost" size="icon" onClick={toggleDuty}
          className={`rounded-2xl h-11 w-11 border border-white/5 ${profile?.status === 'offline' ? 'text-slate-500' : 'text-primary bg-primary/10 shadow-lg'}`}
        >
          <Power className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'trips' && (
          !activeTrip ? (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" /> Start Trip
                  </h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Available regional routes</p>
                </div>
              </div>
              
              {profile?.status === 'offline' ? (
                <Card className="bg-slate-900/50 border-white/5 border-dashed border-2 rounded-[2rem] p-12 text-center">
                  <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-6" />
                  <p className="text-slate-500 font-black uppercase italic tracking-widest text-xs">Switch to 'Ready' to see routes.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {availableRoutes.map((route: any) => (
                    <Card key={route.id} className="bg-slate-900 border-white/5 hover:border-primary/20 transition-all rounded-[1.5rem] overflow-hidden group">
                      <CardContent className="p-6 flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-black text-lg text-white uppercase italic">{route.routeName}</h3>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase italic">
                            <span>{route.stops?.[0]?.name}</span>
                            <ArrowRight className="h-2 w-2" />
                            <span>{route.stops?.[route.stops.length-1]?.name}</span>
                          </div>
                        </div>
                        <Button onClick={() => startTrip(route)} disabled={isUpdating} className="rounded-xl h-11 px-6 bg-primary text-slate-950 font-black uppercase italic shadow-lg hover:scale-105 transition-transform">
                          Drive
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {availableRoutes.length === 0 && (
                    <p className="text-center py-12 text-slate-600 font-bold uppercase italic text-[10px]">No active routes in this city.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              {isLoaded && validStops.length > 0 && (
                <div className="relative rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl h-60">
                   <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={14} options={mapOptions}>
                    <Polyline
                      path={validStops.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }))}
                      options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 5 }}
                    />
                    {validStops.map((stop: any, i: number) => (
                      <Marker key={i} position={{ lat: Number(stop.lat), lng: Number(stop.lng) }} icon={{ url: i === 0 ? 'https://cdn-icons-png.flaticon.com/512/8157/8157580.png' : i === validStops.length - 1 ? 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png' : 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: new window.google.maps.Size(20, 20)}} />
                    ))}
                  </GoogleMap>
                </div>
              )}

              <Card className="bg-slate-900 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Active Commute</p>
                    <h2 className="text-3xl font-black italic uppercase text-white leading-none">{activeTrip.routeName}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5">
                      <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Expected</p>
                      <p className="text-2xl font-black text-white italic">{activeTrip.passengers?.length || 0}</p>
                    </div>
                    <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5">
                      <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Boarded</p>
                      <p className="text-2xl font-black text-primary italic">{activeTrip.verifiedPassengers?.length || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-950 p-6 rounded-[2rem] border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Verify Boarding ID</Label>
                    </div>
                    <div className="flex gap-3">
                      <Input 
                        value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)}
                        placeholder="6-DIGIT CODE" className="bg-slate-900 border-white/5 h-14 text-center font-black tracking-[0.5em] text-lg rounded-xl"
                        maxLength={6}
                      />
                      <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-14 w-14 rounded-xl bg-primary text-slate-950 hover:bg-primary/90">
                        {isVerifying ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle2 className="h-6 w-6" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Scholar Manifest</h3>
                    <div className="space-y-3">
                      {passengerDetails?.map((p: any) => {
                        const isVerified = activeTrip.verifiedPassengers?.includes(p.uid);
                        return (
                          <div key={p.uid} className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                               <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs ${isVerified ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary'}`}>
                                  {isVerified ? <CheckCircle2 className="h-5 w-5" /> : p.fullName[0]}
                               </div>
                               <div>
                                  <p className="text-sm font-black uppercase italic text-white leading-none">{p.fullName}</p>
                                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{p.collegeName}</p>
                               </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => window.open(`tel:${p.phoneNumber}`, '_self')} className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4">
                    {nextStop ? (
                      <Button onClick={goToNextStop} disabled={isUpdating} className="w-full h-16 bg-slate-950 border border-white/10 text-white rounded-2xl font-black uppercase italic text-lg shadow-xl">
                        At {nextStop?.name} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={endTrip} disabled={isUpdating} className="w-full h-16 bg-accent text-white rounded-2xl font-black uppercase italic text-lg shadow-2xl">
                        End Trip & Process Earnings
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <Card className="bg-primary text-slate-950 border-none rounded-[2.5rem] p-10 relative overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Ready For Payout</p>
              <h3 className="text-5xl font-black italic mt-4 tracking-tighter">₹{(profile?.weeklyEarnings || 0).toFixed(0)}</h3>
              <p className="text-[9px] font-black uppercase mt-8 opacity-60">Automatic Settlement Protocol</p>
              <Wallet className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10" />
            </Card>

            <div className="space-y-6">
               <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Past Earnings
               </h3>
               <div className="space-y-4">
                  {pastTrips?.map((trip: any) => (
                    <Card key={trip.id} className="bg-slate-950 border-white/5 rounded-[1.5rem] overflow-hidden">
                       <div className="p-6 flex justify-between items-center">
                          <div className="space-y-1">
                             <h4 className="font-black text-sm text-white uppercase italic leading-none">{trip.routeName}</h4>
                             <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest italic">
                               {new Date(trip.endTime).toLocaleDateString()} • {trip.verifiedPassengers?.length || 0} Scholars
                             </p>
                          </div>
                          <p className="text-lg font-black text-primary italic">₹{trip.payoutAmount?.toFixed(0)}</p>
                       </div>
                    </Card>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex flex-col items-center gap-6 py-8">
                <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden border-4 border-primary/20 shadow-2xl relative">
                   {profile?.photoUrl ? (
                     <img src={profile.photoUrl} className="h-full w-full object-cover" alt="Profile" />
                   ) : (
                     <div className="h-full w-full bg-slate-900 flex items-center justify-center text-primary"><UserIcon className="h-12 w-12" /></div>
                   )}
                </div>
                <div className="text-center">
                   <h2 className="text-3xl font-black italic uppercase text-white tracking-tight">{profile?.fullName}</h2>
                   <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-[0.4em] mt-2">Certified AAGO Operator</Badge>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-white/5 p-6 rounded-3xl border-none">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Paid</p>
                   <p className="text-xl font-black text-green-400 italic">₹{(profile?.totalEarnings || 0).toFixed(0)}</p>
                </Card>
                <Card className="bg-slate-900 border-white/5 p-6 rounded-3xl border-none">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Trips Done</p>
                   <p className="text-xl font-black text-primary italic">{profile?.totalTrips || 0}</p>
                </Card>
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Registry Details</h4>
                <div className="space-y-3">
                   {[
                     { label: 'Asset Number', value: profile?.vehicleNumber, icon: Bus },
                     { label: 'License ID', value: profile?.licenseNumber, icon: Fingerprint },
                     { label: 'Hub Region', value: profile?.city, icon: MapPinned },
                   ].map((detail, i) => (
                     <div key={i} className="bg-slate-950 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
                        <detail.icon className="h-5 w-5 text-slate-500" />
                        <div>
                           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{detail.label}</p>
                           <p className="text-sm font-black text-white uppercase italic mt-1 leading-none">{detail.value}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="pt-8">
                <Button variant="ghost" onClick={handleSignOut} className="w-full h-18 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl font-black uppercase italic transition-all">
                   <LogOut className="h-5 w-5 mr-3" /> Terminate Shift
                </Button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-950/90 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center rounded-t-[3.5rem] z-50 shadow-2xl">
        <Button variant="ghost" onClick={() => setActiveTab('trips')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'trips' ? 'text-primary scale-110' : 'text-slate-500'}`}>
          <Navigation className="h-7 w-7" />
          <span className="text-[8px] font-black uppercase tracking-widest">Missions</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-500'}`}>
          <History className="h-7 w-7" />
          <span className="text-[8px] font-black uppercase tracking-widest">Ledger</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-500'}`}>
          <UserIcon className="h-7 w-7" />
          <span className="text-[8px] font-black uppercase tracking-widest">Account</span>
        </Button>
      </nav>
    </div>
  );
}
