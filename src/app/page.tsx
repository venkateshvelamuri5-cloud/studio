"use client";

import { useState, useEffect, useRef } from 'react';
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
  Cpu,
  Globe,
  Activity,
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
    setRotation({ x: -x * 30, y: y * 30 });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[450px] aspect-[9/18] mx-auto perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="relative w-full h-full bg-slate-950 rounded-[4rem] border-[14px] border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden transition-transform duration-500 ease-out"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <div className="h-full w-full bg-slate-900 flex flex-col pt-12 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-900 rounded-b-3xl z-30" />
          
          <div className="flex-1 p-8 flex flex-col gap-8">
            <header className="flex justify-between items-center">
              <Bus className="h-7 w-7 text-primary" />
              <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-8">
                <Badge className="bg-primary/20 text-primary border-none text-[12px] font-black uppercase tracking-widest px-4 py-1">Grid Active</Badge>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Scanning<br/>Network.</h3>
                <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/10 flex items-center justify-center relative overflow-hidden">
                  <div className="h-40 w-40 bg-primary/20 rounded-full animate-ping" />
                  <Navigation className="h-12 w-12 text-primary absolute" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-8 animate-in slide-in-from-right-12">
                <Badge className="bg-accent/20 text-accent border-none text-[12px] font-black uppercase tracking-widest px-4 py-1">Verified ID</Badge>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Secure<br/>Access.</h3>
                <div className="flex-1 bg-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center gap-8">
                  <QrCode className="h-40 w-40 text-slate-950" />
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-950 uppercase italic">Scholar #8821</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Hub: Vizag Central</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-8 animate-in zoom-in duration-500">
                <Badge className="bg-green-500/20 text-green-400 border-none text-[12px] font-black uppercase tracking-widest px-4 py-1">In Transit</Badge>
                <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Live<br/>Telemetry.</h3>
                <div className="flex-1 bg-white/5 rounded-[3rem] border border-white/10 p-8 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase text-white/40 tracking-widest">Route #VX-01</span>
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Activity className="h-5 w-5 text-accent animate-pulse" />
                    <span className="text-sm font-bold text-white/80">Satellite Synced</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-28 bg-slate-950 border-t border-white/5 flex justify-around items-center px-12">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-2 w-2 rounded-full transition-all duration-700 ${activeScreen === i ? 'bg-primary w-12' : 'bg-white/10'}`} 
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
      <header className="fixed top-0 left-0 right-0 h-28 z-50 px-8 lg:px-32 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-3xl">
        <Link href="/" className="flex items-center gap-5 group">
          <div className="bg-primary p-4 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.5)] group-hover:rotate-12 transition-transform">
            <Bus className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-black italic font-headline tracking-tighter uppercase text-glow">AAGO</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-16">
          {['Network', 'Scholar Hub', 'Dispatch'].map((item) => (
            <Link 
              key={item} 
              href="#" 
              className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
          <Link href="/auth/login">
            <Button variant="outline" className="h-14 border-white/10 bg-white/5 px-10 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-slate-950 transition-all">
              Login Terminal
            </Button>
          </Link>
        </nav>

        <Button 
          variant="ghost" 
          className="lg:hidden h-14 w-14 rounded-2xl bg-white/5"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-32 px-10 flex flex-col gap-10 animate-in fade-in slide-in-from-top-6 duration-500">
          {['Network', 'Scholar Hub', 'Dispatch'].map((item) => (
            <Link key={item} href="#" className="text-5xl font-black uppercase italic tracking-tighter">{item}</Link>
          ))}
          <hr className="border-white/5" />
          <Link href="/auth/login">
            <Button className="w-full h-20 bg-primary rounded-3xl font-black uppercase italic text-2xl shadow-2xl shadow-primary/20">Login Terminal</Button>
          </Link>
        </div>
      )}

      <main className="pt-28">
        <section className="relative min-h-screen flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)]" />
          
          <div className="container mx-auto px-8 lg:px-32 relative z-10">
            <div className="grid lg:grid-cols-2 gap-32 items-center">
              <div className="space-y-16 animate-in fade-in slide-in-from-left-16 duration-1000">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-2.5 rounded-full backdrop-blur-2xl">
                    <span className="h-2.5 w-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_20px_rgba(59,130,246,1)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/60">System Online: Regional Hub V4.0</span>
                  </div>
                  <h1 className="text-[10rem] lg:text-[14rem] font-black leading-[0.75] font-headline uppercase italic tracking-tighter text-glow drop-shadow-2xl">
                    Smart <br /> Scholar <br /> <span className="text-primary">Grid.</span>
                  </h1>
                  <p className="max-w-xl text-xl lg:text-2xl font-bold text-white/40 leading-relaxed border-l-4 border-primary/40 pl-10 italic">
                    Engineering precision mobility for the high-tech scholar network. Real-time satellite telemetry meets biometric-secured transit.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-8">
                  <Link href="/auth/signup">
                    <Button className="h-24 px-16 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black uppercase italic text-2xl shadow-[0_30px_60px_-15px_rgba(59,130,246,0.6)] group transition-all">
                      Access Terminal <ArrowRight className="ml-4 group-hover:translate-x-3 transition-transform h-7 w-7" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="h-24 px-16 rounded-3xl font-black uppercase italic text-2xl border border-white/10 hover:bg-white/5">
                    Network Map
                  </Button>
                </div>

                <div className="flex items-center gap-16 pt-12 border-t border-white/5">
                   <div className="space-y-2">
                      <p className="text-4xl font-black italic">12.4K</p>
                      <p className="text-[12px] font-black uppercase text-white/30 tracking-widest">Active Scholars</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-4xl font-black italic">99.9%</p>
                      <p className="text-[12px] font-black uppercase text-white/30 tracking-widest">Uptime Grid</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-4xl font-black italic">Vizag Hub</p>
                      <p className="text-[12px] font-black uppercase text-white/30 tracking-widest">Regional Node</p>
                   </div>
                </div>
              </div>

              <div className="lg:ml-auto hidden lg:block">
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        <section className="py-64 relative overflow-hidden bg-slate-950/50">
          <div className="container mx-auto px-8 lg:px-32">
            <div className="max-w-4xl space-y-10 mb-40">
              <Badge className="bg-primary/20 text-primary border-none px-8 py-3 text-[12px] font-black uppercase tracking-[0.5em]">Protocol Assets</Badge>
              <h2 className="text-8xl lg:text-[11rem] font-black uppercase italic leading-[0.8] tracking-tighter">Modular <br/>Regional Intel.</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
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
                  icon: Fingerprint, 
                  title: "Hub Expansion", 
                  desc: "Deploying high-tech nodes across Gitam, AU, and the entire Andhra corridor.",
                  color: "bg-pink-500/20"
                }
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-[4rem] p-16 space-y-10 group hover:bg-white/10 transition-all duration-700">
                  <div className={`w-24 h-24 ${item.color} rounded-[2.5rem] flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-12 w-12 text-white" />
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-4xl font-black uppercase italic tracking-tighter">{item.title}</h3>
                    <p className="text-lg font-bold text-white/40 italic leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-64 bg-white text-slate-950 rounded-[6rem] lg:rounded-[10rem]">
          <div className="container mx-auto px-8 lg:px-32">
            <div className="grid lg:grid-cols-2 gap-40 items-center">
              <div className="space-y-24">
                <div className="space-y-8">
                  <Badge className="bg-primary/10 text-primary border-none px-8 py-3 text-[12px] font-black uppercase tracking-[0.5em]">Protocol V1.0</Badge>
                  <h2 className="text-8xl lg:text-[12rem] font-black uppercase italic leading-[0.75] tracking-tighter">Unified <br/>Transit <br/>Cycle.</h2>
                </div>

                <div className="space-y-16">
                  {[
                    { step: "01", title: "Node Discovery", desc: "Identify the nearest regional hub via the live scholar terminal." },
                    { step: "02", title: "Asset Booking", desc: "Reserve your seat on an active mission with one-tap credit authorization." },
                    { step: "03", title: "Biometric Entry", desc: "Scan your digital ID for instant encrypted boarding clearance." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-12 group">
                      <div className="shrink-0 h-24 w-24 bg-slate-950 rounded-[3rem] flex items-center justify-center text-white text-3xl font-black italic shadow-2xl group-hover:scale-110 transition-transform">
                        {item.step}
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-4xl font-black uppercase italic tracking-tighter">{item.title}</h4>
                        <p className="text-xl font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative h-[1000px] rounded-[6rem] lg:rounded-[8rem] overflow-hidden shadow-[0_100px_200px_-40px_rgba(0,0,0,0.5)] border-[16px] border-white">
                <Image 
                  src={PlaceHolderImages.find(img => img.id === 'student-mobile')?.imageUrl || ""} 
                  fill 
                  className="object-cover" 
                  alt="High Tech Scholar" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                <div className="absolute bottom-20 left-20 right-20 text-white space-y-6">
                  <h3 className="text-6xl lg:text-7xl font-black italic uppercase leading-none tracking-tighter">Regional <br/>Intelligence.</h3>
                  <p className="font-bold text-white/90 italic text-2xl lg:text-3xl leading-tight">Join the 12,000+ scholars already navigating the regional grid with precision.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-64 px-8 lg:px-32">
          <div className="max-w-[1400px] mx-auto glass-card rounded-[8rem] p-24 lg:p-48 relative overflow-hidden text-center space-y-16 group">
             <div className="absolute -top-64 -left-64 h-[500px] w-[500px] bg-primary/20 blur-[150px] rounded-full group-hover:bg-primary/40 transition-all duration-1000" />
             <div className="absolute -bottom-64 -right-64 h-[500px] w-[500px] bg-accent/20 blur-[150px] rounded-full group-hover:bg-accent/40 transition-all duration-1000" />
             
             <Badge className="bg-primary/20 text-primary border-none px-8 py-3 text-[12px] font-black uppercase tracking-[0.6em] italic">Terminal Open</Badge>
             <h3 className="text-9xl lg:text-[16rem] font-black uppercase italic leading-[0.65] tracking-tighter text-glow drop-shadow-2xl">
               Grid <br/> Access <br/> <span className="text-primary">Now.</span>
             </h3>
             <p className="max-w-2xl mx-auto text-2xl lg:text-3xl font-bold text-white/40 italic leading-relaxed">
               Secure your regional boarding identity and join the AAGO Scholar Grid today. The hub is waiting.
             </p>
             <div className="pt-16">
               <Link href="/auth/signup">
                 <Button className="h-32 px-24 bg-white text-slate-950 hover:bg-slate-100 rounded-[4rem] font-black uppercase italic text-4xl shadow-2xl transition-all hover:scale-105">
                   Request ID
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      <footer className="py-48 border-t border-white/5 bg-slate-950">
        <div className="container mx-auto px-8 lg:px-32">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-32">
            <div className="space-y-12">
              <Link href="/" className="flex items-center gap-6">
                <div className="bg-primary p-5 rounded-2xl">
                  <Bus className="h-8 w-8 text-white" />
                </div>
                <span className="text-4xl font-black italic uppercase tracking-tighter text-glow">AAGO</span>
              </Link>
              <p className="max-w-md text-[12px] font-black uppercase tracking-[0.5em] text-white/20 italic leading-loose">
                Engineering regional transit intelligence for the high-tech scholarship community. Vizag // VZM // Andhra Corridor.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-2 gap-32">
              <div className="space-y-10">
                <p className="text-[12px] font-black uppercase tracking-widest text-white/40">Terminal</p>
                <nav className="flex flex-col gap-6 text-sm font-bold uppercase italic text-white/60">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Hub</Link>
                  <Link href="/auth/signup" className="hover:text-primary transition-colors">Request ID</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Fleet Ops</Link>
                </nav>
              </div>
              <div className="space-y-10">
                <p className="text-[12px] font-black uppercase tracking-widest text-white/40">Hub Info</p>
                <nav className="flex flex-col gap-6 text-sm font-bold uppercase italic text-white/60">
                  <Link href="#" className="hover:text-primary transition-colors">Network Map</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Safety Grid</Link>
                  <Link href="#" className="hover:text-primary transition-colors">System Status</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="mt-48 pt-20 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-12">
            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white/10 italic">
              © 2024 AAGO MOBILITY SYSTEMS // ALL RIGHTS SECURED.
            </p>
            <div className="flex gap-16 text-[10px] font-black uppercase tracking-[0.5em] text-white/10">
              <Link href="#" className="hover:text-white transition-colors">Privacy Layer</Link>
              <Link href="#" className="hover:text-white transition-colors">Encryption Logic</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}