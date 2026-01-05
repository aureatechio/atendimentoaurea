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
import { ConversationListSkeleton } from '@/components/chat/ConversationSkeleton';
import { MessageListSkeleton } from '@/components/chat/MessageSkeleton';
import { EmptyState } from '@/components/chat/EmptyState';
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
            <Avatar className="h-10 w-10 transition-transform hover:scale-105 cursor-pointer">
              <AvatarFallback className="bg-[hsl(var(--whatsapp-icon))] text-primary-foreground">
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
              className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
              title="Sincronizar conversas"
            >
              {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refetch} 
              className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
              title="Atualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card animate-scale-in">
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-[hsl(var(--whatsapp-hover))]">
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
              "flex items-center bg-[hsl(var(--whatsapp-panel-bg))] rounded-lg transition-all duration-200",
              showSearch && "ring-2 ring-[hsl(var(--whatsapp-teal-dark))] bg-card"
            )}>
              <div className="pl-4 pr-2 py-2">
                {showSearch ? (
                  <ArrowLeft 
                    className="h-5 w-5 text-[hsl(var(--whatsapp-teal-dark))] cursor-pointer hover:scale-110 transition-transform" 
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
                  className="h-8 w-8 mr-1 hover:bg-[hsl(var(--whatsapp-hover))] transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {convLoading ? (
            <ConversationListSkeleton />
          ) : filteredConversations.length === 0 ? (
            <EmptyState 
              type={searchQuery ? 'no-results' : 'no-conversations'} 
              searchQuery={searchQuery}
            />
          ) : (
            filteredConversations.map((conv, index) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-3 transition-all duration-150 hover:bg-[hsl(var(--whatsapp-hover))] active:bg-[hsl(var(--whatsapp-selected))]',
                  selectedConversation?.id === conv.id && 'bg-[hsl(var(--whatsapp-selected))]',
                  'animate-fade-in'
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <Avatar className="h-[49px] w-[49px] flex-shrink-0 transition-transform hover:scale-105">
                  {conv.avatar_url && <AvatarImage src={conv.avatar_url} className="object-cover" />}
                  <AvatarFallback className="bg-[hsl(var(--whatsapp-icon))] text-primary-foreground text-lg">
                    {(conv.name || conv.phone).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 border-t border-border py-3 -my-2">
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-[17px] text-foreground truncate">
                      {conv.name || conv.phone}
                    </span>
                    <span className={cn(
                      'text-xs flex-shrink-0 ml-2 transition-colors',
                      conv.unread_count > 0 ? 'text-[hsl(var(--whatsapp-unread))] font-medium' : 'text-[hsl(var(--whatsapp-time))]'
                    )}>
                      {formatMessageTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-[hsl(var(--whatsapp-time))] truncate flex-1 pr-2">
                      {conv.last_message || 'Sem mensagens'}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="h-[20px] min-w-[20px] px-1.5 text-xs font-medium bg-[hsl(var(--whatsapp-unread))] hover:bg-[hsl(var(--whatsapp-unread))] text-primary-foreground rounded-full animate-bounce-in">
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
            <div className="max-w-[500px] text-center px-8 animate-fade-in-up">
              <div className="w-[220px] h-[220px] mx-auto mb-8 rounded-full bg-[hsl(var(--whatsapp-teal-dark))]/10 flex items-center justify-center">
                <svg className="w-32 h-32 text-[hsl(var(--whatsapp-teal-dark))]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
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
                className="md:hidden h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] transition-colors active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 cursor-pointer transition-transform hover:scale-105">
                {selectedConversation.avatar_url && (
                  <AvatarImage src={selectedConversation.avatar_url} className="object-cover" />
                )}
                <AvatarFallback className="bg-[hsl(var(--whatsapp-icon))] text-primary-foreground">
                  {(selectedConversation.name || selectedConversation.phone).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 cursor-pointer group">
                <h2 className="text-base font-normal text-foreground group-hover:text-[hsl(var(--whatsapp-teal-dark))] transition-colors">
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
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
                >
                  <Video className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </header>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-[5%] lg:px-[10%] xl:px-[15%] py-4 scrollbar-thin"
              style={{ 
                backgroundColor: 'hsl(var(--whatsapp-chat-bg))',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {msgLoading ? (
                <MessageListSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full animate-fade-in">
                  <div className="bg-[hsl(var(--whatsapp-incoming))]/90 backdrop-blur-sm rounded-lg px-6 py-4 shadow-sm max-w-md text-center">
                    <span className="text-xl mb-2 block">🔒</span>
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
                        <span className="bg-[hsl(var(--whatsapp-incoming))]/90 backdrop-blur-sm text-[hsl(var(--whatsapp-time))] text-[11px] px-3 py-1.5 rounded-lg shadow-sm uppercase font-medium">
                          {formatDateHeader(date)}
                        </span>
                      </div>
                      {/* Messages for this date */}
                      {msgs.map((msg, index) => (
                        <WhatsAppMessageBubble
                          key={msg.id}
                          content={msg.content}
                          senderType={msg.sender_type}
                          status={msg.status}
                          createdAt={msg.created_at}
                          messageType={msg.message_type}
                          mediaUrl={msg.media_url}
                          mediaCaption={msg.media_caption}
                          animationDelay={index * 50}
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
