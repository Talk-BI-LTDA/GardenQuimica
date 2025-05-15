"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface PageTransitionProps {
  children: React.ReactNode
}

const FADE_DURATION = 600 // Duração da animação de saída

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Função que será chamada quando a página estiver completamente carregada
    const handlePageLoad = () => {
      // Inicia a animação de saída
      setExiting(true)

      // Remove o loader após a animação terminar
      setTimeout(() => {
        setLoading(false)
      }, FADE_DURATION)
    }

    // Se o documento já estiver carregado (como em navegações client-side)
    if (document.readyState === "complete") {
      handlePageLoad()
    } else {
      // Caso contrário, aguarda o evento 'load'
      window.addEventListener("load", handlePageLoad)
      return () => {
        window.removeEventListener("load", handlePageLoad)
      }
    }
  }, [])

  // Se não estiver carregando, apenas renderiza os filhos
  if (!loading) {
    return <>{children}</>
  }

  return (
    <>
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center z-[9999] bg-[rgba(0,68,106,0.9)] ${
          exiting ? "animate-preloader-exit" : ""
        }`}
      >
        <div className={`relative ${exiting ? "animate-loader-exit" : ""}`}>
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 opacity-75 blur-lg"></div>
          <Loader2 className="relative h-16 w-16 animate-spin text-white" />
        </div>
        <p className={`mt-6 text-white text-xl font-medium ${exiting ? "animate-text-exit" : ""}`}>Carregando...</p>
      </div>
      {/* Renderiza os filhos mesmo durante o carregamento para que eles possam começar a carregar */}
      <div className={loading ? "invisible" : "visible"}>{children}</div>
    </>
  )
}

export default PageTransition
