"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bus, ArrowLeft, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState('student');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/${role}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 p-4 font-body">
      <div className="mb-12 flex flex-col items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-3 rounded-[1.25rem] shadow-xl group-hover:rotate-12 transition-transform">
            <Bus className="h-8 w-8 text-white" />
          </div>
          <span className="text-4xl font-black text-primary font-headline italic tracking-tight">AAGO</span>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-none rounded-[2.5rem] overflow-hidden">
        <CardHeader className="space-y-3 pt-10 pb-6 bg-white">
          <CardTitle className="text-3xl font-black text-center font-headline uppercase italic tracking-tighter text-primary">Get Moving</CardTitle>
          <CardDescription className="text-center font-bold text-muted-foreground">
            Fast, secure access for all Aago users
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white px-8">
          <Tabs defaultValue="student" onValueChange={setRole} className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-secondary p-1 rounded-2xl h-14">
              <TabsTrigger value="student" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-none">Rider</TabsTrigger>
              <TabsTrigger value="driver" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-none">Captain</TabsTrigger>
              <TabsTrigger value="admin" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-none">Ops</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="default" className="w-full bg-accent hover:bg-accent/90 h-16 rounded-2xl text-lg font-black shadow-xl shadow-accent/20 uppercase tracking-tighter italic mb-6">
            <Smartphone className="h-6 w-6 mr-2" /> Continue with Phone
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-secondary"></span>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white px-4 text-muted-foreground">OR LOGIN WITH EMAIL</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Work/Personal Email</Label>
              <Input id="email" type="email" placeholder="name@email.com" required className="h-14 rounded-2xl border-secondary bg-secondary/30 font-bold focus-visible:ring-accent" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" title="password" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Password</Label>
                <Link href="#" className="text-[10px] font-black uppercase text-accent hover:underline tracking-widest">Forgot?</Link>
              </div>
              <Input id="password" type="password" required className="h-14 rounded-2xl border-secondary bg-secondary/30 focus-visible:ring-accent" />
            </div>
            <Button type="submit" variant="outline" className="w-full h-16 rounded-2xl text-lg font-black border-2 border-primary text-primary uppercase tracking-tighter italic hover:bg-primary/5">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-6 bg-secondary/20 p-8 mt-4">
          <p className="text-sm text-center font-bold text-muted-foreground">
            New to Aago?{' '}
            <Link href="/auth/signup" className="text-primary font-black hover:underline italic">Create Account</Link>
          </p>
          <Link href="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}