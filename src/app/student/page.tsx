"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Bus, 
  MapPin, 
  Search, 
  Bell, 
  QrCode,
  Map as MapIcon,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight,
  Plus,
  Loader2,
  Fingerprint,
  CheckCircle2,
  Phone,
  History,
  User as UserIcon,
  Wallet,
  Clock,
  ArrowRight,
  Info,
  Ticket,
  ShieldCheck,
  Tag,
  PlusCircle,
  Banknote,
  GanttChart
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, orderBy, limit, addDoc, getDocs, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const mapContainerStyle = { width: '100%', height: '220px', borderRadius: '1.5rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true, zoomControl: false };

export default function StudentDashboard() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'history' | 'profile'>('home');
  const [isBooking, setIsBooking] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [destinationStop, setDestinationStop] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: firebaseConfig.apiKey });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: activeTrips } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: activeRoutes } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active')) : null, [db, profile?.city]));
  const { data: pastTrips } = useCollection(useMemo(() => (db && user?.uid) ? query(collection(db, 'trips'), where('passengers', 'array-contains', user.uid), where('status', '==', 'completed'), orderBy('endTime', 'desc'), limit(10)) : null, [db, user?.uid]));
  const { data: userPasses } = useCollection(useMemo(() => (db && user?.uid) ? query(collection(db, 'users', user.uid, 'passes'), where('remainingRides', '>', 0)) : null, [db, user?.uid]));
  const { data: availablePasses } = useCollection(useMemo(() => (db && profile?.city) ? query(collection(db, 'passes'), where('city', '==', profile.city), where('isActive', '==', true)) : null, [db, profile?.city]));

  const currentBooking = useMemo(() => (activeTrips && user?.uid) ? activeTrips.find(t => t.passengers?.includes(user.uid)) : null, [activeTrips, user?.uid]);
  const filteredTrips = useMemo(() => (activeTrips) ? activeTrips.filter(t => t.routeName.toLowerCase().includes(searchQuery.toLowerCase())) : [], [activeTrips, searchQuery]);

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/'); };

  const handleTopUp = async (amount: number) => {
    if (!db || !userRef || !profile) return;
    try {
      await updateDoc(userRef, { credits: increment(amount) });
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        userName: profile.fullName,
        amount,
        type: 'top-up',
        timestamp: new Date().toISOString()
      });
      toast({ title: "Wallet Updated", description: `Added ₹${amount} to your wallet.` });
    } catch {
      toast({ variant: "destructive", title: "Could not add money" });
    }
  };

  const redeemPromo = async () => {
    if (!db || !userRef || !promoCode) return;
    setIsRedeeming(true);
    try {
      const q = query(collection(db, 'promoCodes'), where('code', '==', promoCode.toUpperCase().trim()), where('isActive', '==', true), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Invalid Code", description: "This code is not working or expired." });
      } else {
        const promo = snap.docs[0].data();
        await updateDoc(userRef, { credits: increment(promo.value) });
        await updateDoc(doc(db, 'promoCodes', snap.docs[0].id), { usageCount: increment(1) });
        toast({ title: "Promo Applied!", description: `₹${promo.value} added to your wallet.` });
        setPromoCode("");
      }
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsRedeeming(false);
    }
  };

  const buyPass = async (pass: any) => {
    if (!db || !userRef || !profile) return;
    if (profile.credits < pass.price) {
      toast({ variant: "destructive", title: "Low Balance", description: "Please top up your wallet first." });
      return;
    }
    try {
      await updateDoc(userRef, { credits: increment(-pass.price) });
      await addDoc(collection(db, 'users', user!.uid, 'passes'), {
        passId: pass.id,
        name: pass.name,
        totalRides: pass.totalRides,
        remainingRides: pass.totalRides,
        routeName: pass.routeName,
        purchasedAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'transactions'), {
        userId: user!.uid,
        userName: profile.fullName,
        amount: pass.price,
        type: 'pass-purchase',
        timestamp: new Date().toISOString()
      });
      toast({ title: "Pass Bought!", description: `You have ${pass.totalRides} rides to use.` });
    } catch {
      toast({ variant: "destructive", title: "Purchase failed" });
    }
  };

  const handleBoardRequest = async () => {
    if (!db || !userRef || !user?.uid || !selectedTrip || !destinationStop) return;
    
    const compatiblePass = userPasses?.find(p => p.routeName === 'All Routes' || p.routeName === selectedTrip.routeName);
    
    if (!compatiblePass && (profile?.credits || 0) < selectedTrip.farePerRider) {
      toast({ variant: "destructive", title: "No Money", description: "Please add money to your wallet." });
      return;
    }

    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      if (compatiblePass) {
        const passRef = doc(db, 'users', user.uid, 'passes', (compatiblePass as any).id);
        await updateDoc(passRef, {
          remainingRides: increment(-1)
        });
        toast({ title: "Pass Used", description: "One ride used from your pass." });
      } else {
        await updateDoc(userRef, { credits: increment(-selectedTrip.farePerRider) });
      }

      await updateDoc(userRef, { activeOtp: otp, destinationStopName: destinationStop });
      await updateDoc(doc(db, 'trips', selectedTrip.id), { passengers: arrayUnion(user.uid) });

      setSelectedTrip(null);
      setDestinationStop("");
      setSearchQuery("");
      toast({ title: "Booking Confirmed", description: "Your boarding code is ready." });
    } catch {
      toast({ variant: "destructive", title: "Booking failed" });
    } finally {
      setIsBooking(false);
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body pb-32">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Bus className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">AAGO</h1><p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">{profile?.city} HUB</p></div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => setActiveTab('wallet')} className="h-10 w-10 rounded-xl bg-slate-100 text-primary hover:bg-primary/10 transition-colors"><Wallet className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}</h2>
              <p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">Where are we going today?</p>
            </div>

            {profile?.activeOtp && currentBooking ? (
              <Card className="bg-primary text-white border-none rounded-[2.5rem] p-8 text-center shadow-xl shadow-primary/20 relative overflow-hidden transition-all">
                <h3 className="text-7xl font-black tracking-[0.1em] italic font-headline leading-none mb-2">{profile.activeOtp}</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-8 opacity-70">Show code to driver</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-left">
                    <p className="text-[7px] font-black uppercase opacity-60 tracking-widest">Route</p>
                    <p className="text-xs font-black italic uppercase truncate">{currentBooking.routeName}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-left">
                    <p className="text-[7px] font-black uppercase opacity-60 tracking-widest">Drop-off</p>
                    <p className="text-xs font-black italic uppercase truncate">{profile.destinationStopName}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="p-10 bg-white border border-slate-100 rounded-[3rem] text-slate-900 flex items-center justify-between cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all shadow-sm group">
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black italic uppercase leading-none">Find Bus</h3>
                        <Badge className="bg-primary/10 text-primary font-black uppercase text-[8px] tracking-widest border-none">Radar Active</Badge>
                      </div>
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Search className="h-8 w-8" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-none text-slate-900 rounded-[3rem] p-8 max-w-[95vw] mx-auto w-full shadow-2xl">
                    {!selectedTrip ? (
                      <div className="space-y-6 flex flex-col h-[70vh]">
                        <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Live Bus Search</DialogTitle></DialogHeader>
                        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Type route name..." className="bg-slate-50 border-slate-100 h-12 pl-12 rounded-xl text-slate-900 font-bold italic" /></div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                          {filteredTrips.length > 0 ? filteredTrips.map((trip: any) => (
                            <div key={trip.id} onClick={() => setSelectedTrip(trip)} className="p-6 bg-slate-50 rounded-[2rem] flex justify-between items-center group cursor-pointer border border-transparent hover:border-primary/20 hover:bg-white hover:shadow-md transition-all">
                              <div><h4 className="font-black uppercase italic text-lg leading-none">{trip.routeName}</h4><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">₹{trip.farePerRider.toFixed(0)} • {trip.driverName}</p></div>
                              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors"><ChevronRight className="h-5 w-5" /></div>
                            </div>
                          )) : <p className="text-center py-10 text-slate-400 font-bold italic uppercase text-xs">No buses active right now</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in slide-in-from-right-4 h-[70vh] flex flex-col">
                        <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Choose Drop-off</DialogTitle></DialogHeader>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                          {activeRoutes?.find(r => r.routeName === selectedTrip.routeName)?.stops?.map((stop: any, idx: number) => (
                            <div key={idx} onClick={() => setDestinationStop(stop.name)} className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between cursor-pointer ${destinationStop === stop.name ? 'bg-primary border-primary text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:border-slate-200'}`}>
                              <span className="font-black italic uppercase text-sm">{stop.name}</span>
                              {destinationStop === stop.name && <CheckCircle2 className="h-5 w-5" />}
                            </div>
                          ))}
                        </div>
                        <Button onClick={handleBoardRequest} disabled={isBooking || !destinationStop} className="w-full h-18 bg-primary hover:bg-primary/90 rounded-[1.5rem] font-black uppercase italic text-xl shadow-xl shadow-primary/20 transition-all active:scale-95">
                          {isBooking ? <Loader2 className="animate-spin" /> : "Book My Seat"}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <Card onClick={() => setActiveTab('wallet')} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4"><Wallet className="h-5 w-5" /></div>
                    <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Wallet Balance</p><h3 className="text-3xl font-black text-slate-900 italic">₹{(profile?.credits || 0).toFixed(0)}</h3></div>
                  </Card>
                  <Card onClick={() => setActiveTab('wallet')} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4"><Ticket className="h-5 w-5" /></div>
                    <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Passes</p><h3 className="text-3xl font-black text-slate-900 italic">{userPasses?.length || 0}</h3></div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-primary text-white border-none rounded-[3rem] p-10 relative overflow-hidden shadow-xl shadow-primary/20">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">My Wallet</p>
              <h3 className="text-5xl font-black italic mt-4 tracking-tighter">₹{(profile?.credits || 0).toFixed(0)}</h3>
              <Banknote className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10" />
            </Card>

            <Tabs defaultValue="passes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-200/50 p-1.5 rounded-2xl h-14">
                <TabsTrigger value="passes" className="rounded-xl font-black uppercase italic text-[9px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Ride Passes</TabsTrigger>
                <TabsTrigger value="topup" className="rounded-xl font-black uppercase italic text-[9px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Add Money</TabsTrigger>
                <TabsTrigger value="promo" className="rounded-xl font-black uppercase italic text-[9px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Redeem Code</TabsTrigger>
              </TabsList>

              <TabsContent value="passes" className="space-y-6 pt-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-2">Your Passes</h4>
                  {userPasses && userPasses.length > 0 ? userPasses.map((p: any) => (
                    <Card key={p.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 relative overflow-hidden shadow-sm">
                      <div className="relative z-10 flex justify-between items-center">
                        <div><h4 className="font-black text-slate-900 uppercase italic text-sm">{p.name}</h4><p className="text-[8px] font-black text-slate-400 uppercase mt-1">{p.remainingRides} / {p.totalRides} Rides left • {p.routeName}</p></div>
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Ticket className="h-5 w-5" /></div>
                      </div>
                      <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(p.remainingRides / p.totalRides) * 100}%` }} /></div>
                    </Card>
                  )) : <p className="text-center py-6 bg-white border border-dashed border-slate-200 rounded-[2rem] text-slate-400 text-[10px] font-bold uppercase italic">No active passes</p>}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-2">Offers for You</h4>
                  {availablePasses?.map((p: any) => (
                    <Card key={p.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex justify-between items-center hover:shadow-md transition-all shadow-sm">
                       <div><h4 className="font-black text-slate-900 uppercase italic text-sm">{p.name}</h4><p className="text-[8px] font-black text-slate-400 uppercase mt-1">{p.totalRides} Rides • Save ₹{(p.price * 0.2).toFixed(0)}</p></div>
                       <Button onClick={() => buyPass(p)} className="bg-slate-900 text-white font-black uppercase italic h-10 rounded-xl shadow-lg hover:bg-primary transition-colors">₹{p.price}</Button>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="topup" className="space-y-6 pt-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-2">Quick Add</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[200, 500, 1000, 2000].map(amt => (
                    <Button key={amt} onClick={() => handleTopUp(amt)} className="h-20 bg-white border border-slate-100 hover:border-primary/50 hover:bg-primary/5 text-slate-900 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all shadow-sm">
                      <Plus className="h-4 w-4 text-primary" /><span className="text-xl font-black italic">₹{amt}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="promo" className="space-y-6 pt-6">
                <Card className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center shadow-sm">
                  <div className="h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4"><Tag className="h-8 w-8" /></div>
                  <h4 className="text-xl font-black uppercase italic text-slate-900 mb-2">Claim Promo</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-8 italic">Enter code for free credits.</p>
                  <div className="flex flex-col gap-4">
                    <Input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="ENTER CODE" className="h-14 bg-slate-50 border-slate-200 text-center font-black tracking-[0.2em] text-slate-900 rounded-xl" />
                    <Button onClick={redeemPromo} disabled={isRedeeming || !promoCode} className="w-full h-14 bg-accent text-white rounded-xl font-black uppercase italic shadow-lg active:scale-95 transition-all">
                      {isRedeeming ? <Loader2 className="animate-spin" /> : "Redeem Now"}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-1"><h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">My Rides</h2><p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">History of your past trips</p></div>
             <div className="space-y-4">
                {pastTrips && pastTrips.length > 0 ? pastTrips.map((trip: any) => (
                  <Card key={trip.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex justify-between items-center shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500"><CheckCircle2 className="h-6 w-6" /></div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase italic text-sm leading-none">{trip.routeName}</h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-widest italic">
                            {new Date(trip.endTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {new Date(trip.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                     </div>
                     <div className="text-right"><p className="text-xl font-black text-primary italic">₹{trip.farePerRider?.toFixed(0)}</p><p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">Paid</p></div>
                  </Card>
                )) : <p className="text-center py-12 text-slate-400 font-bold italic uppercase text-xs">No ride history yet</p>}
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col items-center gap-6 py-8 text-center">
                <div className="h-32 w-32 rounded-[2.5rem] bg-white border border-slate-200 flex items-center justify-center text-primary shadow-lg relative group">
                  <div className="absolute inset-2 bg-slate-50 rounded-[1.8rem] group-hover:bg-primary/5 transition-colors" />
                  <span className="text-5xl font-black italic relative z-10">{profile?.fullName?.[0]}</span>
                </div>
                <div>
                   <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{profile?.fullName}</h2>
                   <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1 mt-3">Verified Student</Badge>
                </div>
             </div>
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">Your Details</h4>
                {[ { label: 'College', value: profile?.collegeName, icon: Info }, { label: 'Student ID', value: profile?.studentId, icon: Fingerprint } ].map((item, i) => (
                  <div key={i} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center gap-5 shadow-sm">
                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><item.icon className="h-5 w-5" /></div>
                    <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p><p className="text-sm font-black text-slate-900 uppercase italic mt-1 leading-tight">{item.value || 'N/A'}</p></div>
                  </div>
                ))}
             </div>
             <Button variant="ghost" onClick={handleSignOut} className="w-full h-18 bg-red-50 hover:bg-red-100 text-red-500 rounded-[2rem] font-black uppercase italic transition-all active:scale-95"><LogOut className="mr-3 h-5 w-5" /> Log Out</Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-2xl border-t border-slate-100 z-50 rounded-t-[3.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'home' ? 'text-primary scale-110' : 'text-slate-400'}`}><Bus className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Home</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('wallet')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'wallet' ? 'text-primary scale-110' : 'text-slate-400'}`}><Wallet className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Wallet</span></Button>
          
          <div className="relative -mt-16 group">
            <div className="absolute -inset-3 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-all duration-700" />
            <Button onClick={() => setActiveTab('home')} className="relative h-20 w-20 rounded-[2.5rem] bg-primary text-white border-[8px] border-white shadow-xl hover:scale-110 active:scale-95 transition-all">
              <QrCode className="h-10 w-10" />
            </Button>
          </div>
          
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-slate-400'}`}><History className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Rides</span></Button>
          <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-2 gap-1 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-primary scale-110' : 'text-slate-400'}`}><UserIcon className="h-7 w-7" /><span className="text-[8px] font-black uppercase tracking-widest">Me</span></Button>
        </div>
      </nav>
    </div>
  );
}