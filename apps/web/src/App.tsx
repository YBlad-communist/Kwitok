import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import Kvitok from './components/Kvitok';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#14211E' }}>
        <p style={{ color: '#EFE9D8' }}>Загрузка...</p>
      </div>
    );
  }

  return user ? <Kvitok /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
