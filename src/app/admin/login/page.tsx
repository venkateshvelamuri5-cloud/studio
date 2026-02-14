
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Admin Authenticated",
        description: "Accessing regional operations dashboard...",
      });
      router.push('/admin');
    } catch (error: any) {
      console.error("Login Error", error);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Invalid admin credentials. Please contact the head office.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4 font-body">
      <div className="mb-12 flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-[1.5rem] shadow-2xl rotate-3">
          <Bus className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-black text-white font-headline italic tracking-tighter uppercase">AAGO OPS</h1>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="space-y-3 pt-10 pb-6 text-center">
          <CardTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter text-primary">Regional Access</CardTitle>
          <CardDescription className="font-bold text-muted-foreground">
            Administrative terminal for Vizag & VZM hubs
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@aago.in" 
                  className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none font-bold" 
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Terminal Key</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none font-bold" 
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 h-16 rounded-2xl text-lg font-black uppercase italic shadow-xl shadow-accent/20"
            >
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Initiate Terminal Access"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-secondary/50 p-6 flex flex-col gap-4">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            Return to Public Landing
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
