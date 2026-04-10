
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
  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden rounded-3xl">
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #00FFFF 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
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
  <div className="relative w-full h-full bg-slate-50 flex items-center justify-center overflow-hidden rounded-3xl border border-black/5">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
    <div className="relative z-10 space-y-8 w-full max-w-md p-10">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-6 p-4 bg-white rounded-2xl shadow-sm border border-black/5 animate-in slide-in-from-left duration-700" style={{ animationDelay: `${i * 200}ms` }}>
          <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Navigation className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" style={{ animationDelay: `${i * 300}ms` }}></div>
            </div>
            <div className="h-2 w-16 bg-slate-50 rounded-full"></div>
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
      <header className={`fixed top-0 left-0 right-0 h-20 z-50 px-6 lg:px-20 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-white/90 border-b border-black/5 backdrop-blur-md' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-white shadow-lg shadow-primary/20">
            <ConnectingDotsLogo className="h-6 w-6" />
          </div>
          <span className="text-xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-10">
          {authLoading ? (
            <Loader2 className="animate-spin h-5 w-5 text-primary" />
          ) : user ? (
            <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase italic px-8 h-12 shadow-xl shadow-primary/10">Return to Grid</Button>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Login</Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase italic px-8 h-12 shadow-xl shadow-primary/10">Start Traveling</Button>
              </Link>
            </>
          )}
        </nav>
        <Button variant="ghost" className="lg:hidden p-0" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-32 px-10 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4">
          {user ? (
             <Link href={profile?.role === 'driver' ? '/driver' : '/student'} onClick={() => setIsMenuOpen(false)} className="text-3xl font-black italic uppercase text-primary">Return to Grid</Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black italic uppercase text-foreground">Login</Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black italic uppercase text-primary">Start Traveling</Link>
              <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black italic uppercase text-muted-foreground">Join Fleet</Link>
            </>
          )}
        </div>
      )}

      <main>
        <section className="relative pt-40 pb-20 lg:pt-56 lg:pb-40 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-10">
                <Badge variant="outline" className="px-5 py-2 text-primary border-primary/20 bg-primary/5 font-black uppercase tracking-widest text-[10px] italic">India's Smart Way To Travel</Badge>
                <h1 className="text-5xl lg:text-7xl font-black text-foreground italic uppercase tracking-tighter leading-none">
                  The Easiest Way <br /> To Travel.
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl italic font-medium">
                  Travel easily to office, college, or around the city. Reliable rides, live tracking, and safe travel for everyone.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 pt-4">
                  {user ? (
                    <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
                      <Button size="lg" className="w-full sm:w-auto h-16 px-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-primary/20 transition-all active:scale-95">Go to Dashboard</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/auth/signup">
                        <Button size="lg" className="w-full sm:w-auto h-16 px-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-primary/20 transition-all active:scale-95">Start Riding</Button>
                      </Link>
                      <Link href="/driver/signup">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-12 rounded-2xl font-black uppercase italic text-lg border-primary text-primary hover:bg-primary/5 transition-all">Join Fleet</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/5 animate-slow-float">
                <GridConnectivityAnimation />
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 bg-slate-50">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="text-center mb-24 space-y-6">
              <h2 className="text-4xl lg:text-6xl font-black italic uppercase text-foreground tracking-tighter">The Smart Grid.</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto italic font-medium">
                Simple, reliable, and safe travel for modern commuters.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                { title: "Fixed Prices", desc: "No surges. No bargaining. Clear, fixed prices for every trip you take.", icon: IndianRupee },
                { title: "Live Tracking", desc: "Track your ride live on the map. Board easily with a simple code.", icon: Radar },
                { title: "High Safety", desc: "Verified drivers and live journey tracking for complete peace of mind.", icon: ShieldCheck }
              ].map((item, i) => (
                <Card key={i} className="p-10 border-none shadow-sm hover:shadow-xl hover:translate-y-[-8px] transition-all duration-500 rounded-[2.5rem] bg-white">
                  <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8">
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase mb-4">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed italic font-medium">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl aspect-square bg-slate-50">
                <TransitFlowAnimation />
              </div>
              <div className="space-y-10">
                <h2 className="text-4xl lg:text-6xl font-black italic uppercase leading-none tracking-tighter">Stay <br/> Connected.</h2>
                <p className="text-lg text-muted-foreground leading-relaxed italic font-medium">
                  Focus on your work or studies while we handle the traffic. AAGO gets you there on time, every time.
                </p>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="shrink-0 h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-primary"><Briefcase className="h-7 w-7" /></div>
                    <div>
                      <h4 className="font-black italic uppercase text-xl">For Professionals</h4>
                      <p className="text-muted-foreground text-sm italic font-medium">Reach office fresh without parking or traffic stress.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="shrink-0 h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-primary"><GraduationCap className="h-7 w-7" /></div>
                    <div>
                      <h4 className="font-black italic uppercase text-xl">For Scholars</h4>
                      <p className="text-muted-foreground text-sm italic font-medium">Safe and low-cost travel designed for students.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 bg-primary text-white">
          <div className="container mx-auto px-6 lg:px-20 text-center space-y-10">
            <h2 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter">Join The Grid.</h2>
            <p className="text-xl opacity-90 max-w-xl mx-auto italic font-medium uppercase tracking-widest">Smart mobility for everyone in India.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-white text-primary hover:bg-slate-50 rounded-[2rem] font-black uppercase italic text-2xl shadow-2xl active:scale-95 transition-all">Join Grid</Button>
              </Link>
              <Link href="/driver/signup">
                <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-white text-primary hover:bg-slate-50 rounded-[2rem] font-black uppercase italic text-2xl shadow-2xl active:scale-95 transition-all">
                  <span className="text-primary">Join Fleet</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-black/5 py-16">
        <div className="container mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <ConnectingDotsLogo className="h-6 w-6" />
              </div>
              <span className="text-xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2024 AAGO GRID. Smart Mobility For India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
