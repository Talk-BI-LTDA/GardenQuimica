// // src/components/dashboard/mapa-vendas-regiao/DetalheEstadoModal.tsx
// "use client";

// import React from 'react';
// import { motion } from 'framer-motion';
// import { format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { 
//   Table, 
//   TableBody, 
//   TableCell, 
//   TableHead, 
//   TableHeader, 
//   TableRow 
// } from '@/components/ui/table';
// import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { formatarValorBRL } from '@/lib/utils';
// import { 
//   User, 
//   DollarSign, 
//   BarChart3, 
//   X, 
//   Tag, 
//   Package2, 
//   Users, 
//   UserCheck,
//   Building,
//   ShoppingCart
// } from 'lucide-react';

// import { 
//   type EstatisticasRegiaoDetalhadas 
// } from '@/actions/estatisticas-regiao-actions';

// interface DetalheEstadoModalProps {
//   estatisticas: EstatisticasRegiaoDetalhadas;
//   onClose: () => void;
// }

// export const DetalheEstadoModal: React.FC<DetalheEstadoModalProps> = ({ 
//   estatisticas, 
//   onClose 
// }) => {
//   // Determinar classe para posição no ranking
//   const getRankingClass = (posicao: number) => {
//     if (posicao === 1) return "bg-amber-100 text-amber-800";
//     if (posicao === 2) return "bg-slate-100 text-slate-800";
//     if (posicao === 3) return "bg-amber-800 text-white";
//     return "bg-gray-100 text-gray-800";
//   };

//   return (
//     <div className="space-y-6">
//       {/* Resumo principal */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <Card className="md:col-span-2">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-lg flex items-center gap-2">
//               <Badge className={getRankingClass(estatisticas.posicaoRanking)}>
//                 {estatisticas.posicaoRanking}º lugar
//               </Badge>
//               Resumo de {estatisticas.nomeEstado}
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               <div className="flex items-start space-x-2">
//                 <User className="h-5 w-5 mt-0.5 text-[#00446A]" />
//                 <div>
//                   <p className="text-sm text-gray-500">Vendedores</p>
//                   <p className="font-medium text-lg">{estatisticas.totalVendedores}</p>
//                 </div>
//               </div>
              
//               <div className="flex items-start space-x-2">
//                 <UserCheck className="h-5 w-5 mt-0.5 text-[#97C31D]" />
//                 <div>
//                   <p className="text-sm text-gray-500">Clientes</p>
//                   <p className="font-medium text-lg">{estatisticas.totalClientes}</p>
//                   <div className="flex items-center text-xs">
//                     <span className="text-green-600 mr-2">{estatisticas.clientesRecorrentes} recorrentes</span>
//                     <span className="text-orange-500">{estatisticas.clientesNaoRecorrentes} não recorrentes</span>
//                   </div>
//                 </div>
//               </div>
              
//               <div className="flex items-start space-x-2">
//                 <Building className="h-5 w-5 mt-0.5 text-purple-600" />
//                 <div>
//                   <p className="text-sm text-gray-500">Segmento Principal</p>
//                   <p className="font-medium truncate">{estatisticas.segmentoMaisFrequente || "N/A"}</p>
//                 </div>
//               </div>
              
//               <div className="flex items-start space-x-2">
//                 <Package2 className="h-5 w-5 mt-0.5 text-amber-600" />
//                 <div>
//                   <p className="text-sm text-gray-500">Produto Principal</p>
//                   <p className="font-medium truncate">{estatisticas.produtoMaisFrequente || "N/A"}</p>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-lg">Métricas de Vendas</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center pb-2 border-b">
//                 <div className="flex items-center space-x-2">
//                   <ShoppingCart className="h-5 w-5 text-green-600" />
//                   <div>
//                     <p className="text-sm text-gray-500">Total de Vendas</p>
//                     <p className="font-medium">{estatisticas.totalVendas}</p>
//                   </div>
//                 </div>
//                 <Badge className="bg-green-100 text-green-800">
//                   {((estatisticas.totalVendas / (estatisticas.totalVendas + estatisticas.totalNaoVendas || 1)) * 100).toFixed(0)}%
//                 </Badge>
//               </div>
              
//               <div className="flex justify-between items-center pb-2 border-b">
//                 <div className="flex items-center space-x-2">
//                   <X className="h-5 w-5 text-red-600" />
//                   <div>
//                     <p className="text-sm text-gray-500">Vendas Canceladas</p>
//                     <p className="font-medium">{estatisticas.totalNaoVendas}</p>
//                   </div>
//                 </div>
//                 <Badge className="bg-red-100 text-red-800">
//                   {((estatisticas.totalNaoVendas / (estatisticas.totalVendas + estatisticas.totalNaoVendas || 1)) * 100).toFixed(0)}%
//                 </Badge>
//               </div>
              
