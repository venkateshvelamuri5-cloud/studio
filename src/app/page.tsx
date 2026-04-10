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
  ShieldCheck,
  Radar,
  IndianRupee,
  MapPin,
  Activity,
  Zap,
  Menu,
  X,
  Lock,
  Target,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Users,
  Smartphone,
  Briefcase,
  GraduationCap,
  Globe,
  ChevronRight
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function GlobalLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroImage = PlaceHolderImages.find(img => img.id === 'modern-transit');
  const commuteImage = PlaceHolderImages.find(img => img.id === 'office-commute');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <header className={`fixed top-0 left-0 right-0 h-20 z-50 px-6 lg:px-20 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-white/80 border-b border-primary/5 backdrop-blur-md' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-2.5 rounded-2xl shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
            <ConnectingDotsLogo className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter uppercase text-primary leading-none">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-12">
          <Link href="/auth/login" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Access Portal</Link>
          <Link href="/auth/signup">
            <Button className="h-11 bg-primary text-white px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">Join the Grid</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-12 w-12 rounded-2xl bg-white/50 border border-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} className="text-primary" /> : <Menu size={24} className="text-primary" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-10 duration-500">
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black uppercase italic text-foreground border-b border-black/5 pb-6">Access Portal</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black uppercase italic text-primary">Join the Grid</Link>
          <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black uppercase italic text-muted-foreground">Join the Fleet</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[95vh] flex items-center pt-32 pb-20 overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.08),transparent_70%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="max-w-3xl space-y-10 animate-in fade-in slide-in-from-left-10 duration-1000">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-black/5">
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">v2.0 Active</Badge>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Smart Mobility for All</span>
                </div>
                <h1 className="text-6xl lg:text-8xl font-black leading-[0.95] italic tracking-tighter text-foreground">
                  The Smarter <br /> <span className="text-primary">Way to Move.</span>
                </h1>
                <p className="text-xl font-bold text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-8 max-w-xl">
                  Stop settling for chaotic commutes. AAGO brings professional-grade transit to your daily routine. Reserved seats, real-time tracking, and fixed pricing for everyone.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-4">
                  <Link href="/auth/signup">
                    <Button className="h-18 px-12 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">Start Riding</Button>
                  </Link>
                  <Link href="/driver/signup">
                    <Button variant="ghost" className="h-18 px-12 rounded-3xl font-black uppercase italic text-xl border border-black/5 bg-white shadow-xl transition-all hover:bg-primary/5 text-primary">Join Fleet</Button>
                  </Link>
                </div>
              </div>

              {/* High-Fidelity Interface Simulation */}
              <div className="hidden lg:block relative perspective-2000 h-[650px] animate-in fade-in zoom-in duration-1000">
                <div className="absolute inset-0 animate-slow-float flex items-center justify-center">
                  <div className="w-[480px] h-[600px] glass-card rounded-[4rem] border border-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
                    <div className="p-10 space-y-10 relative z-10">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 bg-primary rounded-full animate-pulse" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-primary">Live Grid Active</span>
                        </div>
                        <ConnectingDotsLogo className="h-6 w-6 text-primary opacity-30" />
                      </div>
                      
                      <div className="h-64 bg-slate-50 rounded-[3rem] border border-black/5 p-4 relative overflow-hidden shadow-inner">
                        <Image 
                          src={heroImage?.imageUrl || "https://picsum.photos/seed/aago-map/800/600"} 
                          alt="City Map" 
                          fill 
                          className="object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="h-4 w-4 bg-primary rounded-full absolute top-1/3 left-1/4 animate-ping" />
                           <div className="absolute flex flex-col items-center">
                              <Bus className="h-10 w-10 text-primary drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-6 bg-white/80 rounded-3xl border border-black/5 flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-5">
                              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><Navigation className="h-6 w-6" /></div>
                              <div className="space-y-1.5">
                                 <div className="h-2.5 w-32 bg-primary/20 rounded-full" />
                                 <div className="h-2.5 w-16 bg-primary/10 rounded-full" />
                              </div>
                           </div>
                           <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase px-4 py-1 rounded-full">On Time</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Commute Section */}
        <section className="py-32 bg-white border-y border-black/5 relative">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="grid lg:grid-cols-2 gap-24 items-center">
                 <div className="relative animate-in slide-in-from-left-10 duration-1000">
                    <div className="rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-slate-50 relative aspect-[4/5]">
                       <Image 
                         src={commuteImage?.imageUrl || "https://picsum.photos/seed/aago-office/800/1000"} 
                         alt="Commuter" 
                         fill 
                         className="object-cover"
                         data-ai-hint="commuter person"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                       <div className="absolute bottom-10 left-10 text-white space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Grid Case Study #14</p>
                          <h4 className="text-3xl font-black italic uppercase leading-none">The Modern Professional</h4>
                       </div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 glass-card p-10 rounded-[3rem] hidden lg:block animate-slow-float">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white"><Clock className="h-6 w-6" /></div>
                          <h5 className="text-xl font-black uppercase italic">Time Saved</h5>
                       </div>
                       <p className="text-4xl font-black text-primary leading-none">42 <span className="text-lg">mins/day</span></p>
                    </div>
                 </div>
                 
                 <div className="space-y-12 animate-in slide-in-from-right-10 duration-1000">
                    <Badge className="bg-primary/10 text-primary border-none px-6 py-2 text-[11px] font-black uppercase tracking-[0.3em]">Transit Evolution</Badge>
                    <h2 className="text-5xl lg:text-7xl font-black uppercase italic tracking-tighter text-foreground leading-[0.9]">Transit for the <br/> Ambitious.</h2>
                    <p className="text-xl font-bold text-muted-foreground italic leading-relaxed pl-8 border-l-4 border-primary/20">
                       Whether you're heading to a 9 AM briefing or a late-night lecture, AAGO ensures your focus stays on your goals, not your travel. We've removed the stress of unpredictable city transit.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary shadow-sm"><Briefcase className="h-7 w-7" /></div>
                          <h5 className="text-2xl font-black uppercase italic text-foreground tracking-tighter">Professionals</h5>
                          <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">Arrive at the office refreshed. No parking stress, no expensive private cabs.</p>
                       </div>
                       <div className="space-y-4">
                          <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary shadow-sm"><GraduationCap className="h-7 w-7" /></div>
                          <h5 className="text-2xl font-black uppercase italic text-foreground tracking-tighter">Scholars</h5>
                          <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">Safety first. Affordable routes designed to keep your focus on your education.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* The Grid Difference */}
        <section className="py-32 bg-slate-50/50">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="text-center max-w-4xl mx-auto mb-24 space-y-8">
                 <h2 className="text-5xl lg:text-6xl font-black uppercase italic tracking-tighter text-foreground leading-none">The Grid Experience.</h2>
                 <p className="text-xl font-bold text-muted-foreground italic leading-relaxed">
                    Designed from the ground up to solve the three biggest transit challenges: Pricing, Prediction, and Protection.
                 </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-12">
                 {[
                   { 
                     title: "Fixed Hub Pricing", 
                     desc: "No surges. No bargaining. Transparent fares calculated by the grid to protect your budget every single day.", 
                     icon: IndianRupee 
                   },
                   { 
                     title: "Predictive Radar", 
                     desc: "See your shuttle's live telemetry on the AAGO Radar. Know exactly when to step out of your home or office.", 
                     icon: Radar 
                   },
                   { 
                     title: "Protocol Security", 
                     desc: "Every ride is tracked. Every operator is verified. Your journey is protected by the grid's safety protocol.", 
                     icon: ShieldCheck 
                   }
                 ].map((item, i) => (
                   <div key={i} className="bg-white p-12 rounded-[3.5rem] border border-black/5 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all group flex flex-col items-center text-center">
                      <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mb-10 group-hover:rotate-6 transition-all">
                         <item.icon className="h-10 w-10" />
                      </div>
                      <h4 className="text-2xl font-black uppercase italic text-foreground tracking-tighter mb-6">{item.title}</h4>
                      <p className="text-base font-bold text-muted-foreground italic leading-relaxed">{item.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Steps Section */}
        <section className="py-32 relative overflow-hidden bg-white">
           <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
           <div className="container mx-auto px-6 lg:px-20">
              <div className="grid lg:grid-cols-2 gap-24 items-center">
                 <div className="space-y-10">
                    <h2 className="text-5xl lg:text-7xl font-black uppercase italic tracking-tighter text-foreground leading-[0.9]">Moving in <br/> Three Acts.</h2>
                    <div className="space-y-12">
                       {[
                         { step: "01", title: "Select Corridor", desc: "Open the grid. Pick your route and secure your seat with a single tap.", icon: MapPin },
                         { step: "02", title: "Secure Checkout", desc: "Pay the fixed transit fee via the secure AAGO gateway and get your boarding pass.", icon: Lock },
                         { step: "03", title: "Board & Ride", desc: "Show your code to the operator. Track your progress live until you reach your node.", icon: CheckCircle2 }
                       ].map((item, i) => (
                         <div key={i} className="flex gap-8 group">
                            <div className="text-4xl font-black italic text-primary/20 group-hover:text-primary transition-colors">{item.step}</div>
                            <div className="space-y-2">
                               <h4 className="text-2xl font-black uppercase italic text-foreground">{item.title}</h4>
                               <p className="text-base font-bold text-muted-foreground italic leading-relaxed">{item.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="relative">
                    <div className="absolute -inset-10 bg-primary/5 blur-[100px] rounded-full" />
                    <Card className="glass-card p-12 rounded-[4rem] relative z-10 border-white shadow-2xl">
                       <div className="flex flex-col items-center gap-8 py-10">
                          <div className="h-24 w-24 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30 animate-pulse">
                             <ConnectingDotsLogo className="h-12 w-12" />
                          </div>
                          <div className="text-center space-y-3">
                             <h4 className="text-3xl font-black italic uppercase text-primary">Grid Ready</h4>
                             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground">Universal Access Protocol</p>
                          </div>
                          <Link href="/auth/signup" className="w-full">
                             <Button className="w-full h-18 bg-primary text-white rounded-3xl font-black uppercase italic text-xl shadow-xl active:scale-95 transition-all">Create Profile</Button>
                          </Link>
                       </div>
                    </Card>
                 </div>
              </div>
           </div>
        </section>

        {/* Referral Section */}
        <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.2),transparent_70%)]" />
           <div className="container mx-auto px-6 lg:px-20 relative z-10">
              <div className="max-w-4xl mx-auto text-center space-y-12">
                 <Badge className="bg-primary text-white border-none px-6 py-2 text-[11px] font-black uppercase tracking-[0.3em]">Growth Grid</Badge>
                 <h2 className="text-5xl lg:text-8xl font-black uppercase italic tracking-tighter leading-[0.85]">Spread the Move. <br/> Ride for Less.</h2>
                 <p className="text-2xl font-bold text-slate-400 italic leading-relaxed">
                    The more people use the grid, the smarter it gets. Invite friends or colleagues and earn points for every journey they complete.
                 </p>
                 <div className="flex justify-center pt-8">
                    <Link href="/auth/signup">
                       <Button className="h-20 px-16 bg-primary text-white rounded-[2.5rem] font-black uppercase italic text-2xl shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all">Get Referral Link</Button>
                    </Link>
                 </div>
              </div>
           </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 bg-white relative">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-16">
              <h2 className="text-6xl lg:text-9xl font-black uppercase italic tracking-tighter text-foreground leading-none">Join the Grid.</h2>
              <p className="text-2xl font-bold text-muted-foreground italic max-w-2xl mx-auto">Modern mobility is here. Secure your seat on the next mission today.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-10">
                 <Link href="/auth/signup">
                    <Button className="h-20 px-20 bg-primary text-white rounded-[2.5rem] font-black uppercase italic text-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Join as Rider</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="outline" className="h-20 px-20 border-2 border-primary text-primary rounded-[2.5rem] font-black uppercase italic text-2xl bg-white hover:bg-primary/5 transition-all">Join as Fleet</Button>
                 </Link>
              </div>
           </div>
           <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </section>
      </main>

      <footer className="bg-white">
        <div className="container mx-auto px-6 lg:px-20 py-32">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-24">
            <div className="col-span-1 lg:col-span-2 space-y-12">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20"><ConnectingDotsLogo className="h-8 w-8 text-white" /></div>
                <span className="text-4xl font-black italic uppercase tracking-tighter text-primary">AAGO</span>
              </div>
              <p className="max-w-md text-xl font-bold text-muted-foreground italic leading-relaxed">
                Reimagining city transit through intelligent grids and professional-grade mobility solutions.
              </p>
            </div>
            <div className="space-y-10">
              <p className="text-[13px] font-black uppercase tracking-[0.3em] text-foreground">Navigation</p>
              <nav className="flex flex-col gap-6 text-base font-black uppercase italic text-muted-foreground">
                <Link href="/auth/login" className="hover:text-primary transition-all flex items-center gap-2 group">Rider Hub <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /></Link>
                <Link href="/driver/login" className="hover:text-primary transition-all flex items-center gap-2 group">Operator Hub <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /></Link>
                <Link href="/admin/login" className="hover:text-primary transition-all flex items-center gap-2 group">Ops Terminal <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /></Link>
              </nav>
            </div>
            <div className="space-y-10">
              <p className="text-[13px] font-black uppercase tracking-[0.3em] text-foreground">Security</p>
              <nav className="flex flex-col gap-6 text-base font-black uppercase italic text-muted-foreground">
                <span className="cursor-default">Privacy Matrix</span>
                <span className="cursor-default">Grid Security</span>
              </nav>
            </div>
          </div>
          <div className="mt-32 pt-12 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 italic">© 2024 AAGO GRID. UNIVERSAL MOBILITY PROTOCOL.</p>
            <div className="flex gap-8">
               <Globe className="h-6 w-6 text-slate-200" />
               <Activity className="h-6 w-6 text-slate-200" />
               <Zap className="h-6 w-6 text-slate-200" />
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes shuttle-move {
          0% { transform: translate(-200px, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(200px, 0); opacity: 0; }
        }
        .perspective-2000 {
          perspective: 2000px;
        }
      `}</style>
    </div>
  );
}