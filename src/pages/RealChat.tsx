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
  const {
    messages,
    loading: msgLoading,
    error: msgError,
    sendMessage,
    sendMedia,
    refetch: refetchMessages,
  } = useRealMessages(selectedConversation?.id || null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSelectConversation = (conv: RealConversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      markAsRead(conv.id);
    }
  };

  // Auto-seleciona a primeira conversa (evita estado "parece que sumiu")
  useEffect(() => {
    if (!selectedConversation && conversations.length > 0 && !convLoading) {
      handleSelectConversation(conversations[0]);
    }
  }, [conversations, convLoading, selectedConversation]);

  // Garante refetch ao trocar de conversa (evita ficar preso no skeleton)
  useEffect(() => {
    if (selectedConversation?.id) {
      refetchMessages();
    }
  }, [selectedConversation?.id, refetchMessages]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        'https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-sync',
        { headers: { 'Content-Type': 'application/json' } }
      );
      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Sincronizado!');
        refetch();
      } else {
        toast.error(result.error || 'Erro ao sincronizar');
      }
    } catch {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
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
      return format(date, 'EEE', { locale: ptBR });
    } else {
      return format(date, 'dd/MM/yy');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = (conv.name || conv.phone).toLowerCase();
    const phone = conv.phone.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || phone.includes(query);
  });

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

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  return (
    <div className="flex h-screen bg-[#0b141a]">
      {/* Left Panel - Conversations */}
      <div className={cn(
        "w-full md:w-[400px] lg:w-[420px] flex flex-col bg-[#111b21] border-r border-[#222d34]",
        selectedConversation && "hidden md:flex"
      )}>
        {/* Header */}
        <header className="h-[59px] px-4 flex items-center justify-between bg-[#202c33]">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-[#6a7175] text-white text-sm">A</AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSync} 
              disabled={syncing}
              className="h-10 w-10 rounded-full text-[#aebac1] hover:bg-[#374045] hover:text-[#e9edef]"
            >
              {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refetch} 
              className="h-10 w-10 rounded-full text-[#aebac1] hover:bg-[#374045] hover:text-[#e9edef]"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-full text-[#aebac1] hover:bg-[#374045] hover:text-[#e9edef]"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-[#233138] border-none shadow-xl">
                <DropdownMenuItem asChild className="text-[#d1d7db] hover:bg-[#182229] focus:bg-[#182229] cursor-pointer py-2.5">
                  <Link to="/whatsapp" className="flex items-center">
                    <Settings className="h-4 w-4 mr-3" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Search */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className={cn(
            "flex items-center rounded-lg bg-[#202c33] transition-colors",
            showSearch && "bg-[#2a3942]"
          )}>
            <div className="pl-4 pr-3 py-2">
              {showSearch ? (
                <ArrowLeft 
                  className="h-5 w-5 text-[#00a884] cursor-pointer" 
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                />
              ) : (
                <Search className="h-5 w-5 text-[#8696a0]" />
              )}
            </div>
            <Input 
              ref={searchInputRef}
              placeholder="Pesquisar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="border-0 bg-transparent h-[35px] text-[#d1d7db] placeholder:text-[#8696a0] focus-visible:ring-0 text-sm"
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 mr-2 text-[#8696a0] hover:bg-transparent"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  'w-full flex items-center px-3 py-3 hover:bg-[#202c33] transition-colors',
                  selectedConversation?.id === conv.id && 'bg-[#2a3942]'
                )}
              >
                <Avatar className="h-[49px] w-[49px] mr-3 flex-shrink-0">
                  {conv.avatar_url && <AvatarImage src={conv.avatar_url} />}
                  <AvatarFallback className="bg-[#6a7175] text-white text-lg">
                    {(conv.name || conv.phone).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 border-b border-[#222d34] pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[17px] text-[#e9edef] truncate">
                      {conv.name || conv.phone}
                    </span>
                    <span className={cn(
                      'text-xs ml-2 flex-shrink-0',
                      conv.unread_count > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'
                    )}>
                      {formatMessageTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-[#8696a0] truncate pr-2">
                      {conv.last_message || 'Nenhuma mensagem'}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5 text-xs font-medium bg-[#00a884] hover:bg-[#00a884] text-[#111b21] rounded-full">
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

      {/* Right Panel - Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#0b141a]",
        !selectedConversation && "hidden md:flex"
      )}>
        {!selectedConversation ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] border-b-[6px] border-[#00a884]">
            <div className="max-w-md text-center px-8">
              <div className="w-[320px] h-[188px] mx-auto mb-10 flex items-center justify-center">
                <svg viewBox="0 0 303 172" className="w-full h-full">
                  <path fill="#364147" d="M229.565 160.229c32.647-12.996 50.715-42.904 48.166-76.399C273.094 26.378 211.535-4.974 153.696.746 99.453 6.108 46.761 37.923 29.25 86.379 8.925 143.265 44.485 182.148 97.58 192.26c31.127 5.929 106.869-1.266 131.985-32.031z"/>
                  <path fill="#DCE4E6" d="M142.592 41.405c-13.256 0-24.025 10.77-24.025 24.025V111.3c0 13.255 10.77 24.025 24.025 24.025H212.3c13.256 0 24.025-10.77 24.025-24.025V65.43c0-13.255-10.77-24.025-24.025-24.025h-69.708z"/>
                  <path fill="#00A884" d="M101.396 70.758c0-6.62 5.367-11.988 11.988-11.988h76.684c6.621 0 11.988 5.368 11.988 11.988V131.2c0 6.62-5.367 11.988-11.988 11.988h-76.684c-6.621 0-11.988-5.368-11.988-11.988V70.758z"/>
                  <path fill="#fff" fillOpacity=".4" d="M144.8 96.5l-23.1 13.5v-27z"/>
                </svg>
              </div>
              <h1 className="text-[32px] font-light text-[#d1d7db] mb-4">Selecione uma conversa</h1>
              <p className="text-sm text-[#8696a0] leading-6">
                As mensagens não sumiram — escolha um contato na lista à esquerda para carregar o histórico.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="h-[59px] px-4 flex items-center gap-3 bg-[#202c33]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                className="md:hidden h-10 w-10 rounded-full text-[#aebac1] hover:bg-[#374045]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="h-10 w-10">
                {selectedConversation.avatar_url && (
                  <AvatarImage src={selectedConversation.avatar_url} />
                )}
                <AvatarFallback className="bg-[#6a7175] text-white">
                  {(selectedConversation.name || selectedConversation.phone).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] text-[#e9edef] truncate">
                  {selectedConversation.name || selectedConversation.phone}
                </h2>
                <p className="text-[13px] text-[#8696a0] truncate">
                  {selectedConversation.phone}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full text-[#aebac1] hover:bg-[#374045] hover:text-[#e9edef]"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-[#233138] border-none shadow-xl">
                    <DropdownMenuItem asChild className="text-[#d1d7db] hover:bg-[#182229] focus:bg-[#182229] cursor-pointer py-2.5">
                      <Link to="/whatsapp" className="flex items-center">
                        <Settings className="h-4 w-4 mr-3" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Messages Area */}
            <div
              key={selectedConversation.id}
              className="flex-1 overflow-y-auto px-[5%] lg:px-[8%] xl:px-[12%] py-4 scrollbar-thin chat-pattern"
            >
              {msgLoading ? (
                <MessageListSkeleton />
              ) : msgError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[#182229] rounded-lg px-4 py-3 shadow-sm text-center">
                    <p className="text-[12.5px] text-[#d1d7db]">{msgError}</p>
                    <Button
                      variant="ghost"
                      className="mt-2 text-[#00a884] hover:bg-[#202c33]"
                      onClick={refetchMessages}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[#182229] rounded-lg px-4 py-2 shadow-sm">
                    <span className="text-[12.5px] text-[#8696a0]">
                      🔒 As mensagens são protegidas com a criptografia de ponta a ponta.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="flex justify-center my-3">
                        <span className="bg-[#182229] text-[#8696a0] text-[12.5px] px-3 py-1.5 rounded-lg shadow-sm uppercase">
                          {formatDateHeader(date)}
                        </span>
                      </div>
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
                          animationDelay={index * 20}
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
