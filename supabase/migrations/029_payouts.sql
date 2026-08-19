-- Payout ledger: tracks money manually sent from the platform's own M-Pesa
-- account (which collects every client payment today, see mpesa.ts) out to
-- each studio. Recorded by a platform admin, not by studios themselves —
-- there is deliberately no INSERT/UPDATE/DELETE grant to the authenticated
-- role; only the service-role client (used by src/lib/actions/payouts.ts,
-- gated on role === 'super_admin') can write these rows. Studios can read
-- their own payout history for transparency into what's been paid out
-- against what the platform has collected on their behalf.

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'KES',
  method text not null default 'manual',
  reference text,
  note text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index payouts_studio_id_idx on public.payouts(studio_id);

alter table public.payouts enable row level security;

create policy "Studio members can view their own payouts"
  on public.payouts for select
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid() and status = 'active'
    )
  );
