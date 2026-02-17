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

const mapContainerStyle = { width: '100%', height: '240px', borderRadius: '2rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true, zoomControl: false };

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
  
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: firebaseConfig.apiKey });
  const prevPassengerCount = useRef(0);

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  const historyQuery = useMemo(() => (db && user?.uid) ? query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'), orderBy('endTime', 'desc'), limit(10)) : null, [db, user?.uid]);
  const { data: pastTrips } = useCollection(historyQuery);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const tripData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        const currentCount = tripData.passengers?.length || 0;
        if (currentCount > prevPassengerCount.current) {
          toast({ title: "New Passenger!", description: "A student just booked a seat on your shuttle." });
        }
        prevPassengerCount.current = currentCount;
        setActiveTrip(tripData);
      } else {
        setActiveTrip(null);
        prevPassengerCount.current = 0;
      }
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'trips', operation: 'list' }));
    });
    return unsubscribe;
  }, [db, user?.uid, toast]);

  const { data: passengerDetails } = useCollection(useMemo(() => {
    if (!db || !user || !activeTrip?.passengers?.length) return null;
    return query(collection(db, 'users'), where('uid', 'in', activeTrip.passengers));
  }, [db, user, activeTrip?.passengers]));

  const currentRoute = useMemo(() => (activeTrip && allRoutes) ? allRoutes.find((r: any) => r.routeName === activeTrip.routeName) : null, [activeTrip, allRoutes]);
  const validStops = useMemo(() => currentRoute?.stops?.filter((s: any) => typeof s.lat === 'number' && isFinite(s.lat)) || [], [currentRoute?.stops]);

  const mapCenter = useMemo(() => {
    const lat = Number(profile?.currentLat), lng = Number(profile?.currentLng);
    return (isFinite(lat) && isFinite(lng) && lat !== 0) ? { lat, lng } : { lat: 17.6868, lng: 83.2185 };
  }, [profile?.currentLat, profile?.currentLng]);

  const currentStopIndex = activeTrip?.currentStopIndex || 0;
  const nextStop = currentRoute?.stops?.[currentStopIndex + 1];

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  const toggleDuty = async () => {
    if (!userRef) return;
    const newStatus = profile?.status === 'offline' ? 'available' : 'offline';
    updateDoc(userRef, { status: newStatus }).catch(() => {});
    toast({ title: `You are now ${newStatus.toUpperCase()}` });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const multiplier = profile.vehicleType === 'Mini-Bus' ? (route.miniBusMultiplier || 1.2) : profile.vehicleType === 'Van' ? (route.vanMultiplier || 1.5) : 1.0;
      const farePerRider = (route.baseFare + (route.surgeFare || 0)) * multiplier;
      const tripRef = await addDoc(collection(db, 'trips'), {
        driverId: user.uid, driverName: profile.fullName, driverPhone: profile.phoneNumber,
        routeName: route.routeName, farePerRider, status: 'active', totalFareCollected: 0,
        passengers: [], verifiedPassengers: [], startTime: new Date().toISOString(), currentStopIndex: 0
      });
      updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id }).catch(() => {});
      toast({ title: "Trip Started", description: `Driving on ${route.routeName}` });
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
      updateDoc(doc(db, 'trips', activeTrip.id), { currentStopIndex: currentStopIndex + 1 }).catch(() => {});
      toast({ title: "At Station", description: `${nextStop?.name}` });
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
      const snap = await getDocs(query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim()), limit(1)));
      if (snap.empty) {
        toast({ variant: "destructive", title: "Wrong Code", description: "The student code is incorrect." });
      } else {
        const rider = snap.docs[0].data();
        updateDoc(doc(db, 'trips', activeTrip.id), { verifiedPassengers: arrayUnion(rider.uid), totalFareCollected: increment(activeTrip.farePerRider) }).catch(() => {});
        updateDoc(doc(db, 'users', rider.uid), { activeOtp: null }).catch(() => {});
        toast({ title: "Student Boarded", description: `${rider.fullName} verified.` });
        setVerificationOtp("");
      }
    } catch {
      toast({ variant: "destructive", title: "Verify failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const totalCollected = activeTrip.totalFareCollected || 0, driverPayout = totalCollected * 0.90;
      updateDoc(doc(db, 'trips', activeTrip.id), { status: 'completed', endTime: new Date().toISOString(), commissionAmount: totalCollected * 0.10, payoutAmount: driverPayout }).catch(() => {});
      updateDoc(userRef, { status: 'available', activeTripId: null, totalTrips: increment(1), weeklyEarnings: increment(driverPayout) }).catch(() => {});
      toast({ title: "Trip Ended", description: `You earned ₹${driverPayout.toFixed(0)}` });
      setActiveTab('history');
    } catch {
      toast({ variant: "destructive", title: "Could not end trip" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-body pb-32">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-primary/20 bg-slate-800 flex items-center justify-center text-primary font-black italic">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : profile?.fullName?.[0]}
          </div>
          <div>
            <h1 className="font-black text-sm uppercase italic text-white leading-none">{profile?.fullName}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-800' : 'bg-green-500/10 text-green-400'} border-none text-[8px] font-black uppercase tracking-widest px-2 mt-1`}>
              {profile?.status === 'offline' ? 'Off Duty' : 'Ready'}
            </Badge>
          </div>
        </div>
        <Button onClick={toggleDuty} className={`rounded-2xl h-11 w-11 p-0 transition-all ${profile?.status === 'offline' ? 'bg-slate-800 text-slate-500' : 'bg-primary text-white shadow-lg'}`}>
          <Power className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'trips' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl font-black italic uppercase text-white flex items-center gap-2"><Navigation className="h-6 w-6 text-primary" /> Start Shift</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select a route below</p>
            </div>
            {profile?.status === 'offline' ? (
              <Card className="bg-slate-800/50 border-white/5 border-dashed border-2 rounded-[2.5rem] p-12 text-center shadow-inner">
                <AlertCircle className="h-12 w-12 text-slate-700 mx-auto mb-6" />
                <p className="text-slate-500 font-black uppercase italic tracking-widest text-xs">Go "Online" to see trips.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-800 border-white/5 hover:border-primary/20 transition-all rounded-[2rem] overflow-hidden group shadow-lg">
                    <CardContent className="p-8 flex justify-between items-center">
                      <div className="space-y-2">
                        <h3 className="font-black text-xl text-white uppercase italic">{route.routeName}</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase italic flex items-center gap-2">
                          {route.stops?.[0]?.name} <ArrowRight className="h-3 w-3" /> {route.stops?.[route.stops.length-1]?.name}
                        </p>
                      </div>
                      <Button onClick={() => startTrip(route)} disabled={isUpdating} className="rounded-xl h-12 px-8 bg-primary text-white font-black uppercase italic shadow-xl hover:scale-105">Start</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {isLoaded && validStops.length > 0 && (
              <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl h-64">
                <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={14} options={mapOptions}>
                  <Polyline path={validStops.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }))} options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 6 }} />
                  {validStops.map((stop: any, i: number) => (
                    <Marker key={i} position={{ lat: Number(stop.lat), lng: Number(stop.lng) }} icon={{ url: i === 0 ? 'https://cdn-icons-png.flaticon.com/512/8157/8157580.png' : i === validStops.length - 1 ? 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png' : 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: new window.google.maps.Size(24, 24)}} />
                  ))}
                </GoogleMap>
              </div>
            )}
            <Card className="bg-white text-slate-950 border-none rounded-[3rem] p-8 space-y-8 shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Current Trip</p>
                  <h2 className="text-3xl font-black italic uppercase leading-none">{activeTrip.routeName}</h2>
                </div>
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-3 py-1">On Route</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Expected</p>
                  <p className="text-3xl font-black text-slate-900 italic">{activeTrip.passengers?.length || 0}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Boarded</p>
                  <p className="text-3xl font-black text-primary italic">{activeTrip.verifiedPassengers?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-4 bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
                <div className="flex items-center gap-2 mb-1 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em]">Verify Student Code</Label>
                </div>
                <div className="flex gap-3">
                  <Input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="bg-white border-slate-200 h-16 text-center font-black tracking-[0.4em] text-2xl rounded-2xl" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-16 w-16 rounded-2xl bg-primary text-white shadow-lg active:scale-95">
                    {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-8 w-8" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Student List</h3>
                <div className="space-y-3">
                  {passengerDetails?.map((p: any) => (
                    <div key={p.uid} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-xs ${activeTrip.verifiedPassengers?.includes(p.uid) ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                          {activeTrip.verifiedPassengers?.includes(p.uid) ? <CheckCircle2 className="h-6 w-6" /> : p.fullName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase italic text-slate-900 leading-none">{p.fullName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">{p.collegeName}</p>
                        </div>
                      </div>
                      <Button onClick={() => window.open(`tel:${p.phoneNumber}`, '_self')} variant="ghost" className="h-12 w-12 p-0 rounded-xl text-primary hover:bg-primary/10"><Phone className="h-5 w-5" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                {nextStop ? (
                  <Button onClick={goToNextStop} disabled={isUpdating} className="w-full h-18 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase italic text-lg shadow-xl hover:bg-slate-800">
                    At {nextStop?.name} <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                ) : (
                  <Button onClick={endTrip} disabled={isUpdating} className="w-full h-18 bg-accent text-white rounded-[1.5rem] font-black uppercase italic text-lg shadow-2xl hover:bg-accent/90">
                    Finish Trip & Get Paid
                  </Button>
                )}
              </div>
            </Card>
          </div>
        ))}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
            <Card className="bg-primary text-white border-none rounded-[3rem] p-10 relative overflow-hidden shadow-xl shadow-primary/20">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Money Ready to Pay</p>
              <h3 className="text-5xl font-black italic mt-4 tracking-tighter">₹{(profile?.weeklyEarnings || 0).toFixed(0)}</h3>
              <Wallet className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10" />
            </Card>
            <div className="space-y-6">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Past Earnings</h3>
              <div className="space-y-4">
                {pastTrips?.map((trip: any) => (
                  <Card key={trip.id} className="bg-slate-800 border-white/5 rounded-[2rem] p-6 flex justify-between items-center shadow-lg">
                    <div className="space-y-1">
                      <h4 className="font-black text-sm text-white uppercase italic leading-none">{trip.routeName}</h4>
                      <p className="text-[8px] font-bold text-slate-500 uppercase mt-1.5 tracking-widest italic">{new Date(trip.endTime).toLocaleDateString()} • {trip.verifiedPassengers?.length || 0} Students</p>
                    </div>
                    <p className="text-xl font-black text-primary italic">₹{trip.payoutAmount?.toFixed(0)}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in text-center">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-40 w-40 rounded-[3rem] overflow-hidden border-4 border-primary/30 shadow-2xl bg-slate-800">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-16 w-16 text-slate-600 m-auto" />}
              </div>
              <div>
                <h2 className="text-4xl font-black italic uppercase text-white tracking-tight">{profile?.fullName}</h2>
                <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase tracking-[0.4em] mt-3 px-4 py-1">Aago Driver Partner</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-none p-6 rounded-[2rem] text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-2xl font-black text-green-400 italic">₹{(profile?.totalEarnings || 0).toFixed(0)}</p>
              </Card>
              <Card className="bg-slate-800 border-none p-6 rounded-[2rem] text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Trips Done</p>
                <p className="text-2xl font-black text-primary italic">{profile?.totalTrips || 0}</p>
              </Card>
            </div>
            <div className="space-y-3">
              {[ { label: 'Vehicle Number', value: profile?.vehicleNumber, icon: Bus }, { label: 'License ID', value: profile?.licenseNumber, icon: Fingerprint }, { label: 'City Hub', value: profile?.city, icon: MapPinned } ].map((item, i) => (
                <div key={i} className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 flex items-center gap-5 text-left">
                  <item.icon className="h-6 w-6 text-slate-500" />
                  <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p><p className="text-base font-black text-white uppercase italic mt-1 leading-none">{item.value}</p></div>
                </div>
              ))}
            </div>
            <Button onClick={handleSignOut} className="w-full h-18 bg-red-500/10 text-red-500 rounded-[2rem] font-black uppercase italic mt-8 hover:bg-red-500/20 transition-all"><LogOut className="h-5 w-5 mr-3" /> Terminate Session</Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-900/90 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center rounded-t-[3.5rem] z-50 shadow-2xl">
        <Button variant="ghost" onClick={() => setActiveTab('trips')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'trips' ? 'text-primary scale-110' : 'text-slate-500'}`}><Navigation className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Trips</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-500'}`}><History className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">History</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-500'}`}><UserIcon className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Profile</span></Button>
      </nav>
    </div>
  );
}