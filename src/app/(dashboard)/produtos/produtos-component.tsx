"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Boxes,
  PlusCircle,
  Trash2,
  Edit,
  Check,
  LayoutList,
  Repeat,
  Building,
  CreditCard,
  AlertCircle,
  Loader2,
  Shield,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Importando as funções originais do backend
import {
  getCatalogoItens,
  adicionarCatalogoItem,
  atualizarCatalogoItem,
  excluirCatalogoItem,
} from "@/actions/catalogo-actions"

// Tipagem para as entidades de catálogo
interface CatalogoItem {
  id: string
  nome: string
  createdAt: string
  createdBy: string
}

// Tipos para as abas
type TabType = "produtos" | "medidas" | "recorrencias" | "segmentos" | "pagamentos" | "objecoes"

// Tipagem para API de catálogo
type CatalogoTipo = "produto" | "medida" | "recorrencia" | "segmento" | "pagamento" | "objecao"

// Mapeamento de tipos de abas para tipos de ação do servidor
const tipoMapeamento: Record<TabType, CatalogoTipo> = {
  produtos: "produto",
  medidas: "medida",
  recorrencias: "recorrencia",
  segmentos: "segmento",
  pagamentos: "pagamento",
  objecoes: "objecao",
}

// Componente principal
export default function ProdutosPage({ session }: { session: { user: { role: string } } | null }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("produtos")
  const [loading, setLoading] = useState(true)

  // Verificação de permissão
  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/vendas")
    } else {
      setLoading(false)
    }
  }, [session, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#185678]" />
      </div>
    )
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-96">
        <Shield className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 text-center max-w-md">
          Esta área é restrita apenas para administradores do sistema.
        </p>
      </div>
    )
  }

  // Renderizar o conteúdo da aba ativa
  const renderActiveTab = () => {
    switch (activeTab) {
      case "produtos":
        return <CatalogoTabela tipo="produtos" titulo="Produtos" icone={<Boxes className="h-5 w-5" />} />
      case "medidas":
        return <CatalogoTabela tipo="medidas" titulo="Tipos de Medidas" icone={<LayoutList className="h-5 w-5" />} />
      case "recorrencias":
        return <CatalogoTabela tipo="recorrencias" titulo="Recorrências" icone={<Repeat className="h-5 w-5" />} />
      case "segmentos":
        return (
          <CatalogoTabela tipo="segmentos" titulo="Segmentos da Empresa" icone={<Building className="h-5 w-5" />} />
        )
      case "pagamentos":
        return (
          <CatalogoTabela
            tipo="pagamentos"
            titulo="Condições de Pagamento"
            icone={<CreditCard className="h-5 w-5" />}
          />
        )
      case "objecoes":
        return <CatalogoTabela tipo="objecoes" titulo="Objeções" icone={<AlertCircle className="h-5 w-5" />} />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Catálogo</h1>
        <Badge variant="secondary" className="transition-[300ms] bg-[#185678]/20 text-[#185678] hover:bg-[#185678]/50">
          Acesso Administrativo
        </Badge>
      </div>

      {/* Tabs customizados */}
      <div className="relative mb-6 border-b">
        <div className="flex overflow-x-auto">
          <TabButton
            label="Produtos"
            active={activeTab === "produtos"}
            onClick={() => setActiveTab("produtos")}
            icon={<Boxes className="h-4 w-4 mr-2" />}
          />
          <TabButton
            label="Medidas"
            active={activeTab === "medidas"}
            onClick={() => setActiveTab("medidas")}
            icon={<LayoutList className="h-4 w-4 mr-2" />}
          />
          <TabButton
            label="Recorrências"
            active={activeTab === "recorrencias"}
            onClick={() => setActiveTab("recorrencias")}
            icon={<Repeat className="h-4 w-4 mr-2" />}
          />
          <TabButton
            label="Segmentos"
            active={activeTab === "segmentos"}
            onClick={() => setActiveTab("segmentos")}
            icon={<Building className="h-4 w-4 mr-2" />}
          />
          <TabButton
            label="Pagamentos"
            active={activeTab === "pagamentos"}
            onClick={() => setActiveTab("pagamentos")}
            icon={<CreditCard className="h-4 w-4 mr-2" />}
          />
          <TabButton
            label="Objeções"
            active={activeTab === "objecoes"}
            onClick={() => setActiveTab("objecoes")}
            icon={<AlertCircle className="h-4 w-4 mr-2" />}
          />
        </div>
      </div>

      {/* Conteúdo da tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {renderActiveTab()}
      </motion.div>
    </div>
  )
}

// Componente de botão para tabs
interface TabButtonProps {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}

function TabButton({ label, active, onClick, icon }: TabButtonProps) {
  return (
    <button onClick={onClick} className="relative px-4 py-2 flex items-center">
      <div
        className={`flex items-center ${active ? "text-[#185678] font-medium" : "text-gray-500 hover:text-gray-700"}`}
      >
        {icon}
        {label}
      </div>
      {active && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#185678]"
          layoutId="activeTab"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  )
}

// Componente de tabela de catálogo
interface CatalogoTabelaProps {
  tipo: TabType
  titulo: string
  icone: React.ReactNode
}

function CatalogoTabela({ tipo, titulo, icone }: CatalogoTabelaProps) {
  // Estados para gerenciar a tabela
  const [itens, setItens] = useState<CatalogoItem[]>([])
  const [novoItemNome, setNovoItemNome] = useState("")
  const [itemEditando, setItemEditando] = useState<string | null>(null)
  const [nomeEditado, setNomeEditado] = useState("")
  const [loading, setLoading] = useState(false)
  const [carregandoItens, setCarregandoItens] = useState(true)

  // Carregar itens
  useEffect(() => {
    async function fetchItens() {
      setCarregandoItens(true)
      try {
        const tipoServidor = tipoMapeamento[tipo]
        const resultado = await getCatalogoItens(tipoServidor)
        if (resultado.error) {
          toast.error(resultado.error)
        } else {
          setItens(resultado.itens || [])
        }
      } catch (error) {
        console.error(`Erro ao carregar ${tipo}:`, error)
        toast.error(`Erro ao carregar ${tipo}`)
      } finally {
        setCarregandoItens(false)
      }
    }
    fetchItens()
  }, [tipo])

  // Adicionar novo item
  const adicionarItem = async () => {
    if (!novoItemNome.trim()) return
    setLoading(true)
    try {
      const tipoServidor = tipoMapeamento[tipo]
      const resultado = await adicionarCatalogoItem(tipoServidor, novoItemNome)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      // Atualizar a lista de itens
      const novosItens = await getCatalogoItens(tipoServidor)
      setItens(novosItens.itens || [])
      setNovoItemNome("")
      toast.success(`${titulo.slice(0, -1)} adicionado(a) com sucesso`)
    } catch (error) {
      console.error(`Erro ao adicionar ${tipo}:`, error)
      toast.error(`Erro ao adicionar ${tipo}`)
    } finally {
      setLoading(false)
    }
  }

  // Excluir item
  const excluirItem = async (id: string) => {
    if (!confirm(`Tem certeza que deseja excluir este(a) ${titulo.slice(0, -1).toLowerCase()}?`)) return
    setLoading(true)
    try {
      const tipoServidor = tipoMapeamento[tipo]
      const resultado = await excluirCatalogoItem(tipoServidor, id)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      // Atualizar a lista de itens
      setItens(itens.filter((item) => item.id !== id))
      toast.success(`${titulo.slice(0, -1)} excluído(a) com sucesso`)
    } catch (error) {
      console.error(`Erro ao excluir ${tipo}:`, error)
      toast.error(`Erro ao excluir ${tipo}`)
    } finally {
      setLoading(false)
    }
  }

  // Iniciar edição
  const iniciarEdicao = (item: CatalogoItem) => {
    setItemEditando(item.id)
    setNomeEditado(item.nome)
  }

  // Cancelar edição
  const cancelarEdicao = () => {
    setItemEditando(null)
    setNomeEditado("")
  }

  // Salvar edição
  const salvarEdicao = async () => {
    if (!nomeEditado.trim() || !itemEditando) return
    setLoading(true)
    try {
      const tipoServidor = tipoMapeamento[tipo]
      const resultado = await atualizarCatalogoItem(tipoServidor, itemEditando, nomeEditado)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      // Atualizar a lista de itens
      setItens(itens.map((item) => (item.id === itemEditando ? { ...item, nome: nomeEditado.trim() } : item)))
      setItemEditando(null)
      setNomeEditado("")
      toast.success(`${titulo.slice(0, -1)} atualizado(a) com sucesso`)
    } catch (error) {
      console.error(`Erro ao editar ${tipo}:`, error)
      toast.error(`Erro ao editar ${tipo}`)
    } finally {
      setLoading(false)
    }
  }

  // Formatar data
  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <motion.div
      className="bg-white rounded-lg border shadow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6">
        <div className="flex items-center mb-6">
          <motion.div whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
            {icone}
          </motion.div>
          <h2 className="text-xl font-semibold ml-2">{titulo}</h2>
        </div>

        {/* Formulário para adicionar novo item */}
        <div className="mb-6 flex gap-2 items-center">
          <Input
            type="text"
            value={novoItemNome}
            onChange={(e) => setNovoItemNome(e.target.value)}
            placeholder={`Adicionar novo ${titulo.slice(0, -1).toLowerCase()}...`}
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={adicionarItem}
            disabled={!novoItemNome.trim() || loading}
            className="bg-[#185678] hover:bg-[#185678]/80"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
            Adicionar
          </Button>
        </div>

        {/* Tabela de itens */}
        <div className="overflow-x-auto">
          {carregandoItens ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#185678]" />
              <span className="ml-2 text-gray-500">Carregando...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Data de criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.length > 0 ? (
                  itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {itemEditando === item.id ? (
                          <Input
                            type="text"
                            value={nomeEditado}
                            onChange={(e) => setNomeEditado(e.target.value)}
                            className="w-full"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{item.nome}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">{item.createdBy}</TableCell>
                      <TableCell className="text-gray-500">{formatarData(item.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {itemEditando === item.id ? (
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={salvarEdicao}
                              disabled={!nomeEditado.trim() || loading}
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1 h-8 w-8"
                            >
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              onClick={cancelarEdicao}
                              disabled={loading}
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 p-1 h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={() => iniciarEdicao(item)}
                              disabled={loading}
                              size="sm"
                              variant="ghost"
                              className="text-[#185678] hover:text-[#185678]/90 hover:bg-blue-50 p-1 h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => excluirItem(item.id)}
                              disabled={loading}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Nenhum item encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </motion.div>
  )
}
