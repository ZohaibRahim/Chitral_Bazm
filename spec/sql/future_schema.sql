-- Khowar Lyrics Archive — FUTURE PostgreSQL schema (specification, not yet a migration).
-- Applies only if/when the D-DB migration decision (PRD v3.1 §9) is taken.
-- Verified on PostgreSQL 16.15 by spec/sql/future_schema_test.sql.
-- Requires PostgreSQL >= 15 (UNIQUE NULLS NOT DISTINCT).
-- Rule: all text is NFKC-normalized by the application BEFORE insert.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Search-key functions (mirror of src/lib/search/normalize.ts; same test vectors)
-- ---------------------------------------------------------------------------

-- Strict key: remove ignorables, fold letter variants, ASCII digits, collapse spaces.
create or replace function khw_strict_key(t text) returns text
language sql immutable parallel safe
as $fn$
  select btrim(regexp_replace(
    translate(
      regexp_replace(coalesce(t, ''),
        '[ـً-ٰٟۖ-ۭ‌-‏‪-‮⁦-⁩﻿]', '', 'g'),
      -- from (each char maps to the char at the same position in "to")
      'يىكڪهەۂةآأإٱؤ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹،؛؟۔',
      'ییککہہہہااااو01234567890123456789    '),
    '\s+', ' ', 'g'))
$fn$;

-- Loose key: strict key plus folds for letters users substitute on Urdu keyboards.
-- 'ء' has no counterpart in the "to" string, so translate() deletes it.
create or replace function khw_loose_key(t text) returns text
language sql immutable parallel safe
as $fn$
  select btrim(regexp_replace(
    translate(khw_strict_key(t),
      'ےۓئھݮݯݰݱڅځںء',
      'یییہجچشژچزن'),
    '\s+', ' ', 'g'))
$fn$;

-- ASCII consonant skeleton (cross-script matching and trigram indexing).
-- Letters not in the "from" string are removed by the final regexp.
create or replace function khw_skeleton(t text) returns text
language sql immutable parallel safe
as $fn$
  select btrim(regexp_replace(regexp_replace(
    translate(khw_loose_key(t),
      'بپتطٹثسصجچحہخدڈذزضظژرڑشغگفقکلمن',
      'bptttsssjchhxddzzzzzrrqggfkklmn'),
    '[^a-z0-9 ]', '', 'g'),
    '\s+', ' ', 'g'))
$fn$;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type credit_visibility as enum ('public', 'initials', 'withheld');
create type visibility_basis  as enum ('own_choice', 'family_choice', 'official_release_credit', 'default_withheld');
create type rendering_kind    as enum ('roman_popular', 'roman_editorial', 'translation');
create type review_state      as enum ('machine_draft', 'draft', 'in_review', 'approved', 'withdrawn');
-- Internal evidence grades. NOT legal classifications. See PRD v3.1 §6.
create type evidence_grade    as enum ('E0', 'E1', 'E2', 'E3', 'E4', 'E5');
create type rights_layer      as enum ('lyric', 'transliteration', 'translation');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table people (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  display_name  text not null,
  name_khw_arab text,
  is_living     boolean,                       -- null = unknown
  death_year    int check (death_year between 1500 and 2100)
);

create table songs (
  id                   bigint generated always as identity primary key,
  slug                 text not null unique,
  title_khw_arab       text not null,
  title_roman          text not null,
  title_en             text,
  status               text not null default 'draft'
                       check (status in ('draft', 'in_review', 'published', 'withdrawn')),
  canonical_version_id bigint,                 -- composite FK added after lyric_versions exists
  title_loose_key      text generated always as (khw_loose_key(title_khw_arab)) stored,
  title_skel           text generated always as (khw_skeleton(title_khw_arab)) stored
);

create table lyric_versions (
  id         bigint generated always as identity primary key,
  song_id    bigint not null references songs(id) on delete cascade,
  label      text not null,
  state      review_state not null default 'draft',
  created_at timestamptz not null default now(),
  unique (song_id, id)                         -- target of the composite FK below
);

-- The canonical version must belong to the same song. Unlimited versions per song.
-- MATCH SIMPLE: a NULL canonical_version_id skips the check (song created before its first version).
alter table songs
  add constraint songs_canonical_version_fk
  foreign key (id, canonical_version_id)
  references lyric_versions (song_id, id)
  deferrable initially deferred;

