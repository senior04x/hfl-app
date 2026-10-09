-- DRAFT ONLY — not applied. TOURNAMENT-001, 2026-10-09.
-- Validate current schema, RLS and EXPLAIN ANALYZE in staging before deployment.
-- This first RPC covers tournaments. League roster totals require a separate scope.
-- Native column types are inherited: no assumption about integer/UUID tournament IDs.
-- SECURITY INVOKER preserves caller RLS; no service-role or policy changes.
-- Offset pages are deterministic for unchanged data. Reset pages after live changes.
-- Before enabling in the app, verify indexes on matches(tournament_id),
-- match_events(match_id), applications(team_id), and compare ranking to old code.

CREATE OR REPLACE FUNCTION public.tournament_lineup_ids_draft(p_formation jsonb)
RETURNS SETOF text LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE f jsonb := p_formation; players jsonb;
BEGIN
  -- The app accepts both JSON objects and JSON-encoded strings; malformed input is empty.
  IF jsonb_typeof(f) = 'string' THEN
    BEGIN f := (f #>> '{}')::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN RETURN;
    END;
  END IF;
  players := coalesce(f->'players', f->'startingLineup', f->'subs', '[]'::jsonb);
  IF jsonb_typeof(players) <> 'array' THEN RETURN; END IF;
  RETURN QUERY SELECT coalesce(p->>'id', p->>'_id', p->>'playerId')
    FROM jsonb_array_elements(players) p
    WHERE coalesce(p->>'id', p->>'_id', p->>'playerId') IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.tournament_player_page_draft(
  p_tournament_id text, p_stat text DEFAULT 'goals', p_search text DEFAULT '',
  p_offset integer DEFAULT 0, p_limit integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE tournament_key public.matches.tournament_id%TYPE; result jsonb;
BEGIN
  IF p_tournament_id IS NULL OR btrim(p_tournament_id) = ''
     OR p_stat IS NULL OR p_stat NOT IN ('goals','assists','yellowCards','redCards','matchesPlayed','rating')
     OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000
     OR p_limit IS NULL OR p_limit < 1 OR p_limit > 50
     OR length(coalesce(p_search,'')) > 100 THEN
    RAISE EXCEPTION 'Invalid ranking parameters' USING ERRCODE = '22023';
  END IF;
  tournament_key := p_tournament_id;
  WITH competition_matches AS MATERIALIZED (
    SELECT id, home_team_id, away_team_id, home_formation, away_formation, status
    FROM public.matches WHERE tournament_id = tournament_key
  ), competition_teams AS (
    SELECT home_team_id AS id FROM competition_matches
    UNION SELECT away_team_id FROM competition_matches
  ), finished AS MATERIALIZED (
    SELECT * FROM competition_matches WHERE status IN ('finished','completed')
  ), events AS MATERIALIZED (
    SELECT e.id, e.player_id, e.team_id, e.match_id, lower(e.event_type) AS kind
    FROM public.match_events e JOIN finished m ON m.id = e.match_id
  ), eligible AS (
    SELECT a.id FROM public.applications a JOIN competition_teams t ON t.id = a.team_id
    WHERE a.status = 'approved' AND a.is_archived IS NOT TRUE
    UNION SELECT player_id FROM events WHERE player_id IS NOT NULL
  ), event_totals AS (
    SELECT player_id,
      count(*) FILTER (WHERE kind IN ('goal','penalty_goal')) AS goals,
      count(*) FILTER (WHERE kind = 'assist') AS assists,
      count(*) FILTER (WHERE kind LIKE '%yellow%') AS yellow,
      count(*) FILTER (WHERE kind NOT LIKE '%yellow%' AND kind LIKE '%red%') AS red
    FROM events GROUP BY player_id
  ), appearances AS (
    SELECT player_id::text AS player_key, match_id FROM events
    UNION
    SELECT l.player_key, m.id FROM finished m
    CROSS JOIN LATERAL (
      SELECT * FROM public.tournament_lineup_ids_draft(to_jsonb(m.home_formation))
      UNION SELECT * FROM public.tournament_lineup_ids_draft(to_jsonb(m.away_formation))
    ) l(player_key)
  ), played AS (
    SELECT player_key, count(*) AS total FROM appearances GROUP BY player_key
  ), event_team AS (
    SELECT DISTINCT ON (player_id) player_id, team_id FROM events
    WHERE team_id IS NOT NULL ORDER BY player_id, id DESC
  ), stats AS (
    SELECT a.id::text AS id, a.first_name, a.last_name, a.photo_url,
      coalesce(et.team_id, a.team_id)::text AS team_id,
      coalesce(t.name, 'Jamoa') AS team_name,
      coalesce(e.goals,0) AS goals, coalesce(e.assists,0) AS assists,
      coalesce(e.yellow,0) AS yellow, coalesce(e.red,0) AS red,
      coalesce(p.total,0) AS matches_played
    FROM eligible x JOIN public.applications a ON a.id = x.id
    LEFT JOIN event_totals e ON e.player_id = a.id
    LEFT JOIN played p ON p.player_key = a.id::text
    LEFT JOIN event_team et ON et.player_id = a.id
    LEFT JOIN public.teams t ON t.id = coalesce(et.team_id,a.team_id)
  ), rated AS (
    SELECT *, CASE WHEN matches_played = 0 THEN 0 ELSE
      round(least(10::numeric,greatest(1::numeric,5 +
        (goals*0.5 + assists*0.3 - yellow*0.2 - red*0.5) *
        CASE WHEN matches_played >= 3 THEN 3.0 / matches_played ELSE 1 END)),1)
      END AS rating FROM stats
  ), searched AS (
    SELECT * FROM rated WHERE btrim(coalesce(p_search,'')) = ''
      OR strpos(lower(first_name || ' ' || last_name),lower(btrim(p_search))) > 0
      OR strpos(lower(team_name),lower(btrim(p_search))) > 0
  ), ordered AS (
    SELECT *, row_number() OVER (ORDER BY
      CASE p_stat WHEN 'goals' THEN goals WHEN 'assists' THEN assists
        WHEN 'yellowCards' THEN yellow WHEN 'redCards' THEN red
        WHEN 'matchesPlayed' THEN matches_played WHEN 'rating' THEN rating END DESC,
      CASE WHEN p_stat = 'goals' THEN rating ELSE 0 END DESC, id) AS rank
    FROM searched
  ), page AS (
    SELECT * FROM ordered ORDER BY rank OFFSET p_offset LIMIT p_limit + 1
  )
  SELECT jsonb_build_object(
    'hasMore', (SELECT count(*) > p_limit FROM page),
    'players', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.rank)
      FROM (SELECT * FROM page ORDER BY rank LIMIT p_limit) r),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- Explicit deployment grants must match the existing app read access after RLS review.
REVOKE ALL ON FUNCTION public.tournament_player_page_draft(text,text,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tournament_lineup_ids_draft(jsonb) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION ... TO authenticated / anon only after staging review.
-- App integration is intentionally disabled until this draft is reviewed/applied.
-- Required staging checks: transferred/archived scorers, penalty goals, cards,
-- malformed/string formations, zero-event roster, ties across pages, search,
-- anonymous/authenticated RLS, empty competition, 50+ pages and concurrent changes.
-- Current client does not select saved rating columns; this uses its calculated rating.
-- Large concurrent traffic requires measured plans and, if necessary, preaggregation;
-- LIMIT bounds response size, not the database aggregation work.
