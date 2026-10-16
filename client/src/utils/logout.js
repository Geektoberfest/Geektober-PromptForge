/**
 * Clears the session cookie on the server.
 * Navigation/context cleanup stays under the caller's control (pure SPA).
 *
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export default async function performLogout() {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  try {
    const response = await fetch(`${baseUrl}/users/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      ok: response.ok,
      message: response.ok ? 'Successfully logged out.' : 'Logout failed on server, session cleared locally.',
    };
  } catch (error) {
    console.warn('Logout network error:', error);
    return { ok: false, message: 'Network error occurred. Session cleared locally.' };
  }
}
