
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
  Truck
} from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function LandingPage() {
  const studentMobile = PlaceHolderImages.find(img => img.id === 'student-mobile');

  return (
    <div className="flex flex-col min-h-screen selection:bg-accent selection:text-white font-body">
      {/* Navigation */}
      <header className="px-6 lg:px-12 h-20 flex items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-secondary">
        <Link className="flex items-center justify-center gap-2 group" href="/">
          <div className="bg-primary p-2 rounded-2xl group-hover:rotate-12 transition-transform duration-300">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-primary font-headline italic">AAGO</span>
        </Link>
        <nav className="ml-auto flex gap-8 items-center">
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#how-it-works">Why Aago?</Link>
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#pricing">Student Pass</Link>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold text-primary">Student Login</Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full font-bold shadow-lg shadow-primary/20">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-white relative overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-10">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-black text-accent border border-accent/20">
                    <GraduationCap className="h-4 w-4" />
                    EXCLUSIVE FOR STUDENTS
                  </div>
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-8xl/tight text-primary font-headline">
                    Skip the Bus Rush. <br /><span className="text-accent">Study in Peace.</span>
                  </h1>
                  <p className="max-w-[540px] text-muted-foreground md:text-xl/relaxed font-medium">
                    Tired of the Vizag city bus crowd? Aago provides guaranteed AC seats for students in Vizag & Vizianagaram. Reach college fresh, safe, and on time.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/30">
                      Claim Student Discount
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="h-16 px-10 text-xl border-2 rounded-2xl">
                    <Download className="mr-2 h-6 w-6" /> Download App
                  </Button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-10 w-10 rounded-full border-4 border-white bg-secondary flex items-center justify-center overflow-hidden">
                        <Image src={`https://picsum.photos/seed/student-ap-${i}/100/100`} width={40} height={40} alt="Student" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">Serving 10,000+ students daily in AP</p>
                  </div>
                </div>
              </div>
              <div className="relative group lg:ml-auto">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent rounded-[3rem] blur-3xl opacity-50"></div>
                <div className="relative">
                  <Image
                    alt="Aago Student App"
                    className="mx-auto rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border-8 border-white"
                    height={700}
                    width={500}
                    src={studentMobile?.imageUrl || "https://picsum.photos/seed/aago-vizag-2/600/800"}
                    data-ai-hint="indian student"
                  />
                  <div className="absolute top-1/4 -right-12 bg-white p-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-bounce-slow">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">SHUTTLE AT GITAM STOP</p>
                      <p className="text-sm font-black italic">3 Mins Away</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="how-it-works" className="w-full py-24 bg-secondary/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-20">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-primary font-headline italic">Student-First Commute</h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed font-medium">
                No more hanging from bus doors. Aago is designed specifically for Andhra's student community to ensure academic focus.
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Avoid the Rush", desc: "Guaranteed AC seats. No standing, no pushing, no crowds.", icon: Users },
                { title: "Real-time Tracking", desc: "Know exactly where your shuttle is on the VZM-Vizag highway.", icon: MapPin },
                { title: "Exam-Ready Comfort", desc: "Cool, quiet environment to revise your notes while you travel.", icon: Zap },
                { title: "Safe for Everyone", desc: "Verified drivers and female-priority seating options.", icon: Shield },
                { title: "Digital ID Check", desc: "Strictly for students with valid institution IDs.", icon: GraduationCap },
                { title: "Pocket Friendly", desc: "Student passes that cost less than your daily canteen snacks.", icon: Star },
              ].map((feature, idx) => (
                <Card key={idx} className="border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2rem] bg-white group p-4">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:bg-accent group-hover:rotate-12 transition-all duration-300">
                      <feature.icon className="h-8 w-8 text-primary group-hover:text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black font-headline tracking-tight">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Cities */}
        <section className="w-full py-24 bg-white overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-4xl font-black text-primary font-headline mb-8 italic uppercase tracking-tighter">Connecting Andhra Pradesh</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <h4 className="font-black text-primary text-xl mb-1">Vizag</h4>
                    <p className="text-sm font-bold text-muted-foreground">ACTIVE</p>
                  </div>
                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <h4 className="font-black text-primary text-xl mb-1">Vizianagaram</h4>
                    <p className="text-sm font-bold text-muted-foreground">ACTIVE</p>
                  </div>
                  <div className="p-6 bg-secondary rounded-3xl opacity-60">
                    <h4 className="font-black text-muted-foreground text-xl mb-1">Vijayawada</h4>
                    <p className="text-[10px] font-black tracking-widest">COMING SOON</p>
                  </div>
                  <div className="p-6 bg-secondary rounded-3xl opacity-60">
                    <h4 className="font-black text-muted-foreground text-xl mb-1">Guntur</h4>
                    <p className="text-[10px] font-black tracking-widest">COMING SOON</p>
                  </div>
                </div>
              </div>
              <div className="bg-primary p-12 rounded-[3rem] text-white">
                <h3 className="text-3xl font-black font-headline mb-6 italic uppercase">Expansion Alert!</h3>
                <p className="text-primary-foreground/80 mb-8 font-medium">We are rapidly expanding to Vijayawada, Guntur, and Tirupati. Register your interest and get a 50% discount on your first month's pass when we launch.</p>
                <Button className="bg-accent hover:bg-accent/90 text-white font-black h-14 rounded-2xl px-8">Notify Me</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="w-full py-24 bg-secondary/30">
          <div className="container px-4 md:px-6 mx-auto">
             <div className="max-w-4xl mx-auto bg-primary rounded-[3rem] p-8 md:p-16 text-white relative shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                   <div className="space-y-6 flex-1">
                      <h2 className="text-5xl font-black font-headline italic uppercase tracking-tighter">Scholars Pass</h2>
                      <p className="text-xl text-primary-foreground/80 font-medium">Unlimited travel between your home and campus. Fixed prices, zero surge.</p>
                      <div className="flex items-center gap-2">
                         <span className="text-6xl font-black italic"><IndianRupee className="inline h-10 w-10 -mr-2" /> 799</span>
                         <span className="text-sm font-bold opacity-60 uppercase tracking-widest">/ Month</span>
                      </div>
                   </div>
                   <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 w-full md:w-80">
                      <ul className="space-y-4 font-bold text-sm">
                         <li className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-accent" /> Guaranteed AC Seat
                         </li>
                         <li className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-accent" /> VZM-Vizag Special
                         </li>
                         <li className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-accent" /> High-speed Wi-Fi
                         </li>
                         <li className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-accent" /> Priority Boarding
                         </li>
                      </ul>
                      <Button className="w-full mt-8 bg-accent hover:bg-accent/90 text-white font-black h-14 rounded-2xl uppercase italic tracking-tighter">Get Pass</Button>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </main>

      {/* Enhanced Footer */}
      <footer className="w-full bg-white border-t border-secondary pt-24 pb-12">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="space-y-6">
              <Link className="flex items-center gap-2" href="/">
                <div className="bg-primary p-2 rounded-xl">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <span className="text-2xl font-black text-primary font-headline italic">AAGO</span>
              </Link>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                Andhra Pradesh's first student-only smart shuttle service. Dedicated to making campus commutes safe, reliable, and comfortable for the next generation of scholars.
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

            {/* Hubs Column */}
            <div>
              <h4 className="font-black text-primary font-headline italic uppercase tracking-widest text-xs mb-6">Regional Hubs</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Visakhapatnam (Vizag)</Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Vizianagaram (VZM)</Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors flex items-center gap-2">Vijayawada <Badge variant="outline" className="text-[8px] h-4 px-1 uppercase tracking-tighter">Soon</Badge></Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors flex items-center gap-2">Guntur <Badge variant="outline" className="text-[8px] h-4 px-1 uppercase tracking-tighter">Soon</Badge></Link></li>
              </ul>
            </div>

            {/* Students Column */}
            <div>
              <h4 className="font-black text-primary font-headline italic uppercase tracking-widest text-xs mb-6">For Students</h4>
              <ul className="space-y-4">
                <li><Link href="/auth/login" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Scholars Pass</Link></li>
                <li><Link href="/auth/signup" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Campus Routes</Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">ID Verification</Link></li>
                <li><Link href="#" className="text-sm font-bold text-muted-foreground hover:text-accent transition-colors">Female-First Safety</Link></li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="font-black text-primary font-headline italic uppercase tracking-widest text-xs mb-6">Mobility Partners</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-bold text-primary">
                  <Link href="/driver/login" className="flex items-center gap-2 hover:underline">
                    <Truck className="h-4 w-4" /> Driver Portal
                  </Link>
                </li>
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
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">
              © 2024 AAGO MOBILITY AP PVT LTD. | Vizag & VZM Operations
            </p>
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Link href="/admin/login" className="hover:text-primary transition-colors">Regional Admin</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-primary transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
