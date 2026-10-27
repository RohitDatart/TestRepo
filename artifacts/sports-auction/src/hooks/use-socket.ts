import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ActivePlayer {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  age?: number | null;
  city?: string | null;
  photoUrl?: string | null;
  auctionId: string;
  teamId?: string | null;
  soldPrice?: number | null;
  status: string;
}

export interface HighestBidder {
  teamId: string;
  teamName: string;
  amount: number;
}

export interface BidHistoryEntry {
  teamId: string;
  teamName: string;
  amount: number;
}

interface SocketState {
  isConnected: boolean;
  activePlayer: ActivePlayer | null;
  currentBid: number;
  highestBidder: HighestBidder | null;
  bidHistory: BidHistoryEntry[];
  lastSold: { player: ActivePlayer; teamName: string; amount: number } | null;
  noMorePlayers: boolean;
}

export function useSocket(auctionId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    activePlayer: null,
    currentBid: 0,
    highestBidder: null,
    bidHistory: [],
    lastSold: null,
    noMorePlayers: false,
  });

  useEffect(() => {
    if (!auctionId) return;

    const token = localStorage.getItem('auction_token');
    const socket = io('/', {
      path: '/api/socket.io',
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(prev => ({ ...prev, isConnected: true }));
      socket.emit('auction:join', auctionId);
    });

    socket.on('disconnect', () => {
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('auction:state', (data: any) => {
      setState(prev => ({
        ...prev,
        currentBid: data.currentBid || 0,
        highestBidder: data.highestBidder || null,
      }));
    });

    socket.on('auction:player', ({ player, currentBid }: { player: ActivePlayer; currentBid: number }) => {
      setState(prev => ({
        ...prev,
        activePlayer: player,
        currentBid: currentBid ?? 0,
        highestBidder: null,
        bidHistory: [],
        lastSold: null,
        noMorePlayers: false,
      }));
    });

    socket.on('auction:update', (data: { currentBid: number; highestBidder: HighestBidder | null; bidHistory: BidHistoryEntry[] }) => {
      setState(prev => ({
        ...prev,
        currentBid: data.currentBid,
        highestBidder: data.highestBidder,
        bidHistory: data.bidHistory || prev.bidHistory,
      }));
    });

    socket.on('auction:sold', ({ player, team, amount }: any) => {
      setState(prev => ({
        ...prev,
        activePlayer: { ...player, status: 'sold', teamId: team.id, soldPrice: amount },
        lastSold: { player, teamName: team.name, amount },
      }));
    });

    socket.on('auction:playerUnsold', ({ playerId }: { playerId: string }) => {
      setState(prev => ({
        ...prev,
        activePlayer: prev.activePlayer?.id === playerId
          ? { ...prev.activePlayer, status: 'unsold' }
          : prev.activePlayer,
      }));
    });

    socket.on('auction:noMorePlayers', () => {
      setState(prev => ({ ...prev, noMorePlayers: true, activePlayer: null }));
    });

    socket.on('auction:error', ({ message }: { message: string }) => {
      console.warn('Auction socket error:', message);
      // Expose via event so UI can handle
      (socket as any)._lastError = message;
    });

    return () => { socket.disconnect(); };
  }, [auctionId]);

  const teamBid = useCallback((teamId: string) => {
    if (socketRef.current && auctionId) {
      socketRef.current.emit('auction:teamBid', { auctionId, teamId });
    }
  }, [auctionId]);

  const adminUndo = useCallback(() => {
    if (socketRef.current && auctionId) {
      socketRef.current.emit('auction:undo', { auctionId });
    }
  }, [auctionId]);

  const adminNextPlayer = useCallback(() => {
    if (socketRef.current && auctionId) {
      socketRef.current.emit('auction:nextPlayer', { auctionId });
    }
  }, [auctionId]);

  const adminMarkSold = useCallback(() => {
    if (socketRef.current && auctionId) {
      socketRef.current.emit('auction:sold', { auctionId });
    }
  }, [auctionId]);

  const adminMarkUnsold = useCallback(() => {
    if (socketRef.current && auctionId) {
      socketRef.current.emit('auction:unsold', { auctionId });
    }
  }, [auctionId]);

  const startAuction = useCallback(() => {
    if (socketRef.current && auctionId) {
      socketRef.current.emit('auction:start', { auctionId });
    }
  }, [auctionId]);

  return {
    ...state,
    socket: socketRef.current,
    teamBid,
    adminUndo,
    adminNextPlayer,
    adminMarkSold,
    adminMarkUnsold,
    startAuction,
  };
}
