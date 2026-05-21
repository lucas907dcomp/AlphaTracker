CREATE TABLE parceiro_repasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  data DATE NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parceiro_repasses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own repasses" ON parceiro_repasses
  FOR ALL USING (auth.uid() = user_id);
