
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Bus, 
  Activity, 
  Zap, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  ShieldAlert,
  Loader2,
  UserPlus,
  Settings2,
  Clock,
  Trash2,
  Truck,
  Map as MapIcon,
  CheckCircle2,
  XCircle,
  MessageSquareShare,
  IndianRupee,
  Wallet,
  Users,
  Search,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { generateShuttleRoutes } from '@/ai/flows/admin-generate-shuttle-routes';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, where, limit, doc, updateDoc, addDoc, deleteDoc, getDocs, orderBy, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/app/lib/placeholder-images';

const ridershipData = [
  { name: 'Vizag', riders: 8500 },
  { name: 'VZM', riders: 3200 },
  { name: 'Highway', riders: 4500 },
  { name: 'Gitam', riders: 5100 },
  { name: 'AU', riders: 3800 },
];

function getMarkerPos(lat?: number, lng?: number) {
  if (!lat || !lng) return { top: '50%', left: '50%' };
  const top = 100 - ((lat - 17.6) / (17.8 - 17.6)) * 100;
  const left = ((lng - 83.1) / (83.4 - 83.1)) * 100;
  return { 
    top: `${Math.max(5, Math.min(95, top))}%`, 
    left: `${Math.max(5, Math.min(95, left))}%` 
  };
}

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'drivers' | 'scholars' | 'suggestions' | 'finance'>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allUsers } = useCollection(
    useMemo(() => db ? query(collection(db, 'users')) : null, [db])
  );

  const drivers = allUsers?.filter(u => u.role === 'driver') || [];
  const riders = allUsers?.filter(u => u.role === 'rider') || [];
  
  const { data: activeTrips } = useCollection(
    useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db])
  );

  const { data: savedRoutes } = useCollection(
    useMemo(() => db ? query(collection(db, 'routes'), where('status', '==', 'active'), orderBy('createdAt', 'desc')) : null, [db])
  );

  const { data: suggestions } = useCollection(
    useMemo(() => db ? query(collection(db, 'routes'), where('status', '==', 'suggested'), orderBy('createdAt', 'desc')) : null, [db])
  );

  const mapImage = PlaceHolderImages.find(img => img.id === 'live-map');

  const availableDrivers = drivers?.filter(d => d.status === 'available') || [];
  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [demandPatterns, setDemandPatterns] = useState("High demand from Vizianagaram to GITAM/AU campuses between 7-9 AM.");
  const [targetCity, setTargetCity] = useState("Vizag");
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverCity, setNewDriverCity] = useState("Vizag");

  const totalRegionalDebt = drivers?.reduce((acc, d) => acc + (d.weeklyEarnings || 0), 0) || 0;

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleRegisterDriver = async () => {
    if (!db || !newDriverPhone || !newDriverName) return;
    setIsRegistering(true);
    try {
      const formattedPhone = newDriverPhone.startsWith('+91') ? newDriverPhone : `+91${newDriverPhone}`;
      const q = query(collection(db, 'users'), where('phoneNumber', '==', formattedPhone), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await updateDoc(doc(db, 'users', snap.docs[0].id), { 
          role: 'driver',
          fullName: newDriverName,
          city: newDriverCity,
          status: 'offline'
        });
        toast({ title: "Workforce Updated", description: `${newDriverName} is now an official driver.` });
      } else {
        const driverId = `DRV_${Date.now()}`;
        await setDoc(doc(db, 'users', driverId), {
          uid: driverId,
          fullName: newDriverName,
          phoneNumber: formattedPhone,
          role: 'driver',
          city: newDriverCity,
          status: 'offline',
          totalTrips: 0,
          totalEarnings: 0,
          weeklyEarnings: 0,
          createdAt: new Date().toISOString()
        });
        toast({ title: "Driver Registered", description: "Profile created in the regional workforce." });
      }
      setNewDriverName("");
      setNewDriverPhone("");
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Registry Error" });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOptimize = async () => {
    if (!db) return;
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: demandPatterns,
        historicalTrafficData: "Heavy congestion at Maddilapalem and VZM Highway junctions.",
        preferredServiceHours: "6 AM to 9 PM Monday-Saturday",
        numberOfShuttlesAvailable: 15
      });
      
      for (const route of result.optimizedRoutes) {
        await addDoc(collection(db, 'routes'), {
          ...route,
          city: targetCity,
          scheduledTime: "08:00", 
          basePayout: 150,
          isActive: true,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "Engine Synced", description: `${targetCity} routes deployed.` });
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReviewSuggestion = async (id: string, action: 'approve' | 'reject') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', id), {
        status: action === 'approve' ? 'active' : 'rejected',
        isActive: action === 'approve',
        basePayout: 150,
        approvedAt: action === 'approve' ? new Date().toISOString() : null,
        scheduledTime: action === 'approve' ? "08:00" : null
      });
      toast({ title: action === 'approve' ? "Route Approved" : "Suggestion Rejected" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Operation Failed" });
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'routes', id));
      toast({ title: "Route Removed" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', id), { role: newRole });
      toast({ title: "Role Updated" });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary font-body">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="font-black uppercase tracking-widest text-xs italic">Verifying Terminal Access...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-8">
        <div className="text-center space-y-6 max-w-sm">
          <ShieldAlert className="h-20 w-20 text-destructive mx-auto" />
          <h2 className="text-2xl font-black font-headline uppercase italic">Security Restricted</h2>
          <p className="font-bold text-muted-foreground">Admin credentials required.</p>
          <Button onClick={() => router.push('/')} className="w-full h-14 rounded-2xl font-black uppercase italic">Exit</Button>
        </div>
      </div>
    );
  }

  const filteredRiders = riders.filter(r => 
    r.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.collegeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-secondary/20 font-body">
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-6 h-20 flex items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-accent" />
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="ghost" onClick={() => setActiveTab('dashboard')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'dashboard' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('fleet')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'fleet' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Navigation className="mr-2 h-4 w-4" /> Fleet Tracking
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('routes')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'routes' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <MapIcon className="mr-2 h-4 w-4" /> Route Engine
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('suggestions')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'suggestions' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <MessageSquareShare className="mr-2 h-4 w-4" /> Suggestions 
            {suggestions && suggestions.length > 0 && <Badge className="ml-auto bg-accent text-[8px] h-4 min-w-4 p-0 flex items-center justify-center">{suggestions.length}</Badge>}
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('drivers')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'drivers' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Truck className="mr-2 h-4 w-4" /> Workforce
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('scholars')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'scholars' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Users className="mr-2 h-4 w-4" /> Scholar Registry
          </Button>
          <Button variant="ghost" onClick={() => setActiveTab('finance')} className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === 'finance' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <Wallet className="mr-2 h-4 w-4" /> Finance & Payouts
          </Button>
          <div className="pt-4 border-t border-white/10 mt-4">
            <Button variant="ghost" className="w-full justify-start text-red-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-bold" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">
            {activeTab.toUpperCase()}
          </h2>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-4 py-1.5 font-black text-[10px] rounded-full uppercase tracking-widest">
            Hub Active: {profile.city}
          </Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Available Fleet', value: availableDrivers.length, trend: 'READY', icon: Activity, color: 'text-green-600' },
                  { label: 'On Route', value: onTripDrivers.length, trend: 'ACTIVE', icon: Navigation, color: 'text-accent' },
                  { label: 'Scholars Registered', value: riders.length, trend: 'ENROLLED', icon: Users, color: 'text-blue-600' },
                  { label: 'Regional Debt', value: `₹${totalRegionalDebt}`, trend: 'PAYOUTS', icon: IndianRupee, color: 'text-primary' },
                ].map((metric, i) => (
                  <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-secondary rounded-2xl group-hover:rotate-12 transition-transform">
                          <metric.icon className={`h-6 w-6 ${metric.color}`} />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black tracking-widest border-none bg-secondary px-3 py-1 uppercase">{metric.trend}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                        <h3 className="text-3xl font-black text-primary font-headline italic">{metric.value}</h3>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                   <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Master Radar</CardTitle>
                    <CardDescription className="font-bold">Real-time GPS tracking across the network</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[400px] relative bg-slate-900">
                    <Image src={mapImage?.imageUrl || "https://picsum.photos/seed/radar/800/400"} fill className="object-cover opacity-50" alt="Map" />
                    {drivers?.filter(d => d.status === 'on-trip').map((driver: any) => {
                      const pos = getMarkerPos(driver.currentLat, driver.currentLng);
                      return (
                        <div key={driver.uid} className="absolute transition-all duration-1000 z-10" style={pos}>
                          <div className="relative group">
                            <div className="bg-primary p-2 rounded-full shadow-2xl animate-pulse ring-4 ring-primary/20">
                              <Bus className="h-4 w-4 text-white" />
                            </div>
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow border border-primary/20 text-[8px] font-black uppercase italic">
                              {driver.fullName}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
                  <CardHeader>
                    <CardTitle className="font-black font-headline text-xl italic uppercase tracking-tighter text-primary">Live Missions Detail</CardTitle>
                    <CardDescription className="font-bold">Active manifest & workforce tracking</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto px-6 pb-6">
                    <div className="space-y-4">
                      {activeTrips?.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold italic border-2 border-dashed rounded-3xl">No missions active.</div>
                      ) : (
                        activeTrips?.map((trip: any) => (
                          <div key={trip.id} className="p-5 bg-secondary/50 rounded-3xl border border-secondary flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-primary uppercase italic text-lg leading-none">{trip.routeName}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Driver: {trip.driverName}</p>
                              </div>
                              <Badge className="bg-accent/10 text-accent uppercase font-black text-[10px] border-none">{trip.riderCount || 0} Boarded</Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Passenger Manifest:</p>
                              <div className="flex flex-wrap gap-2">
                                {trip.passengers?.map((pid: string) => {
                                  const rider = riders.find(r => r.uid === pid);
                                  return (
                                    <Badge key={pid} variant="outline" className="bg-white border-primary/10 text-[8px] font-bold py-1 px-3 rounded-full">
                                      {rider?.fullName || pid}
                                    </Badge>
                                  );
                                })}
                                {(!trip.passengers || trip.passengers.length === 0) && <p className="text-[8px] font-bold text-slate-400 italic">No passengers checked in yet.</p>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'scholars' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search scholars by name or college..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-2xl border-none shadow-sm font-bold bg-white"
                  />
                </div>
                <Badge variant="outline" className="font-black h-12 px-6 rounded-2xl border-none bg-white shadow-sm uppercase italic">
                  Total Scholars: {riders.length}
                </Badge>
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                         <th className="py-6 pl-8">Scholar Profile</th>
                         <th className="py-6">Institution</th>
                         <th className="py-6">ID Number</th>
                         <th className="py-6 text-center">Wallet Credits</th>
                         <th className="py-6 text-right pr-8">Joined</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {filteredRiders.map((rider: any) => (
                         <tr key={rider.uid} className="hover:bg-secondary/30 transition-colors">
                           <td className="py-6 pl-8">
                             <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs uppercase overflow-hidden">
                                 <Image src={`https://picsum.photos/seed/${rider.uid}/40/40`} width={40} height={40} alt="Avatar" />
                               </div>
                               <div>
                                 <p className="font-black text-primary uppercase italic text-sm">{rider.fullName}</p>
                                 <p className="text-[10px] font-bold text-muted-foreground">{rider.phoneNumber}</p>
                               </div>
                             </div>
                           </td>
                           <td className="py-6 font-bold text-xs uppercase">{rider.collegeName}</td>
                           <td className="py-6 font-mono text-[10px] text-slate-500">{rider.studentId}</td>
                           <td className="py-6 text-center">
                              <Badge className="bg-green-100 text-green-700 font-black h-8 px-4 border-none rounded-xl">₹{rider.credits || 0}</Badge>
                           </td>
                           <td className="py-6 text-right pr-8 font-bold text-[10px] text-muted-foreground">
                             {new Date(rider.createdAt).toLocaleDateString()}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                   {filteredRiders.length === 0 && (
                     <div className="p-20 text-center font-bold italic text-slate-400">No scholars found matching your search.</div>
                   )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="space-y-6">
              <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden">
                <div className="relative h-[600px] bg-slate-900">
                   <Image src={mapImage?.imageUrl || ""} fill className="object-cover opacity-40" alt="Regional Radar" />
                   {drivers?.map((driver: any) => {
                     const pos = getMarkerPos(driver.currentLat, driver.currentLng);
                     return (
                       <div key={driver.uid} className="absolute transition-all duration-1000" style={pos}>
                         <div className={`p-3 rounded-full shadow-2xl flex flex-col items-center gap-2 group cursor-pointer ${driver.status === 'on-trip' ? 'bg-primary' : driver.status === 'available' ? 'bg-green-500' : 'bg-slate-700'}`}>
                           <Bus className="h-5 w-5 text-white" />
                           <div className="absolute top-12 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-white text-primary p-2 rounded-xl shadow-xl font-black text-[10px] uppercase">
                             {driver.fullName} &bull; {driver.status}
                           </div>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="bg-primary text-white rounded-[2rem] border-none shadow-xl p-8">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Weekly Regional Payout</p>
                    <h3 className="text-5xl font-black italic font-headline mt-2 uppercase tracking-tighter">₹{totalRegionalDebt}</h3>
                    <p className="text-xs font-bold mt-4">Total pending for {drivers?.length} mobility partners</p>
                 </Card>
                 <Card className="bg-white rounded-[2rem] border-none shadow-xl p-8 flex flex-col justify-center">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Trips Today</p>
                    <h3 className="text-4xl font-black italic font-headline text-primary mt-1 uppercase">{activeTrips?.length || 0} Missions</h3>
                 </Card>
                 <Card className="bg-accent text-white rounded-[2rem] border-none shadow-xl p-8 flex flex-col justify-center">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Avg Pay Per Trip</p>
                    <h3 className="text-4xl font-black italic font-headline mt-1 uppercase">₹210</h3>
                 </Card>
              </div>

              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="bg-secondary/20 border-b p-8">
                  <CardTitle className="font-black uppercase italic text-primary">Regional Payout Registry</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                         <th className="py-6 pl-8">Worker</th>
                         <th className="py-6">Hub</th>
                         <th className="py-6">Status</th>
                         <th className="py-6">Total Earnings</th>
                         <th className="py-6 pr-8 text-right">Weekly Pending</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {drivers?.map((driver: any) => (
                         <tr key={driver.uid} className="hover:bg-secondary/20 transition-colors">
                           <td className="py-6 pl-8">
                             <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">{driver.fullName?.[0]}</div>
                               <span className="font-black text-primary uppercase italic text-sm">{driver.fullName}</span>
                             </div>
                           </td>
                           <td className="py-6 font-bold text-xs uppercase">{driver.city}</td>
                           <td className="py-6">
                             <Badge className={driver.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-green-100 text-green-700'}>{driver.status}</Badge>
                           </td>
                           <td className="py-6 font-black text-primary">₹{driver.totalEarnings || 0}</td>
                           <td className="py-6 pr-8 text-right font-black text-accent">₹{driver.weeklyEarnings || 0}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden lg:col-span-1">
                <CardHeader>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="font-black font-headline text-3xl italic uppercase text-white">Route Engine</CardTitle>
                  <CardDescription className="text-white/60 font-bold">AI route deployment & optimization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Target Hub</Label>
                    <Select value={targetCity} onValueChange={setTargetCity}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl h-12 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vizag">Visakhapatnam</SelectItem>
                        <SelectItem value="Vizianagaram">Vizianagaram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Optimization Logic</Label>
                    <Textarea value={demandPatterns} onChange={(e) => setDemandPatterns(e.target.value)} className="bg-white/5 border-white/20 text-white rounded-2xl font-bold min-h-[120px]" />
                  </div>
                  <Button onClick={handleOptimize} disabled={isOptimizing} className="w-full bg-accent hover:bg-accent/90 h-14 rounded-2xl font-black uppercase italic">
                    {isOptimizing ? <Loader2 className="animate-spin h-5 w-5" /> : "Deploy Regional Routes"}
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Active Registry</h3>
                  <Badge variant="outline" className="font-bold border-2">{savedRoutes?.length || 0} DEPLOYED</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedRoutes?.map((route: any) => (
                    <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge className="bg-primary/10 text-primary text-[8px] font-black border-none uppercase mb-1">{route.city}</Badge>
                            <h4 className="font-black text-primary uppercase italic text-lg leading-none">{route.routeName}</h4>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {route.stops?.map((stop: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[8px] font-black uppercase">{stop}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase text-muted-foreground pt-4 border-t border-secondary">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.scheduledTime}</span>
                          <span className="flex items-center gap-1 text-primary"><IndianRupee className="h-3 w-3" /> Payout: ₹{route.basePayout}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Worker Proposals</h3>
                <Badge variant="outline" className="font-bold border-2">{suggestions?.length || 0} PENDING</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions?.map((route: any) => (
                  <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader>
                      <Badge className="bg-accent/10 text-accent text-[8px] font-black border-none uppercase mb-1">PROPOSAL: {route.city}</Badge>
                      <h4 className="font-black text-primary uppercase italic text-xl">{route.routeName}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground mt-2">By: {route.driverName}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs font-bold text-slate-600 italic">"{route.description}"</p>
                      <div className="flex flex-wrap gap-2">
                        {route.stops?.map((stop: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[8px] font-black uppercase">{stop}</Badge>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-secondary flex gap-3">
                        <Button onClick={() => handleReviewSuggestion(route.id, 'approve')} className="flex-1 bg-green-500 hover:bg-green-600 h-10 rounded-xl font-black uppercase italic text-[10px]">Approve</Button>
                        <Button onClick={() => handleReviewSuggestion(route.id, 'reject')} variant="outline" className="flex-1 border-red-200 text-red-500 hover:bg-red-50 h-10 rounded-xl font-black uppercase italic text-[10px]">Reject</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black font-headline italic uppercase text-primary">Workforce Registry</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-bold gap-2 h-12 bg-primary">
                      <UserPlus className="h-5 w-5" /> Add Regional Driver
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] bg-white">
                    <DialogHeader>
                      <DialogTitle className="font-headline font-black italic uppercase text-2xl">Onboard Driver</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                        <Input placeholder="Driver Name" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} className="rounded-xl h-12 border-2 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone (+91)</Label>
                        <Input placeholder="+91 9876543210" value={newDriverPhone} onChange={(e) => setNewDriverPhone(e.target.value)} className="rounded-xl h-12 border-2 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hub</Label>
                        <Select value={newDriverCity} onValueChange={setNewDriverCity}>
                          <SelectTrigger className="rounded-xl h-12 border-2 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vizag">Visakhapatnam</SelectItem>
                            <SelectItem value="Vizianagaram">Vizianagaram</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleRegisterDriver} disabled={isRegistering || !newDriverPhone} className="w-full bg-accent h-14 rounded-xl font-black uppercase italic">
                        Commit to Workforce
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground">
                         <th className="py-6 pl-8">Profile</th>
                         <th className="py-6">Status</th>
                         <th className="py-6">Hub</th>
                         <th className="py-6 text-center">Trips</th>
                         <th className="py-6 text-right pr-8">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {drivers?.map((driver: any) => (
                         <tr key={driver.uid} className="hover:bg-secondary/30 transition-colors">
                           <td className="py-6 pl-8">
                             <div>
                               <p className="font-black text-primary uppercase italic text-sm">{driver.fullName}</p>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase">{driver.phoneNumber}</p>
                             </div>
                           </td>
                           <td className="py-6">
                             <Badge className={driver.status === 'on-trip' ? 'bg-accent/10 text-accent' : 'bg-green-100 text-green-700'}>{driver.status}</Badge>
                           </td>
                           <td className="py-6 font-bold text-xs uppercase">{driver.city}</td>
                           <td className="py-6 text-center font-black">{driver.totalTrips || 0}</td>
                           <td className="py-6 text-right pr-8">
                             <Button variant="ghost" size="icon" onClick={() => handleUpdateRole(driver.uid, 'rider')}>
                               <Settings2 className="h-5 w-5 text-primary" />
                             </Button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
