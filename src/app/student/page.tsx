
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
  Bell, 
  QrCode,
  Map as MapIcon,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight,
  Plus,
  Loader2,
  Fingerprint
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
    else setActiveOtp(null);
  }, [profile]);

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  const handleTopUp = async () => {
    if (!userRef) return;
    await updateDoc(userRef, { credits: increment(500) });
    toast({ title: "Scholar Wallet Credited", description: "₹500 authorized for regional transit." });
  };

  const handleBoardRequest = async (trip: any) => {
    if (!db || !userRef) return;
    
    if ((profile?.credits || 0) < trip.farePerRider) {
      toast({ variant: "destructive", title: "Insufficient Credits", description: `Mission requires ₹${trip.farePerRider.toFixed(0)} balance.` });
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
      toast({ title: "Auth Code Generated", description: "Fare processed. Present OTP to driver for boarding." });
    } catch {
      toast({ variant: "destructive", title: "Encryption Error" });
    } finally {
      setIsBooking(false);
    }
  };

  if (profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-body pb-32">
      <header className="bg-slate-900 px-8 py-6 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary italic uppercase leading-none tracking-tight">AAGO</h1>
            <Badge className="bg-white/5 text-slate-500 uppercase text-[8px] mt-1 tracking-widest font-bold">Scholar Terminal</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-12 w-12 rounded-2xl hover:bg-white/5 transition-all">
          <LogOut className="h-6 w-6 text-slate-500" />
        </Button>
      </header>

      <main className="flex-1 p-8 space-y-10 max-w-lg mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}</h2>
          <p className="text-slate-500 font-bold italic text-sm">Your regional grid is ready for boarding.</p>
        </div>

        {activeOtp ? (
          <Card className="bg-primary text-white border-none rounded-[3.5rem] p-10 text-center shadow-[0_30px_60px_rgba(59,130,246,0.3)] animate-in zoom-in-95 duration-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-white/20 animate-pulse" />
            <Fingerprint className="h-20 w-20 mx-auto mb-8 opacity-40 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-70">Biometric Auth Code</p>
            <h3 className="text-7xl font-black tracking-[0.2em] italic font-headline leading-none">{activeOtp}</h3>
            <div className="mt-10 p-4 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold opacity-90 italic leading-relaxed">Present this code to the operator for verified boarding and terminal clearance.</p>
            </div>
            <Button 
              variant="ghost" 
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
              onClick={() => {
                if(userRef) updateDoc(userRef, { activeOtp: null });
                setActiveOtp(null);
              }}
            >
              Cancel Request
            </Button>
          </Card>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <div className="p-10 bg-primary rounded-[3.5rem] text-white flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-[0_20px_40px_rgba(59,130,246,0.3)] group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="space-y-2 relative z-10">
                  <h3 className="text-4xl font-black italic uppercase leading-none">Board Mission</h3>
                  <Badge className="bg-white/20 text-white font-black uppercase text-[9px] tracking-widest border-none">
                    {activeTrips?.length || 0} Shuttles Active
                  </Badge>
                </div>
                <Navigation className="h-14 w-14 relative z-10 group-hover:rotate-12 transition-transform" />
              </div>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/5 text-white rounded-[3rem] p-10 max-w-[90vw] mx-auto">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black italic uppercase text-primary leading-none">Live Dispatch Grid</DialogTitle>
                <DialogDescription className="font-bold text-slate-400 mt-2">Select an active hub mission to initiate boarding.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {activeTrips?.length === 0 ? (
                  <p className="text-center text-slate-500 font-bold py-10 italic">No active missions in your regional hub.</p>
                ) : (
                  activeTrips?.map((trip: any) => (
                    <div 
                      key={trip.id} 
                      className="p-8 bg-white/5 rounded-[2.5rem] flex justify-between items-center group hover:bg-primary transition-all duration-500 border border-white/5"
                    >
                      <div>
                        <h4 className="font-black uppercase italic text-2xl leading-none group-hover:text-white transition-colors">{trip.routeName}</h4>
                        <div className="flex items-center gap-2 mt-2">
                           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white/70 group-hover:border-white/20 transition-colors">
                            Fare: ₹{trip.farePerRider.toFixed(0)}
                           </Badge>
                           <span className="text-[9px] font-bold text-slate-500 uppercase group-hover:text-white/50">{trip.driverName}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleBoardRequest(trip)} 
                        disabled={isBooking}
                        className="bg-primary rounded-xl font-black italic uppercase group-hover:bg-white group-hover:text-primary h-12 px-6 shadow-lg shadow-primary/20"
                      >
                        Request
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-white rounded-[3rem] p-8 shadow-xl group border-none">
             <IndianRupee className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform duration-500" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scholar Wallet</p>
             <div className="flex items-center justify-between mt-2">
                <p className="text-4xl font-black italic font-headline text-slate-950">₹{(profile?.credits || 0).toFixed(0)}</p>
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-2xl bg-slate-950 hover:bg-primary transition-colors shadow-lg shadow-slate-950/20" 
                  onClick={handleTopUp}
                >
                  <Plus className="h-7 w-7" />
                </Button>
             </div>
          </Card>
          <Card className="bg-white rounded-[3rem] p-8 shadow-xl flex flex-col items-center justify-center gap-3 group border-none cursor-pointer">
             <QrCode className="h-14 w-14 text-primary group-hover:scale-110 transition-transform duration-500" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Hub Identity</p>
          </Card>
        </div>

        <section className="space-y-6 pt-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic px-2">Regional Hub Routes</h4>
           <div className="space-y-5">
              {activeRoutes?.length === 0 ? (
                <p className="text-slate-600 font-bold italic text-center py-10">Waiting for mission dispatch...</p>
              ) : (
                activeRoutes?.map((route: any) => (
                  <div key={route.id} className="p-8 bg-white rounded-[3.5rem] shadow-2xl flex items-center justify-between group cursor-pointer active:scale-98 transition-all duration-500 border-none">
                     <div className="flex items-center gap-6">
                        <div className="bg-primary/5 p-5 rounded-3xl group-hover:bg-primary transition-colors duration-500">
                          <MapPin className="h-10 w-10 text-primary group-hover:text-white transition-colors duration-500" />
                        </div>
                        <div>
                          <p className="font-black text-2xl italic uppercase text-slate-950 leading-none">{route.routeName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest border-none">
                              Starts ₹{route.baseFare}
                            </Badge>
                            {route.surgeFare > 0 && (
                              <Badge className="bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest border-none">
                                +₹{route.surgeFare} Surge
                              </Badge>
                            )}
                          </div>
                        </div>
                     </div>
                     <ChevronRight className="h-8 w-8 text-slate-200 group-hover:text-primary group-hover:translate-x-2 transition-all duration-500" />
                  </div>
                ))
              )}
           </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-8 bg-slate-900/90 backdrop-blur-3xl border-t border-white/5 z-50 rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-primary">
            <Bus className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Commute</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-slate-500 hover:text-white transition-colors">
            <MapIcon className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Radar</span>
          </Button>
          <div className="bg-primary h-20 w-20 rounded-[2.5rem] flex items-center justify-center -mt-24 border-[8px] border-slate-950 shadow-[0_15px_30px_rgba(59,130,246,0.4)] relative group cursor-pointer active:scale-95 transition-all">
            <div className="absolute inset-0 bg-white/10 rounded-full animate-ping opacity-20 group-hover:animate-none" />
            <QrCode className="h-10 w-10 text-white" />
          </div>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-slate-500 hover:text-white transition-colors">
            <Bell className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Inbox</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-slate-500 hover:text-white transition-colors">
            <Search className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Grid</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
