import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, MapPin, Clock, Shield, Users, Smartphone, ArrowRight, Zap, Star, Download, IndianRupee } from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function LandingPage() {
  const studentMobile = PlaceHolderImages.find(img => img.id === 'student-mobile');

  return (
    <div className="flex flex-col min-h-screen selection:bg-accent selection:text-white">
      {/* Consumer Navigation */}
      <header className="px-6 lg:px-12 h-20 flex items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-secondary">
        <Link className="flex items-center justify-center gap-2 group" href="/">
          <div className="bg-primary p-2 rounded-2xl group-hover:rotate-12 transition-transform duration-300">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-primary font-headline italic">AAGO</span>
        </Link>
        <nav className="ml-auto flex gap-8 items-center">
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#how-it-works">How it works</Link>
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#pricing">Passes</Link>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold text-primary">Log In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full font-bold shadow-lg shadow-primary/20">
              Join Now
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* B2C Hero Section - Localized for India */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-white relative overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-10">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-black text-accent border border-accent/20">
                    <Star className="h-4 w-4 fill-accent" />
                    MADE FOR MODERN INDIA
                  </div>
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-8xl/tight text-primary font-headline">
                    Beat the Traffic. <br /><span className="text-accent">Travel VIP.</span>
                  </h1>
                  <p className="max-w-[540px] text-muted-foreground md:text-xl/relaxed font-medium">
                    No more waiting for cancellations or autos. Guaranteed seats in luxury AC shuttles across Bengaluru, Mumbai, and Delhi. Smart, safe, and silent.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/30">
                      Book a Free Ride
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
                        <Image src={`https://picsum.photos/seed/rider${i}/100/100`} width={40} height={40} alt="Rider" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">Trusted by 5 Lakh+ daily commuters</p>
                  </div>
                </div>
              </div>
              <div className="relative group lg:ml-auto">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent rounded-[3rem] blur-3xl opacity-50"></div>
                <div className="relative">
                  <Image
                    alt="Aago Rider App"
                    className="mx-auto rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border-8 border-white"
                    height={700}
                    width={500}
                    src={studentMobile?.imageUrl || "https://picsum.photos/seed/aago2/600/800"}
                    data-ai-hint="indian rider"
                  />
                  {/* Floating Notification UI Element */}
                  <div className="absolute top-1/4 -right-12 bg-white p-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-bounce-slow">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">SHUTTLE ARRIVING</p>
                      <p className="text-sm font-black italic">Silk Board Junction</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Localized Benefits */}
        <section id="how-it-works" className="w-full py-24 bg-secondary/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-20">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-primary font-headline">The Smart Way to Commute</h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed font-medium">
                Designed for the busy Indian professional. Get your work done or take a nap while we handle the chaos of the road.
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Live Tracking", desc: "Real-time updates to match your busy schedule. Never wait at a stand.", icon: MapPin },
                { title: "Guaranteed AC Seat", desc: "Escape the heat. Book your premium AC seat in advance.", icon: Users },
                { title: "Smart Routing", desc: "Our AI bypasses the worst traffic hotspots using real-time data.", icon: Zap },
                { title: "Digital Payments", desc: "Pay with UPI, Credit Cards, or Aago Credits. No cash needed.", icon: Smartphone },
                { title: "Safety First", desc: "Verified drivers and SOS features for late-night security.", icon: Shield },
                { title: "Save Big", desc: "Passes that cost 70% less than daily cab bookings.", icon: Star },
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

        {/* Indian Pricing Section */}
        <section id="pricing" className="w-full py-24 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="bg-primary rounded-[3rem] p-8 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-primary/40">
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="grid gap-12 lg:grid-cols-2 items-center relative z-10">
                <div className="space-y-8">
                  <h2 className="text-5xl font-black tracking-tight sm:text-7xl font-headline italic">One Pass. <br />Infinite Comfort.</h2>
                  <p className="text-primary-foreground/80 text-xl font-medium max-w-[500px]">
                    Fixed monthly costs. No surge pricing, ever. Join thousands of office-goers saving on their daily fuel.
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-black h-16 px-10 rounded-2xl text-xl italic uppercase tracking-tighter">
                      Get Monthly Pass
                    </Button>
                    <Button size="lg" variant="outline" className="text-white border-white/40 hover:bg-white hover:text-primary h-16 px-10 rounded-2xl text-xl font-bold backdrop-blur-sm">
                      Check Routes
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-accent uppercase tracking-widest text-sm">Techie Pass (30 Days)</span>
                      <span className="text-3xl font-black flex items-center gap-1"><IndianRupee className="h-6 w-6" /> 999</span>
                    </div>
                    <ul className="space-y-4">
                      {[
                        "Unlimited office-to-home rides",
                        "Guaranteed Front Row seating",
                        "Complimentary High-speed Wi-Fi",
                        "Dedicated 24/7 Priority Support"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <Zap className="h-3 w-3 text-accent" />
                          </div>
                          <span className="text-lg font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Localized */}
      <footer className="w-full py-16 bg-white border-t border-secondary">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-6">
              <Link className="flex items-center gap-2" href="/">
                <Bus className="h-6 w-6 text-primary" />
                <span className="text-2xl font-black tracking-tight text-primary font-headline italic">AAGO</span>
              </Link>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Empowering India's urban commute. One comfortable seat at a time.
              </p>
            </div>
            <div>
              <h4 className="font-black mb-6 text-primary uppercase tracking-widest text-xs">Cities</h4>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Bengaluru</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Mumbai</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Delhi NCR</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Hyderabad</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-6 text-primary uppercase tracking-widest text-xs">Aago for Business</h4>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Corporate Tie-ups</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Partner with Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Fleet Management</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-6 text-primary uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Safety</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-secondary flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">© 2024 AAGO MOBILITY INDIA PVT LTD.</p>
            <div className="flex gap-8">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors"><Smartphone className="h-5 w-5" /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors"><Users className="h-5 w-5" /></Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}