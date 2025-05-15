// src/components/ClienteRecorrenteSelect.tsx
'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getVendas } from '@/actions/venda-actions';

interface Cliente {
  id: string;
  nome: string;
}

interface ClienteRecorrenteSelectProps {
  onSelect: (clienteId: string, clienteNome: string) => void;
  className?: string;
  placeholder?: string;
}

export function ClienteRecorrenteSelect({
  onSelect,
  className,
  placeholder = "Selecione um cliente recorrente..."
}: ClienteRecorrenteSelectProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [clientesRecorrentes, setClientesRecorrentes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados de clientes recorrentes
  useEffect(() => {
    const carregarClientesRecorrentes = async () => {
      setLoading(true);
      setError(null);
      try {
        // Filtrar para obter apenas vendas recorrentes
        const result = await getVendas({ vendaRecorrente: true });
        
        if (result.success && result.vendas) {
          // Extrair clientes únicos das vendas recorrentes
          const clientesUnicos = new Map<string, Cliente>();
          
          result.vendas.forEach(venda => {
            if (!clientesUnicos.has(venda.cliente.id)) {
              clientesUnicos.set(venda.cliente.id, {
                id: venda.cliente.id,
                nome: venda.cliente.nome
              });
            }
          });
          
          setClientesRecorrentes(Array.from(clientesUnicos.values()));
        } else {
          setError('Não foi possível carregar os clientes recorrentes');
        }
      } catch (err) {
        console.error('Erro ao carregar clientes recorrentes:', err);
        setError('Erro ao carregar clientes recorrentes');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      carregarClientesRecorrentes();
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." className="h-9" />
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2">Carregando clientes...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-6 text-red-500">
                <AlertCircle className="h-6 w-6 mr-2" />
                <span>{error}</span>
              </div>
            ) : (
              "Nenhum cliente recorrente encontrado."
            )}
          </CommandEmpty>
          <CommandGroup>
            {clientesRecorrentes.map((cliente) => (
              <CommandItem
                key={cliente.id}
                value={cliente.id}
                onSelect={(currentValue) => {
                  setValue(currentValue);
                  setDisplayValue(cliente.nome);
                  setOpen(false);
                  onSelect(cliente.id, cliente.nome);
                }}
              >
                {cliente.nome}
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === cliente.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}