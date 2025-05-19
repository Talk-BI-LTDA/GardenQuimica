// src/app/(dashboard)/vendas/novo/page.tsx
'use client'
export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { VendaUnificadaFormTipado } from '@/components/forms/venda-unificada-form'
import { ModoFormulario } from '@/types/venda-tipos'

export default function NovaPaginaVendaUnificada() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [modoAtual, setModoAtual] = useState<ModoFormulario>('venda')
  
  useEffect(() => {
    const modoParam = searchParams.get('modo') as ModoFormulario | null
    if (modoParam === 'naoVenda') {
      setModoAtual('naoVenda')
    }
  }, [searchParams])
  
  
  return (
    <motion.div 
      className="p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={modoAtual}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold">
              {modoAtual === 'venda' ? 'Gestão de Vendas' : 'Registro de Venda-Perdida'}
            </h1>
            <p className="text-gray-500">
              {modoAtual === 'venda' 
                ? 'Registre uma nova venda utilizando o formulário abaixo.'
                : 'Registre uma Venda-Perdida para análise de objeções e comparação com concorrentes.'}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <motion.div 
        className="bg-white rounded-lg shadow-sm p-6"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <VendaUnificadaFormTipado initialMode={modoAtual} />
      </motion.div>
    </motion.div>
  )
} 