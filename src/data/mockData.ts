import { User, Contact, Conversation, Message, ConversationStatus } from '@/types/chat';

// Current logged user (mock)
export const currentUser: User = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@empresa.com',
  role: 'admin',
  isOnline: true,
};

// Other agents
export const agents: User[] = [
  currentUser,
  {
    id: 'user-2',
    name: 'Maria Santos',
    email: 'maria@empresa.com',
    role: 'agent',
    isOnline: true,
  },
  {
    id: 'user-3',
    name: 'Pedro Oliveira',
    email: 'pedro@empresa.com',
    role: 'agent',
    isOnline: false,
  },
  {
    id: 'user-4',
    name: 'Ana Costa',
    email: 'ana@empresa.com',
    role: 'agent',
    isOnline: true,
  },
];

// Contacts
export const contacts: Contact[] = [
  { id: 'contact-1', name: 'Carlos Mendes', phone: '+55 11 99999-1234', tags: ['Suporte'] },
  { id: 'contact-2', name: 'Fernanda Lima', phone: '+55 21 98888-5678', tags: ['Vendas'] },
  { id: 'contact-3', name: 'Roberto Alves', phone: '+55 31 97777-9012', tags: ['Financeiro'] },
  { id: 'contact-4', name: 'Juliana Martins', phone: '+55 41 96666-3456', tags: ['Suporte'] },
  { id: 'contact-5', name: 'Lucas Ferreira', phone: '+55 51 95555-7890', tags: ['Vendas'] },
  { id: 'contact-6', name: 'Patrícia Souza', phone: '+55 61 94444-1234', tags: ['Suporte'] },
  { id: 'contact-7', name: 'Marcos Ribeiro', phone: '+55 71 93333-5678', tags: ['Financeiro'] },
  { id: 'contact-8', name: 'Camila Rocha', phone: '+55 81 92222-9012', tags: ['Vendas'] },
  { id: 'contact-9', name: 'Thiago Nunes', phone: '+55 91 91111-3456', tags: ['Suporte'] },
  { id: 'contact-10', name: 'Amanda Dias', phone: '+55 11 90000-7890', tags: ['Vendas'] },
  { id: 'contact-11', name: 'Bruno Gomes', phone: '+55 21 89999-1234', tags: ['Suporte'] },
  { id: 'contact-12', name: 'Carla Pereira', phone: '+55 31 88888-5678', tags: ['Financeiro'] },
];

// Helper to generate random dates
const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60 * 1000);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

