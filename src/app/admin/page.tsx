
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { 
  LayoutDashboard, LogOut, Loader2, Users, Route as RouteIcon, Car, Target, BarChart3, Smile, Plus, Trash2, Ticket, CheckCircle2, ShieldAlert, ShieldCheck, Edit, Briefcase, Zap, Sparkles, FileText, Image as ImageIcon
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useAuth } from '@/firebase';
import { collection, query, doc, orderBy, addDoc, deleteDoc, getDocs, updateDoc, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { analyzeDemandIntelligence, DemandIntelligenceOutput } from '@/ai/flows/admin-demand-intelligence-flow';

const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

type AdminTab = 'dashboard' | 'customers' | 'drivers' | 'routes' | 'rides' | 'analytics' | 'coupons';

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isCleaning, setIsCleaning] = useState(false);
  const [isAllocatingBatch, setIsAllocatingBatch] = useState(false);
  
  // AI Insights State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<DemandIntelligenceOutput | null>(null);

  // Edit/Delete User State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ fullName: '', phoneNumber: '', identityNumber: '', role: '' });

  // Assignment State
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isAllocating, setIsAllocating] = useState(false);

  // Route Creation State
  const [newRoute, setNewRoute] = useState({ name: '', fare: '', schedule: '', stops: [] as any[] });
  const [tempStopName, setTempStopName] = useState("");

  // Coupon Creation State
  const [newVoucher, setNewVoucher] = useState({ code: '', discount: '', limit: '' });

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !authLoading && !user) router.push('/admin/login'); }, [mounted, authLoading, user, router]);

  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));
  const { data: allRoutes } = useCollection(useMemo(() => db ? query(collection(db, 'routes'), orderBy('createdAt', 'desc')) : null, [db]));
  const { data: trips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), orderBy('scheduledDate', 'desc')) : null, [db]));
  const { data: vouchers } = useCollection(useMemo(() => db ? query(collection(db, 'vouchers')) : null, [db]));

  const drivers = useMemo(() => allUsers?.filter(u => u.role === 'driver') || [], [allUsers]);
  const customers = useMemo(() => allUsers?.filter(u => u.role === 'rider' || u.role === 'customer') || [], [allUsers]);

  // Robust date parsing
  const ensureDate = (val: any): Date => {
    if (!val) return new Date(0);
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      try { return parseISO(val); } catch (e) { return new Date(val); }
    }
    if (val && typeof val.toDate === 'function') return val.toDate();
    return new Date(val);
  };

  const stats = useMemo(() => {
    if (!allUsers) return { totalCustomers: 0, totalDrivers: 0, activeDrivers: 0, avgNps: 8.8, repeatRate: 0 };
    const completedTrips = (trips || []).filter(t => t.status === 'completed');
    const riderVisits: Record<string, number> = {};
    completedTrips.forEach(t => t.passengerManifest?.forEach((m: any) => { if (m.uid) riderVisits[m.uid] = (riderVisits[m.uid] || 0) + 1; }));
    const repeatRate = customers.length > 0 ? Math.round((Object.values(riderVisits).filter(count => count > 1).length / customers.length) * 100) : 0;
    return { totalCustomers: customers.length, totalDrivers: drivers.length, activeDrivers: drivers.filter(d => d.status === 'available' || d.status === 'on-trip').length, avgNps: 8.8, repeatRate };
  }, [allUsers, trips, drivers, customers]);

  const chartData = useMemo(() => {
    if (!mounted || !allUsers || !trips) return { growth: [], repeatData: [] };
    const growth = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = allUsers.filter(u => {
        if (!u.createdAt) return false;
        return isSameDay(ensureDate(u.createdAt), date);
      }).length;
      return { name: format(date, 'MMM dd'), users: count };
    });
    const repeatData = [{ name: 'Repeat', value: stats.repeatRate, fill: 'hsl(var(--primary))' }, { name: 'New', value: Math.max(0, 100 - stats.repeatRate), fill: 'rgba(255,255,255,0.1)' }];
    return { growth, repeatData };
  }, [mounted, allUsers, trips, stats.repeatRate]);

  const runAiAnalysis = async () => {
    if (!trips || !allRoutes) return;
    setIsAnalyzing(true);
    try {
      const snapshot = `Active Trips: ${trips.filter(t => t.status === 'active').length}. Average Occupancy: ${stats.repeatRate}%`;
      const result = await analyzeDemandIntelligence({
        gridSnapshot: snapshot,
        unmetRequests: "High demand seen for IT Park corridor during 9 AM slot.",
        externalContext: "Heavy rain season in the city."
      });
      setAiReport(result);
    } catch (e) {
      toast({ variant: 'destructive', title: "AI Error", description: "Failed to run grid intelligence." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const availableDriversForTrip = useMemo(() => {
    if (!selectedTrip || !drivers) return [];
    return drivers.filter(d => d.isVerified && !d.isBlocked && !trips?.some(t => t.driverId === d.uid && t.status !== 'completed' && t.scheduledDate === selectedTrip.scheduledDate && t.scheduledTime === selectedTrip.scheduledTime));
  }, [selectedTrip, drivers, trips]);

  const handleAssignDriver = async (driver: any) => {
    if (!db || !selectedTrip) return;
    try {
      await updateDoc(doc(db, 'trips', selectedTrip.id), { driverId: driver.uid, driverName: driver.fullName, driverPhoto: driver.photoUrl || null, vehicleNumber: driver.vehicleNumber });
      toast({ title: "Driver Duty Assigned" });
      setIsAllocating(false);
    } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
  };

  const handleSmartAllocate = async () => {
    if (!db || !trips || !drivers) return;
    setIsAllocatingBatch(true);
    let assignedCount = 0;
    try {
      const unassignedTrips = trips.filter(t => !t.driverId && t.status === 'active' && t.riderCount > 0).sort((a, b) => (b.riderCount || 0) - (a.riderCount || 0));
      const verifiedDrivers = drivers.filter(d => d.isVerified && !d.isBlocked);

      for (const trip of unassignedTrips) {
        const candidate = verifiedDrivers.find(d => {
          const isPreferringRoute = d.preferredRoute === trip.routeName;
          const isFree = !trips.some(t => t.driverId === d.uid && t.status !== 'completed' && t.scheduledDate === trip.scheduledDate && t.scheduledTime === trip.scheduledTime);
          return isPreferringRoute && isFree;
        });

        if (candidate) {
          await updateDoc(doc(db, 'trips', trip.id), { driverId: candidate.uid, driverName: candidate.fullName, driverPhoto: candidate.photoUrl || null, vehicleNumber: candidate.vehicleNumber });
          assignedCount++;
        }
      }
      toast({ title: "Auto Assignment Done", description: `Gave duty to ${assignedCount} drivers for high-demand rides.` });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Algorithm failed." });
    } finally { setIsAllocatingBatch(false); }
  };

  const handleApproveDriver = async (driverId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', driverId), { isVerified: true });
      toast({ title: "Driver Approved" });
    } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
  };

  const handleToggleBlock = async (user: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { isBlocked: !user.isBlocked });
      toast({ title: user.isBlocked ? "Unblocked" : "Blocked" });
    } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
  };

  const handleSaveEdit = async () => {
    if (!db || !selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), editFormData);
      toast({ title: "Profile Updated" });
      setIsEditDialogOpen(false);
    } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
  };

  const handleAddRoute = async () => {
    if (!db || !newRoute.name || newRoute.stops.length < 2) return;
    try {
      await addDoc(collection(db, 'routes'), { routeName: newRoute.name, baseFare: Number(newRoute.fare), schedule: newRoute.schedule, stops: newRoute.stops, status: 'active', createdAt: new Date().toISOString() });
      toast({ title: "Route Created" });
      setNewRoute({ name: '', fare: '', schedule: '', stops: [] });
    } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
  };

  if (!mounted || authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-background text-foreground font-body overflow-hidden">
      <aside className="w-72 bg-black/40 flex flex-col shrink-0 border-r border-white/5 backdrop-blur-xl">
        <div className="p-8 h-28 flex items-center border-b border-white/5"><div className="flex items-center gap-4"><div className="p-2.5 bg-primary rounded-xl text-black shadow-lg"><Logo className="h-5 w-5" /></div><span className="text-2xl font-black italic tracking-tighter uppercase text-primary">AAGO ADMIN</span></div></div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, 
            { id: 'customers', label: 'Passengers', icon: Users }, 
            { id: 'drivers', label: 'Drivers', icon: Car }, 
            { id: 'routes', label: 'Routes', icon: RouteIcon }, 
            { id: 'rides', label: 'Rides', icon: Briefcase }, 
            { id: 'analytics', label: 'Data', icon: BarChart3 }, 
            { id: 'coupons', label: 'Coupons', icon: Ticket },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as AdminTab)} className={`w-full flex items-center justify-start rounded-xl font-black uppercase italic h-14 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:bg-white/5'}`}>
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5"><button className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 font-black uppercase italic h-14 px-5 rounded-xl transition-all" onClick={async () => { if (auth) await signOut(auth); router.push('/admin/login'); }}><LogOut className="mr-4 h-5 w-5" /> Logout</button></div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 border-b border-white/5 px-10 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md">
          <h2 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">{activeTab}</h2>
          <div className="flex gap-4">
            {activeTab === 'dashboard' && (
              <Button onClick={runAiAnalysis} disabled={isAnalyzing} className="bg-primary text-black h-12 rounded-xl font-black uppercase italic shadow-lg active:scale-95 transition-all">
                {isAnalyzing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />} AI Insights
              </Button>
            )}
            {activeTab === 'rides' && <Button onClick={handleSmartAllocate} disabled={isAllocatingBatch} className="bg-primary text-black h-12 rounded-xl font-black uppercase italic shadow-lg active:scale-95 transition-all"><Zap className={`mr-2 h-5 w-5 ${isAllocatingBatch ? 'animate-pulse' : ''}`} /> Auto Assign</Button>}
            <Button onClick={() => setIsCleaning(true)} variant="outline" className="border-destructive/20 text-destructive h-12 rounded-xl font-black uppercase italic hover:bg-destructive/10 transition-all">Reset All</Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              {aiReport && (
                <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] p-8 space-y-4 border-l-8 border-primary animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles className="h-6 w-6" />
                    <h3 className="text-xl font-black italic uppercase">Grid Architect Insights</h3>
                  </div>
                  <p className="text-sm font-bold italic text-muted-foreground uppercase tracking-wide">{aiReport.strategicSummary}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiReport.hotspots.map((h, i) => (
                      <div key={i} className="bg-black/20 p-4 rounded-xl space-y-1 border border-white/5">
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black">{h.demandLevel}</Badge>
                        <p className="font-black italic text-foreground uppercase">{h.locationName}</p>
                        <p className="text-[10px] text-muted-foreground font-bold italic">{h.justification}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[ { label: 'Active Drivers', value: stats.activeDrivers, icon: Car }, { label: 'Total Passengers', value: stats.totalCustomers, icon: Users }, { label: 'Happiness Index', value: stats.avgNps, icon: Smile }, { label: 'Repeat Rate', value: `${stats.repeatRate}%`, icon: Target }, ].map((metric, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 rounded-2xl border-b-4 border-primary/20 shadow-xl"><CardContent className="p-6"><div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 shadow-inner"><metric.icon className="h-5 w-5 text-primary" /></div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{metric.label}</p><h3 className="text-3xl font-black text-foreground italic">{metric.value}</h3></CardContent></Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-right-8"><Table><TableHeader className="bg-white/5"><TableRow className="border-white/5"><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Name</TableHead><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Contact</TableHead><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16">Status</TableHead><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic h-16 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{customers.map((c: any) => (
                <TableRow key={c.id} className="border-white/5 hover:bg-white/5 transition-colors"><TableCell className="font-black italic py-6"><div className="flex flex-col"><span>{c.fullName}</span><span className="text-[9px] font-bold text-muted-foreground uppercase">{c.identityNumber || 'No ID'}</span></div></TableCell><TableCell className="text-muted-foreground text-xs">{c.phoneNumber}</TableCell><TableCell><Badge className={`border-none text-[8px] font-black px-2.5 py-1 ${c.isBlocked ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>{c.isBlocked ? 'BLOCKED' : 'ACTIVE'}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => { setSelectedUser(c); setEditFormData({ fullName: c.fullName || '', phoneNumber: c.phoneNumber || '', identityNumber: c.identityNumber || '', role: c.role || '' }); setIsEditDialogOpen(true); }} className="h-9 w-9 text-primary hover:bg-primary/10"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleToggleBlock(c)} className={`h-9 w-9 ${c.isBlocked ? 'text-green-500' : 'text-orange-500'} hover:bg-white/5`}>{c.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" onClick={() => { setSelectedUser(c); setIsDeleteDialogOpen(true); }} className="h-9 w-9 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>
              ))}{customers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground uppercase font-bold italic opacity-40">No passengers yet</TableCell></TableRow>}</TableBody></Table></Card>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-10 animate-in slide-in-from-right-8">
              <div className="grid grid-cols-1 gap-6">
                <h3 className="text-xl font-black italic uppercase text-primary border-l-4 border-primary pl-4">Pending Duty Approval</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {drivers.filter(d => d.isVerified === false).map((d: any) => (
                    <Card key={d.id} className="bg-white/5 border-primary/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                            {d.photoUrl ? <img src={d.photoUrl} className="h-full w-full object-cover" /> : <Car className="h-6 w-6 text-muted-foreground" />}
                          </div>
                          <div>
                            <h4 className="text-xl font-black italic uppercase leading-none">{d.fullName}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">{d.phoneNumber}</p>
                          </div>
                        </div>
                        <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black px-3 py-1 uppercase shadow-sm">NEW APPLICANT</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                        <div className="space-y-1"><p className="text-[8px] font-black uppercase text-muted-foreground">Vehicle</p><p className="text-xs font-bold uppercase italic text-foreground">{d.vehicleNumber} ({d.vehicleType})</p></div>
                        <div className="space-y-1"><p className="text-[8px] font-black uppercase text-muted-foreground">License</p><p className="text-xs font-bold uppercase italic text-foreground">{d.licenseNumber}</p></div>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => { setSelectedUser(d); setIsDocViewerOpen(true); }} className="flex-1 h-14 border-white/10 text-primary font-black uppercase italic rounded-xl">
                          <ImageIcon className="mr-2 h-4 w-4" /> View Docs
                        </Button>
                        <Button onClick={() => handleApproveDriver(d.id)} className="flex-1 h-14 bg-primary text-black font-black uppercase italic rounded-xl shadow-xl active:scale-95 transition-all">Approve</Button>
                      </div>
                    </Card>
                  ))}
                  {drivers.filter(d => d.isVerified === false).length === 0 && <p className="text-[10px] font-bold text-muted-foreground uppercase py-10 italic opacity-40 pl-4">No new applications</p>}
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-black italic uppercase text-foreground border-l-4 border-white/20 pl-4">Verified Drivers</h3>
                <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"><Table><TableHeader className="bg-white/5"><TableRow className="border-white/5"><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Name</TableHead><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Vehicle</TableHead><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic">Status</TableHead><TableHead className="text-[10px] font-black uppercase text-muted-foreground italic text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{drivers.filter(d => d.isVerified === true).map((d: any) => (
                      <TableRow key={d.id} className="border-white/5 hover:bg-white/5 transition-colors"><TableCell className="font-black italic py-6">{d.fullName}</TableCell><TableCell className="text-xs font-bold uppercase italic">{d.vehicleNumber}</TableCell><TableCell><Badge className={`border-none text-[8px] font-black px-2.5 py-1 ${d.isBlocked ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>{d.isBlocked ? 'BLOCKED' : d.status?.toUpperCase() || 'OFFLINE'}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => { setSelectedUser(d); setIsDocViewerOpen(true); }} className="h-9 w-9 text-primary hover:bg-primary/10"><ImageIcon className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setSelectedUser(d); setEditFormData({ fullName: d.fullName || '', phoneNumber: d.phoneNumber || '', identityNumber: d.identityNumber || '', role: d.role || '' }); setIsEditDialogOpen(true); }} className="h-9 w-9 text-primary hover:bg-primary/10"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleToggleBlock(d)} className={`h-9 w-9 ${d.isBlocked ? 'text-green-500' : 'text-orange-500'} hover:bg-white/5`}>{d.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" onClick={() => { setSelectedUser(d); setIsDeleteDialogOpen(true); }} className="h-9 w-9 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>
                    ))}</TableBody></Table></Card>
              </div>
            </div>
          )}

          {activeTab === 'rides' && (
            <div className="space-y-10 animate-in slide-in-from-right-8">
              <div className="flex items-center justify-between"><h3 className="text-2xl font-black italic uppercase text-primary border-l-4 border-primary pl-4">Booking Interest</h3><p className="text-[10px] font-black uppercase text-muted-foreground italic">Filling 7-seater vans efficiently.</p></div>
              <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"><Table><TableHeader className="bg-white/5"><TableRow className="border-white/5"><TableHead className="text-[10px] font-black uppercase italic h-16">Ride Details</TableHead><TableHead className="text-[10px] font-black uppercase italic h-16">Seat Usage</TableHead><TableHead className="text-[10px] font-black uppercase italic h-16">Assigned Driver</TableHead><TableHead className="text-[10px] font-black uppercase italic h-16 text-right">Action</TableHead></TableRow></TableHeader><TableBody>{trips?.map((t: any) => (
                      <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors"><TableCell className="py-6"><div className="space-y-1"><p className="font-black italic text-lg uppercase leading-none">{t.routeName}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">{t.scheduledDate} • {t.scheduledTime}</p></div></TableCell><TableCell><div className="flex items-center gap-3"><div className="h-10 w-24 bg-white/5 rounded-full overflow-hidden relative shadow-inner"><div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(t.riderCount / t.maxCapacity) * 100}%` }} /></div><span className="font-black italic text-sm">{t.riderCount} / {t.maxCapacity}</span></div></TableCell><TableCell>{t.driverName ? <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">{t.driverPhoto ? <img src={t.driverPhoto} className="h-full w-full object-cover" /> : <Car className="h-4 w-4 text-primary" />}</div><span className="font-black italic text-sm">{t.driverName}</span></div> : <Badge variant="outline" className="text-[8px] border-destructive/20 text-destructive font-black uppercase italic px-3 py-1">NO DUTY</Badge>}</TableCell><TableCell className="text-right"><Button onClick={() => { setSelectedTrip(t); setIsAllocating(true); }} className="h-11 px-6 rounded-xl bg-primary text-black font-black uppercase italic text-xs shadow-xl active:scale-95 transition-all">Assign Duty</Button></TableCell></TableRow>
                    ))}{(!trips || trips.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground uppercase font-bold italic opacity-40">No scheduled rides</TableCell></TableRow>}</TableBody></Table></Card>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-right-8">
               <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit shadow-2xl"><div className="space-y-4"><h3 className="text-2xl font-black italic uppercase text-primary border-l-4 border-primary pl-4">Route Builder</h3></div><div className="space-y-6"><div className="grid grid-cols-1 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Name</Label><Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. Metro Express" className="h-14 bg-white/5 rounded-xl font-black italic" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Ticket Price (₹)</Label><Input type="number" value={newRoute.fare} onChange={e => setNewRoute({...newRoute, fare: e.target.value})} placeholder="150" className="h-14 bg-white/5 rounded-xl font-black italic" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Schedule</Label><Input value={newRoute.schedule} onChange={e => setNewRoute({...newRoute, schedule: e.target.value})} placeholder="08:00 AM, 05:00 PM" className="h-14 bg-white/5 rounded-xl font-black italic" /></div></div></div><div className="space-y-4 pt-4 border-t border-white/5"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Add Stop</Label><div className="flex gap-4"><Input value={tempStopName} onChange={e => setTempStopName(e.target.value)} placeholder="e.g. City Mall" className="h-14 bg-white/5 rounded-xl font-black italic flex-1" /><Button onClick={() => { if (tempStopName) { setNewRoute({...newRoute, stops: [...newRoute.stops, { name: tempStopName }]}); setTempStopName(""); } }} className="h-14 w-14 rounded-xl bg-primary text-black shadow-xl"><Plus /></Button></div></div><div className="space-y-3"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Route Stops ({newRoute.stops.length})</Label><div className="space-y-2">{newRoute.stops.map((s, i) => (<div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 shadow-sm"><div className="flex items-center gap-3"><Badge className="bg-primary/20 text-primary border-none h-6 w-6 flex items-center justify-center p-0 rounded-full font-black text-[10px]">{i + 1}</Badge><span className="font-black italic text-sm">{s.name}</span></div><Button variant="ghost" size="icon" onClick={() => setNewRoute({...newRoute, stops: newRoute.stops.filter((_, idx) => idx !== i)})} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button></div>))}{newRoute.stops.length === 0 && <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-6 italic border-2 border-dashed border-white/5 rounded-xl opacity-40">No stops yet</p>}</div></div></div><Button onClick={handleAddRoute} disabled={newRoute.stops.length < 2 || !newRoute.name} className="w-full h-18 bg-primary text-black font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 text-lg active:scale-95 transition-all">Create Route</Button></Card>
               <div className="space-y-6"><h3 className="text-2xl font-black italic uppercase text-foreground border-l-4 border-white/20 pl-4">Live Hub Routes</h3><div className="grid gap-4">{allRoutes?.map((r: any) => (<Card key={r.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group hover:border-primary/20 transition-all shadow-xl"><div className="flex items-center gap-4"><div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner"><RouteIcon className="h-6 w-6" /></div><div><p className="text-xl font-black italic uppercase text-foreground leading-none">{r.routeName}</p><p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">{r.stops?.length || 0} Stops • ₹{r.baseFare}</p></div></div><Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, 'routes', r.id))}><Trash2 className="h-5 w-5" /></Button></Card>))}</div></div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-in slide-in-from-right-8 pb-20"><Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 shadow-2xl"><div className="flex items-center justify-between mb-10"><h3 className="text-2xl font-black italic uppercase text-primary border-l-4 border-primary pl-4">Corridor Performance</h3></div><Table><TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-[10px] font-black uppercase italic">Route</TableHead><TableHead className="text-[10px] font-black uppercase italic">Total Rides</TableHead><TableHead className="text-[10px] font-black uppercase italic">Passengers</TableHead><TableHead className="text-[10px] font-black uppercase italic">Earnings</TableHead></TableRow></TableHeader><TableBody>{allRoutes?.map((r: any) => { const rTrips = trips?.filter(t => t.routeName === r.routeName) || []; const rCount = rTrips.reduce((a, c) => a + (c.riderCount || 0), 0); return (<TableRow key={r.id} className="border-white/5 hover:bg-white/5 transition-colors"><TableCell className="font-black italic py-6">{r.routeName}</TableCell><TableCell className="font-bold italic">{rTrips.length}</TableCell><TableCell className="font-bold italic text-primary">{rCount}</TableCell><TableCell className="font-black italic text-lg">₹{(rCount * r.baseFare).toFixed(0)}</TableCell></TableRow>); })}</TableBody></Table></Card></div>
          )}

          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-right-8">
               <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-10 space-y-8 h-fit shadow-2xl"><div className="space-y-4"><h3 className="text-2xl font-black italic uppercase text-primary border-l-4 border-primary pl-4">Discount Codes</h3></div><div className="space-y-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Coupon Code</Label><Input value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher, code: e.target.value})} placeholder="e.g. PAKKA50" className="h-14 bg-white/5 rounded-xl font-black italic uppercase" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Off (₹)</Label><Input type="number" value={newVoucher.discount} onChange={e => setNewVoucher({...newVoucher, discount: e.target.value})} placeholder="50" className="h-14 bg-white/5 rounded-xl font-black italic" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Max Uses</Label><Input type="number" value={newVoucher.limit} onChange={e => setNewVoucher({...newVoucher, limit: e.target.value})} placeholder="100" className="h-14 bg-white/5 rounded-xl font-black italic" /></div></div><Button onClick={async () => { if (!db || !newVoucher.code || !newVoucher.discount) return; await addDoc(collection(db, 'vouchers'), { code: newVoucher.code.toUpperCase(), discount: Number(newVoucher.discount), usageLimit: Number(newVoucher.limit) || null, usedBy: [], createdAt: new Date().toISOString() }); toast({ title: "Coupon Created" }); setNewVoucher({ code: '', discount: '', limit: '' }); }} disabled={!newVoucher.code || !newVoucher.discount} className="w-full h-18 bg-primary text-black rounded-2xl shadow-xl text-lg font-black uppercase italic active:scale-95 transition-all">Create Coupon</Button></div></Card>
               <div className="space-y-6"><h3 className="text-2xl font-black italic uppercase text-foreground border-l-4 border-white/20 pl-4">Active Coupons</h3><div className="grid gap-4">{vouchers?.map((v: any) => (<Card key={v.id} className="p-6 bg-white/5 border-white/10 rounded-3xl flex justify-between items-center group shadow-xl"><div className="flex items-center gap-4"><div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner"><Ticket className="h-6 w-6" /></div><div><p className="text-xl font-black italic uppercase text-foreground leading-none">{v.code}</p><p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">₹{v.discount} OFF • Used: {v.usedBy?.length || 0} / {v.usageLimit || '∞'}</p></div></div><Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, 'vouchers', v.id))}><Trash2 className="h-5 w-5" /></Button></Card>))}</div></div>
            </div>
          )}
        </div>
      </main>

      {/* Driver Document Viewer Dialog */}
      <Dialog open={isDocViewerOpen} onOpenChange={setIsDocViewerOpen}>
        <DialogContent className="bg-background border-white/10 rounded-[2.5rem] p-10 max-w-4xl h-[85vh] flex flex-col shadow-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-black uppercase italic text-primary">Identity Check</DialogTitle><DialogDescription className="text-xs font-bold uppercase text-muted-foreground italic">Review professional documents for {selectedUser?.fullName}.</DialogDescription></DialogHeader>
          <div className="flex-1 overflow-y-auto py-8 custom-scrollbar">
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Selfie Photo</Label>
                  <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
                    {selectedUser?.photoUrl ? <img src={selectedUser.photoUrl} className="h-full w-full object-cover" /> : <Loader2 className="animate-spin" />}
                  </div>
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">License (DL)</Label>
                  <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
                    {selectedUser?.dlPhotoUrl ? <img src={selectedUser.dlPhotoUrl} className="h-full w-full object-cover" /> : <p className="text-[10px] opacity-40">Not Uploaded</p>}
                  </div>
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Aadhaar Card</Label>
                  <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
                    {selectedUser?.aadhaarPhotoUrl ? <img src={selectedUser.aadhaarPhotoUrl} className="h-full w-full object-cover" /> : <p className="text-[10px] opacity-40">Not Uploaded</p>}
                  </div>
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Vehicle RC</Label>
                  <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
                    {selectedUser?.rcPhotoUrl ? <img src={selectedUser.rcPhotoUrl} className="h-full w-full object-cover" /> : <p className="text-[10px] opacity-40">Not Uploaded</p>}
                  </div>
               </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
             <Button variant="ghost" onClick={() => setIsDocViewerOpen(false)} className="h-14 flex-1 rounded-xl font-black uppercase italic">Close</Button>
             {!selectedUser?.isVerified && (
               <Button onClick={() => { handleApproveDriver(selectedUser.id); setIsDocViewerOpen(false); }} className="h-14 flex-1 bg-primary text-black font-black uppercase italic rounded-xl shadow-xl">Approve Identity</Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver Duty Assignment Dialog */}
      <Dialog open={isAllocating} onOpenChange={setIsAllocating}>
        <DialogContent className="bg-background border-white/10 rounded-[2.5rem] p-10 max-w-2xl h-[80vh] flex flex-col shadow-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-black uppercase italic text-primary">Assign Driver Duty</DialogTitle><DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground mt-2 italic">Showing free verified drivers for this time.</DialogDescription></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-8 custom-scrollbar">
            {availableDriversForTrip.length > 0 ? availableDriversForTrip.map((d: any) => (
                <div key={d.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-white/10 overflow-hidden border border-white/5 shadow-inner">{d.photoUrl ? <img src={d.photoUrl} className="h-full w-full object-cover" /> : <Car className="h-6 w-6 text-muted-foreground p-3" />}</div><div><p className="font-black italic uppercase text-lg leading-none">{d.fullName}</p><p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">{d.vehicleNumber} • {d.vehicleType}</p></div></div><Button onClick={() => handleAssignDriver(d)} className="h-11 px-6 bg-primary text-black font-black uppercase italic rounded-xl text-xs shadow-lg active:scale-95 transition-all">Assign</Button></div>
              )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40"><ShieldAlert className="h-12 w-12 text-destructive" /><p className="text-xs font-black uppercase italic">No free drivers for this time.</p></div>}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setIsAllocating(false)} className="w-full h-14 rounded-xl font-black uppercase italic">Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-background border-white/10 rounded-3xl p-8 max-w-md shadow-2xl"><DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-primary">Edit Profile</DialogTitle></DialogHeader><div className="space-y-5 py-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Full Name</Label><Input value={editFormData.fullName} onChange={e => setEditFormData({...editFormData, fullName: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Phone No.</Label><Input value={editFormData.phoneNumber} onChange={e => setEditFormData({...editFormData, phoneNumber: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">ID Number</Label><Input value={editFormData.identityNumber} onChange={e => setEditFormData({...editFormData, identityNumber: e.target.value})} className="h-14 bg-white/5 border-white/10 font-black italic" /></div></div><DialogFooter><Button onClick={handleSaveEdit} className="w-full bg-primary text-black h-16 rounded-2xl font-black uppercase italic shadow-xl">Save Changes</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isCleaning} onOpenChange={setIsCleaning}>
        <DialogContent className="bg-background border-white/10 rounded-3xl p-8 max-sm shadow-2xl"><DialogHeader><DialogTitle className="text-2xl font-black uppercase italic text-primary">Reset System?</DialogTitle></DialogHeader><div className="py-6 text-center"><p className="text-muted-foreground text-sm font-bold uppercase italic leading-relaxed">This will delete all rides, routes, and coupons for a clean test.</p></div><DialogFooter className="flex gap-4"><Button variant="ghost" onClick={() => setIsCleaning(false)} className="flex-1 rounded-xl font-black uppercase italic">Cancel</Button><Button onClick={async () => { if (!db) return; const cols = ['trips', 'routes', 'vouchers']; for (const c of cols) { const snap = await getDocs(collection(db, c)); await Promise.all(snap.docs.map(d => deleteDoc(doc(db, c, d.id)))); } toast({ title: "System Pakka Resetted" }); setIsCleaning(false); }} className="flex-1 bg-destructive text-white rounded-xl font-black uppercase italic shadow-lg active:scale-95 transition-all">Confirm</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
