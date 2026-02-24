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
  CheckCircle2,
  Users,
  Smartphone
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
                  Stop wasting your pocket money on expensive private transport. Get fast, safe, and reliable bus rides to campus. Never miss a 1st hour lecture again.
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
                           <Badge className="bg-primary text-black border-none text-[8px] font-black uppercase">On Time</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Commute Crisis Section */}
        <section className="py-24 bg-white/[0.02] border-y border-white/5">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
                 <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">The Commute Crisis</Badge>
                 <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">Why Students Hate Travel.</h2>
                 <p className="text-lg font-bold text-muted-foreground italic leading-relaxed">
                    Campus transport shouldn't be a daily struggle for scholars. We identified the top 3 reasons students are frustrated.
                 </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-10">
                 {[
                   { 
                     title: "Unfair Pricing", 
                     desc: "Local transport often charges high prices just because you're a student. It kills your monthly pocket money.", 
                     icon: IndianRupee 
                   },
                   { 
                     title: "Unpredictable Rides", 
                     desc: "Regular buses have no tracking. You stand in the heat for a long time not knowing if the ride is coming or full.", 
                     icon: Clock 
                   },
                   { 
                     title: "Safety is a Gamble", 
                     desc: "Walking long distances or taking unverified rides is risky. Every scholar deserves a secure journey.", 
                     icon: ShieldAlert 
                   }
                 ].map((item, i) => (
                   <Card key={i} className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] shadow-xl hover:border-primary/20 transition-all group">
                      <div className="h-14 w-14 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-8 group-hover:scale-110 transition-transform">
                         <item.icon className="h-7 w-7" />
                      </div>
                      <h4 className="text-2xl font-black uppercase italic text-foreground tracking-tighter mb-4">{item.title}</h4>
                      <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">{item.desc}</p>
                   </Card>
                 ))}
              </div>
           </div>
        </section>

        {/* The Student Grid Section */}
        <section className="py-24 bg-[radial-gradient(circle_at_0%_50%,rgba(0,255,255,0.03),transparent_50%)]">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="grid lg:grid-cols-2 gap-24 items-center">
                 <div className="relative">
                    <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-20" />
                    <Card className="glass-card p-12 rounded-[3.5rem] relative z-10 space-y-10 border-primary/20">
                       <h3 className="text-3xl font-black italic uppercase text-primary text-glow">How AAGO Fixes It.</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><IndianRupee className="h-6 w-6" /></div>
                             <h5 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Fixed Fare</h5>
                             <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">No more bargaining. Pay the same student price every single day.</p>
                          </div>
                          <div className="space-y-4">
                             <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Radar className="h-6 w-6" /></div>
                             <h5 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Live Map</h5>
                             <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">See where your bus is. Walk to the stop only when it's nearby.</p>
                          </div>
                          <div className="space-y-4">
                             <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><CheckCircle2 className="h-6 w-6" /></div>
                             <h5 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Verified Seats</h5>
                             <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">Secure your seat before you board. No more standing in crowds.</p>
                          </div>
                          <div className="space-y-4">
                             <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Smartphone className="h-6 w-6" /></div>
                             <h5 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Smart Boarding</h5>
                             <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">Just show your 6-digit code. Fast, paperless, and futuristic.</p>
                          </div>
                       </div>
                    </Card>
                 </div>
                 <div className="space-y-10">
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">Smart Mobility</Badge>
                    <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">Built by Tech, <br/> Driven by Scholars.</h2>
                    <p className="text-lg font-bold text-muted-foreground italic leading-relaxed pl-6 border-l-4 border-primary/20">
                       AAGO isn't just a bus service. It's a digital grid designed to move students with maximum efficiency and zero stress. We use smart algorithms to optimize routes and fixed pricing to protect your wallet.
                    </p>
                    <div className="flex gap-10">
                       <div className="space-y-1">
                          <h4 className="text-3xl font-black text-primary italic leading-none tracking-tighter">Scholar</h4>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Rates</p>
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-3xl font-black text-primary italic leading-none tracking-tighter">100%</h4>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Live Updates</p>
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-3xl font-black text-primary italic leading-none tracking-tighter">24/7</h4>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Safety Support</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Steps Section */}
        <section className="py-24 bg-white/[0.01] border-y border-white/5">
           <div className="container mx-auto px-6 lg:px-20">
              <div className="text-center space-y-6 mb-24">
                 <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">3 Steps to Class.</h2>
                 <p className="text-lg font-bold text-muted-foreground italic">Join the network in under 60 seconds.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-12">
                 {[
                   { step: "01", title: "Find Ride", desc: "Open the app and search your campus route. See the nearest pickup node.", icon: Radar },
                   { step: "02", title: "Secure Seat", desc: "Book your seat for a student price. Get your unique boarding code instantly.", icon: Lock },
                   { step: "03", title: "Show & Go", desc: "Board your shuttle, show your code to the driver, and ride to class comfortably.", icon: CheckCircle2 }
                 ].map((item, i) => (
                   <div key={i} className="relative flex flex-col items-center text-center space-y-8 bg-white/5 p-12 border border-white/10 rounded-[3rem] shadow-xl group hover:border-primary transition-all">
                      <div className="absolute -top-6 h-12 w-12 rounded-full bg-primary text-black flex items-center justify-center font-black italic shadow-lg">{item.step}</div>
                      <div className="h-20 w-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-all">
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

        {/* Referral Section */}
        <section className="py-24 bg-[radial-gradient(circle_at_100%_50%,rgba(0,255,255,0.02),transparent_50%)]">
           <div className="container mx-auto px-6 lg:px-20">
              <Card className="glass-card rounded-[4rem] p-16 text-center border-primary/10 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12"><Users className="h-64 w-64 text-primary" /></div>
                 <div className="max-w-3xl mx-auto space-y-10 relative z-10">
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em]">The Referral Loop</Badge>
                    <h2 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter text-foreground leading-none">Invite Scholars. <br/> Earn Points.</h2>
                    <p className="text-xl font-bold text-muted-foreground italic leading-relaxed">
                       Help your campus community. Every friend who joins using your unique code earns you **Scholar Points**. Use points for discounts and exclusive rewards.
                    </p>
                    <div className="flex justify-center">
                       <Link href="/auth/signup">
                          <Button className="h-16 px-12 bg-primary text-black rounded-2xl font-black uppercase italic text-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-all">Get Your Code</Button>
                       </Link>
                    </div>
                 </div>
              </Card>
           </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
           <div className="container mx-auto px-6 lg:px-20 text-center space-y-12 relative z-10">
              <h2 className="text-5xl lg:text-8xl font-black uppercase italic tracking-tighter text-foreground leading-none">Join the Grid.</h2>
              <p className="text-xl font-bold text-muted-foreground italic max-w-2xl mx-auto">Create your scholar profile today and take control of your daily commute.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-8 pt-10">
                 <Link href="/auth/signup">
                    <Button className="h-20 px-16 bg-primary text-black rounded-3xl font-black uppercase italic text-2xl shadow-2xl shadow-primary/30 hover:scale-105 transition-all">Join Now</Button>
                 </Link>
                 <Link href="/driver/signup">
                    <Button variant="outline" className="h-20 px-16 border-2 border-primary text-primary rounded-3xl font-black uppercase italic text-2xl bg-white/5 hover:bg-white/10 transition-all">Join Fleet</Button>
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
                Empowering scholars with the smartest, safest, and most affordable campus transit network.
              </p>
            </div>
            <div className="space-y-10">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Terminals</p>
              <nav className="flex flex-col gap-6 text-sm font-black uppercase italic text-muted-foreground">
                <Link href="/auth/login" className="hover:text-primary transition-all">Scholar Login</Link>
                <Link href="/driver/login" className="hover:text-primary transition-all">Driver Login</Link>
                <Link href="/admin/login" className="hover:text-primary transition-all">Ops Terminal</Link>
              </nav>
            </div>
            <div className="space-y-10">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Support</p>
              <nav className="flex flex-col gap-6 text-sm font-black uppercase italic text-muted-foreground">
                <span className="cursor-default">Privacy Protocol</span>
                <span className="cursor-default">Grid Security</span>
              </nav>
            </div>
          </div>
          <div className="mt-24 pt-12 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">
            <p>© 2024 AAGO GRID. DESIGNED FOR SCHOLARS.</p>
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
