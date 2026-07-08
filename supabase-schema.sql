-- 家庭组
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz default now()
);

-- 家庭成员
create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  nickname text not null,
  device_id text not null,
  created_at timestamptz default now()
);

-- 菜品
create table dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  category text not null,
  type text not null check (type in ('meat', 'vegetable', 'half')),
  ingredients jsonb not null default '[]',
  cook_time int not null default 20,
  note text,
  is_public boolean not null default false,
  family_id uuid references families(id) on delete set null,
  created_by uuid references family_members(id) on delete set null,
  created_at timestamptz default now()
);

-- 用餐记录
create table meal_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  date date not null,
  people_count int not null,
  dishes jsonb not null default '[]',
  created_at timestamptz default now()
);

-- 菜品统计（upsert 用）
create table dish_stats (
  dish_id uuid references dishes(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  count int not null default 0,
  primary key (dish_id, family_id)
);

-- 增加菜品计数的 RPC
create or replace function increment_dish_stat(p_dish_id uuid, p_family_id uuid)
returns void language plpgsql as $$
begin
  insert into dish_stats (dish_id, family_id, count) values (p_dish_id, p_family_id, 1)
  on conflict (dish_id, family_id) do update set count = dish_stats.count + 1;
end;
$$;

-- RLS：公共菜品所有人可读，家庭菜品只有该家庭可读
alter table dishes enable row level security;
create policy "public dishes readable" on dishes for select using (is_public = true);
create policy "family dishes readable" on dishes for select using (family_id is not null);
create policy "anyone can insert" on dishes for insert with check (true);

alter table families enable row level security;
create policy "anyone can read families" on families for select using (true);
create policy "anyone can create family" on families for insert with check (true);

alter table family_members enable row level security;
create policy "anyone can read members" on family_members for select using (true);
create policy "anyone can join" on family_members for insert with check (true);

alter table meal_records enable row level security;
create policy "family can read records" on meal_records for select using (true);
create policy "family can insert records" on meal_records for insert with check (true);

alter table dish_stats enable row level security;
create policy "anyone can read stats" on dish_stats for select using (true);
create policy "anyone can upsert stats" on dish_stats for all using (true);
