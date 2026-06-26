-- Tabela de eventos públicos
CREATE TABLE IF NOT EXISTS event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  info text,
  link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos_publicos" ON event FOR SELECT USING (true);
CREATE POLICY "service_all" ON event USING (true) WITH CHECK (true);
