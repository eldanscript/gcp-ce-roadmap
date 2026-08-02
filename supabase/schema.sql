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

create table weekly_checkins (
  week_number int not null check (week_number between 1 and 12),
  day text not null check (day in ('월','화','수','목','금','토','일')),
  checked_at timestamptz not null default now(),
  primary key (week_number, day)
);

create table maturity_checkins (
  question_id text not null,
  checkpoint int not null check (checkpoint in (1, 2, 3)),
  checked_at timestamptz not null default now(),
  primary key (question_id, checkpoint)
);

alter table weekly_checkins enable row level security;
alter table maturity_checkins enable row level security;

create policy "anon full access" on weekly_checkins for all using (true) with check (true);
create policy "anon full access" on maturity_checkins for all using (true) with check (true);

create table routine_checkins (
  date date not null,
  item_id text not null,
  payload jsonb,
  checked_at timestamptz not null default now(),
  primary key (date, item_id)
);

create table routine_custom_items (
  name text primary key,
  section text not null check (section in ('exercise', 'medication')),
  created_at timestamptz not null default now()
);

create table routine_meals (
  date date not null,
  slot text not null check (slot in ('아침', '점심', '저녁', '간식')),
  note text,
  primary key (date, slot)
);

create table nutrition_stats (
  week_id text primary key,
  weekly_average jsonb,
  recommendations jsonb,
  unmatched_food_items jsonb,
  updated_at timestamptz not null default now()
);

alter table routine_checkins enable row level security;
alter table routine_custom_items enable row level security;
alter table routine_meals enable row level security;
alter table nutrition_stats enable row level security;

create policy "anon full access" on routine_checkins for all using (true) with check (true);
create policy "anon full access" on routine_custom_items for all using (true) with check (true);
create policy "anon full access" on routine_meals for all using (true) with check (true);
create policy "anon full access" on nutrition_stats for all using (true) with check (true);

create table biz_english_progress (
  item_id text primary key,
  checked_at timestamptz not null default now()
);

alter table biz_english_progress enable row level security;

create policy "anon full access" on biz_english_progress for all using (true) with check (true);
