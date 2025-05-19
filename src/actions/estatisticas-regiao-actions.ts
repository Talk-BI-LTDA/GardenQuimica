// // src/actions/estatisticas-regiao-actions.ts
// 'use server'

// import { prisma } from '@/lib/supabase/prisma';
// import { auth } from '@/lib/auth';
// import { redirect } from 'next/navigation';

// // Tipos para as estatísticas por região
// export interface EstatisticasRegiao {
//   uf: string;
//   nomeEstado: string;
//   totalVendedores: number;
//   totalVendas: number;
//   valorTotalVendas: number;
//   valorMedioVendas: number;
//   totalNaoVendas: number;
//   valorTotalNaoVendas: number;
//   totalClientes: number;
//   clientesRecorrentes: number;
//   clientesNaoRecorrentes: number;
//   segmentoMaisFrequente: string;
//   produtoMaisFrequente: string;
//   posicaoRanking: number;
// }

// export interface EstatisticasRegiaoDetalhadas extends EstatisticasRegiao {
//   vendas: Array<{
//     id: string;
//     codigoVenda: string;
//     data: Date;
//     cliente: string;
//     vendedor: string;
//     valorTotal: number;
//   }>;
//   clientes: Array<{
//     id: string;
//     nome: string;
//     segmento: string;
//     cnpj: string;
//     valorTotal: number;
//     quantidadeCompras: number;
//     recorrente: boolean;
//   }>;
//   vendedores: Array<{
//     id: string;
//     nome: string;
//     email: string;
//     quantidadeVendas: number;
//     valorTotal: number;
//   }>;
//   segmentos: Array<{
//     nome: string;
//     quantidade: number;
//     valorTotal: number;
//   }>;
//   produtos: Array<{
//     nome: string;
//     quantidade: number;
//     valorTotal: number;
//   }>;
// }

// export interface FiltrosPeriodo {
//   dataInicio?: Date;
//   dataFim?: Date;
// }

// // Mapear siglas de estados para nomes completos
// const estadosMap: Record<string, string> = {
//   AC: "Acre",
//   AL: "Alagoas",
//   AP: "Amapá",
//   AM: "Amazonas",
//   BA: "Bahia",
//   CE: "Ceará",
//   DF: "Distrito Federal",
//   ES: "Espírito Santo",
//   GO: "Goiás",
//   MA: "Maranhão",
//   MT: "Mato Grosso",
//   MS: "Mato Grosso do Sul",
//   MG: "Minas Gerais",
//   PA: "Pará",
//   PB: "Paraíba",
//   PR: "Paraná",
//   PE: "Pernambuco",
//   PI: "Piauí",
//   RJ: "Rio de Janeiro",
//   RN: "Rio Grande do Norte",
//   RS: "Rio Grande do Sul",
//   RO: "Rondônia",
//   RR: "Roraima",
//   SC: "Santa Catarina",
//   SP: "São Paulo",
//   SE: "Sergipe",
//   TO: "Tocantins"
// };

// // Obter todas as estatísticas por região
// export async function getEstatisticasPorRegiao(filtros?: FiltrosPeriodo) {
//   // Validar autenticação
//   const session = await auth();
  
//   if (!session) {
//     redirect('/login');
//   }

//   try {
//     // Construir condição de data para filtros
//     const whereData = filtros?.dataInicio && filtros?.dataFim 
//       ? {
//           createdAt: {
//             gte: filtros.dataInicio,
//             lte: filtros.dataFim
//           }
//         } 
//       : {};

//     // Buscar vendedores agrupados por região
//     const vendedoresPorRegiao = await prisma.user.groupBy({
//       by: ['regiao'],
//       where: {
//         regiao: { not: null },
//         role: 'VENDEDOR'
//       },
//       _count: { id: true }
//     });

//     // Inicializar estrutura para armazenar resultados por região
//     const regioes: Record<string, EstatisticasRegiao> = {};

