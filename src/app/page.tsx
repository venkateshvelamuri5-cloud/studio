
"use client";

import { useState, useEffect } from 'react';
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
  Airplay,
  Globe,
  Zap,
  ShieldCheck,
  TrendingUp,
  Instagram,
  Twitter,
  Facebook,
  Cpu,
  Layers,
  Activity,
  History,
  Fingerprint
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

function TechAppSimulator() {
  const [step, setStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="relative py-20 lg:py-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: '2000px' }}
    >
      {/* 4D Depth Elements (Parallax) */}
      <div className={`absolute -top-12 -left-12 bg-primary/20 backdrop-blur-3xl p-5 rounded-[2rem] border border-white/20 shadow-2xl transition-all duration-700 z-40 ${isHovered ? 'translate-y-8 translate-x-4 opacity-100' : 'opacity-0'}`}>
        <Fingerprint className="h-8 w-8 text-primary animate-pulse" />
      </div>
      <div className={`absolute -bottom-12 -right-12 bg-accent/20 backdrop-blur-3xl p-5 rounded-[2rem] border border-white/20 shadow-2xl transition-all duration-700 z-40 ${isHovered ? '-translate-y-8 -translate-x-4 opacity-100' : 'opacity-0'}`}>
        <Activity className="h-8 w-8 text-accent animate-bounce" />
      </div>

      {/* 3D Mobile Frame */}
      <div 
        className={`relative mx-auto w-[340px] h-[680px] bg-slate-950 rounded-[4rem] border-[14px] border-slate-900 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-1000 ease-out cursor-default ${
          isHovered ? 'rotate-y-0 rotate-x-0 scale-105' : 'rotate-y-12 rotate-x-6'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-900 rounded-b-[1.75rem] z-30" />
        
        {/* App Content */}
        <div className="h-full w-full bg-white relative flex flex-col pt-10">
          <header className="px-6 py-5 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Bus className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-black tracking-tighter text-slate-950 uppercase italic">AAGO</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white overflow-hidden shadow-sm">
               <Image src="https://picsum.photos/seed/student-1/100/100" width={40} height={40} alt="Profile" />
            </div>
          </header>

          <div className="flex-1 relative overflow-hidden">
            {step === 0 && (
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[11px] font-black uppercase tracking-widest px-4">Network Scanner</Badge>
                <h4 className="text-3xl font-black text-slate-950 leading-none italic uppercase tracking-tighter">Scanning <br/>Regional Hubs.</h4>
                <div className="h-56 rounded-[3rem] bg-slate-50 relative overflow-hidden border border-slate-100 shadow-inner group">
                  <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-30 grayscale group-hover:opacity-40 transition-opacity" alt="Map" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-20 w-20 bg-primary/10 rounded-full animate-ping" />
                    <MapPin className="h-10 w-10 text-primary absolute" />
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100 shadow-sm">
                  <Search className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 italic">Finding Vizag Express...</span>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="p-8 space-y-8 animate-in slide-in-from-right-16 duration-700">
                <Badge variant="secondary" className="bg-accent/5 text-accent border-none text-[11px] font-black uppercase tracking-widest px-4">Seat Analytics</Badge>
                <h4 className="text-3xl font-black text-slate-950 leading-none italic uppercase tracking-tighter">Real-Time <br/>Confirmation.</h4>
                <div className="space-y-4">
                  <div className="p-6 rounded-[2.5rem] border-2 border-primary bg-primary/5 shadow-xl flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-3xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                        <Navigation className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-950 uppercase italic leading-none">Hub A - Vizag</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1">
                          <Zap className="h-3 w-3 text-accent" /> 8 Seats Available
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-10 flex flex-col items-center justify-center h-full space-y-10 animate-in zoom-in duration-700">
                <div className="bg-primary p-10 rounded-[4rem] shadow-2xl shadow-primary/30 rotate-3 border-8 border-white">
                  <QrCode className="h-36 w-36 text-white" />
                </div>
                <div className="text-center space-y-3">
                  <h4 className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter">Scholar ID</h4>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Tap to Board Terminal</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-0 flex-1 relative animate-in fade-in duration-1000 h-full">
                <Image src={mapImage?.imageUrl || ""} fill className="object-cover" alt="Tracking" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-12 left-8 right-8 bg-white/95 backdrop-blur-2xl p-7 rounded-[3rem] shadow-2xl flex items-center gap-6 border border-white/50 animate-in slide-in-from-bottom-8">
                  <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                    <Activity className="h-7 w-7 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Live Telemetry</p>
                    <p className="text-xl font-black text-slate-950 italic uppercase tracking-tighter">In Transit</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-28 bg-white border-t border-slate-100 flex justify-around items-center px-10">
            {[Smartphone, Search, QrCode, TrendingUp].map((Icon, i) => (
              <div key={i} className={`p-3 rounded-2xl transition-all duration-500 ${i === step ? 'bg-primary/10 text-primary scale-110' : 'text-slate-200'}`}>
                <Icon className="h-6 w-6" />
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen selection:bg-primary selection:text-white font-body bg-white overflow-x-hidden">
      {/* Navigation */}
      <header className="px-6 lg:px-24 h-24 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-50">
        <Link className="flex items-center gap-3" href="/">
          <div className="bg-primary p-3 rounded-2xl shadow-2xl shadow-primary/20">
            <Bus className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-slate-950 font-headline italic uppercase">AAGO</span>
        </Link>
        <nav className="hidden lg:flex gap-12 items-center">
          <Link className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all hover:scale-105" href="/auth/login">Scholar Portal</Link>
          <Link href="/auth/signup">
            <Button className="bg-slate-950 hover:bg-slate-800 text-white px-10 h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95">
              Request Hub Access
            </Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100">
          <Airplay className="h-7 w-7 text-slate-900" />
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center py-20 lg:py-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(59,130,246,0.08),transparent_70%)]" />
          
          <div className="container px-6 lg:px-24 mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-16 animate-in fade-in slide-in-from-left-12 duration-1000">
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-4 bg-slate-50 px-7 py-3 rounded-full border border-slate-200 animate-in fade-in slide-in-from-top-6 duration-1000 delay-300">
                    <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Regional Grid: Active & Online</span>
                  </div>
                  <h1 className="text-8xl lg:text-[11rem] font-black tracking-tighter text-slate-950 leading-[0.75] font-headline uppercase italic">
                    Scholar <br /> Protocol.
                  </h1>
                  <p className="max-w-md text-slate-500 text-xl font-bold leading-relaxed border-l-[6px] border-primary pl-10 py-2">
                    Premium regional commuting re-engineered for the modern scholar. Digital identity, live telemetry, and verified hub security.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-8">
                  <Link href="/auth/signup">
                    <Button className="h-22 px-14 text-xl bg-primary hover:bg-primary/90 text-white rounded-[2.5rem] font-black uppercase italic shadow-[0_30px_60px_-15px_rgba(59,130,246,0.4)] group transition-all hover:scale-105 active:scale-95">
                      Enter Network <ArrowRight className="ml-4 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:ml-auto">
                <TechAppSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* Network Statistics Section */}
        <section className="py-32 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_60%)]" />
          <div className="container px-6 lg:px-24 mx-auto relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-16 text-center">
              {[
                { value: "12K+", label: "Verified Scholars", icon: Globe },
                { value: "65+", label: "Regional Hubs", icon: MapPin },
                { value: "250K+", label: "Missions Synced", icon: TrendingUp },
                { value: "99.98%", label: "System Uptime", icon: ShieldCheck }
              ].map((stat, i) => (
                <div key={i} className="space-y-6 animate-in zoom-in duration-1000" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="mx-auto w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-2xl">
                    <stat.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-5xl lg:text-7xl font-black font-headline italic uppercase tracking-tighter leading-none">{stat.value}</h4>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 italic">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scholar Journey Stepper */}
        <section className="py-48 bg-white overflow-hidden">
          <div className="container px-6 lg:px-24 mx-auto">
             <div className="grid lg:grid-cols-2 gap-32 items-center">
                <div className="relative h-[700px] rounded-[5rem] overflow-hidden shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-left-16 duration-1000 group">
                   <Image src={PlaceHolderImages.find(img => img.id === 'student-group')?.imageUrl || ""} fill className="object-cover group-hover:scale-105 transition-transform duration-1000" alt="Scholar Community" />
                   <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                   <div className="absolute bottom-16 left-16 right-16 text-white space-y-6">
                      <h3 className="text-5xl lg:text-6xl font-black font-headline uppercase italic leading-[0.9] tracking-tighter">Unified Community. <br/>Precision Intel.</h3>
                      <p className="font-bold text-white/80 text-lg leading-relaxed max-w-sm border-l-4 border-white/30 pl-8">Join the regional mobility elite. Every commute is a synchronized mission across our high-tech hub network.</p>
                   </div>
                </div>

                <div className="space-y-20">
                   <div className="space-y-6">
                      <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.4em] px-6 py-2">Operational Protocol</Badge>
                      <h2 className="text-6xl lg:text-7xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">The Digital <br/>Boarding Cycle.</h2>
                   </div>

                   <div className="space-y-14">
                      {[
                        { step: "01", icon: Smartphone, title: "Locate Node", desc: "Access the terminal and identify the nearest high-precision regional hub node." },
                        { step: "02", icon: Navigation, title: "Confirm Slot", desc: "View real-time seat telemetry and secure your boarding authorization instantly." },
                        { step: "03", icon: QrCode, title: "Identity Scan", desc: "Authenticate your digital ID at the shuttle terminal for instant regional clearance." },
                        { step: "04", icon: Activity, title: "Live Telemetry", desc: "Monitor your transit journey in real-time with satellite-synced GPS precision." }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-10 group animate-in fade-in slide-in-from-right-12" style={{ animationDelay: `${i * 200}ms` }}>
                           <div className="shrink-0">
                              <div className="h-20 w-20 bg-slate-950 rounded-[2rem] flex items-center justify-center text-white font-black italic relative overflow-hidden group-hover:scale-110 transition-transform duration-500 shadow-xl">
                                 <item.icon className="h-8 w-8 opacity-20 absolute -right-3 -bottom-3 rotate-12" />
                                 <span className="text-2xl relative z-10">{item.step}</span>
                              </div>
                           </div>
                           <div className="space-y-3">
                              <h4 className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter">{item.title}</h4>
                              <p className="text-base font-bold text-slate-500 leading-relaxed italic">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section className="py-48 bg-slate-50/50">
          <div className="container px-6 lg:px-24 mx-auto">
            <div className="text-center space-y-6 mb-32">
              <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.4em] px-6 py-2 italic">System Architecture</Badge>
              <h2 className="text-6xl lg:text-8xl font-black font-headline text-slate-950 uppercase italic tracking-tighter leading-none">Re-engineered <br/>Mobility Assets.</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { icon: Globe, title: "Regional Hubs", desc: "Precision nodes covering GITAM, AU, and all major scholar clusters in the Andhra grid." },
                { icon: Zap, title: "Scholar Credits", desc: "Frictionless regional currency for instant transit boarding and hub transactions." },
                { icon: ShieldCheck, title: "Hub Integrity", desc: "Every workforce member undergoes a rigorous regional onboarding and security protocol." },
                { icon: Cpu, title: "Dynamic Logic", desc: "AI-driven route optimization utilizing live scholar demand-side analytics." },
                { icon: Layers, title: "Unified Transfer", desc: "Switch between hub nodes seamlessly without redundant authentication steps." },
                { icon: History, title: "Satellite Sync", desc: "High-precision telemetry feed for every asset in the active regional network." }
              ].map((item, i) => (
                <Card key={i} className={`border-none shadow-2xl bg-white rounded-[3.5rem] overflow-hidden group hover:scale-[1.03] transition-all duration-700`}>
                  <CardContent className="p-12 space-y-8">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center group-hover:bg-primary transition-all duration-500 shadow-inner">
                      <item.icon className="h-9 w-9 text-primary group-hover:text-white transition-all duration-500" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black text-slate-950 italic uppercase tracking-tighter leading-none">{item.title}</h3>
                      <p className="text-base font-bold text-slate-500 leading-relaxed italic">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-48 bg-white">
          <div className="container px-6 lg:px-24 mx-auto">
            <Card className="rounded-[5rem] border-none bg-primary text-white overflow-hidden group shadow-[0_60px_120px_-20px_rgba(59,130,246,0.35)] relative">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 -translate-y-24 -translate-x-24 -z-10 group-hover:translate-x-0 transition-transform duration-1000" />
              <CardContent className="p-20 lg:p-32 flex flex-col lg:flex-row justify-between items-center gap-16">
                <div className="space-y-8 text-center lg:text-left">
                  <Badge className="bg-white/20 text-white border-none font-black uppercase tracking-[0.3em] px-6 py-3 italic">Expansion Phase: Online</Badge>
                  <h3 className="text-6xl lg:text-[9rem] font-black font-headline tracking-tighter uppercase italic leading-[0.8]">The Future <br/>Is Scholar.</h3>
                  <p className="text-xl font-bold text-white/90 max-w-md leading-relaxed italic border-l-4 border-white/30 pl-10">The Aago scholar network is scaling. Request your regional Hub access and digitize your campus mission today.</p>
                </div>
                <div className="flex flex-col gap-6 w-full lg:w-auto">
                  <Link href="/auth/signup">
                    <Button className="bg-white text-primary rounded-[3rem] h-24 px-16 text-2xl font-black uppercase italic hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-2xl w-full lg:w-auto">
                      Request Hub Access
                    </Button>
                  </Link>
                  <p className="text-[12px] font-black text-center text-white/60 uppercase tracking-[0.4em] italic mt-6">Verified Scholar Authentication Required</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-40 border-t border-slate-100 relative overflow-hidden">
        <div className="container px-6 lg:px-24 mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-32">
            <div className="space-y-10">
              <div className="flex items-center gap-5">
                <div className="bg-primary p-4 rounded-3xl shadow-2xl shadow-primary/20">
                  <Bus className="h-10 w-10 text-white" />
                </div>
                <span className="text-4xl font-black text-slate-950 font-headline italic uppercase tracking-tighter">AAGO</span>
              </div>
              <p className="text-base font-bold text-slate-400 max-w-sm leading-relaxed uppercase tracking-[0.2em] italic">
                Engineering regional transit intelligence for the high-tech Andhra scholar community.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-32">
              <div className="space-y-10">
                <p className="text-[12px] font-black uppercase text-slate-950 tracking-[0.4em] italic">Regional Terminal</p>
                <nav className="flex flex-col gap-7 text-sm font-black uppercase tracking-widest text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-all italic hover:translate-x-1">Scholar Login</Link>
                  <Link href="/auth/signup" className="hover:text-primary transition-all italic hover:translate-x-1">Node Registry</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-all italic hover:translate-x-1 text-slate-300">Fleet Operations</Link>
                </nav>
              </div>
              <div className="space-y-10">
                <p className="text-[12px] font-black uppercase text-slate-950 tracking-[0.4em] italic">Network Feed</p>
                <div className="flex gap-6">
                  {[Instagram, Twitter, Facebook].map((Icon, i) => (
                    <Link key={i} href="#" className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm group hover:scale-110">
                      <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-40 pt-16 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-10">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
              © 2024 AAGO MOBILITY SYSTEMS // REGIONAL COMMAND CENTER.
            </p>
            <div className="flex gap-12 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
               <Link href="#" className="hover:text-primary transition-colors">Safety Protocol</Link>
               <Link href="#" className="hover:text-primary transition-colors">Compliance Grid</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
