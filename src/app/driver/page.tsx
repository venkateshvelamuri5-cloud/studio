
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Navigation
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

  const [activeTab, setActiveTab] = useState<'missions' | 'earnings'>('missions');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes')) : null, [db]));
  const regionalRoutes = useMemo(() => allRoutes?.filter(r => r.city === profile?.city && r.status === 'active') || [], [allRoutes, profile?.city]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      else setActiveTrip(null);
    });
    return unsubscribe;
  }, [db, user?.uid]);

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
        verifiedPassengers: [],
        startTime: new Date().toISOString()
      };
      
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Mission Active", description: `Fare synchronized at ₹${farePerRider.toFixed(0)} per scholar.` });
    } catch {
      toast({ variant: "destructive", title: "Mission Protocol Failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    try {
      const q = query(collection(db, 'users'), where('activeOtp', '==', verificationOtp.trim()), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid OTP", description: "Biometric match not found in scholar network." });
      } else {
        const riderDoc = snap.docs[0];
        const rider = riderDoc.data();
        const tripRef = doc(db, 'trips', activeTrip.id);
        
        // Update Trip
        await updateDoc(tripRef, {
          verifiedPassengers: arrayUnion(rider.uid),
          totalFareCollected: increment(activeTrip.farePerRider)
        });

        // Clear Rider OTP
        await updateDoc(doc(db, 'users', rider.uid), { activeOtp: null });
        
        toast({ title: "Scholar Verified", description: `${rider.fullName} cleared for boarding.` });
        setVerificationOtp("");
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Verification Error" });
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

      toast({ title: "Shift Finalized", description: `Net Earnings: ₹${driverPayout.toFixed(2)} credited.` });
    } catch {
      toast({ variant: "destructive", title: "Finalization Protocol Failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-24">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">
            {profile?.fullName?.[0]}
          </div>
          <div>
            <h1 className="font-black italic uppercase text-sm leading-none">{profile?.fullName}</h1>
            <Badge className="bg-white/5 text-slate-500 uppercase text-[8px] mt-1 tracking-widest">{profile?.vehicleType}</Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={toggleDuty} 
            className={`rounded-2xl h-12 w-12 ${profile?.status !== 'offline' ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-500'}`}
          >
            <Power className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {!activeTrip ? (
          <section className="space-y-4">
            <h2 className="text-xl font-black italic uppercase flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" /> Regional Dispatch
            </h2>
            {regionalRoutes.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 rounded-[2.5rem] border border-dashed border-white/10">
                <p className="text-slate-500 font-bold italic">No active missions in your regional hub.</p>
              </div>
            ) : (
              regionalRoutes.map((route: any) => (
                <Card key={route.id} className="bg-slate-900 border-white/5 text-white rounded-[2rem] overflow-hidden shadow-2xl">
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black uppercase italic text-primary leading-none">{route.routeName}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-white/5 text-slate-400 text-[8px] font-black uppercase tracking-tighter">Base: ₹{route.baseFare}</Badge>
                        {route.surgeFare > 0 && <Badge className="bg-accent/20 text-accent text-[8px] font-black uppercase">+₹{route.surgeFare} Surge</Badge>}
                      </div>
                    </div>
                    <Button 
                      onClick={() => startTrip(route)} 
                      disabled={profile?.status !== 'available' || isUpdating} 
                      className="bg-primary hover:bg-primary/90 rounded-xl font-black italic uppercase h-12 px-6 shadow-lg shadow-primary/20"
                    >
                      {isUpdating ? <Loader2 className="animate-spin" /> : "Start Mission"}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-primary text-white border-none rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(59,130,246,0.3)]">
              <div className="space-y-8">
                <div>
                  <Badge className="bg-white/20 text-white font-black uppercase text-[9px] mb-2 tracking-widest">Active Mission</Badge>
                  <h2 className="text-4xl font-black italic uppercase leading-tight">{activeTrip.routeName}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-4 w-4 text-white/60 animate-pulse" />
                    <p className="text-sm font-bold opacity-80 italic">Verified Boarding: ₹{activeTrip.farePerRider.toFixed(0)}/scholar</p>
                  </div>
                </div>

                <div className="bg-white/10 p-8 rounded-[2.5rem] space-y-6 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Biometric Verification</span>
                    <span className="text-3xl font-black italic">{activeTrip.verifiedPassengers?.length || 0} Boarded</span>
                  </div>
                  <div className="flex gap-3">
                    <Input 
                      value={verificationOtp} 
                      onChange={(e) => setVerificationOtp(e.target.value)}
                      placeholder="000000" 
                      className="bg-white/10 border-none rounded-2xl h-16 font-black text-center text-2xl tracking-[0.5em] placeholder:text-white/20"
                      maxLength={6}
                    />
                    <Button 
                      onClick={verifyPassenger} 
                      disabled={isVerifying || !verificationOtp || verificationOtp.length < 6} 
                      className="bg-accent hover:bg-accent/90 h-16 w-16 rounded-2xl p-0 flex items-center justify-center shadow-xl shadow-accent/20"
                    >
                      {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <Fingerprint className="h-8 w-8" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={endTrip} 
                  disabled={isUpdating} 
                  className="w-full bg-white text-primary h-16 rounded-2xl font-black uppercase italic text-lg shadow-2xl active:scale-95 transition-all"
                >
                  {isUpdating ? <Loader2 className="animate-spin" /> : "Finalize Mission"}
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
               <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem] shadow-xl">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Net Share (90%)</p>
                 <h3 className="text-2xl font-black italic text-accent leading-none">₹{(activeTrip.totalFareCollected * 0.9).toFixed(2)}</h3>
               </Card>
               <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem] shadow-xl">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Hub Fee (10%)</p>
                 <h3 className="text-2xl font-black italic text-primary leading-none">₹{(activeTrip.totalFareCollected * 0.1).toFixed(2)}</h3>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <section className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-black italic uppercase">Financial Ledger</h2>
            <Card className="bg-accent text-white border-none rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Regional Payout</p>
                <h3 className="text-5xl font-black italic font-headline mt-2 leading-none">₹{(profile?.totalEarnings || 0).toFixed(2)}</h3>
                <div className="flex items-center gap-2 mt-8">
                  <CheckCircle2 className="h-4 w-4 text-white/80" />
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">90% Mission Share Credited</p>
                </div>
               </div>
               <Wallet className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
            </Card>
            
            <Card className="bg-slate-900 border-white/5 p-8 rounded-[2.5rem] shadow-xl">
               <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Completed Missions</p>
                    <h4 className="text-3xl font-black italic text-white leading-none">{profile?.totalTrips || 0}</h4>
                  </div>
                  <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center">
                    <IndianRupee className="h-8 w-8 text-primary" />
                  </div>
               </div>
            </Card>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/80 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center rounded-t-[3rem] z-50">
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('missions')} 
          className={`flex-col h-auto py-2 gap-1 rounded-2xl ${activeTab === 'missions' ? 'text-primary' : 'text-slate-500'}`}
        >
          <Bus className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Missions</span>
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('earnings')} 
          className={`flex-col h-auto py-2 gap-1 rounded-2xl ${activeTab === 'earnings' ? 'text-primary' : 'text-slate-500'}`}
        >
          <IndianRupee className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Earnings</span>
        </Button>
        <Button variant="ghost" onClick={handleSignOut} className="flex-col h-auto py-2 gap-1 rounded-2xl text-slate-500">
          <LogOut className="h-6 w-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Log Off</span>
        </Button>
      </nav>
    </div>
  );
}
