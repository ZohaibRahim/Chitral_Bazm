-- Test suite for spec/sql/future_schema.sql
-- Run: psql -v ON_ERROR_STOP=1 -f future_schema.sql -f future_schema_test.sql  (on an empty database)
-- Every assertion raises on failure; the script prints 'ALL TESTS PASSED' at the end.

create or replace function pg_temp.assert_eq(got text, want text, label text) returns void
language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got [%] want [%]', label, got, want;
  end if;
end $$;

-- 1. Folding vectors (shared with the TypeScript normalizer test fixtures)
select pg_temp.assert_eq(khw_strict_key('كيه'), 'کیہ', 'strict: arabic kaf/yeh/heh');
select pg_temp.assert_eq(khw_strict_key('أإآٱ'), 'اااا', 'strict: alef variants');
select pg_temp.assert_eq(khw_strict_key('غورُو'), 'غورو', 'strict: harakat removed');
select pg_temp.assert_eq(khw_strict_key('کـتـاب'), 'کتاب', 'strict: tatweel removed');
select pg_temp.assert_eq(khw_strict_key('a' || chr(8204) || 'b'), 'ab', 'strict: ZWNJ removed');
select pg_temp.assert_eq(khw_strict_key('۱۲۳ ٤٥'), '123 45', 'strict: digits');
select pg_temp.assert_eq(khw_strict_key('  الف،   ب  '), 'الف ب', 'strict: punct + whitespace');
select pg_temp.assert_eq(khw_loose_key('ݮ'), 'ج', 'loose: U+076E');
select pg_temp.assert_eq(khw_loose_key('ݯ'), 'چ', 'loose: U+076F');
select pg_temp.assert_eq(khw_loose_key('ݰ'), 'ش', 'loose: U+0770');
select pg_temp.assert_eq(khw_loose_key('ݱ'), 'ژ', 'loose: U+0771');
select pg_temp.assert_eq(khw_loose_key('څ'), 'چ', 'loose: U+0685');
select pg_temp.assert_eq(khw_loose_key('ځ'), 'ز', 'loose: U+0681');
select pg_temp.assert_eq(khw_loose_key('ےھں'), 'یہن', 'loose: barree/do-chashmi/ghunna');
select pg_temp.assert_eq(khw_loose_key('ءا'), 'ا', 'loose: hamza deleted');
select pg_temp.assert_eq(khw_loose_key('ݰور'), khw_loose_key('شور'), 'loose: Khowar vs Urdu-keyboard spelling match');
select pg_temp.assert_eq(khw_skeleton('خان'), 'xn', 'skeleton: khan');
select pg_temp.assert_eq(khw_skeleton('ݰور'), 'qr', 'skeleton: retroflex sh');
select pg_temp.assert_eq(khw_skeleton('غورو'), 'gr', 'skeleton: ghoru');
select pg_temp.assert_eq(khw_skeleton('abc'), 'abc', 'skeleton: lowercase Latin passes through unchanged (mixed lines)');

-- 2. Trigrams are produced for the ASCII skeleton regardless of locale
do $$ begin
  if array_length(show_trgm(khw_skeleton('ݰور گیت')), 1) is null then
    raise exception 'FAIL: no trigrams from skeleton';
  end if;
end $$;

-- 3. Canonical version: unlimited versions, same-song guarantee
insert into songs (slug, title_khw_arab, title_roman) values ('a', 'غورو', 'Ghoru'), ('b', 'گیت', 'Geet');
insert into lyric_versions (song_id, label)
  select id, v from songs, (values ('v1'), ('v2'), ('v3')) x(v) where slug = 'a';
insert into lyric_versions (song_id, label) select id, 'b1' from songs where slug = 'b';

select pg_temp.assert_eq((select count(*)::text from lyric_versions where song_id = (select id from songs where slug='a')),
                         '3', 'three versions allowed on one song');

update songs set canonical_version_id = (select min(v.id) from lyric_versions v join songs s on s.id = v.song_id where s.slug = 'a')
 where slug = 'a';

