begin;
-- Mobile accepts a city followed by its declared country. Canonicalize the
-- delimited country, never arbitrary substrings such as "Chinatown".
create or replace function public.route_region(value text) returns text
language sql immutable set search_path=public as $$
 select case
 when lower(trim(value)) in ('china','cn','shenzhen','guangzhou','shanghai','ningbo','hong kong')
  or lower(trim(value)) ~ ',[[:space:]]*(china|cn)$' then 'CN'
 when lower(trim(value)) in ('argentina','ar','buenos aires','ezeiza','rosario','cordoba','córdoba')
  or lower(trim(value)) ~ ',[[:space:]]*(argentina|ar)$' then 'AR'
 else lower(trim(value)) end
$$;
commit;
