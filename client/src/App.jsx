import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './router.jsx';

/**
 * App entry for client routing: shared auth context + nested layout routes.
 */
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
