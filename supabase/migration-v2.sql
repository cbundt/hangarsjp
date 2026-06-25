-- HangarSJP · Migration v2
-- Adiciona: instagram, member_task, índices e políticas
-- Execute no SQL Editor do Supabase

-- 1. Coluna instagram em member
ALTER TABLE member ADD COLUMN IF NOT EXISTS instagram varchar(100);

-- 2. Tabela de atividades atribuídas pelo guardião
CREATE TABLE IF NOT EXISTS member_task (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid           NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  assigned_by  uuid           REFERENCES member(id),
  title        varchar(200)   NOT NULL,
  description  text,
  category     point_category,          -- NULL = atividade livre
  points       smallint       NOT NULL DEFAULT 0,
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_member ON member_task(member_id);
CREATE INDEX IF NOT EXISTS idx_task_due    ON member_task(due_date);

-- RLS para member_task
ALTER TABLE member_task ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardiao_manage_tasks" ON member_task;
CREATE POLICY "guardiao_manage_tasks"
  ON member_task FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_tasks" ON member_task;
CREATE POLICY "public_read_tasks"
  ON member_task FOR SELECT
  TO anon
  USING (true);
