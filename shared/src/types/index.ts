// ==========================================
// User & Auth Types
// ==========================================
export type UserRole = "admin" | "teamOwner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

// ==========================================
// Auction Types
// ==========================================
export type AuctionStatus = "pending" | "active" | "completed";

export interface Auction {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  auctionStatus: AuctionStatus;
  createdBy: string;
  createdAt: string;
  auctionDate?: string | null;
  pointsPerTeam?: number | null;
  playersPerTeam?: number | null;
  minimumBid?: number | null;
  bidIncreaseBy?: number | null;
}

export interface CreateAuctionRequest {
  name: string;
  description?: string;
  logo?: string;
  auctionDate?: string;
  pointsPerTeam?: number;
  playersPerTeam?: number;
  minimumBid?: number;
  bidIncreaseBy?: number;
}

export interface StartAuctionRequest {
  auctionId: string;
}

export interface StopAuctionRequest {
  auctionId: string;
}

export interface AuctionDetail extends Auction {
  currentPlayer?: string | null;
  teams: Team[];
  playerPool: Player[];
}

// ==========================================
// Team Types
// ==========================================
export interface Team {
  id: string;
  name: string;
  logo?: string | null;
  purseAmount: number;
  remainingPurse: number;
  playersBought: number;
  auctionId: string;
  ownerEmail?: string | null;
}

export interface CreateTeamRequest {
  name: string;
  logo?: string;
  purseAmount: number;
  auctionId: string;
  ownerEmail?: string;
}

export interface UpdateTeamRequest {
  id: string;
  name?: string;
  logo?: string;
  purseAmount?: number;
}

// ==========================================
// Player Types
// ==========================================
export type PlayerStatus = "available" | "inBidding" | "sold" | "unsold";

export interface Player {
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
  status: PlayerStatus;
}

export interface AddPlayerRequest {
  name: string;
  role: string;
  basePrice: number;
  age?: number;
  city?: string;
  photoUrl?: string;
  auctionId: string;
}

export interface BulkUploadResponse {
  count: number;
  players: Player[];
}

// ==========================================
// Bid & Socket Types
// ==========================================
export interface Bid {
  id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  teamName: string;
  amount: number;
  createdAt: string;
}

export interface BidSnapshot {
  teamId: string;
  teamName: string;
  amount: number;
}

export interface SocketAuctionState {
  currentPlayerId: string | null;
  currentBid: number;
  highestBidder: BidSnapshot | null;
}

export interface SocketPlayerPayload {
  player: Player;
  currentBid: number;
}

export interface SocketUpdatePayload {
  currentBid: number;
  highestBidder: BidSnapshot | null;
  bidHistory: BidSnapshot[];
}

export interface SocketSoldPayload {
  player: {
    id: string;
    name: string;
    role: string;
    basePrice: number;
    photoUrl?: string | null;
    soldPrice: number;
  };
  team: {
    id: string;
    name: string;
  };
  amount: number;
}
