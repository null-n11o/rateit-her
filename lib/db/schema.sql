-- celebrities テーブル
CREATE TABLE IF NOT EXISTS celebrities (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL CHECK (category IN ('actress', 'model', 'av_actress')),
  image_url      TEXT,
  wikipedia_slug TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- evaluations テーブル
CREATE TABLE IF NOT EXISTS evaluations (
  id             SERIAL PRIMARY KEY,
  session_id     UUID NOT NULL,
  celebrity_id   INTEGER NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  type_vote      TEXT NOT NULL CHECK (type_vote IN ('cute', 'sexy', 'cool')),
  score          NUMERIC(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, celebrity_id)
);

-- インデックス（検索・ランキングの高速化）
CREATE INDEX IF NOT EXISTS idx_evaluations_celebrity_id ON evaluations(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_name ON celebrities(name);
CREATE INDEX IF NOT EXISTS idx_evaluations_session_id ON evaluations(session_id);

-- ランキング集計 VIEW
CREATE OR REPLACE VIEW celebrity_rankings AS
SELECT
  c.id,
  c.name,
  c.category,
  c.image_url,
  ROUND(AVG(e.score), 2)                                       AS avg_score,
  COUNT(e.id)                                                   AS vote_count,
  MODE() WITHIN GROUP (ORDER BY e.type_vote)                    AS dominant_type,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'cute'), 2)   AS avg_score_cute,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'cute')        AS vote_count_cute,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'sexy'), 2)   AS avg_score_sexy,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'sexy')        AS vote_count_sexy,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'cool'), 2)   AS avg_score_cool,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'cool')        AS vote_count_cool
FROM celebrities c
LEFT JOIN evaluations e ON e.celebrity_id = c.id
GROUP BY c.id;
