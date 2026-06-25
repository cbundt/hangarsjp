-- HangarSJP · Schema Fix — roda apenas o que pode estar faltando
-- Execute no SQL Editor do Supabase caso o schema.sql tenha dado erro

-- Extensão
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums (IF NOT EXISTS não existe para TYPE, então usamos DO block)
DO $$ BEGIN
  CREATE TYPE member_category AS ENUM (
    'empresa','startup','institucional','universidade','poder_publico','habitat','lideranca'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('ativo','irregular','licenciado','excluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE point_category AS ENUM ('presenca','conteudo','articulacao','governanca','operacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabelas
CREATE TABLE IF NOT EXISTS member (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  name            varchar(200)    NOT NULL,
  cpf             varchar(500),
  email           varchar(320)    NOT NULL UNIQUE,
  whatsapp        varchar(20)     NOT NULL,
  linkedin        varchar(300),
  organization    varchar(300)    NOT NULL,
  cnpj            varchar(18),
  category        member_category NOT NULL,
  cnaes           jsonb           DEFAULT '[]',
  address         jsonb,
  interests       varchar(50)[],
  referred_by     uuid            REFERENCES member(id),
  level           smallint        NOT NULL DEFAULT 0,
  points          integer         NOT NULL DEFAULT 0,
  role_special    varchar(30),
  onboarding_date date,
  status          member_status   NOT NULL DEFAULT 'ativo',
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT chk_cnaes_max3 CHECK (jsonb_array_length(cnaes) <= 3),
  CONSTRAINT chk_interests_max3 CHECK (array_length(interests,1) IS NULL OR array_length(interests,1) <= 3)
);

CREATE TABLE IF NOT EXISTS member_consent (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id              uuid         NOT NULL REFERENCES member(id) ON DELETE RESTRICT,
  consent_basic          boolean      NOT NULL,
  consent_cpf            boolean      NOT NULL DEFAULT false,
  consent_public_profile boolean      NOT NULL DEFAULT false,
  consent_address        boolean      NOT NULL DEFAULT false,
  controller             varchar(200) NOT NULL DEFAULT 'Aciap-SJP',
  privacy_policy_version varchar(10)  NOT NULL DEFAULT 'v1.0',
  ip_address             inet,
  user_agent             text,
  accepted_at            timestamptz  NOT NULL DEFAULT now(),
  revoked_at             timestamptz,
  revocation_reason      text
);

CREATE TABLE IF NOT EXISTS boarding (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        uuid         NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  who              varchar(280) NOT NULL,
  offers           text         NOT NULL,
  seeks            text         NOT NULL,
  dream_connection varchar(400) NOT NULL,
  completed_at     timestamptz  DEFAULT now(),
  points_granted   smallint     DEFAULT 10,
  version          smallint     NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cnae_ref (
  code            varchar(12)  PRIMARY KEY,
  description     text         NOT NULL,
  section_code    varchar(2),
  section_desc    varchar(200),
  division        varchar(2),
  ibge_source_url text,
  synced_at       date         DEFAULT current_date
);

CREATE TABLE IF NOT EXISTS point_event (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid           NOT NULL REFERENCES member(id),
  points       smallint       NOT NULL,
  category     point_category NOT NULL,
  reason       varchar(300),
  reference_id uuid,
  granted_by   uuid           REFERENCES member(id),
  created_at   timestamptz    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS level_transition (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id            uuid        NOT NULL REFERENCES member(id),
  from_level           smallint    NOT NULL,
  to_level             smallint    NOT NULL,
  points_at_transition integer     NOT NULL,
  witnessed_by         uuid        REFERENCES member(id),
  transitioned_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_session (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date                date        NOT NULL,
  location            varchar(300),
  facilitator_id      uuid        REFERENCES member(id),
  new_members         uuid[]      DEFAULT '{}',
  veterans_present    uuid[]      DEFAULT '{}',
  simulator_challenge text,
  simulator_notes     text,
  connections_made    smallint    DEFAULT 0,
  completed_at        timestamptz
);

-- Índices (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_member_category  ON member(category);
CREATE INDEX IF NOT EXISTS idx_member_level     ON member(level);
CREATE INDEX IF NOT EXISTS idx_member_status    ON member(status);
CREATE INDEX IF NOT EXISTS idx_member_referred  ON member(referred_by);
CREATE INDEX IF NOT EXISTS idx_member_address   ON member USING gin(address);
CREATE INDEX IF NOT EXISTS idx_member_cnaes     ON member USING gin(cnaes);
CREATE INDEX IF NOT EXISTS idx_boarding_fts     ON boarding USING gin(
  to_tsvector('portuguese', offers || ' ' || seeks)
);
CREATE INDEX IF NOT EXISTS idx_consent_member   ON member_consent(member_id);
CREATE INDEX IF NOT EXISTS idx_points_member    ON point_event(member_id);
CREATE INDEX IF NOT EXISTS idx_points_created   ON point_event(created_at);

-- Triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_member_updated_at ON member;
CREATE TRIGGER trg_member_updated_at
  BEFORE UPDATE ON member
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION recalc_member_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE member
  SET points = (SELECT COALESCE(SUM(points),0) FROM point_event WHERE member_id = NEW.member_id)
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_points ON point_event;
CREATE TRIGGER trg_recalc_points
  AFTER INSERT ON point_event
  FOR EACH ROW EXECUTE FUNCTION recalc_member_points();

-- View segura (sem CPF)
CREATE OR REPLACE VIEW member_report AS
  SELECT
    id, name, organization, category,
    cnaes, interests, level, points, status,
    address->>'neighborhood' AS neighborhood,
    address->>'city'         AS city,
    address->>'state'        AS state,
    referred_by, onboarding_date, created_at
  FROM member;

-- RLS
ALTER TABLE member         ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_event    ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding       ENABLE ROW LEVEL SECURITY;

-- Policies (DROP antes para evitar conflito)
DROP POLICY IF EXISTS "guardiao_select_member"   ON member;
DROP POLICY IF EXISTS "guardiao_insert_member"   ON member;
DROP POLICY IF EXISTS "guardiao_update_member"   ON member;
DROP POLICY IF EXISTS "public_insert_member"     ON member;
DROP POLICY IF EXISTS "insert_consent"           ON member_consent;
DROP POLICY IF EXISTS "select_own_consent"       ON member_consent;
DROP POLICY IF EXISTS "guardiao_point_event"     ON point_event;
DROP POLICY IF EXISTS "public_insert_boarding"   ON boarding;
DROP POLICY IF EXISTS "guardiao_select_boarding" ON boarding;

CREATE POLICY "guardiao_select_member"   ON member FOR SELECT TO authenticated USING (true);
CREATE POLICY "guardiao_insert_member"   ON member FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "guardiao_update_member"   ON member FOR UPDATE TO authenticated USING (true);
CREATE POLICY "public_insert_member"     ON member FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_consent"           ON member_consent FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "select_own_consent"       ON member_consent FOR SELECT TO authenticated USING (true);
CREATE POLICY "guardiao_point_event"     ON point_event FOR ALL TO authenticated USING (true);
CREATE POLICY "public_insert_boarding"   ON boarding FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "guardiao_select_boarding" ON boarding FOR SELECT TO authenticated USING (true);
