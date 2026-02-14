
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Navigation,
  Phone,
  Power,
  Loader2,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { useUser, useDoc, useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Helper to map Lat/Lng to % positions on the visualization map
function getMarkerPos(lat?: number, lng?: number) {
  if (!lat || !lng) return { top: '50%', left: '50%' };
  const top = 100 - ((lat - 17.6) / (17.8 - 17.6)) * 100;
  const left = ((lng - 83.1) / (83.4 - 83.1)) * 100;
  return { 
    top: `${Math.max(5, Math.min(95, top))}%`, 
    left: `${Math.max(5, Math.min(95, left))}%` 
  };
}

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  // Sync active trip if any
  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, 'trips'), where('driverId', '==', user.uid), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveTrip({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      } else {
        setActiveTrip(null);
      }
    });
    return unsubscribe;
  }, [db, user?.uid]);

  // GPS Movement Simulation
  useEffect(() => {
    if (!userRef || profile?.status !== 'on-trip') return;

    const interval = setInterval(() => {
      const lat = (profile.currentLat || 17.6868) + (Math.random() - 0.5) * 0.002;
      const lng = (profile.currentLng || 83.2185) + (Math.random() - 0.5) * 0.002;
      
      updateDoc(userRef, {
        currentLat: lat,
        currentLng: lng,
        lastUpdated: serverTimestamp()
      }).catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, [userRef, profile?.status, profile?.currentLat, profile?.currentLng]);

  const toggleDuty = async () => {
    if (!userRef) return;
    setIsUpdating(true);
    try {
      const newStatus = profile?.status === 'offline' || !profile?.status ? 'available' : 'offline';
      await updateDoc(userRef, { status: newStatus });
      toast({ title: `Status: ${newStatus.toUpperCase()}` });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const startTrip = async (routeName: string) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const tripData = {
        driverId: user.uid,
        driverName: profile.fullName || "Driver",
        routeName,
        status: 'active',
        riderCount: 0,
        startTime: new Date().toISOString()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { 
        status: 'on-trip', 
        activeTripId: tripRef.id,
        currentLat: 17.6868,
        currentLng: 83.2185
      });
      toast({ title: "Trip Started", description: `Route: ${routeName}` });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const tripRef = doc(db, 'trips', activeTrip.id);
      await updateDoc(tripRef, { status: 'completed', endTime: new Date().toISOString() });
      await updateDoc(userRef, { 
        status: 'available', 
        activeTripId: null,
        totalTrips: (profile?.totalTrips || 0) + 1 
      });
      toast({ title: "Trip Completed", description: "Returning to available pool." });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || profile?.role !== 'driver') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8 space-y-6">
        <ShieldAlert className="h-20 w-20 text-destructive" />
        <h2 className="text-2xl font-black italic uppercase">Driver Only Access</h2>
        <p className="text-center text-slate-400">Please contact the Regional Administrator to be registered as an official Aago Driver.</p>
        <Button onClick={handleSignOut} className="w-full max-w-xs h-14 rounded-2xl font-black uppercase italic">Sign Out</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body">
      {/* Driver Header */}
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">
            {profile?.fullName?.[0] || 'D'}
          </div>
          <div>
            <h1 className="font-black italic uppercase tracking-tight leading-none">{profile?.fullName}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {user.uid.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`rounded-full px-4 h-8 font-black uppercase tracking-widest ${
            profile.status === 'available' ? 'bg-green-500/10 text-green-500' : 
            profile.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-slate-800 text-slate-500'
          }`}>
            {profile.status || 'offline'}
          </Badge>
          <Button 
            size="icon" 
            variant="ghost" 
            disabled={isUpdating}
            onClick={toggleDuty}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 h-12 w-12"
          >
            <Power className={`h-6 w-6 ${profile.status !== 'offline' ? 'text-green-500' : 'text-slate-500'}`} />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {!activeTrip ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black font-headline italic uppercase tracking-tighter">Your Hub</h2>
              <p className="text-sm font-bold text-slate-500">Vizag - Vizianagaram Highway Operations</p>
            </div>

            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Available Assignments</h3>
              {[
                { route: 'VZM -> GITAM Campus', time: '08:00 - 10:00' },
                { route: 'Vizag -> AU Special', time: '10:30 - 12:30' },
                { route: 'Downtown Shuttle', time: '14:00 - 17:00' },
              ].map((shift, i) => (
                <Card key={i} className="bg-slate-900 border-white/5 text-white shadow-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black font-headline italic uppercase text-primary">{shift.route}</h3>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {shift.time}</span>
                          <span className="flex items-center gap-1"><Bus className="h-3 w-3" /> Shuttle #AP-01</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => startTrip(shift.route)} 
                        disabled={profile.status !== 'available' || isUpdating}
                        className="bg-primary hover:bg-primary/90 rounded-2xl px-8 h-12 font-black italic uppercase shadow-lg shadow-primary/20"
                      >
                        Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            {/* Active GPS Navigation View */}
            <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative">
              <div className="relative h-64 w-full bg-slate-900">
                <Image 
                  src={mapImage?.imageUrl || "https://picsum.photos/seed/driver-nav/800/600"} 
                  fill 
                  className="object-cover opacity-40" 
                  alt="Navigation Map"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
                
                {/* Real-time self-marker */}
                <div 
                  className="absolute transition-all duration-1000" 
                  style={getMarkerPos(profile.currentLat, profile.currentLng)}
                >
                   <div className="bg-white p-3 rounded-full shadow-2xl animate-pulse">
                      <Navigation className="h-6 w-6 text-primary fill-primary" />
                   </div>
                </div>
                
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest italic">Live GPS Signal</span>
                </div>
              </div>

              <CardContent className="p-8 space-y-6 bg-primary relative -mt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-white/20 text-white mb-3 font-black uppercase tracking-widest text-[10px]">Active Region: AP-HIGHWAY</Badge>
                    <CardTitle className="text-3xl font-black font-headline italic uppercase tracking-tighter leading-none">{activeTrip.routeName}</CardTitle>
                    <p className="text-primary-foreground/60 font-bold text-xs mt-2 flex items-center gap-2">
                       <MapPin className="h-3 w-3 text-accent" /> {profile.currentLat?.toFixed(4)}, {profile.currentLng?.toFixed(4)}
                    </p>
                  </div>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl h-10 px-4 font-bold text-xs shrink-0">
                    <AlertCircle className="h-4 w-4 mr-2" /> SOS
                  </Button>
                </div>
                
                <div className="flex gap-4">
                  <Button className="flex-1 bg-white text-primary hover:bg-white/90 font-black h-16 rounded-[1.5rem] uppercase italic tracking-tighter text-lg shadow-xl">
                    <Navigation className="h-6 w-6 mr-2" /> Waze Link
                  </Button>
                  <Button 
                    onClick={endTrip} 
                    disabled={isUpdating}
                    variant="outline" 
                    className="flex-1 border-white/40 text-white hover:bg-white/10 font-black h-16 rounded-[1.5rem] uppercase italic tracking-tighter text-lg"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" /> : "Finish"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Boarding Manifest */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black font-headline uppercase italic tracking-tighter flex items-center gap-3">
                  <Users className="h-6 w-6 text-accent" /> Scholar Manifest
                </h3>
                <Badge variant="outline" className="text-slate-400 border-slate-800 font-bold px-4 py-1.5 rounded-full">{activeTrip.riderCount || 0} / 24 Seats</Badge>
              </div>
              
              <div className="space-y-3">
                {activeTrip.riderCount > 0 ? (
                   <p className="text-sm text-slate-500 font-bold italic p-4 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">Active scholars tracked via QR Link</p>
                ) : (
                  <div className="p-8 text-center bg-slate-900/50 rounded-[2rem] border border-white/5 space-y-2">
                    <Users className="h-10 w-10 mx-auto text-slate-700 opacity-50" />
                    <p className="font-bold text-slate-500 italic">No boardings recorded yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Driver Footer Navigation */}
      <nav className="p-6 pb-8 border-t border-white/5 bg-slate-900 flex justify-around items-center rounded-t-[2.5rem] shadow-2xl">
        <Button variant="ghost" className="flex-col gap-1.5 h-auto py-2 text-primary">
          <Bus className="h-7 w-7" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Operations</span>
        </Button>
        <Button variant="ghost" className="flex-col gap-1.5 h-auto py-2 text-slate-500">
          <Phone className="h-7 w-7" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Hub Desk</span>
        </Button>
        <Button variant="ghost" onClick={handleSignOut} className="flex-col gap-1.5 h-auto py-2 text-slate-500 hover:text-red-500">
          <LogOut className="h-7 w-7" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Clock Out</span>
        </Button>
      </nav>
    </div>
  );
}
