"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, 
  MapPin, 
  Search, 
  Smartphone, 
  ArrowRight, 
  Navigation,
  QrCode,
  ShieldCheck,
  Zap,
  Cpu,
  Globe,
  Activity,
  ChevronRight,
  Fingerprint,
  Radio,
  Clock,
  Menu,
  X
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

function HighTechSimulator() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [activeScreen, setActiveScreen] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientY - rect.top) / rect.height - 0.5;
    const y = (e.clientX - rect.left) / rect.width - 0.5;
    setRotation({ x: -x * 20, y: y * 20 });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[400px] aspect-[9/19] mx-auto perspective-1000 group transition-all duration-700"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Floating Accents */}
      <div 
        className="absolute -top-10 -right-10 glass-card p-6 rounded-[2rem] shadow-2xl z-20 animate-bounce duration-[3000ms]"
        style={{ transform: `translateZ(50px) rotateX(${rotation.x * 1.2}deg) rotateY(${rotation.y * 1.2}deg)` }}
      >
        <Fingerprint className="h-8 w-8 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-white/40">Verified</p>
      </div>

      <div 
        className="absolute -bottom-10 -left-10 glass-card p-6 rounded-[2rem] shadow-2xl z-20 animate-pulse"
        style={{ transform: `translateZ(80px) rotateX(${rotation.x * 0.8}deg) rotateY(${rotation.y * 0.8}deg)` }}
      >
        <Radio className="h-8 w-8 text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-white/40">Live Feed</p>
      </div>

      {/* Main Device Body */}
      <div 
        className="relative w-full h-full bg-slate-950 rounded-[4rem] border-[12px] border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden transition-transform duration-300 ease-out"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        {/* Screen Content */}
        <div className="h-full w-full bg-slate-900 flex flex-col pt-12">
          {/* Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-900 rounded-b-3xl z-30" />
          
          <div className="flex-1 p-6 flex flex-col gap-6">
            <header className="flex justify-between items-center">
              <Bus className="h-6 w-6 text-primary" />
              <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase tracking-widest">Network Active</Badge>
                <h3 className="text-3xl font-black text-white italic uppercase leading-none">Scanning <br/>Regional Grid.</h3>
                <div className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center relative overflow-hidden">
                  <div className="h-32 w-32 bg-primary/20 rounded-full animate-ping" />
                  <MapPin className="h-10 w-10 text-primary absolute" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-6 animate-in slide-in-from-right-8">
                <Badge className="bg-accent/20 text-accent border-none text-[10px] font-black uppercase tracking-widest">Boarding Pass</Badge>
                <h3 className="text-3xl font-black text-white italic uppercase leading-none">Verified <br/>Identity.</h3>
                <div className="flex-1 bg-white p-6 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center gap-6">
                  <QrCode className="h-32 w-32 text-slate-950" />
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-950 uppercase italic">Scholar #8821</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hub: Vizag Central</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-6 animate-in zoom-in duration-500">
                <Badge className="bg-green-500/20 text-green-400 border-none text-[10px] font-black uppercase tracking-widest">In Transit</Badge>
                <h3 className="text-3xl font-black text-white italic uppercase leading-none">Live <br/>Telemetry.</h3>
                <div className="flex-1 bg-white/5 rounded-[2.5rem] border border-white/10 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-white/40">VXM Express</span>
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-accent animate-pulse" />
                    <span className="text-xs font-bold text-white/80">Satellite Synced</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-24 bg-slate-950 border-t border-white/5 flex justify-around items-center px-8">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${activeScreen === i ? 'bg-primary w-8' : 'bg-white/20'}`} 
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white selection:bg-primary selection:text-white">
      {/* 4K Tech Nav */}
      <header className="fixed top-0 left-0 right-0 h-24 z-50 px-6 lg:px-24 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-2xl">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="bg-primary p-3 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.5)] group-hover:rotate-12 transition-transform">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black italic font-headline tracking-tighter uppercase text-glow">AAGO</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-12">
          {['Network', 'Security', 'Scholar Hub', 'Dispatch'].map((item) => (
            <Link 
              key={item} 
              href="#" 
              className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
          <Link href="/auth/login">
            <Button variant="outline" className="h-12 border-white/10 bg-white/5 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-slate-950 transition-all">
              Login Terminal
            </Button>
          </Link>
        </nav>

        <Button 
          variant="ghost" 
          className="lg:hidden h-12 w-12 rounded-xl bg-white/5"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
          {['Network', 'Security', 'Scholar Hub', 'Dispatch'].map((item) => (
            <Link key={item} href="#" className="text-3xl font-black uppercase italic tracking-tighter">{item}</Link>
          ))}
          <hr className="border-white/5" />
          <Link href="/auth/login">
            <Button className="w-full h-16 bg-primary rounded-2xl font-black uppercase italic text-lg">Login Terminal</Button>
          </Link>
        </div>
      )}

      <main className="pt-24">
        {/* Hero Section: The "4K" Tech Reveal */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
          
          <div className="container mx-auto px-6 lg:px-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12 animate-in fade-in slide-in-from-left-12 duration-1000">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full backdrop-blur-xl">
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">System Online: Regional Hub V4.0</span>
                  </div>
                  <h1 className="text-7xl lg:text-[9rem] font-black leading-[0.8] font-headline uppercase italic tracking-tighter text-glow">
                    Smart <br /> Scholar <br /> <span className="text-primary">Grid.</span>
                  </h1>
                  <p className="max-w-lg text-lg lg:text-xl font-bold text-white/40 leading-relaxed border-l-4 border-primary/40 pl-8 italic">
                    Engineering precision mobility for the high-tech scholar network. Real-time satellite telemetry meets biometric-secured transit.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-20 px-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic text-xl shadow-[0_20px_40px_-10px_rgba(59,130,246,0.5)] group transition-all">
                      Access Terminal <ArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="h-20 px-12 rounded-2xl font-black uppercase italic text-xl border border-white/10 hover:bg-white/5">
                    Network Map
                  </Button>
                </div>

                <div className="flex items-center gap-10 pt-8 border-t border-white/5">
                   <div className="space-y-1">
                      <p className="text-2xl font-black italic">12.4K</p>
                      <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Active Scholars</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-2xl font-black italic">99.9%</p>
                      <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Uptime Grid</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-2xl font-black italic">Vizag / VZM</p>
                      <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Regional Hubs</p>
                   </div>
                </div>
              </div>

              <div className="lg:ml-auto">
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* Live Data Ticker */}
        <div className="bg-white/5 border-y border-white/5 py-6 overflow-hidden relative">
          <div className="flex whitespace-nowrap gap-24 animate-[marquee_30s_linear_infinite] px-24">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
                <Radio className="h-4 w-4 text-primary" /> HUB VIZAG: 12 SHUTTLES ONLINE
                <Radio className="h-4 w-4 text-accent" /> HUB VZM: DEMAND PEAKING
                <Radio className="h-4 w-4 text-green-500" /> SYSTEM HEALTH: OPTIMAL
              </div>
            ))}
          </div>
        </div>

        {/* Tech Features Bento Grid */}
        <section className="py-48 relative overflow-hidden">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="max-w-3xl space-y-6 mb-32">
              <Badge className="bg-primary/20 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em]">Grid Assets</Badge>
              <h2 className="text-6xl lg:text-8xl font-black uppercase italic leading-none">Modular <br/>Regional Intel.</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {[
                { 
                  icon: Globe, 
                  title: "Autonomous Grid", 
                  desc: "Self-optimizing regional routes utilizing live scholar demand-side analytics.",
                  color: "bg-blue-500/20"
                },
                { 
                  icon: Cpu, 
                  title: "Quantum Scheduling", 
                  desc: "Real-time dispatch synchronization ensures zero hub wait times during peak missions.",
                  color: "bg-purple-500/20"
                },
                { 
                  icon: ShieldCheck, 
                  title: "Biometric Boarding", 
                  desc: "Secured QR-authentication for instant regional clearance at every node.",
                  color: "bg-orange-500/20"
                },
                { 
                  icon: Zap, 
                  title: "Frictionless Pay", 
                  desc: "Unified scholar wallet for seamless credit-based transit transactions.",
                  color: "bg-yellow-500/20"
                },
                { 
                  icon: Activity, 
                  title: "Live Telemetry", 
                  desc: "Every asset is satellite-tracked with high-precision GPS for scholar safety.",
                  color: "bg-green-500/20"
                },
                { 
                  icon: Navigation, 
                  title: "Hub Expansion", 
                  desc: "Deploying high-tech nodes across Gitam, AU, and the entire Andhra corridor.",
                  color: "bg-pink-500/20"
                }
              ].map((item, i) => (
                <Card key={i} className="border-none bg-white/5 backdrop-blur-xl rounded-[3rem] overflow-hidden group hover:bg-white/10 transition-all duration-500 border border-white/5">
                  <CardContent className="p-12 space-y-8">
                    <div className={`w-20 h-20 ${item.color} rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter">{item.title}</h3>
                      <p className="text-base font-bold text-white/40 italic leading-relaxed">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Scholar Protocol Section */}
        <section className="py-48 bg-white text-slate-950 rounded-[5rem] overflow-hidden">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-32 items-center">
              <div className="space-y-16">
                <div className="space-y-6">
                  <Badge className="bg-primary/10 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em]">Protocol V1.0</Badge>
                  <h2 className="text-6xl lg:text-9xl font-black uppercase italic leading-[0.8] tracking-tighter">Unified <br/>Transit <br/>Cycle.</h2>
                </div>

                <div className="space-y-12">
                  {[
                    { step: "01", title: "Node Discovery", desc: "Identify the nearest regional hub via the live scholar terminal." },
                    { step: "02", title: "Asset Booking", desc: "Reserve your seat on an active mission with one-tap credit authorization." },
                    { step: "03", title: "Biometric Entry", desc: "Scan your digital ID for instant encrypted boarding clearance." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-10 group">
                      <div className="shrink-0 h-20 w-20 bg-slate-950 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black italic shadow-2xl group-hover:scale-110 transition-transform">
                        {item.step}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-3xl font-black uppercase italic tracking-tighter">{item.title}</h4>
                        <p className="text-lg font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative h-[800px] rounded-[5rem] overflow-hidden shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)]">
                <Image 
                  src={PlaceHolderImages.find(img => img.id === 'student-mobile')?.imageUrl || ""} 
                  fill 
                  className="object-cover" 
                  alt="High Tech Scholar" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                <div className="absolute bottom-16 left-16 right-16 text-white space-y-4">
                  <h3 className="text-5xl font-black italic uppercase leading-none">Regional <br/>Intelligence.</h3>
                  <p className="font-bold text-white/80 italic text-xl">Join the 12,000+ scholars already navigating the regional grid with precision.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* High-Tech CTA */}
        <section className="py-48 px-6 lg:px-24">
          <div className="max-w-6xl mx-auto glass-card rounded-[6rem] p-16 lg:p-32 relative overflow-hidden text-center space-y-12 group">
             <div className="absolute -top-32 -left-32 h-64 w-64 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/40 transition-all duration-700" />
             <div className="absolute -bottom-32 -right-32 h-64 w-64 bg-accent/20 blur-[100px] rounded-full group-hover:bg-accent/40 transition-all duration-700" />
             
             <Badge className="bg-primary/20 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.5em] italic">Network Open</Badge>
             <h3 className="text-6xl lg:text-[10rem] font-black uppercase italic leading-[0.7] tracking-tighter text-glow">
               Grid <br/> Access <br/> <span className="text-primary">Now.</span>
             </h3>
             <p className="max-w-xl mx-auto text-xl font-bold text-white/40 italic leading-relaxed">
               Secure your regional boarding identity and join the AAGO Scholar Grid today. The hub is waiting.
             </p>
             <div className="pt-10">
               <Link href="/auth/signup">
                 <Button className="h-24 px-20 bg-white text-slate-950 hover:bg-slate-100 rounded-[3rem] font-black uppercase italic text-3xl shadow-2xl transition-all hover:scale-105">
                   Request ID
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      {/* Footer: Tech-Minimalist */}
      <footer className="py-32 border-t border-white/5 bg-slate-950">
        <div className="container mx-auto px-6 lg:px-24">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-24">
            <div className="space-y-8">
              <Link href="/" className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl">
                  <Bus className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-glow">AAGO</span>
              </Link>
              <p className="max-w-xs text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic leading-loose">
                Engineering regional transit intelligence for the high-tech scholarship community. Vizag // VZM // Andhra Corridor.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-24">
              <div className="space-y-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Terminal</p>
                <nav className="flex flex-col gap-4 text-xs font-bold uppercase italic text-white/60">
                  <Link href="/auth/login" className="hover:text-primary">Scholar Hub</Link>
                  <Link href="/auth/signup" className="hover:text-primary">Request ID</Link>
                  <Link href="/driver/login" className="hover:text-primary">Fleet Ops</Link>
                </nav>
              </div>
              <div className="space-y-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Support</p>
                <nav className="flex flex-col gap-4 text-xs font-bold uppercase italic text-white/60">
                  <Link href="#" className="hover:text-primary">Help Node</Link>
                  <Link href="#" className="hover:text-primary">Safety Grid</Link>
                  <Link href="#" className="hover:text-primary">Status</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="mt-32 pt-16 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10">
            <p className="text-[9px] font-black uppercase tracking-[0.6em] text-white/10 italic">
              © 2024 AAGO MOBILITY SYSTEMS // ALL RIGHTS SECURED.
            </p>
            <div className="flex gap-12 text-[9px] font-black uppercase tracking-[0.4em] text-white/10">
              <Link href="#" className="hover:text-white transition-colors">Privacy Layer</Link>
              <Link href="#" className="hover:text-white transition-colors">Encryption Logic</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
