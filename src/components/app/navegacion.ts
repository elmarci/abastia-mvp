import {
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  ClipboardList,
  FileSignature,
  Gauge,
  Gavel,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Package,
  PackageSearch,
  QrCode,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Users,
} from "lucide-react";
import type { RolUsuario } from "@/lib/permisos";

export interface ItemNav {
  titulo: string;
  href: string;
  icono: LucideIcon;
  /** Se muestra en la navegación inferior del celular. */
  movil?: boolean;
  grupo?: string;
}

const comprador: ItemNav[] = [
  { titulo: "Panel de gasto", href: "/comprador", icono: LayoutDashboard, movil: true },
  { titulo: "Catálogo", href: "/comprador/catalogo", icono: PackageSearch, movil: true },
  { titulo: "Planificador IA", href: "/comprador/planificador", icono: Sparkles, movil: true },
  { titulo: "Pedido", href: "/comprador/carrito", icono: ShoppingCart, movil: true },
  { titulo: "Mis pedidos", href: "/comprador/pedidos", icono: Package, movil: true },
  { titulo: "Cotizaciones", href: "/comprador/cotizaciones", icono: ClipboardList, grupo: "Abastecimiento" },
  { titulo: "Licitaciones", href: "/comprador/licitaciones", icono: Gavel, grupo: "Abastecimiento" },
  { titulo: "Contratos", href: "/comprador/contratos", icono: FileSignature, grupo: "Abastecimiento" },
  { titulo: "Recurrentes", href: "/comprador/recurrentes", icono: Repeat, grupo: "Abastecimiento" },
  { titulo: "Asistente", href: "/comprador/asistente", icono: Bot, grupo: "Abastecimiento" },
  { titulo: "Sedes", href: "/comprador/sedes", icono: MapPin, grupo: "Empresa" },
];

export const NAVEGACION: Record<RolUsuario, ItemNav[]> = {
  COMPRADOR: comprador,
  APROBADOR: [...comprador.slice(0, 5), { titulo: "Aprobaciones", href: "/comprador/aprobaciones", icono: BadgeCheck }, ...comprador.slice(5)],
  MAYORISTA: [
    { titulo: "Catálogo mayorista", href: "/comprador/catalogo", icono: Store, movil: true },
    { titulo: "Pedido", href: "/comprador/carrito", icono: ShoppingCart, movil: true },
    { titulo: "Mis pedidos", href: "/comprador/pedidos", icono: Package, movil: true },
    { titulo: "Asistente", href: "/comprador/asistente", icono: Bot, movil: true },
  ],
  PROVEEDOR: [
    { titulo: "Panel y liquidación", href: "/proveedor", icono: Gauge, movil: true },
    { titulo: "Pedidos recibidos", href: "/proveedor/pedidos", icono: Package, movil: true },
    { titulo: "Mi catálogo", href: "/proveedor/catalogo", icono: Store, movil: true },
    { titulo: "Competitividad", href: "/proveedor/competitividad", icono: Target, movil: true },
    { titulo: "Cotizaciones", href: "/proveedor/cotizaciones", icono: ClipboardList, grupo: "Oportunidades" },
    { titulo: "Licitaciones", href: "/proveedor/licitaciones", icono: Gavel, grupo: "Oportunidades" },
    { titulo: "Contratos", href: "/proveedor/contratos", icono: CalendarClock, grupo: "Oportunidades" },
    { titulo: "Lotes y trazabilidad", href: "/proveedor/lotes", icono: QrCode, grupo: "Oportunidades" },
  ],
  ADMIN: [
    { titulo: "Validación del MVP", href: "/admin", icono: BarChart3, movil: true },
    { titulo: "Proveedores", href: "/admin/proveedores", icono: BadgeCheck, movil: true },
    { titulo: "Empresas", href: "/admin/empresas", icono: Building2, movil: true },
    { titulo: "Leads del piloto", href: "/admin/leads", icono: Users, movil: true },
  ],
  CONSUMIDOR: [
    { titulo: "Mis compras", href: "/cuenta", icono: Receipt, movil: true },
    { titulo: "Tienda", href: "/tienda", icono: ShoppingBag, movil: true },
  ],
};
