
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, RefreshCcw, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function DriverSignupPage() {
  const [step, setStep] = useState(1); // 1: Profile, 2: Vehicle, 3: Profile Photo, 4: DL, 5: Aadhaar, 6: Phone, 7: Code
  const [loading, setLoading] = useState(false);
  
  // Profile
  const [fullName, setFullName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  
  // Vehicle
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('7 Seater');
  const [seatingCapacity, setSeatingCapacity] = useState('7');

  // Photos & Docs
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dlPhotoUrl, setDlPhotoUrl] = useState<string | null>(null);
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Auth
  const [phoneNumber, setPhoneNumber] = useState('');
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
        const container = document.getElementById('recaptcha-container-signup-driver');
        if (container) {
          try {
            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-signup-driver', {
              size: 'invisible',
            });
          } catch (error) {
            console.error("reCAPTCHA initialization failed", error);
          }
        }
      }
    };
    const timeout = setTimeout(initRecaptcha, 500);
    return () => {
      clearTimeout(timeout);
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, [auth]);

  const getCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Camera Required', description: 'Enable camera for document verification.' });
    }
  };

  const capturePhoto = (type: 'profile' | 'dl' | 'aadhaar') => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      if (type === 'profile') setPhotoUrl(dataUrl);
      if (type === 'dl') setDlPhotoUrl(dataUrl);
      if (type === 'aadhaar') setAadhaarPhotoUrl(dataUrl);

      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !recaptchaRef.current) return;
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current);
      setConfirmationResult(result);
      setStep(7);
      toast({ title: "Code Sent" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Try again later." });
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
      const referralCode = `FLEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
        fullName, licenseNumber, vehicleNumber, vehicleType,
        seatingCapacity: parseInt(seatingCapacity),
        aadhaarNumber,
        photoUrl: photoUrl,
        dlPhotoUrl: dlPhotoUrl,
        aadhaarPhotoUrl: aadhaarPhotoUrl,
        referralCode,
        role: 'driver', 
        isVerified: false,
        status: 'offline', 
        totalEarnings: 0, 
        createdAt: new Date().toISOString(),
      });
      router.push('/driver');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid Code" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 font-body safe-area-inset">
      <div id="recaptcha-container-signup-driver"></div>
      
      <div className="mb-6 flex flex-col items-center gap-3 animate-in fade-in duration-700">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/30">
          <ConnectingDotsLogo className="h-6 w-6 text-black" />
        </div>
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-foreground text-center">FLEET REGISTRATION</h1>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center border-b border-white/5 bg-white/5">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-none">Operator Signup</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Step {step} of 7</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8 sm:px-10">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">License ID</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License No." className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Aadhaar Number</Label>
                <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="12-digit number" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !licenseNumber || !aadhaarNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl mt-4 active:scale-95 transition-all">Next: Vehicle</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Plate Number</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Vehicle Number" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                <Select value={vehicleType} onValueChange={(val) => {
                  setVehicleType(val);
                  setSeatingCapacity(val === '5 Seater' ? '5' : '7');
                }}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 text-foreground font-black italic rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="5 Seater">5 Seater</SelectItem>
                    <SelectItem value="7 Seater">7 Seater</SelectItem>
                    <SelectItem value="Mini-Bus">Mini Bus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setStep(3); getCameraPermission(); }} disabled={!vehicleNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl mt-4 active:scale-95 transition-all">Next: Profile Photo</Button>
            </div>
          )}

          {[3, 4, 5].includes(step) && (
            <div className="space-y-6 text-center animate-in slide-in-from-right-8">
              <div className="relative aspect-[4/3] w-full bg-black rounded-[2rem] overflow-hidden border border-white/10">
                {((step === 3 && !photoUrl) || (step === 4 && !dlPhotoUrl) || (step === 5 && !aadhaarPhotoUrl)) ? (
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                ) : (
                  <img src={step === 3 ? photoUrl! : step === 4 ? dlPhotoUrl! : aadhaarPhotoUrl!} className="h-full w-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">
                {step === 3 ? "Profile Face Photo" : step === 4 ? "Driving License Scan" : "Aadhaar Card Scan"}
              </p>
              {((step === 3 && !photoUrl) || (step === 4 && !dlPhotoUrl) || (step === 5 && !aadhaarPhotoUrl)) ? (
                <Button onClick={() => capturePhoto(step === 3 ? 'profile' : step === 4 ? 'dl' : 'aadhaar')} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-lg active:scale-95 transition-all"><Camera className="mr-2" /> Snap Capture</Button>
              ) : (
                <div className="flex gap-4">
                  <Button onClick={() => { 
                    if (step === 3) setPhotoUrl(null);
                    if (step === 4) setDlPhotoUrl(null);
                    if (step === 5) setAadhaarPhotoUrl(null);
                    getCameraPermission(); 
                  }} variant="ghost" className="flex-1 text-primary font-black uppercase text-[10px] tracking-widest h-16 border border-primary/20 rounded-2xl"><RefreshCcw className="mr-2 h-4 w-4" /> Retake</Button>
                  <Button onClick={() => {
                    if (step === 5) setStep(6);
                    else {
                      setStep(step + 1);
                      getCameraPermission();
                    }
                  }} className="flex-1 bg-primary text-black font-black uppercase italic h-16 rounded-2xl">Confirm</Button>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <form onSubmit={handleSendOtp} className="space-y-6 animate-in slide-in-from-right-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-lg z-20">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0000000000" className="h-16 pl-20 rounded-xl bg-white/5 border-white/10 font-black italic text-xl relative z-10" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl active:scale-95 transition-all">Request Code</Button>
            </form>
          )}

          {step === 7 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in slide-in-from-right-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verification Code</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-xl active:scale-95 transition-all">Complete Signup</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-white/5 p-8 flex flex-col gap-4 border-t border-white/5">
          <Link href="/driver/login" className="text-[10px] font-black uppercase italic text-primary hover:underline tracking-widest text-center w-full">Operator Login</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
