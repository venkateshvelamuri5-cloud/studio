
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
  X
} from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

// Connecting Dots Logo Component
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
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-body selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 h-20 z-50 px-6 lg:px-20 flex items-center justify-between glass-card !bg-slate-950/60 border-b border-white/5 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.2)] group-hover:rotate-12 transition-transform duration-500">
            <ConnectingDotsLogo className="h-6 w-6 text-slate-950" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase text-white">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Portal</Link>
          <Link href="/auth/signup">
            <Button className="h-10 bg-white text-slate-950 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">Join Grid</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-10 w-10 rounded-xl bg-white/5" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-10 duration-500">
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-white border-b border-white/5 pb-4">Portal Access</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-primary">Create Account</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,255,255,0.08),transparent_50%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
                <Badge className="bg-primary/10 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">Smart Grid Mobility</Badge>
                <h1 className="text-5xl lg:text-7xl font-black leading-tight italic tracking-tighter text-white">
                  Solving the <br /> <span className="text-primary text-glow">Commute Crisis.</span>
                </h1>
                <p className="text-lg font-bold text-slate-400 leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  Legacy transit is slow and expensive. AAGO is a high-tech shuttle network built for reliability, safety, and speed.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-14 px-10 bg-primary hover:bg-primary/90 text-slate-950 rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105">Deploy Identity</Button>
                  </Link>
                  <Link href="/driver/signup">
                    <Button variant="ghost" className="h-14 px-10 rounded-2xl font-black uppercase italic text-lg border border-white/10 bg-white/5 hover:bg-white/10 shadow-xl transition-all">Fleet Partner</Button>
                  </Link>
                </div>
              </div>

              {/* 3D Service Simulation */}
              <div className="hidden lg:block relative perspective-2000 h-[500px]">
                <div className="absolute inset-0 animate-slow-float flex items-center justify-center">
                  <div className="w-[400px] h-[500px] bg-slate-900/50 backdrop-blur-3xl rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.1),transparent_70%)]" />
                    
                    {/* Simulated Map View */}
                    <div className="p-8 space-y-8 relative z-10">
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-20 bg-primary/20 rounded-full" />
                        <ConnectingDotsLogo className="h-6 w-6 text-primary opacity-50" />
                      </div>
                      
                      <div className="h-60 bg-slate-950/80 rounded-[2.5rem] border border-white/5 p-6 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="absolute w-full h-px bg-white/5 rotate-45" />
                           <div className="absolute w-full h-px bg-white/5 -rotate-45" />
                           <div className="absolute w-full h-px bg-white/5" />
                           
                           {/* Pulsing Dots */}
                           <div className="h-2 w-2 bg-primary rounded-full absolute top-1/4 left-1/4 animate-ping" />
                           <div className="h-2 w-2 bg-accent rounded-full absolute bottom-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.5s' }} />
                           
                           {/* Moving Shuttle Symbol */}
                           <div className="absolute animate-[shuttle-move_10s_linear_infinite] flex flex-col items-center">
                              <Bus className="h-6 w-6 text-primary text-glow" />
                              <div className="h-1 w-12 bg-primary/20 blur-sm -mt-1" />
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                           <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Navigation className="h-5 w-5" /></div>
                           <div className="space-y-1">
                              <div className="h-2 w-24 bg-white/20 rounded-full" />
                              <div className="h-2 w-12 bg-white/10 rounded-full" />
                           </div>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary"><QrCode className="h-5 w-5" /></div>
                              <div className="h-2 w-16 bg-primary/40 rounded-full" />
                           </div>
                           <div className="h-6 w-12 bg-primary/30 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem & Solution */}
        <section className="py-24 bg-slate-900/40 relative">
          <div className="container mx-auto px-6 lg:px-20">
             <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                   <h2 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">A Better Protocol.</h2>
                   <div className="space-y-6">
                      {[
                        { title: "No More Overpaying", desc: "Private taxis are a financial drain. AAGO cut costs by up to 70%.", icon: IndianRupee },
                        { title: "No More Waiting", desc: "Real-time radar means you spend zero minutes guessing.", icon: Radar },
                        { title: "Secure Verification", desc: "Every passenger is identity-cleared for a safer network.", icon: ShieldCheck }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-6 items-start">
                           <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center text-primary shrink-0 border border-white/5 shadow-inner"><item.icon className="h-5 w-5" /></div>
                           <div className="space-y-1">
                              <h4 className="text-lg font-black italic uppercase text-white leading-none">{item.title}</h4>
                              <p className="text-sm font-bold text-slate-500 italic">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <Card className="glass-card p-10 lg:p-14 rounded-[3rem] space-y-8 relative overflow-hidden group shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                   <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-white">Grid Logic.</h2>
                   <p className="text-lg font-bold text-slate-400 italic leading-relaxed">
                      We've simplified logistics into a single, high-tech flow. Find your station, secure your seat, and track your shuttle live on the grid.
                   </p>
                   <Button className="h-14 px-10 bg-primary text-slate-950 rounded-2xl font-black uppercase italic text-lg shadow-xl group-hover:scale-105 transition-all">How it works</Button>
                </Card>
             </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="container mx-auto px-6 lg:px-20 text-center space-y-20">
            <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">Network Features.</h2>
            <div className="grid md:grid-cols-3 gap-10">
               {[
                 { title: "Live Radar", desc: "Watch your shuttle navigate the grid in real-time.", icon: Navigation, color: "text-primary" },
                 { title: "Identity Hub", desc: "Secure boarding IDs for every mission.", icon: QrCode, color: "text-accent" },
                 { title: "Reward Grid", desc: "Earn points for every ₹ spent on the grid.", icon: TrendingUp, color: "text-green-400" }
               ].map((item, i) => (
                 <div key={i} className="glass-card p-10 rounded-[2.5rem] text-left space-y-6 hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-3 group shadow-xl">
                    <div className={`h-16 w-16 rounded-2xl bg-slate-950 flex items-center justify-center ${item.color} shadow-lg group-hover:scale-110 transition-transform border border-white/5`}><item.icon className="h-8 w-8" /></div>
                    <div className="space-y-2">
                       <h4 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">{item.title}</h4>
                       <p className="text-sm font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Active Corridors */}
        <section className="py-24 bg-slate-900/20">
          <div className="container mx-auto px-6 lg:px-20 space-y-16">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8">
              <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">Active Nodes.</h2>
              <p className="text-lg font-bold text-slate-500 italic">Live telemetry from the fleet hub.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {!activeRoutes || activeRoutes.length === 0 ? (
                 <div className="col-span-full p-20 text-center glass-card rounded-[3rem] border-dashed shadow-inner">
                    <Globe className="h-10 w-10 text-slate-800 mx-auto mb-6" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700 italic">Scanning for active corridors...</p>
                 </div>
               ) : (
                 activeRoutes.map((route: any) => (
                   <Card key={route.id} className="glass-card p-10 rounded-[2.5rem] hover:shadow-[0_0_80px_rgba(0,255,255,0.1)] transition-all duration-700 group relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12 scale-150"><Network className="h-24 w-24" /></div>
                      <div className="space-y-8 relative z-10">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mission Node</p>
                               <h4 className="text-xl font-black italic uppercase text-white tracking-tighter leading-none">{route.routeName}</h4>
                            </div>
                            <div className="bg-primary/20 p-4 rounded-2xl shadow-inner"><span className="text-lg font-black italic text-primary">₹{route.baseFare}</span></div>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {route.stops?.slice(0, 3).map((stop: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-black uppercase italic text-slate-400 border-white/10 bg-white/[0.03] px-3 py-1 rounded-lg">
                                {stop.name}
                              </Badge>
                            ))}
                            {route.stops?.length > 3 && <Badge variant="outline" className="text-[9px] font-black text-slate-500 border-white/10 px-3 py-1">+{route.stops.length - 3}</Badge>}
                         </div>
                         <div className="pt-8 border-t border-white/5 flex justify-between items-center group-hover:translate-x-2 transition-transform duration-500">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Access Protocol</span>
                            <ArrowRight className="h-5 w-5 text-primary" />
                         </div>
                      </div>
                   </Card>
                 ))
               )}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative overflow-hidden">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-12 relative z-10">
              <h2 className="text-5xl lg:text-7xl font-black uppercase italic tracking-tighter text-white text-glow">Initiate Mission.</h2>
              <p className="text-xl font-bold text-slate-400 italic max-w-2xl mx-auto">Join the mobility network today. Secure your identity and start your commute mission.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                 <Link href="/auth/signup">
                    <Button className="h-16 px-12 bg-white text-slate-950 rounded-2xl font-black uppercase italic text-xl shadow-2xl hover:bg-primary hover:text-white transition-all hover:scale-105">Deploy Identity</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="ghost" className="h-16 px-12 border-white/10 text-white rounded-2xl font-black uppercase italic text-xl glass-card hover:bg-white/10 transition-all">Operator Join</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-slate-950/80">
        <div className="container mx-auto px-6 lg:px-20">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-16">
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="bg-primary p-2.5 rounded-xl shadow-lg"><ConnectingDotsLogo className="h-6 w-6 text-slate-950" /></div>
                <span className="text-2xl font-black italic uppercase tracking-tighter text-white">AAGO</span>
              </Link>
              <p className="max-w-xs text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 italic leading-loose">High-tech urban mobility protocol. Operating professional corridors for the modern grid.</p>
            </div>
            <div className="grid grid-cols-2 gap-20">
              <div className="space-y-6">
                <p className="text-[12px] font-black uppercase tracking-widest text-white">Grid Access</p>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Scholar Terminal</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Driver Console</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors">Ops Center</Link>
                </nav>
              </div>
              <div className="space-y-6">
                <p className="text-[12px] font-black uppercase tracking-widest text-white">Network</p>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Protocol Status</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Identity Privacy</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-800 italic">
            <p>© 2024 AAGO GRID. ALL SYSTEMS NOMINAL.</p>
            <div className="flex gap-10">
               <span className="text-primary/30">Radar: Active</span>
               <span className="text-primary/30">Sync: Locked</span>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes shuttle-move {
          0% { transform: translate(-100px, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(100px, 0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
