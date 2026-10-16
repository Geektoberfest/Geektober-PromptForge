import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import performLogout from '../utils/logout';
import { useAuth } from '../context/useAuth.js';

export default function LogOut() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const hasLoggedOutRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState('Logging out...');

  useEffect(() => {
    if (hasLoggedOutRef.current) return;
    hasLoggedOutRef.current = true;

    let isMounted = true;

    (async () => {
      const { message } = await performLogout();

      if (!isMounted) return;

      // Clear the shared session immediately so guards react right away.
      logout();
      setStatusMessage(message);

      const timer = setTimeout(() => {
        if (isMounted) {
          navigate('/', { replace: true });
        }
      }, 1000);

      return () => clearTimeout(timer);
    })();

    return () => {
      isMounted = false;
    };
  }, [logout, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050A1A] text-white p-4">
      <div className="bg-gray-900/90 backdrop-blur-md p-10 rounded-2xl shadow-xl w-full max-w-sm border border-[#1C2233] text-center">
        <div className="mb-4">
          <svg className="animate-spin h-8 w-8 text-[#4F7FFF] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-200">{statusMessage}</h2>
        <p className="text-sm text-gray-500 mt-2">Redirecting to PromptForge home...</p>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
