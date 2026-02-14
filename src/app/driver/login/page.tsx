
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, ArrowLeft, Smartphone, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
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
      toast({ title: "OTP Sent to Driver Handset" });
    } catch (error: any) {
      console.error("SMS Error", error);
      if (error.code === 'auth/captcha-check-failed' || error.message?.includes('Hostname match not found')) {
        setHostnameError(true);
      } else {
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Could not reach the authentication server.",
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

      // PROFILE CHECK
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const profile = userSnap.data();

      if (!userSnap.exists()) {
        toast({
          title: "Identity Required",
          description: "No driver profile found. Redirecting to workforce onboarding...",
        });
        router.push('/driver/signup');
        return;
      }

      if (profile.role !== 'driver') {
        await signOut(auth!);
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This portal is strictly for registered AAGO Drivers.",
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
        title: "Invalid OTP",
        description: "The verification code is incorrect.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 font-body">
      <div id="recaptcha-container-driver"></div>
      
      <div className="mb-12 flex flex-col items-center gap-4 text-white">
        <div className="bg-primary p-4 rounded-[1.5rem] shadow-2xl rotate-3">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-black font-headline italic tracking-tighter uppercase">DRIVER PORTAL</h1>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
        <CardHeader className="space-y-3 pt-10 pb-6 text-center">
          <CardTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter text-primary">Workforce Login</CardTitle>
          <CardDescription className="font-bold text-slate-400">
            AAGO Mobility Official Driver Access
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          {hostnameError && (
            <Alert variant="destructive" className="mb-6 rounded-2xl bg-red-500/10 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Network Restriction</AlertTitle>
              <AlertDescription className="text-xs">
                Domain <strong>{currentHostname}</strong> is not authorized. Please notify the administrator.
              </AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500 ml-1">Work Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="10-digit number" 
                    className="h-14 pl-14 rounded-2xl bg-slate-800 border-none font-bold text-white placeholder:text-slate-600" 
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-primary hover:bg-primary/90 h-16 rounded-2xl text-lg font-black uppercase italic shadow-xl"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <><Smartphone className="h-6 w-6 mr-2" /> Start Shift</>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500 ml-1">Verification Code</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-16 text-center text-2xl tracking-[1em] rounded-2xl bg-slate-800 border-none font-black text-white" 
                  maxLength={6}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full bg-accent hover:bg-accent/90 h-16 rounded-2xl text-lg font-black uppercase italic shadow-xl"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Identity"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-bold text-slate-400 hover:text-white">Back to Number</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-black/20 p-6 flex flex-col gap-4 mt-4">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Return to Public Area
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
