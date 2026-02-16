
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
  ShieldAlert,
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
      {/* Floating 4D Decorative Elements */}
      <div className={`absolute -top-10 -left-10 bg-accent/20 backdrop-blur-3xl p-4 rounded-3xl border border-white/10 shadow-2xl transition-all duration-700 z-40 ${isHovered ? 'translate-y-4 opacity-100' : 'opacity-0'}`}>
        <Fingerprint className="h-8 w-8 text-accent animate-pulse" />
      </div>
      <div className={`absolute -bottom-10 -right-10 bg-primary/20 backdrop-blur-3xl p-4 rounded-3xl border border-white/10 shadow-2xl transition-all duration-700 z-40 ${isHovered ? '-translate-y-4 opacity-100' : 'opacity-0'}`}>
        <Activity className="h-8 w-8 text-primary animate-bounce" />
      </div>

      {/* 4D Mobile Frame */}
      <div 
        className={`relative mx-auto w-[320px] h-[660px] bg-slate-950 rounded-[3.5rem] border-[12px] border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-1000 ease-out cursor-default ${
          isHovered ? 'rotate-y-0 rotate-x-0 scale-105' : 'rotate-y-12 rotate-x-6'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-[1.5rem] z-30" />
        
        {/* App Content */}
        <div className="h-full w-full bg-white relative flex flex-col pt-10">
          <header className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Bus className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-tighter text-slate-950 uppercase italic">AAGO</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
               <Image src="https://picsum.photos/seed/student-1/100/100" width={32} height={32} alt="Profile" />
            </div>
          </header>

          <div className="flex-1 relative overflow-hidden">
            {step === 0 && (
              <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3">Nearby Shuttles</Badge>
                <h4 className="text-2xl font-black text-slate-950 leading-none italic uppercase tracking-tighter">Locating <br/>Your Hub.</h4>
                <div className="h-48 rounded-[2.5rem] bg-slate-50 relative overflow-hidden border border-slate-100 shadow-inner">
                  <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-30 grayscale" alt="Map" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full animate-ping" />
                    <MapPin className="h-8 w-8 text-primary absolute" />
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
                  <Search className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-400">Scan for GITAM express...</span>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="p-6 space-y-6 animate-in slide-in-from-right-12 duration-700">
                <Badge variant="secondary" className="bg-accent/5 text-accent border-none text-[10px] font-black uppercase tracking-widest px-3">Seat Confirmation</Badge>
                <h4 className="text-2xl font-black text-slate-950 leading-none italic uppercase tracking-tighter">Secure <br/>Your Spot.</h4>
                <div className="space-y-4">
                  <div className="p-5 rounded-[2rem] border border-primary bg-primary/5 shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center">
                        <Navigation className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-950 uppercase italic leading-none">Vizag Express</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">12 Seats Left</p>
                      </div>
                    </div>
                    <Button size="sm" className="h-8 rounded-xl text-[8px] font-black uppercase italic">Book</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-8 flex flex-col items-center justify-center h-full space-y-8 animate-in zoom-in duration-700">
                <div className="bg-primary p-8 rounded-[3rem] shadow-2xl shadow-primary/30 rotate-3">
                  <QrCode className="h-32 w-32 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-xl font-black text-slate-950 uppercase italic tracking-tighter">Digital ID</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scan to board</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-0 flex-1 relative animate-in fade-in duration-1000 h-full">
                <Image src={mapImage?.imageUrl || ""} fill className="object-cover" alt="Tracking" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                <div className="absolute bottom-10 left-6 right-6 bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border border-white/50">
                  <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estimated Arrival</p>
                    <p className="text-lg font-black text-slate-950 italic">5 Minutes Away</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-24 bg-white border-t border-slate-50 flex justify-around items-center px-8">
            {[Smartphone, Search, QrCode, TrendingUp].map((Icon, i) => (
              <Icon key={i} className={`h-6 w-6 transition-all ${i === step ? 'text-primary scale-110' : 'text-slate-200'}`} />
            ))}
          </nav>
        </div>
      </div>
      
      {/* Decorative High-Tech Glow */}
      <div className="absolute top-1/4 -left-20 h-64 w-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 h-64 w-64 bg-accent/10 rounded-full blur-3xl -z-10 animate-pulse" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen selection:bg-primary selection:text-white font-body bg-white overflow-x-hidden">
      {/* Navigation */}
      <header className="px-6 lg:px-24 h-24 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-50">
        <Link className="flex items-center gap-3" href="/">
          <div className="bg-primary p-2.5 rounded-2xl shadow-2xl shadow-primary/20">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-slate-950 font-headline italic uppercase">AAGO</span>
        </Link>
        <nav className="hidden lg:flex gap-12 items-center">
          <Link className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors" href="/auth/login">Scholar Access</Link>
          <Link href="/auth/signup">
            <Button className="bg-slate-950 hover:bg-slate-800 text-white px-8 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95">
              Create Hub ID
            </Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-12 w-12 rounded-2xl bg-slate-50">
          <Airplay className="h-6 w-6 text-slate-900" />
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center py-20 lg:py-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.05),transparent_60%)]" />
          
          <div className="container px-6 lg:px-24 mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-3 bg-slate-50 px-6 py-2 rounded-full border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Network Status: Optimal</span>
                  </div>
                  <h1 className="text-7xl lg:text-[10rem] font-black tracking-tighter text-slate-950 leading-[0.8] font-headline uppercase italic">
                    Smart <br /> Scholars.
                  </h1>
                  <p className="max-w-md text-slate-500 text-lg font-bold leading-relaxed border-l-4 border-primary pl-8">
                    The premium regional commute for Andhra's top students. Real-time fleet intelligence, digital boarding, and high-security hubs.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-20 px-12 text-lg bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-black uppercase italic shadow-2xl shadow-primary/30 group transition-all hover:scale-105 active:scale-95">
                      Enter the Network <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
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

        {/* Feature Bento Grid */}
        <section className="py-40 bg-slate-50/50">
          <div className="container px-6 lg:px-24 mx-auto">
            <div className="text-center space-y-4 mb-24">
              <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.3em] px-4 py-1">Service Protocols</Badge>
              <h2 className="text-5xl lg:text-7xl font-black font-headline text-slate-950 uppercase italic tracking-tighter">Engineered for Excellence</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  icon: Globe, 
                  title: "Regional Hubs", 
                  desc: "Precision routes covering GITAM, AU, and all major academic clusters in Vizag & VZM.",
                  delay: "0"
                },
                { 
                  icon: Zap, 
                  title: "Digital Wallet", 
                  desc: "Contactless payment engine with instant scholar credits for seamless daily transitions.",
                  delay: "100"
                },
                { 
                  icon: ShieldCheck, 
                  title: "Hub Verification", 
                  desc: "Every driver is vetted through our high-security regional onboarding protocol.",
                  delay: "200"
                },
                { 
                  icon: Cpu, 
                  title: "AI Routing", 
                  desc: "Dynamic route optimization using demand-side analytics to minimize wait times.",
                  delay: "300"
                },
                { 
                  icon: Layers, 
                  title: "Multi-Hub", 
                  desc: "Seamless transfers between hub locations without extra ticketing hurdles.",
                  delay: "400"
                },
                { 
                  icon: History, 
                  title: "Real-time Ops", 
                  desc: "Live satellite telemetry for every shuttle in the active regional network.",
                  delay: "500"
                }
              ].map((item, i) => (
                <Card key={i} className={`border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 delay-[${item.delay}ms]`}>
                  <CardContent className="p-10 space-y-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-primary transition-colors">
                      <item.icon className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-slate-950 italic uppercase tracking-tighter">{item.title}</h3>
                      <p className="text-sm font-bold text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - High Tech Stepper */}
        <section className="py-40 bg-white">
          <div className="container px-6 lg:px-24 mx-auto">
             <div className="grid lg:grid-cols-2 gap-24 items-center">
                <div className="relative h-[600px] rounded-[4rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-left-12">
                   <Image src={PlaceHolderImages.find(img => img.id === 'student-group')?.imageUrl || ""} fill className="object-cover" alt="Scholar Community" />
                   <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
                   <div className="absolute bottom-12 left-12 right-12 text-white">
                      <h3 className="text-4xl font-black font-headline uppercase italic leading-none mb-4">Community Focused. <br/>Technology Driven.</h3>
                      <p className="font-bold text-white/80">Join over 5,000 scholars who have digitized their daily commute with Aago.</p>
                   </div>
                </div>

                <div className="space-y-16">
                   <div className="space-y-4">
                      <Badge className="bg-accent/10 text-accent border-none font-black uppercase tracking-[0.3em] px-4 py-1">Mission Protocol</Badge>
                      <h2 className="text-5xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">The Scholar Journey</h2>
                   </div>

                   <div className="space-y-12">
                      {[
                        { step: "01", icon: Smartphone, title: "Locate Hub", desc: "Open the Aago terminal and locate the nearest active regional hub in your city." },
                        { step: "02", icon: Navigation, title: "Secure Seat", desc: "View live seat availability and secure your spot with one tap using hub credits." },
                        { step: "03", icon: QrCode, title: "Digital ID", desc: "Scan your unique Hub ID at the shuttle terminal for instant verification." },
                        { step: "04", icon: Activity, title: "Track Live", desc: "Monitor your transit path in real-time with high-precision GPS telemetry." }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-8 group animate-in fade-in slide-in-from-right-8" style={{ animationDelay: `${i * 150}ms` }}>
                           <div className="shrink-0">
                              <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center text-white font-black italic relative overflow-hidden group-hover:scale-110 transition-transform">
                                 <item.icon className="h-6 w-6 opacity-20 absolute -right-2 -bottom-2 rotate-12" />
                                 <span className="text-xl relative z-10">{item.step}</span>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-xl font-black text-slate-950 uppercase italic tracking-tighter">{item.title}</h4>
                              <p className="text-sm font-bold text-slate-500 leading-relaxed">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Network Statistics Section */}
        <section className="py-24 bg-slate-950 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
          <div className="container px-6 lg:px-24 mx-auto relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
              {[
                { value: "5K+", label: "Active Scholars", icon: Globe },
                { value: "50+", label: "Regional Hubs", icon: MapPin },
                { value: "150K+", label: "Missions Completed", icon: TrendingUp },
                { value: "99.9%", label: "Hub Uptime", icon: ShieldCheck }
              ].map((stat, i) => (
                <div key={i} className="space-y-4 animate-in zoom-in duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="mx-auto w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-4xl lg:text-5xl font-black font-headline italic uppercase tracking-tighter leading-none">{stat.value}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-40 bg-white">
          <div className="container px-6 lg:px-24 mx-auto">
            <Card className="rounded-[4rem] border-none bg-primary text-white overflow-hidden group shadow-[0_50px_100px_-20px_rgba(59,130,246,0.3)] relative">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 -translate-y-20 -translate-x-20 -z-10" />
              <CardContent className="p-16 lg:p-24 flex flex-col lg:flex-row justify-between items-center gap-12">
                <div className="space-y-6 text-center lg:text-left">
                  <Badge className="bg-white/20 text-white border-none font-black uppercase tracking-[0.2em] px-5 py-2">Regional Expansion</Badge>
                  <h3 className="text-5xl lg:text-8xl font-black font-headline tracking-tighter uppercase italic leading-none">The Future <br/>Of Commute.</h3>
                  <p className="text-lg font-bold text-white/80 max-w-sm leading-relaxed">The Aago scholar network is growing. Secure your Hub ID and digitize your campus journey today.</p>
                </div>
                <div className="flex flex-col gap-4 w-full lg:w-auto">
                  <Link href="/auth/signup">
                    <Button className="bg-white text-primary rounded-[2rem] h-20 px-12 text-xl font-black uppercase italic hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-2xl w-full lg:w-auto">
                      Register Hub ID
                    </Button>
                  </Link>
                  <p className="text-[10px] font-black text-center text-white/60 uppercase tracking-widest mt-4">Verified Scholar Auth Required</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-32 border-t border-slate-100">
        <div className="container px-6 lg:px-24 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-24">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
                  <Bus className="h-8 w-8 text-white" />
                </div>
                <span className="text-3xl font-black text-slate-950 font-headline italic uppercase tracking-tighter">AAGO</span>
              </div>
              <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed uppercase tracking-widest">
                Reengineering regional transit intelligence for Andhra Pradesh's top scholars.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-24">
              <div className="space-y-8">
                <p className="text-[10px] font-black uppercase text-slate-950 tracking-[0.3em]">Hub Network</p>
                <nav className="flex flex-col gap-6 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors italic">Scholar Terminal</Link>
                  <Link href="/auth/signup" className="hover:text-primary transition-colors italic">Registry Hub</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors italic text-slate-300">Workforce Ops</Link>
                </nav>
              </div>
              <div className="space-y-8">
                <p className="text-[10px] font-black uppercase text-slate-950 tracking-[0.3em]">Sync Feed</p>
                <div className="flex gap-4">
                  {[Instagram, Twitter, Facebook].map((Icon, i) => (
                    <Link key={i} href="#" className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm group">
                      <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-32 pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              © 2024 AAGO MOBILITY SYSTEMS // VIZAG HUB COMMAND.
            </p>
            <div className="flex gap-8 text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
               <Link href="#" className="hover:text-primary">Safety Protocol</Link>
               <Link href="#" className="hover:text-primary">Regional Compliance</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
