'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { periodosPreDefinidos, FiltroPeriodo } from '@/types/filtros';

interface PeriodoSelectorProps {
  value?: DateRange;
  onChange: (value: DateRange | undefined) => void;
  onApply?: () => void;
  size?: 'default' | 'sm';
  buttonClassName?: string;
  closeOnSelect?: boolean;
}

export function PeriodoSelector({ 
  value, 
  onChange, 
  onApply, 
  size = 'default', 
  buttonClassName = '',
  closeOnSelect = false
}: PeriodoSelectorProps) {
  const [open, setOpen] = useState(false);

  const formatarPeriodoSelecionado = (): string => {
    if (!value?.from) return "Selecionar período";
    
    if (value.to) {
      const from = format(value.from, "dd/MM/yyyy", { locale: ptBR });
      const to = format(value.to, "dd/MM/yyyy", { locale: ptBR });
      return `${from} - ${to}`;
    }
    
    return format(value.from, "dd/MM/yyyy", { locale: ptBR });
  };

  const aplicarPeriodo = (periodo: FiltroPeriodo) => {
    const newRange = {
      from: periodo.dataInicio,
      to: periodo.dataFim
    };
    
    onChange(newRange);
    
    if (closeOnSelect) {
      setOpen(false);
      if (onApply) {
        onApply();
      }
    }
  };

  const botaoClassName = size === 'sm' 
    ? `h-8 text-xs ${buttonClassName}` 
    : `h-10 ${buttonClassName}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`justify-start text-left font-normal ${botaoClassName}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatarPeriodoSelecionado()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 border-b">
          <div className="space-y-2">
            <h4 className="font-medium">Períodos predefinidos</h4>
            <div className="grid grid-cols-2 gap-2">
              {periodosPreDefinidos.map((periodo) => (
                <Button
                  key={periodo.value}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => aplicarPeriodo(periodo)}
                >
                  {periodo.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <CalendarComponent
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={(range) => {
            onChange(range);
            if (closeOnSelect && range?.from && range.to) {
              setOpen(false);
              if (onApply) {
                onApply();
              }
            }
          }}
          numberOfMonths={2}
          locale={ptBR}
        />
        {!closeOnSelect && (
          <div className="p-3 border-t flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onChange(undefined);
              }}
            >
              Limpar
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                setOpen(false);
                if (onApply) {
                  onApply();
                }
              }}
            >
              Aplicar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}