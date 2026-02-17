
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bus, 
  Clock, 
  Navigation,
  Phone,
  Power,
  Loader2,
  ShieldAlert,
  LogOut,
  MessageSquarePlus,
  IndianRupee,
  Wallet,
  AlertTriangle,
  Fingerprint,
  CheckCircle2
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, onSnapshot, query, where, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

import {
  Dialog as ShadDialog,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogTrigger as ShadDialogTrigger,
  DialogFooter as ShadDialogFooter
} from "@/components/ui/dialog";

const containerStyle = { width: '100%', height: '100%' };

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const [activeTab, setActiveTab] = useState<'missions' | 'earnings' | 'support'>('missions');
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
      let fareMultiplier = 1.0;
      if (profile.vehicleType === 'Mini-Bus') fareMultiplier = route.miniBusMultiplier || 1.2;
      else if (profile.vehicleType === 'Van') fareMultiplier = route.vanMultiplier || 1.5;
      
      const farePerRider = (route.baseFare || 50 + (route.surgeFare || 0)) * fareMultiplier;

      const tripData = {
        driverId: user.uid,
        driverName: profile.fullName,
        routeName: route.routeName,
        farePerRider,
        surgeFare: route.surgeFare || 0,
        status: 'active',
        riderCount: 0,
        passengers: [],
        verifiedPassengers: [],
        totalFareCollected: 0,
        startTime: new Date().toISOString()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { status: 'on-trip', activeTripId: tripRef.id });
      toast({ title: "Mission Active", description: `Fare: ₹${farePerRider} per scholar` });
    } catch {
      toast({ variant: "destructive", title: "Mission Failed to Start" });
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyPassenger = async () => {
    if (!db || !activeTrip || !verificationOtp) return;
    setIsVerifying(true);
    try {
      const q = query(collection(db, 'users'), where('activeOtp', '==', verificationOtp), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Protocol", description: "OTP match not found." });
      } else {
        const rider = snap.docs[0].data();
        const tripRef = doc(db, 'trips', activeTrip.id);
        
        await updateDoc(tripRef, {
          verifiedPassengers: arrayUnion(rider.uid),
          totalFareCollected: increment(activeTrip.farePerRider)
        });

        await updateDoc(doc(db, 'users', rider.uid), { activeOtp: null });
        
        toast({ title: "Scholar Verified", description: `${rider.fullName} boarded successfully.` });
        setVerificationOtp("");
      }
    } catch {
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

      toast({ title: "Trip Completed", description: `Earned ₹${driverPayout.toFixed(2)} (90% share)` });
    } catch {
      toast({ variant: "destructive", title: "Finalization Failed" });
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
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center font-black">{profile?.fullName?.[0]}</div>
          <div>
            <h1 className="font-black italic uppercase text-sm">{profile?.fullName}</h1>
            <Badge className="bg-white/5 text-slate-500 uppercase text-[8px]">{profile?.vehicleType}</Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button size="icon" variant="ghost" onClick={toggleDuty} className={`rounded-2xl h-12 w-12 ${profile?.status !== 'offline' ? 'bg-green-500/10 text-green-500' : 'bg-slate-800'}`}><Power className="h-6 w-6" /></Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {!activeTrip ? (
          <section className="space-y-4">
            <h2 className="text-xl font-black italic uppercase">Dispatch Board</h2>
            {regionalRoutes.map((route: any) => (
              <Card key={route.id} className="bg-slate-900 border-white/5 text-white">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black uppercase italic text-primary">{route.routeName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Base Fare: ₹{route.baseFare}</p>
                  </div>
                  <Button onClick={() => startTrip(route)} disabled={profile?.status !== 'available'} className="bg-primary rounded-xl font-black italic uppercase h-12">Start Mission</Button>
                </CardContent>
              </Card>
            ))}
          </section>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="bg-primary text-white border-none rounded-[2.5rem] p-8 shadow-2xl">
              <div className="space-y-6">
                <div>
                  <Badge className="bg-white/20 text-white font-black uppercase text-[9px] mb-2">Active Mission</Badge>
                  <h2 className="text-4xl font-black italic uppercase">{activeTrip.routeName}</h2>
                  <p className="text-sm font-bold opacity-80 mt-2 italic">Boarding Rate: ₹{activeTrip.farePerRider}/scholar</p>
                </div>

                <div className="bg-white/10 p-6 rounded-[2rem] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase">Verified Boarding</span>
                    <span className="text-2xl font-black italic">{activeTrip.verifiedPassengers?.length || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={verificationOtp} 
                      onChange={(e) => setVerificationOtp(e.target.value)}
                      placeholder="Enter Scholar OTP" 
                      className="bg-white/10 border-none rounded-xl h-14 font-black text-center text-xl tracking-widest placeholder:text-white/30"
                      maxLength={6}
                    />
                    <Button onClick={verifyPassenger} disabled={isVerifying || !verificationOtp} className="bg-accent h-14 rounded-xl px-6 font-black italic uppercase">
                      {isVerifying ? <Loader2 className="animate-spin" /> : <Fingerprint className="h-6 w-6" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={endTrip} disabled={isUpdating} className="flex-1 bg-white text-primary h-16 rounded-2xl font-black uppercase italic text-lg shadow-xl">Complete Shift</Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
               <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem]">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Current Pot (90%)</p>
                 <h3 className="text-2xl font-black italic text-accent">₹{(activeTrip.totalFareCollected * 0.9).toFixed(2)}</h3>
               </Card>
               <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem]">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Platform Share (10%)</p>
                 <h3 className="text-2xl font-black italic text-primary">₹{(activeTrip.totalFareCollected * 0.1).toFixed(2)}</h3>
               </Card>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900 border-t border-white/5 flex justify-around items-center rounded-t-[2.5rem] z-50">
        <Button variant="ghost" onClick={() => setActiveTab('missions')} className={`flex-col h-auto py-1 ${activeTab === 'missions' ? 'text-primary' : 'text-slate-500'}`}><Bus className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Missions</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('earnings')} className={`flex-col h-auto py-1 ${activeTab === 'earnings' ? 'text-primary' : 'text-slate-500'}`}><IndianRupee className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Earnings</span></Button>
        <Button variant="ghost" onClick={handleSignOut} className="flex-col h-auto py-1 text-slate-500"><LogOut className="h-6 w-6" /><span className="text-[8px] font-black uppercase">Exit</span></Button>
      </nav>
    </div>
  );
}
