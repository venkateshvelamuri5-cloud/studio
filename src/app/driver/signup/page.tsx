
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, RefreshCcw, CheckCircle2, Upload } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const [success, setSuccess] = useState(false);
  
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
    if (!authLoading && user && db && !success) {
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (snap.exists()) {
          const profile = snap.data();
          if (profile.role === 'driver') router.push('/driver');
          else router.push('/student');
        }
      });
    }
  }, [user, authLoading, router, db, success]);

  // Handle reCAPTCHA cleanup
  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!auth) return;
    if (recaptchaVerifier.current) return;
    
    try {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container-signup-driver', {
        size: 'invisible',
        callback: () => {}
      });
    } catch (error) {
      console.error("Recaptcha error:", error);
    }
  };

  // Camera permission logic
  useEffect(() => {
    if (step === 2 && !photoUrl) {
      const getCameraPermission = async () => {
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
            description: 'Please enable camera permissions in your browser settings to take your ID photo.',
          });
        }
      };

      getCameraPermission();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [step, photoUrl, toast]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = 400; // Efficient size for Firestore
      canvas.height = 300;
      canvas.getContext('2d')?.drawImage(video, 0, 0, 400, 300);
      const dataUri = canvas.toDataURL('image/jpeg', 0.6); // Higher compression
      setPhotoUrl(dataUri);
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'dl' | 'aadhaar') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      // Basic compression by using a temporary canvas if needed could go here
      // For now, we'll just store the string but warn the user if it's too big
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "File too big", description: "Please upload a smaller image (under 800KB)." });
        return;
      }
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
      const numericPart = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+91${numericPart}`;
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current!);
      setConfirmationResult(result);
      setStep(3);
      toast({ title: "OTP sent successfully." });
    } catch (error: any) {
      console.error("Auth Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Code Failed", 
        description: error.code === 'auth/captcha-check-failed' 
          ? "Please add this domain to Firebase Authorized Domains."
          : "Could not send code. Check your number." 
      });
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
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
      
      // Save profile with explicit flags for admin verification
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
        fullName,
        licenseNumber,
        vehicleNumber,
        vehicleType,
        aadhaarNumber,
        photoUrl: photoUrl || null,
        dlPhotoUrl: dlPhotoUrl || null,
        aadhaarPhotoUrl: aadhaarPhotoUrl || null,
        role: 'driver',
        isVerified: false,
        isBlocked: false,
        status: 'offline',
        totalEarnings: 0,
        createdAt: new Date().toISOString(),
      });
      
      setSuccess(true);
      toast({ title: "Profile Submitted", description: "Admin will review your documents shortly." });
    } catch (error: any) {
      console.error("Verify Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Signup Failed", 
        description: error.code === 'permission-denied' 
          ? "Database error. Please try again." 
          : "Invalid OTP code. Please check and try again." 
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-8 animate-in fade-in">
       <div className="h-24 w-24 bg-primary text-black rounded-full flex items-center justify-center shadow-2xl"><CheckCircle2 className="h-12 w-12" /></div>
       <div className="space-y-4">
          <h1 className="text-4xl font-black italic uppercase text-primary leading-none">Registration Done!</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed px-10">Your account is now under review. Admin will verify your ID before you can start picking trips. This usually takes 2-4 hours.</p>
       </div>
       <Link href="/driver/login" className="w-full max-w-xs"><Button className="w-full h-16 bg-white/5 rounded-2xl border border-white/10 font-black uppercase italic">Go to Login</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-body safe-area-inset">
      <div id="recaptcha-container-signup-driver"></div>
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/30"><Logo className="h-6 w-6 text-black" /></div>
        <h1 className="text-xl font-black italic uppercase text-foreground text-center tracking-tighter">DRIVER HUB</h1>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center border-b border-white/5">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter leading-none">Join AAGO</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2 italic">Professional Identity Check</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Name" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">License No.</Label><Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Aadhaar No.</Label><Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="ID" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Plate No.</Label><Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Number" className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl" /></div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Car Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 font-black italic rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border-white/10"><SelectItem value="5 Seater">5 Seater</SelectItem><SelectItem value="7 Seater">7 Seater</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !vehicleNumber || !licenseNumber || !aadhaarNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic mt-4 shadow-xl active:scale-95 transition-all">Next: Take Photo</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in">
              <div className="space-y-4 text-center">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selfie for ID Card</Label>
                 <div className="relative aspect-square w-48 mx-auto bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                    <video ref={videoRef} className={`h-full w-full object-cover ${photoUrl ? 'hidden' : 'block'}`} autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {photoUrl && <img src={photoUrl} className="h-full w-full object-cover" />}
                    
                    {hasCameraPermission === false && (
                      <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60">
                        <p className="text-[10px] font-black uppercase text-destructive italic">Camera access required</p>
                      </div>
                    )}
                 </div>
                 
                 {!photoUrl ? (
                   <Button onClick={capturePhoto} disabled={hasCameraPermission !== true} className="w-full h-12 bg-primary text-black rounded-xl font-black uppercase italic text-xs">
                     Capture Selfie
                   </Button>
                 ) : (
                   <Button onClick={() => setPhotoUrl(null)} variant="ghost" className="w-full text-primary font-black uppercase italic text-[10px] border border-primary/20 rounded-xl h-10">
                     Re-take Photo
                   </Button>
                 )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">License Photo</Label>
                    <div className="relative h-32 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-2">
                       {dlPhotoUrl ? <img src={dlPhotoUrl} className="h-full w-full object-cover rounded-xl" /> : <div className="opacity-20 flex flex-col items-center gap-2"><Upload className="h-5 w-5" /><span className="text-[8px] font-black uppercase">Upload</span></div>}
                       <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'dl')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Aadhaar Photo</Label>
                    <div className="relative h-32 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-2">
                       {aadhaarPhotoUrl ? <img src={aadhaarPhotoUrl} className="h-full w-full object-cover rounded-xl" /> : <div className="opacity-20 flex flex-col items-center gap-2"><Upload className="h-5 w-5" /><span className="text-[8px] font-black uppercase">Upload</span></div>}
                       <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'aadhaar')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                 </div>
              </div>
              <Button onClick={() => setStep(3)} disabled={!photoUrl || !dlPhotoUrl || !aadhaarPhotoUrl} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-2xl">Confirm Identity</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-lg z-20">+91</span><Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0000000000" className="h-16 pl-20 rounded-xl bg-white/5 border-white/10 font-black italic text-xl" required /></div>
                </div>
                {!confirmationResult ? <Button type="submit" disabled={loading || phoneNumber.replace(/\D/g, '').length < 10} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Send Code</Button> : <div className="space-y-6"><Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="h-20 text-center text-4xl tracking-[0.4em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required /><Button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-2xl">Verify & Join Hub</Button></div>}
              </form>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-white/5 p-8 border-t border-white/5 text-center"><Link href="/driver/login" className="text-[10px] font-black uppercase italic text-primary hover:underline w-full">Already registered? Login</Link></CardFooter>
      </Card>
    </div>
  );
}
