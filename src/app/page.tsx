
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Navigation
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function LandingPage() {
  const studentMobile = PlaceHolderImages.find(img => img.id === 'student-mobile');

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
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-black text-accent border border-accent/20 animate-bounce-slow">
                    <GraduationCap className="h-4 w-4" />
                    EXCLUSIVE FOR STUDENTS
                  </div>
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-8xl/tight text-primary font-headline">
                    Skip the Bus Rush. <br /><span className="text-accent italic">Ride Smart.</span>
                  </h1>
                  <p className="max-w-[540px] text-muted-foreground md:text-xl/relaxed font-medium">
                    The only AC shuttle service dedicated to students in Vizag & Vizianagaram. Guaranteed seats, real-time tracking, and campus-to-home security.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/30 group">
                      Get Your Pass <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="h-16 px-10 text-xl border-2 rounded-2xl hover:bg-secondary">
                    <Download className="mr-2 h-6 w-6" /> Download App
                  </Button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-10 w-10 rounded-full border-4 border-white bg-secondary flex items-center justify-center overflow-hidden hover:scale-110 transition-transform cursor-pointer">
                        <Image src={`https://picsum.photos/seed/student-ap-${i}/100/100`} width={40} height={40} alt="Student" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                    </div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">10,000+ Students Onboarded</p>
                  </div>
                </div>
              </div>
              <div className="relative group lg:ml-auto animate-in fade-in zoom-in duration-1000 delay-200">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent rounded-[3rem] blur-3xl opacity-50"></div>
                <div className="relative">
                  <Image
                    alt="Aago Student App"
                    className="mx-auto rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border-8 border-white group-hover:scale-[1.02] transition-transform duration-500"
                    height={700}
                    width={500}
                    src={studentMobile?.imageUrl || "https://picsum.photos/seed/aago-vizag-2/600/800"}
                    data-ai-hint="indian student"
                  />
                  <div className="absolute top-1/4 -right-12 bg-white p-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-12 duration-1000 delay-500">
                    <div className="bg-green-100 p-2 rounded-full animate-pulse">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase">GITAM SHUTTLE</p>
                      <p className="text-sm font-black italic">Arriving in 2m</p>
                    </div>
                  </div>
                  <div className="absolute bottom-1/4 -left-12 bg-primary p-4 rounded-3xl shadow-2xl text-white border-4 border-white animate-in slide-in-from-left-12 duration-1000 delay-700">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-xl">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black opacity-80 uppercase">SEAT STATUS</p>
                        <p className="text-sm font-black italic">Reserved #24B</p>
                      </div>
                    </div>
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
              {/* Connector Line (Desktop Only) */}
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

        {/* Animated Benefits Section */}
        <section className="w-full py-24 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, title: "Female Safety", color: "bg-pink-50 text-pink-600" },
                  { icon: Zap, title: "AC Comfort", color: "bg-blue-50 text-blue-600" },
                  { icon: Clock, title: "On Time", color: "bg-green-50 text-green-600" },
                  { icon: Users, title: "Zero Crowds", color: "bg-purple-50 text-purple-600" },
                ].map((benefit, i) => (
                  <Card key={i} className="border-none shadow-xl rounded-[2rem] hover:-translate-y-2 transition-transform duration-500">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className={`w-12 h-12 ${benefit.color} rounded-2xl mx-auto flex items-center justify-center`}>
                        <benefit.icon className="h-6 w-6" />
                      </div>
                      <h4 className="font-black text-primary uppercase italic text-sm">{benefit.title}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-8">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-primary font-headline uppercase italic leading-none">
                  Designed for the <br /><span className="text-accent underline decoration-4 underline-offset-8">Vizag Scholar</span>
                </h2>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                  We understand that your time is valuable. Aago provides a quiet, cool environment where you can review your notes or relax, ensuring you arrive at college ready to excel.
                </p>
                <ul className="space-y-4">
                  {[
                    "Direct routes to GITAM, AU, and more",
                    "Real-time highway traffic updates",
                    "Student-only verified community"
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 font-black text-primary italic uppercase text-sm">
                      <div className="bg-accent/20 p-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
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
