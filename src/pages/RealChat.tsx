import { useState } from 'react';
import { useRealConversations, useRealMessages, RealConversation } from '@/hooks/useRealConversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, ArrowLeft, MessageSquare, Settings, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function RealChat() {
  const { conversations, loading: convLoading, markAsRead, refetch } = useRealConversations();
  const [selectedConversation, setSelectedConversation] = useState<RealConversation | null>(null);
  const { messages, loading: msgLoading, sendMessage } = useRealMessages(selectedConversation?.id || null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        'https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-sync',
        { headers: { 'Content-Type': 'application/json' } }
      );
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Sincronizado! ${result.imported} conversas importadas, ${result.skipped} ignoradas`);
        refetch();
      } else {
        toast.error(result.error || 'Erro ao sincronizar');
      }
    } catch (err) {
      toast.error('Erro ao sincronizar conversas');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectConversation = (conv: RealConversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      markAsRead(conv.id);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;
    
    setSending(true);
    await sendMessage(inputValue);
    setInputValue('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <header className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">WhatsApp</h1>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSync} 
                disabled={syncing}
                className="h-8 w-8"
                title="Sincronizar conversas da Z-API"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={refetch} className="h-8 w-8" title="Atualizar">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Link to="/whatsapp">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Configurações">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Conversas reais do WhatsApp</p>
        </header>

        <ScrollArea className="flex-1">
          {convLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa ainda</p>
              <p className="text-xs">Aguardando mensagens...</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                    selectedConversation?.id === conv.id && 'bg-accent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(conv.name || conv.phone).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{conv.name || conv.phone}</span>
                        {conv.unread_count > 0 && (
                          <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message || 'Sem mensagens'}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(conv.last_message_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="bg-muted/50 rounded-full p-6 mb-4">
              <MessageSquare className="h-12 w-12 opacity-50" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1">Selecione uma conversa</h2>
            <p className="text-sm">Escolha uma conversa na lista para começar</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex items-center gap-3 p-4 border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                className="md:hidden h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(selectedConversation.name || selectedConversation.phone).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">{selectedConversation.name || selectedConversation.phone}</h2>
                <p className="text-xs text-muted-foreground">{selectedConversation.phone}</p>
              </div>
            </header>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {msgLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          msg.sender_type === 'agent'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn(
                          'text-[10px] mt-1',
                          msg.sender_type === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                          {msg.sender_type === 'agent' && msg.status && (
                            <span className="ml-1">• {msg.status}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim() || sending}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}