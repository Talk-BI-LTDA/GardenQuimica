// @/lib/cron-jobs.ts
import { processarRemarketingAgendados } from "@/actions/talkbi-actions";

/**
 * Função para processar os remarketing agendados
 * Esta função seria chamada por um cron job externo
 */
export async function processarRemarketingCronJob() {
  try {
    console.log("Iniciando processamento de remarketing agendados...");
    const resultado = await processarRemarketingAgendados();
    
    if (resultado.error) {
      console.error("Erro ao processar remarketing:", resultado.error);
      return { success: false, error: resultado.error };
    }
    
    console.log(`Processamento concluído: ${resultado.processados} remarketing processados.`);
    return { success: true, processados: resultado.processados };
  } catch (error) {
    console.error("Erro no cron job de remarketing:", error);
    return { success: false, error: "Erro interno no cron job" };
  }
}