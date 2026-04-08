-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table profiles (
  id            uuid references auth.users primary key,
  name          text not null check (char_length(name) <= 100),
  major         text check (char_length(major) <= 100),
  year          text check (char_length(year) <= 20),
  birthday      date,
  gender        text check (char_length(gender) <= 50),
  sexuality     text check (char_length(sexuality) <= 50),
  height        text check (char_length(height) <= 20),
  race          text check (char_length(race) <= 50),
  religion      text check (char_length(religion) <= 50),
  latitude      float8,
  longitude     float8,
  location_name text,
  values_answers jsonb,
  interests     text[] check (array_length(interests, 1) <= 50),
  prompt        text check (char_length(prompt) <= 200),
  prompt_answer text check (char_length(prompt_answer) <= 500),
  photo_url     text check (char_length(photo_url) <= 500),
  push_token    text,                   -- Expo push token
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- Only allow @northeastern.edu signups (enforced at app layer + RLS)
alter table profiles enable row level security;
create policy "Users can read/update own profile"
  on profiles for all using (auth.uid() = id);

-- ─── SWIPES ──────────────────────────────────────────────────────────────────
create table swipes (
  id            uuid default uuid_generate_v4() primary key,
  swiper_id     uuid references profiles(id),
  swiped_id     uuid references profiles(id),
  direction     text check (direction in ('left','right')),
  created_at    timestamptz default now(),
  unique(swiper_id, swiped_id)
);

alter table swipes enable row level security;
create policy "Users can insert own swipes"
  on swipes for insert with check (auth.uid() = swiper_id);
create policy "Users can read own swipes"
  on swipes for select using (auth.uid() = swiper_id or auth.uid() = swiped_id);

-- ─── MATCHES ─────────────────────────────────────────────────────────────────
create table matches (
  id                uuid default uuid_generate_v4() primary key,
  user_a            uuid references profiles(id),
  user_b            uuid references profiles(id),
  message_count     int default 0,
  revealed          boolean default false,
  first_message_at  timestamptz,
  date_proposed_by  uuid references profiles(id),
  date_confirmed    boolean default false,
  created_at        timestamptz default now(),
  unique(user_a, user_b)
);

alter table matches enable row level security;
create policy "Users can read own matches"
  on matches for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Users can update own matches"
  on matches for update using (auth.uid() = user_a or auth.uid() = user_b);

-- Auto-create match when both users swipe right
create or replace function create_match_if_mutual()
returns trigger as $$
begin
  if exists (
    select 1 from swipes
    where swiper_id = NEW.swiped_id
      and swiped_id = NEW.swiper_id
      and direction = 'right'
  ) and NEW.direction = 'right' then
    insert into matches (user_a, user_b)
    values (least(NEW.swiper_id, NEW.swiped_id), greatest(NEW.swiper_id, NEW.swiped_id))
    on conflict do nothing;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_swipe_right
  after insert on swipes
  for each row execute procedure create_match_if_mutual();

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
create table messages (
  id            uuid default uuid_generate_v4() primary key,
  match_id      uuid references matches(id) on delete cascade,
  sender_id     uuid references profiles(id),
  content       text not null check (char_length(content) <= 2000),
  type          text default 'text' check (type in ('text','system')),
  metadata      jsonb,
  created_at    timestamptz default now()
);

alter table messages enable row level security;
create policy "Match participants can read/send messages"
  on messages for all using (
    exists (
      select 1 from matches
      where id = match_id
        and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

-- Increment message_count + check reveal threshold on new message
create or replace function handle_new_message()
returns trigger as $$
begin
  update matches
  set
    message_count = message_count + 1,
    first_message_at = coalesce(first_message_at, now())
  where id = NEW.match_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_new_message
  after insert on messages
  for each row execute procedure handle_new_message();

-- ─── STORAGE ─────────────────────────────────────────────────────────────────
-- Run in Supabase dashboard or via CLI:
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- RLS for avatars bucket: users can upload/update their own file; anyone can read
create policy "Avatar upload: own file only"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatar update: own file only"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatar read: public"
  on storage.objects for select
  using (bucket_id = 'avatars');

