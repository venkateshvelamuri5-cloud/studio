
"use client";

import { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';

export default function DriverConsole() {
  const [status, setStatus] = useState('Off Duty');
  const [activeRoute, setActiveRoute] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Driver Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold">M</div>
          <div>
            <h1 className="font-bold leading-none">Mike Miller</h1>
            <p className="text-xs text-slate-400">ID: 48820-DR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={status === 'On Route' ? 'bg-green-500' : 'bg-slate-700'}>
            {status}
          </Badge>
          <Button 
            size="sm" 
            variant={status === 'Off Duty' ? 'default' : 'destructive'}
            onClick={() => setStatus(status === 'Off Duty' ? 'Idle' : 'Off Duty')}
            className="rounded-full"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {!activeRoute ? (
          <div className="space-y-4 py-8">
            <h2 className="text-2xl font-bold font-headline px-2">Today&apos;s Schedule</h2>
            {[
              { route: 'North Campus Loop', time: '08:00 - 10:00', bus: 'Bus #42' },
              { route: 'West Village Express', time: '10:30 - 12:30', bus: 'Bus #42' },
              { route: 'Downtown Shuttle', time: '14:00 - 17:00', bus: 'Bus #12' },
            ].map((shift, i) => (
              <Card key={i} className="bg-slate-800 border-none text-white shadow-xl overflow-hidden group hover:ring-2 hover:ring-primary transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-primary font-headline">{shift.route}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {shift.time}</span>
                        <span className="flex items-center gap-1"><Bus className="h-4 w-4" /> {shift.bus}</span>
                      </div>
                    </div>
                    <Button onClick={() => { setActiveRoute(true); setStatus('On Route'); }} className="bg-primary hover:bg-primary/90 rounded-xl px-6">Start Shift</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {/* Active Navigation Card */}
            <Card className="bg-primary text-white border-none shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-white/20 text-white mb-2">Active Route</Badge>
                    <CardTitle className="text-2xl font-bold font-headline">North Campus Loop</CardTitle>
                  </div>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <AlertCircle className="h-4 w-4 mr-2" /> Report Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-black/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 border border-white/10 mb-6">
                  <p className="text-sm font-bold uppercase tracking-widest text-primary-foreground/60">Next Stop</p>
                  <h4 className="text-3xl font-black font-headline">Main Library</h4>
                  <p className="text-slate-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" /> 0.8 miles away • 3 mins
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button className="flex-1 bg-white text-primary hover:bg-white/90 font-bold h-14 rounded-2xl">
                    <Navigation className="h-5 w-5 mr-2" /> Open Maps
                  </Button>
                  <Button variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/10 font-bold h-14 rounded-2xl">
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Arrived
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Boarding Manifest */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" /> Boarding Manifest
                </h3>
                <Badge variant="outline" className="text-slate-400 border-slate-700">12 / 24 Seats</Badge>
              </div>
              
              <div className="space-y-2">
                {[
                  { name: 'Sarah Jenkins', stop: 'Main Library', status: 'Booked' },
                  { name: 'James Wilson', stop: 'Main Library', status: 'Booked' },
                  { name: 'Elena Rodriguez', stop: 'Science Wing', status: 'Waitlist' },
                ].map((p, i) => (
                  <div key={i} className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">Pick up: {p.stop}</p>
                      </div>
                    </div>
                    <Badge className={p.status === 'Booked' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Driver Footer Navigation */}
      <nav className="p-4 border-t border-white/10 bg-slate-900 flex justify-around">
        <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-primary">
          <Bus className="h-6 w-6" />
          <span className="text-[10px]">Dashboard</span>
        </Button>
        <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-slate-400">
          <Phone className="h-6 w-6" />
          <span className="text-[10px]">Contact Admin</span>
        </Button>
        <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-slate-400">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <span className="text-[10px] text-red-500">Emergency</span>
        </Button>
      </nav>
    </div>
  );
}
