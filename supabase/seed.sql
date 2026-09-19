-- Development seed only. No real user, password, API key, or personal data.
insert into public.agent_tools (name, description, enabled)
values
  ('system.echo', 'Development-only deterministic echo tool.', false),
  ('system.time', 'Development-only current time tool.', false)
on conflict (name) do update set description = excluded.description;

