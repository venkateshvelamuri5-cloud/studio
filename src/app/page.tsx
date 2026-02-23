"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Bus, 
  ArrowRight, 
  Navigation,
  QrCode,
  ShieldCheck,
  Zap,
  Activity,
  Clock,
  Menu,
  X,
  Radar,
  IndianRupee,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Globe,
  Network
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

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
          <div className="bg-primary p-2.5 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.3)] group-hover:rotate-12 transition-transform duration-500">
            <Bus className="h-6 w-6 text-slate-950" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter uppercase text-white">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Terminal</Link>
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
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-white border-b border-white/5 pb-4">Terminal Access</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase italic text-primary">Create Account</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,255,255,0.1),transparent_50%)]" />
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
              <Badge className="bg-primary/10 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">Smart Mobility Protocol</Badge>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight italic tracking-tighter text-white">
                The Future of <br /> <span className="text-primary text-glow">Urban Transit.</span>
              </h1>
              <p className="text-lg lg:text-xl font-bold text-slate-400 leading-relaxed italic border-l-8 border-primary/20 pl-6">
                Redesigning how cities move. AAGO is a high-tech shuttle grid built for speed, safety, and efficiency.
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
          </div>
        </section>

        {/* Problem & Solution */}
        <section className="py-24 bg-slate-900/40 relative">
          <div className="container mx-auto px-6 lg:px-20">
             <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                   <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">Why AAGO?</h2>
                   <div className="space-y-6">
                      {[
                        { title: "No More Overpaying", desc: "Private transport is too expensive. We cut costs by 70%.", icon: IndianRupee },
                        { title: "No More Waiting", desc: "Satellite tracking means you know exactly where your ride is.", icon: Radar },
                        { title: "Secure ID Verification", desc: "Every passenger is verified on the regional grid.", icon: ShieldCheck }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-6 items-start">
                           <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center text-primary shrink-0 border border-white/5"><item.icon className="h-5 w-5" /></div>
                           <div className="space-y-1">
                              <h4 className="text-xl font-black italic uppercase text-white leading-none">{item.title}</h4>
                              <p className="text-sm font-bold text-slate-500 italic">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <Card className="glass-card p-10 lg:p-14 rounded-[3rem] space-y-8 relative overflow-hidden group shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,255,255,0.05),transparent_70%)]" />
                   <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">The Protocol.</h2>
                   <p className="text-lg font-bold text-slate-400 italic leading-relaxed">
                      We've simplified urban transit into a single, high-tech flow. Find your station, secure your seat, and track your progress live.
                   </p>
                   <Button className="h-14 px-10 bg-primary text-slate-950 rounded-2xl font-black uppercase italic text-lg shadow-xl group-hover:scale-105 transition-all">How it works</Button>
                </Card>
             </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="container mx-auto px-6 lg:px-20 text-center space-y-20">
            <h2 className="text-5xl lg:text-6xl font-black uppercase italic tracking-tighter text-white">Grid Features.</h2>
            <div className="grid md:grid-cols-3 gap-10">
               {[
                 { title: "Live Tracking", desc: "Watch your shuttle move in real-time on the tactical radar.", icon: Navigation, color: "text-primary" },
                 { title: "Identity Hub", desc: "Your 6-digit Boarding ID ensures a secure and verified ride.", icon: QrCode, color: "text-accent" },
                 { title: "Reward Grid", desc: "Earn 10 points for every 100 spent. Redeem for future missions.", icon: TrendingUp, color: "text-green-400" }
               ].map((item, i) => (
                 <div key={i} className="glass-card p-10 rounded-[2.5rem] text-left space-y-6 hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-3 group shadow-xl">
                    <div className={`h-16 w-16 rounded-2xl bg-slate-950 flex items-center justify-center ${item.color} shadow-lg group-hover:scale-110 transition-transform border border-white/5`}><item.icon className="h-8 w-8" /></div>
                    <div className="space-y-2">
                       <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">{item.title}</h4>
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
              <h2 className="text-5xl lg:text-6xl font-black uppercase italic tracking-tighter text-white">Active Nodes.</h2>
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
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Node #SYNC</p>
                               <h4 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">{route.routeName}</h4>
                            </div>
                            <div className="bg-primary/20 p-4 rounded-2xl"><span className="text-xl font-black italic text-primary">₹{route.baseFare}</span></div>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {route.stops?.slice(0, 3).map((stop: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-black uppercase italic text-slate-400 border-white/10 bg-white/[0.03] px-3 py-1 rounded-lg">
                                {stop.name}
                              </Badge>
                            ))}
                            {route.stops?.length > 3 && <Badge variant="outline" className="text-[9px] font-black text-slate-500 border-white/10 px-3 py-1">+{route.stops.length - 3} more</Badge>}
                         </div>
                         <div className="pt-8 border-t border-white/5 flex justify-between items-center group-hover:translate-x-2 transition-transform duration-500">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Access Terminal</span>
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
              <h2 className="text-6xl lg:text-7xl font-black uppercase italic tracking-tighter text-white text-glow">Ready to Ride?</h2>
              <p className="text-xl font-bold text-slate-400 italic max-w-2xl mx-auto">Join the regional mobility network today. Secure your identity and start your mission.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                 <Link href="/auth/signup">
                    <Button className="h-16 px-12 bg-white text-slate-950 rounded-2xl font-black uppercase italic text-xl shadow-2xl hover:bg-primary hover:text-white transition-all hover:scale-105">Deploy Terminal</Button>
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
                <div className="bg-primary p-3 rounded-xl shadow-lg"><Bus className="h-6 w-6 text-slate-950" /></div>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-white">AAGO</span>
              </Link>
              <p className="max-w-xs text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 italic leading-loose">The next-gen urban mobility protocol. Operating high-tech corridors for the modern city.</p>
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
                <p className="text-[12px] font-black uppercase tracking-widest text-white">Legal Hub</p>
                <nav className="flex flex-col gap-4 text-sm font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Network Protocol</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Privacy Grid</Link>
                </nav>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-800 italic">
            <p>© 2024 AAGO GLOBAL GRID. ALL SYSTEMS NOMINAL.</p>
            <div className="flex gap-10">
               <span className="text-primary/40">Radar Live</span>
               <span className="text-primary/40">Node Sync Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}