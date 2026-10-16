import { createContext, useContext } from 'react';

/**
 * Raw React context object shared by the AuthProvider and useAuth consumers.
 */
export const AuthContext = createContext(null);

/**
 * Shared authentication hook: login state, user, loading, refresh, login/logout.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
