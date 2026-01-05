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
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { WhatsAppMessageBubble } from '@/components/chat/WhatsAppMessageBubble';
import { WhatsAppChatInput } from '@/components/chat/WhatsAppChatInput';
import { ConversationListSkeleton } from '@/components/chat/ConversationSkeleton';
import { MessageListSkeleton } from '@/components/chat/MessageSkeleton';
import { EmptyState } from '@/components/chat/EmptyState';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function RealChat() {
  const { conversations, loading: convLoading, markAsRead, refetch } = useRealConversations();
  const [selectedConversation, setSelectedConversation] = useState<RealConversation | null>(null);
  const { messages, loading: msgLoading, sendMessage, sendMedia } = useRealMessages(selectedConversation?.id || null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        'https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-sync',
        { headers: { 'Content-Type': 'application/json' } }
      );
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || `Sincronizado com sucesso!`, {
          description: 'Suas conversas foram atualizadas'
        });
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

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Offline';
    const date = new Date(dateString);
    return `Visto por último ${formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}`;
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

  // Get total unread count
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-[hsl(var(--whatsapp-chat-bg))]">
        {/* Sidebar */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] bg-[hsl(var(--whatsapp-sidebar))] border-r border-border/50 flex flex-col",
          selectedConversation && "hidden md:flex"
        )}>
          {/* Header */}
          <header className="h-16 px-4 flex items-center justify-between bg-[hsl(var(--whatsapp-header))] border-b border-border/30">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary/30">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  A
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <h1 className="text-sm font-medium text-foreground">Atendimento</h1>
                <p className="text-xs text-muted-foreground">
                  {totalUnread > 0 ? `${totalUnread} não lidas` : 'Todas as conversas lidas'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSync} 
                    disabled={syncing}
                    className="h-10 w-10 rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
                  >
                    {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Sincronizar conversas</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={refetch} 
                    className="h-10 w-10 rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 active:scale-95"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Atualizar</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 animate-scale-in">
                  <DropdownMenuItem asChild className="cursor-pointer py-3">
                    <Link to="/whatsapp" className="flex items-center">
                      <Settings className="h-4 w-4 mr-3" />
                      Configurações Z-API
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Search */}
          <div className="px-3 py-2 bg-[hsl(var(--whatsapp-sidebar))]">
            <div className="relative">
              <div className={cn(
                "flex items-center bg-[hsl(var(--whatsapp-panel-bg))] rounded-lg transition-all duration-200",
                showSearch && "ring-2 ring-primary/30 bg-background"
              )}>
                <div className="pl-4 pr-2 py-2.5">
                  {showSearch ? (
                    <ArrowLeft 
                      className="h-5 w-5 text-primary cursor-pointer hover:scale-110 transition-transform" 
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
                  ref={searchInputRef}
                  placeholder="Pesquisar ou começar uma nova conversa"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  className="border-0 bg-transparent focus-visible:ring-0 text-sm h-[42px] placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 mr-2 rounded-full hover:bg-[hsl(var(--whatsapp-hover))] transition-colors"
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
                    'w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 hover:bg-[hsl(var(--whatsapp-hover))] active:bg-[hsl(var(--whatsapp-selected))] group',
                    selectedConversation?.id === conv.id && 'bg-[hsl(var(--whatsapp-selected))]',
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12 transition-transform group-hover:scale-105">
                      {conv.avatar_url && <AvatarImage src={conv.avatar_url} className="object-cover" />}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-medium">
                        {(conv.name || conv.phone).slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 border-b border-border/30 pb-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[15px] text-foreground truncate">
                        {conv.name || conv.phone}
                      </span>
                      <span className={cn(
                        'text-xs flex-shrink-0 tabular-nums transition-colors',
                        conv.unread_count > 0 ? 'text-[hsl(var(--whatsapp-unread))] font-medium' : 'text-muted-foreground'
                      )}>
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message || 'Nenhuma mensagem'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-xs font-medium bg-[hsl(var(--whatsapp-unread))] hover:bg-[hsl(var(--whatsapp-unread))] text-white rounded-full animate-bounce-in flex items-center justify-center">
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
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
            <div className="flex-1 flex flex-col items-center justify-center bg-[hsl(var(--whatsapp-panel-bg))] border-b-[6px] border-primary">
              <div className="max-w-[500px] text-center px-8 animate-fade-in-up">
                <div className="w-56 h-56 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-28 h-28 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <h1 className="text-3xl font-light text-foreground mb-4">Central de Atendimento</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Gerencie suas conversas do WhatsApp de forma profissional.
                  <br />
                  Selecione uma conversa para começar o atendimento.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <header className="h-16 px-4 flex items-center gap-3 bg-[hsl(var(--whatsapp-header))] border-b border-border/30 elevation-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden h-10 w-10 rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] transition-colors active:scale-95"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                {/* Contact Avatar */}
                <div className="relative">
                  <Avatar className="h-10 w-10 cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary/30">
                    {selectedConversation.avatar_url && (
                      <AvatarImage src={selectedConversation.avatar_url} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium">
                      {(selectedConversation.name || selectedConversation.phone).slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Contact Info */}
                <div className="flex-1 cursor-pointer group min-w-0">
                  <h2 className="text-base font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {selectedConversation.name || selectedConversation.phone}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedConversation.phone}
                  </p>
                </div>
                
                {/* Header Actions */}
                <div className="flex items-center gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 animate-scale-in">
                      <DropdownMenuItem asChild className="cursor-pointer py-3">
                        <Link to="/whatsapp" className="flex items-center">
                          <Settings className="h-4 w-4 mr-3" />
                          Configurações Z-API
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-[5%] lg:px-[10%] xl:px-[15%] py-4 scrollbar-thin chat-pattern"
              >
                {msgLoading ? (
                  <MessageListSkeleton />
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full animate-fade-in">
                    <div className="bg-background/95 backdrop-blur-sm rounded-lg px-6 py-4 elevation-1 max-w-md text-center">
                      <span className="text-2xl mb-2 block">🔒</span>
                      <p className="text-sm text-muted-foreground">
                        As mensagens são criptografadas de ponta a ponta. Ninguém fora desta conversa pode lê-las.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date}>
                        {/* Date separator */}
                        <div className="flex justify-center my-4">
                          <span className="bg-background/95 backdrop-blur-sm text-muted-foreground text-[11px] px-4 py-1.5 rounded-lg elevation-1 uppercase font-medium tracking-wide">
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
                            animationDelay={index * 30}
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
    </TooltipProvider>
  );
}
