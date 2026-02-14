
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  AlertCircle, 
  Navigation,
  Phone,
  Power,
  Loader2,
  ShieldAlert,
  LogOut,
  Lock,
  PlusCircle,
  MessageSquarePlus
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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

  // Regional Route Filtering - only show active ones
  const regionalRoutesQuery = useMemo(() => {
    if (!db || !profile?.city) return null;
    return query(collection(db, 'routes'), where('city', '==', profile.city), where('status', '==', 'active'));
  }, [db, profile?.city]);
  
  const { data: regionalRoutes } = useCollection(regionalRoutesQuery);

  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Route Suggestion Form State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedRouteName, setSuggestedRouteName] = useState('');
  const [suggestedStops, setSuggestedStops] = useState('');
  const [suggestedSchedule, setSuggestedSchedule] = useState('');
  const [suggestedDescription, setSuggestedDescription] = useState('');
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);

  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (!userRef || profile?.status !== 'on-trip') return;
    const interval = setInterval(() => {
      const lat = (profile.currentLat || 17.6868) + (Math.random() - 0.5) * 0.002;
      const lng = (profile.currentLng || 83.2185) + (Math.random() - 0.5) * 0.002;
      updateDoc(userRef, { currentLat: lat, currentLng: lng, lastUpdated: serverTimestamp() }).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [userRef, profile?.status, profile?.currentLat, profile?.currentLng]);

  const isWithinTimeWindow = (scheduledTimeStr: string) => {
    if (!scheduledTimeStr) return true;
    try {
      const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      const diffMs = scheduledTime.getTime() - currentTime.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      return diffMinutes <= 120 && diffMinutes >= -180; 
    } catch (e) {
      return true;
    }
  };

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
      toast({ title: "Trip Completed" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuggestRoute = async () => {
    if (!db || !user || !profile) return;
    setIsSuggesting(true);
    try {
      await addDoc(collection(db, 'routes'), {
        routeName: suggestedRouteName,
        stops: suggestedStops.split(',').map(s => s.trim()),
        schedule: suggestedSchedule,
        description: suggestedDescription,
        city: profile.city,
        status: 'suggested',
        isActive: false,
        suggestedBy: user.uid,
        driverName: profile.fullName,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Proposal Submitted", description: "Admin will review your suggested route." });
      setIsSuggestDialogOpen(false);
      // Reset form
      setSuggestedRouteName('');
      setSuggestedStops('');
      setSuggestedSchedule('');
      setSuggestedDescription('');
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Submission Failed" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth!);
    router.push('/');
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (!user || profile?.role !== 'driver') return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8 space-y-6">
      <ShieldAlert className="h-20 w-20 text-destructive" />
      <h2 className="text-2xl font-black italic uppercase">Driver Only Access</h2>
      <Button onClick={handleSignOut} className="w-full max-w-xs h-14 rounded-2xl font-black uppercase italic">Sign Out</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">{profile?.fullName?.[0]}</div>
          <div>
            <h1 className="font-black italic uppercase tracking-tight leading-none">{profile?.fullName}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">HUB: {profile.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`rounded-full px-4 h-8 font-black uppercase tracking-widest ${profile.status === 'available' ? 'bg-green-500/10 text-green-500' : profile.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-slate-800 text-slate-500'}`}>{profile.status || 'offline'}</Badge>
          <Button size="icon" variant="ghost" disabled={isUpdating} onClick={toggleDuty} className="rounded-2xl bg-slate-800 hover:bg-slate-700 h-12 w-12"><Power className={`h-6 w-6 ${profile.status !== 'offline' ? 'text-green-500' : 'text-slate-500'}`} /></Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {!activeTrip ? (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h2 className="text-3xl font-black font-headline italic uppercase tracking-tighter">{profile.city} Assignments</h2>
              <Dialog open={setIsSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl border-primary/20 bg-primary/10 text-primary font-bold gap-2">
                    <MessageSquarePlus className="h-4 w-4" /> Suggest Route
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2.5rem] bg-slate-900 border-white/10 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black font-headline italic uppercase text-primary">Propose New Route</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold">Driver-suggested paths based on regional expertise.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Route Title</Label>
                      <Input 
                        value={suggestedRouteName} 
                        onChange={(e) => setSuggestedRouteName(e.target.value)} 
                        placeholder="e.g. North Hub Express" 
                        className="bg-slate-800 border-none rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Stops (Comma separated)</Label>
                      <Input 
                        value={suggestedStops} 
                        onChange={(e) => setSuggestedStops(e.target.value)} 
                        placeholder="Stop 1, Stop 2, Stop 3" 
                        className="bg-slate-800 border-none rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Operational Timing</Label>
                      <Input 
                        value={suggestedSchedule} 
                        onChange={(e) => setSuggestedSchedule(e.target.value)} 
                        placeholder="e.g. 8 AM - 10 AM, Hourly" 
                        className="bg-slate-800 border-none rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Expert Description</Label>
                      <Textarea 
                        value={suggestedDescription} 
                        onChange={(e) => setSuggestedDescription(e.target.value)} 
                        placeholder="Why is this route needed?" 
                        className="bg-slate-800 border-none rounded-xl min-h-[100px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleSuggestRoute} 
                      disabled={isSuggesting || !suggestedRouteName}
                      className="w-full bg-primary h-14 rounded-xl font-black uppercase italic"
                    >
                      {isSuggesting ? <Loader2 className="animate-spin" /> : "Submit for Approval"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Regional Missions</h3>
              {regionalRoutes?.map((route: any) => {
                const canStart = isWithinTimeWindow(route.scheduledTime);
                return (
                  <Card key={route.id} className="bg-slate-900 border-white/5 text-white shadow-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black font-headline italic uppercase text-primary">{route.routeName}</h3>
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.scheduledTime || route.schedule}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {route.stops?.length} Stops</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           {!canStart && <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-500 gap-1"><Lock className="h-2 w-2" /> Locked</Badge>}
                           <Button 
                            onClick={() => startTrip(route.routeName)} 
                            disabled={profile.status !== 'available' || isUpdating || !canStart}
                            className={`${canStart ? 'bg-primary' : 'bg-slate-800'} hover:bg-primary/90 rounded-2xl px-8 h-12 font-black italic uppercase shadow-lg`}
                          >
                            {canStart ? 'Start' : 'Locked'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {regionalRoutes?.length === 0 && (
                <div className="p-12 text-center bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800 text-slate-500 font-bold italic">No missions published for {profile.city} yet.</div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative">
              <div className="relative h-64 w-full bg-slate-900">
                <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-40" alt="Navigation Map" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
                <div className="absolute transition-all duration-1000" style={getMarkerPos(profile.currentLat, profile.currentLng)}>
                   <div className="bg-white p-3 rounded-full shadow-2xl animate-pulse"><Navigation className="h-6 w-6 text-primary fill-primary" /></div>
                </div>
              </div>
              <CardContent className="p-8 space-y-6 bg-primary relative -mt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-white/20 text-white mb-3 font-black uppercase tracking-widest text-[10px]">Mission Active: {profile.city}</Badge>
                    <CardTitle className="text-3xl font-black font-headline italic uppercase tracking-tighter leading-none">{activeTrip.routeName}</CardTitle>
                    <p className="text-primary-foreground/60 font-bold text-xs mt-2 flex items-center gap-2"><MapPin className="h-3 w-3 text-accent" /> {profile.currentLat?.toFixed(4)}, {profile.currentLng?.toFixed(4)}</p>
                  </div>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl h-10 px-4 font-bold text-xs">SOS</Button>
                </div>
                <div className="flex gap-4">
                  <Button className="flex-1 bg-white text-primary hover:bg-white/90 font-black h-16 rounded-[1.5rem] uppercase italic tracking-tighter text-lg shadow-xl"><Navigation className="h-6 w-6 mr-2" /> Navigate</Button>
                  <Button onClick={endTrip} disabled={isUpdating} variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/10 font-black h-16 rounded-[1.5rem] uppercase italic tracking-tighter text-lg">{isUpdating ? <Loader2 className="animate-spin" /> : "Finish"}</Button>
                </div>
              </CardContent>
            </Card>
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black font-headline uppercase italic tracking-tighter flex items-center gap-3"><Users className="h-6 w-6 text-accent" /> Scholar Manifest</h3>
                <Badge variant="outline" className="text-slate-400 border-slate-800 font-bold px-4 py-1.5 rounded-full">{activeTrip.riderCount || 0} / 24 Seats</Badge>
              </div>
              <div className="p-8 text-center bg-slate-900/50 rounded-[2rem] border border-white/5 space-y-2">
                <Users className="h-10 w-10 mx-auto text-slate-700 opacity-50" />
                <p className="font-bold text-slate-500 italic">Scholars tracked via live QR boarding.</p>
              </div>
            </section>
          </div>
        )}
      </main>

      <nav className="p-6 pb-8 border-t border-white/5 bg-slate-900 flex justify-around items-center rounded-t-[2.5rem] shadow-2xl">
        <Button variant="ghost" className="flex-col gap-1.5 h-auto py-2 text-primary"><Bus className="h-7 w-7" /><span className="text-[10px] font-black uppercase tracking-widest italic">Operations</span></Button>
        <Button variant="ghost" className="flex-col gap-1.5 h-auto py-2 text-slate-500"><Phone className="h-7 w-7" /><span className="text-[10px] font-black uppercase tracking-widest italic">Hub Desk</span></Button>
        <Button variant="ghost" onClick={handleSignOut} className="flex-col gap-1.5 h-auto py-2 text-slate-500 hover:text-red-500"><LogOut className="h-7 w-7" /><span className="text-[10px] font-black uppercase tracking-widest italic">Clock Out</span></Button>
      </nav>
    </div>
  );
}
