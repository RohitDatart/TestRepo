import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const { mutate: loginMutation, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({ title: "Welcome back!" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Login failed", 
          description: error.data?.message || error.message || "Invalid credentials", 
          variant: "destructive" 
        });
      }
    }
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation({ data });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/stadium-bg.png`} 
          alt="Stadium Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="w-full max-w-md p-4 relative z-10 animate-slide-up">
        <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                <Gavel className="w-10 h-10 text-primary" />
                <h1 className="text-4xl font-display text-white tracking-wider m-0">BID<span className="text-primary">ATHLETE</span></h1>
            </div>
        </div>

        <Card className="border-white/10 shadow-2xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="space-y-2 text-center pb-8">
            <CardTitle className="text-3xl text-white">Enter the Arena</CardTitle>
            <CardDescription className="text-base text-gray-400">Sign in to manage your auctions</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="coach@team.com" 
                  className="bg-black/40 border-white/10 text-white h-14"
                  {...register('email')} 
                />
                {errors.email && <p className="text-sm text-destructive font-semibold">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  className="bg-black/40 border-white/10 text-white h-14"
                  {...register('password')} 
                />
                {errors.password && <p className="text-sm text-destructive font-semibold">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-14 text-lg mt-4" disabled={isPending}>
                {isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
            
            <div className="mt-8 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:text-primary/80 font-bold uppercase tracking-wider">
                Register Now
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
