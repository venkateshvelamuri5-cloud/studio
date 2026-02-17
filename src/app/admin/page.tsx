
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bus, 
  LayoutDashboard, 
  Navigation,
  LogOut,
  Loader2,
  Users,
  TrendingUp,
  QrCode,
  IndianRupee,
  Route as RouteIcon,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Activity
} from 'lucide-react';
import { useFirestore, useCollection, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { generateShuttleRoutes, AdminGenerateShuttleRoutesInput } from '@/ai/flows/admin-generate-shuttle-routes';

export default function AdminDashboard() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payments' | 'routes' | 'ai-architect'>('dashboard');
  const [vizagUpi, setVizagUpi] = useState('');
  const [vzmUpi, setVzmUpi] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI Architect State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState<AdminGenerateShuttleRoutesInput>({
    studentDemandPatterns: "High demand from South Campus to Beach Road during 4-6 PM.",
    historicalTrafficData: "Heavy congestion on NH-16 during peak morning hours.",
    preferredServiceHours: "6 AM to 11 PM",
  });
  const [aiResult, setAiResult] = useState<any>(null);

  const userRef = useMemo(() => (db && user?.uid) ? doc(db, 'users', user.uid) : null, [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);
  const { data: globalConfig } = useDoc(useMemo(() => db ? doc(db, 'config', 'global') : null, [db]));

  useEffect(() => {
    if (globalConfig) {
      setVizagUpi((globalConfig as any).vizagUpiId || '');
      setVzmUpi((globalConfig as any).vzmUpiId || '');
    }
  }, [globalConfig]);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && !authLoading) {
      router.push('/admin/login');
    }
  }, [profile, authLoading, router]);

  const tripsQuery = useMemo(() => db ? query(collection(db, 'trips'), orderBy('startTime', 'desc'), limit(50)) : null, [db]);
  const { data: allTrips } = useCollection(tripsQuery);
  
  const usersQuery = useMemo(() => db ? query(collection(db, 'users')) : null, [db]);
  const { data: allUsers } = useCollection(usersQuery);

  const saveConfig = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'global'), {
        vizagUpiId: vizagUpi,
        vzmUpiId: vzmUpi,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Network Config Saved", description: "Regional payment endpoints updated across the grid." });
    } catch {
      toast({ variant: "destructive", title: "Failed to update configuration" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiGeneration = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateShuttleRoutes(aiInput);
      setAiResult(result);
      toast({ title: "AI Architect Complete", description: "New optimized corridor schematics generated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Generation Failed", description: e.message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSignOut = async () => { if (auth) await signOut(auth); router.push('/admin/login'); };

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-body text-slate-900">
      <aside className="w-72 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-2xl z-20">
        <div className="p-8 h-24 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Bus className="h-5 w-5 text-primary" /></div>
            <span className="text-2xl font-black font-headline italic tracking-tighter uppercase text-primary leading-none">AAGO OPS</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'payments', label: 'Payment Hub', icon: QrCode },
            { id: 'routes', label: 'Fleet Grid', icon: RouteIcon },
            { id: 'ai-architect', label: 'AI Architect', icon: Sparkles },
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
            <h2 className="text-3xl font-black font-headline text-slate-900 italic uppercase tracking-tighter leading-none">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2">Regional Operations Terminal</p>
          </div>
          <Badge className="bg-green-500/10 text-green-600 border-none font-black uppercase text-[10px] tracking-widest px-6 py-2 rounded-full">Network Live</Badge>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Active Missions', value: allTrips?.filter(t => t.status === 'active').length || 0, icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Fleet Assets', value: allUsers?.filter(u => u.role === 'driver').length || 0, icon: Bus, color: 'text-orange-500', bg: 'bg-orange-50' },
                  { label: 'Total Scholars', value: allUsers?.filter(u => u.role === 'rider').length || 0, icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
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
                <CardHeader className="p-10 border-b border-slate-50"><CardTitle className="text-xl font-black italic uppercase text-slate-900 flex items-center gap-3"><TrendingUp className="h-6 w-6 text-primary" /> Live Network Manifest</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <th className="py-6 px-10">Corridor</th>
                        <th className="py-6">Operator</th>
                        <th className="py-6">Payload</th>
                        <th className="py-6 px-10 text-right">Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {!allTrips || allTrips.length === 0 ? (
                        <tr><td colSpan={4} className="py-20 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No active mission data available</td></tr>
                      ) : (
                        allTrips.map((trip: any) => (
                          <tr key={trip.id} className="hover:bg-slate-50 transition-all">
                            <td className="py-8 px-10"><span className="font-black text-slate-900 uppercase italic text-xs">{trip.routeName}</span></td>
                            <td className="py-8 text-xs font-bold text-slate-500 italic uppercase">{trip.driverName}</td>
                            <td className="py-8"><Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">{trip.riderCount} / {trip.maxCapacity}</Badge></td>
                            <td className="py-8 px-10 text-right font-black text-slate-900 italic text-base">₹{(trip.riderCount * trip.farePerRider || 0).toFixed(0)}</td>
                          </tr>
                        ))
                      )}
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
                  <h3 className="text-3xl font-black italic uppercase text-primary leading-none">Regional Payment Config</h3>
                  <p className="text-sm font-bold text-slate-400 italic">Configure the official UPI endpoints for city-specific hubs.</p>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vizag Hub Payment ID</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      <Input value={vizagUpi} onChange={e => setVizagUpi(e.target.value)} placeholder="vizag.aago@upi" className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-black italic text-lg" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Vizianagaram Hub Payment ID</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      <Input value={vzmUpi} onChange={e => setVzmUpi(e.target.value)} placeholder="vzm.aago@upi" className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-black italic text-lg" />
                    </div>
                  </div>

                  <Button onClick={saveConfig} disabled={isSaving} className="w-full h-18 bg-primary text-white font-black uppercase italic text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Deploy Regional Endpoints"}
                  </Button>
                </div>
              </Card>

              <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/10 flex items-start gap-6">
                <QrCode className="h-10 w-10 text-primary shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-black uppercase italic text-primary">Mission Settlement Protocol</h4>
                  <p className="text-xs font-bold text-slate-500 italic leading-relaxed">Students will scan the city-specific ID assigned above during the boarding sequence. Ensure these accounts are verified for high-volume transactions.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-architect' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 max-w-4xl">
              <Card className="border-none bg-white rounded-[3rem] p-12 shadow-sm space-y-10">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-primary/10 rounded-2xl"><Sparkles className="h-8 w-8 text-primary" /></div>
                   <div>
                     <h3 className="text-3xl font-black italic uppercase text-slate-900 leading-none">AI Route Architect</h3>
                     <p className="text-sm font-bold text-slate-400 italic mt-2">Generate optimized shuttle corridors using neural network planning.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Demand Patterns</Label>
                    <Textarea 
                      value={aiInput.studentDemandPatterns} 
                      onChange={e => setAiInput({...aiInput, studentDemandPatterns: e.target.value})}
                      placeholder="e.g. High volume from South Campus to Library between 4-6 PM..."
                      className="min-h-[120px] rounded-2xl bg-slate-50 border-none font-bold italic p-6 focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Historical Traffic Summaries</Label>
                    <Textarea 
                      value={aiInput.historicalTrafficData} 
                      onChange={e => setAiInput({...aiInput, historicalTrafficData: e.target.value})}
                      placeholder="e.g. Heavy congestion on Beach Road during weekends..."
                      className="min-h-[120px] rounded-2xl bg-slate-50 border-none font-bold italic p-6 focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <Button onClick={handleAiGeneration} disabled={isAiLoading} className="h-18 bg-primary text-white font-black uppercase italic text-lg rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
                    {isAiLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Initiate AI Synthesis"}
                  </Button>
                </div>
              </Card>

              {aiResult && (
                <Card className="border-none bg-white rounded-[3rem] p-12 shadow-xl space-y-8 animate-in zoom-in-95">
                  <h4 className="text-2xl font-black italic uppercase text-primary border-b border-slate-50 pb-6 flex items-center gap-3"><ClipboardList className="h-6 w-6" /> Optimized Corridor Schematics</h4>
                  <div className="space-y-8">
                    {aiResult.optimizedRoutes.map((route: any, i: number) => (
                      <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
                        <div className="flex justify-between items-start">
                          <h5 className="text-xl font-black uppercase italic text-slate-900">{route.routeName}</h5>
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">{route.estimatedDurationMinutes} MINS</Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-500 italic leading-relaxed">{route.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {route.stops.map((stop: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-[8px] font-black uppercase border-slate-200">{stop}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100">
                      <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-3">Optimization Summary</p>
                      <p className="text-sm font-bold text-blue-900 italic leading-relaxed">{aiResult.optimizationSummary}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
