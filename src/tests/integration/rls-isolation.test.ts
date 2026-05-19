import { describe, it } from 'vitest'

// REL-001: requires Supabase Cloud with real auth + two test accounts
describe('RLS isolation — NFR-3, CON-4', () => {
  it.skip('REL-001: requires Supabase Cloud with real auth', async () => {
    // Pseudocode — full implementation requires live Supabase + test credentials
    //
    // const supabaseA = createClient(url, anonKey)
    // await supabaseA.auth.signInWithPassword({ email: 'userA@test.com', password: 'pwdA' })
    //
    // const { data: opData } = await supabaseA.from('operacoes').insert({
    //   tipo: 'Extracao', data: '2026-05-19', status: 'Pendente',
    //   valor_pago_fixo: null, notas: null,
    // }).select('id').single()
    //
    // const supabaseB = createClient(url, anonKey)
    // await supabaseB.auth.signInWithPassword({ email: 'userB@test.com', password: 'pwdB' })
    //
    // const { data: result } = await supabaseB.from('operacoes')
    //   .select('id').eq('id', opData.id)
    // expect(result).toHaveLength(0) // RLS: user B cannot see user A rows
    //
    // Cleanup: supabaseA deletes the operacao
  })
})
