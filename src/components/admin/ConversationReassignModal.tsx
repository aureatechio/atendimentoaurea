import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, ArrowRight, Check, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_online: boolean;
  activeConversations: number;
}

interface Conversation {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  assigned_to: string | null;
  unread_count: number;
  last_message: string | null;
}

interface ConversationReassignModalProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  agents: Agent[];
  onSuccess: () => void;
}

export default function ConversationReassignModal({ 
  open, 
  onClose, 
  conversation, 
  agents,
  onSuccess 
}: ConversationReassignModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleReassign = async () => {
    if (!conversation || !selectedAgentId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          assigned_to: selectedAgentId,
          assigned_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', conversation.id);

      if (error) throw error;

      const selectedAgent = agents.find(a => a.user_id === selectedAgentId);
      toast.success(`Conversa reatribuída para ${selectedAgent?.name || 'agente'}`);
      onSuccess();
      onClose();
      setSelectedAgentId(null);
    } catch (err) {
      console.error('Error reassigning conversation:', err);
      toast.error('Erro ao reatribuir conversa');
    } finally {
      setLoading(false);
    }
  };

  const currentAgent = agents.find(a => a.user_id === conversation?.assigned_to);

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#e6edf3]">Reatribuir Conversa</DialogTitle>
          <DialogDescription className="text-[#8b949e]">
            Selecione um agente para assumir esta conversa
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Conversation Info */}
          <div className="p-4 bg-[#21262d] rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-[#30363d] text-[#e6edf3]">
                  {(conversation.name || conversation.phone).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#e6edf3] truncate">
                  {conversation.name || conversation.phone}
                </p>
                <p className="text-sm text-[#8b949e] flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {conversation.phone}
                </p>
                {conversation.last_message && (
                  <p className="text-xs text-[#8b949e] truncate mt-1">
                    {conversation.last_message}
                  </p>
                )}
              </div>
              {conversation.unread_count > 0 && (
                <Badge className="bg-[#238636] text-white">
                  {conversation.unread_count} novas
                </Badge>
              )}
            </div>

            {currentAgent && (
              <div className="mt-3 pt-3 border-t border-[#30363d] flex items-center gap-2 text-sm">
                <span className="text-[#8b949e]">Atribuído a:</span>
                <Badge variant="outline" className="border-[#30363d] text-[#e6edf3]">
                  {currentAgent.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#e6edf3]">Selecionar Agente</p>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2 pr-4">
                {agents.length === 0 ? (
                  <div className="text-center py-8 text-[#8b949e]">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum agente disponível</p>
                  </div>
                ) : (
                  agents.map((agent) => {
                    const isCurrentAgent = agent.user_id === conversation.assigned_to;
                    const isSelected = agent.user_id === selectedAgentId;
                    
                    return (
                      <button
                        key={agent.user_id}
                        onClick={() => !isCurrentAgent && setSelectedAgentId(agent.user_id)}
                        disabled={isCurrentAgent}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-all",
                          isCurrentAgent 
                            ? "bg-[#21262d] opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "bg-[#238636]/20 border border-[#238636]"
                              : "bg-[#21262d] hover:bg-[#30363d] border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className={cn(
                                "text-sm",
                                isSelected ? "bg-[#238636] text-white" : "bg-[#30363d] text-[#e6edf3]"
                              )}>
                                {agent.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2",
                              isSelected ? "border-[#238636]/20" : "border-[#21262d]",
                              agent.is_online ? "bg-emerald-500" : "bg-[#8b949e]"
                            )} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-[#e6edf3]">{agent.name}</p>
                            <p className="text-xs text-[#8b949e]">
                              {agent.activeConversations} conversas ativas
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isCurrentAgent && (
                            <Badge variant="outline" className="text-[10px] border-[#30363d] text-[#8b949e]">
                              Atual
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="h-6 w-6 rounded-full bg-[#238636] flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-[#30363d] text-[#e6edf3] hover:bg-[#30363d]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleReassign}
            disabled={loading || !selectedAgentId}
            className="bg-[#238636] hover:bg-[#2ea043] text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Reatribuir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
