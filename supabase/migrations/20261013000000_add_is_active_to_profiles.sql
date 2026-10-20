-- Soft delete support for employee accounts.
-- Active employees have is_active = true; soft-deleted accounts are set to false.
-- Attendance and leave records are preserved for restored/audit purposes.
alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_is_active_idx on public.profiles (is_active);
