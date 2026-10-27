import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, type User } from '@workspace/api-client-react';
import { getAuthHeaders } from '@/lib/utils';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auction_token'));
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  // Fetch user if we have a token but no user object
  const { data: fetchedUser, isLoading: isFetchingUser, isError } = useGetMe({
    query: {
      enabled: !!token && !user,
      retry: false,
    },
    request: {
      headers: getAuthHeaders()
    }
  });

  useEffect(() => {
    if (fetchedUser) {
      setUser(fetchedUser);
    }
  }, [fetchedUser]);

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('auction_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setLocation('/auctions');
  };

  const logout = () => {
    localStorage.removeItem('auction_token');
    setToken(null);
    setUser(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isLoading: !!token && !user && isFetchingUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
