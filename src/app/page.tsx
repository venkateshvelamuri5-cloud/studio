"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Clock,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Globe,
  ChevronRight
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function GlobalLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroImage = PlaceHolderImages.find(img => img.id === 'modern-transit');
  const commuteImage = PlaceHolderImages.find(img => img.id === 'office-commute');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body overflow-x-hidden">
      {/* Navigation */}
      <header className={`fixed top-0 left-0 right-0 h-16 z-50 px-6 lg:px-20 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-white/90 border-b border-black/5 backdrop-blur-md' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-2">
          <ConnectingDotsLogo className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">AAGO</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-8">
          <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Login</Link>
          <Link href="/auth/signup">
            <Button size="sm" className="bg-primary text-white rounded-lg font-bold px-6">Join the Grid</Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden p-0" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-10 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4">
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold text-foreground">Login</Link>
          <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold text-primary">Join Grid</Link>
          <Link href="/driver/signup" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold text-muted-foreground">Join Fleet</Link>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <Badge variant="outline" className="px-4 py-1 text-primary border-primary/20 bg-primary/5">AAGO City Transit v2.0</Badge>
                <h1 className="text-5xl lg:text-7xl font-bold text-foreground tracking-tight">
                  The Smarter Way <br /> to Move.
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  AAGO brings professional-grade city transit to your daily routine. Reserved seats, real-time tracking, and fixed pricing for everyone.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/auth/signup">
                    <Button size="lg" className="w-full sm:w-auto h-14 px-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg">Start Riding</Button>
                  </Link>
                  <Link href="/driver/signup">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 rounded-xl font-bold text-lg border-black/5 hover:bg-black/5">Join Fleet</Button>
                  </Link>
                </div>
              </div>

              <div className="relative aspect-video lg:aspect-square rounded-3xl overflow-hidden shadow-xl border border-black/5">
                <Image 
                  src={heroImage?.imageUrl || "https://picsum.photos/seed/aago-hero/1200/800"} 
                  alt="Modern Transit" 
                  fill 
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground">The Grid Difference.</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Simple, predictable, and secure mobility for the modern city.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  title: "Fixed Pricing", 
                  desc: "No surges. No bargaining. Transparent fares for your daily commute.", 
                  icon: IndianRupee 
                },
                { 
                  title: "Live Radar", 
                  desc: "See your shuttle's live position and know exactly when to step out.", 
                  icon: Radar 
                },
                { 
                  title: "Safety First", 
                  desc: "Tracked journeys and verified operators for your peace of mind.", 
                  icon: ShieldCheck 
                }
              ].map((item, i) => (
                <Card key={i} className="p-8 border-none shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Professional Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative rounded-3xl overflow-hidden shadow-lg aspect-square lg:aspect-[4/3]">
                <Image 
                  src={commuteImage?.imageUrl || "https://picsum.photos/seed/aago-professional/800/600"} 
                  alt="Professional Commute" 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="space-y-8">
                <h2 className="text-3xl lg:text-5xl font-bold leading-tight">Built for Professionals <br/> & Scholars.</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Whether heading to a morning meeting or a late lecture, AAGO ensures your focus stays on your goals, not your travel.
                </p>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-primary"><Briefcase className="h-5 w-5" /></div>
                    <div>
                      <h4 className="font-bold text-lg">Professionals</h4>
                      <p className="text-muted-foreground text-sm">Arrive refreshed without parking or traffic stress.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-primary"><GraduationCap className="h-5 w-5" /></div>
                    <div>
                      <h4 className="font-bold text-lg">Students</h4>
                      <p className="text-muted-foreground text-sm">Safe, affordable routes designed for campus life.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-6 lg:px-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-center mb-16">Simple to Use.</h2>
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { title: "Pick Route", desc: "Select your corridor and reserve your seat.", icon: MapPin },
                { title: "Pay Securely", desc: "Transparent, fixed fares via the grid app.", icon: Lock },
                { title: "Ride", desc: "Board with your code and track your progress.", icon: CheckCircle2 }
              ].map((item, i) => (
                <div key={i} className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary text-2xl font-bold">
                    {i + 1}
                  </div>
                  <h4 className="text-xl font-bold">{item.title}</h4>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-white">
          <div className="container mx-auto px-6 lg:px-20 text-center space-y-8">
            <h2 className="text-4xl lg:text-6xl font-bold">Ready to Move?</h2>
            <p className="text-lg opacity-90 max-w-xl mx-auto">Join the mobility grid and experience stress-free transit today.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto h-16 px-12 bg-white text-primary hover:bg-slate-50 rounded-xl font-bold text-xl">Join as Rider</Button>
              </Link>
              <Link href="/driver/signup">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-12 border-white text-white hover:bg-white/10 rounded-xl font-bold text-xl">Join Fleet</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-black/5 py-12">
        <div className="container mx-auto px-6 lg:px-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <ConnectingDotsLogo className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold tracking-tight text-primary">AAGO</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 AAGO GRID. Universal Mobility Protocol.</p>
            <div className="flex gap-6">
               <Globe className="h-5 w-5 text-muted-foreground" />
               <Activity className="h-5 w-5 text-muted-foreground" />
               <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}