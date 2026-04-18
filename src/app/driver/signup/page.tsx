
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
import { Loader2, Camera, RefreshCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
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
  const [captureType, setCaptureType] = useState<'profile' | 'dl' | 'aadhaar'>('profile');
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setHasCameraPermission(false);
      toast({ 
        variant: 'destructive', 
        title: 'Camera Blocked', 
        description: 'Please allow camera access in your settings.' 
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      // Set canvas to a smaller size to prevent Firestore document size limits
      const video = videoRef.current;
      const ratio = video.videoWidth / video.videoHeight;
      canvas.width = 640;
      canvas.height = 640 / ratio;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      if (captureType === 'profile') setPhotoUrl(dataUrl);
      if (captureType === 'dl') setDlPhotoUrl(dataUrl);
      if (captureType === 'aadhaar') setAadhaarPhotoUrl(dataUrl);

      // Stop stream temporarily to save battery/privacy
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
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
      toast({ title: "OTP Dispatched", description: "Please check your messages." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send code. Try again." });
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
      toast({ variant: "destructive", title: "Wrong OTP", description: "Check the code and try again." });
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
          <ConnectingDotsLogo className="h-6 w-6 text-black" />
        </div>
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-foreground text-center">DRIVER HUB</h1>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center bg-white/5 border-b border-white/5">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Registration</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Driver Onboarding</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">License No.</Label>
                  <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Aadhaar No.</Label>
                  <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="Aadhaar" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Plate Number</Label>
                  <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Plate No." className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" />
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
              <Button onClick={() => { setStep(2); getCameraPermission(); }} disabled={!fullName || !vehicleNumber || !licenseNumber || !aadhaarNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl mt-4">Next: Photo ID</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="relative aspect-[4/3] w-full bg-black rounded-[2rem] overflow-hidden border border-white/10">
                <video 
                  ref={videoRef} 
                  className={`h-full w-full object-cover ${((captureType === 'profile' && photoUrl) || (captureType === 'dl' && dlPhotoUrl) || (captureType === 'aadhaar' && aadhaarPhotoUrl)) ? 'hidden' : 'block'}`} 
                  autoPlay 
                  muted 
                  playsInline 
                />
                
                {((captureType === 'profile' && photoUrl) || (captureType === 'dl' && dlPhotoUrl) || (captureType === 'aadhaar' && aadhaarPhotoUrl)) && (
                  <img src={captureType === 'profile' ? photoUrl! : captureType === 'dl' ? dlPhotoUrl! : aadhaarPhotoUrl!} className="h-full w-full object-cover" alt="Capture Preview" />
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex justify-center gap-2">
                 <Badge onClick={() => { setCaptureType('profile'); getCameraPermission(); }} className={`cursor-pointer h-8 px-4 font-black italic uppercase transition-all ${captureType === 'profile' ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'}`}>Your Photo</Badge>
                 <Badge onClick={() => { setCaptureType('dl'); getCameraPermission(); }} className={`cursor-pointer h-8 px-4 font-black italic uppercase transition-all ${captureType === 'dl' ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'}`}>License</Badge>
                 <Badge onClick={() => { setCaptureType('aadhaar'); getCameraPermission(); }} className={`cursor-pointer h-8 px-4 font-black italic uppercase transition-all ${captureType === 'aadhaar' ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'}`}>ID Photo</Badge>
              </div>

              {hasCameraPermission === false && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-black italic uppercase text-[10px]">Camera Blocked</AlertTitle>
                  <AlertDescription className="text-[10px] font-bold opacity-70">Please allow camera access in browser settings to finish signup.</AlertDescription>
                </Alert>
              )}

              {((captureType === 'profile' && !photoUrl) || (captureType === 'dl' && !dlPhotoUrl) || (captureType === 'aadhaar' && !aadhaarPhotoUrl)) ? (
                <Button onClick={capturePhoto} disabled={hasCameraPermission === false} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-lg active:scale-95 transition-all">
                  <Camera className="mr-3 h-6 w-6" /> Take Photo
                </Button>
              ) : (
                <div className="flex gap-4">
                  <Button onClick={() => { 
                    if (captureType === 'profile') setPhotoUrl(null);
                    if (captureType === 'dl') setDlPhotoUrl(null);
                    if (captureType === 'aadhaar') setAadhaarPhotoUrl(null);
                    getCameraPermission(); 
                  }} variant="ghost" className="flex-1 text-primary font-black uppercase italic text-[10px] h-16 border-2 border-primary/20 rounded-2xl">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={() => {
                    if (photoUrl && dlPhotoUrl && aadhaarPhotoUrl) setStep(3);
                    else {
                      // Logic to switch to next missing photo
                      if (!photoUrl) setCaptureType('profile');
                      else if (!dlPhotoUrl) setCaptureType('dl');
                      else if (!aadhaarPhotoUrl) setCaptureType('aadhaar');
                      getCameraPermission();
                    }
                  }} className="flex-1 bg-primary text-black font-black uppercase italic h-16 rounded-2xl shadow-xl">
                    { (photoUrl && dlPhotoUrl && aadhaarPhotoUrl) ? "Next" : "Next Photo" }
                  </Button>
                </div>
              )}
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
                  <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Verify Phone</Button>
                ) : (
                  <div className="space-y-6">
                     <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required />
                     <Button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-xl">Finish Signup</Button>
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
