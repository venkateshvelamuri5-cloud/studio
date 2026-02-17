
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bus, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Users,
  TrendingUp,
  Settings,
  QrCode,
  IndianRupee,
  ShieldCheck,
  MapPinned
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments'>('dashboard');
  const [vizagUpi, setVizagUpi] = useState('');
  const [vzmUpi, setVzmUpi] = useState('');

  const { data: profile } = useDoc(useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]));
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  useEffect(() => {
    if (globalConfig) {
      setVizagUpi(globalConfig.vizagUpiId || '');
      setVzmUpi(globalConfig.vzmUpiId || '');
    }
  }, [globalConfig]);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && !authLoading) {
      router.push('/');
    }
  }, [profile, authLoading, router]);

  const { data: allTrips } = useCollection(useMemo(() => db ? query(collection(db, 'trips'), orderBy('startTime', 'desc'), limit(50)) : null, [db]));
  const { data: allUsers } = useCollection(useMemo(() => db ? query(collection(db, 'users')) : null, [db]));

  const saveConfig = async () => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'config', 'global'), {
        vizagUpiId: vizagUpi,
        vzmUpiId: vzmUpi,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Network Config Saved", description: "Payment IDs updated across the grid." });
    } catch {
      toast({ variant: "destructive", title: "Failed to update config" });
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-body text-slate-900">
      <aside className="w-72 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-2xl z-20">
        <div className="p-8 h-24 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Bus className="h-5 w-5 text-primary" /></div>
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase text-primary leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'payments', label: 'Payment Config', icon: QrCode },
          ].map((item) => (
            <Button 
              key={item.id} variant="ghost" 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full justify-start rounded-xl font-black uppercase italic h-12 px-5 transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-primary hover:bg-slate-50'}`}
            >
              <item.icon className="mr-4 h-5 w-5" /> {item.label}
            </Button>
          ))}
          <div className="pt-8 mt-8 border-t border-slate-100">
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 font-black uppercase italic h-12" onClick={handleSignOut}>
              <LogOut className="mr-4 h-5 w-5" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 px-10 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-3xl font-black font-headline text-slate-900 italic uppercase tracking-tighter leading-none">{activeTab}</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2">Regional Operations Terminal</p>
          </div>
          <Badge className="bg-green-500/10 text-green-600 border-none font-black uppercase text-[10px] tracking-widest px-6 py-2 rounded-full">Network Online</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Active Trips', value: allTrips?.filter(t => t.status === 'active').length || 0, icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Total Scholars', value: allUsers?.filter(u => u.role === 'rider').length || 0, icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
                  { label: 'Live Revenue', value: `₹${allTrips?.reduce((acc, t) => acc + (t.riderCount * t.farePerRider || 0), 0).toFixed(0)}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/5' },
                ].map((metric, i) => (
                  <Card key={i} className="border-none bg-white rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-8">
                      <div className={`p-4 ${metric.bg} rounded-2xl w-fit mb-6`}><metric.icon className={`h-6 w-6 ${metric.color}`} /></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{metric.label}</p>
                      <h3 className="text-4xl font-black text-slate-900 font-headline italic leading-none">{metric.value}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-none bg-white rounded-[3rem] shadow-sm overflow-hidden">
                <CardHeader className="p-10 border-b border-slate-50"><CardTitle className="text-xl font-black italic uppercase text-slate-900 flex items-center gap-3"><TrendingUp className="h-6 w-6 text-primary" /> Live Mission Logs</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <th className="py-6 px-10">Route</th>
                        <th className="py-6">Driver</th>
                        <th className="py-6">Boarded</th>
                        <th className="py-6 px-10 text-right">Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allTrips?.map((trip: any) => (
                        <tr key={trip.id} className="hover:bg-slate-50 transition-all">
                          <td className="py-8 px-10"><span className="font-black text-slate-900 uppercase italic text-xs">{trip.routeName}</span></td>
                          <td className="py-8 text-xs font-bold text-slate-500 italic uppercase">{trip.driverName}</td>
                          <td className="py-8"><Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">{trip.riderCount} / {trip.maxCapacity}</Badge></td>
                          <td className="py-8 px-10 text-right font-black text-slate-900 italic text-base">₹{(trip.riderCount * trip.farePerRider || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="max-w-2xl space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <Card className="border-none bg-white rounded-[3rem] p-12 shadow-sm space-y-10">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black italic uppercase text-primary leading-none">Network Payment Config</h3>
                  <p className="text-sm font-bold text-slate-400 italic">Set the UPI IDs for direct scholar payments.</p>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vizag Hub UPI ID</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      <Input value={vizagUpi} onChange={e => setVizagUpi(e.target.value)} placeholder="vizag.aago@upi" className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-black italic text-lg" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vizianagaram Hub UPI ID</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      <Input value={vzmUpi} onChange={e => setVzmUpi(e.target.value)} placeholder="vzm.aago@upi" className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-black italic text-lg" />
                    </div>
                  </div>

                  <Button onClick={saveConfig} className="w-full h-18 bg-primary text-white font-black uppercase italic text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Update Grid Config</Button>
                </div>
              </Card>

              <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/10 flex items-start gap-6">
                <QrCode className="h-10 w-10 text-primary shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-black uppercase italic text-primary">Direct-to-Bank Logic</h4>
                  <p className="text-xs font-bold text-slate-500 italic leading-relaxed">Payments are handled directly via student handset UPI. The system verifies successful transaction IDs before allotting shuttle seats to prevent revenue leakage.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
