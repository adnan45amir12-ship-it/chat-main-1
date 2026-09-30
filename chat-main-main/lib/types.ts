export type Gender = 'Male' | 'Female';
export type AvatarType = 'male' | 'female';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  gender: Gender;
  avatarType: AvatarType;
  createdAt: number;
  updatedAt: number;
  lastSeen: number;
  online: boolean;
  role?: 'admin' | 'user';
  banned: boolean;
  disabled: boolean;
  mistakeCount?: number;
  banReason?: string;
  blockedUsers?: Record<string, boolean>;
}

export interface DriveLink {
  url: string;
  fileId?: string;
  type?: 'document' | 'spreadsheet' | 'presentation' | 'folder' | 'file';
  title?: string;
}

export interface MessageReply {
  id: string;
  senderName: string;
  text: string;
}

export interface Message {
  id: string;
  clientMessageId?: string;
  senderId: string;
  senderUid?: string;
  senderName: string;
  senderGender?: Gender | string;
  senderAvatarType?: AvatarType;
  text: string;
  type: string;
  deleted?: boolean;
  deletedFor?: Record<string, boolean>;
  createdAt: number;
  timestamp?: number;
  replyTo?: MessageReply;
  driveLinks?: DriveLink[];
  isAi?: boolean;
  aiTargetUser?: string;
  reported?: boolean;
  pending?: boolean;
}

export interface PendingMessage {
  clientMessageId: string;
  chatId: string;
  senderUid: string;
  receiverUid: string;
  text: string;
  type: string;
  replyTo?: MessageReply | null;
  driveLinks?: DriveLink[] | null;
  createdAt: number;
}

export interface PrivateChatParticipant {
  uid: string;
  name: string;
  gender?: Gender;
  avatarType?: AvatarType;
  lastSeen?: number;
  online?: boolean;
}

export interface PrivateChatMetadata {
  chatId: string;
  participants: Record<string, boolean>;
  deletedFor?: Record<string, number | boolean>;
  participantDetails?: Record<string, { name: string; gender?: Gender }>;
  lastMessage?: {
    text: string;
    senderUid: string;
    senderName: string;
    timestamp: number;
  };
  updatedAt: number;
}

export interface ReportItem {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: 'message' | 'user';
  messageId?: string;
  messageText?: string;
  reportedUid?: string;
  reportedName?: string;
  reason: string;
  context: 'main_group' | 'private_chat';
  timestamp: number;
  status: 'pending' | 'resolved' | 'dismissed';
  notes?: string;
}

export interface AISettings {
  status: boolean;
  name: string;
  model: string;
  language: string;
  groupAi: boolean;
  personalAi: boolean;
  groupResponseMode: 'every' | 'mention' | 'question';
  systemInstructions: string;
  agentModeEnabled?: boolean;
}

export type PredefinedTaskType =
  | 'create_task'
  | 'list_tasks'
  | 'complete_task'
  | 'create_poll'
  | 'award_karma'
  | 'record_log'
  | 'community_stats'
  | 'custom_action';

export interface CustomBot {
  id: string;
  name: string;
  avatarIcon?: string; // 'bot' | 'clipboard-list' | 'bar-chart' | 'award' | 'shield' | 'code' | 'zap' | 'bell'
  triggerWords: string[]; // e.g. ['!task', '#addtask', '#todo']
  description: string;
  systemPrompt?: string;
  actionType: PredefinedTaskType;
  enabled: boolean;
  createdBy?: string;
  createdAt?: number;
}

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigneeName?: string;
  assigneeUid?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
  completedAt?: number;
  botId?: string;
}

export interface CommunityPoll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  voters?: Record<string, string>; // uid -> optionId
  createdByName: string;
  createdByUid: string;
  createdAt: number;
  status: 'active' | 'closed';
}

export interface KarmaRecord {
  uid: string;
  userName: string;
  points: number;
  lastAwardedBy?: string;
  lastReason?: string;
  updatedAt: number;
}

export interface CommunitySettings {
  communityName: string;
  welcomeMessage: string;
  rules: string;
  status: 'active' | 'maintenance';
}

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
