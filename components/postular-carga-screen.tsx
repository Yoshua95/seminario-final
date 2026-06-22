"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, ChevronDown, Box, Weight, Boxes, Tag } from "lucide-react"

const depositos = [
  { value: "cssbuy", label: "Depósito CSSBuy", ciudad: "Shenzhen, GD" },
  { value: "superbuy", label: "Depósito Superbuy", ciudad: "Guangzhou, GD" },
  { value: "pandabuy", label: "Depósito Pandabuy", ciudad: "Dongguan, GD" },
]

const categorias = [
  "Electrónica y Tecnología",
  "Indumentaria y Calzado",
  "Hogar y Decoración",
  "Repuestos y Autopartes",
  "Juguetes y Hobbies",
]

export function PostularCargaScreen() {
  const [deposito, setDeposito] = useState(depositos[0].value)
  const [categoria, setCategoria] = useState(categorias[0])
  const [peso, setPeso] = useState("96")
  const [volumen, setVolumen] = useState("2.18")

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#050507] p-0 sm:p-8">
      {/* Marco tipo iPhone 15 Pro */}
      <div className="relative w-full max-w-[400px] sm:rounded-[3.2rem] sm:border sm:border-[#1f2029] sm:bg-[#0a0a0e] sm:p-2 sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        {/* Pantalla */}
        <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-background sm:min-h-[844px] sm:rounded-[2.6rem]">
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 hidden h-7 w-28 -translate-x-1/2 rounded-full bg-black sm:block" />

          {/* Header */}
          <header className="flex items-center justify-between px-6 pb-2 pt-8 sm:pt-14">
            <button
              type="button"
              aria-label="Volver atrás"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">Nueva Postulación</span>
            <div className="h-9 w-9" aria-hidden />
          </header>

          {/* Contenido */}
          <div className="flex flex-1 flex-col px-6 pt-8">
            {/* Sección principal */}
            <div className="flex flex-col gap-2">
              <h1 className="text-pretty text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                ¿Qué estás importando?
              </h1>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Declará los datos de tu carga en China
              </p>
            </div>

            {/* Formulario */}
            <form className="mt-9 flex flex-1 flex-col gap-5">
              {/* Depósito de origen */}
              <Field label="Depósito de Origen (China)" icon={<Box className="h-4 w-4" strokeWidth={1.75} />}>
                <div className="relative">
                  <select
                    value={deposito}
                    onChange={(e) => setDeposito(e.target.value)}
                    className="peer w-full appearance-none rounded-lg border border-border bg-surface px-4 py-3.5 pr-11 text-[15px] font-medium text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    {depositos.map((d) => (
                      <option key={d.value} value={d.value} className="bg-[#0c0d12] text-foreground">
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {/* Punto verde indicador */}
                  <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  </span>
                  <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </div>
              </Field>

              {/* Fila doble: Peso + Volumen */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Peso Total" icon={<Weight className="h-4 w-4" strokeWidth={1.75} />}>
                  <div className="relative">
                    <input
                      value={peso}
                      onChange={(e) => setPeso(e.target.value)}
                      inputMode="decimal"
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 pr-11 font-mono text-[15px] text-foreground outline-none transition-colors focus:border-primary/50"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground">
                      kg
                    </span>
                  </div>
                </Field>

                <Field label="Volumen" icon={<Boxes className="h-4 w-4" strokeWidth={1.75} />}>
                  <div className="relative">
                    <input
                      value={volumen}
                      onChange={(e) => setVolumen(e.target.value)}
                      inputMode="decimal"
                      className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 pr-12 font-mono text-[15px] text-foreground outline-none transition-colors focus:border-primary/50"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground">
                      m³
                    </span>
                  </div>
                </Field>
              </div>

              {/* Categoría */}
              <Field label="Categoría de Mercadería" icon={<Tag className="h-4 w-4" strokeWidth={1.75} />}>
                <div className="relative">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-border bg-surface px-4 py-3.5 pr-11 text-[15px] font-medium text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    {categorias.map((c) => (
                      <option key={c} value={c} className="bg-[#0c0d12] text-foreground">
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </div>
              </Field>

              {/* CTA */}
              <div className="mt-auto flex flex-col gap-4 pb-10 pt-6">
                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-lg bg-primary py-4 text-[15px] font-semibold tracking-tight text-primary-foreground transition-all hover:brightness-110 active:scale-[0.99]"
                >
                  <span className="relative z-10">Publicar Licitación Anónima</span>
                </button>
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

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
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
