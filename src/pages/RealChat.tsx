import { useState, useRef, useEffect } from 'react';
import { useRealConversations, useRealMessages, RealConversation } from '@/hooks/useRealConversations';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, MessageSquare, Settings, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble';
import { WhatsAppChatInput } from '@/components/chat/WhatsAppChatInput';

export default function RealChat() {
  const { conversations, loading: convLoading, markAsRead, refetch } = useRealConversations();
  const [selectedConversation, setSelectedConversation] = useState<RealConversation | null>(null);
  const { messages, loading: msgLoading, sendMessage, sendMedia } = useRealMessages(selectedConversation?.id || null);
  const [syncing, setSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        'https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-sync',
        { headers: { 'Content-Type': 'application/json' } }
      );
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || `Sincronizado! ${result.imported} novas, ${result.updated || 0} atualizadas`);
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

  return (
    <div className="flex h-screen bg-[#efeae2]">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <header className="p-4 border-b border-border bg-[#f0f2f5]">
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
              <p className="text-xs">Clique em ⬇️ para sincronizar</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    'w-full p-3 text-left hover:bg-accent/50 transition-colors',
                    selectedConversation?.id === conv.id && 'bg-accent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {conv.avatar_url && <AvatarImage src={conv.avatar_url} />}
                      <AvatarFallback className="bg-[#00a884] text-white">
                        {(conv.name || conv.phone).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{conv.name || conv.phone}</span>
                        {conv.last_message_at && (
                          <span className={cn(
                            'text-xs',
                            conv.unread_count > 0 ? 'text-[#00a884] font-medium' : 'text-muted-foreground'
                          )}>
                            {formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conv.last_message || 'Sem mensagens'}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 px-1.5 text-xs bg-[#25d366] hover:bg-[#25d366]">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
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
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#f0f2f5]">
            <div className="bg-white/50 rounded-full p-8 mb-4">
              <MessageSquare className="h-16 w-16 opacity-30" />
            </div>
            <h2 className="text-xl font-light text-foreground mb-2">WhatsApp Web</h2>
            <p className="text-sm text-center max-w-md">
              Selecione uma conversa para começar a enviar mensagens
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-2 bg-[#f0f2f5] border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                className="md:hidden h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10">
                {selectedConversation.avatar_url && (
                  <AvatarImage src={selectedConversation.avatar_url} />
                )}
                <AvatarFallback className="bg-[#00a884] text-white">
                  {(selectedConversation.name || selectedConversation.phone).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-semibold">{selectedConversation.name || selectedConversation.phone}</h2>
                <p className="text-xs text-muted-foreground">{selectedConversation.phone}</p>
              </div>
            </header>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-2"
              style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4d4d4\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                backgroundColor: '#efeae2'
              }}
            >
              {msgLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/80 rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <WhatsAppMessageBubble
                      key={msg.id}
                      content={msg.content}
                      senderType={msg.sender_type}
                      status={msg.status}
                      createdAt={msg.created_at}
                      messageType={msg.message_type}
                      mediaUrl={msg.media_url}
                      mediaCaption={msg.media_caption}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <WhatsAppChatInput
              onSendMessage={sendMessage}
              onSendMedia={sendMedia}
              conversationId={selectedConversation.id}
            />
          </>
        )}
      </div>
    </div>
  );
}