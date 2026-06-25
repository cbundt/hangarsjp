-- v4: requested_at para aprovação de tarefas pelo guardião
ALTER TABLE member_task ADD COLUMN IF NOT EXISTS requested_at timestamptz;
