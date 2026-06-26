"use client"

import { useState } from "react"
import { LayoutGrid, ShoppingCart, Truck, Headphones, MessageCircle, Phone, BookOpen, CheckCircle2, Clock, MapPin, Package } from "lucide-react"
import { PhoneFrame } from "./phone-frame"

export function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<"hub" | "licitaciones" | "seguimiento" | "soporte">("hub")

  const tabButtons = [
    { id: "hub", label: "Hub", icon: LayoutGrid },
    { id: "licitaciones", label: "Licitaciones", icon: ShoppingCart },
    { id: "seguimiento", label: "Seguimiento", icon: Truck },
    { id: "soporte", label: "Soporte", icon: Headphones },
  ] as const

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 sm:pt-14 pb-4 shrink-0 border-b border-border/40">
        <div className="flex flex-col gap-1">
          <h1 className="text-[16px] font-semibold text-foreground">Panel de Control</h1>
          <p className="text-[11px] text-muted-foreground">#IMP-8392 · Verificado</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-[12px] font-bold text-primary">8392</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-20">
        {activeTab === "hub" && (
          <div className="flex flex-col gap-4 px-6 pt-4">
            {/* Grid de Accesos Rápidos */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors text-left group">
                <Package className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                <span className="text-[12px] font-medium text-foreground">Mis Cargas</span>
                <span className="text-[11px] text-muted-foreground">2 activas</span>
              </button>
              <button className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors text-left group">
                <ShoppingCart className="h-5 w-5 text-amber-500 group-hover:text-amber-400 transition-colors" strokeWidth={1.5} />
                <span className="text-[12px] font-medium text-foreground">Ofertas Nuevas</span>
                <span className="text-[11px] text-amber-500/80">+5 hoy</span>
              </button>
              <button className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors text-left group">
                <Truck className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" strokeWidth={1.5} />
                <span className="text-[12px] font-medium text-foreground">En Camino</span>
                <span className="text-[11px] text-cyan-400/80">1 envío</span>
              </button>
              <button className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors text-left group">
                <Headphones className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                <span className="text-[12px] font-medium text-foreground">Ayuda</span>
                <span className="text-[11px] text-muted-foreground">24/7</span>
              </button>
            </div>

            {/* CTA Principal */}
            <button className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-[13px] hover:bg-primary/90 transition-colors mt-2">
              + Nueva Postulación Logística
            </button>
          </div>
        )}

        {activeTab === "licitaciones" && (
          <div className="flex flex-col gap-3 px-6 pt-4">
            {/* Licitaciones Activas */}
            <div className="flex flex-col gap-2">
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Licitaciones Ciegas Activas</h3>
              {["LC-9477", "LC-9312"].map((id) => (
                <div key={id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-surface/50">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{id}</span>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">En búsqueda</span>
                </div>
              ))}
            </div>

            {/* Ofertas Recibidas */}
            <div className="flex flex-col gap-2 mt-4">
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Ofertas Recibidas</h3>
              <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/2">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">#LC-8312</p>
                    <p className="text-[11px] text-muted-foreground mt-1">5 ofertas disponibles</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/20 text-primary">Nuevas</span>
                </div>
                <button
                  onClick={() => window.location.href = "/ofertas"}
                  className="w-full py-2.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[12px] transition-colors"
                >
                  Ver y Comparar Ofertas
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "seguimiento" && (
          <div className="flex flex-col gap-4 px-6 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-foreground">Envío #LC-1092</h3>
              <span className="text-[11px] text-muted-foreground">En tránsito</span>
            </div>

            {/* Timeline Premium */}
            <div className="space-y-3">
              {[
                { label: "Recogido", icon: CheckCircle2, completed: true },
                { label: "Despachado", icon: CheckCircle2, completed: true },
                { label: "Aduana", icon: Clock, completed: false, active: true },
                { label: "En Viaje", icon: MapPin, completed: false },
                { label: "Entregado", icon: Truck, completed: false },
              ].map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        step.completed 
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                          : step.active 
                          ? "bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse" 
                          : "border-border/60 text-muted-foreground"
                      }`}>
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </div>
                      {idx < 4 && (
                        <div className={`w-0.5 h-8 mt-2 ${step.completed ? "bg-emerald-500/30" : "bg-border/40"}`} />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[13px] font-medium text-foreground">{step.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {step.active ? "En progreso..." : step.completed ? "Completado" : "Pendiente"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === "soporte" && (
          <div className="flex flex-col gap-3 px-6 pt-4">
            <button className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors">
              <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-foreground">Chat en Vivo</p>
                <p className="text-[11px] text-muted-foreground">Disponible 24/7</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors">
              <Phone className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-foreground">WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">+54 9 11 xxxx-xxxx</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface transition-colors">
              <BookOpen className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-foreground">Documentación</p>
                <p className="text-[11px] text-muted-foreground">Guías y tutoriales</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* iOS Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-md border-t border-border/40 flex items-center justify-around sm:rounded-b-[2.6rem]">
        {tabButtons.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1 py-2 transition-colors ${
              activeTab === id 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </PhoneFrame>
  )
}
