import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import AuthLoadingScreen from './AuthLoadingScreen';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/login" replace />;

  return children;
}
