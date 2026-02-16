
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
    googleMapsApiKey: "AIzaSyD_zDTswXAQsW62BC1hSsW24zPs675qv78"
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

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-body pb-28">
      {/* Premium Student Header */}
      <header className="bg-white px-6 py-6 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-primary font-headline italic tracking-tight leading-none uppercase">AAGO</h1>
            <Badge variant="outline" className="text-[7px] font-black uppercase tracking-widest mt-0.5 py-0 px-2 border-primary/20 text-primary">SCHOLAR TERMINAL</Badge>
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

      <main className="flex-1 p-6 space-y-8 max-w-xl mx-auto w-full">
        {/* Greetings & SOS */}
        <div className="flex justify-between items-start animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-950 font-headline italic uppercase tracking-tighter leading-none">
              Hi, {profile?.fullName?.split(' ')[0] || 'Scholar'}
            </h2>
            <p className="text-sm font-bold text-slate-400 italic flex items-center gap-2">
              <Star className="h-3 w-3 text-accent fill-accent" /> {profile?.collegeName || 'Aago Scholar'}
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleSOS} 
            disabled={isSendingSos}
            className="rounded-[1.5rem] h-14 w-14 shadow-2xl shadow-red-500/20 active:scale-90 transition-transform"
          >
            {isSendingSos ? <Loader2 className="animate-spin" /> : <AlertTriangle className="h-7 w-7" />}
          </Button>
        </div>

        {/* Primary Booking Card */}
        <Dialog>
          <DialogTrigger asChild>
            <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] bg-slate-950 text-white rounded-[2.5rem] overflow-hidden group active:scale-[0.98] transition-all cursor-pointer">
              <CardContent className="p-10 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-1/3 bg-primary/20 blur-[100px] -z-10" />
                <div className="space-y-3 z-10">
                  <h3 className="text-3xl font-black font-headline italic uppercase tracking-tighter leading-none">Book Seat</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white border-none font-black text-[9px] px-3 uppercase">{activeTrips?.length || 0} Shuttles Live</Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regional Hub</span>
                  </div>
                </div>
                <div className="bg-primary h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:rotate-12 transition-transform">
                  <Navigation className="h-8 w-8 text-white" />
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="rounded-[3rem] bg-white p-0 overflow-hidden max-w-md border-none shadow-2xl">
            <DialogHeader className="p-10 pb-4">
              <DialogTitle className="text-3xl font-black font-headline italic uppercase tracking-tighter text-slate-900 leading-none">Live Dispatch</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 mt-2">Active missions in the {profile?.city} region.</DialogDescription>
            </DialogHeader>
            <div className="px-8 pb-10 max-h-[60vh] overflow-y-auto space-y-4">
              {tripsLoading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></div>
              ) : activeTrips?.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-black italic uppercase text-xs border-4 border-dashed rounded-[2.5rem] flex flex-col items-center gap-4">
                  <Bus className="h-10 w-10 opacity-20" />
                  No Active Shuttles
                </div>
              ) : (
                activeTrips?.map((trip: any) => (
                  <div key={trip.id} className="p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-primary transition-colors border-2 border-transparent">
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 group-hover:text-white uppercase italic text-lg leading-none">{trip.routeName}</h4>
                      <p className="text-[10px] font-black text-slate-400 group-hover:text-white/60 uppercase tracking-widest flex items-center gap-2 mt-2">
                        <Bus className="h-3 w-3" /> {trip.driverName} • {24 - (trip.riderCount || 0)} Seats
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={() => handleBookSeat(trip.id, trip.routeName)}
                      className="rounded-2xl font-black uppercase italic text-xs h-12 px-8 bg-primary group-hover:bg-white group-hover:text-primary transition-colors"
                    >
                      Board
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="p-8 bg-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Scholar Balance</span>
                <span className="text-xl font-black text-slate-900">₹{profile?.credits || 0}</span>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl font-black uppercase text-[10px] border-slate-300 h-10 px-6" onClick={handleTopUp}>Add Funds</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
             <div className="bg-accent/10 w-14 h-14 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <IndianRupee className="h-7 w-7 text-accent" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Scholar Wallet</p>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-black text-slate-950 font-headline italic leading-none">
                    ₹{profile?.credits || 0}
                  </p>
                  <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-slate-100 text-slate-950" onClick={handleTopUp} disabled={isToppingUp}>
                    {isToppingUp ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </Button>
                </div>
             </div>
          </Card>
          <Dialog>
            <DialogTrigger asChild>
              <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 space-y-6 cursor-pointer group hover:bg-primary/5 transition-colors relative overflow-hidden">
                 <div className="bg-primary/10 w-14 h-14 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode className="h-7 w-7 text-primary" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Boarding Pass</p>
                    <p className="text-3xl font-black text-slate-950 font-headline italic uppercase leading-none">SHOW</p>
                 </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="rounded-[4rem] max-w-sm bg-white text-center p-12 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black font-headline italic uppercase tracking-tighter text-center leading-none">Digital ID</DialogTitle>
                <DialogDescription className="text-center font-bold text-slate-400 mt-2">Verified Scholar Identification</DialogDescription>
              </DialogHeader>
              <div className="p-10 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center gap-8 mt-4">
                <div className="bg-white p-6 rounded-[3rem] shadow-2xl border-8 border-primary relative">
                  <QrCode className="h-44 w-44 text-primary" />
                  <div className="absolute inset-0 bg-primary/5 rounded-[2rem] animate-pulse -z-10" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-black text-2xl text-slate-950 uppercase italic leading-none tracking-tighter">{profile?.fullName}</h4>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{profile?.collegeName}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Live GPS Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Live GPS Radar</h4>
            <Badge variant="outline" className="border-green-100 text-[8px] font-black uppercase text-green-600 bg-green-50 px-3">Fleet Active</Badge>
          </div>
          <Card className="overflow-hidden border-none shadow-2xl bg-white rounded-[3rem] h-72 relative group cursor-pointer ring-8 ring-white">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                options={{ disableDefaultUI: true, styles: [{ featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] }] }}
              >
                {activeDrivers?.map((driver: any) => (
                  driver.currentLat && driver.currentLng && (
                    <Marker 
                      key={driver.uid} 
                      position={{ lat: driver.currentLat, lng: driver.currentLng }}
                      title={driver.fullName}
                      icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    />
                  )
                ))}
              </GoogleMap>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-300 font-black italic uppercase text-xs">
                Syncing Satellites...
              </div>
            )}
          </Card>
        </section>

        {/* Route Discovery */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Optimized Routes</h4>
             <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1"><Info className="h-3 w-3" /> Hub Verified</span>
           </div>
           <div className="space-y-4">
              {routesLoading ? (
                <div className="py-10 text-center animate-pulse text-xs font-black text-slate-300 uppercase tracking-widest">Accessing Network...</div>
              ) : routes?.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
                  <p className="text-[10px] font-black text-slate-300 italic uppercase tracking-[0.2em]">No routes published in {profile?.city} yet.</p>
                </div>
              ) : (
                routes?.map((route: any) => (
                  <Dialog key={route.id}>
                    <DialogTrigger asChild>
                      <div className="flex items-center justify-between p-6 bg-white rounded-[2rem] shadow-lg border border-transparent group hover:border-primary/20 transition-all cursor-pointer active:scale-95">
                         <div className="flex items-center gap-6">
                            <div className="bg-primary/5 p-4 rounded-2xl group-hover:bg-primary/10 transition-colors">
                               <MapPin className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                               <p className="font-black text-slate-950 text-xl italic uppercase leading-none tracking-tighter">{route.routeName}</p>
                               <div className="flex items-center gap-3">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock className="h-3 w-3" /> {route.schedule}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Navigation className="h-3 w-3" /> {route.estimatedDurationMinutes}m</p>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <Camera className="h-4 w-4 text-slate-200" />
                           <ChevronRight className="h-5 w-5 text-slate-300" />
                         </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="rounded-[4rem] bg-white max-w-lg p-0 overflow-hidden border-none shadow-2xl">
                      <div className="h-64 relative">
                        <Image 
                          src={getRouteImage(route.routeName) || ""} 
                          fill 
                          className="object-cover" 
                          alt={route.routeName} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        <div className="absolute bottom-8 left-10">
                          <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">{route.routeName}</h3>
                          <Badge className="bg-primary text-white border-none mt-4 font-black uppercase text-[9px] tracking-widest px-4">{profile?.city} Hub Path</Badge>
                        </div>
                      </div>
                      <div className="p-10 space-y-8">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Route Intelligence</p>
                          <p className="text-base font-bold text-slate-600 leading-relaxed italic border-l-4 border-primary/20 pl-6">{route.description}</p>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Verified Stops</p>
                          <div className="flex flex-wrap gap-2">
                            {route.stops?.map((stop: string, i: number) => (
                              <Badge key={i} variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase tracking-widest py-1.5 px-4 rounded-xl">{stop}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="pt-4 flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                           <span>EST. DUR: {route.estimatedDurationMinutes}M</span>
                           <span>SYNCED LIVE</span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))
              )}
           </div>
        </section>
      </main>

      {/* Floating Student Nav */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 z-50 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)]">
        <nav className="max-w-md mx-auto flex justify-around items-center">
          <Button variant="ghost" className={`flex-col h-auto py-2 gap-1 ${activeTab === 'commute' ? 'text-primary' : 'text-slate-400'}`} onClick={() => setActiveTab('commute')}>
            <Bus className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Commute</span>
          </Button>
          <Button variant="ghost" className={`flex-col h-auto py-2 gap-1 ${activeTab === 'map' ? 'text-primary' : 'text-slate-400'}`} onClick={() => setActiveTab('map')}>
            <MapIcon className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Radar</span>
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <div className="bg-primary h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/40 border-[6px] border-white -mt-16 active:scale-90 transition-all cursor-pointer">
                <QrCode className="h-8 w-8 text-white" />
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-[4rem] max-w-sm bg-white p-12 text-center border-none shadow-2xl">
              <div className="bg-slate-50 p-10 rounded-[3rem] relative overflow-hidden mb-8">
                <QrCode className="h-56 w-56 text-primary mx-auto relative z-10" />
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              </div>
              <h3 className="text-3xl font-black font-headline uppercase italic tracking-tighter leading-none">Ready to Board</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Scan at shuttle entrance</p>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-slate-400">
            <Bell className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Inbox</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-slate-400">
            <Search className="h-7 w-7" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Search</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}
