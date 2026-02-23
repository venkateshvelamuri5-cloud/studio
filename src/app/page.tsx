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
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-body selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 h-20 z-50 px-6 lg:px-20 flex items-center justify-between bg-white/80 border-b border-slate-100 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-500">
            <ConnectingDotsLogo className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase text-primary">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Portal Access</Link>
          <Link href="/auth/signup">
            <Button className="h-10 bg-primary text-white px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-200">Join Grid</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-10 w-10 rounded-xl bg-slate-50" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} className="text-primary" /> : <Menu size={24} className="text-primary" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-10 duration-500">
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-slate-900 border-b border-slate-50 pb-4">Portal Access</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-primary">Create Account</Link>
          <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-slate-400">Partner Portal</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden bg-gradient-to-b from-orange-50/50 to-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(234,88,12,0.05),transparent_50%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
                <Badge className="bg-orange-100 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">Smart Mobility Hub</Badge>
                <h1 className="text-6xl lg:text-7xl font-black leading-tight italic tracking-tighter text-slate-900">
                  Reliable Commute. <br /> <span className="text-primary text-glow">Optimized Flow.</span>
                </h1>
                <p className="text-lg font-bold text-slate-500 leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  Experience a high-tech shuttle network designed for safety, precision, and speed. Simple, secure, and always on time.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-16 px-10 bg-primary hover:bg-orange-600 text-white rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-orange-200 transition-all hover:scale-105">Deploy Identity</Button>
                  </Link>
                  <Link href="/driver/signup">
                    <Button variant="ghost" className="h-16 px-10 rounded-2xl font-black uppercase italic text-lg border border-orange-100 bg-white hover:bg-orange-50 shadow-xl transition-all text-primary">Partner Portal</Button>
                  </Link>
                </div>
              </div>

              {/* Enhanced 3D Service Simulation (Light Theme) */}
              <div className="hidden lg:block relative perspective-2000 h-[600px]">
                <div className="absolute inset-0 animate-slow-float flex items-center justify-center">
                  <div className="w-[450px] h-[550px] bg-white rounded-[4rem] border border-orange-100 shadow-[0_32px_128px_-12px_rgba(234,88,12,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.05),transparent_70%)]" />
                    
                    <div className="p-8 space-y-8 relative z-10">
                      <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hub Sync: Locked</span>
                        </div>
                        <ConnectingDotsLogo className="h-5 w-5 text-primary opacity-50" />
                      </div>
                      
                      <div className="h-64 bg-slate-50 rounded-[2.5rem] border border-orange-50 p-6 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="absolute w-full h-px bg-orange-100/30 rotate-45" />
                           <div className="absolute w-full h-px bg-orange-100/30 -rotate-45" />
                           
                           {/* Pulsing Station Hubs */}
                           <div className="h-3 w-3 bg-primary rounded-full absolute top-1/4 left-1/4 animate-ping" />
                           <div className="h-3 w-3 bg-orange-300 rounded-full absolute bottom-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.5s' }} />
                           
                           {/* Moving Shuttle Symbol */}
                           <div className="absolute animate-[shuttle-move_8s_linear_infinite] flex flex-col items-center">
                              <Bus className="h-8 w-8 text-primary drop-shadow-lg" />
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm"><Navigation className="h-5 w-5" /></div>
                              <div className="space-y-1">
                                 <div className="h-2 w-24 bg-orange-200 rounded-full" />
                                 <div className="h-2 w-12 bg-orange-100 rounded-full" />
                              </div>
                           </div>
                           <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase">₹20 Base</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem & Solution Section */}
        <section className="py-24 bg-white relative border-t border-slate-50">
          <div className="container mx-auto px-6 lg:px-20">
             <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                   <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-slate-900">Simplified Grid.</h2>
                   <div className="space-y-6">
                      {[
                        { title: "Cost Efficiency", desc: "Cut your commute costs by up to 70% with our shared grid model.", icon: IndianRupee },
                        { title: "Precision Tracking", desc: "Know exactly when your shuttle arrives with live radar telemetry.", icon: Radar },
                        { title: "Secure Access", desc: "Every passenger is identity-verified for a safe and trusted network.", icon: ShieldCheck }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-6 items-start">
                           <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-primary shrink-0 border border-orange-100"><item.icon className="h-5 w-5" /></div>
                           <div className="space-y-1">
                              <h4 className="text-lg font-black italic uppercase text-slate-900 leading-none">{item.title}</h4>
                              <p className="text-sm font-bold text-slate-500 italic">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <Card className="glass-card p-10 lg:p-14 rounded-[3rem] space-y-8 shadow-2xl bg-white/80 border-orange-100">
                   <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-primary leading-none">Global Logic.</h2>
                   <p className="text-lg font-bold text-slate-500 italic leading-relaxed">
                      We've simplified urban logistics. Find your node, secure your seat, and track your trip on the grid.
                   </p>
                   <Link href="/auth/signup">
                    <Button className="h-14 px-10 bg-primary text-white rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-orange-200">How it works</Button>
                   </Link>
                </Card>
             </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="py-24 bg-orange-50/30">
          <div className="container mx-auto px-6 lg:px-20 text-center space-y-20">
            <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-slate-900">Grid Capabilities.</h2>
            <div className="grid md:grid-cols-3 gap-10">
               {[
                 { title: "Live Radar", desc: "Visual telemetry for every active shuttle on the corridor.", icon: Navigation, color: "text-primary" },
                 { title: "Identity Hub", desc: "Encrypted boarding IDs for every commute mission.", icon: QrCode, color: "text-orange-600" },
                 { title: "Reward Grid", desc: "Earn loyalty points for every mission completed.", icon: TrendingUp, color: "text-orange-500" }
               ].map((item, i) => (
                 <div key={i} className="bg-white p-10 rounded-[2.5rem] text-left space-y-6 shadow-xl border border-orange-50 hover:-translate-y-2 transition-all duration-500 group">
                    <div className={`h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center ${item.color} shadow-sm group-hover:scale-110 transition-transform`}><item.icon className="h-8 w-8" /></div>
                    <div className="space-y-2">
                       <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{item.title}</h4>
                       <p className="text-sm font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Active Corridors Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 lg:px-20 space-y-16">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8">
              <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-slate-900">Active Corridors.</h2>
              <p className="text-lg font-bold text-slate-500 italic">Live telemetry from the fleet hub.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {!activeRoutes || activeRoutes.length === 0 ? (
                 <div className="col-span-full p-20 text-center bg-orange-50 rounded-[3rem] border border-dashed border-orange-200">
                    <Globe className="h-10 w-10 text-orange-200 mx-auto mb-6" />
                    <p className="text-xs font-black uppercase tracking-widest text-orange-300 italic">Scanning for active nodes...</p>
                 </div>
               ) : (
                 activeRoutes.map((route: any) => (
                   <Card key={route.id} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-orange-50 group hover:border-primary transition-all duration-500">
                      <div className="space-y-8 relative z-10">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mission Node</p>
                               <h4 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter leading-none">{route.routeName}</h4>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-2xl shadow-inner"><span className="text-lg font-black italic text-primary">₹{route.baseFare}</span></div>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {route.stops?.slice(0, 3).map((stop: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-black uppercase italic text-slate-400 border-slate-100 bg-slate-50 px-3 py-1 rounded-lg">
                                {stop.name}
                              </Badge>
                            ))}
                         </div>
                         <Link href="/auth/signup" className="pt-8 border-t border-slate-50 flex justify-between items-center group-hover:translate-x-2 transition-transform duration-500">
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
        <section className="py-32 bg-orange-50/50">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-12 relative z-10">
              <h2 className="text-5xl lg:text-7xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Initiate Mission.</h2>
              <p className="text-xl font-bold text-slate-500 italic max-w-2xl mx-auto">Join the mobility grid. Secure your identity and start your commute.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                 <Link href="/auth/signup">
                    <Button className="h-16 px-12 bg-primary text-white rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-orange-200 hover:scale-105 transition-all">Deploy Identity</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="outline" className="h-16 px-12 border-primary text-primary rounded-2xl font-black uppercase italic text-xl bg-white hover:bg-orange-50 transition-all">Partner Access</Button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* Command Footer (Light Theme) */}
      <footer className="relative border-t border-slate-100 bg-white">
        <div className="h-14 border-b border-slate-50 bg-slate-50/50 flex items-center overflow-hidden">
           <div className="flex gap-12 px-20 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400"><Wifi className="h-3 w-3 text-primary" /> Grid Connection: 100%</span>
                  <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400"><Cpu className="h-3 w-3 text-primary" /> System Core: Nominal</span>
                  <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400"><Lock className="h-3 w-3 text-primary" /> Identity Vault: Encrypted</span>
                </div>
              ))}
           </div>
        </div>

        <div className="container mx-auto px-6 lg:px-20 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-20">
            <div className="col-span-1 lg:col-span-2 space-y-10">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-xl"><ConnectingDotsLogo className="h-8 w-8 text-white" /></div>
                <span className="text-4xl font-black italic uppercase tracking-tighter text-primary">AAGO</span>
              </div>
              <p className="max-w-md text-lg font-bold text-slate-500 italic leading-relaxed uppercase tracking-tight">
                Optimizing urban flow through shared intelligence. AAGO is a high-tech mobility grid designed to save time and enhance safety.
              </p>
            </div>

            <div className="space-y-10">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">Terminals</p>
              <nav className="flex flex-col gap-6 text-sm font-black uppercase italic text-slate-400">
                <Link href="/auth/login" className="hover:text-primary transition-all">Scholar Portal</Link>
                <Link href="/driver/login" className="hover:text-primary transition-all">Partner Console</Link>
                <Link href="/admin/login" className="hover:text-primary transition-all">Ops Dashboard</Link>
              </nav>
            </div>
          </div>

          <div className="mt-24 pt-12 border-t border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-8">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 italic">© 2024 AAGO GRID. MISSION CRITICAL PERFORMANCE.</p>
            <div className="flex gap-10">
               <span className="text-primary/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><Zap className="h-3 w-3" /> Core: Active</span>
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
