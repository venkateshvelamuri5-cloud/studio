
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Shield, 
  Users, 
  Smartphone, 
  ArrowRight, 
  Zap, 
  Star, 
  Download, 
  IndianRupee, 
  GraduationCap,
  Instagram,
  Twitter,
  Facebook,
  Mail,
  Phone,
  Truck,
  CheckCircle2,
  Ticket,
  Navigation,
  QrCode,
  Search,
  Loader2
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

function MobileBookingSimulator() {
  const [step, setStep] = useState(0);
  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-4 ring-white/10 animate-in fade-in zoom-in duration-1000">
      {/* Mobile Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
      
      {/* App Screen Content */}
      <div className="h-full w-full bg-[#F8F9FC] relative flex flex-col pt-8">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded-lg">
              <Bus className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] font-black font-headline italic text-primary">AAGO</span>
          </div>
          <div className="h-6 w-6 rounded-full bg-slate-100 overflow-hidden" />
        </div>

        {/* Step 0: Searching */}
        {step === 0 && (
          <div className="p-4 flex-1 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="space-y-1">
               <h4 className="text-sm font-black italic">Hi, Scholar!</h4>
               <p className="text-[8px] font-bold text-slate-400 uppercase">Finding your commute...</p>
             </div>
             <div className="h-32 rounded-2xl bg-slate-100 relative overflow-hidden">
                <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-50" alt="Map" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
             </div>
             <div className="space-y-2">
                <div className="h-10 w-full bg-slate-50 rounded-xl border border-dashed flex items-center justify-center">
                   <Search className="h-4 w-4 text-slate-300 mr-2" />
                   <div className="h-2 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-10 w-full bg-slate-50 rounded-xl border border-dashed" />
             </div>
          </div>
        )}

        {/* Step 1: Selecting */}
        {step === 1 && (
          <div className="p-4 flex-1 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
             <h4 className="text-xs font-black uppercase italic text-primary">Available Shuttles</h4>
             <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className={`p-3 rounded-xl border ${i === 1 ? 'border-primary bg-primary/5' : 'bg-white'} flex items-center justify-between`}>
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-slate-400 rounded" />
                      <div className="h-1 w-10 bg-slate-200 rounded" />
                    </div>
                    {i === 1 && <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center"><CheckCircle2 className="h-2 w-2 text-white" /></div>}
                  </div>
                ))}
             </div>
             <Button className="w-full bg-primary h-10 rounded-xl font-black italic uppercase text-[10px] mt-4">Book Express #4</Button>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <div className="p-4 flex-1 flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-500">
             <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
             </div>
             <div className="text-center space-y-1">
                <h4 className="text-sm font-black uppercase italic">Seat Reserved!</h4>
                <p className="text-[8px] font-bold text-slate-400">Boarding Pass #24B Generated</p>
             </div>
             <div className="bg-white p-3 rounded-2xl shadow-xl border-2 border-primary mt-4">
                <QrCode className="h-24 w-24 text-primary" />
             </div>
          </div>
        )}

        {/* Step 3: Tracking */}
        {step === 3 && (
          <div className="p-0 flex-1 relative animate-in fade-in duration-700">
             <Image src={mapImage?.imageUrl || ""} fill className="object-cover" alt="Tracking" />
             <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-primary/20">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center text-white animate-bounce">
                      <Bus className="h-4 w-4" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black uppercase opacity-60">SHUTTLE ARRIVING</p>
                      <p className="text-[10px] font-black italic">120m &bull; Main Gate Stop</p>
                   </div>
                </div>
             </div>
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-2/3">
                <Button className="w-full bg-accent h-10 rounded-xl font-black italic uppercase text-[10px] shadow-xl">Contact Driver</Button>
             </div>
          </div>
        )}

        {/* Bottom Nav Mockup */}
        <div className="h-16 bg-white border-t border-slate-100 flex justify-around items-center px-4">
           {[Smartphone, Search, QrCode, MapPin, Bell].map((Icon, i) => (
             <Icon key={i} className={`h-4 w-4 ${i === 0 && step < 3 ? 'text-primary' : i === 3 && step === 3 ? 'text-primary' : 'text-slate-300'}`} />
           ))}
        </div>
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
    </div>
  );
}

