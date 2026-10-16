import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ScrollToTop from '../pages/ScrollToTop.jsx';
import { Toaster } from 'react-hot-toast';

/**
 * Shared shell for authenticated/public marketplace pages:
 * navbar, footer, scroll restoration, and the global toast container.
 */
const AppLayout = () => (
  <>
    <ScrollToTop />
    <Navbar />
    <Outlet />
    <Footer />
    <Toaster position="top-center" />
  </>
);

export default AppLayout;
