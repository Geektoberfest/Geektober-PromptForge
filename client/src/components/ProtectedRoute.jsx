import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import AuthLoading from './AuthLoading.jsx';

/**
 * Guard for authenticated-only pages (/upload, /profile, /orders, /creator/dashboard, /logout).
 * Waits for the shared session to be restored before deciding, preserves the
 * intended destination for post-login redirect, and never flashes protected content.
 *
 * Used as a pathless layout route (renders the next <Outlet />), or wraps `children` directly.
 */
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
