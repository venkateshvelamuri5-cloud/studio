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
  Cpu
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
          <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Portal Access</Link>
          <Link href="/auth/signup">
            <Button className="h-10 bg-primary text-black px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Join Grid</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-10 w-10 rounded-xl bg-white/5" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} className="text-primary" /> : <Menu size={24} className="text-primary" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-10 duration-500">
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-foreground border-b border-white/5 pb-4">Portal Access</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-primary">Create Account</Link>
          <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-muted-foreground">Partner Portal</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,255,255,0.05),transparent_50%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">Smart Mobility Hub</Badge>
                <h1 className="text-5xl lg:text-7xl font-black leading-tight italic tracking-tighter text-foreground">
                  Reliable Commute. <br /> <span className="text-primary text-glow">Optimized Flow.</span>
                </h1>
                <p className="text-lg font-bold text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  Experience a high-tech shuttle network designed for safety, precision, and speed. Simple, secure, and always on time.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-16 px-10 bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-105">Deploy Identity</Button>
                  </Link>
                  <Link href="/driver/signup">
                    <Button variant="ghost" className="h-16 px-10 rounded-2xl font-black uppercase italic text-lg border border-white/5 bg-white/5 hover:bg-white/10 shadow-xl transition-all text-primary">Partner Portal</Button>
                  </Link>
                </div>
              </div>

              {/* 3D Service Simulation */}
              <div className="hidden lg:block relative perspective-2000 h-[600px]">
                <div className="absolute inset-0 animate-slow-float flex items-center justify-center">
                  <div className="w-[450px] h-[550px] bg-white/5 rounded-[4rem] border border-white/10 shadow-[0_32px_128px_-12px_rgba(0,255,255,0.15)] relative overflow-hidden group backdrop-blur-3xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.1),transparent_70%)]" />
                    
                    <div className="p-8 space-y-8 relative z-10">
                      <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hub Sync: Locked</span>
                        </div>
                        <ConnectingDotsLogo className="h-5 w-5 text-primary opacity-50" />
                      </div>
                      
                      <div className="h-64 bg-black/40 rounded-[2.5rem] border border-white/5 p-6 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="absolute w-full h-px bg-primary/10 rotate-45" />
                           <div className="absolute w-full h-px bg-primary/10 -rotate-45" />
                           
                           <div className="h-3 w-3 bg-primary rounded-full absolute top-1/4 left-1/4 animate-ping" />
                           <div className="h-3 w-3 bg-primary/50 rounded-full absolute bottom-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.5s' }} />
                           
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
                           <Badge className="bg-primary text-black border-none text-[8px] font-black uppercase">₹20 Base</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="py-24 bg-black/20 border-y border-white/5">
          <div className="container mx-auto px-6 lg:px-20 text-center space-y-20">
            <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-foreground">Grid Capabilities.</h2>
            <div className="grid md:grid-cols-3 gap-10">
               {[
                 { title: "Live Radar", desc: "Visual telemetry for every active shuttle on the corridor.", icon: Navigation, color: "text-primary" },
                 { title: "Identity Vault", desc: "Encrypted boarding IDs for every commute mission.", icon: QrCode, color: "text-primary/80" },
                 { title: "Reward Grid", desc: "Earn loyalty points for every mission completed.", icon: TrendingUp, color: "text-primary/60" }
               ].map((item, i) => (
                 <Card key={i} className="glass-card p-10 rounded-[2.5rem] text-left space-y-6 group hover:-translate-y-2 transition-all duration-500">
                    <div className={`h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center ${item.color} shadow-sm group-hover:scale-110 transition-transform`}><item.icon className="h-8 w-8" /></div>
                    <div className="space-y-2">
                       <h4 className="text-xl font-black uppercase italic tracking-tighter text-foreground leading-none">{item.title}</h4>
                       <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">{item.desc}</p>
                    </div>
                 </Card>
               ))}
            </div>
          </div>
        </section>

        {/* Active Corridors Section */}
        <section className="py-24">
          <div className="container mx-auto px-6 lg:px-20 space-y-16">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8">
              <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-foreground">Active Corridors.</h2>
              <p className="text-lg font-bold text-muted-foreground italic">Live telemetry from the fleet hub.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {!activeRoutes || activeRoutes.length === 0 ? (
                 <div className="col-span-full p-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <Globe className="h-10 w-10 text-white/10 mx-auto mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Scanning for active nodes...</p>
                 </div>
               ) : (
                 activeRoutes.map((route: any) => (
                   <Card key={route.id} className="glass-card p-10 rounded-[2.5rem] group hover:border-primary transition-all duration-500">
                      <div className="space-y-8 relative z-10">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mission Node</p>
                               <h4 className="text-xl font-black italic uppercase text-foreground tracking-tighter leading-none">{route.routeName}</h4>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl shadow-inner"><span className="text-lg font-black italic text-primary">₹{route.baseFare}</span></div>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {route.stops?.slice(0, 3).map((stop: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-black uppercase italic text-muted-foreground border-white/10 bg-white/5 px-3 py-1 rounded-lg">
                                {stop.name}
                              </Badge>
                            ))}
                         </div>
                         <Link href="/auth/signup" className="pt-8 border-t border-white/5 flex justify-between items-center group-hover:translate-x-2 transition-transform duration-500">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Access Protocol</span>
                            <ArrowRight className="h-5 w-5 text-primary" />
                         </Link>
                      </div>
                   </Card>
                 ))
               )}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05),transparent_70%)]">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-12 relative z-10">
              <h2 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter text-foreground leading-none">Initiate Mission.</h2>
              <p className="text-xl font-bold text-muted-foreground italic max-w-2xl mx-auto">Join the mobility grid. Secure your identity and start your commute.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                 <Link href="/auth/signup">
                    <Button className="h-16 px-12 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-all">Deploy Identity</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="outline" className="h-16 px-12 border-primary text-primary rounded-2xl font-black uppercase italic text-xl bg-white/5 hover:bg-white/10 transition-all">Partner Access</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* Command Footer */}
      <footer className="relative border-t border-white/5 bg-background overflow-hidden">
        <div className="h-14 border-b border-white/5 bg-white/5 flex items-center overflow-hidden">
           <div className="flex gap-12 px-20 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground"><Wifi className="h-3 w-3 text-primary" /> Grid Connection: 100%</span>
                  <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground"><Cpu className="h-3 w-3 text-primary" /> System Core: Nominal</span>
                  <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground"><Lock className="h-3 w-3 text-primary" /> Identity Vault: Encrypted</span>
                </div>
              ))}
           </div>
        </div>

        <div className="container mx-auto px-6 lg:px-20 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-20">
            <div className="col-span-1 lg:col-span-2 space-y-10">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-xl"><ConnectingDotsLogo className="h-8 w-8 text-black" /></div>
                <span className="text-4xl font-black italic uppercase tracking-tighter text-primary">AAGO</span>
              </div>
              <p className="max-w-md text-lg font-bold text-muted-foreground italic leading-relaxed uppercase tracking-tight">
                Optimizing urban flow through shared intelligence. AAGO is a high-tech mobility grid designed to save time and enhance safety.
              </p>
            </div>

            <div className="space-y-10">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Terminals</p>
              <nav className="flex flex-col gap-6 text-sm font-black uppercase italic text-muted-foreground">
                <Link href="/auth/login" className="hover:text-primary transition-all">Scholar Portal</Link>
                <Link href="/driver/login" className="hover:text-primary transition-all">Partner Console</Link>
                <Link href="/admin/login" className="hover:text-primary transition-all">Ops Dashboard</Link>
              </nav>
            </div>
          </div>

          <div className="mt-24 pt-12 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">
            <p>© 2024 AAGO GRID. MISSION CRITICAL PERFORMANCE.</p>
            <div className="flex gap-10">
               <span className="text-primary/40 flex items-center gap-2"><Zap className="h-3 w-3" /> Core: Active</span>
            </div>
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
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}