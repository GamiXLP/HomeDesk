export type Role = 'admin' | 'user';
export type TicketStatus = 'new' | 'seen' | 'planned' | 'in_progress' | 'waiting_feedback' | 'waiting_parts' | 'tested' | 'done' | 'rejected' | 'archived';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type CommentVisibility = 'public' | 'internal';

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  avatar_url?: string | null;
  created_at: string;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: string;
  category: string;
  area: string;
  device?: string | null;
  entity_id?: string | null;
  desired_date?: string | null;
  created_by: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  archived_at?: string | null;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  visibility: CommentVisibility;
  created_at: string;
  updated_at?: string | null;
  profiles?: Pick<Profile, 'display_name' | 'role'> | null;
};
