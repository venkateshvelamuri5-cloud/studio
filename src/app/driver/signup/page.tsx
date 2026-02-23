
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Loader2, ArrowLeft, Camera, UserCircle, Briefcase, IdentificationCard, Bus, Car } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DriverSignupPage() {
  const [step, setStep] = useState(1); // 1: Profile, 2: Vehicle, 3: ID Capture, 4: Phone, 5: OTP
  const [loading, setLoading] = useState(false);
  
  // Operator Profile
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Vizag');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [experience, setExperience] = useState('0');
  
  // Vehicle Details
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [seatingCapacity, setSeatingCapacity] = useState('40');

  // Photo Protocol
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Auth Signals
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
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Camera Blocked', description: 'Enable permissions for operator ID.' });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setPhotoUrl(canvas.toDataURL('image/jpeg'));
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
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
      toast({ title: "Auth Sent", description: "Verification code transmitted." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Code could not be sent." });
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
        yearsOfExperience: parseInt(experience),
        photoUrl: photoUrl || `https://picsum.photos/seed/${result.user.uid}/400/400`,
        role: 'driver', status: 'offline', totalEarnings: 0, createdAt: new Date().toISOString(),
      });
      router.push('/driver');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Protocol Refused", description: "Invalid code sequence." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-body safe-area-inset">
      <div id="recaptcha-container-signup"></div>
      
      <div className="mb-10 flex flex-col items-center gap-4 animate-in fade-in duration-1000">
        <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/30">
          <ShieldCheck className="h-10 w-10 text-black" />
        </div>
        <h1 className="text-2xl font-black font-headline italic uppercase tracking-tighter text-foreground">OPERATOR ONBOARDING</h1>
      </div>

      <Card className="w-full max-w-md glass-card border-none rounded-[3rem] overflow-hidden shadow-2xl">
        <CardHeader className="pt-10 pb-6 text-center border-b border-white/5 bg-white/5">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground leading-none">Mission Hub</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Step {step} of 5</CardDescription>
        </CardHeader>
        
        <CardContent className="px-10 py-10">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Legal Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="h-14 bg-white/5 border-white/10 font-black italic text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">License ID (DL)</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="DL-0000000" className="h-14 bg-white/5 border-white/10 font-black italic text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gov ID (Aadhaar)</Label>
                <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="XXXX XXXX XXXX" className="h-14 bg-white/5 border-white/10 font-black italic text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Years of Fleet Exp</Label>
                <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="h-14 bg-white/5 border-white/10 font-black italic text-lg" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!fullName || !licenseNumber || !aadhaarNumber} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Vehicle Protocol</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vehicle Plate</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="AP-31-XX-0000" className="h-14 bg-white/5 border-white/10 font-black italic text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vehicle Class</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 text-foreground font-black italic"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="Bus">Heavy Bus</SelectItem>
                    <SelectItem value="Mini-Bus">Medium Mini-Bus</SelectItem>
                    <SelectItem value="Van">Small Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seating Capacity</Label>
                <Input type="number" value={seatingCapacity} onChange={(e) => setSeatingCapacity(e.target.value)} placeholder="e.g. 40" className="h-14 bg-white/5 border-white/10 font-black italic text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deployment Node (City)</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 text-foreground font-black italic"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10"><SelectItem value="Vizag">Vizag Hub</SelectItem><SelectItem value="Vizianagaram">VZM Hub</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setStep(3); startCamera(); }} disabled={!vehicleNumber || !seatingCapacity} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Bio Verification</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center animate-in slide-in-from-right-8">
              <div className="relative aspect-square max-w-[240px] mx-auto bg-black/40 rounded-[2rem] overflow-hidden border border-white/10 shadow-inner">
                {!photoUrl ? (
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                ) : (
                  <img src={photoUrl} className="h-full w-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              {!photoUrl ? (
                <Button onClick={capturePhoto} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic">Snap Operator ID</Button>
              ) : (
                <Button onClick={() => { setPhotoUrl(null); startCamera(); }} variant="ghost" className="text-primary font-black uppercase text-[10px] tracking-widest italic">Retake Photo</Button>
              )}
              <Button onClick={() => setStep(4)} disabled={!photoUrl} className="w-full bg-accent text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Link Handset</Button>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSendOtp} className="space-y-8 animate-in zoom-in-95">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fleet Signal Phone</Label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary">+91</span>
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0000000000" className="h-16 pl-16 rounded-xl bg-white/5 border-white/10 font-black italic text-xl" required />
                </div>
              </div>
              <Button type="submit" disabled={loading || phoneNumber.length < 10} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-xl">Signal Access</Button>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={handleVerifyOtp} className="space-y-8 animate-in zoom-in-95">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sync Clearance Code</Label>
                <Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="h-24 text-center text-4xl tracking-[0.6em] rounded-2xl bg-white/5 border-white/10 font-black text-primary" maxLength={6} required />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic shadow-xl">Join Fleet</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="bg-white/5 p-10 flex flex-col gap-6">
          <Link href="/driver/login" className="text-xs font-black uppercase italic text-primary hover:underline">Exit to Terminal</Link>
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3"><ArrowLeft className="h-4 w-4" /> Cancel Onboarding</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
