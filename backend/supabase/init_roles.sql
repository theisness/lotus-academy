--
-- PostgreSQL database cluster dump
--

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE anon;
ALTER ROLE anon WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE authenticated;
ALTER ROLE authenticated WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE authenticator;
ALTER ROLE authenticator WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:vgxAuMHdtbGqd5zKyYJqrw==$b7TloWV/JxBTOiPSYJvkoYJvUfszUJ7y7LTymIlBGCM=:j31mca9L9R1mANiV181mp1z5D8F+NtbsD2jtjq21RtQ=';
CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:HCg352MschdjvxAORuz1qQ==$YDQfbHF//yCGbgTtaunchkLUfY6FdyJVSkZdRN9kuW8=:2ORp014gvL7SPnm0ZYm1TMiU7d1lE5oh4QKW8e76z3g=';
CREATE ROLE service_role;
ALTER ROLE service_role WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION BYPASSRLS;
CREATE ROLE supabase_admin;
ALTER ROLE supabase_admin WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:oldQuwRt7028LvnIPXri9A==$4KYRCs0BzwCk0Ai+cSQKSdr1F/DFXcm0F8pJsxP5zkA=:Q6YO3kBfBBqvVKC67b+YCBjGNG+RlwOIsXRR/zv+KI8=';
CREATE ROLE supabase_auth_admin;
ALTER ROLE supabase_auth_admin WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:ZVEXWdkIWixkBjZ5Lols4w==$LB19EjhVZlCGYUWTMevaMePfsTuUQQETLBiSAwZo8TY=:QUgo3V5yvFg/fS3xO6H5Uapq1Ua1UTKoJHnm6BGv5Ec=';
CREATE ROLE supabase_realtime_admin;
ALTER ROLE supabase_realtime_admin WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:6h+pOJjgsP9MT5ZlyGz6iQ==$5Sh0gyo2ef881rTWDUDLvWyTBJEl/nFlSasUYU4XJw8=:t6G/izNapQ/pqsH5Jhk0oAfGKdaKxnnB2VLI2a09GIc=';
CREATE ROLE supabase_storage_admin;
ALTER ROLE supabase_storage_admin WITH SUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:WQR1f53qM5qByq0p4DTTdQ==$EmJv2Nq9tB3VCQYuoDvlXXJqHY2Anxv7zFcPC6Zk8jI=:21yUDUGJDo6NHUBQLMJ87hL/AeGqoI1ISpbOkUHncps=';

--
-- User Configurations
--

--
-- User Config "authenticator"
--

ALTER ROLE authenticator SET search_path TO 'auth', 'public';

--
-- User Config "supabase_auth_admin"
--

ALTER ROLE supabase_auth_admin SET search_path TO 'auth', 'public';


--
-- Role memberships
--

GRANT anon TO authenticator GRANTED BY supabase_admin;
GRANT anon TO supabase_storage_admin GRANTED BY supabase_admin;
GRANT authenticated TO authenticator GRANTED BY supabase_admin;
GRANT authenticated TO supabase_storage_admin GRANTED BY supabase_admin;
GRANT authenticator TO supabase_admin GRANTED BY supabase_admin;
GRANT service_role TO authenticator GRANTED BY supabase_admin;
GRANT service_role TO supabase_storage_admin GRANTED BY supabase_admin;
GRANT supabase_auth_admin TO supabase_admin GRANTED BY supabase_admin;
GRANT supabase_realtime_admin TO supabase_admin GRANTED BY supabase_admin;
GRANT supabase_storage_admin TO supabase_admin GRANTED BY supabase_admin;


--
-- Role privileges on configuration parameters
--

GRANT SET ON PARAMETER role TO supabase_storage_admin;


--
-- PostgreSQL database cluster dump complete
--

