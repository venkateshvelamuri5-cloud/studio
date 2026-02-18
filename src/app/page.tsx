
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
  Cpu,
  Globe,
  Activity,
  Fingerprint,
  Clock,
  Menu,
  X,
  ShieldAlert,
  MapPin,
  Radar,
  Star,
  ShieldQuestion,
  IndianRupee,
  LayoutDashboard
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
      <div className="relative w-full h-full bg-slate-900 rounded-[3.5rem] border-[10px] border-slate-800 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] overflow-hidden transition-transform duration-700 group-hover:rotate-y-6">
        <div className="h-full w-full bg-slate-50 flex flex-col pt-8 relative">
          {/* Top Speaker/Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
             <div className="w-10 h-1 bg-slate-800 rounded-full" />
          </div>
          
          <div className="flex-1 p-6 flex flex-col gap-6">
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Hub Active</span>
              </div>
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center"><Bus className="h-3 w-3 text-primary" /></div>
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1">Scanning Grid</Badge>
                <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-[0.9]">Live<br/>Radar.</h3>
                <div className="aspect-square bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center relative overflow-hidden border border-slate-100">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)]" />
                  <div className="h-32 w-32 border-2 border-primary/20 rounded-full animate-ping" />
                  <div className="h-20 w-20 border-2 border-primary/40 rounded-full animate-[ping_2s_infinite]" />
                  <Navigation className="h-10 w-10 text-primary absolute drop-shadow-lg" />
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                  <Radar className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-[10px] font-black uppercase italic text-slate-500">Finding nearest shuttle...</span>
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-6 animate-in slide-in-from-right-8 duration-700">
                <Badge className="bg-accent text-white border-none text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1">Secure ID</Badge>
                <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-[0.9]">Smart<br/>Boarding.</h3>
                <div className="flex-1 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <QrCode className="h-32 w-32 text-slate-900" />
                    <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-lg" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Boarding Code</p>
                    <p className="text-2xl font-black text-primary italic tracking-widest mt-1">837 332</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-6 animate-in zoom-in duration-700">
                <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1">On Mission</Badge>
                <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-[0.9]">Mission<br/>Tracking.</h3>
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 p-6 flex flex-col gap-5 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Route #VZ-01</span>
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black italic uppercase">
                      <span>Progress</span>
                      <span className="text-primary">65%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[65%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-4 border-t border-slate-50">
                    <Clock className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400">ETA to Hub</p>
                      <p className="text-xs font-black italic text-slate-900 uppercase">12 Minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-20 bg-white border-t border-slate-100 flex justify-around items-center px-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${activeScreen === i ? 'bg-primary w-12' : 'bg-slate-200 w-2'}`} />
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
    <div className="flex flex-col min-h-screen bg-white text-slate-950 font-body selection:bg-primary selection:text-white">
      <header className="fixed top-0 left-0 right-0 h-20 z-50 px-6 lg:px-20 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-3xl shadow-sm">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-3 rounded-xl shadow-[0_8px_20px_rgba(59,130,246,0.3)] group-hover:rotate-12 transition-transform">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-black italic font-headline tracking-tighter uppercase text-primary leading-none">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-12">
          {['Corridors', 'Scholar Hub', 'Support'].map((item) => (
            <Link key={item} href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-primary transition-colors">{item}</Link>
          ))}
          <Link href="/auth/login">
            <Button variant="outline" className="h-11 border-slate-200 bg-slate-50 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">Login Terminal</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-11 w-11 rounded-xl bg-slate-50" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-8 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {['Corridors', 'Scholar Hub', 'Support'].map((item) => (
            <Link key={item} href="#" className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 border-b border-slate-50 pb-4">{item}</Link>
          ))}
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full h-18 bg-primary rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20">Access Grid</Button>
          </Link>
        </div>
      )}

      <main className="pt-20">
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden py-20 bg-slate-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(59,130,246,0.15),transparent_70%)]" />
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3 bg-white border border-slate-200 px-6 py-2 rounded-full shadow-md">
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Regional Network Live</span>
                  </div>
                  <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.8] font-headline uppercase italic tracking-tighter text-slate-950">
                    Smart <br /> Travel for <br /> <span className="text-primary drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">Scholars.</span>
                  </h1>
                  <p className="max-w-md text-base lg:text-lg font-bold text-slate-500 leading-relaxed border-l-8 border-primary/10 pl-8 italic">
                    The simplest way for students to get around Vizag and VZM hubs. Live radar, secure IDs, and simple regional boarding.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-18 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic text-lg shadow-[0_15px_40px_rgba(59,130,246,0.4)] transition-all hover:scale-105">Join the Grid <ArrowRight className="ml-3 h-5 w-5" /></Button>
                  </Link>
                  <Button variant="ghost" className="h-18 px-10 rounded-2xl font-black uppercase italic text-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all">View Corridor Map</Button>
                </div>
                <div className="flex gap-12 pt-10 border-t border-slate-200">
                   <div className="space-y-1">
                      <p className="text-3xl font-black italic text-slate-900">100%</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Uptime Pulse</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-3xl font-black italic text-slate-900">20k+</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Commute Missions</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-3xl font-black italic text-slate-900">2 Hubs</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Regional Active</p>
                   </div>
                </div>
              </div>
              <div className="lg:ml-auto hidden lg:block relative">
                <div className="absolute -inset-20 bg-primary/10 blur-[100px] rounded-full -z-10 animate-pulse" />
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* OPERATIONS INTELLIGENCE (HIGHLIGHTS) */}
        <section className="py-32 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
              <div className="space-y-10">
                <div className="space-y-4">
                  <Badge className="bg-accent/10 text-accent border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em]">Grid Intelligence</Badge>
                  <h2 className="text-5xl lg:text-7xl font-black uppercase italic leading-none tracking-tighter text-slate-900">Built for the <br/> Modern Hub.</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   {[
                     { title: "Live Radar", desc: "Never guess where the bus is. Our tactical map shows live shuttle movement on your corridor.", icon: Radar },
                     { title: "Scholar Points", desc: "Earn points for every commute. For every ₹100 spent, get 10 points for regional rewards.", icon: Star },
                     { title: "Hub Payments", desc: "Pay regional accounts directly using UPI. Fast, secure, and fully verified by the hub.", icon: IndianRupee },
                     { title: "SOS Safety", desc: "Emergency radar on every ride. Direct dispatch support for all scholar missions.", icon: ShieldAlert }
                   ].map((feat, i) => (
                     <div key={i} className="space-y-4 group p-6 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><feat.icon className="h-6 w-6" /></div>
                        <h4 className="text-xl font-black uppercase italic text-slate-900">{feat.title}</h4>
                        <p className="text-xs font-bold text-slate-400 italic leading-tight">{feat.desc}</p>
                     </div>
                   ))}
                </div>
              </div>
              <div className="relative aspect-square rounded-[4rem] overflow-hidden shadow-2xl group">
                 <Image src={PlaceHolderImages.find(img => img.id === 'student-group')?.imageUrl || "https://picsum.photos/seed/aago-group/800/600"} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" alt="Students commuting" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                 <div className="absolute bottom-10 left-10 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Operational Community</p>
                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Connecting Scholars.</h3>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION FLOW (HOW IT WORKS) */}
        <section className="py-32 bg-slate-950 text-white rounded-[4rem] lg:rounded-[6rem] mx-6 lg:mx-10 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.2),transparent_70%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10 text-center space-y-20">
            <div className="max-w-2xl mx-auto space-y-6">
              <Badge className="bg-primary/20 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em]">The Protocol</Badge>
              <h2 className="text-5xl lg:text-7xl font-black uppercase italic leading-tight tracking-tighter">Your Mission <br/> Start to End.</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 lg:gap-20">
               {[
                 { step: "01", title: "Find your Hub", desc: "Select your starting and ending stations on the live corridor map.", icon: MapPin },
                 { step: "02", title: "Secure a Seat", desc: "Choose your shuttle and confirm your seat with a regional UPI payment.", icon: Zap },
                 { step: "03", title: "Board & Ride", desc: "Show your unique ID to the operator and track your mission in real-time.", icon: Fingerprint }
               ].map((item, i) => (
                 <div key={i} className="relative group text-left space-y-8 bg-white/5 p-10 rounded-[3.5rem] border border-white/5 backdrop-blur-xl hover:bg-white/10 transition-all">
                    <div className="absolute -top-6 -right-6 text-7xl font-black italic text-white/5 group-hover:text-primary/20 transition-all">{item.step}</div>
                    <div className="h-20 w-20 bg-primary rounded-2xl flex items-center justify-center text-white shadow-[0_15px_30px_rgba(59,130,246,0.3)]"><item.icon className="h-10 w-10" /></div>
                    <div className="space-y-3">
                       <h4 className="text-3xl font-black uppercase italic tracking-tighter">{item.title}</h4>
                       <p className="text-base font-bold text-white/40 italic leading-tight">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>

            <Link href="/auth/signup" className="inline-block pt-10">
               <Button className="h-20 px-14 bg-white text-slate-900 rounded-3xl font-black uppercase italic text-xl shadow-2xl hover:bg-primary hover:text-white transition-all">Initiate Onboarding</Button>
            </Link>
          </div>
        </section>

        {/* ACTIVE CORRIDORS GRID */}
        <section className="py-32 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="max-w-2xl space-y-6 mb-20">
              <Badge className="bg-primary text-white border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em]">Live Network</Badge>
              <h2 className="text-4xl lg:text-6xl font-black uppercase italic leading-tight tracking-tighter text-slate-950">Active Corridor Grid.</h2>
              <p className="text-lg font-bold text-slate-400 italic">Live shuttle corridors connecting regional hubs in real-time.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              {activeRoutes?.map((route: any) => (
                <Card key={route.id} className="bg-white rounded-[3.5rem] p-10 border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_80px_rgba(59,130,246,0.12)] transition-all group overflow-hidden relative border border-slate-50">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Navigation className="h-24 w-24" /></div>
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                      <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest mb-3">{route.city} Hub</Badge>
                      <h4 className="text-3xl font-black italic uppercase text-slate-900 leading-none">{route.routeName}</h4>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-2xl"><span className="text-xl font-black italic text-primary">₹{route.baseFare}</span></div>
                  </div>
                  <div className="space-y-6 relative z-10">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2">
                       <MapPin className="h-3 w-3" /> Station Markers:
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {route.stops?.map((stop: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px] font-black uppercase italic text-slate-500 border-slate-100 bg-slate-50/50 px-3 py-1.5">
                          {stop.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-10 pt-8 border-t border-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                     <span className="text-[10px] font-black uppercase text-primary tracking-widest">Access Tactical Radar</span>
                     <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-32 bg-slate-50">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-12">
              <div className="space-y-6 max-w-2xl mx-auto">
                 <h2 className="text-5xl lg:text-7xl font-black uppercase italic tracking-tighter text-slate-900">Secure your Hub Access.</h2>
                 <p className="text-lg font-bold text-slate-400 italic">Join thousands of scholars moving across the regional grid every single day.</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link href="/auth/signup">
                  <Button className="h-20 px-12 bg-slate-950 text-white rounded-[1.5rem] font-black uppercase italic text-xl shadow-2xl hover:bg-primary transition-all">Scholar Account</Button>
                </Link>
                <Link href="/driver/signup">
                  <Button variant="outline" className="h-20 px-12 border-slate-200 text-slate-900 rounded-[1.5rem] font-black uppercase italic text-xl shadow-sm hover:border-primary hover:text-primary transition-all">Fleet Partner</Button>
                </Link>
              </div>
           </div>
        </section>
      </main>

      <footer className="py-24 border-t border-slate-100 bg-white">
        <div className="container mx-auto px-6 lg:px-20">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-20">
            <div className="space-y-8">
              <Link href="/" className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-xl shadow-lg"><Bus className="h-6 w-6 text-white" /></div>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-primary">AAGO</span>
              </Link>
              <p className="max-w-xs text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic leading-loose">Modern regional transit for the scholar community. Connecting campuses across Vizag and Vizianagaram hubs through tactical mission planning.</p>
              <div className="flex gap-6">
                 <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer"><Globe className="h-5 w-5" /></div>
                 <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer"><Activity className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-20 lg:gap-32">
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Regional Portals</p>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Terminal</Link>
                  <Link href="/auth/signup" className="hover:text-primary transition-colors">Create Identity</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Operator Console</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Operations Hub</Link>
                </nav>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Grid Info</p>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Safety Protocol</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Route Maps</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Privacy Radar</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Terms of Mission</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">© 2024 AAGO MOBILITY GLOBAL NETWORK.</p>
            <div className="flex gap-8 text-[8px] font-black uppercase tracking-widest text-slate-400">
               <span>Vizag Hub</span>
               <span>•</span>
               <span>VZM Hub</span>
               <span>•</span>
               <span>Operational State: Normal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
