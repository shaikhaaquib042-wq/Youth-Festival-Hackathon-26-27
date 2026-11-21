import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { MOCK_USERS } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  isSupabaseConnected: boolean;
  loginDemo: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'sanitrack_active_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY) as UserRole | null;
    return saved && MOCK_USERS[saved] ? saved : 'citizen';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(
    MOCK_USERS[currentRole] || MOCK_USERS.citizen
  );

  useEffect(() => {
    const user = MOCK_USERS[currentRole] || MOCK_USERS.citizen;
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, currentRole);
  }, [currentRole]);

  // If Supabase Auth is enabled, monitor real auth state
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return;

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Fetch or create profile
        client
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setCurrentUser({
                id: data.id,
                fullName: data.full_name,
                email: session.user.email,
                phone: data.phone,
                role: data.role as UserRole,
                wardId: data.ward_id,
                organizationName: data.organization_name,
              });
              setCurrentRole(data.role as UserRole);
            }
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
  };

  const loginDemo = (role: UserRole) => {
    setCurrentRole(role);
  };

  const logout = () => {
    setCurrentRole('guest');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        isSupabaseConnected: isSupabaseConfigured,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
