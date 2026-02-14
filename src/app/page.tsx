
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, MapPin, Clock, Shield, Users, Smartphone, ArrowRight, Zap } from 'lucide-react';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-shuttle');
  const studentMobile = PlaceHolderImages.find(img => img.id === 'student-mobile');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="px-6 lg:px-12 h-20 flex items-center border-b bg-white sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-primary p-2 rounded-lg">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-primary font-headline">Aago</span>
        </Link>
        <nav className="ml-auto flex gap-6 items-center">
          <Link className="text-sm font-medium hover:text-accent transition-colors hidden md:block" href="#features">Features</Link>
          <Link className="text-sm font-medium hover:text-accent transition-colors hidden md:block" href="#institutions">Institutions</Link>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Link href="/auth/login">
            <Button variant="ghost" className="text-primary hover:text-accent">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-primary hover:bg-primary/90 text-white px-6">Join Aago</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-white overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent ring-1 ring-inset ring-accent/20">
                    <Zap className="mr-2 h-4 w-4" />
                    AI-Powered Transportation
                  </div>
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-7xl/none text-primary font-headline">
                    Campus Travel, <br /><span className="text-accent">Perfectly Optimized.</span>
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Aago brings real-time tracking, AI-route planning, and seamless seat booking to campus shuttles. Safe, efficient, and reliable travel for students and staff.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90">
                      Get Started Now
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2">
                      Explore Features
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-secondary flex items-center justify-center overflow-hidden">
                        <Image src={`https://picsum.photos/seed/user${i}/100/100`} width={32} height={32} alt="User" />
                      </div>
                    ))}
                  </div>
                  <p>Trusted by <span className="font-semibold text-primary">5,000+ students</span> daily</p>
                </div>
              </div>
              <div className="relative group lg:ml-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                  <Image
                    alt="Aago App Interface"
                    className="mx-auto rounded-2xl shadow-2xl transition-all duration-500 group-hover:scale-[1.01]"
                    height={600}
                    width={800}
                    src={heroImage?.imageUrl || "https://picsum.photos/seed/aago1/800/600"}
                    data-ai-hint="campus shuttle"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="features" className="w-full py-20 bg-secondary/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary font-headline">Everything You Need to Get Around</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Smart tools designed for modern campuses to reduce wait times and improve passenger safety.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Real-Time Tracking", desc: "Live GPS tracking with accurate ETAs for every stop on your route.", icon: MapPin },
                { title: "AI Route Optimization", desc: "Intelligent scheduling that adapts to student demand and traffic conditions.", icon: Zap },
                { title: "Seat Booking", desc: "Reserve your spot in advance and skip the uncertainty of standing in line.", icon: Users },
                { title: "Digital Boarding", desc: "Quick QR-code validation for fast, touchless boarding experience.", icon: Smartphone },
                { title: "Safety Features", desc: "Share your trip progress with trusted contacts and access emergency support.", icon: Shield },
                { title: "Admin Insights", desc: "Powerful analytics to help administrators manage fleets and optimize budgets.", icon: Clock },
              ].map((feature, idx) => (
                <Card key={idx} className="border-none shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-headline">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section id="institutions" className="w-full py-20 bg-primary text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-accent opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl font-bold tracking-tighter sm:text-6xl font-headline">Ready to Transform Your Campus?</h2>
                <p className="text-primary-foreground/80 md:text-xl/relaxed">
                  Join the leading universities worldwide that trust Aago to manage their transportation networks efficiently.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-bold h-14 px-8">
                    Contact Sales
                  </Button>
                  <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary h-14 px-8">
                    Schedule a Demo
                  </Button>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 max-w-md w-full">
                  <h3 className="text-2xl font-bold mb-6 font-headline">Why Aago?</h3>
                  <ul className="space-y-4">
                    {[
                      "Reduce fuel costs by up to 25%",
                      "99% passenger satisfaction rate",
                      "Deployment in less than 2 weeks",
                      "Scalable from 5 to 500 vehicles"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <ArrowRight className="h-3 w-3" />
                        </div>
                        <span className="text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-white border-t">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link className="flex items-center gap-2" href="/">
                <Bus className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold tracking-tight text-primary font-headline">Aago</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empowering institutions with smarter, safer, and more efficient transportation solutions.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-primary">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-accent">Student App</Link></li>
                <li><Link href="#" className="hover:text-accent">Admin Dashboard</Link></li>
                <li><Link href="#" className="hover:text-accent">Driver Console</Link></li>
                <li><Link href="#" className="hover:text-accent">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-primary">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-accent">About Us</Link></li>
                <li><Link href="#" className="hover:text-accent">Careers</Link></li>
                <li><Link href="#" className="hover:text-accent">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-accent">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-primary">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-accent">Help Center</Link></li>
                <li><Link href="#" className="hover:text-accent">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-accent">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© 2024 Aago Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary"><span className="sr-only">Twitter</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><span className="sr-only">LinkedIn</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg></Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
