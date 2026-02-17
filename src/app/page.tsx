"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, 
  ArrowRight, 
  Navigation,
  QrCode,
  ShieldCheck,
  Zap,
  Cpu,
  Globe,
  Activity,
  Fingerprint,
  Radio,
  Clock,
  Menu,
  X,
  ShieldAlert
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

function HighTechSimulator() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [activeScreen, setActiveScreen] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientY - rect.top) / rect.height - 0.5;
    const y = (e.clientX - rect.left) / rect.width - 0.5;
    setRotation({ x: -x * 15, y: y * 15 });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[340px] aspect-[9/18] mx-auto perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="relative w-full h-full bg-slate-900 rounded-[2.5rem] border-[8px] border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden transition-transform duration-500 ease-out"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <div className="h-full w-full bg-slate-50 flex flex-col pt-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-white rounded-b-xl z-30" />
          
          <div className="flex-1 p-5 flex flex-col gap-5">
            <header className="flex justify-between items-center">
              <Bus className="h-5 w-5 text-primary" />
              <div className="h-6 w-6 rounded-full bg-slate-200" />
            </header>

            {activeScreen === 0 && (
              <div className="flex-1 space-y-5 animate-in fade-in slide-in-from-bottom-4">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Scanning Hubs</Badge>
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-tight">Live<br/>Network.</h3>
                <div className="aspect-square bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center relative overflow-hidden border border-slate-100">
                  <div className="h-24 w-24 bg-primary/10 rounded-full animate-ping" />
                  <Navigation className="h-8 w-8 text-primary absolute" />
                </div>
              </div>
            )}

            {activeScreen === 1 && (
              <div className="flex-1 space-y-5 animate-in slide-in-from-right-8">
                <Badge className="bg-accent/10 text-accent border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Verified ID</Badge>
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-tight">Secure<br/>Access.</h3>
                <div className="flex-1 bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-5">
                  <QrCode className="h-28 w-28 text-slate-950" />
                </div>
              </div>
            )}

            {activeScreen === 2 && (
              <div className="flex-1 space-y-5 animate-in zoom-in duration-500">
                <Badge className="bg-green-500/10 text-green-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">On Trip</Badge>
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-tight">Real-time<br/>Status.</h3>
                <div className="flex-1 bg-white rounded-[1.5rem] border border-slate-100 p-5 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Route #VX-01</span>
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-bold text-slate-600">Synced</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="h-16 bg-white border-t border-slate-100 flex justify-around items-center px-8">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-1 w-1 rounded-full transition-all duration-700 ${activeScreen === i ? 'bg-primary w-8' : 'bg-slate-200'}`} 
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-950 selection:bg-primary selection:text-white">
      <header className="fixed top-0 left-0 right-0 h-16 z-50 px-6 lg:px-20 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-3xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-primary p-2.5 rounded-lg shadow-lg group-hover:rotate-12 transition-transform">
            <Bus className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black italic font-headline tracking-tighter uppercase text-primary">AAGO</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {['Our Routes', 'Student Hub', 'Support'].map((item) => (
            <Link 
              key={item} 
              href="#" 
              className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
          <Link href="/auth/login">
            <Button variant="outline" className="h-9 border-slate-200 bg-slate-50 px-5 rounded-lg font-black uppercase text-[9px] tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all">
              Login
            </Button>
          </Link>
        </nav>

        <Button 
          variant="ghost" 
          className="lg:hidden h-9 w-9 rounded-lg bg-slate-100"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-20 px-8 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-500">
          {['Our Routes', 'Student Hub', 'Support'].map((item) => (
            <Link key={item} href="#" className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{item}</Link>
          ))}
          <hr className="border-slate-100" />
          <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full h-14 bg-primary rounded-xl font-black uppercase italic text-lg shadow-xl">Login Terminal</Button>
          </Link>
        </div>
      )}

      <main className="pt-16">
        <section className="relative min-h-[85vh] flex items-center overflow-hidden py-16 bg-slate-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
          
          <div className="container mx-auto px-6 lg:px-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200 px-5 py-1.5 rounded-full shadow-sm">
                    <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Smart Transit Active</span>
                  </div>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.95] font-headline uppercase italic tracking-tighter text-slate-900">
                    Better <br /> Commuting <br /> <span className="text-primary">Starts Here.</span>
                  </h1>
                  <p className="max-w-md text-sm lg:text-base font-bold text-slate-500 leading-relaxed border-l-4 border-primary/20 pl-5 italic">
                    The easiest way for students to get around Vizag and VZM. Real-time tracking and simple booking for a better daily commute.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                  <Link href="/auth/signup">
                    <Button className="h-14 px-8 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase italic text-base shadow-xl transition-all">
                      Join Aago <ArrowRight className="ml-2.5 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="h-14 px-8 rounded-xl font-black uppercase italic text-base border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                    View Maps
                  </Button>
                </div>

                <div className="flex items-center gap-10 pt-6 border-t border-slate-200">
                   <div className="space-y-0.5">
                      <p className="text-xl font-black italic text-slate-900">12K+</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Students</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-xl font-black italic text-slate-900">Vizag</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Major Hub</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-xl font-black italic text-slate-900">99%</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Reliability</p>
                   </div>
                </div>
              </div>

              <div className="lg:ml-auto hidden lg:block relative">
                <div className="absolute -inset-16 bg-primary/5 blur-[80px] rounded-full -z-10" />
                <HighTechSimulator />
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="max-w-xl space-y-5 mb-16">
              <Badge className="bg-primary/10 text-primary border-none px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.3em]">Our Features</Badge>
              <h2 className="text-3xl lg:text-5xl font-black uppercase italic leading-tight tracking-tighter text-slate-900">Commute with Confidence.</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  icon: Globe, 
                  title: "Smart Routes", 
                  desc: "Optimized routes covering all major colleges and neighborhoods in Vizag.",
                  color: "bg-blue-50"
                },
                { 
                  icon: Cpu, 
                  title: "Real-time Tracking", 
                  desc: "Know exactly where your bus is and when it will arrive at your stop.",
                  color: "bg-purple-50"
                },
                { 
                  icon: ShieldCheck, 
                  title: "Easy Boarding", 
                  desc: "No more waiting in lines. Use your unique digital code to board instantly.",
                  color: "bg-orange-50"
                },
                { 
                  icon: Zap, 
                  title: "Cashless Wallet", 
                  desc: "Add money to your app and pay for rides with one tap. Fast and secure.",
                  color: "bg-yellow-50"
                },
                { 
                  icon: Activity, 
                  title: "Student Safety", 
                  desc: "Verified drivers and vehicles ensure a safe trip for every scholar.",
                  color: "bg-green-50"
                },
                { 
                  icon: Fingerprint, 
                  title: "Regional Passes", 
                  desc: "Save more with daily or monthly passes designed for student budgets.",
                  color: "bg-pink-50"
                }
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-[2rem] p-8 space-y-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-500">
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                    <item.icon className="h-6 w-6 text-slate-900" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{item.title}</h3>
                    <p className="text-xs font-bold text-slate-500 italic leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-slate-900 text-white rounded-[3rem] lg:rounded-[5rem]">
          <div className="container mx-auto px-6 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-12">
                <div className="space-y-5">
                  <Badge className="bg-primary/20 text-primary border-none px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.3em]">Three Simple Steps</Badge>
                  <h2 className="text-4xl lg:text-6xl font-black uppercase italic leading-none tracking-tighter">How it Works.</h2>
                </div>

                <div className="space-y-8">
                  {[
                    { step: "01", title: "Find your Bus", desc: "Search for available buses on your route through the Aago app." },
                    { step: "02", title: "Book your Seat", desc: "Reserve your spot instantly using your wallet or an active pass." },
                    { step: "03", title: "Show your Code", desc: "Show your unique 6-digit code to the driver and board your bus." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="shrink-0 h-12 w-12 bg-white rounded-xl flex items-center justify-center text-slate-950 text-base font-black italic shadow-lg">
                        {item.step}
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xl font-black uppercase italic tracking-tighter">{item.title}</h4>
                        <p className="text-sm font-bold text-white/50 italic leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative h-[500px] lg:h-[600px] rounded-[3rem] overflow-hidden border-[8px] border-white/10 shadow-2xl">
                <Image 
                  src={PlaceHolderImages.find(img => img.id === 'student-mobile')?.imageUrl || "https://picsum.photos/seed/aago-vizag-2/600/800"} 
                  fill 
                  className="object-cover" 
                  alt="Aago Scholar app" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 space-y-3">
                  <h3 className="text-3xl lg:text-4xl font-black italic uppercase leading-none tracking-tighter">Stay Connected.</h3>
                  <p className="font-bold text-white/90 italic text-base leading-tight">Join thousands of students moving across the city every day.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 lg:px-20">
          <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-100 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-center space-y-10 shadow-sm group">
             <div className="absolute -top-24 -left-24 h-[250px] w-[250px] bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-all duration-1000" />
             <div className="absolute -bottom-24 -right-24 h-[250px] w-[250px] bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all duration-1000" />
             
             <Badge className="bg-primary/10 text-primary border-none px-5 py-1.5 text-[9px] font-black uppercase tracking-[0.4em] italic">Open to all students</Badge>
             <h3 className="text-4xl lg:text-6xl font-black uppercase italic leading-[0.95] tracking-tighter text-slate-900">
               Ready to <br /> <span className="text-primary">Ride?</span>
             </h3>
             <p className="max-w-lg mx-auto text-base lg:text-lg font-bold text-slate-500 italic leading-relaxed">
               Create your scholar account today and experience a better way to get to college.
             </p>
             <div className="pt-6">
               <Link href="/auth/signup">
                 <Button className="h-16 px-12 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black uppercase italic text-xl shadow-xl transition-all hover:scale-105">
                   Get Started
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-slate-100 bg-white">
        <div className="container mx-auto px-6 lg:px-20">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-16">
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="bg-primary p-2.5 rounded-lg shadow-md">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-black italic uppercase tracking-tighter text-primary">AAGO</span>
              </Link>
              <p className="max-w-xs text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 italic leading-loose">
                Modern transit for the student community. Connecting campuses across Vizag and Vizianagaram.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-16 lg:gap-24">
              <div className="space-y-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Links</p>
                <nav className="flex flex-col gap-3 text-xs font-bold uppercase italic text-slate-500">
                  <Link href="/auth/login" className="hover:text-primary transition-colors">Student Login</Link>
                  <Link href="/auth/signup" className="hover:text-primary transition-colors">Sign Up</Link>
                  <Link href="/driver/login" className="hover:text-primary transition-colors">Driver Portal</Link>
                  <Link href="/admin/login" className="hover:text-primary transition-colors flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3" /> Admin
                  </Link>
                </nav>
              </div>
              <div className="space-y-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Support</p>
                <nav className="flex flex-col gap-3 text-xs font-bold uppercase italic text-slate-500">
                  <Link href="#" className="hover:text-primary transition-colors">Safety Guide</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Terms of Use</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 italic">
              © 2024 AAGO MOBILITY.
            </p>
            <div className="flex gap-8 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
              <Link href="#" className="hover:text-slate-900 transition-colors">English</Link>
              <Link href="#" className="hover:text-slate-900 transition-colors">Help Hub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}