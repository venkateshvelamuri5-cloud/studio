
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Smartphone, CheckCircle2, Loader2, ArrowLeft, Bus } from 'lucide-react';
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
      toast({ title: "Authorization Signal", description: `Transmitted to +91 ${phoneNumber}` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Transmission Failed", description: "Network uplink failed." });
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
      toast({ title: "Welcome to Aago Fleet" });
      router.push('/driver');
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Invalid Auth Code" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] p-6 font-body">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-12 flex flex-col items-center gap-6 text-white animate-in fade-in duration-1000">
        <div className="bg-primary p-5 rounded-[1.75rem] shadow-[0_0_40px_rgba(59,130,246,0.3)] rotate-3">
          <ShieldCheck className="h-12 w-12 text-slate-950" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black font-headline italic tracking-tighter uppercase leading-none">JOIN THE FLEET</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-2">Workforce Onboarding Terminal</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[3rem] overflow-hidden bg-slate-950/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="space-y-3 pt-12 pb-8 text-center">
          <CardTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter text-white">Hub Induction</CardTitle>
          <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest italic">
            Official Mobility Partner Registration
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-10 pb-8">
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Legal Identity Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Master License Number</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="DL-XXXXXXXX" className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Primary Hub Region</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="Vizag">Visakhapatnam (Vizag)</SelectItem>
                    <SelectItem value="Vizianagaram">Vizianagaram (VZM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !licenseNumber} className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl active:scale-95 transition-all">Next: Asset Specs</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Vehicle Asset ID</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="AP-31-XX-XXXX" className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Asset Category Protocol</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="Bus">Class A (Bus)</SelectItem>
                    <SelectItem value="Mini-Bus">Class B (Mini-Bus)</SelectItem>
                    <SelectItem value="Van">Class C (Van)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(3)} disabled={!vehicleNumber} className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl active:scale-95 transition-all">Next: Verification</Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Back to Profile</Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSendOtp} className="space-y-10 text-center animate-in zoom-in-95 duration-500">
              <Smartphone className="h-20 w-20 text-primary mx-auto opacity-80" />
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Handset Number</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-500">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="10-digit number" className="h-16 pl-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-accent hover:bg-accent/90 text-white h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Transmit OTP"}</Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Back to Asset</Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleVerifyOtp} className="space-y-10 text-center animate-in zoom-in-95 duration-500">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto opacity-80" />
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Verification Sequence</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="h-20 text-center text-3xl tracking-[0.5em] rounded-2xl bg-slate-900 border-white/5 font-black text-white" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl active:scale-95 transition-all">Finalize Onboarding</Button>
              <Button variant="ghost" onClick={() => setStep(3)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Resend Signal</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-slate-950/80 p-8 flex flex-col gap-4">
          <Link href="/driver/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-primary transition-colors flex items-center gap-3">
            <ArrowLeft className="h-4 w-4" /> Already Registered? Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
