// pages/api/cron/remarketing.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { processarRemarketingCronJob } from '@/lib/cron-jobs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se a requisição tem uma chave secreta válida para evitar chamadas não autorizadas
  const secretKey = req.headers['x-secret-key'];
  
  if (secretKey !== process.env.CRON_SECRET_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const resultado = await processarRemarketingCronJob();
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro ao executar cron job de remarketing:', error);
    return res.status(500).json({ error: 'Erro interno ao processar remarketing' });
  }
}