"use client"

import type React from "react"
import { useState } from "react"
import {
  Home,
  FileText,
  Truck,
  HelpCircle,
  Plus,
  Zap,
  Clock,
  Gift,
  MessageCircle,
  Phone,
  BookOpen,
  Check,
  Loader2,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

export function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<"hub" | "licitaciones" | "seguimiento" | "soporte">("hub")

  // Data ficticia
  const licitacionesCiegas = [
    {
      id: "LC-9477",
      material: "Electrónica de Consumo",
      fob: "$8,500 USD",
      volumen: "0.45 m³",
      peso: "85 kg",
      estado: "Buscando ofertas",
    },
    {
      id: "LC-9312",
      material: "Repuestos Automotrices",
      fob: "$12,300 USD",
      volumen: "1.2 m³",
      peso: "240 kg",
      estado: "3 ofertas recibidas",
    },
  ]

  const ofertasRecibidas = [
    {
      id: "LC-8312",
      material: "Repuestos Auto (Eje Delantero)",
      fob: "$6,800 USD",
      volumen: "0.65 m³",
      ofertas: 5,
    },
  ]

  const enviosEnCurso = [
    {
      id: "LC-1092",
      material: "Indumentaria Textil",
      etapas: [
        { nombre: "Recogido", completada: true },
        { nombre: "Despachado", completada: true },
        { nombre: "Aduana", completada: false, activa: true },
        { nombre: "En Viaje", completada: false },
        { nombre: "Entregado", completada: false },
      ],
      etapaActual: 2,
    },
  ]

  const handleVerOfertas = () => {
    window.location.href = "/ofertas"
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 sm:p-8">
      {/* PhoneFrame Container */}
      <div className="relative w-full max-w-[440px] h-[900px] bg-background rounded-[54px] border-[12px] border-black shadow-2xl overflow-hidden flex flex-col">
        
        {/* Fondo sutil con patrón (Flighty style) */}
        <div className="absolute inset-0 opacity-3 pointer-events-none">
          <svg viewBox="0 0 1000 1000" className="w-full h-full">
            <defs>
              <pattern id="grid" x="100" y="100" width="200" height="200" patternUnits="userSpaceOnUse">
                <circle cx="100" cy="100" r="30" fill="none" stroke="white" strokeWidth="0.5" />
                <path d="M 50 100 Q 100 60 150 100" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1000" height="1000" fill="url(#grid)" />
          </svg>
        </div>

        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-56 h-7 bg-black rounded-b-3xl flex items-center justify-center border border-border/30">
          <div className="text-[10px] text-foreground/30 font-medium">LogiChina</div>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 flex flex-col overflow-hidden pt-10 pb-24">
          
          {/* SECCIÓN HUB */}
          {activeTab === "hub" && (
            <div className="flex-1 overflow-y-auto px-5 space-y-6">
              {/* Header Premium */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground/60">Importador</span>
                  <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded text-xs font-medium text-primary">
                    #IMP-8392 ✓
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Bienvenido de vuelta</h1>
              </div>

              {/* Métrica rápida */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground/60 font-medium">Mis Cargas</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">7</div>
                </div>

                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-foreground/60 font-medium">Ofertas Nuevas</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-500">12</div>
                </div>

                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-foreground/60 font-medium">En Camino</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">3</div>
                </div>

                <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-foreground/50" />
                    <span className="text-xs text-foreground/60 font-medium">Ayuda</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground/40">24/7</div>
                </div>
              </div>

              {/* CTA Principal */}
              <button className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-95">
                <Plus className="w-5 h-5" />
                Nueva Postulación Logística
              </button>

              <div className="pb-6" />
            </div>
          )}

          {/* SECCIÓN LICITACIONES */}
          {activeTab === "licitaciones" && (
            <div className="flex-1 overflow-y-auto px-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Licitaciones Ciegas</h2>
                <p className="text-xs text-foreground/50">Ofertas anónimas en espera</p>
              </div>

              {licitacionesCiegas.map((licit) => (
                <div key={licit.id} className="p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-foreground">{licit.id}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs text-foreground/60 mb-2">{licit.material}</p>
                  <div className="flex gap-2 text-xs text-foreground/50 mb-2">
                    <span>{licit.fob}</span>
                    <span>•</span>
                    <span>{licit.volumen}</span>
                    <span>•</span>
                    <span>{licit.peso}</span>
                  </div>
                  <div className="text-xs font-medium text-primary/70">{licit.estado}</div>
                </div>
              ))}

              {/* Ofertas Recibidas */}
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-sm font-bold text-foreground mb-3">Ofertas Recibidas</h3>
                {ofertasRecibidas.map((oferta) => (
                  <div key={oferta.id} className="p-4 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">{oferta.id}</span>
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded">{oferta.ofertas} ofertas</span>
                    </div>
                    <p className="text-xs text-foreground/60 mb-2">{oferta.material}</p>
                    <div className="flex gap-2 text-xs text-foreground/50 mb-3">
                      <span>{oferta.fob}</span>
                      <span>•</span>
                      <span>{oferta.volumen}</span>
                    </div>
                    <button
                      onClick={handleVerOfertas}
                      className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 transition-colors active:scale-95"
                    >
                      Ver y Comparar Ofertas
                    </button>
                  </div>
                ))}
              </div>

              <div className="pb-6" />
            </div>
          )}

          {/* SECCIÓN SEGUIMIENTO */}
          {activeTab === "seguimiento" && (
            <div className="flex-1 overflow-y-auto px-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Seguimiento de Envíos</h2>
                <p className="text-xs text-foreground/50">Estado en tiempo real</p>
              </div>

              {enviosEnCurso.map((envio) => (
                <div key={envio.id} className="p-4 bg-card border border-border rounded-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-bold text-foreground">{envio.id}</span>
                      <p className="text-xs text-foreground/60 mt-1">{envio.material}</p>
                    </div>
                  </div>

                  {/* Timeline vertical */}
                  <div className="space-y-3">
                    {envio.etapas.map((etapa, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            etapa.completada
                              ? "bg-primary border-primary"
                              : etapa.activa
                                ? "border-primary bg-primary/10"
                                : "border-border bg-transparent"
                          }`}>
                            {etapa.completada && <Check className="w-3 h-3 text-primary-foreground" />}
                            {etapa.activa && !etapa.completada && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                          </div>
                          {idx < envio.etapas.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 ${
                              etapa.completada ? "bg-primary" : "bg-border"
                            }`} />
                          )}
                        </div>
                        <div className="pt-0.5">
                          <p className={`text-xs font-semibold ${
                            etapa.completada ? "text-primary" : etapa.activa ? "text-primary" : "text-foreground/50"
                          }`}>
                            {etapa.nombre}
                          </p>
                          {etapa.activa && <p className="text-xs text-primary/70 mt-0.5">En proceso...</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pb-6" />
            </div>
          )}

          {/* SECCIÓN SOPORTE */}
          {activeTab === "soporte" && (
            <div className="flex-1 overflow-y-auto px-5 space-y-3">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Centro de Soporte</h2>
                <p className="text-xs text-foreground/50">Disponible 24/7</p>
              </div>

              <button className="w-full p-4 bg-card border border-border rounded-lg hover:border-primary/40 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Chat en vivo</p>
                    <p className="text-xs text-foreground/50">Respuesta inmediata</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" />
              </button>

              <button className="w-full p-4 bg-card border border-border rounded-lg hover:border-primary/40 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">WhatsApp</p>
                    <p className="text-xs text-foreground/50">+54 9 11 XXXX-XXXX</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" />
              </button>

              <button className="w-full p-4 bg-card border border-border rounded-lg hover:border-primary/40 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Documentación</p>
                    <p className="text-xs text-foreground/50">Guías y tutoriales</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" />
              </button>

              <div className="pb-6" />
            </div>
          )}
        </div>

        {/* iOS Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background to-background/80 border-t border-border/30 flex items-end">
          <div className="w-full flex justify-around items-end pb-4 px-2">
            <button
              onClick={() => setActiveTab("hub")}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all ${
                activeTab === "hub"
                  ? "text-primary"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Hub</span>
            </button>

            <button
              onClick={() => setActiveTab("licitaciones")}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all ${
                activeTab === "licitaciones"
                  ? "text-primary"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Licitaciones</span>
            </button>

            <button
              onClick={() => setActiveTab("seguimiento")}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all ${
                activeTab === "seguimiento"
                  ? "text-primary"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              <Truck className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Seguimiento</span>
            </button>

            <button
              onClick={() => setActiveTab("soporte")}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all ${
                activeTab === "soporte"
                  ? "text-primary"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Soporte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mini componente reutilizable si se necesita en futuro
function Box({ className }: { className?: string }) {
  return <FileText className={className} />
}
