
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus, ArrowLeft, Smartphone, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DriverSignupPage() {
  const [step, setStep] = useState(1); // 1: Profile, 2: Vehicle, 3: Phone, 4: OTP
  const [loading, setLoading] = useState(false);
  
  // Profile
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Vizag');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  // Vehicle
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  
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
      toast({ title: "OTP Sent", description: `Sent to +91 ${phoneNumber}` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Network Error", description: "Failed to send OTP." });
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
      const driverData = {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        fullName,
        city,
        licenseNumber,
        vehicleNumber,
        vehicleType,
        role: 'driver',
        status: 'offline',
        totalTrips: 0,
        createdAt: new Date().toISOString(),
      };

      await setDoc(userRef, driverData);
      toast({ title: "Welcome to Aago workforce!" });
      router.push('/driver');
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Invalid Code" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 font-body">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-8 flex flex-col items-center gap-4 text-white">
        <div className="bg-primary p-4 rounded-[1.5rem] shadow-2xl rotate-3">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-black font-headline italic tracking-tighter uppercase">JOIN THE FLEET</h1>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
        <CardHeader className="space-y-2 pt-10 pb-6 text-center">
          <CardTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter text-primary">Onboarding</CardTitle>
          <CardDescription className="font-bold text-slate-400">
            Official Aago Mobility Partner Registration
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Legal Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-14 rounded-2xl bg-slate-800 border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Driving License Number</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="DL-XXXXXXXX" className="h-14 rounded-2xl bg-slate-800 border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Base City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-800 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vizag">Visakhapatnam (Vizag)</SelectItem>
                    <SelectItem value="Vizianagaram">Vizianagaram (VZM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !licenseNumber} className="w-full bg-primary hover:bg-primary/90 h-16 rounded-2xl text-lg font-black uppercase italic">Next: Vehicle Info</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Vehicle Number</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="AP-31-XX-XXXX" className="h-14 rounded-2xl bg-slate-800 border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Vehicle Category</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-800 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bus">Large Shuttle (Bus)</SelectItem>
                    <SelectItem value="Mini-Bus">Medium Shuttle (Mini-Bus)</SelectItem>
                    <SelectItem value="Van">Small Shuttle (Van)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(3)} disabled={!vehicleNumber} className="w-full bg-primary hover:bg-primary/90 h-16 rounded-2xl text-lg font-black uppercase italic">Next: Verification</Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-bold text-slate-400">Back</Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSendOtp} className="space-y-6 text-center">
              <Smartphone className="h-16 w-16 text-primary mx-auto mb-4" />
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="10-digit number" className="h-14 pl-14 rounded-2xl bg-slate-800 border-none font-bold" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-accent hover:bg-accent/90 h-16 rounded-2xl text-lg font-black uppercase italic">{loading ? <Loader2 className="animate-spin" /> : "Send OTP"}</Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full font-bold text-slate-400">Back</Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Verification Code</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="h-16 text-center text-2xl tracking-[1em] rounded-2xl bg-slate-800 border-none font-black" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary hover:bg-primary/90 h-16 rounded-2xl text-lg font-black uppercase italic">Complete Onboarding</Button>
              <Button variant="ghost" onClick={() => setStep(3)} className="w-full font-bold text-slate-400">Back</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-black/20 p-6 flex flex-col gap-4 mt-4">
          <Link href="/driver/login" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Already registered? Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
