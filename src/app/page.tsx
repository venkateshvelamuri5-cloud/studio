
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  ShieldCheck,
  Radar,
  IndianRupee,
  MapPin,
  CheckCircle2,
  Menu,
  X,
  Loader2,
  Users,
  Navigation,
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
    hero: PlaceHolderImages.find(img => img.id === 'modern-shuttle'),
    commute: PlaceHolderImages.find(img => img.id === 'happy-commuter'),
    map: PlaceHolderImages.find(img => img.id === 'city-map-light'),
    safety: PlaceHolderImages.find(img => img.id === 'safety-verified'),
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-24 z-50 px-6 lg:px-24 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-background/95 border-b border-white/5 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-4 group">
          <div className="bg-primary p-2.5 rounded-xl text-black shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform">
            <Logo className="h-7 w-7" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="#how-it-works" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">How it works</Link>
          <Link href="#features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic">Features</Link>
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
          <Link href="#features" onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase text-foreground">Features</Link>
          {user ? (
             <Link href={profile?.role === 'driver' ? '/driver' : '/student'} onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">My Account</Link>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-foreground tracking-tighter">Login</Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-primary tracking-tighter">Join Now</Link>
              <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-5xl font-black italic uppercase text-muted-foreground tracking-tighter">Apply to Drive</Link>
            </>
          )}
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative pt-48 pb-24 lg:pt-64 lg:pb-48 overflow-hidden">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10 text-center lg:text-left animate-in fade-in slide-in-from-left-8 duration-700">
                <Badge className="px-6 py-2.5 text-primary border-primary/30 bg-primary/5 font-black uppercase tracking-[0.4em] text-[10px] italic rounded-full shadow-lg">
                  <Sparkles className="h-3 w-3 mr-2 inline" /> Community Mobility Hub
                </Badge>
                <h1 className="text-6xl lg:text-9xl font-black text-foreground italic uppercase tracking-tighter leading-[0.85] text-glow">
                  Reliable <br /> <span className="text-primary">Travel.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 italic font-medium opacity-80">
                  Fixed prices, no bargaining. Simple, secure, and scheduled city transit for everyone.
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
                <div className="absolute inset-0 bg-primary/20 rounded-[4rem] blur-[100px] animate-pulse"></div>
                <div className="relative h-full w-full rounded-[4rem] overflow-hidden border-4 border-white/5 shadow-3xl bg-slate-950">
                   {images.hero && (
                     <Image 
                       src={images.hero.imageUrl} 
                       alt={images.hero.description}
                       fill
                       className="object-cover opacity-60 scale-110 hover:scale-100 transition-transform duration-1000"
                       data-ai-hint={images.hero.imageHint}
                     />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                   <div className="absolute bottom-12 left-12">
                      <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
                         <div className="flex items-center gap-4 mb-3">
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase italic text-white tracking-widest">Live in City</span>
                         </div>
                         <h4 className="text-2xl font-black italic text-white uppercase leading-none">Smart Fleet Active</h4>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-40 bg-black/40">
           <div className="container mx-auto px-6 lg:px-24">
              <div className="text-center space-y-4 mb-24">
                 <h2 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter">How AAGO Works</h2>
                 <p className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.4em] italic">The 3-Step Hub Experience</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-12">
                 {[
                   { 
                     step: "01", 
                     title: "Book Early", 
                     desc: "Select your route and time. Pay fixed fare via phone. No more haggling.",
                     icon: Navigation,
                     img: images.map
                   },
                   { 
                     step: "02", 
                     title: "Get Code", 
                     desc: "3 hours before start, we reveal your ride details and unique check-in code.",
                     icon: Clock,
                     img: images.commute
                   },
                   { 
                     step: "03", 
                     title: "Travel Safe", 
                     desc: "Share your code with the driver. Relax in a 7-seater community vehicle.",
                     icon: CheckCircle2,
                     img: images.safety
                   }
                 ].map((item, i) => (
                   <div key={i} className="group space-y-8 animate-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl bg-white/5">
                         {item.img && (
                           <Image 
                             src={item.img.imageUrl} 
                             alt={item.img.description} 
                             fill 
                             className="object-cover opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                             data-ai-hint={item.img.imageHint}
                           />
                         )}
                         <div className="absolute inset-0 p-10 flex flex-col justify-end">
                            <span className="text-6xl font-black italic text-primary/20 group-hover:text-primary/40 transition-colors">{item.step}</span>
                         </div>
                      </div>
                      <div className="px-6 space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary text-black flex items-center justify-center shadow-xl">
                               <item.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase">{item.title}</h3>
                         </div>
                         <p className="text-muted-foreground italic text-sm leading-relaxed">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-40 bg-background">
          <div className="container mx-auto px-6 lg:px-24">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
               <div className="relative order-2 lg:order-1">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-8 border-none bg-white/5 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-transform">
                       <IndianRupee className="h-10 w-10 text-primary mb-6" />
                       <h4 className="text-xl font-black italic uppercase mb-2">Fixed Fare</h4>
                       <p className="text-xs text-muted-foreground italic">Always know your price. No surprises, no bargaining.</p>
                    </Card>
                    <Card className="p-8 border-none bg-white/5 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-transform mt-12">
                       <Radar className="h-10 w-10 text-primary mb-6" />
                       <h4 className="text-xl font-black italic uppercase mb-2">Live Radar</h4>
                       <p className="text-xs text-muted-foreground italic">Track your ride in real-time. Know exactly when to board.</p>
                    </Card>
                    <Card className="p-8 border-none bg-white/5 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-transform -mt-12">
                       <ShieldCheck className="h-10 w-10 text-primary mb-6" />
                       <h4 className="text-xl font-black italic uppercase mb-2">Verified</h4>
                       <p className="text-xs text-muted-foreground italic">Every driver is identity-checked and verified by AAGO admins.</p>
                    </Card>
                    <Card className="p-8 border-none bg-white/5 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-transform">
                       <Users className="h-10 w-10 text-primary mb-6" />
                       <h4 className="text-xl font-black italic uppercase mb-2">Community</h4>
                       <p className="text-xs text-muted-foreground italic">Travel with verified members of your own community hub.</p>
                    </Card>
                  </div>
               </div>

               <div className="space-y-10 order-1 lg:order-2">
                  <h2 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none">
                    Simple Hub. <br /> <span className="text-primary">Safe Rides.</span>
                  </h2>
                  <p className="text-xl text-muted-foreground leading-relaxed italic opacity-80">
                    We've removed the chaos from city travel. AAGO hubs provide structured routes, professional drivers, and a secure booking process that respects your time.
                  </p>
                  <div className="space-y-6 pt-6">
                    {[
                      "Fixed 7-seater vehicle assignments",
                      "Pre-departure check-in codes (OTP)",
                      "Cashless digital payments",
                      "Dedicated corridor-based routes"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                          <CheckCircle2 className="h-4 w-4 text-primary group-hover:text-black" />
                        </div>
                        <span className="font-black italic uppercase text-[10px] tracking-widest text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/auth/signup" className="inline-block pt-10">
                    <Button className="h-18 px-12 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-primary/20 active:scale-95 transition-all">
                      Start Your Journey <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </Link>
               </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 bg-primary">
          <div className="container mx-auto px-6 lg:px-24 text-center space-y-12">
            <h2 className="text-6xl lg:text-9xl font-black italic uppercase text-black tracking-tighter leading-none">
              Ready to <br /> AAGO?
            </h2>
            <p className="text-2xl text-black font-black italic uppercase opacity-60">Join the smart mobility revolution.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Link href="/auth/signup">
                <Button size="lg" className="h-20 px-16 bg-black text-white rounded-[2rem] font-black uppercase italic text-2xl shadow-2xl hover:scale-105 transition-all">Join as Rider</Button>
              </Link>
              <Link href="/driver/signup">
                <Button variant="outline" size="lg" className="h-20 px-16 bg-transparent border-4 border-black text-black rounded-[2rem] font-black uppercase italic text-2xl hover:bg-black/5 transition-all">Drive with Us</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t-2 border-white/5 py-24">
        <div className="container mx-auto px-6 lg:px-24 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-4">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-2xl font-black italic tracking-tighter text-foreground uppercase">AAGO</span>
          </div>
          <div className="flex gap-10">
             <Link href="/admin/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Admin Portal</Link>
             <Link href="/driver/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Driver Login</Link>
             <Link href="/auth/login" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary italic transition-colors">Rider Login</Link>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">© 2024 AAGO Mobility. Pure Transit.</p>
        </div>
      </footer>
    </div>
  );
}
