"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Emergency, 3: Phone, 4: OTP
  const [loading, setLoading] = useState(false);
  
  // Student Details
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [gender, setGender] = useState('Male');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [city, setCity] = useState('Vizag');
  
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
      toast({ title: "OTP Sent", description: "Identity signal transmitted." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Network error. Try again." });
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

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        fullName,
        collegeName,
        studentId,
        gender,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        city,
        role: 'rider',
        loyaltyPoints: 100,
        createdAt: new Date().toISOString(),
      });

      router.push('/student');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid Protocol", description: "Verification failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 font-body safe-area-inset">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-6 flex flex-col items-center gap-3 animate-in fade-in duration-1000">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
          <Bus className="h-6 w-6 text-black" />
        </div>
        <h1 className="text-xl font-black font-headline italic uppercase tracking-tighter text-primary">SCHOLAR REGISTRATION</h1>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center border-b border-white/5 bg-white/5">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-none">Identity Sequence</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Step {step} of 4</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8 sm:px-10">
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-500 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">College ID / Reg Number</Label>
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="ID-12345" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !studentId} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl mt-2">Next Protocol</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-500 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Emergency Contact Name</Label>
                <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="e.g. Parent Name" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Emergency Contact Phone</Label>
                <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="0000000000" className="h-14 rounded-xl bg-white/5 border-white/10 font-black italic text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Home Hub (City)</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 text-foreground font-black italic rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="Vizag">Global Hub A</SelectItem>
                    <SelectItem value="Vizianagaram">Global Hub B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(3)} disabled={!emergencyName || !emergencyPhone} className="w-full bg-primary text-black h-16 rounded-2xl text-lg font-black uppercase italic shadow-2xl mt-2">Final Step</Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-[10px] font-black uppercase italic text-muted-foreground tracking-widest">Go Back</Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSendOtp} className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Personal Handset</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary text-lg">+91</span>
                  <Input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="0000000000" 
                    className="h-16 pl-16 rounded-xl bg-white/5 border-white/10 font-black italic text-xl" 
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Request Access Code"}
              </Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="space-y-3 text-center">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verify Identity Code</Label>
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
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Initiate Hub Session"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 bg-white/5 p-8 border-t border-white/5">
          <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">
            Profile Exists?{' '}
            <Link href="/auth/login" className="text-primary font-black hover:underline italic">Sign In</Link>
          </p>
          <Link href="/" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Cancel Registration
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
