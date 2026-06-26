"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Plus, Eye, MapPin, Package, MessageCircle, Settings, Zap, TrendingUp, Globe } from "lucide-react"

interface Licitacion {
  id: string
  material: string
  fob: string
  volumen: string
  estado: "buscando" | "completada"
  ofertas?: number
}

interface Envio {
  id: string
  rubro: string
  etapas: Array<{ nombre: string; completada: boolean }>
  etapaActual: number
}

export function DashboardScreen() {
  const [tabActivo, setTabActivo] = useState<"dashboard" | "licitaciones" | "seguimiento" | "soporte">("dashboard")
  const containerRef = useRef<HTMLDivElement>(null)

  // Data ficticia
  const licitacionesCiegas: Licitacion[] = [
    {
      id: "LC-9477",
      material: "Componentes Electrónicos Shenzhen",
      fob: "8500 USD",
      volumen: "0.45 m³",
      estado: "buscando"
    },
    {
      id: "LC-9312",
      material: "Repuestos Automotrices Guangzhou",
      fob: "12300 USD",
      volumen: "1.2 m³",
      estado: "buscando"
    }
  ]

  const licitacionesConOfertas: Licitacion[] = [
    {
      id: "LC-8312",
      material: "Repuestos Auto (Eje Delantero)",
      fob: "6800 USD",
      volumen: "0.65 m³",
      estado: "completada",
      ofertas: 2
    }
  ]

  const enviosEnCurso: Envio[] = [
    {
      id: "LC-1092",
      rubro: "Indumentaria Textil",
      etapas: [
        { nombre: "Recogido", completada: true },
        { nombre: "Despachado", completada: true },
        { nombre: "Aduana", completada: false },
        { nombre: "En Viaje", completada: false },
        { nombre: "Entregado", completada: false }
      ],
      etapaActual: 2
    }
  ]

  return (
    <div className="fixed inset-0 bg-background">
      {/* iPhone Frame */}
      <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-8">
        <div
          ref={containerRef}
          className="relative w-full max-w-[440px] h-[900px] bg-background rounded-[54px] border-[12px] border-black shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Fondo con patrón de mapa oscuro (Flighty style) */}
          <svg
            className="absolute inset-0 w-full h-full opacity-5 pointer-events-none"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="world-grid" x="100" y="100" width="200" height="200" patternUnits="userSpaceOnUse">
                <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
                <path d="M 50 100 Q 100 50 150 100 Q 100 150 50 100" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
              </pattern>
            </defs>
            <rect width="1000" height="1000" fill="url(#world-grid)" />
          </svg>
          {/* Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-56 h-7 bg-black rounded-b-3xl flex items-center justify-center">
            <div className="text-[10px] text-white/40 font-medium">Conéctate</div>
          </div>

          {/* Contenido del Dashboard */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden pt-8">
            {/* Header */}
            <div className="px-6 pt-4 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h1 className="text-[16px] font-semibold text-foreground">Panel de Control</h1>
                  <p className="text-[12px] text-muted-foreground">#IMP-8392</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-primary-foreground">IP</span>
                  </div>
                  <div className="w-fit px-2 py-1 bg-primary/10 border border-primary/30 rounded-full flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-medium text-primary">Premium Verificado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido Desplazable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-none pb-24">
              {/* Acción Rápida */}
              <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                <Plus className="h-5 w-5" />
                Nueva Postulación Logística
              </button>

              {/* Licitaciones Ciegas en Curso */}
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Licitaciones Ciegas en Curso</h2>
                <div className="space-y-2">
                  {licitacionesCiegas.map((lic) => (
                    <div key={lic.id} className="bg-surface border border-border rounded-lg p-3.5 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-mono text-primary font-semibold">{lic.id}</p>
                          <p className="text-sm text-foreground mt-1">{lic.material}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-background rounded p-2">
                          <p className="text-muted-foreground">FOB</p>
                          <p className="font-mono text-foreground">{lic.fob}</p>
                        </div>
                        <div className="bg-background rounded p-2">
                          <p className="text-muted-foreground">Volumen</p>
                          <p className="font-mono text-foreground">{lic.volumen}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-medium text-amber-500">Buscando Ofertas (Mesa Ciega)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ofertas Recibidas */}
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Ofertas Recibidas</h2>
                <div className="bg-gradient-to-br from-primary/5 to-primary/0 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Cargas con Ofertas Listas</p>
                      <p className="text-sm font-semibold text-foreground">{licitacionesConOfertas[0].material}</p>
                    </div>
                    <div className="bg-primary/20 border border-primary/40 rounded-full px-2.5 py-1 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-xs font-bold text-primary">{licitacionesConOfertas[0].ofertas} Ofertas</span>
                    </div>
                  </div>
                  <button className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all">
                    <Eye className="h-4 w-4" />
                    Ver y Comparar
                  </button>
                </div>
              </div>

              {/* Envíos en Curso */}
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Envíos en Curso</h2>
                {enviosEnCurso.map((envio) => (
                  <div key={envio.id} className="bg-surface border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-primary">{envio.id}</p>
                        <p className="text-sm text-foreground mt-0.5">{envio.rubro}</p>
                      </div>
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Tracker Horizontal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-0">
                        {envio.etapas.map((etapa, idx) => {
                          const isActive = idx === envio.etapaActual
                          const isCompleted = etapa.completada

                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isActive
                                    ? "bg-primary text-primary-foreground scale-110"
                                    : isCompleted
                                      ? "bg-primary/20 text-primary"
                                      : "bg-surface border border-border text-muted-foreground"
                                }`}
                              >
                                {isCompleted ? "✓" : idx + 1}
                              </div>
                              {isActive && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-1">
                                  <div className="animate-spin h-2 w-2 rounded-full border border-primary border-transparent border-t-primary" />
                                </div>
                              )}
                              <p className="text-[9px] text-muted-foreground text-center">{etapa.nombre}</p>
                            </div>
                          )
                        })}
                      </div>
                      {/* Línea de progreso */}
                      <div className="h-0.5 bg-border rounded-full overflow-hidden relative mt-4">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${((envio.etapaActual + 1) / envio.etapas.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Bar (iOS style) */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-background/80 border-t border-border flex items-end">
              <div className="w-full h-20 flex items-center justify-around px-3 pb-safe">
                <button
                  onClick={() => setTabActivo("dashboard")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    tabActivo === "dashboard"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Panel</span>
                </button>

                <button
                  onClick={() => setTabActivo("licitaciones")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    tabActivo === "licitaciones"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Licitaciones</span>
                </button>

                <button
                  onClick={() => setTabActivo("seguimiento")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    tabActivo === "seguimiento"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Package className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Seguimiento</span>
                </button>

                <button
                  onClick={() => setTabActivo("soporte")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    tabActivo === "soporte"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Soporte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
