import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import logoAurea from '@/assets/logo-aurea.png';

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message === 'Invalid login credentials' 
            ? 'Email ou senha inválidos' 
            : error.message);
        } else {
          toast.success('Login realizado com sucesso!');
        }
      } else {
        if (!name.trim()) {
          toast.error('Por favor, informe seu nome');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Conta criada! Faça login para continuar.');
          setIsLogin(true);
          setPassword('');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#202c33] rounded-2xl p-6 shadow-2xl border border-[#2a3942]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#e9edef] text-sm">
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0] h-12 rounded-xl focus-visible:ring-[#00a884]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#e9edef] text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0] h-12 rounded-xl focus-visible:ring-[#00a884]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#e9edef] text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0] h-12 rounded-xl pr-12 focus-visible:ring-[#00a884]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-[#00a884] hover:bg-[#00997a] text-[#111b21] font-semibold rounded-xl transition-all"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                'Entrar'
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#00a884] hover:underline text-sm"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
