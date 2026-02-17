
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bus, 
  Activity, 
  Zap, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  ShieldAlert,
  Loader2,
  Trash2,
  Truck,
  Map as MapIcon,
  MessageSquareShare,
  IndianRupee,
  Wallet,
  Users,
  Search,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { generateShuttleRoutes } from '@/ai/flows/admin-generate-shuttle-routes';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, where, limit, doc, updateDoc, addDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 17.6868,
  lng: 83.2185
};

const mapOptions = {
  disableDefaultUI: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] }
  ]
};

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: firebaseConfig.apiKey
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'drivers' | 'scholars' | 'suggestions' | 'finance' | 'safety'>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
  const userRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes')) : null, [db]));
  const { data: allTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips')) : null, [db]));
  const { data: allAlerts } = useCollection(useMemo(() => db ? query(collection(db, 'alerts')) : null, [db]));

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const riders = useMemo(() => allUsers?.filter(u => u.role === 'rider') || [], [allUsers]);
  const activeTrips = useMemo(() => allTrips?.filter(t => t.status === 'active') || [], [allTrips]);
  const activeAlerts = useMemo(() => allAlerts?.filter(a => a.status === 'active') || [], [allAlerts]);
  
  const savedRoutes = useMemo(() => allRoutes?.filter(r => r.status === 'active') || [], [allRoutes]);
  const suggestions = useMemo(() => allRoutes?.filter(r => r.status === 'suggested') || [], [allRoutes]);

  const onTripDrivers = drivers?.filter(d => d.status === 'on-trip') || [];
  const fleetHealth = drivers.length > 0 ? Math.round((onTripDrivers.length / drivers.length) * 100) : 0;
  
  const totalCommission = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.commissionAmount || 0), 0) || 0, [allTrips]);
  const totalDriverDebt = drivers?.reduce((acc, d) => acc + (d.weeklyEarnings || 0), 0) || 0;

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const handleUpdateRouteFare = async (routeId: string, baseFare: number, surgeFare: number) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'routes', routeId), { baseFare, surgeFare });
      toast({ title: "Fares Synchronized", description: "Regional pricing engine updated." });
    } catch {
      toast({ variant: "destructive", title: "Sync Failed" });
    }
  };

  const handleApproveSuggestion = async (routeId: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'routes', routeId), {
      status: 'active',
      isActive: true,
      baseFare: 50,
      createdAt: new Date().toISOString()
    });
    toast({ title: "Path Authorized" });
  };

  const [isOptimizing, setIsOptimizing] = useState(false);
  const handleOptimize = async () => {
    if (!db) return;
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: "High peak morning load in Vizag.",
        historicalTrafficData: "Congestion at primary intersections.",
        preferredServiceHours: "06:00 to 22:00",
        numberOfShuttlesAvailable: drivers.length || 5
      });
      for (const route of result.optimizedRoutes) {
        addDoc(collection(db, 'routes'), {
          ...route,
          city: profile?.city || 'Vizag',
          baseFare: 50,
          surgeFare: 0,
          isActive: true,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: "Intelligence Synced", description: "Optimized routes deployed." });
    } catch {
      toast({ variant: "destructive", title: "AI Sync Error" });
    } finally {
      setIsOptimizing(false);
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-primary"><Loader2 className="animate-spin h-10 w-10 text-white" /></div>;

  return (
    <div className="flex h-screen bg-[#F8F9FC] font-body text-slate-900">
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0 shadow-2xl z-20">
        <div className="p-6 h-20 flex items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-accent" />
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Terminal', icon: LayoutDashboard },
            { id: 'fleet', label: 'Fleet Radar', icon: Navigation },
            { id: 'routes', label: 'Route Engine', icon: MapIcon },
            { id: 'suggestions', label: 'Suggestions', icon: MessageSquareShare, badge: suggestions?.length },
            { id: 'drivers', label: 'Workforce', icon: Truck },
            { id: 'scholars', label: 'Scholars', icon: Users },
            { id: 'finance', label: 'Finance Engine', icon: Wallet },
            { id: 'safety', label: 'Incident Hub', icon: AlertTriangle, badge: activeAlerts?.length },
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start text-white rounded-xl font-bold ${activeTab === item.id ? 'bg-white/10' : 'hover:bg-white/5 opacity-70'}`}
            >
              <item.icon className="mr-3 h-4 w-4" /> {item.label}
              {item.badge ? <Badge className="ml-auto bg-accent text-[8px] h-4 min-w-4 p-0 flex items-center justify-center">{item.badge}</Badge> : null}
            </Button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/10">
            <Button variant="ghost" className="w-full justify-start text-red-300 hover:bg-red-500/10" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" /> Exit terminal
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-black font-headline text-primary italic uppercase tracking-tight">{activeTab}</h2>
          <Badge className="bg-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">{profile?.city} HUB TERMINAL</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Fleet', value: onTripDrivers.length, icon: Activity, color: 'text-green-600' },
                { label: 'Platform Rev', value: `₹${totalCommission}`, icon: TrendingUp, color: 'text-accent' },
                { label: 'Fleet Health', value: `${fleetHealth}%`, icon: Zap, color: 'text-primary' },
                { label: 'Scholar Base', value: riders.length, icon: Users, color: 'text-blue-600' },
              ].map((metric, i) => (
                <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-secondary rounded-2xl group-hover:rotate-12 transition-transform">
                        <metric.icon className={`h-6 w-6 ${metric.color}`} />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                    <h3 className="text-3xl font-black text-primary font-headline italic">{metric.value}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic uppercase text-primary">Regional Routing Engine</h3>
                <Button onClick={handleOptimize} disabled={isOptimizing} className="bg-accent rounded-xl font-black italic uppercase">
                  {isOptimizing ? <Loader2 className="animate-spin" /> : "Run AI Optimization"}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRoutes.map((route: any) => (
                  <Card key={route.id} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="pb-2">
                      <h4 className="font-black text-primary uppercase italic text-lg">{route.routeName}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[9px] font-black">Base: ₹{route.baseFare}</Badge>
                        {route.surgeFare > 0 && <Badge className="bg-red-500 text-white text-[9px] font-black">Surge: ₹{route.surgeFare}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase">Fare Adjustment</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            defaultValue={route.baseFare} 
                            onBlur={(e) => handleUpdateRouteFare(route.id, Number(e.target.value), route.surgeFare || 0)}
                            className="h-10 rounded-xl bg-secondary/20 border-none font-bold" 
                            placeholder="Base"
                          />
                          <Input 
                            type="number" 
                            defaultValue={route.surgeFare} 
                            onBlur={(e) => handleUpdateRouteFare(route.id, route.baseFare, Number(e.target.value))}
                            className="h-10 rounded-xl bg-secondary/20 border-none font-bold" 
                            placeholder="Surge"
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t flex flex-wrap gap-1">
                        {route.stops?.map((stop: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[8px] font-bold uppercase">{stop}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-primary text-white border-none shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Platform Commission (10%)</p>
                    <h3 className="text-6xl font-black italic font-headline mt-2 tracking-tighter">₹{totalCommission}</h3>
                    <p className="text-[10px] font-bold mt-6 opacity-80 uppercase tracking-widest">Net regional revenue collected</p>
                  </div>
                  <TrendingUp className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
                <Card className="bg-accent text-white border-none shadow-2xl rounded-[2.5rem] p-10 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Fleet Payout Pending (90%)</p>
                    <h3 className="text-6xl font-black italic font-headline mt-2 tracking-tighter">₹{totalDriverDebt}</h3>
                    <p className="text-[10px] font-bold mt-6 opacity-80 uppercase tracking-widest">Scheduled for weekly sync</p>
                  </div>
                  <Wallet className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
              </div>

              <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-black font-headline text-xl italic uppercase text-primary">Workforce Ledger</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-secondary/50 border-b text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                         <th className="py-6 pl-8">Worker ID</th>
                         <th className="py-6">Vehicle</th>
                         <th className="py-6">Trips</th>
                         <th className="py-6 pr-8 text-right">Net Share (90%)</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y">
                       {drivers?.map((driver: any) => (
                         <tr key={driver.uid} className="hover:bg-secondary/20 transition-colors">
                           <td className="py-6 pl-8 font-black text-primary uppercase italic text-sm">{driver.fullName}</td>
                           <td className="py-6 font-bold text-xs uppercase">{driver.vehicleType}</td>
                           <td className="py-6 font-bold text-xs">{driver.totalTrips || 0}</td>
                           <td className="py-6 pr-8 text-right font-black text-accent text-lg">₹{driver.weeklyEarnings || 0}</td>
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
