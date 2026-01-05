import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { initAudioContext } from '@/lib/notificationSound';

const clientMessages = [
  'Olá, preciso de ajuda!',
  'Quanto custa?',
  'Vocês entregam para minha região?',
  'Pode me enviar mais informações?',
  'Quando vai chegar meu pedido?',
  'Obrigado pela ajuda!',
  'Estou com um problema aqui...',
  'Posso pagar no PIX?',
  'Qual o prazo de entrega?',
  'Ainda estão aí?',
  'Preciso falar com alguém urgente',
  'Meu produto chegou errado',
];

export function useMessageSimulation(enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversations = useChatStore((state) => state.conversations);
  const receiveMessage = useChatStore((state) => state.receiveMessage);
  
  const simulateIncomingMessage = useCallback(() => {
    // Pick a random conversation
    const activeConversations = conversations.filter(c => c.status !== 'resolved');
    if (activeConversations.length === 0) return;
    
    const randomConversation = activeConversations[Math.floor(Math.random() * activeConversations.length)];
    const randomMessage = clientMessages[Math.floor(Math.random() * clientMessages.length)];
    
    console.log(`📨 Simulating message from ${randomConversation.contact.name}: "${randomMessage}"`);
    receiveMessage(randomConversation.id, randomMessage);
  }, [conversations, receiveMessage]);
  
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    // Initialize audio context on mount (requires user interaction first)
    const handleFirstInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    
    // Start simulation - random message every 10-20 seconds
    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 10000; // 10-20 seconds
      intervalRef.current = setTimeout(() => {
        simulateIncomingMessage();
        scheduleNext();
      }, delay);
    };
    
    // First message after 5 seconds
    intervalRef.current = setTimeout(() => {
      simulateIncomingMessage();
      scheduleNext();
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [enabled, simulateIncomingMessage]);
}
