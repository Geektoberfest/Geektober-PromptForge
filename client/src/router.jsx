import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import LogOut from './pages/Logout.jsx';
import Prompt from './pages/Prompt.jsx';
import Explore from './pages/Explore.jsx';
import Upload from './pages/Upload.jsx';
import Profile from './pages/Profile.jsx';
import Orders from './pages/Orders.jsx';
import CreatorDashboard from './pages/CreatorDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * Route architecture (issue #1):
 *  - One shared shell via nested layout routes (AppLayout + <Outlet />).
 *  - Guards wait for the shared AuthContext session instead of prop drilling.
 *  - Wildcard fallback renders the polished 404 page.
 */
const AppRoutes = () => (
  <Routes>
    {/* Shared marketplace shell */}
    <Route element={<AppLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/prompt/:id" element={<Prompt />} />
      <Route path="/explore" element={<Explore />} />

      {/* Authenticated-only pages */}
      <Route element={<ProtectedRoute />}>
        <Route path="/upload" element={<Upload />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/creator/dashboard" element={<CreatorDashboard />} />
        <Route path="/dashboard" element={<CreatorDashboard />} />
      </Route>

      {/* 404 fallback renders inside the shared shell */}
      <Route path="*" element={<NotFound />} />
    </Route>

    {/* Auth-only areas, standalone full-screen pages */}
    <Route
      path="/login"
      element={
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="/signup"
      element={
        <PublicOnlyRoute>
          <Signup />
        </PublicOnlyRoute>
      }
    />
    {/* Logout is a transition page: it clears the shared session itself */}
    <Route path="/logout" element={<LogOut />} />
  </Routes>
);

export default AppRoutes;
