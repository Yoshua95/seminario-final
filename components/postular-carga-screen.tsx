"use client"

import React, { useState } from "react"
import { ArrowLeft, Upload, AlertTriangle, ShieldCheck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

// Listado oficial de agentes según el alcance acordado
const AGENTES_DISPONIBLES = ["CSSBuy", "Kakobuy", "Alibaba"]

// Lista de mercancías sensibles obligatorias
const MERCANCIAS_SENSIBLES = [
  { id: "baterias", label: "Baterías de Litio / Celdas de energía" },
  { id: "imanes", label: "Imanes / Componentes magnéticos" },
  { id: "liquidos", label: "Líquidos / Polvos químicos" }
]

export default function PostularCargaScreen() {
  // Estados para el selector de origen y descripción propia
  const [agenteSeleccionado, setAgenteSeleccionado] = useState("")
  const [esParticular, setEsParticular] = useState(false)
  const [descripcionPropiaAgente, setDescripcionPropiaAgente] = useState("")

  // Estados para el desglose multi-rubro simultáneo
  const [rubros, setRubros] = useState({
    indumentaria: false,
    tecnologia: false,
    otros: false
  })
  const [valoresFOB, setValoresFOB] = useState({
    indumentaria: "",
    tecnologia: "",
    otros: ""
  })

  // Estado para mercancías sensibles
  const [sensiblesSeleccionados, setSensiblesSeleccionados] = useState<string[]>([])

  // Datos generales de la carga
  const [peso, setPeso] = useState("")
  const [dimensiones, setDimensiones] = useState({ alto: "", ancho: "", largo: "" })

  const handleRubroToggle = (rubro: keyof typeof rubros) => {
    setRubros(prev => ({ ...prev, [rubro]: !prev[rubro] }))
  }

  const handleFOBChange = (rubro: string, value: string) => {
    setValoresFOB(prev => ({ ...prev, [rubro]: value }))
  }

  const handleSensibleToggle = (id: string) => {
    setSensiblesSeleccionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleAgenteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setAgenteSeleccionado(value)
    if (value !== "otro") {
      setDescripcionPropiaAgente("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      origen: esParticular ? "Particular" : (agenteSeleccionado === "otro" ? descripcionPropiaAgente : agenteSeleccionado),
      desgloseRubros: Object.keys(rubros).filter(k => rubros[k as keyof typeof rubros]).map(k => ({
        rubro: k,
        valorFOB: valoresFOB[k as keyof typeof valoresFOB]
      })),
      mercanciasSensibles: sensiblesSeleccionados,
      especificaciones: { peso, dimensiones }
    }
    console.log("Datos listos para enviar a FastAPI:", payload)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-white px-4 py-4 shadow-sm">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Nueva Postulación de Carga</h1>
          <p className="text-xs text-slate-500">LogiChina Ecosistema Transaccional</p>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECCIÓN 1: ORIGEN / AGENTE CONSOLIDADO */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">1. Depósito de Origen en China</h2>

            <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => { setEsParticular(false); setAgenteSeleccionado(""); }}
                className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-all ${!esParticular ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
              >
                Agente de Compra
              </button>
              <button
                type="button"
                onClick={() => { setEsParticular(true); setAgenteSeleccionado(""); }}
                className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-all ${esParticular ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
              >
                Particular
              </button>
            </div>

            {!esParticular && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-600">Seleccionar Operador / Warehouse</label>
                <select
                  value={agenteSeleccionado}
                  onChange={handleAgenteChange}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>-- Seleccionar Agente --</option>
                  {AGENTES_DISPONIBLES.map(agente => (
                    <option key={agente} value={agente}>{agente}</option>
                  ))}
                  <option value="otro">Otro agente / No figura en la lista</option>
                </select>

                {agenteSeleccionado === "otro" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-medium text-slate-500">Especificar nombre del Agente propio</label>
                    <input
                      type="text"
                      value={descripcionPropiaAgente}
                      onChange={(e) => setDescripcionPropiaAgente(e.target.value)}
                      placeholder="Ej. MyChinaLogistics"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECCIÓN 2: DESGLOSE MULTI-RUBRO SIMULTÁNEO Y VALOR FOB */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">2. Contenido y Desglose Multi-Rubro</h2>
            <p className="text-xs text-slate-500">Podés marcar múltiples rubros si tu paquete consolidado contiene mercancía mixta.</p>

            <div className="space-y-4">
              {/* Checkbox Indumentaria */}
              <div className="border rounded-xl p-3 transition-colors duration-200 border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rubros.indumentaria}
                      onChange={() => handleRubroToggle("indumentaria")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Indumentaria / Textil</span>
                  </div>
                </label>
                {rubros.indumentaria && (
                  <div className="mt-3 flex items-center gap-2 pl-7 animate-slideDown">
                    <span className="text-xs text-slate-500 font-medium">Valor FOB (USD):</span>
                    <input
                      type="number"
                      value={valoresFOB.indumentaria}
                      onChange={(e) => handleFOBChange("indumentaria", e.target.value)}
                      placeholder="0.00"
                      className="w-32 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Checkbox Tecnología */}
              <div className="border rounded-xl p-3 transition-colors duration-200 border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rubros.tecnologia}
                      onChange={() => handleRubroToggle("tecnologia")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Tecnología / Electrónica</span>
                  </div>
                </label>
                {rubros.tecnologia && (
                  <div className="mt-3 flex items-center gap-2 pl-7 animate-slideDown">
                    <span className="text-xs text-slate-500 font-medium">Valor FOB (USD):</span>
                    <input
                      type="number"
                      value={valoresFOB.tecnologia}
                      onChange={(e) => handleFOBChange("tecnologia", e.target.value)}
                      placeholder="0.00"
                      className="w-32 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: DECLARACIÓN OBLIGATORIA DE MERCANCÍAS SENSIBLES */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">3. Declaración de Sensibles</h2>
            </div>
            <p className="text-xs text-slate-500">Requerido por normativas de Courier / AFIP. Seleccioná si aplica:</p>

            <div className="space-y-2.5">
              {MERCANCIAS_SENSIBLES.map(item => {
                const isSelected = sensiblesSeleccionados.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSensibleToggle(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${isSelected ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-medium' : 'border-slate-200 text-slate-600'}`}
                  >
                    <span className="text-xs">{item.label}</span>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'}`}>
                      {isSelected && <Check className="h-3 w-3 -[3]stroke" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* SECCIÓN 4: MEDIDAS Y PESO TÉCNICO */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">4. Peso y Dimensiones Técnicas</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Peso bruto total (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Ej: 4.50"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-center text-[11px] font-medium text-slate-500 mb-1">Alto (cm)</label>
                  <input
                    type="number"
                    value={dimensiones.alto}
                    onChange={(e) => setDimensiones(prev => ({ ...prev, alto: e.target.value }))}
                    placeholder="0"
                    className="w-full text-center bg-white border border-slate-300 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-center text-[11px] font-medium text-slate-500 mb-1">Ancho (cm)</label>
                  <input
                    type="number"
                    value={dimensiones.ancho}
                    onChange={(e) => setDimensiones(prev => ({ ...prev, ancho: e.target.value }))}
                    placeholder="0"
                    className="w-full text-center bg-white border border-slate-300 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-center text-[11px] font-medium text-slate-500 mb-1">Largo (cm)</label>
                  <input
                    type="number"
                    value={dimensiones.largo}
                    onChange={(e) => setDimensiones(prev => ({ ...prev, largo: e.target.value }))}
                    placeholder="0"
                    className="w-full text-center bg-white border border-slate-300 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* BOTÓN PRINCIPAL DE POSTULACIÓN TRASACCIONAL */}
          <div className="pt-2">
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Publicar en Panel de Licitación Ciega
            </Button>
            <p className="text-center text-[10px] text-slate-400 mt-3 px-6">
              Al publicar, su carga queda disponible de forma anónima para cotizaciones de operadores autorizados por AFIP/Aduana.
            </p>
          </div>

        </form>
      </main>
    </div>
  )
}
