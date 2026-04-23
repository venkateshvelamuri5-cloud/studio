
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
  User as UserIcon,
  Trophy,
  ShieldAlert,
  Clock,
  MapPin,
  CalendarDays,
  MapIcon,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, onSnapshot, query, where, arrayUnion, getDocs, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { isBefore, addHours, parse, subHours } from 'date-fns';

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

  const [activeTab, setActiveTab] = useState<'open-routes' | 'my-work' | 'money' | 'profile'>('open-routes');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: availableRoutes } = useCollection(useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'routes'), where('status', '==', 'active'));
  }, [db]));

  // Show trips assigned to this specific driver
  const { data: assignedTrips } = useCollection(useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
  }, [db, user?.uid]));

  useEffect(() => {
    if (!authLoading && !user) router.push('/driver/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'on-trip'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      else setActiveTrip(null);
    });
  }, [db, user?.uid]);

  const joinRoute = async (routeName: string) => {
    if (!userRef) return;
    await updateDoc(userRef, { preferredRoute: routeName });
    toast({ title: "Route selected!", description: "Admin will assign trips based on your choice." });
    setActiveTab('my-work');
  };

  const startRide = async (trip: any) => {
    if (!db || !user || !profile || !userRef) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'trips', trip.id), { 
        status: 'on-trip', 
        startTime: new Date().toISOString()
      });
      await updateDoc(userRef, { status: 'on-trip', activeTripId: trip.id });
      toast({ title: "Trip Started!" });
    } finally { setIsUpdating(false); }
  };

  const verifyCustomer = async () => {
    if (!db || !activeTrip || !otpCode) return;
    setIsVerifying(true);
    const q = query(collection(db, 'users'), where('activeOtp', '==', otpCode.trim()));
    const snap = await getDocs(q);
    if (snap.empty) toast({ variant: "destructive", title: "Wrong Code" });
    else {
      const passengerId = snap.docs[0].id;
      await updateDoc(doc(db, 'trips', activeTrip.id), { verifiedPassengers: arrayUnion(passengerId) });
      toast({ title: "Verified!" });
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
      await updateDoc(doc(db, 'trips', activeTrip.id), { status: 'completed', endTime: new Date().toISOString() });
      await updateDoc(userRef, { status: 'available', activeTripId: null, totalEarnings: increment(share) });
      toast({ title: "Trip Finished!" });
    } finally { setIsUpdating(false); }
  };

  const isReadyToStart = (dateStr: string, timeStr: string) => {
    try {
      const tripTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd hh:mm a', new Date());
      const now = new Date();
      // Unlock 3 hours before
      return isBefore(subHours(tripTime, 3), now) && isBefore(now, addHours(tripTime, 2));
    } catch (e) { return false; }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/driver/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black"><Logo className="h-6 w-6" /></div>
          <div>
            <h1 className="text-lg font-black italic uppercase text-primary">DRIVER</h1>
            <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase mt-1 px-3 py-1 rounded-full">{profile?.status?.toUpperCase() || 'OFFLINE'}</Badge>
          </div>
        </div>
        <Button onClick={() => updateDoc(userRef!, { status: profile?.status === 'offline' ? 'available' : 'offline' })} className={`rounded-2xl h-11 w-11 p-0 ${profile?.status === 'offline' ? 'bg-white/5' : 'bg-primary text-black'}`}>
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full">
        {activeTrip ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-8">
            <Card className="rounded-[3.5rem] p-8 space-y-8 border-primary/30 relative shadow-2xl bg-card/60 backdrop-blur-md">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <h2 className="text-4xl font-black italic uppercase leading-none text-primary">{activeTrip.routeName}</h2>
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">Trip in Progress</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-5 py-2 rounded-full">LIVE</Badge>
               </div>
               <div className="bg-black/60 p-8 rounded-[3rem] border border-white/10 space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-4">Check-in Code</Label>
                  <div className="flex gap-4">
                     <input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" className="h-16 w-full text-center font-black tracking-[0.5em] text-2xl rounded-2xl bg-white/5 border border-white/10 text-primary" maxLength={6} />
                     <Button onClick={verifyCustomer} disabled={isVerifying || !otpCode} className="h-16 w-16 rounded-2xl bg-primary text-black"><CheckCircle2 className="h-8 w-8" /></Button>
                  </div>
               </div>
               <Button onClick={finishRide} disabled={isUpdating} className="w-full h-20 bg-primary/10 border-2 border-primary/50 text-primary rounded-[3rem] font-black uppercase italic text-xl">Finish Trip</Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
             {activeTab === 'open-routes' && (
               <div className="space-y-6">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><MapIcon className="h-5 w-5 text-primary" /> Preferred Routes</h3>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-2 italic">Select the route you want to work on.</p>
                  <div className="space-y-3">
                     {availableRoutes?.map((route: any) => (
                       <Card key={route.id} className={`p-8 bg-white/5 border rounded-[2.5rem] flex justify-between items-center cursor-pointer transition-all ${profile?.preferredRoute === route.routeName ? 'border-primary/60 bg-primary/5' : 'border-white/5 hover:border-primary/20'}`} onClick={() => joinRoute(route.routeName)}>
                         <div className="space-y-2">
                            <h4 className="text-2xl font-black italic uppercase leading-none">{route.routeName}</h4>
                            <div className="flex items-center gap-3">
                               <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase px-3 py-1 rounded-full">₹{route.baseFare}</Badge>
                               <span className="text-[10px] font-bold text-muted-foreground uppercase">{route.schedule}</span>
                            </div>
                         </div>
                         {profile?.preferredRoute === route.routeName ? <CheckCircle2 className="h-8 w-8 text-primary" /> : <ChevronRight className="h-8 w-8 text-white/10" />}
                       </Card>
                     ))}
                  </div>
               </div>
             )}

             {activeTab === 'my-work' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-end px-2">
                    <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Assigned Work</h3>
                    <Badge variant="outline" className="text-[8px] font-black uppercase italic text-muted-foreground border-white/10">Admin Allocated</Badge>
                  </div>
                  <div className="space-y-3">
                     {assignedTrips?.map((trip: any) => {
                       const ready = isReadyToStart(trip.scheduledDate, trip.scheduledTime);
                       return (
                         <Card key={trip.id} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                            <div className="flex justify-between items-start">
                               <div className="space-y-2">
                                  <h4 className="text-2xl font-black italic uppercase leading-none">{trip.routeName}</h4>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{trip.scheduledDate} • {trip.scheduledTime}</p>
                                  <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black px-2 py-1 rounded-full uppercase mt-2">{trip.riderCount} Customers Booked</Badge>
                               </div>
                               <Badge className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${ready ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-muted-foreground'}`}>{ready ? 'READY' : 'WAITING'}</Badge>
                            </div>
                            {ready ? (
                              <Button onClick={() => startRide(trip)} disabled={profile?.status === 'offline' || isUpdating} className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl">Start Trip</Button>
                            ) : (
                              <div className="w-full h-16 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3">
                                 <Clock className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] font-black uppercase text-muted-foreground">Unlocks 3 hrs before</span>
                              </div>
                            )}
                         </Card>
                       );
                     })}
                     {(!assignedTrips || assignedTrips.length === 0) && (
                       <div className="text-center py-20 space-y-4 opacity-40">
                         <ShieldAlert className="h-12 w-12 mx-auto" />
                         <p className="text-[10px] font-bold text-muted-foreground uppercase italic px-10 leading-relaxed">Admin has not assigned any trips to you yet. Ensure your preferred route is set.</p>
                       </div>
                     )}
                  </div>
               </div>
             )}

             {activeTab === 'money' && (
               <div className="space-y-8 animate-in fade-in pb-12">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-3xl font-black italic uppercase text-foreground">My Money</h3>
                     <Badge className="bg-primary text-black font-black text-[10px] px-4 py-1.5 rounded-full">₹{(profile?.totalEarnings || 0).toFixed(0)}</Badge>
                  </div>
                  <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-6 text-center">
                     <div className="p-3 bg-primary/10 rounded-2xl text-primary w-fit mx-auto"><Trophy className="h-10 w-10" /></div>
                     <Progress value={Math.min(100, ((profile?.totalEarnings || 0) / 2000) * 100)} className="h-3 bg-white/5 [&>div]:bg-primary" />
                     <p className="text-[10px] font-black uppercase text-muted-foreground italic">You keep 90% of your earnings.</p>
                  </Card>
               </div>
             )}

             {activeTab === 'profile' && (
               <div className="space-y-12 text-center pb-24 pt-10">
                  <div className="flex flex-col items-center gap-6">
                     <div className="h-40 w-40 rounded-full border-[8px] border-white/5 bg-primary/5 flex items-center justify-center overflow-hidden shadow-2xl relative">
                       {profile?.photoUrl ? <img src={profile.photoUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary/5 flex items-center justify-center text-primary/20"><UserIcon className="h-12 w-12" /></div>}
                     </div>
                     <div className="space-y-2">
                        <h2 className="text-5xl font-black italic uppercase text-foreground leading-none">{profile?.fullName}</h2>
                        <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black px-6 py-1.5 rounded-full">{profile?.vehicleNumber}</Badge>
                     </div>
                  </div>
                  <Button onClick={handleSignOut} className="w-full max-w-sm mx-auto h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border border-destructive/20 text-xl"><LogOut className="mr-3 h-6 w-6" /> Logout</Button>
               </div>
             )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom">
        <Button variant="ghost" onClick={() => setActiveTab('open-routes')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'open-routes' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <MapIcon className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Preference</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('my-work')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'my-work' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <Briefcase className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Schedule</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('money')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'money' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <Wallet className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Money</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-3 px-6 gap-1 rounded-2xl ${activeTab === 'profile' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
          <UserIcon className="h-6 w-6" /><span className="text-[8px] font-black uppercase tracking-widest">Profile</span>
        </Button>
      </nav>
    </div>
  );
}
