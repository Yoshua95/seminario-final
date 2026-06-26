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
} from "lucide-react"

export function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<"hub" | "licitaciones" | "seguimiento" | "soporte">("hub")

  // Data ficticia para licitaciones ciegas
  const licitacionesCiegas = [
    {
      id: "LC-9477",
      material: "Electrónica",
      fob: "$8,500 USD",
      volumen: "0.45 m³",
      peso: "85 kg",
    },
    {
      id: "LC-9312",
      material: "Repuestos",
      fob: "$12,300 USD",
      volumen: "1.2 m³",
      peso: "240 kg",
    },
  ]

  // Data ficticia para ofertas recibidas
  const ofertasRecibidas = [
    {
      id: "LC-8312",
      material: "Repuestos Auto (Eje Delantero)",
      fob: "$6,800 USD",
      volumen: "0.65 m³",
      ofertas: 2,
    },
  ]

  // Data ficticia para envíos
  const enviosEnCurso = [
    {
      id: "LC-1092",
      material: "Indumentaria Textil",
      etapas: [
        { nombre: "Recogido", completada: true },
        { nombre: "Despachado", completada: true },
        { nombre: "Aduana", completada: false },
        { nombre: "En Viaje", completada: false },
        { nombre: "Entregado", completada: false },
      ],
      etapaActual: 2,
    },
  ]

  return (
    <div className="fixed inset-0 bg-background">
      {/* Contenedor Principal - Centrado */}
      <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-8">
        {/* Marco de iPhone */}
        <div className="relative w-full max-w-[440px] h-[900px] bg-background rounded-[54px] border-[12px] border-black shadow-2xl overflow-hidden flex flex-col">
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

          {/* Contenido Principal */}
          <div className="flex-1 flex flex-col overflow-hidden pt-8 pb-20 px-6">
            {/* SECCIÓN HUB */}
            {activeTab === "hub" && (
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Saludo y ID */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Buenos días</h1>
                  <p className="text-sm text-muted-foreground mt-1">#IMP-8392 • Importador Verificado</p>
                </div>

                {/* Grid de 4 Tarjetas de Acceso Rápido */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Mis Cargas */}
                  <div className="bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition cursor-pointer backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Mis Cargas</p>
                        <p className="text-2xl font-bold text-foreground mt-2">3</p>
                      </div>
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  {/* Ofertas Nuevas */}
                  <div className="bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition cursor-pointer backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Ofertas Nuevas</p>
                        <p className="text-2xl font-bold text-primary mt-2">7</p>
                      </div>
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  {/* En Camino */}
                  <div className="bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition cursor-pointer backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">En Camino</p>
                        <p className="text-2xl font-bold text-foreground mt-2">2</p>
                      </div>
                      <Truck className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Ayuda */}
                  <div className="bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition cursor-pointer backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Ayuda</p>
                        <p className="text-sm text-muted-foreground mt-2">24/7 Chat</p>
                      </div>
                      <HelpCircle className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Nueva Postulación CTA */}
                <button
                  onClick={() => window.location.href = "/"}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nueva Postulación Logística
                </button>
              </div>
            )}

            {/* SECCIÓN LICITACIONES */}
            {activeTab === "licitaciones" && (
              <div className="flex-1 overflow-y-auto space-y-4">
                <h2 className="text-xl font-bold text-foreground">Mis Licitaciones</h2>

                {/* Licitaciones Ciegas en Curso */}
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold">BUSCANDO OFERTAS</p>
                  {licitacionesCiegas.map((licitacion) => (
                    <div
                      key={licitacion.id}
                      className="bg-surface border border-border rounded-lg p-4 backdrop-blur space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{licitacion.id}</p>
                          <p className="text-xs text-muted-foreground mt-1">{licitacion.material}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          <p className="text-xs text-yellow-500 font-medium">Buscando</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">FOB</p>
                          <p className="text-foreground font-semibold">{licitacion.fob}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Volumen</p>
                          <p className="text-foreground font-semibold">{licitacion.volumen}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Peso</p>
                          <p className="text-foreground font-semibold">{licitacion.peso}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ofertas Recibidas */}
                <div className="space-y-3 mt-6">
                  <p className="text-xs text-muted-foreground font-semibold">OFERTAS RECIBIDAS</p>
                  {ofertasRecibidas.map((oferta) => (
                    <div
                      key={oferta.id}
                      className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg p-4 backdrop-blur space-y-3 hover:from-primary/30 hover:to-primary/20 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{oferta.id}</p>
                          <p className="text-xs text-muted-foreground mt-1">{oferta.material}</p>
                        </div>
                        <div className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-semibold">
                          {oferta.ofertas} ofertas
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">FOB</p>
                          <p className="text-foreground font-semibold">{oferta.fob}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Volumen</p>
                          <p className="text-foreground font-semibold">{oferta.volumen}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.location.href = "https://TU-LINK-DE-OFERTAS.vercel.app"}
                        className="w-full bg-primary text-primary-foreground py-2 rounded text-sm font-semibold hover:bg-primary/90 transition mt-2"
                      >
                        Ver Ofertas
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN SEGUIMIENTO */}
            {activeTab === "seguimiento" && (
              <div className="flex-1 overflow-y-auto space-y-6">
                <h2 className="text-xl font-bold text-foreground">Tracking Real</h2>

                {/* Envíos en Curso */}
                {enviosEnCurso.map((envio) => (
                  <div key={envio.id} className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{envio.id}</p>
                      <p className="text-xs text-muted-foreground mt-1">{envio.material}</p>
                    </div>

                    {/* Timeline Vertical */}
                    <div className="space-y-4">
                      {envio.etapas.map((etapa, idx) => (
                        <div key={idx} className="flex gap-4">
                          {/* Círculo de estado */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                etapa.completada
                                  ? "bg-primary border-primary"
                                  : idx === envio.etapaActual
                                    ? "bg-background border-primary"
                                    : "bg-background border-border"
                              }`}
                            >
                              {etapa.completada ? (
                                <Check className="w-4 h-4 text-primary-foreground" />
                              ) : idx === envio.etapaActual ? (
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                              ) : null}
                            </div>
                            {idx < envio.etapas.length - 1 && (
                              <div
                                className={`w-0.5 h-12 mt-2 ${
                                  etapa.completada ? "bg-primary" : "bg-border"
                                }`}
                              />
                            )}
                          </div>

                          {/* Texto de etapa */}
                          <div className="flex flex-col justify-center py-2">
                            <p
                              className={`text-sm font-medium ${
                                etapa.completada ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {etapa.nombre}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SECCIÓN SOPORTE */}
            {activeTab === "soporte" && (
              <div className="flex-1 overflow-y-auto space-y-4">
                <h2 className="text-xl font-bold text-foreground">Centro de Ayuda</h2>

                {/* Botones de Soporte */}
                <div className="space-y-3">
                  <button className="w-full bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition flex items-center gap-3 backdrop-blur">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Chat con Agente</p>
                      <p className="text-xs text-muted-foreground">Respuesta en 2 minutos</p>
                    </div>
                  </button>

                  <button
                    onClick={() => window.open("https://wa.me/5491234567890", "_blank")}
                    className="w-full bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition flex items-center gap-3 backdrop-blur"
                  >
                    <Phone className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">WhatsApp LogiChina</p>
                      <p className="text-xs text-muted-foreground">Soporte 24/7</p>
                    </div>
                  </button>

                  <button className="w-full bg-surface border border-border rounded-lg p-4 hover:bg-surface/80 transition flex items-center gap-3 backdrop-blur">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Documentación</p>
                      <p className="text-xs text-muted-foreground">Guías y tutoriales</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab Bar Inferior - FIJA */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-background/0 border-t border-border flex items-end justify-around px-4 py-3">
            {/* Tab Hub */}
            <button
              onClick={() => setActiveTab("hub")}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition ${
                activeTab === "hub"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Panel</span>
            </button>

            {/* Tab Licitaciones */}
            <button
              onClick={() => setActiveTab("licitaciones")}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition ${
                activeTab === "licitaciones"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs font-medium">Licitaciones</span>
            </button>

            {/* Tab Seguimiento */}
            <button
              onClick={() => setActiveTab("seguimiento")}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition ${
                activeTab === "seguimiento"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="w-5 h-5" />
              <span className="text-xs font-medium">Seguimiento</span>
            </button>

            {/* Tab Soporte */}
            <button
              onClick={() => setActiveTab("soporte")}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition ${
                activeTab === "soporte"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Soporte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
