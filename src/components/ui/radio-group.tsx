"use client"

import * as React from "react"

// Definição de tipos com tipagem forte
export interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
}

// Componente RadioGroup 
export function RadioGroup({
  className,
  value,
  onValueChange,
  children
}: RadioGroupProps) {
  // Criamos um novo contexto para passar o valor e a função de mudança
  const radioContext = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange]);

  return (
    <div className={`grid gap-2 ${className || ''}`} role="radiogroup">
      <RadioContext.Provider value={radioContext}>
        {children}
      </RadioContext.Provider>
    </div>
  )
}

// Contexto para o RadioGroup
const RadioContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {}
});

// Hook para acessar o contexto
function useRadioContext() {
  const context = React.useContext(RadioContext);
  if (!context) {
    throw new Error('RadioGroupItem deve ser usado dentro de um RadioGroup');
  }
  return context;
}

// Componente RadioGroupItem
export function RadioGroupItem({
  className,
  value,
  id,
  ...props
}: RadioGroupItemProps) {
  const { value: groupValue, onValueChange } = useRadioContext();
  const checked = value === groupValue;
  
  return (
    <div className="flex items-center">
      <input
        type="radio"
        id={id || value}
        value={value}
        checked={checked}
        onChange={() => onValueChange(value)}
        className="sr-only"
        {...props}
      />
      <label
        htmlFor={id || value}
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${checked ? "border-[#00446A] bg-[#00446A]" : "border-gray-300 bg-white"} cursor-pointer ${className || ""}`}
        onClick={() => onValueChange(value)}
      >
        {checked && (
          <div className="h-2 w-2 rounded-full bg-white" />
        )}
      </label>
    </div>
  )
}