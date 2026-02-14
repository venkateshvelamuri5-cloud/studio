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
  QrCode
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('tracking');
  const liveMapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* App Header */}
      <header className="bg-primary text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Menu className="h-6 w-6" />
          <h1 className="text-xl font-bold font-headline">Aago Student</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-accent text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">2</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center border border-white/20">
            S
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 max-w-4xl mx-auto w-full pb-20">
        {/* Quick Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input 
            className="pl-10 h-14 rounded-2xl border-none shadow-md bg-white text-lg"
            placeholder="Where are you going?"
          />
        </div>

        {/* Live Tracking Map Card */}
        <Card className="overflow-hidden border-none shadow-lg bg-white rounded-3xl">
          <div className="relative h-64 w-full bg-muted">
            <Image 
              src={liveMapImage?.imageUrl || "https://picsum.photos/seed/map1/800/400"} 
              fill 
              className="object-cover opacity-80" 
              alt="Live Map"
              data-ai-hint="city map"
            />
            {/* Mock Map Markers */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-primary p-2 rounded-full shadow-lg animate-bounce">
                <Bus className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="absolute top-20 right-1/4">
              <div className="bg-accent p-2 rounded-full shadow-lg ring-4 ring-accent/20">
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </div>
            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <Button size="icon" className="bg-white text-primary hover:bg-white/90 shadow-md">
                <MapPin className="h-5 w-5" />
              </Button>
            </div>
            <div className="absolute top-4 left-4">
              <Badge className="bg-white/90 text-primary hover:bg-white font-bold py-1 px-3 border-none">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Live Updates
                </span>
              </Badge>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg font-headline">North Campus Express</h3>
                <p className="text-sm text-muted-foreground">Next shuttle arriving in 4 mins</p>
              </div>
              <Button size="sm" className="bg-primary">Track Route</Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-24 flex-col gap-2 rounded-3xl border-2 bg-white shadow-sm hover:bg-secondary/10 hover:border-primary transition-all">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <span className="font-semibold">Book Seat</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2 rounded-3xl border-2 bg-white shadow-sm hover:bg-secondary/10 hover:border-accent transition-all">
            <div className="bg-accent/10 p-2 rounded-xl">
              <QrCode className="h-6 w-6 text-accent" />
            </div>
            <span className="font-semibold">My Pass</span>
          </Button>
        </div>

        {/* Upcoming Bookings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold font-headline">Your Next Trip</h2>
            <Button variant="link" className="text-primary font-semibold">See History</Button>
          </div>
          <Card className="border-none shadow-md bg-white rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Bus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold font-headline">Engineering Library → Hub</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Today, 2:30 PM
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Confirmed</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Seat #12A</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span>Verified Trip</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Suggested Routes */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-headline px-1">Popular Nearby</h2>
          <div className="space-y-3">
            {[
              { name: "Downtown Connector", time: "Every 15 mins", occupancy: "Low" },
              { name: "Sports Complex Express", time: "Every 30 mins", occupancy: "High" },
              { name: "West Dorm Loop", time: "Every 10 mins", occupancy: "Medium" },
            ].map((route, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">{route.name}</h5>
                    <p className="text-xs text-muted-foreground">{route.time}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <Badge variant="outline" className={
                    route.occupancy === "Low" ? "text-green-600 border-green-200" :
                    route.occupancy === "High" ? "text-red-600 border-red-200" :
                    "text-yellow-600 border-yellow-200"
                  }>
                    {route.occupancy} Load
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t py-3 px-6 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col items-center gap-1 text-primary">
          <Bus className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Search className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
        </div>
        <div className="bg-primary h-12 w-12 rounded-full -mt-10 flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-background">
          <QrCode className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Clock className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Users className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </div>
      </nav>
    </div>
  );
}