//     // Inicializar para todas as regiões com valores zero
//     Object.entries(estadosMap).forEach(([uf, nomeEstado]) => {
//       regioes[uf] = {
//         uf,
//         nomeEstado,
//         totalVendedores: 0,
//         totalVendas: 0,
//         valorTotalVendas: 0,
//         valorMedioVendas: 0,
//         totalNaoVendas: 0,
//         valorTotalNaoVendas: 0,
//         totalClientes: 0,
//         clientesRecorrentes: 0,
//         clientesNaoRecorrentes: 0,
//         segmentoMaisFrequente: '',
//         produtoMaisFrequente: '',
//         posicaoRanking: 0
//       };
//     });

//     // Preencher número de vendedores por região
//     for (const vendedorRegiao of vendedoresPorRegiao) {
//       if (vendedorRegiao.regiao && regioes[vendedorRegiao.regiao]) {
//         regioes[vendedorRegiao.regiao].totalVendedores = vendedorRegiao._count.id;
//       }
//     }

//     // Buscar vendedores com suas regiões
//     const vendedores = await prisma.user.findMany({
//       where: {
//         regiao: { not: null },
//         role: 'VENDEDOR'
//       },
//       select: {
//         id: true,
//         regiao: true
//       }
//     });

//     // Agrupar vendedores por região
//     const vendedoresIds: Record<string, string[]> = {};
//     for (const vendedor of vendedores) {
//       if (vendedor.regiao) {
//         if (!vendedoresIds[vendedor.regiao]) {
//           vendedoresIds[vendedor.regiao] = [];
//         }
//         vendedoresIds[vendedor.regiao].push(vendedor.id);
//       }
//     }

//     // Para cada região com vendedores, buscar estatísticas detalhadas
//     for (const [regiao, ids] of Object.entries(vendedoresIds)) {
//       if (ids.length === 0) continue;

//       // Construir condição de vendedor
//       const whereVendedor = {
//         vendedorId: { in: ids },
//         ...whereData
//       };

//       // Buscar estatísticas de vendas para a região
//       const [
//         vendasAggregate,
//         vendasCount,
//         naoVendasAggregate,
//         naoVendasCount
//       ] = await Promise.all([
//         prisma.venda.aggregate({
//           where: whereVendedor,
//           _sum: { valorTotal: true }
//         }),
//         prisma.venda.count({
//           where: whereVendedor
//         }),
//         prisma.naoVenda.aggregate({
//           where: whereVendedor,
//           _sum: { valorTotal: true }
//         }),
//         prisma.naoVenda.count({
//           where: whereVendedor
//         })
//       ]);

//       // Preencher estatísticas básicas
//       if (regioes[regiao]) {
//         regioes[regiao].totalVendas = vendasCount;
//         regioes[regiao].valorTotalVendas = vendasAggregate._sum.valorTotal || 0;
//         regioes[regiao].valorMedioVendas = vendasCount > 0 
//           ? (vendasAggregate._sum.valorTotal || 0) / vendasCount 
//           : 0;
//         regioes[regiao].totalNaoVendas = naoVendasCount;
//         regioes[regiao].valorTotalNaoVendas = naoVendasAggregate._sum.valorTotal || 0;
//       }

//       // Buscar clientes dos vendedores da região
//       const clientes = await prisma.cliente.findMany({
//         where: {
//           createdById: { in: ids }
//         },
//         select: {
//           id: true,
//           vendas: {
//             select: {
//               vendaRecorrente: true
//             }
//           }
//         }
//       });

//       if (regioes[regiao]) {
//         regioes[regiao].totalClientes = clientes.length;
        
//         // Contar clientes recorrentes (com pelo menos uma venda recorrente)
//         const clientesRecorrentes = clientes.filter(cliente => 
//           cliente.vendas.some(venda => venda.vendaRecorrente)
//         ).length;
        
//         regioes[regiao].clientesRecorrentes = clientesRecorrentes;
//         regioes[regiao].clientesNaoRecorrentes = clientes.length - clientesRecorrentes;
//       }

