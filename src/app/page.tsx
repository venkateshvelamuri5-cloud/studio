
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
  Radar,
  IndianRupee,
  MapPin,
  Activity,
  Zap,
  Menu,
  X,
  Lock,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Globe,
  ChevronRight,
  Navigation,
  Target,
  Loader2
} from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const GridConnectivityAnimation = () => (
  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden rounded-[3rem]">
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #EAB308 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
    </div>
    <svg viewBox="0 0 400 400" className="w-4/5 h-4/5 relative z-10 text-primary">
      <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="1" fill="none" className="opacity-10" />
      <circle cx="200" cy="200" r="100" stroke="currentColor" strokeWidth="1" fill="none" className="opacity-20" />
      <circle cx="200" cy="200" r="4" fill="currentColor" className="animate-pulse" />
      <g className="animate-slow-float">
        <circle cx="100" cy="100" r="6" fill="currentColor" />
        <circle cx="300" cy="100" r="6" fill="currentColor" />
        <circle cx="200" cy="350" r="6" fill="currentColor" />
      </g>
      <path d="M100 100 L200 200 M300 100 L200 200 M200 350 L200 200" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="animate-[dash_10s_linear_infinite]" />
      <style jsx>{`
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
      `}</style>
    </svg>
    <div className="absolute bottom-8 left-8 right-8 flex justify-between">
      <Badge variant="outline" className="bg-black/40 border-primary/20 text-primary text-[10px] font-black italic">GRID_SYNC: ACTIVE</Badge>
      <Badge variant="outline" className="bg-black/40 border-primary/20 text-primary text-[10px] font-black italic">PULSE: 100%</Badge>
    </div>
  </div>
);

const TransitFlowAnimation = () => (
  <div className="relative w-full h-full bg-black/20 flex items-center justify-center overflow-hidden rounded-[3rem] border border-white/10">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
    <div className="relative z-10 space-y-8 w-full max-w-md p-10">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-6 p-6 bg-card rounded-3xl shadow-xl border border-white/5 animate-in slide-in-from-left duration-700" style={{ animationDelay: `${i * 200}ms` }}>
          <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <Navigation className="h-7 w-7" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" style={{ animationDelay: `${i * 300}ms` }}></div>
            </div>
            <div className="h-2 w-20 bg-white/5 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
    <style jsx>{`
      @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

export default function GlobalLandingPage() {
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
      else if (profile.role === 'rider') router.push('/student');
    }
  }, [user, profile, authLoading, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body overflow-x-hidden">
      <header className={`fixed top-0 left-0 right-0 h-24 z-50 px-6 lg:px-24 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-background/95 border-b border-white/5 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-4">
          <div className="bg-primary p-2.5 rounded-xl text-black shadow-xl shadow-primary/20">
            <ConnectingDotsLogo className="h-7 w-7" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-12">
          {authLoading ? (
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          ) : user ? (
            <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
              <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Return to Grid</Button>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors">Login Hub</Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Travel Now</Button>
              </Link>
            </>
          )}
        </nav>
        <Button variant="ghost" className="lg:hidden p-0 text-primary" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </Button>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-36 px-12 flex flex-col gap-10 animate-in fade-in slide-in-from-top-6 duration-500 backdrop-blur-3xl">
          {user ? (
             <Link href={profile?.role === 'driver' ? '/driver' : '/student'} onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">Return to Hub</Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-foreground tracking-tighter">Login</Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">Start Journey</Link>
              <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-muted-foreground tracking-tighter">Join Fleet</Link>
            </>
          )}
        </div>
      )}

      <main>
        <section className="relative pt-48 pb-24 lg:pt-64 lg:pb-48 bg-background">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12">
                <Badge className="px-6 py-2.5 text-primary border-primary/30 bg-primary/5 font-black uppercase tracking-[0.4em] text-[10px] italic rounded-full shadow-lg">India's Smart Mobility Grid</Badge>
                <h1 className="text-6xl lg:text-8xl font-black text-foreground italic uppercase tracking-tighter leading-none">
                  Easy City <br /> Travel.
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl italic font-medium opacity-80">
                  Reliable rides for professionals and students. No bargains, fixed pricing, and live tracking for the modern commuter.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-6">
                  {user ? (
                    <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
                      <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Return Hub</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/auth/signup">
                        <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Join Grid</Button>
                      </Link>
                      <Link href="/driver/signup">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto h-20 px-16 rounded-[2rem] font-black uppercase italic text-2xl border-2 border-primary text-primary hover:bg-primary/5 transition-all">Join Fleet</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="relative aspect-square rounded-[4rem] overflow-hidden shadow-3xl shadow-primary/5 animate-slow-float p-2 border border-white/5">
                <GridConnectivityAnimation />
              </div>
            </div>
          </div>
        </section>

        <section className="py-40 bg-black/20">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="text-center mb-32 space-y-8">
              <h2 className="text-5xl lg:text-7xl font-black italic uppercase text-foreground tracking-tighter leading-none">The Smart Grid.</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic font-medium opacity-70">
                Simple, reliable, and high-fidelity city transit for everyone.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                { title: "Fixed Prices", desc: "No bargaining. Transparent, fixed pricing for every segment you travel.", icon: IndianRupee },
                { title: "Grid Sync", desc: "Live radar tracking. Board safely with a simple, secure verification code.", icon: Radar },
                { title: "Fleet Safety", desc: "Verified operators and real-time mission telemetry for peace of mind.", icon: ShieldCheck }
              ].map((item, i) => (
                <Card key={i} className="p-12 border-none shadow-2xl hover:translate-y-[-12px] transition-all duration-700 rounded-[3.5rem] bg-card/60 backdrop-blur-xl border border-white/5">
                  <div className="h-20 w-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary mb-10 shadow-lg shadow-primary/5">
                    <item.icon className="h-10 w-10" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase mb-6 leading-none tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground text-base leading-relaxed italic font-medium opacity-80">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-40 bg-primary text-black relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <ConnectingDotsLogo className="h-full w-full" />
          </div>
          <div className="container mx-auto px-6 lg:px-24 text-center space-y-12 relative z-10">
            <h2 className="text-6xl lg:text-9xl font-black italic uppercase tracking-tighter leading-none">Join The Grid.</h2>
            <p className="text-2xl font-black italic uppercase tracking-[0.3em] opacity-80 max-w-2xl mx-auto">India's Professional Mobility Grid</p>
            <div className="flex flex-col sm:flex-row justify-center gap-8 pt-10">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto h-24 px-20 bg-background text-primary hover:bg-background/90 rounded-[2.5rem] font-black uppercase italic text-3xl shadow-3xl active:scale-95 transition-all">Join Grid</Button>
              </Link>
              <Link href="/driver/signup">
                <Button size="lg" className="w-full sm:w-auto h-24 px-20 bg-white text-background hover:bg-white/90 rounded-[2.5rem] font-black uppercase italic text-3xl shadow-3xl active:scale-95 transition-all">
                  Join Fleet
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t-2 border-white/5 py-24">
        <div className="container mx-auto px-6 lg:px-24">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl text-primary shadow-lg shadow-primary/5">
                <ConnectingDotsLogo className="h-8 w-8" />
              </div>
              <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">© 2024 AAGO GRID. Professional Mobility Grid.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
