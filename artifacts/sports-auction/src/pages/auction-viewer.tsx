import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoute } from 'wouter';
import { useSocket } from '@/hooks/use-socket';
import { formatCurrency, cn, resolveImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Trophy, CheckCircle2, UserX, Users, TrendingUp, Wallet,
  Search, X, Filter, ChevronDown, RefreshCw, Radio, Eye
} from 'lucide-react';

const API_BASE = '/api';

// ─── types ───────────────────────────────────────────────────────────────────

interface PublicAuction {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  auctionStatus: string;
  pointsPerTeam?: number | null;
  playersPerTeam?: number | null;
  minimumBid?: number | null;
  bidIncreaseBy?: number | null;
}

interface PublicTeam {
  id: string;
  name: string;
  logo?: string | null;
  purseAmount: number;
  remainingPurse: number;
  playersBought: number;
  ownerEmail?: string | null;
}

interface PublicPlayer {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  city?: string | null;
  photoUrl?: string | null;
  teamId?: string | null;
  soldPrice?: number | null;
  status: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuctionViewerPage() {
  const [, params] = useRoute('/view/:id');
  const auctionId = params?.id;

  const [auction, setAuction] = useState<PublicAuction | null>(null);
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soldFlash, setSoldFlash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bidding' | 'overview' | 'teams' | 'sold' | 'unsold'>('bidding');

  // Fetch public data
  const fetchData = useCallback(async () => {
    if (!auctionId) return;
    try {
      const res = await fetch(`${API_BASE}/public/auction/${auctionId}`);
      if (!res.ok) {
        setError('Auction not found or has been removed.');
        return;
      }
      const data = await res.json();
      setAuction(data);
      setTeams(data.teams || []);
      setPlayers(data.players || []);
    } catch (e) {
      setError('Failed to load auction. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket — read-only (we don't need auth token for watching)
  const socket = useSocket(auctionId);
  const { isConnected, activePlayer, currentBid, highestBidder, bidHistory, lastSold, noMorePlayers } = socket;

  const auctionBidIncreaseBy = (auction as any)?.bidIncreaseBy || 100;
  const auctionPlayersPerTeam = (auction as any)?.playersPerTeam || 0;

  // Refresh data when player is sold/unsold
  useEffect(() => {
    if (lastSold) {
      setSoldFlash(lastSold.teamName);
      setTimeout(() => setSoldFlash(null), 3000);
      fetchData();
    }
  }, [lastSold]);

  useEffect(() => {
    if (activePlayer) fetchData();
  }, [activePlayer?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary font-display text-4xl animate-pulse">
        Loading Broadcast...
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center p-8">
        <div>
          <Eye className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-3xl font-display text-white mb-2">Viewer Not Available</h1>
          <p className="text-muted-foreground max-w-md">{error || 'Auction not found.'}</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: 'bidding', label: 'Live Bidding' },
    { key: 'overview', label: 'Overview' },
    { key: 'teams', label: 'Teams' },
    { key: 'sold', label: 'Sold' },
    { key: 'unsold', label: 'Unsold' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-background text-foreground overflow-hidden flex flex-col font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
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
      <header className="relative z-10 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {auction.logo && (
            <img src={auction.logo} alt={auction.name} className="w-8 h-8 rounded-lg object-cover border border-white/20" />
          )}
          <div className={cn('w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0', isConnected ? 'bg-green-400' : 'bg-red-500')} />
          <h1 className="text-lg font-display uppercase tracking-widest text-white flex items-center gap-2 truncate">
            <Gavel className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{auction.name}</span>
            <span className="text-primary font-light ml-1 flex-shrink-0 flex items-center gap-1">
              <Radio className="w-3 h-3" /> LIVE
            </span>
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-black/40 rounded-lg p-1 border border-white/10 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1 text-xs font-display uppercase rounded transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-primary text-black font-bold'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <Eye className="w-4 h-4" />
          <span>Viewer Mode</span>
        </div>
      </header>

      {/* BIDDING TAB */}
      {activeTab === 'bidding' && (
        <ViewerBiddingTab
          auction={auction}
          teams={teams}
          activePlayer={activePlayer}
          currentBid={currentBid}
          highestBidder={highestBidder}
          bidHistory={bidHistory}
          noMorePlayers={noMorePlayers}
          auctionBidIncreaseBy={auctionBidIncreaseBy}
          formatCurrency={formatCurrency}
        />
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="relative z-10 flex-1 overflow-y-auto p-4 lg:p-6">
          <ViewerOverviewTab
            teams={teams}
            players={players}
            auctionPlayersPerTeam={auctionPlayersPerTeam}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {/* TEAMS TAB */}
      {activeTab === 'teams' && (
        <div className="relative z-10 flex-1 overflow-y-auto p-4 lg:p-6">
          <TeamsTab teams={teams} players={players} auctionPlayersPerTeam={auctionPlayersPerTeam} formatCurrency={formatCurrency} />
        </div>
      )}

      {/* SOLD PLAYERS TAB */}
      {activeTab === 'sold' && (
        <div className="relative z-10 flex-1 overflow-y-auto p-4 lg:p-6">
          <SoldPlayersTab players={players} teams={teams} formatCurrency={formatCurrency} />
        </div>
      )}

      {/* UNSOLD PLAYERS TAB */}
      {activeTab === 'unsold' && (
        <div className="relative z-10 flex-1 overflow-y-auto p-4 lg:p-6">
          <UnsoldPlayersTab players={players} formatCurrency={formatCurrency} />
        </div>
      )}
    </div>
  );
}

// ─── Bidding Tab ──────────────────────────────────────────────────────────────

function ViewerBiddingTab({ auction, teams, activePlayer, currentBid, highestBidder, bidHistory, noMorePlayers, auctionBidIncreaseBy, formatCurrency }: any) {
  return (
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
                <img src={resolveImageUrl(activePlayer.photoUrl)} alt={activePlayer.name} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full bg-secondary/50 flex items-center justify-center text-8xl font-display text-muted-foreground/30">
                  {activePlayer.name.slice(0, 1)}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                <Badge className="mb-2 bg-primary/20 text-primary border-primary text-xs">{activePlayer.role}</Badge>
                <h2 className="text-4xl font-display uppercase leading-none text-white">{activePlayer.name}</h2>
                <div className="flex gap-3 mt-3 text-xs font-bold text-muted-foreground uppercase">
                  <span>Base: <span className="text-white">{formatCurrency(activePlayer.basePrice)}</span></span>
                  {activePlayer.city && <span>📍 {activePlayer.city}</span>}
                </div>
              </div>
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
            <h2 className="text-2xl font-display text-muted-foreground uppercase">Waiting for auction to start</h2>
          </div>
        )}
      </div>

      {/* RIGHT: Bid Board */}
      <div className="lg:w-[62%] flex flex-col gap-4 p-4 lg:p-6 overflow-y-auto">
        {/* Current Bid */}
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

        {/* Team Purses (Read-Only) */}
        <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 border border-white/5">
          <h3 className="font-display text-sm text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Team Purses
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {teams.map((team: any) => {
              const isLeading = highestBidder?.teamId === team.id;
              return (
                <div
                  key={team.id}
                  className={cn(
                    'relative rounded-xl p-4 border text-left transition-all duration-200',
                    isLeading
                      ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(252,195,11,0.2)]'
                      : 'bg-secondary/30 border-white/10'
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
                  {isLeading && <div className="text-xs text-primary font-bold mt-1 uppercase">Leading</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bid History Log */}
        <div className="bg-black/20 rounded-2xl border border-white/5 p-4">
          <h3 className="font-display text-xs text-muted-foreground uppercase tracking-widest mb-3">Bid Log (newest first)</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...(bidHistory || [])].reverse().map((b: any, i: number) => (
              <div key={i} className={cn(
                'flex justify-between items-center px-3 py-2 rounded-lg text-sm font-bold',
                i === 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-gray-400'
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
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function ViewerOverviewTab({ teams, players, auctionPlayersPerTeam, formatCurrency }: any) {
  const soldPlayers = (players || []).filter((p: any) => p.status === 'sold');
  const unsoldPlayers = (players || []).filter((p: any) => p.status === 'unsold');
  const availablePlayers = (players || []).filter((p: any) => p.status === 'available');
  const totalPurse = teams.reduce((acc: number, t: any) => acc + Number(t.purseAmount), 0);
  const totalSpent = teams.reduce((acc: number, t: any) => acc + (Number(t.purseAmount) - Number(t.remainingPurse)), 0);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Teams', value: teams.length, color: 'text-blue-400', Icon: Users },
          { label: 'Sold Players', value: soldPlayers.length, color: 'text-green-400', Icon: CheckCircle2 },
          { label: 'Unsold Players', value: unsoldPlayers.length, color: 'text-red-400', Icon: UserX },
          { label: 'Available', value: availablePlayers.length, color: 'text-primary', Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-card/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <div className={cn('text-2xl font-display font-bold', color)}>{value}</div>
              <div className="text-xs text-muted-foreground uppercase">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Leaderboard */}
      <div>
        <h2 className="text-xl font-display text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Team Standings
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/40 text-muted-foreground uppercase text-xs tracking-widest">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Players</th>
              </tr>
            </thead>
            <tbody>
              {[...teams]
                .sort((a: any, b: any) => (b.playersBought || 0) - (a.playersBought || 0))
                .map((team: any, i: number) => {
                  const spent = team.purseAmount - team.remainingPurse;
                  return (
                    <tr key={team.id} className={cn('border-t border-white/5', i % 2 === 0 ? 'bg-black/20' : 'bg-black/10')}>
                      <td className="px-4 py-3 text-muted-foreground font-display">#{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {team.logo ? (
                            <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-full object-cover border border-white/20" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-sm">
                              {team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-white">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-display text-white">{formatCurrency(team.purseAmount)}</td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-bold">{formatCurrency(team.remainingPurse)}</td>
                      <td className="px-4 py-3 text-right"><Badge variant="secondary">{team.playersBought || 0}</Badge></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab({ teams, players, auctionPlayersPerTeam, formatCurrency }: any) {
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  if (selectedTeam) {
    const teamPlayers = players.filter((p: any) => p.teamId === selectedTeam.id && p.status === 'sold');
    return (
      <div>
        <button onClick={() => setSelectedTeam(null)} className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6 text-sm font-bold uppercase">
          ← Back to Teams
        </button>
        <div className="flex items-center gap-5 mb-8 bg-card/60 rounded-2xl p-6 border border-white/5">
          {selectedTeam.logo ? (
            <img src={selectedTeam.logo} alt={selectedTeam.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-4xl">
              {selectedTeam.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-3xl font-display text-white">{selectedTeam.name}</h2>
            <div className="flex gap-6 mt-2 text-sm flex-wrap">
              <span className="text-muted-foreground">Remaining: <span className="text-green-400 font-bold">{formatCurrency(selectedTeam.remainingPurse)}</span></span>
              <span className="text-muted-foreground">Spent: <span className="text-red-400 font-bold">{formatCurrency(selectedTeam.purseAmount - selectedTeam.remainingPurse)}</span></span>
              <span className="text-muted-foreground">Players: <span className="text-primary font-bold">{selectedTeam.playersBought || 0}</span></span>
            </div>
          </div>
        </div>
        <h3 className="font-display text-xl text-white mb-4">Squad</h3>
        {teamPlayers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-xl">No players bought yet</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {teamPlayers.map((p: any) => (
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-white flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" /> Teams ({teams.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team: any) => {
          const spent = team.purseAmount - team.remainingPurse;
          const slotsLeft = Math.max(0, (auctionPlayersPerTeam || 0) - (team.playersBought || 0));
          const fillPct = Math.round((spent / team.purseAmount) * 100);
          return (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className="bg-card/60 rounded-2xl border border-white/10 p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-4 mb-4">
                {team.logo ? (
                  <img src={team.logo} alt={team.name} className="w-14 h-14 rounded-xl object-cover border border-white/20" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-display text-2xl">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-lg truncate">{team.name}</h3>
                  {team.ownerEmail && <p className="text-xs text-muted-foreground truncate">{team.ownerEmail}</p>}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Purse Used</span>
                  <span>{fillPct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, fillPct)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">Spent</div>
                  <div className="text-sm font-bold text-red-400">{formatCurrency(spent)}</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">Left</div>
                  <div className="text-sm font-bold text-green-400">{formatCurrency(team.remainingPurse)}</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">Players</div>
                  <div className="text-sm font-bold text-primary">{team.playersBought || 0}</div>
                </div>
              </div>

              {auctionPlayersPerTeam > 0 && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {slotsLeft > 0 ? <span className="text-yellow-400">{slotsLeft} slot{slotsLeft > 1 ? 's' : ''} remaining</span> : <span className="text-red-400">Squad full</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sold Players Tab ─────────────────────────────────────────────────────────

function SoldPlayersTab({ players, teams, formatCurrency }: any) {
  const [searchName, setSearchName] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const soldPlayers = (players || []).filter((p: any) => p.status === 'sold');
  const teamMap: Record<string, any> = {};
  (teams || []).forEach((t: any) => { teamMap[t.id] = t; });

  // Teams that actually have sold players
  const teamsWithSold = teams.filter((t: any) => soldPlayers.some((p: any) => p.teamId === t.id));

  const filtered = soldPlayers.filter((p: any) => {
    const nameMatch = p.name.toLowerCase().includes(searchName.toLowerCase());
    const teamMatch = !selectedTeamFilter || p.teamId === selectedTeamFilter;
    return nameMatch && teamMatch;
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedTeamName = selectedTeamFilter ? teamMap[selectedTeamFilter]?.name : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-display text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" /> Sold Players ({soldPlayers.length})
        </h2>
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Search by name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search player..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="h-9 pl-9 pr-8 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-48"
            />
            {searchName && (
              <button onClick={() => setSearchName('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Team filter dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className={cn(
                'h-9 pl-3 pr-8 text-sm border rounded-lg flex items-center gap-2 transition-colors min-w-[140px]',
                selectedTeamFilter
                  ? 'bg-primary/20 border-primary/50 text-white'
                  : 'bg-black/40 border-white/10 text-muted-foreground hover:text-white'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="truncate">{selectedTeamName || 'All Teams'}</span>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-11 z-30 bg-card border border-white/10 rounded-xl shadow-2xl min-w-[180px] py-1 overflow-hidden">
                <button
                  onClick={() => { setSelectedTeamFilter(''); setDropdownOpen(false); }}
                  className={cn('w-full text-left px-4 py-2 text-sm hover:bg-primary/10 transition-colors', !selectedTeamFilter ? 'text-primary font-bold' : 'text-muted-foreground')}
                >
                  All Teams
                </button>
                {teamsWithSold.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTeamFilter(t.id); setDropdownOpen(false); }}
                    className={cn('w-full text-left px-4 py-2 text-sm hover:bg-primary/10 transition-colors flex items-center gap-2', selectedTeamFilter === t.id ? 'text-primary font-bold' : 'text-muted-foreground')}
                  >
                    {t.logo ? (
                      <img src={t.logo} alt={t.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                        {t.name.slice(0, 1)}
                      </div>
                    )}
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(searchName || selectedTeamFilter) && (
            <button
              onClick={() => { setSearchName(''); setSelectedTeamFilter(''); }}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-white border border-white/10 rounded-lg bg-black/40 flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-2xl">
          {soldPlayers.length === 0 ? 'No sold players yet' : 'No players match your filter'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/40 text-muted-foreground uppercase text-xs tracking-widest">
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-right">Base Price</th>
                <th className="px-4 py-3 text-right">Sold For</th>
                <th className="px-4 py-3 text-left">Bought By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any, i: number) => {
                const buyerTeam = p.teamId ? teamMap[p.teamId] : null;
                return (
                  <tr key={p.id} className={cn('border-t border-white/5', i % 2 === 0 ? 'bg-black/20' : 'bg-black/10')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.photoUrl ? (
                          <img src={resolveImageUrl(p.photoUrl)} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-white/20 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {p.name.slice(0, 1)}
                          </div>
                        )}
                        <span className="font-bold text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{p.role}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.city || '—'}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.basePrice)}</td>
                    <td className="px-4 py-3 text-right font-display font-bold text-green-400">{formatCurrency(p.soldPrice || 0)}</td>
                    <td className="px-4 py-3">
                      {buyerTeam ? (
                        <div className="flex items-center gap-2">
                          {buyerTeam.logo ? (
                            <img src={buyerTeam.logo} alt={buyerTeam.name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
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
          <div className="px-4 py-2 bg-black/20 text-xs text-muted-foreground border-t border-white/5">
            Showing {filtered.length} of {soldPlayers.length} sold players
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unsold Players Tab ───────────────────────────────────────────────────────

function UnsoldPlayersTab({ players, formatCurrency }: any) {
  const [searchName, setSearchName] = useState('');
  const unsoldPlayers = (players || []).filter((p: any) => p.status === 'unsold');
  const filtered = unsoldPlayers.filter((p: any) =>
    p.name.toLowerCase().includes(searchName.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-display text-red-400 flex items-center gap-2">
          <UserX className="w-6 h-6" /> Unsold Players ({unsoldPlayers.length})
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search player..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-48"
          />
          {searchName && (
            <button onClick={() => setSearchName('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-2xl">
          {unsoldPlayers.length === 0 ? 'No unsold players' : 'No players match your search'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/40 text-muted-foreground uppercase text-xs tracking-widest">
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-right">Base Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any, i: number) => (
                <tr key={p.id} className={cn('border-t border-white/5', i % 2 === 0 ? 'bg-black/20' : 'bg-black/10')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.photoUrl ? (
                        <img src={resolveImageUrl(p.photoUrl)} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-red-500/30 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
                          {p.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="font-bold text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="destructive" className="text-[10px] opacity-70">{p.role}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.city || '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.basePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-black/20 text-xs text-muted-foreground border-t border-white/5">
            Showing {filtered.length} of {unsoldPlayers.length} unsold players
          </div>
        </div>
      )}
    </div>
  );
}
