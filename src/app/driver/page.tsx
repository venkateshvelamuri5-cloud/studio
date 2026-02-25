
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Bus, 
  Power, 
  Loader2, 
  LogOut, 
  CheckCircle2,
  Wallet,
  LayoutGrid,
  Settings,
  Search,
  Users,
  MapPin,
  Clock,
  Navigation,
  ArrowUpRight
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, onSnapshot, query, where, arrayUnion, getDocs, increment, setDoc } from 'firebase/firestore';
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
    if (!profile || profile.status === 'offline' || !userRef || !db) return;
    const updateLocation = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = { currentLat: pos.coords.latitude, currentLng: pos.coords.longitude };
          updateDoc(userRef, coords);
          if (profile.status === 'on-trip' && profile.activeTripId) {
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
    toast({ title: newStatus === 'available' ? "Ready for Jobs" : "Offline" });
  };

  const startJob = async (trip: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    
    if (trip.driverId) {
      toast({ variant: "destructive", title: "Job Taken", description: "Another driver is on this mission." });
      setIsUpdating(false);
      return;
    }

    try {
      const tripRef = doc(db, 'trips', trip.id);
      await updateDoc(tripRef, {
        driverId: user.uid,
        driverName: profile.fullName,
        driverPhoto: profile.photoUrl || null,
        vehicleNumber: profile.vehicleNumber || 'N/A',
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
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const riderCount = activeTrip.verifiedPassengers?.length || 0;
      const totalYield = riderCount * (activeTrip.farePerRider || 0);
      const driverPayout = totalYield * 0.9;
      await updateDoc(doc(db, 'trips', activeTrip.id), { status: 'completed', endTime: new Date().toISOString(), totalYield, driverShare: driverPayout });
      await updateDoc(userRef, { status: 'available', activeTripId: null, totalEarnings: increment(driverPayout) });
      toast({ title: "Mission Done" });
    } finally { setIsUpdating(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black">
            <ConnectingDotsLogo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase leading-none text-primary">FLEET</h1>
            <Badge className={`${profile?.status === 'offline' ? 'bg-white/5' : 'bg-primary/20 text-primary'} border-none text-[8px] font-black uppercase mt-1 px-3 py-1 rounded-full`}>
              {profile?.status === 'available' ? 'Ready' : profile?.status === 'on-trip' ? 'Busy' : 'Offline'}
            </Badge>
          </div>
        </div>
        <Button onClick={handleToggleStatus} className={`rounded-2xl h-11 w-11 p-0 shadow-xl ${profile?.status === 'offline' ? 'bg-white/5 text-muted-foreground' : 'bg-primary text-black'}`}>
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'jobs' && (!activeTrip ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10 rounded-[2rem] p-6 space-y-1">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">My Money</p>
                 <h2 className="text-2xl font-black italic text-primary">₹{(profile?.totalEarnings || 0).toFixed(0)}</h2>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-[2rem] p-6 space-y-1">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Missions</p>
                 <h2 className="text-2xl font-black italic text-foreground">{pastTrips?.length || 0}</h2>
              </Card>
            </div>

            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black italic uppercase text-foreground flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Corridor Grid</h2>
              <Badge variant="outline" className="border-white/10 text-[8px] uppercase">{profile?.city} Hub</Badge>
            </div>
            
            <div className="space-y-3">
              {jobPool?.filter(j => !j.driverId).length === 0 ? (
                <div className="p-16 text-center text-muted-foreground italic bg-white/5 rounded-[2rem] border border-dashed border-white/10">Scanning for scholar demand...</div>
              ) : jobPool?.filter(j => !j.driverId).map((job: any) => (
                <Card key={job.id} className="glass-card rounded-[2rem] p-8 flex justify-between items-center border-white/5 group hover:border-primary/30 transition-all">
                  <div className="space-y-1">
                    <h3 className="font-black text-xl text-foreground uppercase italic">{job.routeName}</h3>
                    <div className="flex items-center gap-2">
                       <Badge className="bg-primary text-black border-none text-[8px] font-black uppercase px-2 py-0.5">{job.passengerManifest?.length || 0} Bookings</Badge>
                       <span className="text-[10px] font-bold text-muted-foreground">{job.scheduledDate === format(new Date(), 'yyyy-MM-dd') ? 'Today' : job.scheduledDate}</span>
                    </div>
                  </div>
                  <Button onClick={() => startJob(job)} disabled={profile?.status === 'offline' || isUpdating} className="rounded-2xl h-14 w-14 p-0 bg-primary text-black shadow-lg shadow-primary/20 active:scale-90 transition-all">
                    <ArrowUpRight className="h-6 w-6" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-8">
            <Card className="glass-card rounded-[3rem] p-8 space-y-8 border-primary/30">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black italic uppercase leading-none text-primary">{activeTrip.routeName}</h2>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Active Mission</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-4 py-2 rounded-full">{activeTrip.verifiedPassengers?.length || 0} / {activeTrip.passengerManifest?.length || 0}</Badge>
              </div>

              <div className="bg-black/40 p-6 rounded-[2rem] space-y-4 border border-white/5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-3">Verify Boarding Code</Label>
                <div className="flex gap-3">
                  <input value={verificationOtp} onChange={(e) => setVerificationOtp(e.target.value)} placeholder="000000" className="h-16 w-full text-center font-black tracking-widest text-3xl rounded-xl bg-white/5 border border-white/10 text-primary focus:ring-2 focus:ring-primary outline-none" maxLength={6} />
                  <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-16 w-16 rounded-xl bg-primary text-black shadow-lg shadow-primary/20"><CheckCircle2 className="h-8 w-8" /></Button>
                </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-3"><Users className="h-4 w-4" /> Scholar Manifest</h3>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {activeTrip.passengerManifest?.map((m: any, i: number) => {
                      const isVerified = activeTrip.verifiedPassengers?.includes(m.uid);
                      return (
                        <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${isVerified ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/10 opacity-70'}`}>
                           <div>
                              <p className="font-black italic text-foreground text-sm uppercase">{m.name}</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">{m.pickup} → {m.destination}</p>
                           </div>
                           {isVerified ? <CheckCircle2 className="text-primary h-5 w-5" /> : <Badge className="text-[8px] bg-accent/20 text-accent border-none animate-pulse px-3 py-1">Waiting</Badge>}
                        </div>
                      );
                    })}
                 </div>
              </div>

              <Button onClick={endTrip} disabled={isUpdating} className="w-full h-18 bg-primary/10 border-2 border-primary text-primary rounded-[2rem] font-black uppercase italic text-lg shadow-xl hover:bg-primary hover:text-black transition-all">Finish Mission</Button>
            </Card>
          </div>
        ))}

        {activeTab === 'money' && (
          <div className="space-y-6 animate-in fade-in pb-12">
             <h3 className="text-4xl font-black italic uppercase text-foreground tracking-tighter pl-2">Money</h3>
             <div className="space-y-4">
                {pastTrips?.length === 0 ? (
                  <div className="p-20 text-center italic text-muted-foreground bg-white/5 rounded-[2rem] border border-dashed border-white/10">No earnings yet.</div>
                ) : [...pastTrips].sort((a,b) => b.endTime.localeCompare(a.endTime)).map((trip: any) => (
                  <Card key={trip.id} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 flex justify-between items-center shadow-lg">
                    <div>
                        <h4 className="font-black text-xl uppercase italic leading-none">{trip.routeName}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{new Date(trip.endTime).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xl font-black italic text-primary">+₹{(trip.driverShare || 0).toFixed(0)}</p>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="space-y-12 text-center pb-24 pt-10">
            <div className="flex flex-col items-center gap-6">
              <div className="h-40 w-40 rounded-full overflow-hidden border-[6px] border-white/10 bg-primary/10 flex items-center justify-center">
                {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <Loader2 className="animate-spin text-primary/20 h-10 w-10" />}
              </div>
              <h2 className="text-4xl font-black italic uppercase text-foreground leading-none">{profile?.fullName}</h2>
              <div className="flex flex-col gap-2 items-center">
                <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px] tracking-widest px-4 py-1">{profile?.vehicleType}</Badge>
                <p className="text-[10px] font-black uppercase text-muted-foreground italic tracking-widest">{profile?.vehicleNumber}</p>
              </div>
            </div>
            <Button onClick={handleSignOut} className="w-full h-16 bg-destructive/10 text-destructive rounded-[2rem] font-black uppercase italic border border-destructive/20 text-lg shadow-xl shadow-destructive/5 transition-all">
              <LogOut className="h-6 w-6 mr-3" /> Sign Out
            </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('jobs')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'jobs' ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutGrid className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Jobs</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('money')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'money' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Wallet className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Money</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-2 px-4 gap-1 ${activeTab === 'me' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Settings className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Me</span>
        </Button>
      </nav>
    </div>
  );
}
