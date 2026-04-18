
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const ConnectingDotsLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="30" cy="10" r="3" fill="currentColor" />
    <circle cx="20" cy="30" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <path d="M10 10L30 10M30 10L20 30M20 30L10 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() && email === 'admin@aago.in') {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          fullName: 'Regional Administrator',
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } else if (userSnap.exists()) {
        await updateDoc(userRef, { lastLogin: new Date().toISOString() });
      }

      router.push('/admin');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: "Invalid login credentials." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-body safe-area-inset">
      <div className="mb-10 flex flex-col items-center gap-4">
        <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/20 scale-110">
          <ConnectingDotsLogo className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">AAGO ADMIN</h1>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-none rounded-[3rem] overflow-hidden shadow-2xl">
        <CardHeader className="space-y-3 pt-12 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">Login</CardTitle>
          <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest italic mt-2">
            Control Center Access
          </CardDescription>
        </CardHeader>
        <CardContent className="px-12 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@aago.in" className="h-16 bg-white/5 border-white/10 font-black italic text-lg px-6" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-16 bg-white/5 border-white/10 font-black italic text-lg px-6" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-black h-18 rounded-2xl text-lg font-black uppercase italic shadow-xl transition-all active:scale-95">
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Access Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
