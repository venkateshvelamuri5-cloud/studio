
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, RefreshCcw, CheckCircle2, AlertCircle, Upload, FileText } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function DriverSignupPage() {
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('7 Seater');
  
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dlPhotoUrl, setDlPhotoUrl] = useState<string | null>(null);
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

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

  const setupRecaptcha = () => {
    if (!auth) return;
    try {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
      }
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container-signup-driver', {
        size: 'invisible',
        callback: () => {}
      });
    } catch (error) {
      console.error("Recaptcha error:", error);
    }
  };

  const getCameraPermission = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setHasCameraPermission(false);
      toast({ 
        variant: 'destructive', 
        title: 'Camera Error', 
        description: 'Please let us use your camera in settings.' 
      });
    }
  };

  useEffect(() => {
    if (step === 2 && !photoUrl) {
      getCameraPermission();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [step, photoUrl]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ratio = video.videoWidth / video.videoHeight;
      canvas.width = 640;
      canvas.height = 640 / ratio;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      setPhotoUrl(dataUrl);

      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'dl' | 'aadhaar') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'dl') setDlPhotoUrl(reader.result as string);
      else setAadhaarPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);

    try {
      setupRecaptcha();
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current!);
      setConfirmationResult(result);
      setStep(3); 
      toast({ title: "Code Sent", description: "Check your messages." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Try again in a bit." });
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
        licenseNumber, 
        vehicleNumber, 
        vehicleType,
        seatingCapacity: 7,
        aadhaarNumber,
        photoUrl,
        dlPhotoUrl,
        aadhaarPhotoUrl,
        referralCode,
        role: 'driver', 
        isVerified: false,
        status: 'offline', 
        totalEarnings: 0, 
        createdAt: new Date().toISOString(),
      });
      router.push('/driver');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Wrong Code", description: "Try again." });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-body safe-area-inset">
      <div id="recaptcha-container-signup-driver"></div>
      
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/30">
          <Logo className="h-6 w-6 text-black" />
        </div>
        <h1 className="text-xl font-black italic uppercase text-foreground text-center">Driver Registration</h1>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Join as a Driver</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">ID Check</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Name" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">License No.</Label>
                  <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ID No.</Label>
                  <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="ID" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Plate Number</Label>
                  <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Number" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Car Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border-white/10">
                      <SelectItem value="5 Seater">5 Seater</SelectItem>
                      <SelectItem value="7 Seater">7 Seater</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !vehicleNumber || !licenseNumber || !aadhaarNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic mt-4">Next: Take Photo</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-center block tracking-widest text-muted-foreground">Take a Photo of Yourself</Label>
                 <div className="relative aspect-square w-48 mx-auto bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                    {!photoUrl ? (
                      <>
                        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                      </>
                    ) : (
                      <img src={photoUrl} className="h-full w-full object-cover" />
                    )}
                 </div>
                 {!photoUrl ? (
                   <Button onClick={capturePhoto} className="w-full h-12 bg-primary text-black rounded-xl font-black uppercase italic text-xs"><Camera className="mr-2 h-4 w-4" /> Take Photo</Button>
                 ) : (
                   <Button onClick={() => setPhotoUrl(null)} variant="ghost" className="w-full text-primary font-black uppercase italic text-[10px] h-10 border border-primary/20 rounded-xl"><RefreshCcw className="mr-2 h-3 w-3" /> Re-take Photo</Button>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">License Photo</Label>
                    <div className="relative h-32 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                       {dlPhotoUrl ? (
                         <img src={dlPhotoUrl} className="h-full w-full object-cover rounded-xl" />
                       ) : (
                         <div className="flex flex-col items-center gap-2">
                           <Upload className="h-5 w-5 opacity-20" />
                           <span className="text-[8px] font-black uppercase opacity-40">Choose File</span>
                         </div>
                       )}
                       <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'dl')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">ID Photo</Label>
                    <div className="relative h-32 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                       {aadhaarPhotoUrl ? (
                         <img src={aadhaarPhotoUrl} className="h-full w-full object-cover rounded-xl" />
                       ) : (
                         <div className="flex flex-col items-center gap-2">
                           <Upload className="h-5 w-5 opacity-20" />
                           <span className="text-[8px] font-black uppercase opacity-40">Choose File</span>
                         </div>
                       )}
                       <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'aadhaar')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                 </div>
              </div>

              <Button onClick={() => setStep(3)} disabled={!photoUrl || !dlPhotoUrl || !aadhaarPhotoUrl} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Confirm Photos</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-lg z-20">+91</span>
                    <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0000000000" className="h-16 pl-20 rounded-xl bg-white/5 border-white/10 font-black italic text-xl" required />
                  </div>
                </div>
                {!confirmationResult ? (
                  <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic">Send Code</Button>
                ) : (
                  <div className="space-y-6">
                     <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Code" className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required />
                     <Button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic">Verify & Register</Button>
                  </div>
                )}
              </form>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-white/5 p-8 border-t border-white/5">
          <Link href="/driver/login" className="text-[10px] font-black uppercase italic text-primary hover:underline text-center w-full">Already registered? Login</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