// Messages for each conversation
export const messagesByConversation: Record<string, Message[]> = {
  'conv-1': [
    { id: 'msg-1-1', conversationId: 'conv-1', content: 'Olá, preciso de ajuda com meu pedido', type: 'text', isFromClient: true, senderId: 'contact-1', status: 'read', createdAt: minutesAgo(45) },
    { id: 'msg-1-2', conversationId: 'conv-1', content: 'Claro! Qual o número do seu pedido?', type: 'text', isFromClient: false, senderId: 'user-1', status: 'read', createdAt: minutesAgo(44) },
    { id: 'msg-1-3', conversationId: 'conv-1', content: 'É o pedido #45678', type: 'text', isFromClient: true, senderId: 'contact-1', status: 'read', createdAt: minutesAgo(43) },
    { id: 'msg-1-4', conversationId: 'conv-1', content: 'Encontrei aqui. O que gostaria de saber?', type: 'text', isFromClient: false, senderId: 'user-1', status: 'read', createdAt: minutesAgo(42) },
    { id: 'msg-1-5', conversationId: 'conv-1', content: 'Qual a previsão de entrega?', type: 'text', isFromClient: true, senderId: 'contact-1', status: 'read', createdAt: minutesAgo(5) },
  ],
  'conv-2': [
    { id: 'msg-2-1', conversationId: 'conv-2', content: 'Boa tarde! Vi o anúncio de vocês', type: 'text', isFromClient: true, senderId: 'contact-2', status: 'read', createdAt: hoursAgo(2) },
    { id: 'msg-2-2', conversationId: 'conv-2', content: 'Boa tarde! Como posso ajudar?', type: 'text', isFromClient: false, senderId: 'user-2', status: 'read', createdAt: hoursAgo(2) },
    { id: 'msg-2-3', conversationId: 'conv-2', content: 'Quero saber sobre os planos empresariais', type: 'text', isFromClient: true, senderId: 'contact-2', status: 'read', createdAt: hoursAgo(1) },
    { id: 'msg-2-4', conversationId: 'conv-2', content: 'Temos 3 planos disponíveis. Qual o tamanho da sua empresa?', type: 'text', isFromClient: false, senderId: 'user-2', status: 'delivered', createdAt: minutesAgo(30) },
  ],
  'conv-3': [
    { id: 'msg-3-1', conversationId: 'conv-3', content: 'Preciso da segunda via do boleto', type: 'text', isFromClient: true, senderId: 'contact-3', status: 'read', createdAt: hoursAgo(5) },
    { id: 'msg-3-2', conversationId: 'conv-3', content: 'Vou verificar para você. Qual seu CPF?', type: 'text', isFromClient: false, senderId: 'user-1', status: 'read', createdAt: hoursAgo(5) },
    { id: 'msg-3-3', conversationId: 'conv-3', content: '123.456.789-00', type: 'text', isFromClient: true, senderId: 'contact-3', status: 'read', createdAt: hoursAgo(4) },
    { id: 'msg-3-4', conversationId: 'conv-3', content: 'Pronto! Segue o boleto atualizado. O vencimento é dia 15/01.', type: 'text', isFromClient: false, senderId: 'user-1', status: 'read', createdAt: hoursAgo(4) },
    { id: 'msg-3-5', conversationId: 'conv-3', content: 'Muito obrigado! Já efetuei o pagamento.', type: 'text', isFromClient: true, senderId: 'contact-3', status: 'read', createdAt: hoursAgo(3) },
  ],
  'conv-4': [
    { id: 'msg-4-1', conversationId: 'conv-4', content: 'O sistema está dando erro', type: 'text', isFromClient: true, senderId: 'contact-4', status: 'delivered', createdAt: minutesAgo(2) },
  ],
  'conv-5': [
    { id: 'msg-5-1', conversationId: 'conv-5', content: 'Olá, gostaria de fazer um orçamento', type: 'text', isFromClient: true, senderId: 'contact-5', status: 'read', createdAt: hoursAgo(6) },
    { id: 'msg-5-2', conversationId: 'conv-5', content: 'Claro! O que você precisa?', type: 'text', isFromClient: false, senderId: 'user-4', status: 'read', createdAt: hoursAgo(6) },
    { id: 'msg-5-3', conversationId: 'conv-5', content: '50 camisetas personalizadas', type: 'text', isFromClient: true, senderId: 'contact-5', status: 'read', createdAt: hoursAgo(5) },
  ],
  'conv-6': [
    { id: 'msg-6-1', conversationId: 'conv-6', content: 'Não consigo acessar minha conta', type: 'text', isFromClient: true, senderId: 'contact-6', status: 'delivered', createdAt: minutesAgo(10) },
    { id: 'msg-6-2', conversationId: 'conv-6', content: 'Aparece alguma mensagem de erro?', type: 'text', isFromClient: false, senderId: 'user-2', status: 'delivered', createdAt: minutesAgo(8) },
  ],
  'conv-7': [
    { id: 'msg-7-1', conversationId: 'conv-7', content: 'Preciso alterar a data de vencimento', type: 'text', isFromClient: true, senderId: 'contact-7', status: 'read', createdAt: hoursAgo(24) },
    { id: 'msg-7-2', conversationId: 'conv-7', content: 'Para qual data você gostaria?', type: 'text', isFromClient: false, senderId: 'user-1', status: 'read', createdAt: hoursAgo(24) },
    { id: 'msg-7-3', conversationId: 'conv-7', content: 'Dia 20 de cada mês', type: 'text', isFromClient: true, senderId: 'contact-7', status: 'read', createdAt: hoursAgo(23) },
    { id: 'msg-7-4', conversationId: 'conv-7', content: 'Pronto, alterado com sucesso!', type: 'text', isFromClient: false, senderId: 'user-1', status: 'read', createdAt: hoursAgo(23) },
  ],
  'conv-8': [
    { id: 'msg-8-1', conversationId: 'conv-8', content: 'Vocês fazem entrega para o interior?', type: 'text', isFromClient: true, senderId: 'contact-8', status: 'delivered', createdAt: minutesAgo(1) },
  ],
  'conv-9': [
    { id: 'msg-9-1', conversationId: 'conv-9', content: 'Meu produto chegou com defeito', type: 'text', isFromClient: true, senderId: 'contact-9', status: 'read', createdAt: hoursAgo(3) },
    { id: 'msg-9-2', conversationId: 'conv-9', content: 'Lamento muito! Pode enviar uma foto?', type: 'text', isFromClient: false, senderId: 'user-2', status: 'read', createdAt: hoursAgo(3) },
    { id: 'msg-9-3', conversationId: 'conv-9', content: 'Segue a foto do defeito', type: 'text', isFromClient: true, senderId: 'contact-9', status: 'read', createdAt: hoursAgo(2) },
    { id: 'msg-9-4', conversationId: 'conv-9', content: 'Vou solicitar a troca para você. Em 3 dias úteis chega o novo.', type: 'text', isFromClient: false, senderId: 'user-2', status: 'delivered', createdAt: hoursAgo(2) },
  ],
  'conv-10': [
    { id: 'msg-10-1', conversationId: 'conv-10', content: 'Quero cancelar minha assinatura', type: 'text', isFromClient: true, senderId: 'contact-10', status: 'delivered', createdAt: minutesAgo(15) },
  ],
  'conv-11': [
    { id: 'msg-11-1', conversationId: 'conv-11', content: 'Como faço para atualizar meus dados?', type: 'text', isFromClient: true, senderId: 'contact-11', status: 'delivered', createdAt: minutesAgo(25) },
  ],
  'conv-12': [
    { id: 'msg-12-1', conversationId: 'conv-12', content: 'Vocês aceitam PIX?', type: 'text', isFromClient: true, senderId: 'contact-12', status: 'read', createdAt: hoursAgo(8) },
    { id: 'msg-12-2', conversationId: 'conv-12', content: 'Sim! Aceitamos PIX, cartão e boleto.', type: 'text', isFromClient: false, senderId: 'user-3', status: 'read', createdAt: hoursAgo(8) },
    { id: 'msg-12-3', conversationId: 'conv-12', content: 'Ótimo! Vou pagar por PIX então.', type: 'text', isFromClient: true, senderId: 'contact-12', status: 'read', createdAt: hoursAgo(7) },
  ],
};

