import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import AuthLoading from './AuthLoading.jsx';

/**
 * Guard for /login and /signup. Signed-in users are bounced back home
 * (or to the originally intended destination);
 * while the session is still loading, the auth page renders without redirecting.
 */
const PublicOnlyRoute = ({ children }) => {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (isLoggedIn) {
    const intended = location.state?.from?.pathname;
    const safeDestination = intended && intended.startsWith('/') ? intended : null;
    return <Navigate to={safeDestination || '/'} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
