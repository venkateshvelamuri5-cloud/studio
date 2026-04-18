
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Power, 
  Loader2, 
  LogOut, 
  CheckCircle2,
  Wallet,
  LayoutGrid,
  Settings,
  ArrowUpRight,
  Target,
  Trophy,
  ShieldAlert,
  Clock,
  MapPin,
  CalendarDays
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, onSnapshot, query, where, arrayUnion, getDocs, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { isBefore, addHours, parse, format } from 'date-fns';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
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

  const [activeTab, setActiveTab] = useState<'open-rides' | 'my-schedule' | 'money' | 'me'>('open-rides');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Rides that no one has picked yet
  const { data: availableRides } = useCollection(useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'trips'), where('status', '==', 'active'), where('driverId', '==', null));
  }, [db]));

  // Rides I have picked but haven't started yet
  const { data: myPickedRides } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
  }, [db, user?.uid]));

  useEffect(() => {
    if (!authLoading && !user) router.push('/driver/login');
  }, [user, authLoading, router]);

  // Listen for the currently live trip
  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'on-trip'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      else setActiveTrip(null);
    });
  }, [db, user?.uid]);

  const pickRide = async (trip: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        driverId: user.uid,
        driverName: profile.fullName,
        driverPhoto: profile.photoUrl || null,
        vehicleNumber: profile.vehicleNumber
      });
      toast({ title: "Ride Picked!", description: "It's now in your schedule." });
    } finally { setIsUpdating(false); }
  };

  const startRide = async (trip: any) => {
    if (!db || !user || !profile || !userRef) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'on-trip',
        startTime: new Date().toISOString()
      });
      await updateDoc(userRef, { 
        status: 'on-trip', 
        activeTripId: trip.id 
      });
      toast({ title: "Ride Started!", description: "Drive safe." });
    } finally { setIsUpdating(false); }
  };

  const verifyCustomer = async () => {
    if (!db || !activeTrip || !otpCode) return;
    setIsVerifying(true);
    const q = query(collection(db, 'users'), where('activeOtp', '==', otpCode.trim()));
    const snap = await getDocs(q);
    if (snap.empty) {
      toast({ variant: "destructive", title: "Wrong Code" });
    } else {
      const passengerId = snap.docs[0].id;
      await updateDoc(doc(db, 'trips', activeTrip.id), { 
        verifiedPassengers: arrayUnion(passengerId) 
      });
      await updateDoc(doc(db, 'users', passengerId), { activeOtp: null });
      toast({ title: "Customer Verified!" });
      setOtpCode("");
    }
    setIsVerifying(false);
  };

  const finishRide = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const totalFare = (activeTrip.passengerManifest?.length || 0) * (activeTrip.farePerRider || 0);
      const share = totalFare * 0.9; 
      await updateDoc(doc(db, 'trips', activeTrip.id), { 
        status: 'completed', 
        endTime: new Date().toISOString() 
      });
      await updateDoc(userRef, { 
        status: 'available', 
        activeTripId: null,
        totalEarnings: increment(share)
      });
      toast({ title: "Ride Finished!" });
    } finally { setIsUpdating(false); }
  };

  const isWithin3Hours = (dateStr: string, timeStr: string) => {
    try {
      if (!dateStr || !timeStr) return false;
      const combined = `${dateStr} ${timeStr}`;
      const tripTime = parse(combined, 'yyyy-MM-dd hh:mm a', new Date());
      const now = new Date();
      const threeHoursFromNow = addHours(now, 3);
      const twoHoursAfterStart = addHours(tripTime, 2);
      return isBefore(now, threeHoursFromNow) && isBefore(now, twoHoursAfterStart);
    } catch (e) {
      return false;
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  if (profile && !profile.isVerified) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-10 text-center space-y-8 safe-area-inset">
        <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse shadow-2xl">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h1 className="text-4xl font-black italic uppercase text-foreground leading-none tracking-tighter">Checking Details</h1>
          <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest leading-relaxed">
            We are checking your details. We will let you know once you can start driving.
          </p>
        </div>
        <Button onClick={handleSignOut} variant="ghost" className="text-destructive font-black uppercase italic">Logout</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black">
            <Logo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase text-primary">DRIVER</h1>
            <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase mt-1 px-3 py-1 rounded-full">
              {profile?.status?.toUpperCase() || 'OFFLINE'}
            </Badge>
          </div>
        </div>
        <Button onClick={() => updateDoc(userRef!, { status: profile?.status === 'offline' ? 'available' : 'offline' })} className={`rounded-2xl h-11 w-11 p-0 transition-all ${profile?.status === 'offline' ? 'bg-white/5 text-muted-foreground' : 'bg-primary text-black'}`}>
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTrip ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-8">
            <Card className="rounded-[3.5rem] p-8 space-y-8 border-primary/30 relative shadow-2xl bg-card/60 backdrop-blur-md">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <h2 className="text-4xl font-black italic uppercase leading-none text-primary tracking-tighter">{activeTrip.routeName}</h2>
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">Active Ride</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-5 py-2 rounded-full">LIVE</Badge>
               </div>

               <div className="bg-black/60 p-8 rounded-[3rem] border border-white/10 space-y-6">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-4">Enter Ride Code</Label>
                  <div className="flex gap-4">
                     <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="000000" className="h-20 w-full text-center font-black tracking-[0.5em] text-4xl rounded-3xl bg-white/5 border border-white/10 text-primary outline-none" maxLength={6} />
                     <Button onClick={verifyCustomer} disabled={isVerifying || !otpCode} className="h-20 w-20 rounded-3xl bg-primary text-black"><CheckCircle2 className="h-10 w-10" /></Button>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-4">Customers</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                     {activeTrip.passengerManifest?.map((m: any, i: number) => (
                       <div key={i} className={`p-6 rounded-3xl border flex items-center justify-between ${activeTrip.verifiedPassengers?.includes(m.uid) ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                          <div>
                             <p className="font-black italic text-foreground text-sm uppercase leading-none">{m.name}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <MapPin className="h-3 w-3 text-primary" />
                                <p className="text-[8px] font-bold text-muted-foreground uppercase italic">{m.pickup} → {m.destination}</p>
                             </div>
                          </div>
                          {activeTrip.verifiedPassengers?.includes(m.uid) && <CheckCircle2 className="text-primary h-6 w-6" />}
                       </div>
                     ))}
                  </div>
               </div>

               <Button onClick={finishRide} disabled={isUpdating} className="w-full h-20 bg-primary/10 border-2 border-primary/50 text-primary rounded-[3rem] font-black uppercase italic text-xl">Finish Ride</Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
             {activeTab === 'open-rides' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Available Rides</h3>
                  </div>
                  <div className="space-y-3">
                     {availableRides?.length === 0 ? (
                       <div className="p-20 text-center text-muted-foreground italic bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
                          <Loader2 className="animate-spin h-6 w-6 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Looking for rides...</p>
                       </div>
                     ) : availableRides?.map((job: any) => (
                       <Card key={job.id} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex justify-between items-center">
                         <div className="space-y-2">
                            <h4 className="text-2xl font-black italic uppercase leading-none">{job.routeName}</h4>
                            <div className="flex items-center gap-3">
                               <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase px-3 py-1 rounded-full">{job.riderCount} Seats</Badge>
                               <span className="text-[10px] font-bold text-muted-foreground uppercase">{job.scheduledDate} • {job.scheduledTime}</span>
                            </div>
                         </div>
                         <Button onClick={() => pickRide(job)} disabled={isUpdating} className="rounded-2xl h-14 px-6 bg-primary text-black font-black uppercase italic text-xs">
                            Get this ride
                         </Button>
                       </Card>
                     ))}
                  </div>
               </div>
             )}

             {activeTab === 'my-schedule' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> My Schedule</h3>
                  </div>
                  <div className="space-y-3">
                     {myPickedRides?.length === 0 ? (
                       <div className="p-20 text-center text-muted-foreground italic bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center gap-4 opacity-50">
                          <p className="text-[10px] font-black uppercase tracking-widest">No rides picked yet</p>
                       </div>
                     ) : myPickedRides?.map((job: any) => {
                       const readyToStart = isWithin3Hours(job.scheduledDate, job.scheduledTime);
                       return (
                         <Card key={job.id} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] space-y-6">
                            <div className="flex justify-between items-start">
                               <div className="space-y-2">
                                  <h4 className="text-2xl font-black italic uppercase leading-none">{job.routeName}</h4>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{job.scheduledDate} • {job.scheduledTime}</p>
                               </div>
                               <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">PICKED</Badge>
                            </div>
                            
                            {readyToStart ? (
                              <Button onClick={() => startRide(job)} disabled={profile?.status === 'offline' || isUpdating} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl">
                                 Start Ride
                              </Button>
                            ) : (
                              <div className="w-full h-16 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3">
                                 <Clock className="h-5 w-5 text-muted-foreground" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available 3 hours before start</span>
                              </div>
                            )}
                         </Card>
                       );
                     })}
                  </div>
               </div>
             )}

             {activeTab === 'money' && (
               <div className="space-y-8 animate-in fade-in pb-12">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">My Money</h3>
                     <Badge className="bg-primary text-black border-none font-black text-[10px] uppercase px-4 py-1.5 rounded-full tracking-widest">₹{(profile?.totalEarnings || 0).toFixed(0)}</Badge>
                  </div>
                  <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6 text-center">
                     <div className="flex flex-col items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Trophy className="h-10 w-10" /></div>
                       <h4 className="text-xl font-black italic uppercase">Great Job!</h4>
                     </div>
                     <Progress value={Math.min(100, ((profile?.totalEarnings || 0) / 2000) * 100)} className="h-3 bg-white/5 [&>div]:bg-primary" />
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest italic">You keep 90% of your ride fare.</p>
                  </Card>
               </div>
             )}

             {activeTab === 'me' && (
               <div className="space-y-12 text-center pb-24 pt-10 animate-in fade-in">
                  <div className="flex flex-col items-center gap-6">
                     <div className="h-40 w-40 rounded-full border-[8px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-2xl relative">
                       {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary/5 flex items-center justify-center text-primary/20"><LayoutGrid className="h-12 w-12" /></div>}
                     </div>
                     <div className="space-y-2">
                        <h2 className="text-5xl font-black italic uppercase text-foreground leading-none tracking-tighter">{profile?.fullName}</h2>
                        <div className="flex flex-col gap-2 items-center">
                           <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black tracking-widest px-6 py-1.5 rounded-full">{profile?.vehicleType}</Badge>
                           <p className="text-sm font-black uppercase text-muted-foreground italic tracking-tighter opacity-50">{profile?.vehicleNumber}</p>
                        </div>
                     </div>
                  </div>
                  <Button onClick={handleSignOut} className="w-full max-w-sm mx-auto h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border border-destructive/20 text-xl">
                     <LogOut className="mr-3 h-6 w-6" /> Logout
                  </Button>
               </div>
             )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('open-rides')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'open-rides' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <LayoutGrid className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Open</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('my-schedule')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'my-schedule' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <CalendarDays className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Schedule</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('money')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'money' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <Wallet className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Money</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('me')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'me' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <Settings className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Me</span>
        </Button>
      </nav>
    </div>
  );
}
