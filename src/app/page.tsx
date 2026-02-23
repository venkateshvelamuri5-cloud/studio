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
  ShieldAlert,
  MapPin,
  Radar,
  Star,
  IndianRupee,
  LayoutDashboard,
  Cpu,
  Layers,
  Sparkles
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
    <div className="relative w-full max-w-[340px] aspect-[9/18] mx-auto perspective-1000 group">
      <div className="relative w-full h-full bg-slate-950 rounded-[4rem] border-[12px] border-slate-900 shadow-[0_0_100px_rgba(59,130,246,0.2)] overflow-hidden transition-all duration-1000 group-hover:rotate-y-12">
        <div className="h-full w-full bg-slate-900 flex flex-col pt-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-950 rounded-b-3xl z-30 flex items-center justify-center">
             <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
          </div>
          
          <div className="flex-1 p-8 flex flex-col gap-8">
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400/60">Live Grid</span>
              </div>
              <Bus className="h-5 w-5 text-primary" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5">Satellite Scan</Badge>
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Live<br/>Radar.</h3>
                <div className="aspect-square bg-slate-800/50 rounded-[3rem] border border-white/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2),transparent_70%)]" />
                  <div className="h-40 w-40 border-2 border-primary/20 rounded-full animate-ping" />
                  <Navigation className="h-12 w-12 text-primary absolute drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-8 animate-in slide-in-from-right-12 duration-1000">
                <Badge className="bg-accent/20 text-accent border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5">Boarding Key</Badge>
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Smart<br/>ID.</h3>
                <div className="flex-1 bg-white/5 border border-white/10 p-8 rounded-[3rem] flex flex-col items-center justify-center gap-8">
                  <QrCode className="h-40 w-40 text-white opacity-90" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scholar Code</p>
                    <p className="text-3xl font-black text-primary italic tracking-widest mt-2">AAGO 77</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-8 animate-in zoom-in duration-1000">
                <Badge className="bg-green-500/20 text-green-400 border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5">On Mission</Badge>
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Active<br/>Commute.</h3>
                <div className="flex-1 bg-slate-800/50 border border-white/5 p-8 rounded-[3rem] flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Route #VZ-01</span>
                    <Activity className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div className="h-3 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                  </div>
                  <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                    <Clock className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">ETA to Hub</p>
                      <p className="text-sm font-black italic text-white uppercase">8 Minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-24 bg-slate-950/80 border-t border-white/5 flex justify-around items-center px-12">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-1000 ${activeScreen === i ? 'bg-primary w-14' : 'bg-slate-800 w-3'}`} />
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
      <header className="fixed top-0 left-0 right-0 h-24 z-50 px-8 lg:px-24 flex items-center justify-between glass-card !bg-slate-950/40 border-b border-white/5">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="bg-primary p-4 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] group-hover:rotate-12 transition-transform duration-500">
            <Bus className="h-6 w-6 text-slate-950" />
          </div>
          <span className="text-3xl font-black italic font-headline tracking-tighter uppercase text-white leading-none">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-16">
          {['Corridors', 'Scholar Hub', 'Network Status'].map((item) => (
            <Link key={item} href="#" className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-primary transition-all duration-300">{item}</Link>
          ))}
          <Link href="/auth/login">
            <Button className="h-14 bg-white text-slate-950 px-10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary hover:text-white transition-all duration-500 shadow-2xl">Access Hub</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-12 w-12 rounded-2xl bg-white/5" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </header>

      {/* MOBILE NAV */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-8 duration-500">
          {['Corridors', 'Scholar Hub', 'Support'].map((item) => (
            <Link key={item} href="#" className="text-4xl font-black uppercase italic tracking-tighter text-white border-b border-white/5 pb-6">{item}</Link>
          ))}
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full h-20 bg-primary rounded-3xl font-black uppercase italic text-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)]">Enter Grid</Button>
          </Link>
        </div>
      )}

      <main>
        {/* HERO: THE PROBLEM & SOLUTION */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.15),transparent_60%)]" />
          <div className="absolute -top-1/2 -left-1/4 w-[100vw] h-[100vw] bg-accent/5 blur-[150px] rounded-full" />
          
          <div className="container mx-auto px-8 lg:px-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12 animate-in fade-in slide-in-from-left-12 duration-1000">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-3 rounded-full shadow-2xl backdrop-blur-xl">
                    <span className="h-2.5 w-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Vizag & VZM Regional Hub Live</span>
                  </div>
                  <h1 className="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.8] font-headline uppercase italic tracking-tighter text-white">
                    The Smart <br /> Way to <br /> <span className="text-primary text-glow">Commute.</span>
                  </h1>
                  <p className="max-w-lg text-lg lg:text-xl font-bold text-slate-400 leading-relaxed border-l-[12px] border-primary/20 pl-10 italic">
                    Stop paying for expensive taxis. Stop waiting for crowded buses. AAGO is the first high-tech shuttle network built exclusively for regional students.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-8">
                  <Link href="/auth/signup">
                    <Button className="h-20 px-12 bg-primary hover:bg-primary/90 text-slate-950 rounded-3xl font-black uppercase italic text-xl shadow-[0_20px_60px_rgba(59,130,246,0.4)] transition-all duration-500 hover:scale-105 active:scale-95">Join the Grid <ArrowRight className="ml-4 h-6 w-6" /></Button>
                  </Link>
                  <Button variant="ghost" className="h-20 px-12 rounded-3xl font-black uppercase italic text-xl border border-white/10 bg-white/5 hover:bg-white/10 shadow-2xl transition-all duration-500">Live Map</Button>
                </div>
                <div className="flex gap-16 pt-12 border-t border-white/5">
                   <div className="space-y-2">
                      <p className="text-4xl font-black italic text-white">0%</p>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Late Arrivals</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-4xl font-black italic text-white">25k+</p>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Safe Missions</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-4xl font-black italic text-white">₹20</p>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Starting Fare</p>
                   </div>
                </div>
              </div>
              <div className="lg:ml-auto hidden lg:block relative">
                <div className="absolute -inset-40 bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* WHY AAGO: THE PROBLEM WE SOLVE */}
        <section className="py-40 bg-slate-900/50">
          <div className="container mx-auto px-8 lg:px-24 text-center space-y-24">
            <div className="max-w-3xl mx-auto space-y-8">
               <Badge className="bg-accent/20 text-accent border-none px-8 py-3 text-[12px] font-black uppercase tracking-[0.5em]">The Mission</Badge>
               <h2 className="text-6xl lg:text-8xl font-black uppercase italic leading-none tracking-tighter text-white">Better Transport <br/> for Better Grades.</h2>
               <p className="text-xl font-bold text-slate-400 italic">We fixed the regional transport crisis so you can focus on your education.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
               {[
                 { title: "Cheap Fares", desc: "Pay up to 70% less than private taxis. Affordable regional travel on every corridor.", icon: IndianRupee, color: "text-green-400" },
                 { title: "Real-time Radar", desc: "No more waiting in the dark. Watch your shuttle move live on your mobile grid.", icon: Radar, color: "text-primary" },
                 { title: "Scholar Safety", desc: "Every ride is monitored. Direct SOS signal to our safety hub for total peace of mind.", icon: ShieldCheck, color: "text-cyan-400" }
               ].map((item, i) => (
                 <div key={i} className="glass-card p-12 rounded-[4rem] text-left space-y-8 hover:bg-white/10 transition-all duration-700 hover:-translate-y-4 group">
                    <div className={`h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center ${item.color} shadow-2xl group-hover:scale-110 transition-transform`}><item.icon className="h-10 w-10" /></div>
                    <div className="space-y-4">
                       <h4 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{item.title}</h4>
                       <p className="text-base font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS: THE 3-STEP PROTOCOL */}
        <section className="py-40 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
          <div className="container mx-auto px-8 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-32 items-center">
              <div className="relative aspect-square rounded-[5rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.2)] border border-white/5 animate-float">
                 <Image 
                   src={PlaceHolderImages.find(img => img.id === '3d-shuttle')?.imageUrl || "https://picsum.photos/seed/aago-3d-bus/1200/800"} 
                   fill 
                   className="object-cover" 
                   alt="Modern 3D Shuttle" 
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                 <div className="absolute bottom-16 left-16 space-y-4">
                    <Badge className="bg-primary text-slate-950 font-black uppercase italic tracking-widest px-6 py-2">Operational Excellence</Badge>
                    <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">Premium Comfort.</h3>
                 </div>
              </div>

              <div className="space-y-16">
                 <div className="space-y-6">
                    <h2 className="text-6xl lg:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">The 3-Step <br/> Protocol.</h2>
                    <p className="text-xl font-bold text-slate-400 italic border-l-8 border-primary/40 pl-8">How to start your mission on the AAGO grid.</p>
                 </div>
                 
                 <div className="space-y-12">
                    {[
                      { step: "01", title: "Find Station", desc: "Open the grid and choose your pickup and drop hubs on any active corridor.", icon: MapPin },
                      { step: "02", title: "Verify Pay", desc: "Confirm your seat with a simple regional UPI payment directly to the hub.", icon: Zap },
                      { step: "03", title: "Show ID", desc: "Present your 6-digit Boarding ID to the operator and track your mission live.", icon: Fingerprint }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-10 group items-start">
                         <div className="text-7xl font-black italic text-white/5 group-hover:text-primary transition-all duration-700 leading-none">{item.step}</div>
                         <div className="space-y-3">
                            <h4 className="text-4xl font-black uppercase italic text-white tracking-tighter leading-none">{item.title}</h4>
                            <p className="text-lg font-bold text-slate-500 italic">{item.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE CORRIDORS: SYNCED WITH ADMIN */}
        <section className="py-40 bg-slate-950">
          <div className="container mx-auto px-8 lg:px-24 space-y-24">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-10">
              <div className="space-y-6 max-w-2xl">
                 <Badge className="bg-cyan-500/20 text-cyan-400 border-none px-8 py-3 text-[12px] font-black uppercase tracking-[0.5em]">Live Grid</Badge>
                 <h2 className="text-6xl lg:text-8xl font-black uppercase italic leading-none tracking-tighter text-white">Active <br/> Corridors.</h2>
              </div>
              <p className="text-xl font-bold text-slate-500 italic max-w-xs text-right">Manually managed by regional AAGO hubs for 100% reliability.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
               {activeRoutes?.map((route: any) => (
                 <Card key={route.id} className="glass-card p-12 rounded-[4rem] hover:shadow-[0_0_80px_rgba(59,130,246,0.15)] transition-all duration-700 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><Navigation className="h-32 w-32" /></div>
                    <div className="space-y-10 relative z-10">
                       <div className="flex justify-between items-start">
                          <div className="space-y-2">
                             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">{route.city} Regional Hub</p>
                             <h4 className="text-4xl font-black italic uppercase text-white leading-none tracking-tighter">{route.routeName}</h4>
                          </div>
                          <div className="bg-primary/20 p-5 rounded-3xl"><span className="text-2xl font-black italic text-primary">₹{route.baseFare}</span></div>
                       </div>
                       
                       <div className="space-y-6">
                          <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.4em] flex items-center gap-3">
                             <Layers className="h-4 w-4" /> Station Telemetry:
                          </p>
                          <div className="flex flex-wrap gap-3">
                             {route.stops?.map((stop: any, i: number) => (
                               <Badge key={i} variant="outline" className="text-[10px] font-black uppercase italic text-slate-400 border-white/10 bg-white/5 px-4 py-2 rounded-xl">
                                 {stop.name}
                               </Badge>
                             ))}
                          </div>
                       </div>

                       <div className="pt-10 border-t border-white/5 flex justify-between items-center group-hover:translate-x-2 transition-transform duration-500">
                          <span className="text-[11px] font-black uppercase text-primary tracking-[0.5em]">Join Corridor</span>
                          <ArrowRight className="h-6 w-6 text-primary" />
                       </div>
                    </div>
                 </Card>
               ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA: SIMPLE ENGLISH ACTION */}
        <section className="py-60 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/5 blur-[150px] animate-pulse" />
           <div className="container mx-auto px-8 lg:px-24 text-center space-y-16 relative z-10">
              <div className="space-y-8 max-w-4xl mx-auto">
                 <h2 className="text-7xl lg:text-[10rem] font-black uppercase italic tracking-tighter text-white leading-[0.8] text-glow">Ready to <br/> Board?</h2>
                 <p className="text-2xl font-bold text-slate-400 italic">Secure your scholar identity and start your first mission today.</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-10">
                 <Link href="/auth/signup">
                    <Button className="h-24 px-16 bg-white text-slate-950 rounded-[2.5rem] font-black uppercase italic text-2xl shadow-[0_0_80px_rgba(255,255,255,0.2)] hover:bg-primary hover:text-white transition-all duration-700 hover:scale-110">Scholar Signup</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="ghost" className="h-24 px-16 border-white/10 text-white rounded-[2.5rem] font-black uppercase italic text-2xl glass-card hover:bg-white/10 transition-all duration-700">Fleet Partner</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* GLOSSY FOOTER */}
      <footer className="py-32 border-t border-white/5 bg-slate-950 relative">
        <div className="container mx-auto px-8 lg:px-24">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-32">
            <div className="space-y-10">
              <Link href="/" className="flex items-center gap-5">
                <div className="bg-primary p-4 rounded-2xl shadow-xl"><Bus className="h-8 w-8 text-slate-950" /></div>
                <span className="text-4xl font-black italic uppercase tracking-tighter text-white">AAGO</span>
              </Link>
              <p className="max-w-sm text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 italic leading-loose">Modern high-tech transit for the scholar community. Operating premium corridors across Vizag and Vizianagaram hubs.</p>
              <div className="flex gap-8">
                 <div className="h-14 w-14 rounded-2xl glass-card flex items-center justify-center text-slate-500 hover:text-primary transition-all cursor-pointer"><Cpu className="h-6 w-6" /></div>
                 <div className="h-14 w-14 rounded-2xl glass-card flex items-center justify-center text-slate-500 hover:text-primary transition-all cursor-pointer"><Sparkles className="h-6 w-6" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-24 lg:gap-40">
              <div className="space-y-8">
                <p className="text-[12px] font-black uppercase tracking-[0.5em] text-white">Hub Access</p>
                <nav className="flex flex-col gap-6 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Terminal</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Operator Console</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-3"><LayoutDashboard className="h-5 w-5" /> Operations Hub</Link>
                </nav>
              </div>
              <div className="space-y-8">
                <p className="text-[12px] font-black uppercase tracking-[0.5em] text-white">Operational Info</p>
                <nav className="flex flex-col gap-6 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Safety Grid</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Corridor Map</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Terms of Boarding</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-32 pt-16 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-8">
            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-600 italic">© 2024 AAGO MOBILITY GLOBAL NETWORK. ALL RIGHS RESERVED.</p>
            <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
               <span className="text-cyan-400">Vizag Regional Active</span>
               <span>•</span>
               <span className="text-cyan-400">VZM Hub Synchronized</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}