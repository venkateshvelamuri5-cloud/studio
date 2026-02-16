
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
  Search, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Navigation,
  QrCode,
  Airplay,
  CreditCard,
  Instagram,
  Twitter,
  Facebook,
  Globe,
  Cpu
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

function TechAppSimulator() {
  const [step, setStep] = useState(0);
  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative perspective-2000 group">
      {/* 3D Mobile Frame - Ultra Clean Tech Style */}
      <div className="relative mx-auto w-[300px] h-[620px] bg-slate-950 rounded-[3.5rem] border-[12px] border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden transform rotate-Y-12 rotate-X-6 hover:rotate-Y-0 hover:rotate-X-0 transition-all duration-1000 ease-in-out">
        {/* Sleek Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-[1.5rem] z-30" />
        
        {/* App Content */}
        <div className="h-full w-full bg-white relative flex flex-col pt-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-primary rounded-lg flex items-center justify-center">
                <Bus className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-extrabold tracking-tight text-slate-900">AAGO</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100" />
          </div>

          <div className="flex-1 relative overflow-hidden">
            {step === 0 && (
              <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h4 className="text-xl font-extrabold text-slate-900 leading-tight">Find your shuttle.</h4>
                <div className="h-44 rounded-[2rem] bg-slate-50 relative overflow-hidden border border-slate-100 shadow-inner">
                  <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-40 grayscale" alt="Map" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 bg-primary/20 rounded-full animate-ping" />
                    <MapPin className="h-6 w-6 text-primary absolute" />
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
                  <Search className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400">Search regional hubs...</span>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="p-6 space-y-6 animate-in slide-in-from-right-12 duration-700">
                <h4 className="text-xl font-extrabold text-slate-900 leading-tight">Select route.</h4>
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className={`p-4 rounded-2xl border ${i === 1 ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 bg-white opacity-50'} flex items-center justify-between`}>
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${i === 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Bus className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Hub {i === 1 ? 'Vizag' : 'VZM'}</p>
                          <p className="text-[10px] font-semibold text-slate-400">ETA: {i * 7}m</p>
                        </div>
                      </div>
                      {i === 1 && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                  ))}
                </div>
                <Button className="w-full bg-primary h-14 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20">Book Seat</Button>
              </div>
            )}

            {step === 2 && (
              <div className="p-8 flex flex-col items-center justify-center h-full space-y-8 animate-in zoom-in duration-700">
                <div className="bg-primary/10 p-6 rounded-[2.5rem] border border-primary/20">
                  <QrCode className="h-32 w-32 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-extrabold text-slate-900">Boarding Pass</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validated for Vizag Hub</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-0 flex-1 relative animate-in fade-in duration-1000 h-full">
                <Image src={mapImage?.imageUrl || ""} fill className="object-cover" alt="Tracking" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
                <div className="absolute top-6 left-6 right-6 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/50">
                  <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Route</p>
                    <p className="text-sm font-bold text-slate-900">Arriving in 150m</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-20 bg-white border-t border-slate-50 flex justify-around items-center px-6">
            {[Smartphone, Search, QrCode, Navigation].map((Icon, i) => (
              <Icon key={i} className={`h-5 w-5 ${i === step ? 'text-primary' : 'text-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen selection:bg-primary selection:text-white font-body bg-white overflow-x-hidden">
      {/* Navigation - Ultra Clean */}
      <header className="px-6 lg:px-24 h-24 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50">
        <Link className="flex items-center gap-3" href="/">
          <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-950 font-headline">AAGO</span>
        </Link>
        <nav className="hidden lg:flex gap-12 items-center">
          <Link className="text-sm font-bold text-slate-500 hover:text-slate-950 transition-colors" href="/">Network</Link>
          <Link className="text-sm font-bold text-slate-500 hover:text-slate-950 transition-colors" href="#solutions">Impact</Link>
          <Link className="text-sm font-bold text-slate-500 hover:text-slate-950 transition-colors" href="/auth/login">Account</Link>
          <Link href="/auth/signup">
            <Button className="bg-slate-950 hover:bg-slate-800 text-white px-8 h-12 rounded-full font-bold shadow-2xl shadow-slate-200 transition-all hover:scale-105">
              Join the Network
            </Button>
          </Link>
        </nav>
        <Button variant="ghost" className="lg:hidden h-12 w-12 rounded-2xl bg-slate-50">
          <Airplay className="h-6 w-6 text-slate-900" />
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section - High Tech Visuals */}
        <section className="relative min-h-[90vh] flex items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.08),transparent_50%)]" />
          
          <div className="container px-6 lg:px-24 mx-auto relative z-10 py-20">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 bg-slate-50 px-5 py-2 rounded-full border border-slate-100">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Next-Gen Regional Transit</span>
                  </div>
                  <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-slate-950 leading-[0.9] font-headline">
                    Commute <br />with Precision.
                  </h1>
                  <p className="max-w-lg text-slate-500 text-xl font-medium leading-relaxed">
                    AI-driven shuttle coordination for the modern scholar. Secure your seat, track your hub, and arrive ahead of time.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link href="/auth/signup">
                    <Button className="h-20 px-10 text-xl bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-bold shadow-2xl shadow-primary/30 group transition-all hover:scale-105">
                      Get Started <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button variant="outline" className="h-20 px-10 text-xl border-slate-200 rounded-[2rem] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Regional Map
                  </Button>
                </div>
              </div>

              <div className="lg:ml-auto">
                <TechAppSimulator />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid - Clean & Minimal */}
        <section className="py-32 bg-slate-50/50">
          <div className="container px-6 lg:px-24 mx-auto">
            <div className="grid md:grid-cols-3 gap-12 lg:gap-20">
              {[
                { 
                  icon: Globe, 
                  title: "Regional Hubs", 
                  desc: "Optimized routes covering Vizag, VZM, and surrounding academic hubs." 
                },
                { 
                  icon: Smartphone, 
                  title: "Digital Wallet", 
                  desc: "One-tap payments and monthly scholar passes for seamless travel." 
                },
                { 
                  icon: CreditCard, 
                  title: "Workforce Terminal", 
                  desc: "Empowering our drivers with real-time demand insights and dispatching." 
                }
              ].map((item, i) => (
                <div key={i} className="space-y-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 border border-slate-100">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-extrabold text-slate-950 tracking-tight">{item.title}</h3>
                    <p className="text-base font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Action Blocks */}
        <section className="py-32 bg-white">
          <div className="container px-6 lg:px-24 mx-auto">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="rounded-[3rem] border-none bg-slate-950 text-white overflow-hidden group shadow-2xl shadow-slate-300">
                <CardContent className="p-16 space-y-10">
                  <div className="space-y-4">
                    <Badge className="bg-primary/20 text-primary border-none font-bold uppercase tracking-widest px-4 py-1">Safety First</Badge>
                    <h3 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter">Secure SOS Protocol.</h3>
                    <p className="text-lg font-medium text-slate-400 max-w-sm">One-tap emergency signals directly to regional admin command centers.</p>
                  </div>
                  <Button className="bg-white text-slate-950 rounded-2xl h-14 px-10 font-bold hover:bg-slate-100 transition-all group-hover:translate-x-2">Learn Security</Button>
                </CardContent>
              </Card>

              <Card className="rounded-[3rem] border-none bg-primary text-white overflow-hidden group shadow-2xl shadow-primary/30">
                <CardContent className="p-16 space-y-10">
                  <div className="space-y-4">
                    <Badge className="bg-white/20 text-white border-none font-bold uppercase tracking-widest px-4 py-1">Join the Fleet</Badge>
                    <h3 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter">Become a Partner.</h3>
                    <p className="text-lg font-medium text-primary-foreground/80 max-w-sm">Grow your earnings with our optimized dispatch engine and high-volume routes.</p>
                  </div>
                  <Link href="/driver/signup">
                    <Button className="bg-slate-950 text-white rounded-2xl h-14 px-10 font-bold hover:bg-slate-900 transition-all group-hover:translate-x-2">Driver Onboarding</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-slate-50 py-24 border-t border-slate-100">
        <div className="container px-6 lg:px-24 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl">
                  <Bus className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black text-slate-950 font-headline">AAGO</span>
              </div>
              <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed">
                Reimagining regional mobility for the academic community across Andhra Pradesh.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 lg:gap-24">
              <div className="space-y-6">
                <p className="text-xs font-black uppercase text-slate-950 tracking-widest">Network</p>
                <nav className="flex flex-col gap-4 text-sm font-bold text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Vizag Hub</Link>
                  <Link href="#" className="hover:text-primary transition-colors">VZM Hub</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Route Map</Link>
                </nav>
              </div>
              <div className="space-y-6">
                <p className="text-xs font-black uppercase text-slate-950 tracking-widest">Company</p>
                <nav className="flex flex-col gap-4 text-sm font-bold text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Safety</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors">Ops Terminal</Link>
                </nav>
              </div>
              <div className="space-y-6">
                <p className="text-xs font-black uppercase text-slate-950 tracking-widest">Connect</p>
                <div className="flex gap-4">
                  {[Instagram, Twitter, Facebook].map((Icon, i) => (
                    <Link key={i} href="#" className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                      <Icon className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              © 2024 AAGO MOBILITY PVT LTD. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>System Status: Optimal</span>
              <span>Region: AP Hub 1</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
