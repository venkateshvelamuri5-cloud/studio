
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
  Loader2,
  Airplay,
  ShieldCheck,
  CreditCard,
  Send
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

function ThreeDAppSimulator() {
  const [step, setStep] = useState(0);
  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative perspective-1000 group">
      {/* 3D Floating Elements */}
      <div className="absolute -top-10 -right-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl animate-bounce hidden lg:block z-30">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-full">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-[10px] font-black text-white uppercase italic">Seat Secured</span>
        </div>
      </div>

      <div className="absolute top-1/2 -left-16 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl animate-pulse hidden lg:block z-30">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-full">
            <Navigation className="h-4 w-4 text-white" />
          </div>
          <span className="text-[10px] font-black text-white uppercase italic">Tracking Active</span>
        </div>
      </div>

      {/* Main Mobile Frame with 3D Rotation */}
      <div className="relative mx-auto w-[280px] h-[580px] bg-slate-900 rounded-[3rem] border-[10px] border-slate-800 shadow-[20px_40px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden transform rotate-Y-12 rotate-X-6 hover:rotate-Y-0 hover:rotate-X-0 transition-all duration-700 ease-out">
        {/* Mobile Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-20" />
        
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
            <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden" />
          </div>

          <div className="flex-1 relative overflow-hidden">
            {/* Step 0: Searching */}
            {step === 0 && (
              <div className="p-4 space-y-4 animate-in fade-in zoom-in duration-500">
                <h4 className="text-xs font-black italic text-slate-900">Where to, Scholar?</h4>
                <div className="h-40 rounded-2xl bg-slate-100 relative overflow-hidden group">
                  <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-60" alt="Map" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-primary/30 animate-ping" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-primary animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-12 w-full bg-white rounded-xl border border-slate-100 flex items-center px-4 shadow-sm">
                    <Search className="h-4 w-4 text-slate-300 mr-3" />
                    <span className="text-[10px] font-bold text-slate-400">Search Hubs...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Booking */}
            {step === 1 && (
              <div className="p-4 space-y-4 animate-in slide-in-from-right-8 duration-500">
                <h4 className="text-xs font-black italic text-primary uppercase">Available Missions</h4>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`p-3 rounded-2xl border ${i === 1 ? 'border-primary bg-primary/5 shadow-md scale-105' : 'bg-white border-slate-100 opacity-60'} flex items-center justify-between transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${i === 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Bus className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase">Express #{i+4}</p>
                          <p className="text-[8px] font-bold text-slate-400">ETA: {i*5} mins</p>
                        </div>
                      </div>
                      {i === 1 && <Badge className="bg-primary text-[8px] h-4">SELECT</Badge>}
                    </div>
                  ))}
                </div>
                <Button className="w-full bg-primary h-12 rounded-2xl font-black italic uppercase text-[10px] mt-4 shadow-lg shadow-primary/30">Confirm Seat ₹50</Button>
              </div>
            )}

            {/* Step 2: Confirmation */}
            {step === 2 && (
              <div className="p-6 flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in duration-500 text-center">
                <div className="relative">
                  <div className="h-20 w-20 bg-green-500 rounded-3xl flex items-center justify-center rotate-12 animate-in slide-in-from-bottom-4">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 bg-accent rounded-full flex items-center justify-center text-white border-4 border-white">
                    <Star className="h-4 w-4 fill-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black uppercase italic text-primary">Boarding Ready</h4>
                  <p className="text-[10px] font-bold text-slate-400">ID: AAGO-2024-VZG</p>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-2xl border-2 border-primary group-hover:scale-110 transition-transform">
                  <QrCode className="h-24 w-24 text-primary" />
                </div>
              </div>
            )}

            {/* Step 3: Real-time Tracking */}
            {step === 3 && (
              <div className="p-0 flex-1 relative animate-in fade-in duration-1000 h-full">
                <Image src={mapImage?.imageUrl || ""} fill className="object-cover" alt="Tracking" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                
                <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-xl border-l-4 border-primary flex items-center gap-4">
                   <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary animate-pulse">
                      <Navigation className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">EN ROUTE</p>
                      <p className="text-[10px] font-black italic text-slate-900">Arriving in 120 meters</p>
                   </div>
                </div>

                <div className="absolute bottom-10 left-4 right-4 space-y-3">
                   <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                        <div>
                          <p className="text-[10px] font-black">Ravi Kumar</p>
                          <p className="text-[8px] font-bold text-slate-400">Driver • AP-31-AX</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" className="h-8 w-8 rounded-full bg-primary"><Phone className="h-3 w-3" /></Button>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Nav Mockup */}
          <div className="h-16 bg-white border-t border-slate-100 flex justify-around items-center px-4">
            {[Smartphone, Search, QrCode, MapPin, Users].map((Icon, i) => (
              <div key={i} className={`p-2 rounded-xl ${i === 0 && step < 3 ? 'text-primary bg-primary/5' : i === 3 && step === 3 ? 'text-primary bg-primary/5' : 'text-slate-300'}`}>
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const studentGroupImage = PlaceHolderImages.find(img => img.id === 'student-group');

  return (
    <div className="flex flex-col min-h-screen selection:bg-accent selection:text-white font-body bg-white overflow-x-hidden">
      {/* Navbar - Refined to match image */}
      <header className="px-6 lg:px-24 h-24 flex items-center justify-between sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-50">
        <Link className="flex items-center gap-3 group" href="/">
          <div className="bg-primary p-2.5 rounded-[1.25rem] group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-primary/20">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-slate-900 font-headline italic uppercase">AAGO</span>
        </Link>
        <nav className="hidden lg:flex gap-10 items-center">
          <Link className="text-sm font-black text-slate-500 hover:text-primary transition-colors uppercase tracking-widest" href="/">Home</Link>
          <Link className="text-sm font-black text-slate-500 hover:text-primary transition-colors uppercase tracking-widest" href="#solutions">Solutions</Link>
          <Link className="text-sm font-black text-slate-500 hover:text-primary transition-colors uppercase tracking-widest" href="#resources">Resources</Link>
          <Link className="text-sm font-black text-slate-500 hover:text-primary transition-colors uppercase tracking-widest" href="/auth/login">Log in</Link>
          <Link href="/auth/signup">
            <Button className="bg-accent hover:bg-accent/90 text-white px-10 rounded-full font-black uppercase italic h-12 shadow-xl shadow-accent/20 transition-all hover:scale-105">
              Get Started
            </Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-12 w-12 rounded-2xl bg-slate-50">
          <Airplay className="h-6 w-6 text-primary" />
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section - Matched to Image Layout */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          {/* Hero Background Elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 hidden lg:block" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse" />
          
          <div className="container px-6 lg:px-24 mx-auto relative z-10 py-20">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-12 animate-in fade-in slide-in-from-left-12 duration-1000">
                <div className="space-y-6">
                  <Badge variant="outline" className="border-accent text-accent font-black uppercase italic tracking-[0.3em] px-6 py-2 rounded-full text-xs">
                    Campus Mobility Hub
                  </Badge>
                  <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-slate-900 font-headline leading-[0.95] uppercase italic">
                    Smart Student <br />Commute.
                  </h1>
                  <p className="max-w-xl text-slate-500 text-xl lg:text-2xl font-bold leading-relaxed">
                    Vizag's most trusted shuttle network. Experience seamless travel with guaranteed seating and real-time intelligence.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-20 px-12 text-2xl bg-primary hover:bg-primary/90 rounded-[2rem] font-black uppercase italic shadow-2xl shadow-primary/30 group transition-all hover:scale-105 active:scale-95">
                      Learn more <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Enhanced Animation Simulator */}
              <div className="lg:ml-auto">
                <ThreeDAppSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Replicating the Image Icons Section */}
        <section className="py-32 bg-white relative">
          <div className="container px-6 lg:px-24 mx-auto">
            <div className="text-center space-y-4 mb-24">
              <h2 className="text-4xl lg:text-5xl font-black font-headline uppercase italic text-slate-900 tracking-tighter">How it Works</h2>
              <div className="h-1.5 w-24 bg-accent mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-4 gap-12 text-center">
              {[
                { icon: Smartphone, title: "Register", desc: "Verify your scholar status in seconds." },
                { icon: Search, title: "Search Hub", desc: "Find routes from Vizag to VZM." },
                { icon: Navigation, title: "Track Fleet", desc: "Real-time satellite GPS tracking." },
                { icon: CreditCard, title: "Fast Pay", desc: "One-tap digital wallet checkout." }
              ].map((item, i) => (
                <div key={i} className="space-y-6 group">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black italic uppercase tracking-tight">{item.title}</h3>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Action Cards - Replicating bottom section of image */}
        <section className="py-24 bg-slate-50">
          <div className="container px-6 lg:px-24 mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              {[
                { 
                  title: "Routes", 
                  desc: "The optimized paths to various hubs and campus routes.", 
                  color: "bg-gradient-to-br from-accent to-accent/70",
                  btnText: "View Map"
                },
                { 
                  title: "Learn", 
                  desc: "Join our student network and learn how to travel smarter.", 
                  color: "bg-white border-2 border-slate-100",
                  btnText: "Read More"
                },
                { 
                  title: "Pricing", 
                  desc: "Unlimited monthly scholar passes starting at ₹799.", 
                  color: "bg-slate-900 text-white",
                  btnText: "See Plans"
                }
              ].map((card, i) => (
                <Card key={i} className={`rounded-[2.5rem] border-none shadow-2xl overflow-hidden group hover:-translate-y-4 transition-all duration-500 ${card.color}`}>
                  <CardContent className="p-12 space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-4xl font-black font-headline italic uppercase tracking-tighter">{card.title}</h3>
                      <p className={`text-lg font-bold leading-relaxed ${i === 2 ? 'text-slate-400' : 'text-slate-500 opacity-80'}`}>
                        {card.desc}
                      </p>
                    </div>
                    <Button className={`rounded-2xl h-14 px-8 font-black uppercase italic ${i === 0 ? 'bg-white text-accent' : i === 1 ? 'bg-primary text-white' : 'bg-accent text-white'}`}>
                      {card.btnText}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Refined */}
      <footer className="bg-white py-20 border-t border-slate-100">
        <div className="container px-6 lg:px-24 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-2 rounded-xl">
                <Bus className="h-6 w-6 text-white" />
              </div>
              <span className="text-3xl font-black text-slate-900 font-headline italic uppercase">AAGO</span>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-10">
              <Link href="#" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Safety</Link>
              <Link href="#" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Partners</Link>
              <Link href="/driver/login" className="text-xs font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors">Workforce Terminal</Link>
            </nav>

            <div className="flex gap-6">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <Link key={i} href="#" className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all">
                  <Icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              © 2024 AAGO MOBILITY AP PVT LTD.
            </p>
            <Link href="/admin/login" className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-primary">
              Terminal Alpha-10
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