//       // Buscar segmento mais frequente nas vendas
//       const segmentosMaisFrequentes = await prisma.venda.findMany({
//         where: whereVendedor,
//         select: {
//           cliente: {
//             select: {
//               segmento: true
//             }
//           }
//         }
//       });

//       // Contar frequência de cada segmento
//       const segmentosContagem: Record<string, number> = {};
//       segmentosMaisFrequentes.forEach(venda => {
//         const segmento = venda.cliente.segmento;
//         segmentosContagem[segmento] = (segmentosContagem[segmento] || 0) + 1;
//       });

//       // Encontrar segmento mais frequente
//       let segmentoMaisFrequente = '';
//       let maxSegmentoCount = 0;
      
//       Object.entries(segmentosContagem).forEach(([segmento, count]) => {
//         if (count > maxSegmentoCount) {
//           maxSegmentoCount = count;
//           segmentoMaisFrequente = segmento;
//         }
//       });

//       if (regioes[regiao]) {
//         regioes[regiao].segmentoMaisFrequente = segmentoMaisFrequente;
//       }

//       // Buscar produto mais frequente nas vendas
//       const produtosMaisFrequentes = await prisma.vendaProduto.findMany({
//         where: {
//           venda: whereVendedor
//         },
//         select: {
//           produto: {
//             select: {
//               nome: true
//             }
//           }
//         }
//       });

//       // Contar frequência de cada produto
//       const produtosContagem: Record<string, number> = {};
//       produtosMaisFrequentes.forEach(vendaProduto => {
//         const nomeProduto = vendaProduto.produto.nome;
//         produtosContagem[nomeProduto] = (produtosContagem[nomeProduto] || 0) + 1;
//       });

//       // Encontrar produto mais frequente
//       let produtoMaisFrequente = '';
//       let maxProdutoCount = 0;
      
//       Object.entries(produtosContagem).forEach(([produto, count]) => {
//         if (count > maxProdutoCount) {
//           maxProdutoCount = count;
//           produtoMaisFrequente = produto;
//         }
//       });

//       if (regioes[regiao]) {
//         regioes[regiao].produtoMaisFrequente = produtoMaisFrequente;
//       }
//     }

//     // Converter objeto de regiões para array e ordenar por valor total de vendas
//     const regioesList = Object.values(regioes)
//       .filter(r => r.totalVendedores > 0) // Filtrar apenas regiões com vendedores
//       .sort((a, b) => b.valorTotalVendas - a.valorTotalVendas);

//     // Atribuir ranking
//     regioesList.forEach((regiao, index) => {
//       regiao.posicaoRanking = index + 1;
//     });

//     return { success: true, regioes: regioesList };
//   } catch (error) {
//     console.error('Erro ao buscar estatísticas por região:', error);
//     return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas por região' };
//   }
// }

// // Buscar estatísticas detalhadas para uma região específica
// export async function getEstatisticasRegiaoDetalhadas(uf: string, filtros?: FiltrosPeriodo) {
//   // Validar autenticação
//   const session = await auth();
  
//   if (!session) {
//     redirect('/login');
//   }

//   try {
//     // Verificar se a UF é válida
//     if (!estadosMap[uf]) {
//       return { success: false, error: 'UF inválida' };
//     }

//     // Construir condição de data para filtros
//     const whereData = filtros?.dataInicio && filtros?.dataFim 
//       ? {
//           createdAt: {
//             gte: filtros.dataInicio,
//             lte: filtros.dataFim
//           }
//         } 
//       : {};

//     // Buscar vendedores da região
//     const vendedores = await prisma.user.findMany({
//       where: {
//         regiao: uf,
//         role: 'VENDEDOR'
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true
//       }
//     });

//     const vendedoresIds = vendedores.map(v => v.id);

//     if (vendedoresIds.length === 0) {
//       return { 
//         success: false, 
//         error: 'Não há vendedores cadastrados para esta região' 
//       };
//     }

//     // Construir condição de vendedor
//     const whereVendedor = {
//       vendedorId: { in: vendedoresIds },
//       ...whereData
//     };

