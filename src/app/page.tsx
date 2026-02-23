"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bus, 
  ArrowRight, 
  Navigation,
  QrCode,
  ShieldCheck,
  Zap,
  Activity,
  Fingerprint,
  Clock,
  Menu,
  X,
  Radar,
  Star,
  IndianRupee,
  LayoutDashboard,
  Cpu,
  Layers,
  Sparkles,
  MapPin,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

function HighTechSimulator() {
  const [activeScreen, setActiveScreen] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-[380px] aspect-[9/18] mx-auto perspective-1000 group">
      <div className="relative w-full h-full bg-slate-950 rounded-[5rem] border-[14px] border-slate-900 shadow-[0_64px_128px_-12px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-1000 group-hover:rotate-y-12">
        <div className="h-full w-full bg-slate-900 flex flex-col pt-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-slate-950 rounded-b-[2rem] z-30 flex items-center justify-center">
             <div className="w-16 h-2 bg-slate-800 rounded-full" />
          </div>
          
          <div className="flex-1 p-10 flex flex-col gap-10">
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-accent">Live Grid Active</span>
              </div>
              <Bus className="h-6 w-6 text-primary" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <Badge className="bg-primary/20 text-primary border-none text-[12px] font-black uppercase tracking-widest px-6 py-2">Satellite Scan</Badge>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.8]">Live<br/>Shuttle<br/>Radar.</h3>
                <div className="aspect-square bg-slate-800/50 rounded-[4rem] border border-white/5 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.2),transparent_70%)]" />
                  <div className="h-48 w-48 border-2 border-primary/20 rounded-full animate-ping" />
                  <Navigation className="h-16 w-16 text-primary absolute drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-10 animate-in slide-in-from-right-16 duration-1000">
                <Badge className="bg-accent/20 text-accent border-none text-[12px] font-black uppercase tracking-widest px-6 py-2">Secure Key</Badge>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.8]">Scholar<br/>Boarding<br/>ID.</h3>
                <div className="flex-1 bg-white/5 border border-white/10 p-10 rounded-[4rem] flex flex-col items-center justify-center gap-10 shadow-2xl">
                  <QrCode className="h-44 w-44 text-white opacity-90" />
                  <div className="text-center">
                    <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Digital Pass</p>
                    <p className="text-4xl font-black text-primary italic tracking-widest mt-3">AAGO-707</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-10 animate-in zoom-in duration-1000">
                <Badge className="bg-green-500/20 text-green-400 border-none text-[12px] font-black uppercase tracking-widest px-6 py-2">On Mission</Badge>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.8]">Active<br/>Commute<br/>Status.</h3>
                <div className="flex-1 bg-slate-800/50 border border-white/5 p-10 rounded-[4rem] flex flex-col gap-8 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-black uppercase text-slate-500">Route #VZ-88</span>
                    <Activity className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div className="h-4 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-primary w-[80%] rounded-full shadow-[0_0_20px_rgba(0,255,255,0.6)]" />
                  </div>
                  <div className="flex items-center gap-5 pt-8 border-t border-white/5">
                    <Clock className="h-6 w-6 text-accent" />
                    <div>
                      <p className="text-[11px] font-black uppercase text-slate-500">ETA to Hub</p>
                      <p className="text-lg font-black italic text-white uppercase">6 Minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-28 bg-slate-950/80 border-t border-white/5 flex justify-around items-center px-14">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-2.5 rounded-full transition-all duration-1000 ${activeScreen === i ? 'bg-primary w-20' : 'bg-slate-800 w-4'}`} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const db = useFirestore();
  const routesQuery = useMemo(() => db ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]);
  const { data: activeRoutes } = useCollection(routesQuery);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-body selection:bg-primary selection:text-white overflow-x-hidden">
      {/* GLOSSY NAV */}
      <header className="fixed top-0 left-0 right-0 h-28 z-50 px-8 lg:px-24 flex items-center justify-between glass-card !bg-slate-950/40 border-b border-white/5">
        <Link href="/" className="flex items-center gap-5 group">
          <div className="bg-primary p-4 rounded-3xl shadow-[0_0_40px_rgba(0,255,255,0.3)] group-hover:rotate-12 transition-transform duration-700">
            <Bus className="h-7 w-7 text-slate-950" />
          </div>
          <span className="text-4xl font-black italic font-headline tracking-tighter uppercase text-white leading-none">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-20">
          {['Corridors', 'Scholar Hub', 'Network Status'].map((item) => (
            <Link key={item} href="#" className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-primary transition-all duration-300">{item}</Link>
          ))}
          <Link href="/auth/login">
            <Button className="h-16 bg-white text-slate-950 px-12 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-primary hover:text-white transition-all duration-500 shadow-2xl">Enter Hub</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-14 w-14 rounded-3xl bg-white/5" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </Button>
      </header>

      {/* MOBILE NAV */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-36 px-12 flex flex-col gap-10 animate-in fade-in slide-in-from-top-12 duration-500">
          {['Corridors', 'Scholar Hub', 'Support'].map((item) => (
            <Link key={item} href="#" className="text-5xl font-black uppercase italic tracking-tighter text-white border-b border-white/5 pb-8">{item}</Link>
          ))}
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full h-24 bg-primary rounded-[3rem] font-black uppercase italic text-3xl shadow-[0_0_60px_rgba(0,255,255,0.3)]">Join Grid</Button>
          </Link>
        </div>
      )}

      <main>
        {/* HERO */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-40 pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(0,255,255,0.1),transparent_60%)]" />
          <div className="absolute -top-1/2 -left-1/4 w-[100vw] h-[100vw] bg-accent/5 blur-[180px] rounded-full" />
          
          <div className="container mx-auto px-8 lg:px-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-32 items-center">
              <div className="space-y-16 animate-in fade-in slide-in-from-left-16 duration-1000">
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-5 bg-white/5 border border-white/10 px-10 py-4 rounded-full shadow-2xl backdrop-blur-3xl">
                    <span className="h-3 w-3 bg-accent rounded-full animate-pulse shadow-[0_0_20px_rgba(0,255,255,0.8)]" />
                    <span className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">Vizag & VZM Hub Operational</span>
                  </div>
                  <h1 className="text-8xl md:text-9xl lg:text-[11rem] font-black leading-[0.8] font-headline uppercase italic tracking-[calc(-0.05em)] text-white">
                    The Smart <br /> <span className="text-primary text-glow">Grid.</span>
                  </h1>
                  <p className="max-w-xl text-xl lg:text-2xl font-bold text-slate-400 leading-relaxed border-l-[16px] border-primary/20 pl-12 italic">
                    Expensive taxis are over. Crowded buses are history. AAGO is the first high-tech shuttle grid built for regional scholars.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-10">
                  <Link href="/auth/signup">
                    <Button className="h-24 px-16 bg-primary hover:bg-primary/90 text-slate-950 rounded-[3rem] font-black uppercase italic text-2xl shadow-[0_32px_64px_rgba(0,255,255,0.4)] transition-all duration-500 hover:scale-105 active:scale-95">Access Terminal <ArrowRight className="ml-5 h-8 w-8" /></Button>
                  </Link>
                  <Button variant="ghost" className="h-24 px-16 rounded-[3rem] font-black uppercase italic text-2xl border border-white/10 bg-white/5 hover:bg-white/10 shadow-2xl transition-all duration-500">Live Radar</Button>
                </div>
                <div className="flex gap-20 pt-16 border-t border-white/5">
                   <div className="space-y-3">
                      <p className="text-6xl font-black italic text-white leading-none">0%</p>
                      <p className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em]">Late Arrival Protocol</p>
                   </div>
                   <div className="space-y-3">
                      <p className="text-6xl font-black italic text-white leading-none">₹20</p>
                      <p className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em]">Regional Base Fare</p>
                   </div>
                </div>
              </div>
              <div className="lg:ml-auto hidden lg:block relative">
                <div className="absolute -inset-60 bg-primary/20 blur-[150px] rounded-full -z-10 animate-pulse" />
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* MISSION HIGHLIGHTS */}
        <section className="py-48 bg-slate-900/40">
          <div className="container mx-auto px-8 lg:px-24 text-center space-y-32">
            <div className="max-w-4xl mx-auto space-y-10">
               <Badge className="bg-accent/20 text-accent border-none px-12 py-4 text-[14px] font-black uppercase tracking-[0.6em]">The Protocol</Badge>
               <h2 className="text-7xl lg:text-[9rem] font-black uppercase italic leading-[0.85] tracking-tighter text-white">Better Transport. <br/> Better Focus.</h2>
               <p className="text-2xl font-bold text-slate-400 italic max-w-2xl mx-auto">We fixed the transport crisis so you can focus on your regional academic mission.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-16">
               {[
                 { title: "Scholar Fares", desc: "Pay 70% less than private taxis. Affordable regional travel on every corridor.", icon: IndianRupee, color: "text-green-400" },
                 { title: "Satellite Radar", desc: "Never wait in uncertainty. Watch your shuttle move live on your mobile grid.", icon: Radar, color: "text-primary" },
                 { title: "SOS Grid", desc: "Your safety is our priority. Direct SOS link to our regional dispatch hub.", icon: ShieldCheck, color: "text-accent" }
               ].map((item, i) => (
                 <div key={i} className="glass-card p-16 rounded-[5rem] text-left space-y-10 hover:bg-white/10 transition-all duration-700 hover:-translate-y-6 group">
                    <div className={`h-24 w-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center ${item.color} shadow-2xl group-hover:scale-110 transition-transform`}><item.icon className="h-12 w-12" /></div>
                    <div className="space-y-5">
                       <h4 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">{item.title}</h4>
                       <p className="text-lg font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* 3D PROTOCOL */}
        <section className="py-48 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,255,255,0.05),transparent_70%)]" />
          <div className="container mx-auto px-8 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-40 items-center">
              <div className="relative aspect-square rounded-[6rem] overflow-hidden shadow-[0_64px_128px_-12px_rgba(0,0,0,0.8)] border border-white/5 animate-float group">
                 <Image 
                   src={PlaceHolderImages.find(img => img.id === '3d-shuttle')?.imageUrl || "https://picsum.photos/seed/aago-3d-bus/1200/800"} 
                   fill 
                   className="object-cover group-hover:scale-110 transition-transform duration-1000" 
                   alt="Modern 3D Shuttle" 
                   data-ai-hint="3d shuttle"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                 <div className="absolute bottom-20 left-20 space-y-5">
                    <Badge className="bg-primary text-slate-950 font-black uppercase italic tracking-[0.3em] px-8 py-3 rounded-full text-xs">Premium Fleet</Badge>
                    <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter">Corridor Master.</h3>
                 </div>
              </div>

              <div className="space-y-20">
                 <div className="space-y-8">
                    <h2 className="text-7xl lg:text-[9rem] font-black uppercase italic tracking-tighter text-white leading-[0.8]">The 3-Step <br/> Access.</h2>
                    <p className="text-2xl font-bold text-slate-400 italic border-l-[16px] border-primary/40 pl-12">Simple English onboarding for the regional grid.</p>
                 </div>
                 
                 <div className="space-y-16">
                    {[
                      { step: "01", title: "Find Station", desc: "Choose your regional hub and station on any active corridor.", icon: MapPin },
                      { step: "02", title: "Secure Seat", desc: "Confirm with a simple UPI payment to the regional AAGO hub.", icon: Zap },
                      { step: "03", title: "Show Pass", desc: "Present your digital Boarding ID and watch your trip live.", icon: Fingerprint }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-12 group items-start">
                         <div className="text-8xl font-black italic text-white/5 group-hover:text-primary transition-all duration-700 leading-none">{item.step}</div>
                         <div className="space-y-4 pt-4">
                            <h4 className="text-5xl font-black uppercase italic text-white tracking-tighter leading-none">{item.title}</h4>
                            <p className="text-xl font-bold text-slate-500 italic">{item.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE CORRIDORS */}
        <section className="py-48 bg-slate-950">
          <div className="container mx-auto px-8 lg:px-24 space-y-32">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-16">
              <div className="space-y-8 max-w-3xl">
                 <Badge className="bg-cyan-500/20 text-cyan-400 border-none px-10 py-4 text-[14px] font-black uppercase tracking-[0.6em]">Regional Pulse</Badge>
                 <h2 className="text-7xl lg:text-[9rem] font-black uppercase italic leading-[0.8] tracking-tighter text-white">Active <br/> Hubs.</h2>
              </div>
              <p className="text-2xl font-bold text-slate-500 italic max-w-sm text-right">Updated in real-time by regional operations captains.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
               {activeRoutes?.map((route: any) => (
                 <Card key={route.id} className="glass-card p-16 rounded-[5rem] hover:shadow-[0_0_120px_rgba(0,255,255,0.2)] transition-all duration-1000 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><Navigation className="h-44 w-44" /></div>
                    <div className="space-y-12 relative z-10">
                       <div className="flex justify-between items-start">
                          <div className="space-y-3">
                             <p className="text-[12px] font-black uppercase tracking-[0.5em] text-primary">{route.city} Regional Hub</p>
                             <h4 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">{route.routeName}</h4>
                          </div>
                          <div className="bg-primary/20 p-6 rounded-[2rem]"><span className="text-3xl font-black italic text-primary">₹{route.baseFare}</span></div>
                       </div>
                       
                       <div className="space-y-8">
                          <p className="text-[12px] font-black uppercase text-slate-500 tracking-[0.5em] flex items-center gap-4">
                             <Layers className="h-5 w-5" /> Hub Stations:
                          </p>
                          <div className="flex flex-wrap gap-4">
                             {route.stops?.map((stop: any, i: number) => (
                               <Badge key={i} variant="outline" className="text-[11px] font-black uppercase italic text-slate-400 border-white/10 bg-white/5 px-6 py-3 rounded-2xl">
                                 {stop.name}
                               </Badge>
                             ))}
                          </div>
                       </div>

                       <div className="pt-12 border-t border-white/5 flex justify-between items-center group-hover:translate-x-4 transition-transform duration-700">
                          <span className="text-[12px] font-black uppercase text-primary tracking-[0.6em]">Initiate Boarding</span>
                          <ArrowRight className="h-8 w-8 text-primary" />
                       </div>
                    </div>
                 </Card>
               ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-72 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/10 blur-[200px] animate-pulse" />
           <div className="container mx-auto px-8 lg:px-24 text-center space-y-24 relative z-10">
              <div className="space-y-12 max-w-6xl mx-auto">
                 <h2 className="text-8xl lg:text-[12rem] font-black uppercase italic tracking-tighter text-white leading-[0.75] text-glow">Ready to <br/> Grid?</h2>
                 <p className="text-3xl font-bold text-slate-400 italic max-w-3xl mx-auto">Secure your scholar identity and join the regional transit revolution.</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-12">
                 <Link href="/auth/signup">
                    <Button className="h-28 px-20 bg-white text-slate-950 rounded-[3rem] font-black uppercase italic text-3xl shadow-[0_0_100px_rgba(255,255,255,0.3)] hover:bg-primary hover:text-white transition-all duration-700 hover:scale-110">Join Terminal</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="ghost" className="h-28 px-20 border-white/10 text-white rounded-[3rem] font-black uppercase italic text-3xl glass-card hover:bg-white/10 transition-all duration-700">Fleet Partner</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-40 border-t border-white/5 bg-slate-950 relative">
        <div className="container mx-auto px-8 lg:px-24">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-40">
            <div className="space-y-12">
              <Link href="/" className="flex items-center gap-6">
                <div className="bg-primary p-5 rounded-[2rem] shadow-2xl"><Bus className="h-10 w-10 text-slate-950" /></div>
                <span className="text-5xl font-black italic uppercase tracking-tighter text-white">AAGO</span>
              </Link>
              <p className="max-w-md text-[12px] font-black uppercase tracking-[0.6em] text-slate-600 italic leading-loose">The regional scholar grid. Operating high-tech corridors across Vizag and VZM hubs. Simple English. Pure Power.</p>
              <div className="flex gap-10">
                 <div className="h-16 w-16 rounded-[2rem] glass-card flex items-center justify-center text-slate-500 hover:text-primary transition-all cursor-pointer"><Cpu className="h-8 w-8" /></div>
                 <div className="h-16 w-16 rounded-[2rem] glass-card flex items-center justify-center text-slate-500 hover:text-primary transition-all cursor-pointer"><Sparkles className="h-8 w-8" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-32 lg:gap-48">
              <div className="space-y-10">
                <p className="text-[14px] font-black uppercase tracking-[0.6em] text-white">Hub Access</p>
                <nav className="flex flex-col gap-8 text-lg font-bold uppercase italic text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Hub</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Captain Hub</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-4 text-primary"><LayoutDashboard className="h-6 w-6" /> Ops Center</Link>
                </nav>
              </div>
              <div className="space-y-10">
                <p className="text-[14px] font-black uppercase tracking-[0.6em] text-white">Grid Info</p>
                <nav className="flex flex-col gap-8 text-lg font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Safety Code</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Station Map</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Legal Terms</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-40 pt-20 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10">
            <p className="text-[12px] font-black uppercase tracking-[0.7em] text-slate-700 italic">© 2024 AAGO REGIONAL GRID. MISSION SYNCED.</p>
            <div className="flex gap-16 text-[11px] font-black uppercase tracking-[0.5em] text-slate-600">
               <span className="text-primary">Vizag Terminal Live</span>
               <span className="text-primary">VZM Hub Sync</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}