
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Clock, 
  Bell, 
  QrCode,
  Map as MapIcon,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight,
  Plus,
  Loader2,
  AlertTriangle,
  Info,
  Fingerprint
} from 'lucide-react';
import Image from 'next/image';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, addDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

export default function RiderDashboard() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [isBooking, setIsBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<'commute' | 'map' | 'inbox'>('commute');
  const [activeOtp, setActiveOtp] = useState<string | null>(null);

  const { data: activeTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]));
  const { data: activeRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]));

  useEffect(() => {
    if (profile?.activeOtp) setActiveOtp(profile.activeOtp);
  }, [profile]);

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  const handleTopUp = async () => {
    if (!userRef) return;
    await updateDoc(userRef, { credits: increment(500) });
    toast({ title: "Scholar Wallet Credited", description: "₹500 added to account." });
  };

  const handleBoardRequest = async (trip: any) => {
    if (!db || !userRef || (profile?.credits || 0) < trip.farePerRider) {
      toast({ variant: "destructive", title: "Balance Depleted", description: `Required: ₹${trip.farePerRider}` });
      return;
    }

    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await updateDoc(userRef, { 
        credits: increment(-trip.farePerRider),
        activeOtp: otp 
      });
      setActiveOtp(otp);
      toast({ title: "OTP Generated", description: "Share this with the driver to board." });
    } catch {
      toast({ variant: "destructive", title: "Communication Error" });
    } finally {
      setIsBooking(false);
    }
  };

  if (profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-body pb-32">
      <header className="bg-slate-900 px-8 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white"><Bus className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-black text-primary italic uppercase leading-none">AAGO</h1>
            <Badge className="bg-white/5 text-slate-500 uppercase text-[8px] mt-1">Scholar Terminal</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="h-6 w-6 text-slate-500" /></Button>
      </header>

      <main className="flex-1 p-8 space-y-12 max-w-lg mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Hi, {profile?.fullName?.split(' ')[0]}</h2>
          <p className="text-slate-500 font-bold italic">Terminal ready for boarding.</p>
        </div>

        {activeOtp ? (
          <Card className="bg-primary text-white border-none rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <Fingerprint className="h-16 w-16 mx-auto mb-6 opacity-40" />
            <p className="text-[12px] font-black uppercase tracking-[0.4em] mb-4">Boarding Auth Code</p>
            <h3 className="text-7xl font-black tracking-[0.2em] italic font-headline">{activeOtp}</h3>
            <p className="text-xs font-bold mt-8 opacity-70 italic leading-relaxed">Present this code to the driver for biometric verification and boarding clearance.</p>
          </Card>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <div className="p-10 bg-primary rounded-[3rem] text-white flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-2xl">
                <div className="space-y-2">
                  <h3 className="text-4xl font-black italic uppercase">Board Shuttle</h3>
                  <Badge className="bg-white/20 text-white font-black uppercase text-[10px]">{activeTrips?.length || 0} Shuttles Live</Badge>
                </div>
                <Navigation className="h-12 w-12" />
              </div>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/5 text-white rounded-[3rem] p-8">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black italic uppercase text-primary">Live Dispatch</DialogTitle>
                <DialogDescription className="font-bold text-slate-400">Select an active mission to generate OTP.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-6">
                {activeTrips?.map((trip: any) => (
                  <div key={trip.id} className="p-6 bg-white/5 rounded-[2rem] flex justify-between items-center group hover:bg-primary transition-all">
                    <div>
                      <h4 className="font-black uppercase italic text-xl leading-none">{trip.routeName}</h4>
                      <p className="text-[10px] font-black uppercase text-slate-500 mt-2 group-hover:text-white/70 tracking-widest">Fare: ₹{trip.farePerRider}</p>
                    </div>
                    <Button onClick={() => handleBoardRequest(trip)} className="bg-primary rounded-xl font-black italic uppercase group-hover:bg-white group-hover:text-primary">Request</Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-white rounded-[3rem] p-8 shadow-xl group">
             <IndianRupee className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
             <div className="flex items-center justify-between mt-1">
                <p className="text-4xl font-black italic font-headline">₹{profile?.credits || 0}</p>
                <Button size="icon" className="h-10 w-10 rounded-full bg-slate-950" onClick={handleTopUp}><Plus className="h-6 w-6" /></Button>
             </div>
          </Card>
          <Card className="bg-white rounded-[3rem] p-8 shadow-xl flex flex-col items-center justify-center gap-2">
             <QrCode className="h-12 w-12 text-primary" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Identity Terminal</p>
          </Card>
        </div>

        <section className="space-y-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic px-2">Approved Regional Routes</h4>
           <div className="space-y-4">
              {activeRoutes?.map((route: any) => (
                <div key={route.id} className="p-8 bg-white rounded-[3rem] shadow-xl flex items-center justify-between group cursor-pointer active:scale-98 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="bg-primary/5 p-4 rounded-2xl"><MapPin className="h-8 w-8 text-primary" /></div>
                      <div>
                        <p className="font-black text-2xl italic uppercase text-slate-950 leading-none">{route.routeName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Fare Starts at ₹{route.baseFare}</p>
                      </div>
                   </div>
                   <ChevronRight className="h-6 w-6 text-slate-300" />
                </div>
              ))}
           </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-900/90 backdrop-blur-3xl border-t border-white/5 z-50 rounded-t-[3rem]">
        <div className="flex justify-around items-center">
          <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-primary"><Bus className="h-8 w-8" /><span className="text-[8px] font-black uppercase">Commute</span></Button>
          <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-slate-500"><MapIcon className="h-8 w-8" /><span className="text-[8px] font-black uppercase">Radar</span></Button>
          <div className="bg-primary h-20 w-20 rounded-[2.5rem] flex items-center justify-center -mt-20 border-[8px] border-slate-950 shadow-2xl"><QrCode className="h-10 w-10 text-white" /></div>
          <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-slate-500"><Bell className="h-8 w-8" /><span className="text-[8px] font-black uppercase">Inbox</span></Button>
          <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-slate-500"><Search className="h-8 w-8" /><span className="text-[8px] font-black uppercase">Search</span></Button>
        </div>
      </nav>
    </div>
  );
}
