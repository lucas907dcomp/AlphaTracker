export type OperacaoTipo = 'Freebet' | 'Extracao' | 'SuperOdd' | 'TentativaDuplo' | 'Aposta' | 'FreebetSePerder'
export type OperacaoStatus = 'Pendente' | 'Concluida' | 'GeradaFreebet'
export type ApostaResultado = 'Ganhou' | 'Perdeu' | 'Pendente'

export interface Parceiro {
  id: string
  user_id: string
  nome: string
  percentual: number
  created_at: string
  updated_at: string
}

export interface ParceiroRepasse {
  id: string
  user_id: string
  parceiro_id: string
  valor: number
  data: string
  notas: string | null
  created_at: string
}

export interface Casa {
  id: string
  user_id: string
  nome: string
  is_active: boolean
  parceiro_id: string | null
  parceiro?: Parceiro
  created_at: string
  updated_at: string
}

export interface Aposta {
  id: string
  operacao_id: string
  casa_id: string
  stake: number
  gross_return: number
  is_freebet: boolean
  is_double_green: boolean
  resultado: ApostaResultado
  created_at: string
  updated_at: string
  casa?: Casa
}

export interface OperacaoOrigem {
  id: string
  tipo: OperacaoTipo
  data: string
  valor_freebet: number | null
}

export interface Operacao {
  id: string
  user_id: string
  tipo: OperacaoTipo
  data: string
  status: OperacaoStatus
  valor_pago_fixo: number | null
  valor_freebet: number | null
  pnl: number | null
  notas: string | null
  operacao_origem_id: string | null
  custo_liberacao: number | null
  created_at: string
  updated_at: string
  apostas?: Aposta[]
  operacao_origem?: OperacaoOrigem | null
}

export interface CenarioPnL {
  casaId: string
  casaNome: string
  pnl: number
}
