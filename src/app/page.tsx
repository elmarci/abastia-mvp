import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  Clock,
  Coffee,
  GraduationCap,
  HardHat,
  Hospital,
  Hotel,
  Layers,
  PackageSearch,
  PhoneOff,
  Recycle,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingDown,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculadora } from "@/modules/landing/componentes/calculadora";
import { FormularioPiloto } from "@/modules/landing/componentes/formulario-piloto";
import { usuarioActual } from "@/lib/sesion";
import { INICIO_POR_ROL } from "@/lib/permisos";
import { PRECIO_PLAN_PRO } from "@/lib/negocio";

export default async function Landing() {
  const usuario = await usuarioActual();
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="AbastIA">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Secciones">
            <a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a>
            <a href="#para-quien" className="hover:text-foreground">Para quién</a>
            <a href="#calculadora" className="hover:text-foreground">Calculadora</a>
            <a href="#planes" className="hover:text-foreground">Planes</a>
            <Link href="/tienda" className="hover:text-foreground">Tienda</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {usuario ? (
              <Button asChild>
                <Link href={INICIO_POR_ROL[usuario.rol]}>Ir a mi panel</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/login">Ingresar</Link>
                </Button>
                <Button asChild>
                  <a href="#piloto">Piloto gratis</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent),radial-gradient(40rem_24rem_at_0%_10%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]" />
          <div className="relative mx-auto grid grid-cols-1 max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
            <div>
              <Badge variant="secondary" className="mb-5">
                <Sparkles className="size-3" /> Abastecimiento B2B con inteligencia artificial · Lima
              </Badge>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Compra justa,
                <br />
                <span className="text-primary">a precio justo.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Todo lo que tu organización consume, a precio cercano al de origen, en la cantidad justa y con calidad garantizada, desde una sola plataforma.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="#piloto">
                    Solicita tu piloto gratuito de 30 días <ArrowRight />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Ver la demo</Link>
                </Button>
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6">
                {[
                  ["8 %+", "de ahorro promedio"],
                  ["−50 %", "tiempo comprando"],
                  ["1", "pedido, varios proveedores"],
                ].map(([v, t]) => (
                  <div key={t}>
                    <dt className="text-2xl font-semibold tracking-tight cifra sm:text-3xl">{v}</dt>
                    <dd className="text-sm text-muted-foreground">{t}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {/* Vista previa del producto */}
            <div className="relative">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-primary/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Planificador IA · Sede San Isidro</p>
                  <Badge>120 personas · 7 días</Badge>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    ["🍚", "Arroz extra saco 50 kg", "6 sacos", "Stock bajo", "alerta"],
                    ["💧", "Agua de mesa bidón 20 L", "5 bidones", "Suficiente", "exito"],
                    ["🍗", "Pollo entero fresco kg", "40 kg", "Sin stock", "peligro"],
                    ["☕", "Café tostado molido 1 kg", "4 bolsas", "Suficiente", "exito"],
                  ].map(([e, n, s, nivel, v]) => (
                    <div key={n} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <span className="text-2xl">{e}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n}</p>
                        <p className="text-xs text-muted-foreground">Sugerido: {s}</p>
                      </div>
                      <Badge variant={v as "alerta" | "exito" | "peligro"}>{nivel}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-accent/15 p-3 text-sm">
                  <span className="text-amber-800 dark:text-amber-200">Ahorro vs. promedio de mercado</span>
                  <span className="font-semibold cifra">S/ 312.40</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-border bg-card p-4 shadow-xl sm:block">
                <p className="text-xs text-muted-foreground">Arroz · mejor oferta</p>
                <p className="text-lg font-semibold cifra">S/ 176.50</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">3.3 % bajo el promedio</p>
              </div>
            </div>
          </div>
        </section>

        {/* Problema */}
        <section className="border-y border-border bg-card/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">El problema</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Comprar para una organización todavía se hace por teléfono y WhatsApp.</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [PhoneOff, "Decenas de proveedores", "Cotizar uno por uno, sin comparar precios ni plazos."],
                [TrendingDown, "Sobrecostos", "Se paga el precio del primero que contesta, no el mejor."],
                [Recycle, "Desperdicio y quiebres", "Sin planificación: sobra lo perecible y falta lo esencial."],
                [Clock, "Horas perdidas", "El responsable de compras dedica días a tareas manuales."],
              ].map(([Icono, t, d]) => {
                const I = Icono as typeof PhoneOff;
                return (
                  <div key={t as string} className="rounded-2xl border border-border bg-card p-5">
                    <I className="size-6 text-accent" />
                    <p className="mt-3 font-semibold">{t as string}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Solución y cómo funciona */}
        <section id="como-funciona" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">La solución</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Un catálogo multiproveedor con IA que te dice cuánto comprar y a quién.</h2>
            <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                [Sparkles, "1. Planifica con IA", "Indica tus personas atendidas y días a cubrir. El planificador pronostica tu consumo y sugiere la cantidad justa."],
                [PackageSearch, "2. Compara y arma un solo pedido", "Mejor oferta de proveedores homologados, precio promedio y tu ahorro. Un carrito, varios proveedores."],
                [Truck, "3. Recibe y controla", "Seguimiento por estado, recepción conforme, comprobante consolidado y panel de gasto por sede."],
              ].map(([Icono, t, d]) => {
                const I = Icono as typeof Sparkles;
                return (
                  <li key={t as string} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <I className="size-5" />
                    </span>
                    <p className="mt-4 text-lg font-semibold">{t as string}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{d as string}</p>
                  </li>
                );
              })}
            </ol>
            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-primary p-8 text-primary-foreground">
                <p className="text-sm uppercase tracking-widest text-white/70">Para compradores</p>
                <p className="mt-3 text-2xl font-semibold leading-snug">“Todo lo que tu organización consume, a precio cercano al de origen, en la cantidad justa y con calidad garantizada, desde una sola plataforma.”</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-8">
                <p className="text-sm uppercase tracking-widest text-muted-foreground">Para proveedores</p>
                <p className="mt-3 text-2xl font-semibold leading-snug">“Vende a empresas e instituciones formales, con demanda predecible y pago seguro.”</p>
                <Button variant="link" className="mt-2 px-0" asChild>
                  <Link href="/registro?tipo=proveedor">
                    Registra tu negocio <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Para quién */}
        <section id="para-quien" className="border-y border-border bg-card/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Para quién es</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Empezamos por oficinas y restaurantes medianos de Lima.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">De 50 a 500 personas atendidas o de 1 a 5 locales, en San Isidro, Miraflores, Surco y San Borja. Y crecemos hacia instituciones, mayoristas y consumidores.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [Building2, "Oficinas", "Café, agua, limpieza y snacks"],
                [UtensilsCrossed, "Restaurantes", "Abarrotes, frescos y carnes"],
                [Hotel, "Hoteles y residencias", "Desayunos y amenities"],
                [Hospital, "Hospitales y clínicas", "Licitaciones y trazabilidad"],
                [GraduationCap, "Colegios", "Comedor escolar programado"],
                [HardHat, "Campamentos y proyectos", "Contratos con calendario"],
                [Store, "Bodegas y minimarkets", "Precios por volumen"],
                [Coffee, "Consumidor final", "Tienda retail a domicilio"],
              ].map(([Icono, t, d]) => {
                const I = Icono as typeof Building2;
                return (
                  <div key={t as string} className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                    <I className="size-5 text-primary" />
                    <p className="mt-3 font-medium">{t as string}</p>
                    <p className="text-xs text-muted-foreground">{d as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Diferenciación */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Por qué AbastIA</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Lo mejor de cada alternativa, sin sus desventajas.</h2>
            <div className="mt-10 overflow-x-auto rounded-3xl border border-border bg-card">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-4 font-medium text-muted-foreground" />
                    {["Mercados mayoristas", "Distribuidores", "Concesionarios", "ERP", "AbastIA"].map((c) => (
                      <th key={c} className={`p-4 text-center font-semibold ${c === "AbastIA" ? "bg-secondary text-secondary-foreground" : ""}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Compara precios de varios proveedores", [false, false, false, false, true]],
                    ["Precio cercano al de origen", [true, false, false, false, true]],
                    ["Planificación de cantidades con IA", [false, false, false, true, true]],
                    ["Calidad homologada y trazabilidad", [false, true, true, false, true]],
                    ["Factura formal y pago seguro", [false, true, true, true, true]],
                    ["Sin inversión ni implementación", [true, true, false, false, true]],
                  ].map(([criterio, valores]) => (
                    <tr key={criterio as string} className="border-b border-border last:border-0">
                      <td className="p-4">{criterio as string}</td>
                      {(valores as boolean[]).map((v, i) => (
                        <td key={i} className={`p-4 text-center ${i === 4 ? "bg-secondary/50" : ""}`}>
                          {v ? <Check className="mx-auto size-5 text-primary" aria-label="Sí" /> : <X className="mx-auto size-5 text-muted-foreground/50" aria-label="No" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Calculadora */}
        <section id="calculadora" className="border-y border-border bg-card/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Calculadora de ahorro</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">¿Cuánto ahorrarías con AbastIA?</h2>
            <p className="mb-8 mt-3 text-muted-foreground">Estimación con el ahorro objetivo de 8 % frente al precio promedio de mercado.</p>
            <Calculadora />
          </div>
        </section>

        {/* Planes */}
        <section id="planes" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Planes y precios</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Empieza gratis. Pasa a Pro cuando quieras planificar con IA.</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                { nombre: "Básico", precio: "Gratis", detalle: "para siempre", items: ["Catálogo multiproveedor", "Comparación de precios", "Pedido consolidado", "Seguimiento de pedidos"], destacado: false },
                { nombre: "Pro", precio: `S/ ${PRECIO_PLAN_PRO}`, detalle: "por sede al mes", items: ["Todo lo del plan Básico", "Planificador con IA", "Panel de gasto por sede", "Aprobaciones por monto", "Alertas de precio", "Reportes de ahorro"], destacado: true },
                { nombre: "Corporativo", precio: "A medida", detalle: "para instituciones", items: ["Todo lo del plan Pro", "Licitaciones y contratos", "Abastecimiento programado", "Trazabilidad por lote", "Integración con tu ERP"], destacado: false },
              ].map((p) => (
                <div key={p.nombre} className={`flex flex-col rounded-3xl border p-7 ${p.destacado ? "border-primary bg-card shadow-xl shadow-primary/10 ring-1 ring-primary" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">{p.nombre}</p>
                    {p.destacado && <Badge>Más elegido</Badge>}
                  </div>
                  <p className="mt-4 text-4xl font-semibold tracking-tight cifra">{p.precio}</p>
                  <p className="text-sm text-muted-foreground">{p.detalle}</p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {p.items.map((i) => (
                      <li key={i} className="flex gap-2">
                        <Check className="size-4 shrink-0 text-primary" /> {i}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-8" variant={p.destacado ? "default" : "outline"} asChild>
                    <a href="#piloto">Solicitar piloto</a>
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">Proveedores: sin mensualidad. Comisión de 5 % a 8 % por pedido entregado (6 % por defecto).</p>
          </div>
        </section>

        {/* Piloto */}
        <section id="piloto" className="border-t border-border bg-card/50 py-20">
          <div className="mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Piloto gratuito</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Solicita tu piloto gratuito de 30 días</h2>
              <p className="mt-4 text-muted-foreground">Te ayudamos a cargar tu primera sede, tu historial de consumo y tus proveedores actuales. Al final del mes te mostramos tu ahorro real.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  [ShieldCheck, "Sin tarjeta y sin compromiso"],
                  [BarChart3, "Reporte de ahorro al final del piloto"],
                  [ClipboardList, "Acompañamiento en tus primeros pedidos"],
                  [Layers, "Plan Pro incluido durante el piloto"],
                ].map(([Icono, t]) => {
                  const I = Icono as typeof ShieldCheck;
                  return (
                    <li key={t as string} className="flex items-center gap-3">
                      <I className="size-5 text-primary" /> {t as string}
                    </li>
                  );
                })}
              </ul>
            </div>
            <FormularioPiloto />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Startup universitaria · Formación de Empresas de Base Tecnológica I · USIL, Lima 2026</p>
          <div className="flex gap-4">
            <Link href="/registro" className="hover:text-foreground">Registro</Link>
            <Link href="/tienda" className="hover:text-foreground">Tienda</Link>
            <Link href="/login" className="hover:text-foreground">Ingresar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
