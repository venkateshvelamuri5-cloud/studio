
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertCircle
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

  const [activeTab, setActiveTab] = useState<'trips' | 'earnings'>('trips');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerifiedStudent, setLastVerifiedStudent] = useState<any>(null);
  
  // To track new bookings
  const prevPassengerCount = useRef(0);

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes')) : null, [db]));
  const availableRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const tripData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        
        // Notify if someone new booked
        const currentCount = tripData.passengers?.length || 0;
        if (currentCount > prevPassengerCount.current) {
          toast({
            title: "New Booking!",
            description: "A student has just booked a seat on your bus.",
          });
        }
        prevPassengerCount.current = currentCount;
        
        setActiveTrip(tripData);
      }
      else {
        setActiveTrip(null);
        prevPassengerCount.current = 0;
      }
    });
    return unsubscribe;
  }, [db, user?.uid, toast]);

  const { data: onBoardPassengers } = useCollection(useMemo(() => {
    if (!db || !activeTrip?.verifiedPassengers?.length) return null;
    return query(collection(db, 'users'), where('uid', 'in', activeTrip.verifiedPassengers));
  }, [db, activeTrip?.verifiedPassengers]));

  const currentRoute = useMemo(() => {
    if (!activeTrip || !allRoutes) return null;
    return allRoutes.find((r: any) => r.routeName === activeTrip.routeName);
  }, [activeTrip, allRoutes]);

  const currentStopIndex = activeTrip?.currentStopIndex || 0;
  const currentStop = currentRoute?.stops?.[currentStopIndex];
  const nextStop = currentRoute?.stops?.[currentStopIndex + 1];

  const toggleDuty = async () => {
    if (!userRef) return;
    const newStatus = profile?.status === 'offline' ? 'available' : 'offline';
    await updateDoc(userRef, { status: newStatus });
    toast({ title: `You are now ${newStatus.toUpperCase()}` });
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
      toast({ title: "Trip Started", description: `You are now driving: ${route.routeName}` });
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
      toast({ title: "Arrived", description: `You are now at: ${nextStop?.name}` });
    } catch {
      toast({ variant: "destructive", title: "Error moving to next stop" });
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
        toast({ variant: "destructive", title: "Wrong Code", description: "This student code is not valid." });
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
        toast({ title: "Success!", description: `${rider.fullName} has boarded.` });
        setVerificationOtp("");
      }
    } catch {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsVerifying(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const totalCollected = activeTrip.totalFareCollected || 0;
      const driverPayout = totalCollected * 0.90;

      await updateDoc(doc(db, 'trips', activeTrip.id), {
        status: 'completed',
        endTime: new Date().toISOString(),
        commissionAmount: totalCollected * 0.10,
        payoutAmount: driverPayout
      });

      await updateDoc(userRef, {
        status: 'available',
        activeTripId: null,
        totalTrips: increment(1),
        totalEarnings: increment(driverPayout)
      });

      toast({ title: "Trip Finished", description: `You earned ₹${driverPayout.toFixed(0)} from this trip!` });
    } catch {
      toast({ variant: "destructive", title: "Could not end trip" });
    } finally {
      setIsUpdating(false);
    }
  };

  const studentsDroppingHere = useMemo(() => {
    if (!onBoardPassengers || !currentStop) return [];
    return onBoardPassengers.filter((p: any) => p.destinationStopName === currentStop.name);
  }, [onBoardPassengers, currentStop]);

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-24">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {profile?.fullName?.[0]}
          </div>
          <div>
            <h1 className="font-bold text-sm">{profile?.fullName}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
              {profile?.status === 'offline' ? 'Offline' : 'Ready for Work'}
            </p>
          </div>
        </div>
        <Button 
          variant={profile?.status === 'offline' ? 'outline' : 'default'}
          size="sm"
          onClick={toggleDuty}
          className="rounded-full"
        >
          <Power className="h-4 w-4 mr-2" />
          {profile?.status === 'offline' ? 'Go Online' : 'Go Offline'}
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full">
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'trips' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('trips')}
            className="flex-1 rounded-xl"
          >
            My Trip
          </Button>
          <Button 
            variant={activeTab === 'earnings' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('earnings')}
            className="flex-1 rounded-xl"
          >
            My Money
          </Button>
        </div>

        {activeTab === 'trips' && (
          !activeTrip ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" /> Available Trips
              </h2>
              {profile?.status === 'offline' ? (
                <div className="p-10 text-center space-y-4 border-2 border-dashed border-white/5 rounded-3xl">
                  <AlertCircle className="h-10 w-10 text-slate-700 mx-auto" />
                  <p className="text-slate-500 font-medium">Please go online to start a trip.</p>
                </div>
              ) : (
                availableRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900 border-white/5 hover:border-primary/50 transition-colors">
                    <CardContent className="p-6 flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{route.routeName}</h3>
                        <p className="text-xs text-slate-500">
                          {route.stops?.[0]?.name} to {route.stops?.[route.stops.length-1]?.name}
                        </p>
                      </div>
                      <Button onClick={() => startTrip(route)} disabled={isUpdating} className="rounded-xl">
                        Start Trip
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="bg-primary text-slate-950 border-none rounded-3xl overflow-hidden shadow-xl">
                <CardContent className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Driving Route</p>
                      <h2 className="text-3xl font-black italic uppercase leading-none">{activeTrip.routeName}</h2>
                    </div>
                    <Badge className="bg-slate-950 text-white border-none font-bold">LIVE</Badge>
                  </div>

                  <div className="bg-slate-950/10 p-4 rounded-2xl flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-950 rounded-xl flex items-center justify-center text-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-50">Current Stop</p>
                      <p className="font-bold text-lg">{currentStop?.name || 'In Transit'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase opacity-60">Booked</p>
                      <p className="text-2xl font-black">{activeTrip.passengers?.length || 0}</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase opacity-60">On Bus</p>
                      <p className="text-2xl font-black text-slate-950">{activeTrip.verifiedPassengers?.length || 0}</p>
                    </div>
                  </div>

                  {studentsDroppingHere.length > 0 && (
                    <div className="bg-accent p-4 rounded-2xl text-white animate-pulse">
                      <p className="font-bold text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" /> Stop & Drop!
                      </p>
                      <p className="text-lg font-black uppercase">{studentsDroppingHere.length} Student(s) drop here.</p>
                    </div>
                  )}

                  <div className="bg-slate-950 p-6 rounded-2xl space-y-4 text-white">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Boarding Terminal</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={verificationOtp} 
                        onChange={(e) => setVerificationOtp(e.target.value)}
                        placeholder="ENTER STUDENT CODE" 
                        className="bg-white/5 border-none h-12 text-center font-bold tracking-[0.2em]"
                        maxLength={6}
                      />
                      <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="h-12 w-12 rounded-xl">
                        {isVerifying ? <Loader2 className="animate-spin h-5 w-5" /> : <Fingerprint className="h-6 w-6" />}
                      </Button>
                    </div>
                    {lastVerifiedStudent && (
                      <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase">
                        <CheckCircle2 className="h-3 w-3" /> {lastVerifiedStudent.fullName} is now on board!
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    {nextStop ? (
                      <Button onClick={goToNextStop} disabled={isUpdating} className="flex-1 bg-slate-950 text-white h-14 rounded-2xl font-bold uppercase">
                        Next Stop
                      </Button>
                    ) : (
                      <Button onClick={endTrip} disabled={isUpdating} className="flex-1 bg-slate-950 text-white h-14 rounded-2xl font-bold uppercase">
                        End Trip
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {activeTrip.passengers?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Scheduled Bookings</h3>
                  <div className="space-y-2">
                    {activeTrip.passengers.map((pId: string, i: number) => (
                      <div key={i} className="p-3 bg-slate-900 border border-white/5 rounded-xl flex justify-between items-center">
                        <p className="text-xs font-medium">Student #{i+1}</p>
                        <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-slate-500">Waiting</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <Card className="bg-accent text-white border-none rounded-3xl p-10 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Total Money Earned</p>
                <h3 className="text-5xl font-black italic mt-4">₹{(profile?.totalEarnings || 0).toFixed(0)}</h3>
                <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/10 rounded-full w-fit">
                   <TrendingUp className="h-3 w-3" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Verified Earnings</p>
                </div>
              </div>
              <Wallet className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
            </Card>

            <div className="grid grid-cols-2 gap-4">
               <Card className="bg-slate-900 border-white/5 p-6 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Trips Completed</p>
                  <p className="text-3xl font-black text-white">{profile?.totalTrips || 0}</p>
               </Card>
               <Card className="bg-slate-900 border-white/5 p-6 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Your Hub</p>
                  <p className="text-3xl font-black text-white">{profile?.city}</p>
               </Card>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex justify-between items-center rounded-t-3xl z-50">
        <Button variant="ghost" className="flex-col h-auto gap-1" onClick={() => router.push('/')}>
           <LogOut className="h-6 w-6 text-slate-500" />
           <span className="text-[8px] font-bold uppercase">Exit</span>
        </Button>
        <div className="flex items-center gap-10">
          <Button variant="ghost" onClick={() => setActiveTab('trips')} className={activeTab === 'trips' ? 'text-primary' : 'text-slate-500'}>
            <Bus className="h-8 w-8" />
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('earnings')} className={activeTab === 'earnings' ? 'text-primary' : 'text-slate-500'}>
            <IndianRupee className="h-8 w-8" />
          </Button>
        </div>
        <div className="w-10 h-10" />
      </nav>
    </div>
  );
}
