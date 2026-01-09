import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useZAPIConnection } from '@/hooks/useZAPIConnection';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Loader2, Users, QrCode, BarChart3, CheckCircle2, XCircle, 
  UserCheck, UserX, Clock, MessageSquare, ArrowLeft, RefreshCw,
  Smartphone, History, TrendingUp, TrendingDown, AlertCircle,
  UserPlus, Settings2, Activity, Zap, Phone, Calendar,
  LayoutDashboard, UsersRound, Wifi, WifiOff, MoreVertical,
  ChevronRight, Circle, Eye, Pencil, Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserManagementModal from '@/components/admin/UserManagementModal';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, subDays, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_online: boolean;
  activeConversations: number;
  totalConversations: number;
  resolvedConversations: number;
  pendingConversations: number;
  avgResponseTime: number;
  totalMessages: number;
  todayMessages: number;
  todayConversations: number;
  resolutionRate: number;
}

interface DashboardStats {
  totalConversations: number;
  todayConversations: number;
  pendingConversations: number;
  inProgressConversations: number;
  resolvedConversations: number;
  awaitingResponseConversations: number;
  avgResponseTime: number;
  totalMessages: number;
  todayMessages: number;
  activeAgents: number;
  totalAgents: number;
  pendingApprovals: number;
  conversationsTrend: number;
  messagesTrend: number;
  totalUnreadMessages: number;
  avgMessagesPerConversation: number;
  resolvedTodayConversations: number;
  avgConversationsPerAgent: number;
}

