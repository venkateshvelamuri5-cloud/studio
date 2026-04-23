
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ArrowRight, 
  ShieldCheck,
  Navigation,
  IndianRupee,
  MapPin,
  CheckCircle2,
  Menu,
  X,
  Loader2,
  Users,
  Clock,
  Sparkles,
  Route as RouteIcon,
  CircleDot
} from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

const AbstractHubGraphic = () => (
  <div className="relative w-full h-full flex items-center justify-center p-12">
    <div className="absolute inset-0 bg-primary/5 rounded-[4rem] blur-[100px] animate-pulse"></div>
    <div className="relative w-full h-full border-2 border-white/5 rounded-[4rem] flex items-center justify-center overflow-hidden bg-black/20 backdrop-blur-sm">
      <svg className="w-full h-full opacity-30" viewBox="0 0 400 400">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g className="text-primary">
          <circle cx="100" cy="100" r="4" fill="currentColor" />
          <circle cx="300" cy="150" r="4" fill="currentColor" />
          <circle cx="200" cy="300" r="4" fill="currentColor" />
          <path d="M100 100 L300 150 L200 300 Z" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="10 10" className="animate-[dash_30s_linear_infinite]" />
        </g>
      </svg>
      <div className="absolute flex flex-col items-center gap-6 animate-slow-float">
        <div className="bg-primary p-8 rounded-[2rem] text-black shadow-2xl">
          <Logo className="h-20 w-20" />
        </div>
        <div className="bg-white/10 backdrop-blur-2xl px-8 py-4 rounded-2xl border border-white/10">
          <span className="text-xs font-black uppercase italic tracking-widest text-primary">AAGO HUB ONLINE</span>
        </div>
      </div>
    </div>
  </div>
);

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'driver') router.push('/driver');
      else router.push('/student');
    }
  }, [user, profile, authLoading, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body overflow-x-hidden selection:bg-primary selection:text-black">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-24 z-50 px-6 lg:px-24 flex items-center justify-between transition-all duration-500 ${scrolled ? 'bg-background/95 border-b border-white/5 backdrop-blur-xl shadow-2xl' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-4 group">
          <div className="bg-primary p-2.5 rounded-xl text-black shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
            <Logo className="h-7 w-7" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="#how-it-works" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">How it works</Link>
          <Link href="#features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">Benefits</Link>
          {authLoading ? (
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          ) : user ? (
            <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
              <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Open Hub</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-6">
              <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">Login</Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Book Ticket</Button>
              </Link>
            </div>
          )}
        </nav>

        <Button variant="ghost" className="lg:hidden p-0 text-primary" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-36 px-12 flex flex-col gap-10 animate-in fade-in slide-in-from-top-6 duration-500 backdrop-blur-3xl">
          <Link href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase text-foreground">How it works</Link>
          <Link href="#features" onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase text-foreground">Benefits</Link>
          {user ? (
             <Link href={profile?.role === 'driver' ? '/driver' : '/student'} onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">My Hub</Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-foreground tracking-tighter">Login</Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">Join AAGO</Link>
              <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-muted-foreground tracking-tighter">Apply for Duty</Link>
            </>
          )}
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative pt-48 pb-24 lg:pt-64 lg:pb-48 overflow-hidden min-h-[90vh] flex items-center">
          <div className="container mx-auto px-6 lg:px-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-10 text-center lg:text-left animate-in fade-in slide-in-from-left-12 duration-1000">
                <Badge className="px-6 py-2.5 text-primary border-primary/30 bg-primary/5 font-black uppercase tracking-[0.4em] text-[10px] italic rounded-full shadow-lg">
                  <Sparkles className="h-3 w-3 mr-2 inline" /> Community Mobility Hub
                </Badge>
                <h1 className="text-6xl lg:text-9xl font-black text-foreground italic uppercase tracking-tighter leading-[0.85]">
                  Pakka <br /> <span className="text-primary">Travel.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 italic font-medium opacity-80">
                  Fixed fares, no bargaining. Professional city transit for your community. Timely, safe, and reliable.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-6 justify-center lg:justify-start">
                  {user ? (
                    <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
                      <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Enter My Hub</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/auth/signup">
                        <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Join Now</Button>
                      </Link>
                      <Link href="/driver/signup">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto h-20 px-16 rounded-[2rem] font-black uppercase italic text-2xl border-2 border-primary text-primary hover:bg-primary/5 transition-all">Apply for Duty</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="relative aspect-square animate-in zoom-in duration-1000">
                <AbstractHubGraphic />
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-40 bg-black/40 relative">
           <div className="container mx-auto px-6 lg:px-24">
              <div className="text-center space-y-4 mb-24 animate-in fade-in duration-700">
                 <h2 className="text-4xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none text-primary">How AAGO Works</h2>
                 <p className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.4em] italic mt-4">Simple 3-Step Process</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-12">
                 {[
                   { 
                     step: "01", 
                     title: "Book Ticket", 
                     desc: "Pick your route and time. Pay the fixed fare online. No more bargaining at the stop.",
                     icon: Navigation,
                     color: "text-primary"
                   },
                   { 
                     step: "02", 
                     title: "Get Ride Info", 
                     desc: "3 hours before start, we share boarding details and your pakka Ride Code (OTP).",
                     icon: Clock,
                     color: "text-blue-400"
                   },
                   { 
                     step: "03", 
                     title: "Travel Safe", 
                     desc: "Share your code with the driver. Enjoy your travel in a clean, verified 7-seater van.",
                     icon: CheckCircle2,
                     color: "text-green-400"
                   }
                 ].map((item, i) => (
                   <div key={i} className="group space-y-10 animate-in slide-in-from-bottom-12 duration-700" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className="relative aspect-square rounded-[3.5rem] overflow-hidden border border-white/5 shadow-2xl bg-white/5 flex items-center justify-center">
                         <div className={`absolute inset-0 opacity-5 bg-gradient-to-br from-primary to-transparent`}></div>
                         <item.icon className={`h-40 w-40 ${item.color} opacity-20 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700`} />
                         <div className="absolute top-12 left-12">
                            <span className="text-7xl font-black italic text-primary/10 group-hover:text-primary/30 transition-colors duration-500">{item.step}</span>
                         </div>
                      </div>
                      <div className="px-6 space-y-6 text-center lg:text-left">
                         <h3 className="text-3xl font-black italic uppercase text-foreground">{item.title}</h3>
                         <p className="text-muted-foreground italic text-lg leading-relaxed opacity-70">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-40 bg-background relative overflow-hidden">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-32 items-center">
               <div className="relative order-2 lg:order-1">
                  <div className="grid grid-cols-2 gap-8">
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500 animate-slow-float">
                       <IndianRupee className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary leading-none">Fixed Fares</h4>
                       <p className="text-[11px] font-bold text-muted-foreground italic uppercase tracking-widest mt-4">Zero Bargaining</p>
                    </Card>
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500 mt-16">
                       <RouteIcon className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary leading-none">Timed Routes</h4>
                       <p className="text-[11px] font-bold text-muted-foreground italic uppercase tracking-widest mt-4">Always On Time</p>
                    </Card>
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500 -mt-16 animate-slow-float" style={{ animationDelay: '1s' }}>
                       <ShieldCheck className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary leading-none">Verified</h4>
                       <p className="text-[11px] font-bold text-muted-foreground italic uppercase tracking-widest mt-4">Pakka Safe</p>
                    </Card>
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500">
                       <Users className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary leading-none">Community</h4>
                       <p className="text-[11px] font-bold text-muted-foreground italic uppercase tracking-widest mt-4">Safe Bubble</p>
                    </Card>
                  </div>
               </div>

               <div className="space-y-12 order-1 lg:order-2 animate-in fade-in slide-in-from-right-12 duration-1000">
                  <h2 className="text-5xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
                    Smart Hub. <br /> <span className="text-primary">Safe Travel.</span>
                  </h2>
                  <p className="text-2xl text-muted-foreground leading-relaxed italic opacity-80">
                    AAGO Hub is designed for families and office-goers. We pick standard routes, assign verified drivers, and keep the price fixed. Simple.
                  </p>
                  <div className="space-y-8 pt-8">
                    {[
                      "Standard 7-seater vehicles only",
                      "Ride Code (OTP) for safe boarding",
                      "Full ticket refund if we are late",
                      "Direct Boarding to Dropping transit"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-6 group">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                          <CheckCircle2 className="h-5 w-5 text-primary group-hover:text-black" />
                        </div>
                        <span className="font-black italic uppercase text-xs tracking-[0.2em] text-foreground opacity-70 group-hover:opacity-100 transition-opacity">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/auth/signup" className="inline-block pt-12">
                    <Button className="h-20 px-16 bg-primary text-black rounded-[2rem] font-black uppercase italic text-xl shadow-3xl shadow-primary/20 active:scale-95 transition-all">
                      Join Our Hub <ArrowRight className="ml-4 h-6 w-6" />
                    </Button>
                  </Link>
               </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-48 bg-primary relative overflow-hidden">
          <div className="container mx-auto px-6 lg:px-24 text-center space-y-16 relative z-10">
            <h2 className="text-7xl lg:text-11xl font-black italic uppercase text-black tracking-tighter leading-none animate-pulse-slow">
              Ready to <br /> AAGO?
            </h2>
            <p className="text-3xl text-black font-black italic uppercase opacity-60 tracking-widest">Join the smart mobility hub today.</p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center pt-12">
              <Link href="/auth/signup" className="group">
                <Button size="lg" className="h-24 px-20 bg-black text-white rounded-[3rem] font-black uppercase italic text-3xl shadow-3xl hover:scale-105 transition-all active:scale-95">Join as Member</Button>
              </Link>
              <Link href="/driver/signup" className="group">
                <Button variant="outline" size="lg" className="h-24 px-20 bg-transparent border-4 border-black text-black rounded-[3rem] font-black uppercase italic text-3xl hover:bg-black/10 transition-all active:scale-95">Apply for Duty</Button>
              </Link>
            </div>
          </div>
          {/* Decorative SVG Shapes */}
          <div className="absolute top-0 right-0 opacity-10 rotate-45 translate-x-1/2 -translate-y-1/2">
            <CircleDot className="h-[600px] w-[600px]" />
          </div>
          <div className="absolute bottom-0 left-0 opacity-10 -rotate-12 -translate-x-1/4 translate-y-1/4">
            <RouteIcon className="h-[800px] w-[800px]" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t-2 border-white/5 py-32">
        <div className="container mx-auto px-6 lg:px-24 flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="flex items-center gap-4">
              <Logo className="h-10 w-10 text-primary" />
              <span className="text-3xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">© 2024 AAGO Hub. Pakka Travel.</p>
          </div>
          <div className="flex gap-12">
             <Link href="/admin/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Admin Hub</Link>
             <Link href="/driver/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Driver Duty</Link>
             <Link href="/auth/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Member Terminal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
