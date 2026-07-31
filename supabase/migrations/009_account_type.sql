-- Mark accounts as complimentary (agency pays) vs paying (client subscribes)
alter table accounts add column if not exists is_complimentary boolean default false not null;