export default function Admin() {
  const { hasRole, profile } = useAuth();
  const { status, loading: zapiLoading, qrLoading, checkStatus, getQRCode, disconnect, restart } = useZAPIConnection();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    todayConversations: 0,
    pendingConversations: 0,
    inProgressConversations: 0,
    resolvedConversations: 0,
    awaitingResponseConversations: 0,
    avgResponseTime: 0,
    totalMessages: 0,
    todayMessages: 0,
    activeAgents: 0,
    totalAgents: 0,
    pendingApprovals: 0,
    conversationsTrend: 0,
    messagesTrend: 0,
    totalUnreadMessages: 0,
    avgMessagesPerConversation: 0,
    resolvedTodayConversations: 0,
    avgConversationsPerAgent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pollingQR, setPollingQR] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Agent | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [showUserModal, setShowUserModal] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<string | null>(null);

  const isAdmin = hasRole('admin');

  const handleUserAction = (agent: Agent, mode: 'view' | 'edit' | 'delete') => {
    setSelectedUser(agent);
    setModalMode(mode);
    setShowUserModal(true);
  };

  const handleRejectUser = async (userId: string) => {
    setRejectingUser(userId);
    try {
      // Delete profile to reject user
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Cadastro rejeitado');
      fetchAllData();
    } catch (err) {
      console.error('Error rejecting user:', err);
      toast.error('Erro ao rejeitar cadastro');
    } finally {
      setRejectingUser(null);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('id, name, phone, status, assigned_to, created_at, updated_at, unread_count, last_message');

      if (convError) throw convError;

      // Fetch last message for each conversation to check sender_type
      const conversationIds = convData?.map(c => c.id) || [];
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, sender_type, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      // Fetch ALL messages with sender info for agent stats
      const { data: allMessages } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_type, created_at')
        .in('conversation_id', conversationIds);

      // Group last messages by conversation
      const lastMessageByConv = new Map<string, { sender_type: string }>();
      lastMessages?.forEach(msg => {
        if (!lastMessageByConv.has(msg.conversation_id)) {
          lastMessageByConv.set(msg.conversation_id, { sender_type: msg.sender_type });
        }
      });

      // Fetch messages for today
      const todayStart = startOfDay(new Date()).toISOString();
      const { data: todayMsgs, error: msgError } = await supabase
        .from('messages')
        .select('id, created_at')
        .gte('created_at', todayStart);

      // Fetch all messages count
      const { count: totalMsgs } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true });

      // Fetch profiles and roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, is_online, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Calculate pending users
      const usersWithRoles = new Set(roles?.map(r => r.user_id) || []);
      const pending = profiles?.filter(p => !usersWithRoles.has(p.user_id)) || [];
      setPendingUsers(pending);

      // Calculate agents with detailed stats
      const agentsList: Agent[] = [];
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      profiles?.forEach(p => {
        if (usersWithRoles.has(p.user_id)) {
          const agentConvs = convData?.filter(c => c.assigned_to === p.user_id) || [];
          const agentConvIds = new Set(agentConvs.map(c => c.id));
          
          // Messages sent by agent (sender_type = 'agent') in their conversations
          const agentMsgs = allMessages?.filter(m => 
            agentConvIds.has(m.conversation_id) && m.sender_type === 'agent'
          ) || [];
          
          const todayAgentMsgs = agentMsgs.filter(m => isToday(new Date(m.created_at)));
          const todayAgentConvs = agentConvs.filter(c => isToday(new Date(c.created_at)));
          const resolvedAgentConvs = agentConvs.filter(c => c.status === 'resolved');
          const pendingAgentConvs = agentConvs.filter(c => c.status === 'pending');
          
          // Calculate avg response time for this agent
          let agentResponseTime = 0;
          let agentResponseCount = 0;
          agentConvs.forEach(c => {
            if (c.updated_at && c.created_at && c.status !== 'pending') {
              const diff = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
              if (diff > 0 && diff < 86400000) {
                agentResponseTime += diff;
                agentResponseCount++;
              }
            }
          });
          const avgRespTime = agentResponseCount > 0 ? Math.round(agentResponseTime / agentResponseCount / 1000 / 60) : 0;
          
          // Resolution rate
          const resolutionRate = agentConvs.length > 0 
            ? Math.round((resolvedAgentConvs.length / agentConvs.length) * 100) 
            : 0;

          agentsList.push({
            id: p.id,
            user_id: p.user_id,
            name: p.name,
            email: p.email,
            role: rolesMap.get(p.user_id) || 'agent',
            is_online: p.is_online || false,
            activeConversations: agentConvs.filter(c => c.status === 'in_progress').length,
            totalConversations: agentConvs.length,
            resolvedConversations: resolvedAgentConvs.length,
            pendingConversations: pendingAgentConvs.length,
            avgResponseTime: avgRespTime,
            totalMessages: agentMsgs.length,
            todayMessages: todayAgentMsgs.length,
            todayConversations: todayAgentConvs.length,
            resolutionRate,
          });
        }
      });
      
      // Sort agents by performance (resolution rate, then total conversations)
      agentsList.sort((a, b) => {
        if (b.resolutionRate !== a.resolutionRate) return b.resolutionRate - a.resolutionRate;
        return b.totalConversations - a.totalConversations;
      });
      
      setAgents(agentsList);

      // Calculate conversation stats
      const total = convData?.length || 0;
      const todayConvs = convData?.filter(c => isToday(new Date(c.created_at))).length || 0;
      const pending_ = convData?.filter(c => c.status === 'pending').length || 0;
      const inProgress = convData?.filter(c => c.status === 'in_progress').length || 0;
      const resolved = convData?.filter(c => c.status === 'resolved').length || 0;
      const resolvedToday = convData?.filter(c => c.status === 'resolved' && isToday(new Date(c.updated_at))).length || 0;

      // Calculate awaiting response - conversations where last message is from customer (not replied)
      const awaitingResponse = convData?.filter(c => {
        const lastMsg = lastMessageByConv.get(c.id);
        return lastMsg?.sender_type === 'customer' && c.status !== 'resolved';
      }).length || 0;

      // Calculate total unread messages
      const totalUnread = convData?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;

      // Calculate yesterday for trend
      const yesterdayConvs = convData?.filter(c => {
        const date = new Date(c.created_at);
        const yesterday = subDays(new Date(), 1);
        return date >= startOfDay(yesterday) && date <= endOfDay(yesterday);
      }).length || 0;

      const trend = yesterdayConvs > 0 
        ? Math.round(((todayConvs - yesterdayConvs) / yesterdayConvs) * 100) 
        : todayConvs > 0 ? 100 : 0;

      // Calculate yesterday messages for trend
      const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();
      const yesterdayEnd = endOfDay(subDays(new Date(), 1)).toISOString();
      const { data: yesterdayMsgs } = await supabase
        .from('messages')
        .select('id')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd);

      const messageTrend = (yesterdayMsgs?.length || 0) > 0
        ? Math.round((((todayMsgs?.length || 0) - (yesterdayMsgs?.length || 0)) / (yesterdayMsgs?.length || 1)) * 100)
        : (todayMsgs?.length || 0) > 0 ? 100 : 0;

      // Calculate avg response time
      let totalResponseTime = 0;
      let responseCount = 0;
      convData?.forEach(c => {
        if (c.updated_at && c.created_at && c.status !== 'pending') {
          const diff = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
          if (diff > 0 && diff < 86400000) { // Less than 24h
            totalResponseTime += diff;
            responseCount++;
          }
        }
      });
      const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000 / 60) : 0;

      // Calculate avg messages per conversation
      const avgMsgsPerConv = total > 0 ? Math.round((totalMsgs || 0) / total) : 0;

      // Calculate avg conversations per agent
      const avgConvsPerAgent = agentsList.length > 0 
        ? Math.round(total / agentsList.length) 
        : 0;

      setStats({
        totalConversations: total,
        todayConversations: todayConvs,
        pendingConversations: pending_,
        inProgressConversations: inProgress,
        resolvedConversations: resolved,
        awaitingResponseConversations: awaitingResponse,
        avgResponseTime,
        totalMessages: totalMsgs || 0,
        todayMessages: todayMsgs?.length || 0,
        activeAgents: agentsList.filter(a => a.is_online).length,
        totalAgents: agentsList.length,
        pendingApprovals: pending.length,
        conversationsTrend: trend,
        messagesTrend: messageTrend,
        totalUnreadMessages: totalUnread,
        avgMessagesPerConversation: avgMsgsPerConv,
        resolvedTodayConversations: resolvedToday,
        avgConversationsPerAgent: avgConvsPerAgent,
      });

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Realtime subscription for profile online status
  useEffect(() => {
    const channel = supabase
      .channel('profiles-online-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updatedProfile = payload.new as { user_id: string; is_online: boolean };
          
          // Update agents list with new online status
          setAgents(prev => prev.map(agent => 
            agent.user_id === updatedProfile.user_id 
              ? { ...agent, is_online: updatedProfile.is_online }
              : agent
          ));
          
          // Update stats active agents count
          setStats(prev => ({
            ...prev,
            activeAgents: prev.activeAgents + (updatedProfile.is_online ? 1 : -1)
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      fetchAllData();
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error('Erro ao aprovar usuário');
    } finally {
      setApprovingUser(null);
    }
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
        toast.success(`${data.synced} conversas sincronizadas!`);
        fetchAllData();
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      supervisor: 'Supervisor',
      agent: 'Atendente',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      supervisor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      agent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400';
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4">
        <Card className="bg-[#1c2128] border-[#30363d] max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">Acesso Restrito</h2>
            <p className="text-[#8b949e] mb-6">Esta área é exclusiva para administradores.</p>
            <Link to="/">
              <Button className="bg-[#238636] hover:bg-[#2ea043] text-white">
                Voltar ao Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#161b22] border-b border-[#30363d] px-4 md:px-6">
        <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-[#e6edf3]">Painel Administrativo</h1>
              <p className="text-xs text-[#8b949e]">Atendimento Aurea</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              status.connected 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-red-500/20 text-red-400"
            )}>
              {status.connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {status.connected ? 'WhatsApp Conectado' : 'Desconectado'}
            </div>

            <Button onClick={fetchAllData} variant="ghost" size="icon" className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d]">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#238636] text-white text-sm">
                {profile?.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-[#161b22] p-1 rounded-lg w-fit">
          {[
            { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'team', label: 'Equipe', icon: UsersRound },
            { id: 'approvals', label: 'Aprovações', icon: UserPlus, badge: stats.pendingApprovals },
            { id: 'settings', label: 'Configurações', icon: Settings2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-[#30363d] text-[#e6edf3]"
                  : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <Badge className="h-5 min-w-[20px] px-1.5 bg-[#f85149] text-white text-xs">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b949e]" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Conversas Hoje</p>
                          <p className="text-2xl font-bold text-[#e6edf3] mt-1">{stats.todayConversations}</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
                          stats.conversationsTrend >= 0 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-red-500/20 text-red-400"
                        )}>
                          {stats.conversationsTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(stats.conversationsTrend)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Mensagens Hoje</p>
                          <p className="text-2xl font-bold text-[#e6edf3] mt-1">{stats.todayMessages}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-[#30363d]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cn(
                    "border-[#30363d]",
                    stats.awaitingResponseConversations > 0 
                      ? "bg-orange-500/10 border-orange-500/30" 
                      : "bg-[#161b22]"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Sem Resposta</p>
                          <p className={cn(
                            "text-2xl font-bold mt-1",
                            stats.awaitingResponseConversations > 0 ? "text-orange-400" : "text-[#e6edf3]"
                          )}>{stats.awaitingResponseConversations}</p>
                        </div>
                        <AlertCircle className={cn(
                          "h-8 w-8",
                          stats.awaitingResponseConversations > 0 ? "text-orange-500/50" : "text-[#30363d]"
                        )} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Tempo Médio</p>
                          <p className="text-2xl font-bold text-[#e6edf3] mt-1">{stats.avgResponseTime}<span className="text-sm font-normal text-[#8b949e]">min</span></p>
                        </div>
                        <Clock className="h-8 w-8 text-[#30363d]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Atendentes Online</p>
                          <p className="text-2xl font-bold text-[#e6edf3] mt-1">
                            {stats.activeAgents}<span className="text-sm font-normal text-[#8b949e]">/{stats.totalAgents}</span>
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-[#30363d]" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Resolvidas Hoje</p>
                          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.resolvedTodayConversations}</p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cn(
                    "border-[#30363d]",
                    stats.totalUnreadMessages > 0 
                      ? "bg-red-500/10 border-red-500/30" 
                      : "bg-[#161b22]"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Msgs Não Lidas</p>
                          <p className={cn(
                            "text-2xl font-bold mt-1",
                            stats.totalUnreadMessages > 0 ? "text-red-400" : "text-[#e6edf3]"
                          )}>{stats.totalUnreadMessages}</p>
                        </div>
                        <MessageSquare className={cn(
                          "h-8 w-8",
                          stats.totalUnreadMessages > 0 ? "text-red-500/50" : "text-[#30363d]"
                        )} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Msgs/Conversa</p>
                          <p className="text-2xl font-bold text-[#e6edf3] mt-1">{stats.avgMessagesPerConversation}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-[#30363d]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#8b949e] uppercase tracking-wide">Convs/Agente</p>
                          <p className="text-2xl font-bold text-[#e6edf3] mt-1">{stats.avgConversationsPerAgent}</p>
                        </div>
                        <UsersRound className="h-8 w-8 text-[#30363d]" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Overview */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Conversation Status */}
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#8b949e]" />
                        Status das Conversas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <span className="text-sm text-[#e6edf3]">Aguardando</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#e6edf3]">{stats.pendingConversations}</span>
                          <div className="w-24 h-2 bg-[#30363d] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500 rounded-full" 
                              style={{ width: `${stats.totalConversations > 0 ? (stats.pendingConversations / stats.totalConversations) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-[#e6edf3]">Em Atendimento</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#e6edf3]">{stats.inProgressConversations}</span>
                          <div className="w-24 h-2 bg-[#30363d] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${stats.totalConversations > 0 ? (stats.inProgressConversations / stats.totalConversations) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-emerald-500" />
                          <span className="text-sm text-[#e6edf3]">Resolvidos</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#e6edf3]">{stats.resolvedConversations}</span>
                          <div className="w-24 h-2 bg-[#30363d] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${stats.totalConversations > 0 ? (stats.resolvedConversations / stats.totalConversations) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-orange-500" />
                          <span className="text-sm text-[#e6edf3]">Sem Resposta</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#e6edf3]">{stats.awaitingResponseConversations}</span>
                          <div className="w-24 h-2 bg-[#30363d] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 rounded-full" 
                              style={{ width: `${stats.totalConversations > 0 ? (stats.awaitingResponseConversations / stats.totalConversations) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#30363d]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#8b949e]">Total de Conversas</span>
                          <span className="font-semibold text-[#e6edf3]">{stats.totalConversations}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[#8b949e]" />
                        Ações Rápidas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <button 
                        onClick={() => setActiveTab('approvals')}
                        className="w-full flex items-center justify-between p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-purple-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-[#e6edf3]">Aprovações Pendentes</p>
                            <p className="text-xs text-[#8b949e]">{stats.pendingApprovals} usuários aguardando</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#8b949e] group-hover:text-[#e6edf3]" />
                      </button>

                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="w-full flex items-center justify-between p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            status.connected ? "bg-emerald-500/20" : "bg-red-500/20"
                          )}>
                            <Phone className={cn("h-5 w-5", status.connected ? "text-emerald-400" : "text-red-400")} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-[#e6edf3]">Conexão WhatsApp</p>
                            <p className="text-xs text-[#8b949e]">{status.connected ? 'Conectado e funcionando' : 'Desconectado - clique para conectar'}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#8b949e] group-hover:text-[#e6edf3]" />
                      </button>

                      <button 
                        onClick={handleSyncHistory}
                        disabled={syncing}
                        className="w-full flex items-center justify-between p-3 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            {syncing ? <Loader2 className="h-5 w-5 text-blue-400 animate-spin" /> : <History className="h-5 w-5 text-blue-400" />}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-[#e6edf3]">Sincronizar Histórico</p>
                            <p className="text-xs text-[#8b949e]">Importar mensagens do WhatsApp</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#8b949e] group-hover:text-[#e6edf3]" />
                      </button>
                    </CardContent>
                  </Card>
                </div>

                {/* Team Overview */}
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[#e6edf3] text-base font-medium flex items-center gap-2">
                        <UsersRound className="h-4 w-4 text-[#8b949e]" />
                        Equipe de Atendimento
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveTab('team')}
                        className="text-[#58a6ff] hover:text-[#58a6ff] hover:bg-[#21262d]"
                      >
                        Ver todos
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agents.length === 0 ? (
                      <p className="text-[#8b949e] text-sm text-center py-8">Nenhum atendente cadastrado</p>
                    ) : (
                      <div className="space-y-3">
                        {agents.slice(0, 5).map((agent) => (
                          <div key={agent.id} className="flex items-center justify-between p-3 bg-[#21262d] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-[#30363d] text-[#e6edf3]">
                                    {agent.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#21262d]",
                                  agent.is_online ? "bg-emerald-500" : "bg-[#8b949e]"
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#e6edf3]">{agent.name}</p>
                                <Badge variant="outline" className={cn("text-[10px] border", getRoleColor(agent.role))}>
                                  {getRoleLabel(agent.role)}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-[#e6edf3]">{agent.activeConversations}</p>
                              <p className="text-xs text-[#8b949e]">em atendimento</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                {/* Performance Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <p className="text-xs text-[#8b949e] uppercase tracking-wide">Total Atendentes</p>
                      <p className="text-2xl font-bold text-[#e6edf3] mt-1">{agents.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <p className="text-xs text-[#8b949e] uppercase tracking-wide">Online Agora</p>
                      <p className="text-2xl font-bold text-emerald-400 mt-1">{agents.filter(a => a.is_online).length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <p className="text-xs text-[#8b949e] uppercase tracking-wide">Taxa Resolução Média</p>
                      <p className="text-2xl font-bold text-[#e6edf3] mt-1">
                        {agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.resolutionRate, 0) / agents.length) : 0}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#161b22] border-[#30363d]">
                    <CardContent className="p-4">
                      <p className="text-xs text-[#8b949e] uppercase tracking-wide">Tempo Resp. Médio</p>
                      <p className="text-2xl font-bold text-[#e6edf3] mt-1">
                        {agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.avgResponseTime, 0) / agents.length) : 0}
                        <span className="text-sm font-normal text-[#8b949e]">min</span>
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Agent Performance Cards */}
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e6edf3] flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Análise de Desempenho
                    </CardTitle>
                    <CardDescription className="text-[#8b949e]">
                      Métricas detalhadas de cada atendente ordenadas por performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agents.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-[#30363d] mx-auto mb-4" />
                        <p className="text-[#8b949e]">Nenhum atendente cadastrado</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {agents.map((agent, index) => (
                          <div key={agent.id} className="p-4 bg-[#21262d] rounded-xl">
                            {/* Agent Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className={cn(
                                    "absolute -top-1 -left-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    index === 0 ? "bg-yellow-500 text-black" :
                                    index === 1 ? "bg-gray-400 text-black" :
                                    index === 2 ? "bg-orange-600 text-white" :
                                    "bg-[#30363d] text-[#8b949e]"
                                  )}>
                                    {index + 1}
                                  </div>
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-[#30363d] text-[#e6edf3] text-lg">
                                      {agent.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={cn(
                                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#21262d]",
                                    agent.is_online ? "bg-emerald-500" : "bg-[#8b949e]"
                                  )} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-[#e6edf3]">{agent.name}</p>
                                    <Badge variant="outline" className={cn("text-[10px] border", getRoleColor(agent.role))}>
                                      {getRoleLabel(agent.role)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-[#8b949e]">{agent.email}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium",
                                  agent.is_online ? "bg-emerald-500/20 text-emerald-400" : "bg-[#30363d] text-[#8b949e]"
                                )}>
                                  {agent.is_online ? '🟢 Online' : '⚫ Offline'}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d]">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-[#21262d] border-[#30363d]">
                                    <DropdownMenuItem 
                                      onClick={() => handleUserAction(agent, 'edit')}
                                      className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]"
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-[#30363d]" />
                                    <DropdownMenuItem 
                                      onClick={() => handleUserAction(agent, 'delete')}
                                      className="text-[#f85149] focus:bg-[#f85149]/20 focus:text-[#f85149]"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remover acesso
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Performance Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                              <div className="bg-[#161b22] rounded-lg p-3 text-center">
                                <p className="text-xs text-[#8b949e] mb-1">Ativas</p>
                                <p className="text-lg font-bold text-blue-400">{agent.activeConversations}</p>
                              </div>
                              <div className="bg-[#161b22] rounded-lg p-3 text-center">
                                <p className="text-xs text-[#8b949e] mb-1">Pendentes</p>
                                <p className="text-lg font-bold text-yellow-400">{agent.pendingConversations}</p>
                              </div>
                              <div className="bg-[#161b22] rounded-lg p-3 text-center">
                                <p className="text-xs text-[#8b949e] mb-1">Resolvidas</p>
                                <p className="text-lg font-bold text-emerald-400">{agent.resolvedConversations}</p>
                              </div>
                              <div className="bg-[#161b22] rounded-lg p-3 text-center">
                                <p className="text-xs text-[#8b949e] mb-1">Total Convs</p>
                                <p className="text-lg font-bold text-[#e6edf3]">{agent.totalConversations}</p>
                              </div>
                              <div className="bg-[#161b22] rounded-lg p-3 text-center">
                                <p className="text-xs text-[#8b949e] mb-1">Msgs Enviadas</p>
                                <p className="text-lg font-bold text-[#e6edf3]">{agent.totalMessages}</p>
                              </div>
                              <div className="bg-[#161b22] rounded-lg p-3 text-center">
                                <p className="text-xs text-[#8b949e] mb-1">Tempo Resp.</p>
                                <p className="text-lg font-bold text-[#e6edf3]">{agent.avgResponseTime}<span className="text-xs font-normal">min</span></p>
                              </div>
                            </div>

                            {/* Resolution Rate Bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#8b949e]">Taxa de Resolução</span>
                                <span className={cn(
                                  "font-bold",
                                  agent.resolutionRate >= 80 ? "text-emerald-400" :
                                  agent.resolutionRate >= 50 ? "text-yellow-400" :
                                  "text-red-400"
                                )}>{agent.resolutionRate}%</span>
                              </div>
                              <div className="h-2 bg-[#161b22] rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    agent.resolutionRate >= 80 ? "bg-emerald-500" :
                                    agent.resolutionRate >= 50 ? "bg-yellow-500" :
                                    "bg-red-500"
                                  )}
                                  style={{ width: `${agent.resolutionRate}%` }}
                                />
                              </div>
                            </div>

                            {/* Today Stats */}
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#30363d]">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-[#8b949e]" />
                                <span className="text-[#8b949e]">Hoje:</span>
                              </div>
                              <Badge variant="outline" className="border-[#30363d] text-[#e6edf3]">
                                {agent.todayConversations} conversas
                              </Badge>
                              <Badge variant="outline" className="border-[#30363d] text-[#e6edf3]">
                                {agent.todayMessages} mensagens
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <div className="space-y-6">
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e6edf3] flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Aprovação de Cadastros
                    </CardTitle>
                    <CardDescription className="text-[#8b949e]">
                      Revise e aprove novos usuários que desejam acessar o sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mx-auto mb-4" />
                        <p className="text-[#e6edf3] font-medium">Tudo em dia!</p>
                        <p className="text-sm text-[#8b949e] mt-1">Não há cadastros pendentes para aprovação</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-[#21262d] rounded-xl">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-purple-500/20 text-purple-400 text-lg">
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-[#e6edf3]">{user.name}</p>
                                <p className="text-sm text-[#8b949e]">{user.email}</p>
                                <p className="text-xs text-[#8b949e] mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Cadastrado em {format(new Date(user.created_at), "d 'de' MMMM", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Select 
                                onValueChange={(value) => handleApproveUser(user.user_id, value as 'admin' | 'supervisor' | 'agent')}
                                disabled={approvingUser === user.user_id}
                              >
                                <SelectTrigger className="w-36 bg-[#238636] hover:bg-[#2ea043] border-none text-white">
                                  {approvingUser === user.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <SelectValue placeholder="Aprovar como..." />
                                  )}
                                </SelectTrigger>
                                <SelectContent className="bg-[#21262d] border-[#30363d]">
                                  <SelectItem value="agent" className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]">Atendente</SelectItem>
                                  <SelectItem value="supervisor" className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]">Supervisor</SelectItem>
                                  <SelectItem value="admin" className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRejectUser(user.user_id)}
                                disabled={rejectingUser === user.user_id}
                                className="text-[#f85149] hover:text-[#f85149] hover:bg-[#f85149]/20"
                              >
                                {rejectingUser === user.user_id ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <UserX className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* WhatsApp Connection */}
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e6edf3] flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Conexão WhatsApp
                    </CardTitle>
                    <CardDescription className="text-[#8b949e]">
                      Gerencie a conexão do WhatsApp Business via Z-API
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status */}
                    <div className="flex items-center justify-between p-4 bg-[#21262d] rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center",
                          status.connected ? "bg-emerald-500/20" : "bg-red-500/20"
                        )}>
                          {status.connected ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#e6edf3]">
                            {status.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                          </p>
                          <p className="text-sm text-[#8b949e]">
                            {status.connected ? 'Pronto para enviar e receber mensagens' : 'Escaneie o QR Code para conectar'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={checkStatus} 
                          variant="outline" 
                          size="sm"
                          className="border-[#30363d] text-[#e6edf3] hover:bg-[#30363d]"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Atualizar
                        </Button>
                        {status.connected && (
                          <Button 
                            onClick={disconnect} 
                            variant="outline" 
                            size="sm"
                            className="border-[#f85149]/50 text-[#f85149] hover:bg-[#f85149]/20"
                          >
                            Desconectar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    {!status.connected && (
                      <div className="flex flex-col items-center gap-6 py-6">
                        {status.qrcode ? (
                          <>
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                              <img 
                                src={`data:image/png;base64,${status.qrcode}`}
                                alt="QR Code"
                                className="w-64 h-64"
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-[#e6edf3] mb-1">Escaneie com seu WhatsApp</p>
                              <p className="text-xs text-[#8b949e]">Configurações → Aparelhos Conectados → Conectar Aparelho</p>
                            </div>
                            {pollingQR && (
                              <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Aguardando conexão...
                              </div>
                            )}
                          </>
                        ) : (
                          <Button 
                            onClick={handleConnect} 
                            disabled={qrLoading}
                            className="bg-[#238636] hover:bg-[#2ea043] text-white px-8"
                          >
                            {qrLoading ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                            ) : (
                              <><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Connected Actions */}
                    {status.connected && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <button 
                          onClick={handleSyncHistory}
                          disabled={syncing}
                          className="flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#30363d] rounded-xl transition-colors disabled:opacity-50 text-left"
                        >
                          <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            {syncing ? <Loader2 className="h-5 w-5 text-blue-400 animate-spin" /> : <History className="h-5 w-5 text-blue-400" />}
                          </div>
                          <div>
                            <p className="font-medium text-[#e6edf3]">Sincronizar Histórico</p>
                            <p className="text-xs text-[#8b949e]">Importar mensagens antigas</p>
                          </div>
                        </button>

                        <button 
                          onClick={restart}
                          className="flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#30363d] rounded-xl transition-colors text-left"
                        >
                          <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div>
                            <p className="font-medium text-[#e6edf3]">Reiniciar Instância</p>
                            <p className="text-xs text-[#8b949e]">Resolver problemas de conexão</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Webhook Info */}
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e6edf3] text-sm">Configuração do Webhook</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[#8b949e] mb-3">
                      Configure esta URL no painel da Z-API para receber mensagens em tempo real:
                    </p>
                    <code className="block p-4 bg-[#0d1117] rounded-lg text-xs text-[#58a6ff] break-all font-mono">
                      https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-webhook
                    </code>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <UserManagementModal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        user={selectedUser}
        mode={modalMode}
        onSuccess={fetchAllData}
      />

    </div>
  );
}