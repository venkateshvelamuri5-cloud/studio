
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
  CheckCircle2,
  Navigation,
  Loader2
} from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="2" />
  </svg>
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
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body overflow-x-hidden">
      <header className={`fixed top-0 left-0 right-0 h-24 z-50 px-6 lg:px-24 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-background/95 border-b border-white/5 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-4">
          <div className="bg-primary p-2.5 rounded-xl text-black shadow-xl shadow-primary/20">
            <Logo className="h-7 w-7" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-12">
          {authLoading ? (
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          ) : user ? (
            <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
              <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Go to App</Button>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors">Login</Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Book a Ride</Button>
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
             <Link href={profile?.role === 'driver' ? '/driver' : '/student'} onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">My Account</Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-foreground tracking-tighter">Login</Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">Register</Link>
              <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-muted-foreground tracking-tighter">Drive with Us</Link>
            </>
          )}
        </div>
      )}

      <main>
        <section className="relative pt-48 pb-24 lg:pt-64 lg:pb-48 bg-background">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12 text-center lg:text-left">
                <Badge className="px-6 py-2.5 text-primary border-primary/30 bg-primary/5 font-black uppercase tracking-[0.4em] text-[10px] italic rounded-full shadow-lg">Easy City Travel</Badge>
                <h1 className="text-6xl lg:text-8xl font-black text-foreground italic uppercase tracking-tighter leading-none">
                  Reliable <br /> Travel.
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 italic font-medium opacity-80">
                  Fixed prices, no bargaining. Simple city rides for everyone with live tracking.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-6 justify-center lg:justify-start">
                  {user ? (
                    <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
                      <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Open App</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/auth/signup">
                        <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Register Now</Button>
                      </Link>
                      <Link href="/driver/signup">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto h-20 px-16 rounded-[2rem] font-black uppercase italic text-2xl border-2 border-primary text-primary hover:bg-primary/5 transition-all">Apply to Drive</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex relative aspect-square bg-slate-950 rounded-[4rem] overflow-hidden shadow-3xl border border-white/5 items-center justify-center">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #EAB308 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                </div>
                <Logo className="h-48 w-48 text-primary animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-40 bg-black/20">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { title: "Fixed Price", desc: "No bargaining. Know your fare before you book.", icon: IndianRupee },
                { title: "Live Tracking", desc: "See your ride coming on the map. Stay safe.", icon: Radar },
                { title: "Safety First", desc: "Verified drivers and secure boarding codes for every ride.", icon: ShieldCheck }
              ].map((item, i) => (
                <Card key={i} className="p-12 border-none shadow-2xl rounded-[3.5rem] bg-card/60 backdrop-blur-xl border border-white/5">
                  <div className="h-20 w-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary mb-10">
                    <item.icon className="h-10 w-10" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase mb-6 leading-none tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground text-base leading-relaxed italic font-medium opacity-80">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t-2 border-white/5 py-24">
        <div className="container mx-auto px-6 lg:px-24 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-4">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">© 2024 AAGO. Simple City Travel.</p>
        </div>
      </footer>
    </div>
  );
}
