"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bus, 
  ArrowRight, 
  Navigation,
  QrCode,
  ShieldCheck,
  Radar,
  IndianRupee,
  MapPin,
  TrendingUp,
  Globe,
  Network,
  Activity,
  Zap,
  Menu,
  X,
  Lock,
  Wifi,
  Cpu,
  Target,
  BarChart3,
  ShieldAlert,
  Clock,
  Leaf,
  CheckCircle2
} from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

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
  const db = useFirestore();
  const routesQuery = useMemo(() => db ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]);
  const { data: activeRoutes } = useCollection(routesQuery);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body selection:bg-primary selection:text-black overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 h-20 z-50 px-6 lg:px-20 flex items-center justify-between bg-background/80 border-b border-white/5 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.3)] group-hover:rotate-12 transition-transform duration-500">
            <ConnectingDotsLogo className="h-6 w-6 text-black" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase text-primary text-glow">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Scholar Login</Link>
          <Link href="/auth/signup">
            <Button className="h-10 bg-primary text-black px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Join Now</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-10 w-10 rounded-xl bg-white/5" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} className="text-primary" /> : <Menu size={24} className="text-primary" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-10 duration-500">
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-foreground border-b border-white/5 pb-4">Scholar Login</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-primary">Join Now</Link>
          <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-muted-foreground">Join Fleet</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,255,255,0.05),transparent_50%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">Smart Campus Rides</Badge>
                <h1 className="text-5xl lg:text-7xl font-black leading-tight italic tracking-tighter text-foreground">
                  The Smartest <br /> <span className="text-primary text-glow">Way to Class.</span>
                </h1>
                <p className="text-lg font-bold text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  Stop waiting for autos. Get fast, safe, and cheap bus rides to campus. Never miss a lecture again.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-16 px-10 bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-105">Join Now</Button>
                  </Link>
                  <Link href="/driver/signup">
                    <Button variant="ghost" className="h-16 px-10 rounded-2xl font-black uppercase italic text-lg border border-white/5 bg-white/5 hover:bg-white/10 shadow-xl transition-all text-primary">Join Fleet</Button>
                  </Link>
                </div>
              </div>

              {/* Simulation Visual */}
              <div className="hidden lg:block relative perspective-2000 h-[600px]">
                <div className="absolute inset-0 animate-slow-float flex items-center justify-center">
                  <div className="w-[450px] h-[550px] bg-white/5 rounded-[4rem] border border-white/10 shadow-[0_32px_128px_-12px_rgba(0,255,255,0.15)] relative overflow-hidden group backdrop-blur-3xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.1),transparent_70%)]" />
                    
                    <div className="p-8 space-y-8 relative z-10">
                      <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Grid: Active</span>
                        </div>
                        <ConnectingDotsLogo className="h-5 w-5 text-primary opacity-50" />
                      </div>
                      
                      <div className="h-64 bg-black/40 rounded-[2.5rem] border border-white/5 p-6 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="h-3 w-3 bg-primary rounded-full absolute top-1/4 left-1/4 animate-ping" />
                           <div className="absolute animate-[shuttle-move_8s_linear_infinite] flex flex-col items-center">
                              <Bus className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm"><Navigation className="h-5 w-5" /></div>
                              <div className="space-y-1">
                                 <div className="h-2 w-24 bg-primary/20 rounded-full" />
                                 <div className="h-2 w-12 bg-primary/10 rounded-full" />
                              </div>
                           </div>
                           <Badge className="bg-primary text-black border-none text-[8px] font-black uppercase">Cheap Fare</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-24 bg-white/[0.02] border-y border-white/5">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                 <div className="space-y-10">
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">The Commute Crisis</Badge>
                    <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">Autos cost too much. <br/> Buses are too late.</h2>
                    <div className="space-y-6">
                       {[
                         { title: "Save Pocket Money", desc: "Private taxis charge too much for a short ride to class.", icon: IndianRupee },
                         { title: "No More Waiting", desc: "Old buses have no tracking. You waste hours at the stop.", icon: Clock },
                         { title: "Safe & Secure", desc: "Walking long distances or riding with unknown drivers is risky.", icon: ShieldAlert }
                       ].map((item, i) => (
                         <div key={i} className="flex gap-6 group">
                            <div className="shrink-0 h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
                               <item.icon className="h-6 w-6" />
                            </div>
                            <div>
                               <h4 className="text-lg font-black uppercase italic text-foreground">{item.title}</h4>
                               <p className="text-sm font-bold text-muted-foreground italic">{item.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="relative">
                    <Card className="glass-card p-12 rounded-[3rem] relative z-10 space-y-8 border-primary/20">
                       <h3 className="text-2xl font-black italic uppercase text-primary text-glow">The Student Grid</h3>
                       <p className="text-lg font-bold text-muted-foreground italic leading-relaxed">
                          We fix the campus travel problem with fixed prices and live bus tracking.
                       </p>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                             <h5 className="text-3xl font-black text-primary leading-none tracking-tighter italic">Fixed</h5>
                             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">Fare</p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                             <h5 className="text-3xl font-black text-primary leading-none tracking-tighter italic">Live</h5>
                             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">Radar</p>
                          </div>
                       </div>
                    </Card>
                 </div>
              </div>
           </div>
        </section>

        {/* Steps Section */}
        <section className="py-24 bg-white/[0.01] border-y border-white/5 overflow-hidden">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="text-center space-y-6 mb-20">
                 <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-foreground">Get to Class.</h2>
                 <p className="text-lg font-bold text-muted-foreground italic">3 Simple Steps to your ride.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-12 relative">
                 {[
                   { step: "01", title: "Search Route", desc: "Find your campus bus and the nearest stop.", icon: Radar },
                   { step: "02", title: "Secure Seat", desc: "Confirm your seat and get your boarding code.", icon: Lock },
                   { step: "03", title: "Ride to Class", desc: "Show your code to the driver and enjoy the ride.", icon: CheckCircle2 }
                 ].map((item, i) => (
                   <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-8 bg-background p-10 border border-white/5 rounded-[3rem] shadow-xl group hover:border-primary transition-all">
                      <div className="absolute -top-6 h-12 w-12 rounded-full bg-primary text-black flex items-center justify-center font-black italic shadow-lg">{item.step}</div>
                      <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-all">
                         <item.icon className="h-10 w-10" />
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-2xl font-black uppercase italic text-foreground tracking-tighter">{item.title}</h4>
                         <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* CTA */}
        <section className="py-32 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05),transparent_70%)]">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-12 relative z-10">
              <h2 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter text-foreground leading-none">Join the Grid.</h2>
              <p className="text-xl font-bold text-muted-foreground italic max-w-2xl mx-auto">Create your account and get to class the smart way.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                 <Link href="/auth/signup">
                    <Button className="h-16 px-12 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-all">Join Now</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="outline" className="h-16 px-12 border-primary text-primary rounded-2xl font-black uppercase italic text-xl bg-white/5 hover:bg-white/10 transition-all">Join Fleet</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-background overflow-hidden">
        <div className="container mx-auto px-6 lg:px-20 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-20">
            <div className="col-span-1 lg:col-span-2 space-y-10">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-xl"><ConnectingDotsLogo className="h-8 w-8 text-black" /></div>
                <span className="text-4xl font-black italic uppercase tracking-tighter text-primary">AAGO</span>
              </div>
              <p className="max-w-md text-lg font-bold text-muted-foreground italic leading-relaxed uppercase tracking-tight">
                Making campus travel fast and safe for every student.
              </p>
            </div>
            <div className="space-y-10">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Terminals</p>
              <nav className="flex flex-col gap-6 text-sm font-black uppercase italic text-muted-foreground">
                <Link href="/auth/login" className="hover:text-primary transition-all">Scholar Login</Link>
                <Link href="/driver/login" className="hover:text-primary transition-all">Driver Login</Link>
              </nav>
            </div>
          </div>
          <div className="mt-24 pt-12 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">
            <p>© 2024 AAGO. SMART CAMPUS GRID.</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes shuttle-move {
          0% { transform: translate(-150px, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(150px, 0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