//               <div className="flex justify-between items-center">
//                 <div className="flex items-center space-x-2">
//                   <DollarSign className="h-5 w-5 text-[#00446A]" />
//                   <div>
//                     <p className="text-sm text-gray-500">Valor Total</p>
//                     <p className="font-medium">{formatarValorBRL(estatisticas.valorTotalVendas)}</p>
//                   </div>
//                 </div>
//               </div>
              
//               <div className="flex justify-between items-center">
//                 <div className="flex items-center space-x-2">
//                   <BarChart3 className="h-5 w-5 text-[#97C31D]" />
//                   <div>
//                     <p className="text-sm text-gray-500">Valor Médio</p>
//                     <p className="font-medium">{formatarValorBRL(estatisticas.valorMedioVendas)}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Abas de detalhes */}
//       <Tabs defaultValue="vendas" className="w-full">
//         <TabsList className="grid grid-cols-5 mb-4">
//           <TabsTrigger value="vendas" className="flex items-center gap-1">
//             <ShoppingCart className="h-4 w-4" />
//             <span className="hidden md:inline">Vendas</span>
//           </TabsTrigger>
//           <TabsTrigger value="clientes" className="flex items-center gap-1">
//             <Users className="h-4 w-4" />
//             <span className="hidden md:inline">Clientes</span>
//           </TabsTrigger>
//           <TabsTrigger value="vendedores" className="flex items-center gap-1">
//             <User className="h-4 w-4" />
//             <span className="hidden md:inline">Vendedores</span>
//           </TabsTrigger>
//           <TabsTrigger value="segmentos" className="flex items-center gap-1">
//             <Tag className="h-4 w-4" />
//             <span className="hidden md:inline">Segmentos</span>
//           </TabsTrigger>
//           <TabsTrigger value="produtos" className="flex items-center gap-1">
//             <Package2 className="h-4 w-4" />
//             <span className="hidden md:inline">Produtos</span>
//           </TabsTrigger>
//         </TabsList>
        
