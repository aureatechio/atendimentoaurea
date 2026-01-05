import { ConversationsSidebar } from '@/components/chat/ConversationsSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { ControlPanel } from '@/components/chat/ControlPanel';
import { useChatStore } from '@/stores/chatStore';

export function ChatLayout() {
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Conversations List */}
      <aside className="w-[380px] min-w-[320px] max-w-[420px] flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <ConversationsSidebar />
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-chat-bg">
        <ChatArea />
      </main>

      {/* Right Panel - Control */}
      {selectedConversationId && (
        <aside className="w-[320px] min-w-[280px] max-w-[360px] flex-shrink-0 border-l border-border bg-card flex flex-col animate-slide-in-right">
          <ControlPanel />
        </aside>
      )}
    </div>
  );
}
