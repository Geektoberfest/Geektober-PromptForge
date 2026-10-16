import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth.js';

const Navbar = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  function handleUploadClick() {
    if (isLoggedIn) {
      navigate('/upload');
    } else {
      toast.error('You must be logged in to upload a prompt!');
      setTimeout(() => {
        navigate('/login');
      }, 800);
    }
  }

  return (
    <nav className="flex items-center justify-between bg-[#0A0F1E]/90 backdrop-blur-md text-white px-6 py-3.5 rounded-full border border-white/10 mt-6 mx-6 shadow-xl sticky top-6 z-50">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Sparkles size={16} className="text-white" />
        </div>
        <Link to="/" className="font-extrabold tracking-wider text-base bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          PROMPTFORGE
        </Link>
      </div>

      <div className="flex items-center space-x-6 text-gray-400 text-sm font-medium">
        <NavLink to="/" className={({ isActive }) => `hover:text-white transition ${isActive ? 'text-white' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => `hover:text-white transition ${isActive ? 'text-white' : ''}`}>
          Explore
        </NavLink>
        <button
          onClick={handleUploadClick}
          className="hover:text-white transition cursor-pointer"
        >
          Create
        </button>
        {isLoggedIn && (
          <>
            <Link to="/creator/dashboard" className="hover:text-white transition">
              Creator Hub
            </Link>
            <Link to="/orders" className="hover:text-white transition">
              My Purchases
            </Link>
            <Link to="/profile" className="hover:text-white transition">
              My Profile
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {isLoggedIn ? (
          <Link
            to="/logout"
            className="bg-[#16203a] border border-white/10 text-white font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-[#1A2033] hover:border-white/20 transition"
          >
            Logout
          </Link>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="bg-[#0F1526] border border-white/10 text-gray-300 font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-[#1A2033] hover:text-white transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-1.5 rounded-full shadow-md shadow-blue-600/30 transition"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
