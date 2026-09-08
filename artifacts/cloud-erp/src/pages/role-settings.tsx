// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  ALL_ROLES, ALL_ROUTES, ALL_ACTIONS, ACTION_GROUP_LABELS, DEFAULT_ROLE_ROUTES, ROLE_LABELS,
  type EmployeeRole, type RolePermissionsMap,
} from "@/lib/roles";
import { savePermissions, PERMISSIONS_QUERY_KEY, EMPLOYEE_OVERRIDES_QUERY_KEY, applyEmployeeOverrides, useRole } from "@/contexts/role-context";
import {
  useCompanySettings,
  COUNTRY_OPTIONS, CURRENCY_OPTIONS, LOCALE_OPTIONS,
  PAYMENT_METHOD_KINDS, PAYMENT_METHOD_KIND_LABELS, inferPaymentMethodKind,
  type CompanySettings, type PaymentMethodKind,
} from "@/contexts/company-settings-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme, type ColorTheme } from "@/components/theme-provider";
import {
  LayoutDashboard, Package, ShoppingCart, Receipt,
  Wallet, BarChart3, Armchair, UserCog,
  Save, RotateCcw, Shield, Check, Loader2, Palette,
  Building2, Globe, ImageIcon, Upload, X, Droplets,
  Star, Gift, Coins, Zap, Settings, Plus, Trash2, CreditCard, Tag, Bike, Award, Printer, ScrollText, ChefHat, Boxes, Eye, GripVertical,
  Utensils, Coffee, UtensilsCrossed, Wine, Pizza, Table2, Copy, Link2, Store,
  Search, UserCheck, ChevronDown, ChevronUp,
  Wifi, Bluetooth, Cable, Type, Pencil, AlertCircle, Network,
  Mail, Smartphone, RefreshCw, Filter, CheckCircle2, MessageCircle,
  Layout, MousePointerClick, PanelTop, PanelBottom, PanelLeft, PanelRight,
  Music2, Play, Volume2, ClipboardList, Laptop, Download, ExternalLink,
} from "lucide-react";
import { DELIVERY_SOUNDS } from "@/components/GlobalDeliveryAlert";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BrandSettingsTab } from "@/components/brand-settings-tab";
import {
  DEFAULT_PRINT_PROFILE,
  FONT_SIZE_PX,
  PRINT_ZONE_LABELS,
  PRINT_ZONES,
  normalizePrintProfile,
  printLineHeight,
  printWidthPx,
  type PrintDensity,
  type PrintLineSpacing,
  type PrintPaperWidth,
  type PrintZone,
  type PrintFontSize,
} from "@/lib/print-settings";

const COLOR_OPTIONS: { value: ColorTheme; label: string; hex: string }[] = [
  { value: "blue",   label: "Azul",     hex: "#3b82f6" },
  { value: "red",    label: "Rojo",     hex: "#ef4444" },
  { value: "green",  label: "Verde",    hex: "#22c55e" },
  { value: "purple", label: "Púrpura",  hex: "#7c3aed" },
  { value: "orange", label: "Naranja",  hex: "#f97316" },
];

const TABLE_ICON_OPTIONS = [
  { name: "Armchair", Icon: Armchair, label: "Silla" },
  { name: "Utensils", Icon: Utensils, label: "Cubiertos" },
  { name: "UtensilsCrossed", Icon: UtensilsCrossed, label: "Cruzados" },
  { name: "Coffee", Icon: Coffee, label: "Café" },
  { name: "Wine", Icon: Wine, label: "Copa" },
  { name: "ChefHat", Icon: ChefHat, label: "Chef" },
  { name: "Pizza", Icon: Pizza, label: "Pizza" },
  { name: "Table2", Icon: Table2, label: "Mesa" },
];

const ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/pos":       ShoppingCart,
  "/tables":    Armchair,
  "/products":  Package,
  "/expenses":  Receipt,
  "/cash":      Wallet,
  "/hr":        UserCog,
  "/reports":   BarChart3,
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
  admin:    "bg-purple-100 text-purple-700 border-purple-200",
  manager:  "bg-blue-100 text-blue-700 border-blue-200",
  cashier:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  waiter:   "bg-amber-100 text-amber-700 border-amber-200",
  cook:     "bg-orange-100 text-orange-700 border-orange-200",
  delivery: "bg-sky-100 text-sky-700 border-sky-200",
};

const ACTIONS_BY_MODULE = ALL_ACTIONS.reduce<Record<string, typeof ALL_ACTIONS>>((groups, action) => {
  (groups[action.module] ??= []).push(action);
  return groups;
}, {});

const ACTION_GROUPS = Object.entries(ACTIONS_BY_MODULE).map(([module, actions]) => ({
  module,
  label: ACTION_GROUP_LABELS[module] ?? module,
  actions,
}));

// ── Empresa Tab ──────────────────────────────────────────────────────────────