//     // Buscar estatísticas básicas
//     const [
//       vendasAggregate,
//       vendasCount,
//       naoVendasAggregate,
//       naoVendasCount
//     ] = await Promise.all([
//       prisma.venda.aggregate({
//         where: whereVendedor,
//         _sum: { valorTotal: true }
//       }),
//       prisma.venda.count({
//         where: whereVendedor
//       }),
//       prisma.naoVenda.aggregate({
//         where: whereVendedor,
//         _sum: { valorTotal: true }
//       }),
//       prisma.naoVenda.count({
//         where: whereVendedor
//       })
//     ]);

//     // Buscar clientes dos vendedores da região
//     const clientes = await prisma.cliente.findMany({
//       where: {
//         createdById: { in: vendedoresIds }
//       },
//       select: {
//         id: true,
//         nome: true,
//         segmento: true,
//         cnpj: true,
//         vendas: {
//           select: {
//             id: true,
//             valorTotal: true,
//             vendaRecorrente: true
//           }
//         }
//       }
//     });

//     // Contar clientes recorrentes
//     const clientesRecorrentes = clientes.filter(cliente => 
//       cliente.vendas.some(venda => venda.vendaRecorrente)
//     ).length;

//     // Buscar vendas detalhadas
//     const vendas = await prisma.venda.findMany({
//       where: whereVendedor,
//       select: {
//         id: true,
//         codigoVenda: true,
//         createdAt: true,
//         valorTotal: true,
//         cliente: {
//           select: {
//             nome: true
//           }
//         },
//         vendedor: {
//           select: {
//             name: true
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       },
//       take: 100 // Limitar para evitar volumes muito grandes
//     });

//     // Buscar segmento mais frequente
//     const segmentosMaisFrequentes = await prisma.venda.findMany({
//       where: whereVendedor,
//       select: {
//         cliente: {
//           select: {
//             segmento: true
//           }
//         },
//         valorTotal: true
//       }
//     });

//     // Contar frequência e valor de cada segmento
//     const segmentosData: Record<string, { quantidade: number; valorTotal: number }> = {};
//     segmentosMaisFrequentes.forEach(venda => {
//       const segmento = venda.cliente.segmento;
//       if (!segmentosData[segmento]) {
//         segmentosData[segmento] = { quantidade: 0, valorTotal: 0 };
//       }
//       segmentosData[segmento].quantidade += 1;
//       segmentosData[segmento].valorTotal += venda.valorTotal;
//     });

//     // Buscar produto mais frequente
//     const produtosMaisFrequentes = await prisma.vendaProduto.findMany({
//       where: {
//         venda: whereVendedor
//       },
//       select: {
//         produto: {
//           select: {
//             nome: true
//           }
//         },
//         quantidade: true,
//         valor: true
//       }
//     });

//     // Contar frequência e valor de cada produto
//     const produtosData: Record<string, { quantidade: number; valorTotal: number }> = {};
//     produtosMaisFrequentes.forEach(vendaProduto => {
//       const nomeProduto = vendaProduto.produto.nome;
//       if (!produtosData[nomeProduto]) {
//         produtosData[nomeProduto] = { quantidade: 0, valorTotal: 0 };
//       }
//       produtosData[nomeProduto].quantidade += vendaProduto.quantidade;
//       produtosData[nomeProduto].valorTotal += vendaProduto.valor;
//     });

//     // Buscar estatísticas por vendedor
//     const vendedoresData: Record<string, { quantidadeVendas: number; valorTotal: number }> = {};
    
//     // Inicializar para todos os vendedores
//     vendedores.forEach(vendedor => {
//       vendedoresData[vendedor.id] = { quantidadeVendas: 0, valorTotal: 0 };
//     });
    
//     // Contar vendas por vendedor
//     const vendasPorVendedor = await prisma.venda.findMany({
//       where: whereVendedor,
//       select: {
//         vendedorId: true,
//         valorTotal: true
//       }
//     });
    
//     vendasPorVendedor.forEach(venda => {
//       if (vendedoresData[venda.vendedorId]) {
//         vendedoresData[venda.vendedorId].quantidadeVendas += 1;
//         vendedoresData[venda.vendedorId].valorTotal += venda.valorTotal;
//       }
//     });

