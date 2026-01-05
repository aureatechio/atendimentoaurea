export type ConversationStatus = 'new' | 'active' | 'resolved';

export type UserRole = 'admin' | 'agent';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export type MessageType = 'text' | 'image' | 'audio' | 'document';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isOnline: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  tags: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  isFromClient: boolean;
  senderId: string;
  status: MessageStatus;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  contact: Contact;
  status: ConversationStatus;
  assignedTo?: User;
  lastMessage?: Message;
  unreadCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationAssignment {
  id: string;
  conversationId: string;
  agentId: string;
  assignedAt: Date;
  releasedAt?: Date;
  action: 'assigned' | 'transferred' | 'released';
}

export type ConversationFilter = 'all' | 'new' | 'active' | 'resolved';
