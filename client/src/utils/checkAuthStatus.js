const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Verifies the current session cookie against the API.
 * Returns the authenticated user object, or null when unauthenticated.
 */
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${getBaseUrl()}/users/verify`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const res = await response.json();
    const isValid = res.message === 'Token is valid' || res.success === true;
    if (!isValid) {
      return null;
    }

    return {
      id: res.id || res.user?.id,
      username: res.username || res.user?.username,
      email: res.email || res.user?.email,
      likedPrompts: res.likedPrompts || res.user?.likedPrompts || [],
    };
  } catch (err) {
    console.warn('Session verification error:', err);
    return null;
  }
};

export default checkAuthStatus;
