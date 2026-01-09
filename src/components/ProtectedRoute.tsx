import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'supervisor' | 'agent';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading, hasRole, isAgent } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a884]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check it
  if (requireRole && !hasRole(requireRole)) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-[#8696a0]">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // User is logged in but may not have any role yet (pending approval)
  if (!isAgent && !loading) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center p-4">
        <div className="bg-[#202c33] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-[#f59e0b]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Aguardando Aprovação</h1>
          <p className="text-[#8696a0] mb-4">
            Sua conta foi criada mas ainda não foi aprovada por um administrador. 
            Entre em contato com seu supervisor para liberar seu acesso.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="text-[#00a884] hover:underline text-sm"
          >
            Verificar novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
