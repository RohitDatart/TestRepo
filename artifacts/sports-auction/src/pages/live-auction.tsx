import { useEffect, useState, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetAuction, useGetTeamsByAuction, useGetPlayersByAuction } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { getAuthHeaders, formatCurrency, cn, resolveImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Trophy, CheckCircle2, UserX, SkipForward, RotateCcw,
  Users, TrendingUp, Wallet, ChevronLeft, RefreshCw
} from 'lucide-react';
import { Link } from 'wouter';

export default function LiveAuctionPage() {
  const [, params] = useRoute('/auctions/:id/live');
  const auctionId = params?.id;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [soldFlash, setSoldFlash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bidding' | 'overview' | 'teamDetail'>('bidding');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: auction } = useGetAuction(auctionId || '', {
    request: { headers: getAuthHeaders() },
    query: { enabled: !!auctionId }
  });

  const { data: teams = [], refetch: refetchTeams } = useGetTeamsByAuction(auctionId || '', {
    request: { headers: getAuthHeaders() },
    query: { enabled: !!auctionId }
  });

  const { data: players = [], refetch: refetchPlayers } = useGetPlayersByAuction(auctionId || '', {
    request: { headers: getAuthHeaders() },
    query: { enabled: !!auctionId }
  });

  const socket = useSocket(auctionId);
  const {
    isConnected, activePlayer, currentBid, highestBidder, bidHistory,
    lastSold, noMorePlayers,
    teamBid, adminUndo, adminNextPlayer, adminMarkSold, adminMarkUnsold, startAuction
  } = socket;

  const isAdmin = user?.role === 'admin';
  const myTeam = user?.role === 'teamOwner' ? teams.find(t => t.ownerEmail === user?.email) : null;

  const auctionMinBid = (auction as any)?.minimumBid || 0;
  const auctionBidIncreaseBy = (auction as any)?.bidIncreaseBy || 100;
  const auctionPointsPerTeam = (auction as any)?.pointsPerTeam || 0;
  const auctionPlayersPerTeam = (auction as any)?.playersPerTeam || 0;

  // Refetch teams after bids to reflect purse changes
  useEffect(() => {
    if (lastSold) {
      setSoldFlash(lastSold.teamName);
      setTimeout(() => setSoldFlash(null), 3000);
      refetchTeams();
      refetchPlayers();
    }
  }, [lastSold]);

  useEffect(() => {
    if (activePlayer) {
      refetchTeams();
    }
  }, [activePlayer?.id]);

  const calcMaxBid = useCallback((team: any) => {
    if (!auctionPlayersPerTeam || !auctionMinBid) return team.remainingPurse;
    const remainingSlots = Math.max(0, auctionPlayersPerTeam - (team.playersBought || 0));
    if (remainingSlots <= 1) return team.remainingPurse;
    return Math.max(0, team.remainingPurse - (remainingSlots - 1) * auctionMinBid);
  }, [auctionPlayersPerTeam, auctionMinBid]);

  if (!auction) return (
    <div className="min-h-screen flex items-center justify-center text-primary font-display text-4xl animate-pulse">
      Loading Broadcast...
    </div>
  );

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const teamPlayers = selectedTeam ? players.filter(p => p.teamId === selectedTeam.id) : [];

  return (
    <div className="fixed inset-0 bg-background text-foreground overflow-hidden flex flex-col font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src={`${import.meta.env.BASE_URL}images/broadcast-bg.png`} className="w-full h-full object-cover opacity-20 mix-blend-screen" alt="bg" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      </div>

      {/* SOLD Flash */}
      <AnimatePresence>
        {soldFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-green-500/20 border-4 border-green-500 rounded-3xl px-16 py-10 text-center backdrop-blur-xl">
              <div className="text-9xl font-display text-green-400 leading-none">SOLD!</div>
              <div className="text-3xl font-bold text-white mt-4">{soldFlash}</div>
              <div className="text-4xl font-display text-green-300 mt-2">{formatCurrency(lastSold?.amount || 0)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href={`/auctions/${auctionId}`}>
            <button className="text-muted-foreground hover:text-white mr-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", isConnected ? "bg-green-400" : "bg-red-500")} />
          <h1 className="text-xl font-display uppercase tracking-widest text-white flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            {auction.name} <span className="text-primary font-light">LIVE</span>
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-black/40 rounded-lg p-1 border border-white/10">
          {(['bidding', 'overview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedTeamId(null); }}
              className={cn(
                "px-4 py-1.5 text-xs font-display uppercase rounded transition-colors",
                activeTab === tab ? "bg-primary text-black font-bold" : "text-muted-foreground hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {myTeam && (
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground uppercase font-bold">Your Purse</div>
            <div className="text-lg font-display text-primary">{formatCurrency(Number(myTeam.remainingPurse ?? 0))}</div>
          </div>
        )}
      </header>

      {/* OVERVIEW TAB */}
      {(activeTab === 'overview' || activeTab === 'teamDetail') && (
        <div className="relative z-10 flex-1 overflow-y-auto p-6">
          {activeTab === 'teamDetail' && selectedTeam ? (
            <TeamDetailView
              team={selectedTeam}
              players={teamPlayers}
              onBack={() => setActiveTab('overview')}
              formatCurrency={formatCurrency}
            />
          ) : (
            <OverviewTable
              teams={teams}
              players={players}
              auction={auction as any}
              calcMaxBid={calcMaxBid}
              formatCurrency={formatCurrency}
              auctionPlayersPerTeam={auctionPlayersPerTeam}
              isAdmin={isAdmin}
              onSelectTeam={(id: string) => { setSelectedTeamId(id); setActiveTab('teamDetail'); }}
              onRefreshPlayers={refetchPlayers}
            />
          )}
        </div>
      )}

      {/* BIDDING TAB */}
      {activeTab === 'bidding' && (
        <main className="flex-1 relative z-10 flex flex-col lg:flex-row overflow-hidden">

          {/* LEFT: Player Card */}
          <div className="lg:w-[38%] flex flex-col justify-center p-4 lg:p-6">
            {noMorePlayers ? (
              <div className="text-center p-12 border-2 border-dashed border-white/10 rounded-3xl">
                <Trophy className="w-20 h-20 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-display text-white">Auction Complete!</h2>
                <p className="text-muted-foreground mt-2">All players have been auctioned.</p>
              </div>
            ) : activePlayer ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlayer.id}
                  initial={{ x: -80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 80, opacity: 0 }}
                  className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gradient-to-t from-black to-transparent aspect-[3/4] max-h-[65vh] w-full max-w-sm mx-auto"
                >
                  {activePlayer.photoUrl ? (
                    <img src={resolveImageUrl(activePlayer.photoUrl!)} alt={activePlayer.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <img src={`${import.meta.env.BASE_URL}images/player-placeholder.png`} className="w-full h-full object-cover opacity-50" alt="placeholder" />
                  )}

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                    <Badge className="mb-2 bg-primary/20 text-primary border-primary text-xs">{activePlayer.role}</Badge>
                    <h2 className="text-4xl font-display uppercase leading-none text-white">{activePlayer.name}</h2>
                    <div className="flex gap-3 mt-3 text-xs font-bold text-muted-foreground uppercase">
                      <span>Base: <span className="text-white">{formatCurrency(activePlayer.basePrice)}</span></span>
                      {activePlayer.city && <span>📍 {activePlayer.city}</span>}
                    </div>
                  </div>

                  {/* SOLD stamp */}
                  {activePlayer.status === 'sold' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm z-20">
                      <div className="border-8 border-green-500 text-green-400 p-6 -rotate-12 rounded-xl bg-black/50 text-center">
                        <div className="text-7xl font-display">SOLD</div>
                        <div className="text-2xl font-bold">{formatCurrency(activePlayer.soldPrice || 0)}</div>
                      </div>
                    </div>
                  )}
                  {activePlayer.status === 'unsold' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm z-20">
                      <div className="border-8 border-red-500 text-red-400 p-6 -rotate-12 rounded-xl bg-black/50">
                        <div className="text-7xl font-display">UNSOLD</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-white/10 rounded-3xl">
                <Trophy className="w-20 h-20 text-white/10 mx-auto mb-6" />
                <h2 className="text-2xl font-display text-muted-foreground uppercase">Waiting for player</h2>
                {isAdmin && (
                  <div className="mt-6 space-y-3">
                    <Button variant="success" onClick={startAuction} className="w-full">
                      <Gavel className="w-4 h-4 mr-2" /> Start & Pick First Player
                    </Button>
                    <Button variant="outline" onClick={adminNextPlayer} className="w-full">
                      <SkipForward className="w-4 h-4 mr-2" /> Next Random Player
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Bid Board */}
          <div className="lg:w-[62%] flex flex-col gap-4 p-4 lg:p-6 overflow-y-auto">

            {/* Current Bid Display */}
            <div className="bg-black/50 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="text-primary font-display tracking-widest text-sm uppercase mb-1">Current Bid</div>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentBid}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl lg:text-8xl font-display text-white leading-none"
                  >
                    {formatCurrency(currentBid || 0)}
                  </motion.div>
                </AnimatePresence>
                <div className="mt-2 h-8">
                  {highestBidder ? (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/30"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-base font-bold text-primary uppercase">{highestBidder.teamName}</span>
                    </motion.div>
                  ) : (
                    <span className="text-sm text-muted-foreground uppercase font-bold">No bids yet</span>
                  )}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Bid Increment</div>
                <div className="text-3xl font-display text-white/60">+{formatCurrency(auctionBidIncreaseBy)}</div>
              </div>
            </div>

            {/* TEAM BUTTONS — main bidding interface */}
            <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> Teams — Click to Bid
                </h3>
                <span className="text-xs text-muted-foreground">+{formatCurrency(auctionBidIncreaseBy)} per click</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {teams.map(team => {
                  const maxBid = calcMaxBid(team);
                  const nextBidAmount = (currentBid || 0) + auctionBidIncreaseBy;
                  const canBid = !!activePlayer && activePlayer.status === 'inBidding' && Number(team.remainingPurse) >= nextBidAmount;
                  const isLeading = highestBidder?.teamId === team.id;

                  // Team owners can only bid for their team
                  const isMyTeam = myTeam?.id === team.id;
                  const canInteract = isAdmin || (user?.role === 'teamOwner' && isMyTeam);

                  return (
                    <motion.button
                      key={team.id}
                      onClick={() => canBid && canInteract && teamBid(team.id)}
                      disabled={!canBid || !canInteract}
                      whileHover={canBid && canInteract ? { scale: 1.04 } : {}}
                      whileTap={canBid && canInteract ? { scale: 0.96 } : {}}
                      className={cn(
                        "relative rounded-xl p-4 border text-left transition-all duration-200 overflow-hidden",
                        isLeading
                          ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(252,195,11,0.2)]"
                          : "bg-secondary/30 border-white/10",
                        canBid && canInteract ? "cursor-pointer hover:border-primary/50" : "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isLeading && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                      )}
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-10 h-10 rounded-full object-cover mb-2 border border-white/20" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-lg mb-2">
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="font-bold text-white text-sm truncate">{team.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        {formatCurrency(Number(team.remainingPurse ?? 0))}
                      </div>
                      {isLeading && (
                        <div className="text-xs text-primary font-bold mt-1 uppercase">Leading</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="bg-card/60 rounded-2xl p-5 border border-white/5">
                <h3 className="font-display text-sm text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-primary" /> Admin Controls
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Button
                    className="bg-green-600 hover:bg-green-500 text-white font-bold h-14 text-base"
                    onClick={adminMarkSold}
                    disabled={!activePlayer || activePlayer.status !== 'inBidding' || !highestBidder}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" /> SOLD
                  </Button>
                  <Button
                    variant="destructive"
                    className="font-bold h-14 text-base"
                    onClick={adminMarkUnsold}
                    disabled={!activePlayer || activePlayer.status !== 'inBidding'}
                  >
                    <UserX className="w-5 h-5 mr-2" /> UNSOLD
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="font-bold h-12"
                    onClick={adminUndo}
                    disabled={bidHistory.length === 0 || !activePlayer || activePlayer.status !== 'inBidding'}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> UNDO
                  </Button>
                  <Button
                    variant="outline"
                    className="font-bold h-12"
                    onClick={adminNextPlayer}
                    disabled={!!activePlayer && activePlayer.status === 'inBidding'}
                  >
                    <SkipForward className="w-4 h-4 mr-2" /> NEXT PLAYER
                  </Button>
                </div>
              </div>
            )}

            {/* Bid History Log */}
            <div className="bg-black/20 rounded-2xl border border-white/5 p-4">
              <h3 className="font-display text-xs text-muted-foreground uppercase tracking-widest mb-3">
                Bid Log (newest first)
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...(bidHistory || [])].reverse().map((b, i) => (
                  <div key={i} className={cn(
                    "flex justify-between items-center px-3 py-2 rounded-lg text-sm font-bold",
                    i === 0 ? "bg-primary/10 text-primary border border-primary/20" : "bg-white/5 text-gray-400"
                  )}>
                    <span className="uppercase">{b.teamName || '—'}</span>
                    <span className="font-display">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
                {(!bidHistory || bidHistory.length === 0) && (
                  <div className="text-center py-6 text-muted-foreground/50 text-xs uppercase">No bids yet</div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

// ---- Overview Table Component ----
function OverviewTable({ teams, players, auction, calcMaxBid, formatCurrency, auctionPlayersPerTeam, isAdmin, onSelectTeam, onRefreshPlayers }: any) {
  const [reAddingId, setReAddingId] = useState<string | null>(null);

  const soldPlayers = (players || []).filter((p: any) => p.status === 'sold');
  const unsoldPlayers = (players || []).filter((p: any) => p.status === 'unsold');

  const teamMap: Record<string, any> = {};
  (teams || []).forEach((t: any) => { teamMap[t.id] = t; });

  async function handleReAdd(playerId: string) {
    setReAddingId(playerId);
    try {
      await fetch(`/api/player/${playerId}/re-add`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      onRefreshPlayers?.();
    } catch (e) {
      console.error('Failed to re-add player', e);
    } finally {
      setReAddingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Teams Table */}
      <div>
        <h2 className="text-2xl font-display text-white mb-4 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" /> Team Standings
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/40 text-muted-foreground uppercase text-xs tracking-widest">
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-right">Total Points</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Players</th>
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
                  <tr
                    key={team.id}
                    onClick={() => onSelectTeam(team.id)}
                    className={cn(
                      "border-t border-white/5 cursor-pointer hover:bg-primary/5 transition-colors",
                      i % 2 === 0 ? "bg-black/20" : "bg-black/10"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-full object-cover border border-white/20" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-sm">
                            {team.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">{team.name}</div>
                          {team.ownerEmail && <div className="text-xs text-muted-foreground">{team.ownerEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-white">{formatCurrency(team.purseAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold">{formatCurrency(usedPoints)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-bold">{formatCurrency(team.remainingPurse)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="secondary">{team.playersBought || 0}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-bold", slotsLeft === 0 ? "text-red-400" : "text-yellow-400")}>{slotsLeft}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-primary font-display font-bold">{formatCurrency(maxBid)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teams.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No teams yet</div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground px-1">Click a row to view that team's squad.</p>
      </div>

      {/* Sold Players */}
      <div>
        <h2 className="text-xl font-display text-green-400 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Sold Players ({soldPlayers.length})
        </h2>
        {soldPlayers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-white/10 rounded-xl text-sm">No sold players yet</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/40 text-muted-foreground uppercase text-xs tracking-widest">
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-right">Base Price</th>
                  <th className="px-4 py-3 text-right">Sold For</th>
                  <th className="px-4 py-3 text-left">Bought By</th>
                </tr>
              </thead>
              <tbody>
                {soldPlayers.map((p: any, i: number) => {
                  const buyerTeam = p.teamId ? teamMap[p.teamId] : null;
                  return (
                    <tr key={p.id} className={cn("border-t border-white/5", i % 2 === 0 ? "bg-black/20" : "bg-black/10")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.photoUrl ? (
                            <img src={resolveImageUrl(p.photoUrl)} alt={p.name} className="w-7 h-7 rounded-full object-cover border border-white/20" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                              {p.name.slice(0, 1)}
                            </div>
                          )}
                          <span className="font-bold text-white">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.role}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.basePrice)}</td>
                      <td className="px-4 py-3 text-right font-display font-bold text-green-400">{formatCurrency(p.soldPrice || 0)}</td>
                      <td className="px-4 py-3">
                        {buyerTeam ? (
                          <div className="flex items-center gap-2">
                            {buyerTeam.logo ? (
                              <img src={buyerTeam.logo} alt={buyerTeam.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                {buyerTeam.name.slice(0, 1)}
                              </div>
                            )}
                            <span className="font-bold text-primary">{buyerTeam.name}</span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unsold Players */}
      <div>
        <h2 className="text-xl font-display text-red-400 mb-4 flex items-center gap-2">
          <UserX className="w-5 h-5" /> Unsold Players ({unsoldPlayers.length})
        </h2>
        {unsoldPlayers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-white/10 rounded-xl text-sm">No unsold players</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/40 text-muted-foreground uppercase text-xs tracking-widest">
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-right">Base Price</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {unsoldPlayers.map((p: any, i: number) => (
                  <tr key={p.id} className={cn("border-t border-white/5", i % 2 === 0 ? "bg-black/20" : "bg-black/10")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.photoUrl ? (
                          <img src={resolveImageUrl(p.photoUrl)} alt={p.name} className="w-7 h-7 rounded-full object-cover border border-white/20" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                            {p.name.slice(0, 1)}
                          </div>
                        )}
                        <span className="font-bold text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.role}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.basePrice)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleReAdd(p.id)}
                          disabled={reAddingId === p.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={cn("w-3 h-3", reAddingId === p.id && "animate-spin")} />
                          Re-add to Auction
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Team Detail Component ----
function TeamDetailView({ team, players, onBack, formatCurrency }: any) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6 text-sm font-bold uppercase">
        <ChevronLeft className="w-4 h-4" /> Back to Overview
      </button>

      <div className="flex items-center gap-5 mb-8 bg-card/60 rounded-2xl p-6 border border-white/5">
        {team.logo ? (
          <img src={team.logo} alt={team.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-4xl">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-3xl font-display text-white">{team.name}</h2>
          {team.ownerEmail && <p className="text-muted-foreground">{team.ownerEmail}</p>}
          <div className="flex gap-4 mt-2">
            <div className="text-sm"><span className="text-muted-foreground">Remaining:</span> <span className="text-green-400 font-bold">{formatCurrency(team.remainingPurse)}</span></div>
            <div className="text-sm"><span className="text-muted-foreground">Players:</span> <span className="text-primary font-bold">{team.playersBought || 0}</span></div>
          </div>
        </div>
      </div>

      <h3 className="font-display text-xl text-white mb-4">Squad</h3>
      {players.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-xl">
          No players bought yet
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {players.map((p: any) => (
            <div key={p.id} className="bg-card/60 rounded-xl overflow-hidden border border-white/5">
              <div className="aspect-[3/4] bg-black/40 relative">
                {p.photoUrl ? (
                  <img src={resolveImageUrl(p.photoUrl)} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-6xl font-display">
                    {p.name.slice(0, 1)}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="font-bold text-white text-sm truncate">{p.name}</div>
                  <div className="text-xs text-primary mt-0.5">{p.role}</div>
                </div>
              </div>
              <div className="px-3 py-2 bg-black/30">
                <div className="text-xs text-muted-foreground">Bought at</div>
                <div className="text-sm font-display text-green-400 font-bold">{formatCurrency(p.soldPrice || 0)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
