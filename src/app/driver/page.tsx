"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Bus, 
  Power, 
  Loader2, 
  LogOut, 
  CheckCircle2,
  History,
  User as UserIcon,
  ShieldCheck,
  Activity,
  IndianRupee,
  Wallet,
  Car,
  AlertTriangle,
  Star,
  Leaf,
  LayoutGrid,
  Settings
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, arrayUnion, getDocs, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1.5rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true };
const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 }; 

export default function DriverApp() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'mission' | 'ledger' | 'fleet' | 'profile'>('mission');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const historyQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'));
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(historyQuery);

  const stats = useMemo(() => {
    if (!pastTrips) return { earnings: 0, count: 0, scholars: 0, carbon: 0 };
    const earnings = pastTrips.reduce((acc, t) => acc + (t.driverShare || 0), 0);
    const totalScholars = pastTrips.reduce((acc, t) => acc + (t.finalRiderCount || t.riderCount || 0), 0);
    return { earnings, count: pastTrips.length, scholars: totalScholars, carbon: (totalScholars * 0.4).toFixed(1) };
  }, [pastTrips]);

  useEffect(() => {
    if (!profile || profile.status === 'offline' || !userRef) return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateDoc(userRef, { currentLat: pos.coords.latitude, currentLng: pos.coords.longitude });
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [profile?.status, userRef]);

  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.status === 'active') || [], [allRoutes]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      else setActiveTrip(null);
    });
  }, [db, user?.uid]);

  const handleToggleStatus = async () => {
    if (!userRef || !profile) return;
    const newStatus = profile.status === 'offline' ? 'available' : 'offline';
    await updateDoc(userRef, { status: newStatus });
    toast({ title: newStatus === 'available' ? "Shift Active" : "Shift Ended" });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const tripRef = await addDoc(collection(db, 'trips'), {
        driverId: user.uid, 
        driverName: profile.fullName, 
        routeName: route.routeName, 
        farePerRider: route.baseFare, 
        status: 'active', 
        riderCount: 0, 
        passengers: [], 
        verifiedPassengers: [], 
        startTime: new Date().toISOString()
      });
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Trip Started", description: route.routeName });
    } catch (e) { toast({ variant: "destructive", title: "Failed to start" }); } finally { setIsUpdating(false); }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim())));
      if (snap.empty) toast({ variant: "destructive", title: "Invalid Code" });
      else {
        const riderId = snap.docs[0].id;
        await updateDoc(doc(db, 'trips', activeTrip.id), { verifiedPassengers: arrayUnion(riderId), riderCount: increment(1) });
        await updateDoc(doc(db, 'users', riderId), { activeOtp: null });
        toast({ title: "Boarded Successfully" });
        setVerificationOtp("");
      }
    } finally { setIsVerifying(false); }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !profile || !userRef) return;
    setIsUpdating(true);
    try {
      const riderCount = activeTrip.verifiedPassengers?.length || 0;
      const totalYield = riderCount * activeTrip.farePerRider;
      const driverPayout = totalYield * 0.9; 
      await updateDoc(doc(db, 'trips', activeTrip.id), { status: 'completed', endTime: new Date().toISOString(), totalYield, driverShare: driverPayout, finalRiderCount: riderCount });
      await updateDoc(userRef, { status: 'available', activeTripId: null, totalEarnings: increment(driverPayout) });
      toast({ title: "Trip Completed", description: `Earned ₹${driverPayout.toFixed(0)}` });
    } finally { setIsUpdating(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover rounded-xl" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none text-primary">OPERATOR</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-primary'} border-none text-[8px] font-black uppercase mt-1 px-2 py-0.5`}>
              {profile?.status}
            </Badge>
          </div>
        </div>
        <Button onClick={handleToggleStatus} className={`rounded-xl h-10 w-10 p-0 transition-all ${profile?.status === 'offline' ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white shadow-lg'}`}>
          <Power className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'mission' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-slate-100 rounded-2xl p-5 space-y-2 shadow-sm">
                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Earnings</p>
                 <h2 className="text-2xl font-black italic uppercase leading-none text-primary">₹{stats.earnings.toFixed(0)}</h2>
              </Card>
              <Card className="bg-white border-slate-100 rounded-2xl p-5 space-y-2 shadow-sm">
                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Trips</p>
                 <h2 className="text-2xl font-black italic text-slate-900 leading-none">{stats.count}</h2>
              </Card>
            </div>

            <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter pl-1">Available Corridors</h2>
            <div className="space-y-3">
              {availableRoutes.map((route: any) => (
                <Card key={route.id} className="bg-white border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-xl text-slate-900 uppercase italic leading-none">{route.routeName}</h3>
                      <p className="text-[9px] font-black text-primary mt-1">₹{route.baseFare} Fare</p>
                    </div>
                    <Button onClick={() => startTrip(route)} disabled={profile?.status === 'offline' || isUpdating} className="rounded-xl h-12 px-6 bg-primary text-white font-black uppercase italic text-sm shadow-lg shadow-orange-100">Launch</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <Card className="bg-white border-orange-100 rounded-[2rem] p-8 space-y-8 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-primary">{activeTrip.routeName}</h2>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Active Mission</p>
                </div>
                <Badge className="bg-orange-50 text-primary border-none text-[9px] font-black uppercase px-4 py-2 rounded-full">{activeTrip.verifiedPassengers?.length || 0} Boarded</Badge>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl space-y-3 border border-slate-100 shadow-inner">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Verification Code</Label>
                <div className="flex gap-2">
                  <input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="h-16 w-full text-center font-black tracking-widest text-3xl rounded-xl bg-white border border-slate-100 outline-none focus:ring-2 focus:ring-primary text-primary" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-16 w-16 rounded-xl bg-primary text-white shadow-lg p-0 active:scale-95"><CheckCircle2 className="h-8 w-8" /></Button>
                </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-lg shadow-xl active:scale-95">End Mission</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-12">
             <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">Earnings Hub</h3>
             <div className="space-y-3">
                {pastTrips?.sort((a,b) => b.endTime.localeCompare(a.endTime)).map((trip: any) => (
                  <Card key={trip.id} className="bg-white border border-slate-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
                    <div>
                        <h4 className="font-black text-lg uppercase italic leading-none">{trip.routeName}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase italic tracking-widest">{new Date(trip.endTime).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                    </div>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">Fleet Health</h3>
             <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "Brakes", value: "92%", icon: Activity, progress: 92 },
                  { label: "Sanitation", value: "100%", icon: CheckCircle2, progress: 100 },
                ].map((item, i) => (
                  <Card key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-orange-50 rounded-lg text-primary"><item.icon className="h-4 w-4" /></div>
                           <p className="font-black text-slate-900 uppercase italic text-sm">{item.label}</p>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary">{item.value}</span>
                     </div>
                     <Progress value={item.progress} className="h-1" />
                  </Card>
                ))}
                <Card className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex items-center justify-between shadow-sm">
                   <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-primary tracking-widest">CO2 Offset</p>
                      <h3 className="text-2xl font-black italic uppercase text-slate-900 leading-none">{stats.carbon} kg</h3>
                   </div>
                   <Leaf className="h-8 w-8 text-primary opacity-20" />
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in text-center pb-20 pt-6">
            <div className="flex flex-col items-center gap-6">
              <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white bg-orange-50 flex items-center justify-center shadow-xl">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-12 w-12 text-orange-200" />}
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase text-slate-900 leading-none">{profile?.fullName}</h2>
                <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-md">{profile?.vehicleType} Captain</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-left">
              {[
                { label: "Fleet ID", value: profile?.vehicleNumber, icon: Car },
                { label: "Rating", value: "4.9 / 5.0", icon: Star },
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl flex items-center gap-4 border border-slate-100 shadow-sm active:scale-98 transition-all">
                   <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-primary shadow-sm"><item.icon className="h-5 w-5" /></div>
                   <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{item.label}</p>
                      <p className="font-black text-slate-900 italic uppercase text-lg leading-none tracking-tighter">{item.value}</p>
                   </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSignOut} className="w-full h-16 bg-red-50 text-red-500 rounded-2xl font-black uppercase italic mt-6 border border-red-100 active:scale-95 transition-all text-sm">
              <LogOut className="h-5 w-5 mr-3" /> Terminate Session
            </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-2xl border-t border-slate-100 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('mission')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'mission' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <LayoutGrid className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Mission</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('ledger')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'ledger' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <Wallet className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Ledger</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('fleet')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'fleet' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <Settings className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Fleet</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all ${activeTab === 'profile' ? 'text-primary bg-orange-50' : 'text-slate-400'}`}>
          <UserIcon className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
