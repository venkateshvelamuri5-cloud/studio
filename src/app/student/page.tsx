"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bus, 
  MapPin, 
  Search, 
  Clock, 
  Calendar, 
  Users, 
  Bell, 
  Menu,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Map as MapIcon,
  CreditCard,
  IndianRupee,
  Smartphone,
  GraduationCap,
  LogOut,
  MapPinned
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { useUser, useDoc, useAuth, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function RiderDashboard() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const liveMapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const availableShuttles = [
    { id: 1, route: 'VZM -> Vizag Express', time: '8:30 AM', status: 'On Time', seats: '4 Left' },
    { id: 2, route: 'Vizag -> GITAM Loop', time: '8:45 AM', status: 'Delayed 5m', seats: '12 Left' },
    { id: 3, route: 'AU Campus Shuttle', time: '9:00 AM', status: 'On Time', seats: '8 Left' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-body pb-32">
      {/* App Header */}
      <header className="bg-primary text-white p-6 pt-10 flex items-center justify-between shadow-xl z-10 rounded-b-[2.5rem]">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-2xl">
            <Menu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black font-headline tracking-tight leading-none italic uppercase">AAGO</h1>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">
              Namaste, {profile?.fullName?.split(' ')[0] || 'Scholar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-white hover:bg-white/10 rounded-xl">
            <LogOut className="h-5 w-5" />
          </Button>
          <div className="relative bg-white/10 p-2 rounded-2xl">
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 bg-accent text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black ring-2 ring-primary">2</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-accent flex items-center justify-center border-2 border-white/20 font-black text-white shadow-lg shadow-accent/20 uppercase">
            {profile?.fullName?.[0] || 'S'}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-xl mx-auto w-full">
        {/* Quick Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-primary/40 group-focus-within:text-primary" />
          </div>
          <Input 
            className="pl-14 h-16 rounded-[1.5rem] border-none shadow-xl bg-white text-lg font-bold placeholder:text-muted-foreground/50 focus-visible:ring-accent"
            placeholder="Search College / Campus"
          />
        </div>

        {/* Live Tracking Map Card */}
        <Card className="overflow-hidden border-none shadow-2xl bg-white rounded-[2.5rem]">
          <div className="relative h-64 w-full bg-muted">
            <Image 
              src={liveMapImage?.imageUrl || "https://picsum.photos/seed/map-ap/800/400"} 
              fill 
              className="object-cover opacity-90" 
              alt="Live Map"
              data-ai-hint="andhra map"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-accent p-3 rounded-full shadow-[0_0_20px_rgba(255,165,0,0.5)] animate-pulse border-4 border-white">
                <Bus className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="absolute top-6 left-6">
              <Badge className="bg-white/95 text-primary hover:bg-white font-black py-2 px-4 border-none rounded-2xl shadow-xl backdrop-blur-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  VZM-VIZAG HIGHWAY: LIGHT
                </span>
              </Badge>
            </div>
          </div>
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-2xl font-headline text-primary italic uppercase tracking-tight">GITAM Campus #4</h3>
                <p className="text-sm text-muted-foreground font-bold flex items-center gap-2 mt-1 uppercase italic">
                  <Clock className="h-4 w-4 text-accent" /> Arriving in 5 mins
                </p>
              </div>
              <Button className="bg-primary hover:bg-primary/90 rounded-2xl px-8 h-12 font-black shadow-lg shadow-primary/20 italic">
                TRACK
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-6">
          <Button variant="outline" className="h-32 flex-col gap-3 rounded-[2rem] border-none bg-white shadow-xl hover:bg-secondary transition-all group">
            <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary group-hover:rotate-12 transition-all">
              <Calendar className="h-7 w-7 text-primary group-hover:text-white" />
            </div>
            <span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground italic">Book Seat</span>
          </Button>
          <Button variant="outline" className="h-32 flex-col gap-3 rounded-[2rem] border-none bg-white shadow-xl hover:bg-secondary transition-all group">
            <div className="bg-accent/10 p-3 rounded-2xl group-hover:bg-accent group-hover:-rotate-12 transition-all">
              <QrCode className="h-7 w-7 text-accent group-hover:text-white" />
            </div>
            <span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground italic">Student ID</span>
          </Button>
        </div>

        {/* Available Shuttles */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black font-headline tracking-tight uppercase italic text-primary">Live Shuttles</h2>
            <Button variant="link" className="text-accent font-black uppercase text-[10px] tracking-widest">See All</Button>
          </div>
          <div className="space-y-4">
            {availableShuttles.map((shuttle) => (
              <Card key={shuttle.id} className="border-none shadow-lg bg-white rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary p-3 rounded-2xl">
                      <Bus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black text-primary uppercase italic text-sm">{shuttle.route}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Starts {shuttle.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={shuttle.status === 'On Time' ? 'default' : 'secondary'} className="rounded-full px-3 text-[8px] font-black uppercase mb-1">
                      {shuttle.status}
                    </Badge>
                    <p className="text-[10px] font-black text-accent uppercase">{shuttle.seats} Available</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Active Trip */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black font-headline tracking-tight uppercase italic text-primary">Your Next Trip</h2>
          </div>
          <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden group">
            <CardContent className="p-0">
               <div className="bg-accent/5 p-8 border-b border-accent/10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-black text-xl uppercase tracking-tighter text-primary italic">AU Campus Stop</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">SCHEDULED: 8:15 AM</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 border-none font-black rounded-full px-4 text-[10px] tracking-widest">CONFIRMED</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-[10px] font-black pt-6 border-t border-accent/20">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <span className="uppercase italic tracking-tighter">STUDENT VERIFIED</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinned className="h-5 w-5 text-accent" />
                      <span className="uppercase italic tracking-tighter">GATE 2 PICKUP</span>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </section>

        {/* Membership */}
        <section className="p-8 bg-primary rounded-[2.5rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4">
             <CreditCard className="h-12 w-12 text-white/10 rotate-12" />
           </div>
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80 mb-2">Vizag Smart Commuter</p>
             <h3 className="text-3xl font-black font-headline italic mb-6 tracking-tight">PLATINUM SCHOLAR</h3>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                   <CreditCard className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-[8px] font-black opacity-60 uppercase tracking-widest">Aago Credits</p>
                    <p className="font-black text-lg flex items-center gap-0.5">
                      <IndianRupee className="h-4 w-4" /> {profileLoading ? '...' : (profile?.credits || 850)}
                    </p>
                 </div>
               </div>
               <Button className="bg-accent hover:bg-accent/90 rounded-2xl font-black h-12 px-6 uppercase tracking-tighter italic">TOP UP</Button>
             </div>
           </div>
        </section>
      </main>

      {/* Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <nav className="bg-white/90 backdrop-blur-2xl border border-secondary p-4 flex justify-between items-center rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)]">
          <div className="flex flex-col items-center gap-1 text-primary group cursor-pointer">
            <div className="bg-primary/10 p-2 rounded-2xl">
              <Bus className="h-6 w-6" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground group cursor-pointer">
            <div className="p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <Search className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-accent h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-accent/40 -mt-12 border-4 border-white hover:scale-105 transition-transform active:scale-95 cursor-pointer">
            <QrCode className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground group cursor-pointer">
            <div className="p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <MapIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground group cursor-pointer">
            <div className="p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
