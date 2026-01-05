import { useChatStore } from '@/stores/chatStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  UserPlus, 
  ArrowRightLeft, 
  CheckCircle2, 
  Phone, 
  Tag, 
  X,
  User,
  Clock
} from 'lucide-react';
import { agents, currentUser, availableTags } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

export function ControlPanel() {
  const getSelectedConversation = useChatStore((state) => state.getSelectedConversation);
  const assignConversation = useChatStore((state) => state.assignConversation);
  const transferConversation = useChatStore((state) => state.transferConversation);
  const closeConversation = useChatStore((state) => state.closeConversation);
  const addTag = useChatStore((state) => state.addTag);
  const removeTag = useChatStore((state) => state.removeTag);
  
  const conversation = getSelectedConversation();
  const [showTransfer, setShowTransfer] = useState(false);
  
  if (!conversation) return null;
  
  const { contact, status, assignedTo, tags, createdAt } = conversation;
  
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isAssignedToMe = assignedTo?.id === currentUser.id;
  const canAssign = !assignedTo || currentUser.role === 'admin';
  const canTransfer = isAssignedToMe || currentUser.role === 'admin';
  const canClose = (isAssignedToMe || currentUser.role === 'admin') && status !== 'resolved';

  const otherAgents = agents.filter(a => a.id !== assignedTo?.id);
  const availableTagsToAdd = availableTags.filter(t => !tags.includes(t));

  const handleTransfer = (agentId: string) => {
    transferConversation(conversation.id, agentId);
    setShowTransfer(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground">Detalhes</h3>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* Contact Info */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 mb-3">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h4 className="font-semibold text-lg text-foreground">{contact.name}</h4>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Phone className="h-3 w-3" />
            {contact.phone}
          </p>
        </div>

        <Separator />

        {/* Status & Assignment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className={cn(
              'text-xs font-medium',
              status === 'new' && 'border-status-new text-status-new',
              status === 'active' && 'border-status-active text-status-active',
              status === 'resolved' && 'border-muted-foreground text-muted-foreground'
            )}>
              {status === 'new' && 'Nova'}
              {status === 'active' && 'Em atendimento'}
              {status === 'resolved' && 'Resolvida'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Atendente</span>
            {assignedTo ? (
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {assignedTo.name}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">Não atribuída</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Criada em</span>
            <span className="text-sm text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(createdAt, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          {/* Assume */}
          {canAssign && !isAssignedToMe && status !== 'resolved' && (
            <Button
              onClick={() => assignConversation(conversation.id)}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <UserPlus className="h-4 w-4" />
              Assumir atendimento
            </Button>
          )}

          {/* Transfer */}
          {canTransfer && status === 'active' && (
            <>
              {!showTransfer ? (
                <Button
                  onClick={() => setShowTransfer(true)}
                  className="w-full justify-start gap-2"
                  variant="outline"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Transferir
                </Button>
              ) : (
                <div className="space-y-2">
                  <Select onValueChange={handleTransfer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'h-2 w-2 rounded-full',
                              agent.isOnline ? 'bg-online' : 'bg-muted-foreground'
                            )} />
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setShowTransfer(false)}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Close */}
          {canClose && (
            <Button
              onClick={() => closeConversation(conversation.id)}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar conversa
            </Button>
          )}
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Tags</span>
          </div>

          {/* Current tags */}
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="pl-2 pr-1 py-1 gap-1"
              >
                {tag}
                <button
                  onClick={() => removeTag(conversation.id, tag)}
                  className="hover:bg-foreground/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Add tag */}
          {availableTagsToAdd.length > 0 && (
            <Select onValueChange={(tag) => addTag(conversation.id, tag)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Adicionar tag..." />
              </SelectTrigger>
              <SelectContent>
                {availableTagsToAdd.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
