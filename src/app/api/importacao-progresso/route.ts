// app/api/importacao-progresso/route.ts - Versão sem warnings
import { NextResponse } from 'next/server';
import { obterProgressoImportacao } from '@/actions/talkbi-actions';
import type { ImportacaoProgresso } from '@/lib/progress-store';

export const dynamic = 'force-dynamic';

interface ProgressoResposta extends ImportacaoProgresso {
  error?: string;
}

export async function GET(): Promise<NextResponse<ProgressoResposta>> {
  const requestStartTime = Date.now();
  try {
    console.log(`[API_ROUTE_PERSISTENTE] Requisição de progresso recebida: ${new Date().toISOString()}`);
    
    const sTime = Date.now();
    const progresso: ImportacaoProgresso = await obterProgressoImportacao();
    const progressoDuration = Date.now() - sTime;
    console.log(`[API_ROUTE_PERSISTENTE] obterProgressoImportacao() levou ${progressoDuration}ms`);
    
    console.log('[API_ROUTE_PERSISTENTE] Progresso obtido do store:', {
      fase: progresso.fase,
      emProgresso: progresso.emProgresso,
      processados: progresso.processadosTotalmente,
      total: progresso.totalAProcessar,
      porcentagem: progresso.porcentagem,
      timestamp: progresso.lastUpdatedTimestamp
    });
    
    const response = NextResponse.json(progresso, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
    console.log(`[API_ROUTE_PERSISTENTE] Resposta enviada. Tempo total da requisição: ${Date.now() - requestStartTime}ms`);
    return response;
    
  } catch (error: unknown) {
    console.error('[API_ROUTE_PERSISTENTE] Erro ao obter progresso:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json({ 
      error: "Erro ao obter progresso: " + errorMessage,
      emProgresso: false,
      mensagemStatus: "Erro ao obter status da importação",
      fase: "erro" as const,
      coletadosAteAgora: 0,
      totalAProcessar: 0,
      processadosTotalmente: 0,
      importadosNovos: 0,
      atualizadosExistentes: 0,
      falhasNoProcessamento: 0,
      isPaused: false,
      isCancelled: false,
      porcentagem: 0,
      processadosNoLoteAtual: 0, // Propriedade adicionada aqui
      lastUpdatedTimestamp: Date.now()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}