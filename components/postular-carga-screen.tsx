"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ArrowLeft, ChevronDown, Box, Weight, Boxes, Tag, AlertTriangle, X, HelpCircle, Hash, FileText, Upload, ChevronRight, CheckCircle2, AlertCircle, Loader2, RefreshCw, Calculator, Check } from "lucide-react"

const agentesDisponibles = [
  { value: "cssbuy", label: "CSSBuy" },
  { value: "kakobuy", label: "Kakobuy" },
  { value: "alibaba", label: "Alibaba" },
  { value: "otro", label: "Otro agente / No figura" },
]

const listaRubrosLogistica = [
  { id: "indumentaria", label: "Indumentaria y Textil" },
  { id: "calzado", label: "Calzado y Zapatillas" },
  { id: "marroquineria", label: "Marroquinería (Bolsos, Carteras, Maletas)" },
  { id: "electronica_consumo", label: "Electrónica de Consumo" },
  { id: "componentes_tecnologicos", label: "Componentes Tecnológicos y Chips" },
  { id: "repuestos_autos", label: "Repuestos y Autopartes" },
  { id: "herramientas_maquinaria", label: "Herramientas y Maquinaria Ligera" },
  { id: "juguetes_hobbies", label: "Juguetes y Artículos de Hobbies" },
  { id: "hogar_decoracion", label: "Hogar, Bazar y Decoración" },
  { id: "iluminacion_led", label: "Iluminación y Tecnología LED" },
  { id: "relojes_joyeria", label: "Relojería, Joyería y Bijouterie" },
  { id: "cosmetica_estetica", label: "Cosmética y Aparatología Estética" },
  { id: "deportes_fitness", label: "Artículos de Deporte y Fitness" },
  { id: "audio_video", label: "Equipos de Audio y Video" },
  { id: "accesorios_celulares", label: "Accesorios para Celulares y Tablets" },
  { id: "libreria_papeleria", label: "Librería, Papelería y Oficina" },
  { id: "ferreteria_construccion", label: "Materiales de Ferretería y Construcción" },
  { id: "instrumentos_musicales", label: "Instrumentos Musicales y Accesorios" },
  { id: "mascotas", label: "Productos y Accesorios para Mascotas" },
  { id: "bici_motos", label: "Bicicletas, Monopatines y Accesorios" },
  { id: "otro", label: "Otro rubro / No especificado" }
]

const listaMercanciasSensibles = [
  { id: "baterias", label: "Baterías de Litio / Celdas de energía" },
  { id: "imanes", label: "Imanes / Componentes magnéticos" },
  { id: "liquidos", label: "Líquidos, Polvos y Cosméticos" },
  { id: "marcas", label: "Réplicas o Productos de Marca Registrada" }
]

interface DetalleRubro {
  fob: string
  unidades: string
  pesoIndividual: string
}