function compressImage(file: File, maxPx = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function EmpresaTab() {
  const { settings, saveSettings, isSaving } = useCompanySettings();
  const { toast } = useToast();
  const [draft, setDraft] = useState<CompanySettings>(settings);
  const [logoLoading, setLogoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(settings); }, [settings]);

  const set = (key: keyof CompanySettings, val: string) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const handleLogoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Selecciona una imagen PNG, JPG o SVG.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen demasiado grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    setLogoLoading(true);
    try {
      const base64 = await compressImage(file, 512, 0.9);
      setDraft((prev) => ({ ...prev, company_logo: base64 }));
    } catch {
      toast({ title: "Error al procesar imagen", variant: "destructive" });
    } finally {
      setLogoLoading(false);
    }
  }, [toast]);

  const handleCountryChange = (countryCode: string) => {
    const opt = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
    setDraft((prev) => ({
      ...prev,
      company_country: countryCode,
      ...(opt ? { company_currency: opt.currency, company_locale: opt.locale } : {}),
    }));
  };

  const handleSave = async () => {
    try {
      await saveSettings(draft);
      toast({ title: "Configuración guardada", description: "Los datos de la empresa fueron actualizados." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="space-y-6">
      {/* Logo & Marca */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Logo y Marca</h2>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Preview */}
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
              {draft.company_logo ? (
                <img
                  src={draft.company_logo}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                Sube el logo de tu empresa. Se mostrará en el encabezado y como marca de agua. PNG o JPG, máx. 5 MB.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFile(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                >
                  {logoLoading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  {draft.company_logo ? "Cambiar logo" : "Subir logo"}
                </Button>
                {draft.company_logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDraft((prev) => ({ ...prev, company_logo: "" }))}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Quitar logo
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Watermark opacity slider */}
          {draft.company_logo && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <Label>Opacidad de marca de agua</Label>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  {draft.company_watermark_opacity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={draft.company_watermark_opacity}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, company_watermark_opacity: Number(e.target.value) }))
                }
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Controla qué tan visible es el logo en el fondo del área de contenido. 0% = desactivada.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Datos básicos */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Datos de la Empresa</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name">Razón social</Label>
            <Input
              id="company_name"
              placeholder="Ej: Mi Empresa S.A.S."
              value={draft.company_name}
              onChange={(e) => set("company_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_nit">NIT / RUT / RUC</Label>
            <Input
              id="company_nit"
              placeholder="Ej: 900.123.456-7"
              value={draft.company_nit}
              onChange={(e) => set("company_nit", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="company_address">Dirección</Label>
            <Input
              id="company_address"
              placeholder="Ej: Calle 80 # 10-15, Bogotá"
              value={draft.company_address}
              onChange={(e) => set("company_address", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_city">Ciudad</Label>
            <Input
              id="company_city"
              placeholder="Ej: Bogotá"
              value={draft.company_city}
              onChange={(e) => set("company_city", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_phone">Teléfono</Label>
            <Input
              id="company_phone"
              placeholder="Ej: +57 310 123 4567"
              value={draft.company_phone}
              onChange={(e) => set("company_phone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="company_email">Correo electrónico</Label>
            <Input
              id="company_email"
              type="email"
              placeholder="Ej: contacto@miempresa.com"
              value={draft.company_email}
              onChange={(e) => set("company_email", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Compras y Facturación */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Compras y Facturación</h2>
          <span className="text-xs text-muted-foreground ml-1">— aplica a órdenes de compra</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchase_order_iva">IVA en órdenes de compra (%)</Label>
              <Input
                id="purchase_order_iva"
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Ej: 19"
                value={draft.purchase_order_iva ?? 0}
                onChange={(e) => setDraft((prev) => ({ ...prev, purchase_order_iva: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                {(draft.purchase_order_iva ?? 0) > 0
                  ? `Se añadirá un ${draft.purchase_order_iva}% de IVA al subtotal en el formato impreso.`
                  : "Con 0% no se mostrará IVA en el formato impreso."}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="space-y-0.5">
                <Label htmlFor="receipt_auto_email" className="text-sm font-medium cursor-pointer">
                  Enviar recibo POS automáticamente por correo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cuando está activo, se envía el recibo por email al finalizar cada venta POS si el cliente tiene correo registrado.
                </p>
              </div>
              <Switch
                id="receipt_auto_email"
                checked={draft.receipt_auto_email ?? false}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, receipt_auto_email: checked }))
                }
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="space-y-0.5">
                <Label htmlFor="cash_block_unreconciled_drivers" className="text-sm font-medium cursor-pointer">
                  Bloquear cierre de caja con conductores sin cuadrar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cuando está activo, no se puede cerrar caja mientras haya conductores con efectivo pendiente de cuadre. Si está inactivo, solo se muestra una advertencia.
                </p>
              </div>
              <Switch
                id="cash_block_unreconciled_drivers"
                checked={draft.cash_block_unreconciled_drivers ?? false}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, cash_block_unreconciled_drivers: checked }))
                }
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="space-y-0.5">
                <Label htmlFor="cash_shortfall_review_enabled" className="text-sm font-medium cursor-pointer">
                  Revisar faltantes de caja
                </Label>
                <p className="text-xs text-muted-foreground">
                  Un administrador o gerente revisará cada faltante. Tras aprobarlo, el cajero responsable deberá aceptarlo antes de generar el cargo a su crédito interno.
                </p>
              </div>
              <Switch
                id="cash_shortfall_review_enabled"
                checked={draft.cash_shortfall_review_enabled ?? false}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, cash_shortfall_review_enabled: checked }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Régimen Tributario */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Régimen Tributario</h2>
          <span className="text-xs text-muted-foreground ml-1">— aplica a ventas POS y mesas</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company_tax_regime">Régimen tributario</Label>
              <select
                id="company_tax_regime"
                value={draft.company_tax_regime ?? "no_responsable"}
                onChange={(e) => set("company_tax_regime", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="no_responsable">No Responsable de IVA</option>
                <option value="responsable_iva">Responsable de IVA</option>
                <option value="gran_contribuyente">Gran Contribuyente</option>
                <option value="autorretenedor">Autorretenedor</option>
              </select>
              <p className="text-xs text-muted-foreground">Aparecerá en los recibos y facturas electrónicas.</p>
            </div>
            <div className="space-y-1.5 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="space-y-0.5">
                  <Label htmlFor="company_tax_included_in_price" className="text-sm font-medium cursor-pointer">
                    Precio incluye impuesto
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Si está activo, el impuesto se extrae del precio (ej. $119 → $19 IVA). Si no, se suma encima.
                  </p>
                </div>
                <Switch
                  id="company_tax_included_in_price"
                  checked={draft.company_tax_included_in_price ?? true}
                  onCheckedChange={(v) => setDraft((prev) => ({ ...prev, company_tax_included_in_price: v }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarifas de impuesto */}
      {(() => {
        const rates: { id: string; name: string; percent: number; active: boolean }[] = (() => {
          try { return JSON.parse(draft.company_tax_rates ?? "[]"); } catch { return []; }
        })();
        const saveRates = (updated: typeof rates) => set("company_tax_rates", JSON.stringify(updated));
        return (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Tarifas de impuesto</h2>
              <span className="text-xs text-muted-foreground ml-1">— disponibles al asignar impuesto a un producto</span>
            </div>
            <div className="p-5 space-y-3">
              {rates.map((rate, idx) => (
                <div key={rate.id} className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-2.5">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      placeholder="Nombre (ej. IVA 19%)"
                      value={rate.name}
                      onChange={(e) => {
                        const updated = [...rates];
                        updated[idx] = { ...rate, name: e.target.value };
                        saveRates(updated);
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        placeholder="% (ej. 19)"
                        value={rate.percent}
                        onChange={(e) => {
                          const updated = [...rates];
                          updated[idx] = { ...rate, percent: Number(e.target.value) };
                          saveRates(updated);
                        }}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={rate.active}
                      onCheckedChange={(v) => {
                        const updated = [...rates];
                        updated[idx] = { ...rate, active: v };
                        saveRates(updated);
                      }}
                      title={rate.active ? "Activa" : "Inactiva"}
                    />
                    <button
                      type="button"
                      onClick={() => saveRates(rates.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => saveRates([...rates, { id: `rate_${Date.now()}`, name: "", percent: 0, active: true }])}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
              >
                <Plus className="h-4 w-4" /> Añadir tarifa
              </button>
            </div>
          </div>
        );
      })()}

      {/* País, Moneda, Idioma */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">País, Moneda e Idioma</h2>
          <span className="text-xs text-muted-foreground ml-1">— afecta el formato de todos los precios</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_country">País</Label>
            <select
              id="company_country"
              value={draft.company_country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Al cambiar el país se actualiza la moneda y el idioma automáticamente.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_currency">Moneda</Label>
            <select
              id="company_currency"
              value={draft.company_currency}
              onChange={(e) => set("company_currency", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_locale">Formato regional</Label>
            <select
              id="company_locale"
              value={draft.company_locale}
              onChange={(e) => set("company_locale", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {LOCALE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        <div className="px-5 pb-5">
          <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Vista previa de precio:</span>
            <span className="text-sm font-semibold text-foreground">
              {(() => {
                try {
                  return new Intl.NumberFormat(draft.company_locale || "es-CO", {
                    style: "currency",
                    currency: draft.company_currency || "COP",
                    maximumFractionDigits: 0,
                  }).format(1234567);
                } catch {
                  return "1.234.567";
                }
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-4">
        {hasChanges && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            Tienes cambios sin guardar
          </div>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="gap-2 ml-auto"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

// ── NavbarImageUploader — subcomponente para imagen de barra ──────────────────
function NavbarImageUploader({ draft, setDraft }: {
  draft: { company_navbar_image: string };
  setDraft: (v: any) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Selecciona una imagen PNG, JPG o WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen muy grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const base64 = await compressImage(file, 1200, 0.85);
      setDraft((prev: any) => ({ ...prev, company_navbar_image: base64 }));
    } catch {
      toast({ title: "Error al procesar la imagen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Imagen de fondo de la barra (Opcional)</Label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {draft.company_navbar_image ? (
            <img src={draft.company_navbar_image} alt="Fondo barra" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Subir imagen
            </Button>
            {draft.company_navbar_image && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setDraft((prev: any) => ({ ...prev, company_navbar_image: "" }))}>
                <X className="h-4 w-4 mr-1" /> Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Opcional. La imagen cubrirá el color de fondo en la cabecera.</p>
        </div>
      </div>
    </div>
  );
}

// ── Apariencia Tab ────────────────────────────────────────────────────────────

function DeliveryAlertSoundSection() {
  const { toast } = useToast();
  const { settings, saveSettings, isSaving } = useCompanySettings();
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState(settings.delivery_alert_sound ?? "soft-notify");

  useEffect(() => {
    setSelected(settings.delivery_alert_sound ?? "soft-notify");
  }, [settings.delivery_alert_sound]);

  const hasChanges = selected !== (settings.delivery_alert_sound ?? "soft-notify");

  const previewSound = (sound: typeof DELIVERY_SOUNDS[number]) => {
    previewRef.current?.pause();
    if (playingPreview === sound.id) {
      setPlayingPreview(null);
      return;
    }
    const audio = new Audio(sound.url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    audio.onended = () => setPlayingPreview(null);
    previewRef.current = audio;
    setPlayingPreview(sound.id);
  };

  const handleSave = async () => {
    try {
      await saveSettings({ delivery_alert_sound: selected });
      toast({ title: "Sonido de alerta guardado", description: "El sonido de notificación de domicilios se ha actualizado." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
        <Music2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Sonido de Alerta de Domicilios</h2>
        <span className="text-xs text-muted-foreground ml-1">— notificación global de pedidos pendientes</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Elige el sonido que se reproduce cuando llegan nuevos domicilios pendientes. Usa el botón <strong>▶</strong> para preescuchar cada opción antes de guardar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DELIVERY_SOUNDS.map((sound) => {
            const isSelected = selected === sound.id;
            const isPreviewing = playingPreview === sound.id;
            return (
              <div
                key={sound.id}
                onClick={() => setSelected(sound.id)}
                className={`flex items-center justify-between rounded-lg px-4 py-3 cursor-pointer border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Volume2 className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>{sound.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); previewSound(sound); }}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                      isPreviewing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-primary/20"
                    }`}
                    title={isPreviewing ? "Detener" : "Preescuchar"}
                  >
                    <Play className="h-3 w-3" />
                  </button>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-2">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar sonido
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Apariencia Tab (Revisado para Sincronización Global) ──────────────────────────

function AparienciaTab() {
  const { toast } = useToast();
  const { settings, saveSettings, isSaving } = useCompanySettings();
  const { theme, setColorAndSave } = useTheme();

  // El estado borrador (draft) solo maneja el color hex y la imagen de fondo.
  const [draft, setDraft] = useState({
    company_primary_color: settings.company_primary_color || "#cd003c", // Rojo Loggro por defecto
    company_navbar_image: settings.company_navbar_image || "",
  });

  // Si las configuraciones guardadas cambian (p.ej., cargaron del servidor), actualizamos el borrador.
  useEffect(() => {
    setDraft({
      company_primary_color: settings.company_primary_color || "#cd003c",
      company_navbar_image: settings.company_navbar_image || "",
    });
  }, [settings]);

  const handleNavbarSave = async () => {
    try {
      await saveSettings(draft);
      toast({ title: "Diseño global guardado", description: "El color de la marca se ha actualizado en toda la aplicación." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const hasChanges = draft.company_primary_color !== (settings.company_primary_color || "#cd003c") ||
                     draft.company_navbar_image !== (settings.company_navbar_image || "");

  const [tableDraft, setTableDraft] = useState({
    table_icon: settings.table_icon || "Armchair",
    table_color_available: settings.table_color_available || "#22c55e",
    table_color_occupied: settings.table_color_occupied || "#ef4444",
    table_color_in_process: settings.table_color_in_process || "#f97316",
    table_color_reserved: settings.table_color_reserved || "#3b82f6",
    wait_alert_yellow_min: settings.wait_alert_yellow_min ?? 30,
    wait_alert_red_min: settings.wait_alert_red_min ?? 60,
  });

  useEffect(() => {
    setTableDraft({
      table_icon: settings.table_icon || "Armchair",
      table_color_available: settings.table_color_available || "#22c55e",
      table_color_occupied: settings.table_color_occupied || "#ef4444",
      table_color_in_process: settings.table_color_in_process || "#f97316",
      table_color_reserved: settings.table_color_reserved || "#3b82f6",
      wait_alert_yellow_min: settings.wait_alert_yellow_min ?? 30,
      wait_alert_red_min: settings.wait_alert_red_min ?? 60,
    });
  }, [settings]);

  const handleSaveTableAppearance = async () => {
    try {
      await saveSettings(tableDraft);
      toast({ title: "Apariencia de mesas guardada", description: "Los cambios se aplicarán de inmediato." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const tableHasChanges =
    tableDraft.table_icon !== (settings.table_icon || "Armchair") ||
    tableDraft.table_color_available !== (settings.table_color_available || "#22c55e") ||
    tableDraft.table_color_occupied !== (settings.table_color_occupied || "#ef4444") ||
    tableDraft.table_color_in_process !== (settings.table_color_in_process || "#f97316") ||
    tableDraft.table_color_reserved !== (settings.table_color_reserved || "#3b82f6") ||
    tableDraft.wait_alert_yellow_min !== (settings.wait_alert_yellow_min ?? 30) ||
    tableDraft.wait_alert_red_min !== (settings.wait_alert_red_min ?? 60);

  const [navbarDraft, setNavbarDraft] = useState({
    navbar_position: (settings.navbar_position as string) || "top",
    navbar_auto_hide: (settings.navbar_auto_hide as boolean) ?? false,
    navbar_fixed: (settings.navbar_fixed as boolean) ?? true,
  });

  useEffect(() => {
    setNavbarDraft({
      navbar_position: (settings.navbar_position as string) || "top",
      navbar_auto_hide: (settings.navbar_auto_hide as boolean) ?? false,
      navbar_fixed: (settings.navbar_fixed as boolean) ?? true,
    });
  }, [settings]);

  const handleSaveNavbarConfig = async () => {
    try {
      await saveSettings(navbarDraft);
      toast({ title: "Configuración de barra guardada", description: "Los cambios se aplicarán en la próxima carga." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const navbarHasChanges =
    navbarDraft.navbar_position !== ((settings.navbar_position as string) || "top") ||
    navbarDraft.navbar_auto_hide !== ((settings.navbar_auto_hide as boolean) ?? false) ||
    navbarDraft.navbar_fixed !== ((settings.navbar_fixed as boolean) ?? true);

  return (
    <div className="space-y-6">
      {/* Tema de color del sistema */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Tema de Color</h2>
          <span className="text-xs text-muted-foreground ml-1">— acento principal de botones, links y estados activos</span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Elige el color de acento que se aplicará en toda la interfaz: botones primarios, enlaces, indicadores de estado activo y más.
          </p>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map((opt) => {
              const isActive = theme.color === opt.value;
              const isOrange = opt.value === "orange";
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColorAndSave(opt.value)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3 transition-all focus:outline-none ${
                    isActive
                      ? "border-[--active-border] shadow-md scale-105"
                      : "border-border hover:border-muted-foreground/40 hover:scale-105"
                  }`}
                  style={{ "--active-border": opt.hex } as React.CSSProperties}
                >
                  {isOrange && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                      FYRO
                    </span>
                  )}
                  <span
                    className="h-9 w-9 rounded-full shadow-sm ring-2 ring-white dark:ring-card flex items-center justify-center"
                    style={{ backgroundColor: opt.hex }}
                  >
                    {isActive && <Check className="h-4 w-4 text-white drop-shadow" />}
                  </span>
                  <span className="text-xs font-medium text-foreground">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            El tema <strong>Naranja</strong> es el predeterminado para nuevas cuentas FYRO.
          </p>
        </div>
      </div>

      {/* Tarjeta de Personalización: Unificada para Navbar y Sistema */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Identidad Visual y Colores Globales</h2>
          <span className="text-xs text-muted-foreground ml-1">— este color define toda la aplicación</span>
        </div>
        <div className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            El color que selecciones a continuación se aplicará tanto a la barra de navegación superior como a los botones, enlaces y estados activos de todo el sistema para mantener una imagen de marca coherente.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Selector de Color */}
            <div className="space-y-2">
              <Label htmlFor="navbar_color">Color principal de marca</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="navbar_color"
                  type="color"
                  value={draft.company_primary_color}
                  onChange={(e) => setDraft({ ...draft, company_primary_color: e.target.value })}
                  className="w-14 h-14 p-1 cursor-pointer rounded-md border-muted"
                />
                <span className="text-sm font-mono uppercase text-muted-foreground font-semibold">
                  {draft.company_primary_color}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Recomendado: Usar un color oscuro para que el texto blanco de la barra resalte correctamente.</p>
            </div>

            {/* Imagen de fondo de la barra — subida desde PC */}
            <NavbarImageUploader draft={draft} setDraft={setDraft} />
          </div>

          <div className="flex justify-end pt-3 border-t mt-1">
            <Button onClick={handleNavbarSave} disabled={isSaving || !hasChanges} className="gap-2">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar diseño de marca
            </Button>
          </div>
        </div>
      </div>


      {/* Apariencia de Mesas */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Armchair className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Apariencia de Mesas</h2>
          <span className="text-xs text-muted-foreground ml-1">— ícono y colores de estado por empresa</span>
        </div>
        <div className="p-5 space-y-6">
          {/* Icon picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ícono de mesa</Label>
            <div className="flex flex-wrap gap-2">
              {TABLE_ICON_OPTIONS.map(({ name, Icon, label }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTableDraft({ ...tableDraft, table_icon: name })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all w-16 ${
                    tableDraft.table_icon === name
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-6 w-6" style={{ color: draft.company_primary_color || "#cd003c" }} />
                  <span className="text-[10px] text-muted-foreground leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: "table_color_available", label: "Disponible" },
              { key: "table_color_occupied", label: "Ocupada" },
              { key: "table_color_in_process", label: "En proceso" },
              { key: "table_color_reserved", label: "Reservada" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={tableDraft[key]}
                    onChange={(e) => setTableDraft({ ...tableDraft, [key]: e.target.value })}
                    className="w-12 h-12 p-1 cursor-pointer rounded-md border-muted"
                  />
                  <span className="text-xs font-mono uppercase text-muted-foreground font-semibold">
                    {tableDraft[key]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Vista previa</Label>
            <div className="flex gap-3 flex-wrap">
              {[
                { status: "table_color_available", label: "Disponible" },
                { status: "table_color_occupied", label: "Ocupada" },
                { status: "table_color_in_process", label: "En proceso" },
                { status: "table_color_reserved", label: "Reservada" },
              ].map(({ status, label }) => {
                const SelectedIcon = TABLE_ICON_OPTIONS.find(o => o.name === tableDraft.table_icon)?.Icon ?? Armchair;
                const color = tableDraft[status];
                return (
                  <div
                    key={status}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 w-20 aspect-square justify-center"
                    style={{ borderColor: color, backgroundColor: `${color}20` }}
                  >
                    <SelectedIcon className="h-7 w-7" style={{ color }} />
                    <span className="text-[9px] font-bold text-center leading-tight" style={{ color }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Umbrales de tiempo de espera */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Alertas de tiempo de espera</Label>
            <p className="text-xs text-muted-foreground">
              Si una mesa lleva más tiempo ocupada que estos umbrales, cambia el color del indicador de tiempo.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="wait_yellow" className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Alerta amarilla (min)
                </Label>
                <Input
                  id="wait_yellow"
                  type="number"
                  min={1}
                  max={300}
                  value={tableDraft.wait_alert_yellow_min}
                  onChange={(e) => setTableDraft({ ...tableDraft, wait_alert_yellow_min: Math.max(1, Number(e.target.value) || 30) })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wait_red" className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  Alerta roja (min)
                </Label>
                <Input
                  id="wait_red"
                  type="number"
                  min={1}
                  max={600}
                  value={tableDraft.wait_alert_red_min}
                  onChange={(e) => setTableDraft({ ...tableDraft, wait_alert_red_min: Math.max(1, Number(e.target.value) || 60) })}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button onClick={handleSaveTableAppearance} disabled={isSaving || !tableHasChanges} className="gap-2">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar apariencia de mesas
            </Button>
          </div>
        </div>
      </div>

      {/* Sonido de Alerta de Domicilios */}
      <DeliveryAlertSoundSection />

      {/* Configuración de la Barra de Navegación */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Layout className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Configuración de la Barra de Navegación</h2>
          <span className="text-xs text-muted-foreground ml-1">— posición y comportamiento</span>
        </div>
        <div className="p-5 space-y-6">

          {/* Posición */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Posición de la barra</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "top",    label: "Superior",  Icon: PanelTop },
                { value: "bottom", label: "Inferior",  Icon: PanelBottom },
                { value: "left",   label: "Izquierda", Icon: PanelLeft },
                { value: "right",  label: "Derecha",   Icon: PanelRight },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNavbarDraft({ ...navbarDraft, navbar_position: value })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    navbarDraft.navbar_position === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label className="text-sm font-medium cursor-pointer" htmlFor="navbar_auto_hide">
                    Auto-ocultar cuando no esté en uso
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    La barra se oculta al hacer scroll y reaparece al mover el cursor o tocar la pantalla.
                  </p>
                </div>
              </div>
              <Switch
                id="navbar_auto_hide"
                checked={navbarDraft.navbar_auto_hide}
                onCheckedChange={(val) => setNavbarDraft({ ...navbarDraft, navbar_auto_hide: val })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Layout className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label className="text-sm font-medium cursor-pointer" htmlFor="navbar_fixed">
                    Fijar a la vista
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    La barra permanece visible aunque la página haga scroll (posición fija).
                  </p>
                </div>
              </div>
              <Switch
                id="navbar_fixed"
                checked={navbarDraft.navbar_fixed}
                onCheckedChange={(val) => setNavbarDraft({ ...navbarDraft, navbar_fixed: val })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button onClick={handleSaveNavbarConfig} disabled={isSaving || !navbarHasChanges} className="gap-2">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar configuración de barra
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Permisos Tab ──────────────────────────────────────────────────────────────

function PermisosTab() {
  const { permissions } = useRole();
  const [draft, setDraft] = useState<RolePermissionsMap>(() => ({ ...permissions }));
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  // All valid permission keys = routes + action keys
  const ALL_PERMISSION_KEYS = [
    ...ALL_ROUTES.map((r) => r.href),
    ...ALL_ACTIONS.map((a) => a.key),
  ];

  const toggle = (role: EmployeeRole, key: string) => {
    setDraft((prev) => {
      const existing = prev[role] ?? [];
      const current = new Set(existing);
      if (current.has(key)) { current.delete(key); } else { current.add(key); }
      // Keep unrecognized keys intact so permissions introduced by another version are not lost.
      const unknownKeys = existing.filter((permission) => !ALL_PERMISSION_KEYS.includes(permission));
      return { ...prev, [role]: [...ALL_PERMISSION_KEYS.filter((permission) => current.has(permission)), ...unknownKeys] };
    });
  };

  const toggleAll = (role: EmployeeRole, enable: boolean) => {
    setDraft((prev) => {
      const unknownKeys = (prev[role] ?? []).filter((permission) => !ALL_PERMISSION_KEYS.includes(permission));
      return {
        ...prev,
        [role]: [...(enable ? ALL_PERMISSION_KEYS : []), ...unknownKeys],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePermissions(draft);
      await qc.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
      toast({ title: "Permisos guardados", description: "Los cambios aplican de inmediato." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => { setDraft({ ...DEFAULT_ROLE_ROUTES }); };
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(permissions);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Permisos por Rol</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Define qué módulos puede ver cada tipo de empleado.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="gap-2">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar cambios
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          Tienes cambios sin guardar
        </div>
      )}

      <div className="grid gap-4">
        {ALL_ROLES.map((role) => {
          const currentPerms = new Set(draft[role] ?? []);
          const allEnabled = ALL_ROUTES.every((r) => currentPerms.has(r.href));
          const routeCount = ALL_ROUTES.filter((r) => currentPerms.has(r.href)).size;

          return (
            <div key={role} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Role header */}
              <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {routeCount} de {ALL_ROUTES.length} módulos habilitados
                  </span>
                </div>
                <button
                  onClick={() => toggleAll(role, !allEnabled)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {allEnabled ? "Quitar todos" : "Habilitar todos"}
                </button>
              </div>

              {/* Module (route) permissions */}
              <div className="p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Módulos</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_ROUTES.map((route) => {
                    const Icon = ROUTE_ICONS[route.href] ?? LayoutDashboard;
                    const isOn = currentPerms.has(route.href);
                    return (
                      <button
                        key={route.href}
                        onClick={() => toggle(role, route.href)}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left cursor-pointer hover:shadow-sm ${
                          isOn
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{route.label}</span>
                        {isOn && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {/* Action permissions */}
                <div className="border-t pt-3 mt-1 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Acciones permitidas
                  </p>
                  <div className="space-y-4">
                    {ACTION_GROUPS.map((group) => (
                      <div key={group.module} className="space-y-2">
                        <p className="text-xs font-medium text-foreground">{group.label}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.actions.map((action) => {
                            const isOn = currentPerms.has(action.key);
                            return (
                              <button
                                key={action.key}
                                onClick={() => toggle(role, action.key)}
                                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm ${
                                  isOn
                                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                                }`}
                              >
                                <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                                  isOn ? "bg-amber-500 border-amber-500" : "border-muted-foreground/40"
                                }`}>
                                  {isOn && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium leading-tight">{action.label}</div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{action.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Por empleado ──────────────────────────────────────────────── */}
      <PermisosEmpleadoSection basePerms={draft} />

      <p className="text-xs text-muted-foreground text-center">
        Los cambios aplican la próxima vez que el empleado inicia sesión o recarga la aplicación.
      </p>
    </div>
  );
}

// ── Permisos Por Empleado ─────────────────────────────────────────────────────

type EmpPermResponse = {
  role: EmployeeRole;
  rolePermissions: string[];
  overrides: { allow: string[]; deny: string[] };
  effective: string[];
};

type EmpBasic = { id: number; name: string; role: string; status: string };

function PermisosEmpleadoSection({ basePerms }: { basePerms: RolePermissionsMap }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const ALL_PERMISSION_KEYS = [...ALL_ROUTES.map((r) => r.href), ...ALL_ACTIONS.map((a) => a.key)];

  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<EmpBasic | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch employee list
  const { data: rawEmployees = [] } = useQuery<EmpBasic[]>({
    queryKey: ["employees-for-perms"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/employees`);
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const activeEmployees = rawEmployees.filter((e) => e.status === "active");
  const filtered = search.trim()
    ? activeEmployees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (ROLE_LABELS[e.role as EmployeeRole] ?? e.role).toLowerCase().includes(search.toLowerCase()),
      )
    : activeEmployees;

  // Fetch selected employee's current permissions
  const { data: empPerms, isLoading: loadingPerms } = useQuery<EmpPermResponse>({
    queryKey: EMPLOYEE_OVERRIDES_QUERY_KEY(selectedEmp?.id ?? 0),
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/employees/${selectedEmp!.id}/permissions`);
      if (!res.ok) throw new Error("Error al cargar permisos");
      return res.json();
    },
    enabled: !!selectedEmp,
    staleTime: 0,
  });

  // Local draft: which keys are currently effective for this employee
  const [effectiveDraft, setEffectiveDraft] = useState<Set<string>>(new Set());
  const [roleKeys, setRoleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!empPerms) return;
    // Use the resolved role permissions (from basePerms draft, not saved), merge with overrides
    const resolvedRoleKeys = new Set<string>(basePerms[empPerms.role] ?? empPerms.rolePermissions);
    setRoleKeys(resolvedRoleKeys);
    // Compute effective from role + overrides
    const effective = applyEmployeeOverrides(Array.from(resolvedRoleKeys), empPerms.overrides);
    setEffectiveDraft(new Set(effective));
  }, [empPerms, basePerms]);

  const toggleKey = (key: string) => {
    setEffectiveDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  // Compute allow/deny from draft vs role
  const computeOverrides = () => {
    const allow: string[] = [];
    const deny: string[] = [];
    for (const key of ALL_PERMISSION_KEYS) {
      const inRole = roleKeys.has(key);
      const inEffective = effectiveDraft.has(key);
      if (!inRole && inEffective) allow.push(key);
      if (inRole && !inEffective) deny.push(key);
    }
    // Only known keys can be edited here. Retain unknown server-provided overrides
    // so a change to a displayed permission cannot erase a newer permission.
    const unknownAllow = (empPerms?.overrides.allow ?? []).filter((key) => !ALL_PERMISSION_KEYS.includes(key));
    const unknownDeny = (empPerms?.overrides.deny ?? []).filter((key) => !ALL_PERMISSION_KEYS.includes(key));
    return { allow: [...allow, ...unknownAllow], deny: [...deny, ...unknownDeny] };
  };

  const hasChanges = empPerms
    ? JSON.stringify(computeOverrides()) !== JSON.stringify(empPerms.overrides)
    : false;

  const handleSave = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    try {
      const overrides = computeOverrides();
      const res = await fetch(`${BASE_URL}/api/employees/${selectedEmp.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await qc.invalidateQueries({ queryKey: EMPLOYEE_OVERRIDES_QUERY_KEY(selectedEmp.id) });
      toast({ title: "Permisos guardados", description: `Permisos de ${selectedEmp.name} actualizados.` });
    } catch {
      toast({ title: "Error al guardar permisos", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!empPerms) return;
    setEffectiveDraft(new Set(roleKeys));
  };

  const hasAnyOverrides = empPerms
    ? empPerms.overrides.allow.length > 0 || empPerms.overrides.deny.length > 0
    : false;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Permisos por Empleado</h2>
          <span className="text-xs text-muted-foreground">— sobreescribe el rol base del empleado</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Employee picker */}
        <div className="space-y-2">
          <Label>Buscar empleado</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Nombre o cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {search.trim() && (
            <div className="rounded-lg border bg-background shadow-sm max-h-48 overflow-y-auto divide-y">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
              ) : (
                filtered.slice(0, 8).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmp(emp); setSearch(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <span className="flex-1 font-medium">{emp.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ROLE_COLORS[emp.role as EmployeeRole] ?? "bg-muted text-muted-foreground"}`}>
                      {ROLE_LABELS[emp.role as EmployeeRole] ?? emp.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {!selectedEmp && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Busca y selecciona un empleado para ver y editar sus permisos individuales.
          </p>
        )}

        {selectedEmp && (
          <div className="space-y-4">
            {/* Selected employee header */}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 border px-4 py-3">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{selectedEmp.name}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ROLE_COLORS[selectedEmp.role as EmployeeRole] ?? "bg-muted text-muted-foreground"}`}>
                  {ROLE_LABELS[selectedEmp.role as EmployeeRole] ?? selectedEmp.role}
                </span>
                {hasAnyOverrides && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                    Personalizado
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingPerms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-50 inline-block" /> Heredado del rol</span>
                  <span className="flex items-center gap-1.5 text-blue-700"><span className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50 inline-block" /> Personalizado (agregado)</span>
                  <span className="flex items-center gap-1.5 text-rose-600"><span className="w-3 h-3 rounded border-2 border-rose-400 bg-rose-50 inline-block" /> Restringido (quitado del rol)</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3 h-3 rounded border border-muted-foreground/30 inline-block" /> Sin acceso</span>
                </div>

                {/* Module permissions grid */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Módulos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_ROUTES.map((route) => {
                      const Icon = ROUTE_ICONS[route.href] ?? LayoutDashboard;
                      const inRole = roleKeys.has(route.href);
                      const isOn = effectiveDraft.has(route.href);
                      const isDenied = inRole && !isOn;
                      const isCustom = !inRole && isOn;
                      return (
                        <button
                          key={route.href}
                          onClick={() => toggleKey(route.href)}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left cursor-pointer hover:shadow-sm ${
                            isDenied
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : isCustom
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : isOn
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                              : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{route.label}</span>
                          {isDenied && <X className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                          {isCustom && <Plus className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
                          {isOn && !isCustom && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action permissions */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Acciones permitidas
                  </p>
                  <div className="space-y-4">
                    {ACTION_GROUPS.map((group) => (
                      <div key={group.module} className="space-y-2">
                        <p className="text-xs font-medium text-foreground">{group.label}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.actions.map((action) => {
                            const inRole = roleKeys.has(action.key);
                            const isOn = effectiveDraft.has(action.key);
                            const isDenied = inRole && !isOn;
                            const isCustom = !inRole && isOn;
                            return (
                              <button
                                key={action.key}
                                onClick={() => toggleKey(action.key)}
                                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm ${
                                  isDenied
                                    ? "border-rose-300 bg-rose-50 text-rose-700"
                                    : isCustom
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : isOn
                                    ? "border-amber-400 bg-amber-50 text-amber-700"
                                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                                }`}
                              >
                                <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                                  isDenied ? "bg-rose-400 border-rose-400" : isCustom ? "bg-blue-400 border-blue-400" : isOn ? "bg-amber-500 border-amber-500" : "border-muted-foreground/40"
                                }`}>
                                  {isDenied && <X className="h-2.5 w-2.5 text-white" />}
                                  {isCustom && <Plus className="h-2.5 w-2.5 text-white" />}
                                  {isOn && !isCustom && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium leading-tight">{action.label}</div>
                                  <div className="text-[11px] opacity-70 mt-0.5 leading-snug">{action.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save controls */}
                <div className="flex items-center justify-between gap-3 border-t pt-3">
                  {hasChanges && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      Cambios sin guardar
                    </div>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restablecer rol
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fidelidad Tab ─────────────────────────────────────────────────────────────

type LoyaltyConfig = {
  enabled: boolean;
  mode: "amount" | "purchase";
  amountPerPoint: number;
  pointsPerPurchase: number;
  redemptionValue: number;
  pointsPerPqrs: number;
};

const LOYALTY_QUERY_KEY = ["loyalty-config"];

// ── Operaciones ───────────────────────────────────────────────────────────────

function SortablePMRow({ id, pm, idx, dupKind, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[1.5rem_1fr_9rem_2.25rem] gap-2 items-center">
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-9 w-6 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        tabIndex={-1}
        type="button"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input placeholder="Nombre visible" value={pm.label} onChange={(e) => onUpdate({ label: e.target.value })} />
      <select
        className={`h-9 rounded-md border bg-background px-2 text-sm ${dupKind ? "border-destructive" : ""}`}
        value={pm.kind}
        onChange={(e) => onUpdate({ kind: e.target.value })}
        title={dupKind ? "Solo un método puede tener este tipo" : undefined}
      >
        {PAYMENT_METHOD_KINDS.map((k) => (
          <option key={k} value={k}>{PAYMENT_METHOD_KIND_LABELS[k]}</option>
        ))}
      </select>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const todayInBusinessTimeZone = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

function OpsCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// Attach a stable _id to each payment method for use as React key and DnD id.
// _id is intentionally excluded before saving (backend only stores value/label/kind).
function withStableIds(methods) {
  return methods.map((m) => m._id ? m : { ...m, _id: m.value + "_" + Math.random().toString(36).slice(2) });
}

function OperacionesTab() {
  const { ops, saveOps, isSaving, formatCurrency } = useCompanySettings();
  const { toast } = useToast();
  const [draft, setDraft] = useState(ops);

  const { data: tenantMe } = useQuery<{ tenant?: { slug?: string } }>({
    queryKey: ["tenant-me"],
    queryFn: () => fetch(`${BASE_URL}/api/tenant/me`).then(r => r.json()),
  });
  const tenantSlug = tenantMe?.tenant?.slug;
  const orderingUrl = tenantSlug
    ? `${window.location.origin}${BASE_URL}/pedido/${tenantSlug}`
    : null;

  const handleCopyLink = () => {
    if (!orderingUrl) return;
    navigator.clipboard.writeText(orderingUrl).then(() => {
      toast({ title: "Enlace copiado", description: "Comparte este enlace con tus clientes." });
    });
  };

  // Estado para los billetes rápidos
  const [quickCashStr, setQuickCashStr] = useState(() => {
    return (ops?.quick_cash_amounts || [10000, 20000, 50000, 100000]).join(", ");
  });

  useEffect(() => {
    setDraft(ops);
    setQuickCashStr((ops?.quick_cash_amounts || [10000, 20000, 50000, 100000]).join(", "));
  }, [ops]);

  // ── Payment methods local draft ─────────────────────────────────────────────
  const [pmDraft, setPmDraft] = useState(() => withStableIds(ops.payment_methods));
  useEffect(() => {
    setPmDraft((prev) =>
      withStableIds(
        ops.payment_methods.map((m) => {
          const existing = prev.find((p) => p.value === m.value);
          return existing ? { ...m, _id: existing._id } : m;
        })
      )
    );
  }, [ops]);

  const pmSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handlePMDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pmDraft.findIndex((m) => m._id === active.id);
    const newIndex = pmDraft.findIndex((m) => m._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setPmDraft(arrayMove(pmDraft, oldIndex, newIndex));
  };

  const updatePM = (idx, patch) => {
    const next = [...pmDraft];
    const updated = { ...next[idx], ...patch };
    if (patch.label !== undefined) {
      const slug = patch.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
        .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_") || "metodo";
      updated.value = slug || updated.value;
    }
    next[idx] = updated;
    setPmDraft(next);
  };

  const hasDupPMKinds = pmDraft.some((pm, idx) =>
    ["cash", "credit", "points"].includes(pm.kind) &&
    pmDraft.some((o, i) => i !== idx && o.kind === pm.kind)
  );

  const handleSavePM = async () => {
    if (hasDupPMKinds) {
      toast({ title: "Tipos duplicados", description: "Efectivo, Crédito y Puntos solo pueden asignarse a un método.", variant: "destructive" });
      return;
    }
    await saveOps({ payment_methods: pmDraft.map(({ _id, ...m }) => m) });
    toast({ title: "Métodos de pago guardados" });
  };

  const handleSave = async () => {
    // Procesar los billetes rápidos ingresados por el usuario
    const quickCashArray = quickCashStr
      .split(",")
      .map((val) => Number(val.trim()))
      .filter((val) => !isNaN(val) && val > 0);

    const closuresByDate = new Map<string, { date: string; message?: string }>();
    for (const closure of draft.service_closed_dates ?? []) {
      const date = String(closure.date ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const message = String(closure.message ?? "").trim();
      closuresByDate.set(date, { date, ...(message ? { message } : {}) });
    }
    const finalDraft = {
      ...draft,
      delivery_free_days: Array.from(new Set(draft.delivery_free_days ?? [])).sort(),
      service_closed_days: Array.from(new Set(draft.service_closed_days ?? [])).sort(),
      service_closed_dates: Array.from(closuresByDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
      quick_cash_amounts: quickCashArray.length > 0 ? quickCashArray : [10000, 20000, 50000, 100000]
    };

    await saveOps(finalDraft);
    toast({ title: "Configuración actualizada" });
  };

  const toSlug = (label: string) =>
    label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_") || "categoria";

  const updateCat = (idx: number, label: string) => {
    const next = [...draft.expense_categories];
    next[idx] = { ...next[idx], label, value: toSlug(label) };
    setDraft({ ...draft, expense_categories: next });
  };
  const updateBonus = (idx: number, patch: Partial<{ name: string; amount: number }>) => {
    const next = [...draft.bonus_templates];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, bonus_templates: next });
  };

  const Card = OpsCard;

  return (
    <div className="space-y-4">
      {/* Métodos de Pago */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Métodos de pago</h2>
          <span className="text-xs text-muted-foreground ml-1">— orden y nombres en caja y mesas</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            Arrastra para reordenar. El primer método es el predeterminado en POS y Mesas.
            El <strong>tipo</strong> determina el comportamiento (p. ej. Efectivo muestra campo de cambio).
          </p>
          <div className="hidden sm:grid grid-cols-[1.5rem_1fr_9rem_2.25rem] gap-2 px-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <span></span>
            <span>Nombre visible</span>
            <span>Tipo</span>
            <span></span>
          </div>
          <DndContext sensors={pmSensors} collisionDetection={closestCenter} onDragEnd={handlePMDragEnd}>
            <SortableContext items={pmDraft.map((m) => m._id)} strategy={verticalListSortingStrategy}>
              {pmDraft.map((pm, idx) => {
                const dupKind = ["cash", "credit", "points"].includes(pm.kind) &&
                  pmDraft.some((o, i) => i !== idx && o.kind === pm.kind);
                return (
                  <SortablePMRow
                    key={pm._id}
                    id={pm._id}
                    pm={pm}
                    idx={idx}
                    dupKind={dupKind}
                    onUpdate={(patch) => updatePM(idx, patch)}
                    onDelete={() => setPmDraft(pmDraft.filter((_, i) => i !== idx))}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
          {hasDupPMKinds && (
            <p className="text-xs text-destructive">Los tipos Efectivo, Crédito y Puntos solo pueden asignarse a un método.</p>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const label = "Nuevo método";
            const value = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_") + "_" + Date.now();
            const _id = value + "_" + Math.random().toString(36).slice(2);
            setPmDraft([...pmDraft, { value, label, kind: inferPaymentMethodKind("nuevo"), _id }]);
          }}>
            <Plus className="h-3.5 w-3.5" /> Agregar método
          </Button>
          <div className="flex justify-end pt-3 border-t">
            <Button onClick={handleSavePM} disabled={isSaving || hasDupPMKinds} className="gap-2">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar métodos de pago
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card icon={Tag} title="Categorías de gastos">
          <p className="text-xs text-muted-foreground">Personaliza las categorías para clasificar tus egresos.</p>
          {draft.expense_categories.map((c, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input className="flex-1" placeholder="Nombre de la categoría" value={c.label} onChange={(e) => updateCat(idx, e.target.value)} />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0"
                onClick={() => setDraft({ ...draft, expense_categories: draft.expense_categories.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const label = "Nueva categoría";
            setDraft({ ...draft, expense_categories: [...draft.expense_categories, { value: toSlug(label) + "_" + Date.now(), label }] });
          }}>
            <Plus className="h-3.5 w-3.5" /> Agregar categoría
          </Button>
        </Card>

        <Card icon={Tag} title="Categorías de ingredientes">
          <p className="text-xs text-muted-foreground">Define las categorías disponibles al registrar o editar ingredientes.</p>
          {draft.ingredient_categories.map((cat, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                className="flex-1"
                placeholder="Nombre de la categoría"
                value={cat}
                onChange={(e) => {
                  const next = [...draft.ingredient_categories];
                  next[idx] = e.target.value;
                  setDraft({ ...draft, ingredient_categories: next });
                }}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0"
                onClick={() => setDraft({ ...draft, ingredient_categories: draft.ingredient_categories.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            setDraft({ ...draft, ingredient_categories: [...draft.ingredient_categories, "Nueva categoría"] });
          }}>
            <Plus className="h-3.5 w-3.5" /> Agregar categoría
          </Button>
        </Card>

        <Card icon={Coins} title="Salarios y horas extra">
          <div className="space-y-2">
            <Label className="text-sm">Multiplicador de horas extra</Label>
            <Input type="number" min={1} step="0.05" value={draft.salary_overtime_rate}
              onChange={(e) => setDraft({ ...draft, salary_overtime_rate: parseFloat(e.target.value) || 1 })} />
            <p className="text-xs text-muted-foreground">
              Las horas trabajadas más allá del turno se pagan a este multiplicador (por ej. 1.25 = 25% extra).
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Horas regulares por día</Label>
            <Input type="number" min={1} max={24} step="0.5" value={draft.regular_daily_hours}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                const clamped = Number.isFinite(n) ? Math.min(24, Math.max(1, n)) : 8;
                setDraft({ ...draft, regular_daily_hours: clamped });
              }} />
            <p className="text-xs text-muted-foreground">
              Las horas trabajadas por encima de este umbral se calculan como horas extra en la nómina automática.
            </p>
          </div>
        </Card>

        <Card icon={Bike} title="Domicilios">
          {orderingUrl && (
            <div className="space-y-2 pb-2 border-b border-muted/50">
              <Label className="text-sm flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Enlace de tienda online</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs bg-muted rounded-md px-3 py-2 font-mono truncate text-muted-foreground select-all">
                  {orderingUrl}
                </div>
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Comparte este enlace con tus clientes para que hagan pedidos online.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm">Tarifa estándar de domicilio</Label>
            <Input type="number" min={0} step="100" value={draft.delivery_fee_default}
              onChange={(e) => setDraft({ ...draft, delivery_fee_default: parseFloat(e.target.value) || 0 })} />
            <p className="text-xs text-muted-foreground">Equivale a {formatCurrency(draft.delivery_fee_default)}.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Horario de atención</Label>
            <Input
              value={draft.business_hours}
              onChange={(e) => setDraft({ ...draft, business_hours: e.target.value })}
              placeholder="Ej: Lun–Vie 10am–8pm, Sáb 10am–6pm"
            />
            <p className="text-xs text-muted-foreground">
              Se mostrará a los clientes cuando la tienda esté cerrada.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Días con envío gratis</Label>
            <div className="flex flex-wrap gap-1.5">
              {DOW.map((d, idx) => {
                const active = draft.delivery_free_days.includes(idx);
                return (
                  <button key={idx} type="button"
                    onClick={() => setDraft({
                      ...draft,
                      delivery_free_days: active
                        ? draft.delivery_free_days.filter((x) => x !== idx)
                        : [...draft.delivery_free_days, idx],
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-muted/50">
            <Label className="text-sm">Días sin servicio</Label>
            <p className="text-xs text-muted-foreground">
              El agente y la tienda no recibirán pedidos en estos días de la semana.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DOW.map((d, idx) => {
                const active = (draft.service_closed_days ?? []).includes(idx);
                return (
                  <button key={idx} type="button"
                    onClick={() => setDraft({
                      ...draft,
                      service_closed_days: active
                        ? (draft.service_closed_days ?? []).filter((x) => x !== idx)
                        : [...(draft.service_closed_days ?? []), idx],
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${active ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background hover:bg-muted"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              También puedes programar un cierre puntual por una dificultad, emergencia o fecha especial.
            </p>
            <div className="space-y-2">
              {(draft.service_closed_dates ?? []).map((closure, idx) => (
                <div key={`${closure.date}-${idx}`} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="date"
                    value={closure.date ?? ""}
                    onChange={(e) => {
                      const next = [...(draft.service_closed_dates ?? [])];
                      next[idx] = { ...next[idx], date: e.target.value };
                      setDraft({ ...draft, service_closed_dates: next });
                    }}
                    className="sm:w-44"
                  />
                  <Input
                    value={closure.message ?? ""}
                    onChange={(e) => {
                      const next = [...(draft.service_closed_dates ?? [])];
                      next[idx] = { ...next[idx], message: e.target.value };
                      setDraft({ ...draft, service_closed_dates: next });
                    }}
                    placeholder="Mensaje opcional para los clientes"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive shrink-0"
                    onClick={() => setDraft({
                      ...draft,
                      service_closed_dates: (draft.service_closed_dates ?? []).filter((_, i) => i !== idx),
                    })}
                    aria-label="Eliminar cierre especial"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setDraft({
                  ...draft,
                  service_closed_dates: [
                    ...(draft.service_closed_dates ?? []),
                    { date: todayInBusinessTimeZone(), message: "" },
                  ],
                })}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar cierre por fecha
              </Button>
            </div>
          </div>
        </Card>

        {/* --- TARJETA CAJA MODIFICADA CON BILLETES RÁPIDOS --- */}
        <Card icon={Wallet} title="Caja y POS">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Saldo de apertura por defecto</Label>
              <Input type="number" min={0} step="100" value={draft.cash_default_opening_balance}
                onChange={(e) => setDraft({ ...draft, cash_default_opening_balance: parseFloat(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground">Se sugerirá automáticamente al abrir un turno de caja.</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-muted/50">
              <Label className="text-sm">Billetes Rápidos (Separados por coma)</Label>
              <Input
                value={quickCashStr}
                onChange={(e) => setQuickCashStr(e.target.value)}
                placeholder="10000, 20000, 50000, 100000"
              />
              <p className="text-xs text-muted-foreground">
                Estos serán los botones de billetes que aparecerán al momento de cobrar una mesa en efectivo.
              </p>
            </div>
          </div>
        </Card>

        <Card icon={Award} title="Plantillas de bonos a clientes">
          <p className="text-xs text-muted-foreground">
            Define las plantillas que puedes asignar a clientes. Marca con <span className="text-amber-500">★</span> la que se usará automáticamente en cumpleaños.
          </p>
          {draft.bonus_templates.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Sin plantillas. Agrega una para empezar.</p>
          )}
          {draft.bonus_templates.map((b, idx) => {
            const isBirthday = draft.bonus_birthday_template === b.name;
            return (
              <div key={idx} className="flex gap-2 items-center">
                <button
                  type="button"
                  title={isBirthday ? "Plantilla de cumpleaños activa" : "Marcar como plantilla de cumpleaños"}
                  onClick={() => setDraft({ ...draft, bonus_birthday_template: isBirthday ? "" : b.name })}
                  className={`shrink-0 text-lg leading-none transition-colors ${isBirthday ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`}
                >★</button>
                <Input className="flex-1" placeholder="Nombre del bono" value={b.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const wasBirthday = draft.bonus_birthday_template === b.name;
                    updateBonus(idx, { name: newName });
                    if (wasBirthday) setDraft((prev) => ({ ...prev, bonus_birthday_template: newName }));
                  }} />
                <Input className="w-36" type="number" min={0} step="1000" placeholder="Monto ($)" value={b.amount}
                  onChange={(e) => updateBonus(idx, { amount: parseFloat(e.target.value) || 0 })} />
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0"
                  onClick={() => {
                    const wasBirthday = draft.bonus_birthday_template === b.name;
                    setDraft({
                      ...draft,
                      bonus_templates: draft.bonus_templates.filter((_, i) => i !== idx),
                      ...(wasBirthday ? { bonus_birthday_template: "" } : {}),
                    });
                  }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          {draft.bonus_birthday_template && (
            <p className="text-xs text-amber-600">
              ★ Cumpleaños: se usará <strong>"{draft.bonus_birthday_template}"</strong> al enviar WhatsApp desde el panel de cumpleaños.
            </p>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDraft({ ...draft, bonus_templates: [...draft.bonus_templates, { name: "Nuevo bono", amount: 0 }] })}>
            <Plus className="h-3.5 w-3.5" /> Agregar plantilla
          </Button>
        </Card>

        <Card icon={Award} title="Mensaje de cumpleaños (WhatsApp)">
          <p className="text-xs text-muted-foreground">
            Variables disponibles: <code>{"{nombre}"}</code>, <code>{"{empresa}"}</code>, <code>{"{bono}"}</code>.
          </p>
          <Textarea
            rows={4}
            value={draft.whatsapp_birthday_message}
            onChange={(e) => setDraft({ ...draft, whatsapp_birthday_message: e.target.value })}
            placeholder="¡Hola {nombre}! Te deseamos un feliz cumpleaños…"
          />
          <p className="text-xs text-muted-foreground">Se usará al hacer clic en el botón de WhatsApp en la tarjeta del cliente o en el panel de cumpleaños.</p>
        </Card>

        <Card icon={Award} title="Plantilla de pedido a proveedor">
          <p className="text-xs text-muted-foreground">
            Variables disponibles: <code>{"{ingrediente}"}</code>, <code>{"{qty}"}</code>, <code>{"{unit}"}</code>, <code>{"{proveedor}"}</code>.
          </p>
          <Textarea
            rows={3}
            value={draft.reorder_message_template}
            onChange={(e) => setDraft({ ...draft, reorder_message_template: e.target.value })}
            placeholder="Hola, necesitamos {qty} {unit} de {ingrediente}…"
          />
          <p className="text-xs text-muted-foreground">Se usará al hacer clic en "Pedir al proveedor" desde el panel de stock bajo.</p>
        </Card>
      </div>

      <div className="flex justify-end items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[180px]">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function FidelidadTab() {
  const { toast } = useToast();
  const { formatCurrency } = useCompanySettings();

  const { data: remote, isLoading } = useQuery<LoyaltyConfig>({
    queryKey: LOYALTY_QUERY_KEY,
    queryFn: () => fetch("/api/loyalty/config").then(r => r.json()),
  });

  const [draft, setDraft] = useState<LoyaltyConfig>({
    enabled: false,
    mode: "amount",
    amountPerPoint: 10000,
    pointsPerPurchase: 1,
    redemptionValue: 1000,
    pointsPerPqrs: 0,
  });

  useEffect(() => {
    if (remote) setDraft(remote);
  }, [remote]);

  const qc = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async (cfg: LoyaltyConfig) => {
      const r = await fetch("/api/loyalty/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "Error al guardar");
      }
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOYALTY_QUERY_KEY });
      toast({ title: "Configuración de fidelidad guardada" });
    },
    onError: (err: unknown) => toast({
      title: "Error al guardar",
      description: err instanceof Error ? err.message : undefined,
      variant: "destructive",
    }),
  });

  const validationError = (() => {
    if (draft.mode === "amount" && (!Number.isFinite(draft.amountPerPoint) || draft.amountPerPoint <= 0)) {
      return "El monto por punto debe ser mayor a 0.";
    }
    if (draft.mode === "purchase" && (!Number.isFinite(draft.pointsPerPurchase) || draft.pointsPerPurchase <= 0)) {
      return "Los puntos por compra deben ser mayores a 0.";
    }
    if (!Number.isFinite(draft.redemptionValue) || draft.redemptionValue <= 0) {
      return "El valor de canje debe ser mayor a 0.";
    }
    return null;
  })();

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(remote);

  const examplePoints = draft.mode === "amount"
    ? Math.floor(50000 / draft.amountPerPoint)
    : draft.pointsPerPurchase;

  const example100Value = draft.redemptionValue * 100;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
          <Star className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Programa de Puntos de Fidelidad</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{draft.enabled ? "Activo" : "Inactivo"}</span>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(v) => setDraft(d => ({ ...d, enabled: v }))}
            />
          </div>
        </div>

        <div className={`p-5 space-y-6 transition-opacity ${draft.enabled ? "" : "opacity-50 pointer-events-none"}`}>

          {/* Mode selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Modo de acumulación</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDraft(d => ({ ...d, mode: "amount" }))}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${draft.mode === "amount" ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Por valor de compra</span>
                </div>
                <p className="text-xs text-muted-foreground">El cliente acumula puntos según el monto gastado</p>
              </button>
              <button
                type="button"
                onClick={() => setDraft(d => ({ ...d, mode: "purchase" }))}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${draft.mode === "purchase" ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Por compra realizada</span>
                </div>
                <p className="text-xs text-muted-foreground">Se otorgan puntos fijos por cada compra</p>
              </button>
            </div>
          </div>

          {/* Earning rule */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Regla de acumulación</Label>
            {draft.mode === "amount" ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Por cada</span>
                <div className="relative w-40">
                  <Input
                    type="number"
                    min={1}
                    value={draft.amountPerPoint}
                    onChange={e => setDraft(d => ({ ...d, amountPerPoint: Number(e.target.value) }))}
                    className="pr-12 h-9"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">COP</span>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">en compras</span>
                <span className="font-bold text-primary">→ 1 punto</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Cada compra otorga</span>
                <div className="relative w-32">
                  <Input
                    type="number"
                    min={1}
                    value={draft.pointsPerPurchase}
                    onChange={e => setDraft(d => ({ ...d, pointsPerPurchase: Number(e.target.value) }))}
                    className="pr-12 h-9"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">pts</span>
                </div>
                <span className="font-bold text-primary">al cliente</span>
              </div>
            )}
          </div>

          {/* Redemption rule */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Equivalencia / Canje</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">1 punto equivale a</span>
              <div className="relative w-40">
                <Input
                  type="number"
                  min={1}
                  value={draft.redemptionValue}
                  onChange={e => setDraft(d => ({ ...d, redemptionValue: Number(e.target.value) }))}
                  className="pr-12 h-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">COP</span>
              </div>
              <span className="text-sm text-muted-foreground">de descuento / beneficio</span>
            </div>
          </div>

          {/* PQRS bonus */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Puntos por PQRS / Calificación</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Otorgar</span>
              <div className="relative w-32">
                <Input
                  type="number"
                  min={0}
                  value={draft.pointsPerPqrs}
                  onChange={e => setDraft(d => ({ ...d, pointsPerPqrs: Number(e.target.value) }))}
                  className="pr-12 h-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">pts</span>
              </div>
              <span className="text-sm text-muted-foreground">al cliente al enviar una reseña</span>
            </div>
            {draft.pointsPerPqrs === 0 && (
              <p className="text-xs text-muted-foreground">Pon 0 para no otorgar puntos por PQRS.</p>
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Vista previa</span>
            </div>
            {draft.mode === "amount" ? (
              <p className="text-sm text-muted-foreground">
                Por una compra de <span className="font-semibold text-foreground">{formatCurrency(50000)}</span>, el cliente gana{" "}
                <span className="font-bold text-primary">{examplePoints} punto{examplePoints !== 1 ? "s" : ""}</span>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cada compra le otorga al cliente{" "}
                <span className="font-bold text-primary">{draft.pointsPerPurchase} punto{draft.pointsPerPurchase !== 1 ? "s" : ""}</span>.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              100 puntos acumulados equivalen a{" "}
              <span className="font-bold text-primary">{formatCurrency(example100Value)}</span> en beneficios / descuento.
            </p>
          </div>
        </div>
      </div>

      {validationError && (
        <p className="text-xs text-destructive text-right" data-testid="loyalty-validation-error">
          {validationError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => remote && setDraft(remote)}
          disabled={!hasChanges || saveMutation.isPending}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Descartar
        </Button>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate(draft)}
          disabled={!hasChanges || saveMutation.isPending || !!validationError}
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}

// ── Impresión Tab (NUEVO) ────────────────────────────────────────────────────────
// ── Printer helpers ──────────────────────────────────────────────────────────
type PrinterType = "usb" | "network" | "bluetooth";
type PrinterZone = PrintZone;
type FontSize = PrintFontSize;

interface PrinterConfig {
  id: string;
  name: string;
  type: PrinterType;
  ip?: string;
  port?: number;
  /** OS printer selected through a paired Local Print Agent. */
  agentId?: number;
  deviceId?: string;
  deviceName?: string;
  zone: PrinterZone;
  paperWidth: PrintPaperWidth;
  lineSpacing: PrintLineSpacing;
  marginMm: number;
  density: PrintDensity;
  autoCut: boolean;
  fontSize: FontSize;
}

function printerForSave(printer: PrinterConfig): PrinterConfig {
  const ip = printer.ip?.trim();
  const deviceId = printer.deviceId?.trim();
  const deviceName = printer.deviceName?.trim();
  return {
    id: printer.id,
    name: printer.name.trim(),
    type: printer.type,
    zone: printer.zone,
    ...normalizePrintProfile(printer, printer.fontSize),
    ...(printer.type === "network" && ip ? { ip, port: printer.port || 9100 } : {}),
    ...(printer.agentId && printer.agentId > 0 ? { agentId: printer.agentId } : {}),
    ...(deviceId ? { deviceId } : {}),
    ...(deviceName ? { deviceName } : {}),
  };
}

const PRINTER_TYPE_LABELS: Record<PrinterType, string> = {
  usb: "USB / Cable",
  network: "Red (IP)",
  bluetooth: "Bluetooth",
};

const PRINTER_ZONE_LABELS = PRINT_ZONE_LABELS;

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; px: string }[] = [
  { value: "small",  label: "Pequeño", px: "9px"  },
  { value: "normal", label: "Normal",  px: "11px" },
  { value: "large",  label: "Grande",  px: "14px" },
];

function fontSizePx(fs: FontSize) {
  return FONT_SIZE_OPTIONS.find(o => o.value === fs)?.px ?? "11px";
}

function PrinterTypeIcon({ type }: { type: PrinterType }) {
  if (type === "network")    return <Wifi       className="h-4 w-4 text-blue-500" />;
  if (type === "bluetooth")  return <Bluetooth  className="h-4 w-4 text-indigo-500" />;
  return                            <Cable      className="h-4 w-4 text-gray-500" />;
}

function FontSizePicker({ value, onChange }: { value: FontSize; onChange: (v: FontSize) => void }) {
  return (
    <div className="flex items-center gap-1">
      {FONT_SIZE_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center justify-center w-16 h-10 rounded-lg border text-xs gap-0.5 transition-colors ${
            value === opt.value
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <span style={{ fontSize: opt.px, lineHeight: 1 }}>A</span>
          <span className="text-[9px]">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── ImpresionTab ──────────────────────────────────────────────────────────────
function ImpresionTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings: globalSettings, formatCurrency } = useCompanySettings();
  const { isAdminOrManager } = useRole();
  type LocalDevice = { id: string; name: string; connection?: string };
  type PrintAgent = { id: number; name: string; status: string; lastSeenAt?: string; devices: LocalDevice[]; revokedAt?: string };
  type PrintJobSummary = { queued: number; claimed: number; printing: number; completed: number; failed: number };
  type PrintJobFailure = { id: number; deviceName: string; attempts: number; error?: string | null; failedAt?: string | null };
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()),
  });
  const {
    data: printAgentStatus,
    isFetching: isRefreshingAgents,
    isError: printAgentStatusError,
    error: printAgentError,
    refetch: refreshAgents,
  } = useQuery<{ agents: PrintAgent[]; jobs: PrintJobSummary; recentFailures: PrintJobFailure[] }>({
    queryKey: ["print-agent-status"],
    queryFn: async () => {
      const response = await fetch("/api/print-agent/status");
      if (!response.ok) throw new Error("No se pudo consultar el estado del agente local.");
      return response.json();
    },
    refetchInterval: 30_000,
  });
  const agents = (printAgentStatus?.agents ?? []).filter(agent => !agent.revokedAt);
  const printJobs = printAgentStatus?.jobs ?? { queued: 0, claimed: 0, printing: 0, completed: 0, failed: 0 };
  const latestPrintFailure = printAgentStatus?.recentFailures?.[0];
  const onlineAgents = agents.filter(agent => agent.status.toLowerCase() === "connected" || agent.status.toLowerCase() === "online");
  const discoveredDevices = onlineAgents.flatMap(agent =>
    (agent.devices ?? []).map(device => ({ ...device, agentId: agent.id, agentName: agent.name })),
  );
  const formatLastSeen = (value?: string) => {
    if (!value) return "sin conexión registrada";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "hora no disponible" : date.toLocaleString();
  };
  const pairingCommand = pairing
    ? `pnpm --filter @workspace/scripts print-agent -- --api-url ${window.location.origin}/api --pairing-code ${pairing.code} --name "Caja principal"`
    : "";
  const pairingLink = pairing
    ? `fyro-print-agent://pair?apiUrl=${encodeURIComponent(`${window.location.origin}/api`)}&code=${encodeURIComponent(pairing.code)}&name=${encodeURIComponent("Caja principal")}`
    : "";
  const detectedPlatform = typeof navigator === "undefined"
    ? null
    : /Win/i.test(navigator.userAgent)
      ? "windows"
      : /Mac/i.test(navigator.userAgent)
        ? "macos"
        : null;
  const printAgentDownloads = {
    windows: "/api/print-agent/downloads/windows",
    macos: "/api/print-agent/downloads/macos",
  };
  const { data: downloadAvailability, isLoading: isLoadingDownloads } = useQuery<{
    windows: { available: boolean };
    macos: { available: boolean };
  }>({
    queryKey: ["print-agent-downloads"],
    queryFn: async () => {
      const response = await fetch("/api/print-agent/downloads");
      if (!response.ok) throw new Error("No se pudo comprobar la disponibilidad del instalador.");
      return response.json();
    },
    staleTime: 5 * 60_000,
  });
  const selectedDownload = detectedPlatform ? printAgentDownloads[detectedPlatform] : null;
  const selectedDownloadAvailable = detectedPlatform
    ? downloadAvailability?.[detectedPlatform]?.available === true
    : false;

  const [draft, setDraft] = useState({
    receipt_header: "¡Gracias por su compra!",
    receipt_footer: "Vuelva pronto.",
    receipt_show_logo: true,
    receipt_show_customer: true,
    receipt_font_size: "normal" as FontSize,
    kitchen_show_notes: true,
    kitchen_show_server: true,
    kitchen_font_size: "large" as FontSize,
    kitchen_auto_print: false,
    kitchen_auto_print_stations: '["kitchen"]',
    inventory_header: "COMPROBANTE DE INVENTARIO",
    inventory_footer: "Entregó: {usuario}\nRecibió: {recibe}",
    inventory_font_size: "normal" as FontSize,
    printers: [] as PrinterConfig[],
  });

  const [previewType, setPreviewType] = useState<"receipt" | "kitchen" | "inventory" | null>(null);
  const [printerDialog, setPrinterDialog] = useState<{ open: boolean; editing: PrinterConfig | null }>({ open: false, editing: null });
  const [printerForm, setPrinterForm] = useState<Omit<PrinterConfig, "id">>({
    name: "", type: "usb", zone: "receipt", ip: "", port: 9100,
    ...DEFAULT_PRINT_PROFILE,
  });

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: "No se pudo copiar", description: "Selecciona y copia el texto manualmente.", variant: "destructive" });
    }
  };

  const generatePairing = async () => {
    try {
      const response = await fetch("/api/print-agent/pairings", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.code || !data.expiresAt) throw new Error(data.detail || "No se pudo generar el código de emparejamiento.");
      setPairing({ code: String(data.code), expiresAt: String(data.expiresAt) });
      toast({ title: "Código generado", description: "Vence en 10 minutos. Compártelo solo con el equipo que instalará el agente." });
    } catch (error) {
      toast({ title: "No se pudo generar el código", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  const downloadPrintAgent = () => {
    if (!detectedPlatform) {
      toast({
        title: "Sistema no compatible",
        description: "El agente local está disponible para Windows y macOS. Linux no está disponible por ahora.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDownloadAvailable || !selectedDownload) {
      toast({
        title: `Instalador de ${detectedPlatform === "windows" ? "Windows" : "macOS"} no disponible`,
        description: "Todavía no hay una versión firmada publicada. Inténtalo nuevamente más tarde o consulta al soporte de FYRO.",
        variant: "destructive",
      });
      return;
    }
    window.location.assign(selectedDownload);
  };

  const revokeAgent = async (agent: PrintAgent) => {
    try {
      const response = await fetch(`/api/print-agent/agents/${encodeURIComponent(agent.id)}/revoke`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "No se pudo revocar el agente.");
      await refreshAgents();
      toast({ title: "Agente revocado", description: `${agent.name} ya no puede enviar trabajos de impresión.` });
    } catch (error) {
      toast({ title: "No se pudo revocar el agente", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setDraft({
        receipt_header:    settings.receipt_header    !== undefined ? String(settings.receipt_header)    : "¡Gracias por su compra!",
        receipt_footer:    settings.receipt_footer    !== undefined ? String(settings.receipt_footer)    : "Vuelva pronto.",
        receipt_show_logo:     settings.receipt_show_logo     !== false,
        receipt_show_customer: settings.receipt_show_customer !== false,
        receipt_font_size: (settings.receipt_font_size  as FontSize) || "normal",
        kitchen_show_notes: settings.kitchen_show_notes !== false,
        kitchen_show_server: settings.kitchen_show_server !== false,
        kitchen_font_size:  (settings.kitchen_font_size  as FontSize) || "large",
        kitchen_auto_print: settings.kitchen_auto_print === true,
        kitchen_auto_print_stations: typeof settings.kitchen_auto_print_stations === "string" ? settings.kitchen_auto_print_stations : '["kitchen"]',
        inventory_header: settings.inventory_header !== undefined ? String(settings.inventory_header) : "COMPROBANTE DE INVENTARIO",
        inventory_footer: settings.inventory_footer !== undefined ? String(settings.inventory_footer) : "Entregó: {usuario}\nRecibió: {recibe}",
        inventory_font_size: (settings.inventory_font_size as FontSize) || "normal",
         printers: Array.isArray(settings.printers) ? settings.printers.map((p: any) => ({
           ...p,
           ...normalizePrintProfile(p, "normal"),
         })) : [],
      });
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Record<string, any>) => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSettings,
          printers: Array.isArray(newSettings.printers)
            ? newSettings.printers.map((printer: PrinterConfig) => printerForSave(printer))
            : [],
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof result.error === "string" && result.error.trim()
            ? result.error
            : "Error al guardar configuraciones de impresión",
        );
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({ title: "Formatos de impresión actualizados exitosamente." });
    },
    onError: (err: Error) => toast({ title: "Error al guardar los ajustes", description: err.message || undefined, variant: "destructive" }),
  });

  const set = (key: keyof typeof draft, val: any) => setDraft(prev => ({ ...prev, [key]: val }));

  const setFormatFont = (key: "receipt_font_size" | "kitchen_font_size" | "inventory_font_size", zone: PrinterZone, value: FontSize) => {
    setDraft(prev => ({
      ...prev,
      [key]: value,
      printers: prev.printers.map(p => (
        zone === "kitchen"
          ? (p.zone.startsWith("kitchen") ? { ...p, fontSize: value } : p)
          : (p.zone === zone ? { ...p, fontSize: value } : p)
      )),
    }));
  };

  const openAddPrinter = () => {
    setPrinterForm({ name: "", type: "usb", zone: "receipt", ip: "", port: 9100, agentId: undefined, deviceId: "", deviceName: "", ...DEFAULT_PRINT_PROFILE });
    setPrinterDialog({ open: true, editing: null });
  };

  const openEditPrinter = (p: PrinterConfig) => {
    setPrinterForm({
      name: p.name, type: p.type, zone: p.zone, ip: p.ip || "", port: p.port || 9100,
      agentId: p.agentId, deviceId: p.deviceId || "", deviceName: p.deviceName || "",
      ...normalizePrintProfile(p, p.fontSize || "normal"),
    });
    setPrinterDialog({ open: true, editing: p });
  };

  const savePrinter = () => {
    if (!printerForm.name.trim()) return;
    const newPrinter: PrinterConfig = {
      id: printerDialog.editing?.id || String(Date.now()),
      ...printerForm,
      ...normalizePrintProfile(printerForm, printerForm.fontSize),
    };
    const existing = draft.printers;
    const updated = printerDialog.editing
      ? existing.map(p => p.id === printerDialog.editing!.id ? newPrinter : p)
      : [...existing, newPrinter];
    set("printers", updated);
    setPrinterDialog({ open: false, editing: null });
  };

  const deletePrinter = (id: string) => {
    set("printers", draft.printers.filter(p => p.id !== id));
  };

  const printTest = async (printer: PrinterConfig) => {
    try {
      const saveResponse = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printers: draft.printers }),
      });
      if (!saveResponse.ok) throw new Error("No se pudo guardar el perfil antes de imprimir.");
      const response = await fetch("/api/print/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerId: printer.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.detail || data.reason || "No se pudo imprimir la prueba");
      toast({
        title: data.queued ? "Prueba en cola" : "Prueba enviada",
        description: data.queued
          ? `El trabajo para ${printer.name} quedó en cola en el agente local.`
          : `Se envió un ticket a ${printer.name}.`,
      });
    } catch (error) {
      toast({
        title: "No se pudo imprimir",
        description: error instanceof Error ? error.message : "Verifica la IP, el puerto y que la impresora esté encendida.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="p-10 text-center text-muted-foreground animate-pulse">Cargando formatos...</div>;

  return (
    <div className="space-y-6">

      {/* ── AGENTE LOCAL DE IMPRESIÓN ─────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-sm">Agente local de impresión</h3>
              <p className="text-xs text-muted-foreground">Conecta impresoras USB y Bluetooth del equipo sin instalar Node.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => refreshAgents()}
            disabled={isRefreshingAgents}
            aria-label="Actualizar estado de agentes locales"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshingAgents ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
        <div className="p-4 space-y-3">
          {printAgentStatusError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              No se pudo consultar el agente: {printAgentError instanceof Error ? printAgentError.message : "intenta actualizar nuevamente."}
            </div>
          ) : onlineAgents.length > 0 ? (
            <div className="space-y-2">
              {onlineAgents.map(agent => (
                <div key={agent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {agent.name || "Equipo local"} <span className="text-xs font-normal text-emerald-700">Conectado</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Visto: {formatLastSeen(agent.lastSeenAt)} · {agent.devices?.length ?? 0} dispositivo(s) detectado(s)</p>
                    {(agent.devices?.length ?? 0) > 0 && <p className="mt-1 text-xs text-muted-foreground truncate">Dispositivos: {agent.devices.map(device => device.name).join(", ")}</p>}
                  </div>
                  {isAdminOrManager && <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => revokeAgent(agent)} aria-label={`Revocar agente ${agent.name}`}>Revocar</Button>}
                </div>
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Agente sin conexión</div>
              <p className="mt-1">Revisa que el agente esté ejecutándose y que este equipo tenga internet. Última vez visto: {formatLastSeen(agents[0].lastSeenAt)}.</p>
              {isAdminOrManager && <div className="mt-2 flex flex-wrap gap-2">{agents.map(agent => <Button key={agent.id} variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => revokeAgent(agent)} aria-label={`Revocar agente ${agent.name}`}>Revocar {agent.name}</Button>)}</div>}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Agente no instalado o aún no conectado</p>
               <p className="mt-1">Descarga el instalador para tu sistema, ábrelo y usa el código de emparejamiento. El agente quedará activo al iniciar el equipo.</p>
            </div>
          )}
          {(printJobs.queued > 0 || printJobs.claimed > 0 || printJobs.printing > 0 || printJobs.failed > 0) && (
            <div className={`rounded-lg border p-3 text-xs ${printJobs.failed > 0 ? "border-destructive/30 bg-destructive/5" : "bg-muted/20"}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                <span>Cola: {printJobs.queued}</span>
                <span>En proceso: {printJobs.claimed + printJobs.printing}</span>
                <span className={printJobs.failed > 0 ? "text-destructive" : ""}>Fallidos: {printJobs.failed}</span>
              </div>
              {latestPrintFailure && (
                <p className="mt-1 text-muted-foreground">
                  Último fallo en {latestPrintFailure.deviceName}: {latestPrintFailure.error || "el agente no confirmó el resultado"} ({latestPrintFailure.attempts} intento(s)).
                </p>
              )}
            </div>
          )}
          {isAdminOrManager && (
             <div className="border-t pt-3 space-y-3">
               <div className="flex flex-wrap items-center gap-2">
                 <Button size="sm" className="h-8 text-xs" onClick={generatePairing}>Generar código (10 min)</Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={downloadPrintAgent}
                    disabled={isLoadingDownloads}
                 >
                    <Download className="h-3.5 w-3.5" /> {isLoadingDownloads
                      ? "Comprobando instalador..."
                      : `Descargar para ${detectedPlatform === "windows" ? "Windows" : detectedPlatform === "macos" ? "macOS" : "este equipo"}`}
                  </Button>
               </div>
                {!isLoadingDownloads && (!detectedPlatform || !selectedDownloadAvailable) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
                    <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Instalador no disponible</div>
                    <p className="mt-1">
                      {!detectedPlatform
                        ? "El agente local solo está disponible para Windows y macOS."
                        : `Aún no hay una versión firmada publicada para ${detectedPlatform === "windows" ? "Windows" : "macOS"}. No se abrirá ninguna descarga hasta que esté disponible.`}
                    </p>
                  </div>
                )}
              {pairing && (
                 <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="text-xs font-medium text-indigo-950">Código de instalación</span>
                     <code className="rounded bg-white px-2 py-1 text-xs font-semibold tracking-wider text-indigo-950">{pairing.code}</code>
                     <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyText(pairing.code, "Código")}>Copiar código</Button>
                     <span className="text-[11px] text-indigo-700">Vence: {formatLastSeen(pairing.expiresAt)}</span>
                   </div>
                   <div className="flex flex-wrap items-center gap-2">
                     <a
                       href={pairingLink}
                       className="inline-flex h-7 items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 text-xs font-medium text-white hover:bg-indigo-700"
                     >
                       <ExternalLink className="h-3 w-3" /> Abrir agente y emparejar
                     </a>
                     <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyText(pairingCommand, "Comando de respaldo")}>Copiar comando de respaldo</Button>
                   </div>
                   <p className="text-[11px] text-indigo-800">Si todavía no lo instalaste, descarga el instalador de arriba. Después de abrirlo, este enlace completa el emparejamiento sin volver a vincularlo en futuras actualizaciones.</p>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN IMPRESORAS ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-slate-600" />
            <h3 className="font-semibold text-sm">Impresoras POS</h3>
            <span className="text-xs text-muted-foreground ml-1">— cable, red o Bluetooth</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openAddPrinter}>
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        </div>

        {draft.printers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Printer className="h-8 w-8 opacity-20" />
            <p>No hay impresoras configuradas.</p>
            <p className="text-xs">Agrega una impresora y asígnala a la zona correspondiente.</p>
          </div>
        ) : (
          <div className="divide-y">
            {draft.printers.map(printer => (
               <div key={printer.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0">
                  <PrinterTypeIcon type={printer.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{printer.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex-shrink-0">
                      {PRINTER_TYPE_LABELS[printer.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Zona: <span className="text-foreground font-medium">{PRINTER_ZONE_LABELS[printer.zone]}</span>
                    </span>
                    {printer.type === "network" && printer.ip && (
                      <span className="text-xs text-blue-600 font-mono">{printer.ip}:{printer.port || 9100}</span>
                    )}
                    {printer.type !== "network" && printer.deviceId && (
                      <span className="text-xs text-indigo-600">Dispositivo local: {printer.deviceId}</span>
                    )}
                     <span className="text-xs text-muted-foreground">
                       {printer.paperWidth || "80mm"} · letra {printer.fontSize || "normal"} · margen {printer.marginMm ?? 4} mm
                     </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => printTest(printer)} title="Imprimir prueba">
                     <Printer className="h-3.5 w-3.5 text-primary" />
                   </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPrinter(printer)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deletePrinter(printer.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FORMATOS DE IMPRESIÓN ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* FACTURAS Y POS */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-sm">Facturas de Venta (POS)</h3>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewType("receipt")}>
              <Eye className="h-3 w-3" /> Vista Previa
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Encabezado</Label>
              <Textarea
                value={draft.receipt_header}
                onChange={(e) => set("receipt_header", e.target.value)}
                placeholder="Régimen, resolución DIAN, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Pie de página</Label>
              <Textarea
                value={draft.receipt_footer}
                onChange={(e) => set("receipt_footer", e.target.value)}
                placeholder="Mensaje de agradecimiento, propina sugerida..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Type className="h-3 w-3" /> Tamaño de Letra
              </Label>
               <FontSizePicker value={draft.receipt_font_size} onChange={(v) => setFormatFont("receipt_font_size", "receipt", v)} />
               <p className="text-[11px] text-muted-foreground">Se usa como valor predeterminado y actualiza las impresoras asignadas a Facturas POS.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/10">
                <Label className="text-sm cursor-pointer" htmlFor="show_logo">Imprimir Logo</Label>
                <Switch id="show_logo" checked={draft.receipt_show_logo} onCheckedChange={(v) => set("receipt_show_logo", v)} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/10">
                <Label className="text-sm cursor-pointer" htmlFor="show_client">Datos del Cliente</Label>
                <Switch id="show_client" checked={draft.receipt_show_customer} onCheckedChange={(v) => set("receipt_show_customer", v)} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* COMANDAS */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Comandas (Cocina)</h3>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewType("kitchen")}>
                <Eye className="h-3 w-3" /> Vista Previa
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Type className="h-3 w-3" /> Tamaño de Letra
                </Label>
                 <FontSizePicker value={draft.kitchen_font_size} onChange={(v) => setFormatFont("kitchen_font_size", "kitchen", v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/10">
                  <Label className="text-sm cursor-pointer" htmlFor="show_notes">Mostrar Notas</Label>
                  <Switch id="show_notes" checked={draft.kitchen_show_notes} onCheckedChange={(v) => set("kitchen_show_notes", v)} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/10">
                  <Label className="text-sm cursor-pointer" htmlFor="show_server">Nombre Mesero</Label>
                  <Switch id="show_server" checked={draft.kitchen_show_server} onCheckedChange={(v) => set("kitchen_show_server", v)} />
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3 bg-orange-50 border-orange-200">
                <div className="flex-1 min-w-0 mr-3">
                  <Label className="text-sm cursor-pointer font-medium" htmlFor="kitchen_auto_print">Auto-impresión al ingresar pedido</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Imprime la comanda automáticamente al crear un pedido en Mesas, POS o Domicilios.</p>
                </div>
                <Switch id="kitchen_auto_print" checked={draft.kitchen_auto_print} onCheckedChange={(v) => set("kitchen_auto_print", v)} />
              </div>
              {draft.kitchen_auto_print && (() => {
                const STATION_ZONES = PRINT_ZONES
                  .filter(zone => zone.startsWith("kitchen"))
                  .map(zone => ({
                    zone,
                    label: PRINT_ZONE_LABELS[zone].replace("Comanda – ", ""),
                  }));
                let selectedZones: string[] = ["kitchen"];
                try { selectedZones = JSON.parse(draft.kitchen_auto_print_stations) as string[]; } catch { /* ignore */ }
                const toggleZone = (zone: string) => {
                  const next = selectedZones.includes(zone)
                    ? selectedZones.filter(z => z !== zone)
                    : [...selectedZones, zone];
                  set("kitchen_auto_print_stations", JSON.stringify(next.length > 0 ? next : ["kitchen"]));
                };
                return (
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-orange-700">Estaciones a imprimir</p>
                    <div className="flex flex-wrap gap-2">
                      {STATION_ZONES.map(({ zone, label }) => {
                        const active = selectedZones.includes(zone);
                        return (
                          <button
                            key={zone}
                            type="button"
                            onClick={() => toggleZone(zone)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                              active
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-white border-orange-200 text-orange-600 hover:bg-orange-50"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Requiere impresora de red configurada en zona correspondiente. Sin impresora, se usa impresión por navegador como respaldo.</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* INVENTARIO */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm">Comprobantes de Inventario</h3>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewType("inventory")}>
                <Eye className="h-3 w-3" /> Vista Previa
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Encabezado</Label>
                <Input
                  value={draft.inventory_header}
                  onChange={(e) => set("inventory_header", e.target.value)}
                  placeholder="Ej. COMPROBANTE DE TRASLADO"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Firmas / Pie de página</Label>
                <Textarea
                  value={draft.inventory_footer}
                  onChange={(e) => set("inventory_footer", e.target.value)}
                  placeholder="Entregó: {usuario}&#10;Recibió: {recibe}"
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground">
                  Variables: <code>{`{usuario}`}</code> quien hace el movimiento · <code>{`{recibe}`}</code> empleado receptor.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Type className="h-3 w-3" /> Tamaño de Letra
                </Label>
                 <FontSizePicker value={draft.inventory_font_size} onChange={(v) => setFormatFont("inventory_font_size", "inventory", v)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 pt-4 border-t">
        <Button onClick={() => saveSettings.mutate(draft)} disabled={saveSettings.isPending} className="gap-2 min-w-[180px]">
          {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Formatos
        </Button>
      </div>

      {/* ── DIALOG IMPRESORA ─────────────────────────────────────────────── */}
      <Dialog open={printerDialog.open} onOpenChange={(open) => !open && setPrinterDialog({ open: false, editing: null })}>
        <DialogContent className="grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
          <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
            <DialogTitle>{printerDialog.editing ? "Editar Impresora" : "Agregar Impresora"}</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 grid-cols-1 gap-4 overflow-y-auto px-4 py-4 sm:px-6 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Nombre / Descripción</Label>
              <Input
                value={printerForm.name}
                onChange={e => setPrinterForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Caja Principal, Cocina Norte..."
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Tipo de Conexión</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["usb", "network", "bluetooth"] as PrinterType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPrinterForm(p => ({ ...p, type: t }))}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border py-3 text-xs transition-colors ${
                      printerForm.type === t
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {t === "usb"       && <Cable     className="h-4 w-4" />}
                    {t === "network"   && <Network   className="h-4 w-4" />}
                    {t === "bluetooth" && <Bluetooth className="h-4 w-4" />}
                    {PRINTER_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {printerForm.type === "network" && (
              <div className="grid min-w-0 grid-cols-1 gap-3 md:col-span-2 sm:grid-cols-[minmax(0,2fr)_minmax(120px,1fr)]">
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Dirección IP</Label>
                  <Input
                    value={printerForm.ip || ""}
                    onChange={e => setPrinterForm(p => ({ ...p, ip: e.target.value }))}
                    placeholder="192.168.1.100"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Puerto</Label>
                  <Input
                    type="number"
                    value={printerForm.port || 9100}
                    onChange={e => setPrinterForm(p => ({ ...p, port: Number(e.target.value) }))}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {(printerForm.type === "usb" || printerForm.type === "bluetooth") && (
              <div className="min-w-0 space-y-2 rounded-lg border bg-muted/20 p-3 md:col-span-2">
                <Label className="text-xs">Dispositivo del equipo</Label>
                {(() => {
                  const compatibleDevices = discoveredDevices.filter(device => {
                    const connection = device.connection?.toLowerCase() ?? "unknown";
                    return connection === "unknown" ||
                      connection === printerForm.type ||
                      (printerForm.type === "usb" && ["cable", "wired"].includes(connection));
                  });
                  return compatibleDevices.length > 0 ? (
                    <>
                      <select
                        value={printerForm.deviceId || ""}
                        onChange={e => {
                          const device = compatibleDevices.find(item => item.id === e.target.value);
                          setPrinterForm(p => ({
                            ...p,
                            deviceId: device?.id || "",
                            deviceName: device?.name || "",
                            agentId: device?.agentId,
                            name: !p.name.trim() && device ? device.name : p.name,
                          }));
                        }}
                        className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        aria-label="Seleccionar dispositivo descubierto"
                      >
                        <option value="">Selecciona un dispositivo</option>
                        {compatibleDevices.map(device => <option key={`${device.agentId}-${device.id}`} value={device.id}>{device.name} · {device.agentName}</option>)}
                      </select>
                      <p className="text-[11px] text-muted-foreground">El dispositivo se guarda con el agente local seleccionado.</p>
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      {printerForm.type === "bluetooth" ? <Bluetooth className="h-4 w-4 flex-shrink-0" /> : <Cable className="h-4 w-4 flex-shrink-0" />}
                      <span>No hay dispositivos {printerForm.type === "usb" ? "USB" : "Bluetooth"} disponibles. Puedes guardar el perfil manualmente y seleccionar el dispositivo cuando el agente esté conectado.</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="min-w-0 space-y-1.5 md:col-span-2">
              <Label className="text-xs">Zona de Impresión</Label>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4">
                {(Object.keys(PRINTER_ZONE_LABELS) as PrinterZone[]).map(z => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setPrinterForm(p => ({ ...p, zone: z }))}
                    className={`min-w-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-colors ${
                      printerForm.zone === z
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {z === "receipt"         && <ScrollText className="h-3.5 w-3.5 flex-shrink-0" />}
                    {z.startsWith("kitchen") && <ChefHat    className="h-3.5 w-3.5 flex-shrink-0" />}
                    {z === "inventory"       && <Boxes      className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span className="min-w-0 break-words">{PRINTER_ZONE_LABELS[z]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-3 border-t pt-4 md:col-span-2">
              <div>
                <Label className="text-xs">Formato físico</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Estos valores se envían al ticket ESC/POS y se usan en el respaldo del navegador.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Ancho del papel</Label>
                  <select
                    value={printerForm.paperWidth}
                    onChange={e => setPrinterForm(p => ({ ...p, paperWidth: e.target.value as PrintPaperWidth }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="58mm">58 mm</option>
                    <option value="80mm">80 mm</option>
                  </select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Tamaño de letra</Label>
                  <select
                    value={printerForm.fontSize}
                    onChange={e => setPrinterForm(p => ({ ...p, fontSize: e.target.value as FontSize }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="small">Pequeño</option>
                    <option value="normal">Normal</option>
                    <option value="large">Grande</option>
                  </select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Interlineado</Label>
                  <select
                    value={printerForm.lineSpacing}
                    onChange={e => setPrinterForm(p => ({ ...p, lineSpacing: e.target.value as PrintLineSpacing }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="tight">Compacto</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Amplio</option>
                  </select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Márgenes (mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    step={1}
                    value={printerForm.marginMm}
                    onChange={e => setPrinterForm(p => ({ ...p, marginMm: Math.min(12, Math.max(0, Number(e.target.value) || 0)) }))}
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Densidad</Label>
                  <select
                    value={printerForm.density}
                    onChange={e => setPrinterForm(p => ({ ...p, density: e.target.value as PrintDensity }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="light">Clara</option>
                    <option value="normal">Normal</option>
                    <option value="dark">Oscura</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <Label className="text-xs cursor-pointer" htmlFor="printer-auto-cut">Corte automático</Label>
                  <Switch
                    id="printer-auto-cut"
                    checked={printerForm.autoCut}
                    onCheckedChange={v => setPrinterForm(p => ({ ...p, autoCut: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t bg-background px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setPrinterDialog({ open: false, editing: null })}>Cancelar</Button>
            <Button onClick={savePrinter} disabled={!printerForm.name.trim()}>
              {printerDialog.editing ? "Guardar Cambios" : "Agregar Impresora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL VISTA PREVIA DINÁMICO ──────────────────────────────────── */}
      <Dialog open={!!previewType} onOpenChange={(open) => !open && setPreviewType(null)}>
        <DialogContent className="sm:max-w-[380px] bg-white text-black p-0 border-0 rounded-none overflow-hidden">
          <div className="bg-[#f0f0f0] p-4 h-[500px] flex items-start justify-center overflow-y-auto">
            <div
              className="bg-white shadow-sm font-mono flex flex-col items-center relative"
              style={{
                width: `${printWidthPx(normalizePrintProfile(
                  draft.printers.find(p => p.zone === (previewType === "receipt" ? "receipt" : previewType === "inventory" ? "inventory" : "kitchen")) ?? {},
                  previewType === "receipt" ? draft.receipt_font_size : previewType === "kitchen" ? draft.kitchen_font_size : draft.inventory_font_size,
                ).paperWidth)}px`,
                fontSize: `${FONT_SIZE_PX[normalizePrintProfile(
                  draft.printers.find(p => p.zone === (previewType === "receipt" ? "receipt" : previewType === "inventory" ? "inventory" : "kitchen")) ?? {},
                  previewType === "receipt" ? draft.receipt_font_size : previewType === "kitchen" ? draft.kitchen_font_size : draft.inventory_font_size,
                ).fontSize]}px`,
                lineHeight: printLineHeight(normalizePrintProfile(
                  draft.printers.find(p => p.zone === (previewType === "receipt" ? "receipt" : previewType === "inventory" ? "inventory" : "kitchen")) ?? {},
                  previewType === "receipt" ? draft.receipt_font_size : previewType === "kitchen" ? draft.kitchen_font_size : draft.inventory_font_size,
                ).lineSpacing),
                padding: `${normalizePrintProfile(
                  draft.printers.find(p => p.zone === (previewType === "receipt" ? "receipt" : previewType === "inventory" ? "inventory" : "kitchen")) ?? {},
                  previewType === "receipt" ? draft.receipt_font_size : previewType === "kitchen" ? draft.kitchen_font_size : draft.inventory_font_size,
                ).marginMm}px`,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwb2x5Z29uIHBvaW50cz0iMCwwIDQsNCA4LDAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')]"></div>

              {/* === FACTURA POS === */}
              {previewType === "receipt" && (
                <>
                  {draft.receipt_show_logo && globalSettings?.company_logo && (
                    <img src={globalSettings.company_logo} alt="Logo" className="w-16 h-16 object-contain mb-3 grayscale contrast-125" />
                  )}
                  <div className="text-center font-bold mb-1" style={{ fontSize: `calc(${fontSizePx(draft.receipt_font_size)} + 2px)` }}>
                    {globalSettings?.company_name || "MI EMPRESA"}
                  </div>
                  {draft.receipt_header && <div className="text-center whitespace-pre-wrap mb-4 w-full">{draft.receipt_header}</div>}
                  <div className="w-full border-t border-dashed border-black/40 my-2"></div>
                  <div className="w-full text-left space-y-1 mb-2">
                    <div>Fecha: {new Date().toLocaleString()}</div>
                    <div>Recibo: #R-MOCK123</div>
                    <div>Atiende: Tu Usuario (Admin)</div>
                    {draft.receipt_show_customer && (
                      <div className="mt-1">
                        <div>Cliente: Juan Pérez</div>
                        <div>C.C/NIT: 123456789</div>
                      </div>
                    )}
                  </div>
                  <div className="w-full border-t border-dashed border-black/40 my-2"></div>
                  <table className="w-full text-left mb-2">
                    <thead>
                      <tr className="border-b border-black/20">
                        <th className="pb-1 font-normal w-full">Cant x Artículo</th>
                        <th className="pb-1 font-normal text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="py-1">2 x Hamburguesa Clásica</td><td className="py-1 text-right">{formatCurrency(30000)}</td></tr>
                      <tr><td className="py-1">1 x Gaseosa</td><td className="py-1 text-right">{formatCurrency(5000)}</td></tr>
                    </tbody>
                  </table>
                  <div className="w-full border-t border-dashed border-black/40 my-2"></div>
                  <div className="w-full flex justify-between font-bold mb-4">
                    <span>TOTAL:</span><span>{formatCurrency(35000)}</span>
                  </div>
                  {draft.receipt_footer && <div className="text-center whitespace-pre-wrap w-full mt-2">{draft.receipt_footer}</div>}
                </>
              )}

              {/* === COMANDA COCINA === */}
              {previewType === "kitchen" && (
                <>
                  <div className="text-center font-bold mb-2" style={{ fontSize: `calc(${fontSizePx(draft.kitchen_font_size)} + 3px)` }}>COMANDA</div>
                  <div className="w-full text-left space-y-1 mb-2">
                    <div className="font-bold border-b border-black pb-1 mb-1" style={{ fontSize: `calc(${fontSizePx(draft.kitchen_font_size)} + 4px)` }}>Mesa: 5</div>
                    <div>Fecha: {new Date().toLocaleTimeString()}</div>
                    {draft.kitchen_show_server && <div>Atiende: Tu Usuario (Admin)</div>}
                  </div>
                  <div className="w-full border-t border-dashed border-black/40 my-2"></div>
                  <div className="w-full text-left font-bold space-y-3">
                    <div>
                      <div>2 x Hamburguesa Clásica</div>
                      {draft.kitchen_show_notes && (
                        <div className="font-normal ml-4 italic" style={{ fontSize: `calc(${fontSizePx(draft.kitchen_font_size)} - 1px)` }}>- Sin cebolla</div>
                      )}
                    </div>
                    <div><div>1 x Gaseosa</div></div>
                  </div>
                  <div className="w-full border-t border-dashed border-black/40 my-4"></div>
                </>
              )}

              {/* === COMPROBANTE INVENTARIO === */}
              {previewType === "inventory" && (
                <>
                  <div className="text-center font-bold mb-4 w-full whitespace-pre-wrap">
                    {draft.inventory_header || "COMPROBANTE DE INVENTARIO"}
                  </div>
                  <div className="w-full text-left space-y-1 mb-2">
                    <div>Fecha: {new Date().toLocaleString()}</div>
                    <div>Tipo: ENTRADA BODEGA</div>
                  </div>
                  <div className="w-full border-t border-dashed border-black/40 my-2"></div>
                  <table className="w-full text-left mb-4">
                    <thead>
                      <tr className="border-b border-black/20">
                        <th className="pb-1 font-normal w-full">Producto/Ingrediente</th>
                        <th className="pb-1 font-normal text-right">Cant</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="py-1">Tomate Chonto</td><td className="py-1 text-right">5000 g</td></tr>
                      <tr><td className="py-1">Cebolla Blanca</td><td className="py-1 text-right">2000 g</td></tr>
                    </tbody>
                  </table>
                  <div className="w-full border-t border-dashed border-black/40 my-2"></div>
                  <div className="mt-8 w-full text-left whitespace-pre-wrap">
                    {draft.inventory_footer
                      ? draft.inventory_footer
                          .replace("{usuario}", "Tu Usuario (Admin)")
                          .replace("{recibe}", "Firma del empleado (Aprobado por PIN)")
                      : "Entregó: Tu Usuario (Admin)\nRecibió: Firma del empleado (Aprobado por PIN)"}
                  </div>
                </>
              )}

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwb2x5Z29uIHBvaW50cz0iMCw0IDQsMCA4LDQiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')]"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Integraciones Tab ─────────────────────────────────────────────────────────

type GmailFilterCategory = "payment_received" | "payment_sent" | "invoice" | "other";
interface GmailFilter { id: string; label: string; query: string; category: GmailFilterCategory; enabled: boolean; }

const FILTER_CATEGORY_LABELS: Record<GmailFilterCategory, string> = {
  payment_received: "Recibido",
  payment_sent: "Enviado",
  invoice: "Factura",
  other: "Otro",
};

const FILTER_CATEGORY_COLORS: Record<GmailFilterCategory, string> = {
  payment_received: "bg-green-100 text-green-800 border-green-200",
  payment_sent: "bg-red-100 text-red-800 border-red-200",
  invoice: "bg-blue-100 text-blue-800 border-blue-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

function IntegracionesTab() {
  const { toast } = useToast();
  const { isAdminOrManager } = useRole();
  const isAdmin = isAdminOrManager;

  const queryClient = useQueryClient();

  // Gmail status
  const { data: gmailStatus, refetch: refetchGmailStatus } = useQuery<{ connected: boolean; configured: boolean; email?: string }>({
    queryKey: ["gmail-status"],
    queryFn: () => fetch("/api/payment-receipts/gmail/status").then((r) => r.json()),
    refetchOnWindowFocus: true,
  });

  // Bancolombia custom email
  const { data: bancoData, refetch: refetchBancoEmail } = useQuery<{ email: string | null }>({
    queryKey: ["bancolombia-email"],
    queryFn: () => fetch("/api/payment-receipts/gmail/bancolombia-email").then((r) => r.json()),
  });
  const [bancoEmailInput, setBancoEmailInput] = useState("");
  const [savingBancoEmail, setSavingBancoEmail] = useState(false);
  useEffect(() => { if (bancoData?.email) setBancoEmailInput(bancoData.email); }, [bancoData?.email]);
  const handleSaveBancoEmail = async () => {
    setSavingBancoEmail(true);
    try {
      const res = await fetch("/api/payment-receipts/gmail/bancolombia-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: bancoEmailInput }),
      });
      if (res.ok) {
        toast({ title: "Correo de Bancolombia guardado" });
        refetchBancoEmail();
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSavingBancoEmail(false);
    }
  };

  // SMS-forward email (second sender — forwarded bank SMS)
  const { data: smsForwardData, refetch: refetchSmsForwardEmail } = useQuery<{ email: string | null }>({
    queryKey: ["sms-forward-email"],
    queryFn: () => fetch("/api/payment-receipts/gmail/sms-forward-email").then((r) => r.json()),
  });
  const [smsForwardEmailInput, setSmsForwardEmailInput] = useState("");
  const [savingSmsForwardEmail, setSavingSmsForwardEmail] = useState(false);
  useEffect(() => { if (smsForwardData?.email) setSmsForwardEmailInput(smsForwardData.email); }, [smsForwardData?.email]);
  const handleSaveSmsForwardEmail = async () => {
    setSavingSmsForwardEmail(true);
    try {
      const res = await fetch("/api/payment-receipts/gmail/sms-forward-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: smsForwardEmailInput }),
      });
      if (res.ok) {
        toast({ title: "Correo de reenvío guardado" });
        refetchSmsForwardEmail();
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSavingSmsForwardEmail(false);
    }
  };

  // Gmail filters
  const { data: gmailFilters = [], refetch: refetchFilters } = useQuery<GmailFilter[]>({
    queryKey: ["gmail-filters"],
    queryFn: () => fetch("/api/payment-receipts/gmail/filters").then((r) => r.json()),
    enabled: !!gmailStatus?.configured,
  });
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [filterLabel, setFilterLabel] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<GmailFilterCategory>("payment_received");
  const [addingFilter, setAddingFilter] = useState(false);
  const [togglingFilterId, setTogglingFilterId] = useState<string | null>(null);
  const [deletingFilterId, setDeletingFilterId] = useState<string | null>(null);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);

  const resetFilterForm = () => {
    setFilterLabel(""); setFilterQuery(""); setFilterCategory("payment_received");
    setEditingFilterId(null); setShowFilterForm(false);
  };

  const handleEditClick = (f: GmailFilter) => {
    setFilterLabel(f.label ?? "");
    setFilterQuery(f.query ?? "");
    setFilterCategory(f.category);
    setEditingFilterId(f.id);
    setShowFilterForm(true);
  };

  const handleSaveFilter = async () => {
    if (!(filterLabel ?? "").trim() || !(filterQuery ?? "").trim()) return;
    setAddingFilter(true);
    try {
      const isEditing = editingFilterId !== null;
      const url = isEditing
        ? `/api/payment-receipts/gmail/filters/${editingFilterId}`
        : "/api/payment-receipts/gmail/filters";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: (filterLabel ?? "").trim(), query: (filterQuery ?? "").trim(), category: filterCategory }),
      });
      if (res.ok) {
        refetchFilters();
        resetFilterForm();
        toast({ title: isEditing ? "Filtro actualizado" : "Filtro agregado" });
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? (isEditing ? "Error al actualizar" : "Error al agregar"), variant: "destructive" });
      }
    } catch { toast({ title: "Error de conexión", variant: "destructive" }); }
    finally { setAddingFilter(false); }
  };

  const handleToggleFilter = async (f: GmailFilter) => {
    setTogglingFilterId(f.id);
    try {
      const res = await fetch(`/api/payment-receipts/gmail/filters/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !f.enabled }),
      });
      if (res.ok) {
        refetchFilters();
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Error al actualizar", variant: "destructive" });
      }
    } catch { toast({ title: "Error al actualizar", variant: "destructive" }); }
    finally { setTogglingFilterId(null); }
  };

  const handleDeleteFilter = async (id: string) => {
    setDeletingFilterId(id);
    try {
      const res = await fetch(`/api/payment-receipts/gmail/filters/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        refetchFilters();
        toast({ title: "Filtro eliminado" });
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Error al eliminar", variant: "destructive" });
      }
    } catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
    finally { setDeletingFilterId(null); }
  };


  // Disconnect Gmail
  const [disconnecting, setDisconnecting] = useState(false);
  const handleDisconnectGmail = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/payment-receipts/gmail/connection", { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Gmail desvinculado correctamente" });
        queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Error al desconectar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  // Connect Gmail
  const handleConnectGmail = async () => {
    try {
      const res = await fetch("/api/payment-receipts/gmail/auth-url");
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: data.error ?? "No se pudo obtener la URL de autorización", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    }
  };

  // Check for ?gmail=connected in URL on mount
  const checkedRef = useRef(false);
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      toast({ title: "Gmail conectado correctamente" });
      refetchGmailStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("gmail") === "error") {
      toast({ title: "No se pudo conectar Gmail", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gmail card */}
        <Card className="border">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 shrink-0">
                  <Mail className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Correo electrónico</p>
                  <p className="text-xs text-muted-foreground">
                    {!gmailStatus?.configured
                      ? "Sin configurar (falta GOOGLE_CLIENT_ID)"
                      : gmailStatus.connected
                      ? "Sincroniza automáticamente"
                      : "No conectado"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {gmailStatus?.configured && !gmailStatus.connected && (
                  <Button size="sm" onClick={handleConnectGmail}>
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Conectar
                  </Button>
                )}
                {gmailStatus?.connected && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDisconnectGmail}
                    disabled={disconnecting}
                  >
                    {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Desconectar"}
                  </Button>
                )}
              </div>
            </div>

            {/* Connected account pill */}
            {gmailStatus?.connected && gmailStatus.email && (
              <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-300 truncate">{gmailStatus.email}</p>
                  <p className="text-[11px] text-green-700 dark:text-green-400 mt-0.5">
                    Asegúrate de que a este correo lleguen las notificaciones de tu banco (Bancolombia, Nequi, Daviplata…). Si no es así, desconecta y vuelve a conectar con el correo correcto.
                  </p>
                </div>
              </div>
            )}

            {/* Not-connected helper */}
            {gmailStatus?.configured && !gmailStatus?.connected && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Conecta el correo donde recibes las notificaciones de pago de tu banco. Puede ser tu correo personal o el del negocio — lo que uses para Bancolombia, Nequi o Daviplata.
                </p>
              </div>
            )}

            {/* Sender email filters */}
            {isAdmin && (
              <div className="border-t pt-3 space-y-3">
                {/* Bancolombia sender */}
                <div>
                  <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center rounded-full h-4 w-4 text-[9px] font-bold bg-yellow-400 text-yellow-900">B</span>
                    Email de notificaciones del banco
                  </p>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="avisos@notificaciones.bancolombia.com"
                      value={bancoEmailInput}
                      onChange={(e) => setBancoEmailInput(e.target.value)}
                    />
                    <Button size="sm" className="h-8 shrink-0" onClick={handleSaveBancoEmail} disabled={savingBancoEmail || !bancoEmailInput}>
                      {savingBancoEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    El correo exacto desde donde tu banco envía las alertas
                  </p>
                </div>

                {/* SMS-forward sender */}
                <div>
                  <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-green-600" />
                    Correo de reenvío de SMS
                  </p>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="sms@tudominio.com"
                      value={smsForwardEmailInput}
                      onChange={(e) => setSmsForwardEmailInput(e.target.value)}
                    />
                    <Button size="sm" className="h-8 shrink-0" onClick={handleSaveSmsForwardEmail} disabled={savingSmsForwardEmail || !smsForwardEmailInput}>
                      {savingSmsForwardEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    El correo desde el que tu app de reenvío envía los SMS del banco
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Gmail Filters Panel */}
      {isAdmin && gmailStatus?.configured && (
        <Card className="border">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Filtros de correo</p>
                <span className="text-xs text-muted-foreground">— controla qué correos se sincronizan</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://support.google.com/mail/answer/7190"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  ¿Cómo escribir una consulta?
                </a>
                {!showFilterForm && (
                  <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setShowFilterForm(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar filtro
                  </Button>
                )}
              </div>
            </div>

            {/* Add / Edit filter form */}
            {showFilterForm && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {editingFilterId ? "Editar filtro" : "Nuevo filtro"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ej: Nequi, Proveedor Juan"
                      value={filterLabel}
                      onChange={(e) => setFilterLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      Consulta Gmail
                      <a href="https://support.google.com/mail/answer/7190" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[10px]">(ayuda)</a>
                    </Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      placeholder='from:nequi.com.co  o  subject:factura'
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoría</Label>
                  <select
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as GmailFilterCategory)}
                  >
                    <option value="payment_received">Pago recibido</option>
                    <option value="payment_sent">Pago a proveedor</option>
                    <option value="invoice">Factura</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 gap-1" onClick={handleSaveFilter} disabled={addingFilter || !(filterLabel ?? "").trim() || !(filterQuery ?? "").trim()}>
                    {addingFilter
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : editingFilterId
                        ? <Pencil className="h-3.5 w-3.5" />
                        : <Plus className="h-3.5 w-3.5" />
                    }
                    {editingFilterId ? "Guardar cambios" : "Agregar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={resetFilterForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Filter list */}
            {gmailFilters.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Sin filtros configurados — se usarán los predeterminados (Nequi, Bancolombia, etc.)</p>
            ) : (
              <div className="divide-y rounded-lg border overflow-hidden">
                {gmailFilters.map((f) => (
                  <div key={f.id} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${f.enabled ? "bg-background" : "bg-muted/40 opacity-60"}`}>
                    <button
                      onClick={() => handleToggleFilter(f)}
                      disabled={togglingFilterId === f.id}
                      className="shrink-0 focus:outline-none"
                      title={f.enabled ? "Deshabilitar filtro" : "Habilitar filtro"}
                    >
                      {togglingFilterId === f.id
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        : <div className={`h-4 w-4 rounded-full border-2 transition-colors ${f.enabled ? "bg-emerald-500 border-emerald-500" : "bg-muted border-muted-foreground/30"}`} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{f.label}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${FILTER_CATEGORY_COLORS[f.category] ?? "bg-muted text-muted-foreground"}`}>
                          {FILTER_CATEGORY_LABELS[f.category] ?? f.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">{f.query}</p>
                    </div>
                    <button
                      onClick={() => handleEditClick(f)}
                      disabled={editingFilterId === f.id}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar filtro"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFilter(f.id)}
                      disabled={deletingFilterId === f.id}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar filtro"
                    >
                      {deletingFilterId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────

// ── KDS Tab ───────────────────────────────────────────────────────────────────

type KdsItemStatus = "new" | "preparing" | "ready" | "delivered";
const KDS_VALID_STATUSES: KdsItemStatus[] = ["new", "preparing", "ready", "delivered"];
const KDS_STATUS_LABELS: Record<KdsItemStatus, string> = {
  new: "Nueva",
  preparing: "En proceso",
  ready: "Lista",
  delivered: "Entregada",
};
type KdsColumnState = { enabled: boolean; emoji: string; label: string };
type KdsStationDraft = {
  id: string;
  name: string;
  emoji: string;
  filter: string;
  columns: Record<KdsItemStatus, KdsColumnState>;
};
type KdsConfigDraft = { stations: KdsStationDraft[] };

const KDS_DEFAULT_COLUMN_STATES: Record<KdsItemStatus, KdsColumnState> = {
  new:       { enabled: false, emoji: "⚖️", label: "Nueva" },
  preparing: { enabled: false, emoji: "🔥", label: "En proceso" },
  ready:     { enabled: false, emoji: "✅", label: "Lista" },
  delivered: { enabled: false, emoji: "🔔", label: "Entregada" },
};

const KDS_DEFAULT_CONFIG_DRAFT: KdsConfigDraft = {
  stations: [
    {
      id: "hot-kitchen", name: "Cocina Caliente", emoji: "🍖", filter: "",
      columns: {
        new:       { enabled: true,  emoji: "⚖️", label: "Pesaje / Alistamiento" },
        preparing: { enabled: true,  emoji: "🔥", label: "Parrilla / Cocción" },
        ready:     { enabled: true,  emoji: "🥗", label: "Emplatado / Ensamblaje" },
        delivered: { enabled: true,  emoji: "🔔", label: "Despacho / Pase" },
      },
    },
    {
      id: "bar", name: "Barra", emoji: "🍹", filter: "bar,dessert",
      columns: {
        new:       { enabled: true,  emoji: "📋", label: "Bebidas Pendientes" },
        preparing: { enabled: false, emoji: "🔥", label: "En proceso" },
        ready:     { enabled: true,  emoji: "✅", label: "Listas para Entrega" },
        delivered: { enabled: false, emoji: "🔔", label: "Entregada" },
      },
    },
  ],
};

function kdsGenId() { return Math.random().toString(36).slice(2, 9); }

function kdsParseConfigDraft(configRaw: string | undefined, stagesRaw: string | undefined): KdsConfigDraft {
  if (configRaw) {
    try {
      const p = JSON.parse(configRaw);
      if (p?.stations?.length > 0) {
        return {
          stations: p.stations.map((s: any) => ({
            id: s.id || kdsGenId(),
            name: s.name || "",
            emoji: s.emoji || "",
            filter: Array.isArray(s.filter) ? s.filter.join(",") : (s.filter || ""),
            columns: KDS_VALID_STATUSES.reduce((acc, st) => {
              const col = (s.columns || []).find((c: any) => c.status === st);
              acc[st] = col ? { enabled: true, emoji: col.emoji || "", label: col.label || "" } : { ...KDS_DEFAULT_COLUMN_STATES[st] };
              return acc;
            }, {} as Record<KdsItemStatus, KdsColumnState>),
          })),
        };
      }
    } catch { /* ignore */ }
  }
  if (stagesRaw) {
    try {
      const legacy = JSON.parse(stagesRaw);
      const stations: KdsStationDraft[] = [];
      if (Array.isArray(legacy.hot_kitchen)) {
        const d: KdsStationDraft = {
          id: "hot-kitchen", name: "Cocina Caliente", emoji: "🍖", filter: "",
          columns: { new: { ...KDS_DEFAULT_COLUMN_STATES.new }, preparing: { ...KDS_DEFAULT_COLUMN_STATES.preparing }, ready: { ...KDS_DEFAULT_COLUMN_STATES.ready }, delivered: { ...KDS_DEFAULT_COLUMN_STATES.delivered } },
        };
        for (const s of legacy.hot_kitchen) {
          const st = s.status as KdsItemStatus;
          if (KDS_VALID_STATUSES.includes(st)) d.columns[st] = { enabled: true, emoji: s.emoji || "", label: s.label || "" };
        }
        stations.push(d);
      }
      if (Array.isArray(legacy.bar)) {
        const d: KdsStationDraft = {
          id: "bar", name: "Barra", emoji: "🍹", filter: "bar,dessert",
          columns: { new: { ...KDS_DEFAULT_COLUMN_STATES.new }, preparing: { ...KDS_DEFAULT_COLUMN_STATES.preparing }, ready: { ...KDS_DEFAULT_COLUMN_STATES.ready }, delivered: { ...KDS_DEFAULT_COLUMN_STATES.delivered } },
        };
        for (const s of legacy.bar) {
          const st = (s.status === "pending" ? "new" : s.status === "done" ? "ready" : s.status) as KdsItemStatus;
          if (KDS_VALID_STATUSES.includes(st)) d.columns[st] = { enabled: true, emoji: s.emoji || "", label: s.label || "" };
        }
        stations.push(d);
      }
      if (stations.length > 0) return { stations };
    } catch { /* ignore */ }
  }
  return KDS_DEFAULT_CONFIG_DRAFT;
}

function kdsDraftToConfig(draft: KdsConfigDraft) {
  return {
    stations: draft.stations.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      filter: s.filter.split(",").map((f: string) => f.trim()).filter(Boolean),
      columns: KDS_VALID_STATUSES
        .filter((st) => s.columns[st].enabled)
        .map((st) => ({ status: st, emoji: s.columns[st].emoji, label: s.columns[st].label })),
    })),
  };
}

function KdsSortableItem({ id, children }: { id: string; children: (dragHandleProps: object) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

const KDS_EMOJIS = ["🍳","🔥","📋","✅","🔔","⚖️","🥗","🍖","🍹","🌮","🍕","🥩","🧂","🫕","👨‍🍳","📦","🚚","⏱️","❄️","🧊","🍱","🥡","🥘","🍲","♨️","⚡","💫","🔄","🎯","✨"];

function KdsTab() {
  const { settings, saveSettings, isSaving } = useCompanySettings();
  const { toast } = useToast();
  const [draft, setDraft] = useState<KdsConfigDraft>(() => kdsParseConfigDraft(settings.kds_config, settings.kds_stages));
  const [expandedStation, setExpandedStation] = useState<string | null>(null);
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);

  const original = useMemo(
    () => kdsParseConfigDraft(settings.kds_config, settings.kds_stages),
    [settings.kds_config, settings.kds_stages],
  );
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(original);
  const hasChangesRef = useRef(false);
  hasChangesRef.current = hasChanges;

  useEffect(() => {
    if (!hasChangesRef.current) {
      setDraft(kdsParseConfigDraft(settings.kds_config, settings.kds_stages));
    }
  }, [settings.kds_config, settings.kds_stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = draft.stations.findIndex((s) => s.id === active.id);
      const newIndex = draft.stations.findIndex((s) => s.id === over.id);
      setDraft((prev) => ({ ...prev, stations: arrayMove(prev.stations, oldIndex, newIndex) }));
    }
  };

  const updateStation = (id: string, patch: Partial<Omit<KdsStationDraft, "columns">>) =>
    setDraft((prev) => ({ ...prev, stations: prev.stations.map((s) => s.id === id ? { ...s, ...patch } : s) }));

  const updateColumn = (stationId: string, status: KdsItemStatus, patch: Partial<KdsColumnState>) =>
    setDraft((prev) => ({
      ...prev,
      stations: prev.stations.map((s) =>
        s.id === stationId ? { ...s, columns: { ...s.columns, [status]: { ...s.columns[status], ...patch } } } : s
      ),
    }));

  const addStation = () => {
    const id = kdsGenId();
    const newStation: KdsStationDraft = {
      id,
      name: "Nueva Estación",
      emoji: "🍳",
      filter: "",
      columns: {
        new:       { enabled: true,  emoji: "📋", label: "Pendiente" },
        preparing: { enabled: false, emoji: "🔥", label: "En proceso" },
        ready:     { enabled: true,  emoji: "✅", label: "Lista" },
        delivered: { enabled: false, emoji: "🔔", label: "Entregada" },
      },
    };
    setDraft((prev) => ({ ...prev, stations: [...prev.stations, newStation] }));
    setExpandedStation(id);
  };

  const removeStation = (id: string) => {
    setDraft((prev) => ({ ...prev, stations: prev.stations.filter((s) => s.id !== id) }));
    if (expandedStation === id) setExpandedStation(null);
  };

  const validateDraft = (): string | null => {
    for (const s of draft.stations) {
      if (!s.name.trim()) return `Una estación no tiene nombre.`;
      const enabledCols = KDS_VALID_STATUSES.filter((st) => s.columns[st].enabled);
      if (enabledCols.length < 2) return `La estación "${s.name}" necesita al menos 2 columnas habilitadas.`;
    }
    if (draft.stations.length === 0) return "Necesitas al menos una estación.";
    return null;
  };

  const handleSave = async () => {
    const err = validateDraft();
    if (err) { toast({ title: "Configuración inválida", description: err, variant: "destructive" }); return; }
    try {
      await saveSettings({ kds_config: JSON.stringify(kdsDraftToConfig(draft)) });
      toast({ title: "Estaciones KDS guardadas", description: "Los cambios aparecerán en la pantalla del KDS." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Estaciones de cocina</p>
          <p className="text-xs text-muted-foreground">Agrega, reordena y configura columnas por estación. Arrastra para cambiar el orden.</p>
        </div>
        <Button variant="outline" size="sm" onClick={addStation} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Agregar estación
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={draft.stations.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {draft.stations.map((station) => {
              const isOpen = expandedStation === station.id;
              const enabledCols = KDS_VALID_STATUSES.filter((st) => station.columns[st].enabled);
              return (
                <KdsSortableItem key={station.id} id={station.id}>
                  {(dragHandleProps) => (
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                      {/* Header row */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
                        <button type="button" className="cursor-grab text-muted-foreground hover:text-foreground shrink-0" {...dragHandleProps}>
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <Input
                          className="w-12 text-center text-base px-1 h-8"
                          value={station.emoji}
                          onChange={(e) => updateStation(station.id, { emoji: e.target.value })}
                          placeholder="🍳"
                        />
                        <Input
                          className="flex-1 h-8 font-medium"
                          value={station.name}
                          onChange={(e) => updateStation(station.id, { name: e.target.value })}
                          placeholder="Nombre de la estación"
                        />
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {enabledCols.length} col{enabledCols.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedStation(isOpen ? null : station.id)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStation(station.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          disabled={draft.stations.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Expanded body */}
                      {isOpen && (
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                              Filtro de categorías (opcional)
                            </label>
                            <Input
                              className="h-8 text-sm"
                              value={station.filter}
                              onChange={(e) => updateStation(station.id, { filter: e.target.value })}
                              placeholder="bar,dessert (vacío = todo)"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Lista separada por comas de los valores de categoría de ítem que esta estación maneja. Deja vacío para mostrar todos.
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-2">Columnas</label>
                            <div className="space-y-2">
                              {KDS_VALID_STATUSES.map((st) => {
                                const col = station.columns[st];
                                const pickerKey = `${station.id}:${st}`;
                                const isPickerOpen = openEmojiPicker === pickerKey;
                                return (
                                  <div key={st} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${col.enabled ? "bg-muted/40" : "opacity-50"}`}>
                                    <input
                                      type="checkbox"
                                      checked={col.enabled}
                                      onChange={(e) => updateColumn(station.id, st, { enabled: e.target.checked })}
                                      className="h-4 w-4 shrink-0 accent-primary"
                                    />
                                    <span className="text-xs text-muted-foreground w-20 shrink-0">{KDS_STATUS_LABELS[st]}</span>
                                    <div className="relative shrink-0">
                                      <button
                                        type="button"
                                        disabled={!col.enabled}
                                        onClick={() => setOpenEmojiPicker(isPickerOpen ? null : pickerKey)}
                                        className="w-10 h-8 rounded-md border bg-background text-base flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                                        title="Seleccionar ícono"
                                      >
                                        {col.emoji || "⚖️"}
                                      </button>
                                      {isPickerOpen && (
                                        <div className="absolute z-50 left-0 top-9 w-52 rounded-xl border bg-popover shadow-lg p-2 grid grid-cols-6 gap-1">
                                          {KDS_EMOJIS.map((em) => (
                                            <button
                                              key={em}
                                              type="button"
                                              onClick={() => { updateColumn(station.id, st, { emoji: em }); setOpenEmojiPicker(null); }}
                                              className="h-8 w-8 rounded-lg text-base flex items-center justify-center hover:bg-muted transition-colors"
                                            >
                                              {em}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <Input
                                      className="flex-1 h-8"
                                      value={col.label}
                                      onChange={(e) => updateColumn(station.id, st, { label: e.target.value })}
                                      placeholder="Nombre de columna"
                                      disabled={!col.enabled}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </KdsSortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {draft.stations.length === 0 && (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          No hay estaciones configuradas. Agrega una para comenzar.
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        {hasChanges && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            Tienes cambios sin guardar
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setDraft(KDS_DEFAULT_CONFIG_DRAFT)} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Restablecer
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-2">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Turnos Tab ─────────────────────────────────────────────────────────────────
type ShiftItem = { id: number; name: string; timeFrom: string; timeTo: string; days: string | null; isActive: boolean };
type ShiftFormState = { name: string; timeFrom: string; timeTo: string; days: string | null; isActive: boolean };
const SHIFT_DAYS_LIST = [{iso:1,s:"Lu"},{iso:2,s:"Ma"},{iso:3,s:"Mi"},{iso:4,s:"Ju"},{iso:5,s:"Vi"},{iso:6,s:"Sá"},{iso:7,s:"Do"}];
const DAY_LABELS_MAP: Record<number, string> = {1:"Lu",2:"Ma",3:"Mi",4:"Ju",5:"Vi",6:"Sá",7:"Do"};

function TurnosTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: shifts = [], isLoading } = useQuery<ShiftItem[]>({
    queryKey: ["shifts"],
    queryFn: async () => { const r = await fetch("/api/shifts"); return r.ok ? r.json() : []; },
  });
  const emptyForm: ShiftFormState = { name: "", timeFrom: "08:00", timeTo: "17:00", days: null, isActive: true };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShiftFormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  const refreshShifts = () => queryClient.invalidateQueries({ queryKey: ["shifts"] });

  const saveShift = async () => {
    if (!form.name.trim() || !form.timeFrom || !form.timeTo) {
      toast({ title: "Completa nombre, hora inicio y hora fin", variant: "destructive" });
      return;
    }
    setBusy(true);
    const body = { ...form, name: form.name.trim() };
    const r = editingId
      ? await fetch(`/api/shifts/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      toast({ title: e.error ?? "Error al guardar turno", variant: "destructive" });
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    refreshShifts();
    toast({ title: editingId ? "Turno actualizado" : "Turno creado" });
  };

  const deleteShift = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar el turno "${name}"? Los productos asignados quedarán disponibles siempre.`)) return;
    setBusy(true);
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    setBusy(false);
    refreshShifts();
    toast({ title: "Turno eliminado" });
  };

  const toggleDay = (iso: number) => {
    const current = (form.days ?? "").split(",").map(Number).filter(Boolean);
    const next = current.includes(iso) ? current.filter(d => d !== iso) : [...current, iso].sort((a,b)=>a-b);
    setForm(f => ({ ...f, days: next.length ? next.join(",") : null }));
  };

  const startEdit = (s: ShiftItem) => {
    setEditingId(s.id);
    setForm({ name: s.name, timeFrom: s.timeFrom, timeTo: s.timeTo, days: s.days, isActive: s.isActive });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const formatDays = (days: string | null) =>
    days ? days.split(",").map(Number).map(d => DAY_LABELS_MAP[d] ?? String(d)).join(" · ") : "Todos los días";

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Turnos de disponibilidad</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define franjas horarias en que ciertos productos están disponibles. Productos sin turno asignado aparecen siempre.
              </p>
            </div>
            {!showForm && (
              <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Nuevo turno
              </Button>
            )}
          </div>

          {showForm && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold">{editingId ? "Editar turno" : "Nuevo turno"}</p>
              <div>
                <Label className="text-xs">Nombre del turno</Label>
                <Input
                  placeholder="Ej: Desayuno, Almuerzo, Cena, Happy Hour…"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") saveShift(); }}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Hora inicio</Label>
                  <Input type="time" value={form.timeFrom} onChange={e => setForm(f => ({ ...f, timeFrom: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Hora fin</Label>
                  <Input type="time" value={form.timeTo} onChange={e => setForm(f => ({ ...f, timeTo: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Días activos <span className="text-muted-foreground font-normal">(sin selección = todos los días)</span></Label>
                <div className="flex gap-1.5 flex-wrap">
                  {SHIFT_DAYS_LIST.map(d => {
                    const current = (form.days ?? "").split(",").map(Number).filter(Boolean);
                    const on = current.includes(d.iso);
                    return (
                      <button key={d.iso} type="button" onClick={() => toggleDay(d.iso)}
                        className={`w-9 h-9 rounded-full text-xs font-bold transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-background border text-muted-foreground hover:bg-muted"}`}>
                        {d.s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="new-shift-active" />
                <Label htmlFor="new-shift-active" className="text-sm">Turno activo</Label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveShift} disabled={busy} className="gap-1.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingId ? "Actualizar" : "Crear turno"}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelForm} disabled={busy}>Cancelar</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : shifts.length === 0 && !showForm ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin turnos configurados</p>
              <p className="text-xs mt-1">Crea un turno para controlar cuándo aparecen tus productos en el menú y domicilios.</p>
            </div>
          ) : (
            <ul className="divide-y rounded-xl border bg-background overflow-hidden">
              {shifts.map(s => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{s.name}</span>
                      {!s.isActive && <Badge variant="secondary" className="text-[10px] font-normal">Inactivo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.timeFrom} – {s.timeTo} · {formatDays(s.days)}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEdit(s)} disabled={busy}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10" onClick={() => deleteShift(s.id, s.name)} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RoleSettings() {
  const [tab, setTab] = useState("empresa");
  const { role } = useRole();
  const isAdmin = role === "admin";

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configuración</h1>
          <p className="text-sm text-muted-foreground">Gestiona los datos, apariencia y permisos del sistema.</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-erp-wizard"))}
            className="flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
          >
            <ClipboardList className="h-4 w-4 text-primary" />
            Guía de configuración
          </button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={`grid w-full grid-cols-2 sm:grid-cols-4 ${isAdmin ? "md:grid-cols-11" : "md:grid-cols-9"} h-auto p-1 gap-1`}>
          <TabsTrigger value="empresa" className="gap-1.5 py-2">
            <Building2 className="h-3.5 w-3.5" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="operaciones" className="gap-1.5 py-2">
            <Settings className="h-3.5 w-3.5" /> Operaciones
          </TabsTrigger>
          <TabsTrigger value="apariencia" className="gap-1.5 py-2">
            <Palette className="h-3.5 w-3.5" /> Apariencia
          </TabsTrigger>
          <TabsTrigger value="fidelidad" className="gap-1.5 py-2">
            <Star className="h-3.5 w-3.5" /> Fidelidad
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-1.5 py-2">
            <Shield className="h-3.5 w-3.5" /> Permisos
          </TabsTrigger>
          <TabsTrigger value="impresion" className="gap-1.5 py-2">
            <Printer className="h-3.5 w-3.5" /> Impresión
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="kds" className="gap-1.5 py-2">
              <ChefHat className="h-3.5 w-3.5" /> KDS
            </TabsTrigger>
          )}
          <TabsTrigger value="menu-digital" className="gap-1.5 py-2">
            <Smartphone className="h-3.5 w-3.5" /> Menú Digital
          </TabsTrigger>
          <TabsTrigger value="integraciones" className="gap-1.5 py-2">
            <Link2 className="h-3.5 w-3.5" /> Integraciones
          </TabsTrigger>
          <TabsTrigger value="turnos" className="gap-1.5 py-2">
            <Zap className="h-3.5 w-3.5" /> Turnos
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="whatsapp" className="gap-1.5 py-2">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <EmpresaTab />
        </TabsContent>

        <TabsContent value="operaciones" className="mt-4">
          <OperacionesTab />
        </TabsContent>

        <TabsContent value="apariencia" className="mt-4">
          <AparienciaTab />
        </TabsContent>

        <TabsContent value="fidelidad" className="mt-4">
          <FidelidadTab />
        </TabsContent>

        <TabsContent value="permisos" className="mt-4">
          <PermisosTab />
        </TabsContent>

        <TabsContent value="impresion" className="mt-4">
          <ImpresionTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="kds" className="mt-4">
            <KdsTab />
          </TabsContent>
        )}

        <TabsContent value="menu-digital" className="mt-4">
          <BrandSettingsTab />
        </TabsContent>

        <TabsContent value="integraciones" className="mt-4">
          <IntegracionesTab />
        </TabsContent>

        <TabsContent value="turnos" className="mt-4">
          <TurnosTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="whatsapp" className="mt-4">
            <WhatsAppTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
// ── WhatsApp Tab ──────────────────────────────────────────────────────────────

/**
 * Shows the webhook URL with a copy button and the actual WABA subscription
 * status stored in tenant settings (set by the embedded-signup flow).
 * Does NOT ping the server — the status reflects the last subscription attempt.
 */
function WebhookStatusCard({
  subscriptionOk,
  status,
  statusAt,
  error,
  globalStatus,
  globalStatusAt,
}: {
  subscriptionOk: boolean;
  status?: string;
  statusAt?: string;
  error?: string;
  globalStatus?: string;
  globalStatusAt?: string;
}) {
  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
  const { toast } = useToast();
  const statusDetails: Record<string, { label: string; className: string; help: string }> = {
    received: {
      label: "Entrega recibida",
      className: "text-blue-700",
      help: "FYRO recibió el evento firmado de Meta y está guardándolo.",
    },
    processed: {
      label: "Procesamiento completado",
      className: "text-green-700",
      help: "El último mensaje quedó guardado y procesado en la bandeja.",
    },
    processing_failed: {
      label: "Procesamiento pendiente de reintento",
      className: "text-amber-700",
      help: "El evento está guardado; FYRO volverá a procesarlo automáticamente.",
    },
    persist_failed: {
      label: "Meta entregó, pero FYRO no pudo guardar",
      className: "text-red-700",
      help: "Meta recibió una respuesta temporal y volverá a entregar el evento.",
    },
    unknown_phone: {
      label: "Número no asociado",
      className: "text-red-700",
      help: "Verifica que el identificador del número en Meta coincida con esta conexión.",
    },
    signature_rejected: {
      label: "Firma de Meta rechazada",
      className: "text-red-700",
      help: "Verifica el App Secret y que Meta esté enviando al webhook publicado.",
    },
  };
  const currentStatus = status ? statusDetails[status] : undefined;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => toast({ title: "URL copiada" }));
  };

  return (
    <div className="rounded-lg border p-3 text-xs space-y-2 mt-2">
      <div className="flex items-center gap-1.5">
        {subscriptionOk
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
          : <AlertCircle  className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
        <span className="font-semibold text-foreground">URL del webhook</span>
        <span className={subscriptionOk
          ? "ml-auto text-green-700 font-medium"
          : "ml-auto text-amber-700 font-medium"}>
          {subscriptionOk ? "✓ Suscripción activa" : "Suscripción pendiente"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 bg-muted rounded px-2 py-1 font-mono text-xs truncate">{webhookUrl}</code>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 shrink-0" onClick={copyUrl}>
          <Copy className="h-3 w-3" />Copiar
        </Button>
      </div>
      {subscriptionOk ? (
        <p className="text-muted-foreground">
          La suscripción al campo <code className="bg-muted px-1 rounded">messages</code> se activó
          automáticamente. No necesitas configurar nada en el panel de Meta Developers.
        </p>
      ) : (
        <p className="text-amber-700">
          La suscripción automática no pudo completarse. Haz clic en Reconectar para que FYRO vuelva
          a verificar la WABA y solicite la suscripción a Meta.
        </p>
      )}
      {currentStatus && (
        <div className="border-t pt-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-semibold ${currentStatus.className}`}>{currentStatus.label}</span>
            {statusAt && (
              <span className="text-muted-foreground">{new Date(statusAt).toLocaleString()}</span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{error || currentStatus.help}</p>
        </div>
      )}
      {!currentStatus && globalStatus && statusDetails[globalStatus] && (
        <div className="border-t pt-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-semibold ${statusDetails[globalStatus].className}`}>
              Diagnóstico general: {statusDetails[globalStatus].label}
            </span>
            {globalStatusAt && (
              <span className="text-muted-foreground">{new Date(globalStatusAt).toLocaleString()}</span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            {statusDetails[globalStatus].help} Este evento no pudo asociarse de forma segura a una empresa.
          </p>
        </div>
      )}
    </div>
  );
}

const BASE_WA = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const waApi = (p: string) => `${BASE_WA}${p}`;

type WaSettings = {
  phoneNumberId: string;
  welcomeMessage: string;
  botEnabled: boolean;
  transferInfo: string;
  paymentMethods: string[];
  displayPhone: string;
  verifiedName: string;
  wabaId: string;
  subscriptionOk: boolean;
  tokenExpiresAt: string;
  lastWebhookReceivedAt: string;
  webhookStatus: string;
  webhookStatusAt: string;
  webhookError: string;
  globalWebhookStatus: string;
  globalWebhookStatusAt: string;
};
type WaTokenStatus = {
  configured: boolean;
  expiresAt: string | null;
  expiresInDays: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  tokenValid?: boolean;
};
type WaPhoneStatus = {
  configured: boolean;
  qualityRating?: string | null;   // "GREEN" | "YELLOW" | "RED" | "UNKNOWN"
  canSendMessage?: string | null;  // "AVAILABLE" | "LIMITED" | "BLOCKED"
  error?: string;
};
type MetaEmbeddedSignupConfig = {
  appId: string;
  configId: string;
  redirectUri: string;
  version?: "v4";
  configured: boolean;
  missing?: string[];
};
type MetaSignupDiagnostic = {
  category: "configuration" | "permissions" | "eligibility" | "fyro";
  message: string;
};
type WaFaq = { id: number; question: string; answer: string };

function describeMetaSignupIssue(raw: unknown, fallback: string): MetaSignupDiagnostic {
  const message = typeof raw === "string"
    ? raw.toLowerCase()
    : JSON.stringify(raw ?? {}).toLowerCase();
  if (
    message.includes("redirect") ||
    message.includes("config_id") ||
    message.includes("configuration") ||
    message.includes("app id") ||
    message.includes("client secret")
  ) {
    return {
      category: "configuration",
      message: "Meta rechazó la configuración de FYRO. Revisa el Configuration ID, la URL de retorno y los dominios autorizados en Facebook Login for Business.",
    };
  }
  if (
    message.includes("permission") ||
    message.includes("access token") ||
    message.includes("not authorized") ||
    message.includes("unauthorized")
  ) {
    return {
      category: "permissions",
      message: "Meta rechazó los permisos. Inicia el proceso con una cuenta administradora del negocio y revisa los permisos de WhatsApp Business.",
    };
  }
  if (
    message.includes("tech provider") ||
    message.includes("solution partner") ||
    message.includes("eligible") ||
    message.includes("verification") ||
    message.includes("onboarding")
  ) {
    return {
      category: "eligibility",
      message: "Meta no considera elegible esta cuenta para Embedded Signup. Confirma la aprobación de Tech Provider o Solution Partner y la verificación del negocio.",
    };
  }
  return { category: "fyro", message: fallback };
}

function isMetaSignupEventOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com") ||
      hostname === "fb.com" || hostname.endsWith(".fb.com");
  } catch {
    return false;
  }
}

function readMetaSignupEvent(value: unknown): any | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? value : null;
}

function metaSignupDiagnosticTitle(category: MetaSignupDiagnostic["category"]): string {
  return {
    configuration: "Configuración de Meta pendiente",
    permissions: "Permisos de Meta insuficientes",
    eligibility: "Cuenta no elegible en Meta",
    fyro: "No se pudo completar la conexión",
  }[category];
}

function WhatsAppTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: remote, isLoading } = useQuery<WaSettings>({
    queryKey: ["wa-settings"],
    queryFn: () => fetch(waApi("/api/whatsapp/settings")).then(r => r.json()),
  });

  const { data: tokenStatus } = useQuery<WaTokenStatus>({
    queryKey: ["wa-token-status"],
    queryFn: () => fetch(waApi("/api/whatsapp/token-status")).then(r => r.json()),
    refetchInterval: 60 * 60 * 1000, // refresh every hour
  });

  const { data: phoneStatus, isLoading: loadingPhoneStatus } = useQuery<WaPhoneStatus>({
    queryKey: ["wa-phone-status"],
    queryFn: () => fetch(waApi("/api/whatsapp/phone-status")).then(r => r.json()),
    enabled: !!remote?.phoneNumberId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime: 4 * 60 * 1000,
  });

  const { data: faqs = [], isLoading: loadingFaqs } = useQuery<WaFaq[]>({
    queryKey: ["wa-faqs"],
    queryFn: () => fetch(waApi("/api/whatsapp/faqs")).then(r => r.json()),
  });

  const [draft, setDraft] = useState<WaSettings>({
    phoneNumberId: "",
    welcomeMessage: "¡Hola! Bienvenido 👋 ¿En qué te puedo ayudar?",
    botEnabled: false,
    transferInfo: "",
    paymentMethods: ["Efectivo"],
    displayPhone: "",
    verifiedName: "",
    wabaId: "",
    subscriptionOk: false,
    webhookStatus: "",
    webhookStatusAt: "",
    webhookError: "",
    globalWebhookStatus: "",
    globalWebhookStatusAt: "",
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [fbReady, setFbReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [verifyingConnection, setVerifyingConnection] = useState(false);
  const [reauthorizationRequired, setReauthorizationRequired] = useState(false);
  const [metaSignupConfig, setMetaSignupConfig] = useState<MetaEmbeddedSignupConfig | null>(null);
  const [signupDiagnostic, setSignupDiagnostic] = useState<MetaSignupDiagnostic | null>(null);

  useEffect(() => { if (remote) setDraft(remote); }, [remote]);

  // Load the public Meta configuration, then initialize the FB SDK.
  // The server owns the redirect URI so the login dialog and code exchange
  // can never disagree about it.
  useEffect(() => {
    fetch(waApi("/api/whatsapp/meta-embedded-signup-config"))
      .then(r => r.json())
      .then((d: MetaEmbeddedSignupConfig) => {
        setMetaSignupConfig(d);
        const appId = d.appId;
        if (!appId) return;
        (window as any).fbAsyncInit = () => {
          (window as any).FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
          setFbReady(true);
        };
        if (!document.getElementById("facebook-jssdk")) {
          const s = document.createElement("script");
          s.id = "facebook-jssdk";
          s.src = "https://connect.facebook.net/en_US/sdk.js";
          s.async = true;
          document.body.appendChild(s);
        } else if ((window as any).FB) {
          setFbReady(true);
        }
      })
      .catch(() => {
        setMetaSignupConfig({ appId: "", configId: "", redirectUri: "", configured: false });
        setSignupDiagnostic({
          category: "fyro",
          message: "FYRO no pudo cargar la configuración de Meta. Actualiza la página e intenta de nuevo.",
        });
      });
  }, []);

  const connectMut = useMutation({
    mutationFn: async (payload: { code: string; phoneNumberId: string; wabaId: string; reauthorize?: boolean }) => {
      const r = await fetch(waApi(
        payload.reauthorize ? "/api/whatsapp/reauthorize-connection" : "/api/whatsapp/embedded-signup",
      ), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const error = new Error(data.error ?? "FYRO no pudo completar la conexión con Meta.");
        Object.assign(error, { category: data.category });
        throw error;
      }
      return data as { phoneNumberId: string; displayPhoneNumber: string; verifiedName: string; wabaId: string; subscriptionOk: boolean; subscriptionWarning?: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wa-settings"] });
      qc.invalidateQueries({ queryKey: ["wa-phone-status"] });
      qc.invalidateQueries({ queryKey: ["wa-token-status"] });
      setSignupDiagnostic(null);
      setReauthorizationRequired(false);
      toast({ title: `✅ WhatsApp conectado — ${data.displayPhoneNumber || data.phoneNumberId}` });
      if (data.subscriptionWarning) {
        toast({ title: `⚠️ Suscripción: ${data.subscriptionWarning}`, variant: "destructive" });
      }
      setConnecting(false);
    },
    onError: (e: Error & { category?: MetaSignupDiagnostic["category"] }) => {
      const diagnostic: MetaSignupDiagnostic = {
        category: e.category ?? "fyro",
        message: e.message,
      };
      setSignupDiagnostic(diagnostic);
      toast({ title: "No se completó la conexión", description: diagnostic.message, variant: "destructive" });
      setConnecting(false);
    },
  });

  const verifyConnection = async () => {
    setVerifyingConnection(true);
    try {
      const response = await fetch(waApi("/api/whatsapp/verify-connection"), { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.category === "token" || data.reauthorizationRequired) {
          setReauthorizationRequired(true);
        }
        throw new Error(data.error ?? "No se pudo verificar la conexión propia.");
      }
      setReauthorizationRequired(false);
      qc.invalidateQueries({ queryKey: ["wa-settings"] });
      qc.invalidateQueries({ queryKey: ["wa-phone-status"] });
      qc.invalidateQueries({ queryKey: ["wa-token-status"] });
      toast({
        title: data.subscriptionOk
          && data.readyToSend
          ? "✅ WhatsApp propio listo para enviar"
          : "✅ Número propio validado",
        description: data.subscriptionOk && data.readyToSend
          ? "El token guardado sigue vigente y Meta está suscrita a los eventos de FYRO."
          : data.canSendMessage === "BLOCKED"
            ? "Meta confirmó el número, pero actualmente no permite enviar mensajes."
            : "El token guardado sigue vigente, pero revisa la suscripción del webhook y el estado de envío.",
      });
    } catch (e) {
      toast({
        title: "No se pudo verificar WhatsApp propio",
        description: e instanceof Error ? e.message : "Intenta de nuevo en un momento.",
        variant: "destructive",
      });
    } finally {
      setVerifyingConnection(false);
    }
  };

  const handleEmbeddedSignup = (reauthorize = false) => {
    const FB = (window as any).FB;
    if (!metaSignupConfig?.configured) {
      const diagnostic: MetaSignupDiagnostic = {
        category: "configuration",
        message: "Falta configurar Meta Embedded Signup en FYRO. Revisa el Configuration ID y la URL de retorno HTTPS.",
      };
      setSignupDiagnostic(diagnostic);
      toast({ title: "Configuración de Meta incompleta", description: diagnostic.message, variant: "destructive" });
      return;
    }
    if (!FB || !fbReady) {
      toast({ title: "SDK de Facebook no está listo, espera un momento e intenta de nuevo", variant: "destructive" });
      return;
    }
    setSignupDiagnostic(null);
    setConnecting(true);
    let captured: { phoneNumberId: string; wabaId: string } | null = null;
    let oauthCode = "";
    let submitted = false;
    let terminal = false;
    let completionTimeout: number | undefined;
    const cleanUp = () => {
      window.removeEventListener("message", msgHandler);
      if (completionTimeout) window.clearTimeout(completionTimeout);
    };
    const failSignup = (diagnostic: MetaSignupDiagnostic) => {
      if (terminal || submitted) return;
      terminal = true;
      cleanUp();
      setConnecting(false);
      setSignupDiagnostic(diagnostic);
      toast({ title: "No se completó la conexión", description: diagnostic.message, variant: "destructive" });
    };
    const submitIfComplete = (finalAttempt = false) => {
      if (terminal || submitted || !oauthCode) return;
      if (!captured) {
        if (finalAttempt) {
          failSignup({
            category: "eligibility",
            message: "Meta terminó el proceso sin devolver la cuenta de WhatsApp y el número. No se guardó ninguna conexión; intenta de nuevo con una cuenta administradora.",
          });
        }
        return;
      }
      submitted = true;
      cleanUp();
      connectMut.mutate({ code: oauthCode, ...captured, reauthorize });
    };
    const msgHandler = (ev: MessageEvent) => {
      if (!isMetaSignupEventOrigin(ev.origin)) return;
      const d = readMetaSignupEvent(ev.data);
      if (!d || d.type !== "WA_EMBEDDED_SIGNUP") return;

      if (d.event === "FINISH" || d.event === "FINISH_ONLY") {
        const result = d.data ?? d;
        const phoneNumberId = result?.phone_number_id ?? result?.phoneNumberId;
        const wabaId = result?.waba_id ?? result?.wabaId;
        if (typeof phoneNumberId === "string" && typeof wabaId === "string") {
          captured = { phoneNumberId, wabaId };
          submitIfComplete();
        }
        return;
      }
      if (d.event === "CANCEL") {
        failSignup({
          category: "fyro",
          message: "Cancelaste la conexión en Meta. No se modificó la configuración de WhatsApp.",
        });
        return;
      }
      if (d.event === "ERROR") {
        failSignup(describeMetaSignupIssue(
          d.data?.error_message ?? d.data?.message ?? d.data ?? d,
          "Meta detuvo el alta antes de terminar. Revisa la configuración, permisos y elegibilidad de la cuenta proveedora.",
        ));
      }
    };
    window.addEventListener("message", msgHandler);
    FB.login(
      (response: any) => {
        if (terminal || submitted) return;
        if (response?.authResponse?.code) {
          oauthCode = response.authResponse.code;
          // The WA_EMBEDDED_SIGNUP event can arrive just before or just after
          // this callback. Give the v4 popup time to deliver its asset IDs;
          // do not send a partially identified connection to the server.
          completionTimeout = window.setTimeout(() => submitIfComplete(true), 4000);
          submitIfComplete();
        } else {
          failSignup({
            category: "fyro",
            message: "La autorización se canceló o Meta no devolvió un código. No se modificó la conexión actual.",
          });
        }
      },
      {
        config_id: metaSignupConfig.configId,
        redirect_uri: metaSignupConfig.redirectUri,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  };

  const handleReauthorization = () => {
    const confirmed = window.confirm(
      "Se abrirá Meta para renovar la conexión del número propio. Selecciona la misma cuenta y el mismo número; la conexión actual solo cambiará si Meta valida el proceso.",
    );
    if (confirmed) handleEmbeddedSignup(true);
  };

  const [faqForm, setFaqForm] = useState<{ id?: number; question: string; answer: string } | null>(null);

  const saveMut = useMutation({
    mutationFn: () => fetch(waApi("/api/whatsapp/settings"), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa-settings"] }); toast({ title: "Configuración guardada" }); },
    onError: () => toast({ title: "Error al guardar", variant: "destructive" }),
  });

  const saveFaqMut = useMutation({
    mutationFn: async (f: { id?: number; question: string; answer: string }) => {
      const url = f.id ? waApi(`/api/whatsapp/faqs/${f.id}`) : waApi("/api/whatsapp/faqs");
      const r = await fetch(url, { method: f.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa-faqs"] }); setFaqForm(null); toast({ title: "FAQ guardada" }); },
    onError: () => toast({ title: "Error al guardar FAQ", variant: "destructive" }),
  });

  const deleteFaqMut = useMutation({
    mutationFn: (id: number) => fetch(waApi(`/api/whatsapp/faqs/${id}`), { method: "DELETE" }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa-faqs"] }); toast({ title: "FAQ eliminada" }); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Embedded Signup */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm">Conexión con Meta WhatsApp Business</span>
          </div>

          {draft.phoneNumberId ? (
            /* ── Connected state ── */
            <div className="space-y-2">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      {draft.displayPhone || draft.phoneNumberId}
                    </p>
                    {draft.verifiedName && <p className="text-xs text-green-700">{draft.verifiedName}</p>}
                    {tokenStatus?.expiresInDays != null && !tokenStatus.isExpired && !tokenStatus.isExpiringSoon && (
                      <p className="text-xs text-green-600 mt-0.5">Token válido por {tokenStatus.expiresInDays} días más</p>
                    )}
                    {/* Phone health inline badge */}
                    {loadingPhoneStatus && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-0.5">
                        <Loader2 className="h-3 w-3 animate-spin" />Verificando estado…
                      </span>
                    )}
                    {!loadingPhoneStatus && phoneStatus?.configured && !phoneStatus.error && (
                      <span className="inline-flex items-center gap-1 text-xs mt-0.5">
                        <span className={
                          phoneStatus.canSendMessage === "AVAILABLE" ? "text-green-600" :
                          phoneStatus.canSendMessage === "LIMITED" ? "text-amber-600" :
                          phoneStatus.canSendMessage === "BLOCKED" ? "text-red-600" : "text-muted-foreground"
                        }>
                          {phoneStatus.canSendMessage === "AVAILABLE" ? "● Activo" :
                           phoneStatus.canSendMessage === "LIMITED" ? "● Limitado" :
                           phoneStatus.canSendMessage === "BLOCKED" ? "● Bloqueado" : "● Estado desconocido"}
                        </span>
                        {phoneStatus.qualityRating && phoneStatus.qualityRating !== "UNKNOWN" && (
                          <span className={
                            phoneStatus.qualityRating === "GREEN" ? "text-green-600" :
                            phoneStatus.qualityRating === "YELLOW" ? "text-amber-600" :
                            phoneStatus.qualityRating === "RED" ? "text-red-600" : "text-muted-foreground"
                          }>
                            · Calidad {phoneStatus.qualityRating === "GREEN" ? "alta" : phoneStatus.qualityRating === "YELLOW" ? "media" : "baja"}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm" variant="outline"
                  className="text-xs border-green-300 text-green-700 hover:bg-green-100"
                  onClick={verifyConnection}
                  disabled={verifyingConnection || connecting}
                >
                  {verifyingConnection
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Verificar conexión
                </Button>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800">
                <p className="font-semibold">Conexión del negocio principal</p>
                <p className="mt-0.5">
                  Esta verificación usa el token guardado, no lo muestra ni lo reemplaza. También vuelve a solicitar la suscripción del webhook para este número.
                </p>
                <p className="mt-1">
                  Cuenta WABA: <span className="font-mono">{draft.wabaId || "pendiente de recuperar"}</span>.
                </p>
                {draft.lastWebhookReceivedAt ? (
                  <p className="mt-1">
                    Último evento recibido de Meta: {new Date(draft.lastWebhookReceivedAt).toLocaleString()}.
                  </p>
                ) : (
                  <p className="mt-1">
                    Aún no hay una entrega registrada. Envía un mensaje desde el número de prueba autorizado para confirmar la respuesta del bot y verlo en la bandeja.
                  </p>
                )}
              </div>

              {/* Phone number health alerts */}
              {phoneStatus?.configured && !phoneStatus.error && phoneStatus.canSendMessage === "BLOCKED" && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800">Número bloqueado — no puede enviar mensajes</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Meta ha bloqueado este número de WhatsApp. Revisa tu cuenta en el{" "}
                      <a href="https://business.facebook.com" target="_blank" rel="noopener" className="underline">Business Manager de Meta</a>{" "}
                      para más detalles.
                    </p>
                  </div>
                </div>
              )}
              {phoneStatus?.configured && !phoneStatus.error && phoneStatus.canSendMessage === "LIMITED" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Número con envío limitado</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Meta ha aplicado restricciones a este número. Los mensajes pueden no llegar a todos los destinatarios.
                      Revisa la calidad del número en el{" "}
                      <a href="https://business.facebook.com" target="_blank" rel="noopener" className="underline">Business Manager de Meta</a>.
                    </p>
                  </div>
                </div>
              )}
              {phoneStatus?.configured && phoneStatus.error && (
                <div className="rounded-lg bg-muted/60 border p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">No se pudo verificar el estado del número: {phoneStatus.error}</p>
                </div>
              )}

              {/* Token expiry warning */}
              {tokenStatus?.isExpired && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800">Token expirado — el bot no puede recibir mensajes</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      El token guardado ya no puede usarse. Reautoriza únicamente la conexión de este número con Meta.
                    </p>
                  </div>
                </div>
              )}
              {(tokenStatus?.isExpired || reauthorizationRequired) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold">Recuperar la conexión del negocio principal</p>
                    <p className="mt-0.5">Meta abrirá una autorización para el mismo número. FYRO no reemplazará las credenciales hasta que Meta complete la validación.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-900 hover:bg-amber-100"
                    onClick={handleReauthorization}
                    disabled={connecting || !fbReady || !metaSignupConfig?.configured}
                  >
                    {connecting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                    Reautorizar con Meta
                  </Button>
                </div>
              )}
              {tokenStatus?.isExpiringSoon && !tokenStatus.isExpired && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      Token expira en {tokenStatus.expiresInDays} día{tokenStatus.expiresInDays === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Intentamos renovarlo automáticamente pero no fue posible. Verifica la conexión propia primero; no se reemplazará el token si todavía es válido.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Not connected state ── */
            <div className="rounded-lg bg-muted/40 border border-dashed p-4 flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Conecta tu WhatsApp Business</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Un popup de Meta te guiará para autorizar el acceso. No necesitas tocar ningún panel de Meta.
                </p>
              </div>
              <Button
                onClick={handleEmbeddedSignup}
                disabled={connecting || !fbReady || !metaSignupConfig?.configured}
                className="bg-[#1877F2] hover:bg-[#166FE5] text-white gap-2"
              >
                {connecting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                }
                {connecting ? "Conectando…" : "Continuar con Facebook"}
              </Button>
              {!fbReady && <p className="text-xs text-muted-foreground">Cargando SDK de Facebook…</p>}
            </div>
          )}

          {draft.phoneNumberId && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold">Registro de otros negocios</p>
              <p className="mt-0.5">
                Embedded Signup sigue siendo el flujo para conectar negocios externos. Su aprobación pendiente en Meta no afecta este número propio; la reautorización de arriba solo se usa para recuperar este número.
              </p>
            </div>
          )}

          {metaSignupConfig && !metaSignupConfig.configured && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold">FYRO todavía no puede iniciar Embedded Signup v4</p>
                <p className="mt-0.5">
                  Configura Facebook Login for Business con WhatsApp Cloud API y completa:
                  {metaSignupConfig.missing?.length ? ` ${metaSignupConfig.missing.join(", ")}.` : " App ID, Configuration ID y URL de retorno HTTPS."}
                </p>
                <p className="mt-1">
                  La URL de retorno de Meta debe coincidir exactamente con la configurada en FYRO y estar registrada en los dominios permitidos de la app.
                </p>
              </div>
            </div>
          )}

          {signupDiagnostic && (
            <div className={
              "rounded-lg border p-3 flex items-start gap-2 " +
              (signupDiagnostic.category === "configuration" ? "bg-amber-50 border-amber-200" :
                signupDiagnostic.category === "permissions" ? "bg-orange-50 border-orange-200" :
                signupDiagnostic.category === "eligibility" ? "bg-red-50 border-red-200" :
                "bg-muted/60")
            }>
              <AlertCircle className={
                "h-4 w-4 shrink-0 mt-0.5 " +
                (signupDiagnostic.category === "configuration" ? "text-amber-600" :
                  signupDiagnostic.category === "permissions" ? "text-orange-600" :
                  signupDiagnostic.category === "eligibility" ? "text-red-600" :
                  "text-muted-foreground")
              } />
              <div className="text-xs">
                <p className="font-semibold">{metaSignupDiagnosticTitle(signupDiagnostic.category)}</p>
                <p className="mt-0.5 text-muted-foreground">{signupDiagnostic.message}</p>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Mensaje de bienvenida (se envía al primer contacto)</Label>
            <Textarea value={draft.welcomeMessage} onChange={e => setDraft(d => ({ ...d, welcomeMessage: e.target.value }))}
              rows={2} className="mt-1 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Datos bancarios para transferencias (el bot los comparte al cliente)</Label>
            <Textarea
              value={draft.transferInfo}
              onChange={e => setDraft(d => ({ ...d, transferInfo: e.target.value }))}
              rows={3}
              className="mt-1 text-sm font-mono"
              placeholder={"Bancolombia — Cuenta de ahorros 123-456789-00 — Juan García\nNequi — 300 123 4567"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cuando el cliente elija pagar por transferencia, el bot enviará estos datos automáticamente y luego verificará el comprobante en el apartado de comprobantes.
            </p>
          </div>

          <div className="rounded-lg bg-muted/40 border p-3 flex items-start gap-3">
            <Switch checked={draft.botEnabled} onCheckedChange={v => setDraft(d => ({ ...d, botEnabled: v }))} id="wa-bot" />
            <div>
              <label htmlFor="wa-bot" className="text-sm font-medium cursor-pointer">Activar bot IA</label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cuando está activo el bot responde automáticamente y toma pedidos de domicilio.
                Puedes tomar el control de cualquier conversación desde la bandeja de mensajes.
                {!draft.botEnabled && " Actualmente solo humanos responden desde la bandeja."}
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <Label className="text-xs">Métodos de pago aceptados</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              El bot preguntará al cliente cuál de estas opciones usará al pagar.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(draft.paymentMethods ?? []).map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted border px-2.5 py-0.5 text-xs font-medium">
                  {m}
                  <button
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, paymentMethods: (d.paymentMethods ?? []).filter((_, j) => j !== i) }))}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                    aria-label="Eliminar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {(draft.paymentMethods ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground italic">Sin métodos configurados — el bot usará "Efectivo" por defecto.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPaymentMethod}
                onChange={e => setNewPaymentMethod(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newPaymentMethod.trim()) {
                    e.preventDefault();
                    const val = newPaymentMethod.trim();
                    if (!(draft.paymentMethods ?? []).includes(val)) {
                      setDraft(d => ({ ...d, paymentMethods: [...(d.paymentMethods ?? []), val] }));
                    }
                    setNewPaymentMethod("");
                  }
                }}
                placeholder="Ej: Nequi, Transferencia, Tarjeta…"
                className="text-sm h-8"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                disabled={!newPaymentMethod.trim()}
                onClick={() => {
                  const val = newPaymentMethod.trim();
                  if (val && !(draft.paymentMethods ?? []).includes(val)) {
                    setDraft(d => ({ ...d, paymentMethods: [...(d.paymentMethods ?? []), val] }));
                  }
                  setNewPaymentMethod("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" />Agregar
              </Button>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Guardar configuración
            </Button>
            <a href="/whatsapp" className="text-xs text-primary underline ml-2">Abrir bandeja de mensajes →</a>
          </div>

          <WebhookStatusCard
            subscriptionOk={draft.subscriptionOk}
            status={draft.webhookStatus}
            statusAt={draft.webhookStatusAt}
            error={draft.webhookError}
            globalStatus={draft.globalWebhookStatus}
            globalStatusAt={draft.globalWebhookStatusAt}
          />
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">Preguntas frecuentes (FAQs)</p>
              <p className="text-xs text-muted-foreground">El bot usa estas respuestas para contestar preguntas comunes.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1"
              onClick={() => setFaqForm({ question: "", answer: "" })}>
              <Plus className="h-3.5 w-3.5" />Nueva FAQ
            </Button>
          </div>

          {loadingFaqs ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay FAQs todavía. Agrega preguntas frecuentes para que el bot las use.
            </p>
          ) : (
            <div className="space-y-2">
              {faqs.map(faq => (
                <div key={faq.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">P: {faq.question}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">R: {faq.answer}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => { if (confirm("¿Eliminar esta FAQ?")) deleteFaqMut.mutate(faq.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Form Dialog */}
      {faqForm && (
        <Dialog open onOpenChange={() => setFaqForm(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{faqForm.id ? "Editar FAQ" : "Nueva FAQ"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Pregunta</Label>
                <Input value={faqForm.question} onChange={e => setFaqForm(f => f ? { ...f, question: e.target.value } : f)}
                  placeholder="¿Cuánto demora el domicilio?" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Respuesta</Label>
                <Textarea value={faqForm.answer} onChange={e => setFaqForm(f => f ? { ...f, answer: e.target.value } : f)}
                  rows={3} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFaqForm(null)}>Cancelar</Button>
              <Button onClick={() => saveFaqMut.mutate(faqForm!)}
                disabled={!faqForm.question || !faqForm.answer || saveFaqMut.isPending}>
                {saveFaqMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