//         {/* Conteúdo das abas */}
//         <TabsContent value="vendas" className="mt-0">
//           <Card>
//             <CardHeader className="pb-0">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <ShoppingCart className="h-5 w-5 text-green-600" />
//                 Vendas em {estatisticas.nomeEstado}
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               {estatisticas.vendas.length > 0 ? (
//                 <div className="rounded-md border overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Código</TableHead>
//                         <TableHead>Data</TableHead>
//                         <TableHead>Cliente</TableHead>
//                         <TableHead>Vendedor</TableHead>
//                         <TableHead className="text-right">Valor</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {estatisticas.vendas.map((venda) => (
//                         <TableRow key={venda.id}>
//                           <TableCell className="font-medium">{venda.codigoVenda}</TableCell>
//                           <TableCell>{format(new Date(venda.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
//                           <TableCell>{venda.cliente}</TableCell>
//                           <TableCell>{venda.vendedor}</TableCell>
//                           <TableCell className="text-right">{formatarValorBRL(venda.valorTotal)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
//                   <p>Nenhuma venda encontrada</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
        
//         <TabsContent value="clientes" className="mt-0">
//           <Card>
//             <CardHeader className="pb-0">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <Users className="h-5 w-5 text-blue-600" />
//                 Clientes em {estatisticas.nomeEstado}
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               {estatisticas.clientes.length > 0 ? (
//                 <div className="rounded-md border overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Nome</TableHead>
//                         <TableHead>Segmento</TableHead>
//                         <TableHead>CNPJ</TableHead>
//                         <TableHead>Compras</TableHead>
//                         <TableHead>Recorrente</TableHead>
//                         <TableHead className="text-right">Valor Total</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {estatisticas.clientes
//                         .sort((a, b) => b.valorTotal - a.valorTotal)
//                         .map((cliente) => (
//                         <TableRow key={cliente.id}>
//                           <TableCell className="font-medium">{cliente.nome}</TableCell>
//                           <TableCell>{cliente.segmento}</TableCell>
//                           <TableCell>{cliente.cnpj}</TableCell>
//                           <TableCell>{cliente.quantidadeCompras}</TableCell>
//                           <TableCell>
//                             {cliente.recorrente ? (
//                               <Badge className="bg-green-100 text-green-800">Sim</Badge>
//                             ) : (
//                               <Badge variant="outline">Não</Badge>
//                             )}
//                           </TableCell>
//                           <TableCell className="text-right">{formatarValorBRL(cliente.valorTotal)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <Users className="h-8 w-8 mx-auto mb-2" />
//                   <p>Nenhum cliente encontrado</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
        
//         <TabsContent value="vendedores" className="mt-0">
//           <Card>
//             <CardHeader className="pb-0">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <User className="h-5 w-5 text-purple-600" />
//                 Vendedores em {estatisticas.nomeEstado}
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               {estatisticas.vendedores.length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {estatisticas.vendedores.map((vendedor, index) => (
//                     <motion.div
//                       key={vendedor.id}
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ duration: 0.2, delay: index * 0.05 }}
//                     >
//                       <Card className="hover:shadow-md transition-shadow">
//                         <CardContent className="p-4">
//                           <div className="flex justify-between items-start">
//                             <div className="flex items-center gap-3">
//                               <div className="w-10 h-10 rounded-full bg-[#00446A] text-white flex items-center justify-center">
//                                 {vendedor.nome
//                                   .split(" ")
//                                   .map((n) => n[0])
//                                   .join("")
//                                   .substring(0, 2)
//                                   .toUpperCase()}
//                               </div>
//                               <div>
//                                 <p className="font-medium">{vendedor.nome}</p>
//                                 <p className="text-sm text-gray-500">{vendedor.email}</p>
//                               </div>
//                             </div>
//                             <Badge className="bg-[#97C31D]">
//                               {vendedor.quantidadeVendas} vendas
//                             </Badge>
//                           </div>
//                           <div className="mt-4 flex justify-between items-center">
//                             <div>
//                               <p className="text-sm text-gray-500">Valor Total</p>
//                               <p className="font-medium">{formatarValorBRL(vendedor.valorTotal)}</p>
//                             </div>
//                             <div>
//                               <p className="text-sm text-gray-500">Valor Médio</p>
//                               <p className="font-medium">
//                                 {formatarValorBRL(
//                                   vendedor.quantidadeVendas > 0
//                                     ? vendedor.valorTotal / vendedor.quantidadeVendas
//                                     : 0
//                                 )}
//                               </p>
//                             </div>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     </motion.div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <User className="h-8 w-8 mx-auto mb-2" />
//                   <p>Nenhum vendedor encontrado</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
        
//         <TabsContent value="segmentos" className="mt-0">
//           <Card>
//             <CardHeader className="pb-0">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <Tag className="h-5 w-5 text-amber-600" />
//                 Segmentos em {estatisticas.nomeEstado}
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               {estatisticas.segmentos.length > 0 ? (
//                 <div className="rounded-md border overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Segmento</TableHead>
//                         <TableHead>Quantidade de Vendas</TableHead>
//                         <TableHead>% do Total</TableHead>
//                         <TableHead className="text-right">Valor Total</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {estatisticas.segmentos.map((segmento) => (
//                         <TableRow key={segmento.nome}>
//                           <TableCell className="font-medium">{segmento.nome}</TableCell>
//                           <TableCell>{segmento.quantidade}</TableCell>
//                           <TableCell>
//                             <Badge variant="outline">
//                               {((segmento.quantidade / estatisticas.totalVendas) * 100).toFixed(1)}%
//                             </Badge>
//                           </TableCell>
//                           <TableCell className="text-right">{formatarValorBRL(segmento.valorTotal)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <Tag className="h-8 w-8 mx-auto mb-2" />
//                   <p>Nenhum segmento encontrado</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
        
//         <TabsContent value="produtos" className="mt-0">
//           <Card>
//             <CardHeader className="pb-0">
//               <CardTitle className="text-lg flex items-center gap-2">
//                 <Package2 className="h-5 w-5 text-[#00446A]" />
//                 Produtos em {estatisticas.nomeEstado}
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               {estatisticas.produtos.length > 0 ? (
//                 <div className="rounded-md border overflow-hidden">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Produto</TableHead>
//                         <TableHead>Quantidade</TableHead>
//                         <TableHead>% do Total</TableHead>
//                         <TableHead className="text-right">Valor Total</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {estatisticas.produtos.map((produto) => {
//                         const totalQtd = estatisticas.produtos.reduce((sum, p) => sum + p.quantidade, 0);
//                         return (
//                           <TableRow key={produto.nome}>
//                             <TableCell className="font-medium">{produto.nome}</TableCell>
//                             <TableCell>{produto.quantidade}</TableCell>
//                             <TableCell>
//                               <Badge variant="outline">
//                                 {((produto.quantidade / totalQtd) * 100).toFixed(1)}%
//                               </Badge>
//                             </TableCell>
//                             <TableCell className="text-right">{formatarValorBRL(produto.valorTotal)}</TableCell>
//                           </TableRow>
//                         );
//                       })}
//                     </TableBody>
//                   </Table>
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-gray-500">
//                   <Package2 className="h-8 w-8 mx-auto mb-2" />
//                   <p>Nenhum produto encontrado</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
      
//       <div className="flex justify-end">
//         <Button onClick={onClose} className="bg-[#00446A] text-white hover:bg-[#00446A]/90">
//           Fechar
//         </Button>
//       </div>
//     </div>
//   );
// };