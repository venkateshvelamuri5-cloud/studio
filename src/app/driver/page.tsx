
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Wallet,
  LayoutGrid,
  Settings,
  Users,
  MapPin,
  Clock,
  Navigation,
  ArrowUpRight,
  Target,
  Trophy,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, onSnapshot, query, where, arrayUnion, getDocs, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: jobPool } = useCollection(useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'trips'), where('status', '==', 'active'));
  }, [db]));

  const { data: pastTrips } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'completed'));
  }, [db, user?.uid]));

  useEffect(() => {
    if (!profile || profile.status !== 'on-trip' || !userRef || !db || !profile.activeTripId) return;
    const updateLocation = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = { currentLat: pos.coords.latitude, currentLng: pos.coords.longitude };
          updateDoc(userRef, coords);
          if (profile.activeTripId) {
            updateDoc(doc(db, 'trips', profile.activeTripId), coords);
          }
        }, () => {}, { enableHighAccuracy: true });
      }
    };
    const interval = setInterval(updateLocation, 5000);
    return () => clearInterval(interval);
  }, [profile?.status, profile?.activeTripId, userRef, db]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/driver/login');
  }, [user, authLoading, router]);

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
    toast({ title: newStatus === 'available' ? "Operator Ready" : "Offline" });
  };

  const startJob = async (trip: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    if (trip.driverId && trip.driverId !== user.uid) {
      toast({ variant: "destructive", title: "Mission Locked", description: "Another operator has claimed this route." });
      setIsUpdating(false);
      return;
    }
    try {
      const tripRef = doc(db, 'trips', trip.id);
      await updateDoc(tripRef, {
        driverId: user.uid,
        driverName: profile.fullName,
        driverPhoto: profile.photoUrl || null,
        vehicleNumber: profile.vehicleNumber || 'FLEET-AAGO',
        vehicleType: profile.vehicleType || 'Shuttle',
        maxCapacity: profile.seatingCapacity || 7,
        status: 'active',
        startTime: new Date().toISOString()
      });
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: trip.id });
      toast({ title: "Mission Started" });
    } finally { setIsUpdating(false); }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    const q = query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim()));
    const snap = await getDocs(q);
    if (snap.empty) {
      toast({ variant: "destructive", title: "Invalid Code" });
    } else {
      const riderId = snap.docs[0].id;
      const riderName = snap.docs[0].data().fullName;
      await updateDoc(doc(db, 'trips', activeTrip.id), { 
        verifiedPassengers: arrayUnion(riderId), 
        riderCount: increment(1) 
      });
      await updateDoc(doc(db, 'users', riderId), { activeOtp: null });
      toast({ title: "Scholar Boarded", description: `${riderName} verified.` });
      setVerificationOtp("");
    }
    setIsVerifying(false);
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const riderCount = activeTrip.verifiedPassengers?.length || 0;
      const totalYield = riderCount * (activeTrip.farePerRider || 0);
      const driverPayout = totalYield * 0.9;
      await updateDoc(doc(db, 'trips', activeTrip.id), { 
        status: 'completed', 
        endTime: new Date().toISOString(), 
        totalYield, 
        driverShare: driverPayout 
      });
      await updateDoc(userRef, { 
        status: 'available', 
        activeTripId: null, 
        totalEarnings: increment(driverPayout) 
      });
      toast({ title: "Mission Done", description: `Payout ₹${driverPayout.toFixed(0)} credited.` });
    } finally { setIsUpdating(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  // VERIFICATION GATE
  if (profile && !profile.isVerified) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-10 text-center space-y-8 safe-area-inset">
        <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse shadow-2xl shadow-primary/20">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h1 className="text-4xl font-black italic uppercase text-foreground leading-none tracking-tighter">Identity Pending</h1>
          <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest leading-relaxed">
            Your operator profile is currently being reviewed by the AAGO Hub administration. Access to the grid will be granted shortly.
          </p>
        </div>
        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 w-full max-w-xs flex flex-col items-center gap-3">
           <Loader2 className="animate-spin h-6 w-6 text-primary" />
           <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Syncing Hub Auth...</p>
        </div>
        <Button onClick={handleSignOut} variant="ghost" className="text-destructive font-black uppercase italic"><LogOut className="mr-2 h-4 w-4" /> Exit Terminal</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black">
            <ConnectingDotsLogo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase leading-none text-primary">OPERATOR</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-white/5 text-muted-foreground' : 'bg-primary/20 text-primary'} border-none text-[8px] font-black uppercase mt-1 px-3 py-1 rounded-full`}>
              {profile?.status === 'available' ? 'Grid Ready' : profile?.status === 'on-trip' ? 'On Mission' : 'Offline'}
            </Badge>
          </div>
        </div>
        <Button onClick={handleToggleStatus} className={`rounded-2xl h-11 w-11 p-0 shadow-xl transition-all active:scale-90 ${profile?.status === 'offline' ? 'bg-white/5 text-muted-foreground' : 'bg-primary text-black'}`}>
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'jobs' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10 rounded-[2rem] p-6 space-y-1 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="h-12 w-12" /></div>
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Revenue Hub</p>
                 <h2 className="text-2xl font-black italic text-primary">₹{(profile?.totalEarnings || 0).toFixed(0)}</h2>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-[2rem] p-6 space-y-1 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Missions</p>
                 <h2 className="text-2xl font-black italic text-foreground">{pastTrips?.length || 0} Done</h2>
              </Card>
            </div>

            <div className="flex items-center justify-between px-2 mt-4">
              <h2 className="text-xl font-black italic uppercase text-foreground flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Hub Discovery</h2>
              <Badge variant="outline" className="border-white/10 text-[8px] uppercase tracking-widest">ACTIVE GRID</Badge>
            </div>
            
            <div className="space-y-3">
              {jobPool?.filter(j => !j.driverId).length === 0 ? (
                <div className="p-20 text-center text-muted-foreground italic bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
                   <Loader2 className="animate-spin h-6 w-6 opacity-20" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Scanning active demand...</p>
                </div>
              ) : jobPool?.filter(j => !j.driverId).map((job: any) => (
                <Card key={job.id} className="glass-card rounded-[2.5rem] p-8 flex justify-between items-center border-white/5 group hover:border-primary/40 hover:bg-white/10 transition-all">
                  <div className="space-y-2">
                    <h3 className="font-black text-2xl text-foreground uppercase italic leading-none">{job.routeName}</h3>
                    <div className="flex items-center gap-3">
                       <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase px-3 py-1 rounded-full">{job.passengerManifest?.length || 0} Bookings</Badge>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">{job.scheduledDate === format(new Date(), 'yyyy-MM-dd') ? 'Today' : job.scheduledDate}</span>
                    </div>
                  </div>
                  <Button onClick={() => startJob(job)} disabled={profile?.status === 'offline' || isUpdating} className="rounded-2xl h-16 w-16 p-0 bg-primary text-black shadow-2xl shadow-primary/20 hover:scale-105 active:scale-90 transition-all">
                    <ArrowUpRight className="h-8 w-8" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-8">
            <Card className="glass-card rounded-[3.5rem] p-8 space-y-8 border-primary/30 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black italic uppercase leading-none text-primary tracking-tighter">{activeTrip.routeName}</h2>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2 italic">Active Mission Flow</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-5 py-2 rounded-full">LIVE TELEMETRY</Badge>
              </div>

              <div className="bg-black/60 p-8 rounded-[3rem] space-y-6 border border-white/10 relative z-10 shadow-inner">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-4">Confirm Scholar Code</Label>
                <div className="flex gap-4">
                  <input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="h-20 w-full text-center font-black tracking-[0.5em] text-4xl rounded-3xl bg-white/5 border border-white/10 text-primary focus:border-primary outline-none transition-all" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-20 w-20 rounded-3xl bg-primary text-black shadow-2xl shadow-primary/20 active:scale-95"><CheckCircle2 className="h-10 w-10" /></Button>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 ml-4"><Users className="h-4 w-4 text-primary" /> Grid Manifest</h3>
                 <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {activeTrip.passengerManifest?.map((m: any, i: number) => {
                      const isVerified = activeTrip.verifiedPassengers?.includes(m.uid);
                      return (
                        <div key={i} className={`p-6 rounded-3xl border transition-all flex items-center justify-between ${isVerified ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 opacity-60'}`}>
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-white/20"><Users className="h-5 w-5" /></div>
                              <div>
                                 <p className="font-black italic text-foreground text-sm uppercase leading-none">{m.name}</p>
                                 <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 italic">{m.pickup} → {m.destination}</p>
                              </div>
                           </div>
                           {isVerified ? <CheckCircle2 className="text-primary h-6 w-6" /> : <Badge className="text-[8px] bg-accent/20 text-accent border-none animate-pulse px-4 py-1 rounded-full uppercase italic">Waiting</Badge>}
                        </div>
                      );
                    })}
                 </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-20 bg-primary/10 border-2 border-primary/50 text-primary rounded-[3rem] font-black uppercase italic text-xl shadow-2xl hover:bg-primary hover:text-black transition-all active:scale-95">End Grid Mission</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'money' && (
          <div className="space-y-8 animate-in fade-in pb-12">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Money Hub</h3>
                <Badge className="bg-primary text-black border-none font-black text-[10px] uppercase px-4 py-1.5 rounded-full tracking-widest">₹{(profile?.totalEarnings || 0).toFixed(0)}</Badge>
             </div>
             <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Trophy className="h-6 w-6" /></div>
                  <div>
                    <h4 className="text-xl font-black italic uppercase text-foreground">Mission Goal</h4>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest italic mt-1">Daily Grid Progress</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>{pastTrips?.length || 0} / 10 Completed</span>
                    <span>{Math.min(100, ((pastTrips?.length || 0) / 10) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(100, ((pastTrips?.length || 0) / 10) * 100)} className="h-3 bg-white/5 rounded-full [&>div]:bg-primary" />
                </div>
             </Card>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in">
            <div className="flex flex-col items-center gap-8">
              <div className="h-44 w-44 rounded-full border-[10px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-2xl group relative">
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <Loader2 className="animate-spin text-primary/20 h-12 w-12" />}
              </div>
              <div className="space-y-3">
                 <h2 className="text-5xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                 <div className="flex flex-col gap-2 items-center">
                   <Badge className="bg-primary/20 text-primary border-none uppercase text-[10px] font-black tracking-widest px-6 py-1.5 rounded-full">{profile?.vehicleType}</Badge>
                   <p className="text-sm font-black uppercase text-muted-foreground italic tracking-tighter opacity-50">{profile?.vehicleNumber}</p>
                 </div>
              </div>
            </div>
            <Button onClick={handleSignOut} className="w-full max-w-sm mx-auto h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border border-destructive/20 text-xl shadow-2xl hover:bg-destructive hover:text-white transition-all group">
              <LogOut className="h-7 w-7 mr-4 group-hover:scale-110 transition-transform" /> De-Authenticate Grid
            </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('jobs')} className={`flex-col h-auto py-3 px-8 gap-1 rounded-2xl transition-all ${activeTab === 'jobs' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <LayoutGrid className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Grid</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('money')} className={`flex-col h-auto py-3 px-8 gap-1 rounded-2xl transition-all ${activeTab === 'money' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <Wallet className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Money</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-3 px-8 gap-1 rounded-2xl transition-all ${activeTab === 'me' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-white/5'}`}>
          <Settings className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
