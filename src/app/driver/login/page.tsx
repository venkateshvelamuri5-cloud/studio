
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Smartphone, Loader2, AlertCircle, ArrowLeft, Bus } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DriverLoginPage() {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [hostnameError, setHostnameError] = useState(false);
  const [currentHostname, setCurrentHostname] = useState('');
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname);
    }
    
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
    setHostnameError(false);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current);
      setConfirmationResult(result);
      setStep(2);
      toast({ title: "Signal Transmitted", description: "OTP sent to regional handset." });
    } catch (error: any) {
      console.error("SMS Error", error);
      if (error.code === 'auth/captcha-check-failed' || error.message?.includes('Hostname match not found')) {
        setHostnameError(true);
      } else {
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Could not reach the authentication satellite.",
        });
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
      const user = result.user;

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const profile = userSnap.data();

      if (!userSnap.exists()) {
        toast({
          title: "Identity Required",
          description: "No driver profile found. Redirecting to onboard terminal...",
        });
        router.push('/driver/signup');
        return;
      }

      if (profile.role !== 'driver') {
        await signOut(auth!);
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This portal is strictly for AAGO Hub Operators.",
        });
        setStep(1);
        setOtp('');
      } else {
        router.push('/driver');
      }
    } catch (error: any) {
      console.error("OTP Error", error);
      toast({
        variant: "destructive",
        title: "Invalid Protocol",
        description: "The verification sequence is incorrect.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] p-6 font-body">
      <div id="recaptcha-container-driver"></div>
      
      <div className="mb-12 flex flex-col items-center gap-6 animate-in fade-in duration-1000">
        <div className="bg-primary p-5 rounded-[1.75rem] shadow-[0_0_40px_rgba(59,130,246,0.3)] rotate-3">
          <ShieldCheck className="h-12 w-12 text-slate-950" />
        </div>
        <div className="text-center">
           <h1 className="text-4xl font-black font-headline italic tracking-tighter uppercase text-white leading-none">AAGO OPS</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-2">Workforce Terminal v4.0</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[3rem] overflow-hidden bg-slate-950/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="space-y-3 pt-12 pb-8 text-center">
          <CardTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter text-white">Operator Access</CardTitle>
          <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest italic">
            Secure regional mission clearance
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          {hostnameError && (
            <Alert variant="destructive" className="mb-8 rounded-2xl bg-red-500/10 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-black italic uppercase text-xs">Security Protocol Alert</AlertTitle>
              <AlertDescription className="text-[10px] font-bold">
                Domain <strong>{currentHostname}</strong> is unauthorized. Notify regional lead.
              </AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-1">Handset Number</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-500">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="10-digit number" 
                    className="h-16 pl-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white placeholder:text-slate-700 text-lg" 
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <><Smartphone className="h-6 w-6 mr-3" /> Start Shift</>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500 ml-1">Auth Sequence</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-20 text-center text-3xl tracking-[0.5em] rounded-2xl bg-slate-900 border-white/5 font-black text-white" 
                  maxLength={6}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full bg-accent hover:bg-accent/90 text-white h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Identity"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Abort Sequence</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-slate-950/80 p-8 flex flex-col gap-4">
          <Link href="/" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-primary transition-colors flex items-center gap-3">
            <ArrowLeft className="h-4 w-4" /> Return to Public Hub
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