const Bell = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen selection:bg-accent selection:text-white font-body overflow-x-hidden">
      {/* Navigation */}
      <header className="px-6 lg:px-12 h-20 flex items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-secondary animate-in fade-in slide-in-from-top-4 duration-700">
        <Link className="flex items-center justify-center gap-2 group" href="/">
          <div className="bg-primary p-2 rounded-2xl group-hover:rotate-12 transition-transform duration-300">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-primary font-headline italic">AAGO</span>
        </Link>
        <nav className="ml-auto flex gap-8 items-center">
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#how-it-works">How it works</Link>
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#pricing">Pricing</Link>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold text-primary">Student Login</Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full font-bold shadow-lg shadow-primary/20">
              Register
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-white relative overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-black text-accent border border-accent/20">
                    <Zap className="h-4 w-4 animate-pulse" />
                    INSTANT CAMPUS COMMUTING
                  </div>
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-8xl/tight text-primary font-headline">
                    Your Ride. <br />Your Seat. <br /><span className="text-accent italic">Guaranteed.</span>
                  </h1>
                  <p className="max-w-[540px] text-muted-foreground md:text-xl/relaxed font-medium leading-relaxed">
                    Vizag's premium AC shuttle network for students. Book in seconds, track in real-time, and arrive in comfort.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/30 group">
                      Get Your Pass <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="h-16 px-10 text-xl border-2 rounded-2xl hover:bg-secondary">
                    <Download className="mr-2 h-6 w-6" /> Get the App
                  </Button>
                </div>
                <div className="flex items-center gap-6 pt-4 border-t border-secondary">
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-primary font-headline italic">10K+</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Scholars</p>
                  </div>
                  <div className="h-12 w-px bg-secondary" />
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-accent font-headline italic">₹799</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unlimited Monthly Pass</p>
                  </div>
                </div>
              </div>

              {/* Animated Mobile Mockup Integration */}
              <div className="relative group lg:ml-auto">
                <div className="absolute -inset-24 bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent rounded-full blur-[100px] opacity-40 animate-pulse" />
                <MobileBookingSimulator />
                
                {/* Floating Indicators */}
                <div className="absolute top-20 -left-16 bg-white p-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-left-12 duration-1000 delay-500 hidden xl:flex">
                  <div className="bg-green-100 p-2 rounded-full animate-pulse">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">GITAM SHUTTLE</p>
                    <p className="text-sm font-black italic">Arriving in 2m</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intuitive "How It Works" Section */}
        <section id="how-it-works" className="w-full py-24 bg-secondary/30 relative">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-20">
              <Badge variant="outline" className="border-primary text-primary font-black uppercase italic tracking-widest px-4 py-1.5 rounded-full mb-4">THE AAGO FLOW</Badge>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-primary font-headline italic uppercase">How it works</h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed font-medium">
                Three simple steps to a better academic life.
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-3 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/10 -translate-y-1/2 hidden lg:block" />

              {[
                { 
                  step: "01", 
                  title: "Register", 
                  desc: "Sign up with your student phone number and verify your institution ID.", 
                  icon: Smartphone,
                  color: "bg-blue-500"
                },
                { 
                  step: "02", 
                  title: "Book a Seat", 
                  desc: "Select your route and reserve a guaranteed AC seat in one tap.", 
                  icon: Ticket,
                  color: "bg-accent"
                },
                { 
                  step: "03", 
                  title: "Track & Ride", 
                  desc: "Watch your shuttle live and board with your digital scholar QR code.", 
                  icon: Navigation,
                  color: "bg-primary"
                }
              ].map((item, idx) => (
                <div key={idx} className="relative group flex flex-col items-center text-center space-y-6">
                  <div className={`w-20 h-20 ${item.color} rounded-[2rem] flex items-center justify-center text-white shadow-2xl relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                    <item.icon className="h-10 w-10" />
                    <div className="absolute -top-4 -right-4 bg-white text-primary w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shadow-xl border-4 border-secondary">
                      {item.step}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-headline uppercase italic text-primary">{item.title}</h3>
                    <p className="text-muted-foreground font-medium leading-relaxed max-w-xs mx-auto">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="w-full py-24 bg-primary overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          
          <div className="container px-4 md:px-6 mx-auto relative z-10">
             <div className="max-w-4xl mx-auto rounded-[3rem] p-8 md:p-16 text-white text-center space-y-12">
                <div className="space-y-4">
                  <h2 className="text-5xl font-black font-headline italic uppercase tracking-tighter">Scholars Pass</h2>
                  <p className="text-xl text-primary-foreground/80 font-medium max-w-xl mx-auto">
                    Unlimited travel between home and campus. One pass, infinite convenience.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 items-center bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-white/10">
                   <div className="text-left space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="text-7xl font-black italic text-accent">
                          <IndianRupee className="inline h-12 w-12 -mr-2" /> 799
                        </div>
                        <div className="text-xs font-black uppercase opacity-60 tracking-[0.2em]">Monthly <br /> Subscription</div>
                      </div>
                      <p className="text-sm font-bold opacity-80 leading-relaxed">
                        Join 5,000+ students on the Vizag-VZM loop with the region's most popular student travel pass.
                      </p>
                   </div>
                   <div className="space-y-4">
                      {[
                        "Guaranteed AC Seat",
                        "High-speed Wi-Fi Onboard",
                        "Live Tracking & Notifications",
                        "Female-Priority Seating"
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm font-bold">
                          <Zap className="h-4 w-4 text-accent fill-accent" /> {feature}
                        </div>
                      ))}
                      <Link href="/auth/signup" className="block w-full pt-4">
                        <Button className="w-full bg-accent hover:bg-accent/90 text-white font-black h-16 rounded-2xl uppercase italic tracking-tighter text-xl shadow-2xl shadow-accent/20">
                          Get My Pass
                        </Button>
                      </Link>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-secondary pt-24 pb-12">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <Link className="flex items-center gap-2" href="/">
                <div className="bg-primary p-2 rounded-xl">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <span className="text-2xl font-black text-primary font-headline italic">AAGO</span>
              </Link>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                Andhra Pradesh's first student-only smart shuttle service. Dedicated to making campus commutes safe, reliable, and comfortable.
              </p>
              <div className="flex gap-4">
                <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                  <Instagram className="h-5 w-5" />
                </Link>
                <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                  <Facebook className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-black text-primary font-headline italic uppercase tracking-widest text-xs mb-6">Regional Hubs</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Visakhapatnam</Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Vizianagaram</Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground opacity-40">Vijayawada (Soon)</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-primary font-headline italic uppercase tracking-widest text-xs mb-6">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link href="/auth/login" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Student Login</Link></li>
                <li><Link href="/auth/signup" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Scholars Pass</Link></li>
                <li><Link href="/driver/login" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Driver Portal
                </Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-primary font-headline italic uppercase tracking-widest text-xs mb-6">Contact Ops</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                  <Mail className="h-4 w-4 text-accent" /> support@aago.in
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                  <Phone className="h-4 w-4 text-accent" /> +91 891 123 4567
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-secondary flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic text-center md:text-left">
              © 2024 AAGO MOBILITY AP PVT LTD. | Vizag & VZM Hub
            </p>
            <Link href="/admin/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
              Regional Administrator Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
