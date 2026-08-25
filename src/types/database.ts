export type Role = 'admin' | 'user';
export type TicketStatus =
  | 'new'
  | 'seen'
  | 'planned'
  | 'in_progress'
  | 'waiting_feedback'
  | 'waiting_parts'
  | 'tested'
  | 'done'
  | 'rejected'
  | 'archived';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type CommentVisibility = 'public' | 'internal';
export type TicketRelationType = 'relates_to' | 'blocks' | 'duplicates' | 'caused_by';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  avatar_url?: string | null;
  email_notifications_enabled: boolean;
  created_at: string;
};

export type Ticket = {
  id: string;
  /** 8-stellige, menschenlesbare Ticketnummer. Optional bis Migration 003 ausgeführt wurde. */
  ticket_number?: number | null;
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
  due_at?: string | null;
  solution_summary?: string | null;
  root_cause?: string | null;
  resolution_steps?: string | null;
  escalation_level?: number;
  escalated_at?: string | null;
  created_by: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  archived_at?: string | null;
  asset_id?: string | null;
  tags?: string[];
  approval_required?: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  reopened_count?: number;
  response_due_at?: string | null;
  first_response_at?: string | null;
};

export type Asset = {
  id: string; name: string; manufacturer?: string | null; model?: string | null;
  serial_number?: string | null; purchase_date?: string | null; warranty_until?: string | null;
  area: string; category: string; notes?: string | null; image_url?: string | null;
  health_override?: number | null; created_by: string; created_at: string; updated_at: string;
};
export type AssetEntity = { id: string; asset_id: string; entity_id: string; label?: string | null; created_at: string };
export type MaintenancePlan = { id: string; asset_id?: string | null; title: string; description?: string | null; frequency: RecurrenceFrequency; interval_count: number; next_due_at: string; last_completed_at?: string | null; active: boolean; auto_create_ticket: boolean; created_by: string; created_at: string };
export type TicketTemplateV3 = { id: string; name: string; description?: string | null; ticket_defaults: Record<string, unknown>; subtasks: string[]; active: boolean; created_by: string; created_at: string };
export type UserNotification = { id: string; user_id: string; ticket_id?: string | null; kind: string; title: string; body?: string | null; metadata: Record<string, unknown>; read_at?: string | null; created_at: string };
export type TicketApproval = { id: string; ticket_id: string; requested_by: string; requested_from: string; status: 'pending' | 'approved' | 'rejected'; note?: string | null; decided_at?: string | null; created_at: string };
export type HomeAssistantState = { entity_id: string; state: string; last_changed: string; attributes: { friendly_name?: string; device_class?: string; unit_of_measurement?: string; battery_level?: number; [key: string]: unknown } };

export type TicketSubtask = {
  id: string; ticket_id: string; title: string; completed: boolean;
  position: number; created_by: string; created_at: string; completed_at?: string | null;
};

export type TicketRelation = {
  id: string; ticket_id: string; related_ticket_id: string;
  relation_type: TicketRelationType; created_by: string; created_at: string;
  related_ticket?: Pick<Ticket, 'id' | 'ticket_number' | 'title' | 'status'>;
};

export type TicketWatcher = { ticket_id: string; user_id: string; created_at: string };

export type TicketRecurrence = {
  id: string; ticket_id: string; frequency: RecurrenceFrequency; interval_count: number;
  next_run_at: string; active: boolean; created_at: string;
};

export type TicketAttachment = {
  id: string;
  ticket_id: string;
  comment_id?: string | null;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  signed_url?: string | null;
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
  attachments?: TicketAttachment[];
};

export type TicketEvent = {
  id: string;
  ticket_id: string;
  actor_id?: string | null;
  event_type: string;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, unknown> | null;
  internal: boolean;
  created_at: string;
};

export type TicketRead = {
  ticket_id: string;
  user_id: string;
  last_read_at: string;
};
