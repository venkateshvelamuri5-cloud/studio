
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const [step, setStep] = useState(1); 
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!authLoading && user && db) {
      getDoc(doc(db, 'users', user.uid)).then(async (snap) => {
        if (snap.exists()) {
          const profile = snap.data();
          await updateDoc(doc(db, 'users', user.uid), { lastLogin: new Date().toISOString() });
          if (profile.role === 'driver') router.push('/driver');
          else router.push('/student');
        }
      });
    }
  }, [user, authLoading, db, router]);

  const setupRecaptcha = () => {
    if (!auth) return;
    try {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
      }
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    } catch (error) {
      console.error("Recaptcha error:", error);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);

    try {
      setupRecaptcha();
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current!);
      setConfirmationResult(result);
      setStep(2);
      toast({ title: "Code Sent", description: "Check your phone messages." });
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast({ 
          variant: "destructive", 
          title: "Wait a bit", 
          description: "Too many tries. Please wait 15 minutes before trying again." 
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not send code. Try again." });
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
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        router.push('/auth/signup');
        return;
      }

      const profile = userSnap.data();
      if (profile.role === 'driver') {
        await signOut(auth!);
        toast({ variant: "destructive", title: "Wrong Hub", description: "Drivers must use the Driver Login page." });
        router.push('/driver/login');
      } else {
        await updateDoc(userRef, { lastLogin: new Date().toISOString() });
        router.push('/student');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Wrong Code", description: "Check the OTP and try again." });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-body safe-area-inset">
      <div id="recaptcha-container"></div>
      
      <div className="mb-10 flex flex-col items-center gap-6">
        <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/30">
          <ConnectingDotsLogo className="h-10 w-10 text-black" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">AAGO Hub</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-2">Member Terminal</p>
        </div>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-none rounded-[3rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-12 pb-8 text-center border-b border-white/5">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Login</CardTitle>
          <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest italic mt-2">Access your rides</CardDescription>
        </CardHeader>
        <CardContent className="px-10 py-10">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-2">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary italic z-20">+91</span>
                  <input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="0000000000" 
                    className="h-16 w-full pl-20 rounded-2xl bg-white/5 border border-white/10 font-black italic text-xl focus:border-primary outline-none" 
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Send Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-2">Enter Code</Label>
                <input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-20 w-full text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border border-white/10 font-black text-primary outline-none focus:border-primary" 
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Now"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-white/5 p-10 border-t border-white/5">
          <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest w-full">
            Not a member? <Link href="/auth/signup" className="text-primary font-black hover:underline italic">Join AAGO</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
