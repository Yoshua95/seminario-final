"use client"

import { PostularCargaScreen } from "@/components/postular-carga-screen"

export default function Page() {
  const handleRedirect = () => {
    // Redirección inmediata y forzada al dashboard al activar el slider
    window.location.href = "/dashboard"
  }

  return <PostularCargaScreen onSuccess={handleRedirect} />
}