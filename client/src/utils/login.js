import toast from 'react-hot-toast';

/**
 * Submits the login form and hands back the authenticated user.
 * Navigation stays under the caller's control (pure SPA, no full page reload).
 *
 * @param {SubmitEvent} event - form submit event (preventDefault applied here)
 * @returns {Promise<{id: string, username: string, email: string} | null>} user, or null on failure
 */
export default async function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const email = formData.get('email');
  const password = formData.get('password');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  try {
    const response = await fetch(`${baseUrl}/users/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'ok') {
      toast.success('Welcome back to PromptForge!');
      return data.user || { id: data.user?.id, username: data.user?.username, email: data.user?.email };
    }

    toast.error(data.message || 'Invalid email or password');
    return null;
  } catch (err) {
    console.error('Login network error:', err);
    toast.error('Network error. Please check your connection.');
    return null;
  }
}
