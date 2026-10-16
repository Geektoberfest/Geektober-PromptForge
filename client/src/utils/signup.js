import toast from 'react-hot-toast';

/**
 * Submits the signup form and hands back the newly created user.
 * Navigation stays under the caller's control (pure SPA, no full page reload).
 *
 * @param {SubmitEvent} event - form submit event (preventDefault applied here)
 * @returns {Promise<{id: string, username: string, email: string} | null>} user, or null on failure
 */
export default async function handleSignup(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const email = formData.get('email');
  const password = formData.get('password');
  const username = formData.get('username');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  try {
    const response = await fetch(`${baseUrl}/users/signup`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'ok') {
      toast.success('Account created! Welcome to PromptForge.');
      return data.user || { id: data.user?.id, username: data.user?.username, email: data.user?.email };
    }

    toast.error(data.message || 'Signup failed. Please try again.');
    return null;
  } catch (error) {
    console.error('Network error during signup:', error);
    toast.error('Network error. Please check your connection.');
    return null;
  }
}