//     // Encontrar segmento mais frequente
//     let segmentoMaisFrequente = '';
//     let maxSegmentoCount = 0;
    
//     Object.entries(segmentosData).forEach(([segmento, data]) => {
//       if (data.quantidade > maxSegmentoCount) {
//         maxSegmentoCount = data.quantidade;
//         segmentoMaisFrequente = segmento;
//       }
//     });

//     // Encontrar produto mais frequente
//     let produtoMaisFrequente = '';
//     let maxProdutoCount = 0;
    
//     Object.entries(produtosData).forEach(([produto, data]) => {
//       if (data.quantidade > maxProdutoCount) {
//         maxProdutoCount = data.quantidade;
//         produtoMaisFrequente = produto;
//       }
//     });

//     // Preparar dados para retorno
//     const estatisticasDetalhadas: EstatisticasRegiaoDetalhadas = {
//       uf,
//       nomeEstado: estadosMap[uf],
//       totalVendedores: vendedores.length,
//       totalVendas: vendasCount,
//       valorTotalVendas: vendasAggregate._sum.valorTotal || 0,
//       valorMedioVendas: vendasCount > 0 
//         ? (vendasAggregate._sum.valorTotal || 0) / vendasCount 
//         : 0,
//       totalNaoVendas: naoVendasCount,
//       valorTotalNaoVendas: naoVendasAggregate._sum.valorTotal || 0,
//       totalClientes: clientes.length,
//       clientesRecorrentes,
//       clientesNaoRecorrentes: clientes.length - clientesRecorrentes,
//       segmentoMaisFrequente,
//       produtoMaisFrequente,
//       posicaoRanking: 0, // Será preenchido depois

//       // Dados detalhados
//       vendas: vendas.map(v => ({
//         id: v.id,
//         codigoVenda: v.codigoVenda,
//         data: v.createdAt,
//         cliente: v.cliente.nome,
//         vendedor: v.vendedor.name,
//         valorTotal: v.valorTotal
//       })),
      
//       clientes: clientes.map(c => ({
//         id: c.id,
//         nome: c.nome,
//         segmento: c.segmento,
//         cnpj: c.cnpj,
//         valorTotal: c.vendas.reduce((sum, v) => sum + v.valorTotal, 0),
//         quantidadeCompras: c.vendas.length,
//         recorrente: c.vendas.some(v => v.vendaRecorrente)
//       })),
      
//       vendedores: vendedores.map(v => ({
//         id: v.id,
//         nome: v.name,
//         email: v.email,
//         quantidadeVendas: vendedoresData[v.id]?.quantidadeVendas || 0,
//         valorTotal: vendedoresData[v.id]?.valorTotal || 0
//       })).sort((a, b) => b.valorTotal - a.valorTotal),
      
//       segmentos: Object.entries(segmentosData).map(([nome, data]) => ({
//         nome,
//         quantidade: data.quantidade,
//         valorTotal: data.valorTotal
//       })).sort((a, b) => b.quantidade - a.quantidade),
      
//       produtos: Object.entries(produtosData).map(([nome, data]) => ({
//         nome,
//         quantidade: data.quantidade,
//         valorTotal: data.valorTotal
//       })).sort((a, b) => b.quantidade - a.quantidade)
//     };

//     // Buscar posição no ranking geral
//     const { regioes } = await getEstatisticasPorRegiao(filtros);
    
//     if (regioes) {
//       const regiaoNoRanking = regioes.find(r => r.uf === uf);
//       if (regiaoNoRanking) {
//         estatisticasDetalhadas.posicaoRanking = regiaoNoRanking.posicaoRanking;
//       }
//     }

//     return { success: true, estatisticas: estatisticasDetalhadas };
//   } catch (error) {
//     console.error('Erro ao buscar estatísticas detalhadas por região:', error);
//     return { success: false, error: 'Ocorreu um erro ao buscar as estatísticas detalhadas da região' };
//   }
// }

