"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Cpu,
  Sparkles,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Globe,
  Network,
  ZapOff
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

function TechAppSimulator() {
  const [activeScreen, setActiveScreen] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-[420px] aspect-[9/18] mx-auto perspective-2000 group">
      <div className="relative w-full h-full bg-slate-950 rounded-[6rem] border-[16px] border-slate-900 shadow-[0_80px_160px_-12px_rgba(0,0,0,1)] overflow-hidden transition-all duration-1000 group-hover:rotate-y-6">
        <div className="h-full w-full bg-slate-900 flex flex-col pt-12 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-10 bg-slate-950 rounded-b-[2.5rem] z-30 flex items-center justify-center">
             <div className="w-20 h-2 bg-slate-800 rounded-full" />
          </div>
          
          <div className="flex-1 p-12 flex flex-col gap-12">
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-accent">Grid Active</span>
              </div>
              <Bus className="h-7 w-7 text-primary" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-12 animate-in fade-in slide-in-from-bottom-16 duration-1000">
                <Badge className="bg-primary/20 text-primary border-none text-[13px] font-black uppercase tracking-widest px-8 py-3">Radar Telemetry</Badge>
                <h3 className="text-6xl font-black text-white italic uppercase leading-[0.8] tracking-tighter">Live<br/>Mission<br/>Tracking.</h3>
                <div className="aspect-square bg-slate-800/50 rounded-[5rem] border border-white/5 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.2),transparent_70%)]" />
                  <div className="h-56 w-56 border-2 border-primary/20 rounded-full animate-ping" />
                  <Navigation className="h-20 w-20 text-primary absolute drop-shadow-[0_0_30px_rgba(0,255,255,0.8)]" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-12 animate-in slide-in-from-right-20 duration-1000">
                <Badge className="bg-accent/20 text-accent border-none text-[13px] font-black uppercase tracking-widest px-8 py-3">Identity Key</Badge>
                <h3 className="text-6xl font-black text-white italic uppercase leading-[0.8] tracking-tighter">Secure<br/>Boarding<br/>ID.</h3>
                <div className="flex-1 bg-white/[0.03] border border-white/10 p-12 rounded-[5rem] flex flex-col items-center justify-center gap-12 shadow-2xl">
                  <QrCode className="h-56 w-56 text-white opacity-90" />
                  <div className="text-center">
                    <p className="text-[14px] font-black text-slate-500 uppercase tracking-widest">Protocol Pass</p>
                    <p className="text-5xl font-black text-primary italic tracking-widest mt-4">AAGO-SYNC</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-12 animate-in zoom-in-95 duration-1000">
                <Badge className="bg-green-500/20 text-green-400 border-none text-[13px] font-black uppercase tracking-widest px-8 py-3">Network Pulse</Badge>
                <h3 className="text-6xl font-black text-white italic uppercase leading-[0.8] tracking-tighter">Active<br/>Commute<br/>Stats.</h3>
                <div className="flex-1 bg-slate-800/50 border border-white/5 p-12 rounded-[5rem] flex flex-col gap-10 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-black uppercase text-slate-500">Node #882</span>
                    <Activity className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div className="h-5 bg-slate-950 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_30px_rgba(0,255,255,0.6)]" />
                  </div>
                  <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                    <Clock className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-[13px] font-black uppercase text-slate-500">ETA to Destination</p>
                      <p className="text-2xl font-black italic text-white uppercase">8 Minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-32 bg-slate-950/80 border-t border-white/5 flex justify-around items-center px-16">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-3 rounded-full transition-all duration-1000 ${activeScreen === i ? 'bg-primary w-24' : 'bg-slate-800 w-5'}`} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function GlobalLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const db = useFirestore();
  const routesQuery = useMemo(() => db ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]);
  const { data: activeRoutes } = useCollection(routesQuery);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-body selection:bg-primary selection:text-white overflow-x-hidden">
      {/* ENTERPRISE NAV */}
      <header className="fixed top-0 left-0 right-0 h-32 z-50 px-12 lg:px-32 flex items-center justify-between glass-card !bg-slate-950/40 border-b border-white/5">
        <Link href="/" className="flex items-center gap-6 group">
          <div className="bg-primary p-5 rounded-[2rem] shadow-[0_0_60px_rgba(0,255,255,0.4)] group-hover:rotate-12 transition-transform duration-700">
            <Bus className="h-9 w-9 text-slate-950" />
          </div>
          <span className="text-5xl font-black italic font-headline tracking-[calc(-0.06em)] uppercase text-white leading-none">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-24">
          {['Corridors', 'Scholar Network', 'Operations'].map((item) => (
            <Link key={item} href="#" className="text-[14px] font-black uppercase tracking-[0.6em] text-slate-500 hover:text-primary transition-all duration-300">{item}</Link>
          ))}
          <Link href="/auth/login">
            <Button className="h-20 bg-white text-slate-950 px-16 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] hover:bg-primary hover:text-white transition-all duration-500 shadow-2xl">Enter Terminal</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-16 w-16 rounded-[2.5rem] bg-white/5" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </Button>
      </header>

      {/* MOBILE OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-48 px-16 flex flex-col gap-12 animate-in fade-in slide-in-from-top-20 duration-500">
          {['Corridors', 'Network', 'Support'].map((item) => (
            <Link key={item} href="#" className="text-6xl font-black uppercase italic tracking-tighter text-white border-b border-white/5 pb-10">{item}</Link>
          ))}
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full h-28 bg-primary rounded-[3.5rem] font-black uppercase italic text-4xl shadow-[0_0_80px_rgba(0,255,255,0.4)]">Access Hub</Button>
          </Link>
        </div>
      )}

      <main>
        {/* STRATEGIC HERO */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-48 pb-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(0,255,255,0.15),transparent_60%)]" />
          <div className="absolute -top-1/2 -left-1/4 w-[120vw] h-[120vw] bg-accent/5 blur-[200px] rounded-full" />
          
          <div className="container mx-auto px-12 lg:px-32 relative z-10">
            <div className="grid lg:grid-cols-2 gap-40 items-center">
              <div className="space-y-20 animate-in fade-in slide-in-from-left-20 duration-1000">
                <div className="space-y-12">
                  <div className="inline-flex items-center gap-6 bg-white/[0.03] border border-white/10 px-12 py-5 rounded-full shadow-2xl backdrop-blur-3xl">
                    <span className="h-4 w-4 bg-accent rounded-full animate-pulse shadow-[0_0_30px_rgba(0,255,255,0.8)]" />
                    <span className="text-[14px] font-black uppercase tracking-[0.6em] text-slate-400">Next-Gen Mobility Network</span>
                  </div>
                  <h1 className="text-10xl md:text-11xl lg:text-12xl font-black leading-[0.8] font-headline uppercase italic tracking-[calc(-0.06em)] text-white">
                    The Smart <br /> <span className="text-primary text-glow">Grid.</span>
                  </h1>
                  <p className="max-w-2xl text-2xl lg:text-3xl font-bold text-slate-400 leading-tight border-l-[24px] border-primary/20 pl-16 italic">
                    The commute crisis is a systemic failure. AAGO is the architectural solution—a high-tech shuttle grid built for efficiency.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-12">
                  <Link href="/auth/signup">
                    <Button className="h-28 px-20 bg-primary hover:bg-primary/90 text-slate-950 rounded-[3.5rem] font-black uppercase italic text-3xl shadow-[0_40px_80px_rgba(0,255,255,0.4)] transition-all duration-500 hover:scale-105 active:scale-95">Deploy Identity <ArrowRight className="ml-6 h-10 w-10" /></Button>
                  </Link>
                  <Button variant="ghost" className="h-28 px-20 rounded-[3.5rem] font-black uppercase italic text-3xl border border-white/10 bg-white/5 hover:bg-white/10 shadow-2xl transition-all duration-500">Live Radar</Button>
                </div>
                <div className="flex gap-24 pt-20 border-t border-white/5">
                   <div className="space-y-4">
                      <p className="text-7xl font-black italic text-white leading-none">0%</p>
                      <p className="text-[14px] font-black uppercase text-slate-500 tracking-[0.5em]">Friction Protocol</p>
                   </div>
                   <div className="space-y-4">
                      <p className="text-7xl font-black italic text-white leading-none">₹20</p>
                      <p className="text-[14px] font-black uppercase text-slate-500 tracking-[0.5em]">Base Fare Model</p>
                   </div>
                </div>
              </div>
              <div className="lg:ml-auto hidden lg:block relative">
                <div className="absolute -inset-80 bg-primary/20 blur-[200px] rounded-full -z-10 animate-pulse" />
                <div className="animate-slow-float">
                   <TechAppSimulator />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE CRISIS VS THE SOLUTION */}
        <section className="py-64 bg-slate-900/40 relative">
          <div className="container mx-auto px-12 lg:px-32">
             <div className="grid lg:grid-cols-2 gap-32 items-center">
                <div className="space-y-16">
                   <Badge className="bg-red-500/20 text-red-500 border-none px-12 py-5 text-[16px] font-black uppercase tracking-[0.7em]">The Commute Crisis</Badge>
                   <h2 className="text-8xl lg:text-[10rem] font-black uppercase italic leading-[0.8] tracking-tighter text-white">Why Change?</h2>
                   <div className="space-y-12">
                      {[
                        { title: "Economic Inefficiency", desc: "Private taxis charge 4x the value of the trip, draining student resources.", icon: IndianRupee },
                        { title: "Temporal Waste", desc: "Uncertain bus schedules cause massive delays in academic performance.", icon: Clock },
                        { title: "Safety Deficit", desc: "Unverified transport leaves scholars vulnerable in transit.", icon: ShieldAlert }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-10 items-start">
                           <div className="h-16 w-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center text-red-500 shrink-0"><item.icon className="h-8 w-8" /></div>
                           <div className="space-y-3">
                              <h4 className="text-3xl font-black italic uppercase text-white">{item.title}</h4>
                              <p className="text-xl font-bold text-slate-500 italic">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="glass-card p-24 rounded-[6rem] space-y-16 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.1),transparent_70%)]" />
                   <Badge className="bg-primary/20 text-primary border-none px-12 py-5 text-[16px] font-black uppercase tracking-[0.7em]">The AAGO Protocol</Badge>
                   <h2 className="text-8xl lg:text-[10rem] font-black uppercase italic leading-[0.8] tracking-tighter text-white">The Grid Solution.</h2>
                   <p className="text-3xl font-bold text-slate-400 italic leading-relaxed">
                      We optimized the city's flow. By using shared intelligence and high-tech corridors, we've reduced costs by 70% and wait times to zero.
                   </p>
                   <Button className="h-24 px-16 bg-primary text-slate-950 rounded-[3rem] font-black uppercase italic text-2xl shadow-2xl group-hover:scale-105 transition-transform">Explore Strategy</Button>
                </div>
             </div>
          </div>
        </section>

        {/* OPERATIONS INTELLIGENCE */}
        <section className="py-64">
          <div className="container mx-auto px-12 lg:px-32 text-center space-y-40">
            <div className="max-w-5xl mx-auto space-y-12">
               <Badge className="bg-accent/20 text-accent border-none px-16 py-5 text-[18px] font-black uppercase tracking-[0.8em]">Operational Intelligence</Badge>
               <h2 className="text-8xl lg:text-[12rem] font-black uppercase italic leading-[0.8] tracking-[calc(-0.06em)] text-white">Modern Mobility. <br/> Zero Friction.</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-20">
               {[
                 { title: "Satellite Radar", desc: "Real-time visual telemetry for every asset on the corridor. No more waiting.", icon: Radar, color: "text-primary" },
                 { title: "Identity Vault", desc: "Secure boarding using encrypted digital IDs and real-time verification.", icon: Fingerprint, color: "text-accent" },
                 { title: "Scholar Yield", desc: "Earn 10 points for every ₹100 invested in the grid. Redeem for future missions.", icon: TrendingUp, color: "text-green-400" }
               ].map((item, i) => (
                 <div key={i} className="glass-card p-20 rounded-[6rem] text-left space-y-12 hover:bg-white/[0.05] transition-all duration-700 hover:-translate-y-10 group">
                    <div className={`h-28 w-28 rounded-[3rem] bg-slate-950 flex items-center justify-center ${item.color} shadow-3xl group-hover:scale-110 transition-transform border border-white/5`}><item.icon className="h-14 w-14" /></div>
                    <div className="space-y-6">
                       <h4 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none">{item.title}</h4>
                       <p className="text-2xl font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* ACCESS PROTOCOL */}
        <section className="py-64 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,255,255,0.05),transparent_70%)]" />
          <div className="container mx-auto px-12 lg:px-32">
            <div className="grid lg:grid-cols-2 gap-48 items-center">
              <div className="relative aspect-square rounded-[8rem] overflow-hidden shadow-[0_80px_160px_-12px_rgba(0,0,0,1)] border border-white/5 group">
                 <Image 
                   src={PlaceHolderImages.find(img => img.id === '3d-shuttle')?.imageUrl || "https://picsum.photos/seed/aago-3d-bus/1200/800"} 
                   fill 
                   className="object-cover group-hover:scale-110 transition-transform duration-1000" 
                   alt="Modern Smart Shuttle" 
                   data-ai-hint="3d bus"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                 <div className="absolute bottom-24 left-24 space-y-6">
                    <Badge className="bg-primary text-slate-950 font-black uppercase italic tracking-[0.4em] px-10 py-4 rounded-full text-sm">Strategic Asset</Badge>
                    <h3 className="text-7xl font-black text-white italic uppercase tracking-tighter">The Fleet Hub.</h3>
                 </div>
              </div>

              <div className="space-y-24">
                 <div className="space-y-10">
                    <h2 className="text-8xl lg:text-[11xl] font-black uppercase italic tracking-tighter text-white leading-[0.8]">The 3-Step <br/> Protocol.</h2>
                    <p className="text-3xl font-bold text-slate-400 italic border-l-[32px] border-primary/40 pl-16">Simple. Transparent. Scalable.</p>
                 </div>
                 
                 <div className="space-y-20">
                    {[
                      { step: "01", title: "Map Node", desc: "Select your active station node on the tactical city grid.", icon: MapPin },
                      { step: "02", title: "Sync Payout", desc: "Secure your seat with a direct regional hub payment protocol.", icon: Zap },
                      { step: "03", title: "Verify Hub", desc: "Present your digital ID at the station and watch the mission live.", icon: Globe }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-16 group items-start">
                         <div className="text-[11rem] font-black italic text-white/[0.02] group-hover:text-primary transition-all duration-700 leading-none">{item.step}</div>
                         <div className="space-y-6 pt-10">
                            <h4 className="text-6xl font-black uppercase italic text-white tracking-tighter leading-none">{item.title}</h4>
                            <p className="text-2xl font-bold text-slate-500 italic">{item.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE CORRIDORS GRID */}
        <section className="py-64 bg-slate-950/40">
          <div className="container mx-auto px-12 lg:px-32 space-y-40">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-20">
              <div className="space-y-10 max-w-4xl">
                 <Badge className="bg-cyan-500/20 text-cyan-400 border-none px-12 py-5 text-[18px] font-black uppercase tracking-[0.8em]">Operational Corridors</Badge>
                 <h2 className="text-9xl lg:text-[12rem] font-black uppercase italic leading-[0.75] tracking-[calc(-0.06em)] text-white">Active <br/> Nodes.</h2>
              </div>
              <p className="text-3xl font-bold text-slate-500 italic max-w-md text-right">Real-time telemetry updated by our hub operators.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-20">
               {!activeRoutes || activeRoutes.length === 0 ? (
                 <div className="col-span-full p-40 text-center glass-card rounded-[8rem] border-dashed">
                    <ZapOff className="h-24 w-24 text-slate-800 mx-auto mb-10" />
                    <p className="text-2xl font-black uppercase tracking-[0.6em] text-slate-700 italic">No active nodes on grid.</p>
                 </div>
               ) : (
                 activeRoutes.map((route: any) => (
                   <Card key={route.id} className="glass-card p-20 rounded-[7rem] hover:shadow-[0_0_150px_rgba(0,255,255,0.2)] transition-all duration-1000 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><Network className="h-60 w-60" /></div>
                      <div className="space-y-16 relative z-10">
                         <div className="flex justify-between items-start">
                            <div className="space-y-4">
                               <p className="text-[14px] font-black uppercase tracking-[0.6em] text-primary">Corridor #SYNC</p>
                               <h4 className="text-6xl font-black italic uppercase text-white leading-none tracking-tighter">{route.routeName}</h4>
                            </div>
                            <div className="bg-primary/20 p-8 rounded-[2.5rem]"><span className="text-4xl font-black italic text-primary">₹{route.baseFare}</span></div>
                         </div>
                         
                         <div className="space-y-10">
                            <p className="text-[14px] font-black uppercase text-slate-500 tracking-[0.6em] flex items-center gap-6">
                               <Cpu className="h-7 w-7" /> Node Stations:
                            </p>
                            <div className="flex flex-wrap gap-5">
                               {route.stops?.map((stop: any, i: number) => (
                                 <Badge key={i} variant="outline" className="text-[13px] font-black uppercase italic text-slate-400 border-white/10 bg-white/[0.03] px-8 py-4 rounded-3xl">
                                   {stop.name}
                                 </Badge>
                               ))}
                            </div>
                         </div>

                         <div className="pt-16 border-t border-white/5 flex justify-between items-center group-hover:translate-x-6 transition-transform duration-700">
                            <span className="text-[14px] font-black uppercase text-primary tracking-[0.8em]">Engage Terminal</span>
                            <ArrowRight className="h-10 w-10 text-primary" />
                         </div>
                      </div>
                   </Card>
                 ))
               )}
            </div>
          </div>
        </section>

        {/* STRATEGIC CTA */}
        <section className="py-80 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/15 blur-[250px] animate-pulse" />
           <div className="container mx-auto px-12 lg:px-32 text-center space-y-32 relative z-10">
              <div className="space-y-16 max-w-7xl mx-auto">
                 <h2 className="text-10xl lg:text-[14rem] font-black uppercase italic tracking-[calc(-0.06em)] text-white leading-[0.7] text-glow">Ready to <br/> Grid?</h2>
                 <p className="text-4xl font-bold text-slate-400 italic max-w-4xl mx-auto">Join the mobility revolution. Secure your node identity today.</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-16">
                 <Link href="/auth/signup">
                    <Button className="h-32 px-24 bg-white text-slate-950 rounded-[4rem] font-black uppercase italic text-4xl shadow-[0_0_120px_rgba(255,255,255,0.4)] hover:bg-primary hover:text-white transition-all duration-700 hover:scale-110">Deploy Terminal</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="ghost" className="h-32 px-24 border-white/10 text-white rounded-[4rem] font-black uppercase italic text-4xl glass-card hover:bg-white/10 transition-all duration-700">Fleet Partner</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* ENTERPRISE FOOTER */}
      <footer className="py-48 border-t border-white/5 bg-slate-950/80 relative">
        <div className="container mx-auto px-12 lg:px-32">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-48">
            <div className="space-y-16">
              <Link href="/" className="flex items-center gap-8">
                <div className="bg-primary p-6 rounded-[2.5rem] shadow-3xl"><Bus className="h-12 w-12 text-slate-950" /></div>
                <span className="text-6xl font-black italic uppercase tracking-[calc(-0.06em)] text-white">AAGO</span>
              </Link>
              <p className="max-w-md text-[14px] font-black uppercase tracking-[0.8em] text-slate-600 italic leading-loose">The urban mobility protocol. Operating high-tech corridors across global hubs. Architecture for efficiency.</p>
              <div className="flex gap-12">
                 <div className="h-20 w-20 rounded-[2.5rem] glass-card flex items-center justify-center text-slate-500 hover:text-primary transition-all cursor-pointer"><Cpu className="h-10 w-10" /></div>
                 <div className="h-20 w-20 rounded-[2.5rem] glass-card flex items-center justify-center text-slate-500 hover:text-primary transition-all cursor-pointer"><Sparkles className="h-10 w-10" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-40 lg:gap-64">
              <div className="space-y-12">
                <p className="text-[16px] font-black uppercase tracking-[0.8em] text-white">Grid Access</p>
                <nav className="flex flex-col gap-10 text-xl font-bold uppercase italic text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Terminal</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Operator Terminal</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-5 text-primary"><Cpu className="h-7 w-7" /> Ops Center</Link>
                </nav>
              </div>
              <div className="space-y-12">
                <p className="text-[16px] font-black uppercase tracking-[0.8em] text-white">Legal Hub</p>
                <nav className="flex flex-col gap-10 text-xl font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Security Code</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Network Terms</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Privacy Grid</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-48 pt-24 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-12">
            <p className="text-[14px] font-black uppercase tracking-[0.9em] text-slate-700 italic">© 2024 AAGO GLOBAL GRID. SYNCED.</p>
            <div className="flex gap-20 text-[13px] font-black uppercase tracking-[0.7em] text-slate-600">
               <span className="text-primary">Network Pulse Live</span>
               <span className="text-primary">Global Node Sync</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}