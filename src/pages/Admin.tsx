import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useZAPIConnection } from '@/hooks/useZAPIConnection';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, Users, QrCode, BarChart3, CheckCircle2, XCircle, 
  UserCheck, UserX, Clock, MessageSquare, ArrowLeft, RefreshCw,
  Smartphone, History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PendingUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

interface ConversationStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: number;
}

interface AgentStats {
  id: string;
  name: string;
  activeConversations: number;
  avgResponseTime: number;
}

export default function Admin() {
  const { hasRole } = useAuth();
  const { status, loading: zapiLoading, qrLoading, checkStatus, getQRCode, disconnect, restart } = useZAPIConnection();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [stats, setStats] = useState<ConversationStats>({ total: 0, pending: 0, inProgress: 0, resolved: 0, avgResponseTime: 0 });
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [pollingQR, setPollingQR] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);

  const isAdmin = hasRole('admin');

  // Fetch pending users (profiles without roles)
  const fetchPendingUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id');

      if (rolesError) throw rolesError;

      const usersWithRoles = new Set(roles?.map(r => r.user_id) || []);
      const pending = profiles?.filter(p => !usersWithRoles.has(p.user_id)) || [];
      
      setPendingUsers(pending);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      toast.error('Erro ao carregar usuários pendentes');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch conversation stats
  const fetchStats = async () => {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, status, assigned_to, created_at, updated_at');

      if (error) throw error;

      const total = conversations?.length || 0;
      const pending = conversations?.filter(c => c.status === 'pending').length || 0;
      const inProgress = conversations?.filter(c => c.status === 'in_progress').length || 0;
      const resolved = conversations?.filter(c => c.status === 'resolved').length || 0;

      // Calculate average response time (simplified - time between created_at and updated_at)
      let totalResponseTime = 0;
      let responseCount = 0;
      conversations?.forEach(c => {
        if (c.updated_at && c.created_at) {
          const diff = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
          if (diff > 0) {
            totalResponseTime += diff;
            responseCount++;
          }
        }
      });
      const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000 / 60) : 0;

      setStats({ total, pending, inProgress, resolved, avgResponseTime });

      // Fetch agent stats
      const { data: agents, error: agentsError } = await supabase
        .from('profiles')
        .select('id, user_id, name');

      if (!agentsError && agents) {
        const { data: agentRoles } = await supabase
          .from('user_roles')
          .select('user_id');

        const agentUserIds = new Set(agentRoles?.map(r => r.user_id) || []);
        const activeAgents = agents.filter(a => agentUserIds.has(a.user_id));

        const agentStatsData: AgentStats[] = activeAgents.map(agent => {
          const agentConversations = conversations?.filter(c => c.assigned_to === agent.user_id) || [];
          return {
            id: agent.id,
            name: agent.name,
            activeConversations: agentConversations.filter(c => c.status === 'in_progress').length,
            avgResponseTime: 0, // Simplified for now
          };
        });

        setAgentStats(agentStatsData);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchStats();
  }, []);

  // Poll for QR code
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (pollingQR && !status.connected) {
      interval = setInterval(async () => {
        const result = await getQRCode();
        if (result?.connected) {
          setPollingQR(false);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollingQR, status.connected, getQRCode]);

  const handleApproveUser = async (userId: string, role: 'admin' | 'supervisor' | 'agent') => {
    setApprovingUser(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast.success('Usuário aprovado com sucesso!');
      fetchPendingUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error('Erro ao aprovar usuário');
    } finally {
      setApprovingUser(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    // For now, just remove from pending list (in a real app, you might delete the user)
    toast.info('Usuário rejeitado');
    setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleConnect = async () => {
    setPollingQR(true);
    await getQRCode();
  };

  const handleSyncHistory = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapi-sync-history', {
        body: { limit: 50 }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Sincronização concluída! ${data.synced} conversas sincronizadas.`);
        fetchStats();
      } else {
        toast.error(data.error || 'Erro ao sincronizar');
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Erro ao sincronizar histórico');
    } finally {
      setSyncing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <Card className="bg-[#202c33] border-[#2a3942]">
          <CardContent className="pt-6">
            <p className="text-[#e9edef]">Acesso restrito a administradores.</p>
            <Link to="/" className="block mt-4">
              <Button variant="outline">Voltar ao Chat</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111b21] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-[#aebac1] hover:text-[#e9edef] hover:bg-[#202c33]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#e9edef]">Painel Administrativo</h1>
            <p className="text-[#8696a0]">Gerencie usuários, conexões e monitore atendimentos</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-[#202c33] border-[#2a3942]">
            <TabsTrigger value="users" className="data-[state=active]:bg-[#00a884] data-[state=active]:text-[#111b21]">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-[#00a884] data-[state=active]:text-[#111b21]">
              <QrCode className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-[#00a884] data-[state=active]:text-[#111b21]">
              <BarChart3 className="h-4 w-4 mr-2" />
              Métricas
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-[#202c33] border-[#2a3942]">
              <CardHeader>
                <CardTitle className="text-[#e9edef] flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Aprovação de Cadastros
                </CardTitle>
                <CardDescription className="text-[#8696a0]">
                  Aprove novos usuários e defina suas permissões
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando usuários...
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <div className="text-center py-8 text-[#8696a0]">
                    <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum cadastro pendente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-[#2a3942] rounded-xl">
                        <div>
                          <p className="font-medium text-[#e9edef]">{user.name}</p>
                          <p className="text-sm text-[#8696a0]">{user.email}</p>
                          <p className="text-xs text-[#8696a0] mt-1">
                            Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            onValueChange={(value) => handleApproveUser(user.user_id, value as 'admin' | 'supervisor' | 'agent')}
                            disabled={approvingUser === user.user_id}
                          >
                            <SelectTrigger className="w-32 bg-[#00a884] border-none text-[#111b21]">
                              <SelectValue placeholder="Aprovar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agent">Agente</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRejectUser(user.user_id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-4">
            {/* Status Card */}
            <Card className="bg-[#202c33] border-[#2a3942]">
              <CardHeader>
                <CardTitle className="text-[#e9edef] flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Status da Conexão
                </CardTitle>
              </CardHeader>
              <CardContent>
                {zapiLoading ? (
                  <div className="flex items-center gap-2 text-[#8696a0]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando conexão...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#e9edef]">Status</span>
                      <Badge className={cn(
                        status.connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {status.connected ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
                        )}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={checkStatus} variant="outline" size="sm" className="border-[#2a3942] text-[#e9edef]">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                      </Button>
                      {status.connected && (
                        <>
                          <Button onClick={disconnect} variant="outline" size="sm" className="border-[#2a3942] text-[#e9edef]">
                            Desconectar
                          </Button>
                          <Button onClick={handleSyncHistory} disabled={syncing} variant="outline" size="sm" className="border-[#2a3942] text-[#e9edef]">
                            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <History className="h-4 w-4 mr-2" />}
                            Sincronizar
                          </Button>
                        </>
                      )}
                      <Button onClick={restart} variant="outline" size="sm" className="border-[#2a3942] text-[#e9edef]">
                        Reiniciar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Code Card */}
            {!status.connected && (
              <Card className="bg-[#202c33] border-[#2a3942]">
                <CardHeader>
                  <CardTitle className="text-[#e9edef] flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Conectar WhatsApp
                  </CardTitle>
                  <CardDescription className="text-[#8696a0]">
                    Escaneie o QR Code com seu WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    {status.qrcode ? (
                      <>
                        <div className="bg-white p-4 rounded-lg">
                          <img 
                            src={`data:image/png;base64,${status.qrcode}`}
                            alt="QR Code"
                            className="w-64 h-64"
                          />
                        </div>
                        <p className="text-sm text-[#8696a0] text-center">
                          Abra o WhatsApp → Configurações → Aparelhos Conectados
                        </p>
                        {pollingQR && (
                          <div className="flex items-center gap-2 text-sm text-[#8696a0]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Aguardando conexão...
                          </div>
                        )}
                      </>
                    ) : (
                      <Button onClick={handleConnect} disabled={qrLoading} className="bg-[#00a884] hover:bg-[#00997a] text-[#111b21]">
                        {qrLoading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                        ) : (
                          <><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connected Card */}
            {status.connected && (
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#e9edef]">WhatsApp Conectado!</h3>
                      <p className="text-sm text-[#8696a0]">
                        Pronto para receber e enviar mensagens.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-[#202c33] border-[#2a3942]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#e9edef]">{stats.total}</p>
                    <p className="text-sm text-[#8696a0]">Total de Conversas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#202c33] border-[#2a3942]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
                    <p className="text-sm text-[#8696a0]">Aguardando</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#202c33] border-[#2a3942]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
                    <p className="text-sm text-[#8696a0]">Em Atendimento</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#202c33] border-[#2a3942]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-400">{stats.resolved}</p>
                    <p className="text-sm text-[#8696a0]">Resolvidos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Time */}
            <Card className="bg-[#202c33] border-[#2a3942]">
              <CardHeader>
                <CardTitle className="text-[#e9edef] flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tempo Médio de Resposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-[#00a884]">
                  {stats.avgResponseTime} <span className="text-lg font-normal text-[#8696a0]">minutos</span>
                </p>
              </CardContent>
            </Card>

            {/* Agents */}
            <Card className="bg-[#202c33] border-[#2a3942]">
              <CardHeader>
                <CardTitle className="text-[#e9edef] flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Atendentes Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentStats.length === 0 ? (
                  <p className="text-[#8696a0]">Nenhum atendente com conversas ativas</p>
                ) : (
                  <div className="space-y-3">
                    {agentStats.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-[#2a3942] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                            <span className="text-[#00a884] font-medium">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[#e9edef]">{agent.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[#8696a0]" />
                          <span className="text-[#e9edef] font-medium">{agent.activeConversations}</span>
                          <span className="text-[#8696a0] text-sm">em atendimento</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={fetchStats} variant="outline" className="border-[#2a3942] text-[#e9edef]">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Métricas
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}