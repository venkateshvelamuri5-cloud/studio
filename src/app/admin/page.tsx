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

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '2rem' };
const mapOptions = { mapId: "da87e9c90896eba04be76dde", disableDefaultUI: true };

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: firebaseConfig.apiKey });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'monetization' | 'finance'>('dashboard');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  
  const [newPass, setNewPass] = useState({ name: '', city: 'Vizag', totalRides: 10, price: 450, routeName: 'All Routes' });
  const [newPromo, setNewPromo] = useState({ code: '', value: 100 });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && !authLoading && !profileLoading) {
      toast({ variant: "destructive", title: "Access Denied", description: "Admin account required." });
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
  
  const totalTripCommissions = useMemo(() => allTrips?.reduce((acc, t) => acc + (t.commissionAmount || 0), 0) || 0, [allTrips]);
  const totalTopUpRevenue = useMemo(() => allTransactions?.filter(tx => tx.type === 'top-up').reduce((acc, t) => acc + (t.amount || 0), 0) || 0, [allTransactions]);
  const totalPassRevenue = useMemo(() => allTransactions?.filter(tx => tx.type === 'pass-purchase').reduce((acc, t) => acc + (t.amount || 0), 0) || 0, [allTransactions]);

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  const createPass = async () => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'passes'), { ...newPass, isActive: true });
      toast({ title: "Pass Created", description: `${newPass.name} is now available.` });
      setNewPass({ name: '', city: 'Vizag', totalRides: 10, price: 450, routeName: 'All Routes' });
    } catch { toast({ variant: "destructive", title: "Failed to create pass" }); }
  };

  const createPromo = async () => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'promoCodes'), { ...newPromo, isActive: true, usageCount: 0 });
      toast({ title: "Promo Created", description: `Code ${newPromo.code} is now active.` });
      setNewPromo({ code: '', value: 100 });
    } catch { toast({ variant: "destructive", title: "Failed to create promo" }); }
  };

  const processPayout = async (driver: any) => {
    if (!db || !driver.weeklyEarnings) return;
    try {
      const driverRef = doc(db, 'users', driver.uid);
      await updateDoc(driverRef, {
        totalEarnings: increment(driver.weeklyEarnings),
        weeklyEarnings: 0,
        payoutHistory: arrayUnion({ amount: driver.weeklyEarnings, date: new Date().toISOString(), status: 'processed' })
      });
      toast({ title: "Payout Processed", description: `₹${driver.weeklyEarnings} sent to ${driver.fullName}` });
    } catch { toast({ variant: "destructive", title: "Payout failed" }); }
  };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-950 font-body text-slate-200">
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 border-r border-white/5 shadow-2xl z-20">
        <div className="p-8 h-24 flex items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl shadow-lg shadow-primary/10"><Bus className="h-5 w-5 text-primary" /></div>
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase text-primary">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'fleet', label: 'Fleet Map', icon: Navigation },
            { id: 'monetization', label: 'Campaigns', icon: Tag },
            { id: 'finance', label: 'Payouts', icon: Banknote },
          ].map((item) => (
            <Button 
              key={item.id} variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-black uppercase italic h-12 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon className={`mr-4 h-5 w-5 ${activeTab === item.id ? 'text-white' : ''}`} /> {item.label}
            </Button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 font-black uppercase italic" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        <header className="h-24 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black font-headline text-white italic uppercase tracking-tighter leading-none">{activeTab}</h2>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mt-2">Regional Operations Hub</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[10px] tracking-widest px-6 py-2 rounded-full shadow-inner">Network Live</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Live Trips', value: activeTrips.length, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                  { label: 'Regional Yield', value: `₹${(totalTripCommissions + totalTopUpRevenue + totalPassRevenue).toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Fleet Assets', value: drivers.length, icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                  { label: 'Active Scholars', value: allUsers?.filter(u => u.role === 'rider').length || 0, icon: Users, color: 'text-green-400', bg: 'bg-green-400/10' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-slate-900 border-white/5 rounded-[2.5rem] group hover:border-primary/20 transition-all shadow-xl">
                    <CardContent className="p-8">
                      <div className={`p-4 ${metric.bg} rounded-2xl w-fit mb-6 shadow-sm`}><metric.icon className={`h-6 w-6 ${metric.color}`} /></div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{metric.label}</p>
                      <h3 className="text-4xl font-black text-white font-headline italic leading-none">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-slate-900 border-white/5 rounded-[3rem] p-10 shadow-xl">
                  <CardTitle className="text-xl font-black italic uppercase text-white mb-8 flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-primary" /> Active Corridors
                  </CardTitle>
                  <div className="space-y-4">
                    {allRoutes?.map((route: any, i: number) => (
                      <div key={i} className="p-6 bg-slate-950 rounded-2xl flex justify-between items-center border border-white/5 group hover:border-primary/20 transition-all">
                        <span className="font-black uppercase italic text-sm text-slate-300">{route.routeName}</span>
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3 py-1">₹{route.baseFare} Base</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="bg-primary text-white border-none rounded-[3rem] p-12 flex flex-col justify-between overflow-hidden relative shadow-2xl">
                  <div className="relative z-10">
                    <h3 className="text-5xl font-black uppercase italic tracking-tighter leading-[0.9]">Scholar <br/> Monetization</h3>
                    <p className="text-sm font-bold opacity-80 mt-6 max-w-xs italic leading-relaxed">Create regional passes and promo codes to drive network adoption.</p>
                  </div>
                  <Button onClick={() => setActiveTab('monetization')} className="relative z-10 w-fit bg-white text-primary font-black uppercase h-14 rounded-2xl mt-10 px-8 hover:scale-105 transition-transform shadow-xl">Create Campaigns</Button>
                  <Ticket className="absolute -right-12 -bottom-12 h-64 w-64 opacity-10" />
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'monetization' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-slate-900 border-white/5 rounded-[3rem] p-10 shadow-xl">
                  <CardHeader className="px-0 pt-0 pb-8"><CardTitle className="text-xl font-black uppercase italic text-primary flex items-center gap-3"><PlusCircle className="h-6 w-6" /> Ride Pass Architect</CardTitle></CardHeader>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pass Name</Label>
                        <Input value={newPass.name} onChange={e => setNewPass({...newPass, name: e.target.value})} placeholder="e.g. Weekly Express" className="bg-slate-950 border-white/10 text-white rounded-2xl h-14 font-black italic px-6" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Regional Hub</Label>
                        <Select value={newPass.city} onValueChange={v => setNewPass({...newPass, city: v})}>
                          <SelectTrigger className="bg-slate-950 border-white/10 text-white rounded-2xl h-14 font-black px-6"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="Vizag">Vizag Hub</SelectItem><SelectItem value="Vizianagaram">VZM Hub</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rides</Label>
                        <Input type="number" value={newPass.totalRides} onChange={e => setNewPass({...newPass, totalRides: parseInt(e.target.value)})} className="bg-slate-950 border-white/10 text-white rounded-2xl h-14 font-black text-center" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Price (₹)</Label>
                        <Input type="number" value={newPass.price} onChange={e => setNewPass({...newPass, price: parseInt(e.target.value)})} className="bg-slate-950 border-white/10 text-white rounded-2xl h-14 font-black text-center" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Route Link</Label>
                        <Select value={newPass.routeName} onValueChange={v => setNewPass({...newPass, routeName: v})}>
                          <SelectTrigger className="bg-slate-950 border-white/10 text-white rounded-2xl h-14 font-black px-6"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="All Routes">All Network</SelectItem>
                            {allRoutes?.map((r: any) => <SelectItem key={r.id} value={r.routeName}>{r.routeName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={createPass} className="w-full bg-primary text-white font-black uppercase h-16 rounded-2xl text-lg italic shadow-xl shadow-primary/20">Deploy Pass</Button>
                  </div>
                </Card>

                <Card className="bg-slate-900 border-white/5 rounded-[3rem] p-10 shadow-xl">
                  <CardHeader className="px-0 pt-0 pb-8"><CardTitle className="text-xl font-black uppercase italic text-accent flex items-center gap-3"><Tag className="h-6 w-6" /> Promo Protocol</CardTitle></CardHeader>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Promo Code String</Label>
                      <Input value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} placeholder="e.g. SCHOLAR100" className="bg-slate-950 border-white/10 text-white rounded-2xl h-16 font-black text-center text-3xl tracking-[0.4em] italic shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Credit Value (₹)</Label>
                      <Input type="number" value={newPromo.value} onChange={e => setNewPromo({...newPromo, value: parseInt(e.target.value)})} className="bg-slate-950 border-white/10 text-white rounded-2xl h-16 font-black text-center text-2xl italic" />
                    </div>
                    <Button onClick={createPromo} className="w-full bg-accent text-white font-black uppercase h-16 rounded-2xl text-lg italic shadow-xl shadow-accent/20">Initialize Code</Button>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-slate-900 border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardHeader className="p-10 border-b border-white/5 bg-slate-900/50"><CardTitle className="text-xl font-black italic uppercase text-white">Deployed Passes</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {allPasses?.map((p: any) => (
                        <div key={p.id} className="p-8 flex justify-between items-center hover:bg-white/5 transition-all">
                          <div><h4 className="font-black text-white uppercase italic text-base leading-none">{p.name}</h4><p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">{p.totalRides} Rides • {p.routeName}</p></div>
                          <p className="text-2xl font-black text-primary italic">₹{p.price}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardHeader className="p-10 border-b border-white/5 bg-slate-900/50"><CardTitle className="text-xl font-black italic uppercase text-white">Active Promo Codes</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {allPromos?.map((p: any) => (
                        <div key={p.id} className="p-8 flex justify-between items-center hover:bg-white/5 transition-all">
                          <div><h4 className="font-black text-white uppercase italic text-base leading-none">{p.code}</h4><p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">₹{p.value} Credit • Used: {p.usageCount} times</p></div>
                          <Badge className="bg-accent/10 text-accent border-none text-[8px] font-black uppercase px-3 py-1">Active</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="bg-slate-900 border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardHeader className="p-10 border-b border-white/5 bg-slate-900/50 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-black italic uppercase text-white">Pending Settlements</CardTitle>
                    <Badge className="bg-orange-500/10 text-orange-400 border-none font-black uppercase text-[8px] tracking-widest px-3">Review Required</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {drivers.filter(d => (d.weeklyEarnings || 0) > 0).map((driver: any) => (
                        <div key={driver.uid} className="p-8 flex justify-between items-center hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/5 font-black text-primary italic text-xl overflow-hidden">
                              {driver.photoUrl ? <img src={driver.photoUrl} className="h-full w-full object-cover" /> : driver.fullName[0]}
                            </div>
                            <div><h4 className="font-black text-white uppercase italic text-base leading-none">{driver.fullName}</h4><p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">{driver.vehicleNumber} • {driver.city}</p></div>
                          </div>
                          <div className="text-right flex items-center gap-6">
                            <div className="mr-4"><p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Unpaid Share</p><p className="text-2xl font-black text-primary italic">₹{driver.weeklyEarnings.toFixed(0)}</p></div>
                            <Button onClick={() => processPayout(driver)} className="bg-primary text-white font-black uppercase h-12 rounded-xl px-6 shadow-lg shadow-primary/20 hover:scale-105">Push Payout</Button>
                          </div>
                        </div>
                      ))}
                      {drivers.filter(d => (d.weeklyEarnings || 0) > 0).length === 0 && (
                        <div className="p-20 text-center"><p className="text-slate-500 font-bold uppercase italic text-xs">All regional settlements processed</p></div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-white/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <CardHeader className="p-10 border-b border-white/5 bg-slate-900/50"><CardTitle className="text-xl font-black italic uppercase text-white">Global Revenue Ledger</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-slate-950/50 border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest"><th className="py-6 px-10">Scholar</th><th className="py-6">Asset Type</th><th className="py-6">Timestamp</th><th className="py-6 px-10 text-right">Amount</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                          {allTransactions?.slice(0, 10).map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-white/5 transition-all">
                              <td className="py-8 px-10"><span className="font-black text-white uppercase italic text-xs">{tx.userName}</span></td>
                              <td className="py-8"><Badge className={`${tx.type === 'pass-purchase' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-400'} text-[8px] font-black uppercase border-none px-3 py-1`}>{tx.type}</Badge></td>
                              <td className="py-8 text-[10px] text-slate-500 italic font-bold uppercase">{new Date(tx.timestamp).toLocaleString()}</td>
                              <td className="py-8 px-10 text-right font-black text-white italic text-base">₹{tx.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="h-[calc(100vh-16rem)] relative border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              {isLoaded ? (
                <GoogleMap mapContainerStyle={mapContainerStyle} center={{ lat: 17.6868, lng: 83.2185 }} zoom={12} options={mapOptions}>
                  {drivers.filter(d => typeof d.currentLat === 'number').map((driver: any) => (
                    <Marker 
                      key={driver.uid} position={{ lat: driver.currentLat, lng: driver.currentLng }}
                      onClick={() => setSelectedDriver(driver)}
                      icon={{
                        url: driver.status === 'on-trip' ? 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png' : 'https://cdn-icons-png.flaticon.com/512/3448/3448564.png',
                        scaledSize: new window.google.maps.Size(36, 36)
                      }}
                    />
                  ))}
                  {selectedDriver && (
                    <InfoWindow position={{ lat: selectedDriver.currentLat, lng: selectedDriver.currentLng }} onCloseClick={() => setSelectedDriver(null)}>
                      <div className="p-5 bg-white text-slate-950 min-w-[220px] rounded-2xl shadow-xl">
                        <h4 className="font-black uppercase italic text-base text-primary leading-none">{selectedDriver.fullName}</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-widest">{selectedDriver.status} • {selectedDriver.vehicleNumber}</p>
                        <hr className="my-4 border-slate-100" />
                        <div className="flex justify-between items-center"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Share Ready</span><span className="font-black italic text-slate-900">₹{selectedDriver.weeklyEarnings?.toFixed(0)}</span></div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              ) : <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}