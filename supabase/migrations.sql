create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text check (role in ('citizen','responder','admin')) default 'citizen',
  latitude float, longitude float,
  created_at timestamptz default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  type text check (type in ('sos_button','social_post','manual_form')),
  message text not null,
  latitude float not null, longitude float not null,
  severity text check (severity in ('high','medium','low')) default 'low',
  response_type text check (response_type in ('ambulance','fire','police','rescue','unknown')) default 'unknown',
  status text check (status in ('active','accepted','resolved')) default 'active',
  created_at timestamptz default now()
);

create table triage_results (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references alerts(id) on delete cascade,
  severity text, response_type text,
  extracted_location text,
  is_duplicate boolean default false,
  raw_ai_output text,
  created_at timestamptz default now()
);

create table responder_assignments (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references alerts(id),
  responder_id uuid references users(id),
  accepted_at timestamptz default now(),
  resolved_at timestamptz
);
