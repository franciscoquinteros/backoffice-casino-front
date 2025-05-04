export interface Message {
  id: string;
  userId: string;
  message: string;
  sender: string;
  agentId: string | null;
  timestamp: string;
  conversationId?: string;
}

export interface ChatData {
  chat_user_id: string;
  chat_agent_id: string | null;
  status?: 'active' | 'pending' | 'archived';
  conversationId?: string;
  officeId?: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
  office: string;
  status: string;
  receivesWithdrawals: boolean;
  withdrawal?: string;
  createdAt: Date;
}

export type ChatTab = 'active' | 'pending' | 'archived';

// Custom type for message end ref to ensure consistency
export type MessageEndRef = { current: HTMLDivElement | null }; 