do $$ begin
  begin
    update songs set canonical_version_id = (select v.id from lyric_versions v join songs s on s.id = v.song_id where s.slug = 'b')
     where slug = 'a';
    set constraints songs_canonical_version_fk immediate;
    raise exception 'FAIL: cross-song canonical accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

-- 4. Lines: per-line lang, generated keys, renderings unique per kind/lang
insert into lyric_lines (version_id, stanza_no, line_no, lang, text)
  select min(id), 1, 1, 'khw', 'ݰور' from lyric_versions where label = 'v1';
insert into lyric_lines (version_id, stanza_no, line_no, lang, text)
  select min(id), 1, 2, 'ur', 'شور' from lyric_versions where label = 'v1';
select pg_temp.assert_eq((select string_agg(distinct loose_key, ',') from lyric_lines), 'شور', 'generated loose keys match across Khowar/Urdu lines');

insert into line_renderings (line_id, kind, lang, text) select min(id), 'roman_popular', 'khw-Latn', 'shor' from lyric_lines;
insert into line_renderings (line_id, kind, lang, text) select min(id), 'translation', 'en', 'noise' from lyric_lines;
do $$ begin
  begin
    insert into line_renderings (line_id, kind, lang, text) select min(id), 'translation', 'en', 'dup' from lyric_lines;
    raise exception 'FAIL: duplicate rendering accepted';
  exception when unique_violation then null;
  end;
end $$;

-- 5. Credits: traditional allowed once per role; public visibility needs a recorded basis
insert into credits (song_id, role, is_traditional) select id, 'lyricist', true from songs where slug = 'a';
do $$ begin
  begin
    insert into credits (song_id, role, is_traditional) select id, 'lyricist', true from songs where slug = 'a';
    raise exception 'FAIL: duplicate traditional credit accepted';
  exception when unique_violation then null;
  end;
end $$;
insert into people (slug, display_name, is_living) values ('p1', 'Singer One', true);
do $$ begin
  begin
    insert into credits (song_id, person_id, role, visibility)
      select s.id, p.id, 'singer', 'public' from songs s, people p where s.slug = 'a' and p.slug = 'p1';
    raise exception 'FAIL: public credit without basis accepted';
  exception when check_violation then null;
  end;
end $$;
insert into credits (song_id, person_id, role, visibility, visibility_basis, visibility_recorded_at)
  select s.id, p.id, 'singer', 'public', 'own_choice', now() from songs s, people p where s.slug = 'a' and p.slug = 'p1';

-- 6. Publishability is derived
select pg_temp.assert_eq((select lyric_publishable::text from song_publishability v join songs s on s.id = v.song_id where s.slug = 'a'),
                         'false', 'no evidence -> not publishable');
insert into rights_evidence (song_id, layer, grade) select id, 'lyric', 'E3' from songs where slug = 'a';
select pg_temp.assert_eq((select lyric_publishable::text from song_publishability v join songs s on s.id = v.song_id where s.slug = 'a'),
                         'false', 'E3 without legal confirmation -> not publishable');
insert into rights_evidence (song_id, layer, grade, license) select id, 'lyric', 'E4', 'non-exclusive display v1' from songs where slug = 'a';
select pg_temp.assert_eq((select lyric_publishable::text from song_publishability v join songs s on s.id = v.song_id where s.slug = 'a'),
                         'true', 'E4 permission -> publishable');
update rights_evidence set revoked_at = now() where grade = 'E4';
select pg_temp.assert_eq((select lyric_publishable::text from song_publishability v join songs s on s.id = v.song_id where s.slug = 'a'),
                         'false', 'revoked permission -> not publishable');
select pg_temp.assert_eq((select best_lyric_grade::text from song_publishability v join songs s on s.id = v.song_id where s.slug = 'a'),
                         'E3', 'best grade ignores revoked');

-- 7. Trigram index usable for partial-lyric search
select pg_temp.assert_eq((select count(*)::text from lyric_lines where skel % khw_skeleton('ݰور')), '2', 'trigram match on skeleton');

select 'ALL TESTS PASSED' as result;
