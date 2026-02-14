
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, 
  MapPin, 
  Search, 
  Clock, 
  Bell, 
  Menu,
  QrCode,
  Map as MapIcon,
  IndianRupee,
  Navigation,
  LogOut,
  ChevronRight
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
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-body pb-28">
      {/* Simplified Header */}
      <header className="bg-white px-6 py-6 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-primary font-headline italic tracking-tight leading-none uppercase">AAGO</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vizag Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        {/* Welcome Text */}
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 font-headline italic uppercase tracking-tighter">
            Hi, {profile?.fullName?.split(' ')[0] || 'Scholar'}!
          </h2>
          <p className="text-sm font-bold text-slate-500 italic">Where are we heading today?</p>
        </div>

        {/* Primary Booking Action */}
        <Card className="border-none shadow-xl bg-primary text-white rounded-[2rem] overflow-hidden group active:scale-[0.98] transition-transform cursor-pointer">
          <CardContent className="p-8 flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-headline italic uppercase tracking-tighter">Book a Seat</h3>
              <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-widest flex items-center gap-1">
                <Clock className="h-3 w-3" /> Next ride in 12 mins
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-3xl group-hover:rotate-12 transition-transform">
              <Navigation className="h-8 w-8 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-lg bg-white rounded-[1.5rem] p-5 space-y-3">
             <div className="bg-accent/10 w-10 h-10 rounded-xl flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-accent" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
                <p className="text-lg font-black text-slate-900">
                  {profileLoading ? '...' : `₹${profile?.credits || 0}`}
                </p>
             </div>
          </Card>
          <Card className="border-none shadow-lg bg-white rounded-[1.5rem] p-5 space-y-3">
             <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <QrCode className="h-5 w-5 text-blue-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital ID</p>
                <p className="text-lg font-black text-slate-900 uppercase italic">Active</p>
             </div>
          </Card>
        </div>

        {/* Live Tracking Map Card - Simplified */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Live Status</h4>
            <Badge variant="outline" className="border-slate-200 text-[8px] font-black uppercase text-green-600 bg-green-50">Smooth Traffic</Badge>
          </div>
          <Card className="overflow-hidden border-none shadow-lg bg-white rounded-[2rem] relative group cursor-pointer">
            <div className="relative h-40 w-full">
              <Image 
                src={liveMapImage?.imageUrl || "https://picsum.photos/seed/map-ap/800/400"} 
                fill 
                className="object-cover opacity-80" 
                alt="Live Map"
                data-ai-hint="andhra map"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-primary p-2 rounded-full shadow-2xl animate-bounce">
                  <Bus className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <CardContent className="p-6 relative">
               <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest italic">VZM &rarr; GITAM Loop</p>
                    <h5 className="font-black text-slate-900 text-lg">Express Shuttle #4</h5>
                 </div>
                 <Button size="sm" variant="secondary" className="rounded-xl font-bold text-[10px] uppercase h-8">Track Live</Button>
               </div>
            </CardContent>
          </Card>
        </section>

        {/* Frequent Routes */}
        <section className="space-y-4">
           <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Recent Routes</h4>
           <div className="space-y-3">
              {[
                { name: 'AU Campus Special', time: 'Every 20m', icon: MapPin },
                { name: 'Vizag Downtown Hub', time: 'Every 15m', icon: MapPin },
              ].map((route, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 group hover:border-primary/20 transition-colors cursor-pointer">
                   <div className="flex items-center gap-4">
                      <div className="bg-slate-50 p-2.5 rounded-xl group-hover:bg-primary/5">
                         <route.icon className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                      </div>
                      <div>
                         <p className="font-black text-slate-900 text-sm italic uppercase">{route.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{route.time}</p>
                      </div>
                   </div>
                   <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              ))}
           </div>
        </section>
      </main>

      {/* Modern Fixed Bottom Nav */}
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
          <div className="bg-accent h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/40 border-4 border-white -mt-10 hover:scale-105 transition-transform">
            <QrCode className="h-7 w-7 text-white" />
          </div>
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
