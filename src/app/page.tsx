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
  X,
  ShieldAlert
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
    setRotation({ x: -x * 15, y: y * 15 });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[340px] aspect-[9/18] mx-auto perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="relative w-full h-full bg-slate-950 rounded-[2.5rem] border-[8px] border-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden transition-transform duration-500 ease-out"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <div className="h-full w-full bg-slate-900 flex flex-col pt-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-b-xl z-30" />
          
          <div className="flex-1 p-5 flex flex-col gap-5">
            <header className="flex justify-between items-center">
              <Bus className="h-5 w-5 text-primary" />
              <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-5 animate-in fade-in slide-in-from-bottom-4">
                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Grid Active</Badge>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight">Scanning<br/>Network.</h3>
                <div className="aspect-square bg-white/5 rounded-[1.5rem] border border-white/10 flex items-center justify-center relative overflow-hidden">
                  <div className="h-24 w-24 bg-primary/20 rounded-full animate-ping" />
                  <Navigation className="h-8 w-8 text-primary absolute" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-5 animate-in slide-in-from-right-8">
                <Badge className="bg-accent/20 text-accent border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Verified ID</Badge>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight">Secure<br/>Access.</h3>
                <div className="flex-1 bg-white p-5 rounded-[1.5rem] shadow-2xl flex flex-col items-center justify-center gap-5">
                  <QrCode className="h-28 w-28 text-slate-950" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-950 uppercase italic">Scholar #8821</p>
                  </div>
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-5 animate-in zoom-in duration-500">
                <Badge className="bg-green-500/20 text-green-400 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">In Transit</Badge>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight">Live<br/>Telemetry.</h3>
                <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/10 p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Route #VX-01</span>
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-accent animate-pulse" />
                    <span className="text-[10px] font-bold text-white/80">Satellite Synced</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-16 bg-slate-950 border-t border-white/5 flex justify-around items-center px-8">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-1 w-1 rounded-full transition-all duration-700 ${activeScreen === i ? 'bg-primary w-8' : 'bg-white/10'}`} 
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
      <header className="fixed top-0 left-0 right-0 h-16 z-50 px-6 lg:px-20 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-3xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-primary p-2.5 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:rotate-12 transition-transform">
            <Bus className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black italic font-headline tracking-tighter uppercase text-glow">AAGO</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {['Network', 'Scholar Hub', 'Safety'].map((item) => (
            <Link 
              key={item} 
              href="#" 
              className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
          <Link href="/auth/login">
            <Button variant="outline" className="h-9 border-white/10 bg-white/5 px-5 rounded-lg font-black uppercase text-[9px] tracking-widest hover:bg-white hover:text-slate-950 transition-all">
              Login
            </Button>
          </Link>
        </nav>

        <Button 
          variant="ghost" 
          className="lg:hidden h-9 w-9 rounded-lg bg-white/5"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-20 px-8 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-500">
          {['Network', 'Scholar Hub', 'Safety'].map((item) => (
            <Link key={item} href="#" className="text-2xl font-black uppercase italic tracking-tighter">{item}</Link>
          ))}
          <hr className="border-white/5" />
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full h-14 bg-primary rounded-xl font-black uppercase italic text-lg">Login Terminal</Button>
          </Link>
        </div>
      )}

      <main className="pt-16">
        <section className="relative min-h-[85vh] flex items-center overflow-hidden py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08),transparent_70%)]" />
          
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 px-5 py-1.5 rounded-full backdrop-blur-2xl">
                    <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">Hub V4.0 Active</span>
                  </div>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.95] font-headline uppercase italic tracking-tighter text-glow">
                    Smart <br /> Scholar <br /> <span className="text-primary">Network.</span>
                  </h1>
                  <p className="max-w-md text-sm lg:text-base font-bold text-white/40 leading-relaxed border-l-4 border-primary/30 pl-5 italic">
                    Precision transit for the modern scholar. Real-time satellite telemetry meets biometric-secured commuting across Vizag and VZM hubs.
                  </p>
                </div>

                <div className="flex flex-col sm:row gap-5">
                  <Link href="/auth/signup">
                    <Button className="h-14 px-8 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase italic text-base shadow-lg transition-all">
                      Get Started <ArrowRight className="ml-2.5 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="h-14 px-8 rounded-xl font-black uppercase italic text-base border border-white/10 hover:bg-white/5">
                    Hub Map
                  </Button>
                </div>

                <div className="flex items-center gap-10 pt-6 border-t border-white/5">
                   <div className="space-y-0.5">
                      <p className="text-xl font-black italic">12.4K</p>
                      <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Active Scholars</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-xl font-black italic">99.9%</p>
                      <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Grid Uptime</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-xl font-black italic">Vizag</p>
                      <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Primary Node</p>
                   </div>
                </div>
              </div>

              <div className="lg:ml-auto hidden lg:block relative">
                <div className="absolute -inset-16 bg-primary/5 blur-[80px] rounded-full -z-10" />
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="max-w-xl space-y-5 mb-16">
              <Badge className="bg-primary/20 text-primary border-none px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.3em]">Technology Grid</Badge>
              <h2 className="text-3xl lg:text-5xl font-black uppercase italic leading-tight tracking-tighter">Unified Regional Intelligence.</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { 
                  icon: Globe, 
                  title: "Autonomous Routing", 
                  desc: "Self-optimizing grid utilizing real-time scholar demand-side analytics.",
                  color: "bg-blue-500/10"
                },
                { 
                  icon: Cpu, 
                  title: "Quantum Sync", 
                  desc: "Dispatch synchronization ensures minimal wait times during peak morning sessions.",
                  color: "bg-purple-500/10"
                },
                { 
                  icon: ShieldCheck, 
                  title: "Biometric ID", 
                  desc: "Secured QR-authentication for instant terminal clearance at every hub node.",
                  color: "bg-orange-500/10"
                },
                { 
                  icon: Zap, 
                  title: "Smart Wallet", 
                  desc: "Unified scholar credits for seamless high-speed transit transactions.",
                  color: "bg-yellow-500/10"
                },
                { 
                  icon: Activity, 
                  title: "GPS Telemetry", 
                  desc: "Every asset is tracked with precision GPS for total scholar security.",
                  color: "bg-green-500/10"
                },
                { 
                  icon: Fingerprint, 
                  title: "Hub Network", 
                  desc: "Expanding nodes across Gitam, AU, and the entire high-tech Andhra corridor.",
                  color: "bg-pink-500/10"
                }
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-[2rem] p-8 space-y-6 group hover:bg-white/10 transition-all duration-500">
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">{item.title}</h3>
                    <p className="text-xs font-bold text-white/40 italic leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-white text-slate-950 rounded-[3rem] lg:rounded-[5rem]">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-12">
                <div className="space-y-5">
                  <Badge className="bg-primary/10 text-primary border-none px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.3em]">Protocol</Badge>
                  <h2 className="text-4xl lg:text-6xl font-black uppercase italic leading-none tracking-tighter">Unified Transit.</h2>
                </div>

                <div className="space-y-8">
                  {[
                    { step: "01", title: "Node Discovery", desc: "Identify the nearest regional hub via the live scholar terminal." },
                    { step: "02", title: "Asset Booking", desc: "Reserve your seat on an active mission with one-tap credit authorization." },
                    { step: "03", title: "Biometric Entry", desc: "Scan your digital ID for instant encrypted boarding clearance." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="shrink-0 h-12 w-12 bg-slate-950 rounded-xl flex items-center justify-center text-white text-base font-black italic shadow-lg">
                        {item.step}
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xl font-black uppercase italic tracking-tighter">{item.title}</h4>
                        <p className="text-sm font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative h-[500px] lg:h-[600px] rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden shadow-xl border-[8px] border-white">
                <Image 
                  src={PlaceHolderImages.find(img => img.id === 'student-mobile')?.imageUrl || ""} 
                  fill 
                  className="object-cover" 
                  alt="Scholar Hub" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 text-white space-y-3">
                  <h3 className="text-3xl lg:text-4xl font-black italic uppercase leading-none tracking-tighter">Intelligence.</h3>
                  <p className="font-bold text-white/90 italic text-base leading-tight">Join thousands of scholars navigating the regional grid.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-20">
          <div className="max-w-4xl mx-auto glass-card rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-center space-y-10 group">
             <div className="absolute -top-24 -left-24 h-[250px] w-[250px] bg-primary/15 blur-[80px] rounded-full group-hover:bg-primary/25 transition-all duration-1000" />
             <div className="absolute -bottom-24 -right-24 h-[250px] w-[250px] bg-accent/15 blur-[80px] rounded-full group-hover:bg-accent/25 transition-all duration-1000" />
             
             <Badge className="bg-primary/20 text-primary border-none px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.4em] italic">Open Access</Badge>
             <h3 className="text-4xl lg:text-6xl font-black uppercase italic leading-[0.95] tracking-tighter text-glow">
               Join the Scholar <br /> <span className="text-primary">Grid.</span>
             </h3>
             <p className="max-w-lg mx-auto text-base lg:text-lg font-bold text-white/40 italic leading-relaxed">
               Secure your regional boarding identity and access the AAGO network today.
             </p>
             <div className="pt-6">
               <Link href="/auth/signup">
                 <Button className="h-16 px-12 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black uppercase italic text-xl shadow-xl transition-all hover:scale-105">
                   Request ID
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-white/5 bg-slate-950">
        <div className="container mx-auto px-6 lg:px-20">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-16">
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="bg-primary p-2.5 rounded-lg">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-black italic uppercase tracking-tighter text-glow">AAGO</span>
              </Link>
              <p className="max-w-xs text-[9px] font-black uppercase tracking-[0.3em] text-white/20 italic leading-loose">
                Engineering transit intelligence for the high-tech scholarship community. Vizag // VZM // Andhra.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-16 lg:gap-24">
              <div className="space-y-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Terminal</p>
                <nav className="flex flex-col gap-3 text-xs font-bold uppercase italic text-white/60">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Hub</Link>
                  <Link href="/auth/signup" className="hover:text-primary transition-colors">Request ID</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Fleet Ops</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3" /> Operations
                  </Link>
                </nav>
              </div>
              <div className="space-y-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Info</p>
                <nav className="flex flex-col gap-3 text-xs font-bold uppercase italic text-white/60">
                  <Link href="#" className="hover:text-primary transition-colors">Safety Grid</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Hub Status</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-4">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/10 italic">
              © 2024 AAGO MOBILITY SYSTEMS.
            </p>
            <div className="flex gap-8 text-[8px] font-black uppercase tracking-[0.3em] text-white/10">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
