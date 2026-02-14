
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bus, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState('student');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, logic would go here. For now, redirect based on role.
    router.push(`/${role}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Bus className="h-6 w-6 text-white" />
          </div>
          <span className="text-3xl font-bold text-primary font-headline">Aago</span>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center font-headline">Sign In</CardTitle>
          <CardDescription className="text-center">
            Choose your role to access the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="student" onValueChange={setRole} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="name@university.edu" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11">
              Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-11 border-2">
            Institutional SSO (Single Sign-On)
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">Sign up</Link>
          </p>
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
