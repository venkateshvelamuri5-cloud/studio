
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bus, 
  Power, 
  Loader2, 
  LogOut, 
  CheckCircle2,
  Navigation,
  Phone,
  History,
  User as UserIcon,
  ShieldCheck,
  MapPinned,
  AlertCircle
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, arrayUnion, getDocs, limit, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { firebaseConfig } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '240px', borderRadius: '2rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true };

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
  
  const { isLoaded, loadError } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: firebaseConfig.apiKey 
  });
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
          toast({ title: "New Scholar Alert!", description: "A student just secured a seat on your corridor." });
        }
        prevPassengerCount.current = currentCount;
        setActiveTrip(tripData);
      } else {
        setActiveTrip(null);
        prevPassengerCount.current = 0;
      }
    });
    return unsubscribe;
  }, [db, user?.uid, toast]);

  const { data: passengerDetails } = useCollection(useMemo(() => {
    if (!db || !user || !activeTrip?.passengers?.length) return null;
    return query(collection(db, 'users'), where('uid', 'in', activeTrip.passengers));
  }, [db, user, activeTrip?.passengers]));

  const currentRoute = useMemo(() => (activeTrip && allRoutes) ? allRoutes.find((r: any) => r.routeName === activeTrip.routeName) : null, [activeTrip, allRoutes]);
  const validStops = useMemo(() => currentRoute?.stops?.filter((s: any) => typeof s.lat === 'number' && isFinite(s.lat)) || [], [currentRoute?.stops]);

  const startTrip = async (route: any) => {
    if (!db || !user || !profile || !userRef) return;
    setIsUpdating(true);
    try {
      const maxCapacity = profile.vehicleType === 'Van' ? 12 : profile.vehicleType === 'Mini-Bus' ? 24 : 45;
      const tripRef = await addDoc(collection(db, 'trips'), {
        driverId: user.uid, driverName: profile.fullName,
        routeName: route.routeName, farePerRider: route.baseFare, status: 'active', 
        riderCount: 0, maxCapacity,
        passengers: [], verifiedPassengers: [], startTime: new Date().toISOString()
      });
      updateDoc(userRef, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Mission Corridor Initiated", description: `Active on Route: ${route.routeName}` });
    } catch {
      toast({ variant: "destructive", title: "Could not start mission corridor" });
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
        toast({ variant: "destructive", title: "Identity Sequence Error", description: "Verification code invalid." });
      } else {
        const rider = snap.docs[0].data();
        updateDoc(doc(db, 'trips', activeTrip.id), { verifiedPassengers: arrayUnion(rider.uid) });
        updateDoc(doc(db, 'users', rider.uid), { activeOtp: null });
        toast({ title: "Scholar Authenticated", description: `${rider.fullName} is now on-board.` });
        setVerificationOtp("");
      }
    } catch {
      toast({ variant: "destructive", title: "Verification sequence failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      updateDoc(doc(db, 'trips', activeTrip.id), { status: 'completed', endTime: new Date().toISOString() });
      updateDoc(userRef, { status: 'available', activeTripId: null });
      toast({ title: "Mission Completed", description: "All telemetry data pushed to regional hub." });
    } catch {
      toast({ variant: "destructive", title: "Could not close mission corridor" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = () => {
    if (!userRef || !profile) return;
    updateDoc(userRef, { status: profile.status === 'offline' ? 'available' : 'offline' });
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="p-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-primary/20 bg-white flex items-center justify-center text-primary font-black italic">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" alt="Driver" /> : profile?.fullName?.[0]}
          </div>
          <div>
            <h1 className="font-black text-sm uppercase italic text-slate-900 leading-none">{profile?.fullName}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-100 text-slate-400' : 'bg-green-500/10 text-green-600'} border-none text-[8px] font-black uppercase mt-1 tracking-widest`}>
              {profile?.status === 'offline' ? 'Off Duty' : 'Online'}
            </Badge>
          </div>
        </div>
        <Button onClick={handleToggleStatus} className={`rounded-2xl h-11 w-11 p-0 transition-all ${profile?.status === 'offline' ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-xl'}`}>
          <Power className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'trips' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-black italic uppercase text-slate-900">Mission Initiation</h2>
            <div className="space-y-4">
              {availableRoutes.length === 0 ? (
                <Card className="p-12 text-center bg-white border-dashed border-2 border-slate-200 rounded-[2.5rem]">
                   <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Regional Routes Available</p>
                </Card>
              ) : (
                availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-white border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <CardContent className="p-8 flex justify-between items-center">
                      <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase italic leading-none mb-2">{route.routeName}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase italic">₹{route.baseFare} Per Scholar</p>
                      </div>
                      <Button onClick={() => startTrip(route)} disabled={isUpdating} className="rounded-xl h-12 px-8 bg-primary text-white font-black uppercase italic shadow-lg">Initiate</Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-xl h-64 bg-slate-100">
              {isLoaded && !loadError && validStops.length > 0 ? (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={{ lat: Number(validStops[0].lat), lng: Number(validStops[0].lng) }} zoom={13} options={mapOptions}>
                  <Polyline 
                    path={validStops.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }))} 
                    options={{ strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 6 }} 
                  />
                </GoogleMap>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                   <MapPinned className="h-10 w-10 text-slate-200 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Map Offline</p>
                   <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase italic">Map API Not Activated</p>
                </div>
              )}
            </div>
            
            <Card className="bg-white border-none rounded-[3rem] p-8 space-y-8 shadow-xl">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Mission Corridor Active</p>
                  <h2 className="text-3xl font-black italic uppercase leading-none">{activeTrip.routeName}</h2>
                </div>
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-3 py-1">{activeTrip.riderCount} Boarded</Badge>
              </div>

              <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 mb-1 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em]">Scholar Auth Sequence</Label>
                </div>
                <div className="flex gap-3">
                  <Input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="h-16 text-center font-black tracking-[0.4em] text-2xl rounded-2xl bg-white border-none shadow-inner" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-16 w-16 rounded-2xl bg-primary text-white shadow-lg active:scale-95 transition-all">
                    {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-8 w-8" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Manifest Radar</h3>
                <div className="space-y-3">
                  {passengerDetails?.length === 0 ? (
                    <p className="text-[10px] text-center font-bold text-slate-300 italic py-8">Waiting for regional bookings...</p>
                  ) : (
                    passengerDetails?.map((p: any) => (
                      <div key={p.uid} className="p-5 bg-slate-50 rounded-[1.5rem] flex justify-between items-center border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-xs ${activeTrip.verifiedPassengers?.includes(p.uid) ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                            {activeTrip.verifiedPassengers?.includes(p.uid) ? <CheckCircle2 className="h-6 w-6" /> : p.fullName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase italic text-slate-900 leading-none">{p.fullName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{p.destinationStopName || 'Regional Hub'}</p>
                          </div>
                        </div>
                        <Button onClick={() => window.open(`tel:${p.phoneNumber}`, '_self')} variant="ghost" className="h-12 w-12 p-0 rounded-xl text-primary hover:bg-primary/10 transition-all"><Phone className="h-5 w-5" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-18 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase italic text-lg shadow-xl hover:bg-slate-800 transition-all">Close Mission Corridor</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
            <h3 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Mission Ledger</h3>
            <div className="space-y-4">
              {pastTrips?.length === 0 ? (
                <Card className="p-12 text-center bg-white rounded-[2.5rem]">
                   <History className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Mission History</p>
                </Card>
              ) : (
                pastTrips?.map((trip: any) => (
                  <Card key={trip.id} className="bg-white border-slate-100 rounded-[2rem] p-6 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 uppercase italic leading-none mb-2">{trip.routeName}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">{new Date(trip.endTime).toLocaleDateString()} • {trip.riderCount} Boarded</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black italic text-primary">₹{(trip.riderCount * trip.farePerRider || 0).toFixed(0)}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in text-center">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-40 w-40 rounded-[3rem] overflow-hidden border-4 border-primary/10 shadow-xl bg-white">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" alt="Driver Profile" /> : <UserIcon className="h-16 w-16 text-slate-200 m-auto" />}
              </div>
              <div>
                <h2 className="text-4xl font-black italic uppercase text-slate-900 leading-none">{profile?.fullName}</h2>
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.4em] mt-3 px-4 py-1">Verified Fleet Partner</Badge>
              </div>
            </div>
            <div className="space-y-3">
              {[ 
                { label: 'Vehicle Asset ID', value: profile?.vehicleNumber, icon: Bus }, 
                { label: 'Operational Hub', value: profile?.city, icon: MapPinned },
                { label: 'License Identification', value: profile?.licenseNumber, icon: ShieldCheck }
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-5 text-left shadow-sm">
                  <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p><p className="text-base font-black text-slate-900 uppercase italic leading-none">{item.value}</p></div>
                </div>
              ))}
            </div>
            <Button onClick={handleSignOut} className="w-full h-18 bg-red-50 text-red-500 rounded-[2rem] font-black uppercase italic mt-8 hover:bg-red-100 transition-all"><LogOut className="h-5 w-5 mr-3" /> Terminate Session</Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-3xl border-t border-slate-200 flex justify-around items-center rounded-t-[3.5rem] z-50 shadow-2xl">
        <Button variant="ghost" onClick={() => setActiveTab('trips')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'trips' ? 'text-primary scale-110' : 'text-slate-400'}`}><Navigation className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Radar</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><History className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Ledger</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Me</span></Button>
      </nav>
    </div>
  );
}
