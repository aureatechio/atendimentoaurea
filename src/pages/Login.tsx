import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import logoAurea from '@/assets/logo-aurea.png';

export default function Login() {
  const { user, loading, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a884]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await signInWithEmail(email);
      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success('Link de acesso enviado para seu email!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1014] via-[#111b21] to-[#1a2c38] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl mb-6 overflow-hidden">
            <img src={logoAurea} alt="Aurea" className="w-full h-full object-cover" />
          </div>
          
          <div className="bg-[#202c33] rounded-2xl p-8 shadow-2xl border border-[#2a3942]">
            <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-[#00a884]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verifique seu email</h2>
            <p className="text-[#8696a0] mb-4">
              Enviamos um link de acesso para<br />
              <span className="text-white font-medium">{email}</span>
            </p>
            <p className="text-[#8696a0] text-sm mb-6">
              Clique no link do email para entrar no sistema.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="text-[#00a884] hover:underline text-sm"
            >
              Usar outro email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1014] via-[#111b21] to-[#1a2c38] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl mb-4 overflow-hidden">
            <img src={logoAurea} alt="Aurea" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Atendimento Aurea</h1>
          <p className="text-[#8696a0] mt-1">
            Entre com seu email corporativo
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#202c33] rounded-2xl p-6 shadow-2xl border border-[#2a3942]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#e9edef] text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8696a0]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0] h-12 rounded-xl pl-11 focus-visible:ring-[#00a884]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-[#00a884] hover:bg-[#00997a] text-[#111b21] font-semibold rounded-xl transition-all"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Enviar link de acesso'
              )}
            </Button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-[#8696a0] text-xs mt-6">
          Você receberá um link no email para acessar o sistema.
        </p>
      </div>
    </div>
  );
}
