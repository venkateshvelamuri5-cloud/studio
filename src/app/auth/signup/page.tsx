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
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, updateDoc, increment } from 'firebase/firestore';
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
  const [step, setStep] = useState(1); // 1: Info, 2: Safety, 3: Phone, 4: Code
  const [loading, setLoading] = useState(false);
  
  // Student Details
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [gender, setGender] = useState('Male');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [city, setCity] = useState('Vizag');
  const [referredByCode, setReferredByCode] = useState('');
  
  // Auth
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (auth && !recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
        size: 'invisible',
      });
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
      setStep(4);
      toast({ title: "Code Sent" });
    } catch (error: any) {
      console.error(error);
      let title = "Error";
      let message = "Could not send code. Try again later.";
      
      if (error.code === 'auth/billing-not-enabled') {
        title = "Billing Required";
        message = "Firebase Phone Auth requires a billing account (Blaze plan) to be enabled in the Firebase Console.";
      }
      
      toast({ variant: "destructive", title, description: message });
      
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-signup', { size: 'invisible' });
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
      
      const referralCode = `AAGO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Logic to reward the referrer
      if (referredByCode.trim()) {
        const q = query(collection(db, 'users'), where('referralCode', '==', referredByCode.trim().toUpperCase()));
        const referrerSnap = await getDocs(q);
        if (!referrerSnap.empty) {
          const referrerDoc = referrerSnap.docs[0];
          await updateDoc(doc(db, 'users', referrerDoc.id), {
            loyaltyPoints: increment(50)
          });
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        fullName,
        studentId,
        gender,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        city,
        referralCode,
        role: 'rider',
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 font-body safe-area-inset">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
          <ConnectingDotsLogo className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-primary">JOIN AAGO</h1>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center border-b border-white/5 bg-white/5">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-none">Create Account</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Step {step} of 4</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8 sm:px-10">
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rahul" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 text-foreground font-black italic rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Student ID No.</Label>
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="12345" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Referral Code (Optional)</Label>
                <Input value={referredByCode} onChange={(e) => setReferredByCode(e.target.value)} placeholder="AAGO-XXXX" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base uppercase" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !studentId} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl mt-2 active:scale-95 transition-all">Next</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Safe Contact Name</Label>
                <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Parent Name" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Safe Phone Number</Label>
                <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="0000000000" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your City Hub</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 text-foreground font-black italic rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="Vizag">Vizag</SelectItem>
                    <SelectItem value="Vizianagaram">Vizianagaram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(3)} disabled={!emergencyName || !emergencyPhone} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl mt-2 active:scale-95 transition-all">Last Step</Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-lg z-20">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="0000000000" 
                    className="h-16 pl-20 rounded-xl bg-white/5 border-white/10 font-black italic text-xl relative z-10" 
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Request Code"}
              </Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-3 text-center">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verification Code</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="000000" 
                  className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" 
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Me"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 bg-white/5 p-8 border-t border-white/5">
          <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">
            Have a profile?{' '}
            <Link href="/auth/login" className="text-primary font-black hover:underline italic">Sign In</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}