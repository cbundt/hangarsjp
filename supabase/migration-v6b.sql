-- Adiciona prazo de validade às oportunidades
ALTER TABLE opportunity ADD COLUMN IF NOT EXISTS expires_at date;
