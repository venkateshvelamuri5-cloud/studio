
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
  Fingerprint,
  CheckCircle2
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion } from 'firebase/firestore';
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
  const [activeOtp, setActiveOtp] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [destinationStop, setDestinationStop] = useState<string>("");

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
    toast({ title: "Money Added", description: "₹500 added to your student wallet." });
  };

  const handleBoardRequest = async () => {
    if (!db || !userRef || !user?.uid || !selectedTrip || !destinationStop) return;
    
    if ((profile?.credits || 0) < selectedTrip.farePerRider) {
      toast({ variant: "destructive", title: "Low Balance", description: `You need at least ₹${selectedTrip.farePerRider.toFixed(0)} to book this trip.` });
      return;
    }

    setIsBooking(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      await updateDoc(userRef, { 
        credits: increment(-selectedTrip.farePerRider),
        activeOtp: otp,
        destinationStopName: destinationStop
      });

      const tripRef = doc(db, 'trips', selectedTrip.id);
      await updateDoc(tripRef, {
        passengers: arrayUnion(user.uid)
      });

      setActiveOtp(otp);
      setSelectedTrip(null);
      setDestinationStop("");
      toast({ title: "Booking Confirmed", description: "Show your code to the driver to board." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not book ride. Please try again." });
    } finally {
      setIsBooking(false);
    }
  };

  const currentRouteStops = useMemo(() => {
    if (!selectedTrip || !activeRoutes) return [];
    const route = activeRoutes.find((r: any) => r.routeName === selectedTrip.routeName);
    return route?.stops || [];
  }, [selectedTrip, activeRoutes]);

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
            <Badge className="bg-white/5 text-slate-500 uppercase text-[8px] mt-1 tracking-widest font-bold">Student App</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-12 w-12 rounded-2xl hover:bg-white/5 transition-all">
          <LogOut className="h-6 w-6 text-slate-500" />
        </Button>
      </header>

      <main className="flex-1 p-8 space-y-10 max-w-lg mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">Hi, {profile?.fullName?.split(' ')[0]}</h2>
          <p className="text-slate-500 font-bold italic text-sm">Where are you going today?</p>
        </div>

        {activeOtp ? (
          <Card className="bg-primary text-white border-none rounded-[3.5rem] p-10 text-center shadow-[0_30px_60px_rgba(59,130,246,0.3)] animate-in zoom-in-95 duration-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-white/20 animate-pulse" />
            <Fingerprint className="h-20 w-20 mx-auto mb-8 opacity-40 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-70">Your Boarding Code</p>
            <h3 className="text-7xl font-black tracking-[0.2em] italic font-headline leading-none">{activeOtp}</h3>
            <div className="mt-10 p-4 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold opacity-90 italic leading-relaxed">Tell this code to the driver when you board the bus.</p>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Drop-off Point</p>
              <p className="text-sm font-black italic uppercase">{profile?.destinationStopName}</p>
            </div>
            <Button 
              variant="ghost" 
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
              onClick={() => {
                if(userRef) updateDoc(userRef, { activeOtp: null });
                setActiveOtp(null);
              }}
            >
              Cancel Boarding
            </Button>
          </Card>
        ) : (
          <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
            <DialogTrigger asChild>
              <div 
                onClick={() => setSelectedTrip(null)}
                className="p-10 bg-primary rounded-[3.5rem] text-white flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-[0_20px_40px_rgba(59,130,246,0.3)] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="space-y-2 relative z-10">
                  <h3 className="text-4xl font-black italic uppercase leading-none">Book a Seat</h3>
                  <Badge className="bg-white/20 text-white font-black uppercase text-[9px] tracking-widest border-none">
                    {activeTrips?.length || 0} Buses Available
                  </Badge>
                </div>
                <Navigation className="h-14 w-14 relative z-10 group-hover:rotate-12 transition-transform" />
              </div>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/5 text-white rounded-[3rem] p-10 max-w-[90vw] mx-auto">
              {!selectedTrip ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black italic uppercase text-primary leading-none">Select a Bus</DialogTitle>
                    <DialogDescription className="font-bold text-slate-400 mt-2">Pick an active bus near you.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {activeTrips?.length === 0 ? (
                      <p className="text-center text-slate-500 font-bold py-10 italic">No buses running right now.</p>
                    ) : (
                      activeTrips?.map((trip: any) => (
                        <div 
                          key={trip.id} 
                          onClick={() => setSelectedTrip(trip)}
                          className="p-8 bg-white/5 rounded-[2.5rem] flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer border border-white/5"
                        >
                          <div>
                            <h4 className="font-black uppercase italic text-2xl leading-none">{trip.routeName}</h4>
                            <div className="flex items-center gap-2 mt-2">
                               <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary border-primary/20">
                                Fare: ₹{trip.farePerRider.toFixed(0)}
                               </Badge>
                               <span className="text-[9px] font-bold text-slate-500 uppercase">{trip.driverName}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-slate-500" />
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase text-primary leading-none">Where to drop?</DialogTitle>
                    <DialogDescription className="font-bold text-slate-400 mt-2">Select your drop-off station.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {currentRouteStops.map((stop: any, idx: number) => (
                      <div 
                        key={idx}
                        onClick={() => setDestinationStop(stop.name)}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${destinationStop === stop.name ? 'bg-primary border-primary' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                      >
                        <span className="font-black italic uppercase text-sm">{stop.name}</span>
                        {destinationStop === stop.name && <CheckCircle2 className="h-5 w-5 text-white" />}
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={handleBoardRequest} 
                    disabled={isBooking || !destinationStop}
                    className="w-full h-16 bg-primary rounded-2xl font-black uppercase italic text-lg shadow-xl"
                  >
                    {isBooking ? <Loader2 className="animate-spin h-6 w-6" /> : "Confirm Seat"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-white rounded-[3rem] p-8 shadow-xl group border-none">
             <IndianRupee className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform duration-500" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wallet Balance</p>
             <div className="flex items-center justify-between mt-2">
                <p className="text-4xl font-black italic font-headline text-slate-950">₹{(profile?.credits || 0).toFixed(0)}</p>
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-2xl bg-slate-950 hover:bg-primary transition-colors shadow-lg" 
                  onClick={handleTopUp}
                >
                  <Plus className="h-7 w-7" />
                </Button>
             </div>
          </Card>
          <Card className="bg-white rounded-[3rem] p-8 shadow-xl flex flex-col items-center justify-center gap-3 group border-none">
             <QrCode className="h-14 w-14 text-primary group-hover:scale-110 transition-transform duration-500" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Student ID</p>
          </Card>
        </div>

        <section className="space-y-6 pt-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic px-2">Popular Stations</h4>
           <div className="space-y-5">
              {activeRoutes?.length === 0 ? (
                <p className="text-slate-600 font-bold italic text-center py-10">No active routes right now.</p>
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
                              From ₹{route.baseFare}
                            </Badge>
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
            <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-slate-500 hover:text-white transition-colors">
            <MapIcon className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Stations</span>
          </Button>
          <div className="bg-primary h-20 w-20 rounded-[2.5rem] flex items-center justify-center -mt-24 border-[8px] border-slate-950 shadow-[0_15px_30px_rgba(59,130,246,0.4)] relative group cursor-pointer active:scale-95 transition-all">
            <QrCode className="h-10 w-10 text-white" />
          </div>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-slate-500 hover:text-white transition-colors">
            <Bell className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Alerts</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-1 rounded-2xl text-slate-500 hover:text-white transition-colors">
            <Search className="h-8 w-8" />
            <span className="text-[8px] font-black uppercase tracking-widest">Search</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
