"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Smartphone, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DriverLoginPage() {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (auth && !recaptchaRef.current) {
      try {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-driver', {
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
      toast({ title: "Terminal Synced", description: "Auth code sent to operator handset." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Protocol Failed", description: "Check network signal." });
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
      const user = result.user;
      const userSnap = await getDoc(doc(db, 'users', user.uid));

      if (!userSnap.exists()) {
        toast({ title: "Identity Required", description: "Profile not detected. Redirecting to onboarding..." });
        router.push('/driver/signup');
        return;
      }

      const profile = userSnap.data();
      if (profile.role !== 'driver') {
        await signOut(auth!);
        toast({ variant: "destructive", title: "Restricted Access", description: "Authorized operators only." });
        setStep(1);
      } else {
        router.push('/driver');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid Protocol", description: "Verification sequence denied." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-body safe-area-inset">
      <div id="recaptcha-container-driver"></div>
      
      <div className="mb-12 flex flex-col items-center gap-6 animate-in fade-in duration-1000">
        <div className="bg-primary p-5 rounded-3xl shadow-2xl shadow-primary/30">
          <ShieldCheck className="h-14 w-14 text-black" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black font-headline italic uppercase tracking-tighter text-foreground leading-none">OPERATOR</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-2">Grid Terminal Access</p>
        </div>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[3.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-14 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">Secure Login</CardTitle>
          <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest italic mt-2">
            Verify Mission Clearance
          </CardDescription>
        </CardHeader>
        <CardContent className="px-12 pb-10">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-2">Operator ID (Phone)</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary italic">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="0000000000" 
                    className="h-18 w-full pl-18 rounded-2xl bg-white/5 border-white/10 font-black text-foreground text-xl italic outline-none" 
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-primary hover:bg-primary/90 text-black h-20 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Request Access"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-2">Sequence Code</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-24 w-full text-center text-4xl tracking-[0.6em] rounded-2xl bg-white/5 border-white/10 font-black text-primary outline-none" 
                  maxLength={6}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full bg-accent hover:bg-accent/90 text-black h-20 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Confirm Clearance"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-black text-muted-foreground uppercase italic text-[10px] tracking-widest">Abort Sequence</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-white/5 p-10 flex flex-col gap-6">
          <Link href="/driver/signup" className="text-xs font-black uppercase italic text-primary hover:underline">New Operator? Join Fleet</Link>
          <Link href="/" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors flex items-center gap-3">
            <ArrowLeft className="h-4 w-4" /> Exit Terminal
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
