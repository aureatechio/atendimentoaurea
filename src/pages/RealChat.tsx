import { useState, useRef, useEffect } from 'react';
import { useRealConversations, useRealMessages, RealConversation } from '@/hooks/useRealConversations';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Search, 
  Settings, 
  RefreshCw, 
  Download,
  MoreVertical,
  ArrowLeft,
  Phone,
  Video,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble';
import { WhatsAppChatInput } from '@/components/chat/WhatsAppChatInput';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RealChat() {
  const { conversations, loading: convLoading, markAsRead, refetch } = useRealConversations();
  const [selectedConversation, setSelectedConversation] = useState<RealConversation | null>(null);
  const { messages, loading: msgLoading, sendMessage, sendMedia } = useRealMessages(selectedConversation?.id || null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
        toast.success(result.message || `Sincronizado!`);
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

  const formatMessageTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: ptBR });
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = (conv.name || conv.phone).toLowerCase();
    const phone = conv.phone.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || phone.includes(query);
  });

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'HOJE';
    if (isYesterday(date)) return 'ONTEM';
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-[hsl(var(--whatsapp-chat-bg))]">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-[400px] lg:w-[420px] bg-[hsl(var(--whatsapp-sidebar))] border-r border-border flex flex-col",
        selectedConversation && "hidden md:flex"
      )}>
        {/* Header */}
        <header className="h-[60px] px-4 flex items-center justify-between bg-[hsl(var(--whatsapp-header))] border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-[hsl(var(--whatsapp-icon))] text-white">
                A
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSync} 
              disabled={syncing}
              className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
              title="Sincronizar conversas"
            >
              {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refetch} 
              className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
              title="Atualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card">
                <DropdownMenuItem asChild>
                  <Link to="/whatsapp" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configurações Z-API
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Search */}
        <div className="px-2 py-2 bg-[hsl(var(--whatsapp-sidebar))]">
          <div className="relative">
            <div className={cn(
              "flex items-center bg-[hsl(var(--whatsapp-panel-bg))] rounded-lg transition-all",
              showSearch && "ring-1 ring-[hsl(var(--whatsapp-teal-dark))]"
            )}>
              <div className="pl-4 pr-2 py-2">
                {showSearch ? (
                  <ArrowLeft 
                    className="h-5 w-5 text-[hsl(var(--whatsapp-teal-dark))] cursor-pointer" 
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  />
                ) : (
                  <Search className="h-5 w-5 text-[hsl(var(--whatsapp-icon))]" />
                )}
              </div>
              <Input 
                placeholder="Pesquisar ou começar uma nova conversa"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                className="border-0 bg-transparent focus-visible:ring-0 text-sm h-[35px] placeholder:text-[hsl(var(--whatsapp-icon))]"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-1"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--whatsapp-icon))]" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[hsl(var(--whatsapp-icon))] px-8">
              {searchQuery ? (
                <>
                  <p className="text-sm text-center">Nenhuma conversa encontrada para "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-center">Nenhuma conversa ainda</p>
                  <p className="text-xs text-center mt-1">Clique em ⬇️ para sincronizar</p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-3 hover:bg-[hsl(var(--whatsapp-hover))] transition-colors',
                  selectedConversation?.id === conv.id && 'bg-[hsl(var(--whatsapp-selected))]'
                )}
              >
                <Avatar className="h-[49px] w-[49px] flex-shrink-0">
                  {conv.avatar_url && <AvatarImage src={conv.avatar_url} />}
                  <AvatarFallback className="bg-[hsl(var(--whatsapp-icon))] text-white text-lg">
                    {(conv.name || conv.phone).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 border-t border-border py-3 -my-2">
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-[17px] text-foreground truncate">
                      {conv.name || conv.phone}
                    </span>
                    <span className={cn(
                      'text-xs flex-shrink-0 ml-2',
                      conv.unread_count > 0 ? 'text-[hsl(var(--whatsapp-unread))]' : 'text-[hsl(var(--whatsapp-time))]'
                    )}>
                      {formatMessageTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-[hsl(var(--whatsapp-time))] truncate flex-1 pr-2">
                      {conv.last_message || 'Sem mensagens'}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="h-[20px] min-w-[20px] px-1.5 text-xs font-normal bg-[hsl(var(--whatsapp-unread))] hover:bg-[hsl(var(--whatsapp-unread))] rounded-full">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedConversation && "hidden md:flex"
      )}>
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[hsl(var(--whatsapp-panel-bg))] border-b-[6px] border-[hsl(var(--whatsapp-teal-dark))]">
            <div className="max-w-[500px] text-center px-8">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 303 172'%3E%3Cpath fill='%2300A884' d='M152.5 0C68.3 0 0 68.3 0 152.5c0 25.3 6.2 49.2 17.1 70.2L0 303l82.4-17.1c20.3 10.5 43.4 16.4 68 16.4 84.2 0 152.5-68.3 152.5-152.5S236.7 0 152.5 0z'/%3E%3C/svg%3E" 
                alt="WhatsApp" 
                className="w-[250px] h-[250px] mx-auto mb-8 opacity-20"
              />
              <h1 className="text-[32px] font-light text-foreground mb-4">WhatsApp Web</h1>
              <p className="text-sm text-[hsl(var(--whatsapp-time))] leading-relaxed">
                Envie e receba mensagens sem precisar manter seu celular online.
                <br />
                Use o WhatsApp em até 4 aparelhos conectados ao mesmo tempo.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="h-[60px] px-4 flex items-center gap-3 bg-[hsl(var(--whatsapp-header))] border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                className="md:hidden h-10 w-10 text-[hsl(var(--whatsapp-icon))]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 cursor-pointer">
                {selectedConversation.avatar_url && (
                  <AvatarImage src={selectedConversation.avatar_url} />
                )}
                <AvatarFallback className="bg-[hsl(var(--whatsapp-icon))] text-white">
                  {(selectedConversation.name || selectedConversation.phone).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 cursor-pointer">
                <h2 className="text-base font-normal text-foreground">
                  {selectedConversation.name || selectedConversation.phone}
                </h2>
                <p className="text-xs text-[hsl(var(--whatsapp-time))]">
                  Clique aqui para informações do contato
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
                >
                  <Video className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))]"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </header>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-[5%] lg:px-[10%] xl:px-[15%] py-4"
              style={{ 
                backgroundColor: 'hsl(var(--whatsapp-chat-bg))',
                backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3Oeli4LAAAAVklEQVQ4y+3RQQ4AIAgEwPH/nzZGxMDGGxmKt+Igc3ItFMgFaAhDCCgEJIKyA6AahgCQIBGQLQDwDyhB5gN4gNR+lGF7AAAAAElFTkSuQmCC")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '300px',
              }}
            >
              {msgLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--whatsapp-icon))]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[hsl(var(--whatsapp-incoming))] rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-sm text-[hsl(var(--whatsapp-time))]">
                      As mensagens são criptografadas de ponta a ponta. Ninguém fora desta conversa, nem mesmo o WhatsApp, pode lê-las ou ouvi-las.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      {/* Date separator */}
                      <div className="flex justify-center my-3">
                        <span className="bg-[hsl(var(--whatsapp-incoming))] text-[hsl(var(--whatsapp-time))] text-[11px] px-3 py-1 rounded-lg shadow-sm uppercase">
                          {formatDateHeader(date)}
                        </span>
                      </div>
                      {/* Messages for this date */}
                      {msgs.map((msg) => (
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
                    </div>
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
