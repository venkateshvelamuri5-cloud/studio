
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Camera,
  Star,
  Info
} from 'lucide-react';
import Image from 'next/image';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, orderBy, arrayUnion, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { firebaseConfig } from '@/firebase/config';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 17.6868,
  lng: 83.2185
};

export default function RiderDashboard() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const [isBooking, setIsBooking] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [activeTab, setActiveTab] = useState<'commute' | 'map' | 'inbox'>('commute');
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Simplified query to avoid index errors
  const allRoutesQuery = useMemo(() => db ? query(collection(db, 'routes')) : null, [db]);
  const { data: allRoutes, loading: routesLoading } = useCollection(allRoutesQuery);

  const activeRoutes = useMemo(() => {
    return allRoutes?.filter(r => r.isActive === true) || [];
  }, [allRoutes]);

  const tripsQuery = useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]);
  const { data: activeTrips, loading: tripsLoading } = useCollection(tripsQuery);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const handleSOS = async () => {
    if (!db || !user || !profile) return;
    setIsSendingSos(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        senderId: user.uid,
        senderName: profile.fullName,
        role: 'student',
        status: 'active',
        lat: profile.currentLat || 17.6868,
        lng: profile.currentLng || 83.2185,
        timestamp: new Date().toISOString()
      });
      toast({
        variant: "destructive",
        title: "SOS Signal Transmitted",
        description: "Regional hub notified. Stay where you are.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingSos(false);
    }
  };

  const handleTopUp = async () => {
    if (!userRef) return;
    setIsToppingUp(true);
    try {
      await updateDoc(userRef, {
        credits: increment(500)
      });
      toast({
        title: "Scholar Wallet Credited",
        description: "₹500 added successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Wallet Error" });
    } finally {
      setIsToppingUp(false);
    }
  };

  const handleBookSeat = async (tripId: string, routeName: string) => {
    if (!db || !userRef || (profile?.credits || 0) < 50) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Minimum ₹50 required to board.",
      });
      return;
    }

    setIsBooking(true);
    try {
      const tripRef = doc(db, 'trips', tripId);
      updateDoc(tripRef, {
        riderCount: increment(1),
        passengers: arrayUnion(user?.uid)
      });
      updateDoc(userRef, {
        credits: increment(-50),
        lastTrip: routeName,
        activeTripId: tripId
      });
      toast({
        title: "Boarding Pass Ready",
        description: `Seat confirmed on ${routeName}.`,
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Booking Failed" });
    } finally {
      setIsBooking(false);
    }
  };

  const getRouteImage = (routeName: string) => {
    if (routeName.toLowerCase().includes('vizag')) return PlaceHolderImages.find(i => i.id === 'vizag-route')?.imageUrl;
    if (routeName.toLowerCase().includes('vzm')) return PlaceHolderImages.find(i => i.id === 'vzm-route')?.imageUrl;
    return PlaceHolderImages.find(i => i.id === 'live-map')?.imageUrl;
  };

  if (profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-body pb-32">
      <header className="bg-slate-900 px-10 py-8 flex items-center justify-between sticky top-0 z-30 border-b border-white/5 backdrop-blur-3xl bg-slate-900/80">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-[1.25rem] bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/20">
            <Bus className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary font-headline italic tracking-tighter uppercase leading-none">AAGO</h1>
            <Badge className="bg-white/5 text-white/40 border-none text-[9px] font-black uppercase tracking-[0.3em] mt-2 px-3">Scholar Terminal</Badge>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-slate-500 hover:text-white transition-colors" onClick={handleSignOut}>
            <LogOut className="h-7 w-7" />
          </Button>
          <div className="h-14 w-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
            <Image 
              src={`https://picsum.photos/seed/${user?.uid || 'student'}/100/100`} 
              width={56} 
              height={56} 
              alt="Profile" 
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-12 max-w-2xl mx-auto w-full">
        <div className="flex justify-between items-start animate-in fade-in slide-in-from-top-6 duration-700">
          <div className="space-y-3">
            <h2 className="text-6xl font-black text-white font-headline italic uppercase tracking-tighter leading-[0.85]">
              Hi, <br/>{profile?.fullName?.split(' ')[0] || 'Scholar'}
            </h2>
            <p className="text-lg font-bold text-slate-500 italic flex items-center gap-3">
              <Star className="h-4 w-4 text-accent fill-accent" /> {profile?.collegeName || 'Aago Scholar'}
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleSOS} 
            disabled={isSendingSos}
            className="rounded-[2rem] h-20 w-20 shadow-[0_30px_60px_-15px_rgba(239,68,68,0.4)] active:scale-90 transition-all border-none"
          >
            {isSendingSos ? <Loader2 className="animate-spin" /> : <AlertTriangle className="h-10 w-10" />}
          </Button>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <div className="p-12 bg-primary rounded-[3rem] text-white shadow-[0_40px_80px_-20px_rgba(59,130,246,0.5)] flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                <div className="space-y-4 z-10">
                  <h3 className="text-5xl font-black font-headline italic uppercase tracking-tighter leading-none">Book Seat</h3>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-white/20 text-white border-none font-black text-[11px] px-4 py-1 uppercase tracking-widest">{activeTrips?.length || 0} Shuttles Live</Badge>
                  </div>
                </div>
                <div className="bg-white h-24 w-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
                  <Navigation className="h-12 w-12 text-primary" />
                </div>
            </div>
          </DialogTrigger>
          <DialogContent className="rounded-[4rem] bg-slate-900 border-white/5 p-0 overflow-hidden max-w-lg shadow-2xl text-white">
            <DialogHeader className="p-12 pb-6">
              <DialogTitle className="text-4xl font-black font-headline italic uppercase tracking-tighter leading-none">Live Dispatch</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 mt-4 text-lg italic">Active missions in the {profile?.city} region.</DialogDescription>
            </DialogHeader>
            <div className="px-10 pb-12 max-h-[60vh] overflow-y-auto space-y-6">
              {activeTrips?.length === 0 ? (
                <div className="py-24 text-center text-slate-600 font-black italic uppercase text-sm border-4 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center gap-6">
                  <Bus className="h-14 w-14 opacity-20" />
                  No Active Shuttles
                </div>
              ) : (
                activeTrips?.map((trip: any) => (
                  <div key={trip.id} className="p-8 bg-white/5 rounded-[2.5rem] flex items-center justify-between group hover:bg-primary transition-all">
                    <div className="space-y-2">
                      <h4 className="font-black text-white uppercase italic text-2xl leading-none">{trip.routeName}</h4>
                      <p className="text-[11px] font-black text-slate-500 group-hover:text-white/70 uppercase tracking-[0.2em] flex items-center gap-3 mt-3">
                        <Bus className="h-4 w-4" /> {trip.driverName} • {24 - (trip.riderCount || 0)} Seats
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleBookSeat(trip.id, trip.routeName)}
                      className="rounded-2xl font-black uppercase italic text-sm h-14 px-10 bg-primary group-hover:bg-white group-hover:text-primary transition-colors"
                    >
                      Board
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-2 gap-8">
          <Card className="border-none shadow-2xl bg-white rounded-[3.5rem] p-10 space-y-8 group">
             <div className="bg-accent/10 w-20 h-20 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <IndianRupee className="h-10 w-10 text-accent" />
             </div>
             <div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Scholar Wallet</p>
                <div className="flex items-center justify-between">
                  <p className="text-5xl font-black text-slate-950 font-headline italic leading-none">
                    ₹{profile?.credits || 0}
                  </p>
                  <Button size="icon" className="h-12 w-12 rounded-full bg-slate-950 text-white" onClick={handleTopUp} disabled={isToppingUp}>
                    {isToppingUp ? <Loader2 className="animate-spin h-6 w-6" /> : <Plus className="h-6 w-6" />}
                  </Button>
                </div>
             </div>
          </Card>
          
          <Dialog>
            <DialogTrigger asChild>
              <Card className="border-none shadow-2xl bg-white rounded-[3.5rem] p-10 space-y-8 cursor-pointer group hover:bg-primary/5 transition-all">
                 <div className="bg-primary/10 w-20 h-20 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode className="h-10 w-10 text-primary" />
                 </div>
                 <div>
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Boarding Pass</p>
                    <p className="text-5xl font-black text-slate-950 font-headline italic uppercase leading-none tracking-tighter">SHOW</p>
                 </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="rounded-[5rem] max-w-md bg-white text-center p-16 border-none shadow-2xl">
              <div className="bg-slate-50 p-12 rounded-[4rem] border-4 border-dashed border-slate-200 flex flex-col items-center gap-10 mt-6">
                <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-[12px] border-primary relative">
                  <QrCode className="h-56 w-56 text-primary" />
                  <div className="absolute inset-0 bg-primary/5 rounded-[3rem] animate-pulse -z-10" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-black text-4xl text-slate-950 uppercase italic leading-none tracking-tighter">{profile?.fullName}</h4>
                  <p className="text-[12px] font-black text-primary uppercase tracking-[0.4em] italic">{profile?.collegeName}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <section className="space-y-6">
           <div className="flex items-center justify-between px-4">
             <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-white/30 italic">Optimized Routes</h4>
             <span className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Info className="h-4 w-4" /> Hub Sync</span>
           </div>
           <div className="space-y-6">
              {activeRoutes.length === 0 ? (
                <div className="p-10 text-center text-slate-500 font-black italic uppercase">Updating Route Network...</div>
              ) : (
                activeRoutes.map((route: any) => (
                  <Dialog key={route.id}>
                    <DialogTrigger asChild>
                      <div className="flex items-center justify-between p-10 bg-white rounded-[3.5rem] shadow-2xl border-4 border-transparent group hover:border-primary/20 transition-all cursor-pointer active:scale-[0.98]">
                         <div className="flex items-center gap-8">
                            <div className="bg-primary/5 p-6 rounded-[2rem] group-hover:bg-primary/10 transition-colors">
                               <MapPin className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                               <p className="font-black text-slate-950 text-3xl italic uppercase leading-none tracking-tighter">{route.routeName}</p>
                               <div className="flex items-center gap-5">
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 italic"><Clock className="h-4 w-4" /> {route.schedule}</p>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 italic"><Navigation className="h-4 w-4" /> {route.estimatedDurationMinutes}m</p>
                               </div>
                            </div>
                         </div>
                         <ChevronRight className="h-8 w-8 text-slate-300" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="rounded-[6rem] bg-white max-w-xl p-0 overflow-hidden border-none shadow-2xl">
                      <div className="h-80 relative">
                        <Image 
                          src={getRouteImage(route.routeName) || ""} 
                          fill 
                          className="object-cover" 
                          alt={route.routeName} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                        <div className="absolute bottom-12 left-12">
                          <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none">{route.routeName}</h3>
                          <Badge className="bg-primary text-white border-none mt-6 font-black uppercase text-[10px] tracking-widest px-6 py-1.5">{profile?.city} Regional Path</Badge>
                        </div>
                      </div>
                      <div className="p-16 space-y-12">
                        <p className="text-xl font-bold text-slate-600 leading-relaxed italic border-l-8 border-primary/20 pl-8">{route.description}</p>
                        <div className="space-y-6">
                          <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.5em] italic">Verified Hub Stops</p>
                          <div className="flex flex-wrap gap-3">
                            {route.stops?.map((stop: string, i: number) => (
                              <Badge key={i} variant="secondary" className="bg-slate-100 text-[10px] font-black uppercase tracking-widest py-2.5 px-6 rounded-2xl">{stop}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))
              )}
           </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-10 bg-slate-900/90 backdrop-blur-3xl border-t border-white/5 z-50">
        <nav className="max-w-lg mx-auto flex justify-around items-center">
          <Button variant="ghost" className="flex-col h-auto py-3 gap-2 text-primary">
            <Bus className="h-9 w-9" />
            <span className="text-[10px] font-black uppercase tracking-widest">Commute</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-2 text-slate-500">
            <MapIcon className="h-9 w-9" />
            <span className="text-[10px] font-black uppercase tracking-widest">Radar</span>
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <div className="bg-primary h-24 w-24 rounded-[3rem] flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(59,130,246,0.6)] border-[10px] border-slate-900 -mt-24 active:scale-90 transition-all cursor-pointer">
                <QrCode className="h-10 w-10 text-white" />
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-[5rem] max-w-sm bg-white p-16 text-center border-none shadow-2xl">
              <div className="bg-slate-50 p-12 rounded-[4rem] relative overflow-hidden mb-10">
                <QrCode className="h-64 w-64 text-primary mx-auto relative z-10" />
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              </div>
              <h3 className="text-4xl font-black font-headline uppercase italic tracking-tighter leading-none">Access Ready</h3>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mt-5 italic">Verified Scholar Terminal</p>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" className="flex-col h-auto py-3 gap-2 text-slate-500">
            <Bell className="h-9 w-9" />
            <span className="text-[10px] font-black uppercase tracking-widest">Inbox</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-3 gap-2 text-slate-500">
            <Search className="h-9 w-9" />
            <span className="text-[10px] font-black uppercase tracking-widest">Search</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}
