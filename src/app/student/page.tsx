
"use client";

import { useState } from 'react';
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
  CreditCard
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function RiderDashboard() {
  const [activeTab, setActiveTab] = useState('tracking');
  const liveMapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      {/* App Header */}
      <header className="bg-primary text-white p-6 flex items-center justify-between shadow-xl z-10 rounded-b-[2rem]">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-2xl">
            <Menu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black font-headline tracking-tight leading-none italic">AAGO</h1>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Rider Console</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative bg-white/10 p-2 rounded-2xl">
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 bg-accent text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black ring-2 ring-primary">2</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-accent flex items-center justify-center border-2 border-white/20 font-black text-white shadow-lg shadow-accent/20">
            S
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-xl mx-auto w-full pb-32">
        {/* Quick Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-primary/40 group-focus-within:text-primary" />
          </div>
          <Input 
            className="pl-14 h-16 rounded-[1.5rem] border-none shadow-xl bg-white text-lg font-bold placeholder:text-muted-foreground/50 focus-visible:ring-accent"
            placeholder="Where to next?"
          />
        </div>

        {/* Live Tracking Map Card */}
        <Card className="overflow-hidden border-none shadow-2xl bg-white rounded-[2.5rem]">
          <div className="relative h-72 w-full bg-muted">
            <Image 
              src={liveMapImage?.imageUrl || "https://picsum.photos/seed/map1/800/400"} 
              fill 
              className="object-cover opacity-90" 
              alt="Live Map"
              data-ai-hint="city map"
            />
            {/* Mock Map Markers */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-primary p-3 rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] animate-pulse border-4 border-white">
                <Bus className="h-6 w-6 text-white" />
              </div>
            </div>
            
            {/* Map Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-3">
              <Button size="icon" className="bg-white text-primary hover:bg-white/90 shadow-xl rounded-2xl h-12 w-12">
                <MapPin className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="absolute top-6 left-6">
              <Badge className="bg-white/95 text-primary hover:bg-white font-black py-2 px-4 border-none rounded-2xl shadow-xl backdrop-blur-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  LIVE TRAFFIC
                </span>
              </Badge>
            </div>
          </div>
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-2xl font-headline text-primary italic uppercase tracking-tight">Express Line #4</h3>
                <p className="text-sm text-muted-foreground font-bold flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-accent" /> Arriving in 4 mins
                </p>
              </div>
              <Button className="bg-primary hover:bg-primary/90 rounded-2xl px-8 h-12 font-black shadow-lg shadow-primary/20">
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
            <span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Book Seat</span>
          </Button>
          <Button variant="outline" className="h-32 flex-col gap-3 rounded-[2rem] border-none bg-white shadow-xl hover:bg-secondary transition-all group">
            <div className="bg-accent/10 p-3 rounded-2xl group-hover:bg-accent group-hover:-rotate-12 transition-all">
              <QrCode className="h-7 w-7 text-accent group-hover:text-white" />
            </div>
            <span className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">My Pass</span>
          </Button>
        </div>

        {/* Active Trip */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black font-headline tracking-tight uppercase italic text-primary">Your Trip</h2>
            <Button variant="link" className="text-accent font-black uppercase text-[10px] tracking-widest">History</Button>
          </div>
          <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden group">
            <CardContent className="p-0">
               <div className="bg-accent/5 p-8 border-b border-accent/10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-black text-xl uppercase tracking-tighter text-primary">Downtown Hub</h4>
                      <p className="text-xs font-bold text-muted-foreground">DEPARTURE: 2:30 PM</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 border-none font-black rounded-full px-4">CONFIRMED</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm font-black pt-6 border-t border-accent/20">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span>SEAT 12A</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                      <span>VERIFIED</span>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </section>

        {/* Membership Status */}
        <section className="p-8 bg-primary rounded-[2.5rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4">
             <Star className="h-12 w-12 text-white/10 rotate-12" />
           </div>
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-foreground/60 mb-2">Membership Status</p>
             <h3 className="text-3xl font-black font-headline italic mb-6 tracking-tight">PLATINUM PASS</h3>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                   <CreditCard className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-xs font-bold opacity-60">NEXT RENEWAL</p>
                    <p className="font-black text-sm uppercase tracking-widest">Dec 12, 2024</p>
                 </div>
               </div>
               <Button className="bg-accent hover:bg-accent/90 rounded-2xl font-black h-12 px-6">UPGRADE</Button>
             </div>
           </div>
        </section>
      </main>

      {/* Modern Floating Bottom Nav */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <nav className="bg-white/80 backdrop-blur-2xl border border-white/20 p-4 flex justify-between items-center rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col items-center gap-1 text-primary group">
            <div className="bg-primary/10 p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <Bus className="h-6 w-6" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground group">
            <div className="p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <Search className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-primary h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/40 -mt-12 border-4 border-background hover:scale-105 transition-transform active:scale-95 cursor-pointer">
            <QrCode className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground group">
            <div className="p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <MapIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground group">
            <div className="p-2 rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
