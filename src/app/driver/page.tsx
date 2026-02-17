
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bus, 
  Clock, 
  Navigation,
  Phone,
  Power,
  Loader2,
  ShieldAlert,
  LogOut,
  MessageSquarePlus,
  IndianRupee,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useUser, useDoc, useFirestore, useAuth, useCollection } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, onSnapshot, query, where, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

import {
  Dialog as ShadDialog,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogTrigger as ShadDialogTrigger,
  DialogFooter as ShadDialogFooter
} from "@/components/ui/dialog";

const containerStyle = {
  width: '100%',
  height: '100%'
};

export default function DriverConsole() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const [activeTab, setActiveTab] = useState<'missions' | 'earnings' | 'support'>('missions');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const allRoutesQuery = useMemo(() => db ? query(collection(db, 'routes')) : null, [db]);
  const { data: allRoutes } = useCollection(allRoutesQuery);

  const regionalRoutes = useMemo(() => {
    if (!allRoutes || !profile?.city) return [];
    // Show only active routes approved by admin
    return allRoutes.filter(r => r.city === profile.city && r.status === 'active');
  }, [allRoutes, profile?.city]);

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedRouteName, setSuggestedRouteName] = useState('');
  const [suggestedStops, setSuggestedStops] = useState('');
  const [suggestedDescription, setSuggestedDescription] = useState('');
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);

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
      updateDoc(userRef, { currentLat: lat, currentLng: lng, lastUpdated: serverTimestamp() }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [userRef, profile?.status, profile?.currentLat, profile?.currentLng]);

  const handleSOS = async () => {
    if (!db || !user || !profile) return;
    setIsSendingSos(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        senderId: user.uid,
        senderName: profile.fullName,
        role: 'driver',
        status: 'active',
        lat: profile.currentLat || 17.6868,
        lng: profile.currentLng || 83.2185,
        timestamp: new Date().toISOString()
      });
      toast({
        variant: "destructive",
        title: "SOS Alert Dispatched",
        description: "Admin Terminal has received your emergency signal.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingSos(false);
    }
  };

  const isWithinTimeWindow = (scheduledTimeStr: string) => {
    if (!scheduledTimeStr) return true;
    try {
      const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      const diffMs = scheduledTime.getTime() - currentTime.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      return diffMinutes <= 120 && diffMinutes >= -180; 
    } catch {
      return true;
    }
  };

  const toggleDuty = async () => {
    if (!userRef) return;
    setIsUpdating(true);
    try {
      const newStatus = profile?.status === 'offline' || !profile?.status ? 'available' : 'offline';
      await updateDoc(userRef, { status: newStatus });
      toast({ title: `Shift: ${newStatus.toUpperCase()}` });
    } catch {
      toast({ variant: "destructive", title: "Network Error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const startTrip = async (routeName: string, basePay: number = 150) => {
    if (!db || !user || !profile) return;
    setIsUpdating(true);
    try {
      const tripData = {
        driverId: user.uid,
        driverName: profile.fullName || "Driver",
        routeName,
        basePayout: basePay,
        status: 'active',
        riderCount: 0,
        passengers: [],
        startTime: new Date().toISOString()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      await updateDoc(userRef!, { 
        status: 'on-trip', 
        activeTripId: tripRef.id,
        currentLat: 17.6868,
        currentLng: 83.2185
      });
      toast({ title: "Mission Active", description: `Route: ${routeName}` });
    } catch {
      toast({ variant: "destructive", title: "Trip Error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const endTrip = async () => {
    if (!db || !activeTrip || !userRef) return;
    setIsUpdating(true);
    try {
      const finalPayout = (activeTrip.basePayout || 150) + (activeTrip.riderCount || 0) * 10;
      const tripRef = doc(db, 'trips', activeTrip.id);
      
      await updateDoc(tripRef, { 
        status: 'completed', 
        endTime: new Date().toISOString(),
        payoutAmount: finalPayout
      });

      await updateDoc(userRef, { 
        status: 'available', 
        activeTripId: null,
        totalTrips: increment(1),
        totalEarnings: increment(finalPayout),
        weeklyEarnings: increment(finalPayout)
      });
      
      toast({ title: "Mission Completed", description: `Earnings: ₹${finalPayout} synced.` });
    } catch {
      toast({ variant: "destructive", title: "Sync Failed" });
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
        description: suggestedDescription,
        city: profile.city,
        status: 'suggested', // Admin needs to approve this
        isActive: false,
        suggestedBy: user.uid,
        driverName: profile.fullName,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Proposal Submitted", description: "Admin will review your suggested path." });
      setIsSuggestDialogOpen(false);
      setSuggestedRouteName('');
      setSuggestedStops('');
      setSuggestedDescription('');
    } catch {
      toast({ variant: "destructive", title: "Error submitting suggestion" });
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
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-8">
      <ShieldAlert className="h-20 w-20 text-destructive mb-6" />
      <h2 className="text-2xl font-black italic uppercase">Terminal Restricted</h2>
      <Button onClick={handleSignOut} className="mt-4 w-full max-w-xs h-14 bg-primary rounded-2xl font-black uppercase italic">Sign Out</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-body pb-24">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center font-black text-xl">{profile?.fullName?.[0]}</div>
          <div>
            <h1 className="font-black italic uppercase text-sm leading-none">{profile?.fullName}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">HUB: {profile?.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="destructive" 
            onClick={handleSOS} 
            disabled={isSendingSos} 
            className="rounded-xl h-12 w-12 shadow-2xl shadow-red-500/20"
          >
            {isSendingSos ? <Loader2 className="animate-spin" /> : <AlertTriangle className="h-6 w-6" />}
          </Button>
          <Button size="icon" variant="ghost" disabled={isUpdating} onClick={toggleDuty} className="rounded-2xl bg-slate-800 h-12 w-12"><Power className={`h-6 w-6 ${profile?.status !== 'offline' ? 'text-green-500' : 'text-slate-500'}`} /></Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {activeTab === 'missions' && (
          <>
            {!activeTrip ? (
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h2 className="text-2xl font-black font-headline italic uppercase">Hub Missions</h2>
                  <ShadDialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
                    <ShadDialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl border-white/10 bg-white/5 text-xs font-bold gap-2">
                        <MessageSquarePlus className="h-4 w-4" /> Propose Route
                      </Button>
                    </ShadDialogTrigger>
                    <ShadDialogContent className="rounded-[2rem] bg-slate-900 border-white/10 text-white">
                      <ShadDialogHeader>
                        <ShadDialogTitle className="font-black italic uppercase text-primary">Suggest New Path</ShadDialogTitle>
                      </ShadDialogHeader>
                      <div className="space-y-4 py-4">
                        <Input value={suggestedRouteName} onChange={(e) => setSuggestedRouteName(e.target.value)} placeholder="Route Name" className="bg-slate-800 border-none rounded-xl" />
                        <Input value={suggestedStops} onChange={(e) => setSuggestedStops(e.target.value)} placeholder="Stops (comma separated)" className="bg-slate-800 border-none rounded-xl" />
                        <Textarea value={suggestedDescription} onChange={(e) => setSuggestedDescription(e.target.value)} placeholder="Why is this route needed?" className="bg-slate-800 border-none rounded-xl" />
                      </div>
                      <ShadDialogFooter>
                        <Button onClick={handleSuggestRoute} disabled={isSuggesting || !suggestedRouteName} className="w-full bg-primary h-14 rounded-xl font-black uppercase italic">Submit Proposal</Button>
                      </ShadDialogFooter>
                    </ShadDialogContent>
                  </ShadDialog>
                </div>

                <section className="space-y-4">
                  {regionalRoutes.length === 0 ? (
                    <div className="p-10 text-center border-4 border-dashed rounded-[2rem] text-slate-500 font-black italic uppercase">No active routes for this Hub.</div>
                  ) : (
                    regionalRoutes.map((route: any) => {
                      const canStart = isWithinTimeWindow(route.scheduledTime);
                      return (
                        <Card key={route.id} className="bg-slate-900 border-white/5 text-white hover:ring-2 hover:ring-primary transition-all">
                          <CardContent className="p-6 flex justify-between items-center">
                            <div className="space-y-1">
                              <h3 className="text-xl font-black italic uppercase text-primary">{route.routeName}</h3>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.scheduledTime || "On Demand"}</span>
                                <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> ₹{route.basePayout || 150}</span>
                              </div>
                            </div>
                            <Button onClick={() => startTrip(route.routeName, route.basePayout)} disabled={profile?.status !== 'available' || isUpdating || !canStart} className={`${canStart ? 'bg-primary' : 'bg-slate-800'} rounded-2xl h-12 font-black italic uppercase`}>
                              {canStart ? 'Start Mission' : 'Locked'}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                  <div className="h-64 relative bg-slate-900">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={{ lat: profile?.currentLat || 17.6868, lng: profile?.currentLng || 83.2185 }}
                        zoom={16}
                        options={{ disableDefaultUI: true }}
                      >
                        <Marker position={{ lat: profile?.currentLat || 17.6868, lng: profile?.currentLng || 83.2185 }} />
                      </GoogleMap>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-black uppercase italic">
                        Loading GPS...
                      </div>
                    )}
                  </div>
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <Badge className="bg-white/20 text-white mb-2 font-black uppercase text-[8px]">Active Mission: {profile?.city}</Badge>
                      <h2 className="text-3xl font-black italic uppercase">{activeTrip.routeName}</h2>
                    </div>
                    <div className="flex gap-4">
                      <Button className="flex-1 bg-white text-primary hover:bg-white/90 font-black h-16 rounded-2xl uppercase italic">Navigate</Button>
                      <Button onClick={endTrip} disabled={isUpdating} variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/10 font-black h-16 rounded-2xl uppercase italic">
                        {isUpdating ? <Loader2 className="animate-spin" /> : "Complete"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem]">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Today's Take</p>
                <h3 className="text-3xl font-black italic text-primary mt-1">₹{(profile?.weeklyEarnings || 0) % 1000}</h3>
              </Card>
              <Card className="bg-slate-900 border-white/5 p-6 rounded-[2rem]">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Weekly Payout</p>
                <h3 className="text-3xl font-black italic text-accent mt-1">₹{profile?.weeklyEarnings || 0}</h3>
              </Card>
            </div>
            
            <Card className="bg-primary text-white border-none rounded-[2.5rem] p-8">
               <div className="flex items-center justify-between">
                 <div>
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Lifetime Earnings</p>
                    <h2 className="text-5xl font-black italic font-headline mt-2">₹{profile?.totalEarnings || 0}</h2>
                 </div>
                 <Wallet className="h-16 w-16 opacity-20" />
               </div>
               <p className="text-xs font-bold mt-6 opacity-80 leading-relaxed">Payments are processed every Monday at 06:00 AM Regional Time.</p>
            </Card>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900 border-t border-white/5 flex justify-around items-center rounded-t-[2.5rem] shadow-2xl z-50">
        <Button variant="ghost" onClick={() => setActiveTab('missions')} className={`flex-col gap-1 h-auto py-1 ${activeTab === 'missions' ? 'text-primary' : 'text-slate-500'}`}><Bus className="h-6 w-6" /><span className="text-[8px] font-black uppercase italic">Missions</span></Button>
        <Button variant="ghost" onClick={() => setActiveTab('earnings')} className={`flex-col gap-1 h-auto py-1 ${activeTab === 'earnings' ? 'text-primary' : 'text-slate-500'}`}><IndianRupee className="h-6 w-6" /><span className="text-[8px] font-black uppercase italic">Earnings</span></Button>
        <Button variant="ghost" className="flex-col gap-1 h-auto py-1 text-slate-500"><Phone className="h-6 w-6" /><span className="text-[8px] font-black uppercase italic">Support</span></Button>
        <Button variant="ghost" onClick={handleSignOut} className="flex-col gap-1 h-auto py-1 text-slate-500"><LogOut className="h-6 w-6" /><span className="text-[8px] font-black uppercase italic">Exit</span></Button>
      </nav>
    </div>
  );
}
