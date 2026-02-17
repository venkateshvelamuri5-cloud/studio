
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Smartphone, CheckCircle2, Loader2, ArrowLeft, Camera, UserCircle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DriverSignupPage() {
  const [step, setStep] = useState(1); // 1: Profile, 2: Vehicle, 3: Photo, 4: Phone, 5: OTP
  const [loading, setLoading] = useState(false);
  
  // Profile
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Vizag');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  // Vehicle
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');

  // Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions to take your ID photo.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoUrl(dataUrl);
        // Stop camera stream
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
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
      setStep(5);
      toast({ title: "Code Sent", description: `Verification code sent to +91 ${phoneNumber}` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Network Error", description: "Could not send verification code." });
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
        photoUrl: photoUrl || `https://picsum.photos/seed/${user.uid}/400/400`,
        role: 'driver',
        status: 'offline',
        totalTrips: 0,
        totalEarnings: 0,
        weeklyEarnings: 0,
        payoutHistory: [],
        createdAt: new Date().toISOString(),
      };

      await setDoc(userRef, driverData);
      toast({ title: "Welcome to Aago!", description: "Your driver account is now active." });
      router.push('/driver');
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Incorrect Code", description: "The verification code you entered is invalid." });
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
          <h1 className="text-4xl font-black font-headline italic tracking-tighter uppercase leading-none text-white">JOIN AAGO</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-2">Driver Application Hub</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[3rem] overflow-hidden bg-slate-950/50 backdrop-blur-xl border border-white/5">
        <CardHeader className="space-y-3 pt-12 pb-8 text-center">
          <CardTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter text-white">Driver Signup</CardTitle>
          <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest italic">
            Become an official mobility partner
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-10 pb-8">
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Your Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Driving License Number</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="DL-XXXXXXXX" className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Your Main City</Label>
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
              <Button onClick={() => setStep(2)} disabled={!fullName || !licenseNumber} className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl">Next: Vehicle Details</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Vehicle Number</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="AP-31-XX-XXXX" className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="h-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="Bus">Bus (Large)</SelectItem>
                    <SelectItem value="Mini-Bus">Mini-Bus (Medium)</SelectItem>
                    <SelectItem value="Van">Van (Small)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setStep(3); startCamera(); }} disabled={!vehicleNumber} className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl">Next: Profile Photo</Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Back</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 text-center">
              <div className="relative aspect-square max-w-[280px] mx-auto bg-slate-900 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-white/10">
                {!photoUrl ? (
                  <>
                    <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       {!hasCameraPermission && <Camera className="h-12 w-12 text-slate-700" />}
                    </div>
                  </>
                ) : (
                  <img src={photoUrl} className="h-full w-full object-cover" alt="Profile Preview" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              {!photoUrl ? (
                <Button onClick={capturePhoto} className="w-full bg-primary text-slate-950 h-16 rounded-2xl font-black uppercase italic">
                  Take Photo
                </Button>
              ) : (
                <Button onClick={() => { setPhotoUrl(null); startCamera(); }} variant="outline" className="w-full h-16 rounded-2xl font-black uppercase italic border-white/10 text-slate-400">
                  Retake Photo
                </Button>
              )}
              
              <Button onClick={() => setStep(4)} disabled={!photoUrl} className="w-full bg-accent text-white h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl">
                Continue to Phone
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Back</Button>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSendOtp} className="space-y-10 text-center animate-in zoom-in-95 duration-500">
              <Smartphone className="h-20 w-20 text-primary mx-auto opacity-80" />
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-500">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="10-digit number" className="h-16 pl-16 rounded-2xl bg-slate-900 border-white/5 font-black text-white text-lg italic" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-accent hover:bg-accent/90 text-white h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl">{loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Number"}</Button>
              <Button variant="ghost" onClick={() => setStep(3)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Back</Button>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={handleVerifyOtp} className="space-y-10 text-center animate-in zoom-in-95 duration-500">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto opacity-80" />
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Enter Verification Code</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="h-20 text-center text-3xl tracking-[0.5em] rounded-2xl bg-slate-900 border-white/5 font-black text-white" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary hover:bg-primary/90 text-slate-950 h-18 rounded-2xl text-lg font-black uppercase italic shadow-2xl">Complete Signup</Button>
              <Button variant="ghost" onClick={() => setStep(4)} className="w-full font-black text-slate-500 hover:text-white uppercase italic text-[10px] tracking-widest">Resend Code</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-slate-950/80 p-8 flex flex-col gap-4">
          <Link href="/driver/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-primary transition-colors flex items-center gap-3">
            <ArrowLeft className="h-4 w-4" /> Already have an account? Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
