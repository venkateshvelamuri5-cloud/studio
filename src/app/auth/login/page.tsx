
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, ArrowLeft, Smartphone, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  }, [auth]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep(2);
    } catch (error: any) {
      console.error("SMS Error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);

    try {
      await confirmationResult.confirm(otp);
      router.push('/student');
    } catch (error: any) {
      console.error("OTP Error", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 p-4 font-body">
      <div id="recaptcha-container"></div>
      
      <div className="mb-12 flex flex-col items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-3 rounded-[1.25rem] shadow-xl group-hover:rotate-12 transition-transform">
            <Bus className="h-8 w-8 text-white" />
          </div>
          <span className="text-4xl font-black text-primary font-headline italic tracking-tight uppercase">AAGO</span>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-none rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="space-y-3 pt-10 pb-6">
          <CardTitle className="text-3xl font-black text-center font-headline uppercase italic tracking-tighter text-primary">Welcome Back</CardTitle>
          <CardDescription className="text-center font-bold text-muted-foreground">
            Sign in with your registered phone number
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="10-digit number" 
                    className="h-14 pl-14 rounded-2xl bg-secondary/30 border-none font-bold" 
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-accent hover:bg-accent/90 h-16 rounded-2xl text-lg font-black uppercase italic shadow-xl shadow-accent/20"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <><Smartphone className="h-6 w-6 mr-2" /> Send OTP</>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Enter 6-Digit OTP</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-16 text-center text-2xl tracking-[1em] rounded-2xl bg-secondary/30 border-none font-black" 
                  maxLength={6}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full bg-primary hover:bg-primary/90 h-16 rounded-2xl text-lg font-black uppercase italic shadow-xl shadow-primary/20"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify & Sign In"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-bold">Change Number</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-6 bg-secondary/20 p-8 mt-4">
          <p className="text-sm text-center font-bold text-muted-foreground">
            New to Aago?{' '}
            <Link href="/auth/signup" className="text-primary font-black hover:underline italic">Create Account</Link>
          </p>
          <Link href="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