// Create conversations with last messages
export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    contact: contacts[0],
    status: 'active',
    assignedTo: currentUser,
    lastMessage: messagesByConversation['conv-1'][4],
    unreadCount: 1,
    tags: ['Suporte'],
    createdAt: hoursAgo(1),
    updatedAt: minutesAgo(5),
  },
  {
    id: 'conv-2',
    contact: contacts[1],
    status: 'active',
    assignedTo: agents[1],
    lastMessage: messagesByConversation['conv-2'][3],
    unreadCount: 0,
    tags: ['Vendas'],
    createdAt: hoursAgo(2),
    updatedAt: minutesAgo(30),
  },
  {
    id: 'conv-3',
    contact: contacts[2],
    status: 'resolved',
    assignedTo: currentUser,
    lastMessage: messagesByConversation['conv-3'][4],
    unreadCount: 0,
    tags: ['Financeiro'],
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(3),
  },
  {
    id: 'conv-4',
    contact: contacts[3],
    status: 'new',
    unreadCount: 1,
    tags: ['Suporte'],
    createdAt: minutesAgo(2),
    updatedAt: minutesAgo(2),
    lastMessage: messagesByConversation['conv-4'][0],
  },
  {
    id: 'conv-5',
    contact: contacts[4],
    status: 'active',
    assignedTo: agents[3],
    lastMessage: messagesByConversation['conv-5'][2],
    unreadCount: 0,
    tags: ['Vendas'],
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(5),
  },
  {
    id: 'conv-6',
    contact: contacts[5],
    status: 'active',
    assignedTo: agents[1],
    lastMessage: messagesByConversation['conv-6'][1],
    unreadCount: 0,
    tags: ['Suporte'],
    createdAt: minutesAgo(10),
    updatedAt: minutesAgo(8),
  },
  {
    id: 'conv-7',
    contact: contacts[6],
    status: 'resolved',
    assignedTo: currentUser,
    lastMessage: messagesByConversation['conv-7'][3],
    unreadCount: 0,
    tags: ['Financeiro'],
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(23),
  },
  {
    id: 'conv-8',
    contact: contacts[7],
    status: 'new',
    unreadCount: 1,
    tags: ['Vendas'],
    createdAt: minutesAgo(1),
    updatedAt: minutesAgo(1),
    lastMessage: messagesByConversation['conv-8'][0],
  },
  {
    id: 'conv-9',
    contact: contacts[8],
    status: 'active',
    assignedTo: agents[1],
    lastMessage: messagesByConversation['conv-9'][3],
    unreadCount: 0,
    tags: ['Suporte'],
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'conv-10',
    contact: contacts[9],
    status: 'new',
    unreadCount: 1,
    tags: ['Vendas'],
    createdAt: minutesAgo(15),
    updatedAt: minutesAgo(15),
    lastMessage: messagesByConversation['conv-10'][0],
  },
  {
    id: 'conv-11',
    contact: contacts[10],
    status: 'new',
    unreadCount: 1,
    tags: ['Suporte'],
    createdAt: minutesAgo(25),
    updatedAt: minutesAgo(25),
    lastMessage: messagesByConversation['conv-11'][0],
  },
  {
    id: 'conv-12',
    contact: contacts[11],
    status: 'resolved',
    assignedTo: agents[2],
    lastMessage: messagesByConversation['conv-12'][2],
    unreadCount: 0,
    tags: ['Financeiro'],
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(7),
  },
];

export const availableTags = ['Suporte', 'Vendas', 'Financeiro', 'Urgente', 'VIP'];
