
"use client";

import { useState, useMemo, useEffect } from 'react';
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
  IndianRupee, 
  Wallet, 
  Fingerprint,
  Activity,
  CheckCircle2,
  Navigation,
  MessageSquareShare,
  Plus,
  Trash2,
  TrendingUp,
  ShieldCheck,
  MapPinned,
  ChevronRight,
  Radio,
  Users,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, increment, arrayUnion, getDocs, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'trips' | 'earnings' | 'suggest'>('trips');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerifiedStudent, setLastVerifiedStudent] = useState<any>(null);

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes')) : null, [db]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  const { data: onBoardPassengers } = useCollection(useMemo(() => {
    if (!db || !activeTrip?.verifiedPassengers?.length) return null;
    return query(collection(db, 'users'), where('uid', 'in', activeTrip.verifiedPassengers));
  }, [db, activeTrip?.verifiedPassengers]));

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const tripData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        setActiveTrip(tripData);
      }
      else setActiveTrip(null);
    });
    return unsubscribe;
  }, [db, user?.uid]);

  const currentRoute = useMemo(() => {
    if (!activeTrip || !allRoutes) return null;
    return allRoutes.find(r => r.routeName === activeTrip.routeName);
  }, [activeTrip, allRoutes]);

  const currentStopIndex = activeTrip?.currentStopIndex || 0;
  const currentStop = currentRoute?.stops?.[currentStopIndex];
  const nextStop = currentRoute?.stops?.[currentStopIndex + 1];

  const toggleDuty = async () => {
    if (!userRef) return;
    const newStatus = profile?.status === 'offline' ? 'available' : 'offline';
    await updateDoc(userRef, { status: newStatus });
    toast({ title: `Shift Status: ${newStatus.toUpperCase()}` });
  };

  const startTrip = async (route: any) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      let multiplier = 1.0;
      if (profile.vehicleType === 'Mini-Bus') multiplier = route.miniBusMultiplier || 1.2;
      else if (profile.vehicleType === 'Van') multiplier = route.vanMultiplier || 1.5;
      else multiplier = route.busMultiplier || 1.0;
      
      const farePerRider = (route.baseFare + (route.surgeFare || 0)) * multiplier;

      const tripData = {
        driverId: user.uid,
        driverName: profile.fullName,
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
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
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
      await updateDoc(doc(db, 'trips', activeTrip.id), {
        currentStopIndex: currentStopIndex + 1
      });
      toast({ title: "Arrived at Station", description: `Next Stop: ${nextStop?.name || 'End of Route'}` });
    } catch {
      toast({ variant: "destructive", title: "Update failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    setLastVerifiedStudent(null);
    try {
      const q = query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim()), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "The student code you entered is wrong." });
      } else {
        const riderDoc = snap.docs[0];
        const rider = riderDoc.data();
        const tripRef = doc(db, 'trips', activeTrip.id);
        
        await updateDoc(tripRef, {
          verifiedPassengers: arrayUnion(rider.uid),
          totalFareCollected: increment(activeTrip.farePerRider)
        });

        await updateDoc(doc(db, 'users', rider.uid), { activeOtp: null });
        setLastVerifiedStudent(rider);
        toast({ title: "Boarded!", description: `${rider.fullName} is now on the bus.` });
        setVerificationOtp("");
      }
    } catch {
      toast({ variant: "destructive", title: "Error verifying student" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const totalCollected = activeTrip.totalFareCollected || 0;
      const commission = totalCollected * 0.10;
      const driverPayout = totalCollected * 0.90;

      await updateDoc(doc(db, 'trips', activeTrip.id), {
        status: 'completed',
        endTime: new Date().toISOString(),
        commissionAmount: commission,
        payoutAmount: driverPayout
      });

      await updateDoc(userRef, {
        status: 'available',
        activeTripId: null,
        totalTrips: increment(1),
        totalEarnings: increment(driverPayout),
        weeklyEarnings: increment(driverPayout)
      });

      toast({ title: "Trip Finished", description: `You earned ₹${driverPayout.toFixed(0)}` });
    } catch {
      toast({ variant: "destructive", title: "Could not finish trip" });
    } finally {
      setIsUpdating(false);
    }
  };

  const studentsDroppingHere = useMemo(() => {
    if (!onBoardPassengers || !currentStop) return [];
    return onBoardPassengers.filter((p: any) => p.destinationStopName === currentStop.name);
  }, [onBoardPassengers, currentStop]);

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-body pb-32">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-primary shadow-xl">
             <span className="text-xl font-headline italic">{profile?.fullName?.[0]}</span>
          </div>
          <div>
            <h1 className="font-black italic uppercase text-sm leading-none tracking-tighter text-white font-headline">{profile?.fullName}</h1>
            <div className="flex items-center gap-2 mt-1.5">
               <Badge className="bg-white/5 text-slate-500 uppercase text-[8px] font-black border-none">{profile?.vehicleType}</Badge>
               <div className={`h-1.5 w-1.5 rounded-full ${profile?.status !== 'offline' ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
            </div>
          </div>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={toggleDuty} 
          className={`rounded-2xl h-14 w-14 transition-all ${profile?.status !== 'offline' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-slate-900 text-slate-500'}`}
        >
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto max-w-lg mx-auto w-full custom-scrollbar">
        {activeTab === 'trips' && (
          !activeTrip ? (
            <section className="space-y-6">
              <h2 className="text-xl font-black italic uppercase flex items-center gap-3 text-white font-headline">
                <Navigation className="h-5 w-5 text-primary" /> Start a Trip
              </h2>
              <div className="space-y-4">
                {availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900/50 border-white/5 text-white rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all duration-500">
                    <CardContent className="p-8 flex justify-between items-center gap-6">
                      <div className="space-y-2">
                        <h3 className="text-xl font-black uppercase italic text-white leading-none font-headline group-hover:text-primary">{route.routeName}</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 italic">
                           {route.stops?.[0]?.name} <ArrowRight className="h-3 w-3" /> {route.stops?.[route.stops.length-1]?.name}
                        </p>
                      </div>
                      <Button 
                        onClick={() => startTrip(route)} 
                        disabled={profile?.status !== 'available' || isUpdating} 
                        className="bg-primary hover:bg-primary/90 text-slate-950 rounded-xl font-black italic uppercase h-14"
                      >
                        {isUpdating ? <Loader2 className="animate-spin h-5 w-5" /> : "Drive"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              <Card className="bg-primary text-slate-950 border-none rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="space-y-8 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="h-2 w-2 bg-slate-950 rounded-full animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-950/60">Live Driving</span>
                    </div>
                    <h2 className="text-4xl font-black italic uppercase leading-[0.9] tracking-tighter font-headline">{activeTrip.routeName}</h2>
                    
                    <div className="bg-slate-950/10 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-950 rounded-xl flex items-center justify-center text-white">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-950/50">Current Station</p>
                          <p className="text-lg font-black italic uppercase leading-none">{currentStop?.name || 'In Transit'}</p>
                        </div>
                      </div>
                      {nextStop && (
                        <div className="flex items-center gap-4 opacity-70">
                          <div className="h-10 w-10 bg-slate-950/20 rounded-xl flex items-center justify-center text-slate-950">
                            <ArrowRight className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-950/50">Next Station</p>
                            <p className="text-base font-black italic uppercase leading-none">{nextStop.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {studentsDroppingHere.length > 0 && (
                    <div className="bg-accent p-6 rounded-2xl text-white animate-bounce shadow-xl">
                      <p className="font-black uppercase text-xs italic tracking-widest flex items-center gap-2">
                         <Users className="h-4 w-4" /> Stop & Drop
                      </p>
                      <p className="text-xl font-black italic uppercase mt-1">
                        {studentsDroppingHere.length} Student{studentsDroppingHere.length > 1 ? 's' : ''} drop here!
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-950 p-8 rounded-[2rem] space-y-6 text-white shadow-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Board Student</span>
                      <Badge className="bg-primary text-slate-950 font-black uppercase text-[10px] border-none">{activeTrip.verifiedPassengers?.length || 0} Boarded</Badge>
                    </div>
                    <div className="flex gap-4">
                      <Input 
                        value={verificationOtp} 
                        onChange={(e) => setVerificationOtp(e.target.value)}
                        placeholder="CODE" 
                        className="bg-white/5 border-none rounded-xl h-16 font-black text-center text-2xl tracking-[0.2em] text-white"
                        maxLength={6}
                      />
                      <Button 
                        onClick={verifyPassenger} 
                        disabled={isVerifying || !verificationOtp || verificationOtp.length < 6} 
                        className="bg-primary hover:bg-primary/90 text-slate-950 h-16 w-16 rounded-xl"
                      >
                        {isVerifying ? <Loader2 className="animate-spin h-5 w-5" /> : <Fingerprint className="h-7 w-7" />}
                      </Button>
                    </div>
                    {lastVerifiedStudent && (
                      <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[8px] font-black uppercase text-green-500">Dropping At</p>
                          <p className="text-sm font-black italic uppercase">{lastVerifiedStudent.destinationStopName}</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {nextStop ? (
                      <Button 
                        onClick={goToNextStop} 
                        disabled={isUpdating}
                        className="flex-1 bg-slate-950 text-white h-16 rounded-2xl font-black uppercase italic"
                      >
                        Next Station
                      </Button>
                    ) : (
                      <Button 
                        onClick={endTrip} 
                        disabled={isUpdating} 
                        className="flex-1 bg-slate-950 text-white h-16 rounded-2xl font-black uppercase italic shadow-xl"
                      >
                        Finish Trip
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )
        )}

        {activeTab === 'earnings' && (
          <section className="space-y-8">
            <h2 className="text-xl font-black italic uppercase text-white flex items-center gap-3 font-headline">
               <TrendingUp className="h-5 w-5 text-primary" /> My Money
            </h2>
            <Card className="bg-accent text-white border-none rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Total Cash Earned</p>
                <h3 className="text-6xl font-black italic font-headline mt-4 tracking-tighter">₹{(profile?.totalEarnings || 0).toFixed(0)}</h3>
                <div className="flex items-center gap-2 mt-10 py-2.5 px-5 bg-white/10 rounded-full w-fit">
                   <ShieldCheck className="h-3 w-3" />
                   <p className="text-[9px] font-black uppercase tracking-widest italic">Confirmed Payouts</p>
                </div>
               </div>
               <Wallet className="absolute -right-8 -bottom-8 h-56 w-56 opacity-10" />
            </Card>
            
            <div className="grid grid-cols-2 gap-6">
               <Card className="bg-slate-900/50 border-white/5 p-8 rounded-[2.5rem]">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Trips Done</p>
                  <h4 className="text-4xl font-black italic text-white font-headline">{profile?.totalTrips || 0}</h4>
               </Card>
               <Card className="bg-slate-900/50 border-white/5 p-8 rounded-[2.5rem]">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Home Hub</p>
                  <h4 className="text-4xl font-black italic text-white font-headline">{profile?.city}</h4>
               </Card>
            </div>
          </section>
        )}

        {activeTab === 'suggest' && (
          <section className="space-y-8">
            <h2 className="text-xl font-black italic uppercase flex items-center gap-3 text-white font-headline">
              <MessageSquareShare className="h-5 w-5 text-primary" /> Suggest a Route
            </h2>
            <Card className="bg-slate-900/50 border-white/5 rounded-[3rem] p-10 space-y-8 border-l-8 border-primary">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Route Name</Label>
                  <Input 
                    placeholder="e.g. Morning Express" 
                    className="h-16 bg-slate-950 border-white/10 rounded-2xl font-black text-white italic" 
                  />
                  <p className="text-[10px] font-bold text-slate-600 italic">Tell us about a route students really need.</p>
               </div>
               <Button 
                onClick={() => toast({ title: "Suggestion Sent", description: "Admin will review your idea." })}
                className="w-full bg-primary text-slate-950 h-16 rounded-2xl font-black uppercase italic"
               >
                 Send Idea
               </Button>
            </Card>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center rounded-t-[3.5rem] z-50">
        {[
          { id: 'trips', icon: Bus, label: 'Trips' },
          { id: 'suggest', icon: MessageSquareShare, label: 'Suggest' },
          { id: 'earnings', icon: IndianRupee, label: 'Money' },
        ].map((item) => (
          <Button 
            key={item.id}
            variant="ghost" 
            onClick={() => setActiveTab(item.id as any)} 
            className={`flex-col h-auto py-3 gap-2 rounded-2xl ${activeTab === item.id ? 'text-primary' : 'text-slate-500'}`}
          >
            <item.icon className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </Button>
        ))}
        <Button variant="ghost" onClick={handleSignOut} className="flex-col h-auto py-3 gap-2 rounded-2xl text-slate-500 hover:text-red-400">
          <LogOut className="h-7 w-7" />
          <span className="text-[8px] font-black uppercase tracking-widest">Exit</span>
        </Button>
      </nav>
    </div>
  );
}
