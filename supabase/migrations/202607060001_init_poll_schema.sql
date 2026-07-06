create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  is_anonymous boolean not null default true,
  show_results boolean not null default true,
  is_public boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'rejected', 'closed')),
  allow_results_view boolean not null default true,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  text text not null,
  type text not null check (type in ('single_choice', 'multiple_choice', 'text', 'scale', 'yes_no')),
  options jsonb not null default '[]'::jsonb,
  order_index integer not null,
  required boolean not null default true,
  constraint questions_unique_order unique (poll_id, order_index)
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  text text not null,
  order_index integer not null,
  constraint poll_options_unique_order unique (question_id, order_index)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_id uuid references public.poll_options (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text_answer text,
  created_at timestamptz not null default now(),
  constraint votes_one_per_question_per_user unique (question_id, user_id),
  constraint votes_has_answer check (option_id is not null or text_answer is not null)
);

create table public.poll_approvals (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  feedback text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index polls_creator_id_idx on public.polls (creator_id);
create index polls_status_idx on public.polls (status);
create index polls_public_idx on public.polls (is_public, status);
create index questions_poll_id_idx on public.questions (poll_id);
create index poll_options_question_id_idx on public.poll_options (question_id);
create index votes_question_id_idx on public.votes (question_id);
create index votes_user_id_idx on public.votes (user_id);
create index poll_approvals_poll_id_idx on public.poll_approvals (poll_id);
create index poll_approvals_admin_id_idx on public.poll_approvals (admin_id);

alter table public.profiles enable row level security;
alter table public.polls enable row level security;
alter table public.questions enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;
alter table public.poll_approvals enable row level security;

grant execute on function public.is_admin() to public;
grant execute on function public.set_updated_at() to public;
grant execute on function public.handle_new_user() to public;

create policy "Profiles are readable by everyone"
on public.profiles
for select
using (true);

create policy "Users can create their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Published polls are publicly readable"
on public.polls
for select
using (status = 'published' and is_public = true);

create policy "Poll owners can read their own polls"
on public.polls
for select
using (creator_id = auth.uid());

create policy "Admins can read all polls"
on public.polls
for select
using (public.is_admin());

create policy "Authenticated users can create polls"
on public.polls
for insert
with check (creator_id = auth.uid());

create policy "Poll owners and admins can update polls"
on public.polls
for update
using (creator_id = auth.uid() or public.is_admin())
with check (creator_id = auth.uid() or public.is_admin());

create policy "Poll owners and admins can delete polls"
on public.polls
for delete
using (creator_id = auth.uid() or public.is_admin());

create policy "Questions follow poll visibility"
on public.questions
for select
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and (
        (p.status = 'published' and p.is_public = true)
        or p.creator_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "Poll owners and admins can manage questions"
on public.questions
for all
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and (p.creator_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and (p.creator_id = auth.uid() or public.is_admin())
  )
);

create policy "Poll options follow question visibility"
on public.poll_options
for select
using (
  exists (
    select 1
    from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id
      and (
        (p.status = 'published' and p.is_public = true)
        or p.creator_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "Poll owners and admins can manage options"
on public.poll_options
for all
using (
  exists (
    select 1
    from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id
      and (p.creator_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id
      and (p.creator_id = auth.uid() or public.is_admin())
  )
);

create policy "Users can read their own votes and owners can read votes for their polls"
on public.votes
for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id
      and p.creator_id = auth.uid()
  )
);

create policy "Authenticated users can vote on published public polls"
on public.votes
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id
      and p.status = 'published'
      and p.is_public = true
  )
);

create policy "Users can update their own votes on published public polls"
on public.votes
for update
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.questions q
    join public.polls p on p.id = q.poll_id
    where q.id = question_id
      and p.status = 'published'
      and p.is_public = true
  )
);

create policy "Users can delete their own votes"
on public.votes
for delete
using (user_id = auth.uid());

create policy "Admins can read approvals and poll owners can read their poll reviews"
on public.poll_approvals
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and p.creator_id = auth.uid()
  )
);

create policy "Admins can manage approvals"
on public.poll_approvals
for all
using (public.is_admin())
with check (public.is_admin());

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();