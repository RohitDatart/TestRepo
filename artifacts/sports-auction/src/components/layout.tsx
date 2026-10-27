import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, Gavel, LayoutDashboard, Users, UserRound, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isLivePage = location.includes('/live');

  // Hide standard layout wrapper on live broadcast page for full immersive view
  if (isLivePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border/50 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <Gavel className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display text-white tracking-wider m-0 leading-none">BID<span className="text-primary">ATHLETE</span></h1>
        </div>
        
        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="mb-6 px-2">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Logged in as</p>
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded uppercase font-bold", 
                    user.role === 'admin' ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400"
                )}>
                    {user.role}
                </span>
            </div>
          </div>

          <Link href="/auctions" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:bg-white/5",
            location === '/auctions' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-white"
          )}>
            <LayoutDashboard className="w-5 h-5" />
            Auctions
          </Link>
          
          <div className="mt-auto pt-6 border-t border-border/50">
             <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-white/5" onClick={logout}>
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
             </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
}
