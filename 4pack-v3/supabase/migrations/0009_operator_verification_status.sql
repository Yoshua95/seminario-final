-- Separate migration: PostgreSQL enum values must commit before use.
alter type public.verification_status add value if not exists 'suspended';
