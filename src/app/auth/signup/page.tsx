
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus, ArrowLeft, Smartphone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignupPage() {
  const [step, setStep] = useState(1); // 1: Info, 2: Phone, 3: OTP
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [city, setCity] = useState('Vizag');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
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
    setHostnameError(false);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current);
      setConfirmationResult(result);
      setStep(3);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to +91 ${phoneNumber}`,
      });
    } catch (error: any) {
      console.error("SMS Error", error);
      if (error.code === 'auth/captcha-check-failed' || error.message?.includes('Hostname match not found')) {
        setHostnameError(true);
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: error.message || "Could not send OTP. Please try again.",
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

      const userRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        fullName,
        collegeName,
        studentId,
        city,
        role: 'rider',
        createdAt: new Date().toISOString(),
      };

      setDoc(userRef, userData)
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: userData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      router.push('/student');
    } catch (error: any) {
      console.error("OTP Error", error);
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "The code you entered is incorrect. Please check and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 p-4 font-body">
      <div id="recaptcha-container"></div>
      
      <div className="mb-8 flex flex-col items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-3 rounded-[1.25rem] shadow-xl group-hover:rotate-12 transition-transform">
            <Bus className="h-8 w-8 text-white" />
          </div>
          <span className="text-4xl font-black text-primary font-headline italic tracking-tight uppercase">AAGO</span>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="space-y-2 pt-10 pb-6">
          <CardTitle className="text-3xl font-black text-center font-headline uppercase italic tracking-tighter text-primary">Join the Rush</CardTitle>
          <CardDescription className="text-center font-bold text-muted-foreground">
            Create your Aago Student account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8">
          {hostnameError && (
            <Alert variant="destructive" className="mb-6 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription className="text-xs">
                Hostname mismatch. Please add <strong>{currentHostname || 'your-hostname'}</strong> to &quot;Authorized Domains&quot; in your Firebase Console (Authentication &gt; Settings).
              </AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" className="h-14 rounded-2xl bg-secondary/30 border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">College / University</Label>
                <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="e.g. GITAM, AU" className="h-14 rounded-2xl bg-secondary/30 border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Student ID Number</Label>
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Enter ID number" className="h-14 rounded-2xl bg-secondary/30 border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Base City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-14 rounded-2xl bg-secondary/30 border-none font-bold">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vizag">Visakhapatnam (Vizag)</SelectItem>
                    <SelectItem value="Vizianagaram">Vizianagaram (VZM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!fullName || !collegeName}
                className="w-full bg-primary hover:bg-primary/90 h-16 rounded-2xl text-lg font-black uppercase italic shadow-xl shadow-primary/20"
              >
                Next Step
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2 text-center mb-4">
                <Smartphone className="h-12 w-12 text-accent mx-auto mb-2" />
                <p className="text-sm font-bold">Verification needed for {fullName}</p>
              </div>
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
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Send OTP"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-bold">Back to Info</Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2 text-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-bold">Enter the code sent to +91 {phoneNumber}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Verification Code</Label>
                <Input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="6-digit OTP" 
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
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full font-bold">Change Number</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-6 bg-secondary/20 p-8 mt-4">
          <p className="text-sm text-center font-bold text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-black hover:underline italic">Sign In</Link>
          </p>
          <Link href="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
