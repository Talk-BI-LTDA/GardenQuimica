import type React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TagIcon, ChevronDown, X, SearchIcon, Filter } from "lucide-react";
import { getCatalogoItens } from "@/actions/catalogo-actions";

const etiquetasMockadas = [
  "Ácido Esteárico Dupla Pressão Vegetal (Garden AE D - Vegetal)",
  "Ácido Esteárico Dupla Pressão Animal (Garden AE T)",
  "Ácido Esteárico Tripla Pressão Vegetal (Garden AE T - Vegetal)",
  "Ácido Esteárico Tripla Pressão Animal (Garden AE T)",
  "Ácido Glioxílico",
  "Ácido Sulfônico 90 (Garden Pon LAS 90)",
  "Álcool Cereais (Garden Alc Cereais)",
  "Álcool Cetílico",
  "Álcool Ceto Estearílico 30/70",
  "Álcool Ceto Etoxilado (Garden ACE - 200F)",
  "Álcool Etílico Anidro 99 (Garden Alc 99)",
  "Álcool Etílico Hidratado 96 (Garden Alc 96)",
  "Álcool Polivinílico (Garden APV Pó)",
  "Amida 60 (Garden MID DC 60)",
  "Amida 80 (Garden MID DC 80)",
  "Amida 90 (Garden MID DC 90)",
  "Base Amaciante (Garden Quat)",
  "Base Amaciante (Garden Quat Plus)",
  "Base Perolada (Garden Pon BP)",
  "Betaína 30% (Garden Ampho CB Plus)",
  "Cloreto de Sódio Micronizado sem Iodo",
  "Conservante Cosméticos (Garden CC20)",
  "D-Pantenol - Vitamina B5",
  "EDTA Dissídico",
  "Espessante Sintético (Garden Pon APV)",
  "Formol Inibido 37%",
  "Glicerina Bi Destilada Grau USP",
  "Lauril 27% (Garden Pon LESS 27)",
  "Lauril Éter Sulfato de Sódio 70% (Garden Pon LESS 70)",
  "Lauril Éter Sulfossuccinato de Sódio (Garden Pon SGC)",
  "Massa de Vela (Garden MV)",
  "Óleo Mineral",
  "MYRJ",
  "Poliquaternium 7",
  "Substituto da Trietanolamina (ALC 85)",
  "Monoetilenoglicol",
  "Quaternário 16-50 e 16-29",
  "Renex",
];

