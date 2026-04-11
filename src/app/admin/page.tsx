"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Users,
  QrCode,
  Route as RouteIcon,
  Sparkles,
  Search,
  Ticket,
  UserCheck,
  Car,
  User,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  TrendingUp,
  Map as MapIcon,
  CheckCircle2
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, updateDoc, orderBy, addDoc, deleteDoc, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'routes' | 'fleet' | 'ai-architect' | 'vouchers'>('dashboard');
  const [primaryUpiId, setPrimaryUpiId] = useState('');
  const [secondaryUpiId, setSecondaryUpiId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);

  // AI Architect State
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    startPoint: "Residential Hub A",
    endPoint: "Corporate Park B",
    demandVolume: "High commute morning 8-10 AM, ~200 people waiting",
    trafficContext: "Moderate congestion near main junction"
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New Route State
  const [newRoute, setNewRoute] = useState({ name: '', fare: 40, stops: '' });
  const [newVoucher, setNewVoucher] = useState({ code: '', amount: 50 });

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const globalConfigRef = useMemo(() => db ? doc(db, 'config', 'global') : null, [db]);
  const { data: globalConfig } = useDoc(globalConfigRef);

  useEffect(() => {
    if (globalConfig) {
      setPrimaryUpiId((globalConfig as any).primaryUpiId || '');
      setSecondaryUpiId((globalConfig as any).secondaryUpiId || '');
    }
  }, [globalConfig]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/admin/login');
    if (!authLoading && profile && profile.role !== 'admin' && user?.email !== 'admin@aago.in') router.push('/admin/login');
  }, [profile, authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: activeTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), where('status', '==', 'active')) : null, [db]));
  const { data: allVouchers } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers'), orderBy('createdAt', 'desc')) : null, [db]));

  const stats = useMemo(() => {
    if (!allUsers) return { totalRiders: 0, totalDrivers: 0, activeDrivers: 0, pendingDrivers: 0, utilization: 0 };
    const drivers = allUsers.filter(u => u.role === 'driver');
    const onTrip = drivers.filter(d => d.status === 'on-trip').length;
    return {
      totalRiders: allUsers.filter(u => u.role === 'rider').length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(u => u.status !== 'offline').length,
      pendingDrivers: drivers.filter(u => !u.isVerified).length,
      utilization: drivers.length > 0 ? Math.round((onTrip / drivers.length) * 100) : 0
    };
  }, [allUsers]);

  const handleUpdateConfig = () => {
    if (!globalConfigRef) return;
    setIsSaving(true);
    setDoc(globalConfigRef, { primaryUpiId, secondaryUpiId }, { merge: true })
      .then(() => { setIsSaving(false); toast({ title: "Grid Config Synced" }); })
      .catch(() => setIsSaving(false));
  };

  const handleVerifyUser = (uid: string) => {
    if (!db) return;
    updateDoc(doc(db, 'users', uid), { isVerified: true })
      .then(() => toast({ title: "Operator Authorized" }));
  };

  const deployRoute = (routeData: any) => {
    if (!db) return;
    const stopsArray = Array.isArray(routeData.stops) 
      ? routeData.stops.map((s: string) => ({ name: s }))
      : routeData.stops.split(',').map((s: string) => ({ name: s.trim() }));
    
    addDoc(collection(db, 'routes'), {
      routeName: routeData.routeName || routeData.name,
      baseFare: Number(routeData.suggestedBaseFare || routeData.fare),
      stops: stopsArray,
      status: 'active',
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Corridor Deployed Successfully" });
      setIsRouteDialogOpen(false);
    });
  };

  const handleRunAiArchitect = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Architect Error', description: 'Failed to generate corridor.' });
    } finally { setIsAiLoading(false); }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading || (profileLoading && user?.email !== 'admin@aago.in')) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden selection:bg-primary selection:text-black">
      <aside className="w-72 bg-black/20 flex flex-col shrink-0 border-r border-white/5 shadow-sm z-20 backdrop-blur-3xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary rounded-xl text-black shadow-lg shadow-primary/20"><ConnectingDotsLogo className="h-5 w-5" /></div>
            <span className="text-2xl font-black italic tracking-tighter uppercase text-primary text-glow leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Command Hub', icon: LayoutDashboard },
            { id: 'routes', label: 'Corridor Deploy', icon: RouteIcon },
            { id: 'fleet', label: 'Fleet Intel', icon: Car },
            { id: 'vouchers', label: 'Voucher Hub', icon: Ticket },
            { id: 'payments', label: 'Money Grid', icon: QrCode },
            { id: 'ai-architect', label: 'AI Architect', icon: Sparkles },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all border-none ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <button className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 font-black uppercase italic h-14 px-5 rounded-xl transition-all" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Terminate Access
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-background border-b border-white/5 px-10 flex items-center justify-between backdrop-blur-3xl">
          <div>
            <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter leading-none">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2 flex items-center gap-2">
               <Activity className="h-3 w-3 text-primary animate-pulse" /> Grid Operations Terminal
            </p>
          </div>
          <div className="flex items-center gap-4">
            {stats.pendingDrivers > 0 && <Badge className="bg-destructive text-destructive-foreground animate-pulse border-none font-black uppercase text-[9px] px-4 py-2 rounded-full">{stats.pendingDrivers} Auth Pending</Badge>}
            <Badge className="bg-primary/10 text-primary border-none font-black uppercase text-[9px] tracking-widest px-6 py-2 rounded-full">System Pulse: Healthy</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Riders', value: stats.totalRiders, icon: Users, color: 'text-primary' },
                  { label: 'Fleet Capacity', value: stats.totalDrivers, icon: Car, color: 'text-primary/60' },
                  { label: 'Utilization', value: `${stats.utilization}%`, icon: Zap, color: 'text-accent' },
                  { label: 'Active Corridors', value: allRoutes?.length || 0, icon: RouteIcon, color: 'text-primary' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
                    <CardContent className="p-6">
                      <div className={`p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-all`}><metric.icon className={`h-5 w-5 ${metric.color}`} /></div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p>
                      <h3 className="text-3xl font-black text-foreground font-headline italic leading-none tracking-tighter">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                       <CardTitle className="text-xl font-black italic uppercase text-primary">Live Grid Pulse</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y divide-white/5">
                          {activeTrips?.slice(0, 5).map((trip: any) => (
                            <div key={trip.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Navigation className="h-5 w-5" /></div>
                                  <div>
                                     <p className="font-black italic uppercase text-foreground leading-none">{trip.routeName}</p>
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 italic">{trip.riderCount} Boarded • {trip.driverName || 'Operator Pending'}</p>
                                  </div>
                               </div>
                               <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">LIVE</Badge>
                            </div>
                          ))}
                          {(!activeTrips || activeTrips.length === 0) && (
                            <div className="p-20 text-center text-muted-foreground italic font-black uppercase text-[10px] tracking-widest opacity-20">No active missions in the grid</div>
                          )}
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center space-y-6">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-2xl shadow-primary/20 animate-pulse"><TrendingUp className="h-10 w-10" /></div>
                    <div className="space-y-2">
                       <h3 className="text-4xl font-black italic uppercase tracking-tighter">Growth Logic</h3>
                       <p className="text-sm font-bold text-muted-foreground italic uppercase tracking-widest max-w-xs">AI Architect has identified 3 new demand zones. Visit Architect to deploy.</p>
                    </div>
                    <Button onClick={() => setActiveTab('ai-architect')} className="bg-primary text-black font-black uppercase italic px-10 h-14 rounded-2xl shadow-xl shadow-primary/20">Expand Grid</Button>
                 </Card>
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Fleet Intelligence</h3>
                  <div className="relative w-80">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10" />
                     <Input placeholder="Search Operator..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-14 rounded-2xl bg-white/5 border-white/10 shadow-sm font-black italic text-sm" />
                  </div>
               </div>
               
               <Card className="glass-card rounded-3xl shadow-sm overflow-hidden border-white/10">
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-white/10">
                          <th className="py-6 px-10">Operator</th>
                          <th className="py-6">Corridor Status</th>
                          <th className="py-6">Authorization</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers?.filter(u => u.role === 'driver').map((u: any) => (
                          <tr key={u.uid} className="hover:bg-white/5 transition-all">
                             <td className="py-6 px-10">
                                <div className="flex items-center gap-5">
                                   <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden italic border border-white/5">
                                      {u.photoUrl ? <img src={u.photoUrl} className="h-full w-full object-cover" /> : <User className="h-6 w-6 opacity-30" />}
                                   </div>
                                   <div>
                                      <p className="font-black text-foreground uppercase italic text-sm leading-none">{u.fullName}</p>
                                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">{u.phoneNumber}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="py-6">
                                <Badge className={`${u.status === 'on-trip' ? 'bg-primary text-black' : u.status === 'available' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted-foreground'} border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full`}>
                                   {u.status === 'on-trip' ? `On Corridor: ${u.activeTripId?.slice(0, 5)}` : u.status}
                                </Badge>
                             </td>
                             <td className="py-6">
                                <div className="flex items-center gap-2">
                                   {u.isVerified ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                                   <span className={`text-[8px] font-black uppercase tracking-widest ${u.isVerified ? 'text-primary' : 'text-destructive'}`}>
                                      {u.isVerified ? 'Synchronized' : 'Auth Required'}
                                   </span>
                                </div>
                             </td>
                             <td className="py-6 px-10 text-right">
                                {!u.isVerified && (
                                   <Button onClick={() => handleVerifyUser(u.uid)} className="bg-primary text-black font-black uppercase italic text-[9px] h-10 px-6 rounded-xl shadow-lg shadow-primary/20">Authorize Operator</Button>
                                )}
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
               </Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Corridor Deployer</h3>
                  <div className="flex gap-4">
                     <Button variant="outline" onClick={() => setActiveTab('ai-architect')} className="border-primary/20 text-primary font-black uppercase italic h-14 px-8 rounded-2xl flex items-center gap-3">
                        <Sparkles className="h-5 w-5" /> Architect Corridor
                     </Button>
                     <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
                        <DialogTrigger asChild>
                           <Button className="bg-primary text-black font-black uppercase italic h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 flex items-center gap-3">
                              <Plus className="h-5 w-5" /> Manual Deploy
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background border-white/10 rounded-[2rem] p-10">
                           <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Deploy Corridor</DialogTitle></DialogHeader>
                           <div className="space-y-6 mt-6">
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Corridor Name</Label>
                                 <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. City Central Hub" className="h-14 bg-white/5 border-white/10 font-black italic" />
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Base Fare (₹)</Label>
                                 <Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: Number(e.target.value)})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nodes (comma separated)</Label>
                                 <Input value={newRoute.stops} onChange={e => setNewRoute({...newRoute, stops: e.target.value})} placeholder="Hub A, Hub B, Hub C" className="h-14 bg-white/5 border-white/10 font-black italic" />
                              </div>
                              <Button onClick={() => deployRoute(newRoute)} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Activate Grid Path</Button>
                           </div>
                        </DialogContent>
                     </Dialog>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {allRoutes?.map((route: any) => (
                    <Card key={route.id} className="bg-white/5 border-white/10 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all">
                       <CardContent className="p-8 space-y-6">
                          <div className="flex justify-between items-start">
                             <div className="space-y-1">
                                <h4 className="text-xl font-black italic uppercase text-foreground leading-none">{route.routeName}</h4>
                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full mt-2">Base: ₹{route.baseFare}</Badge>
                             </div>
                             <Button variant="ghost" size="icon" onClick={() => { if(confirm('Erase Corridor?')) deleteDoc(doc(db!, 'routes', route.id)) }} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-5 w-5" /></Button>
                          </div>
                          <div className="space-y-3">
                             <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <Target className="h-3 w-3" /> Grid Segments
                             </p>
                             <div className="flex flex-wrap gap-2">
                                {route.stops?.map((s: any, i: number) => (
                                  <Badge key={i} className="bg-white/5 text-muted-foreground border-none font-black text-[8px] uppercase px-3 py-1 rounded-full">{s.name}</Badge>
                                ))}
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'ai-architect' && (
             <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Sparkles className="h-6 w-6" /></div>
                   <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Grid Architect AI</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit sticky top-0">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Start Node</Label>
                            <Input value={aiInput.startPoint} onChange={e => setAiInput({...aiInput, startPoint: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">End Node</Label>
                            <Input value={aiInput.endPoint} onChange={e => setAiInput({...aiInput, endPoint: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Rider Demand Profile</Label>
                         <textarea value={aiInput.demandVolume} onChange={e => setAiInput({...aiInput, demandVolume: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Real-time Traffic Context</Label>
                         <textarea value={aiInput.trafficContext} onChange={e => setAiInput({...aiInput, trafficContext: e.target.value})} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 font-black italic text-sm text-foreground focus:border-primary outline-none" />
                      </div>
                      <Button onClick={handleRunAiArchitect} disabled={isAiLoading} className="w-full h-18 bg-primary text-black rounded-2xl font-black uppercase italic text-lg shadow-xl shadow-primary/20 transition-all active:scale-95">
                         {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Architect Corridor"}
                      </Button>
                   </Card>

                   <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-10 overflow-hidden relative min-h-[600px]">
                      {!aiResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                           <MapIcon className="h-24 w-24 mb-6" />
                           <p className="font-black italic uppercase tracking-widest text-[10px]">Architect Awaiting Command</p>
                        </div>
                      ) : (
                        <div className="space-y-10 animate-in fade-in">
                           <div className="space-y-3">
                              <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-4 py-1.5 rounded-full">Proposed Architecture</Badge>
                              <p className="text-sm font-medium italic text-muted-foreground leading-relaxed">{aiResult.optimizationSummary}</p>
                           </div>
                           
                           <div className="space-y-6">
                              {aiResult.optimizedRoutes.map((r: any, i: number) => (
                                <Card key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6 group">
                                   <div className="flex justify-between items-start">
                                      <div className="space-y-1">
                                         <h5 className="text-2xl font-black italic uppercase text-foreground group-hover:text-primary transition-colors">{r.routeName}</h5>
                                         <p className="text-[10px] font-black text-primary uppercase italic tracking-widest">{r.schedule}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">AI Fare Logic</p>
                                         <p className="text-3xl font-black italic text-foreground tracking-tighter">₹{r.suggestedBaseFare}</p>
                                      </div>
                                   </div>
                                   <div className="p-6 bg-black/60 rounded-2xl space-y-3">
                                      <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                         <Target className="h-3 w-3" /> Architecture Justification
                                      </p>
                                      <p className="text-xs italic text-muted-foreground leading-relaxed">{r.aiJustification}</p>
                                   </div>
                                   <div className="space-y-4">
                                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Network Nodes</p>
                                      <div className="flex flex-wrap gap-2">
                                         {r.stops.map((s: string, idx: number) => (
                                           <Badge key={idx} className="bg-white/5 text-muted-foreground border-none font-black text-[8px] uppercase px-3 py-1.5 rounded-full">
                                              {idx === 0 ? 'START: ' : idx === r.stops.length - 1 ? 'END: ' : ''}{s}
                                           </Badge>
                                         ))}
                                      </div>
                                   </div>
                                   <Button onClick={() => deployRoute(r)} className="w-full h-16 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 group-hover:scale-[1.02] transition-all">
                                      Deploy AI Corridor
                                   </Button>
                                </Card>
                              ))}
                           </div>
                        </div>
                      )}
                   </Card>
                </div>
             </div>
          )}

          {activeTab === 'vouchers' && (
             <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex justify-between items-center">
                   <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Community Incentives</h3>
                   <Dialog open={isVoucherDialogOpen} onOpenChange={setIsVoucherDialogOpen}>
                      <DialogTrigger asChild>
                         <Button className="bg-primary text-black font-black uppercase italic h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 flex items-center gap-3">
                            <Plus className="h-5 w-5" /> Issue Grid Voucher
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background border-white/10 rounded-[2rem] p-10">
                         <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-primary">Issue Voucher</DialogTitle></DialogHeader>
                         <div className="space-y-6 mt-6">
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Voucher Code</Label>
                               <Input value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})} placeholder="AAGO50" className="h-14 bg-white/5 border-white/10 font-black italic" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Discount Value (₹)</Label>
                               <Input type="number" value={newVoucher.amount} onChange={e => setNewVoucher({...newVoucher, amount: Number(e.target.value)})} className="h-14 bg-white/5 border-white/10 font-black italic" />
                            </div>
                            <Button onClick={() => { addDoc(collection(db!, 'vouchers'), { ...newVoucher, isActive: true, createdAt: new Date().toISOString() }).then(() => { setIsVoucherDialogOpen(false); toast({ title: "Voucher Issued" }); }); }} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Issue to Grid</Button>
                         </div>
                      </DialogContent>
                   </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {allVouchers?.map((v: any) => (
                     <Card key={v.id} className="bg-white/5 border-white/10 rounded-3xl p-8 relative group overflow-hidden hover:border-primary/40 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Ticket className="h-12 w-12" /></div>
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">{v.code}</p>
                        <h4 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">₹{v.discountAmount || v.amount}</h4>
                        <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, 'vouchers', v.id))} className="absolute top-4 right-4 text-destructive opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-4 w-4" /></Button>
                     </Card>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-10 animate-in fade-in duration-700 max-w-2xl">
              <h3 className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Settlement Protocol</h3>
              <Card className="bg-white/5 border-white/10 rounded-3xl p-10 space-y-8">
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Primary Settlement UPI ID</Label>
                    <Input value={primaryUpiId} onChange={e => setPrimaryUpiId(e.target.value)} placeholder="merchant@upi" className="h-16 bg-white/5 border-white/10 font-black italic text-lg" />
                 </div>
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Secondary Settlement UPI ID</Label>
                    <Input value={secondaryUpiId} onChange={e => setSecondaryUpiId(e.target.value)} placeholder="merchant2@upi" className="h-16 bg-white/5 border-white/10 font-black italic text-lg" />
                 </div>
                 <Button onClick={handleUpdateConfig} disabled={isSaving} className="w-full bg-primary text-black h-18 rounded-2xl font-black uppercase italic text-lg shadow-lg active:scale-95 transition-all">
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Sync Payment Terminal"}
                 </Button>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
