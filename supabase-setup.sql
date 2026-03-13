-- Run this in Supabase SQL Editor

-- Profiles table (if not exists)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'user',
  is_banned boolean default false,
  videos_generated integer default 0,
  images_generated integer default 0,
  audio_generated integer default 0,
  last_seen timestamptz,
  created_at timestamptz default now()
);

-- Videos/generations table
create table if not exists videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  email text,
  type text default 'video',
  prompt text,
  result_url text,
  created_at timestamptz default now()
);

-- Site settings table (for admin control)
create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Default settings
insert into site_settings (key, value) values
  ('maintenance_mode', 'false'),
  ('feature_image_to_video', 'true'),
  ('feature_audio_ai', 'false'),
  ('feature_create_image', 'false'),
  ('site_name', 'Hmong Creative'),
  ('site_tagline', 'AI Creative Studio')
on conflict (key) do nothing;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS Policies
alter table profiles enable row level security;
alter table videos enable row level security;
alter table site_settings enable row level security;

-- Profiles: users can read own, admins read all
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (true);
drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Videos: users can CRUD own
drop policy if exists "videos_select" on videos;
create policy "videos_select" on videos for select using (true);
drop policy if exists "videos_insert" on videos;
create policy "videos_insert" on videos for insert with check (auth.uid() = user_id);
drop policy if exists "videos_delete" on videos;
create policy "videos_delete" on videos for delete using (true);

-- Site settings: anyone can read
drop policy if exists "settings_select" on site_settings;
create policy "settings_select" on site_settings for select using (true);
drop policy if exists "settings_update" on site_settings;
create policy "settings_update" on site_settings for update using (true);
drop policy if exists "settings_insert" on site_settings;
create policy "settings_insert" on site_settings for insert with check (true);

-- Increment functions for generation counts
create or replace function increment_videos(uid uuid)
returns void as $$
  update profiles set videos_generated = coalesce(videos_generated, 0) + 1 where id = uid;
$$ language sql security definer;

create or replace function increment_images(uid uuid)
returns void as $$
  update profiles set images_generated = coalesce(images_generated, 0) + 1 where id = uid;
$$ language sql security definer;

create or replace function increment_audio(uid uuid)
returns void as $$
  update profiles set audio_generated = coalesce(audio_generated, 0) + 1 where id = uid;
$$ language sql security definer;
