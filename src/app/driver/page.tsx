
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Radio
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where, increment, arrayUnion, getDocs, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

type Stop = {
  name: string;
  lat: number;
  lng: number;
};

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'missions' | 'earnings' | 'suggest'>('missions');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Route Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState({ 
    routeName: '', 
    stops: [] as Stop[] 
  });
  const [tempStop, setTempStop] = useState<Stop>({ name: '', lat: 17.6868, lng: 83.2185 });

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
        toast({ variant: "destructive", title: "Invalid OTP", description: "Biometric match not found." });
      } else {
        const riderDoc = snap.docs[0];
        const rider = riderDoc.data();
        const tripRef = doc(db, 'trips', activeTrip.id);
        
        await updateDoc(tripRef, {
          verifiedPassengers: arrayUnion(rider.uid),
          totalFareCollected: increment(activeTrip.farePerRider)
        });

        await updateDoc(doc(db, 'users', rider.uid), { activeOtp: null });
        toast({ title: "Scholar Verified", description: `${rider.fullName} cleared.` });
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

      toast({ title: "Shift Finalized", description: `Net Earnings: ₹${driverPayout.toFixed(2)} credited.` });
    } catch {
      toast({ variant: "destructive", title: "Finalization Failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuggestRoute = async () => {
    if (!db || !suggestion.routeName || suggestion.stops.length < 2) {
      toast({ variant: "destructive", title: "Protocol Violation", description: "Suggestion requires name and 2+ nodes." });
      return;
    }
    setIsSuggesting(true);
    try {
      await addDoc(collection(db, 'routes'), {
        ...suggestion,
        city: profile?.city || 'Vizag',
        status: 'suggested',
        isActive: false,
        baseFare: 50,
        surgeFare: 0,
        busMultiplier: 1.0,
        miniBusMultiplier: 1.2,
        vanMultiplier: 1.5,
        createdAt: new Date().toISOString(),
        suggestedBy: user?.uid
      });
      setSuggestion({ routeName: '', stops: [] });
      setActiveTab('missions');
      toast({ title: "Proposal Logged", description: "Architecture transmitted to Admin Terminal." });
    } catch {
      toast({ variant: "destructive", title: "Transmission Failed" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-body pb-32">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] group relative overflow-hidden">
             <div className="absolute inset-0 bg-primary/10 animate-pulse" />
             <span className="relative z-10 text-xl font-headline italic">{profile?.fullName?.[0]}</span>
          </div>
          <div>
            <h1 className="font-black italic uppercase text-sm leading-none tracking-tighter text-white font-headline">{profile?.fullName}</h1>
            <div className="flex items-center gap-2 mt-1.5">
               <Badge className="bg-white/5 text-slate-500 uppercase text-[8px] tracking-[0.2em] font-black border-none px-2">{profile?.vehicleType}</Badge>
               <div className={`h-1.5 w-1.5 rounded-full ${profile?.status !== 'offline' ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
            </div>
          </div>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={toggleDuty} 
          className={`rounded-2xl h-14 w-14 transition-all duration-500 ${profile?.status !== 'offline' ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-slate-900 text-slate-500 border border-white/5'}`}
        >
          <Power className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto max-w-lg mx-auto w-full custom-scrollbar">
        {activeTab === 'missions' && (
          !activeTrip ? (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black italic uppercase flex items-center gap-3 text-white font-headline">
                  <Navigation className="h-5 w-5 text-primary" /> Regional Grid
                </h2>
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest">{profile?.city} Hub</Badge>
              </div>
              
              <div className="space-y-4">
                {regionalRoutes.map((route: any) => (
                  <Card key={route.id} className="bg-slate-900/50 border-white/5 text-white rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all duration-500 shadow-xl">
                    <CardContent className="p-8 flex justify-between items-center gap-6">
                      <div className="space-y-3">
                        <h3 className="text-xl font-black uppercase italic text-white leading-none tracking-tighter font-headline group-hover:text-primary transition-colors">{route.routeName}</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest flex items-center gap-2">
                           <MapPinned className="h-3 w-3" /> {route.stops?.[0]?.name} <ChevronRight className="h-2 w-2" /> {route.stops?.[route.stops.length-1]?.name}
                        </p>
                      </div>
                      <Button 
                        onClick={() => startTrip(route)} 
                        disabled={profile?.status !== 'available' || isUpdating} 
                        className="bg-primary hover:bg-primary/90 text-slate-950 rounded-xl font-black italic uppercase h-14 px-8 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                      >
                        {isUpdating ? <Loader2 className="animate-spin h-5 w-5" /> : "Initiate"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {regionalRoutes.length === 0 && (
                <div className="p-20 text-center bg-slate-900/30 rounded-[3rem] border border-dashed border-white/10">
                   <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Radio className="h-8 w-8 text-slate-700 animate-pulse" />
                   </div>
                  <p className="text-slate-500 font-black italic uppercase text-xs tracking-[0.2em] leading-relaxed">No active corridor signals.<br/>Awaiting hub assignment.</p>
                </div>
              )}
            </section>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Card className="bg-primary text-slate-950 border-none rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(59,130,246,0.3)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                    <Bus className="h-32 w-32" />
                 </div>
                <div className="space-y-10 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="h-2 w-2 bg-slate-950 rounded-full animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-950/60">Live Mission</span>
                    </div>
                    <h2 className="text-4xl font-black italic uppercase leading-[0.9] tracking-tighter font-headline">{activeTrip.routeName}</h2>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-950/10">
                      <Activity className="h-5 w-5 text-slate-950/60 animate-pulse" />
                      <p className="text-sm font-black italic uppercase tracking-tighter">Yield: ₹{activeTrip.farePerRider.toFixed(0)} / Node</p>
                    </div>
                  </div>

                  <div className="bg-slate-950/10 p-8 rounded-[2.5rem] space-y-6 border border-slate-950/5 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-950/50">Verification Log</span>
                      <Badge className="bg-slate-950 text-white font-black uppercase text-[10px] px-3 border-none">{activeTrip.verifiedPassengers?.length || 0} Boarded</Badge>
                    </div>
                    <div className="flex gap-4">
                      <Input 
                        value={verificationOtp} 
                        onChange={(e) => setVerificationOtp(e.target.value)}
                        placeholder="000000" 
                        className="bg-slate-950/5 border-none rounded-2xl h-18 font-black text-center text-3xl tracking-[0.4em] text-slate-950 placeholder:text-slate-950/20"
                        maxLength={6}
                      />
                      <Button 
                        onClick={verifyPassenger} 
                        disabled={isVerifying || !verificationOtp || verificationOtp.length < 6} 
                        className="bg-slate-950 hover:bg-slate-900 text-white h-18 w-18 rounded-2xl p-0 flex items-center justify-center shadow-xl transition-all active:scale-95"
                      >
                        {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <Fingerprint className="h-8 w-8" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={endTrip} 
                    disabled={isUpdating} 
                    className="w-full bg-slate-950 text-white h-18 rounded-2xl font-black uppercase italic text-lg shadow-2xl active:scale-95 transition-all group"
                  >
                    {isUpdating ? <Loader2 className="animate-spin h-6 w-6" /> : "Finalize Mission Log"}
                  </Button>
                </div>
              </Card>
            </div>
          )
        )}

        {activeTab === 'earnings' && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-xl font-black italic uppercase text-white flex items-center gap-3 font-headline">
               <TrendingUp className="h-5 w-5 text-primary" /> Regional Settlement
            </h2>
            <Card className="bg-accent text-white border-none rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
               <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Net Operational Payout (90%)</p>
                <h3 className="text-6xl font-black italic font-headline mt-4 tracking-tighter leading-none">₹{(profile?.totalEarnings || 0).toFixed(0)}</h3>
                <div className="flex items-center gap-2 mt-10 py-2.5 px-5 bg-white/10 rounded-full w-fit">
                   <ShieldCheck className="h-3 w-3" />
                   <p className="text-[9px] font-black uppercase tracking-widest italic">Settlement Finalized</p>
                </div>
               </div>
               <Wallet className="absolute -right-8 -bottom-8 h-56 w-56 opacity-10 group-hover:rotate-12 transition-transform duration-1000" />
            </Card>
            
            <div className="grid grid-cols-2 gap-6">
               <Card className="bg-slate-900/50 border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-primary/20 transition-all">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Completed</p>
                  <h4 className="text-4xl font-black italic text-white leading-none font-headline group-hover:text-primary transition-colors">{profile?.totalTrips || 0}</h4>
                  <p className="text-[8px] font-black text-slate-700 uppercase mt-4 tracking-widest">Missions Logged</p>
               </Card>
               <Card className="bg-slate-900/50 border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-primary/20 transition-all">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Regional Hub</p>
                  <h4 className="text-4xl font-black italic text-white leading-none font-headline group-hover:text-primary transition-colors">{profile?.city}</h4>
                  <p className="text-[8px] font-black text-slate-700 uppercase mt-4 tracking-widest">Active Node</p>
               </Card>
            </div>
          </section>
        )}

        {activeTab === 'suggest' && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-xl font-black italic uppercase flex items-center gap-3 text-white font-headline">
              <MessageSquareShare className="h-5 w-5 text-primary" /> Network Architect
            </h2>
            <Card className="bg-slate-900/50 border-white/5 rounded-[3rem] p-10 space-y-10 shadow-2xl border-l-8 border-primary">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-1">Proposed Corridor Identity</Label>
                  <Input 
                    value={suggestion.routeName} 
                    onChange={(e) => setSuggestion({...suggestion, routeName: e.target.value})}
                    placeholder="e.g. AU Coast Express" 
                    className="h-16 bg-slate-950 border-white/10 rounded-2xl font-black text-white italic text-lg" 
                  />
               </div>

               <div className="space-y-6 pt-6 border-t border-white/5">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.3em] ml-1">Define Operational Node</Label>
                  <div className="space-y-4 bg-slate-950/50 p-6 rounded-[2.5rem] border border-dashed border-white/10">
                     <Input 
                       placeholder="Terminal Name" 
                       value={tempStop.name}
                       onChange={(e) => setTempStop({...tempStop, name: e.target.value})}
                       className="h-12 bg-slate-900 border-none rounded-xl font-bold"
                     />
                     <div className="grid grid-cols-2 gap-4">
                       <Input type="number" placeholder="Latitude" value={tempStop.lat} onChange={(e) => setTempStop({...tempStop, lat: Number(e.target.value)})} className="h-12 bg-slate-900 border-none rounded-xl" />
                       <Input type="number" placeholder="Longitude" value={tempStop.lng} onChange={(e) => setTempStop({...tempStop, lng: Number(e.target.value)})} className="h-12 bg-slate-900 border-none rounded-xl" />
                     </div>
                     <Button onClick={() => { if(tempStop.name) { setSuggestion({...suggestion, stops: [...suggestion.stops, tempStop]}); setTempStop({name:'', lat:17.68, lng:83.21}); }}} variant="secondary" className="w-full h-14 rounded-2xl font-black uppercase italic shadow-lg active:scale-95 transition-all">
                        Add Node to Path
                     </Button>
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-1">Corridor Path Log</p>
                  <div className="space-y-3">
                    {suggestion.stops.map((stop, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-950/50 rounded-[1.5rem] border border-white/5 animate-in slide-in-from-left-4">
                        <div className="flex items-center gap-4">
                           <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary italic">
                              {i+1}
                           </div>
                           <span className="text-sm font-black uppercase italic text-white">{stop.name}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-red-500 hover:bg-red-500/10 rounded-xl" onClick={() => setSuggestion({...suggestion, stops: suggestion.stops.filter((_, idx) => idx !== i)})}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {suggestion.stops.length === 0 && (
                      <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                         <MapPinned className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                         <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Architecture Nodes Pending</p>
                      </div>
                    )}
                  </div>
               </div>

               <Button 
                onClick={handleSuggestRoute} 
                disabled={isSuggesting || !suggestion.routeName || suggestion.stops.length < 2} 
                className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl font-black uppercase italic text-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
               >
                 {isSuggesting ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Proposal"}
               </Button>
            </Card>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 flex justify-around items-center rounded-t-[3.5rem] z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        {[
          { id: 'missions', icon: Bus, label: 'Missions' },
          { id: 'suggest', icon: MessageSquareShare, label: 'Suggest' },
          { id: 'earnings', icon: IndianRupee, label: 'Earnings' },
        ].map((item) => (
          <Button 
            key={item.id}
            variant="ghost" 
            onClick={() => setActiveTab(item.id as any)} 
            className={`flex-col h-auto py-3 gap-2 rounded-2xl transition-all duration-500 ${activeTab === item.id ? 'text-primary scale-110' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <item.icon className={`h-7 w-7 ${activeTab === item.id ? 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`} />
            <span className="text-[8px] font-black uppercase tracking-[0.25em]">{item.label}</span>
          </Button>
        ))}
        <Button variant="ghost" onClick={handleSignOut} className="flex-col h-auto py-3 gap-2 rounded-2xl text-slate-500 hover:text-red-400 transition-colors">
          <LogOut className="h-7 w-7" />
          <span className="text-[8px] font-black uppercase tracking-[0.25em]">Exit</span>
        </Button>
      </nav>
    </div>
  );
}
