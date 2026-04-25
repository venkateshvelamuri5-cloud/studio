
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  History,
  User as UserIcon,
  LayoutGrid,
  Share2,
  Zap,
  CheckCircle2,
  ChevronRight,
  Clock,
  Navigation,
  Loader2,
  LogOut,
  MapPin,
  Search,
  MessageSquare
} from 'lucide-react';
import { useUser, useDoc, useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, collection, query, where, arrayUnion, getDocs, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parse, isBefore, isAfter, subHours } from 'date-fns';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'status' | 'history' | 'profile'>('home');
  const [bookingStep, setBookingStep] = useState(1); 
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [boardingPoint, setBoardingPoint] = useState("");
  const [droppingPoint, setDroppingPoint] = useState("");
  const [landmarkSearch, setLandmarkSearch] = useState("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  
  const { data: allActiveRoutes } = useCollection(useMemo(() => (db) ? query(collection(db, 'routes'), where('status', '==', 'active')) : null, [db]));
  const { data: allTrips } = useCollection(useMemo(() => (db) ? query(collection(db, 'trips')) : null, [db]));
  
  useEffect(() => {
    setMounted(true);
    setBookingDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const uniqueRoutes = useMemo(() => {
    if (!allActiveRoutes) return [];
    const grouped: Record<string, any> = {};
    allActiveRoutes.forEach(r => {
      if (!grouped[r.routeName]) {
        grouped[r.routeName] = r;
      } else {
        const existingSchedules = grouped[r.routeName].schedule?.split(',').map((s: string) => s.trim()) || [];
        const newSchedules = r.schedule?.split(',').map((s: string) => s.trim()) || [];
        const combined = Array.from(new Set([...existingSchedules, ...newSchedules])).join(', ');
        grouped[r.routeName].schedule = combined;
      }
    });
    return Object.values(grouped);
  }, [allActiveRoutes]);

  const currentRide = useMemo(() => {
    if (!allTrips || !user?.uid) return null;
    const trips = allTrips.filter(t => (t.status === 'active' || t.status === 'on-trip') && t.passengerManifest?.some((m: any) => m.uid === user.uid));
    return trips.length > 0 ? trips[0] : null;
  }, [allTrips, user?.uid]);

  const isShowOtpAllowed = useMemo(() => {
    if (!currentRide || !mounted) return false;
    try {
      const tripTime = parse(`${currentRide.scheduledDate} ${currentRide.scheduledTime}`, 'yyyy-MM-dd hh:mm a', new Date());
      const now = new Date();
      return isBefore(subHours(tripTime, 3), now);
    } catch (e) {
      return false;
    }
  }, [currentRide, mounted]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const calculatedFare = useMemo(() => {
    if (!selectedRoute) return 0;
    return typeof selectedRoute.baseFare === 'number' ? selectedRoute.baseFare : parseFloat(selectedRoute.baseFare) || 0;
  }, [selectedRoute]);
  
  const filteredAvailableTimes = useMemo(() => {
    const times = selectedRoute?.schedule?.split(',').map((s: string) => s.trim()) || [];
    if (!bookingDate) return times;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    if (bookingDate !== today) return times;

    const now = new Date();
    return times.filter(t => {
      try {
        const scheduledTime = parse(`${bookingDate} ${t}`, 'yyyy-MM-dd hh:mm a', new Date());
        return isAfter(scheduledTime, now);
      } catch (e) {
        return true;
      }
    });
  }, [selectedRoute, bookingDate]);

  const filteredLandmarks = useMemo(() => {
    if (!selectedRoute?.stops) return [];
    return selectedRoute.stops.filter((s: any) => 
      s.name.toLowerCase().includes(landmarkSearch.toLowerCase())
    );
  }, [selectedRoute, landmarkSearch]);

  const handleShare = async () => {
    const text = isShowOtpAllowed 
      ? `My AAGO Ride is Pakka! Route: ${currentRide?.routeName}. Ride Code (OTP): ${profile?.activeOtp}. Boarding at ${currentRide?.scheduledTime}.`
      : `I have booked a ticket with AAGO! Route: ${currentRide?.routeName} at ${currentRide?.scheduledTime}. All details will unlock 3 hours before trip starts.`;
    
    if (navigator.share) {
      navigator.share({ title: 'AAGO - My Trip', text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "You can now paste and send it to your family." });
    }
  };

  const applyDiscount = async () => {
    if (!db || !voucherCode || !user?.uid) return;
    const q = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const voucherData = snap.docs[0].data();
      const usedBy = voucherData.usedBy || [];
      
      if (usedBy.includes(user.uid)) {
        toast({ variant: "destructive", title: "Already Used", description: "You have used this coupon once before." });
        return;
      }

      if (voucherData.usageLimit && usedBy.length >= voucherData.usageLimit) {
        toast({ variant: "destructive", title: "Limit Reached", description: "This coupon code is now full." });
        return;
      }

      setAppliedDiscount(voucherData.discount || 0);
      toast({ title: `Discount applied!` });
    } else {
      toast({ variant: "destructive", title: "Invalid code", description: "Please check the coupon code again." });
    }
  };

  const processPayment = async (response: any) => {
    if (!db || !userRef || !selectedRoute || !profile) return;
    setIsPaying(true);
    try {
      const finalPrice = Math.max(0, calculatedFare - appliedDiscount);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const entry = { uid: user!.uid, name: profile.fullName, pickup: boardingPoint, destination: droppingPoint, bookingDate, bookingTime, farePaid: finalPrice, bookedAt: new Date().toISOString() };
      
      const q = query(collection(db, 'trips'), where('routeName', '==', selectedRoute.routeName), where('scheduledDate', '==', bookingDate), where('scheduledTime', '==', bookingTime), where('status', '==', 'active'));
      const snap = await getDocs(q);
      const existingTrip = snap.docs.find(d => (d.data().riderCount || 0) < 7);
      
      if (existingTrip) {
        await updateDoc(doc(db, 'trips', existingTrip.id), { 
          passengerManifest: arrayUnion(entry), 
          riderCount: increment(1) 
        });
      } else {
        await addDoc(collection(db, 'trips'), { 
          routeName: selectedRoute.routeName, 
          scheduledDate: bookingDate, 
          scheduledTime: bookingTime, 
          status: 'active', 
          riderCount: 1, 
          maxCapacity: 7, 
          farePerRider: selectedRoute.baseFare, 
          passengerManifest: [entry], 
          verifiedPassengers: [], 
          driverId: null, 
          createdAt: new Date().toISOString() 
        });
      }
      
      if (appliedDiscount > 0 && voucherCode) {
        const vQuery = query(collection(db, 'vouchers'), where('code', '==', voucherCode.toUpperCase()));
        const vSnap = await getDocs(vQuery);
        if (!vSnap.empty) {
          await updateDoc(doc(db, 'vouchers', vSnap.docs[0].id), {
            usedBy: arrayUnion(user!.uid)
          });
        }
      }

      await updateDoc(userRef, { activeOtp: code, loyaltyPoints: increment(10) });
      setBookingStep(4);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not save your ride." });
    } finally { setIsPaying(false); }
  };

  const startPayment = async () => {
    if (typeof window === 'undefined' || !selectedRoute) return;
    setIsPaying(true);
    try {
      const finalAmountInRupees = Math.max(0, calculatedFare - appliedDiscount);
      
      if (finalAmountInRupees <= 0) {
        processPayment({ status: 'free' });
        return;
      }
      
      const amountInPaise = Math.round(finalAmountInRupees * 100);

      const res = await fetch('/api/create-order', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          amount: amountInPaise, 
          receipt: `ride_${Date.now()}` 
        }) 
      });
      const order = await res.json();

      if (order.error) throw new Error(order.error);
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SeqhV0hEn1PXnz',
        amount: order.amount,
        currency: order.currency,
        name: "AAGO",
        description: `Ticket for ${selectedRoute.routeName}`,
        order_id: order.id,
        handler: (res: any) => processPayment(res),
        prefill: { name: profile?.fullName || "", contact: profile?.phoneNumber || "" },
        theme: { color: "#EAB308" },
        modal: { ondismiss: () => setIsPaying(false) }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) { 
      console.error("Payment Start Error:", e);
      toast({ variant: "destructive", title: "Payment Failed", description: e.message || "Could not start payment." });
      setIsPaying(false); 
    }
  };

  if (!mounted || authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body pb-24 safe-area-inset">
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20"><Logo className="h-6 w-6" /></div>
          <h1 className="text-xl font-black italic uppercase text-primary tracking-tighter">AAGO Hub</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleShare} className="text-primary bg-primary/10 h-11 w-11 rounded-2xl border border-primary/20 hover:bg-primary/20"><Share2 className="h-5 w-5" /></Button>
      </header>

      <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full overflow-y-auto">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center px-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest italic opacity-50">Namaste,</p>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">{profile?.fullName?.split(' ')[0]}</h2>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center gap-2">
                 <Zap className="h-5 w-5 text-primary fill-primary" />
                 <span className="text-2xl font-black text-primary">{profile?.loyaltyPoints || 0}</span>
              </div>
            </div>

            {currentRide ? (
              <Card className="rounded-[3.5rem] p-10 shadow-2xl border-primary/30 bg-card/60 backdrop-blur-md relative overflow-hidden">
                 <div className="flex flex-col items-center gap-4 mb-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Next Trip</p>
                    <h3 className="text-4xl font-black tracking-tighter italic text-primary leading-tight">Pakka Booked</h3>
                    <div className="mt-4 p-6 bg-black/40 rounded-2xl border border-white/5 w-full">
                      <p className="text-[10px] font-bold text-white/60 uppercase">{currentRide.routeName}</p>
                      <p className="text-xl font-black text-white mt-1">{currentRide.scheduledDate} • {currentRide.scheduledTime}</p>
                    </div>
                 </div>
                 
                 <div className="p-6 bg-black/60 rounded-[2.5rem] border border-white/5 space-y-4">
                    {isShowOtpAllowed ? (
                      <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">Your Ride Code (OTP)</p>
                        <h4 className="text-4xl font-black tracking-[0.3em] text-white">{profile?.activeOtp}</h4>
                      </div>
                    ) : (
                      <p className="text-[11px] font-bold text-white/60 uppercase leading-relaxed italic text-center">
                        Vehicle details and Ride Code (OTP) will show here 3 hours before start.
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                       <Button onClick={() => setActiveTab('status')} className="w-full h-14 bg-primary text-black rounded-2xl font-black uppercase italic shadow-xl">Check Ride Info</Button>
                       <Button onClick={handleShare} variant="outline" className="w-full h-14 border-white/10 text-white rounded-2xl font-black uppercase italic">
                         <MessageSquare className="mr-2 h-5 w-5 text-primary" /> Share With Family
                       </Button>
                    </div>
                 </div>
              </Card>
            ) : (
              <Dialog onOpenChange={open => !open && setBookingStep(1)}>
                <DialogTrigger asChild>
                  <div className="p-14 bg-primary text-black rounded-[3.5rem] shadow-2xl flex flex-col gap-3 cursor-pointer group active:scale-95 transition-all">
                    <h3 className="text-6xl font-black italic uppercase tracking-tighter leading-none">Book <br/> Ticket</h3>
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Fixed Fare Hub</p>
                      <div className="h-12 w-12 bg-black rounded-full flex items-center justify-center text-primary group-hover:translate-x-3 transition-transform"><ChevronRight className="h-6 w-6" /></div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-background border-white/5 rounded-[3.5rem] p-10 h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                  <DialogHeader className="shrink-0 mb-6">
                    <DialogTitle className="text-4xl font-black italic uppercase text-primary tracking-tighter">
                      {bookingStep === 1 ? "Pick Route" : bookingStep === 2 ? "Pick Points" : bookingStep === 3 ? "Review Ticket" : "Success!"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pb-10">
                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        {uniqueRoutes?.map((route: any) => (
                          <div key={route.id} onClick={() => { setSelectedRoute(route); setBookingStep(2); }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] cursor-pointer flex justify-between items-center group hover:border-primary/40 transition-all">
                             <div className="space-y-2">
                                <h4 className="text-2xl font-black italic uppercase group-hover:text-primary transition-colors leading-none">{route.routeName}</h4>
                                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1 rounded-full shadow-inner">₹{route.baseFare}</Badge>
                             </div>
                             <ChevronRight className="h-8 w-8 text-white/10 group-hover:text-primary group-hover:translate-x-2 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                    {bookingStep === 2 && (
                      <div className="space-y-10 animate-in slide-in-from-right-4">
                        <div className="space-y-6">
                           <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Find Nearest Hub/Landmark</Label>
                             <div className="relative">
                               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                               <Input 
                                 value={landmarkSearch} 
                                 onChange={e => setLandmarkSearch(e.target.value)} 
                                 placeholder="Search stops..." 
                                 className="h-12 pl-12 bg-white/5 rounded-xl font-black italic border-white/10"
                               />
                             </div>
                           </div>

                           <div className="space-y-6">
                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Boarding Point (Pickup)</Label>
                                <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                   {filteredLandmarks.map((stop: any, idx: number) => (
                                     <Button key={idx} variant="outline" onClick={() => setBoardingPoint(stop.name)} className={`h-16 justify-center text-center px-4 rounded-xl font-black italic text-[11px] leading-tight border-2 transition-all ${boardingPoint === stop.name ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                                       {stop.name}
                                     </Button>
                                   ))}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Dropping Point (Destination)</Label>
                                <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                   {filteredLandmarks.map((stop: any, idx: number) => (
                                     <Button key={idx} variant="outline" onClick={() => setDroppingPoint(stop.name)} className={`h-16 justify-center text-center px-4 rounded-xl font-black italic text-[11px] leading-tight border-2 transition-all ${droppingPoint === stop.name ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                                       {stop.name}
                                     </Button>
                                   ))}
                                </div>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                           <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Date</Label>
                              <select value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-4 font-black text-white outline-none">
                                 {[0, 1, 2, 3].map(d => { const date = addDays(new Date(), d); return <option key={d} value={format(date, 'yyyy-MM-dd')} className="bg-background">{format(date, 'EEE, dd MMM')}</option>; })}
                              </select>
                           </div>
                           <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Time</Label>
                              <select value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-4 font-black text-white outline-none">
                                 <option value="" className="bg-background">Select Time</option>
                                 {filteredAvailableTimes.map(t => <option key={t} value={t} className="bg-background">{t}</option>)}
                              </select>
                           </div>
                        </div>
                        <Button onClick={() => setBookingStep(3)} disabled={!bookingTime || !boardingPoint || !droppingPoint} className="w-full h-18 bg-primary text-black rounded-3xl font-black uppercase italic text-lg shadow-2xl active:scale-95 transition-all">Review Details</Button>
                      </div>
                    )}
                    {bookingStep === 3 && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-4">
                         <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6 shadow-inner">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black uppercase text-muted-foreground">Chosen Route</p>
                               <p className="text-2xl font-black italic uppercase text-primary leading-none">{selectedRoute?.routeName}</p>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-white/5">
                               <div>
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Boarding At</p>
                                  <p className="text-lg font-black italic text-white">{boardingPoint}</p>
                                </div>
                               <div>
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Dropping At</p>
                                  <p className="text-lg font-black italic text-white">{droppingPoint}</p>
                               </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground">Travel Date</p>
                                  <p className="text-lg font-black italic">{bookingDate}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground">Boarding Time</p>
                                  <p className="text-lg font-black italic">{bookingTime}</p>
                               </div>
                            </div>
                            <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                               <p className="text-[10px] font-black uppercase text-muted-foreground">Final Price</p>
                               <p className="text-4xl font-black italic text-primary">₹{Math.max(0, calculatedFare - appliedDiscount)}</p>
                            </div>
                         </div>
                         
                         <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Have a Coupon?</Label>
                            <div className="flex gap-3">
                               <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="COUPON" className="flex-1 h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-black italic text-lg outline-none uppercase placeholder:text-muted-foreground/30" />
                               <Button onClick={applyDiscount} variant="outline" className="h-16 px-8 rounded-2xl border-primary text-primary font-black uppercase hover:bg-primary hover:text-black">Apply</Button>
                            </div>
                         </div>

                         <Button onClick={startPayment} disabled={isPaying} className="w-full h-20 bg-primary text-black rounded-[2.5rem] font-black uppercase italic text-xl shadow-3xl shadow-primary/20 transition-all active:scale-95">
                           {isPaying ? <Loader2 className="animate-spin h-8 w-8" /> : `Pay ₹${Math.max(0, calculatedFare - appliedDiscount)} Now`}
                         </Button>
                      </div>
                    )}
                    {bookingStep === 4 && (
                      <div className="flex flex-col items-center justify-center text-center space-y-8 py-10 animate-in fade-in">
                         <div className="h-24 w-24 bg-primary text-black rounded-full flex items-center justify-center shadow-3xl shadow-primary/20"><CheckCircle2 className="h-12 w-12" /></div>
                         <div className="space-y-4 px-4">
                           <h3 className="text-4xl font-black italic uppercase text-primary leading-none">Pakka Booked!</h3>
                           <p className="text-[11px] font-bold text-white/70 uppercase leading-relaxed mt-4 italic">
                             Congratulations! Your ticket is confirmed. Van details and Ride Code (OTP) will unlock 3 hours before start time.
                           </p>
                         </div>
                         <div className="w-full flex flex-col gap-4">
                            <Button onClick={handleShare} className="w-full h-18 bg-white/10 border border-primary/30 text-primary rounded-3xl font-black uppercase italic text-lg shadow-xl hover:bg-white/20">
                               <MessageSquare className="mr-3 h-6 w-6" /> Share With Family
                            </Button>
                            <Button onClick={() => { setBookingStep(1); setActiveTab('home'); }} variant="ghost" className="w-full h-16 font-black uppercase italic text-muted-foreground">Back to Home</Button>
                         </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="flex-1 flex flex-col space-y-8 animate-in fade-in py-10">
            <h2 className="text-4xl font-black italic uppercase text-foreground tracking-tighter">My Trip Info</h2>
            {currentRide ? (
              <div className="space-y-8">
                 <Card className="p-10 bg-white/5 border-primary/20 rounded-[3.5rem] space-y-8 text-center shadow-2xl">
                    <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto shadow-inner animate-pulse">
                       <Navigation className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black italic uppercase text-primary leading-none">{currentRide.routeName}</h3>
                       <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black px-4 py-1.5 rounded-full mt-4">
                         {currentRide.status === 'on-trip' ? 'VAN IS ON THE WAY' : 'PAKKA CONFIRMED'}
                       </Badge>
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-6 opacity-60">
                         {currentRide.status === 'on-trip' ? 'Driver has started the trip.' : 'Wait for boarding time.'}
                       </p>
                    </div>
                    <div className="p-8 bg-black/60 rounded-[2.5rem] border border-white/5">
                       <p className="text-[11px] font-bold text-white/60 uppercase leading-relaxed italic">
                         Vehicle number and Ride Code (OTP) unlock 3 hours before start for your safety.
                       </p>
                    </div>
                 </Card>
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4">Corridor Stops</Label>
                    <div className="space-y-3">
                       {allActiveRoutes?.find(r => r.routeName === currentRide.routeName)?.stops.map((s: any, i: number) => (
                         <div key={i} className="flex items-center gap-4 px-6 py-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                            <Badge className="bg-primary/20 text-primary border-none font-black h-7 w-7 p-0 flex items-center justify-center rounded-full shadow-inner">{i + 1}</Badge>
                            <span className="font-black italic text-sm group-hover:text-primary transition-colors">{s.name}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-6 opacity-40">
                 <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground shadow-inner"><MapPin className="h-10 w-10" /></div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest italic">No Pakka rides scheduled</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right-8 py-6">
            <h2 className="text-4xl font-black italic uppercase text-foreground tracking-tighter">My Travels</h2>
            <div className="space-y-4">
               {allTrips?.filter(t => t.passengerManifest?.some((m: any) => m.uid === user?.uid)).map((trip: any) => (
                 <Card key={trip.id} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex justify-between items-center group hover:border-primary/20 transition-all shadow-xl">
                    <div className="space-y-2">
                       <h4 className="text-xl font-black italic uppercase leading-none group-hover:text-primary transition-colors">{trip.routeName}</h4>
                       <p className="text-[9px] font-bold text-muted-foreground uppercase">{trip.scheduledDate} • {trip.scheduledTime}</p>
                    </div>
                    <Badge className={`${trip.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'} border-none uppercase text-[8px] font-black px-5 py-2 rounded-full shadow-inner`}>
                       {trip.status === 'completed' ? 'DONE' : 'PAKKA'}
                    </Badge>
                 </Card>
               ))}
               {(!allTrips || allTrips.filter(t => t.passengerManifest?.some((m: any) => m.uid === user?.uid)).length === 0) && (
                 <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-20 italic opacity-40">No travel history found</p>
               )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-12 text-center py-12 animate-in slide-in-from-bottom-8">
             <div className="flex flex-col items-center gap-6">
                <div className="h-40 w-40 rounded-full border-[8px] border-white/5 bg-primary/5 flex items-center justify-center text-primary/20 shadow-3xl">
                   <UserIcon className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                   <h2 className="text-5xl font-black italic uppercase text-foreground leading-none">{profile?.fullName}</h2>
                   <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black px-6 py-1.5 rounded-full shadow-lg">{profile?.phoneNumber}</Badge>
                </div>
             </div>
             <div className="space-y-4 w-full max-w-sm mx-auto">
               <Card className="p-8 bg-white/5 border-white/10 rounded-[2.5rem] mb-10 flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">AAGO Reward Points</p>
                  <p className="text-5xl font-black italic text-primary">{profile?.loyaltyPoints || 0}</p>
               </Card>
               <Button onClick={() => auth && signOut(auth)} className="w-full h-20 bg-destructive/10 text-destructive rounded-[2.5rem] font-black uppercase italic border border-destructive/20 text-xl hover:bg-destructive/20 active:scale-95 transition-all"><LogOut className="mr-3 h-6 w-6" /> Logout</Button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-3xl border-t-2 border-white/5 z-50 flex justify-around items-center safe-area-inset-bottom shadow-2xl">
        <Button variant="ghost" onClick={() => setActiveTab('home')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all ${activeTab === 'home' ? 'text-primary bg-primary/10 shadow-lg' : 'text-muted-foreground opacity-50'}`}>
          <LayoutGrid className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Home</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('status')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all ${activeTab === 'status' ? 'text-primary bg-primary/10 shadow-lg' : 'text-muted-foreground opacity-50'}`}>
          <Navigation className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Info</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('history')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all ${activeTab === 'history' ? 'text-primary bg-primary/10 shadow-lg' : 'text-muted-foreground opacity-50'}`}>
          <History className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Travels</span>
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab('profile')} className={`flex-col h-auto py-4 px-8 gap-2 rounded-3xl transition-all ${activeTab === 'profile' ? 'text-primary bg-primary/10 shadow-lg' : 'text-muted-foreground opacity-50'}`}>
          <UserIcon className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
        </Button>
      </nav>
    </div>
  );
}

