-- Run after creating a private Storage bucket named: ticket-attachments
-- Supabase Storage policies for ticket attachments.
create policy "ticket_files_read_own_or_admin" on storage.objects
for select using (
  bucket_id = 'ticket-attachments'
  and (
    public.is_admin()
    or exists (
      select 1 from public.ticket_attachments a
      where a.file_path = storage.objects.name
      and public.owns_ticket(a.ticket_id)
    )
  )
);

create policy "ticket_files_upload_authenticated" on storage.objects
for insert with check (
  bucket_id = 'ticket-attachments'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
);

create policy "ticket_files_admin_delete" on storage.objects
for delete using (bucket_id = 'ticket-attachments' and public.is_admin());
