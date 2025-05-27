/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  ShoppingCart,
  Package2,
  UserRoundSearch,
  Target,
  UserCheck,
  DollarSign,
  FileBarChart,
  BarChart3,
  FileText,
  Settings,
  Lock,
  Boxes,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { UsuarioRole } from "@/types/usuario";

type SidebarItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
};

type SidebarProps = {
  usuario: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export function Sidebar({ usuario }: SidebarProps) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const pathname = usePathname();
  const userRole = usuario?.role as UsuarioRole;
  const isAdmin = userRole === 'ADMIN';

  // Função para obter a primeira letra do nome
  const getInicialNome = (nome: string): string => {
    return nome ? nome.charAt(0).toUpperCase() : 'U';
  };

  // Efeito para resetar o caminho ativo quando a navegação for concluída
  useEffect(() => {
    setActivePath(null);
  }, [pathname]);

  const SidebarItem = ({ href, icon, label, disabled }: SidebarItemProps) => {
    const isActive = pathname === href;
    const isLoading = activePath === href;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      
      // Define o caminho ativo para mostrar o indicador de carregamento
      setActivePath(href);
    };

    if (disabled) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 text-gray-400 opacity-70 cursor-not-allowed">
          {icon}
          <span>{label}</span>
          <Lock className="w-4 h-4 ml-auto" />
        </div>
      );
    }

    return (
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative",
          isActive ? "bg-[#00446A] text-white shadow-2xs" : "hover:bg-[#00446A]/10"
        )}
      >
        {icon}
        <span>{label}</span>
        
        {isLoading && (
          <Loader2 
            className="w-6 h-6 ml-auto animate-spin text-[#00446A]" 
          />
        )}
        
        {isActive && (
          <motion.div
            className="absolute left-0 w-2 h-9 bg-[#9BC21B] rounded-r-lg"
            layoutId="activeIndicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </Link>
    );
  };

  return (
    <aside className="w-64 h-screen bg-white border-r rounded-tr-[3rem] rounded-br-[3rem] shadow-[0_0_20px_#00000017] border border-[#00446a2b] flex flex-col fixed">
      <div className="p-6 w-[100%] flex justify-center">
        <Image
          width={125}
          height={125}
          src="/logo-garden.png"
          alt="Garden Química"
          className="object-fit"
        />
      </div>

      <nav className="flex-1 py-3 space-y-2 px-2">
        {/* Painel - Apenas para ADMIN */}
        {isAdmin && (
          <SidebarItem
            href="/painel"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Painel"
          />
        )}
        
        {/* Funcionários - Apenas para ADMIN */}
        {isAdmin && (
          <SidebarItem
            href="/funcionarios"
            icon={<Users className="w-5 h-5" />}
            label="Funcionários"
          />
        )}
        
        {/* Vendas - Para ADMIN e VENDEDOR */}
        <SidebarItem
          href="/vendas"
          icon={<ShoppingCart className="w-5 h-5" />}
          label="Vendas"
        />
        
        {/* Produtos - Apenas para ADMIN */}
        {isAdmin && (
          <SidebarItem 
            href="/produtos" 
            icon={<Boxes className="w-5 h-5" />} 
            label="Produtos"  
          />
        )}
        
        {/* Clientes - Apenas para ADMIN */}
        {isAdmin && (
          <SidebarItem
            href="/clientes"
            icon={<UserRoundSearch className="w-5 h-5" />}
            label="Clientes"
          />
        )}
        
        {/* Estoque - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<Package2 className="w-5 h-5" />}
            label="Estoque"
            disabled
          />
        )} */}
        
        {/* Metas - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<Target className="w-5 h-5" />}
            label="Metas"
            disabled
          />
        )} */}
        
        {/* Clientes (UserCheck) - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<UserCheck className="w-5 h-5" />}
            label="Clientes"
            disabled
          />
        )} */}
        
        {/* Financeiro - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<DollarSign className="w-5 h-5" />}
            label="Financeiro"
            disabled
          />
        )} */}
        
        {/* Relatório - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<FileBarChart className="w-5 h-5" />}
            label="Relatório"
            disabled
          />
        )} */}
        
        {/* Estatísticas - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Estatísticas"
            disabled
          />
        )} */}
        
        {/* Gerar Orçamento - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<FileText className="w-5 h-5" />}
            label="Gerar Orçamento"
            disabled
          />
        )} */}
        
        {/* Configuração - Apenas para ADMIN */}
        {/* {isAdmin && (
          <SidebarItem
            href="#"
            icon={<Settings className="w-5 h-5" />}
            label="Configuração"
            disabled
          />
        )} */}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00446A] text-white flex items-center justify-center">
            <span className="text-sm font-medium">{getInicialNome(usuario?.name)}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{usuario?.name || 'Usuário'}</p>
            <p className="text-xs text-gray-500">{usuario?.email || 'email@example.com'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}