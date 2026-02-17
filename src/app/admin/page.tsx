
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bus, 
  Activity, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Truck,
  IndianRupee,
  Wallet,
  Users,
  AlertTriangle,
  TrendingUp,
  Plus,
  BarChart3,
  Route as RouteIcon,
  Ticket,
  Tag,
  History,
  ShieldCheck,
  MapPinned,
  ChevronRight,
  PlusCircle,
  Banknote,
  GanttChart
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, addDoc, deleteDoc, increment, orderBy, limit, arrayUnion } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1.5rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true };

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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'monetization' | 'drivers' | 'finance'>('dashboard');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  
  // Forms
  const [newPass, setNewPass] = useState({ name: '', city: 'Vizag', totalRides: 10, price: 450, routeName: 'All Routes' });
  const [newPromo, setNewPromo] = useState({ code: '', value: 100 });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && !authLoading && !profileLoading) {
      toast({ variant: "destructive", title: "Access Denied", description: "Admin terminal only." });
      router.push('/');
    }
  }, [profile, authLoading, profileLoading, router, toast]);

  const { data: allUsers } = useCollection(useMemo(() => (db && profile?.role === 'admin') ? query(collection(db, 'users')) : null, [db, profile?.role]));
  const { data: allRoutes } = useCollection(useMemo(() => (db && profile?.role === 'admin') ? query(collection(db, 'routes')) : null, [db, profile?.role]));
  const { data: allTrips } = useCollection(useMemo(() => (db && profile?.role === 'admin') ? query(collection(db, 'trips')) : null, [db, profile?.role]));
  const { data: allTransactions } = useCollection(useMemo(() => (db && profile?.role === 'admin') ? query(collection(db, 'transactions'), orderBy('timestamp', 'desc')) : null, [db, profile?.role]));
  const { data: allPasses } = useCollection(useMemo(() => (db && profile?.role === 'admin') ? query(collection(db, 'passes')) : null, [db, profile?.role]));
  const { data: allPromos } = useCollection(useMemo(() => (db && profile?.role === 'admin') ? query(collection(db, 'promoCodes')) : null, [db, profile?.role]));

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const activeTrips = useMemo(() => allTrips?.filter(t => t.status === 'active') || [], [allTrips]);
  
  // Financial aggregation
  const totalTripCommissions = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.commissionAmount || 0), 0) || 0, [allTrips]);
  const totalTopUpRevenue = useMemo(() => allTransactions?.filter(tx => tx.type === 'top-up').reduce((acc, t) => acc + (t.amount || 0), 0) || 0, [allTransactions]);
  const totalPassRevenue = useMemo(() => allTransactions?.filter(tx => tx.type === 'pass-purchase').reduce((acc, t) => acc + (t.amount || 0), 0) || 0, [allTransactions]);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  const createPass = async () => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'passes'), { ...newPass, isActive: true });
      toast({ title: "Pass Created", description: `${newPass.name} is now available for students.` });
      setNewPass({ name: '', city: 'Vizag', totalRides: 10, price: 450, routeName: 'All Routes' });
    } catch {
      toast({ variant: "destructive", title: "Failed to create pass" });
    }
  };

  const createPromo = async () => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'promoCodes'), { ...newPromo, isActive: true, usageCount: 0 });
      toast({ title: "Promo Created", description: `Code ${newPromo.code} is now active.` });
      setNewPromo({ code: '', value: 100 });
    } catch {
      toast({ variant: "destructive", title: "Failed to create promo" });
    }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-[#020617] font-body text-slate-200">
      <aside className="w-64 bg-slate-950 flex flex-col shrink-0 border-r border-white/5 shadow-2xl z-20">
        <div className="p-6 h-20 flex items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg"><Bus className="h-5 w-5 text-primary" /></div>
            <span className="text-xl font-black font-headline italic tracking-tighter uppercase text-glow">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fleet', label: 'Fleet Map', icon: Navigation },
            { id: 'routes', label: 'Corridors', icon: RouteIcon },
            { id: 'monetization', label: 'Monetization', icon: Ticket },
            { id: 'finance', label: 'Revenue Hub', icon: Banknote },
          ].map((item) => (
            <Button 
              key={item.id} variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-bold h-11 px-4 transition-all ${activeTab === item.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <item.icon className={`mr-3 h-4 w-4 ${activeTab === item.id ? 'text-primary' : ''}`} /> {item.label}
            </Button>
          ))}
          <div className="pt-4 mt-4 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" /> Exit terminal
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-slate-950 border-b border-white/5 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black font-headline text-white italic uppercase tracking-tight">{activeTab}</h2>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">REGIONAL HUB: {profile?.city}</p>
          </div>
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5">Network Secure</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Active Missions', value: activeTrips.length, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
                  { label: 'Network Yield', value: `₹${(totalTripCommissions + totalTopUpRevenue + totalPassRevenue).toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Fleet Assets', value: drivers.length, icon: Truck, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                  { label: 'Network Scholars', value: allUsers?.filter(u => u.role === 'rider').length || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-slate-900/50 border-white/5 rounded-[1.5rem] group hover:border-primary/20 transition-all duration-500">
                    <CardContent className="p-6">
                      <div className={`p-3 ${metric.bg} rounded-xl w-fit mb-4`}><metric.icon className={`h-5 w-5 ${metric.color}`} /></div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-white font-headline italic">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] p-8">
                  <CardTitle className="text-lg font-black italic uppercase text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Active Corridors
                  </CardTitle>
                  <div className="space-y-4">
                    {allRoutes?.slice(0, 5).map((route: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-950 rounded-xl flex justify-between items-center border border-white/5">
                        <span className="text-xs font-black uppercase italic text-white">{route.routeName}</span>
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">₹{route.baseFare} Base</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="bg-primary text-white border-none rounded-[2rem] p-10 flex flex-col justify-between overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Scholar <br/> Monetization</h3>
                    <p className="text-sm font-bold opacity-70 mt-4 max-w-xs italic">Manage ride passes and regional promo campaigns to drive scholar adoption.</p>
                  </div>
                  <Button onClick={() => setActiveTab('monetization')} className="relative z-10 w-fit bg-white text-primary font-black uppercase h-12 rounded-xl mt-8">Configure Passes</Button>
                  <Ticket className="absolute -right-8 -bottom-8 h-48 w-48 opacity-10" />
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'monetization' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] p-8">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-black uppercase italic text-primary flex items-center gap-2">
                      <PlusCircle className="h-5 w-5" /> Architect New Pass
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pass Name</Label>
                        <Input value={newPass.name} onChange={e => setNewPass({...newPass, name: e.target.value})} placeholder="e.g. Monthly VZM Express" className="bg-slate-950 border-white/10 text-white rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Regional Hub</Label>
                        <Select value={newPass.city} onValueChange={v => setNewPass({...newPass, city: v})}>
                          <SelectTrigger className="bg-slate-950 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="Vizag">Vizag</SelectItem><SelectItem value="Vizianagaram">Vizianagaram</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Rides</Label>
                        <Input type="number" value={newPass.totalRides} onChange={e => setNewPass({...newPass, totalRides: parseInt(e.target.value)})} className="bg-slate-950 border-white/10 text-white rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pass Price (₹)</Label>
                        <Input type="number" value={newPass.price} onChange={e => setNewPass({...newPass, price: parseInt(e.target.value)})} className="bg-slate-950 border-white/10 text-white rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Route Link</Label>
                        <Select value={newPass.routeName} onValueChange={v => setNewPass({...newPass, routeName: v})}>
                          <SelectTrigger className="bg-slate-950 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="All Routes">All Regional Routes</SelectItem>
                            {allRoutes?.map((r: any) => <SelectItem key={r.id} value={r.routeName}>{r.routeName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={createPass} className="w-full bg-primary text-slate-950 font-black uppercase h-14 rounded-2xl">Deploy Ride Pass</Button>
                  </div>
                </Card>

                <Card className="bg-slate-900/50 border-white/5 rounded-[2rem] p-8">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg font-black uppercase italic text-accent flex items-center gap-2">
                      <Tag className="h-5 w-5" /> Promo Protocol
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Promo Code String</Label>
                      <Input value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} placeholder="e.g. WELCOME100" className="bg-slate-950 border-white/10 text-white rounded-xl h-14 font-black text-center text-xl tracking-widest" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Credit Value (₹)</Label>
                      <Input type="number" value={newPromo.value} onChange={e => setNewPromo({...newPromo, value: parseInt(e.target.value)})} className="bg-slate-950 border-white/10 text-white rounded-xl h-14" />
                    </div>
                    <Button onClick={createPromo} className="w-full bg-accent text-white font-black uppercase h-14 rounded-2xl">Initialize Code</Button>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-900/50 border-white/5 rounded-[2rem]">
                  <CardHeader className="p-8 border-b border-white/5"><CardTitle className="text-lg font-black italic uppercase">Deployed Passes</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {allPasses?.map((p: any) => (
                        <div key={p.id} className="p-6 flex justify-between items-center hover:bg-white/5 transition-colors">
                          <div>
                            <h4 className="font-black text-white uppercase italic text-sm">{p.name}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{p.totalRides} Rides • {p.routeName}</p>
                          </div>
                          <p className="text-lg font-black text-primary italic">₹{p.price}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/5 rounded-[2rem]">
                  <CardHeader className="p-8 border-b border-white/5"><CardTitle className="text-lg font-black italic uppercase">Active Promo Codes</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {allPromos?.map((p: any) => (
                        <div key={p.id} className="p-6 flex justify-between items-center hover:bg-white/5 transition-colors">
                          <div>
                            <h4 className="font-black text-white uppercase italic text-sm">{p.code}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Value: ₹{p.value} • Used: {p.usageCount} Times</p>
                          </div>
                          <Badge className="bg-accent/10 text-accent border-none text-[8px] font-black uppercase">Active</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="bg-primary text-white border-none rounded-[2.5rem] p-10 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Top-Up Revenue</p>
                  <h3 className="text-5xl font-black italic mt-4 tracking-tighter">₹{totalTopUpRevenue.toFixed(0)}</h3>
                  <Wallet className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10" />
                </Card>
                <Card className="bg-slate-900 border-white/5 text-white rounded-[2.5rem] p-10 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Trip Commissions (10%)</p>
                  <h3 className="text-5xl font-black italic mt-4 tracking-tighter">₹{totalTripCommissions.toFixed(0)}</h3>
                  <Activity className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10" />
                </Card>
                <Card className="bg-white text-slate-950 border-none rounded-[2.5rem] p-10 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Total Network Yield</p>
                  <h3 className="text-5xl font-black italic mt-4 tracking-tighter">₹{(totalTopUpRevenue + totalTripCommissions + totalPassRevenue).toFixed(0)}</h3>
                  <GanttChart className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10" />
                </Card>
              </div>

              <Card className="bg-slate-900/50 border-white/5 rounded-[2rem]">
                <CardHeader className="p-8 border-b border-white/5"><CardTitle className="text-lg font-black italic uppercase">Recent Transactions</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                          <th className="py-5 pl-10">Scholar</th>
                          <th className="py-5">Type</th>
                          <th className="py-5">Time</th>
                          <th className="py-5 pr-10 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allTransactions?.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-6 pl-10">
                              <span className="font-black text-white uppercase italic text-xs">{tx.userName}</span>
                            </td>
                            <td className="py-6">
                              <Badge className={`${tx.type === 'pass-purchase' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-400'} text-[8px] font-black uppercase border-none`}>
                                {tx.type}
                              </Badge>
                            </td>
                            <td className="py-6 text-xs text-slate-500 italic font-bold">{new Date(tx.timestamp).toLocaleString()}</td>
                            <td className="py-6 pr-10 text-right font-black text-white italic">₹{tx.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="h-[calc(100vh-14rem)] relative border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              {isLoaded ? (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={{ lat: 17.6868, lng: 83.2185 }} zoom={12} options={mapOptions}>
                  {drivers.filter(d => typeof d.currentLat === 'number').map((driver: any) => (
                    <Marker 
                      key={driver.uid} position={{ lat: driver.currentLat, lng: driver.currentLng }}
                      onClick={() => setSelectedDriver(driver)}
                      icon={{
                        url: driver.status === 'on-trip' ? 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png' : 'https://cdn-icons-png.flaticon.com/512/3448/3448564.png',
                        scaledSize: new window.google.maps.Size(32, 32)
                      }}
                    />
                  ))}
                  {selectedDriver && (
                    <InfoWindow position={{ lat: selectedDriver.currentLat, lng: selectedDriver.currentLng }} onCloseClick={() => setSelectedDriver(null)}>
                      <div className="p-4 bg-slate-900 text-white min-w-[200px]">
                        <h4 className="font-black uppercase italic text-sm">{selectedDriver.fullName}</h4>
                        <p className="text-[10px] font-black text-slate-500 uppercase mt-1">{selectedDriver.status}</p>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              ) : <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
