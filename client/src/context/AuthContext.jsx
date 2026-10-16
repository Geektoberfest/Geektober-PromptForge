import { useCallback, useEffect, useMemo, useState } from 'react';
import verifySession from '../utils/checkAuthStatus.js';
import { AuthContext } from './useAuth.js';

/**
 * Shared authentication state for the whole client.
 *
 * Exposes through `useAuth()`:
 *  - isLoggedIn / user / isLoading
 *  - checkAuthStatus(): re-verify the session on demand
 *  - login(user): adopt an authenticated session (after login/signup)
 *  - logout(): clear local session state (server cookie cleared separately)
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const verifiedUser = await verifySession();
      if (verifiedUser) {
        setUser(verifiedUser);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
      return verifiedUser;
    } catch (err) {
      console.error('Session check failed:', err);
      setUser(null);
      setIsLoggedIn(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkAuthStatus().finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [checkAuthStatus]);

  const login = useCallback((authenticatedUser) => {
    setUser(authenticatedUser || null);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({ isLoggedIn, user, isLoading, checkAuthStatus, login, logout }),
    [isLoggedIn, user, isLoading, checkAuthStatus, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
