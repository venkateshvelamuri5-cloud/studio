
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bus, 
  Users, 
  Map, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  Plus,
  Zap,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  Clock
} from 'lucide-react';
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

const ridershipData = [
  { name: 'Vizag', riders: 8500 },
  { name: 'VZM', riders: 3200 },
  { name: 'AP-Hway', riders: 4500 },
  { name: 'Gitam', riders: 5100 },
  { name: 'AU', riders: 3800 },
];

export default function AdminDashboard() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [demandPatterns, setDemandPatterns] = useState("High demand from Vizianagaram to GITAM/AU campuses between 7-9 AM. Weekend peak for students returning home.");

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const result = await generateShuttleRoutes({
        studentDemandPatterns: demandPatterns,
        historicalTrafficData: "Congestion at Maddilapalem and VZM Highway junctions during morning peaks.",
        preferredServiceHours: "6 AM to 9 PM Monday-Saturday",
        numberOfShuttlesAvailable: 15
      });
      setOptimizationResult(result);
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="flex h-screen bg-secondary/20">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col shrink-0">
        <div className="p-6 h-20 flex items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-accent" />
            <span className="text-2xl font-bold font-headline italic">Aago AP Ops</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-white bg-white/10 hover:bg-white/20">
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
            <Map className="mr-2 h-4 w-4" /> Regional Routes
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
            <Users className="mr-2 h-4 w-4" /> Student Registry
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
            <TrendingUp className="mr-2 h-4 w-4" /> Analytics
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
            <Settings className="mr-2 h-4 w-4" /> Regional Settings
          </Button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center font-bold">AP</div>
            <div>
              <p className="text-xs font-bold">Admin Panel</p>
              <p className="text-[10px] text-white/60">Andhra Pradesh Zone</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="text-2xl font-bold font-headline text-primary">AP Operations Overview</h2>
          <div className="flex items-center gap-4">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1">
              Active Fleet: 15 / 15
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Student Riders', value: '4,210', trend: '+8%', icon: Users },
              { label: 'Avg. Wait Time', value: '5.2m', trend: '-1.5m', icon: Clock },
              { label: 'Campus Routes', value: '12', trend: 'Expanding', icon: Map },
              { label: 'Bus Uptime', value: '99.1%', trend: '+0.2%', icon: Activity },
            ].map((metric, i) => (
              <Card key={i} className="border-none shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <metric.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-200">{metric.trend}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                    <h3 className="text-3xl font-bold text-primary font-headline mt-1">{metric.value}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="font-headline italic">Student Ridership by Hub</CardTitle>
                <CardDescription>Vizag & Vizianagaram Campus Traffic</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ridershipData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="riders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI Optimization */}
            <Card className="border-none shadow-lg bg-primary text-white rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-headline text-white italic">Route Optimizer AI</CardTitle>
                <CardDescription className="text-white/60">Generate student-optimized routes for AP highway.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">Demand Analysis</label>
                  <Textarea 
                    value={demandPatterns} 
                    onChange={(e) => setDemandPatterns(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-accent h-24"
                  />
                </div>
                <Button 
                  onClick={handleOptimize} 
                  disabled={isOptimizing}
                  className="w-full bg-accent hover:bg-accent/90 text-white h-11 font-bold italic"
                >
                  {isOptimizing ? "Processing..." : "Run AI Optimization"}
                </Button>
              </CardContent>
              {optimizationResult && (
                <CardFooter className="pt-0 flex flex-col gap-2 text-xs">
                  <div className="w-full h-px bg-white/10 my-2" />
                  <p className="text-accent font-bold uppercase">Optimized Results Ready</p>
                  <div className="w-full space-y-2">
                    {optimizationResult.optimizedRoutes.slice(0, 2).map((route: any, i: number) => (
                      <div key={i} className="bg-white/5 p-2 rounded-lg flex justify-between">
                        <span>{route.routeName}</span>
                        <span className="text-accent">{route.estimatedDurationMinutes}m</span>
                      </div>
                    ))}
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Active Alerts */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold font-headline text-primary italic uppercase tracking-tight">Regional Alerts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />
                <div>
                  <h4 className="font-bold text-orange-900 italic">VZM Highway Traffic</h4>
                  <p className="text-sm text-orange-700">Heavy congestion at Tagarapuvalasa. Expect 15 min delays for Vizag-bound shuttles.</p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
                <Plus className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-bold text-blue-900 italic">Guntur Expansion Hub</h4>
                  <p className="text-sm text-blue-700">Site survey completed for Guntur launch. Recruiting local captains for next week.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