const formatarNomeEtiqueta = (nome: string): string => {
  return nome
    .replace(/[_-]/g, " ")
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

interface EtiquetasFilterProps {
  etiquetasSelecionadas: string[];
  onEtiquetasChange: (novasEtiquetas: string[]) => void;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

const EtiquetasFilter: React.FC<EtiquetasFilterProps> = ({
  etiquetasSelecionadas,
  onEtiquetasChange,
  className,
  triggerClassName,
  contentClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTermDropdown, setSearchTermDropdown] = useState("");
  const [todasEtiquetasDisponiveis, setTodasEtiquetasDisponiveis] = useState<
    string[]
  >(() => [...etiquetasMockadas].sort((a, b) => a.localeCompare(b)));

  useEffect(() => {
    const carregarEtiquetasDoCatalogo = async () => {
      try {
        const resProdutos = await getCatalogoItens("produto");
        if (resProdutos.success && resProdutos.itens) {
          const produtosDoSistema = resProdutos.itens.map((item) => item.nome);
          const etiquetasCombinadas = [
            ...new Set([...etiquetasMockadas, ...produtosDoSistema]),
          ].sort((a, b) => a.localeCompare(b));
          setTodasEtiquetasDisponiveis(etiquetasCombinadas);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar etiquetas do catálogo no EtiquetasFilter:",
          error
        );
      }
    };
    carregarEtiquetasDoCatalogo();
  }, []);

  const handleToggleEtiqueta = (etiquetaNome: string) => {
    const novasSelecionadas = etiquetasSelecionadas.includes(etiquetaNome)
      ? etiquetasSelecionadas.filter((e) => e !== etiquetaNome)
      : [...etiquetasSelecionadas, etiquetaNome];
    onEtiquetasChange(novasSelecionadas.sort((a, b) => a.localeCompare(b)));
  };

  const etiquetasFiltradasParaSelecao = useMemo(() => {
    return todasEtiquetasDisponiveis.filter(
      (etiqueta) =>
        etiqueta.toLowerCase().includes(searchTermDropdown.toLowerCase()) ||
        formatarNomeEtiqueta(etiqueta)
          .toLowerCase()
          .includes(searchTermDropdown.toLowerCase())
    );
  }, [todasEtiquetasDisponiveis, searchTermDropdown]);

  const clearSelection = () => {
    onEtiquetasChange([]);
    setSearchTermDropdown("");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`
             justify-between items-center 
             transition-all duration-200 ease-in-out
             shadow-sm hover:shadow-md
             w-auto max-w-[200px] md:max-w-[250px]
             ${
               etiquetasSelecionadas.length > 0
                 ? "border-[#074366] bg-[#074366]/5"
                 : ""
             }
            ${className || triggerClassName || ""}
          `}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`
                p-1.5 rounded-md transition-colors duration-200 shrink-0
                ${
                  etiquetasSelecionadas.length > 0
                    ? "bg-[#074366] text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-[#074366]/20 group-hover:text-[#074366]"
                }
              `}
            >
              <Filter className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide leading-none">
                Filtrar por
              </span>
              <div className="w-full mt-0.5 min-w-0">
                {etiquetasSelecionadas.length === 0 ? (
                  <span className="text-sm font-medium text-slate-700">
                    Etiquetas
                  </span>
                ) : (
                  <div className="flex items-center gap-1 min-w-0">
                    <Badge className="bg-[#074366] text-white border-0 py-0.5 px-2 text-xs font-medium shrink-0">
                      {etiquetasSelecionadas.length}
                    </Badge>
                    <span className="text-sm font-medium text-[#074366] truncate">
                      {etiquetasSelecionadas.length === 1
                        ? "1 selecionada"
                        : `${etiquetasSelecionadas.length} selecionadas`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`
              h-4 w-4 text-slate-400 transition-all duration-200 shrink-0 ml-2
              ${
                open
                  ? "rotate-180 text-[#074366]"
                  : "group-hover:text-[#074366]"
              }
            `}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={`
          w-[300px] sm:w-[400px] md:w-[450px] p-0 border-2 border-slate-200 shadow-xl bg-white
          ${contentClassName || ""}
        `}
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header com busca */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-[#074366]/5 to-[#074366]/10">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#074366]/60" />
            <Input
              placeholder="Buscar etiquetas..."
              value={searchTermDropdown}
              onChange={(e) => setSearchTermDropdown(e.target.value)}
              className="
                pl-10 pr-4 h-10 border-2 border-slate-200 
                focus:border-[#074366] focus:ring-2 focus:ring-[#074366]/20
                bg-white transition-all duration-200
              "
              aria-label="Buscar etiqueta"
            />
          </div>

          {/* Tags selecionadas */}
          {etiquetasSelecionadas.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#074366] uppercase tracking-wide">
                  Selecionadas ({etiquetasSelecionadas.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto p-2 rounded-lg bg-white/60 border border-slate-200">
                {etiquetasSelecionadas.map((et) => (
                  <Badge
                    key={`selected-${et}`}
                    className="
                      flex items-center gap-1.5 py-1.5 px-2.5 text-xs font-medium
                      bg-[#074366] text-white transition-colors shadow-sm
                    "
                  >
                    <span className="truncate max-w-[120px]">
                      {formatarNomeEtiqueta(et)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEtiqueta(et);
                      }}
                      className="
                        text-white/80 hover:text-white rounded-full 
                        hover:bg-white/20 p-0.5 transition-colors duration-200
                        focus:outline-none focus:ring-1 focus:ring-white/50
                      "
                      aria-label={`Remover ${formatarNomeEtiqueta(et)}`}
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista de opções */}
        <ScrollArea className="h-[280px]">
          <div className="py-2">
            {etiquetasFiltradasParaSelecao.length === 0 && (
              <div className="p-6 text-center">
                <TagIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">
                  {todasEtiquetasDisponiveis.length === 0
                    ? "Nenhuma etiqueta disponível."
                    : `Nenhuma etiqueta encontrada para "${searchTermDropdown}"`}
                </p>
              </div>
            )}
            {etiquetasFiltradasParaSelecao.map((etiqueta) => {
              const idSeguro = `etiqueta-cb-${etiqueta.replace(/\W/g, "_")}`;
              const isSelected = etiquetasSelecionadas.includes(etiqueta);
              return (
                <div
                  key={etiqueta}
                  onClick={() => handleToggleEtiqueta(etiqueta)}
                  className={`
                    cursor-pointer px-4 py-3 mx-2 my-0.5 rounded-lg
                    transition-all duration-200 flex items-center gap-3
                    border-l-4 border-transparent
                    ${
                      isSelected
                        ? "bg-[#074366]/10 border-l-[#074366] text-[#074366]"
                        : "hover:bg-slate-50 hover:border-l-[#074366]/30 text-slate-700"
                    }
                  `}
                >
                  <Checkbox
                    checked={isSelected}
                    className={`
                      shrink-0 border-2 transition-colors duration-200
                      ${
                        isSelected
                          ? "border-[#074366] bg-[#074366] text-white"
                          : "border-slate-300 hover:border-[#074366]"
                      }
                    `}
                    id={idSeguro}
                    aria-labelledby={`${idSeguro}-label`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={idSeguro}
                    id={`${idSeguro}-label`}
                    className="cursor-pointer w-full font-medium text-sm leading-relaxed transition-colors duration-200"
                  >
                    {formatarNomeEtiqueta(etiqueta)}
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer com ação de limpar */}
        {etiquetasSelecionadas.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-slate-200" />
            <div className="p-2 bg-slate-50/50">
              <DropdownMenuItem
                onClick={clearSelection}
                className="
                  text-red-600 cursor-pointer rounded-lg mx-1 py-2.5 px-3
                  hover:bg-red-50 hover:text-red-700 
                  focus:bg-red-50 focus:text-red-700
                  transition-colors duration-200 font-medium
                  flex items-center gap-2
                "
              >
                <X className="h-4 w-4" />
                Limpar seleção ({etiquetasSelecionadas.length})
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EtiquetasFilter;