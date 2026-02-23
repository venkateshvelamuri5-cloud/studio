
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bus, 
  Power, 
  Loader2, 
  LogOut, 
  CheckCircle2,
  Phone,
  History,
  User as UserIcon,
  ShieldCheck,
  MapPinned,
  Activity,
  IndianRupee,
  Wallet,
  TrendingUp,
  Car,
  AlertTriangle,
  Target,
  Zap,
  Star,
  Clock,
  Settings,
  ShieldQuestion,
  Leaf,
  LayoutGrid,
  ClipboardList
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, arrayUnion, getDocs, limit, increment, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { googleMapsApiKey } from '@/firebase/config';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '2.5rem' };
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
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(null);
  
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: googleMapsApiKey 
  });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const today = new Date().toISOString().split('T')[0];
  const historyQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'));
  }, [db, user?.uid]);
  const { data: pastTrips } = useCollection(historyQuery);

  const stats = useMemo(() => {
    if (!pastTrips) return { earnings: 0, count: 0, scholars: 0, carbon: 0 };
    const todayTrips = pastTrips.filter(t => t.endTime && t.endTime.startsWith(today));
    const earnings = todayTrips.reduce((acc, t) => acc + (t.driverShare || 0), 0);
    const totalScholars = pastTrips.reduce((acc, t) => acc + (t.finalRiderCount || t.riderCount || 0), 0);
    return { 
      earnings, 
      count: todayTrips.length,
      scholars: totalScholars,
      carbon: (totalScholars * 0.4).toFixed(1)
    };
  }, [pastTrips, today]);

  useEffect(() => {
    if (!profile || profile.status === 'offline' || !userRef) return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateDoc(userRef, { 
            currentLat: pos.coords.latitude, 
            currentLng: pos.coords.longitude,
            lastSeen: new Date().toISOString()
          });
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [profile?.status, userRef]);

  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      } else {
        setActiveTrip(null);
      }
    });
  }, [db, user?.uid]);

  const triggerSOS = async () => {
    if (!db || !user || !profile) return;
    addDoc(collection(db, 'alerts'), { 
      type: 'OPERATOR_SOS', 
      userId: user.uid, 
      userName: profile.fullName, 
      city: profile.city || 'Global', 
      timestamp: new Date().toISOString() 
    });
    toast({ variant: "destructive", title: "SOS Beacon Active", description: "Base station has been alerted." });
  };

  const handleToggleStatus = async () => {
    if (!userRef || !profile) return;
    const isGoingOnline = profile.status === 'offline';
    const newStatus = isGoingOnline ? 'available' : 'offline';
    if (isGoingOnline) setShiftStartTime(new Date().toISOString());
    else setShiftStartTime(null);
    
    await updateDoc(userRef, { status: newStatus });
    toast({ title: isGoingOnline ? "Shift Started" : "Shift Ended", description: isGoingOnline ? "You are live on the grid." : "Mission telemetry saved." });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const tripData = {
        driverId: user.uid, 
        driverName: profile.fullName, 
        routeName: route.routeName, 
        farePerRider: route.baseFare, 
        status: 'active', 
        riderCount: 0, 
        maxCapacity: profile.vehicleType === 'Van' ? 12 : 45,
        passengers: [], 
        verifiedPassengers: [], 
        startTime: new Date().toISOString()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Mission Engaged", description: `Active on: ${route.routeName}` });
    } catch (e) { 
      toast({ variant: "destructive", title: "Activation Failed" }); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim())));
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid ID", description: "Scholar code not found." });
      } else {
        const riderId = snap.docs[0].id;
        await updateDoc(doc(db, 'trips', activeTrip.id), { 
          verifiedPassengers: arrayUnion(riderId),
          riderCount: increment(1)
        });
        await updateDoc(doc(db, 'users', riderId), { activeOtp: null });
        toast({ title: "Scholar Boarded", description: "Identity verified and synced." });
        setVerificationOtp("");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !profile || !userRef) return;
    setIsUpdating(true);
    try {
      const riderCount = activeTrip.verifiedPassengers?.length || 0;
      const totalYield = riderCount * activeTrip.farePerRider;
      const driverPayout = totalYield * 0.9; 
      
      await updateDoc(doc(db, 'trips', activeTrip.id), { 
        status: 'completed', 
        endTime: new Date().toISOString(), 
        totalYield: totalYield, 
        driverShare: driverPayout, 
        finalRiderCount: riderCount 
      });
      await updateDoc(userRef, { 
        status: 'available', 
        activeTripId: null, 
        totalEarnings: increment(driverPayout) 
      });
      toast({ title: "Mission Success", description: `₹${driverPayout.toFixed(0)} added to ledger.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error ending mission" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden border border-primary/20 flex items-center justify-center bg-slate-900 shadow-lg">
            {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">{profile?.fullName?.split(' ')[0]}</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-slate-900 text-slate-700' : 'bg-green-500/10 text-green-400'} border-none text-[8px] font-black uppercase mt-1 tracking-widest`}>
              {profile?.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={triggerSOS} className="text-red-500 h-10 w-10 rounded-xl border border-white/5 shadow-inner active:scale-95 transition-all"><AlertTriangle className="h-5 w-5" /></Button>
           <Button onClick={handleToggleStatus} className={`rounded-xl h-10 w-10 p-0 transition-all active:scale-95 ${profile?.status === 'offline' ? 'bg-slate-900 text-slate-700' : 'bg-primary text-slate-950 shadow-lg'}`}>
             <Power className="h-5 w-5" />
           </Button>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 overflow-x-hidden max-w-lg mx-auto w-full">
        {activeTab === 'mission' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-2 shadow-lg active:scale-98 transition-all">
                 <p className="text-[8px] font-black uppercase text-primary tracking-widest">Day Yield</p>
                 <h2 className="text-2xl font-black italic uppercase leading-none text-glow">₹{stats.earnings.toFixed(0)}</h2>
                 <Progress value={(stats.earnings / 3000) * 100} className="h-1 bg-white/5" />
              </Card>
              <Card className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-2 shadow-lg active:scale-98 transition-all">
                 <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Missions</p>
                 <h2 className="text-2xl font-black italic text-white leading-none">{stats.count}</h2>
                 <Badge className="bg-primary/10 text-primary border-none text-[7px] font-black uppercase tracking-widest px-2">Ready</Badge>
              </Card>
            </div>

            <h2 className="text-xl font-black italic uppercase text-white tracking-tighter pl-1">Grid Corridors</h2>
            <div className="space-y-3">
              {availableRoutes.length === 0 ? (
                <div className="p-10 text-center bg-slate-900/50 rounded-2xl border border-dashed border-white/5">
                  <p className="text-[10px] font-black text-slate-700 italic uppercase tracking-widest">No routes found</p>
                </div>
              ) : (
                availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900 border border-white/5 rounded-2xl shadow-lg active:scale-95 transition-all overflow-hidden">
                    <CardContent className="p-6 flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-black text-xl text-white uppercase italic leading-none tracking-tighter">{route.routeName}</h3>
                        <Badge className="bg-white/5 text-slate-500 border-none text-[8px] font-black uppercase px-2 py-0.5 tracking-widest">₹{route.baseFare}</Badge>
                      </div>
                      <Button 
                        onClick={() => startTrip(route)} 
                        disabled={profile?.status === 'offline' || isUpdating} 
                        className="rounded-xl h-12 px-6 bg-primary text-slate-950 font-black uppercase italic text-sm shadow-md active:scale-90"
                      >
                        Launch
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <Card className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.03),transparent_70%)]" />
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-glow text-primary">{activeTrip.routeName}</h2>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-1">Live Mission</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase px-4 py-2 rounded-full tracking-widest">{activeTrip.verifiedPassengers?.length || 0} Boarded</Badge>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl space-y-3 border border-white/5 shadow-inner relative z-10">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-2">Verification Key</Label>
                <div className="flex gap-2">
                  <input 
                    value={verificationOtp} 
                    onChange={(e) => setVerificationOtp(e.target.value)} 
                    placeholder="000000" 
                    className="h-16 w-full text-center font-black tracking-widest text-3xl rounded-xl bg-slate-900 border border-white/5 outline-none focus:ring-2 focus:ring-primary text-primary" 
                    maxLength={6} 
                  />
                  <Button 
                    onClick={verifyPassenger} 
                    disabled={isVerifying || !verificationOtp} 
                    className="h-16 w-16 rounded-xl bg-primary text-slate-950 shadow-lg p-0 active:scale-95 transition-all"
                  >
                    {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="h-8 w-8" />}
                  </Button>
                </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-16 bg-white text-slate-950 rounded-2xl font-black uppercase italic text-lg shadow-xl active:scale-95 transition-all relative z-10">End Mission</Button>
            </Card>
            
            <div className="h-48 rounded-[2rem] overflow-hidden border border-white/10 shadow-xl bg-slate-900 relative">
              {isLoaded && (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={profile?.currentLat ? { lat: profile.currentLat, lng: profile.currentLng } : DEFAULT_CENTER} zoom={13} options={mapOptions}>
                  <Marker position={profile?.currentLat ? { lat: profile.currentLat, lng: profile.currentLng } : DEFAULT_CENTER} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', scaledSize: new window.google.maps.Size(35, 35) }} />
                </GoogleMap>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-12">
             <div className="flex justify-between items-center px-1">
                <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter text-glow">Ledger</h3>
                <div className="text-right">
                   <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Lifetime</p>
                   <p className="text-xl font-black italic text-primary">₹{(profile?.totalEarnings || 0).toFixed(0)}</p>
                </div>
             </div>
             <div className="space-y-3">
                {!pastTrips || pastTrips.length === 0 ? (
                  <div className="p-10 text-center bg-slate-900/50 rounded-2xl border border-dashed border-white/5">
                    <History className="h-10 w-10 text-slate-800 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 italic">No mission data</p>
                  </div>
                ) : (
                  [...pastTrips].sort((a,b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((trip: any) => (
                    <Card key={trip.id} className="bg-slate-900 border border-white/5 rounded-xl p-5 flex justify-between items-center shadow-lg active:scale-95 transition-all">
                      <div className="space-y-1">
                          <h4 className="font-black text-lg uppercase italic leading-none tracking-tighter">{trip.routeName}</h4>
                          <p className="text-[8px] font-bold text-slate-500 uppercase italic tracking-widest">{new Date(trip.endTime).toLocaleDateString()} • {trip.finalRiderCount || trip.riderCount} Scholars</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                         <Badge className="bg-white/5 text-slate-600 border-none text-[7px] font-black uppercase tracking-widest mt-1">90% Share</Badge>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter text-glow pl-1">Fleet Status</h3>
             <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "Engine Grid", value: "Online", icon: Activity, color: "text-green-400", progress: 98 },
                  { label: "Brake Pads", value: "Safe", icon: ShieldCheck, color: "text-primary", progress: 92 },
                  { label: "Sanitation", value: "Clean", icon: CheckCircle2, color: "text-accent", progress: 100 },
                ].map((item, i) => (
                  <Card key={i} className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl space-y-3 active:scale-98 transition-all">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 bg-slate-950 rounded-lg border border-white/5 ${item.color}`}><item.icon className="h-4 w-4" /></div>
                           <p className="font-black text-white uppercase italic text-sm tracking-tighter">{item.label}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${item.color}`}>{item.value}</span>
                     </div>
                     <Progress value={item.progress} className="h-1 bg-slate-950" />
                  </Card>
                ))}
                <Card className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex items-center justify-between shadow-xl active:scale-98 transition-all">
                   <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-green-400 tracking-widest">Day Eco-Mission</p>
                      <h3 className="text-2xl font-black italic uppercase text-white leading-none tracking-tighter">{stats.carbon} kg</h3>
                      <p className="text-[7px] font-bold text-green-400/60 uppercase tracking-widest">CO2 Offset</p>
                   </div>
                   <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 border border-green-500/20">
                      <Leaf className="h-6 w-6" />
                   </div>
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in text-center pb-20 pt-6">
            <div className="flex flex-col items-center gap-6">
              <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden border-4 border-primary/10 bg-slate-900 flex items-center justify-center shadow-2xl relative">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-12 w-12 text-slate-800" />}
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter text-glow">{profile?.fullName}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                   <Badge className="bg-primary text-slate-950 border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-lg">{profile?.vehicleType} Captain</Badge>
                   <Badge className="bg-slate-900 text-slate-500 border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest border border-white/5">{profile?.city || 'Global'} Hub</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-left">
              {[
                { label: "Fleet Registration", value: profile?.vehicleNumber, icon: Car },
                { label: "Identity Clearance", value: profile?.licenseNumber, icon: ShieldCheck },
                { label: "Captain Rating", value: "4.9 / 5.0", icon: Star },
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl flex items-center gap-4 border border-white/5 active:scale-98 transition-all">
                   <div className="h-10 w-10 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-center text-primary shadow-lg"><item.icon className="h-5 w-5" /></div>
                   <div>
                      <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">{item.label}</p>
                      <p className="font-black text-white italic uppercase text-lg leading-none tracking-tighter">{item.value}</p>
                   </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSignOut} className="w-full h-16 bg-red-500/5 text-red-500 rounded-2xl font-black uppercase italic mt-6 border border-red-500/10 active:scale-95 active:bg-red-500 active:text-white transition-all text-sm">
              <LogOut className="h-5 w-5 mr-3" /> Terminate Session
            </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('mission')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'mission' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <LayoutGrid className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Mission</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('ledger')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'ledger' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <Wallet className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Ledger</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('fleet')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'fleet' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <Settings className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Fleet</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 px-4 gap-1 rounded-xl transition-all active:scale-90 ${activeTab === 'profile' ? 'text-primary bg-primary/10' : 'text-slate-600'}`}>
          <UserIcon className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
