-- ============================================================
-- HomeDesk 2.4
-- Encrypted Home Assistant refresh-token storage
-- ============================================================

alter table public.home_assistant_identities
  add column if not exists refresh_token_encrypted text,
  add column if not exists refresh_token_iv text,
  add column if not exists refresh_token_auth_tag text,
  add column if not exists token_client_id text,
  add column if not exists token_updated_at timestamptz;

comment on column public.home_assistant_identities.refresh_token_encrypted is
  'AES-256-GCM encrypted Home Assistant refresh token. Never contains plaintext.';

comment on column public.home_assistant_identities.refresh_token_iv is
  'Initialization vector used for AES-256-GCM encryption.';

comment on column public.home_assistant_identities.refresh_token_auth_tag is
  'Authentication tag used to verify AES-256-GCM ciphertext integrity.';

comment on column public.home_assistant_identities.token_client_id is
  'OAuth client_id used when refreshing Home Assistant access tokens.';

comment on column public.home_assistant_identities.token_updated_at is
  'Timestamp at which the stored Home Assistant refresh token was last replaced.';
