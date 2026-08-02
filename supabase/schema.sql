create table roadmap_progress (
  item_id text primary key,
  checked_at timestamptz not null default now()
);

create table capability_progress (
  item_id text primary key,
  checked_at timestamptz not null default now()
);

alter table roadmap_progress enable row level security;
alter table capability_progress enable row level security;

-- 1인 개인용 데이터, anon key로 직접 읽기/쓰기 허용 (routine-jammy와 동일한 신뢰 모델)
create policy "anon full access" on roadmap_progress for all using (true) with check (true);
create policy "anon full access" on capability_progress for all using (true) with check (true);
