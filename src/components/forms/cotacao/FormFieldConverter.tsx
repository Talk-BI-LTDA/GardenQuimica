// components/forms/cotacao/FormFieldConverter.tsx
"use client";

import { 
  FieldPath, 
  FieldValues, 
  UseFormReturn 
} from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * Interface para um wrapper seguramente tipado para 
 * renderizar campos em formulários
 */
export interface TipoSeguroFormProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  form: UseFormReturn<TFieldValues>;
  name: TName;
  label: string;
  renderInput: (field: {
    value: string;
    onChange: (value: string) => void;
  }) => React.ReactNode;
}

/**
 * Componente que permite renderizar campos de formulário de maneira 
 * seguramente tipada, sem necessidade de usar "any"
 */
export function FormFieldTipado<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  form,
  name,
  label,
  renderInput,
}: TipoSeguroFormProps<TFieldValues, TName>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {renderInput({
              value: field.value as string,
              onChange: field.onChange,
            })}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