export function PostularCargaScreen() {
  // ESTADOS DEL FORMULARIO
  const [agente, setAgente] = useState(agentesDisponibles[0].value)
  const [agentePropio, setAgentePropio] = useState("")
  const [peso, setPeso] = useState("")
  const [volumen, setVolumen] = useState("")

  // Estados para la calculadora de dimensiones
  const [showCalculadora, setShowCalculadora] = useState(false)
  const [alto, setAlto] = useState("")
  const [ancho, setAncho] = useState("")
  const [profundidad, setProfundidad] = useState("")
  const [isCalculating, setIsCalculating] = useState(false)
  const [medidasConfirmadas, setMedidasConfirmadas] = useState(false)
  const [volumenRealTime, setVolumenRealTime] = useState("0.000")

  // Estado para la confirmación manual de datos sin calculadora
  const [isConfirmingManual, setIsConfirmingManual] = useState(false)
  const [manualConfirmado, setManualConfirmado] = useState(false)

  // Slider de la calculadora
  const [calcDragX, setCalcDragX] = useState(0)
  const [isCalcDragging, setIsCalcDragging] = useState(false)
  const calcSliderRef = useRef<HTMLDivElement>(null)
  const calcStartXRef = useRef(0)

  // Rubros y sus sub-campos
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState<string[]>([])
  const [detallesRubros, setDetallesRubros] = useState<Record<string, DetalleRubro>>({})
  const [descripcionOtroRubro, setDescripcionOtroRubro] = useState("")

  // Cargas Sensibles
  const [sensiblesSeleccionados, setSensiblesSeleccionados] = useState<string[]>([])
  const [detallesSensibles, setDetallesSensibles] = useState<Record<string, { cantidad: string; descripcion: string }>>({})

  // Dropdowns Custom
  const [showDropdownAgente, setShowDropdownAgente] = useState(false)
  const [showDropdownRubros, setShowDropdownRubros] = useState(false)
  const [showDropdownSensibles, setShowDropdownSensibles] = useState(false)

  const [showTooltip, setShowTooltip] = useState(false)
  const [archivoAdjunto, setArchivoAdjunto] = useState<{ nombre: string; origen: string } | null>(null)
  const [showMenuAdjuntos, setShowMenuAdjuntos] = useState(false)

  // ESTADOS DEL SLIDER Y LOADING PRINCIPAL
  const [isDragging, setIsDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState(false)

  // ESTADOS DEL PULL TO REFRESH PROGRESIVO
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const isPullingRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const sliderRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)

  // Refs externos
  const agenteRef = useRef<HTMLDivElement>(null)
  const rubrosRef = useRef<HTMLDivElement>(null)
  const sensiblesRef = useRef<HTMLDivElement>(null)

  // Calcular m3 en tiempo real cada vez que cambian alto, ancho o profundidad
  useEffect(() => {
    const h = Number.parseFloat(alto) || 0
    const w = Number.parseFloat(ancho) || 0
    const d = Number.parseFloat(profundidad) || 0
    const totalM3 = (h * w * d) / 1000000
    setVolumenRealTime(totalM3 > 0 ? totalM3.toFixed(3) : "0.000")

    // Si editan las dimensiones internas, se cae la confirmación y se liberan los inputs principales
    setMedidasConfirmadas(false)
    setCalcDragX(0)
  }, [alto, ancho, profundidad])

  // Al abrir/cerrar la calculadora, limpiamos o forzamos reseteos lógicos
  useEffect(() => {
    if (showCalculadora && !medidasConfirmadas) {
      setVolumen("")
      setManualConfirmado(false)
    }
  }, [showCalculadora, medidasConfirmadas])

  // Romper confirmación manual si se editan los inputs principales directamente
  const handleManualInputChange = (tipo: 'peso' | 'volumen', val: string) => {
    if (tipo === 'peso') setPeso(val)
    if (tipo === 'volumen') setVolumen(val)
    setManualConfirmado(false)
  }

  const ejecutarConfirmacionMedidas = () => {
    setIsCalculating(true)
    setTimeout(() => {
      setVolumen(volumenRealTime)
      setIsCalculating(false)
      setMedidasConfirmadas(true)
    }, 800)
  }

  const ejecutarConfirmacionManual = () => {
    if (!peso || !volumen || Number.parseFloat(peso) <= 0 || Number.parseFloat(volumen) <= 0) return
    setIsConfirmingManual(true)
    setTimeout(() => {
      setIsConfirmingManual(false)
      setManualConfirmado(true)
    }, 1000)
  }

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (agenteRef.current && !agenteRef.current.contains(e.target as Node)) setShowDropdownAgente(false)
      if (rubrosRef.current && !rubrosRef.current.contains(e.target as Node)) setShowDropdownRubros(false)
      if (sensiblesRef.current && !sensiblesRef.current.contains(e.target as Node)) setShowDropdownSensibles(false)
    }
    document.addEventListener("mousedown", handleClickAfuera)
    return () => document.removeEventListener("mousedown", handleClickAfuera)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && !isRefreshing && !isDragging && !isCalcDragging) {
      startYRef.current = e.touches[0].clientY
      isPullingRef.current = true
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startYRef.current

    if (diff > 0) {
      const resistance = Math.min(diff * 0.35, 130)
      setPullDistance(resistance)
      if (resistance > 10 && e.cancelable) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return
    isPullingRef.current = false

    if (pullDistance >= 115) {
      setIsRefreshing(true)
      setPullDistance(50)

      setTimeout(() => {
        resetFormulario()
        setIsRefreshing(false)
        setPullDistance(0)
      }, 1200)
    } else {
      setPullDistance(0)
    }
  }

  const resetFormulario = () => {
    setAgente(agentesDisponibles[0].value)
    setAgentePropio("")
    setPeso("")
    setVolumen("")
    setAlto("")
    setAncho("")
    setProfundidad("")
    setShowCalculadora(false)
    setMedidasConfirmadas(false)
    setManualConfirmado(false)
    setIsConfirmingManual(false)
    setIsCalculating(false)
    setVolumenRealTime("0.000")
    setRubrosSeleccionados([])
    setDetallesRubros({})
    setDescripcionOtroRubro("")
    setSensiblesSeleccionados([])
    setDetallesSensibles({})
    setShowTooltip(false)
    setArchivoAdjunto(null)
    setShowMenuAdjuntos(false)
    setDragX(0)
    setCalcDragX(0)
    setIsLoading(false)
    setIsSuccess(false)
    setErrorMessage(false)
  }

  const handleBackClick = () => {
    if (isSuccess) {
      resetFormulario()
    }
  }

  const verificarFormularioValido = (): boolean => {
    if (agente === "otro" && !agentePropio.trim()) return false
    if (!peso || Number.parseFloat(peso) <= 0) return false
    if (!volumen || Number.parseFloat(volumen) <= 0) return false
    if (!medidasConfirmadas && !manualConfirmado) return false
    if (rubrosSeleccionados.length === 0) return false

    for (const id of rubrosSeleccionados) {
      const detalle = detallesRubros[id]
      if (!detalle) return false
      if (!detalle.fob || Number.parseFloat(detalle.fob) <= 0) return false
      if (!detalle.unidades || Number.parseInt(detalle.unidades) <= 0) return false
      if (id === "otro" && !descripcionOtroRubro.trim()) return false
    }

    for (const id of sensiblesSeleccionados) {
      const detalle = detallesSensibles[id]
      if (!detalle || !detalle.cantidad || Number.parseInt(detalle.cantidad) <= 0) return false
      if (!detalle.descripcion.trim()) return false
    }

    return true
  }

  const maxDrag = sliderRef.current ? sliderRef.current.clientWidth - 58 : 240
  const maxCalcDrag = calcSliderRef.current ? calcSliderRef.current.clientWidth - 46 : 240

  const handleCalcDragStart = (clientX: number) => {
    const tienePesoPrevio = peso && Number.parseFloat(peso) > 0
    if (medidasConfirmadas || isCalculating || !alto || !ancho || !profundidad || !tienePesoPrevio) return
    setIsCalcDragging(true)
    calcStartXRef.current = clientX
  }

  const handleCalcDragMove = (clientX: number) => {
    if (!isCalcDragging || medidasConfirmadas || isCalculating) return
    const currentDelta = clientX - calcStartXRef.current
    const currentX = Math.max(0, Math.min(currentDelta, maxCalcDrag))
    setCalcDragX(currentX)
  }

  const handleCalcDragEnd = () => {
    if (!isCalcDragging) return
    setIsCalcDragging(false)

    if (calcDragX >= maxCalcDrag * 0.85) {
      setCalcDragX(maxCalcDrag)
      ejecutarConfirmacionMedidas()
    } else {
      setCalcDragX(0)
    }
  }

  const handleDragStart = (clientX: number) => {
    if (isSuccess || isLoading) return
    setIsDragging(true)
    startXRef.current = clientX
    setErrorMessage(false)
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging || isSuccess || isLoading) return
    const currentDelta = clientX - startXRef.current
    const currentX = Math.max(0, Math.min(currentDelta, maxDrag))
    setDragX(currentX)
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const valido = verificarFormularioValido()

    if (dragX >= maxDrag * 0.82 && valido) {
      setDragX(maxDrag)
      setIsLoading(true)

      setTimeout(() => {
        setIsLoading(false)
        setIsSuccess(true)
      }, 1500)

    } else {
      if (dragX > 20 && !valido) {
        setErrorMessage(true)
      }
      setDragX(0)
    }
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleDragEnd()
      handleCalcDragEnd()
    }
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX)
      handleCalcDragMove(e.clientX)
    }

    // NUEVO: Manejadores de eventos táctiles para soporte mobile completo en ambos sliders
    const handleGlobalTouchEnd = () => {
      handleDragEnd()
      handleCalcDragEnd()
    }
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientX)
        handleCalcDragMove(e.touches[0].clientX)
      }
    }

    if (isDragging || isCalcDragging) {
      window.addEventListener("mouseup", handleGlobalMouseUp)
      window.addEventListener("mousemove", handleGlobalMouseMove)
      
      // Añadidos los listeners táctiles globales
      window.addEventListener("touchend", handleGlobalTouchEnd)
      window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false })
    }

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
      window.removeEventListener("mousemove", handleGlobalMouseMove)
      
      // Limpieza de los listeners táctiles globales
      window.removeEventListener("touchend", handleGlobalTouchEnd)
      window.removeEventListener("touchmove", handleGlobalTouchMove)
    }
  }, [isDragging, dragX, isCalcDragging, calcDragX, isLoading, isSuccess, medidasConfirmadas, alto, ancho, profundidad, peso])

  const handleSelectRubroCustom = (id: string) => {
    if (!rubrosSeleccionados.includes(id)) {
      setRubrosSeleccionados(prev => [...prev, id])
      setDetallesRubros(prev => ({
        ...prev,
        [id]: { fob: "", unidades: "", pesoIndividual: "" }
      }))
    }
    setShowDropdownRubros(false)
  }

  const handleRemoveRubro = (id: string) => {
    setRubrosSeleccionados(prev => prev.filter(item => item !== id))
    setDetallesRubros(prev => { const copy = { ...prev }; delete copy[id]; return copy })
    if (id === "otro") setDescripcionOtroRubro("")
  }

  const updateDetalleRubro = (id: string, field: keyof DetalleRubro, value: string) => {
    setDetallesRubros(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const handleSelectSensibleCustom = (id: string) => {
    if (!sensiblesSeleccionados.includes(id)) {
      setSensiblesSeleccionados(prev => [...prev, id])
      setDetallesSensibles(prev => ({ ...prev, [id]: { cantidad: "", descripcion: "" } }))
    }
    setShowDropdownSensibles(false)
  }

  const handleRemoveSensible = (id: string) => {
    setSensiblesSeleccionados(prev => prev.filter(item => item !== id))
    setDetallesSensibles(prev => { const copy = { ...prev }; delete copy[id]; return copy })
  }

  const progressRatio = maxDrag > 0 ? dragX / maxDrag : 0
  const calcProgressRatio = maxCalcDrag > 0 ? calcDragX / maxCalcDrag : 0
  const agenteActualLabel = agentesDisponibles.find(a => a.value === agente)?.label || "Seleccionar..."

  const tienePesoValido = peso && Number.parseFloat(peso) > 0
  const isSlideCalcHabilitado = alto && ancho && profundidad && !isCalculating && !medidasConfirmadas && tienePesoValido

  // El botón manual sale si NO se está usando la calculadora y cargó ambos campos manualmente
  const mostrarBotonConfirmacionManual = !showCalculadora && !medidasConfirmadas && peso && volumen && Number.parseFloat(peso) > 0 && Number.parseFloat(volumen) > 0

  // REQUISITOS CLAVE DE BLOQUEO:
  const isVolumenInputDisabled = showCalculadora || medidasConfirmadas
  const isPesoInputDisabled = medidasConfirmadas

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center bg-[#050507] p-0 sm:p-8"
      onClick={() => { setShowTooltip(false); setShowMenuAdjuntos(false) }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes pulseArrow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes pulseRow {
          0%, 100% { background-color: rgba(255, 255, 255, 0.15); }
          50% { background-color: rgba(255, 255, 255, 0.05); }
        }
        .animate-pulse-glow { animation: pulseGlow 2s infinite ease-in-out; }
        .animate-pulse-arrow { animation: pulseArrow 1.5s infinite ease-in-out; }
        .hover\\:animate-pulse-row:hover { animation: pulseRow 1.5s infinite ease-in-out; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Regla CSS añadida para bloquear el pull-to-refresh nativo en navegadores móviles */
        .mobile-container-fix {
          overscroll-behavior-y: contain;
          touch-action: pan-y;
        }
      `}} />

      <div
        className="relative w-full max-w-[400px] sm:rounded-[3.2rem] sm:border sm:border-[#1f2029] sm:bg-[#0a0a0e] sm:p-2 sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full flex min-h-dvh flex-col overflow-hidden bg-background sm:min-h-[844px] sm:rounded-[2.6rem] mobile-container-fix"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull To Refresh */}
          <div
            className="absolute left-0 top-0 w-full flex items-center justify-center pointer-events-none z-40 transition-all duration-150"
            style={{
              height: `${pullDistance}px`,
              opacity: Math.min(pullDistance / 50, 1),
              transform: `translateY(${pullDistance > 50 ? 0 : pullDistance - 35}px)`
            }}
          >
            <div className="flex items-center gap-2 rounded-full bg-[#12131a] border border-border/60 px-3 py-1.2 shadow-xl">
              <RefreshCw
                className={`h-3.5 w-3.5 text-amber-500 ${isRefreshing ? 'animate-spin' : ''}`}
                style={{ transform: !isRefreshing ? `rotate(${pullDistance * 4.5}deg)` : 'none' }}
              />
              <span className="text-[10px] font-medium text-muted-foreground/80">
                {pullDistance >= 115 ? "Soltá para limpiar" : "Deslizá para reiniciar"}
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-3 z-20 hidden h-7 w-28 -translate-x-1/2 rounded-full bg-black sm:block" />

          {/* Header */}
          <header className="flex items-center justify-between px-6 pb-2 pt-8 sm:pt-14 shrink-0">
            <button
              type="button"
              onClick={handleBackClick}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">Nueva Postulación</span>
            <div className="h-9 w-9" />
          </header>

          {/* Contenido Desplazable */}
          <div
            ref={scrollContainerRef}
            className="flex flex-1 flex-col px-6 pt-4 overflow-y-auto max-h-[calc(100vh-100px)] sm:max-h-[730px] pb-6 scrollbar-none transition-transform duration-150"
            style={{ transform: pullDistance > 0 ? `translateY(${pullDistance * 0.4}px)` : 'none' }}
          >
            <div className="flex flex-col gap-2">
              <h1 className="text-pretty text-[26px] font-semibold leading-tight tracking-tight text-foreground">
                ¿Qué estás importando?
              </h1>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Declará los datos de tu carga en China
              </p>
            </div>

            <form className="mt-7 flex flex-1 flex-col gap-5" onSubmit={(e) => e.preventDefault()}>

              {/* 1. Depósito de origen */}
              <Field label="Depósito de Origen (China)" icon={<Box className="h-4 w-4" strokeWidth={1.75} />}>
                <div className="flex flex-col gap-3 relative" ref={agenteRef}>
                  <div
                    onClick={() => setShowDropdownAgente(!showDropdownAgente)}
                    className={`flex items-center justify-between w-full rounded-lg border bg-surface px-4 py-3.5 text-[15px] font-medium transition-all cursor-pointer select-none ${showDropdownAgente ? "border-amber-500/40 text-foreground shadow-[0_0_12px_rgba(245,158,11,0.1)]" : "border-border text-foreground"
                      }`}
                  >
                    <span>{agenteActualLabel}</span>
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2 w-2 items-center justify-center">
                        <span className="absolute inline-flex h-2 w-2 rounded-full bg-white animate-pulse-glow" />
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showDropdownAgente ? "rotate-180" : ""}`} strokeWidth={1.75} />
                    </div>
                  </div>

                  {showDropdownAgente && (
                    <div className="absolute top-[105%] left-0 z-50 w-full rounded-xl border border-border bg-[#0d0e15] p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      {agentesDisponibles.map((a) => (
                        <button
                          type="button"
                          key={a.value}
                          onClick={() => { setAgente(a.value); setShowDropdownAgente(false) }}
                          className="flex w-full items-center px-3 py-2.5 text-left text-[14px] font-medium rounded-lg text-foreground transition-all hover:text-white hover:animate-pulse-row"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {agente === "otro" && (
                    <input
                      value={agentePropio}
                      onChange={(e) => setAgentePropio(e.target.value)}
                      placeholder="Especificá el nombre de tu agente"
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-[14px] text-foreground outline-none transition-colors focus:border-amber-500/40 placeholder:text-muted-foreground/40"
                    />
                  )}
                </div>
              </Field>

              {/* Peso + Volumen */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Peso Total" icon={<Weight className="h-4 w-4" strokeWidth={1.75} />}>
                    <div className="relative">
                      <input
                        value={peso}
                        onChange={(e) => handleManualInputChange('peso', e.target.value)}
                        disabled={isPesoInputDisabled}
                        inputMode="decimal"
                        placeholder="0"
                        className={`w-full rounded-lg border bg-surface px-4 py-3.5 pr-11 font-mono text-[15px] outline-none transition-colors ${isPesoInputDisabled
                          ? "border-border/40 text-muted-foreground/50 bg-surface/30 cursor-not-allowed select-none"
                          : "border-border text-foreground focus:border-amber-500/40"
                          }`}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground">kg</span>
                    </div>
                  </Field>

                  <Field label="Volumen" icon={<Boxes className="h-4 w-4" strokeWidth={1.75} />}>
                    <div className="relative">
                      <input
                        value={volumen}
                        onChange={(e) => handleManualInputChange('volumen', e.target.value)}
                        disabled={isVolumenInputDisabled}
                        inputMode="decimal"
                        placeholder={showCalculadora ? "Auto" : "0"}
                        className={`w-full rounded-lg border bg-surface px-4 py-3.5 pr-12 font-mono text-[15px] outline-none transition-colors ${isVolumenInputDisabled
                          ? "border-border/40 text-muted-foreground/50 bg-surface/30 cursor-not-allowed select-none"
                          : "border-border text-foreground focus:border-amber-500/40"
                          }`}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground">m³</span>
                    </div>
                  </Field>
                </div>

                {/* Botón de Confirmación Manual */}
                {mostrarBotonConfirmacionManual && (
                  <button
                    type="button"
                    disabled={isConfirmingManual}
                    onClick={ejecutarConfirmacionManual}
                    className={`w-full py-2.5 px-4 rounded-xl border text-[13px] font-semibold tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${manualConfirmado
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-surface border-border text-amber-500 hover:border-amber-500/30 hover:bg-surface/80"
                      }`}
                  >
                    {isConfirmingManual ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        <span>Confirmando medidas...</span>
                      </>
                    ) : manualConfirmado ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                        <span>✓ Medidas Confirmadas</span>
                      </>
                    ) : (
                      <span>Confirmar datos ingresados</span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowCalculadora(!showCalculadora)
                    if (!showCalculadora) {
                      setManualConfirmado(false)
                    }
                  }}
                  className="flex items-center gap-2 text-[12px] font-medium text-amber-500/80 hover:text-amber-500 transition-colors w-fit pl-1 mt-1"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  {showCalculadora ? "Ocultar calculadora manual" : "Calcular m³ de manera automática"}
                </button>

                {/* Calculadora de m3 */}
                {showCalculadora && (
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-[#0d0e15] p-3.5 animate-in fade-in slide-in-from-top-2 duration-200">

                    {!tienePesoValido && !medidasConfirmadas && (
                      <div className="text-[11px] text-amber-500/90 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 flex items-start gap-1.5 leading-normal">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>Falta rellenar el campo de <strong>Peso Total (kg)</strong> arriba. Es obligatorio completarlo antes de poder confirmar las medidas del paquete.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground font-medium pl-1">Alto</span>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={alto}
                            onChange={(e) => setAlto(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-[13px] text-foreground outline-none focus:border-amber-500/30"
                          />
                          <span className="absolute right-2 bottom-2 text-[10px] text-muted-foreground/30 font-mono">cm</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground font-medium pl-1">Ancho</span>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={ancho}
                            onChange={(e) => setAncho(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-[13px] text-foreground outline-none focus:border-amber-500/30"
                          />
                          <span className="absolute right-2 bottom-2 text-[10px] text-muted-foreground/30 font-mono">cm</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground font-medium pl-1">Profundidad</span>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={profundidad}
                            onChange={(e) => setProfundidad(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-[13px] text-foreground outline-none focus:border-amber-500/30"
                          />
                          <span className="absolute right-2 bottom-2 text-[10px] text-muted-foreground/30 font-mono">cm</span>
                        </div>
                      </div>
                    </div>

                    {/* Minislide de la Calculadora */}
                    <div
                      ref={calcSliderRef}
                      className="relative h-11 w-full rounded-xl border bg-surface/80 border-border/60 flex items-center justify-center overflow-hidden select-none"
                    >
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all"
                        style={{
                          width: `${calcDragX > 0 || isCalculating || medidasConfirmadas ? '100%' : '0px'}`,
                          opacity: calcDragX > 0 || isCalculating || medidasConfirmadas ? 1 : 0,
                          transition: isCalcDragging ? "none" : "width 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms"
                        }}
                      />

                      <span
                        className="absolute text-[12px] font-semibold tracking-wide text-foreground/90 transition-all pointer-events-none px-4 text-center"
                        style={{
                          opacity: medidasConfirmadas || isCalculating ? 1 : Math.max(0, 1 - calcProgressRatio * 1.8),
                          color: medidasConfirmadas || isCalculating ? "#fff" : "inherit"
                        }}
                      >
                        {isCalculating ? "Procesando..." : medidasConfirmadas ? "✓ Medidas y Peso Confirmados" : "Confirmar medidas del paquete"}
                      </span>

                      <div
                        onMouseDown={(e) => handleCalcDragStart(e.clientX)}
                        onTouchStart={(e) => { if (e.touches.length > 0) handleCalcDragStart(e.touches[0].clientX) }}
                        className={`absolute left-1 h-8 w-8 rounded-lg flex items-center justify-center shadow-md transition-all ${isCalculating || medidasConfirmadas
                          ? "bg-white text-amber-600 scale-95"
                          : !isSlideCalcHabilitado
                            ? "bg-surface border border-border/40 text-muted-foreground/20 cursor-not-allowed"
                            : "bg-[#0f1016] border border-border text-white cursor-grab active:cursor-grabbing"
                          }`}
                        style={{
                          transform: `translateX(${isCalculating || medidasConfirmadas ? maxCalcDrag : calcDragX}px)`,
                          transition: isCalcDragging ? "none" : "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                        }}
                      >
                        {isCalculating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500" strokeWidth={2.5} />
                        ) : medidasConfirmadas ? (
                          <CheckCircle2 className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                        ) : (
                          <ChevronRight className={`h-4 w-4 text-white ${isSlideCalcHabilitado && !isCalcDragging ? "animate-pulse-arrow" : ""}`} strokeWidth={3} />
                        )}
                      </div>
                    </div>

                    <div className="mt-1 rounded-lg bg-surface/60 border border-border/40 px-3 py-2 flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-muted-foreground/50 tracking-wider uppercase">Paquete Provisorio</div>
                      <div className="text-[13px] text-muted-foreground">
                        Volumen total: <strong className={medidasConfirmadas ? "text-emerald-400 font-mono font-medium" : "text-amber-500 font-mono font-semibold"}>{volumenRealTime} m³</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Desglose de Rubros */}
              <Field label="Contenido y Desglose de Rubros" icon={<Tag className="h-4 w-4" strokeWidth={1.75} />}>
                <div className="flex flex-col gap-3 relative" ref={rubrosRef}>
                  <div className="relative">
                    <div
                      onClick={() => setShowDropdownRubros(!showDropdownRubros)}
                      className={`flex items-center justify-between w-full rounded-lg border bg-surface px-4 py-3.5 text-[15px] font-medium transition-all cursor-pointer select-none ${showDropdownRubros ? "border-amber-500/40 text-foreground shadow-[0_0_12px_rgba(245,158,11,0.1)]" : "border-border text-muted-foreground"
                        }`}
                    >
                      <span>Seleccionar rubro para añadir...</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showDropdownRubros ? "rotate-180" : ""}`} strokeWidth={1.75} />
                    </div>

                    {showDropdownRubros && (
                      <div className="absolute top-[105%] left-0 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-[#0d0e15] p-1.5 shadow-2xl scrollbar-none animate-in fade-in slide-in-from-top-2 duration-200">
                        {listaRubrosLogistica.map((r) => {
                          const yaSeleccionado = rubrosSeleccionados.includes(r.id)
                          return (
                            <button
                              type="button"
                              key={r.id}
                              disabled={yaSeleccionado}
                              onClick={() => handleSelectRubroCustom(r.id)}
                              className={`flex w-full items-center px-3 py-2.5 text-left text-[14px] font-medium rounded-lg transition-all ${yaSeleccionado
                                ? "text-muted-foreground/30 cursor-not-allowed bg-transparent"
                                : "text-foreground hover:text-white hover:animate-pulse-row"
                                }`}
                            >
                              {r.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {rubrosSeleccionados.length > 0 && (
                    <div className="flex flex-col gap-4 rounded-lg border border-border bg-[#0d0e14] p-3.5">
                      {rubrosSeleccionados.map((rubroId) => {
                        const rubroObj = listaRubrosLogistica.find(l => l.id === rubroId)
                        const detalle = detallesRubros[rubroId] || { fob: "", unidades: "", pesoIndividual: "" }
                        return (
                          <div key={rubroId} className="flex flex-col gap-3 pb-3.5 border-b border-border/30 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[14px] font-semibold text-amber-500/90">{rubroObj?.label}</span>
                              <button type="button" onClick={() => handleRemoveRubro(rubroId)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {rubroId === "otro" && (
                              <input
                                value={descripcionOtroRubro}
                                onChange={(e) => setDescripcionOtroRubro(e.target.value)}
                                placeholder="Describí brevemente qué mercancía es"
                                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-amber-500/30 placeholder:text-muted-foreground/30"
                              />
                            )}

                            <div className="flex items-center justify-between gap-4 pl-1">
                              <span className="text-[12px] text-muted-foreground">Valor FOB total:</span>
                              <div className="relative w-36">
                                <input type="number" value={detalle.fob} onChange={(e) => updateDetalleRubro(rubroId, "fob", e.target.value)} placeholder="0.00" className="w-full rounded-md border border-border bg-surface py-1.5 pl-3 pr-10 font-mono text-[13px] text-right text-foreground outline-none focus:border-amber-500/40" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">USD</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 pl-1">
                              <span className="text-[12px] text-muted-foreground">Unidades del artículo:</span>
                              <div className="relative w-36">
                                <input type="number" value={detalle.unidades} onChange={(e) => updateDetalleRubro(rubroId, "unidades", e.target.value)} placeholder="0" className="w-full rounded-md border border-border bg-surface py-1.5 pl-3 pr-10 font-mono text-[13px] text-right text-foreground outline-none focus:border-amber-500/40" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">un.</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 pl-1">
                              <span className="text-[12px] text-muted-foreground flex flex-col">
                                <span>Peso por unidad:</span>
                                <span className="text-[10px] text-muted-foreground/40 italic">(Opcional)</span>
                              </span>
                              <div className="relative w-36">
                                <input type="number" step="0.01" value={detalle.pesoIndividual} onChange={(e) => updateDetalleRubro(rubroId, "pesoIndividual", e.target.value)} placeholder="0.00" className="w-full rounded-md border border-border bg-surface py-1.5 pl-3 pr-10 font-mono text-[13px] text-right text-foreground outline-none focus:border-amber-500/40" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">kg</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Field>

              {/* 3. Carga Sensible */}
              <div className="flex flex-col gap-2.5">
                <div
                  className="flex items-center gap-2 text-amber-500/90 cursor-pointer select-none group w-fit"
                  onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip) }}
                >
                  <span><AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.75} /></span>
                  <label className="text-[13px] font-medium group-hover:text-amber-400 transition-colors">
                    Declaración de Mercancía Sensible
                  </label>
                  <HelpCircle className="h-3.5 w-3.5 text-amber-500/40 group-hover:text-amber-500/70 transition-colors" strokeWidth={1.75} />
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showTooltip ? 'max-h-[350px] opacity-100 py-1' : 'max-h-0 opacity-0'}`}>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3.5 text-[12px] leading-relaxed text-muted-foreground/80 shadow-sm flex flex-col gap-2">
                    <p>Esta categoría exige <strong>canales de inspección aduanera especiales en China y destino</strong> debido a normativas internacionales de seguridad y transporte.</p>
                    <div className="flex flex-col gap-1 pl-1">
                      <p>⚠️ <strong>Baterías y Pilas:</strong> Celdas de litio sueltas o integradas en dispositivos electrónicos (requieren fichas técnicas MSDS).</p>
                      <p>⚠️ <strong>Líquidos y Polvos:</strong> Cremas, cosméticos, aceites, geles o reactivos químicos que necesitan análisis de laboratorio no peligrosos.</p>
                      <p>⚠️ <strong>Productos Magnéticos:</strong> Motores, imanes permanentes o parlantes que alteran la navegación aérea si no están blindados.</p>
                      <p>⚠️ <strong>Marcas Registradas (Réplicas):</strong> Indumentaria, accesorios o calzado que emulan logotipos patentados y requieren validación aduanera específica.</p>
                    </div>
                  </div>
                </div>

                <div className="relative" ref={sensiblesRef}>
                  <div
                    onClick={() => setShowDropdownSensibles(!showDropdownSensibles)}
                    className={`flex items-center justify-between w-full rounded-lg border bg-surface px-4 py-3.5 text-[15px] font-medium transition-all cursor-pointer select-none ${showDropdownSensibles ? "border-amber-500/40 text-foreground shadow-[0_0_12px_rgba(245,158,11,0.1)]" : "border-border text-muted-foreground"
                      }`}
                  >
                    <span>Seleccionar tipo de carga sensible...</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showDropdownSensibles ? "rotate-180" : ""}`} strokeWidth={1.75} />
                  </div>

                  {showDropdownSensibles && (
                    <div className="absolute top-[105%] left-0 z-50 w-full rounded-xl border border-border bg-[#0d0e15] p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      {listaMercanciasSensibles.map((item) => {
                        const yaSeleccionado = sensiblesSeleccionados.includes(item.id)
                        return (
                          <button
                            type="button"
                            key={item.id}
                            disabled={yaSeleccionado}
                            onClick={() => handleSelectSensibleCustom(item.id)}
                            className={`flex w-full items-center px-3 py-2.5 text-left text-[14px] font-medium rounded-lg transition-all ${yaSeleccionado
                              ? "text-muted-foreground/30 cursor-not-allowed bg-transparent"
                              : "text-foreground hover:text-white hover:animate-pulse-row"
                              }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {sensiblesSeleccionados.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3.5">
                    {sensiblesSeleccionados.map((sensibleId) => {
                      const sensibleObj = listaMercanciasSensibles.find(s => s.id === sensibleId)
                      return (
                        <div key={sensibleId} className="flex flex-col gap-3 pb-3 border-b border-amber-500/10 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-medium text-amber-500">{sensibleObj?.label}</span>
                            <button type="button" onClick={() => handleRemoveSensible(sensibleId)} className="text-muted-foreground/60 hover:text-amber-500 transition-colors p-0.5">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-4 pl-1">
                            <span className="text-[12px] text-muted-foreground/80 flex items-center gap-1">
                              <Hash className="h-3 w-3 text-amber-500/50" /> Cantidad total:
                            </span>
                            <div className="relative w-32">
                              <input type="number" value={detallesSensibles[sensibleId]?.cantidad || ""} onChange={(e) => setDetallesSensibles({ ...detallesSensibles, [sensibleId]: { ...(detallesSensibles[sensibleId] || { descripcion: "" }), cantidad: e.target.value } })} placeholder="0" className="w-full rounded-md border border-amber-500/20 bg-surface py-1.5 pl-3 pr-10 font-mono text-[13px] text-right text-foreground outline-none focus:border-amber-500/50" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground/60">u.</span>
                            </div>
                          </div>
                          <input value={detallesSensibles[sensibleId]?.descripcion || ""} onChange={(e) => setDetallesSensibles({ ...detallesSensibles, [sensibleId]: { ...(detallesSensibles[sensibleId] || { cantidad: "" }), descripcion: e.target.value } })} placeholder="Ej: 50 sets de labiales líquidos" className="w-full rounded-md border border-amber-500/20 bg-[#07080c] px-3 py-2 text-[13px] text-foreground outline-none focus:border-amber-500/30 placeholder:text-muted-foreground/30" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Adjuntar Documentación */}
              <Field label="Packing List / Invoice Comercial (Opcional)" icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}>
                <div className="relative flex flex-col gap-2.5">
                  {!archivoAdjunto ? (
                    <div
                      onClick={(e) => { e.stopPropagation(); setShowMenuAdjuntos(!showMenuAdjuntos) }}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-5 text-center cursor-pointer hover:bg-surface/80 hover:border-amber-500/20 transition-all group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background border border-border group-hover:scale-105 transition-transform">
                        <Upload className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" strokeWidth={1.75} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-foreground">Adjuntar documento digital</span>
                        <span className="text-[11px] text-muted-foreground/60">Soporta formatos PDF de tu proveedor</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3 text-foreground">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-amber-500/10 text-emerald-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate text-[13px] font-medium font-mono">{archivoAdjunto.nombre}</span>
                          <span className="text-[11px] text-muted-foreground/60 capitalize">Desde {archivoAdjunto.origen}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setArchivoAdjunto(null)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {showMenuAdjuntos && (
                    <div className="absolute top-[102%] left-0 z-30 w-full rounded-xl border border-border bg-[#0d0e15] p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="text-[11px] font-medium text-muted-foreground/50 px-2.5 py-1.5 tracking-wider uppercase">Seleccionar Origen</div>
                      <div className="grid grid-cols-1 gap-1">
                        <button type="button" onClick={() => { setArchivoAdjunto({ nombre: `PL_DRIVE_${Math.floor(1000 + Math.random() * 9000)}.pdf`, origen: "Google Drive" }); setShowMenuAdjuntos(false) }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-[13px] font-medium text-foreground hover:text-white hover:animate-pulse-row">
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24"><path fill="#0066da" d="M15.42 12.21l-3.37-5.88h6.75l3.37 5.88z" /><path fill="#00aa47" d="M8.65 24l3.38-5.88h6.74L15.39 24z" /><path fill="#ffba00" d="M0 18.12L3.37 12.2h6.75l-3.37 5.92z" /></svg>
                          Google Drive
                        </button>
                        <button type="button" onClick={() => { setArchivoAdjunto({ nombre: `PL_DROPBOX_${Math.floor(1000 + Math.random() * 9000)}.pdf`, origen: "Dropbox" }); setShowMenuAdjuntos(false) }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-[13px] font-medium text-foreground hover:text-white hover:animate-pulse-row">
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M6 2L1 5.5L6 9L11 5.5L6 2Z" fill="#0061FF" /><path d="M18 2L13 5.5L18 9L23 5.5L18 2Z" fill="#0061FF" /><path d="M1 12.5L6 16L11 12.5L6 9L1 12.5Z" fill="#0061FF" /><path d="M23 12.5L18 16L13 12.5L18 9L23 12.5Z" fill="#0061FF" /><path d="M6 17L11 20.5L16 17L11 13.5L6 17Z" fill="#0061FF" /></svg>
                          Dropbox
                        </button>
                        <button type="button" onClick={() => { setArchivoAdjunto({ nombre: `PL_LOCAL_${Math.floor(1000 + Math.random() * 9000)}.pdf`, origen: "Archivos" }); setShowMenuAdjuntos(false) }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-[13px] font-medium text-foreground hover:text-white hover:animate-pulse-row">
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#1c93f3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V7.5L16.5 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                          Archivos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {/* Mensaje de Error */}
              {errorMessage && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-destructive animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive/80" />
                  <span className="text-[13px] font-medium leading-normal">
                    {!peso || !volumen ? "Faltan ingresar las dimensions de carga" : (!medidasConfirmadas && !manualConfirmado) ? "Por favor confirma las medidas de la carga antes de publicar" : "Información obligatoria faltante"}
                  </span>
                </div>
              )}

              {/* Slider de Publicación Principal */}
              <div className="mt-auto flex flex-col gap-4 pb-4 pt-2 shrink-0">
                <div
                  ref={sliderRef}
                  className="relative h-16 w-full rounded-2xl bg-surface/80 border border-border/60 flex items-center justify-center overflow-hidden select-none"
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all"
                    style={{
                      width: `${dragX > 0 || isLoading || isSuccess ? '100%' : '0px'}`,
                      opacity: dragX > 0 || isLoading || isSuccess ? 1 : 0,
                      transition: isDragging ? "none" : "width 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms"
                    }}
                  />

                  <span
                    className="absolute text-[14px] font-semibold tracking-wide text-foreground/90 transition-all pointer-events-none"
                    style={{
                      opacity: isSuccess || isLoading ? 1 : Math.max(0, 1 - progressRatio * 1.8),
                      color: isSuccess || isLoading ? "#fff" : "inherit"
                    }}
                  >
                    {isLoading ? "Procesando..." : isSuccess ? "¡Licitación Publicada!" : "Deslizar para publicar"}
                  </span>

                  <div
                    onMouseDown={(e) => handleDragStart(e.clientX)}
                    onTouchStart={(e) => { if (e.touches.length > 0) handleDragStart(e.touches[0].clientX) }}
                    className={`absolute left-1.5 h-13 w-13 rounded-xl flex items-center justify-center shadow-md transition-all ${isLoading || isSuccess
                      ? "bg-white text-amber-600 scale-95"
                      : "bg-[#0f1016] border border-border text-white cursor-grab active:cursor-grabbing"
                      }`}
                    style={{
                      transform: `translateX(${isLoading || isSuccess ? maxDrag : dragX}px)`,
                      transition: isDragging ? "none" : "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" strokeWidth={2.5} />
                    ) : isSuccess ? (
                      <CheckCircle2 className="h-5 w-5 text-amber-600" strokeWidth={2.5} />
                    ) : (
                      <ChevronRight className={`h-6 w-6 text-white ${!isDragging ? "animate-pulse-arrow" : ""}`} strokeWidth={3} />
                    )}
                  </div>
                </div>

                <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
                  Tu identidad permanece oculta hasta concretar el pago Escrow
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        <label className="text-[13px] font-medium">{label}</label>
      </div>
      {children}
    </div>
  )
}