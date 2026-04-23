
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  Sparkles
} from 'lucide-react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

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

  const images = {
    hero: PlaceHolderImages.find(img => img.id === 'animated-shuttle'),
    commute: PlaceHolderImages.find(img => img.id === 'commute-abstract'),
    map: PlaceHolderImages.find(img => img.id === 'city-abstract'),
    safety: PlaceHolderImages.find(img => img.id === 'safety-abstract'),
  };

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
              <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Go to Hub</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-6">
              <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">Login</Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-black rounded-2xl font-black uppercase italic px-10 h-14 shadow-2xl shadow-primary/20 text-lg transition-all active:scale-95">Book Now</Button>
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
             <Link href={profile?.role === 'driver' ? '/driver' : '/student'} onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">My Account</Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-foreground tracking-tighter">Login</Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">Join AAGO</Link>
              <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-muted-foreground tracking-tighter">Apply to Drive</Link>
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
                <h1 className="text-6xl lg:text-9xl font-black text-foreground italic uppercase tracking-tighter leading-[0.85] animate-pulse-slow">
                  Pakka <br /> <span className="text-primary">Travel.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 italic font-medium opacity-80">
                  Fixed fares, no bargaining. Simple, secure, and timed city transit for your community.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-6 justify-center lg:justify-start">
                  {user ? (
                    <Link href={profile?.role === 'driver' ? '/driver' : '/student'}>
                      <Button size="lg" className="w-full sm:w-auto h-20 px-16 bg-primary hover:bg-primary/90 text-black rounded-[2rem] font-black uppercase italic text-2xl shadow-3xl shadow-primary/20 transition-all active:scale-95">Open Hub</Button>
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

              <div className="relative aspect-square animate-in zoom-in duration-1000">
                <div className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[120px] animate-pulse"></div>
                <div className="relative h-full w-full rounded-[4rem] overflow-hidden border-4 border-white/5 shadow-3xl bg-slate-950 flex items-center justify-center animate-slow-float">
                   {images.hero && (
                     <Image 
                       src={images.hero.imageUrl} 
                       alt={images.hero.description}
                       fill
                       className="object-cover opacity-60 scale-105 hover:scale-100 transition-transform duration-1000"
                       data-ai-hint={images.hero.imageHint}
                     />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                   <div className="absolute bottom-12 left-12 right-12">
                      <div className="bg-white/10 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                         <div className="flex items-center gap-4 mb-3">
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase italic text-white tracking-widest">Active Hub</span>
                         </div>
                         <h4 className="text-2xl font-black italic text-white uppercase leading-none">Smart Fleet Online</h4>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-40 bg-black/40 relative">
           <div className="container mx-auto px-6 lg:px-24">
              <div className="text-center space-y-4 mb-24 animate-in fade-in duration-700">
                 <h2 className="text-4xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none">How AAGO Works</h2>
                 <p className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.4em] italic mt-4">Simple 3-Step Process</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-12">
                 {[
                   { 
                     step: "01", 
                     title: "Book Ticket", 
                     desc: "Choose your route and time. Pay the fixed fare online. No more bargaining.",
                     icon: Navigation,
                     img: images.map
                   },
                   { 
                     step: "02", 
                     title: "Get Ride Info", 
                     desc: "3 hours before departure, we share ride details and your pakka Ride Code (OTP).",
                     icon: Clock,
                     img: images.commute
                   },
                   { 
                     step: "03", 
                     title: "Travel Safe", 
                     desc: "Share your code with the driver. Enjoy your ride in a clean community van.",
                     icon: CheckCircle2,
                     img: images.safety
                   }
                 ].map((item, i) => (
                   <div key={i} className="group space-y-10 animate-in slide-in-from-bottom-12 duration-700" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className="relative aspect-[4/3] rounded-[3.5rem] overflow-hidden border border-white/5 shadow-2xl bg-white/5">
                         {item.img && (
                           <Image 
                             src={item.img.imageUrl} 
                             alt={item.img.description} 
                             fill 
                             className="object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700"
                             data-ai-hint={item.img.imageHint}
                           />
                         )}
                         <div className="absolute inset-0 p-12 flex flex-col justify-end">
                            <span className="text-7xl font-black italic text-primary/10 group-hover:text-primary/30 transition-colors duration-500">{item.step}</span>
                         </div>
                      </div>
                      <div className="px-6 space-y-6">
                         <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-[1.5rem] bg-primary text-black flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                               <item.icon className="h-7 w-7" />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase">{item.title}</h3>
                         </div>
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
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary">No Bargaining</h4>
                       <p className="text-sm text-muted-foreground italic leading-relaxed">Always know your price. Fixed fares for every corridor.</p>
                    </Card>
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500 mt-16">
                       <Navigation className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary">Boarding Info</h4>
                       <p className="text-sm text-muted-foreground italic leading-relaxed">Know your boarding point and vehicle details 3 hours early.</p>
                    </Card>
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500 -mt-16 animate-slow-float" style={{ animationDelay: '1s' }}>
                       <ShieldCheck className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary">Verified</h4>
                       <p className="text-sm text-muted-foreground italic leading-relaxed">Every driver is identity-checked and pakka verified by us.</p>
                    </Card>
                    <Card className="p-10 border-none bg-white/5 rounded-[3rem] shadow-2xl hover:-translate-y-4 transition-transform duration-500">
                       <Users className="h-12 w-12 text-primary mb-8" />
                       <h4 className="text-2xl font-black italic uppercase mb-3 text-primary">Community</h4>
                       <p className="text-sm text-muted-foreground italic leading-relaxed">Travel with verified members from your own local hub.</p>
                    </Card>
                  </div>
               </div>

               <div className="space-y-12 order-1 lg:order-2 animate-in fade-in slide-in-from-right-12 duration-1000">
                  <h2 className="text-5xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none">
                    Smart Hub. <br /> <span className="text-primary">Safe Journey.</span>
                  </h2>
                  <p className="text-2xl text-muted-foreground leading-relaxed italic opacity-80">
                    We have stopped the daily struggle of city travel. AAGO hub gives you timed routes, verified drivers, and a simple booking experience.
                  </p>
                  <div className="space-y-8 pt-8">
                    {[
                      "Fixed 7-seater vehicle assigned for you",
                      "Ride Code (OTP) for secure boarding",
                      "Cashless digital payments via phone",
                      "Direct corridor-based travel"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-6 group">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                          <CheckCircle2 className="h-5 w-5 text-primary group-hover:text-black" />
                        </div>
                        <span className="font-black italic uppercase text-xs tracking-[0.2em] text-foreground opacity-80 group-hover:opacity-100 transition-opacity">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/auth/signup" className="inline-block pt-12">
                    <Button className="h-20 px-16 bg-primary text-black rounded-[2rem] font-black uppercase italic text-xl shadow-3xl shadow-primary/20 active:scale-95 transition-all">
                      Start Your Journey <ArrowRight className="ml-4 h-6 w-6" />
                    </Button>
                  </Link>
               </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-48 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
          <div className="container mx-auto px-6 lg:px-24 text-center space-y-16 relative z-10">
            <h2 className="text-7xl lg:text-11xl font-black italic uppercase text-black tracking-tighter leading-none animate-pulse-slow">
              Ready to <br /> AAGO?
            </h2>
            <p className="text-3xl text-black font-black italic uppercase opacity-60 tracking-widest">Join the smart mobility revolution.</p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center pt-12">
              <Link href="/auth/signup" className="group">
                <Button size="lg" className="h-24 px-20 bg-black text-white rounded-[3rem] font-black uppercase italic text-3xl shadow-3xl hover:scale-105 transition-all active:scale-95">Join as Passenger</Button>
              </Link>
              <Link href="/driver/signup" className="group">
                <Button variant="outline" size="lg" className="h-24 px-20 bg-transparent border-4 border-black text-black rounded-[3rem] font-black uppercase italic text-3xl hover:bg-black/5 transition-all active:scale-95">Apply to Drive</Button>
              </Link>
            </div>
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
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">© 2024 AAGO Mobility. Pakka Transit.</p>
          </div>
          <div className="flex gap-12">
             <Link href="/admin/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Admin Portal</Link>
             <Link href="/driver/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Driver Login</Link>
             <Link href="/auth/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Member Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
