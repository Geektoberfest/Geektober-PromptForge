import { Link } from 'react-router-dom';
import { Compass, Sparkles } from 'lucide-react';

/**
 * Polished 404 page matching the PromptForge dark canvas + gradient typography.
 */
const NotFound = () => (
  <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col items-center justify-center px-6 text-center">
    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
      <Compass size={30} className="text-white" />
    </div>

    <p className="text-8xl sm:text-9xl font-black bg-gradient-to-r from-[#4F7FFF] via-indigo-400 to-purple-400 bg-clip-text text-transparent select-none">
      404
    </p>
    <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
      This forge is cold
    </h1>
    <p className="mt-3 text-gray-400 text-sm max-w-md">
      The page you are looking for was never minted, moved, or was unlisted from the marketplace.
    </p>

    <Link
      to="/"
      className="mt-8 inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition"
    >
      <Sparkles size={17} />
      <span>Return to Marketplace</span>
    </Link>
  </div>
);

export default NotFound;
