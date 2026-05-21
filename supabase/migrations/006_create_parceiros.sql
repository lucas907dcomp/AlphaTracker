CREATE TABLE parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  percentual NUMERIC(5,2) NOT NULL CHECK (percentual > 0 AND percentual < 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own parceiros" ON parceiros
  FOR ALL USING (auth.uid() = user_id);
