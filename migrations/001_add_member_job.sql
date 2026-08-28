-- Add job column to members table
-- Existing rows will have job = null until officers set a value.

alter table members
add column if not exists job text;
