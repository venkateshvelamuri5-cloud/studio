
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Persistent login guard
  useEffect(() => {
    if (!authLoading && user && db) {
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (snap.exists()) {
          const role = snap.data().role;
          if (role === 'driver') router.push('/driver');
          else router.push('/student');
        }
      });
    }
  }, [user, authLoading, db, router]);

  useEffect(() => {
    if (auth && !recaptchaRef.current) {
      try {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      } catch (error) {
        console.error("reCAPTCHA initialization failed", error);
      }
    }
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, [auth]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !recaptchaRef.current) return;
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current);
      setConfirmationResult(result);
      setStep(2);
      toast({ title: "Code Sent", description: "Check your phone messages." });
    } catch (error: any) {
      console.error(error);
      let title = "Auth Error";
      let message = "Could not send code. Try again later.";
      
      if (error.code === 'auth/billing-not-enabled') {
        title = "Billing Required";
        message = "Firebase Phone Auth requires a billing account (Blaze plan) to be enabled in the Firebase Console.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many attempts. Please wait a few minutes.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Terminal access restricted for this domain.";
      }
      
      toast({ variant: "destructive", title, description: message });
      
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !db) return;
    setLoading(true);

    try {
      const result = await confirmationResult.confirm(otp);
      const loggedUser = result.user;
      const userSnap = await getDoc(doc(db, 'users', loggedUser.uid));

      if (!userSnap.exists()) {
        toast({ title: "Welcome", description: "Let's create your profile." });
        router.push('/auth/signup');
        return;
      }

      const profile = userSnap.data();
      if (profile.role === 'driver') {
        await signOut(auth!);
        toast({ variant: "destructive", title: "Wrong Portal", description: "Please use Driver Login." });
        router.push('/driver/login');
      } else {
        router.push('/student');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid Code", description: "The code you entered is wrong." });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-body safe-area-inset">
      <div id="recaptcha-container"></div>
      
      <div className="mb-10 flex flex-col items-center gap-6 animate-in fade-in duration-1000">
        <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/20">
          <ConnectingDotsLogo className="h-10 w-10 text-black" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black font-headline italic uppercase tracking-tighter text-primary text-glow">AAGO HUB</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-2">Scholar Login</p>
        </div>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[3rem] overflow-hidden shadow-2xl">
        <CardHeader className="space-y-3 pt-12 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">Enter Portal</CardTitle>
          <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest italic">
            Access your mobility grid
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-8">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-2">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary italic z-20">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="0000000000" 
                    className="h-16 pl-20 rounded-2xl bg-white/5 border-white/10 font-black italic text-xl focus:ring-2 focus:ring-primary relative z-10" 
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-primary hover:bg-primary/90 text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl shadow-primary/20 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Request Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-2">Verification Code</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary outline-none" 
                  maxLength={6}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full bg-accent hover:bg-accent/90 text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl shadow-accent/20 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Me"}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setStep(1)} className="w-full font-black text-muted-foreground uppercase italic text-[10px] tracking-widest">Change Phone</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 bg-white/5 p-10">
          <p className="text-xs text-center font-bold text-muted-foreground uppercase tracking-widest">
            New here?{' '}
            <Link href="/auth/signup" className="text-primary font-black hover:underline italic">Create Profile</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
