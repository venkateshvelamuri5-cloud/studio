
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
} from 'lucide-react';
import Image from 'next/image';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, orderBy, arrayUnion, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  });

  const [isBooking, setIsBooking] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [isSendingSos, setIsSendingSos] = useState(false);
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const routesQuery = useMemo(() => db ? query(collection(db, 'routes'), where('isActive', '==', true), orderBy('createdAt', 'desc')) : null, [db]);
  const { data: routes, loading: routesLoading } = useCollection(routesQuery);

  const tripsQuery = useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]);
  const { data: activeTrips, loading: tripsLoading } = useCollection(tripsQuery);

  const { data: activeDrivers } = useCollection(
    useMemo(() => db ? query(collection(db, 'users'), where('status', '==', 'on-trip')) : null, [db])
  );

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
        description: "Emergency hub has been notified of your location.",
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
        title: "Credits Added",
        description: "₹500 has been added to your Aago wallet.",
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
        description: "Please top up your wallet to book a seat (Min ₹50).",
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
        title: "Seat Confirmed",
        description: `You are booked on ${routeName}. Happy commuting!`,
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Booking Failed" });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-body pb-28">
      <header className="bg-white px-6 py-6 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-primary font-headline italic tracking-tight leading-none uppercase">AAGO</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{profile?.city || 'Regional'} Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="rounded-xl text-slate-400" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden">
            <Image 
              src={`https://picsum.photos/seed/${user?.uid || 'student'}/100/100`} 
              width={40} 
              height={40} 
              alt="Profile" 
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-xl mx-auto w-full">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 font-headline italic uppercase tracking-tighter">
              Hi, {profile?.fullName?.split(' ')[0] || 'Scholar'}!
            </h2>
            <p className="text-sm font-bold text-slate-500 italic">Ready for your campus commute?</p>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleSOS} 
            disabled={isSendingSos}
            className="rounded-2xl h-14 w-14 shadow-xl shadow-red-500/20"
          >
            {isSendingSos ? <Loader2 className="animate-spin" /> : <AlertTriangle className="h-6 w-6" />}
          </Button>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Card className="border-none shadow-xl bg-primary text-white rounded-[2rem] overflow-hidden group active:scale-[0.98] transition-transform cursor-pointer">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-headline italic uppercase tracking-tighter">Book a Seat</h3>
                  <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {activeTrips?.length} Shuttles Live Now
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl group-hover:rotate-12 transition-transform">
                  <Navigation className="h-8 w-8 text-white" />
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] bg-white p-0 overflow-hidden max-w-md">
            <DialogHeader className="p-8 pb-0">
              <DialogTitle className="text-2xl font-black font-headline italic uppercase tracking-tighter">Available Shuttles</DialogTitle>
              <DialogDescription className="font-bold">Select an active trip to confirm your seat.</DialogDescription>
            </DialogHeader>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {tripsLoading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>
              ) : activeTrips?.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold italic uppercase text-xs border-2 border-dashed rounded-3xl">
                  No active shuttles in your region
                </div>
              ) : (
                activeTrips?.map((trip: any) => (
                  <div key={trip.id} className="p-5 bg-secondary/50 rounded-2xl flex items-center justify-between group hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20">
                    <div className="space-y-1">
                      <h4 className="font-black text-primary uppercase italic text-sm">{trip.routeName}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Bus className="h-3 w-3" /> {trip.driverName} &bull; {24 - (trip.riderCount || 0)} Seats Left
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleBookSeat(trip.id, trip.routeName)}
                      className="rounded-xl font-black uppercase italic text-[10px] h-10 px-6 shadow-lg shadow-primary/20"
                    >
                      Join
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Balance: ₹{profile?.credits || 0}</span>
              <Button variant="ghost" className="text-[10px] font-black uppercase text-primary" onClick={handleTopUp}>Add Credits</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-lg bg-white rounded-[1.5rem] p-5 space-y-3 relative overflow-hidden group">
             <div className="bg-accent/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <IndianRupee className="h-5 w-5 text-accent" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-black text-slate-900">
                    {profileLoading ? '...' : `₹${profile?.credits || 0}`}
                  </p>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-accent" onClick={handleTopUp} disabled={isToppingUp}>
                    {isToppingUp ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
             </div>
          </Card>
          <Dialog>
            <DialogTrigger asChild>
              <Card className="border-none shadow-lg bg-white rounded-[1.5rem] p-5 space-y-3 cursor-pointer group hover:bg-blue-50/50 transition-colors">
                 <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode className="h-5 w-5 text-blue-600" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital ID</p>
                    <p className="text-xl font-black text-slate-900 uppercase italic">Show</p>
                 </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] max-w-sm bg-white text-center p-12 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline italic uppercase tracking-tighter text-center">Your Scholar ID</DialogTitle>
                <DialogDescription className="text-center font-bold">Present this to the driver during boarding.</DialogDescription>
              </DialogHeader>
              <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-primary">
                  <QrCode className="h-40 w-40 text-primary" />
                </div>
                <div>
                  <p className="font-black text-slate-900 uppercase italic">{profile?.fullName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{profile?.collegeName}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Live GPS Intelligence</h4>
            <Badge variant="outline" className="border-slate-200 text-[8px] font-black uppercase text-green-600 bg-green-50">Fleet Secure</Badge>
          </div>
          <Card className="overflow-hidden border-none shadow-lg bg-white rounded-[2rem] h-64 relative group cursor-pointer">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                options={{ disableDefaultUI: true }}
              >
                {activeDrivers?.map((driver: any) => (
                  driver.currentLat && driver.currentLng && (
                    <Marker 
                      key={driver.id} 
                      position={{ lat: driver.currentLat, lng: driver.currentLng }}
                      title={driver.fullName}
                      icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    />
                  )
                ))}
              </GoogleMap>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold italic">
                Initializing Maps...
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Optimized Routes</h4>
             <span className="text-[10px] font-bold text-slate-400">MANAGED BY AAGO</span>
           </div>
           <div className="space-y-3">
              {routesLoading ? (
                <div className="p-4 text-center animate-pulse text-xs font-bold text-slate-400">Syncing Network...</div>
              ) : routes?.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed">
                  <p className="text-xs font-bold text-slate-400 italic">No routes published by Admin yet.</p>
                </div>
              ) : (
                routes?.map((route: any) => (
                  <div key={route.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 group hover:border-primary/20 transition-colors cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl group-hover:bg-primary/5">
                           <MapPin className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                        </div>
                        <div>
                           <p className="font-black text-slate-900 text-sm italic uppercase">{route.routeName}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{route.schedule} &bull; {route.estimatedDurationMinutes}m</p>
                        </div>
                     </div>
                     <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                ))
              )}
           </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50">
        <nav className="max-w-md mx-auto flex justify-around items-center">
          <Button variant="ghost" className="flex-col h-auto py-1 gap-1 text-primary">
            <Bus className="h-6 w-6" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Commute</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-1 gap-1 text-slate-400 hover:text-primary">
            <Search className="h-6 w-6" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Search</span>
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <div className="bg-accent h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/40 border-4 border-white -mt-10 hover:scale-105 transition-transform cursor-pointer">
                <QrCode className="h-7 w-7 text-white" />
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] max-w-sm bg-white p-12 text-center">
              <QrCode className="h-48 w-48 text-primary mx-auto mb-6" />
              <h3 className="text-xl font-black font-headline uppercase italic">Ready to Board</h3>
              <p className="text-xs font-bold text-slate-500">Scan this at the shuttle entrance</p>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" className="flex-col h-auto py-1 gap-1 text-slate-400 hover:text-primary">
            <MapIcon className="h-6 w-6" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Map</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-1 gap-1 text-slate-400 hover:text-primary">
            <Bell className="h-6 w-6" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Inbox</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}