create table lyric_lines (
  id         bigint generated always as identity primary key,
  version_id bigint not null references lyric_versions(id) on delete cascade,
  stanza_no  int not null check (stanza_no >= 1),
  line_no    int not null check (line_no >= 1),
  lang       text not null default 'khw',     -- BCP 47 language
  script     text not null default 'Arab',    -- ISO 15924
  text       text not null check (btrim(text) <> ''),
  strict_key text generated always as (khw_strict_key(text)) stored,
  loose_key  text generated always as (khw_loose_key(text)) stored,
  skel       text generated always as (khw_skeleton(text)) stored,
  unique (version_id, stanza_no, line_no)
);

create table line_renderings (
  id         bigint generated always as identity primary key,
  line_id    bigint not null references lyric_lines(id) on delete cascade,
  kind       rendering_kind not null,
  lang       text not null,                   -- 'khw-Latn' for roman; 'en' / 'ur' for translation
  text       text not null check (btrim(text) <> ''),
  roman_fold text,                            -- filled by the app (romanFold); null for translations
  state      review_state not null default 'draft',
  contributor_id bigint references people(id),
  unique (line_id, kind, lang)
);

create table credits (
  id         bigint generated always as identity primary key,
  song_id    bigint not null references songs(id) on delete cascade,
  person_id  bigint references people(id),    -- null only when is_traditional
  role       text not null check (role in
             ('lyricist', 'composer', 'singer', 'transcriber', 'translator_en', 'romanizer', 'reviewer')),
  is_traditional boolean not null default false,
  visibility credit_visibility not null default 'withheld',
  visibility_basis visibility_basis not null default 'default_withheld',
  visibility_recorded_at timestamptz,
  check (person_id is not null or is_traditional),
  check (visibility = 'withheld' or visibility_basis <> 'default_withheld'),
  unique nulls not distinct (song_id, role, person_id)
);

create table source_records (
  id         bigint generated always as identity primary key,
  song_id    bigint not null references songs(id) on delete cascade,
  version_id bigint references lyric_versions(id) on delete set null,
  kind       text not null check (kind in ('print', 'recording', 'manuscript', 'oral', 'web')),
  citation   text not null,
  url        text
);

create table rights_evidence (
  id               bigint generated always as identity primary key,
  song_id          bigint not null references songs(id) on delete cascade,
  layer            rights_layer not null,
  grade            evidence_grade not null,
  source_record_id bigint references source_records(id) on delete set null,
  license          text,
  document_ref     text,                      -- pointer into private storage; never public
  legal_advice_confirmed boolean not null default false,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- Publication is DERIVED from evidence (never typed by hand).
-- Lyric layer publishable when: unrevoked E4/E5 (documented permission), or
-- unrevoked E2/E3 whose basis a lawyer has confirmed (legal_advice_confirmed).
create view song_publishability as
select s.id as song_id,
       max(e.grade) filter (where e.layer = 'lyric' and e.revoked_at is null) as best_lyric_grade,
       coalesce(bool_or(
         e.layer = 'lyric' and e.revoked_at is null and
         (e.grade in ('E4', 'E5') or (e.grade in ('E2', 'E3') and e.legal_advice_confirmed))
       ), false) as lyric_publishable
from songs s
left join rights_evidence e on e.song_id = s.id
group by s.id;

create table submissions (
  id                 bigint generated always as identity primary key,
  received_at        timestamptz not null default now(),
  song_title         text not null,
  lyrics_text        text,
  claimed_lyricist   text,
  relationship       text check (relationship in ('poet', 'heir', 'singer', 'fan', 'other')),
  submitter_contact  text,
  consent_to_contact boolean not null default false,
  state              text not null default 'new' check (state in ('new', 'triaged', 'accepted', 'rejected'))
);

create table takedown_requests (
  id          bigint generated always as identity primary key,
  song_id     bigint references songs(id) on delete set null,
  received_at timestamptz not null default now(),
  basis       text not null check (basis in ('copyright', 'family_objection', 'privacy', 'safety', 'other')),
  action_taken text,
  actioned_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index lyric_lines_skel_trgm   on lyric_lines     using gin (skel gin_trgm_ops);
create index lyric_lines_loose_pref  on lyric_lines     (loose_key text_pattern_ops);
create index songs_title_skel_trgm   on songs           using gin (title_skel gin_trgm_ops);
create index renderings_fold_trgm    on line_renderings using gin (roman_fold gin_trgm_ops);
create index rights_evidence_song    on rights_evidence (song_id);
create index credits_song            on credits         (song_id);
