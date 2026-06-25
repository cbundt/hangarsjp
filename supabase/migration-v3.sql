-- HangarSJP · Migration v3 — mensagens membro → guardião

CREATE TABLE IF NOT EXISTS member_message (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_member  ON member_message(member_id);
CREATE INDEX IF NOT EXISTS idx_message_created ON member_message(created_at DESC);

ALTER TABLE member_message ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_message" ON member_message;
CREATE POLICY "public_insert_message"
  ON member_message FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "guardiao_read_message" ON member_message;
CREATE POLICY "guardiao_read_message"
  ON member_message FOR ALL TO authenticated USING (true);
