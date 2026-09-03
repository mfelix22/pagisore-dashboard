-- Remove synthetic discord_user_id values created by the dashboard API.
-- Where members have a real discord_id, restore it. Otherwise set NULL.

update event_attendance ea
set discord_user_id = m.discord_id
from members m
where ea.member_id = m.id
  and ea.discord_user_id like 'dashboard_%';
