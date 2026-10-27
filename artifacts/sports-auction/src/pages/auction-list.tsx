import { useState } from 'react';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useListAuctions, useCreateAuction, getListAuctionsQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trophy, Calendar, ArrowRight } from 'lucide-react';

const createAuctionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  logo: z.string().url().optional().or(z.literal('')),
  auctionDate: z.string().optional(),
  pointsPerTeam: z.coerce.number().min(1, 'Required').optional(),
  playersPerTeam: z.coerce.number().min(1, 'Required').optional(),
  minimumBid: z.coerce.number().min(1, 'Required').optional(),
  bidIncreaseBy: z.coerce.number().min(1, 'Required').optional(),
});

export default function AuctionListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: auctions = [], isLoading } = useListAuctions({
    request: { headers: getAuthHeaders() }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof createAuctionSchema>>({
    resolver: zodResolver(createAuctionSchema)
  });

  const { mutate: createMutation, isPending } = useCreateAuction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAuctionsQueryKey() });
        toast({ title: "Auction Created!" });
        setIsCreateOpen(false);
        reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message || "Failed to create auction", variant: "destructive" });
      }
    },
    request: { headers: getAuthHeaders() }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading auctions...</div>;

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display text-white m-0">Auctions</h1>
          <p className="text-muted-foreground mt-1">Manage and participate in sports auctions.</p>
        </div>

        {user?.role === 'admin' && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-5 h-5" /> New Auction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Auction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((data) => createMutation({ data: data as any }))} className="space-y-4 pt-2">

                <div className="space-y-2">
                  <Label>Auction Name *</Label>
                  <Input {...register('name')} placeholder="e.g. IPL 2025 Auction" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input {...register('description')} placeholder="Optional details..." />
                </div>

                <div className="space-y-2">
                  <Label>Auction Logo URL</Label>
                  <Input {...register('logo')} placeholder="https://..." />
                </div>

                <div className="space-y-2">
                  <Label>Auction Date</Label>
                  <Input type="date" {...register('auctionDate')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Points Per Team</Label>
                    <Input type="number" {...register('pointsPerTeam')} placeholder="e.g. 1000" />
                    <p className="text-xs text-muted-foreground">Total purse for each team</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Players Per Team</Label>
                    <Input type="number" {...register('playersPerTeam')} placeholder="e.g. 15" />
                    <p className="text-xs text-muted-foreground">Max players per team</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Bid</Label>
                    <Input type="number" {...register('minimumBid')} placeholder="e.g. 50" />
                    <p className="text-xs text-muted-foreground">Lowest bid allowed</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bid Increase By</Label>
                    <Input type="number" {...register('bidIncreaseBy')} placeholder="e.g. 100" />
                    <p className="text-xs text-muted-foreground">Amount added per team button click</p>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-2" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Auction"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {auctions.length === 0 ? (
        <Card className="border-dashed border-2 border-white/10 bg-transparent text-center p-12">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display text-white mb-2">No Auctions Yet</h3>
          <p className="text-muted-foreground mb-6">There are currently no active or upcoming auctions.</p>
          {user?.role === 'admin' && (
            <Button onClick={() => setIsCreateOpen(true)}>Create the first one</Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map(auction => {
            const auc = auction as any;
            return (
              <Card key={auction.id} className="group hover:border-primary/50 transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-0" />

                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={
                      auction.auctionStatus === 'active' ? 'success' :
                      auction.auctionStatus === 'completed' ? 'secondary' : 'default'
                    }>
                      {auction.auctionStatus}
                    </Badge>
                    {auc.logo ? (
                      <img src={auc.logo} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                    ) : (
                      <Trophy className="w-5 h-5 text-primary/50" />
                    )}
                  </div>
                  <CardTitle className="text-2xl text-white truncate">{auction.name}</CardTitle>
                  {auction.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{auction.description}</p>
                  )}
                  {(auc.pointsPerTeam || auc.playersPerTeam) && (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {auc.pointsPerTeam && <span>💰 {auc.pointsPerTeam} pts/team</span>}
                      {auc.playersPerTeam && <span>👥 {auc.playersPerTeam} players/team</span>}
                    </div>
                  )}
                </CardHeader>

                <CardFooter className="pt-4 border-t border-white/5 bg-black/20 flex justify-between items-center">
                  <div className="flex items-center text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <Calendar className="w-3 h-3 mr-1" />
                    {auc.auctionDate
                      ? new Date(auc.auctionDate).toLocaleDateString()
                      : new Date(auction.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                  <Link href={`/auctions/${auction.id}`}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-1 group/btn">
                      Enter <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
