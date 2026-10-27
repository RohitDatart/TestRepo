import { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAuction, useGetTeamsByAuction, useGetPlayersByAuction,
  useStartAuction, useStopAuction, getGetAuctionQueryKey, getGetTeamsByAuctionQueryKey, getGetPlayersByAuctionQueryKey,
  useCreateTeam, useAddPlayer, useBulkUploadPlayers
} from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders, formatCurrency, cn, resolveImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageUpload } from '@/components/image-upload';
import {
  Play, Square, UserPlus, Upload, Shield, Image as ImageIcon,
  TrendingUp, Radio
} from 'lucide-react';

const teamSchema = z.object({
  name: z.string().min(2),
  purseAmount: z.coerce.number().min(1),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
});

const playerSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  basePrice: z.coerce.number().min(1),
  photoUrl: z.string().optional().or(z.literal('')),
  city: z.string().optional(),
});

export default function AuctionDashboard() {
  const [, params] = useRoute('/auctions/:id');
  const auctionId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'players'>('overview');

  const { data: auction, isLoading } = useGetAuction(auctionId || '', {
    request: { headers: getAuthHeaders() },
    query: { enabled: !!auctionId }
  });

  const { data: teams = [] } = useGetTeamsByAuction(auctionId || '', {
    request: { headers: getAuthHeaders() },
    query: { enabled: !!auctionId }
  });

  const { data: players = [] } = useGetPlayersByAuction(auctionId || '', {
    request: { headers: getAuthHeaders() },
    query: { enabled: !!auctionId }
  });

  const { mutate: startMut } = useStartAuction({
    request: { headers: getAuthHeaders() },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuctionQueryKey(auctionId!) });
        // Auto-redirect to live auction room
        setLocation(`/auctions/${auctionId}/live`);
      }
    }
  });

  const { mutate: stopMut } = useStopAuction({
    request: { headers: getAuthHeaders() },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuctionQueryKey(auctionId!) });
        toast({ title: "Auction stopped" });
      }
    }
  });

  if (isLoading || !auction) return <div className="p-8 text-muted-foreground">Loading...</div>;

  const isAdmin = user?.role === 'admin';
  const auc = auction as any;

  return (
    <div className="space-y-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {auc.logo && <img src={auc.logo} alt="" className="w-10 h-10 rounded-full object-cover border border-primary/30" />}
            <h1 className="text-3xl font-display m-0">{auction.name}</h1>
            <Badge variant={auction.auctionStatus === 'active' ? 'success' : 'secondary'}>{auction.auctionStatus}</Badge>
          </div>
          {auction.description && <p className="text-muted-foreground text-sm">{auction.description}</p>}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            {auc.pointsPerTeam && <span>💰 {formatCurrency(auc.pointsPerTeam)} per team</span>}
            {auc.playersPerTeam && <span>👥 {auc.playersPerTeam} players/team</span>}
            {auc.minimumBid && <span>⬇️ Min bid: {formatCurrency(auc.minimumBid)}</span>}
            {auc.bidIncreaseBy && <span>📈 Increment: {formatCurrency(auc.bidIncreaseBy)}</span>}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {isAdmin && auction.auctionStatus !== 'active' && (
            <Button variant="success" onClick={() => startMut({ data: { auctionId: auction.id } })}>
              <Play className="w-4 h-4 mr-2" /> Start Auction
            </Button>
          )}
          {isAdmin && auction.auctionStatus === 'active' && (
            <Button variant="destructive" onClick={() => stopMut({ data: { auctionId: auction.id } })}>
              <Square className="w-4 h-4 mr-2" /> Stop Auction
            </Button>
          )}
          <Link href={`/auctions/${auction.id}/live`}>
            <Button className="bg-primary text-black font-bold hover:bg-primary/90 flex items-center gap-2">
              <Radio className="w-4 h-4" /> Live Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-8">
        {(['overview', 'teams', 'players'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-display tracking-widest uppercase transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(252,195,11,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'overview' && <OverviewTab auction={auc} teams={teams} players={players} formatCurrency={formatCurrency} />}
        {activeTab === 'teams' && <TeamsTab auctionId={auction.id} teams={teams} isAdmin={isAdmin} />}
        {activeTab === 'players' && <PlayersTab auctionId={auction.id} players={players} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function OverviewTab({ auction, teams, players, formatCurrency }: any) {
  const soldPlayers = players.filter((p: any) => p.status === 'sold').length;
  const unsoldPlayers = players.filter((p: any) => p.status === 'unsold').length;
  const availablePlayers = players.filter((p: any) => p.status === 'available').length;
  const auctionMinBid = auction.minimumBid || 0;
  const auctionPlayersPerTeam = auction.playersPerTeam || 0;

  const calcMaxBid = (team: any) => {
    if (!auctionPlayersPerTeam || !auctionMinBid) return team.remainingPurse;
    const remainingSlots = Math.max(0, auctionPlayersPerTeam - (team.playersBought || 0));
    if (remainingSlots <= 1) return team.remainingPurse;
    return Math.max(0, team.remainingPurse - (remainingSlots - 1) * auctionMinBid);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-black/40">
          <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-sm">Teams</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-display text-white">{teams.length}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-black/40">
          <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-sm">Players</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-display text-white">{players.length}</p>
            <p className="text-xs text-green-400 mt-1">{soldPlayers} sold · {unsoldPlayers} unsold · {availablePlayers} available</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-black/40 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-primary text-sm">Total Economy</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-display text-primary">{formatCurrency(teams.reduce((a: number, t: any) => a + t.purseAmount, 0))}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-black/40">
          <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-sm">Spent So Far</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-display text-red-400">{formatCurrency(teams.reduce((a: number, t: any) => a + (t.purseAmount - t.remainingPurse), 0))}</p></CardContent>
        </Card>
      </div>

      {/* Team Stats Table */}
      <div>
        <h3 className="text-xl font-display text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Team Standings
        </h3>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/50 text-muted-foreground uppercase text-xs tracking-widest">
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Bought</th>
                <th className="px-4 py-3 text-right">Slots Left</th>
                <th className="px-4 py-3 text-right">Max Bid</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team: any, i: number) => {
                const usedPoints = team.purseAmount - team.remainingPurse;
                const slotsLeft = Math.max(0, (auctionPlayersPerTeam || 0) - (team.playersBought || 0));
                const maxBid = calcMaxBid(team);
                return (
                  <tr key={team.id} className={cn("border-t border-white/5", i % 2 === 0 ? "bg-black/20" : "bg-black/10")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-sm flex-shrink-0">
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-white">{formatCurrency(team.purseAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold">{formatCurrency(usedPoints)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-bold">{formatCurrency(team.remainingPurse)}</td>
                    <td className="px-4 py-3 text-right"><Badge variant="secondary">{team.playersBought || 0}</Badge></td>
                    <td className="px-4 py-3 text-right"><span className={cn("font-bold", slotsLeft === 0 ? "text-red-400" : "text-yellow-400")}>{slotsLeft}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-primary font-display font-bold">{formatCurrency(maxBid)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teams.length === 0 && <div className="text-center py-10 text-muted-foreground">No teams yet</div>}
        </div>
        {auctionMinBid > 0 && (
          <p className="text-xs text-muted-foreground mt-3 px-1">
            Max Bid = Remaining − ((Slots Left − 1) × {formatCurrency(auctionMinBid)} min bid)
          </p>
        )}
      </div>
    </div>
  );
}

function TeamsTab({ auctionId, teams, isAdmin }: { auctionId: string; teams: any[]; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<z.infer<typeof teamSchema>>({ resolver: zodResolver(teamSchema) });
  const logoValue = watch('logo');

  const { mutate, isPending } = useCreateTeam({
    request: { headers: getAuthHeaders() },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTeamsByAuctionQueryKey(auctionId) });
        setOpen(false); reset(); toast({ title: "Team Added" });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-display">Teams ({teams.length})</h3>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Shield className="w-4 h-4 mr-2" /> Add Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Team</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => mutate({ data: { ...d, auctionId } as any }))} className="space-y-4">
                <div className="space-y-2"><Label>Team Name</Label><Input {...register('name')} /></div>
                <div className="space-y-2"><Label>Points / Purse Amount</Label><Input type="number" {...register('purseAmount')} /></div>
                <ImageUpload
                  label="Team Logo"
                  value={logoValue || ''}
                  onChange={(url) => setValue('logo', url)}
                />
                <div className="space-y-2"><Label>Owner Email (Optional)</Label><Input type="email" {...register('ownerEmail')} /></div>
                <Button type="submit" className="w-full" disabled={isPending}>Save Team</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <Card key={team.id} className="border-white/5">
            <CardContent className="p-5">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-display text-xl flex-shrink-0">
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-lg text-white truncate">{team.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{team.ownerEmail || 'No owner'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-black/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">Total</div>
                  <div className="text-sm font-display text-white">{formatCurrency(team.purseAmount)}</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">Remaining</div>
                  <div className="text-sm font-display text-green-400">{formatCurrency(team.remainingPurse)}</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">Players</div>
                  <div className="text-sm font-display text-primary">{team.playersBought || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlayersTab({ auctionId, players, isAdmin }: { auctionId: string; players: any[]; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<z.infer<typeof playerSchema>>({ resolver: zodResolver(playerSchema) });
  const photoUrlValue = watch('photoUrl');

  const { mutate: addMut, isPending: adding } = useAddPlayer({
    request: { headers: getAuthHeaders() },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayersByAuctionQueryKey(auctionId) });
        setAddOpen(false); reset(); toast({ title: "Player Added" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to add player", description: err.data?.message || err.message || "Something went wrong", variant: "destructive" });
      }
    }
  });

  const { mutate: uploadMut, isPending: uploading } = useBulkUploadPlayers({
    request: { headers: getAuthHeaders() },
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getGetPlayersByAuctionQueryKey(auctionId) });
        toast({ title: `Uploaded ${data.count} players successfully` });
      },
      onError: (err: any) => {
        toast({ title: "CSV upload failed", description: err.data?.message || err.message || "Check your CSV format and try again", variant: "destructive" });
      }
    }
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMut({ data: { file, auctionId } as any });
    e.target.value = '';
  };

  const statusColors: Record<string, string> = {
    sold: 'success',
    unsold: 'destructive',
    inBidding: 'default',
    available: 'secondary',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-display">Player Pool ({players.length})</h3>
        {isAdmin && (
          <div className="flex gap-2">
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-semibold hover:bg-accent">
                {uploading ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" /> CSV Upload</>}
              </div>
              <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={uploading} />
            </Label>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button size="sm"><UserPlus className="w-4 h-4 mr-2" /> Add Player</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Player</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(d => addMut({ data: { ...d, auctionId } as any }))} className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input {...register('name')} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Role</Label><Input {...register('role')} placeholder="Batsman, Bowler..." /></div>
                    <div className="space-y-2"><Label>Base Price</Label><Input type="number" {...register('basePrice')} /></div>
                  </div>
                  <div className="space-y-2"><Label>City</Label><Input {...register('city')} placeholder="Mumbai, Delhi..." /></div>
                  <ImageUpload
                    label="Player Photo"
                    value={photoUrlValue || ''}
                    onChange={(url) => setValue('photoUrl', url)}
                  />
                  <Button type="submit" className="w-full" disabled={adding}>Save Player</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {players.map(p => (
          <Card key={p.id} className="overflow-hidden border-white/5 relative group">
            <div className="aspect-[3/4] relative bg-black/50">
              {p.photoUrl ? (
                <img src={resolveImageUrl(p.photoUrl)} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/50">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant={(statusColors[p.status] as any) || 'default'} className="text-[10px]">
                  {p.status}
                </Badge>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                <p className="font-bold text-white truncate text-sm">{p.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-primary font-bold">{p.role}</span>
                  <span className="text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">{formatCurrency(p.basePrice)}</span>
                </div>
                {p.status === 'sold' && p.soldPrice && (
                  <div className="text-xs text-green-400 font-bold mt-0.5">Sold: {formatCurrency(p.soldPrice)}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
