-- HangarSJP · Schema v2 · PostgreSQL 15+ / Supabase
-- Controlador LGPD: Aciap-SJP
-- Execute este script no SQL Editor do Supabase: https://supabase.com/dashboard

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE member_category AS ENUM (
  'empresa', 'startup', 'institucional',
  'universidade', 'poder_publico', 'habitat', 'lideranca'
);

CREATE TYPE member_status AS ENUM (
  'ativo', 'irregular', 'licenciado', 'excluido'
);

CREATE TYPE point_category AS ENUM (
  'presenca', 'conteudo', 'articulacao', 'governanca', 'operacao'
);

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE member (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  name            varchar(200)    NOT NULL,
  cpf             varchar(500),   -- AES-256-GCM cifrado; coleta condicional
  email           varchar(320)    NOT NULL UNIQUE,
  whatsapp        varchar(20)     NOT NULL,
  linkedin        varchar(300),
  organization    varchar(300)    NOT NULL,
  cnpj            varchar(18),
  category        member_category NOT NULL,
  cnaes           jsonb           DEFAULT '[]',
  address         jsonb,          -- coleta condicional a consent_address=true
  interests       varchar(50)[],
  referred_by     uuid            REFERENCES member(id),
  level           smallint        NOT NULL DEFAULT 0,
  points          integer         NOT NULL DEFAULT 0,
  role_special    varchar(30),    -- torre_controle | mecanico_solo | controlador_rota
  onboarding_date date,
  status          member_status   NOT NULL DEFAULT 'ativo',
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT chk_cnaes_max3
    CHECK (jsonb_array_length(cnaes) <= 3),
  CONSTRAINT chk_interests_max3
    CHECK (array_length(interests,1) IS NULL OR array_length(interests,1) <= 3)
);

-- Consentimentos LGPD (append-only)
CREATE TABLE member_consent (
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

-- Cartão de Bordo
CREATE TABLE boarding (
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

-- Referência CNAE (sincronizar com IBGE mensalmente)
CREATE TABLE cnae_ref (
  code            varchar(12)  PRIMARY KEY,
  description     text         NOT NULL,
  section_code    varchar(2),
  section_desc    varchar(200),
  division        varchar(2),
  ibge_source_url text,
  synced_at       date         DEFAULT current_date
);

-- Log de pontuação (append-only)
CREATE TABLE point_event (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid           NOT NULL REFERENCES member(id),
  points       smallint       NOT NULL,
  category     point_category NOT NULL,
  reason       varchar(300),
  reference_id uuid,
  granted_by   uuid           REFERENCES member(id),
  created_at   timestamptz    NOT NULL DEFAULT now()
);

-- Progressão de nível (auditável)
CREATE TABLE level_transition (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id            uuid        NOT NULL REFERENCES member(id),
  from_level           smallint    NOT NULL,
  to_level             smallint    NOT NULL,
  points_at_transition integer     NOT NULL,
  witnessed_by         uuid        REFERENCES member(id),
  transitioned_at      timestamptz NOT NULL DEFAULT now()
);

-- Sessão de onboarding
CREATE TABLE onboarding_session (
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

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_member_category  ON member(category);
CREATE INDEX idx_member_level     ON member(level);
CREATE INDEX idx_member_status    ON member(status);
CREATE INDEX idx_member_referred  ON member(referred_by);
CREATE INDEX idx_member_address   ON member USING gin(address);
CREATE INDEX idx_member_cnaes     ON member USING gin(cnaes);
CREATE INDEX idx_boarding_fts     ON boarding USING gin(
  to_tsvector('portuguese', offers || ' ' || seeks)
);
CREATE INDEX idx_consent_member   ON member_consent(member_id);
CREATE INDEX idx_points_member    ON point_event(member_id);
CREATE INDEX idx_points_created   ON point_event(created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_member_updated_at
  BEFORE UPDATE ON member
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION recalc_member_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE member
  SET points = (
    SELECT COALESCE(SUM(points), 0)
    FROM point_event
    WHERE member_id = NEW.member_id
  )
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_points
  AFTER INSERT ON point_event
  FOR EACH ROW EXECUTE FUNCTION recalc_member_points();

-- ============================================================
-- VIEW SEGURA (sem CPF — nunca expor)
-- ============================================================
CREATE VIEW member_report AS
  SELECT
    id, name, organization, category,
    cnaes, interests, level, points, status,
    address->>'neighborhood' AS neighborhood,
    address->>'city'         AS city,
    address->>'state'        AS state,
    referred_by, onboarding_date, created_at
  FROM member;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE member         ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_event    ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding       ENABLE ROW LEVEL SECURITY;

-- Guardiões (autenticados) enxergam tudo em member
CREATE POLICY "guardiao_select_member"
  ON member FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "guardiao_insert_member"
  ON member FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "guardiao_update_member"
  ON member FOR UPDATE
  TO authenticated
  USING (true);

-- Consentimentos: somente INSERT e SELECT (append-only)
CREATE POLICY "insert_consent"
  ON member_consent FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "select_own_consent"
  ON member_consent FOR SELECT
  TO authenticated
  USING (true);

-- Cadastro público: anon pode inserir member e consent (formulário público)
CREATE POLICY "public_insert_member"
  ON member FOR INSERT
  TO anon
  WITH CHECK (true);

-- Point events: guardiões registram
CREATE POLICY "guardiao_point_event"
  ON point_event FOR ALL
  TO authenticated
  USING (true);

-- Boarding: insert público, select para autenticados
CREATE POLICY "public_insert_boarding"
  ON boarding FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "guardiao_select_boarding"
  ON boarding FOR SELECT
  TO authenticated
  USING (true);
