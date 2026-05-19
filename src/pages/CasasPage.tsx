import { CasaForm } from '@/components/casas/CasaForm'
import { CasaList } from '@/components/casas/CasaList'

export default function CasasPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mb-3">
          Adicionar Casa
        </div>
        <CasaForm />
      </div>
      <div>
        <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest mb-3">
          Casas Cadastradas
        </div>
        <CasaList />
      </div>
    </div>
  )
}
