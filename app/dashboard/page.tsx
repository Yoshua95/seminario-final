"use client"

import { useState } from "react"
import { Box, Plus, ShieldCheck, Clock, Layers, HelpCircle, LayoutDashboard, Truck, MessageSquare } from "lucide-react"

export default function DashboardImportador() {
  const [activeTab, setActiveTab] = useState<"hub" | "licitaciones" | "seguimiento" | "soporte">("hub")

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050507] px-4 py-10 font-sans antialiased">

      {/* MARCO DE IPHONE PREMIUM REAL (Copiado de tu pantalla de ofertas) */}
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[54px] border-[11px] border-[#1e1e24] bg-[#07070a] shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col select-none ring-1 ring-white/5">

        {/* Dynamic Island Ficticia de tu mockup */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-50 flex items-center justify-center" />

        {/* Status Bar Spacer */}
        <div className="h-[44px] shrink-0" />

        {/* CONTENIDO INTERNO DINÁMICO */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">

          {/* HUB / PESTAÑA INICIO */}
          {activeTab === "hub" && (
            <div className="space-y-6 pt-2 animate-in fade-in duration-200">
              <header className="flex items-center justify-between pb-2 border-b border-[#1f2029]">
                <div>
                  <p className="text-[11px] text-[#8a8b94] font-mono uppercase tracking-wider">Panel Importador</p>
                  <h1 className="text-lg font-bold text-white mt-0.5">Hola, Alejandro</h1>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">#IMP-8392 • Verificado</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </header>

              {/* Grid de Accesos Rápidos Estilo Hub */}
              <div className="grid grid-cols-2 gap-3">
                <div onClick={() => setActiveTab("licitaciones")} className="bg-[#0c0d12] border border-[#1f2029] p-4 rounded-2xl cursor-pointer hover:border-emerald-500/20 transition-all">
                  <Clock className="h-5 w-5 text-amber-500 mb-2" />
                  <p className="text-[11px] text-[#8a8b94]">Mis Cargas</p>
                  <p className="text-lg font-bold text-white mt-1">3</p>
                </div>
                <div onClick={() => setActiveTab("licitaciones")} className="bg-[#0c0d12] border border-[#1f2029] p-4 rounded-2xl cursor-pointer hover:border-emerald-500/20 transition-all">
                  <Layers className="h-5 w-5 text-emerald-400 mb-2" />
                  <p className="text-[11px] text-[#8a8b94]">Ofertas Nuevas</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">7</p>
                </div>
                <div onClick={() => setActiveTab("seguimiento")} className="bg-[#0c0d12] border border-[#1f2029] p-4 rounded-2xl cursor-pointer hover:border-emerald-500/20 transition-all">
                  <Truck className="h-5 w-5 text-blue-400 mb-2" />
                  <p className="text-[11px] text-[#8a8b94]">En Camino</p>
                  <p className="text-lg font-bold text-white mt-1">2</p>
                </div>
                <div onClick={() => setActiveTab("soporte")} className="bg-[#0c0d12] border border-[#1f2029] p-4 rounded-2xl cursor-pointer hover:border-emerald-500/20 transition-all">
                  <HelpCircle className="h-5 w-5 text-purple-400 mb-2" />
                  <p className="text-[11px] text-[#8a8b94]">Ayuda</p>
                  <p className="text-xs font-bold text-white mt-2">Soporte 24/7</p>
                </div>
              </div>

              {/* CTA Nueva Postulación */}
              <button onClick={() => window.location.href = "/"} className="w-full bg-white hover:bg-white/90 text-black font-bold text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg transition-all mt-4">
                <Plus className="h-4 w-4" strokeWidth={3} />
                Nueva Postulación Logística
              </button>
            </div>
          )}

          {/* LICITACIONES Y OFERTAS */}
          {activeTab === "licitaciones" && (
            <div className="space-y-5 pt-2 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold text-white tracking-tight">Licitaciones Ciegas en Curso</h2>

              <div className="space-y-3">
                <div className="bg-[#0c0d12] border border-[#1f2029] rounded-xl p-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-bold text-[#e1e3ea]">#LC-9477 • Electrónica</p>
                      <p className="text-[11px] text-[#8a8b94] mt-0.5">FOB: 8500 USD • Vol: 0.45 m³</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono animate-pulse">Buscando</span>
                  </div>
                </div>

                <div className="bg-[#0c0d12] border border-[#1f2029] rounded-xl p-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-bold text-[#e1e3ea]">#LC-9312 • Repuestos</p>
                      <p className="text-[11px] text-[#8a8b94] mt-0.5">FOB: 12300 USD • Vol: 1.2 m³</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono animate-pulse">Buscando</span>
                  </div>
                </div>
              </div>

              {/* CARD CONECTADA A TU PANTALLA DE OFERTAS */}
              <h2 className="text-sm font-bold text-white tracking-tight pt-2">Ofertas Recibidas</h2>
              <div className="bg-[#0c0d12] border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-bold text-white">#LC-8312 • Repuestos Auto</p>
                    <p className="text-[11px] text-[#8a8b94] mt-0.5">Eje Delantero • FOB $6,800 USD</p>
                  </div>
                  <span className="text-[10px] bg-emerald-500 text-black font-bold px-2 py-0.5 rounded">2 Ofertas</span>
                </div>
                {/* Redirige a la pantalla interna que ya creaste */}
                <button
                  onClick={() => window.location.href = "/ofertas"}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] py-2 rounded-lg transition-all"
                >
                  Ver y Comparar Ofertas
                </button>
              </div>
            </div>
          )}

          {/* SEGUIMIENTO / TRACKING TIMELINE */}
          {activeTab === "seguimiento" && (
            <div className="space-y-5 pt-2 animate-in fade-in duration-200">
              <div>
                <h2 className="text-sm font-bold text-white">Tracking en Tiempo Real</h2>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Carga #LC-1092 • Indumentaria</p>
              </div>

              {/* Timeline Vertical Limpio */}
              <div className="relative border-l border-[#1f2029] ml-3.5 pl-6 space-y-6 py-2">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-emerald-500 h-4 w-4 rounded-full border-4 border-[#07070a] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <p className="text-xs font-bold text-white">Recogido en Origen</p>
                  <p className="text-[10px] text-[#8a8b94] mt-0.5">Shenzhen Warehouse • Completado</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-emerald-500 h-4 w-4 rounded-full border-4 border-[#07070a] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <p className="text-xs font-bold text-white">Despachado</p>
                  <p className="text-[10px] text-[#8a8b94] mt-0.5">Puerto de Hong Kong • Salido</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-amber-500 h-4 w-4 rounded-full border-4 border-[#07070a] animate-pulse" />
                  <p className="text-xs font-bold text-amber-400">Controles de Aduana</p>
                  <p className="text-[10px] text-[#8a8b94] mt-0.5">Proceso de inspección documental activo</p>
                </div>
                <div className="relative opacity-40">
                  <span className="absolute -left-[31px] top-0.5 bg-[#1f2029] h-4 w-4 rounded-full border-4 border-[#07070a]" />
                  <p className="text-xs font-bold text-white">En Viaje Marítimo</p>
                  <p className="text-[10px] text-[#8a8b94] mt-0.5">Tránsito internacional hacia destino</p>
                </div>
                <div className="relative opacity-40">
                  <span className="absolute -left-[31px] top-0.5 bg-[#1f2029] h-4 w-4 rounded-full border-4 border-[#07070a]" />
                  <p className="text-xs font-bold text-white">Recogido por Logística</p>
                  <p className="text-[10px] text-[#8a8b94] mt-0.5">Entrega final en depósito destino</p>
                </div>
              </div>
            </div>
          )}

          {/* SOPORTE */}
          {activeTab === "soporte" && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold text-white">Centro de Soporte</h2>
              <div className="space-y-2">
                <div className="bg-[#0c0d12] border border-[#1f2029] p-3 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Chat con Agente</p>
                    <p className="text-[10px] text-[#8a8b94] mt-0.5">Respuesta en aprox. 2 minutos</p>
                  </div>
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="bg-[#0c0d12] border border-[#1f2029] p-3 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">WhatsApp LogiChina</p>
                    <p className="text-[10px] text-[#8a8b94] mt-0.5">Atención comercial directa</p>
                  </div>
                  <Box className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* NAVEGACIÓN INFERIOR FIJA TIPO IOS */}
        <nav className="absolute bottom-0 left-0 right-0 h-[68px] bg-[#07070a]/90 backdrop-blur-md border-t border-[#1f2029] flex items-center justify-around px-4 pb-4">
          <button onClick={() => setActiveTab("hub")} className={`flex flex-col items-center gap-1 transition-all ${activeTab === "hub" ? "text-emerald-400" : "text-[#4e5163]"}`}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[9px] font-medium">Panel</span>
          </button>
          <button onClick={() => setActiveTab("licitaciones")} className={`flex flex-col items-center gap-1 transition-all ${activeTab === "licitaciones" ? "text-emerald-400" : "text-[#4e5163]"}`}>
            <Clock className="h-4 w-4" />
            <span className="text-[9px] font-medium">Licitaciones</span>
          </button>
          <button onClick={() => setActiveTab("seguimiento")} className={`flex flex-col items-center gap-1 transition-all ${activeTab === "seguimiento" ? "text-emerald-400" : "text-[#4e5163]"}`}>
            <Truck className="h-4 w-4" />
            <span className="text-[9px] font-medium">Seguimiento</span>
          </button>
          <button onClick={() => setActiveTab("soporte")} className={`flex flex-col items-center gap-1 transition-all ${activeTab === "soporte" ? "text-emerald-400" : "text-[#4e5163]"}`}>
            <HelpCircle className="h-4 w-4" />
            <span className="text-[9px] font-medium">Soporte</span>
          </button>
        </nav>

        {/* iOS Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[110px] h-[4px] bg-[#1f2029] rounded-full" />
      </div>

    </div>
  )
}