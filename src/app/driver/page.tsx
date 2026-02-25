
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
  Activity,
  IndianRupee,
  Wallet,
  Car,
  LayoutGrid,
  Settings,
  MapPin,
  ShieldCheck,
  Zap,
  Copy,
  Search,
  Users,
  MapPinned
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, arrayUnion, getDocs, increment, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function DriverApp() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'jobs' | 'money' | 'stats' | 'me'>('jobs');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Search Filters for Drivers
  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: pastTrips } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'));
  }, [db, user?.uid]));

  const { data: currentActiveTrips } = useCollection(useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'trips'), where('status', '==', 'active'));
  }, [db]));

  const stats = useMemo(() => {
    if (!pastTrips) return { earnings: 0, count: 0, scholars: 0, carbon: 0 };
    const earnings = pastTrips.reduce((acc, t) => acc + (t.driverShare || 0), 0);
    const totalScholars = pastTrips.reduce((acc, t) => acc + (t.finalRiderCount || t.riderCount || 0), 0);
    return { earnings, count: pastTrips.length, scholars: totalScholars, carbon: (totalScholars * 0.4).toFixed(1) };
  }, [pastTrips]);

  useEffect(() => {
    if (!profile || profile.status === 'offline' || !userRef || !db) return;
    
    const updateLocation = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = { 
            currentLat: pos.coords.latitude, 
            currentLng: pos.coords.longitude 
          };
          
          updateDoc(userRef, coords);
          
          if (profile.status === 'on-trip' && profile.activeTripId) {
            updateDoc(doc(db, 'trips', profile.activeTripId), coords);
          }
        }, (err) => {}, { enableHighAccuracy: true });
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 5000);
    return () => clearInterval(interval);
  }, [profile?.status, profile?.activeTripId, userRef, db]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/driver/login');
    }
  }, [user, authLoading, router]);

  const { data: allRoutes } = useCollection(useMemo(() => (db && user) ? query(collection(db, 'routes')) : null, [db, user]));
  
  const allStops = useMemo(() => {
    const stops = new Set<string>();
    allRoutes?.forEach(r => r.stops?.forEach((s: any) => stops.add(s.name)));
    return Array.from(stops).sort();
  }, [allRoutes]);

  const availableRoutes = useMemo(() => {
    if (!allRoutes) return [];
    let filtered = allRoutes.filter(r => r.status === 'active');
    
    // Filter by Search Hubs
    if (searchStart || searchEnd) {
      filtered = filtered.filter(route => {
        const hasStart = searchStart ? route.stops?.some((s: any) => s.name === searchStart) : true;
        const hasEnd = searchEnd ? route.stops?.some((s: any) => s.name === searchEnd) : true;
        return hasStart && hasEnd;
      });
    }

    // Exclusivity: Hide routes that already have an active driver
    return filtered.filter(route => {
      return !currentActiveTrips?.some(t => t.routeName === route.routeName);
    });
  }, [allRoutes, searchStart, searchEnd, currentActiveTrips]);

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
    toast({ title: newStatus === 'available' ? "Ready for Jobs" : "Offline" });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    
    // Exclusivity Check (Final check before write)
    const tripQuery = query(collection(db, 'trips'), where('routeName', '==', route.routeName), where('status', '==', 'active'));
    const tripSnap = await getDocs(tripQuery);
    
    if (!tripSnap.empty) {
      toast({ variant: "destructive", title: "Route Occupied", description: "Another driver just started this ride." });
      setIsUpdating(false);
      return;
    }

    try {
      const tripRef = await addDoc(collection(db, 'trips'), {
        driverId: user.uid, 
        driverName: profile.fullName, 
        driverPhoto: profile.photoUrl || null,
        vehicleNumber: profile.vehicleNumber || 'N/A',
        vehicleType: profile.vehicleType || 'Shuttle',
        routeName: route.routeName, 
        farePerRider: route.baseFare, 
        status: 'active', 
        riderCount: 0, 
        passengers: [], 
        passengerManifest: [], // Detailed scholar data
        verifiedPassengers: [], 
        startTime: new Date().toISOString(),
        currentLat: profile.currentLat || null,
        currentLng: profile.currentLng || null
      });
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Job Started", description: `Corridor: ${route.routeName}` });
    } finally { setIsUpdating(false); }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    const snap = await getDocs(query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim())));
    if (snap.empty) {
      toast({ variant: "destructive", title: "Invalid Code" });
    } else {
      const riderId = snap.docs[0].id;
      await updateDoc(doc(db, 'trips', activeTrip.id), { verifiedPassengers: arrayUnion(riderId), riderCount: increment(1) });
      await updateDoc(doc(db, 'users', riderId), { activeOtp: null });
      toast({ title: "Scholar Boarded" });
      setVerificationOtp("");
    }
    setIsVerifying(false);
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
      toast({ title: "Job Done", description: `Earned ₹${driverPayout.toFixed(0)}` });
    } finally { setIsUpdating(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset overflow-x-hidden">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20">
            <ConnectingDotsLogo className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none text-primary text-glow">FLEET</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-white/5 text-muted-foreground' : 'bg-primary/20 text-primary'} border-none text-[8px] font-black uppercase mt-1 px-3 py-1 rounded-full`}>
              {profile?.status === 'available' ? 'Ready' : profile?.status === 'on-trip' ? 'Busy' : 'Offline'}
            </Badge>
          </div>
        </div>
        <Button onClick={handleToggleStatus} className={`rounded-2xl h-11 w-11 p-0 transition-all shadow-xl active:scale-95 ${profile?.status === 'offline' ? 'bg-white/5 text-muted-foreground' : 'bg-primary text-black shadow-primary/30'}`}>
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'jobs' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10 rounded-[2rem] p-6 space-y-2 shadow-xl backdrop-blur-3xl group active:scale-95 transition-all">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.3em]">Total Cash</p>
                 <h2 className="text-3xl font-black italic uppercase leading-none text-primary text-glow tracking-tighter">₹{(profile?.totalEarnings || 0).toFixed(0)}</h2>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-[2rem] p-6 space-y-2 shadow-xl backdrop-blur-3xl group active:scale-95 transition-all">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.3em]">Rides</p>
                 <h2 className="text-3xl font-black italic text-foreground leading-none tracking-tighter">{stats.count}</h2>
              </Card>
            </div>

            <Card className="bg-white/5 border-white/10 rounded-[2rem] p-8 space-y-4">
               <h2 className="text-xl font-black italic uppercase text-foreground tracking-tighter flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Discover Jobs</h2>
               <div className="space-y-3">
                  <select value={searchStart} onChange={e => setSearchStart(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 font-black italic text-sm outline-none text-foreground appearance-none">
                     <option value="" className="bg-background">Filter Start Hub?</option>
                     {allStops.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                  </select>
                  <select value={searchEnd} onChange={e => setSearchEnd(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 font-black italic text-sm outline-none text-foreground appearance-none">
                     <option value="" className="bg-background">Filter End Hub?</option>
                     {allStops.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                  </select>
               </div>
            </Card>

            <div className="space-y-3">
              {availableRoutes.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground italic bg-white/5 rounded-[2rem] border border-dashed border-white/10">No jobs matching these hubs.</div>
              ) : availableRoutes.map((route: any) => (
                <Card key={route.id} className="glass-card rounded-[2rem] shadow-xl overflow-hidden border-white/5 group hover:border-primary/20 transition-all">
                  <CardContent className="p-8 flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="font-black text-2xl text-foreground uppercase italic leading-none tracking-tighter">{route.routeName}</h3>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">₹{route.baseFare} Per Scholar</p>
                    </div>
                    <Button onClick={() => startTrip(route)} disabled={profile?.status === 'offline' || isUpdating} className="rounded-2xl h-16 px-8 bg-primary text-black font-black uppercase italic text-sm shadow-2xl shadow-primary/20 active:scale-95 transition-all">Start</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-12">
            <Card className="glass-card rounded-[3rem] p-10 space-y-8 shadow-2xl relative overflow-hidden border-primary/30">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-primary text-glow">{activeTrip.routeName}</h2>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] mt-2 italic">Active Mission</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-5 py-2.5 rounded-full shadow-lg">{activeTrip.verifiedPassengers?.length || 0} Boarded</Badge>
              </div>

              <div className="bg-black/60 p-8 rounded-[2.5rem] space-y-4 border border-white/10 shadow-inner">
                <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-3 italic">Verify Scholar Code</Label>
                <div className="flex gap-3">
                  <input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="h-20 w-full text-center font-black tracking-[0.4em] text-4xl rounded-2xl bg-white/5 border border-white/10 outline-none focus:ring-4 focus:ring-primary/20 text-primary" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-20 w-20 rounded-2xl bg-primary text-black shadow-2xl p-0 active:scale-95 transition-all"><CheckCircle2 className="h-10 w-10" /></Button>
                </div>
              </div>

              {/* Boarding Notification List */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3 flex items-center gap-2"><Users className="h-4 w-4" /> Boarding Manifest</h3>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {(!activeTrip.passengerManifest || activeTrip.passengerManifest.length === 0) ? (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 italic text-[10px] text-muted-foreground uppercase">Waiting for Scholars...</div>
                    ) : activeTrip.passengerManifest.map((scholar: any, i: number) => {
                      const isVerified = activeTrip.verifiedPassengers?.includes(scholar.uid);
                      return (
                        <div key={i} className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${isVerified ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/10'}`}>
                           <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isVerified ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-primary/10 text-primary'}`}>
                                 {isVerified ? <CheckCircle2 className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                              </div>
                              <div>
                                 <p className="font-black italic text-foreground uppercase text-xs leading-none">{scholar.name}</p>
                                 <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                                    {scholar.pickup} <span className="text-primary">→</span> {scholar.destination}
                                 </p>
                              </div>
                           </div>
                           {!isVerified && <Badge className="bg-accent/20 text-accent border-none text-[8px] font-black uppercase px-2 py-0.5 animate-pulse">Waiting</Badge>}
                        </div>
                      );
                    })}
                 </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-20 bg-primary/10 border-2 border-primary text-primary rounded-[2rem] font-black uppercase italic text-xl shadow-2xl active:scale-95 transition-all">Finish Job</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'money' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-12">
             <h3 className="text-4xl font-black italic uppercase text-foreground tracking-tighter pl-2">Money</h3>
             <div className="space-y-4">
                {[...pastTrips].sort((a,b) => b.endTime.localeCompare(a.endTime)).map((trip: any) => (
                  <Card key={trip.id} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-8 flex justify-between items-center shadow-lg hover:bg-white/10 transition-all cursor-pointer">
                    <div className="space-y-1">
                        <h4 className="font-black text-2xl uppercase italic leading-none tracking-tighter">{trip.routeName}</h4>
                        <p className="text-[10px] font-black text-muted-foreground uppercase italic tracking-[0.2em]">{new Date(trip.endTime).toLocaleDateString()}</p>
                    </div>
                    <p className="text-2xl font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <h3 className="text-4xl font-black italic uppercase text-foreground tracking-tighter pl-2">Stats</h3>
             <div className="grid grid-cols-1 gap-6">
                {[
                  { label: "Signal Strength", value: "100%", icon: Zap, progress: 100 },
                  { label: "Fleet Health", value: "98%", icon: ShieldCheck, progress: 98 },
                ].map((item, i) => (
                  <Card key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-xl space-y-5 backdrop-blur-3xl">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-primary/10 rounded-2xl text-primary"><item.icon className="h-6 w-6" /></div>
                           <p className="font-black text-foreground uppercase italic text-lg tracking-tighter leading-none">{item.label}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary text-glow">{item.value}</span>
                     </div>
                     <Progress value={item.progress} className="h-2 bg-white/5 rounded-full" />
                  </Card>
                ))}
                <Card className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-10 flex items-center justify-between shadow-2xl relative overflow-hidden">
                   <div className="space-y-2 relative z-10">
                      <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] italic mb-1">Eco Score</p>
                      <h3 className="text-5xl font-black italic uppercase text-foreground leading-none tracking-tighter">{stats.carbon} kg <span className="text-sm font-black text-muted-foreground">Saved</span></h3>
                   </div>
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 animate-in fade-in text-center pb-24 pt-10 px-4">
            <div className="flex flex-col items-center gap-10">
              <div className="h-48 w-48 rounded-full overflow-hidden border-[8px] border-white/10 bg-primary/10 flex items-center justify-center shadow-[0_0_80px_rgba(0,255,255,0.15)] relative">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-20 w-20 text-primary/20" />}
              </div>
              <div className="space-y-3">
                <h2 className="text-5xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                <Badge className="bg-primary text-black border-none text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest shadow-2xl">{profile?.vehicleType} Operator</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="bg-white/5 p-8 rounded-[2rem] flex items-center gap-6 border border-white/10 shadow-xl group active:scale-98 transition-all">
                   <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20"><Copy className="h-7 w-7" /></div>
                   <div className="flex-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.4em] mb-1 italic">Fleet ID</p>
                      <p className="font-black text-foreground italic uppercase text-2xl leading-none tracking-tighter">{profile?.referralCode || 'N/A'}</p>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(profile?.referralCode || ''); toast({ title: "Copied" }); }} className="text-primary hover:bg-primary/10"><Copy className="h-5 w-5" /></Button>
              </div>
              {[
                { label: "Plate", value: profile?.vehicleNumber, icon: Car },
                { label: "Seats", value: `${profile?.seatingCapacity} Total`, icon: Settings },
                { label: "Hub", value: profile?.city || 'Vizag', icon: MapPin }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 p-8 rounded-[2rem] flex items-center gap-6 border border-white/10 shadow-xl backdrop-blur-3xl active:scale-98 transition-all">
                   <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg border border-primary/20"><item.icon className="h-7 w-7" /></div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.4em] mb-1 italic">{item.label}</p>
                      <p className="font-black text-foreground italic uppercase text-2xl leading-none tracking-tighter">{item.value}</p>
                   </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSignOut} className="w-full h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic mt-10 border border-destructive/20 active:scale-95 transition-all shadow-2xl text-xl">
              <LogOut className="h-8 w-8 mr-4" /> Sign Out
            </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <Button variant="ghost" onClick={() => setActiveTab('jobs')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'jobs' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <LayoutGrid className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Jobs</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('money')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'money' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <Wallet className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Money</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('stats')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'stats' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <Settings className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Stats</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-3 px-5 gap-2 rounded-2xl transition-all ${activeTab === 'me' ? 'text-primary bg-primary/10 shadow-lg scale-110' : 'text-muted-foreground'}`}>
          <UserIcon className="h-7 w-7" />
          <span className="text-[9px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
