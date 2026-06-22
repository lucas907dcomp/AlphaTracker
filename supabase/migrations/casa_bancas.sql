-- Tabela para snapshots de saldo por casa de aposta
create table if not exists public.casa_bancas (
  id          uuid          primary key default gen_random_uuid(),
  user_id     uuid          not null references auth.users(id) on delete cascade,
  casa_id     uuid          not null references public.casas(id) on delete cascade,
  saldo       numeric(12,2) not null,
  created_at  timestamptz   not null default now()
);

-- Índice para buscar snapshots por usuário+casa, ordenados do mais recente
create index if not exists casa_bancas_user_casa_date_idx
  on public.casa_bancas (user_id, casa_id, created_at desc);

-- RLS
alter table public.casa_bancas enable row level security;

create policy "users can manage own bancas"
  on public.casa_bancas
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
