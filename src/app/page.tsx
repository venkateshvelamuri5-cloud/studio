
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, MapPin, Clock, Shield, Users, Smartphone, ArrowRight, Zap, Star, Download } from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-shuttle');
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
          <Link className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors hidden md:block" href="#pricing">Pricing</Link>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Link href="/auth/login">
            <Button variant="ghost" className="font-bold text-primary">Log In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 rounded-full font-bold shadow-lg shadow-primary/20">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* B2C Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-white relative overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-10">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-black text-accent border border-accent/20">
                    <Star className="h-4 w-4 fill-accent" />
                    MOST RELIABLE RIDE IN THE CITY
                  </div>
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-8xl/tight text-primary font-headline">
                    Skip the Wait. <br /><span className="text-accent">Ride Smarter.</span>
                  </h1>
                  <p className="max-w-[540px] text-muted-foreground md:text-xl/relaxed font-medium">
                    The commuter's best friend. Real-time tracking, guaranteed seating, and the fastest routes across your city—all in one app.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-16 px-10 text-xl bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/30">
                      Book Your First Ride
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
                    <p className="text-sm font-bold text-muted-foreground">Loved by 25,000+ daily riders</p>
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
                    data-ai-hint="rider app"
                  />
                  {/* Floating Notification UI Element */}
                  <div className="absolute top-1/4 -right-12 bg-white p-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-bounce-slow">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">SHUTTLE ARRIVING</p>
                      <p className="text-sm font-black">2 mins away</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits for Riders */}
        <section id="how-it-works" className="w-full py-24 bg-secondary/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-20">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-primary font-headline">Why switch to Aago?</h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed font-medium">
                We've taken the stress out of commuting. No more standing in the rain or wondering if the bus is coming.
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Live Tracking", desc: "Know exactly where your ride is with second-by-second updates.", icon: MapPin },
                { title: "Guaranteed Seats", desc: "Book your seat ahead of time. No more crowded standing rooms.", icon: Users },
                { title: "Smart Scheduling", desc: "Our AI picks the fastest routes based on real-time city traffic.", icon: Zap },
                { title: "Touchless Boarding", desc: "Scan your app and go. Fast, easy, and completely digital.", icon: Smartphone },
                { title: "Rider Safety", desc: "Share your ride location with friends and family in one tap.", icon: Shield },
                { title: "Save Money", desc: "Subscription plans that cost 40% less than ride-sharing services.", icon: Star },
              ].map((feature, idx) => (
                <Card key={idx} className="border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2rem] bg-white group p-4">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:bg-primary group-hover:rotate-12 transition-all duration-300">
                      <feature.icon className="h-8 w-8 text-primary group-hover:text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black font-headline">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* B2C Pricing/CTA Section */}
        <section id="pricing" className="w-full py-24 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="bg-primary rounded-[3rem] p-8 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-primary/40">
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="grid gap-12 lg:grid-cols-2 items-center relative z-10">
                <div className="space-y-8">
                  <h2 className="text-5xl font-black tracking-tight sm:text-7xl font-headline">One Price. <br />Unlimited Rides.</h2>
                  <p className="text-primary-foreground/80 text-xl font-medium max-w-[500px]">
                    Stop paying for gas and parking. Our Commuter Pass gives you unlimited rides across the city for one flat monthly fee.
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-black h-16 px-10 rounded-2xl text-xl">
                      Start Your Free Week
                    </Button>
                    <Button size="lg" variant="outline" className="text-white border-white/40 hover:bg-white hover:text-primary h-16 px-10 rounded-2xl text-xl font-bold backdrop-blur-sm">
                      View Routes
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-accent uppercase tracking-widest text-sm">Monthly Pass</span>
                      <span className="text-3xl font-black">$49.99</span>
                    </div>
                    <ul className="space-y-4">
                      {[
                        "Unlimited city-wide rides",
                        "Priority seat booking",
                        "Real-time arrival alerts",
                        "24/7 Rider support"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                            <Zap className="h-3 w-3 text-green-400" />
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

      {/* Footer */}
      <footer className="w-full py-16 bg-white border-t border-secondary">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-6">
              <Link className="flex items-center gap-2" href="/">
                <Bus className="h-6 w-6 text-primary" />
                <span className="text-2xl font-black tracking-tight text-primary font-headline italic">AAGO</span>
              </Link>
              <p className="text-muted-foreground font-medium leading-relaxed">
                The future of urban transportation. Simple, fast, and rider-first.
              </p>
            </div>
            <div>
              <h4 className="font-black mb-6 text-primary uppercase tracking-widest text-xs">Ride</h4>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Route Map</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Rider Perks</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Refer a Friend</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-6 text-primary uppercase tracking-widest text-xs">Drive</h4>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Become a Driver</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Fleet Partners</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Driver Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-6 text-primary uppercase tracking-widest text-xs">Support</h4>
              <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Safety Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-secondary flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-xs font-bold text-muted-foreground">© 2024 AAGO INC. ALL RIGHTS RESERVED.</p>
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
