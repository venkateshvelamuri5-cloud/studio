
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function SignupPage() {
  const [step, setStep] = useState(1); // 1: Info & Phone, 2: OTP
  const [loading, setLoading] = useState(false);
  
  // Profile Details
  const [fullName, setFullName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [gender, setGender] = useState('Male');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Auth
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!authLoading && user && db) {
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (snap.exists()) {
          const profile = snap.data();
          if (profile.role === 'driver') router.push('/driver');
          else router.push('/student');
        }
      });
    }
  }, [user, authLoading, router, db]);

  useEffect(() => {
    const initRecaptcha = () => {
      if (auth && !recaptchaRef.current) {
        const container = document.getElementById('recaptcha-container-signup');
        if (container) {
          try {
            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
              size: 'invisible',
            });
          } catch (error) {
            console.error("reCAPTCHA failed", error);
          }
        }
      }
    };
    const timeout = setTimeout(initRecaptcha, 500);
    return () => clearTimeout(timeout);
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
      toast({ title: "Verification Code Sent" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not send verification code. Try again later." });
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
      const referralCode = `AAGO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
        fullName,
        identityNumber,
        gender,
        emergencyContactPhone: emergencyPhone,
        referralCode,
        role: 'rider',
        isVerified: true,
        loyaltyPoints: 0, 
        createdAt: new Date().toISOString(),
      });

      router.push('/student');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid Code" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 font-body safe-area-inset">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/30">
          <ConnectingDotsLogo className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-xl font-black italic uppercase text-foreground">AAGO Hub</h1>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
        <CardHeader className="pt-8 pb-4 text-center">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-foreground">Join Hub</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Create your Hub profile</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8 sm:px-10">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your name" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-14 bg-white/5 border-white/10 font-black italic rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border-white/10">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">ID Number</Label>
                   <Input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} placeholder="Govt ID" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-lg z-20">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0000000000" className="h-16 pl-20 rounded-xl bg-white/5 border-white/10 font-black italic text-xl" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || !fullName || phoneNumber.length < 10} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Phone"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 text-center block">Verification Code</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify & Join"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-white/5 p-8 border-t border-white/5">
          <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest w-full">
            Member already? <Link href="/auth/login" className="text-primary font-black hover:underline italic">Login</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
