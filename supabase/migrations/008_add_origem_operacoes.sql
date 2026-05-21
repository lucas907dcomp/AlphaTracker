ALTER TABLE operacoes ADD COLUMN operacao_origem_id UUID REFERENCES operacoes(id) ON DELETE SET NULL;
ALTER TABLE operacoes ADD COLUMN custo_liberacao NUMERIC(10,2);
