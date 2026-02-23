"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, RefreshCcw } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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
  const [step, setStep] = useState(1); // 1: Info, 2: Vehicle, 3: Photo, 4: Phone, 5: OTP
  const [loading, setLoading] = useState(false);
  
  // Profile
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Vizag');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  
  // Vehicle
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [seatingCapacity, setSeatingCapacity] = useState('40');

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
        title: 'Camera Blocked',
        description: 'Please allow camera access to take your ID photo.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotoUrl(dataUrl);
      
      // Stop camera stream
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
      setStep(5);
      toast({ title: "Code Sent", description: "Identity check code sent to your phone." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not send code. Check signal." });
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
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
        fullName, city, licenseNumber, vehicleNumber, vehicleType,
        seatingCapacity: parseInt(seatingCapacity),
        aadhaarNumber,
        photoUrl: photoUrl,
        role: 'driver', 
        status: 'offline', 
        totalEarnings: 0, 
        createdAt: new Date().toISOString(),
      });
      router.push('/driver');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Wrong Code", description: "The verification code is incorrect." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 font-body safe-area-inset">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-6 flex flex-col items-center gap-3 animate-in fade-in duration-1000">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/30">
          <ConnectingDotsLogo className="h-6 w-6 text-black" />
        </div>
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-foreground">DRIVER JOIN GRID</h1>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-8 pb-4 text-center border-b border-white/5 bg-white/5">
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-none">Registration</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Step {step} of 5</CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8 sm:px-10">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Driving License No.</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="DL-XXXXXXX" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Aadhaar Card No.</Label>
                <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="XXXX XXXX XXXX" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !licenseNumber || !aadhaarNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl mt-4">Next Step</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vehicle Plate No.</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="AP-31-XX-0000" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type of Vehicle</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 text-foreground font-black italic rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="Bus">Big Bus</SelectItem>
                    <SelectItem value="Mini-Bus">Mini Bus</SelectItem>
                    <SelectItem value="Van">Small Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Total Seats</Label>
                <Input type="number" value={seatingCapacity} onChange={(e) => setSeatingCapacity(e.target.value)} placeholder="e.g. 40" className="h-12 bg-white/5 border-white/10 font-black italic text-base rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Your City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 text-foreground font-black italic rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="Vizag">Vizag</SelectItem>
                    <SelectItem value="Vizianagaram">Vizianagaram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setStep(3); getCameraPermission(); }} disabled={!vehicleNumber || !seatingCapacity} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl mt-4">Take Photo</Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-[10px] font-black uppercase italic text-muted-foreground tracking-widest">Back</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center animate-in slide-in-from-right-8">
              <div className="relative aspect-square max-w-[240px] mx-auto bg-black/40 rounded-[2rem] overflow-hidden border-2 border-primary/20 shadow-inner">
                {!photoUrl ? (
                  <>
                    <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                    {!hasCameraPermission && (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Camera access required</p>
                      </div>
                    )}
                  </>
                ) : (
                  <img src={photoUrl} className="h-full w-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              {!photoUrl ? (
                <Button onClick={capturePhoto} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-lg">
                  <Camera className="mr-2 h-6 w-6" /> Take ID Photo
                </Button>
              ) : (
                <Button onClick={() => { setPhotoUrl(null); getCameraPermission(); }} variant="ghost" className="text-primary font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-2">
                  <RefreshCcw className="h-4 w-4" /> Retake Photo
                </Button>
              )}
              
              <Button onClick={() => setStep(4)} disabled={!photoUrl} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl mt-4">Link Phone No.</Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full text-[10px] font-black uppercase italic text-muted-foreground tracking-widest">Back</Button>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSendOtp} className="space-y-6 animate-in zoom-in-95">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary text-lg">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0000000000" className="h-16 pl-16 rounded-xl bg-white/5 border-white/10 font-black italic text-xl" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-xl">Send Code</Button>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in zoom-in-95">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Enter Code</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="h-20 text-center text-4xl tracking-[0.6em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-xl">Start Work</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-white/5 p-8 flex flex-col gap-4 border-t border-white/5">
          <Link href="/driver/login" className="text-[10px] font-black uppercase italic text-primary hover:underline tracking-widest">Login Instead</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
