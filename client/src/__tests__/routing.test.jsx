import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import AppRoutes from '../router.jsx';

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

const validUser = {
  ok: true,
  status: 200,
  json: async () => ({
    message: 'Token is valid',
    success: true,
    id: 'u1',
    username: 'creator',
    email: 'creator@example.com',
    likedPrompts: [],
  }),
};

const unauthenticated = {
  ok: false,
  status: 401,
  json: async () => ({ success: false, message: 'Unauthorized' }),
};

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PromptForge routing architecture (issue #1)', () => {
  it('renders the 404 NotFound page with a Return to Marketplace CTA on unknown paths', async () => {
    fetchMock.mockResolvedValue(unauthenticated);
    renderAt('/definitely-not-a-page');

    expect(await screen.findByText('404')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /return to marketplace/i });
    expect(cta).toHaveAttribute('href', '/');
  });

  it('shows a session-restoring loader on protected routes instead of flashing content', async () => {
    fetchMock.mockImplementation(
      () => new Promise(() => {}) // never resolves: session is being restored
    );

    renderAt('/upload');

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/connecting to promptforge/i);
    expect(screen.queryByText(/list new prompt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated user from /upload to /login preserving the destination', async () => {
    fetchMock.mockResolvedValue(unauthenticated);
    renderAt('/upload');

    await screen.findByText(/welcome back/i);

    // Login rendered in place of the guarded page (destination restored after sign-in,
    // covered by the next test). MemoryRouter keeps history state internal, so the
    // post-login restore behavior is asserted end-to-end below.
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('returns the user to the originally requested route after logging in from a redirect', async () => {
    fetchMock.mockResolvedValue(unauthenticated);
    const user = userEvent.setup();
    renderAt('/upload');

    await screen.findByText(/welcome back/i);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        success: true,
        message: 'Logged in successfully',
        user: { id: 'u1', username: 'creator', email: 'creator@example.com' },
      }),
    });

    await user.type(screen.getByPlaceholderText('name@example.com'), 'creator@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    // Destination restoration: the guarded /upload page renders after sign-in.
    await screen.findByText(/list new prompt/i);
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });

  it('renders protected pages for authenticated users without redirecting', async () => {
    fetchMock.mockResolvedValue(validUser);
    renderAt('/orders');

    await screen.findByRole('heading', { name: /my purchases/i });
  });

  it('redirects already authenticated users away from /login', async () => {
    fetchMock.mockResolvedValue(validUser);
    renderAt('/login');

    await waitFor(() => {
      expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
    });
  });

  it('logs out through the shared context and lands home without a full page reload', async () => {
    fetchMock.mockImplementation((input) => {
      if (String(input).includes('/users/verify')) {
        return Promise.resolve(validUser);
      }
      if (String(input).includes('/users/logout')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    renderAt('/logout');

    await waitFor(
      () => {
        expect(screen.getByTestId('promptforge-home')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const logoutCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/users/logout'));
    expect(logoutCalls.length).toBe(1);
  });
});
