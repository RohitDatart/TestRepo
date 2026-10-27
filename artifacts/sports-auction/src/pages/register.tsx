import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'teamOwner']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'teamOwner' }
  });

  const selectedRole = watch('role');

  const { mutate: registerMutation, isPending } = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({ title: "Account created successfully!" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Registration failed", 
          description: error.data?.message || error.message || "Something went wrong", 
          variant: "destructive" 
        });
      }
    }
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation({ data });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/stadium-bg.png`} 
          alt="Stadium Background" 
          className="w-full h-full object-cover opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      </div>

      <div className="w-full max-w-md p-4 relative z-10 animate-slide-up">
        <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
                <Gavel className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-display text-white tracking-wider m-0">BID<span className="text-primary">ATHLETE</span></h1>
            </div>
        </div>

        <Card className="border-white/10 shadow-2xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl text-white">Create Account</CardTitle>
            <CardDescription>Join the ultimate sports auction platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div 
                    className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${selectedRole === 'admin' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    onClick={() => setValue('role', 'admin')}
                  >
                      <span className="block font-display text-xl uppercase text-white mb-1">Organizer</span>
                      <span className="text-xs text-gray-400">Host auctions</span>
                  </div>
                  <div 
                    className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${selectedRole === 'teamOwner' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    onClick={() => setValue('role', 'teamOwner')}
                  >
                      <span className="block font-display text-xl uppercase text-white mb-1">Team Owner</span>
                      <span className="text-xs text-gray-400">Bid on players</span>
                  </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" className="bg-black/40 border-white/10" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" className="bg-black/40 border-white/10" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" className="bg-black/40 border-white/10" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 text-lg mt-4" disabled={isPending}>
                {isPending ? "Creating..." : "Register"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-bold uppercase tracking-wider">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
