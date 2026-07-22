-- Replace the previous administrator on databases where the clinic-management
-- migration has already been applied. The target Auth user must already exist.
do $$
declare
  target_id uuid;
  target_email constant text := 'omarmassoud27076@gmail.com';
  target_metadata jsonb;
begin
  select id, raw_user_meta_data
    into target_id, target_metadata
  from auth.users
  where lower(email) = target_email;

  if not found then
    raise exception 'The replacement administrator Auth user does not exist';
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    role,
    is_active
  )
  values (
    target_id,
    coalesce(target_metadata ->> 'first_name', ''),
    coalesce(target_metadata ->> 'last_name', ''),
    target_email,
    'patient',
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  -- Remove admin access from every previous administrator before promoting the
  -- replacement so the one-active-administrator constraint remains satisfied.
  update public.profiles
  set role = 'patient',
      is_active = false,
      updated_at = now()
  where role = 'admin' and id <> target_id;

  update public.profiles
  set role = 'admin',
      is_active = true,
      email = target_email,
      updated_at = now()
  where id = target_id;
end;
$$;
