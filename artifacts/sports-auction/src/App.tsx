import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

// Pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AuctionListPage from "@/pages/auction-list";
import AuctionDashboard from "@/pages/auction-dashboard";
import LiveAuctionPage from "@/pages/live-auction";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-display text-2xl">Loading...</div>;
  if (!token) return <Redirect to="/login" />;
  
  return <Component {...rest} />;
}

function RootRedirect() {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect to={token ? "/auctions" : "/login"} />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={RootRedirect} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        
        <Route path="/auctions">
          {() => <ProtectedRoute component={AuctionListPage} />}
        </Route>
        
        <Route path="/auctions/:id">
          {() => <ProtectedRoute component={AuctionDashboard} />}
        </Route>
        
        <Route path="/auctions/:id/live">
          {() => <ProtectedRoute component={LiveAuctionPage} />}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
