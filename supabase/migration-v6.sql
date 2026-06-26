-- Histórico de disparos de e-mail
CREATE TABLE IF NOT EXISTS broadcast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  filters jsonb DEFAULT '{}',
  recipient_count int NOT NULL DEFAULT 0,
  sent_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_recipient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES broadcast(id) ON DELETE CASCADE,
  member_id uuid REFERENCES member(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL
);

ALTER TABLE broadcast ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipient ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_broadcast" ON broadcast USING (true) WITH CHECK (true);
CREATE POLICY "service_all_broadcast_recipient" ON broadcast_recipient USING (true) WITH CHECK (true);

-- Mural de oportunidades
CREATE TABLE IF NOT EXISTS opportunity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES member(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('oferta','demanda','parceria')),
  contact text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE opportunity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oportunidades_publicas" ON opportunity FOR SELECT USING (active = true);
CREATE POLICY "service_all_opportunity" ON opportunity USING (true) WITH CHECK (true);
