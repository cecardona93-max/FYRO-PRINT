import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import {
  BUSINESS_TIME_ZONE,
  getEffectiveDeliveryFee,
  getServiceAvailability,
  isValidIsoDate,
  parseJsonSetting,
  type ServiceClosure,
} from "../lib/serviceAvailability.js";
import {
  applyCashShortfallCharge,
  decorateCashShortfall,
  processExpiredCashShortfalls,
} from "../lib/cashShortfalls.js";
import { validatePrinterDestination } from "../lib/printerSecurity.js";
import { parseBooleanSettingValue } from "../lib/settingValues.js";
import { bearerPrintAgentToken, hashPrintAgentSecret } from "../lib/printAgentSecurity.js";
import { PRINT_JOB_LEASE_MS, PRINT_JOB_MAX_ATTEMPTS } from "../lib/printAgentQueue.js";
import { isPrintAgentDownloadAvailable, resolvePrintAgentDownload } from "../lib/printAgentDownloads.js";
import {
  hasOpenAttendanceEntry,
} from "../middlewares/tenantMiddleware.js";
import { roleRequiresOperationalAttendance } from "../lib/operationalAttendancePolicy.js";

const objectStorage = new ObjectStorageService();

const __erpDirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve the uploads folder: dist/ → ../uploads = api-server/uploads
const UPLOADS_DIR = path.resolve(__erpDirname, "../uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // accept up to 20 MB before compression
});
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB for video files
});
import {
  eq,
  ne,
  or,
  desc,
  and,
  isNull,
  sql,
  asc,
  gt,
  gte,
  lte,
  lt,
  inArray,
  notInArray,
  isNotNull,
  notExists,
  getTableColumns,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  appSettingsTable,
  cashSessionsTable,
  cashShortfallReviewsTable,
  categoriesTable,
  customersTable,
  plansTable,
  tenantsTable,
  customerBonusesTable,
  creditMovementsTable,
  loyaltyMovementsTable,
  db,
  deliveriesTable,
  deliveryDriversTable,
  deliveryShiftRulesTable,
  insertDeliveryDriverSchema,
  updateDeliveryDriverSchema,
  insertDeliveryShiftRuleSchema,
  updateDeliveryShiftRuleSchema,
  type DeliveryDriver,
  employeesTable,
  authSessionsTable,
  expensesTable,
  saleRefundsTable,
  ingredientsTable,
  ingredientWarehouseStockTable,
  ingredientMovementsTable,
  insertIngredientMovementSchema,
  insertEmployeeSchema,
  insertIngredientSchema,
  insertInventoryMovementSchema,
  insertPayrollAttendanceSchema,
  insertPayrollPeriodSchema,
  insertPayrollRecordSchema,
  insertProductRecipeSchema,
  insertSupplierSchema,
  insertTimeEntrySchema,
  insertWarehouseSchema,
  inventoryMovementsTable,
  payrollAttendanceTable,
  payrollPeriodsTable,
  payrollRecordsTable,
  employeeCreditMovementsTable,
  employeeCreditCodesTable,
  productRecipesTable,
  productsTable,
  productPiecesTable,
  productOptionGroupsTable,
  productOptionItemsTable,
  productOptionGroupAssignmentsTable,
  recipeItemsTable,
  recipesTable,
  restaurantOrderItemsTable,
  restaurantOrdersTable,
  restaurantOrderSplitsTable,
  suppliersTable,
  updateIngredientSchema,
  updateSupplierSchema,
  updateWarehouseSchema,
  warehouseStockTable,
  warehousesTable,
  restaurantTablesTable,
  saleItemsTable,
  salesTable,
  timeEntriesTable,
  usedQrTokensTable,
  attendanceSessionsTable,
  attendanceVerificationChallengesTable,
  screenSessionsTable,
  updateEmployeeSchema,
  updatePayrollPeriodSchema,
  updatePayrollRecordSchema,
  updatePayrollAttendanceSchema,
  updateTimeEntrySchema,
  paymentReceiptsTable,
  productionOrdersTable,
  productionProcessesTable,
  productionStagesTable,
  insertProductionProcessSchema,
  updateProductionProcessSchema,
  insertProductionStageSchema,
  updateProductionStageSchema,
  screensTable,
  screenPlaylistItemsTable,
  reorderRequestsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  ingredientWarehouseMinStockTable,
  transferRequestsTable,
  transferRequestItemsTable,
  waiterCallsTable,
  operationalStockTable,
  cajasTable,
  insertCajaSchema,
  updateCajaSchema,
  type Caja,
  driverCashReconciliationsTable,
  insertDriverCashReconciliationSchema,
  type DriverCashReconciliation,
  branchesTable,
  insertBranchSchema,
  updateBranchSchema,
  type Branch,
  employeeEventsTable,
  insertEmployeeEventSchema,
  updateEmployeeEventSchema,
  type EmployeeEvent,
  workSchedulesTable,
  insertWorkScheduleSchema,
  updateWorkScheduleSchema,
  type WorkSchedule,
  shiftSwapRequestsTable,
  insertShiftSwapRequestSchema,
  type ShiftSwapRequest,
  checklistTemplatesTable,
  checklistRotationMembersTable,
  checklistTasksTable,
  checklistInstancesTable,
  insertChecklistTemplateSchema,
  updateChecklistTemplateSchema,
  insertChecklistTaskSchema,
  updateChecklistTaskSchema,
  type ChecklistTemplate,
  type ChecklistRotationMember,
  type ChecklistTask,
  type ChecklistInstance,
  type TransferRequest,
  type TransferRequestItem,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type Screen,
  type ScreenPlaylistItem,
  employeePermissionOverridesTable,
  type EmployeePermissionOverride,
  type PaymentReceipt,
  type CashSession,
  type Employee,
  type Expense,
  type PayrollAttendance,
  type PayrollPeriod,
  type PayrollRecord,
  type Product,
  type RestaurantOrder,
  type RestaurantOrderItem,
  type RestaurantTable,
  type Sale,
  type SaleItem,
  type TimeEntry,
  shiftsTable,
  productShiftsTable,
  insertShiftSchema,
  updateShiftSchema,
  type Shift,
  pqrsReviewsTable,
  printAgentPairingsTable,
  printAgentsTable,
  printAgentJobsTable,
} from "@workspace/db";
import {
  AddRestaurantOrderItemBody,
  AddRestaurantOrderItemParams,
  CancelRestaurantOrderParams,
  PrintRestaurantOrderStationBody,
  PrintRestaurantOrderStationParams,
  PrintRestaurantOrderStationResponse,
  CancelRestaurantOrderResponse,
  CheckoutRestaurantOrderBody,
  CheckoutRestaurantOrderParams,
  CloseCashSessionBody,
  CloseCashSessionParams,
  CloseCashSessionResponse,
  ListCashShortfallReviewsResponse,
  ReviewCashShortfallParams,
  ReviewCashShortfallBody,
  ReviewCashShortfallResponse,
  RespondToCashShortfallParams,
  RespondToCashShortfallBody,
  RespondToCashShortfallResponse,
  CreateExpenseBody,
  CreateProductBody,
  CreateRestaurantOrderBody,
  CreateRestaurantTableBody,
  CreateSaleBody,
  DeleteExpenseParams,
  DeleteProductParams,
  DeleteRestaurantOrderItemParams,
  DeleteRestaurantOrderItemResponse,
  GetDashboardSummaryResponse,
  ListCashSessionsResponse,
  ListCashSessionsResponseItem,
  ListExpensesResponse,
  ListProductsResponse,
  ListProductsResponseItem,
  ListRestaurantTablesResponse,
  ListRestaurantTablesResponseItem,
  ListSalesResponse,
  ListSalesResponseItem,
  OpenCashSessionBody,
  VoidSaleBody,
  VoidSaleParams,
  VoidSaleResponse,
  UpdateRestaurantOrderItemBody,
  UpdateRestaurantOrderItemParams,
  UpdateRestaurantOrderItemResponse,
  UpdateRestaurantTableBody,
  UpdateRestaurantTableParams,
  UpdateRestaurantTableResponse,
  UpdateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  ListCustomersResponse,
  ListCustomersResponseItem,
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
  DeleteCustomerParams,
  ListDeliveriesResponse,
  CreateDeliveryBody,
  UpdateDeliveryBody,
  UpdateDeliveryParams,
  DeleteDeliveryParams,
  UpdateDeliveryStatusBody,
  GetKitchenStationParams,
  GetKitchenStationResponse,
  MarkAuthenticatedPublicClockBody,
  ServeKitchenItemParams,
  ServeKitchenItemResponse,
  ListKitchenOrdersResponse,
  UpdateKitchenStatusParams,
  UpdateKitchenStatusBody,
  UpdateKitchenStatusResponse,
} from "@workspace/api-zod";
import {
  computeIngredientRestoration,
  computeSaleInventoryPlan,
  type ConsumedItem,
} from "../lib/inventory";
import {
  parsePaymentFromEmail,
  parsePaymentFromSms,
  computeDedupHash,
  detectBankFromSms,
  detectDirection,
} from "../lib/paymentParser";
import { logger } from "../lib/logger";
import {
  canMutatePayrollPeriod,
  canSetPayrollStatusFromGenericUpdate,
  employeeCreditCodeMatches,
  hashEmployeeCreditCode,
  normalizeEmployeeCreditPaymentKind,
  replaceEmployeeCreditDeduction,
  resolveSaleOperatorEmployeeId,
  shouldFinalizePayrollCredit,
  validateEmployeeCreditSaleMode,
} from "../lib/employee-credit.js";
import { sseBus } from "../lib/sseEmitter";
import { requireRole } from "../middlewares/tenantMiddleware";
import { hashPassword } from "../middlewares/authSessionMiddleware";

const router: IRouter = Router();

const publicClockChallengesReady = db.execute(sql`
  CREATE TABLE IF NOT EXISTS attendance_verification_challenges (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    identifier_hash TEXT NOT NULL,
    device_hash TEXT NOT NULL,
    qr_token_hash TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    proof_token_hash TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).then(async () => {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS attendance_verification_identifier_created_idx
      ON attendance_verification_challenges (identifier_hash, created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS attendance_verification_expires_idx
      ON attendance_verification_challenges (expires_at)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS attendance_sessions_employee_active_idx
      ON attendance_sessions (tenant_id, employee_id, expires_at)
      WHERE revoked_at IS NULL
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS attendance_sessions_expires_idx
      ON attendance_sessions (expires_at)
  `);
}).catch((err: unknown) => {
  logger.error({ err }, "Public clock challenge migration failed");
  throw err;
});

// ── SSE — Eventos en tiempo real ──────────────────────────────────────────────
router.get("/events", (req, res): void => {
  const tid = req.tenantId;
  if (tid === undefined) {
    res.status(403).json({ error: "No autenticado" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  sseBus.addClient(tid, res);

  // Send an initial ping so the client knows the connection is live
  res.write("event: ping\ndata: {}\n\n");

  req.on("close", () => {
    sseBus.removeClient(tid, res);
  });
});

// Keep-alive pings are handled inside sseEmitter.ts via sseBus.pingAll().

// In-memory skip signal per screen (resets on server restart — intentional)
const skipVersions = new Map<number, number>();

const money = (value: number) => Math.round(value * 10000) / 10000;

type PaymentKind =
  | "cash"
  | "card"
  | "transfer"
  | "credit"
  | "points"
  | "bono"
  | "other";
const KNOWN_PAYMENT_KINDS: readonly PaymentKind[] = [
  "cash",
  "card",
  "transfer",
  "credit",
  "points",
  "bono",
  "other",
];

function inferPaymentKindFromValue(
  value: string | null | undefined,
): PaymentKind {
  const v = (value ?? "").toLowerCase().trim();
  if (!v) return "other";
  if (v === "cash" || v.includes("efectivo")) return "cash";
  if (v === "card" || v.includes("tarjeta") || v.includes("card"))
    return "card";
  if (v === "transfer" || v.includes("transfer") || v.includes("trans"))
    return "transfer";
  if (
    v === "credit" ||
    v.includes("credito") ||
    v.includes("crédito") ||
    v.includes("credit")
  )
    return "credit";
  if (v === "points" || v.includes("punto") || v.includes("point"))
    return "points";
  if (v.includes("bono")) return "bono";
  return "other";
}

// ── Startup migrations: transfer requests & min stock ────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ingredient_warehouse_min_stock (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        min_qty NUMERIC(14,4) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ingredient_warehouse_min_stock_unique UNIQUE (warehouse_id, ingredient_id)
      )
    `);
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE transfer_request_status AS ENUM ('pending','approved','executed','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transfer_requests (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id),
        from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        to_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        status transfer_request_status NOT NULL DEFAULT 'pending',
        notes TEXT DEFAULT '',
        requested_by TEXT,
        approved_by TEXT,
        executed_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transfer_request_items (
        id SERIAL PRIMARY KEY,
        transfer_request_id INTEGER NOT NULL REFERENCES transfer_requests(id) ON DELETE CASCADE,
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
        requested_qty NUMERIC(14,4) NOT NULL,
        approved_qty NUMERIC(14,4)
      )
    `);
    await db.execute(sql`
      ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS purchase_unit TEXT,
        ADD COLUMN IF NOT EXISTS units_per_purchase DOUBLE PRECISION
    `);
    await db.execute(sql`
      ALTER TABLE ingredient_movements
        ADD COLUMN IF NOT EXISTS invoice_photo_url TEXT,
        ADD COLUMN IF NOT EXISTS purchased_qty DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS purchase_unit TEXT
    `);
    await db.execute(sql`
      ALTER TABLE production_stages
        ADD COLUMN IF NOT EXISTS generates_label BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS label_expiry_days INTEGER NOT NULL DEFAULT 7
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production_lots (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
        lot_number TEXT NOT NULL,
        qr_code TEXT NOT NULL UNIQUE,
        weight_kg DOUBLE PRECISION NOT NULL,
        packaged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        current_stage_id INTEGER,
        current_stage_name TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        tenant_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production_lot_logs (
        id SERIAL PRIMARY KEY,
        lot_id INTEGER NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
        stage_id INTEGER,
        stage_name TEXT NOT NULL,
        stage_type TEXT,
        scanned_by TEXT,
        input_weight_kg DOUBLE PRECISION,
        output_weight_kg DOUBLE PRECISION,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS client_id TEXT
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS sales_client_id_tenant_idx
        ON sales (tenant_id, client_id)
        WHERE client_id IS NOT NULL
    `);
    await db.execute(sql`
      ALTER TABLE restaurant_tables
        ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await db.execute(sql`
      UPDATE restaurant_tables
        SET is_virtual = TRUE
        WHERE name IN ('__DOMICILIOS__', '__PARA_LLEVAR__')
          AND is_virtual = FALSE
    `);
    // cash_session_status enum: add 'partial' for shift-based partial closes
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'partial'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'cash_session_status')
        ) THEN
          ALTER TYPE cash_session_status ADD VALUE 'partial';
        END IF;
      END $$
    `);
    await db.execute(sql`
      ALTER TABLE cash_sessions
        ADD COLUMN IF NOT EXISTS shift_name TEXT
    `);
    // ── Multi-caja migration ─────────────────────────────────────────────────
    await db.execute(sql`
      ALTER TABLE plans
        ADD COLUMN IF NOT EXISTS max_cajas INTEGER NOT NULL DEFAULT 1
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cajas (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        number INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS cajas_tenant_number_unique
        ON cajas (tenant_id, number)
    `);
    await db.execute(sql`
      ALTER TABLE cash_sessions
        ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES cajas(id)
    `);
    await db.execute(sql`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES cajas(id)
    `);
    await db.execute(sql`
      ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES cajas(id)
    `);
    await db.execute(sql`
      ALTER TABLE deliveries
        ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES cajas(id)
    `);
    // ── Tax system migration ─────────────────────────────────────────────────
    await db.execute(sql`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8,4),
        ADD COLUMN IF NOT EXISTS tax_name TEXT
    `);
    await db.execute(sql`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,4),
        ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8,4),
        ADD COLUMN IF NOT EXISTS tax_name TEXT
    `);
    await db.execute(sql`
      ALTER TABLE sale_items
        ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8,4),
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,4),
        ADD COLUMN IF NOT EXISTS tax_name TEXT
    `);
    // ── Employee Events (Desempeño del personal) ─────────────────────────────
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE employee_event_type AS ENUM ('task','warning','observation','recognition','bonus');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE employee_event_status AS ENUM ('pending','in_progress','completed','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS employee_events (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        type employee_event_type NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status employee_event_status NOT NULL DEFAULT 'pending',
        event_date TEXT,
        due_date TEXT,
        bonus_amount NUMERIC(12,4),
        is_top_employee BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Idempotent column additions for existing tables
    await db.execute(sql`
      ALTER TABLE employee_events ADD COLUMN IF NOT EXISTS event_date TEXT
    `);
    // ── Work Schedules & Shift Swap Requests ──────────────────────────────────
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE work_schedule_status AS ENUM ('scheduled','confirmed','absent','replaced');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS work_schedules (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        work_date TEXT NOT NULL,
        shift_start TEXT NOT NULL,
        shift_end TEXT NOT NULL,
        position TEXT,
        branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        notes TEXT,
        status work_schedule_status NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE shift_swap_status AS ENUM ('pending','approved','rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shift_swap_requests (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        requester_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        schedule_id INTEGER NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
        replacement_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        reason TEXT,
        status shift_swap_status NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        resolved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // ── Checklist Templates & Instances ───────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_templates (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        area TEXT,
        type TEXT NOT NULL DEFAULT 'fixed',
        rotation_mode TEXT NOT NULL DEFAULT 'shift',
        current_rotation_index INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_rotation_members (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_instances (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
        work_schedule_id INTEGER REFERENCES work_schedules(id) ON DELETE SET NULL,
        assigned_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        due_date TEXT NOT NULL,
        completed_at TIMESTAMPTZ,
        completed_by_name TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (template_id, due_date, assigned_employee_id)
      )
    `);
    // ── Checklist sub-tasks (items within a template) ─────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_tasks (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id)
      )
    `);
    await db.execute(sql`
      ALTER TABLE checklist_instances
        ADD COLUMN IF NOT EXISTS item_completions JSONB
    `);
    await db.execute(sql`
      ALTER TABLE checklist_instances
        ADD COLUMN IF NOT EXISTS assigned_task_ids JSONB
    `);
    await db.execute(sql`
      ALTER TABLE checklist_instances
        ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ
    `);
  } catch (err) {
    logger.error({ err }, "Transfer request migration failed");
  }
})();

// Auto-generate checklist instances for today and tomorrow at startup so employees
// always see their tasks without anyone pressing "Generar tareas" manually.
(async () => {
  try {
    const _now = new Date();
    const _bogota = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
    const todayStr = _bogota(_now);
    const tomorrowStr = _bogota(new Date(_now.getTime() + 86_400_000));
    const allTenants = await db.select({ id: tenantsTable.id }).from(tenantsTable);
    for (const tenant of allTenants) {
      for (const dateStr of [todayStr, tomorrowStr]) {
        const schedules = await db
          .select({
            id: workSchedulesTable.id,
            employeeId: workSchedulesTable.employeeId,
            workDate: workSchedulesTable.workDate,
            shiftStart: workSchedulesTable.shiftStart,
            shiftEnd: workSchedulesTable.shiftEnd,
            position: workSchedulesTable.position,
          })
          .from(workSchedulesTable)
          .where(and(eq(workSchedulesTable.tenantId, tenant.id), eq(workSchedulesTable.workDate, dateStr)));
        for (const s of schedules) {
          await generateChecklistInstances({ ...s, tenantId: tenant.id });
        }
      }
    }
    logger.info("Checklist startup auto-generation complete");
  } catch (err) {
    logger.error({ err }, "Checklist startup auto-generation failed");
  }
})();

// Patrona Rooftop opera sin control de inventario. Esta actualización es
// idempotente y está limitada por slug/nombre para no afectar otros tenants.
(async () => {
  try {
    const patronaTenants = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(
        or(
          eq(tenantsTable.slug, "lapatrona012026"),
          sql`LOWER(${tenantsTable.name}) = 'la patrona rooftop'`,
        ),
      );

    for (const tenant of patronaTenants) {
      const migrationKey = `t${tenant.id}__migration_patrona_inventory_disabled_v1`;
      const updatedCount = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(553, ${tenant.id})`);
        const [completed] = await tx
          .select({ value: appSettingsTable.value })
          .from(appSettingsTable)
          .where(eq(appSettingsTable.key, migrationKey))
          .limit(1);
        if (completed?.value === "done") return 0;

        const updated = await tx
          .update(productsTable)
          .set({ tracksInventory: false })
          .where(
            and(
              eq(productsTable.tenantId, tenant.id),
              eq(productsTable.tracksInventory, true),
            ),
          )
          .returning({ id: productsTable.id });
        await tx
          .insert(appSettingsTable)
          .values({ key: migrationKey, value: "done" })
          .onConflictDoUpdate({
            target: appSettingsTable.key,
            set: { value: "done" },
          });
        return updated.length;
      });
      if (updatedCount > 0) {
        logger.info(
          { tenantId: tenant.id, updated: updatedCount },
          "Patrona inventory tracking disabled for existing products",
        );
        sseBus.broadcast(tenant.id, "products_updated");
      }
    }
  } catch (err) {
    logger.error({ err }, "Patrona inventory migration failed");
  }
})();

// ── Per-tenant settings helpers ──────────────────────────────────────────────

async function readSetting(
  tenantId: number | undefined,
  key: string,
  opts?: { noGlobalFallback?: boolean },
): Promise<string | null> {
  if (tenantId !== undefined) {
    const prefixed = `t${tenantId}__${key}`;
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, prefixed));
    if (row) return row.value;
    if (opts?.noGlobalFallback) return null;
  }
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, key));
  return row?.value ?? null;
}

async function readBooleanSetting(
  tenantId: number | undefined,
  key: string,
  fallback: boolean,
): Promise<boolean> {
  return parseBooleanSettingValue(await readSetting(tenantId, key), fallback);
}

async function writeSetting(
  tenantId: number | undefined,
  key: string,
  value: string,
): Promise<void> {
  const actualKey = tenantId !== undefined ? `t${tenantId}__${key}` : key;
  await db
    .insert(appSettingsTable)
    .values({ key: actualKey, value })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: sql`excluded.value` },
    });
}

async function getSalesWarehouseId(
  tenantId: number | undefined,
  branchId?: number | null,
): Promise<number | null> {
  // When a branch context is active, use that branch's warehouse for stock deductions.
  if (branchId) {
    const [branch] = await db
      .select({ warehouseId: branchesTable.warehouseId })
      .from(branchesTable)
      .where(
        and(
          eq(branchesTable.id, branchId),
          tenantId !== undefined ? eq(branchesTable.tenantId, tenantId) : sql`1=1`,
        ),
      );
    if (branch?.warehouseId) return branch.warehouseId;
    // Branch exists but has no warehouse assigned → fall through to global sales warehouse
  }
  const conds =
    tenantId !== undefined
      ? and(
          eq(warehousesTable.tenantId, tenantId),
          eq(warehousesTable.isSalesWarehouse, true),
        )
      : eq(warehousesTable.isSalesWarehouse, true);
  const [wh] = await db
    .select({ id: warehousesTable.id })
    .from(warehousesTable)
    .where(conds);
  return wh?.id ?? null;
}

async function deductFromSalesWarehouse(
  tx: any,
  salesWarehouseId: number,
  consumption: Map<number, number>,
): Promise<void> {
  for (const [ingredientId, needed] of consumption.entries()) {
    const [existing] = await tx
      .select()
      .from(ingredientWarehouseStockTable)
      .where(
        and(
          eq(ingredientWarehouseStockTable.warehouseId, salesWarehouseId),
          eq(ingredientWarehouseStockTable.ingredientId, ingredientId),
        ),
      );
    if (existing) {
      const newQty = Math.max(0, existing.qty - needed);
      await tx
        .update(ingredientWarehouseStockTable)
        .set({ qty: newQty })
        .where(eq(ingredientWarehouseStockTable.id, existing.id));
    }
  }
}

async function removeUntrackedProductInputs(
  queryable: any,
  consumption: Map<number, number>,
  tenantId?: number,
): Promise<void> {
  const productIds = Array.from(consumption.keys());
  if (productIds.length === 0) return;
  const controlledProducts = await queryable
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        inArray(productsTable.id, productIds),
        eq(productsTable.tracksInventory, true),
        tenantId !== undefined ? eq(productsTable.tenantId, tenantId) : undefined,
      ),
    );
  const controlledIds = new Set(
    controlledProducts.map((product: { id: number }) => product.id),
  );
  for (const productId of productIds) {
    if (!controlledIds.has(productId)) consumption.delete(productId);
  }
}

async function restoreToSalesWarehouse(
  tx: any,
  salesWarehouseId: number,
  restoration: Map<number, number>,
): Promise<void> {
  for (const [ingredientId, delta] of restoration.entries()) {
    if (delta <= 0) continue;
    const [existing] = await tx
      .select()
      .from(ingredientWarehouseStockTable)
      .where(
        and(
          eq(ingredientWarehouseStockTable.warehouseId, salesWarehouseId),
          eq(ingredientWarehouseStockTable.ingredientId, ingredientId),
        ),
      );
    if (existing) {
      await tx
        .update(ingredientWarehouseStockTable)
        .set({ qty: existing.qty + delta })
        .where(eq(ingredientWarehouseStockTable.id, existing.id));
    } else {
      await tx.insert(ingredientWarehouseStockTable).values({
        warehouseId: salesWarehouseId,
        ingredientId,
        qty: delta,
      });
    }
  }
}

async function getSalesWarehouseStock(
  warehouseId: number,
  ingredientIds: number[],
): Promise<Map<number, number>> {
  if (ingredientIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(ingredientWarehouseStockTable)
    .where(
      and(
        eq(ingredientWarehouseStockTable.warehouseId, warehouseId),
        inArray(ingredientWarehouseStockTable.ingredientId, ingredientIds),
      ),
    );
  return new Map(rows.map((r) => [Number(r.ingredientId), Number(r.qty)]));
}

// ── Multi-tenant ownership guards ─────────────────────────────────────────────
// These helpers verify row ownership before mutations on tables that don't carry
// tenantId directly (they resolve ownership via a parent table that does).

/** Verifica que un cliente pertenece al tenant activo. Responde 404 y retorna false si no. */
async function assertCustomerTenant(
  customerId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<boolean> {
  if (tenantId === undefined) return true;
  const [row] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.tenantId, tenantId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return false;
  }
  return true;
}

/** Verifica que un empleado pertenece al tenant activo. Responde 404 y retorna false si no. */
async function assertEmployeeTenant(
  employeeId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<boolean> {
  if (tenantId === undefined) return true;
  const [row] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, employeeId),
        eq(employeesTable.tenantId, tenantId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return false;
  }
  return true;
}

/** Carga una entrada de fichaje y verifica que pertenece al tenant (vía empleado). */
async function assertTimeEntryTenant(
  entryId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<typeof timeEntriesTable.$inferSelect | null> {
  const [entry] = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.id, entryId));
  if (!entry) {
    res.status(404).json({ error: "Entrada no encontrada" });
    return null;
  }
  if (tenantId !== undefined) {
    const ok = await assertEmployeeTenant(entry.employeeId, tenantId, res);
    if (!ok) return null;
  }
  return entry;
}

/** Carga un registro de asistencia y verifica que pertenece al tenant (vía empleado). */
async function assertAttendanceTenant(
  attendanceId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<typeof payrollAttendanceTable.$inferSelect | null> {
  const [att] = await db
    .select()
    .from(payrollAttendanceTable)
    .where(eq(payrollAttendanceTable.id, attendanceId));
  if (!att) {
    res.status(404).json({ error: "Registro no encontrado" });
    return null;
  }
  if (tenantId !== undefined) {
    const ok = await assertEmployeeTenant(att.employeeId, tenantId, res);
    if (!ok) return null;
  }
  return att;
}

/** Carga un bono y verifica que pertenece al tenant (vía cliente). */
async function assertBonusTenant(
  bonusId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<typeof customerBonusesTable.$inferSelect | null> {
  const [bonus] = await db
    .select()
    .from(customerBonusesTable)
    .where(eq(customerBonusesTable.id, bonusId));
  if (!bonus) {
    res.status(404).json({ error: "Bono no encontrado" });
    return null;
  }
  if (tenantId !== undefined) {
    const ok = await assertCustomerTenant(bonus.customerId, tenantId, res);
    if (!ok) return null;
  }
  return bonus;
}

/** Carga un período de nómina y verifica que pertenece al tenant activo. Retorna el período o null. */
async function assertPayrollPeriodTenant(
  periodId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<typeof payrollPeriodsTable.$inferSelect | null> {
  const [period] = await db
    .select()
    .from(payrollPeriodsTable)
    .where(
      tenantId !== undefined
        ? and(
            eq(payrollPeriodsTable.id, periodId),
            eq(payrollPeriodsTable.tenantId, tenantId),
          )
        : eq(payrollPeriodsTable.id, periodId),
    );
  if (!period) {
    res.status(404).json({ error: "Período no encontrado" });
    return null;
  }
  return period;
}

/** Carga un registro de nómina y verifica que pertenece al tenant activo (vía período). Retorna el registro o null. */
async function assertPayrollRecordTenant(
  recordId: number,
  tenantId: number | undefined,
  res: import("express").Response,
): Promise<typeof payrollRecordsTable.$inferSelect | null> {
  const [record] = await db
    .select()
    .from(payrollRecordsTable)
    .where(eq(payrollRecordsTable.id, recordId));
  if (!record) {
    res.status(404).json({ error: "Registro no encontrado" });
    return null;
  }
  if (tenantId !== undefined) {
    const period = await assertPayrollPeriodTenant(record.periodId, tenantId, res);
    if (!period) return null;
  }
  return record;
}

// ─────────────────────────────────────────────────────────────────────────────

async function loadPaymentMethodsMap(
  tenantId?: number,
): Promise<Map<string, PaymentKind>> {
  const raw = await readSetting(tenantId, "payment_methods");
  const map = new Map<string, PaymentKind>();
  if (raw) {
    try {
      const list = JSON.parse(raw) as Array<{
        value?: string;
        kind?: string;
      }>;
      for (const m of list) {
        if (!m?.value) continue;
        const k =
          m.kind && (KNOWN_PAYMENT_KINDS as readonly string[]).includes(m.kind)
            ? (m.kind as PaymentKind)
            : inferPaymentKindFromValue(m.value);
        map.set(m.value, k);
      }
    } catch {}
  }
  for (const v of ["cash", "card", "transfer", "credit", "points"] as const) {
    if (!map.has(v)) map.set(v, v);
  }
  return map;
}

function resolveKind(
  map: Map<string, PaymentKind>,
  value: string | null | undefined,
): PaymentKind {
  if (!value) return "other";
  return map.get(value) ?? inferPaymentKindFromValue(value);
}

async function getLoyaltyConfig(tenantId?: number) {
  const [enabled, mode, amountPerPoint, pointsPerPurchase, redemptionValue, pointsPerPqrs] =
    await Promise.all([
      readSetting(tenantId, "loyalty_enabled"),
      readSetting(tenantId, "loyalty_mode"),
      readSetting(tenantId, "loyalty_amount_per_point"),
      readSetting(tenantId, "loyalty_points_per_purchase"),
      readSetting(tenantId, "loyalty_redemption_value"),
      readSetting(tenantId, "loyalty_points_per_pqrs"),
    ]);
  return {
    enabled: enabled === "true",
    mode: (mode ?? "amount") as "amount" | "purchase",
    amountPerPoint: Number(amountPerPoint ?? 10000),
    pointsPerPurchase: Number(pointsPerPurchase ?? 1),
    redemptionValue: Number(redemptionValue ?? 1000),
    pointsPerPqrs: Number(pointsPerPqrs ?? 0),
  };
}

async function computeAndAwardPoints(
  tx: any,
  customerId: number,
  saleAmount: number,
  saleId?: number,
  receiptNumber?: string,
  tenantId?: number,
): Promise<number> {
  const cfg = await getLoyaltyConfig(tenantId);
  if (!cfg.enabled) return 0;
  let earned = 0;
  if (cfg.mode === "amount") {
    earned = Math.floor(saleAmount / cfg.amountPerPoint);
  } else {
    earned = cfg.pointsPerPurchase;
  }
  if (earned <= 0) return 0;
  const [updated] = await tx
    .update(customersTable)
    .set({ loyaltyPoints: sql`loyalty_points + ${earned}` })
    .where(eq(customersTable.id, customerId))
    .returning({ balance: customersTable.loyaltyPoints });
  await tx.insert(loyaltyMovementsTable).values({
    customerId,
    type: "earn",
    delta: earned,
    balanceAfter: updated?.balance ?? 0,
    reference: receiptNumber,
    saleId: saleId ?? null,
  });
  return earned;
}

function genBonusCode(): string {
  return "BN-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const productResponse = (product: Product) =>
  ({
    ...product,
    imageUrl: product.imageUrl ?? undefined,
    description: product.description ?? undefined,
  }) satisfies typeof ListProductsResponseItem._type;

const expenseResponse = (expense: Expense) => expense;

const saleResponse = (sale: Sale, items: SaleItem[]) =>
  ({
    ...sale,
    customerName: sale.customerName ?? undefined,
    employeeId: sale.employeeId ?? undefined,
    employeeCreditEmployeeId: sale.employeeCreditEmployeeId ?? undefined,
    paymentMethod: sale.paymentMethod,
    tableId: sale.tableId ?? undefined,
    tableName: sale.tableName ?? undefined,
    tableArea: sale.tableArea ?? undefined,
    serverName: sale.serverName ?? undefined,
    voidedAt: sale.voidedAt ?? undefined,
    voidReason: sale.voidReason ?? undefined,
    emailSentAt: sale.emailSentAt ?? undefined,
    feStatus: sale.feStatus ?? undefined,
    cufe: sale.cufe ?? undefined,
    fePdfUrl: sale.fePdfUrl ?? undefined,
    feXmlUrl: sale.feXmlUrl ?? undefined,
    feEmittedAt: sale.feEmittedAt ?? undefined,
    cashAmountTendered: sale.cashAmountTendered ?? undefined,
    taxAmount: sale.taxAmount ?? undefined,
    taxPercent: sale.taxPercent ?? undefined,
    taxName: sale.taxName ?? undefined,
    items,
  }) satisfies typeof ListSalesResponseItem._type;

// ── Helpers de inventario para DOMICILIOS estándalone ────────────────────────
//
// Un domicilio creado fuera del POS (consumesInventory=true) debe descontar
// ingredientes igual que una venta POS / orden de mesa. Los items del JSON
// pueden tener o no productId — si lo tienen y el producto tiene receta,
// consumimos los ingredientes según la receta. Se aplican las mismas reglas
// que en POST /sales: rechazar si producto no tiene receta o si falta stock.
//
// Devuelve { error, status } cuando falla la validación, null cuando se
// consumió correctamente.
type DeliveryItemForInventory = {
  productId?: number | null;
  name?: string;
  qty?: number;
};
async function consumeDeliveryIngredients(
  tx: any,
  rawItems: unknown,
  tenantId?: number,
): Promise<{ error: string; status: number } | null> {
  let items: DeliveryItemForInventory[];
  try {
    items = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
  } catch {
    return { error: "Items inválidos", status: 400 };
  }
  if (!Array.isArray(items)) return null;

  const productItems = items
    .map((it) => ({
      productId: Number(it?.productId ?? 0),
      name: String(it?.name ?? ""),
      qty: Number(it?.qty ?? 0),
    }))
    .filter((it) => it.productId > 0 && it.qty > 0);
  if (productItems.length === 0) return null;

  const productIds = Array.from(
    new Set(productItems.map((it) => it.productId)),
  );
  const products = await tx
    .select()
    .from(productsTable)
    .where(
      and(
        inArray(productsTable.id, productIds),
        tenantId !== undefined ? eq(productsTable.tenantId, tenantId) : undefined,
      ),
    );
  const productById = new Map<number, (typeof products)[number]>(
    products.map((p: (typeof products)[number]) => [p.id, p]),
  );
  const recipeRows = await tx
    .select()
    .from(productRecipesTable)
    .where(inArray(productRecipesTable.productId, productIds));
  const recipesByProduct = new Map<number, typeof recipeRows>();
  for (const row of recipeRows) {
    const list = recipesByProduct.get(row.productId) ?? [];
    list.push(row);
    recipesByProduct.set(row.productId, list);
  }

  // Validar receta obligatoria para cada producto del cat\u00e1logo presente.
  for (const it of productItems) {
    const product = productById.get(it.productId);
    if (!product) {
      return {
        error: `El producto "${it.name || it.productId}" ya no existe.`,
        status: 409,
      };
    }
    if (product.tracksInventory === false) continue;
    const rows = recipesByProduct.get(product.id) ?? [];
    // Sin receta configurada → siempre vendible, sin deducción de ingredientes
    if (!product.hasRecipe) continue;
    // hasRecipe=true pero sin filas → inconsistencia de datos
    if (rows.length === 0) {
      return {
        error: `El producto "${product.name}" no tiene receta configurada. Configura la receta antes de venderlo.`,
        status: 409,
      };
    }
  }

  const deliveryInventory = computeSaleInventoryPlan({
    tenantId,
    items: productItems.map((item) => ({
      productId: item.productId,
      quantity: item.qty,
    })),
    products,
    recipes: recipeRows,
  });
  const consumption = deliveryInventory.ingredientConsumption;
  const directProductConsumption = deliveryInventory.directProductConsumption;
  const inputProductConsumption = deliveryInventory.inputProductConsumption;
  await removeUntrackedProductInputs(tx, inputProductConsumption, tenantId);

  for (const [productId, needed] of directProductConsumption.entries()) {
    const product = productById.get(productId);
    const updated = await tx
      .update(productsTable)
      .set({ stock: sql`${productsTable.stock} - ${needed}` })
      .where(
        and(
          eq(productsTable.id, productId),
          tenantId !== undefined ? eq(productsTable.tenantId, tenantId) : undefined,
          gte(productsTable.stock, needed),
        ),
      )
      .returning({ id: productsTable.id });
    if (updated.length === 0) {
      return {
        error: `No hay suficiente "${product?.name ?? `producto #${productId}`}" para preparar el domicilio.`,
        status: 400,
      };
    }
  }

  for (const [productId, needed] of inputProductConsumption.entries()) {
    const updated = await tx
      .update(productsTable)
      .set({ stock: sql`${productsTable.stock} - ${needed}` })
      .where(
        and(
          eq(productsTable.id, productId),
          tenantId !== undefined ? eq(productsTable.tenantId, tenantId) : undefined,
          gte(productsTable.stock, needed),
        ),
      )
      .returning({ id: productsTable.id });
    if (updated.length === 0) {
      return {
        error: `No hay suficiente producto intermedio #${productId} para preparar el domicilio.`,
        status: 400,
      };
    }
  }

  // Validar y descontar SOLO de la bodega de ventas activa.
  const ingredientIds = Array.from(consumption.keys());
  if (ingredientIds.length === 0) return null;

  const deliverySalesWhId = await getSalesWarehouseId(tenantId);
  if (!deliverySalesWhId) {
    return {
      error: "No hay bodega de ventas configurada para este tenant.",
      status: 400,
    };
  }

  const whStockMap = await getSalesWarehouseStock(
    deliverySalesWhId,
    ingredientIds,
  );

  // Cargar nombres de ingredientes para mensajes de error
  const ingRows = await tx
    .select({ id: ingredientsTable.id, name: ingredientsTable.name })
    .from(ingredientsTable)
    .where(inArray(ingredientsTable.id, ingredientIds));
  const ingredientNameById = new Map(
    ingRows.map((i: { id: any; name: any }) => [i.id, i.name]),
  );

  for (const [ingredientId, needed] of consumption.entries()) {
    const available = whStockMap.get(ingredientId) ?? 0;
    if (available < needed) {
      return {
        error: `No hay suficiente ${ingredientNameById.get(ingredientId) ?? "ingrediente"} para preparar el domicilio.`,
        status: 400,
      };
    }
  }

  // Descontar de la bodega de ventas.
  await deductFromSalesWarehouse(tx, deliverySalesWhId, consumption);

  // Descontar del stock operativo del turno (best-effort) — domicilio.
  if (tenantId) {
    for (const [ingId, needed] of consumption.entries()) {
      await tx
        .update(operationalStockTable)
        .set({ qty: sql`GREATEST(0, ${operationalStockTable.qty} - ${needed})`, updatedAt: new Date() })
        .where(and(eq(operationalStockTable.tenantId, tenantId), eq(operationalStockTable.ingredientId, ingId)));
    }
  }

  return null;
}

async function restoreDeliveryIngredients(
  tx: any,
  rawItems: unknown,
): Promise<void> {
  let items: DeliveryItemForInventory[];
  try {
    items = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
  } catch (err) {
    logger.warn({ err }, "restoreDeliveryIngredients: invalid items JSON, skipping");
    return;
  }
  if (!Array.isArray(items)) return;

  const productItems = items
    .map((it) => ({
      productId: Number(it?.productId ?? 0),
      qty: Number(it?.qty ?? 0),
    }))
    .filter((it) => it.productId > 0 && it.qty > 0);
  if (productItems.length === 0) return;

  const productIds = Array.from(
    new Set(productItems.map((it) => it.productId)),
  );
  const recipeRows = await tx
    .select()
    .from(productRecipesTable)
    .where(inArray(productRecipesTable.productId, productIds));
  if (recipeRows.length === 0) return;
  const recipesByProduct = new Map<number, typeof recipeRows>();
  for (const row of recipeRows) {
    const list = recipesByProduct.get(row.productId) ?? [];
    list.push(row);
    recipesByProduct.set(row.productId, list);
  }
  const restoration = new Map<number, number>();
  for (const it of productItems) {
    const rows = recipesByProduct.get(it.productId) ?? [];
    for (const row of rows) {
      const delta = it.qty * Number(row.quantity);
      restoration.set(
        row.ingredientId,
        (restoration.get(row.ingredientId) ?? 0) + delta,
      );
    }
  }
  // Restaurar en la bodega de ventas activa (si existe).
  const restoreDeliverySalesWhId = await getSalesWarehouseId(undefined);
  if (restoreDeliverySalesWhId && restoration.size > 0) {
    await restoreToSalesWarehouse(tx, restoreDeliverySalesWhId, restoration);
  }
}

// CORRECCIÓN DE TIPO: Usamos `any` para evitar conflictos de versiones de Drizzle
async function restoreInventoryForItems(
  tx: any,
  items: ConsumedItem[],
): Promise<void> {
  const productIds = Array.from(new Set(items.map((i) => i.productId))).filter(
    (id) => id > 0,
  );
  if (productIds.length === 0) return;

  for (const item of items) {
    if (item.quantity <= 0) continue;
    await tx
      .update(productsTable)
      .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
      .where(eq(productsTable.id, item.productId!));
  }

  const recipes = await tx
    .select()
    .from(productRecipesTable)
    .where(inArray(productRecipesTable.productId, productIds));
  if (recipes.length === 0) return;

  const restoration = computeIngredientRestoration(items, recipes);
  // Restaurar en la bodega de ventas activa (si existe) — inferimos tenantId desde los productos si es posible.
  if (restoration.size > 0) {
    // Buscamos la bodega de ventas del tenant del primer producto.
    const [firstProd] = await tx
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, productIds[0]));
    const restoreWhId = await getSalesWarehouseId(
      firstProd?.tenantId ?? undefined,
    );
    if (restoreWhId) {
      await restoreToSalesWarehouse(tx, restoreWhId, restoration);
    }
  }
}

// CORRECCIÓN DE TIPO: Usamos `any` para evitar conflictos de versiones de Drizzle
async function reverseSaleInventoryAndPayments(
  tx: any,
  args: {
    items: ConsumedItem[];
    sale: typeof salesTable.$inferSelect | null;
    voidReason: string | null;
    refundCajaId?: number | null;
  },
  tenantId?: number,
): Promise<typeof salesTable.$inferSelect | null> {
  const { items, sale, voidReason, refundCajaId } = args;
  if (sale?.voidedAt) return sale;

  await restoreInventoryForItems(tx, items);

  if (!sale) return null;

  const kindMap = await loadPaymentMethodsMap(tenantId);
  const saleKind = resolveKind(kindMap, sale.paymentMethod);

  if (sale.customerId && saleKind === "credit") {
    const [updated] = await tx
      .update(customersTable)
      .set({ creditBalance: sql`credit_balance - ${sale.subtotal}` })
      .where(eq(customersTable.id, sale.customerId))
      .returning({ balance: customersTable.creditBalance });
    await tx.insert(creditMovementsTable).values({
      customerId: sale.customerId,
      type: "payment",
      amount: sale.subtotal,
      balanceAfter: updated?.balance ?? 0,
      reference: `VOID:${sale.receiptNumber}`,
      saleId: sale.id,
    });
  }

  if (sale.customerId && saleKind === "points") {
    const cfg = await getLoyaltyConfig(tenantId);
    const pointsToReturn = Math.ceil(sale.subtotal / cfg.redemptionValue);
    const [updated] = await tx
      .update(customersTable)
      .set({ loyaltyPoints: sql`loyalty_points + ${pointsToReturn}` })
      .where(eq(customersTable.id, sale.customerId))
      .returning({ balance: customersTable.loyaltyPoints });
    await tx.insert(loyaltyMovementsTable).values({
      customerId: sale.customerId,
      type: "earn",
      delta: pointsToReturn,
      balanceAfter: updated?.balance ?? 0,
      reference: `VOID:${sale.receiptNumber}`,
      saleId: sale.id,
    });
  }

  if (
    sale.customerId &&
    sale.loyaltyPointsEarned > 0 &&
    saleKind !== "points"
  ) {
    const earned = sale.loyaltyPointsEarned;
    const [updated] = await tx
      .update(customersTable)
      .set({ loyaltyPoints: sql`GREATEST(loyalty_points - ${earned}, 0)` })
      .where(eq(customersTable.id, sale.customerId))
      .returning({ balance: customersTable.loyaltyPoints });
    await tx.insert(loyaltyMovementsTable).values({
      customerId: sale.customerId,
      type: "redeem",
      delta: -earned,
      balanceAfter: updated?.balance ?? 0,
      reference: `VOID:${sale.receiptNumber}`,
      saleId: sale.id,
    });
  }
  if (!tenantId) throw new Error("TENANT_REQUIRED_FOR_REFUND");
  const refundPayments =
    sale.payments && sale.payments.length > 0
      ? sale.payments
      : [{ method: sale.paymentMethod, amount: sale.subtotal }];
  await tx
    .insert(saleRefundsTable)
    .values({
      saleId: sale.id,
      tenantId,
      cajaId: refundCajaId ?? sale.cajaId ?? null,
      receiptNumber: sale.receiptNumber,
      reason: voidReason ?? "Venta anulada",
      amount: sale.subtotal,
      paymentMethod: sale.paymentMethod,
      payments: refundPayments,
    })
    .onConflictDoNothing({ target: saleRefundsTable.saleId });

  // Atomic claim: solo una transacción concurrente puede ganar este UPDATE.
  // Si la venta ya fue anulada por otra petición concurrente, devuelve 0 filas
  // y el throw hace rollback de todo lo anterior (incluida la restauración de stock).
  const [updatedSale] = await tx
    .update(salesTable)
    .set({ voidedAt: new Date(), voidReason })
    .where(and(eq(salesTable.id, sale.id), isNull(salesTable.voidedAt)))
    .returning();
  if (!updatedSale) throw new Error("ALREADY_VOIDED");
  return updatedSale;
}

const restaurantOrderItemResponse = (item: RestaurantOrderItem) => ({
  ...item,
  productId: item.productId!,
  notes: item.notes ?? undefined,
  personLabel: item.personLabel ?? undefined,
  station: item.station ?? null,
  printedQty: item.printedQty ?? 0,
  servedQty: item.servedQty ?? 0,
});

const KITCHEN_STATIONS = [
  "kitchen",
  "bar",
  "cold",
  "grill",
  "dessert",
] as const;
const DEFAULT_STATION = "kitchen";

const resolveStation = async (
  productId: number,
  tenantId?: number,
): Promise<string> => {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      tenantId !== undefined
        ? and(
            eq(productsTable.id, productId),
            eq(productsTable.tenantId, tenantId),
          )
        : eq(productsTable.id, productId),
    );
  if (!product) return DEFAULT_STATION;
  // Scope the category lookup by tenant. Category names are not globally
  // unique — two tenants can both have "HAMBURGUESAS" with different stations.
  // Without the tenant filter the query may return another tenant's row,
  // assigning a station that doesn't match this tenant's KDS tabs.
  const [cat] = await db
    .select()
    .from(categoriesTable)
    .where(
      tenantId !== undefined
        ? and(
            eq(categoriesTable.name, product.category),
            eq(categoriesTable.tenantId, tenantId),
          )
        : eq(categoriesTable.name, product.category),
    );
  const raw = cat?.station?.trim().toLowerCase();
  // Allow any non-empty station value so custom KDS tab IDs (e.g. "parrilla",
  // "licuados") flow through directly. Only fall back to DEFAULT_STATION when
  // the category has no station configured at all.
  return raw || DEFAULT_STATION;
};

const restaurantOrderResponse = (
  order: RestaurantOrder,
  items: RestaurantOrderItem[],
) =>
  ({
    ...order,
    tableId: order.tableId!,
    customerName: order.customerName ?? undefined,
    closedAt: order.closedAt ?? undefined,
    items: items.map(restaurantOrderItemResponse),
  }) satisfies typeof UpdateRestaurantOrderItemResponse._type;

const restaurantTableResponse = (
  table: RestaurantTable,
  openOrder?: ReturnType<typeof restaurantOrderResponse>,
) =>
  ({
    ...table,
    openOrder,
  }) as any;
ListRestaurantTablesResponseItem._type;

const getSalesWithItems = async (tenantId?: number, startDate?: Date, endDate?: Date) => {
  const conditions = [];
  if (tenantId) conditions.push(eq(salesTable.tenantId, tenantId));
  if (startDate) conditions.push(gte(salesTable.createdAt, startDate));
  if (endDate) conditions.push(lte(salesTable.createdAt, endDate));
  const sales = await db
    .select()
    .from(salesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salesTable.createdAt));
  if (sales.length === 0) return [];
  const saleIds = sales.map((s) => s.id);
  const items = await db
    .select()
    .from(saleItemsTable)
    .where(inArray(saleItemsTable.saleId, saleIds));
  const itemsBySale = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsBySale.get(item.saleId) ?? [];
    list.push(item);
    itemsBySale.set(item.saleId, list);
  }
  return sales.map((sale) =>
    saleResponse(sale, itemsBySale.get(sale.id) ?? []),
  );
};

const shouldIncludeSaleInSession = (
  sale: Sale,
  session: CashSession,
  end: Date,
  refunds: Array<typeof saleRefundsTable.$inferSelect>,
) => {
  if (!sale.voidedAt) return true;
  if (session.status !== "open" && session.closedAt != null && sale.voidedAt > end) {
    return true;
  }
  return refunds.some(
    (refund) =>
      refund.saleId === sale.id &&
      refund.createdAt >= session.openedAt &&
      (session.closedAt == null || refund.createdAt <= end),
  );
};

const calculateCashSession = (
  session: CashSession,
  sales: Sale[],
  expenses: Expense[],
  kindMap: Map<string, PaymentKind>,
  deliveries: any[] = [],
  refunds: Array<typeof saleRefundsTable.$inferSelect> = [],
) => {
  const end = session.closedAt ?? new Date();
  const cajaId = (session as any).cajaId as number | null | undefined;
  const isClosed = session.status !== "open" && session.closedAt != null;

  // Multi-caja mode: if session has a cajaId, filter sales/expenses by cajaId to avoid overlap
  // across simultaneous open sessions.
  const sessionSales = cajaId != null
    ? sales.filter(s =>
        (s as any).cajaId === cajaId &&
        s.createdAt >= session.openedAt &&
        s.createdAt <= end &&
        shouldIncludeSaleInSession(s, session, end, refunds)
      )
    : sales.filter(s =>
        s.createdAt >= session.openedAt &&
        s.createdAt <= end &&
        shouldIncludeSaleInSession(s, session, end, refunds)
      );
  const isLegacyRefund = (expense: Expense) =>
    ["devolución", "devolucion"].includes(expense.category.trim().toLowerCase());
  const operatingExpenses = expenses.filter((expense) => !isLegacyRefund(expense));
  const legacyRefundExpenses = expenses.filter(isLegacyRefund);
  const sessionExpenses = cajaId != null
    ? operatingExpenses.filter(e => {
        const expCajaId = (e as any).cajaId as number | null | undefined;
        if (expCajaId != null) return expCajaId === cajaId;
        // Legacy expenses without cajaId fall back to time-window
        return e.createdAt >= session.openedAt && e.createdAt <= end;
      })
    : operatingExpenses.filter(e => e.createdAt >= session.openedAt && e.createdAt <= end);
  const sessionLegacyRefunds = cajaId != null
    ? legacyRefundExpenses.filter((expense) => {
        const expenseCajaId = expense.cajaId;
        return (expenseCajaId == null || expenseCajaId === cajaId) &&
          expense.createdAt >= session.openedAt &&
          expense.createdAt <= end;
      })
    : legacyRefundExpenses.filter(
        (expense) => expense.createdAt >= session.openedAt && expense.createdAt <= end,
      );
  const sessionDeliveries = deliveries.filter(d =>
    d.status !== 'cancelled' &&
    (cajaId == null || d.cajaId === cajaId) &&
    d.createdAt >= session.openedAt &&
    d.createdAt <= end
  );
  const sessionRefunds = cajaId != null
    ? refunds.filter(r =>
        r.cajaId === cajaId &&
        r.createdAt >= session.openedAt &&
        r.createdAt <= end
      )
    : refunds.filter(r => r.createdAt >= session.openedAt && r.createdAt <= end);

  const calculatedCashSales = sessionSales.reduce((total, s) => {
    const pmts = (s as any).payments as { method: string; amount: number }[] | null | undefined;
    if (pmts && pmts.length > 0) {
      return total + pmts.filter(p => resolveKind(kindMap, p.method) === "cash").reduce((t, p) => t + p.amount, 0);
    }
    return total + (resolveKind(kindMap, s.paymentMethod) === "cash" ? s.subtotal : 0);
  }, 0) +
    sessionDeliveries
    .filter(d => resolveKind(kindMap, d.paymentMethod) === "cash")
    .reduce((t, d) => t + d.total, 0);

  const calculatedCashExpenses = sessionExpenses
    .filter(e => resolveKind(kindMap, e.paymentMethod) === "cash")
    .reduce((t, e) => t + e.amount, 0);
  const calculatedCashRefunds = sessionRefunds.reduce((total, refund) => {
    if (refund.payments.length > 0) {
      return total + refund.payments
        .filter((p) => resolveKind(kindMap, p.method) === "cash")
        .reduce((sum, p) => sum + Number(p.amount), 0);
    }
    return total + (resolveKind(kindMap, refund.paymentMethod) === "cash" ? refund.amount : 0);
  }, 0) + sessionLegacyRefunds
    .filter((expense) => resolveKind(kindMap, expense.paymentMethod) === "cash")
    .reduce((total, expense) => total + expense.amount, 0);

  // Once a session is closed, its stored totals are the accounting snapshot.
  // A later void must be reported in the later session without rewriting the
  // earlier close. For old sessions, infer the cash refund total from that
  // snapshot because cash_refunds was added after the original schema.
  const cashSales = isClosed ? Number(session.cashSales) : calculatedCashSales;
  const cashExpenses = isClosed ? Number(session.cashExpenses) : calculatedCashExpenses;
  const cashRefunds = isClosed
    ? Math.max(0, Number(session.openingBalance) + cashSales - cashExpenses - Number(session.expectedBalance))
    : calculatedCashRefunds;
  const totalDiscounts = 
    sessionSales.reduce((t, s) => t + (Number((s as any).discountAmount) || 0), 0) +
    sessionDeliveries.reduce((t, d) => t + (Number((d as any).discountAmount) || 0), 0) +
    sessionSales.filter(s => resolveKind(kindMap, s.paymentMethod) === "bono").reduce((t, s) => t + s.subtotal, 0) +
    sessionDeliveries.filter(d => resolveKind(kindMap, d.paymentMethod) === "bono").reduce((t, d) => t + d.total, 0);

  const expectedBalance = isClosed
    ? Number(session.expectedBalance)
    : Number(session.openingBalance) + cashSales - cashExpenses - cashRefunds;
  const discrepancy = session.actualBalance != null ? Number(session.actualBalance) - expectedBalance : 0;

  return {
    ...session,
    notes: session.notes ?? undefined,
    closedAt: session.closedAt ?? null,
    actualBalance: session.actualBalance != null ? Number(session.actualBalance) : undefined,
    discrepancy: money(discrepancy),

    cashSales: money(cashSales),
    cashExpenses: money(cashExpenses),
    cashRefunds: money(cashRefunds),
    expectedBalance: money(expectedBalance),
    totalDiscounts: money(totalDiscounts),
  };
};

const getCashSessions = async (tenantId?: number, cajaId?: number) => {
  const sessionConditions = [
    tenantId ? eq(cashSessionsTable.tenantId, tenantId) : undefined,
    cajaId ? eq(cashSessionsTable.cajaId, cajaId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const [sessions, sales, expenses, deliveries, refunds, kindMap] = await Promise.all([
    db.select().from(cashSessionsTable).where(sessionConditions.length ? and(...sessionConditions) : undefined).orderBy(desc(cashSessionsTable.openedAt)),
    db.select().from(salesTable).where(tenantId ? eq(salesTable.tenantId, tenantId) : undefined),
    db.select().from(expensesTable).where(tenantId ? eq(expensesTable.tenantId, tenantId) : undefined),
    db.select().from(deliveriesTable).where(tenantId ? eq(deliveriesTable.tenantId, tenantId) : undefined), // <--- TRAER DOMICILIOS
    db.select().from(saleRefundsTable).where(tenantId ? eq(saleRefundsTable.tenantId, tenantId) : undefined),
    loadPaymentMethodsMap(tenantId),
  ]);

  return sessions.map((session) =>
    // Pasamos también los deliveries al cálculo
    calculateCashSession(session, sales, expenses, kindMap, deliveries, refunds)
  );
};

const getRestaurantOrder = async (orderId: number, tenantId?: number) => {
  const [order] = await db
    .select()
    .from(restaurantOrdersTable)
    .where(eq(restaurantOrdersTable.id, orderId));
  if (!order) return undefined;

  // Verify the order's table belongs to the requesting tenant
  if (tenantId !== undefined) {
    const [table] = await db
      .select({ tenantId: restaurantTablesTable.tenantId })
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, order.tableId!));
    if (!table || table.tenantId !== tenantId) return undefined;
  }

  const items = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.orderId, order.id));

  return restaurantOrderResponse(order, items);
};

const recalculateRestaurantOrder = async (
  orderId: number,
  tenantId?: number,
) => {
  const items = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.orderId, orderId));
  const subtotal = money(
    items.reduce((total, item) => total + item.lineTotal, 0),
  );
  await db
    .update(restaurantOrdersTable)
    .set({ subtotal, updatedAt: new Date() })
    .where(eq(restaurantOrdersTable.id, orderId));
  return getRestaurantOrder(orderId, tenantId);
};

const getRestaurantTables = async (tenantId?: number) => {
  try {
    const tables = await db
      .select()
      .from(restaurantTablesTable)
      .where(
        and(
          tenantId ? eq(restaurantTablesTable.tenantId, tenantId) : undefined,
          eq(restaurantTablesTable.isVirtual, false),
        ),
      )
      .orderBy(restaurantTablesTable.name);

    if (tables.length === 0) return [];

    const tableIds = tables.map((t) => t.id);
    const orders = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          inArray(restaurantOrdersTable.status, ["open", "awaiting_payment"]),
          inArray(restaurantOrdersTable.tableId, tableIds),
        ),
      );

    const openOrderIds = orders.map((o) => o.id);
    const items =
      openOrderIds.length > 0
        ? await db
            .select()
            .from(restaurantOrderItemsTable)
            .where(inArray(restaurantOrderItemsTable.orderId, openOrderIds))
        : [];

    return tables.map((table) => {
      const openOrder = orders.find((order) => order.tableId === table.id);
      const tableItems = openOrder
        ? items.filter((it) => it.orderId === openOrder.id)
        : [];
      const hasKitchenItems = tableItems.some((it) => (it.printedQty ?? 0) > 0);
      const effectiveStatus: RestaurantTable["status"] = openOrder
        ? openOrder.status === "awaiting_payment"
          ? "pending_payment"
          : hasKitchenItems
            ? ("in_process" as RestaurantTable["status"])
            : "occupied"
        : table.status === "occupied"
          ? "available"
          : table.status;
      return restaurantTableResponse(
        { ...table, status: effectiveStatus },
        openOrder ? restaurantOrderResponse(openOrder, tableItems) : undefined,
      );
    });
  } catch (error) {
    logger.error({ err: error }, "Error al cargar mesas");
    return [];
  }
};

router.get("/restaurant/tables", async (req, res): Promise<void> => {
  try {
    res.json(
      ListRestaurantTablesResponse.parse(await getRestaurantTables(req.tenantId)),
    );
  } catch (err) {
    req.log.error({ err }, "GET /restaurant/tables failed");
    res.status(500).json({ error: "Error al obtener las mesas" });
  }
});

// CORRECCIÓN TypeScript: Return explícito para asegurar Promise<void>
router.post("/restaurant/tables", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.create)) return;
  try {
    const parsed = CreateRestaurantTableBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [table] = await db
      .insert(restaurantTablesTable)
      .values({
        name: parsed.data.name,
        area: parsed.data.area || "General",
        capacity: parsed.data.capacity || 4,
        status: "available",
        tenantId: req.tenantId ?? null,
      })
      .returning();
    res
      .status(201)
      .json(
        ListRestaurantTablesResponseItem.parse(restaurantTableResponse(table)),
      );
  } catch (error: any) {
    const msg = String(error?.message ?? "").toLowerCase();
    if (
      msg.includes("unique") ||
      msg.includes("duplicate") ||
      msg.includes("restaurant_tables_name_tenant_idx")
    ) {
      res.status(409).json({ error: "Ya existe una mesa con ese nombre" });
    } else {
      res.status(500).json({ error: "No se pudo guardar la mesa" });
    }
  }
});

router.patch("/restaurant/tables/:id", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.edit)) return;
  try {
    const params = UpdateRestaurantTableParams.safeParse(req.params);
    const body = UpdateRestaurantTableBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid table update" });
      return;
    }

    const tid = req.tenantId;
    const [table] = await db
      .update(restaurantTablesTable)
      .set(body.data)
      .where(
        and(
          eq(restaurantTablesTable.id, params.data.id),
          tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
        ),
      )
      .returning();
    if (!table) {
      res.status(404).json({ error: "Restaurant table not found" });
      return;
    }

    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "tables_updated");
    res.json(
      UpdateRestaurantTableResponse.parse(restaurantTableResponse(table)),
    );
  } catch (error: any) {
    const msg = String(error?.message ?? "").toLowerCase();
    if (
      msg.includes("unique") ||
      msg.includes("duplicate") ||
      msg.includes("restaurant_tables_name_tenant_idx")
    ) {
      res.status(409).json({ error: "Ya existe una mesa con ese nombre" });
    } else {
      res.status(500).json({ error: "No se pudo actualizar la mesa" });
    }
  }
});

router.patch(
  "/restaurant/tables/:id/reservation",
  async (req, res): Promise<void> => {
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.reservations)) return;
    try {
      const id = Number(req.params.id);
      const tid = req.tenantId;
      if (!id) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }
      const {
        status,
        reservationName,
        reservationTime,
        reservationPhone,
        reservationNotes,
      } = req.body as {
        status?: string;
        reservationName?: string | null;
        reservationTime?: string | null;
        reservationPhone?: string | null;
        reservationNotes?: string | null;
      };
      const drizzleSet: Partial<{
        status: "available" | "occupied" | "reserved" | "in_process";
        reservationName: string | null;
      }> = {};
      if (status !== undefined)
        drizzleSet.status = status as
          | "available"
          | "occupied"
          | "reserved"
          | "in_process";
      if (reservationName !== undefined)
        drizzleSet.reservationName = reservationName ?? null;
      if (Object.keys(drizzleSet).length > 0) {
        await db
          .update(restaurantTablesTable)
          .set(drizzleSet)
          .where(
            and(
              eq(restaurantTablesTable.id, id),
              tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
            ),
          );
      }
      await db.execute(
        sql`UPDATE restaurant_tables SET reservation_time = ${reservationTime ?? null}, reservation_phone = ${reservationPhone ?? null}, reservation_notes = ${reservationNotes ?? null} WHERE id = ${id}${tid ? sql` AND tenant_id = ${tid}` : sql``}`,
      );
      if (tid !== undefined) sseBus.broadcast(tid, "tables_updated");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "No se pudo actualizar la reserva" });
    }
  },
);

router.delete("/restaurant/tables/:id", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.delete)) return;
  try {
    const id = Number(req.params.id);
    const tid = req.tenantId;
    if (!id) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    if (tid) {
      await db.execute(
        sql`DELETE FROM restaurant_tables WHERE id = ${id} AND tenant_id = ${tid}`,
      );
    } else {
      await db.execute(sql`DELETE FROM restaurant_tables WHERE id = ${id}`);
    }
    res.json({ success: true, deletedId: id });
  } catch (error) {
    req.log.error({ err: error }, "Error al eliminar mesa");
    res.status(400).json({
      error:
        "No se puede eliminar esta mesa porque ya tiene un historial de pedidos guardado. Intenta cambiarle el nombre.",
    });
  }
});

router.post("/restaurant/tables/:id/merge", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.merge)) return;
  try {
    const destTableId = Number(req.params.id);
    const sourceTableId = Number(req.body?.sourceTableId);
    const tid = req.tenantId;
    if (!destTableId || !sourceTableId || destTableId === sourceTableId) {
      res.status(400).json({ error: "IDs de mesa inválidos" });
      return;
    }
    const tenantCond = tid
      ? eq(restaurantTablesTable.tenantId, tid)
      : undefined;
    const [destTable, sourceTable] = await Promise.all([
      db
        .select()
        .from(restaurantTablesTable)
        .where(and(eq(restaurantTablesTable.id, destTableId), tenantCond))
        .then((r) => r[0]),
      db
        .select()
        .from(restaurantTablesTable)
        .where(and(eq(restaurantTablesTable.id, sourceTableId), tenantCond))
        .then((r) => r[0]),
    ]);
    if (!destTable || !sourceTable) {
      res.status(404).json({ error: "Mesa no encontrada" });
      return;
    }
    const isOccupiedStatus = (t: RestaurantTable) =>
      t.status === "occupied" ||
      t.status === "in_process" ||
      t.status === "pending_payment";
    if (!isOccupiedStatus(destTable)) {
      res
        .status(400)
        .json({ error: "La mesa destino no tiene un pedido activo" });
      return;
    }
    if (!isOccupiedStatus(sourceTable)) {
      res
        .status(400)
        .json({ error: "La mesa origen no tiene un pedido activo" });
      return;
    }
    if (
      destTable.status === "pending_payment" ||
      sourceTable.status === "pending_payment"
    ) {
      res
        .status(409)
        .json({
          error:
            "No se puede fusionar una mesa con un cobro dividido en curso. Completa o cancela el cobro antes de fusionar.",
        });
      return;
    }
    const [destOrder, sourceOrder] = await Promise.all([
      db
        .select()
        .from(restaurantOrdersTable)
        .where(
          and(
            eq(restaurantOrdersTable.tableId, destTableId),
            eq(restaurantOrdersTable.status, "open"),
          ),
        )
        .then((r) => r[0]),
      db
        .select()
        .from(restaurantOrdersTable)
        .where(
          and(
            eq(restaurantOrdersTable.tableId, sourceTableId),
            eq(restaurantOrdersTable.status, "open"),
          ),
        )
        .then((r) => r[0]),
    ]);
    if (!destOrder || !sourceOrder) {
      res.status(400).json({ error: "Pedido abierto no encontrado" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(restaurantOrderItemsTable)
        .set({ orderId: destOrder.id })
        .where(eq(restaurantOrderItemsTable.orderId, sourceOrder.id));
      await tx
        .update(restaurantOrdersTable)
        .set({ subtotal: money(destOrder.subtotal + sourceOrder.subtotal) })
        .where(eq(restaurantOrdersTable.id, destOrder.id));
      await tx
        .update(restaurantOrdersTable)
        .set({ status: "cancelled", closedAt: new Date() })
        .where(eq(restaurantOrdersTable.id, sourceOrder.id));
      await tx
        .update(restaurantTablesTable)
        .set({ status: "available" })
        .where(eq(restaurantTablesTable.id, sourceTableId));
    });

    if (tid !== undefined) sseBus.broadcast(tid, "tables_updated");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error al fusionar mesas");
    res.status(500).json({ error: "No se pudo fusionar las mesas" });
  }
});

router.post(
  "/restaurant/tables/:id/transfer",
  async (req, res): Promise<void> => {
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.transfer)) return;
    try {
      const sourceTableId = Number(req.params.id);
      const targetTableId = Number(req.body?.targetTableId);
      const itemIds: number[] | undefined = Array.isArray(req.body?.itemIds)
        ? req.body.itemIds
        : undefined;
      const tid = req.tenantId;

      if (!sourceTableId || !targetTableId || sourceTableId === targetTableId) {
        res.status(400).json({ error: "IDs de mesa inválidos" });
        return;
      }

      const tenantCond = tid
        ? eq(restaurantTablesTable.tenantId, tid)
        : undefined;
      const [sourceTable, targetTable] = await Promise.all([
        db
          .select()
          .from(restaurantTablesTable)
          .where(and(eq(restaurantTablesTable.id, sourceTableId), tenantCond))
          .then((r) => r[0]),
        db
          .select()
          .from(restaurantTablesTable)
          .where(and(eq(restaurantTablesTable.id, targetTableId), tenantCond))
          .then((r) => r[0]),
      ]);

      if (!sourceTable || !targetTable) {
        res.status(404).json({ error: "Mesa no encontrada" });
        return;
      }
      const isActive = (t: RestaurantTable) =>
        ["occupied", "in_process", "pending_payment"].includes(t.status);
      if (!isActive(sourceTable)) {
        res
          .status(400)
          .json({ error: "La mesa origen no tiene un pedido activo" });
        return;
      }
      if (sourceTable.status === "pending_payment") {
        res
          .status(409)
          .json({
            error:
              "No se puede mover ítems con un cobro dividido en curso. Completa o cancela el cobro primero.",
          });
        return;
      }

      const [sourceOrder] = await db
        .select()
        .from(restaurantOrdersTable)
        .where(
          and(
            eq(restaurantOrdersTable.tableId, sourceTableId),
            eq(restaurantOrdersTable.status, "open"),
          ),
        );
      if (!sourceOrder) {
        res
          .status(400)
          .json({ error: "Pedido abierto no encontrado en la mesa origen" });
        return;
      }

      const allSourceItems = await db
        .select()
        .from(restaurantOrderItemsTable)
        .where(eq(restaurantOrderItemsTable.orderId, sourceOrder.id));

      const itemsToTransfer =
        itemIds && itemIds.length > 0
          ? allSourceItems.filter((it) => itemIds.includes(it.id))
          : allSourceItems;

      if (itemsToTransfer.length === 0) {
        res.status(400).json({ error: "No hay ítems para transferir" });
        return;
      }

      const transferredAmount = itemsToTransfer.reduce(
        (s, it) => s + Number(it.lineTotal),
        0,
      );
      const transferredIds = itemsToTransfer.map((it) => it.id);
      const remainingCount = allSourceItems.length - itemsToTransfer.length;
      const remainingAmount = money(
        Number(sourceOrder.subtotal) - transferredAmount,
      );

      await db.transaction(async (tx) => {
        // Find or create open order on target table
        const [existingTargetOrder] = await tx
          .select()
          .from(restaurantOrdersTable)
          .where(
            and(
              eq(restaurantOrdersTable.tableId, targetTableId),
              eq(restaurantOrdersTable.status, "open"),
            ),
          );

        let targetOrderId: number;
        if (existingTargetOrder) {
          targetOrderId = existingTargetOrder.id;
          await tx
            .update(restaurantOrdersTable)
            .set({
              subtotal: money(
                Number(existingTargetOrder.subtotal) + transferredAmount,
              ),
            })
            .where(eq(restaurantOrdersTable.id, targetOrderId));
        } else {
          const [newOrder] = await tx
            .insert(restaurantOrdersTable)
            .values({
              tableId: targetTableId,
              status: "open",
              subtotal: money(transferredAmount),
              serverName: sourceOrder.serverName ?? null,
              tenantId: sourceOrder.tenantId ?? req.tenantId ?? null,
            })
            .returning();
          targetOrderId = newOrder.id;
          await tx
            .update(restaurantTablesTable)
            .set({ status: "occupied" })
            .where(eq(restaurantTablesTable.id, targetTableId));
        }

        // Reassign items to target order
        await tx
          .update(restaurantOrderItemsTable)
          .set({ orderId: targetOrderId })
          .where(inArray(restaurantOrderItemsTable.id, transferredIds));

        // Handle source order
        if (remainingCount === 0) {
          await tx
            .update(restaurantOrdersTable)
            .set({ status: "cancelled", closedAt: new Date() })
            .where(eq(restaurantOrdersTable.id, sourceOrder.id));
          await tx
            .update(restaurantTablesTable)
            .set({ status: "available" })
            .where(eq(restaurantTablesTable.id, sourceTableId));
        } else {
          await tx
            .update(restaurantOrdersTable)
            .set({ subtotal: remainingAmount })
            .where(eq(restaurantOrdersTable.id, sourceOrder.id));
        }
      });

      if (tid !== undefined) sseBus.broadcast(tid, "tables_updated");
      res.json({
        success: true,
        movedCount: itemsToTransfer.length,
        sourceFreed: remainingCount === 0,
      });
    } catch (err) {
      req.log.error({ err }, "Error al transferir ítems de mesa");
      res.status(500).json({ error: "No se pudo transferir los ítems" });
    }
  },
);

router.post("/restaurant/tables/:id/split", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.split)) return;
  try {
    const tableId = Number(req.params.id);
    const { mode, totalParts } = req.body as {
      mode?: string;
      totalParts?: number;
    };
    const tid = req.tenantId;

    if (!tableId || !totalParts || totalParts < 2 || totalParts > 10) {
      res
        .status(400)
        .json({
          error: "Datos de división inválidos (mín. 2, máx. 10 partes)",
        });
      return;
    }

    const tenantCond = tid
      ? eq(restaurantTablesTable.tenantId, tid)
      : undefined;
    const [table] = await db
      .select()
      .from(restaurantTablesTable)
      .where(and(eq(restaurantTablesTable.id, tableId), tenantCond));
    if (!table) {
      res.status(404).json({ error: "Mesa no encontrada" });
      return;
    }

    const [order] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(
        and(
          eq(restaurantOrdersTable.tableId, tableId),
          eq(restaurantOrdersTable.status, "open"),
        ),
      );
    if (!order) {
      res.status(400).json({ error: "La mesa no tiene un pedido abierto" });
      return;
    }

    const items = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.orderId, order.id));
    if (items.length === 0) {
      res.status(400).json({ error: "El pedido no tiene ítems" });
      return;
    }

    await db
      .delete(restaurantOrderSplitsTable)
      .where(
        and(
          eq(restaurantOrderSplitsTable.orderId, order.id),
          eq(restaurantOrderSplitsTable.partsPaid, 0),
        ),
      );

    const [existingActive] = await db
      .select()
      .from(restaurantOrderSplitsTable)
      .where(eq(restaurantOrderSplitsTable.orderId, order.id));
    if (existingActive) {
      // For "items" mode, resume the existing split so partial payments already
      // made are preserved and the frontend can continue with the next customer.
      if (existingActive.mode === "items") {
        const remaining = money(order.subtotal - (existingActive.amountPaid ?? 0));
        res.status(200).json({
          splitId: existingActive.id,
          orderId: order.id,
          totalParts: existingActive.totalParts,
          partAmounts: existingActive.partAmounts ?? [],
          amountPerPart: null,
          mode: existingActive.mode,
          partsPaid: existingActive.partsPaid,
          remaining,
          resumed: true,
        });
        return;
      }
      res
        .status(409)
        .json({ error: "Ya hay un cobro dividido en curso para esta mesa" });
      return;
    }

    const splitMode = mode ?? "equal";
    const requestedPartAmounts = req.body.partAmounts as number[] | undefined;
    // In "items" mode amounts are free-form per customer — don't pre-calculate
    // equal parts so partial-checkout won't validate against a fixed list.
    // Store [] (empty array) to satisfy the NOT NULL DB constraint while still
    // resulting in expectedAmount=null in partial-checkout (no index match).
    let partAmounts: number[] = [];
    if (splitMode !== "items") {
      if (
        Array.isArray(requestedPartAmounts) &&
        requestedPartAmounts.length === totalParts
      ) {
        const sum = requestedPartAmounts.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - order.subtotal) > 0.02) {
          res
            .status(400)
            .json({
              error:
                "La suma de los montos por parte no coincide con el total del pedido",
            });
          return;
        }
        partAmounts = requestedPartAmounts.map(money);
      } else {
        const base = money(order.subtotal / totalParts);
        partAmounts = Array.from({ length: totalParts }, (_, i) =>
          i < totalParts - 1
            ? base
            : money(order.subtotal - base * (totalParts - 1)),
        );
      }
    }

    const [split] = await db
      .insert(restaurantOrderSplitsTable)
      .values({ orderId: order.id, totalParts, mode: splitMode, partAmounts })
      .returning();

    await db
      .update(restaurantTablesTable)
      .set({ status: "pending_payment" })
      .where(eq(restaurantTablesTable.id, table.id));
    if (tid !== undefined) sseBus.broadcast(tid, "tables_updated");

    const amountPerPart = money(order.subtotal / totalParts);
    res.status(201).json({
      splitId: split.id,
      orderId: order.id,
      totalParts,
      partsPaid: 0,
      partAmounts,
      amountPerPart,
      orderSubtotal: order.subtotal,
      mode: split.mode,
    });
  } catch (err) {
    req.log.error({ err }, "Error al iniciar división de cuenta");
    res.status(500).json({ error: "No se pudo iniciar la división de cuenta" });
  }
});

// salesWhStockMap: ingredientId → qty en la bodega de ventas del tenant.
// Si se pasa, sobreescribe ingredients.stock (ingredientes sin fila en la bodega = 0).
async function getDynamicStock(
  productId: number,
  salesWhStockMap?: Map<number, number>,
) {
  const product = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .then((r) => r[0]);

  if (!product) return null;
  // Products that require prior production sell from their physical stock
  if (product.requiresProduction) return product.stock;
  if (!product.hasRecipe) return product.stock;

  const recipe = await db
    .select()
    .from(productRecipesTable)
    .where(eq(productRecipesTable.productId, productId));

  if (recipe.length === 0) return 0;

  const ingredientInputs = recipe.filter((r) => r.ingredientId != null);
  const productInputs = recipe.filter((r) => r.inputProductId != null);

  const ingredientIds = ingredientInputs.map((r) => r.ingredientId!);
  const inputProductIds = productInputs.map((r) => r.inputProductId!);

  const [ingredients, inputProducts] = await Promise.all([
    ingredientIds.length > 0
      ? db
          .select()
          .from(ingredientsTable)
          .where(inArray(ingredientsTable.id, ingredientIds))
      : Promise.resolve([]),
    inputProductIds.length > 0
      ? db
          .select()
          .from(productsTable)
          .where(inArray(productsTable.id, inputProductIds))
      : Promise.resolve([]),
  ]);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const prodMap = new Map(inputProducts.map((p) => [p.id, p]));

  let maxUnits = Infinity;
  for (const item of recipe) {
    if (item.quantity === 0) continue;
    if (item.ingredientId != null) {
      const ingredient = ingMap.get(item.ingredientId);
      if (!ingredient) continue;
      // Bodega de ventas tiene prioridad; ingrediente ausente = 0 en esa bodega
      const ingStock =
        salesWhStockMap !== undefined
          ? (salesWhStockMap.get(item.ingredientId) ?? 0)
          : Number(ingredient.stock);
      const possible = Math.floor(ingStock / item.quantity);
      if (possible < maxUnits) maxUnits = possible;
    } else if (item.inputProductId != null) {
      const prod = prodMap.get(item.inputProductId);
      if (!prod) continue;
      const possible = Math.floor(prod.stock / item.quantity);
      if (possible < maxUnits) maxUnits = possible;
    }
  }

  return maxUnits === Infinity ? 0 : maxUnits;
}
// POST /screens/video-upload — save video file to disk, return URL
router.post(
  "/screens/video-upload",
  uploadVideo.single("video"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo de video" });
      return;
    }
    try {
      const originalExt = (
        req.file.originalname.split(".").pop() || "mp4"
      ).toLowerCase();
      const ext = ["mp4", "webm", "mov", "avi", "mkv"].includes(originalExt)
        ? originalExt
        : "mp4";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const dest = path.join(UPLOADS_DIR, filename);
      await fs.promises.writeFile(dest, req.file.buffer);
      res.json({ url: `/api/uploads/${filename}` });
    } catch {
      res.status(500).json({ error: "Error al guardar el video" });
    }
  },
);

// POST /screens/audio-upload — save audio file to disk, return URL
router.post(
  "/screens/audio-upload",
  upload.single("audio"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo de audio" });
      return;
    }
    try {
      const originalExt = (
        req.file.originalname.split(".").pop() || "mp3"
      ).toLowerCase();
      const ext = ["mp3", "ogg", "wav", "aac", "m4a", "flac"].includes(
        originalExt,
      )
        ? originalExt
        : "mp3";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const dest = path.join(UPLOADS_DIR, filename);
      await fs.promises.writeFile(dest, req.file.buffer);
      res.json({ url: `/api/uploads/${filename}` });
    } catch {
      res.status(500).json({ error: "Error al guardar el audio" });
    }
  },
);

// GET /public/product-images/:tenantId/:filename — serve product images from GCS
// This path is under /api/public/ which is PUBLIC_PATH_PREFIXES — no auth required.
// Supports both authenticated pages (POS, products) and public pages (menu, pedido).
router.get(
  "/public/product-images/:tenantId/:filename",
  async (req, res): Promise<void> => {
    const { tenantId, filename } = req.params;
    const objectPath = `/objects/products/${tenantId}/${filename}`;
    try {
      const file = await objectStorage.getObjectEntityFile(objectPath);
      const [metadata] = await file.getMetadata();
      res.set("Content-Type", (metadata.contentType as string) || "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400");
      if (metadata.size) res.set("Content-Length", String(metadata.size));
      file.createReadStream().pipe(res);
    } catch (err: unknown) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).end();
      } else {
        req.log.error({ err }, "public/product-images serving error");
        res.status(500).end();
      }
    }
  },
);

// POST /products/image-upload/request-url — generate a presigned GCS URL for
// direct client→GCS product image upload (no server bandwidth for file bytes).
// Returns { uploadURL, objectPath } where objectPath is stored in products.imageUrl.
router.post(
  "/products/image-upload/request-url",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    if (!tid) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    try {
      const uuid = crypto.randomUUID();
      const subPath = `products/${tid}/${uuid}.jpg`;
      const { uploadURL, objectPath } = await objectStorage.getPresignedUploadURL(subPath);
      res.json({ uploadURL, objectPath });
    } catch (err) {
      req.log.error({ err }, "products/image-upload/request-url: error");
      res.status(500).json({ error: "Error al generar URL de carga" });
    }
  },
);

// POST /products/image-upload — compress with sharp, save to disk, return URL
// Kept for backward compatibility with any older clients.
router.post(
  "/products/image-upload",
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No se recibió ninguna imagen" });
      return;
    }
    try {
      const ext = ".jpg";
      const filename = `${crypto.randomUUID()}${ext}`;
      const dest = path.join(UPLOADS_DIR, filename);

      // Compress: resize to max 1200px on any side, JPEG quality 82, max ~1 MB
      await sharp(req.file.buffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82, progressive: true })
        .toFile(dest);

      res.json({ url: `/api/uploads/${filename}` });
    } catch (err) {
      res.status(500).json({ error: "Error al procesar la imagen" });
    }
  },
);

// POST /products/bulk-image-upload — match multiple images by filename → SKU/name, compress, save, update imageUrl
router.post(
  "/products/bulk-image-upload",
  upload.array("images", 100),
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No se recibieron imágenes" });
      return;
    }

    // Load all tenant products for matching
    const tenantProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, sku: productsTable.sku })
      .from(productsTable)
      .where(
        and(
          // SUPERADMIN-ONLY fallback: authenticated users always have tid from tenantMiddleware.
          // The isNull branch is only reachable for superadmins who browse global (tenantId IS NULL) products.
          tid ? eq(productsTable.tenantId, tid) : isNull(productsTable.tenantId),
          eq(productsTable.isActive, true),
        ),
      );

    // Build lookup maps (lowercase, trimmed)
    const bySkuMap = new Map<string, typeof tenantProducts[number]>();
    const byNameMap = new Map<string, typeof tenantProducts[number]>();
    for (const p of tenantProducts) {
      if (p.sku) bySkuMap.set(p.sku.toLowerCase().trim(), p);
      byNameMap.set(p.name.toLowerCase().trim(), p);
    }

    const results: Array<{
      filename: string;
      productId: number | null;
      productName: string | null;
      ok: boolean;
      error?: string;
    }> = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).toLowerCase().trim();

      // Match by SKU first, then by name
      const match = bySkuMap.get(base) ?? byNameMap.get(base) ?? null;
      if (!match) {
        results.push({ filename: file.originalname, productId: null, productName: null, ok: false, error: "Sin coincidencia" });
        continue;
      }

      try {
        const uuid = crypto.randomUUID();
        const compressed = await sharp(file.buffer)
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 82, progressive: true })
          .toBuffer();
        const imageUrl = await objectStorage.uploadBuffer(
          `products/${tid ?? 0}/${uuid}.jpg`,
          compressed,
          "image/jpeg",
        );
        await db
          .update(productsTable)
          .set({ imageUrl })
          .where(
            and(
              eq(productsTable.id, match.id),
              // SUPERADMIN-ONLY fallback: mirrors the SELECT above — same superadmin/global product pattern.
              tid ? eq(productsTable.tenantId, tid) : isNull(productsTable.tenantId),
            ),
          );

        results.push({ filename: file.originalname, productId: match.id, productName: match.name, ok: true });
      } catch (err) {
        req.log.error({ err, filename: file.originalname }, "bulk-image-upload: processing error");
        results.push({ filename: file.originalname, productId: match.id, productName: match.name, ok: false, error: "Error al procesar" });
      }
    }

    res.json({ results });
  },
);

router.get("/products", async (req, res): Promise<void> => {
  try {
  const tid = req.tenantId;

  // Single query: fetch active products + their warehouse stock sum from active
  // warehouses. This replaces reading products.stock directly, which can drift
  // from the actual warehouse totals (e.g. after transfers that don't touch the
  // denormalised column).
  const rows = await db
    .select({
      product: productsTable,
      warehouseQty: sql<number>`COALESCE(SUM(${warehouseStockTable.qty}) FILTER (WHERE ${warehousesTable.isActive} = true), 0)`,
    })
    .from(productsTable)
    .leftJoin(
      warehouseStockTable,
      eq(warehouseStockTable.productId, productsTable.id),
    )
    .leftJoin(
      warehousesTable,
      eq(warehousesTable.id, warehouseStockTable.warehouseId),
    )
    .where(
      and(
        tid ? eq(productsTable.tenantId, tid) : undefined,
        eq(productsTable.isActive, true),
      ),
    )
    .groupBy(productsTable.id)
    .orderBy(productsTable.name);

  // Precargar stock de bodega de ventas una sola vez (evita N queries individuales)
  const salesWhId = tid ? await getSalesWarehouseId(tid) : null;
  const salesWhStockMap = new Map<number, number>();
  if (salesWhId) {
    const whRows = await db
      .select({
        ingredientId: ingredientWarehouseStockTable.ingredientId,
        qty: ingredientWarehouseStockTable.qty,
      })
      .from(ingredientWarehouseStockTable)
      .where(eq(ingredientWarehouseStockTable.warehouseId, salesWhId));
    for (const r of whRows)
      salesWhStockMap.set(Number(r.ingredientId), Number(r.qty));
  }

  const productsWithStock = await Promise.all(
    rows.map(async ({ product: p, warehouseQty }) => {
      let stock: number;
      if (p.requiresProduction) {
        // Finished-goods stock managed by production orders — keep as-is
        stock = p.stock;
      } else if (p.hasRecipe) {
        // Recipe products: usa stock de bodega de ventas (misma fuente que /availability)
        stock = (await getDynamicStock(
          p.id,
          salesWhId ? salesWhStockMap : undefined,
        )) ?? 0;
      } else {
        // Simple products: use the live warehouse sum rather than the denormalised column
        stock = Number(warehouseQty);
      }
      return {
        ...p,
        hasRecipe: p.hasRecipe ?? false,
        stock,
      };
    }),
  );

  res.json(productsWithStock);
  } catch (err) {
    req.log.error({ err }, "GET /products failed");
    res.status(500).json({ error: "Error al obtener los productos" });
  }
});

// ── Individual-weight products ─────────────────────────────────────────────────
// These endpoints intentionally use a separate resource instead of overloading
// normal stock quantities. A piece is reserved with a conditional update, so two
// cashiers cannot add the same physical cut at the same time.
router.patch("/products/:id/individual-weight", async (req, res) => {
  const productId = Number(req.params.id);
  const body = z.object({
    enabled: z.boolean(),
    pricePerKg: z.number().positive().optional(),
  }).safeParse(req.body);
  if (!Number.isInteger(productId) || !body.success || (body.data.enabled && !body.data.pricePerKg)) {
    res.status(400).json({ error: "Indica un precio por kilogramo válido." });
    return;
  }
  const [product] = await db.update(productsTable).set({
    saleMode: body.data.enabled ? "individual_weight" : "unit",
    pricePerKg: body.data.enabled ? body.data.pricePerKg! : null,
  }).where(and(
    eq(productsTable.id, productId),
    req.tenantId ? eq(productsTable.tenantId, req.tenantId) : undefined,
  )).returning();
  if (!product) { res.status(404).json({ error: "Producto no encontrado." }); return; }
  if (req.tenantId) sseBus.broadcast(req.tenantId, "products_updated");
  res.json(productResponse(product));
});

router.get("/products/:id/options", async (req, res) => {
  const productId = Number(req.params.id);
  const groups = await db.select({
    id: productOptionGroupsTable.id, name: productOptionGroupsTable.name,
    required: productOptionGroupsTable.required, sortOrder: productOptionGroupsTable.sortOrder,
  }).from(productOptionGroupAssignmentsTable)
    .innerJoin(productOptionGroupsTable, eq(productOptionGroupsTable.id, productOptionGroupAssignmentsTable.groupId))
    .where(eq(productOptionGroupAssignmentsTable.productId, productId))
    .orderBy(asc(productOptionGroupsTable.sortOrder));
  const ids = groups.map(g => g.id);
  const items = ids.length ? await db.select().from(productOptionItemsTable)
    .where(and(inArray(productOptionItemsTable.groupId, ids), eq(productOptionItemsTable.isActive, true)))
    .orderBy(asc(productOptionItemsTable.sortOrder)) : [];
  res.json(groups.map(group => ({ ...group, options: items.filter(item => item.groupId === group.id) })));
});

router.put("/products/:id/options", async (req, res) => {
  const productId = Number(req.params.id);
  const parsed = z.array(z.object({
    name: z.string().trim().min(1).max(80),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  })).max(10).safeParse(req.body);
  if (!Number.isInteger(productId) || !parsed.success) {
    res.status(400).json({ error: "Las opciones no son válidas." }); return;
  }
  const tid = req.tenantId;
  const [product] = await db.select({ id: productsTable.id }).from(productsTable)
    .where(and(eq(productsTable.id, productId), tid ? eq(productsTable.tenantId, tid) : undefined));
  if (!product || !tid) { res.status(404).json({ error: "Producto no encontrado." }); return; }
  await db.transaction(async tx => {
    const existing = await tx.select({ id: productOptionGroupAssignmentsTable.id })
      .from(productOptionGroupAssignmentsTable).where(eq(productOptionGroupAssignmentsTable.productId, productId));
    if (existing.length) await tx.delete(productOptionGroupAssignmentsTable)
      .where(eq(productOptionGroupAssignmentsTable.productId, productId));
    for (let index = 0; index < parsed.data.length; index++) {
      const groupData = parsed.data[index]!;
      const [group] = await tx.insert(productOptionGroupsTable).values({
        tenantId: tid, name: groupData.name, required: groupData.required, sortOrder: index,
      }).returning();
      await tx.insert(productOptionGroupAssignmentsTable).values({ productId, groupId: group.id });
      await tx.insert(productOptionItemsTable).values(groupData.options.map((name, optionIndex) => ({
        groupId: group.id, name, sortOrder: optionIndex,
      })));
    }
  });
  res.status(204).send();
});

router.get("/product-pieces", async (req, res) => {
  const productId = Number(req.query.productId);
  const status = typeof req.query.status === "string" ? req.query.status : "available";
  if (!Number.isInteger(productId)) { res.status(400).json({ error: "productId es obligatorio." }); return; }
  // Expired holds are released before returning availability.
  await db.update(productPiecesTable).set({ status: "available", reservedAt: null, reservationToken: null, reservationExpiresAt: null })
    .where(and(eq(productPiecesTable.productId, productId), eq(productPiecesTable.status, "reserved"), lt(productPiecesTable.reservationExpiresAt, new Date())));
  const pieces = await db.select({
    id: productPiecesTable.id, productId: productPiecesTable.productId, code: productPiecesTable.code,
    weightGrams: productPiecesTable.weightGrams, status: productPiecesTable.status,
    warehouseId: productPiecesTable.warehouseId, notes: productPiecesTable.notes, createdAt: productPiecesTable.createdAt,
    pricePerKg: productsTable.pricePerKg, productName: productsTable.name,
  }).from(productPiecesTable).innerJoin(productsTable, eq(productsTable.id, productPiecesTable.productId))
    .where(and(eq(productPiecesTable.productId, productId), eq(productPiecesTable.status, status),
      req.tenantId ? eq(productPiecesTable.tenantId, req.tenantId) : undefined))
    .orderBy(asc(productPiecesTable.createdAt));
  res.json(pieces.map(p => ({ ...p, calculatedPrice: Math.round((p.weightGrams / 1000) * Number(p.pricePerKg ?? 0)) })));
});

router.post("/product-pieces", async (req, res) => {
  const parsed = z.object({
    productId: z.number().int().positive(), warehouseId: z.number().int().positive().optional(),
    pieces: z.array(z.object({ weightGrams: z.number().int().min(1).max(200000), code: z.string().trim().max(80).optional(), notes: z.string().max(500).optional() })).min(1).max(500),
  }).safeParse(req.body);
  if (!parsed.success || !req.tenantId) { res.status(400).json({ error: "Datos de piezas inválidos." }); return; }
  const [product] = await db.select().from(productsTable).where(and(eq(productsTable.id, parsed.data.productId), eq(productsTable.tenantId, req.tenantId)));
  if (!product || product.saleMode !== "individual_weight") { res.status(409).json({ error: "Este producto no está configurado para venta por piezas." }); return; }
  const created = await db.insert(productPiecesTable).values(parsed.data.pieces.map(piece => ({
    ...piece, productId: product.id, warehouseId: parsed.data.warehouseId ?? null, tenantId: req.tenantId!,
  }))).returning();
  if (req.tenantId) sseBus.broadcast(req.tenantId, "products_updated");
  res.status(201).json(created);
});

router.post("/product-pieces/:id/reserve", async (req, res) => {
  const id = Number(req.params.id);
  const token = crypto.randomUUID();
  const until = new Date(Date.now() + 15 * 60 * 1000);
  const updated = await db.update(productPiecesTable).set({
    status: "reserved", reservationToken: token, reservedAt: new Date(), reservationExpiresAt: until,
  }).where(and(eq(productPiecesTable.id, id), eq(productPiecesTable.status, "available"),
    req.tenantId ? eq(productPiecesTable.tenantId, req.tenantId) : undefined)).returning();
  if (!updated[0]) { res.status(409).json({ error: "La pieza ya no está disponible." }); return; }
  res.json({ piece: updated[0], reservationToken: token, expiresAt: until });
});

router.post("/product-pieces/:id/release", async (req, res) => {
  const id = Number(req.params.id);
  const token = z.object({ reservationToken: z.string().uuid() }).safeParse(req.body);
  if (!token.success) { res.status(400).json({ error: "Reserva inválida." }); return; }
  const updated = await db.update(productPiecesTable).set({
    status: "available", reservedAt: null, reservationToken: null, reservationExpiresAt: null,
  }).where(and(eq(productPiecesTable.id, id), eq(productPiecesTable.status, "reserved"), eq(productPiecesTable.reservationToken, token.data.reservationToken),
    req.tenantId ? eq(productPiecesTable.tenantId, req.tenantId) : undefined)).returning();
  if (!updated[0]) { res.status(409).json({ error: "La reserva ya no es válida." }); return; }
  res.json(updated[0]);
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid product body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Receta obligatoria: un producto recién creado nunca tiene receta cargada
  // todavía. Forzamos hasRecipe=false aquí para que la única forma de activarlo
  // sea PUT /products/:id/recipe con filas válidas. Esto evita que el frontend
  // (o un cliente directo de la API) "mienta" sobre tener receta y burle el
  // guard de POS/MESAS.
  const [tenant] = req.tenantId === undefined
    ? []
    : await db
        .select({ name: tenantsTable.name, slug: tenantsTable.slug })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, req.tenantId))
        .limit(1);
  const isPatrona =
    tenant?.slug === "lapatrona012026" ||
    tenant?.name.trim().toLowerCase() === "la patrona rooftop";
  const insertValues = {
    ...parsed.data,
    tracksInventory: parsed.data.tracksInventory ?? !isPatrona,
    hasRecipe: false,
    tenantId: req.tenantId,
  };
  const [product] = await db
    .insert(productsTable)
    .values(insertValues)
    .returning();
  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "products_updated");
  res
    .status(201)
    .json(ListProductsResponseItem.parse(productResponse(product)));
});

router.patch("/products/bulk", async (req, res): Promise<void> => {
  const schema = z.object({
    ids: z.array(z.number().int().positive()).min(1).max(500),
    tracksInventory: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { ids, tracksInventory } = parsed.data;
  const tid = req.tenantId;

  // Validate that ALL provided IDs belong to this tenant before updating
  const owned = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        inArray(productsTable.id, ids),
        tid ? eq(productsTable.tenantId, tid) : isNull(productsTable.tenantId),
      ),
    );

  if (owned.length !== ids.length) {
    res.status(400).json({
      error: "One or more product IDs not found or do not belong to this tenant",
    });
    return;
  }

  const updated = await db
    .update(productsTable)
    .set({ tracksInventory })
    .where(inArray(productsTable.id, ids))
    .returning({ id: productsTable.id });

  if (tid) sseBus.broadcast(tid, "products_updated");
  res.json({ updated: updated.length });
});

router.patch("/products/:id/stock-status", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const { isOutOfStock, durationMinutes } = req.body as {
    isOutOfStock: boolean;
    durationMinutes?: number | null;
  };
  if (typeof isOutOfStock !== "boolean") {
    res.status(400).json({ error: "isOutOfStock (boolean) is required" });
    return;
  }

  const tid = req.tenantId;
  let outOfStockUntil: Date | null = null;
  if (isOutOfStock && durationMinutes && durationMinutes > 0) {
    outOfStockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  const [product] = await db
    .update(productsTable)
    .set({ isOutOfStock, outOfStockUntil })
    .where(
      and(
        eq(productsTable.id, id),
        tid ? eq(productsTable.tenantId, tid) : undefined,
      ),
    )
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (tid) sseBus.broadcast(tid, "products_updated");
  res.json(productResponse(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid product update" });
    return;
  }

  // PATCH no debe poder cambiar hasRecipe directamente: el flag se gestiona
  // únicamente desde PUT /products/:id/recipe (que valida que haya ingredientes
  // reales). Eliminamos la propiedad si llega en el body.
  const { hasRecipe: _ignored, ...safeUpdate } = body.data as Record<
    string,
    unknown
  >;
  void _ignored;

  const tid = req.tenantId;
  const [product] = await db
    .update(productsTable)
    .set(safeUpdate)
    .where(
      and(
        eq(productsTable.id, params.data.id),
        tid ? eq(productsTable.tenantId, tid) : undefined,
      ),
    )
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "products_updated");
  res.json(UpdateProductResponse.parse(productResponse(product)));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const pid = params.data.id;
  const tid = req.tenantId;

  // Verificar que el producto existe y pertenece a este tenant
  const [existing] = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, pid),
        tid ? eq(productsTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  // Comprobar referencias que impiden el borrado
  const [saleRef] = await db
    .select({ id: saleItemsTable.id })
    .from(saleItemsTable)
    .where(eq(saleItemsTable.productId, pid))
    .limit(1);
  const [orderRef] = await db
    .select({ id: restaurantOrderItemsTable.id })
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.productId, pid))
    .limit(1);
  const [movRef] = await db
    .select({ id: inventoryMovementsTable.id })
    .from(inventoryMovementsTable)
    .where(eq(inventoryMovementsTable.productId, pid))
    .limit(1);

  if (saleRef || orderRef || movRef) {
    // EN LUGAR DE LANZAR ERROR, LO INACTIVAMOS AUTOMÁTICAMENTE (Soft Delete)
    await db
      .update(productsTable)
      .set({ isActive: false })
      .where(
        and(
          eq(productsTable.id, pid),
          tid ? eq(productsTable.tenantId, tid) : undefined,
        ),
      );

    if (tid !== undefined) sseBus.broadcast(tid, "products_updated");
    res.status(200).json({
      message:
        "Producto inactivado con éxito. No se eliminó por completo porque cuenta con un historial de ventas.",
    });
    return;
  }

  // Sin referencias: limpiar recetas (legacy + nueva) y borrar
  await db.transaction(async (tx) => {
    // Limpiar recipe_items y recipes (tabla legacy con FK a products)
    const [legacyRecipe] = await tx
      .select({ id: recipesTable.id })
      .from(recipesTable)
      .where(eq(recipesTable.productId, pid))
      .limit(1);
    if (legacyRecipe) {
      await tx
        .delete(recipeItemsTable)
        .where(eq(recipeItemsTable.recipeId, legacyRecipe.id));
      await tx.delete(recipesTable).where(eq(recipesTable.id, legacyRecipe.id));
    }
    // Limpiar product_recipes (sin FK a products)
    await tx
      .delete(productRecipesTable)
      .where(eq(productRecipesTable.productId, pid));
    await tx
      .delete(productsTable)
      .where(
        and(
          eq(productsTable.id, pid),
          tid ? eq(productsTable.tenantId, tid) : undefined,
        ),
      );
  });

  if (tid !== undefined) sseBus.broadcast(tid, "products_updated");
  res.sendStatus(204);
});

// ── POST /sales/:id/emit-fe — Factura Electrónica ────────────────────────────
router.post("/sales/:id/emit-fe", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid sale id" });
    return;
  }

  // Verify sale belongs to tenant and exists
  const tid = req.tenantId;
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(and(eq(salesTable.id, id), tid ? eq(salesTable.tenantId, tid) : undefined))
    .limit(1);

  if (!sale) {
    res.status(404).json({ error: "Venta no encontrada" });
    return;
  }
  if (sale.feStatus === "approved") {
    res.status(400).json({ error: "Esta venta ya tiene una Factura Electrónica aprobada" });
    return;
  }
  if (sale.voidedAt) {
    res.status(400).json({ error: "No se puede emitir FE para una venta anulada" });
    return;
  }

  // Mark as pending while processing
  await db
    .update(salesTable)
    .set({ feStatus: "pending" })
    .where(eq(salesTable.id, id));

  const { emitirFacturaElectronica } = await import("../services/fe-provider.js");
  const result = await emitirFacturaElectronica(id, req.tenantId);

  if (!result.success) {
    await db
      .update(salesTable)
      .set({ feStatus: "rejected" })
      .where(eq(salesTable.id, id));
    res.status(400).json({ error: (result as { success: false; error: string }).error });
    return;
  }

  const { cufe, pdfUrl, xmlUrl, feStatus } = result;

  await db
    .update(salesTable)
    .set({
      feStatus,
      cufe,
      fePdfUrl: pdfUrl,
      feXmlUrl: xmlUrl,
      feEmittedAt: new Date(),
    })
    .where(eq(salesTable.id, id));

  res.json({ success: true, cufe, pdfUrl, xmlUrl, feStatus });
});

// ── sendSaleEmail — builds an HTML receipt and sends it via Resend ─────────────
async function sendSaleEmail(
  saleId: number,
  tenantId: number | undefined,
  overrideEmail?: string,
): Promise<{ ok: boolean; email: string }> {
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.id, saleId),
        tenantId ? eq(salesTable.tenantId, tenantId) : undefined,
      ),
    );
  if (!sale) throw new Error("SALE_NOT_FOUND");

  // Resolve recipient email
  let recipientEmail: string | null = overrideEmail ?? null;
  if (!recipientEmail && sale.customerId) {
    const [customer] = await db
      .select({ email: customersTable.email })
      .from(customersTable)
      .where(eq(customersTable.id, sale.customerId));
    recipientEmail = customer?.email ?? null;
  }
  if (!recipientEmail) throw new Error("NO_EMAIL");

  // Sale items
  const items = await db
    .select()
    .from(saleItemsTable)
    .where(eq(saleItemsTable.saleId, sale.id));

  // Company settings
  const [companyNameRaw, companyNitRaw, companyAddressRaw, companyPhoneRaw, headerRaw, footerRaw, currencyRaw] =
    await Promise.all([
      readSetting(tenantId, "company_name"),
      readSetting(tenantId, "company_nit"),
      readSetting(tenantId, "company_address"),
      readSetting(tenantId, "company_phone"),
      readSetting(tenantId, "receipt_header"),
      readSetting(tenantId, "receipt_footer"),
      readSetting(tenantId, "company_currency"),
    ]);

  const parse = (raw: string | null, fb = "") => {
    if (!raw) return fb;
    try { return String(JSON.parse(raw) || fb); } catch { return raw; }
  };

  const companyName = parse(companyNameRaw, "FYRO APP");
  const nit        = parse(companyNitRaw);
  const address    = parse(companyAddressRaw);
  const phone      = parse(companyPhoneRaw);
  const header     = parse(headerRaw, "¡Gracias por su compra!");
  const footer     = parse(footerRaw, "Vuelva pronto.");
  const currency   = parse(currencyRaw, "COP");

  const fmt = (n: number) =>
    n.toLocaleString("es-CO", { style: "currency", currency, maximumFractionDigits: 0 });

  const date = new Date(sale.createdAt).toLocaleString("es-CO", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const itemRows = items
    .map(
      (item) => `<tr>
        <td style="padding:7px 4px;border-bottom:1px solid #f0f0f0">${item.productName}${item.notes ? `<br/><span style="font-size:11px;color:#888">${item.notes}</span>` : ""}</td>
        <td style="padding:7px 4px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td>
        <td style="padding:7px 4px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(item.unitPrice)}</td>
        <td style="padding:7px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${fmt(item.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  // nosemgrep: html-in-template-string — server-side email HTML; all user values are escaped with esc()
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:24px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.12)">
  <div style="background:#111;color:#fff;padding:28px;text-align:center">
    <h1 style="margin:0;font-size:22px;letter-spacing:1px">${companyName}</h1>
    ${nit ? `<p style="margin:5px 0 0;font-size:12px;opacity:.65">NIT: ${nit}</p>` : ""}
    ${address ? `<p style="margin:3px 0 0;font-size:12px;opacity:.65">${address}</p>` : ""}
    ${phone ? `<p style="margin:3px 0 0;font-size:12px;opacity:.65">${phone}</p>` : ""}
  </div>
  <div style="padding:24px">
    ${header ? `<p style="text-align:center;color:#555;font-size:13px;margin:0 0 20px">${header}</p>` : ""}
    <div style="background:#f8f8f8;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#666">Recibo</span>
        <strong style="font-family:monospace">${sale.receiptNumber}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#666">Fecha</span><span>${date}</span>
      </div>
      ${sale.customerName ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#666">Cliente</span><span>${sale.customerName}</span></div>` : ""}
      ${sale.tableName ? `<div style="display:flex;justify-content:space-between"><span style="color:#666">Mesa</span><span>${sale.tableName}${sale.tableArea ? ` (${sale.tableArea})` : ""}</span></div>` : ""}
    </div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid #111">
        <th style="padding:8px 4px;text-align:left">Producto</th>
        <th style="padding:8px 4px;text-align:center">Cant.</th>
        <th style="padding:8px 4px;text-align:right">Precio</th>
        <th style="padding:8px 4px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="margin-top:18px;border-top:2px solid #111;padding-top:14px">
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700">
        <span>TOTAL</span>
        <span style="color:#16a34a">${fmt(sale.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-top:5px">
        <span>Método de pago</span>
        <span style="text-transform:capitalize">${sale.paymentMethod}</span>
      </div>
      ${(sale.loyaltyPointsEarned ?? 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-top:5px"><span>Puntos ganados</span><span>${sale.loyaltyPointsEarned}</span></div>` : ""}
    </div>
    ${footer ? `<p style="text-align:center;color:#666;font-size:13px;margin:24px 0 0;padding-top:18px;border-top:1px dashed #e0e0e0">${footer}</p>` : ""}
  </div>
</div>
</body></html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({
      to: recipientEmail, receiptNumber: sale.receiptNumber, amount: sale.subtotal,
    }, "RESEND_API_KEY not set; sale receipt not delivered");
    throw new Error("EMAIL_PROVIDER_UNCONFIGURED");
  } else {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "FYRO APP <notificaciones@resend.dev>",
        to: recipientEmail,
        subject: `Tu factura ${sale.receiptNumber} — ${companyName}`,
        html,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Resend error ${r.status}: ${body}`);
    }
  }

  await db
    .update(salesTable)
    .set({ emailSentAt: new Date() })
    .where(eq(salesTable.id, saleId));

  return { ok: true, email: recipientEmail };
}

async function sendEmployeeCreditReceipt(
  saleId: number,
  tenantId: number | undefined,
): Promise<{ ok: boolean; email?: string; status: "sent" | "failed" | "no_email" }> {
  const [sale] = await db.select().from(salesTable).where(and(
    eq(salesTable.id, saleId),
    tenantId ? eq(salesTable.tenantId, tenantId) : undefined,
  )).limit(1);
  if (!sale?.employeeCreditEmployeeId) throw new Error("EMPLOYEE_CREDIT_SALE_NOT_FOUND");
  const [movement] = await db.select().from(employeeCreditMovementsTable).where(and(
    eq(employeeCreditMovementsTable.saleId, saleId),
    eq(employeeCreditMovementsTable.type, "charge"),
    tenantId ? eq(employeeCreditMovementsTable.tenantId, tenantId) : undefined,
  )).limit(1);
  if (!movement) throw new Error("EMPLOYEE_CREDIT_SALE_NOT_FOUND");
  const [employee] = await db.select().from(employeesTable).where(and(
    eq(employeesTable.id, sale.employeeCreditEmployeeId),
    tenantId ? eq(employeesTable.tenantId, tenantId) : undefined,
  )).limit(1);
  const email = employee?.clerkEmail || employee?.email || null;
  if (!email) {
    await db.update(employeeCreditMovementsTable)
      .set({ emailStatus: "no_email" })
      .where(eq(employeeCreditMovementsTable.id, movement.id));
    return { ok: false, status: "no_email" };
  }
  try {
    await sendSaleEmail(saleId, tenantId, email);
    await db.update(employeeCreditMovementsTable)
      .set({ emailStatus: "sent", emailSentAt: new Date() })
      .where(eq(employeeCreditMovementsTable.id, movement.id));
    return { ok: true, email, status: "sent" };
  } catch (error) {
    await db.update(employeeCreditMovementsTable)
      .set({ emailStatus: "failed" })
      .where(eq(employeeCreditMovementsTable.id, movement.id));
    throw error;
  }
}

router.get("/sales", async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate + "T23:59:59.999Z") : undefined;
  const sales = await getSalesWithItems(req.tenantId, start, end);
  res.json(ListSalesResponse.parse(sales));
});

const repairCustomerCreditSchema = z.object({
  expectedAmount: z.number().positive().optional(),
  reason: z.string().trim().min(3).max(500),
});

router.post(
  "/sales/:receiptNumber/repair-customer-credit",
  requireRole(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const parsed = repairCustomerCreditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const receiptNumber = String(req.params.receiptNumber ?? "").trim();
    const kindMap = await loadPaymentMethodsMap(req.tenantId);
    const result = await db.transaction(async (tx) => {
      const lockedSales = await tx.execute<{ id: number }>(sql`
        SELECT id FROM sales
        WHERE receipt_number = ${receiptNumber}
          AND tenant_id = ${req.tenantId}
        FOR UPDATE
      `);
      const lockedSaleId = lockedSales.rows[0]?.id;
      if (!lockedSaleId) return { error: "Venta no encontrada" as const, status: 404 };
      const [sale] = await tx.select().from(salesTable).where(and(
        eq(salesTable.id, lockedSaleId),
        eq(salesTable.tenantId, req.tenantId!),
      )).limit(1);
      if (!sale?.customerId) return { error: "La venta no tiene cliente asociado" as const, status: 409 };
      if (sale.employeeCreditEmployeeId || sale.paymentMethod === "employee_credit") {
        return { error: "La venta pertenece a crédito interno de empleado" as const, status: 409 };
      }
      if (sale.voidedAt) return { error: "No se puede reparar una venta anulada" as const, status: 409 };
      if (resolveKind(kindMap, sale.paymentMethod) !== "credit") {
        return { error: "El método de la venta no está configurado como Crédito" as const, status: 409 };
      }
      const amount = money(Number(sale.subtotal));
      if (parsed.data.expectedAmount != null && money(parsed.data.expectedAmount) !== amount) {
        return { error: `El total esperado no coincide con la venta (${amount})` as const, status: 409 };
      }
      const [existing] = await tx.select().from(creditMovementsTable).where(and(
        eq(creditMovementsTable.saleId, sale.id),
        eq(creditMovementsTable.type, "charge"),
      )).limit(1);
      if (existing) {
        return { repaired: false, alreadyApplied: true, saleId: sale.id, movement: existing };
      }
      await tx.execute(sql`SELECT id FROM customers WHERE id = ${sale.customerId} FOR UPDATE`);
      const [customer] = await tx.select().from(customersTable).where(and(
        eq(customersTable.id, sale.customerId),
        eq(customersTable.tenantId, req.tenantId!),
      )).limit(1);
      if (!customer) return { error: "Cliente no encontrado en esta empresa" as const, status: 409 };
      const newBalance = money(Number(customer.creditBalance ?? 0) + amount);
      await tx.update(customersTable).set({ creditBalance: newBalance }).where(eq(customersTable.id, customer.id));
      const [movement] = await tx.insert(creditMovementsTable).values({
        customerId: customer.id,
        type: "charge",
        amount,
        balanceAfter: newBalance,
        reference: sale.receiptNumber,
        saleId: sale.id,
        notes: `Reparación administrativa: ${parsed.data.reason}`,
        createdBy: req.employeeId != null ? `employee:${req.employeeId}` : "superadmin",
      }).returning();
      return { repaired: true, alreadyApplied: false, saleId: sale.id, movement };
    });
    if ("error" in result) {
      res.status(result.status ?? 409).json({ error: result.error });
      return;
    }
    res.json(result);
  },
);

router.post("/sales", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.checkout)) return;
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.items.length === 0) {
    res.status(400).json({ error: "Sale requires at least one item" });
    return;
  }

  const rawPieceSelections = (Array.isArray(req.body.items) ? req.body.items : []).map((item: unknown) => {
    const value = item as Record<string, unknown>;
    return {
      pieceId: typeof value?.pieceId === "number" ? value.pieceId : null,
      reservationToken: typeof value?.reservationToken === "string" ? value.reservationToken : null,
      selectedOptions: Array.isArray(value?.selectedOptions) ? value.selectedOptions : [],
    };
  });
  for (const item of parsed.data.items) {
    if (item.quantity <= 0) {
      res.status(400).json({ error: "Item quantities must be positive" });
      return;
    }
  }

  const tid = req.tenantId;
  const products = await db
    .select()
    .from(productsTable)
    .where(tid ? eq(productsTable.tenantId, tid) : undefined);
  const rawPieceIds = rawPieceSelections.flatMap((selection: { pieceId: number | null }) =>
    selection.pieceId ? [selection.pieceId] : [],
  );
  const pieces = rawPieceIds.length
    ? await db.select().from(productPiecesTable).where(and(
        inArray(productPiecesTable.id, rawPieceIds),
        tid ? eq(productPiecesTable.tenantId, tid) : undefined,
      ))
    : [];
  const piecesById = new Map(pieces.map(piece => [piece.id, piece]));
  const selectedProducts = parsed.data.items.map((item, index) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const selection = rawPieceSelections[index] ?? { pieceId: null, reservationToken: null, selectedOptions: [] };
    const piece = selection.pieceId ? piecesById.get(selection.pieceId) : null;
    const unitPrice = piece && product ? money((piece.weightGrams / 1000) * Number(product.pricePerKg ?? 0)) : product?.price ?? 0;
    return { product, quantity: item.quantity, notes: item.notes ?? null, piece, selection, unitPrice };
  });

  const missing = selectedProducts.find(({ product }) => !product);
  if (missing) {
    res.status(400).json({ error: "One or more products were not found" });
    return;
  }
  const invalidPiece = selectedProducts.find(({ product, quantity, piece, selection }) =>
    product?.saleMode === "individual_weight" && (
      quantity !== 1 || !piece || piece.productId !== product.id ||
      (piece.status === "reserved" && !selection.reservationToken) ||
      !["available", "reserved"].includes(piece.status)
    ),
  );
  if (invalidPiece) {
    res.status(409).json({ error: "Debes elegir una pieza disponible y válida para cada producto vendido por peso." });
    return;
  }
  const weightedProductIds = [...new Set(selectedProducts.filter(item => item.piece).map(item => item.product!.id))];
  if (weightedProductIds.length) {
    const requiredGroups = await db.select({
      productId: productOptionGroupAssignmentsTable.productId,
      id: productOptionGroupsTable.id, name: productOptionGroupsTable.name,
    }).from(productOptionGroupAssignmentsTable)
      .innerJoin(productOptionGroupsTable, eq(productOptionGroupsTable.id, productOptionGroupAssignmentsTable.groupId))
      .where(and(inArray(productOptionGroupAssignmentsTable.productId, weightedProductIds), eq(productOptionGroupsTable.required, true)));
    const groupItems = requiredGroups.length ? await db.select({
      groupId: productOptionItemsTable.groupId, id: productOptionItemsTable.id,
    }).from(productOptionItemsTable).where(and(
      inArray(productOptionItemsTable.groupId, requiredGroups.map(group => group.id)),
      eq(productOptionItemsTable.isActive, true),
    )) : [];
    for (const item of selectedProducts) {
      if (!item.piece) continue;
      const needed = requiredGroups.filter(group => group.productId === item.product!.id);
      for (const group of needed) {
        const selected = item.selection.selectedOptions.find((option: any) => option?.groupId === group.id);
        if (!selected || !groupItems.some(option => option.groupId === group.id && option.id === selected.optionId)) {
          res.status(400).json({ error: `Selecciona "${group.name}" para ${item.product!.name}.` });
          return;
        }
      }
    }
  }

  // Receta obligatoria: todo producto vendido debe tener receta cargada (flag + filas reales).
  // Mismo criterio que MESAS (POST /restaurant/orders/:id/items) para mantener
  // POS y MESAS consistentes ante datos legacy con flag inconsistente.
  const productIdsToCheck = selectedProducts
    .map(({ product }) => product?.id)
    .filter((id): id is number => typeof id === "number");
  const allRecipeRows =
    productIdsToCheck.length > 0
      ? await db
          .select()
          .from(productRecipesTable)
          .where(inArray(productRecipesTable.productId, productIdsToCheck))
      : [];
  const recipeRowsByProduct = new Map<number, typeof allRecipeRows>();
  for (const row of allRecipeRows) {
    const list = recipeRowsByProduct.get(row.productId) ?? [];
    list.push(row);
    recipeRowsByProduct.set(row.productId, list);
  }
  // Solo bloquear si hasRecipe=true pero no hay filas de receta (inconsistencia de datos)
  // Productos sin receta (hasRecipe=false) → siempre vendibles, sin deducción de ingredientes
  const noRecipe = selectedProducts.find(({ product }) => {
    if (!product) return false;
    if (product.tracksInventory === false) return false;
    if (product.requiresProduction) return false;
    if (!product.hasRecipe) return false;
    const rows = recipeRowsByProduct.get(product.id) ?? [];
    return rows.length === 0;
  });
  if (noRecipe) {
    res.status(409).json({
      error: `El producto "${noRecipe.product?.name}" tiene receta activada pero sin ingredientes configurados. Configura la receta antes de venderlo.`,
    });
    return;
  }

  // Validar stock previo a la transacción.
  // requiresProduction → vende desde stock físico; bloquear si no hay suficiente.
  // Sin receta → validar stock directo únicamente cuando controla inventario.
  // tracksInventory === false → no validar ni descontar stock.
  for (const { product, quantity } of selectedProducts) {
    if (!product) continue;
    if (product.tracksInventory === false) continue;
    if (product.requiresProduction) {
      if (product.stock < quantity) {
        res.status(400).json({
          error: `"${product.name}" requiere producción previa. Stock actual: ${product.stock}. Crea una orden de producción primero.`,
        });
        return;
      }
      continue;
    }
    const hasRecipeRows = (recipeRowsByProduct.get(product.id) ?? []).length > 0;
    if (!hasRecipeRows && product.stock < quantity) {
      res.status(400).json({
        error: `"${product.name}" no tiene stock suficiente (disponible: ${product.stock}, necesita: ${quantity}).`,
      });
      return;
    }
  }

  const subtotal = money(
    selectedProducts.reduce(
      (total, { quantity, unitPrice }) => total + unitPrice * quantity,
      0,
    ),
  );
  const totalCost = money(
    selectedProducts.reduce(
      (total, { product, quantity }) => total + product!.cost * quantity,
      0,
    ),
  );
  const receiptNumber = `R-${Date.now().toString(36).toUpperCase()}`;

  const productIds = selectedProducts.map(({ product }) => product!.id);
  const recipes = productIds.length
    ? await db
        .select()
        .from(productRecipesTable)
        .where(
          sql`${productRecipesTable.productId} IN (${sql.join(
            productIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
    : [];
  const recipeIngredientIds = [
    ...new Set(
      recipes.filter((r) => r.ingredientId != null).map((r) => r.ingredientId!),
    ),
  ];
  const ingredientsForCheck = recipeIngredientIds.length
    ? await db
        .select()
        .from(ingredientsTable)
        .where(inArray(ingredientsTable.id, recipeIngredientIds))
    : [];
  const ingMap = new Map(ingredientsForCheck.map((i) => [i.id, i]));
  const posInventory = computeSaleInventoryPlan({
    tenantId: req.tenantId,
    items: selectedProducts.map(({ product, quantity }) => ({
      productId: product!.id,
      quantity,
    })),
    products: selectedProducts.map(({ product }) => product!),
    recipes,
  });
  const consumption = posInventory.ingredientConsumption;
  const productInputConsumption = posInventory.inputProductConsumption;
  await removeUntrackedProductInputs(db, productInputConsumption, req.tenantId);
  // Validar contra bodega de ventas activa (no ingredients.stock viejo).
  if (consumption.size > 0) {
    const posSalesWhId = await getSalesWarehouseId(req.tenantId, req.branchId);
    if (!posSalesWhId) {
      res.status(400).json({ error: "No hay bodega de ventas configurada." });
      return;
    }
    const posWhStock = await getSalesWarehouseStock(
      posSalesWhId,
      Array.from(consumption.keys()),
    );
    for (const [ingId, needed] of consumption.entries()) {
      const available = posWhStock.get(ingId) ?? 0;
      if (available < needed) {
        const ing = ingMap.get(ingId);
        res.status(400).json({
          error: `Ingrediente "${ing?.name ?? `#${ingId}`}" insuficiente en bodega de ventas (disponible: ${available}, necesita: ${needed})`,
        });
        return;
      }
    }
  }

  const customerId = parsed.data.customerId ?? null;
  const employeeCreditEmployeeId = parsed.data.employeeCreditEmployeeId ?? null;
  const employeeCreditCode = parsed.data.employeeCreditCode ?? null;
  const employeeCreditMode = validateEmployeeCreditSaleMode({
    paymentMethod: parsed.data.paymentMethod,
    employeeId: employeeCreditEmployeeId,
    code: employeeCreditCode,
  });
  const usesEmployeeCredit = employeeCreditMode.usesEmployeeCredit;
  if (employeeCreditMode.error) {
    res.status(400).json({ error: employeeCreditMode.error });
    return;
  }
  if (usesEmployeeCredit && customerId) {
    res.status(400).json({ error: "El crédito de empleado no puede mezclarse con crédito de cliente" });
    return;
  }
  if (usesEmployeeCredit && (parsed.data.payments?.length ?? 0) > 0) {
    res.status(400).json({ error: "El crédito de empleado no admite pagos mixtos" });
    return;
  }
  if (usesEmployeeCredit && !req.isSuperAdmin && !["admin", "manager", "cashier"].includes(req.employeeRole ?? "")) {
    res.status(403).json({ error: "Rol no autorizado para crédito de empleado" });
    return;
  }
  const paymentMethod = usesEmployeeCredit ? "employee_credit" : parsed.data.paymentMethod;
  const employeeId = resolveSaleOperatorEmployeeId({
    usesEmployeeCredit,
    authenticatedEmployeeId: req.employeeId,
    submittedEmployeeId: parsed.data.employeeId,
  });

  if (employeeId !== null) {
    const [emp] = await db
      .select()
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, employeeId),
        req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined,
      ));
    if (!emp || emp.status !== "active") {
      res.status(400).json({ error: "Empleado no encontrado o inactivo" });
      return;
    }
  }

  const salesKindMap = await loadPaymentMethodsMap(req.tenantId);
  const paymentKind = normalizeEmployeeCreditPaymentKind(
    usesEmployeeCredit,
    resolveKind(salesKindMap, paymentMethod),
  );
  if (paymentKind === "credit" && !customerId) {
    res
      .status(400)
      .json({ error: "El método 'Crédito' requiere un cliente seleccionado" });
    return;
  }
  if (paymentKind === "points") {
    if (!customerId) {
      res
        .status(400)
        .json({ error: "El método 'Puntos' requiere un cliente seleccionado" });
      return;
    }
    const cfg = await getLoyaltyConfig(req.tenantId);
    const [cust] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId));
    if (!cust) {
      res.status(400).json({ error: "Cliente no encontrado" });
      return;
    }
    const availableValue = cust.loyaltyPoints * cfg.redemptionValue;
    if (availableValue < subtotal) {
      res.status(400).json({
        error: `Puntos insuficientes. Disponible: ${cust.loyaltyPoints} pts (${availableValue}), requerido equivalente a ${subtotal}`,
      });
      return;
    }
  }

  // ── Tax calculation (per-item) ───────────────────────────────────────────────
  const taxIncludedRaw = await readSetting(req.tenantId, "company_tax_included_in_price");
  const taxIncluded = taxIncludedRaw !== "false"; // default: price includes tax
  const itemTaxData = selectedProducts.map(({ product, quantity, unitPrice }) => {
    const lineTotal = money(unitPrice * quantity);
    const taxPct = Number(product!.taxPercent ?? 0);
    if (!taxPct) return { taxPercent: null as number | null, taxAmount: null as number | null, taxName: null as string | null };
    const taxAmt = taxIncluded
      ? money(lineTotal * taxPct / (100 + taxPct))
      : money(lineTotal * taxPct / 100);
    return { taxPercent: taxPct, taxAmount: taxAmt, taxName: product!.taxName ?? null };
  });
  const totalTaxAmount = itemTaxData.reduce((s, t) => s + (t.taxAmount ?? 0), 0);
  const itemTaxRates = [...new Set(itemTaxData.filter(t => t.taxPercent).map(t => t.taxPercent!))];
  const saleTaxPercent = itemTaxRates.length === 1 ? itemTaxRates[0] : null;
  const saleTaxName = saleTaxPercent != null ? (itemTaxData.find(t => t.taxPercent === saleTaxPercent)?.taxName ?? null) : null;
  // When tax is exclusive (not included in price), customers pay base + tax
  const finalSubtotal = !taxIncluded && totalTaxAmount > 0 ? money(subtotal + totalTaxAmount) : subtotal;

  // ── Idempotency check ────────────────────────────────────────────────────────
  // If the client sent a clientId (offline UUID), check whether the sale was
  // already processed. If so, return the existing sale without re-inserting.
  // This is the ONLY safe deduplication strategy — UNIQUE index on (tenant_id, client_id).
  const clientId = parsed.data.clientId ?? null;
  if (clientId) {
    const [existingSale] = await db
      .select()
      .from(salesTable)
      .where(
        and(
          eq(salesTable.clientId, clientId),
          tid ? eq(salesTable.tenantId, tid) : undefined,
        ),
      )
      .limit(1);
    if (existingSale) {
      const existingItems = await db
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, existingSale.id));
      req.log.info(
        { clientId, saleId: existingSale.id },
        "Duplicate sale suppressed via clientId",
      );
      res.json(saleResponse(existingSale, existingItems));
      return;
    }
  }

  // ── PQRS discount code validation ────────────────────────────────────────────
  const pqrsDiscountCodeRaw = parsed.data.pqrsDiscountCode?.trim().toUpperCase() ?? null;
  let pqrsReviewId: number | null = null;
  let pqrsDiscountAmount = 0;
  if (pqrsDiscountCodeRaw) {
    const [pqrsReview] = await db
      .select()
      .from(pqrsReviewsTable)
      .where(
        and(
          eq(pqrsReviewsTable.tenantId, tid!),
          eq(pqrsReviewsTable.discountCode, pqrsDiscountCodeRaw),
        ),
      )
      .limit(1);
    if (!pqrsReview) {
      res.status(400).json({ error: "Código de descuento PQRS no válido" });
      return;
    }
    if (pqrsReview.discountUsedAt) {
      res.status(409).json({ error: "Este código de descuento ya fue utilizado" });
      return;
    }
    if (pqrsReview.discountExpiresAt && pqrsReview.discountExpiresAt < new Date()) {
      res.status(410).json({ error: "Este código de descuento ha expirado" });
      return;
    }
    pqrsReviewId = pqrsReview.id;
    pqrsDiscountAmount = money(Number(pqrsReview.discountAmount ?? 0));
  }
  const effectiveSaleTotal = pqrsDiscountAmount > 0
    ? money(Math.max(0, finalSubtotal - pqrsDiscountAmount))
    : finalSubtotal;

  // Persist bad authorization attempts outside the sale transaction: a checkout
  // rollback must never erase rate-limit state.
  if (usesEmployeeCredit) {
    const [candidate] = await db.select().from(employeeCreditCodesTable).where(and(
      eq(employeeCreditCodesTable.employeeId, employeeCreditEmployeeId!),
      req.tenantId ? eq(employeeCreditCodesTable.tenantId, req.tenantId) : undefined,
      isNull(employeeCreditCodesTable.consumedAt),
    )).limit(1);
    if (!candidate || candidate.expiresAt <= new Date() || candidate.failedAttempts >= 5 ||
      !employeeCreditCodeMatches(employeeCreditCode!, candidate.codeHash)) {
      if (candidate && candidate.failedAttempts < 5) {
        await db.update(employeeCreditCodesTable).set({
          failedAttempts: sql`LEAST(5, ${employeeCreditCodesTable.failedAttempts} + 1)`,
        }).where(and(eq(employeeCreditCodesTable.id, candidate.id), isNull(employeeCreditCodesTable.consumedAt)));
      }
      res.status(400).json({ error: "Código de crédito inválido, vencido o bloqueado" });
      return;
    }
  }

  const sale = await db
    .transaction(async (tx) => {
      // Generate a unique PQRS token for this sale (used by the printed QR)
      const pqrsToken = require("crypto").randomUUID() as string;
      let employeeCreditContext: { employee: Employee; codeId: number; balanceAfter: number } | null = null;
      if (usesEmployeeCredit) {
        await tx.execute(sql`SELECT id FROM employees WHERE id = ${employeeCreditEmployeeId!} FOR UPDATE`);
        const [creditEmployee] = await tx.select().from(employeesTable).where(and(
          eq(employeesTable.id, employeeCreditEmployeeId!),
          req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined,
        )).limit(1);
        if (!creditEmployee || creditEmployee.status !== "active") throw new Error("EMPLOYEE_CREDIT_EMPLOYEE_INVALID");
        const [code] = await tx.select().from(employeeCreditCodesTable).where(and(
          eq(employeeCreditCodesTable.employeeId, creditEmployee.id),
          req.tenantId ? eq(employeeCreditCodesTable.tenantId, req.tenantId) : undefined,
          isNull(employeeCreditCodesTable.consumedAt),
        )).limit(1);
        if (!code || code.expiresAt <= new Date() || code.failedAttempts >= 5 ||
          !employeeCreditCodeMatches(employeeCreditCode!, code.codeHash)) throw new Error("EMPLOYEE_CREDIT_CODE_INVALID");
        const summary = await employeeCreditSummary(creditEmployee, req.tenantId, tx);
        if (effectiveSaleTotal > summary.available) throw new Error("EMPLOYEE_CREDIT_LIMIT");
        employeeCreditContext = { employee: creditEmployee, codeId: code.id, balanceAfter: money(summary.balance + effectiveSaleTotal) };
      }

      const [createdSale] = await tx
        .insert(salesTable)
        .values({
          receiptNumber,
          clientId,
          customerName: parsed.data.customerName,
          customerId,
          employeeId,
          employeeCreditEmployeeId,
          loyaltyPointsEarned: 0,
          paymentMethod,
          payments: usesEmployeeCredit ? [{ method: "employee_credit", amount: effectiveSaleTotal }] : (parsed.data.payments ?? []),
          subtotal: effectiveSaleTotal,
          totalCost,
          profit: money(effectiveSaleTotal - totalCost),
          cashAmountTendered: parsed.data.cashAmountTendered ?? null,
          cajaId: parsed.data.cajaId ?? null,
          taxAmount: totalTaxAmount > 0 ? money(totalTaxAmount) : null,
          taxPercent: saleTaxPercent,
          taxName: saleTaxName,
          tenantId: req.tenantId,
          pqrsToken,
        })
        .returning();

      if (employeeCreditContext) {
        await tx.insert(employeeCreditMovementsTable).values({
          tenantId: req.tenantId!, employeeId: employeeCreditContext.employee.id, type: "charge", amount: effectiveSaleTotal,
          balanceAfter: employeeCreditContext.balanceAfter, saleId: createdSale.id, actorEmployeeId: req.employeeId ?? null, emailStatus: "pending",
        });
        const consumed = await tx.update(employeeCreditCodesTable).set({ consumedAt: new Date() }).where(and(
          eq(employeeCreditCodesTable.id, employeeCreditContext.codeId), isNull(employeeCreditCodesTable.consumedAt),
        )).returning({ id: employeeCreditCodesTable.id });
        if (!consumed[0]) throw new Error("EMPLOYEE_CREDIT_CODE_INVALID");
      }

      // Final CAS: converts each held/available piece into a sold piece only in
      // this sale transaction. A concurrent cashier receives PIECE_UNAVAILABLE.
      for (const { piece, selection } of selectedProducts) {
        if (!piece) continue;
        const pieceIsReservedByThisCart = selection.reservationToken
          ? and(eq(productPiecesTable.status, "reserved"), eq(productPiecesTable.reservationToken, selection.reservationToken))
          : eq(productPiecesTable.status, "available");
        const marked = await tx.update(productPiecesTable).set({
          status: "sold", soldAt: new Date(), saleId: createdSale.id,
          reservationToken: null, reservationExpiresAt: null,
        }).where(and(eq(productPiecesTable.id, piece.id), pieceIsReservedByThisCart)).returning({ id: productPiecesTable.id });
        if (!marked[0]) throw new Error("PIECE_UNAVAILABLE");
      }

      let loyaltyPointsEarned = 0;
      if (customerId && paymentKind !== "points") {
        loyaltyPointsEarned = await computeAndAwardPoints(
          tx,
          customerId,
          effectiveSaleTotal,
          createdSale.id,
          receiptNumber,
          req.tenantId,
        );
        if (loyaltyPointsEarned > 0) {
          await tx
            .update(salesTable)
            .set({ loyaltyPointsEarned })
            .where(eq(salesTable.id, createdSale.id));
          createdSale.loyaltyPointsEarned = loyaltyPointsEarned;
        }
      }

      if (customerId && paymentKind === "credit") {
        await tx.execute(sql`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`);
        const [updated] = await tx
          .update(customersTable)
          .set({ creditBalance: sql`credit_balance + ${effectiveSaleTotal}` })
          .where(and(
            eq(customersTable.id, customerId),
            req.tenantId ? eq(customersTable.tenantId, req.tenantId) : undefined,
          ))
          .returning({ balance: customersTable.creditBalance });
        if (!updated) throw new Error("CUSTOMER_NOT_FOUND");
        await tx.insert(creditMovementsTable).values({
          customerId,
          type: "charge",
          amount: effectiveSaleTotal,
          balanceAfter: updated?.balance ?? 0,
          reference: receiptNumber,
          saleId: createdSale.id,
        });
      }

      if (customerId && paymentKind === "points") {
        const cfg = await getLoyaltyConfig(req.tenantId);
        const pointsToRedeem = Math.ceil(effectiveSaleTotal / cfg.redemptionValue);
        const [updated] = await tx
          .update(customersTable)
          .set({ loyaltyPoints: sql`loyalty_points - ${pointsToRedeem}` })
          .where(
            and(
              eq(customersTable.id, customerId),
              gte(customersTable.loyaltyPoints, pointsToRedeem),
            ),
          )
          .returning({ balance: customersTable.loyaltyPoints });
        if (!updated) {
          throw new Error("INSUFFICIENT_POINTS");
        }
        await tx.insert(loyaltyMovementsTable).values({
          customerId,
          type: "redeem",
          delta: -pointsToRedeem,
          balanceAfter: updated.balance,
          reference: receiptNumber,
          saleId: createdSale.id,
        });
      }

      // Descontar stock para productos requiresProduction (venden desde stock físico producido).
      for (const { product, quantity } of selectedProducts) {
        if (!product!.requiresProduction) continue;
        if (product!.tracksInventory === false) continue;
        const updated = await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${quantity}` })
          .where(
            and(
              eq(productsTable.id, product!.id),
              gte(productsTable.stock, quantity),
            ),
          )
          .returning({ id: productsTable.id });
        if (updated.length === 0)
          throw new Error(`OUT_OF_STOCK:${product!.name}`);
      }

      // Descontar stock para productos SIN receta y sin requiresProduction (stock directo).
      for (const { product, quantity } of selectedProducts) {
        if (product!.hasRecipe || product!.requiresProduction) continue;
        if (product!.tracksInventory === false) continue;
        const updated = await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${quantity}` })
          .where(
            and(
              eq(productsTable.id, product!.id),
              gte(productsTable.stock, quantity),
            ),
          )
          .returning({ id: productsTable.id });
        if (updated.length === 0)
          throw new Error(`OUT_OF_STOCK:${product!.name}`);
      }

      // Descontar ingredientes: si hay cajaId, usar la bodega asignada a esa caja;
      // de lo contrario, usar la bodega de ventas global (isSalesWarehouse=true).
      const cajaIdForDeduct = parsed.data.cajaId ?? null;
      let salesWhId: number | null;
      if (cajaIdForDeduct) {
        const [cajaRec] = await db
          .select({ warehouseId: cajasTable.warehouseId })
          .from(cajasTable)
          .where(and(eq(cajasTable.id, cajaIdForDeduct), eq(cajasTable.tenantId, req.tenantId!)))
          .limit(1);
        salesWhId = cajaRec?.warehouseId ?? null;
      } else {
        salesWhId = await getSalesWarehouseId(req.tenantId, req.branchId);
      }
      if (salesWhId && consumption.size > 0) {
        await deductFromSalesWarehouse(tx, salesWhId, consumption);
      }

      // Descontar del stock operativo del turno (best-effort: no bloquea la venta si no hay fila)
      if (consumption.size > 0 && req.tenantId) {
        const tenantId = req.tenantId;
        for (const [ingId, needed] of consumption.entries()) {
          await tx
            .update(operationalStockTable)
            .set({ qty: sql`GREATEST(0, ${operationalStockTable.qty} - ${needed})`, updatedAt: new Date() })
            .where(and(eq(operationalStockTable.tenantId, tenantId), eq(operationalStockTable.ingredientId, ingId)));
        }
      }

      // Descontar stock de productos intermedios usados como input en recetas.
      for (const [prodId, needed] of productInputConsumption.entries()) {
        const updated = await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${needed}` })
          .where(
            and(eq(productsTable.id, prodId), gte(productsTable.stock, needed)),
          )
          .returning({ id: productsTable.id });
        if (updated.length === 0)
          throw new Error(`OUT_OF_STOCK:producto_intermedio#${prodId}`);
      }

      const createdItems = await tx
        .insert(saleItemsTable)
        .values(
          selectedProducts.map(({ product, quantity, notes, piece, selection, unitPrice }, i) => ({
            saleId: createdSale.id,
            productId: product!.id,
            productName: product!.name,
            quantity,
            unitPrice,
            unitCost: product!.cost,
            lineTotal: money(unitPrice * quantity),
            notes: notes ?? null,
            taxPercent: itemTaxData[i]?.taxPercent ?? null,
            taxAmount: itemTaxData[i]?.taxAmount ?? null,
            taxName: itemTaxData[i]?.taxName ?? null,
            productPieceId: piece?.id ?? null,
            pieceCodeSnapshot: piece?.code ?? null,
            pieceWeightGramsSnapshot: piece?.weightGrams ?? null,
            selectedOptionsSnapshot: selection.selectedOptions as any,
          })),
        )
        .returning();

      if (parsed.data.linkedReceiptId) {
        await tx
          .update(paymentReceiptsTable)
          .set({ status: "linked", linkedSaleId: createdSale.id })
          .where(
            and(
              eq(paymentReceiptsTable.id, parsed.data.linkedReceiptId),
              eq(paymentReceiptsTable.status, "pending"),
            ),
          );
      }

      // BUG-4 FIX: Redeem bonus atomically inside the sale transaction so offline
      // queued sales always honour the bonus without a separate fire-and-forget call.
      const bonusId = parsed.data.bonusId ?? null;
      const bonusType = parsed.data.bonusType ?? null;
      if (bonusId && bonusType === "individual") {
        // Mark individual customer bonus as redeemed; silently skips if already used
        await tx
          .update(customerBonusesTable)
          .set({
            status: "redeemed",
            redeemedAt: new Date(),
            redeemedSaleId: createdSale.id,
            notes: `Canjeado en venta #${createdSale.id}`,
          })
          .where(
            and(
              eq(customerBonusesTable.id, bonusId),
              eq(customerBonusesTable.status, "issued"),
            ),
          );
      } else if (bonusId && bonusType === "campaign") {
        // Record campaign redemption; ON CONFLICT DO NOTHING prevents duplicates
        await tx.execute(
          sql`INSERT INTO discount_redemptions (campaign_id, customer_id, sale_id, notes)
              VALUES (${bonusId}, ${customerId ?? null}, ${createdSale.id}, ${"Canjeado en venta #" + createdSale.id})
              ON CONFLICT DO NOTHING`,
        );
      }

      // ── Stamp PQRS discount code as used (atomic guard against double-redeem) ─
      // Uses a conditional UPDATE: WHERE discount_used_at IS NULL ensures only
      // the first concurrent transaction wins. If 0 rows updated, the code was
      // already redeemed by a concurrent request → roll back with an error.
      if (pqrsReviewId) {
        const stamped = await tx
          .update(pqrsReviewsTable)
          .set({ discountUsedAt: new Date() })
          .where(
            and(
              eq(pqrsReviewsTable.id, pqrsReviewId),
              eq(pqrsReviewsTable.tenantId, req.tenantId!),
              isNull(pqrsReviewsTable.discountUsedAt),
            ),
          )
          .returning({ id: pqrsReviewsTable.id });
        if (stamped.length === 0) {
          throw new Error("PQRS_CODE_ALREADY_USED");
        }
      }

      return saleResponse(createdSale, createdItems);
    })
    .catch((err: unknown) => {
      if (err instanceof Error) {
        if (err.message === "INSUFFICIENT_POINTS") {
          return {
            __error: "Puntos insuficientes para cubrir esta venta",
          } as const;
        }
        if (err.message.startsWith("OUT_OF_STOCK:")) {
          const name = err.message.slice("OUT_OF_STOCK:".length);
          return {
            __error: `El stock de "${name}" cambió mientras se completaba la venta. Actualiza la disponibilidad e intenta nuevamente.`,
          } as const;
        }
        if (err.message === "PIECE_UNAVAILABLE") {
          return { __error: "Una de las piezas ya fue vendida o su reserva venció. Actualiza el pedido y elige otra." } as const;
        }
        if (err.message.startsWith("OUT_OF_INGREDIENT:")) {
          const name = err.message.slice("OUT_OF_INGREDIENT:".length);
          return {
            __error: `El saldo del ingrediente "${name}" cambió mientras se completaba la venta. Actualiza la disponibilidad e intenta nuevamente.`,
          } as const;
        }
        if (err.message === "PQRS_CODE_ALREADY_USED") {
          return {
            __error: "Este código de descuento ya fue utilizado por otra venta simultánea.",
          } as const;
        }
        if (err.message.startsWith("EMPLOYEE_CREDIT_")) {
          return { __error: err.message === "EMPLOYEE_CREDIT_LIMIT" ? "El monto excede el crédito disponible del empleado" : "Código o empleado de crédito no válido" } as const;
        }
      }
      throw err;
    });

  if (sale && typeof sale === "object" && "__error" in sale) {
    res.status(400).json({ error: sale.__error });
    return;
  }
  res.status(201).json(ListSalesResponseItem.parse(sale));

  // Auto-send email only if the tenant has `receipt_auto_email` enabled
  if (parsed.data.customerId) {
    const autoEmail = await readSetting(req.tenantId, "receipt_auto_email");
    if (autoEmail === "true") {
      const saleId = (sale as { id: number }).id;
      sendSaleEmail(saleId, req.tenantId).catch((err: unknown) => {
        if (!(err instanceof Error) || err.message !== "NO_EMAIL") {
          req.log.warn({ err, saleId }, "Auto-send sale email failed");
        }
      });
    }
  }
  if (usesEmployeeCredit) {
    const saleId = (sale as { id: number }).id;
    sendEmployeeCreditReceipt(saleId, req.tenantId).catch((err: unknown) => {
      req.log.warn({ err, saleId }, "Employee credit receipt email failed");
    });
  }
});

router.post("/sales/:id/send-email", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid sale id" });
    return;
  }
  const overrideEmail = (req.body as { email?: string })?.email?.trim() || undefined;
  try {
    const result = await sendSaleEmail(id, req.tenantId, overrideEmail);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "SALE_NOT_FOUND") {
        res.status(404).json({ error: "Venta no encontrada" });
        return;
      }
      if (err.message === "NO_EMAIL") {
        res.status(400).json({ error: "El cliente no tiene correo registrado. Ingresa un correo manualmente." });
        return;
      }
    }
    throw err;
  }
});

router.post("/sales/:id/void", async (req, res): Promise<void> => {
  if (!req.isSuperAdmin) {
    const role = req.employeeRole;
    if (!role || !["admin", "manager"].includes(role)) {
      res.status(403).json({ error: "Solo administradores pueden anular ventas" });
      return;
    }
  }

  const params = VoidSaleParams.safeParse(req.params);
  const body = VoidSaleBody.safeParse(req.body ?? {});
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid void request" });
    return;
  }

  const tid = req.tenantId;
  const [existing] = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.id, params.data.id),
        tid ? eq(salesTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Venta no encontrada" });
    return;
  }
  if (existing.voidedAt) {
    res.status(400).json({ error: "La venta ya fue anulada" });
    return;
  }

  const reason = body.data.reason ?? null;
  const refundCajaId = body.data.cajaId ?? null;

  const result = await db
    .transaction(async (tx) => {
      const [fresh] = await tx
        .select()
        .from(salesTable)
        .where(eq(salesTable.id, existing.id));
      if (!fresh) throw new Error("Venta no encontrada");
      if (fresh.cajaId != null && refundCajaId == null) {
        throw new Error("REFUND_CAJA_REQUIRED");
      }
      if (refundCajaId != null) {
        const [refundCaja] = await tx
          .select({ id: cajasTable.id })
          .from(cajasTable)
          .where(and(
            eq(cajasTable.id, refundCajaId),
            req.tenantId ? eq(cajasTable.tenantId, req.tenantId) : undefined,
            eq(cajasTable.isActive, true),
          ));
        if (!refundCaja) throw new Error("INVALID_REFUND_CAJA");

        const openRefundSessions = (await tx.execute(sql`
          SELECT id
          FROM cash_sessions
          WHERE caja_id = ${refundCajaId}
            AND tenant_id = ${req.tenantId!}
            AND status = 'open'
          LIMIT 1
          FOR UPDATE
        `)).rows;
        if (openRefundSessions.length === 0) throw new Error("REFUND_CAJA_NOT_OPEN");
      }
      if (fresh.employeeCreditEmployeeId) {
        const pendingPayroll = (await tx.execute(sql`
          SELECT pr.id
          FROM payroll_records pr
          JOIN payroll_periods pp ON pp.id = pr.period_id
          WHERE pr.employee_id = ${fresh.employeeCreditEmployeeId}
            AND pp.tenant_id = ${req.tenantId!}
            AND pp.status IN ('draft', 'approved')
            AND pr.employee_credit_deduction > 0
          LIMIT 1
        `)).rows;
        if (pendingPayroll.length > 0) throw new Error("EMPLOYEE_CREDIT_PENDING_PAYROLL");
        const settledPayroll = (await tx.execute(sql`
          SELECT deduction.id
          FROM employee_credit_movements deduction
          JOIN payroll_records pr ON pr.id = deduction.payroll_record_id
          JOIN payroll_periods pp ON pp.id = pr.period_id
          JOIN employee_credit_movements charge
            ON charge.sale_id = ${fresh.id}
            AND charge.type = 'charge'
          WHERE deduction.employee_id = ${fresh.employeeCreditEmployeeId}
            AND deduction.type = 'payroll_deduction'
            AND deduction.tenant_id = ${req.tenantId!}
            AND pp.status = 'paid'
            AND deduction.created_at >= charge.created_at
          LIMIT 1
        `)).rows;
        if (settledPayroll.length > 0) throw new Error("EMPLOYEE_CREDIT_ALREADY_SETTLED");
      }

      const items = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, fresh.id));

      const updatedSale = await reverseSaleInventoryAndPayments(
        tx,
        {
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          sale: fresh,
          voidReason: reason,
          refundCajaId,
        },
        req.tenantId,
      );
      if (fresh.employeeCreditEmployeeId) {
        await tx.execute(sql`SELECT id FROM employees WHERE id = ${fresh.employeeCreditEmployeeId} FOR UPDATE`);
        const [existingReversal] = await tx.select({ id: employeeCreditMovementsTable.id })
          .from(employeeCreditMovementsTable)
          .where(and(eq(employeeCreditMovementsTable.saleId, fresh.id), eq(employeeCreditMovementsTable.type, "reversal")))
          .limit(1);
        if (existingReversal) return saleResponse(updatedSale ?? fresh, items);
        const [latest] = await tx.select({ balance: employeeCreditMovementsTable.balanceAfter })
          .from(employeeCreditMovementsTable)
          .where(and(
            eq(employeeCreditMovementsTable.saleId, fresh.id),
            eq(employeeCreditMovementsTable.type, "charge"),
            req.tenantId ? eq(employeeCreditMovementsTable.tenantId, req.tenantId) : undefined,
          )).limit(1);
        if (latest) {
          const [current] = await tx.select({ balance: employeeCreditMovementsTable.balanceAfter })
            .from(employeeCreditMovementsTable)
            .where(and(eq(employeeCreditMovementsTable.employeeId, fresh.employeeCreditEmployeeId), req.tenantId ? eq(employeeCreditMovementsTable.tenantId, req.tenantId) : undefined))
            .orderBy(desc(employeeCreditMovementsTable.id)).limit(1);
          await tx.insert(employeeCreditMovementsTable).values({
            tenantId: req.tenantId!, employeeId: fresh.employeeCreditEmployeeId, type: "reversal",
            amount: Number(fresh.subtotal), balanceAfter: money(Math.max(0, Number(current?.balance ?? 0) - Number(fresh.subtotal))),
            saleId: fresh.id, actorEmployeeId: req.employeeId ?? null, notes: reason, emailStatus: "no_email",
          });
        }
      }
      return saleResponse(updatedSale ?? fresh, items);
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.message === "ALREADY_VOIDED") {
        return { __alreadyVoided: true } as const;
      }
      if (err instanceof Error && err.message === "EMPLOYEE_CREDIT_PENDING_PAYROLL") {
        return { __creditPayrollPending: true } as const;
      }
      if (err instanceof Error && err.message === "EMPLOYEE_CREDIT_ALREADY_SETTLED") {
        return { __creditPayrollSettled: true } as const;
      }
      if (err instanceof Error && [
        "REFUND_CAJA_REQUIRED",
        "INVALID_REFUND_CAJA",
        "REFUND_CAJA_NOT_OPEN",
      ].includes(err.message)) {
        return { __invalidRefundCaja: true } as const;
      }
      throw err;
    });

  if (result && typeof result === "object" && "__alreadyVoided" in result) {
    res.status(400).json({ error: "La venta ya fue anulada" });
    return;
  }
  if (result && typeof result === "object" && "__creditPayrollPending" in result) {
    res.status(409).json({ error: "No se puede anular este consumo mientras exista una deducción de nómina pendiente" });
    return;
  }
  if (result && typeof result === "object" && "__creditPayrollSettled" in result) {
    res.status(409).json({ error: "No se puede anular este consumo después de una liquidación de nómina" });
    return;
  }
  if (result && typeof result === "object" && "__invalidRefundCaja" in result) {
    res.status(400).json({ error: "Selecciona una caja abierta y válida para registrar la devolución" });
    return;
  }

  if (req.tenantId !== undefined)
    sseBus.broadcast(req.tenantId, "sales_updated");
  res.json(VoidSaleResponse.parse(result));
});

// Schema local para ítems opcionales al crear una orden (retrocompatible —
// el endpoint sigue funcionando sin ítems igual que antes).
const CreateOrderItemInput = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  personLabel: z.string().optional(),
});

router.post("/restaurant/orders", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.openOrder)) return;
  const parsed = CreateRestaurantOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawItems: unknown[] = Array.isArray(req.body.items) ? req.body.items : [];
  type ResolvedItem = {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    notes: string | null;
    personLabel: string | null;
    station: string;
  };
  const tid = req.tenantId;

  try {

  // ── 0. Pre-flight checks (solo lectura, fuera de tx) ───────────────────────
  const [table] = await db
    .select()
    .from(restaurantTablesTable)
    .where(
      and(
        eq(restaurantTablesTable.id, parsed.data.tableId),
        tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
      ),
    );
  if (!table) {
    res.status(404).json({ error: "Restaurant table not found" });
    return;
  }
  if (table.status !== "available" && table.status !== "reserved") {
    res.status(400).json({ error: "Table is not available" });
    return;
  }
  const existingOpenOrder = await db
    .select()
    .from(restaurantOrdersTable)
    .where(eq(restaurantOrdersTable.tableId, parsed.data.tableId));
  if (existingOpenOrder.some((o) => o.status === "open")) {
    res.status(400).json({ error: "Table already has an open order" });
    return;
  }

  // Validar y resolver productos de los ítems (solo lectura — seguro fuera de tx)
  const resolvedItems: ResolvedItem[] = [];
  if (rawItems.length > 0) {
    const parsedInputs: Array<z.infer<typeof CreateOrderItemInput>> = [];
    for (const raw of rawItems) {
      const r = CreateOrderItemInput.safeParse(raw);
      if (!r.success) {
        res.status(400).json({ error: `Ítem inválido: ${r.error.message}` });
        return;
      }
      parsedInputs.push(r.data);
    }
    const productIds = [...new Set(parsedInputs.map((it) => it.productId))];
    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          inArray(productsTable.id, productIds),
          tid ? eq(productsTable.tenantId, tid) : undefined,
        ),
      );
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const it of parsedInputs) {
      const product = productMap.get(it.productId);
      if (!product) {
        res.status(404).json({ error: `Producto ${it.productId} no encontrado` });
        return;
      }
      // resolveStation: solo lectura, corre antes de la tx
      const station = await resolveStation(product.id, req.tenantId);
      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: it.quantity,
        unitPrice: Number(product.price),
        notes: it.notes ?? null,
        personLabel: it.personLabel ?? null,
        station,
      });
    }
  }

  // ── 1. Transacción atómica: lock → validar stock → insertar orden + ítems ──
  const txResult = await db
    .transaction(async (tx) => {
      if (resolvedItems.length > 0) {
        const productIds = [...new Set(resolvedItems.map((it) => it.productId))];
        const inventoryProducts = await tx
          .select({ id: productsTable.id, tracksInventory: productsTable.tracksInventory })
          .from(productsTable)
          .where(
            and(
              inArray(productsTable.id, productIds),
              tid ? eq(productsTable.tenantId, tid) : undefined,
            ),
          );
        const trackedProductIds = inventoryProducts
          .filter((product) => product.tracksInventory !== false)
          .map((product) => product.id);
        const allRecipes = trackedProductIds.length > 0
          ? await tx
              .select()
              .from(productRecipesTable)
              .where(inArray(productRecipesTable.productId, trackedProductIds))
          : [];

        const ingredientIds = [
          ...new Set(
            allRecipes
              .map((r) => r.ingredientId)
              .filter((id): id is number => id !== null),
          ),
        ];
        const inputProductIds = [
          ...new Set(
            allRecipes
              .map((r) => r.inputProductId)
              .filter((id): id is number => id !== null),
          ),
        ];
        const inputProducts = inputProductIds.length > 0
          ? await tx
              .select()
              .from(productsTable)
              .where(
                and(
                  inArray(productsTable.id, inputProductIds),
                  tid ? eq(productsTable.tenantId, tid) : undefined,
                ),
              )
          : [];
        const inputProductMap = new Map(inputProducts.map((p) => [p.id, p]));
        const recipeProductIds = new Set(
          allRecipes.map((r) => r.productId).filter((id): id is number => id !== null),
        );
        const directStockIds = trackedProductIds.filter((id) => !recipeProductIds.has(id));

        // 1a. SELECT FOR UPDATE — previene race conditions de stock concurrente
        if (ingredientIds.length > 0) {
          await tx
            .select({ id: ingredientsTable.id })
            .from(ingredientsTable)
            .where(inArray(ingredientsTable.id, ingredientIds))
            .for("update");
        }
        if (directStockIds.length > 0) {
          await tx.execute(
            sql`SELECT id FROM products WHERE id IN (${sql.join(
              directStockIds.map((id) => sql`${id}`),
              sql`, `,
            )}) FOR UPDATE`,
          );
        }
        if (inputProductIds.length > 0) {
          await tx.execute(
            sql`SELECT id FROM products WHERE id IN (${sql.join(
              inputProductIds.map((id) => sql`${id}`),
              sql`, `,
            )}) FOR UPDATE`,
          );
        }

        // 1b. Validar disponibilidad de stock para cada ítem
        const salesWhId = await getSalesWarehouseId(tid);
        const recipesByProduct = new Map<number, typeof allRecipes>();
        for (const r of allRecipes) {
          if (r.productId === null) continue;
          const list = recipesByProduct.get(r.productId) ?? [];
          list.push(r);
          recipesByProduct.set(r.productId, list);
        }

        for (const item of resolvedItems) {
          if (!trackedProductIds.includes(item.productId)) continue;
          const recipes = recipesByProduct.get(item.productId) ?? [];
          if (recipes.length > 0) {
            // Producto con receta → validar stock de ingredientes
            const ingIds = recipes
              .map((r) => r.ingredientId)
              .filter((id): id is number => id !== null);
            const ingRows = await tx
              .select({
                id: ingredientsTable.id,
                stock: ingredientsTable.stock,
                name: ingredientsTable.name,
              })
              .from(ingredientsTable)
              .where(inArray(ingredientsTable.id, ingIds));
            const ingMap = new Map(ingRows.map((i) => [i.id, i]));

            const whStockMap = new Map<number, number>();
            if (salesWhId && ingIds.length > 0) {
              const whRows = await tx
                .select({
                  ingredientId: ingredientWarehouseStockTable.ingredientId,
                  qty: ingredientWarehouseStockTable.qty,
                })
                .from(ingredientWarehouseStockTable)
                .where(
                  and(
                    eq(ingredientWarehouseStockTable.warehouseId, salesWhId),
                    inArray(ingredientWarehouseStockTable.ingredientId, ingIds),
                  ),
                );
              for (const row of whRows) {
                whStockMap.set(Number(row.ingredientId), Number(row.qty));
              }
            }

            for (const r of recipes) {
              const needed = Number(r.quantity) * item.quantity;
              if (r.inputProductId != null) {
                const inputProduct = inputProductMap.get(Number(r.inputProductId));
                if (inputProduct?.tracksInventory === false) continue;
                const stock = Number(inputProduct?.stock ?? 0);
                if (stock < needed) {
                  throw Object.assign(
                    new Error(
                      `STOCK_ERR:No hay suficiente "${inputProduct?.name ?? "producto intermedio"}" para "${item.productName}". (Disponible: ${stock}, Necesita: ${needed})`,
                    ),
                    { httpStatus: 400 },
                  );
                }
                continue;
              }
              if (r.ingredientId == null) continue;
              const ingId = Number(r.ingredientId);
              const ing = ingMap.get(ingId);
              const stock = salesWhId
                ? (whStockMap.get(ingId) ?? 0)
                : Number(ing?.stock ?? 0);
              if (stock < needed) {
                throw Object.assign(
                  new Error(
                    `STOCK_ERR:No hay suficiente "${ing?.name ?? "ingrediente"}" para "${item.productName}". (Disponible: ${stock}, Necesita: ${needed})`,
                  ),
                  { httpStatus: 400 },
                );
              }
            }
          } else {
            // Producto directo → validar stock del producto
            const [fresh] = await tx
              .select({ stock: productsTable.stock })
              .from(productsTable)
              .where(eq(productsTable.id, item.productId!));
            const stock = Number(fresh?.stock ?? 0);
            if (stock < item.quantity) {
              throw Object.assign(
                new Error(
                  `STOCK_ERR:Stock insuficiente de "${item.productName}". (Disponible: ${stock}, Necesita: ${item.quantity})`,
                ),
                { httpStatus: 400 },
              );
            }
          }
        }
      }

      // 1c. Insertar la orden principal
      const [created] = await tx
        .insert(restaurantOrdersTable)
        .values({
          tableId: parsed.data.tableId,
          customerName: parsed.data.customerName ?? null,
          serverName: parsed.data.serverName ?? null,
          subtotal: 0,
          kitchenStatus: "pending",
          tenantId: tid ?? null,
        } as any)
        .returning();

      // 1d. Marcar la mesa como ocupada
      await tx
        .update(restaurantTablesTable)
        .set({ status: "occupied" })
        .where(eq(restaurantTablesTable.id, parsed.data.tableId));

      // 1e. Insertar ítems y recalcular subtotal (si se enviaron)
      if (resolvedItems.length > 0) {
        await tx.insert(restaurantOrderItemsTable).values(
          resolvedItems.map((it) => ({
            orderId: created.id,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: money(it.unitPrice * it.quantity),
            notes: it.notes,
            personLabel: it.personLabel,
            station: it.station,
            printedQty: 0,
            servedQty: 0,
          } as any)),
        );
        const subtotal = money(
          resolvedItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
        );
        await tx
          .update(restaurantOrdersTable)
          .set({ subtotal })
          .where(eq(restaurantOrdersTable.id, created.id));
      }

      return created;
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.message.startsWith("STOCK_ERR:")) {
        return {
          __stockError: err.message.slice("STOCK_ERR:".length),
          __httpStatus: (err as { httpStatus?: number }).httpStatus ?? 400,
        } as const;
      }
      throw err;
    });

    if (txResult && typeof txResult === "object" && "__stockError" in txResult) {
      res.status(txResult.__httpStatus).json({ error: txResult.__stockError });
      return;
    }

    if (tid !== undefined) sseBus.broadcast(tid, "orders_updated");
    const finalOrder = await getRestaurantOrder((txResult as RestaurantOrder).id, tid);
    res.status(201).json(UpdateRestaurantOrderItemResponse.parse(finalOrder));
  } catch (err) {
    req.log.error({ err }, "POST /restaurant/orders failed");
    if (!res.headersSent) res.status(500).json({ error: "Error interno al crear la orden" });
  }
});
router.post("/restaurant/orders/:id/items", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.addItems)) return;
  const params = AddRestaurantOrderItemParams.safeParse(req.params);
  const body = AddRestaurantOrderItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid order item" });
    return;
  }

  const [order] = await db
    .select()
    .from(restaurantOrdersTable)
    .where(eq(restaurantOrdersTable.id, params.data.id));
  if (!order || order.status !== "open") {
    res.status(400).json({ error: "La orden no está abierta" });
    return;
  }

  // Verify the order's table belongs to the requesting tenant
  if (req.tenantId !== undefined) {
    const [tbl] = await db
      .select({ tenantId: restaurantTablesTable.tenantId })
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, order.tableId!));
    if (!tbl || tbl.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, body.data.productId),
        req.tenantId !== undefined
          ? eq(productsTable.tenantId, req.tenantId)
          : undefined,
      ),
    );
  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  const addedQuantity = Number(body.data.quantity) || 0;
  if (addedQuantity <= 0) {
    res.status(400).json({ error: "Cantidad inválida" });
    return;
  }

  const recipes = await db
    .select()
    .from(productRecipesTable)
    .where(eq(productRecipesTable.productId, product.id));
  const isRecipeBased = recipes.length > 0;

  // requiresProduction → vende desde stock físico (sin receta requerida al momento de venta)
  // Modo rápido → requiere receta para descuento automático de ingredientes
  if (
    product.tracksInventory !== false &&
    !product.requiresProduction &&
    (!product.hasRecipe || !isRecipeBased)
  ) {
    res.status(409).json({
      error: `El producto "${product.name}" no tiene receta. Crea una receta antes de venderlo.`,
    });
    return;
  }

  // resolveStation usa db (no tx) — se resuelve antes de la transacción
  const station = await resolveStation(product.id, req.tenantId);

  // Chequeo de stock + escritura dentro de una transacción con SELECT FOR UPDATE.
  // Esto garantiza que dos peticiones concurrentes para el mismo ingrediente/producto
  // no puedan pasar el chequeo de disponibilidad al mismo tiempo: la segunda petición
  // espera a que la primera haga commit y luego lee el stock comprometido actualizado.
  const txResult = await db
    .transaction(async (tx) => {
      // Bloquear filas relevantes para evitar la race condition
      if (product.tracksInventory !== false && isRecipeBased) {
        const ingredientIds = recipes
          .map((r) => r.ingredientId)
          .filter((id): id is number => id !== null);
        if (ingredientIds.length > 0) {
          await tx
            .select({ id: ingredientsTable.id })
            .from(ingredientsTable)
            .where(inArray(ingredientsTable.id, ingredientIds))
            .for("update");
        }
      } else if (product.tracksInventory !== false) {
        await tx.execute(
          sql`SELECT id FROM products WHERE id = ${product.id} FOR UPDATE`,
        );
      }

      // Calcular stock comprometido en órdenes abiertas (dentro de la tx, datos frescos)
      // Siempre acotar al tenant de la mesa de la orden para no contaminar stock entre tenants
      const [orderTableRow] = await tx
        .select({ tenantId: restaurantTablesTable.tenantId })
        .from(restaurantTablesTable)
        .where(eq(restaurantTablesTable.id, order.tableId!));
      const scopeTenantId =
        req.tenantId ?? orderTableRow?.tenantId ?? undefined;
      const tenantTableIds =
        scopeTenantId !== undefined
          ? (
              await tx
                .select({ id: restaurantTablesTable.id })
                .from(restaurantTablesTable)
                .where(eq(restaurantTablesTable.tenantId, scopeTenantId))
            ).map((t) => t.id)
          : null;
      const openOrders =
        tenantTableIds !== null && tenantTableIds.length > 0
          ? await tx
              .select()
              .from(restaurantOrdersTable)
              .where(
                and(
                  eq(restaurantOrdersTable.status, "open"),
                  inArray(restaurantOrdersTable.tableId, tenantTableIds),
                ),
              )
          : tenantTableIds === null
            ? await tx
                .select()
                .from(restaurantOrdersTable)
                .where(eq(restaurantOrdersTable.status, "open"))
            : [];
      const openOrderIds = openOrders.map((o) => o.id);
      const openOrderItems =
        openOrderIds.length > 0
          ? await tx
              .select()
              .from(restaurantOrderItemsTable)
              .where(inArray(restaurantOrderItemsTable.orderId, openOrderIds))
          : [];

      if (product.tracksInventory !== false && isRecipeBased) {
        const ingredientIds = recipes
          .map((r) => r.ingredientId)
          .filter((id): id is number => id !== null);
        const openProductIds = [
          ...new Set(openOrderItems.map((it) => Number(it.productId))),
        ];
        const relevantProductIds = [
          ...new Set([...openProductIds, product.id]),
        ];

        const [ingredients, allRecipes, openProducts] = await Promise.all([
          ingredientIds.length > 0
            ? tx
                .select()
                .from(ingredientsTable)
                .where(inArray(ingredientsTable.id, ingredientIds))
            : Promise.resolve([]),
          relevantProductIds.length > 0
            ? tx
                .select()
                .from(productRecipesTable)
                .where(
                  inArray(productRecipesTable.productId, relevantProductIds),
                )
            : Promise.resolve([]),
          openProductIds.length > 0
            ? tx
                .select({ id: productsTable.id, tracksInventory: productsTable.tracksInventory })
                .from(productsTable)
                .where(
                  and(
                    inArray(productsTable.id, openProductIds),
                    scopeTenantId !== undefined
                      ? eq(productsTable.tenantId, scopeTenantId)
                      : undefined,
                  ),
                )
            : Promise.resolve([]),
        ]);
        const ingMap = new Map(ingredients.map((i) => [Number(i.id), i]));
        const controlledOpenProductIds = new Set(
          (openProducts as Array<{ id: number; tracksInventory: boolean }>)
            .filter((openProduct) => openProduct.tracksInventory !== false)
            .map((openProduct) => openProduct.id),
        );
        const committedIngs = new Map<number, number>();
        const committedInputProducts = new Map<number, number>();

        for (const item of openOrderItems) {
          const pId = Number(item.productId);
          if (!controlledOpenProductIds.has(pId)) continue;
          const qty = Number(item.quantity) || 0;
          const itemRecipes = allRecipes.filter(
            (r) => Number(r.productId) === pId,
          );
          for (const r of itemRecipes) {
            const rQty = Number(r.quantity) || 0;
            if (r.ingredientId != null) {
              const ingId = Number(r.ingredientId);
              committedIngs.set(
                ingId,
                (committedIngs.get(ingId) || 0) + rQty * qty,
              );
            }
            if (r.inputProductId != null) {
              const inputProductId = Number(r.inputProductId);
              committedInputProducts.set(
                inputProductId,
                (committedInputProducts.get(inputProductId) || 0) + rQty * qty,
              );
            }
          }
        }
        const inputProductIds = [
          ...new Set(
            recipes
              .map((r) => r.inputProductId)
              .filter((id): id is number => id !== null),
          ),
        ];
        const inputProducts = inputProductIds.length > 0
          ? await tx
              .select()
              .from(productsTable)
              .where(
                and(
                  inArray(productsTable.id, inputProductIds),
                  scopeTenantId !== undefined
                    ? eq(productsTable.tenantId, scopeTenantId)
                    : undefined,
                ),
              )
          : [];
        const inputProductMap = new Map(inputProducts.map((p) => [p.id, p]));

        // --- INICIO DE LA LÓGICA CORREGIDA PARA LEER DE LA BODEGA ---
        const posSalesWhId = await getSalesWarehouseId(scopeTenantId);
        const whStockMap = new Map<number, number>();

        if (posSalesWhId && ingredientIds.length > 0) {
          const whStocks = await tx
            .select({ 
              ingredientId: ingredientWarehouseStockTable.ingredientId, 
              qty: ingredientWarehouseStockTable.qty 
            })
            .from(ingredientWarehouseStockTable)
            .where(
              and(
                eq(ingredientWarehouseStockTable.warehouseId, posSalesWhId),
                inArray(ingredientWarehouseStockTable.ingredientId, ingredientIds)
              )
            );
          for (const ws of whStocks) {
            whStockMap.set(Number(ws.ingredientId), Number(ws.qty));
          }
        }

        for (const r of recipes) {
          if (r.inputProductId != null) {
            const inputProductId = Number(r.inputProductId);
            const inputProduct = inputProductMap.get(inputProductId);
            if (inputProduct?.tracksInventory === false) continue;
            const realStock =
              Number(inputProduct?.stock ?? 0) -
              (committedInputProducts.get(inputProductId) || 0);
            const needed = Number(r.quantity) * addedQuantity;
            if (realStock < needed) {
              throw new Error(
                `STOCK_ERR:No hay suficiente "${inputProduct?.name ?? "producto intermedio"}" para preparar este pedido. (Disponible: ${realStock}, Necesita: ${needed})`,
              );
            }
            continue;
          }
          if (r.ingredientId == null) continue;
          const ingId = Number(r.ingredientId);
          const ing = ingMap.get(ingId);
          const committed = committedIngs.get(ingId) || 0;

          // Si hay bodega de ventas, usa ese stock. Si no, usa el general (fallback)
          const realStock = posSalesWhId 
            ? (whStockMap.get(ingId) ?? 0) 
            : Number(ing?.stock || 0);

          const availableStock = realStock - committed;
          const needed = Number(r.quantity) * addedQuantity;

          if (availableStock < needed) {
            throw new Error(
              `STOCK_ERR:No hay suficiente "${ing?.name}" para preparar este pedido. (Disponible: ${availableStock}, Necesita: ${needed})`,
            );
          }
        }
      } else if (product.tracksInventory !== false) {
        // Para productos simples, products.stock es la fuente autoritativa,
        // igual que en disponibilidad y cierre de la venta.
        let realStock = 0;

        if (product.requiresProduction) {
          const [freshProduct] = await tx
            .select({ stock: productsTable.stock })
            .from(productsTable)
            .where(eq(productsTable.id, product.id));
          realStock = Number(freshProduct?.stock ?? product.stock);
        } else {
          const [freshProduct] = await tx
            .select({ stock: productsTable.stock })
            .from(productsTable)
            .where(eq(productsTable.id, product.id));
          realStock = Number(freshProduct?.stock ?? product.stock);
        }

        let committedQty = 0;
        for (const it of openOrderItems) {
          if (Number(it.productId) === Number(product.id)) {
            committedQty += Number(it.quantity) || 0;
          }
        }
        const availableStock = realStock - committedQty;

        if (availableStock < addedQuantity) {
          throw new Error(`STOCK_ERR:Stock insuficiente de ${product.name}. (Disponible: ${availableStock}, Necesita: ${addedQuantity})`);
        }
      }
      // Insertar o actualizar el ítem en la orden (dentro de la tx)
      // Match by productId AND personLabel so the same product for different people = separate rows
      const incomingPersonLabel = (body.data as any).personLabel ?? null;
      const orderItems = await tx
        .select()
        .from(restaurantOrderItemsTable)
        .where(eq(restaurantOrderItemsTable.orderId, order.id));
      const currentItem = orderItems.find(
        (item) =>
          Number(item.productId) === Number(product.id) &&
          (item.personLabel ?? null) === incomingPersonLabel,
      );

      // Si el ítem ya fue impreso (printedQty > 0), ya fue servido (servedQty > 0),
      // o la orden estaba 'ready', NO agrupar en la fila existente: crear una nueva
      // línea con printedQty = 0 para que el KDS la detecte como tarea pendiente nueva.
      const alreadyPrinted =
        currentItem !== undefined &&
        (
          Number(currentItem.printedQty) > 0 ||
          Number(currentItem.servedQty) > 0 ||
          order.kitchenStatus === "ready"
        );

      if (currentItem && !alreadyPrinted) {
        const nextQuantity = Number(currentItem.quantity) + addedQuantity;
        await tx
          .update(restaurantOrderItemsTable)
          .set({
            quantity: nextQuantity,
            lineTotal: money(Number(product.price) * nextQuantity),
          })
          .where(eq(restaurantOrderItemsTable.id, currentItem.id));
      } else {
        await tx.insert(restaurantOrderItemsTable).values({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: addedQuantity,
          unitPrice: product.price,
          lineTotal: money(Number(product.price) * addedQuantity),
          notes: body.data.notes ?? null,
          personLabel: incomingPersonLabel,
          station,
          printedQty: 0,
        });
      }

      // Si la orden estaba 'ready', volver a 'pending' para que el KDS
      // la muestre de nuevo en la cola de pendientes con el nuevo ítem.
      if (order.kitchenStatus === "ready") {
        await tx
          .update(restaurantOrdersTable)
          .set({ kitchenStatus: "pending" })
          .where(eq(restaurantOrdersTable.id, order.id));
      }

      return { ok: true };
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.message.startsWith("STOCK_ERR:")) {
        return {
          __stockError: err.message.slice("STOCK_ERR:".length),
        } as const;
      }
      throw err;
    });

  if (txResult && typeof txResult === "object" && "__stockError" in txResult) {
    res.status(400).json({ error: txResult.__stockError });
    return;
  }

  // recalculateRestaurantOrder usa db (no tx) — corre después del commit de la tx
  const updated = await recalculateRestaurantOrder(order.id, req.tenantId);
  if (req.tenantId !== undefined)
    sseBus.broadcast(req.tenantId, "orders_updated");
  res.status(201).json(UpdateRestaurantOrderItemResponse.parse(updated));
});

router.patch("/restaurant/order-items/:id", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.editItems)) return;
  const params = UpdateRestaurantOrderItemParams.safeParse(req.params);
  const body = UpdateRestaurantOrderItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid order item update" });
    return;
  }

  const [item] = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.id, params.data.id));
  if (!item) {
    res.status(404).json({ error: "Order item not found" });
    return;
  }
  const [order] = await db
    .select()
    .from(restaurantOrdersTable)
    .where(eq(restaurantOrdersTable.id, item.orderId));
  if (!order || order.status !== "open") {
    res.status(400).json({ error: "Order is not open" });
    return;
  }
  if (req.tenantId !== undefined) {
    const [tbl] = await db
      .select({ tenantId: restaurantTablesTable.tenantId })
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, order.tableId!));
    if (!tbl || tbl.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
  }

  const quantity = body.data.quantity ?? item.quantity;
  if (quantity <= 0) {
    res.status(400).json({ error: "Quantity must be positive" });
    return;
  }
  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, item.productId!),
        req.tenantId !== undefined
          ? eq(productsTable.tenantId, req.tenantId)
          : undefined,
      ),
    );
  if (
    product &&
    product.tracksInventory !== false &&
    !product.hasRecipe &&
    quantity > product.stock
  ) {
    res
      .status(400)
      .json({ error: `${product.name} does not have enough stock` });
    return;
  }

  await db
    .update(restaurantOrderItemsTable)
    .set({
      quantity,
      lineTotal: money(item.unitPrice * quantity),
      notes: body.data.notes ?? item.notes,
    })
    .where(eq(restaurantOrderItemsTable.id, item.id));

  const updated = await recalculateRestaurantOrder(item.orderId, req.tenantId);
  if (req.tenantId !== undefined)
    sseBus.broadcast(req.tenantId, "orders_updated");
  res.json(UpdateRestaurantOrderItemResponse.parse(updated));
});

router.delete(
  "/restaurant/order-items/:id",
  async (req, res): Promise<void> => {
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.removeItems)) return;
    const params = DeleteRestaurantOrderItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    // Fetch item first — do NOT mutate before verifying ownership
    const [item] = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, params.data.id));
    if (!item) {
      res.status(404).json({ error: "Order item not found" });
      return;
    }

    // Verify the parent order's table belongs to this tenant
    if (req.tenantId !== undefined) {
      const [order] = await db
        .select({ tableId: restaurantOrdersTable.tableId })
        .from(restaurantOrdersTable)
        .where(eq(restaurantOrdersTable.id, item.orderId));
      if (!order) {
        res.status(404).json({ error: "Order item not found" });
        return;
      }
      const [tbl] = await db
        .select({ tenantId: restaurantTablesTable.tenantId })
        .from(restaurantTablesTable)
        .where(eq(restaurantTablesTable.id, order.tableId!));
      if (!tbl || tbl.tenantId !== req.tenantId) {
        res.status(404).json({ error: "Order item not found" });
        return;
      }
    }

    await db
      .delete(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, item.id));

    const updated = await recalculateRestaurantOrder(
      item.orderId,
      req.tenantId,
    );
    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "orders_updated");
    res.json(DeleteRestaurantOrderItemResponse.parse(updated));
  },
);

router.post(
  "/restaurant/orders/:id/checkout",
  async (req, res): Promise<void> => {
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.checkout)) return;
    const params = CheckoutRestaurantOrderParams.safeParse(req.params);
    const body = CheckoutRestaurantOrderBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid checkout request" });
      return;
    }

    const [order] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(eq(restaurantOrdersTable.id, params.data.id));
    if (!order || order.status !== "open") {
      res.status(400).json({ error: "Order is not open" });
      return;
    }
    if (req.tenantId !== undefined) {
      const [tbl] = await db
        .select({ tenantId: restaurantTablesTable.tenantId })
        .from(restaurantTablesTable)
        .where(eq(restaurantTablesTable.id, order.tableId!));
      if (!tbl || tbl.tenantId !== req.tenantId) {
        res.status(403).json({ error: "Acceso denegado" });
        return;
      }
    }

    const checkoutEmployeeId = body.data.employeeId ?? null;
    if (checkoutEmployeeId !== null) {
      const [emp] = await db
        .select()
        .from(employeesTable)
        .where(eq(employeesTable.id, checkoutEmployeeId));
      if (!emp || emp.status !== "active") {
        res.status(400).json({ error: "Empleado no encontrado" });
        return;
      }
    }

    const [activeSplit] = await db
      .select({
        id: restaurantOrderSplitsTable.id,
        partsPaid: restaurantOrderSplitsTable.partsPaid,
      })
      .from(restaurantOrderSplitsTable)
      .where(and(eq(restaurantOrderSplitsTable.orderId, order.id)));
    if (activeSplit && activeSplit.partsPaid > 0) {
      res
        .status(409)
        .json({
          error:
            "Esta cuenta tiene un cobro dividido en curso. Usa la opción 'Dividir' para completarlo.",
        });
      return;
    }
    if (activeSplit) {
      await db
        .delete(restaurantOrderSplitsTable)
        .where(eq(restaurantOrderSplitsTable.id, activeSplit.id));
    }

    const items = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.orderId, order.id));
    if (items.length === 0) {
      res.status(400).json({ error: "Order requires at least one item" });
      return;
    }

    const checkoutItemProductIds = items.map((it) => it.productId!);
    const tid = req.tenantId;
    const products =
      checkoutItemProductIds.length > 0
        ? await db
            .select()
            .from(productsTable)
            .where(
              and(
                inArray(productsTable.id, checkoutItemProductIds),
                tid ? eq(productsTable.tenantId, tid) : undefined,
              ),
            )
        : [];
    const selectedProducts = items.map((item) => ({
      item,
      product: products.find((product) => product.id === item.productId),
    }));
    const missing = selectedProducts.find(({ product }) => !product);
    if (missing) {
      res.status(400).json({ error: "Product not found" });
      return;
    }

    const orderProductIds = selectedProducts.map(({ product }) => product!.id);
    const orderRecipes = orderProductIds.length
      ? await db
          .select()
          .from(productRecipesTable)
          .where(
            sql`${productRecipesTable.productId} IN (${sql.join(
              orderProductIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          )
      : [];

    // Validar stock: requiresProduction → stock físico; sin receta → stock directo
    // tracksInventory === false → no validar ni descontar stock.
    for (const { item, product } of selectedProducts) {
      if (product!.tracksInventory === false) continue;
      if (product!.requiresProduction) {
        if (product!.stock < item.quantity) {
          res
            .status(400)
            .json({
              error: `"${product!.name}" requiere producción previa. Stock actual: ${product!.stock}. Crea una orden de producción primero.`,
            });
          return;
        }
        continue;
      }
      const isRecipeBased = orderRecipes.some(
        (r) => r.productId === product!.id,
      );
      if (!isRecipeBased && product!.stock < item.quantity) {
        res
          .status(400)
          .json({ error: `${product!.name} no tiene stock suficiente` });
        return;
      }
    }

    const subtotal = money(
      items.reduce((total, item) => total + item.lineTotal, 0),
    );
    const totalCost = money(
      selectedProducts.reduce(
        (total, { item, product }) => total + product!.cost * item.quantity,
        0,
      ),
    );
    const receiptNumber = `T-${Date.now().toString(36).toUpperCase()}`;

    // ── Tax calculation for table checkout ──────────────────────────────────
    const tableTaxIncludedRaw = await readSetting(req.tenantId, "company_tax_included_in_price");
    const tableTaxIncluded = tableTaxIncludedRaw !== "false";
    const tableItemTaxData = selectedProducts.map(({ item, product }) => {
      const taxPct = Number(product!.taxPercent ?? 0);
      if (!taxPct) return { taxPercent: null as number | null, taxAmount: null as number | null, taxName: null as string | null };
      const taxAmt = tableTaxIncluded
        ? money(item.lineTotal * taxPct / (100 + taxPct))
        : money(item.lineTotal * taxPct / 100);
      return { taxPercent: taxPct, taxAmount: taxAmt, taxName: product!.taxName ?? null };
    });
    const tableTotalTaxAmount = tableItemTaxData.reduce((s, t) => s + (t.taxAmount ?? 0), 0);
    const tableItemTaxRates = [...new Set(tableItemTaxData.filter(t => t.taxPercent).map(t => t.taxPercent!))];
    const tableSaleTaxPercent = tableItemTaxRates.length === 1 ? tableItemTaxRates[0] : null;
    const tableSaleTaxName = tableSaleTaxPercent != null ? (tableItemTaxData.find(t => t.taxPercent === tableSaleTaxPercent)?.taxName ?? null) : null;
    const tableFinalSubtotal = !tableTaxIncluded && tableTotalTaxAmount > 0 ? money(subtotal + tableTotalTaxAmount) : subtotal;

    const orderIngredients = orderRecipes.length
      ? await db.select().from(ingredientsTable)
      : [];
    const orderIngMap = new Map(orderIngredients.map((i) => [i.id, i]));
    const tableInventory = computeSaleInventoryPlan({
      tenantId: tid,
      items: selectedProducts.map(({ item, product }) => ({
        productId: product!.id,
        quantity: item.quantity,
      })),
      products: selectedProducts.map(({ product }) => product!),
      recipes: orderRecipes,
    });
    const orderConsumption = tableInventory.ingredientConsumption;
    const orderProductInputConsumption = tableInventory.inputProductConsumption;
    await removeUntrackedProductInputs(db, orderProductInputConsumption, tid);
    // Resolve effective warehouse: prefer caja's warehouse, fall back to global sales warehouse.
    const tablesCajaId = (body.data as Record<string, unknown>).cajaId as number | null | undefined ?? (req.body.cajaId as number | null | undefined) ?? null;
    let mesasEffectiveWhId: number | null = null;
    if (tablesCajaId && req.tenantId !== undefined) {
      const [cajaForWh] = await db
        .select({ warehouseId: cajasTable.warehouseId })
        .from(cajasTable)
        .where(and(eq(cajasTable.id, tablesCajaId), eq(cajasTable.tenantId, req.tenantId)));
      mesasEffectiveWhId = cajaForWh?.warehouseId ?? null;
    }
    if (!mesasEffectiveWhId) {
      mesasEffectiveWhId = await getSalesWarehouseId(req.tenantId, req.branchId);
    }

    // Validar contra bodega de ventas activa (no ingredients.stock viejo).
    if (orderConsumption.size > 0) {
      if (!mesasEffectiveWhId) {
        res.status(400).json({ error: "No hay bodega de ventas configurada." });
        return;
      }
      const mesasWhStock = await getSalesWarehouseStock(
        mesasEffectiveWhId,
        Array.from(orderConsumption.keys()),
      );
      for (const [ingId, needed] of orderConsumption.entries()) {
        const available = mesasWhStock.get(ingId) ?? 0;
        if (available < needed) {
          const ing = orderIngMap.get(ingId);
          res.status(400).json({
            error: `Ingrediente "${ing?.name ?? `#${ingId}`}" insuficiente en bodega de ventas (disponible: ${available}, necesita: ${needed})`,
          });
          return;
        }
      }
    }

    const [tableRow] = await db
      .select()
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, order.tableId!));
    const tableKindMap = await loadPaymentMethodsMap(req.tenantId);
    const tablePaymentKind = resolveKind(tableKindMap, body.data.paymentMethod);
    const tableCustomerId = body.data.customerId ?? null;

    const sale = await db
      .transaction(async (tx) => {
        const claimed = await tx
          .update(restaurantOrdersTable)
          .set({ status: "paid", subtotal: tableFinalSubtotal, closedAt: new Date() })
          .where(
            and(
              eq(restaurantOrdersTable.id, order.id),
              eq(restaurantOrdersTable.status, "open"),
            ),
          )
          .returning({ id: restaurantOrdersTable.id });
        if (claimed.length === 0) throw new Error("ORDER_ALREADY_CLOSED");

        const [createdSale] = await tx
          .insert(salesTable)
          .values({
            receiptNumber,
            customerName:
              body.data.customerName ?? order.customerName ?? order.serverName,
            customerId: tableCustomerId,
            employeeId: body.data.employeeId ?? null,
            loyaltyPointsEarned: 0,
            paymentMethod: body.data.paymentMethod,
            payments: body.data.payments ?? [],
            subtotal: tableFinalSubtotal,
            totalCost,
            profit: money(tableFinalSubtotal - totalCost),
            tableId: order.tableId,
            tableName: tableRow?.name ?? null,
            tableArea: tableRow?.area ?? null,
            serverName: order.serverName ?? null,
            cajaId: tablesCajaId ?? null,
            taxAmount: tableTotalTaxAmount > 0 ? money(tableTotalTaxAmount) : null,
            taxPercent: tableSaleTaxPercent,
            taxName: tableSaleTaxName,
            tenantId: tid ?? null,
          })
          .returning();

        // Descontar stock para requiresProduction (mesa — venden desde stock producido)
        for (const { item, product } of selectedProducts) {
          if (!product!.requiresProduction) continue;
          if (product!.tracksInventory === false) continue;
          const updated = await tx
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
            .where(
              and(
                eq(productsTable.id, product!.id),
                gte(productsTable.stock, item.quantity),
              ),
            )
            .returning({ id: productsTable.id });
          if (updated.length === 0)
            throw new Error(`OUT_OF_STOCK:${product!.name}`);
        }

        // Descontar stock para productos sin receta y sin requiresProduction (mesa)
        for (const { item, product } of selectedProducts) {
          const isRecipeBased = orderRecipes.some(
            (r) => r.productId === product!.id,
          );
          if (isRecipeBased || product!.requiresProduction) continue;
          if (product!.tracksInventory === false) continue;
          const updated = await tx
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
            .where(
              and(
                eq(productsTable.id, product!.id),
                gte(productsTable.stock, item.quantity),
              ),
            )
            .returning({ id: productsTable.id });
          if (updated.length === 0)
            throw new Error(`OUT_OF_STOCK:${product!.name}`);
        }

        // Descontar ingredientes SOLO de la bodega de ventas activa — mesa.
        // mesasEffectiveWhId already resolved above (caja warehouse or global sales warehouse).
        if (mesasEffectiveWhId && orderConsumption.size > 0) {
          await deductFromSalesWarehouse(tx, mesasEffectiveWhId, orderConsumption);
        }

        // Descontar del stock operativo del turno (best-effort) — mesa.
        if (orderConsumption.size > 0 && tid) {
          for (const [ingId, needed] of orderConsumption.entries()) {
            await tx
              .update(operationalStockTable)
              .set({ qty: sql`GREATEST(0, ${operationalStockTable.qty} - ${needed})`, updatedAt: new Date() })
              .where(and(eq(operationalStockTable.tenantId, tid), eq(operationalStockTable.ingredientId, ingId)));
          }
        }

        // Descontar stock de productos intermedios usados como input (mesa)
        for (const [prodId, needed] of orderProductInputConsumption.entries()) {
          const updated = await tx
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} - ${needed}` })
            .where(
              and(
                eq(productsTable.id, prodId),
                gte(productsTable.stock, needed),
              ),
            )
            .returning({ id: productsTable.id });
          if (updated.length === 0)
            throw new Error(`OUT_OF_STOCK:producto_intermedio#${prodId}`);
        }

        const createdItems = await tx
          .insert(saleItemsTable)
          .values(
            selectedProducts.map(({ item, product }, i) => ({
              saleId: createdSale.id,
              productId: product!.id,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: product!.cost,
              lineTotal: item.lineTotal,
              taxPercent: tableItemTaxData[i]?.taxPercent ?? null,
              taxAmount: tableItemTaxData[i]?.taxAmount ?? null,
              taxName: tableItemTaxData[i]?.taxName ?? null,
            })),
          )
          .returning();

        await tx
          .update(restaurantOrdersTable)
          .set({ saleId: createdSale.id })
          .where(eq(restaurantOrdersTable.id, order.id));
        await tx
          .update(restaurantTablesTable)
          .set({ status: "available" })
          .where(eq(restaurantTablesTable.id, order.tableId!));

        if (body.data.linkedReceiptId) {
          await tx
            .update(paymentReceiptsTable)
            .set({ status: "linked", linkedSaleId: createdSale.id })
            .where(
              and(
                eq(paymentReceiptsTable.id, body.data.linkedReceiptId),
                eq(paymentReceiptsTable.status, "pending"),
              ),
            );
        }

        return saleResponse(createdSale, createdItems);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          if (err.message === "ORDER_ALREADY_CLOSED")
            return { __error: "Esta cuenta ya fue cobrada" } as const;
          if (err.message.startsWith("OUT_OF_STOCK:"))
            return { __error: `${err.message.slice(13)} agotado` } as const;
          if (err.message.startsWith("OUT_OF_INGREDIENT:"))
            return {
              __error: `Ingrediente ${err.message.slice(18)} insuficiente`,
            } as const;
        }
        throw err;
      });

    if (sale && typeof sale === "object" && "__error" in sale) {
      res.status(400).json({ error: sale.__error });
      return;
    }
    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "tables_updated");
    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "orders_updated");
    res.status(201).json(ListSalesResponseItem.parse(sale));
  },
);

router.post(
  "/restaurant/orders/:id/partial-checkout",
  async (req, res): Promise<void> => {
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.split)) return;
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.checkout)) return;
    try {
      const orderId = Number(req.params.id);
      const { amount, paymentMethod, customerName, splitId, items } =
        req.body as {
          amount?: number;
          paymentMethod?: string;
          customerName?: string;
          splitId?: number;
          items?: Array<{
            id: number;
            qty: number;
            unitPrice: number;
            productName: string;
          }>;
        };
      if (!orderId || !paymentMethod || !splitId) {
        res
          .status(400)
          .json({
            error:
              "Datos inválidos para el cobro parcial (se requiere splitId)",
          });
        return;
      }
      const [order] = await db
        .select()
        .from(restaurantOrdersTable)
        .where(eq(restaurantOrdersTable.id, orderId));
      if (!order || order.status !== "open") {
        res.status(400).json({ error: "Pedido no encontrado o ya cerrado" });
        return;
      }
      if (req.tenantId !== undefined) {
        const [tbl] = await db
          .select({ tenantId: restaurantTablesTable.tenantId })
          .from(restaurantTablesTable)
          .where(eq(restaurantTablesTable.id, order.tableId!));
        if (!tbl || tbl.tenantId !== req.tenantId) {
          res.status(403).json({ error: "Acceso denegado" });
          return;
        }
      }

      const [split] = await db
        .select()
        .from(restaurantOrderSplitsTable)
        .where(
          and(
            eq(restaurantOrderSplitsTable.id, splitId),
            eq(restaurantOrderSplitsTable.orderId, order.id),
          ),
        );
      if (!split) {
        res
          .status(404)
          .json({
            error: "División no encontrada o no corresponde a este pedido",
          });
        return;
      }
      if (split.partsPaid >= split.totalParts) {
        res
          .status(400)
          .json({
            error: "Todas las partes de la división ya fueron cobradas",
          });
        return;
      }

      const isItemsMode = split.mode === "items";
      const sentAmount = money(Number(amount) > 0 ? Number(amount) : 0);

      // ── GUARD 1: overcharge block ─────────────────────────────────────────
      // Reject if the amount to charge exceeds the current order subtotal by
      // more than $1 (rounding tolerance). Prevents negative balances.
      if (sentAmount > Number(order.subtotal) + 1) {
        res
          .status(400)
          .json({ error: "El monto a cobrar excede el saldo de la mesa." });
        return;
      }

      const tid = req.tenantId;
      const [tableRow] = await db
        .select()
        .from(restaurantTablesTable)
        .where(eq(restaurantTablesTable.id, order.tableId!));
      const receiptNumber = `SP-${Date.now().toString(36).toUpperCase()}`;

      // ── ITEMS MODE: deduct paid items from the order in real-time ────────
      // This makes each partial payment remove its items from the DB so that
      // when the modal reopens the remaining panel only shows unpaid items and
      // the subtotal reflects the true outstanding balance.
      let itemsNewSubtotal: number | null = null;
      if (isItemsMode && Array.isArray(items) && items.length > 0) {
        for (const paid of items) {
          const paidId = Number(paid.id);
          const paidQty = Number(paid.qty);
          if (!paidId || paidQty <= 0) continue;
          const [existing] = await db
            .select()
            .from(restaurantOrderItemsTable)
            .where(
              and(
                eq(restaurantOrderItemsTable.id, paidId),
                eq(restaurantOrderItemsTable.orderId, order.id),
              ),
            );
          if (!existing) continue;
          // GUARD 2: quantity can never go below zero
          const newQty = Math.max(0, existing.quantity - paidQty);
          if (newQty <= 0) {
            await db
              .delete(restaurantOrderItemsTable)
              .where(eq(restaurantOrderItemsTable.id, paidId));
          } else {
            await db
              .update(restaurantOrderItemsTable)
              .set({
                quantity: newQty,
                lineTotal: money(newQty * Number(existing.unitPrice)),
              })
              .where(eq(restaurantOrderItemsTable.id, paidId));
          }
        }
        // Recalculate subtotal from remaining items and persist it
        const remainingRows = await db
          .select({ lineTotal: restaurantOrderItemsTable.lineTotal })
          .from(restaurantOrderItemsTable)
          .where(eq(restaurantOrderItemsTable.orderId, order.id));
        // GUARD 3: subtotal floor at zero — can never go negative
        itemsNewSubtotal = Math.max(
          0,
          money(remainingRows.reduce((s, r) => s + Number(r.lineTotal), 0)),
        );
        await db
          .update(restaurantOrdersTable)
          .set({ subtotal: itemsNewSubtotal })
          .where(eq(restaurantOrdersTable.id, order.id));
      }

      // ── Determine isLastPart ──────────────────────────────────────────────
      // Items mode: last when all items have been deducted (subtotal → 0).
      // Equal mode: last when this is the final numbered part.
      const remaining = money(order.subtotal - split.amountPaid);
      const isLastPart = isItemsMode
        ? itemsNewSubtotal !== null && itemsNewSubtotal <= 0.01
        : split.partsPaid === split.totalParts - 1 ||
          sentAmount >= remaining - 0.01;

      // partAmount = what this customer pays
      const storedPartAmounts = split.partAmounts as number[] | null;
      const expectedAmount =
        !isItemsMode ? (storedPartAmounts?.[split.partsPaid] ?? null) : null;
      const partAmount = isLastPart
        ? (isItemsMode ? sentAmount || remaining : remaining)
        : money(sentAmount > 0 ? sentAmount : (expectedAmount ?? remaining));

      if (partAmount <= 0) {
        res
          .status(400)
          .json({ error: "El monto parcial debe ser mayor a cero" });
        return;
      }
      // Equal-mode validations only
      if (!isItemsMode) {
        if (!isLastPart && partAmount >= remaining) {
          res.status(400).json({
            error:
              "El monto de una parte parcial no puede cubrir el total restante; reserva eso para la última parte",
          });
          return;
        }
        if (
          !isLastPart &&
          expectedAmount !== null &&
          Math.abs(partAmount - expectedAmount) > 0.02
        ) {
          res.status(400).json({
            error: `El monto de la parte ${split.partsPaid + 1} debe ser ${expectedAmount}`,
          });
          return;
        }
      }

      if (!isLastPart) {
        const [sale] = await db
          .insert(salesTable)
          .values({
            receiptNumber,
            customerName:
              customerName ?? order.customerName ?? order.serverName,
            paymentMethod,
            subtotal: partAmount,
            totalCost: 0,
            profit: partAmount,
            tableId: order.tableId,
            tableName: tableRow?.name ?? null,
            tableArea: tableRow?.area ?? null,
            serverName: order.serverName ?? null,
            tenantId: tid ?? null,
          })
          .returning();
        const newPartsPaid = split.partsPaid + 1;
        await db
          .update(restaurantOrderSplitsTable)
          .set({
            partsPaid: newPartsPaid,
            amountPaid: money(split.amountPaid + partAmount),
          })
          .where(eq(restaurantOrderSplitsTable.id, split.id));
        // For items mode, remaining comes from the real recalculated subtotal.
        // For equal mode, remaining is arithmetic.
        const newRemaining = isItemsMode
          ? (itemsNewSubtotal ?? money(remaining - partAmount))
          : money(remaining - partAmount);
        const storedNextAmount =
          !isItemsMode
            ? ((split.partAmounts as number[] | null)?.[newPartsPaid] ?? null)
            : null;
        const partsLeft = split.totalParts - newPartsPaid;
        const nextAmount =
          storedNextAmount ??
          (partsLeft === 1 ? newRemaining : money(newRemaining / partsLeft));
        if (tid !== undefined) sseBus.broadcast(tid, "orders_updated");
        res.status(201).json({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          amount: partAmount,
          partsPaid: newPartsPaid,
          totalParts: split.totalParts,
          remaining: newRemaining,
          nextAmount,
          isComplete: false,
        });
        return;
      }

      const orderItems = await db
        .select()
        .from(restaurantOrderItemsTable)
        .where(eq(restaurantOrderItemsTable.orderId, order.id));
      const itemProductIds = [...new Set(orderItems.map((it) => it.productId!))];
      const products =
        itemProductIds.length > 0
          ? await db
              .select()
              .from(productsTable)
              .where(
                and(
                  inArray(productsTable.id, itemProductIds),
                  tid ? eq(productsTable.tenantId, tid) : undefined,
                ),
              )
          : [];
      const productMap = new Map(products.map((p) => [p.id, p]));
      const orderRecipes =
        itemProductIds.length > 0
          ? await db
              .select()
              .from(productRecipesTable)
              .where(inArray(productRecipesTable.productId, itemProductIds))
          : [];
      const ingredientIds = [
        ...new Set(
          orderRecipes
            .filter((r) => r.ingredientId != null)
            .map((r) => r.ingredientId!),
        ),
      ];
      const ingredients =
        ingredientIds.length > 0
          ? await db
              .select()
              .from(ingredientsTable)
              .where(inArray(ingredientsTable.id, ingredientIds))
          : [];
      const ingMap = new Map(ingredients.map((i) => [i.id, i]));

      const partialInventory = computeSaleInventoryPlan({
        tenantId: tid,
        items: orderItems.map((item) => ({
          productId: item.productId!,
          quantity: item.quantity,
        })),
        products,
        recipes: orderRecipes,
      });
      const ingConsumption = partialInventory.ingredientConsumption;
      const prodInputConsumption = partialInventory.inputProductConsumption;
      await removeUntrackedProductInputs(db, prodInputConsumption, tid);
      const totalCost = money(
        orderItems.reduce((s, item) => {
          const p = productMap.get(item.productId!);
          return s + (p ? p.cost * item.quantity : 0);
        }, 0),
      );

      const finalSale = await db
        .transaction(async (tx) => {
          const claimed = await tx
            .update(restaurantOrdersTable)
            .set({
              status: "paid",
              subtotal: order.subtotal,
              closedAt: new Date(),
            })
            .where(
              and(
                eq(restaurantOrdersTable.id, order.id),
                eq(restaurantOrdersTable.status, "open"),
              ),
            )
            .returning({ id: restaurantOrdersTable.id });
          if (claimed.length === 0) throw new Error("ORDER_ALREADY_CLOSED");

          // Compute sale-level tax for the last partial payment
      const partTaxIncluded = (await readSetting(tid, "company_tax_included_in_price")) !== "false";
      const partItemTaxData = orderItems.map((item) => {
        const product = productMap.get(item.productId!);
        const taxPct = Number(product?.taxPercent ?? 0);
        if (!taxPct) return { taxPercent: null as number | null, taxAmount: null as number | null, taxName: null as string | null };
        const lineTotal = money(Number(item.lineTotal));
        const taxAmt = partTaxIncluded
          ? money(lineTotal * taxPct / (100 + taxPct))
          : money(lineTotal * taxPct / 100);
        return { taxPercent: taxPct, taxAmount: taxAmt, taxName: product?.taxName ?? null };
      });
      const partTotalTax = partItemTaxData.reduce((s, t) => s + (t.taxAmount ?? 0), 0);
      const partTaxRates = [...new Set(partItemTaxData.filter(t => t.taxPercent).map(t => t.taxPercent!))];
      const partSaleTaxPercent = partTaxRates.length === 1 ? partTaxRates[0] : null;
      const partSaleTaxName = partSaleTaxPercent != null ? (partItemTaxData.find(t => t.taxPercent === partSaleTaxPercent)?.taxName ?? null) : null;

      const [createdSale] = await tx
            .insert(salesTable)
            .values({
              receiptNumber,
              customerName:
                customerName ?? order.customerName ?? order.serverName,
              paymentMethod,
              subtotal: partAmount,
              totalCost,
              profit: money(partAmount - totalCost),
              tableId: order.tableId,
              tableName: tableRow?.name ?? null,
              tableArea: tableRow?.area ?? null,
              serverName: order.serverName ?? null,
              taxAmount: partTotalTax > 0 ? money(partTotalTax) : null,
              taxPercent: partSaleTaxPercent,
              taxName: partSaleTaxName,
              tenantId: tid ?? null,
            })
            .returning();

          for (const item of orderItems) {
            const product = productMap.get(item.productId!);
            if (!product) continue;
            // tracksInventory=false → no deducir stock
            if (product.tracksInventory === false) continue;
            const isRecipeBased = orderRecipes.some(
              (r) => r.productId === item.productId,
            );
            if (product.requiresProduction || !isRecipeBased) {
              const updated = await tx
                .update(productsTable)
                .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
                .where(
                  and(
                    eq(productsTable.id, item.productId!),
                    gte(productsTable.stock, item.quantity),
                  ),
                )
                .returning({ id: productsTable.id });
              if (updated.length === 0) {
                throw new Error(`OUT_OF_STOCK:${product.name}`);
              }
            }
          }
          for (const [ingId, needed] of ingConsumption.entries()) {
            const ing = ingMap.get(ingId);
            if (ing && ing.stock < needed)
              throw new Error(`OUT_OF_INGREDIENT:${ing.name}`);
            await tx
              .update(ingredientsTable)
              .set({ stock: sql`${ingredientsTable.stock} - ${needed}` })
              .where(
                and(
                  eq(ingredientsTable.id, ingId),
                  gte(ingredientsTable.stock, needed),
                ),
              );
          }
          for (const [prodId, needed] of prodInputConsumption.entries()) {
            const updated = await tx
              .update(productsTable)
              .set({ stock: sql`${productsTable.stock} - ${needed}` })
              .where(
                and(
                  eq(productsTable.id, prodId),
                  gte(productsTable.stock, needed),
                ),
              )
              .returning({ id: productsTable.id });
            if (updated.length === 0) {
              throw new Error(`OUT_OF_STOCK:producto_intermedio#${prodId}`);
            }
          }
          const salesWhId = await getSalesWarehouseId(tid);
          if (salesWhId && ingConsumption.size > 0) {
            await deductFromSalesWarehouse(tx, salesWhId, ingConsumption);
          }
          await tx
            .update(restaurantOrderSplitsTable)
            .set({ partsPaid: split.totalParts, amountPaid: order.subtotal })
            .where(eq(restaurantOrderSplitsTable.id, split.id));
          await tx
            .update(restaurantOrdersTable)
            .set({ saleId: createdSale.id })
            .where(eq(restaurantOrdersTable.id, order.id));
          await tx
            .update(restaurantTablesTable)
            .set({ status: "available" })
            .where(eq(restaurantTablesTable.id, order.tableId!));
          return createdSale;
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.message === "ORDER_ALREADY_CLOSED") {
            return { __error: "Esta cuenta ya fue cobrada" } as const;
          }
          if (
            err instanceof Error &&
            err.message.startsWith("OUT_OF_INGREDIENT:")
          ) {
            return {
              __error: `Ingrediente "${err.message.slice(18)}" insuficiente`,
            } as const;
          }
          if (
            err instanceof Error &&
            err.message.startsWith("OUT_OF_STOCK:")
          ) {
            return {
              __error: `"${err.message.slice(13)}" sin stock suficiente`,
            } as const;
          }
          throw err;
        });

      if (
        finalSale &&
        typeof finalSale === "object" &&
        "__error" in finalSale
      ) {
        res.status(400).json({ error: finalSale.__error });
        return;
      }
      if (tid !== undefined) {
        sseBus.broadcast(tid, "tables_updated");
        sseBus.broadcast(tid, "orders_updated");
      }
      res.status(201).json({
        id: finalSale.id,
        receiptNumber: finalSale.receiptNumber,
        amount: partAmount,
        partsPaid: split.totalParts,
        totalParts: split.totalParts,
        remaining: 0,
        isComplete: true,
      });
    } catch (err) {
      req.log.error({ err }, "Error en cobro parcial");
      res.status(500).json({ error: "No se pudo registrar el cobro parcial" });
    }
  },
);

router.post("/restaurant/orders/:id/print", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.print)) return;
  const params = PrintRestaurantOrderStationParams.safeParse(req.params);
  const body = PrintRestaurantOrderStationBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)?.message });
    return;
  }

  const [order] = await db
    .select()
    .from(restaurantOrdersTable)
    .where(eq(restaurantOrdersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Restaurant order not found" });
    return;
  }
  if (req.tenantId !== undefined) {
    const [tbl] = await db
      .select({ tenantId: restaurantTablesTable.tenantId })
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, order.tableId!));
    if (!tbl || tbl.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
  }
  if (order.status !== "open") {
    res.status(400).json({ error: "Only open orders can be printed" });
    return;
  }

  const rawStation = body.data.station.trim().toLowerCase();
  const stationKey = (KITCHEN_STATIONS as readonly string[]).includes(
    rawStation,
  )
    ? rawStation
    : DEFAULT_STATION;
  const mode = body.data.mode;

  const allItems = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.orderId, order.id));

  for (const it of allItems) {
    if (!it.station) {
      const sKey = await resolveStation(it.productId!, req.tenantId);
      await db
        .update(restaurantOrderItemsTable)
        .set({ station: sKey })
        .where(eq(restaurantOrderItemsTable.id, it.id));
      it.station = sKey;
    }
  }

  const stationItems = allItems.filter(
    (it) => (it.station ?? DEFAULT_STATION) === stationKey,
  );

  const ticketItems = stationItems
    .map((it) => {
      const deltaQty =
        mode === "full"
          ? it.quantity
          : Math.max(0, it.quantity - (it.printedQty ?? 0));
      return {
        id: it.id,
        productName: it.productName,
        quantity: it.quantity,
        deltaQty,
        notes: it.notes ?? null,
      };
    })
    .filter((it) => it.deltaQty > 0);

  if (mode === "delta") {
    for (const it of stationItems) {
      if (it.quantity > (it.printedQty ?? 0)) {
        await db
          .update(restaurantOrderItemsTable)
          .set({ printedQty: it.quantity })
          .where(eq(restaurantOrderItemsTable.id, it.id));
      }
    }
  }

  const updated = await recalculateRestaurantOrder(order.id, req.tenantId);
  res.json(
    PrintRestaurantOrderStationResponse.parse({
      station: stationKey,
      mode,
      items: ticketItems,
      order: updated,
    }),
  );
});

router.get("/restaurant/kitchen/:station", async (req, res): Promise<void> => {
  const params = GetKitchenStationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rawStation = params.data.station.trim().toLowerCase();
  const stationKey = (KITCHEN_STATIONS as readonly string[]).includes(
    rawStation,
  )
    ? rawStation
    : DEFAULT_STATION;

  const tid = req.tenantId;
  const openOrders = await db
    .select({
      orderId: restaurantOrdersTable.id,
      tableId: restaurantOrdersTable.tableId,
      tableName: restaurantTablesTable.name,
      serverName: restaurantOrdersTable.serverName,
      orderCreatedAt: restaurantOrdersTable.createdAt,
      deliveryId: restaurantOrdersTable.deliveryId,
    })
    .from(restaurantOrdersTable)
    .innerJoin(
      restaurantTablesTable,
      eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
    )
    .where(
      and(
        or(
          eq(restaurantOrdersTable.status, "open"),
          and(
            eq(restaurantOrdersTable.status, "awaiting_payment"),
            ne(restaurantOrdersTable.kitchenStatus, "hold"),
          ),
        ),
        tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
      ),
    );

  // ── Filter: delivery orders only reach KDS when confirmed or preparing ──────
  const deliveryOrderIds = openOrders
    .filter((o) => o.deliveryId != null)
    .map((o) => o.deliveryId as number);

  // Map deliveryId → delivery status (batch fetch to avoid N+1)
  const deliveryStatusMap = new Map<number, string>();
  if (deliveryOrderIds.length > 0) {
    const deliveries = await db
      .select({ id: deliveriesTable.id, status: deliveriesTable.status, customerName: deliveriesTable.customerName })
      .from(deliveriesTable)
      .where(inArray(deliveriesTable.id, deliveryOrderIds));
    for (const d of deliveries) {
      deliveryStatusMap.set(d.id, d.status);
    }
  }

  const ALLOWED_DELIVERY_STATUSES = new Set(["confirmed", "preparing"]);

  const filteredOrders = openOrders.filter((o) => {
    if (o.deliveryId == null) return true; // regular table order — always show
    const dStatus = deliveryStatusMap.get(o.deliveryId);
    return dStatus != null && ALLOWED_DELIVERY_STATUSES.has(dStatus);
  });

  if (filteredOrders.length === 0) {
    res.json(
      GetKitchenStationResponse.parse({ station: stationKey, items: [] }),
    );
    return;
  }

  const orderIds = filteredOrders.map((o) => o.orderId);
  const allItems = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(inArray(restaurantOrderItemsTable.orderId, orderIds));

  for (const it of allItems) {
    if (!it.station) {
      const sKey = await resolveStation(it.productId!, req.tenantId);
      await db
        .update(restaurantOrderItemsTable)
        .set({ station: sKey })
        .where(eq(restaurantOrderItemsTable.id, it.id));
      it.station = sKey;
    }
  }

  const pendingItems = allItems.filter(
    (it) =>
      (it.station ?? DEFAULT_STATION) === stationKey &&
      it.quantity > (it.servedQty ?? 0),
  );

  const orderMap = new Map(filteredOrders.map((o) => [o.orderId, o]));

  const responseItems = pendingItems.map((it) => {
    const order = orderMap.get(it.orderId)!;
    const servedQty = it.servedQty ?? 0;
    return {
      id: it.id,
      orderId: it.orderId,
      tableId: order.tableId,
      tableName: order.tableName,
      serverName: order.serverName,
      // customerName: for delivery orders serverName = customerName (set at order creation)
      customerName: order.deliveryId ? order.serverName : null,
      productName: it.productName,
      quantity: it.quantity,
      servedQty,
      pendingQty: Math.max(0, it.quantity - servedQty),
      notes: it.notes ?? null,
      station: it.station ?? null,
      orderCreatedAt: order.orderCreatedAt,
      isDelivery: !!order.deliveryId,
      deliveryId: order.deliveryId ?? null,
    };
  });

  res.json(
    GetKitchenStationResponse.parse({
      station: stationKey,
      items: responseItems,
    }),
  );
});

// ── KDS: partial-advance helpers ─────────────────────────────────────────────
type KitchenItemRow = typeof restaurantOrderItemsTable.$inferSelect;
type KitchenStatus = "new" | "preparing" | "ready" | "delivered";

function kitchenStatusFromCounters(it: {
  quantity: number;
  printedQty: number | null;
  servedQty: number | null;
  deliveredQty: number | null;
}): KitchenStatus {
  if ((it.deliveredQty ?? 0) >= it.quantity) return "delivered";
  if ((it.servedQty ?? 0) >= it.quantity) return "ready";
  if ((it.printedQty ?? 0) > 0) return "preparing";
  return "new";
}

function kitchenCountersForStatus(
  status: KitchenStatus,
  qty: number,
): { printedQty: number; servedQty: number; deliveredQty: number } {
  switch (status) {
    case "delivered":
      return { printedQty: qty, servedQty: qty, deliveredQty: qty };
    case "ready":
      return { printedQty: qty, servedQty: qty, deliveredQty: 0 };
    case "preparing":
      return { printedQty: qty, servedQty: 0, deliveredQty: 0 };
    default:
      return { printedQty: 0, servedQty: 0, deliveredQty: 0 };
  }
}

type AdvanceQtyResult =
  | { ok: true; qty: number | undefined }
  | { ok: false; error: string };

// Parse the optional `{ quantity }` body of a kitchen-advance request.
// A missing body or missing `quantity` means "advance all" (undefined).
// A present-but-invalid `quantity` is rejected so a malformed payload never
// silently upgrades to advancing the whole line.
function parseAdvanceQty(body: unknown): AdvanceQtyResult {
  if (
    body == null ||
    typeof body !== "object" ||
    !("quantity" in body) ||
    (body as { quantity?: unknown }).quantity === undefined
  ) {
    return { ok: true, qty: undefined };
  }
  const parsed = z
    .object({ quantity: z.number().int().positive() })
    .safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "quantity inválido" };
  }
  return { ok: true, qty: parsed.data.quantity };
}

// Advance up to `requestedQty` units of a kitchen item to `target` status.
// When the requested quantity is less than the line quantity, the row is split:
// the existing row becomes the advanced portion (moves to `target`) and a new
// row keeps the remainder at its previous status. Returns the units advanced.
//
// The whole operation runs in a single transaction and locks the target row
// (SELECT ... FOR UPDATE) so the update+insert split is atomic and safe against
// concurrent advances on the same item.
async function advanceKitchenItem(
  item: KitchenItemRow,
  target: KitchenStatus,
  requestedQty: number | undefined,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [cur] = await tx
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, item.id))
      .for("update");

    if (!cur) return 0;

    const advanceQty = Math.min(
      requestedQty && requestedQty > 0 ? requestedQty : cur.quantity,
      cur.quantity,
    );

    if (advanceQty >= cur.quantity) {
      const c = kitchenCountersForStatus(target, cur.quantity);
      await tx
        .update(restaurantOrderItemsTable)
        .set({
          printedQty: c.printedQty,
          servedQty: c.servedQty,
          deliveredQty: c.deliveredQty,
        })
        .where(eq(restaurantOrderItemsTable.id, cur.id));
      return cur.quantity;
    }

    const origStatus = kitchenStatusFromCounters(cur);
    const remainder = cur.quantity - advanceQty;
    const adv = kitchenCountersForStatus(target, advanceQty);
    const rem = kitchenCountersForStatus(origStatus, remainder);

    await tx
      .update(restaurantOrderItemsTable)
      .set({
        quantity: advanceQty,
        lineTotal: money(cur.unitPrice * advanceQty),
        printedQty: adv.printedQty,
        servedQty: adv.servedQty,
        deliveredQty: adv.deliveredQty,
      })
      .where(eq(restaurantOrderItemsTable.id, cur.id));

    await tx.insert(restaurantOrderItemsTable).values({
      orderId: cur.orderId,
      productId: cur.productId,
      productName: cur.productName,
      quantity: remainder,
      unitPrice: cur.unitPrice,
      lineTotal: money(cur.unitPrice * remainder),
      notes: cur.notes,
      personLabel: cur.personLabel,
      station: cur.station,
      printedQty: rem.printedQty,
      servedQty: rem.servedQty,
      deliveredQty: rem.deliveredQty,
    });

    return advanceQty;
  });
}

router.post(
  "/restaurant/kitchen/items/:id/serve",
  async (req, res): Promise<void> => {
    const params = ServeKitchenItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [item] = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, params.data.id));

    if (!item) {
      res.status(404).json({ error: "Kitchen item not found" });
      return;
    }

    const [order] = await db
      .select({
        orderId: restaurantOrdersTable.id,
        tableId: restaurantOrdersTable.tableId,
        tableName: restaurantTablesTable.name,
        serverName: restaurantOrdersTable.serverName,
        orderCreatedAt: restaurantOrdersTable.createdAt,
        tenantId: restaurantTablesTable.tenantId,
        status: restaurantOrdersTable.status,
      })
      .from(restaurantOrdersTable)
      .innerJoin(
        restaurantTablesTable,
        eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
      )
      .where(eq(restaurantOrdersTable.id, item.orderId));

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (req.tenantId !== undefined && order.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    const servedQtyResult = parseAdvanceQty(req.body);
    if (!servedQtyResult.ok) {
      res.status(400).json({ error: servedQtyResult.error });
      return;
    }

    const servedNow = await advanceKitchenItem(item, "ready", servedQtyResult.qty);

    // ── Sync delivery status when KDS item is served ──────────────────────────
    const [kdsOrder] = await db
      .select({
        deliveryId: restaurantOrdersTable.deliveryId,
        tenantId: restaurantOrdersTable.tenantId,
      })
      .from(restaurantOrdersTable)
      .where(eq(restaurantOrdersTable.id, item.orderId))
      .limit(1);

    if (kdsOrder?.deliveryId) {
      // Re-fetch all items for this order to check completion (item just updated)
      const allItems = await db
        .select({ id: restaurantOrderItemsTable.id, quantity: restaurantOrderItemsTable.quantity, servedQty: restaurantOrderItemsTable.servedQty })
        .from(restaurantOrderItemsTable)
        .where(eq(restaurantOrderItemsTable.orderId, item.orderId));

      const allServed = allItems.every((i) => (i.servedQty ?? 0) >= i.quantity);

      const newDeliveryStatus: "delivered" | "preparing" = allServed ? "delivered" : "preparing";
      await db
        .update(deliveriesTable)
        .set({ status: newDeliveryStatus, updatedAt: new Date() })
        .where(
          and(
            eq(deliveriesTable.id, kdsOrder.deliveryId),
            // Only advance forward: confirmed/preparing → preparing, confirmed/preparing → ready
            inArray(deliveriesTable.status, allServed ? ["confirmed", "preparing"] : ["confirmed"]),
          )
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json(
      ServeKitchenItemResponse.parse({
        id: item.id,
        orderId: item.orderId,
        tableId: order.tableId,
        tableName: order.tableName,
        serverName: order.serverName,
        productName: item.productName,
        quantity: servedNow,
        servedQty: servedNow,
        pendingQty: 0,
        notes: item.notes ?? null,
        station: item.station ?? null,
        orderCreatedAt: order.orderCreatedAt,
      }),
    );
  },
);

// ── KDS: mark item as in preparation (printedQty = quantity) ─────────────────
router.post(
  "/restaurant/kitchen/items/:id/prepare",
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [item] = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, id));

    if (!item) {
      res.status(404).json({ error: "Ítem no encontrado" });
      return;
    }

    const [order] = await db
      .select({
        orderId: restaurantOrdersTable.id,
        tenantId: restaurantTablesTable.tenantId,
        status: restaurantOrdersTable.status,
      })
      .from(restaurantOrdersTable)
      .innerJoin(
        restaurantTablesTable,
        eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
      )
      .where(eq(restaurantOrdersTable.id, item.orderId));

    if (!order) {
      res.status(404).json({ error: "Orden no encontrada" });
      return;
    }

    if (req.tenantId !== undefined && order.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    const preparedQtyResult = parseAdvanceQty(req.body);
    if (!preparedQtyResult.ok) {
      res.status(400).json({ error: preparedQtyResult.error });
      return;
    }

    const preparedNow = await advanceKitchenItem(
      item,
      "preparing",
      preparedQtyResult.qty,
    );

    res.json({ id: item.id, printedQty: preparedNow, ok: true });
  },
);

// ── KDS: mark item as delivered to table ──────────────────────────────────────
router.post(
  "/restaurant/kitchen/items/:id/deliver",
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [item] = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, id));

    if (!item) {
      res.status(404).json({ error: "Ítem no encontrado" });
      return;
    }

    const [order] = await db
      .select({
        orderId: restaurantOrdersTable.id,
        tenantId: restaurantTablesTable.tenantId,
        status: restaurantOrdersTable.status,
      })
      .from(restaurantOrdersTable)
      .innerJoin(
        restaurantTablesTable,
        eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
      )
      .where(eq(restaurantOrdersTable.id, item.orderId));

    if (!order) {
      res.status(404).json({ error: "Orden no encontrada" });
      return;
    }

    if (req.tenantId !== undefined && order.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    const deliveredQtyResult = parseAdvanceQty(req.body);
    if (!deliveredQtyResult.ok) {
      res.status(400).json({ error: deliveredQtyResult.error });
      return;
    }

    const deliveredNow = await advanceKitchenItem(
      item,
      "delivered",
      deliveredQtyResult.qty,
    );

    res.json({ id: item.id, deliveredQty: deliveredNow, ok: true });
  },
);

// ── KDS: revert a delivered item back to "ready" ──────────────────────────────
// Inverse of advanceKitchenItem for the delivered→ready transition.
// When requestedQty < item.quantity the row is split: the existing row keeps the
// still-delivered portion and a new row is created at "ready" status.
async function revertKitchenItem(
  item: KitchenItemRow,
  requestedQty: number | undefined,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [cur] = await tx
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, item.id))
      .for("update");

    if (!cur) return 0;

    const revertable = cur.deliveredQty ?? 0;
    if (revertable === 0) return 0;

    const revertQty = Math.min(
      requestedQty && requestedQty > 0 ? requestedQty : revertable,
      revertable,
    );

    if (revertQty >= cur.quantity) {
      // Revert the whole row to "ready"
      const c = kitchenCountersForStatus("ready", cur.quantity);
      await tx
        .update(restaurantOrderItemsTable)
        .set({ printedQty: c.printedQty, servedQty: c.servedQty, deliveredQty: c.deliveredQty })
        .where(eq(restaurantOrderItemsTable.id, cur.id));
      return cur.quantity;
    }

    // Partial revert: split the row.
    // Existing row keeps the still-delivered remainder.
    const kept = cur.quantity - revertQty;
    const keptC = kitchenCountersForStatus("delivered", kept);
    const revC = kitchenCountersForStatus("ready", revertQty);

    await tx
      .update(restaurantOrderItemsTable)
      .set({
        quantity: kept,
        lineTotal: money(cur.unitPrice * kept),
        printedQty: keptC.printedQty,
        servedQty: keptC.servedQty,
        deliveredQty: keptC.deliveredQty,
      })
      .where(eq(restaurantOrderItemsTable.id, cur.id));

    await tx.insert(restaurantOrderItemsTable).values({
      orderId: cur.orderId,
      productId: cur.productId,
      productName: cur.productName,
      quantity: revertQty,
      unitPrice: cur.unitPrice,
      lineTotal: money(cur.unitPrice * revertQty),
      notes: cur.notes,
      personLabel: cur.personLabel,
      station: cur.station,
      printedQty: revC.printedQty,
      servedQty: revC.servedQty,
      deliveredQty: revC.deliveredQty,
    });

    return revertQty;
  });
}

router.post(
  "/restaurant/kitchen/items/:id/undeliver",
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [item] = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.id, id));

    if (!item) {
      res.status(404).json({ error: "Ítem no encontrado" });
      return;
    }

    const [order] = await db
      .select({ tenantId: restaurantTablesTable.tenantId })
      .from(restaurantOrdersTable)
      .innerJoin(
        restaurantTablesTable,
        eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
      )
      .where(eq(restaurantOrdersTable.id, item.orderId));

    if (!order) {
      res.status(404).json({ error: "Orden no encontrada" });
      return;
    }

    if (req.tenantId !== undefined && order.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    if ((item.deliveredQty ?? 0) === 0) {
      res.status(409).json({ error: "El ítem no ha sido entregado" });
      return;
    }

    const revertQtyResult = parseAdvanceQty(req.body);
    if (!revertQtyResult.ok) {
      res.status(400).json({ error: revertQtyResult.error });
      return;
    }

    const revertedQty = await revertKitchenItem(item, revertQtyResult.qty);
    res.json({ id: item.id, revertedQty, ok: true });
  },
);

// ── KDS: GET all open orders with items for the kitchen display ───────────────
router.get("/restaurant/kitchen-orders", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const filtered = await db
    .select({
      id: restaurantOrdersTable.id,
      tableId: restaurantOrdersTable.tableId,
      tableName: restaurantTablesTable.name,
      serverName: restaurantOrdersTable.serverName,
      kitchenStatus: restaurantOrdersTable.kitchenStatus,
      subtotal: restaurantOrdersTable.subtotal,
      createdAt: restaurantOrdersTable.createdAt,
    })
    .from(restaurantOrdersTable)
    .innerJoin(
      restaurantTablesTable,
      eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
    )
    .where(
      and(
        or(
          eq(restaurantOrdersTable.status, "open"),
          and(
            eq(restaurantOrdersTable.status, "awaiting_payment"),
            ne(restaurantOrdersTable.kitchenStatus, "hold"),
          ),
        ),
        tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
      ),
    )
    .orderBy(asc(restaurantOrdersTable.createdAt));

  if (filtered.length === 0) {
    res.json(ListKitchenOrdersResponse.parse([]));
    return;
  }

  const orderIds = filtered.map((o) => o.id);
  const allItems = await db
    .select({
      id: restaurantOrderItemsTable.id,
      orderId: restaurantOrderItemsTable.orderId,
      productName: restaurantOrderItemsTable.productName,
      quantity: restaurantOrderItemsTable.quantity,
      printedQty: restaurantOrderItemsTable.printedQty,
      servedQty: restaurantOrderItemsTable.servedQty,
      deliveredQty: restaurantOrderItemsTable.deliveredQty,
      notes: restaurantOrderItemsTable.notes,
      station: restaurantOrderItemsTable.station,
    })
    .from(restaurantOrderItemsTable)
    .where(inArray(restaurantOrderItemsTable.orderId, orderIds));

  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const result = filtered.map((order) => ({
    id: order.id,
    tableId: order.tableId,
    tableName: order.tableName,
    serverName: order.serverName,
    kitchenStatus: order.kitchenStatus as "pending" | "preparing" | "ready",
    subtotal: order.subtotal,
    createdAt: order.createdAt,
    items: (itemsByOrder.get(order.id) ?? [])
      // Mostrar todos los ítems de órdenes abiertas (el frontend filtra por pestaña)
      .filter(() => true)
      .map((it) => ({
        id: it.id,
        productName: it.productName,
        quantity: it.quantity,
        printedQty: it.printedQty ?? 0,
        servedQty: it.servedQty ?? 0,
        deliveredQty: it.deliveredQty ?? 0,
        pendingQty: Math.max(0, it.quantity - (it.servedQty ?? 0)),
        notes: it.notes ?? null,
        station: it.station ?? null,
      })),
  }));

  res.json(ListKitchenOrdersResponse.parse(result));
});

// ── Runner ticket: ESC/POS direct print ───────────────────────────────────────
// Sends raw ESC/POS bytes to the network printer configured with zone="runner".
// Returns {ok:true} when the printer accepted the job, or {ok:false, reason:...}
// when no printer is configured (client should fall back to browser popup).

interface RunnerPrinterCfg {
  id: string;
  name: string;
  type: "usb" | "network" | "bluetooth";
  ip?: string;
  port?: number;
  zone: string;
  paperWidth?: "58mm" | "80mm";
  fontSize?: "small" | "normal" | "large";
  lineSpacing?: "tight" | "normal" | "relaxed";
  marginMm?: number;
  density?: "light" | "normal" | "dark";
  autoCut?: boolean;
  /** Optional explicit local agent/device binding. */
  agentId?: number;
  deviceId?: string;
  deviceName?: string;
}

interface EscPosProfile {
  paperWidth: "58mm" | "80mm";
  fontSize: "small" | "normal" | "large";
  lineSpacing: "tight" | "normal" | "relaxed";
  marginMm: number;
  density: "light" | "normal" | "dark";
  autoCut: boolean;
}

const DEFAULT_ESC_POS_PROFILE: EscPosProfile = {
  paperWidth: "80mm",
  fontSize: "normal",
  lineSpacing: "normal",
  marginMm: 4,
  density: "normal",
  autoCut: true,
};

function normalizeEscPosProfile(printer: RunnerPrinterCfg): EscPosProfile {
  return {
    paperWidth: printer.paperWidth === "58mm" ? "58mm" : "80mm",
    fontSize: printer.fontSize === "small" || printer.fontSize === "large" ? printer.fontSize : "normal",
    lineSpacing: printer.lineSpacing === "tight" || printer.lineSpacing === "relaxed" ? printer.lineSpacing : "normal",
    marginMm: Math.min(12, Math.max(0, Number.isFinite(Number(printer.marginMm)) ? Number(printer.marginMm) : 4)),
    density: printer.density === "light" || printer.density === "dark" ? printer.density : "normal",
    autoCut: printer.autoCut !== false,
  };
}

function escPosFontMode(size: EscPosProfile["fontSize"], heading = false): number {
  if (size === "small") return heading ? 0x09 : 0x01;
  if (size === "large") return heading ? 0x11 : 0x10;
  return heading ? 0x10 : 0x00;
}

function escPosChars(profile: EscPosProfile): number {
  return profile.paperWidth === "58mm" ? 32 : 48;
}

function escPosSetup(profile: EscPosProfile, write: (bytes: number[]) => void): void {
  const spacing = profile.lineSpacing === "tight" ? 18 : profile.lineSpacing === "relaxed" ? 32 : 24;
  const marginDots = Math.round(profile.marginMm * 8);
  const maxHeatingDots = profile.density === "light" ? 80 : profile.density === "dark" ? 160 : 120;
  write([0x1b, 0x33, spacing]);
  write([0x1d, 0x4c, marginDots & 0xff, (marginDots >> 8) & 0xff]);
  write([0x1b, 0x37, maxHeatingDots, 0x10, 0x10]);
}

function buildEscPosRunnerTicket(
  companyName: string,
  tableName: string,
  tableEmoji: string,
  items: Array<{ quantity: number; productName: string; notes: string | null }>,
  now: string,
  profile: EscPosProfile = DEFAULT_ESC_POS_PROFILE,
): Buffer {
  const ESC = 0x1b;
  const GS  = 0x1d;
  const enc = (s: string) => Buffer.from(s, "latin1");
  const parts: Buffer[] = [];
  const chars = escPosChars(profile);

  const w = (b: number[]) => parts.push(Buffer.from(b));
  const t = (s: string)   => parts.push(enc(s));
  const nl = ()           => parts.push(Buffer.from([0x0a]));
  const fit = (s: string, max = chars) => s.slice(0, max);
  const sep = ()          => { t("-".repeat(chars)); nl(); };

  // Initialize + center
  w([ESC, 0x40]);
  escPosSetup(profile, w);
  w([ESC, 0x61, 0x01]);

  // Company header (bold, double height)
  w([ESC, 0x45, 0x01]);
  w([ESC, 0x21, escPosFontMode(profile.fontSize, true)]);
  t(fit(companyName.toUpperCase())); nl();
  w([ESC, 0x21, escPosFontMode(profile.fontSize)]);
  w([ESC, 0x45, 0x00]);

  // Subtitle
  t(fit("PASE A MESA")); nl();
  sep();

  // Table name (large bold)
  w([ESC, 0x45, 0x01]);
  w([ESC, 0x21, escPosFontMode(profile.fontSize, true)]);
  t(fit(`${tableEmoji} ${tableName}`)); nl();
  w([ESC, 0x21, escPosFontMode(profile.fontSize)]);
  w([ESC, 0x45, 0x00]);
  sep();

  // Items — left-aligned
  w([ESC, 0x61, 0x00]);
  for (const item of items) {
    w([ESC, 0x45, 0x01]);
    t(`${String(item.quantity).padStart(2)} `);
    w([ESC, 0x45, 0x00]);
    t(fit(item.productName, Math.max(1, chars - 3))); nl();
    if (item.notes) {
      t(fit(`   > ${item.notes}`, Math.max(1, chars - 3))); nl();
    }
  }

  // Footer — centered
  w([ESC, 0x61, 0x01]);
  sep();
  t(now); nl();

  // Feed + cut
  w([ESC, 0x64, 0x04]);
  if (profile.autoCut) w([GS, 0x56, 0x41, 0x00]);

  return Buffer.concat(parts);
}

function sendEscPosOverTcp(
  ip: string,
  port: number,
  data: Buffer,
  timeoutMs = 5000,
): Promise<void> {
  const destinationError = validatePrinterDestination(ip, port);
  if (destinationError) return Promise.reject(new Error(destinationError));
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err); else resolve();
    };
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish(new Error("Printer connection timed out")));
    socket.on("error", finish);
    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) finish(err); else finish();
      });
    });
  });
}

async function enqueueLocalPrintJob(
  tenantId: number,
  printer: RunnerPrinterCfg,
  payload: Buffer,
): Promise<number | null> {
  const agents = await db.select({ id: printAgentsTable.id })
    .from(printAgentsTable)
    .where(and(
      eq(printAgentsTable.tenantId, tenantId),
      isNull(printAgentsTable.revokedAt),
      ...(printer.agentId ? [eq(printAgentsTable.id, printer.agentId)] : []),
    ))
    .orderBy(desc(printAgentsTable.lastSeenAt))
    .limit(1);
  const agent = agents[0];
  if (!agent) return null;
  const inserted = await db.insert(printAgentJobsTable).values({
    tenantId,
    agentId: agent.id,
    printerId: printer.id,
    deviceId: printer.deviceId ?? null,
    deviceName: printer.deviceName ?? printer.name,
    payloadBase64: payload.toString("base64"),
  }).returning({ id: printAgentJobsTable.id });
  return inserted[0]?.id ?? null;
}

const PrintAgentRegisterBody = z.object({
  pairingCode: z.string().min(16).max(256),
  name: z.string().min(1).max(120),
  devices: z.array(z.object({ id: z.string().min(1).max(500), name: z.string().min(1).max(500) }).passthrough()).max(200),
});
const PrintAgentHeartbeatBody = z.object({
  devices: z.array(z.object({ id: z.string().min(1).max(500), name: z.string().min(1).max(500) }).passthrough()).max(200),
});
const PrintAgentLeaseBody = z.object({
  leaseToken: z.string().min(16).max(256),
});

async function authenticatePrintAgent(req: Request): Promise<{ id: number; tenantId: number } | null> {
  const token = bearerPrintAgentToken(req.headers.authorization);
  if (!token) return null;
  const rows = await db.select({ id: printAgentsTable.id, tenantId: printAgentsTable.tenantId })
    .from(printAgentsTable)
    .where(and(eq(printAgentsTable.tokenHash, hashPrintAgentSecret(token)), isNull(printAgentsTable.revokedAt)))
    .limit(1);
  return rows[0] ?? null;
}

router.post("/print-agent/pairings", async (req, res): Promise<void> => {
  if (!req.isSuperAdmin && !["admin", "manager"].includes(req.employeeRole ?? "")) {
    res.status(403).json({ error: "Solo administradores y gerentes pueden crear emparejamientos." }); return;
  }
  if (!req.tenantId) {
    res.status(400).json({ error: "Solicitud inválida." }); return;
  }
  const code = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await db.insert(printAgentPairingsTable).values({ tenantId: req.tenantId, codeHash: hashPrintAgentSecret(code), expiresAt });
  res.status(201).json({ code, expiresAt: expiresAt.toISOString() });
});

// Installer links stay stable even when release storage changes. The release
// pipeline can point these redirects at its signed artifacts without requiring
// a frontend redeploy.
router.get("/print-agent/downloads", async (_req, res): Promise<void> => {
  const windowsUrl = resolvePrintAgentDownload("windows", process.env);
  const macosUrl = resolvePrintAgentDownload("macos", process.env);
  const [windowsAvailable, macosAvailable] = await Promise.all([
    isPrintAgentDownloadAvailable(windowsUrl),
    isPrintAgentDownloadAvailable(macosUrl),
  ]);
  res.json({
    windows: { available: windowsAvailable },
    macos: { available: macosAvailable },
  });
});

router.get("/print-agent/downloads/:platform", async (req, res): Promise<void> => {
  const configured = resolvePrintAgentDownload(req.params.platform, process.env);
  if (!configured || !await isPrintAgentDownloadAvailable(configured)) {
    res.status(503).json({ error: "El instalador aún no está publicado para este sistema." });
    return;
  }
  res.redirect(302, configured);
});

router.get("/print-agent/status", async (req, res): Promise<void> => {
  if (!req.isSuperAdmin && !["admin", "manager"].includes(req.employeeRole ?? "")) {
    res.status(403).json({ error: "Solo administradores y gerentes pueden consultar agentes." }); return;
  }
  const rows = await db.select({
    id: printAgentsTable.id, name: printAgentsTable.name, devices: printAgentsTable.devices,
    lastSeenAt: printAgentsTable.lastSeenAt, revokedAt: printAgentsTable.revokedAt, createdAt: printAgentsTable.createdAt,
  }).from(printAgentsTable).where(eq(printAgentsTable.tenantId, req.tenantId!)).orderBy(desc(printAgentsTable.lastSeenAt));
  const onlineCutoff = Date.now() - 45_000;
  const agents = rows.map((agent) => ({
    ...agent,
    status: !agent.revokedAt && agent.lastSeenAt.getTime() >= onlineCutoff ? "online" : "offline",
  }));
  const jobCounts = await db.select({
    status: printAgentJobsTable.status,
    count: sql<number>`count(*)::int`,
  }).from(printAgentJobsTable)
    .where(eq(printAgentJobsTable.tenantId, req.tenantId!))
    .groupBy(printAgentJobsTable.status);
  const jobs = { queued: 0, claimed: 0, printing: 0, completed: 0, failed: 0 };
  for (const row of jobCounts) {
    if (row.status in jobs) jobs[row.status as keyof typeof jobs] = Number(row.count);
  }
  const recentFailures = await db.select({
    id: printAgentJobsTable.id,
    printerId: printAgentJobsTable.printerId,
    deviceName: printAgentJobsTable.deviceName,
    attempts: printAgentJobsTable.attempts,
    error: printAgentJobsTable.error,
    failedAt: printAgentJobsTable.failedAt,
  }).from(printAgentJobsTable)
    .where(and(eq(printAgentJobsTable.tenantId, req.tenantId!), eq(printAgentJobsTable.status, "failed")))
    .orderBy(desc(printAgentJobsTable.failedAt), desc(printAgentJobsTable.updatedAt))
    .limit(10);
  res.json({ agents, jobs, recentFailures });
});

router.post("/print-agent/agents/:id/revoke", async (req, res): Promise<void> => {
  if (!req.isSuperAdmin && !["admin", "manager"].includes(req.employeeRole ?? "")) {
    res.status(403).json({ error: "Solo administradores y gerentes pueden revocar agentes." }); return;
  }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Agente inválido." }); return; }
  const updated = await db.update(printAgentsTable).set({ revokedAt: new Date() })
    .where(and(eq(printAgentsTable.id, id), eq(printAgentsTable.tenantId, req.tenantId!), isNull(printAgentsTable.revokedAt)))
    .returning({ id: printAgentsTable.id });
  if (!updated[0]) { res.status(404).json({ error: "Agente no encontrado." }); return; }
  res.json({ ok: true });
});

router.post("/print-agent/register", async (req, res): Promise<void> => {
  const parsed = PrintAgentRegisterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Solicitud inválida." }); return; }
  const pairing = await db.update(printAgentPairingsTable).set({ usedAt: new Date() })
    .where(and(eq(printAgentPairingsTable.codeHash, hashPrintAgentSecret(parsed.data.pairingCode)), isNull(printAgentPairingsTable.usedAt), gt(printAgentPairingsTable.expiresAt, new Date())))
    .returning({ tenantId: printAgentPairingsTable.tenantId });
  if (!pairing[0]) { res.status(401).json({ error: "Código de emparejamiento inválido o vencido." }); return; }
  const token = crypto.randomBytes(32).toString("base64url");
  const agent = await db.insert(printAgentsTable).values({
    tenantId: pairing[0].tenantId, name: parsed.data.name, devices: parsed.data.devices,
    tokenHash: hashPrintAgentSecret(token), lastSeenAt: new Date(),
  }).returning({ id: printAgentsTable.id });
  res.status(201).json({ agentId: agent[0]!.id, token });
});

router.post("/print-agent/heartbeat", async (req, res): Promise<void> => {
  const parsed = PrintAgentHeartbeatBody.safeParse(req.body);
  const agent = await authenticatePrintAgent(req);
  if (!parsed.success || !agent) { res.status(401).json({ error: "Agente no autenticado." }); return; }
  await db.update(printAgentsTable).set({ devices: parsed.data.devices, lastSeenAt: new Date() }).where(eq(printAgentsTable.id, agent.id));
  res.json({ ok: true });
});

router.post("/print-agent/jobs/claim", async (req, res): Promise<void> => {
  const agent = await authenticatePrintAgent(req);
  if (!agent) { res.status(401).json({ error: "Agente no autenticado." }); return; }
  // A process can disappear after claiming (power loss, OS update, crash).
  // Claimed work is safe to retry because the agent records "printing" before
  // touching the physical printer. Printing work is deliberately terminal:
  // the paper may already have left the printer and must not be duplicated.
  await db.execute(sql`
    UPDATE print_agent_jobs
    SET
      status = CASE WHEN attempts >= ${PRINT_JOB_MAX_ATTEMPTS} THEN 'failed' ELSE 'queued' END,
      agent_id = CASE WHEN attempts >= ${PRINT_JOB_MAX_ATTEMPTS} THEN agent_id ELSE NULL END,
      error = CASE WHEN attempts >= ${PRINT_JOB_MAX_ATTEMPTS}
        THEN 'El agente no confirmó el trabajo después de '
          || ${PRINT_JOB_MAX_ATTEMPTS}::text
          || ' intentos.'
        ELSE error
      END,
      claimed_at = NULL,
      lease_token = CASE WHEN attempts >= ${PRINT_JOB_MAX_ATTEMPTS} THEN lease_token ELSE NULL END,
      lease_expires_at = NULL,
      failed_at = CASE WHEN attempts >= ${PRINT_JOB_MAX_ATTEMPTS} THEN NOW() ELSE failed_at END,
      updated_at = NOW()
    WHERE tenant_id = ${agent.tenantId}
      AND status = 'claimed'
      AND (
        lease_expires_at <= NOW()
        OR (lease_expires_at IS NULL AND claimed_at < NOW() - INTERVAL '2 minutes')
      )
  `);
  await db.execute(sql`
    UPDATE print_agent_jobs
    SET
      status = 'failed',
      error = 'La impresión pudo ejecutarse, pero el agente no confirmó el resultado.',
      lease_expires_at = NULL,
      failed_at = NOW(),
      updated_at = NOW()
    WHERE tenant_id = ${agent.tenantId}
      AND status = 'printing'
      AND (
        lease_expires_at <= NOW()
        OR (lease_expires_at IS NULL AND claimed_at < NOW() - INTERVAL '2 minutes')
      )
  `);
  // SKIP LOCKED makes competing pollers claim distinct jobs atomically.
  const leaseToken = crypto.randomBytes(24).toString("base64url");
  const claimed = await db.execute(sql`
    WITH next_job AS (
      SELECT j.id FROM print_agent_jobs j
      WHERE j.tenant_id = ${agent.tenantId}
        AND j.status = 'queued'
        AND (
          j.agent_id = ${agent.id}
          OR (
            j.agent_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM print_agents eligible_agent
              CROSS JOIN LATERAL jsonb_array_elements(eligible_agent.devices) AS device
              WHERE eligible_agent.id = ${agent.id}
                AND (
                  (j.device_id IS NOT NULL AND device->>'id' = j.device_id)
                  OR (j.device_id IS NULL AND device->>'name' = j.device_name)
                )
            )
          )
        )
      ORDER BY j.created_at ASC
      FOR UPDATE OF j SKIP LOCKED
      LIMIT 1
    )
    UPDATE print_agent_jobs j
    SET
      agent_id = ${agent.id},
      status = 'claimed',
      claimed_at = NOW(),
      lease_token = ${leaseToken},
      lease_expires_at = NOW() + (${PRINT_JOB_LEASE_MS / 1000} * INTERVAL '1 second'),
      attempts = j.attempts + 1,
      updated_at = NOW()
    FROM next_job WHERE j.id = next_job.id
    RETURNING j.id, j.printer_id AS "printerId", j.device_id AS "deviceId", j.device_name AS "deviceName",
      j.payload_base64 AS "payloadBase64", j.attempts, j.lease_token AS "leaseToken",
      j.lease_expires_at AS "leaseExpiresAt"
  `);
  res.json({ job: (claimed as unknown as { rows: unknown[] }).rows[0] ?? null });
});

async function finishPrintAgentJob(req: Request, res: Response, success: boolean): Promise<void> {
  const agent = await authenticatePrintAgent(req);
  const id = Number(req.params.id);
  const lease = PrintAgentLeaseBody.safeParse(req.body);
  if (!agent) { res.status(401).json({ error: "Agente no autenticado." }); return; }
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Trabajo inválido." }); return; }
  if (!lease.success) { res.status(400).json({ error: "Arrendamiento inválido." }); return; }
  const error = success ? null : (typeof req.body?.error === "string" ? req.body.error.slice(0, 2000) : "Printing failed");
  const rows = await db.update(printAgentJobsTable).set({
    status: success ? "completed" : sql`CASE
      WHEN ${printAgentJobsTable.status} = 'printing'
        OR ${printAgentJobsTable.attempts} >= ${PRINT_JOB_MAX_ATTEMPTS}
      THEN 'failed' ELSE 'queued' END`,
    error,
    agentId: success ? agent.id : sql`CASE
      WHEN ${printAgentJobsTable.status} = 'printing'
        OR ${printAgentJobsTable.attempts} >= ${PRINT_JOB_MAX_ATTEMPTS}
      THEN ${agent.id} ELSE NULL END`,
    claimedAt: null,
    leaseToken: success ? lease.data.leaseToken : sql`CASE
      WHEN ${printAgentJobsTable.status} = 'printing'
        OR ${printAgentJobsTable.attempts} >= ${PRINT_JOB_MAX_ATTEMPTS}
      THEN ${printAgentJobsTable.leaseToken} ELSE NULL END`,
    leaseExpiresAt: null,
    completedAt: success ? new Date() : null,
    failedAt: success ? null : sql`CASE
      WHEN ${printAgentJobsTable.status} = 'printing'
        OR ${printAgentJobsTable.attempts} >= ${PRINT_JOB_MAX_ATTEMPTS}
      THEN NOW() ELSE ${printAgentJobsTable.failedAt} END`,
  }).where(and(
    eq(printAgentJobsTable.id, id),
    eq(printAgentJobsTable.agentId, agent.id),
    eq(printAgentJobsTable.tenantId, agent.tenantId),
    eq(printAgentJobsTable.leaseToken, lease.data.leaseToken),
    gt(printAgentJobsTable.leaseExpiresAt, new Date()),
    inArray(printAgentJobsTable.status, ["claimed", "printing"]),
  ))
    .returning({ id: printAgentJobsTable.id });
  if (!rows[0]) {
    const existing = await db.select({
      status: printAgentJobsTable.status,
      leaseToken: printAgentJobsTable.leaseToken,
      leaseExpiresAt: printAgentJobsTable.leaseExpiresAt,
    })
      .from(printAgentJobsTable)
      .where(and(
        eq(printAgentJobsTable.id, id),
        eq(printAgentJobsTable.tenantId, agent.tenantId),
      ))
      .limit(1);
    const expectedStatuses = success ? ["completed"] : ["queued", "failed"];
    if (existing[0]?.leaseToken === lease.data.leaseToken && expectedStatuses.includes(existing[0].status)) {
      res.json({ ok: true, alreadyFinished: true });
      return;
    }
    if (existing[0]) { res.json({ ok: true, staleLease: true }); return; }
    res.status(404).json({ error: "Trabajo no encontrado." });
    return;
  }
  res.json({ ok: true });
}
router.post("/print-agent/jobs/:id/complete", (req, res) => finishPrintAgentJob(req, res, true));
router.post("/print-agent/jobs/:id/fail", (req, res) => finishPrintAgentJob(req, res, false));
router.post("/print-agent/jobs/:id/printing", async (req, res): Promise<void> => {
  const agent = await authenticatePrintAgent(req);
  const id = Number(req.params.id);
  const lease = PrintAgentLeaseBody.safeParse(req.body);
  if (!agent) { res.status(401).json({ error: "Agente no autenticado." }); return; }
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Trabajo inválido." }); return; }
  if (!lease.success) { res.status(400).json({ error: "Arrendamiento inválido." }); return; }
  const rows = await db.update(printAgentJobsTable).set({
    status: "printing",
    leaseExpiresAt: sql`NOW() + (${PRINT_JOB_LEASE_MS / 1000} * INTERVAL '1 second')`,
  })
    .where(and(
      eq(printAgentJobsTable.id, id),
      eq(printAgentJobsTable.agentId, agent.id),
      eq(printAgentJobsTable.tenantId, agent.tenantId),
      eq(printAgentJobsTable.leaseToken, lease.data.leaseToken),
      gt(printAgentJobsTable.leaseExpiresAt, new Date()),
      eq(printAgentJobsTable.status, "claimed"),
    ))
    .returning({ id: printAgentJobsTable.id });
  if (!rows[0]) {
    const existing = await db.select({
      status: printAgentJobsTable.status,
      leaseToken: printAgentJobsTable.leaseToken,
      leaseExpiresAt: printAgentJobsTable.leaseExpiresAt,
    })
      .from(printAgentJobsTable)
      .where(and(
        eq(printAgentJobsTable.id, id),
        eq(printAgentJobsTable.tenantId, agent.tenantId),
      ))
      .limit(1);
    if (
      existing[0]?.status === "printing"
      && existing[0].leaseToken === lease.data.leaseToken
      && existing[0].leaseExpiresAt
      && existing[0].leaseExpiresAt.getTime() > Date.now()
    ) {
      res.json({ ok: true, alreadyPrinting: true }); return;
    }
    if (existing[0]) { res.json({ ok: true, staleLease: true }); return; }
    res.status(404).json({ error: "Trabajo no encontrado." });
    return;
  }
  res.json({ ok: true });
});
router.post("/print-agent/jobs/:id/requeue", async (req, res): Promise<void> => {
  const agent = await authenticatePrintAgent(req);
  const id = Number(req.params.id);
  const lease = PrintAgentLeaseBody.safeParse(req.body);
  if (!agent) { res.status(401).json({ error: "Agente no autenticado." }); return; }
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Trabajo inválido." }); return; }
  if (!lease.success) { res.status(400).json({ error: "Arrendamiento inválido." }); return; }
  const rows = await db.update(printAgentJobsTable).set({
    status: "queued", agentId: null, claimedAt: null, leaseToken: null, leaseExpiresAt: null,
  }).where(and(
    eq(printAgentJobsTable.id, id),
    eq(printAgentJobsTable.agentId, agent.id),
    eq(printAgentJobsTable.tenantId, agent.tenantId),
    eq(printAgentJobsTable.leaseToken, lease.data.leaseToken),
    gt(printAgentJobsTable.leaseExpiresAt, new Date()),
    eq(printAgentJobsTable.status, "claimed"),
  )).returning({ id: printAgentJobsTable.id });
  if (!rows[0]) {
    const existing = await db.select({
      status: printAgentJobsTable.status,
      leaseToken: printAgentJobsTable.leaseToken,
    })
      .from(printAgentJobsTable)
      .where(and(
        eq(printAgentJobsTable.id, id),
        eq(printAgentJobsTable.tenantId, agent.tenantId),
      ))
      .limit(1);
    if (existing[0]?.status === "queued" || existing[0]?.leaseToken !== lease.data.leaseToken) {
      res.json({ ok: true, alreadyRequeued: true }); return;
    }
    res.status(404).json({ error: "Trabajo no encontrado." });
    return;
  }
  res.json({ ok: true });
});

function buildEscPosKitchenComanda(
  companyName: string,
  source: string,
  orderNum: string | null,
  items: Array<{ name: string; qty: number; notes?: string | null }>,
  now: string,
  profile: EscPosProfile = DEFAULT_ESC_POS_PROFILE,
  options: { showNotes?: boolean; showServer?: boolean; serverName?: string } = {},
): Buffer {
  const ESC = 0x1b;
  const GS  = 0x1d;
  const enc = (s: string) => Buffer.from(s, "latin1");
  const parts: Buffer[] = [];
  const chars = escPosChars(profile);
  const w   = (b: number[]) => parts.push(Buffer.from(b));
  const t   = (s: string)   => parts.push(enc(s));
  const nl  = ()            => parts.push(Buffer.from([0x0a]));
  const fit = (s: string, max = chars) => s.slice(0, max);
  const sep = ()            => { t("-".repeat(chars)); nl(); };

  w([ESC, 0x40]);
  escPosSetup(profile, w);
  w([ESC, 0x61, 0x01]);

  w([ESC, 0x45, 0x01]);
  w([ESC, 0x21, escPosFontMode(profile.fontSize, true)]);
  t(fit("COMANDA")); nl();
  w([ESC, 0x21, escPosFontMode(profile.fontSize)]);
  w([ESC, 0x45, 0x00]);
  if (companyName) { t(fit(companyName.toUpperCase())); nl(); }
  sep();

  w([ESC, 0x45, 0x01]);
  w([ESC, 0x21, escPosFontMode(profile.fontSize, true)]);
  t(fit(source.toUpperCase())); nl();
  w([ESC, 0x21, escPosFontMode(profile.fontSize)]);
  w([ESC, 0x45, 0x00]);
  if (orderNum) { t(fit(orderNum)); nl(); }
  if (options.showServer && options.serverName) { t(fit(`Atiende: ${options.serverName}`)); nl(); }
  sep();

  w([ESC, 0x61, 0x00]);
  for (const item of items) {
    w([ESC, 0x45, 0x01]);
    t(`${String(item.qty).padStart(2)} `);
    w([ESC, 0x45, 0x00]);
    t(fit(item.name, Math.max(1, chars - 3))); nl();
    if (options.showNotes !== false && item.notes) { t(fit(`   > ${item.notes}`, Math.max(1, chars - 3))); nl(); }
  }

  w([ESC, 0x61, 0x01]);
  sep();
  t(now); nl();
  w([ESC, 0x64, 0x04]);
  if (profile.autoCut) w([GS, 0x56, 0x41, 0x00]);

  return Buffer.concat(parts);
}

const PrintKitchenComandaBody = z.object({
  items: z.array(z.object({
    name: z.string(),
    qty: z.number().int().positive(),
    notes: z.string().optional().nullable(),
  })).min(1),
  source: z.string().default("POS"),
  orderNum: z.string().optional().nullable(),
  serverName: z.string().max(120).optional(),
  stations: z.array(z.string()).optional(),
});

router.post("/print/kitchen-comanda", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.print)) return;
  const parsed = PrintKitchenComandaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, reason: "bad_request", detail: parsed.error.message });
    return;
  }
  const { items, source, orderNum, serverName, stations } = parsed.data;

  const rawPrinters = await readSetting(req.tenantId, "printers");
  let allPrinters: RunnerPrinterCfg[] = [];
  if (rawPrinters) {
    try { allPrinters = JSON.parse(rawPrinters) as RunnerPrinterCfg[]; } catch { /* ignore */ }
  }

  let kitchenPrinters = allPrinters.filter(
    (p) => p.zone.startsWith("kitchen") && (p.type !== "network" || p.ip),
  );
  if (stations && stations.length > 0) {
    kitchenPrinters = kitchenPrinters.filter((p) => stations.includes(p.zone));
  }
  if (kitchenPrinters.length === 0) {
    res.json({ ok: false, reason: "no_printer" });
    return;
  }

  const companyName = (await readSetting(req.tenantId, "company_name")) ?? "";
  const showNotes = await readBooleanSetting(req.tenantId, "kitchen_show_notes", true);
  const showServer = await readBooleanSetting(req.tenantId, "kitchen_show_server", true);
  const now = new Date().toLocaleString("es-CO", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  let sent = 0;
  let queued = 0;
  const errors: string[] = [];
  for (const printer of kitchenPrinters) {
    try {
      const buf = buildEscPosKitchenComanda(
        companyName,
        source,
        orderNum ?? null,
        items,
        now,
        normalizeEscPosProfile(printer),
        { showNotes, showServer, serverName },
      );
      if (printer.type === "network") {
        await sendEscPosOverTcp(printer.ip!, printer.port ?? 9100, buf);
        sent++;
      } else if (await enqueueLocalPrintJob(req.tenantId!, printer, buf)) {
        queued++;
      } else {
        errors.push(`No hay un agente local activo para ${printer.name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      req.log.warn({ err, printer: printer.name }, "ESC/POS kitchen comanda failed");
      errors.push(msg);
    }
  }

  if (sent > 0 || queued > 0) {
    res.json({ ok: true, sent, queued });
  } else {
    res.status(502).json({ ok: false, reason: "printer_error", detail: errors[0] });
  }
});

const PrintTestBody = z.object({
  printerId: z.string().min(1),
});

router.post("/print/test", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.print)) return;
  if (!req.isSuperAdmin && !["admin", "manager"].includes(req.employeeRole ?? "")) {
    res.status(403).json({ ok: false, reason: "forbidden", detail: "Solo administradores y gerentes pueden probar impresoras." });
    return;
  }
  const parsed = PrintTestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, reason: "bad_request", detail: parsed.error.message });
    return;
  }

  const rawPrinters = await readSetting(req.tenantId, "printers");
  let printers: RunnerPrinterCfg[] = [];
  if (rawPrinters) {
    try { printers = JSON.parse(rawPrinters) as RunnerPrinterCfg[]; } catch { /* ignore */ }
  }
  const printer = printers.find((candidate) => candidate.id === parsed.data.printerId);
  if (!printer) {
    res.status(404).json({ ok: false, reason: "not_found", detail: "La impresora no existe en esta empresa." });
    return;
  }
  const destinationError = printer.type === "network" && printer.ip
    ? validatePrinterDestination(printer.ip, printer.port ?? 9100) : null;
  if (printer.type === "network" && (!printer.ip || destinationError)) {
    res.status(400).json({ ok: false, reason: "unsafe_destination", detail: destinationError });
    return;
  }

  const companyName = (await readSetting(req.tenantId, "company_name")) ?? "FYRO ERP";
  const now = new Date().toLocaleString("es-CO");
  const profile = normalizeEscPosProfile(printer);
  const ticket = buildEscPosKitchenComanda(
    companyName,
    "PRUEBA DE IMPRESION",
    `${profile.paperWidth} · ${profile.fontSize} · margen ${profile.marginMm} mm`,
    [
      { name: "Perfil configurado correctamente", qty: 1 },
      { name: `Zona: ${printer.zone}`, qty: 1, notes: `Densidad ${profile.density} · interlineado ${profile.lineSpacing}` },
    ],
    now,
    profile,
  );

  try {
    if (printer.type === "network") {
      await sendEscPosOverTcp(printer.ip!, printer.port ?? 9100, ticket);
      res.json({ ok: true, sent: 1, queued: 0 });
    } else {
      const jobId = await enqueueLocalPrintJob(req.tenantId!, printer, ticket);
      if (!jobId) {
        res.status(409).json({ ok: false, reason: "local_agent_unavailable", detail: "No hay un agente local activo para esta impresora." });
      } else {
        res.json({ ok: true, sent: 0, queued: 1, jobId });
      }
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "No se pudo conectar con la impresora";
    req.log.warn({ err, printer: printer.name }, "ESC/POS test print failed");
    res.status(502).json({ ok: false, reason: "printer_error", detail });
  }
});

const PrintRunnerBody = z.object({
  companyName: z.string().default(""),
  tickets: z.array(
    z.object({
      tableName: z.string(),
      items: z.array(
        z.object({
          quantity: z.number().int().min(1),
          productName: z.string(),
          notes: z.string().nullable().default(null),
        }),
      ),
    }),
  ).min(1),
});

router.post("/restaurant/print-runner-tickets", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.print)) return;
  const parsed = PrintRunnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, reason: "bad_request", detail: parsed.error.message });
    return;
  }
  const { companyName, tickets } = parsed.data;

  // Read the printer list for this tenant
  const raw = await readSetting(req.tenantId, "printers");
  let printers: RunnerPrinterCfg[] = [];
  if (raw) {
    try { printers = JSON.parse(raw) as RunnerPrinterCfg[]; } catch { /* ignore */ }
  }

  const printer = printers.find((p) => p.zone === "runner" && (p.type !== "network" || p.ip));
  if (!printer) {
    res.json({ ok: false, reason: "no_printer" });
    return;
  }

  const now  = new Date().toLocaleString("es-CO", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  try {
    for (const ticket of tickets) {
      const vt: Record<string, { emoji: string; label: string }> = {
        __DOMICILIOS__: { emoji: "🛵", label: "Domicilio" },
        __PARA_LLEVAR__: { emoji: "🥡", label: "Para llevar" },
      };
      const info = vt[ticket.tableName] ?? { emoji: "🍽️", label: `Mesa ${ticket.tableName}` };
      const buf = buildEscPosRunnerTicket(
        companyName, info.label, info.emoji, ticket.items, now, normalizeEscPosProfile(printer),
      );
      if (printer.type === "network") {
        await sendEscPosOverTcp(printer.ip!, printer.port ?? 9100, buf);
      } else if (!await enqueueLocalPrintJob(req.tenantId!, printer, buf)) {
        throw new Error("No hay un agente local activo para esta impresora");
      }
    }
    res.json({ ok: true, sent: printer.type === "network" ? tickets.length : 0, queued: printer.type === "network" ? 0 : tickets.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.warn({ err }, "ESC/POS runner print failed");
    res.status(502).json({ ok: false, reason: "printer_error", detail: msg });
  }
});

// ── KDS: PATCH kitchen status for an order ────────────────────────────────────
router.patch(
  "/restaurant/orders/:id/kitchen-status",
  async (req, res): Promise<void> => {
    const params = UpdateKitchenStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = UpdateKitchenStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [order] = await db
      .select({
        id: restaurantOrdersTable.id,
        tableId: restaurantOrdersTable.tableId,
        tableName: restaurantTablesTable.name,
        serverName: restaurantOrdersTable.serverName,
        kitchenStatus: restaurantOrdersTable.kitchenStatus,
        subtotal: restaurantOrdersTable.subtotal,
        createdAt: restaurantOrdersTable.createdAt,
        status: restaurantOrdersTable.status,
        tenantId: restaurantTablesTable.tenantId,
        deliveryId: restaurantOrdersTable.deliveryId,
      })
      .from(restaurantOrdersTable)
      .innerJoin(
        restaurantTablesTable,
        eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
      )
      .where(eq(restaurantOrdersTable.id, params.data.id));

    if (!order) {
      res.status(404).json({ error: "Orden no encontrada" });
      return;
    }

    if (req.tenantId !== undefined && order.tenantId !== req.tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    if (order.status !== "open" && order.status !== "awaiting_payment") {
      res
        .status(400)
        .json({
          error:
            "Solo se puede actualizar el estado de cocina de órdenes abiertas",
        });
      return;
    }

    await db
      .update(restaurantOrdersTable)
      .set({ kitchenStatus: body.data.kitchenStatus, updatedAt: new Date() })
      .where(eq(restaurantOrdersTable.id, params.data.id));

    // ── Sync delivery status when KDS status changes ──────────────────────────
    if (order.deliveryId) {
      const newKitchenStatus = body.data.kitchenStatus;
      let deliveryStatus: string | null = null;
      if (newKitchenStatus === "preparing") deliveryStatus = "preparing";
      else if (newKitchenStatus === "ready") deliveryStatus = "ready";
      if (deliveryStatus) {
        await db
          .update(deliveriesTable)
          .set({ status: deliveryStatus as any, updatedAt: new Date() })
          .where(eq(deliveriesTable.id, order.deliveryId));
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const tenantId = order.tenantId ?? req.tenantId;
    if (tenantId !== undefined && tenantId !== null) {
      sseBus.broadcast(tenantId, "orders_updated", {
        orderId: order.id,
        kitchenStatus: body.data.kitchenStatus,
      });
    }

    const items = await db
      .select({
        id: restaurantOrderItemsTable.id,
        orderId: restaurantOrderItemsTable.orderId,
        productName: restaurantOrderItemsTable.productName,
        quantity: restaurantOrderItemsTable.quantity,
        notes: restaurantOrderItemsTable.notes,
        station: restaurantOrderItemsTable.station,
      })
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.orderId, params.data.id));

    res.json(
      UpdateKitchenStatusResponse.parse({
        id: order.id,
        tableId: order.tableId,
        tableName: order.tableName,
        serverName: order.serverName,
        kitchenStatus: body.data.kitchenStatus,
        subtotal: order.subtotal,
        createdAt: order.createdAt,
        items: items.map((it) => ({
          id: it.id,
          productName: it.productName,
          quantity: it.quantity,
          notes: it.notes ?? null,
          station: it.station ?? null,
        })),
      }),
    );
  },
);

router.post(
  "/restaurant/orders/:id/cancel",
  async (req, res): Promise<void> => {
    if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.cancelOrder)) return;
    const params = CancelRestaurantOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [order] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(eq(restaurantOrdersTable.id, params.data.id));
    if (!order) {
      res.status(404).json({ error: "Restaurant order not found" });
      return;
    }
    if (req.tenantId !== undefined) {
      const [tbl] = await db
        .select({ tenantId: restaurantTablesTable.tenantId })
        .from(restaurantTablesTable)
        .where(eq(restaurantTablesTable.id, order.tableId!));
      if (!tbl || tbl.tenantId !== req.tenantId) {
        res.status(403).json({ error: "Acceso denegado" });
        return;
      }
    }
    if (order.status === "cancelled") {
      res.status(400).json({ error: "Esta orden ya está anulada" });
      return;
    }

    const wasPaid = order.status === "paid";
    if (wasPaid) {
      res.status(400).json({
        error: "Los pedidos pagados deben anularse desde el historial de ventas para seleccionar la caja que entregará la devolución.",
      });
      return;
    }

    const result = await db
      .transaction(async (tx) => {
        // Paso 1 — Atomic claim: solo una transacción concurrente puede ganar este UPDATE.
        // WHERE añade ne(status, 'cancelled') para que, si TX-A ya hizo commit y TX-B
        // entra al mismo tx, el UPDATE no devuelva filas y el throw haga rollback completo
        // (evitando doble restauración de inventario).
        const [updated] = await tx
          .update(restaurantOrdersTable)
          .set({ status: "cancelled", closedAt: new Date() })
          .where(
            and(
              eq(restaurantOrdersTable.id, order.id),
              ne(restaurantOrdersTable.status, "cancelled"),
            ),
          )
          .returning();
        if (!updated) throw new Error("ALREADY_CANCELLED");

        // Paso 1b — Liberar la mesa
        await tx
          .update(restaurantTablesTable)
          .set({ status: "available" })
          .where(eq(restaurantTablesTable.id, order.tableId!));

        // Paso 2 y 3 — Retorno de inventario + reversa de caja/crédito/puntos
        // Solo aplica si la orden ya había sido cobrada (wasPaid=true).
        // Para órdenes no cobradas no hubo deducción de stock, por lo que no hay
        // nada que restaurar. La caja se recalcula dinámicamente filtrando voidedAt,
        // así que marcar la venta como anulada en reverseSaleInventoryAndPayments
        // es suficiente para excluirla de todos los reportes (Paso 4).
        if (wasPaid) {
          let alreadyReversed = false;
          let linkedSale: typeof salesTable.$inferSelect | undefined;
          if (order.saleId) {
            const [row] = await tx
              .select()
              .from(salesTable)
              .where(eq(salesTable.id, order.saleId));
            linkedSale = row;
            alreadyReversed = !!row?.voidedAt;
            if (linkedSale?.cajaId != null && !alreadyReversed) {
              const [openOriginalCajaSession] = await tx
                .select({ id: cashSessionsTable.id })
                .from(cashSessionsTable)
                .where(and(
                  eq(cashSessionsTable.cajaId, linkedSale.cajaId),
                  eq(cashSessionsTable.status, "open"),
                  req.tenantId ? eq(cashSessionsTable.tenantId, req.tenantId) : undefined,
                ))
                .limit(1);
              if (!openOriginalCajaSession) throw new Error("REFUND_CAJA_REQUIRED");
            }
          }

          if (!alreadyReversed) {
            let consumed: ConsumedItem[];
            if (linkedSale) {
              const saleItems = await tx
                .select()
                .from(saleItemsTable)
                .where(eq(saleItemsTable.saleId, linkedSale.id));
              consumed = saleItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              }));
            } else {
              const orderItems = await tx
                .select()
                .from(restaurantOrderItemsTable)
                .where(eq(restaurantOrderItemsTable.orderId, order.id));
              consumed = orderItems.map((item) => ({
                productId: item.productId!,
                quantity: item.quantity,
              }));
            }

            await reverseSaleInventoryAndPayments(
              tx,
              {
                items: consumed,
                sale: linkedSale ?? null,
                voidReason: "Mesa anulada después del cobro",
              },
              req.tenantId,
            );
          }
        }

        return updated;
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === "ALREADY_CANCELLED") {
          return { __alreadyCancelled: true } as const;
        }
        if (err instanceof Error && err.message === "REFUND_CAJA_REQUIRED") {
          return { __refundCajaRequired: true } as const;
        }
        throw err;
      });

    if (result && typeof result === "object" && "__alreadyCancelled" in result) {
      res.status(400).json({ error: "Esta orden ya está anulada" });
      return;
    }
    if (result && typeof result === "object" && "__refundCajaRequired" in result) {
      res.status(400).json({
        error: "La caja original está cerrada. Anula la venta desde el historial y selecciona la caja abierta que entregará la devolución.",
      });
      return;
    }

    const cancelled = result;
    const items = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.orderId, cancelled.id));
    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "tables_updated");
    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "orders_updated");
    res.json(
      CancelRestaurantOrderResponse.parse(
        restaurantOrderResponse(cancelled, items),
      ),
    );
  },
);

router.get("/expenses", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const expenses = await db
    .select()
    .from(expensesTable)
    .where(tid ? eq(expensesTable.tenantId, tid) : undefined)
    .orderBy(desc(expensesTable.createdAt));
  res.json(ListExpensesResponse.parse(
    expenses
      .filter((expense) => !["devolución", "devolucion"].includes(expense.category.trim().toLowerCase()))
      .map(expenseResponse),
  ));
});

router.get("/sales/:id/refunds", async (req, res): Promise<void> => {
  const saleId = Number(req.params.id);
  if (!Number.isInteger(saleId)) {
    res.status(400).json({ error: "Invalid sale id" });
    return;
  }
  const rows = await db
    .select()
    .from(saleRefundsTable)
    .where(and(
      eq(saleRefundsTable.saleId, saleId),
      req.tenantId ? eq(saleRefundsTable.tenantId, req.tenantId) : undefined,
    ))
    .orderBy(desc(saleRefundsTable.createdAt));
  res.json(rows);
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const expenseCajaId = (parsed.data as Record<string, unknown>).cajaId as number | null | undefined ?? (req.body.cajaId as number | null | undefined) ?? null;
  const [expense] = await db
    .insert(expensesTable)
    .values({ ...parsed.data, cajaId: expenseCajaId, tenantId: req.tenantId })
    .returning();
  res
    .status(201)
    .json(ListExpensesResponse.element.parse(expenseResponse(expense)));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  const body = UpdateExpenseBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid expense update" });
    return;
  }

  const tid = req.tenantId;
  const [expense] = await db
    .update(expensesTable)
    .set(body.data)
    .where(
      and(
        eq(expensesTable.id, params.data.id),
        tid ? eq(expensesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(UpdateExpenseResponse.parse(expenseResponse(expense)));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const tid = req.tenantId;
  const [expense] = await db
    .delete(expensesTable)
    .where(
      and(
        eq(expensesTable.id, params.data.id),
        tid ? eq(expensesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

// ── Cajas Registradoras ───────────────────────────────────────────────────────

router.get("/cajas", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (tid === undefined) { res.status(401).json({ error: "No autenticado" }); return; }
  const cajas = await db.select().from(cajasTable).where(eq(cajasTable.tenantId, tid)).orderBy(cajasTable.number);
  res.json(cajas);
});

router.use("/cajas", requireRole(["admin", "manager"]));

router.post("/cajas", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (tid === undefined) { res.status(401).json({ error: "No autenticado" }); return; }

  const bodySchema = insertCajaSchema.omit({ tenantId: true });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Validate warehouseId belongs to this tenant (tenant boundary check)
  const [warehouse] = await db
    .select({ id: warehousesTable.id })
    .from(warehousesTable)
    .where(and(eq(warehousesTable.id, parsed.data.warehouseId), eq(warehousesTable.tenantId, tid)))
    .limit(1);
  if (!warehouse) {
    res.status(400).json({ error: "Bodega no encontrada en este tenant" });
    return;
  }

  // Check plan maxCajas limit
  const [tenant] = await db.select({ planId: tenantsTable.planId }).from(tenantsTable).where(eq(tenantsTable.id, tid)).limit(1);
  let maxCajas = 1;
  if (tenant?.planId) {
    const [plan] = await db.select({ maxCajas: plansTable.maxCajas }).from(plansTable).where(eq(plansTable.id, tenant.planId)).limit(1);
    if (plan) maxCajas = plan.maxCajas;
  }
  const existing = await db.select({ id: cajasTable.id }).from(cajasTable).where(eq(cajasTable.tenantId, tid));
  if (existing.length >= maxCajas) {
    res.status(400).json({ error: `Tu plan permite máximo ${maxCajas} caja(s). Actualiza tu plan para agregar más.` });
    return;
  }

  const [caja] = await db.insert(cajasTable).values({ ...parsed.data, tenantId: tid }).returning();
  res.status(201).json(caja);
});

router.patch("/cajas/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (tid === undefined) { res.status(401).json({ error: "No autenticado" }); return; }

  const patchSchema = updateCajaSchema;
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Validate warehouseId belongs to this tenant (tenant boundary check)
  if (parsed.data.warehouseId !== undefined) {
    const [warehouse] = await db
      .select({ id: warehousesTable.id })
      .from(warehousesTable)
      .where(and(eq(warehousesTable.id, parsed.data.warehouseId), eq(warehousesTable.tenantId, tid)))
      .limit(1);
    if (!warehouse) {
      res.status(400).json({ error: "Bodega no encontrada en este tenant" });
      return;
    }
  }

  const [caja] = await db
    .update(cajasTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(cajasTable.id, id), eq(cajasTable.tenantId, tid)))
    .returning();
  if (!caja) { res.status(404).json({ error: "Caja no encontrada" }); return; }
  res.json(caja);
});

router.delete("/cajas/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [caja] = await db
    .delete(cajasTable)
    .where(and(eq(cajasTable.id, id), eq(cajasTable.tenantId, tid!)))
    .returning();
  if (!caja) { res.status(404).json({ error: "Caja no encontrada" }); return; }
  res.sendStatus(204);
});

// ── Cash Sessions ─────────────────────────────────────────────────────────────

router.get("/cash/sessions", async (req, res): Promise<void> => {
  const cajaId = req.query.cajaId ? Number(req.query.cajaId) : undefined;
  res.json(ListCashSessionsResponse.parse(await getCashSessions(req.tenantId, cajaId)));
});

router.post("/cash/sessions", async (req, res): Promise<void> => {
  const parsed = OpenCashSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tid = req.tenantId;
  // cajaId may come from body (after codegen it will be in parsed.data; before that, read directly)
  const cajaId: number | undefined = (parsed.data as Record<string, unknown>).cajaId as number | undefined ?? (req.body.cajaId as number | undefined);

  // Check if tenant has any cajas configured
  const tenantCajas = tid !== undefined
    ? await db.select().from(cajasTable).where(eq(cajasTable.tenantId, tid))
    : [];

  if (tenantCajas.length > 0) {
    // Multi-caja mode: cajaId is required
    if (!cajaId) {
      res.status(400).json({ error: "Debes seleccionar una caja registradora." });
      return;
    }
    const cajaRow = tenantCajas.find(c => c.id === cajaId);
    if (!cajaRow) {
      res.status(400).json({ error: "Caja no encontrada o no pertenece a este negocio." });
      return;
    }
    if (!cajaRow.isActive) {
      res.status(400).json({ error: "Esta caja está desactivada." });
      return;
    }
    // Check per-caja open session
    const [openForCaja] = await db.select().from(cashSessionsTable).where(
      and(eq(cashSessionsTable.cajaId, cajaId), eq(cashSessionsTable.status, "open"))
    );
    if (openForCaja) {
      res.status(400).json({ error: "Esta caja ya tiene un turno abierto." });
      return;
    }
  } else {
    // Legacy mode: single caja — check tenant-wide open session
    const openSessions = await db
      .select()
      .from(cashSessionsTable)
      .where(
        and(
          eq(cashSessionsTable.status, "open"),
          tid !== undefined ? eq(cashSessionsTable.tenantId, tid) : sql`false`,
        ),
      );
    if (openSessions.length > 0) {
      res.status(400).json({ error: "A cash drawer is already open" });
      return;
    }
  }

  const [session] = await db
    .insert(cashSessionsTable)
    .values({
      ...parsed.data,
      expectedBalance: parsed.data.openingBalance,
      tenantId: tid,
      ...(cajaId ? { cajaId } : {}),
    })
    .returning();

  const kindMap = await loadPaymentMethodsMap(req.tenantId);
  res
    .status(201)
    .json(
      ListCashSessionsResponseItem.parse(
        calculateCashSession(session, [], [], kindMap),
      ),
    );
});

router.post("/cash/sessions/:id/close", async (req, res): Promise<void> => {
  const params = CloseCashSessionParams.safeParse(req.params);
  const body = CloseCashSessionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid cash session close request" });
    return;
  }

  const tid = req.tenantId;
  const [session] = await db
    .select()
    .from(cashSessionsTable)
    .where(
      and(
        eq(cashSessionsTable.id, params.data.id),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ),
    );
  if (!session) {
    res.status(404).json({ error: "Cash session not found" });
    return;
  }
  if (session.status !== "open") {
    res.status(400).json({ error: "Only open sessions can be closed" });
    return;
  }

  const kindMap = await loadPaymentMethodsMap(tid);
  const shortfallReviewEnabled = (await readSetting(tid, "cash_shortfall_review_enabled")) === "true";

  const closeResult = await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT id
      FROM cash_sessions
      WHERE id = ${params.data.id}
        AND tenant_id = ${tid!}
      FOR UPDATE
    `);
    const [lockedSession] = await tx
      .select()
      .from(cashSessionsTable)
      .where(and(
        eq(cashSessionsTable.id, params.data.id),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ));
    if (!lockedSession || lockedSession.status !== "open") {
      throw new Error("CASH_SESSION_ALREADY_CLOSED");
    }
    const sales = await tx
      .select()
      .from(salesTable)
      .where(tid ? eq(salesTable.tenantId, tid) : undefined);
    const expenses = await tx
      .select()
      .from(expensesTable)
      .where(tid ? eq(expensesTable.tenantId, tid) : undefined);
    const refunds = await tx
      .select()
      .from(saleRefundsTable)
      .where(tid ? eq(saleRefundsTable.tenantId, tid) : undefined);
    const calculated = calculateCashSession(
      {
        ...lockedSession,
        actualBalance: body.data.actualBalance,
        closedAt: new Date(),
      },
      sales,
      expenses,
      kindMap,
      [],
      refunds,
    );
    if (shortfallReviewEnabled && calculated.discrepancy < 0 && !req.employeeId) {
      throw new Error("CASH_SHORTFALL_EMPLOYEE_REQUIRED");
    }
    const [updated] = await tx
      .update(cashSessionsTable)
      .set({
        closedAt: calculated.closedAt,
        cashSales: calculated.cashSales,
        cashExpenses: calculated.cashExpenses,
        expectedBalance: calculated.expectedBalance,
        actualBalance: body.data.actualBalance,
        discrepancy: calculated.discrepancy,
        status: "closed",
        notes: body.data.notes,
      })
      .where(and(
        eq(cashSessionsTable.id, params.data.id),
        eq(cashSessionsTable.status, "open"),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ))
      .returning();
    if (!updated) throw new Error("Cash session was already closed");
    if (shortfallReviewEnabled && calculated.discrepancy < 0 && req.employeeId) {
      await tx.insert(cashShortfallReviewsTable).values({
        tenantId: tid!,
        cashSessionId: updated.id,
        responsibleEmployeeId: req.employeeId,
        createdByEmployeeId: req.employeeId,
        shortfallAmount: money(-calculated.discrepancy),
        expectedBalance: calculated.expectedBalance,
        actualBalance: body.data.actualBalance,
      }).onConflictDoNothing();
    }
    return { updated, sales, expenses, refunds };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "CASH_SESSION_ALREADY_CLOSED") {
      return { error: "already_closed" } as const;
    }
    if (error instanceof Error && error.message === "CASH_SHORTFALL_EMPLOYEE_REQUIRED") {
      return { error: "employee_required" } as const;
    }
    throw error;
  });

  if ("error" in closeResult) {
    if (closeResult.error === "employee_required") {
      res.status(403).json({ error: "No hay empleado autenticado responsable del faltante" });
      return;
    }
    res.status(400).json({ error: "Only open sessions can be closed" });
    return;
  }

  res.json(
    CloseCashSessionResponse.parse(
      calculateCashSession(
        closeResult.updated,
        closeResult.sales,
        closeResult.expenses,
        kindMap,
        [],
        closeResult.refunds,
      ),
    ),
  );
});

router.post("/cash/sessions/:id/shift-close", async (req, res): Promise<void> => {
  const params = CloseCashSessionParams.safeParse(req.params);
  const body = CloseCashSessionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid shift-close request" });
    return;
  }

  const tid = req.tenantId;
  const [session] = await db
    .select()
    .from(cashSessionsTable)
    .where(
      and(
        eq(cashSessionsTable.id, params.data.id),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ),
    );
  if (!session) {
    res.status(404).json({ error: "Cash session not found" });
    return;
  }
  if (session.status !== "open") {
    res.status(400).json({ error: "Only open sessions can be shift-closed" });
    return;
  }

  const kindMap = await loadPaymentMethodsMap(tid);
  const shortfallReviewEnabled = (await readSetting(tid, "cash_shortfall_review_enabled")) === "true";

  const closeResult = await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT id
      FROM cash_sessions
      WHERE id = ${params.data.id}
        AND tenant_id = ${tid!}
      FOR UPDATE
    `);
    const [lockedSession] = await tx
      .select()
      .from(cashSessionsTable)
      .where(and(
        eq(cashSessionsTable.id, params.data.id),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ));
    if (!lockedSession || lockedSession.status !== "open") {
      throw new Error("CASH_SESSION_ALREADY_CLOSED");
    }
    const sales = await tx
      .select()
      .from(salesTable)
      .where(tid ? eq(salesTable.tenantId, tid) : undefined);
    const expenses = await tx
      .select()
      .from(expensesTable)
      .where(tid ? eq(expensesTable.tenantId, tid) : undefined);
    const refunds = await tx
      .select()
      .from(saleRefundsTable)
      .where(tid ? eq(saleRefundsTable.tenantId, tid) : undefined);
    const calculated = calculateCashSession(
      { ...lockedSession, actualBalance: body.data.actualBalance, closedAt: new Date() },
      sales,
      expenses,
      kindMap,
      [],
      refunds,
    );
    if (shortfallReviewEnabled && calculated.discrepancy < 0 && !req.employeeId) {
      throw new Error("CASH_SHORTFALL_EMPLOYEE_REQUIRED");
    }
    const [updated] = await tx
      .update(cashSessionsTable)
      .set({
        closedAt: calculated.closedAt,
        cashSales: calculated.cashSales,
        cashExpenses: calculated.cashExpenses,
        expectedBalance: calculated.expectedBalance,
        actualBalance: body.data.actualBalance,
        discrepancy: calculated.discrepancy,
        status: "partial",
        notes: body.data.notes,
      })
      .where(and(
        eq(cashSessionsTable.id, params.data.id),
        eq(cashSessionsTable.status, "open"),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ))
      .returning();
    if (!updated) throw new Error("Cash session was already closed");
    if (shortfallReviewEnabled && calculated.discrepancy < 0 && req.employeeId) {
      await tx.insert(cashShortfallReviewsTable).values({
        tenantId: tid!,
        cashSessionId: updated.id,
        responsibleEmployeeId: req.employeeId,
        createdByEmployeeId: req.employeeId,
        shortfallAmount: money(-calculated.discrepancy),
        expectedBalance: calculated.expectedBalance,
        actualBalance: body.data.actualBalance,
      }).onConflictDoNothing();
    }
    return { updated, sales, expenses, refunds };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "CASH_SESSION_ALREADY_CLOSED") {
      return { error: "already_closed" } as const;
    }
    if (error instanceof Error && error.message === "CASH_SHORTFALL_EMPLOYEE_REQUIRED") {
      return { error: "employee_required" } as const;
    }
    throw error;
  });

  if ("error" in closeResult) {
    if (closeResult.error === "employee_required") {
      res.status(403).json({ error: "No hay empleado autenticado responsable del faltante" });
      return;
    }
    res.status(400).json({ error: "Only open sessions can be shift-closed" });
    return;
  }

  res.json(
    CloseCashSessionResponse.parse(
      calculateCashSession(
        closeResult.updated,
        closeResult.sales,
        closeResult.expenses,
        kindMap,
        [],
        closeResult.refunds,
      ),
    ),
  );
});

router.get("/cash/shortfalls", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const isReviewer = req.isSuperAdmin || ["admin", "manager"].includes(req.employeeRole ?? "");
  if (!isReviewer && !req.employeeId) {
    res.status(403).json({ error: "No hay empleado autenticado" });
    return;
  }
  await processExpiredCashShortfalls({ tenantId: tid });
  const responsibleEmployee = alias(employeesTable, "shortfall_responsible_employee");
  const cashSession = alias(cashSessionsTable, "shortfall_cash_session");
  const caja = alias(cajasTable, "shortfall_caja");
  const reviews = await db
    .select({
      ...getTableColumns(cashShortfallReviewsTable),
      responsibleEmployeeName: responsibleEmployee.name,
      cashSessionOpenedBy: cashSession.openedBy,
      cashSessionShiftName: cashSession.shiftName,
      cashSessionNotes: cashSession.notes,
      cajaId: cashSession.cajaId,
      cajaName: caja.name,
    })
    .from(cashShortfallReviewsTable)
    .leftJoin(responsibleEmployee, eq(cashShortfallReviewsTable.responsibleEmployeeId, responsibleEmployee.id))
    .leftJoin(cashSession, eq(cashShortfallReviewsTable.cashSessionId, cashSession.id))
    .leftJoin(caja, eq(cashSession.cajaId, caja.id))
    .where(and(
      tid ? eq(cashShortfallReviewsTable.tenantId, tid) : undefined,
      isReviewer ? undefined : eq(cashShortfallReviewsTable.responsibleEmployeeId, req.employeeId!),
    ))
    .orderBy(desc(cashShortfallReviewsTable.createdAt));
  res.json(ListCashShortfallReviewsResponse.parse(reviews.map(decorateCashShortfall)));
});

router.post("/cash/shortfalls/:id/review", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const params = ReviewCashShortfallParams.safeParse(req.params);
  const body = ReviewCashShortfallBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Solicitud de revisión de faltante inválida" });
    return;
  }
  if (!req.employeeId) {
    res.status(403).json({ error: "No hay empleado autenticado" });
    return;
  }
  const tid = req.tenantId;
  const [review] = await db.select().from(cashShortfallReviewsTable).where(and(
    eq(cashShortfallReviewsTable.id, params.data.id),
    tid ? eq(cashShortfallReviewsTable.tenantId, tid) : undefined,
  ));
  if (!review) {
    res.status(404).json({ error: "Revisión de faltante no encontrada" });
    return;
  }
  if (body.data.action === "approve" && review.responsibleEmployeeId === req.employeeId) {
    res.status(400).json({ error: "No puedes aprobar tu propio faltante" });
    return;
  }
  if (review.status !== "pending_admin") {
    res.status(400).json({ error: "Esta revisión ya no está pendiente de aprobación" });
    return;
  }
  const [updated] = await db.update(cashShortfallReviewsTable).set({
    status: body.data.action === "approve" ? "pending_cashier" : "rejected",
    reviewedByEmployeeId: req.employeeId,
    reviewedAt: new Date(),
  }).where(and(
    eq(cashShortfallReviewsTable.id, review.id),
    eq(cashShortfallReviewsTable.status, "pending_admin"),
  )).returning();
  if (!updated) {
    res.status(400).json({ error: "Esta revisión ya fue procesada" });
    return;
  }
  res.json(ReviewCashShortfallResponse.parse(decorateCashShortfall(updated)));
});

router.post("/cash/shortfalls/:id/respond", async (req, res): Promise<void> => {
  const params = RespondToCashShortfallParams.safeParse(req.params);
  const body = RespondToCashShortfallBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Respuesta de faltante inválida" });
    return;
  }
  if (!req.employeeId) {
    res.status(403).json({ error: "No hay empleado autenticado" });
    return;
  }
  const tid = req.tenantId;
  const [review] = await db.select().from(cashShortfallReviewsTable).where(and(
    eq(cashShortfallReviewsTable.id, params.data.id),
    tid ? eq(cashShortfallReviewsTable.tenantId, tid) : undefined,
  ));
  if (!review) {
    res.status(404).json({ error: "Revisión de faltante no encontrada" });
    return;
  }
  if (review.responsibleEmployeeId !== req.employeeId) {
    res.status(403).json({ error: "No eres responsable de este faltante" });
    return;
  }
  if (review.status === "applied") {
    res.json(RespondToCashShortfallResponse.parse(decorateCashShortfall(review)));
    return;
  }
  if (review.status !== "pending_cashier") {
    res.status(400).json({ error: "Esta revisión no está pendiente de tu respuesta" });
    return;
  }

  const result = await applyCashShortfallCharge({
    reviewId: review.id,
    respondedByEmployeeId: req.employeeId,
    mode: "employee",
  });
  if (!result) {
    res.status(400).json({ error: "Esta revisión ya fue procesada" });
    return;
  }
  res.json(RespondToCashShortfallResponse.parse(decorateCashShortfall(result)));
});

router.get("/cash/sessions/:id/report", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const tid = req.tenantId;
  const [session] = await db.select().from(cashSessionsTable).where(and(eq(cashSessionsTable.id, id), tid ? eq(cashSessionsTable.tenantId, tid) : undefined));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const end = session.closedAt ?? new Date();
  const cajaId = session.cajaId;

  // TRAEMOS TODO: Ventas, Gastos y Domicilios
  const [sales, expenses, deliveries, refunds, kindMap, allSessions] = await Promise.all([
    db.select().from(salesTable).where(tid ? eq(salesTable.tenantId, tid) : undefined),
    db.select().from(expensesTable).where(tid ? eq(expensesTable.tenantId, tid) : undefined),
    db.select().from(deliveriesTable).where(tid ? eq(deliveriesTable.tenantId, tid) : undefined), // <--- AGREGAR ESTA
    db.select().from(saleRefundsTable).where(tid ? eq(saleRefundsTable.tenantId, tid) : undefined),
    loadPaymentMethodsMap(tid),
    loadPaymentMethodsMap(tid),
  ]);

  const sessionSales = sales.filter(
    (s) =>
      (cajaId == null || s.cajaId === cajaId) &&
      s.createdAt >= session.openedAt &&
      s.createdAt <= end &&
      shouldIncludeSaleInSession(s, session, end, refunds),
  );
  const sessionDeliveries = deliveries.filter(d =>
    d.status !== 'cancelled' &&
    (cajaId == null || d.cajaId === cajaId) &&
    d.createdAt >= session.openedAt &&
    d.createdAt <= end
  );

  const sessionExpenses = expenses.filter(e => {
    if (["devolución", "devolucion"].includes(e.category.trim().toLowerCase())) return false;
    if (cajaId != null && e.cajaId != null && e.cajaId !== cajaId) return false;
    return e.createdAt >= session.openedAt && e.createdAt <= end;
  });

  const byKind = (kind: PaymentKind) => {
    const sSum = sessionSales.reduce((total, sale) => {
      const payments = sale.payments?.length
        ? sale.payments
        : [{ method: sale.paymentMethod, amount: sale.subtotal }];
      return total + payments
        .filter((payment) => resolveKind(kindMap, payment.method) === kind)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
    }, 0);
    const dSum = sessionDeliveries.filter(d => resolveKind(kindMap, d.paymentMethod) === kind).reduce((t, d) => t + d.total, 0);
    return money(sSum + dSum);
  };

  // CALCULAMOS EL TOTAL DE BONOS
  // ACTUALIZACIÓN DEL CÁLCULO DE BONOS Y DESCUENTOS
  const totalDiscounts = 
    // 1. Sumamos los descuentos directos (rebajas de precio)
    sessionSales.reduce((t, s) => t + (Number((s as any).discountAmount) || 0), 0) +
    sessionDeliveries.reduce((t, d) => t + (Number((d as any).discountAmount) || 0), 0) +
    // 2. Sumamos los pagos recibidos con el método "Bono"
    sessionSales.filter(s => resolveKind(kindMap, s.paymentMethod) === "bono").reduce((t, s) => t + s.subtotal, 0) +
    sessionDeliveries.filter(d => resolveKind(kindMap, d.paymentMethod) === "bono").reduce((t, d) => t + d.total, 0);

  res.json({
    session: calculateCashSession(session, sales, expenses, kindMap, deliveries, refunds),
    expenses: sessionExpenses.map(expenseResponse),
    cashSales: byKind("cash"),
    transferSales: byKind("transfer"),
    cardSales: byKind("card"),
    totalSales: money(sessionSales.reduce((t, s) => t + s.subtotal, 0) + sessionDeliveries.reduce((t, d) => t + d.total, 0)),
    totalDiscounts: money(
      sessionSales.reduce((t, s) => t + (Number((s as any).discountAmount) || 0), 0) +
      sessionDeliveries.reduce((t, d) => t + (Number((d as any).discountAmount) || 0), 0)
    ),
  });
});
router.get("/cash/sessions/:id/summary", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const tid = req.tenantId;
  const [session] = await db
    .select()
    .from(cashSessionsTable)
    .where(
      and(
        eq(cashSessionsTable.id, id),
        tid ? eq(cashSessionsTable.tenantId, tid) : undefined,
      ),
    );
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const end = session.closedAt ?? new Date();
  const cajaId = session.cajaId;

  const [sales, expenses, deliveries, refunds, kindMap, allSessions] = await Promise.all([
    db.select().from(salesTable).where(tid ? eq(salesTable.tenantId, tid) : undefined),
    db.select().from(expensesTable).where(tid ? eq(expensesTable.tenantId, tid) : undefined),
    db.select().from(deliveriesTable).where(tid ? eq(deliveriesTable.tenantId, tid) : undefined), // <--- AGREGAR ESTA
    db.select().from(saleRefundsTable).where(tid ? eq(saleRefundsTable.tenantId, tid) : undefined),
    loadPaymentMethodsMap(tid),
    db.select({ id: cashSessionsTable.id }).from(cashSessionsTable).where(tid ? eq(cashSessionsTable.tenantId, tid) : undefined).orderBy(asc(cashSessionsTable.openedAt)),
  ]);

  const sessionSales = sales.filter(
    (s) =>
      (cajaId == null || s.cajaId === cajaId) &&
      s.createdAt >= session.openedAt &&
      s.createdAt <= end &&
      shouldIncludeSaleInSession(s, session, end, refunds),
  );
  const sessionDeliveries = deliveries.filter(
    (d) =>
      d.status !== 'cancelled' &&
      (cajaId == null || d.cajaId === cajaId) &&
      d.createdAt >= session.openedAt &&
      d.createdAt <= end
  );
  const sessionExpenses = expenses.filter(
    (e) =>
      (cajaId == null || e.cajaId == null || e.cajaId === cajaId) &&
      e.createdAt >= session.openedAt &&
      e.createdAt <= end &&
      !["devolución", "devolucion"].includes(e.category.trim().toLowerCase()),
  );

  const byKind = (kind: PaymentKind) => {
    const sSum = sessionSales.reduce((t, s) => {
      const pmts = (s as any).payments as { method: string; amount: number }[] | null | undefined;
      if (pmts && pmts.length > 0) {
        return t + pmts.filter(p => resolveKind(kindMap, p.method) === kind).reduce((sum, p) => sum + p.amount, 0);
      }
      return t + (resolveKind(kindMap, s.paymentMethod) === kind ? s.subtotal : 0);
    }, 0);
    const dSum = sessionDeliveries.filter(d => resolveKind(kindMap, d.paymentMethod) === kind).reduce((t, d) => t + d.total, 0);
    return money(sSum + dSum);
  };

  const sessionSaleIds = sessionSales.map((s) => s.id);
  let topItems: { name: string; qty: number; total: number }[] = [];
  if (sessionSaleIds.length > 0) {
    const items = await db
      .select()
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.saleId, sessionSaleIds));
    const itemMap = new Map<string, { qty: number; total: number }>();
    for (const item of items) {
      const existing = itemMap.get(item.productName);
      if (existing) {
        existing.qty += item.quantity;
        existing.total += item.lineTotal;
      } else {
        itemMap.set(item.productName, {
          qty: item.quantity,
          total: item.lineTotal,
        });
      }
    }
    topItems = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  const shiftNumber = allSessions.findIndex((s) => s.id === id) + 1;

  const byMethodMap = new Map<string, number>();
  for (const s of sessionSales) {
    const pmts = (s as any).payments as { method: string; amount: number }[] | null | undefined;
    if (pmts && pmts.length > 0) {
      for (const p of pmts) {
        byMethodMap.set(p.method, (byMethodMap.get(p.method) ?? 0) + p.amount);
      }
    } else {
      byMethodMap.set(s.paymentMethod, (byMethodMap.get(s.paymentMethod) ?? 0) + s.subtotal);
    }
  }
  const byMethod: { method: string; total: number }[] = [];
  for (const [method, total] of byMethodMap.entries()) {
    const t = money(total);
    if (t > 0) byMethod.push({ method, total: t });
  }
  byMethod.sort((a, b) => b.total - a.total);
  res.json({
    session: calculateCashSession(session, sales, expenses, kindMap, deliveries, refunds),
    expenses: sessionExpenses.map(expenseResponse),
    cashSales: byKind("cash"),
    transferSales: byKind("transfer"),
    cardSales: byKind("card"),
    totalSales: money(sessionSales.reduce((t, s) => t + s.subtotal, 0) + sessionDeliveries.reduce((t, d) => t + d.total, 0)),
    totalDiscounts: money(
      sessionSales.reduce((t, s) => t + (Number((s as any).discountAmount) || 0), 0) +
      sessionDeliveries.reduce((t, d) => t + (Number((d as any).discountAmount) || 0), 0)
    ), // <--- SUMA DE AMBOS DESCUENTOS
    transactionCount: sessionSales.length + sessionDeliveries.length,
    topItems,
    shiftNumber,
    byMethod,
  });
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const [products, sales, expenses, sessions] = await Promise.all([
    db
      .select()
      .from(productsTable)
      .where(tid ? eq(productsTable.tenantId, tid) : undefined),
    getSalesWithItems(tid),
    db
      .select()
      .from(expensesTable)
      .where(tid ? eq(expensesTable.tenantId, tid) : undefined),
    getCashSessions(tid),
  ]);
  const startToday = todayStart();
  const startMonth = monthStart();
  const todaySales = sales.filter((sale) => sale.createdAt >= startToday);
  const monthSales = sales.filter((sale) => sale.createdAt >= startMonth);
  const todayExpenses = expenses.filter(
    (expense) => expense.createdAt >= startToday,
  );
  const monthExpenses = expenses.filter(
    (expense) => expense.createdAt >= startMonth,
  );

  const sumSales = (rows: typeof sales) =>
    rows.filter((s) => !s.voidedAt).reduce((total, sale) => total + sale.subtotal, 0);
  const sumProfit = (rows: typeof sales) =>
    rows.filter((s) => !s.voidedAt).reduce((total, sale) => total + sale.profit, 0);
  const sumExpenses = (rows: Expense[]) =>
    rows
      .filter((expense) => !["devolución", "devolucion"].includes(expense.category.trim().toLowerCase()))
      .reduce((total, expense) => total + expense.amount, 0);
  const lowStockProducts = products.filter(
    (product) => product.tracksInventory !== false && product.stock <= product.lowStockThreshold,
  );

  // Custom date range metrics (optional query params)
  const fromParam = req.query.from as string | undefined;
  const toParam = req.query.to as string | undefined;
  let customSales: number | undefined;
  let customProfit: number | undefined;
  let customExpenses: number | undefined;
  if (fromParam && toParam) {
    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      const customPeriodSales = sales.filter(
        (s) => s.createdAt >= fromDate && s.createdAt <= toDate,
      );
      const customPeriodExpenses = expenses.filter(
        (e) => e.createdAt >= fromDate && e.createdAt <= toDate,
      );
      customSales = money(sumSales(customPeriodSales));
      customProfit = money(sumProfit(customPeriodSales));
      customExpenses = money(sumExpenses(customPeriodExpenses));
    }
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      todaySales: money(sumSales(todaySales)),
      todayExpenses: money(sumExpenses(todayExpenses)),
      todayProfit: money(sumProfit(todaySales) - sumExpenses(todayExpenses)),
      monthSales: money(sumSales(monthSales)),
      monthExpenses: money(sumExpenses(monthExpenses)),
      monthProfit: money(sumProfit(monthSales) - sumExpenses(monthExpenses)),
      inventoryValue: money(
        products.reduce(
          (total, product) => total + product.cost * product.stock,
          0,
        ),
      ),
      lowStockCount: lowStockProducts.length,
      totalProducts: products.length,
      openCashSession: sessions.find((session) => session.status === "open"),
      recentSales: sales.slice(0, 5),
      lowStockProducts: lowStockProducts.map(productResponse),
      ...(customSales !== undefined && { customSales }),
      ...(customProfit !== undefined && { customProfit }),
      ...(customExpenses !== undefined && { customExpenses }),
    }),
  );
});

// ── EMPLOYEES ─────────────────────────────────────────────wa────────────────

const employeeResponse = (e: Employee) => ({
  id: e.id,
  name: e.name,
  email: e.email ?? undefined,
  phone: e.phone ?? undefined,
  role: e.role,
  extraRoles: e.extraRoles ?? [],
  status: e.status,
  department: e.department ?? undefined,
  hireDate: e.hireDate ?? undefined,
  birthDate: e.birthDate ?? undefined,
  clerkEmail: e.clerkEmail ?? undefined,
  documentNumber: e.documentNumber ?? undefined,
  authConfigured: !!e.passwordHash,
  salary: e.salary ?? undefined,
  salaryType: e.salaryType,
  notes: e.notes ?? undefined,
  profilePhoto: e.profilePhoto ?? undefined,
  createdAt: e.createdAt.toISOString(),
  updatedAt: e.updatedAt.toISOString(),
});

// GET /api/employees/me — returns the currently logged-in employee's own record.
// Accessible to all authenticated roles so the frontend can resolve user identity
// without requiring access to the full employee list.
router.get("/employees/me", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const eid = req.employeeId;
  if (!eid) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, eid),
        tid ? eq(employeesTable.tenantId, tid) : undefined,
      ),
    )
    .limit(1);
  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }
  res.json(employeeResponse(employee));
});

router.get("/clock/operational-status", async (req, res): Promise<void> => {
  const role = req.employeeRole;
  const required = roleRequiresOperationalAttendance(role);
  const tenantId = req.tenantId;
  const employeeId = req.employeeId;

  if (!required) {
    res.json({ required: false, clockedIn: true, canOperate: true });
    return;
  }

  const clockedIn = !!tenantId
    && !!employeeId
    && await hasOpenAttendanceEntry(tenantId, employeeId);
  res.json({ required: true, clockedIn, canOperate: clockedIn });
});

async function employeeCreditSummary(
  employee: Employee,
  tenantId: number | undefined,
  executor: any = db,
): Promise<{ balance: number; limit: number; available: number; status: string }> {
  const [latest] = await executor.select({ balance: employeeCreditMovementsTable.balanceAfter })
    .from(employeeCreditMovementsTable)
    .where(and(eq(employeeCreditMovementsTable.employeeId, employee.id), tenantId ? eq(employeeCreditMovementsTable.tenantId, tenantId) : undefined))
    .orderBy(desc(employeeCreditMovementsTable.id)).limit(1);
  const balance = Number(latest?.balance ?? 0);
  const today = new Date().toISOString().slice(0, 10);
  const [period] = await executor.select().from(payrollPeriodsTable).where(and(
    eq(payrollPeriodsTable.status, "draft"),
    lte(payrollPeriodsTable.periodStart, today), gte(payrollPeriodsTable.periodEnd, today),
    tenantId ? eq(payrollPeriodsTable.tenantId, tenantId) : undefined,
  )).orderBy(desc(payrollPeriodsTable.createdAt)).limit(1);
  if (!period) return { balance, limit: 0, available: 0, status: "NO_DRAFT_PERIOD" };
  if (!employee.salary) return { balance, limit: 0, available: 0, status: "NO_SALARY" };
  const entries = await executor.select().from(timeEntriesTable).where(and(
    eq(timeEntriesTable.employeeId, employee.id),
    gte(timeEntriesTable.clockIn, new Date(`${period.periodStart}T00:00:00.000Z`)),
    lte(timeEntriesTable.clockIn, new Date(`${period.periodEnd}T23:59:59.999Z`)),
  ));
  const completed = entries.filter((e: TimeEntry) => (e.hoursWorked ?? 0) > 0);
  if (!completed.length) return { balance, limit: 0, available: 0, status: "NO_RECORDED_TIME" };
  const hours = completed.reduce((sum: number, e: TimeEntry) => sum + (e.hoursWorked ?? 0), 0);
  const days = new Set(completed.map((e: TimeEntry) => e.clockIn.toISOString().slice(0, 10))).size;
  const overtimeRate = await readNumericSetting("salary_overtime_rate", 1.25, tenantId);
  const dailyHours = await readNumericSetting("regular_daily_hours", 8, tenantId);
  const overtime = Math.max(0, hours - days * dailyHours);
  const gross = calcGross(employee, Math.max(0, hours - overtime), overtime, completed.length, days, overtimeRate);
  return { balance, limit: gross, available: Math.max(0, money(gross - balance)), status: "AVAILABLE" };
}

router.post("/employees/me/credit/code", async (req, res): Promise<void> => {
  if (!req.employeeId) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
  const [employee] = await db.select().from(employeesTable).where(and(
    eq(employeesTable.id, req.employeeId), req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined,
  )).limit(1);
  if (!employee || employee.status !== "active") { res.status(404).json({ error: "Empleado no encontrado o inactivo" }); return; }
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.transaction(async tx => {
    await tx.update(employeeCreditCodesTable).set({ consumedAt: new Date() }).where(and(
      eq(employeeCreditCodesTable.employeeId, employee.id), req.tenantId ? eq(employeeCreditCodesTable.tenantId, req.tenantId) : undefined,
      isNull(employeeCreditCodesTable.consumedAt),
    ));
    await tx.insert(employeeCreditCodesTable).values({
      tenantId: req.tenantId!, employeeId: employee.id, codeHash: hashEmployeeCreditCode(code),
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });
  });
  res.status(201).json({ code, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() });
});

router.get("/employees/me/credit", async (req, res): Promise<void> => {
  if (!req.employeeId) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
  const [employee] = await db.select().from(employeesTable).where(and(eq(employeesTable.id, req.employeeId), req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined)).limit(1);
  if (!employee) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
  const [summary, movements] = await Promise.all([
    employeeCreditSummary(employee, req.tenantId),
    db.select().from(employeeCreditMovementsTable).where(and(eq(employeeCreditMovementsTable.employeeId, employee.id), req.tenantId ? eq(employeeCreditMovementsTable.tenantId, req.tenantId) : undefined)).orderBy(desc(employeeCreditMovementsTable.id)),
  ]);
  res.json({ ...summary, movements });
});

const OPERATE_ATTENDANCE_KIOSK_PERMISSION =
  "action:operate_attendance_kiosk";
const ROLE_PERMISSIONS_SCHEMA_VERSION = 3;
const ROLE_PERMISSIONS_VERSION_KEY = "role_permissions_version";
const TABLE_PERMISSION_KEYS = {
  create: "action:create_table",
  edit: "action:edit_table",
  delete: "action:delete_table",
  reservations: "action:manage_table_reservations",
  openOrder: "action:open_table_order",
  addItems: "action:add_order_items",
  editItems: "action:edit_order_items",
  removeItems: "action:remove_order_items",
  cancelOrder: "action:cancel_order",
  transfer: "action:transfer_table_order",
  merge: "action:merge_tables",
  split: "action:split_table_bill",
  checkout: "action:checkout",
  print: "action:print_order",
  sendToWaiting: "action:send_order_to_waiting",
} as const;
const PHYSICAL_TABLE_PERMISSION_KEYS = new Set<string>([
  TABLE_PERMISSION_KEYS.create,
  TABLE_PERMISSION_KEYS.edit,
  TABLE_PERMISSION_KEYS.delete,
]);
const LEGACY_TABLE_OPERATION_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(TABLE_PERMISSION_KEYS),
  manager: Object.values(TABLE_PERMISSION_KEYS).filter(
    (key) => !PHYSICAL_TABLE_PERMISSION_KEYS.has(key),
  ),
  cashier: Object.values(TABLE_PERMISSION_KEYS).filter(
    (key) => !PHYSICAL_TABLE_PERMISSION_KEYS.has(key),
  ),
  waiter: [
    TABLE_PERMISSION_KEYS.reservations, TABLE_PERMISSION_KEYS.openOrder,
    TABLE_PERMISSION_KEYS.addItems, TABLE_PERMISSION_KEYS.editItems,
    TABLE_PERMISSION_KEYS.removeItems, TABLE_PERMISSION_KEYS.cancelOrder,
    TABLE_PERMISSION_KEYS.transfer, TABLE_PERMISSION_KEYS.merge,
    TABLE_PERMISSION_KEYS.split, TABLE_PERMISSION_KEYS.print,
    TABLE_PERMISSION_KEYS.sendToWaiting,
  ],
  cook: [],
  delivery: [],
};

function normalizePermissionRole(role: string): string {
  const normalized = role.toLowerCase();
  return normalized === "gerente" ? "manager" : normalized;
}

async function loadRolePermissionsConfig(
  tenantId: number | undefined,
): Promise<{
  roleMap: Record<string, string[]>;
  isCurrentSchema: boolean;
}> {
  const tenantRaw = tenantId === undefined
    ? null
    : await readSetting(tenantId, "role_permissions", {
      noGlobalFallback: true,
    });
  const usesTenantConfig = tenantRaw !== null;
  const raw = tenantRaw ?? await readSetting(undefined, "role_permissions");
  const versionRaw = usesTenantConfig
    ? await readSetting(tenantId, ROLE_PERMISSIONS_VERSION_KEY, {
      noGlobalFallback: true,
    })
    : await readSetting(undefined, ROLE_PERMISSIONS_VERSION_KEY);

  let roleMap: Record<string, string[]> = {};
  try {
    if (raw) roleMap = JSON.parse(raw);
  } catch {
    roleMap = {};
  }
  let version: unknown = null;
  try {
    if (versionRaw) version = JSON.parse(versionRaw);
  } catch {
    version = versionRaw;
  }
  return {
    roleMap,
    isCurrentSchema: version === ROLE_PERMISSIONS_SCHEMA_VERSION,
  };
}

function withLegacyKioskPermission(
  isCurrentSchema: boolean,
  role: string,
  permissions: string[],
): string[] {
  const normalizedRole = normalizePermissionRole(role);
  if (
    !isCurrentSchema &&
    ["admin", "manager"].includes(normalizedRole)
  ) {
    return Array.from(
      new Set([...permissions, OPERATE_ATTENDANCE_KIOSK_PERMISSION]),
    );
  }
  return permissions;
}

function withLegacyTablePermissions(
  isCurrentSchema: boolean,
  role: string,
  permissions: string[],
): string[] {
  if (isCurrentSchema) return permissions;
  return Array.from(new Set([
    ...permissions,
    ...(LEGACY_TABLE_OPERATION_PERMISSIONS[normalizePermissionRole(role)] ?? []),
  ]));
}

/** Resolves role permissions and employee overrides for a single authenticated request. */
async function requireEffectivePermission(
  req: Request,
  res: Response,
  permission: string | readonly string[],
): Promise<boolean> {
  if (req.isSuperAdmin) return true;
  if (!req.tenantId || !req.employeeId) {
    res.status(403).json({ error: "No autorizado" });
    return false;
  }
  const [employee] = await db
    .select({ role: employeesTable.role })
    .from(employeesTable)
    .where(and(
      eq(employeesTable.id, req.employeeId),
      eq(employeesTable.tenantId, req.tenantId),
    ))
    .limit(1);
  if (!employee) {
    res.status(403).json({ error: "No autorizado" });
    return false;
  }
  const [{ roleMap, isCurrentSchema }, overrideRow] = await Promise.all([
    loadRolePermissionsConfig(req.tenantId),
    db.select({
      allow: employeePermissionOverridesTable.allow,
      deny: employeePermissionOverridesTable.deny,
    }).from(employeePermissionOverridesTable).where(and(
      eq(employeePermissionOverridesTable.employeeId, req.employeeId),
      eq(employeePermissionOverridesTable.tenantId, req.tenantId),
    )).limit(1).then((rows) => rows[0]),
  ]);
  const rolePermissions = withLegacyTablePermissions(
    isCurrentSchema,
    employee.role,
    withLegacyKioskPermission(
      isCurrentSchema,
      employee.role,
      roleMap[normalizePermissionRole(employee.role)] ?? [],
    ),
  );
  const effective = new Set([...rolePermissions, ...(overrideRow?.allow ?? [])]);
  const candidates = typeof permission === "string" ? [permission] : permission;
  const allowed = candidates.some((candidate) =>
    effective.has(candidate) && !overrideRow?.deny?.includes(candidate)
  );
  if (!allowed) res.status(403).json({ error: "No autorizado" });
  return allowed;
}

async function canOperateAttendanceKiosk(
  tenantId: number,
  employeeId: number,
  role: string,
): Promise<boolean> {
  const { roleMap, isCurrentSchema } =
    await loadRolePermissionsConfig(tenantId);
  const normalizedRole = normalizePermissionRole(role);

  const rolePermissions = withLegacyKioskPermission(
    isCurrentSchema,
    normalizedRole,
    roleMap[normalizedRole] ?? [],
  );
  const [overrideRow] = await db
    .select({
      allow: employeePermissionOverridesTable.allow,
      deny: employeePermissionOverridesTable.deny,
    })
    .from(employeePermissionOverridesTable)
    .where(
      and(
        eq(employeePermissionOverridesTable.employeeId, employeeId),
        eq(employeePermissionOverridesTable.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (overrideRow?.deny?.includes(OPERATE_ATTENDANCE_KIOSK_PERMISSION)) {
    return false;
  }
  return (
    overrideRow?.allow?.includes(OPERATE_ATTENDANCE_KIOSK_PERMISSION) === true ||
    rolePermissions.includes(OPERATE_ATTENDANCE_KIOSK_PERMISSION)
  );
}

// GET /api/employees/me/permissions — returns the current user's own permission
// overrides (role defaults + individual overrides + effective set).
// Accessible to all authenticated roles so the frontend can always resolve
// effective permissions without admin access.
router.get("/employees/me/permissions", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const eid = req.employeeId;
  if (!eid) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  const [employee] = await db
    .select({ id: employeesTable.id, role: employeesTable.role })
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, eid),
        tid ? eq(employeesTable.tenantId, tid) : undefined,
      ),
    )
    .limit(1);
  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  const [overrideRow] = await db
    .select()
    .from(employeePermissionOverridesTable)
    .where(
      and(
        eq(employeePermissionOverridesTable.employeeId, eid),
        tid ? eq(employeePermissionOverridesTable.tenantId, tid) : undefined,
      ),
    )
    .limit(1);

  const overrides = {
    allow: overrideRow?.allow ?? [],
    deny: overrideRow?.deny ?? [],
  };

  const { roleMap, isCurrentSchema } =
    await loadRolePermissionsConfig(tid);

  const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
    admin: [
      "/dashboard",
      "/pos",
      "/tables",
      "/deliveries",
      "/products",
      "/inventory",
      "/expenses",
      "/cash",
      "/hr",
      "/customers",
      "/reports",
      "/ledger",
      "action:checkout",
      "action:cancel_order",
      "action:cancel_delivery",
      "action:view_cash_balance",
      "action:view_cash_history",
    ],
    manager: [
      "/dashboard",
      "/pos",
      "/tables",
      "/deliveries",
      "/products",
      "/inventory",
      "/expenses",
      "/cash",
      "/hr",
      "/customers",
      "/reports",
      "/ledger",
      "action:checkout",
      "action:cancel_order",
      "action:cancel_delivery",
      "action:view_cash_balance",
      "action:view_cash_history",
    ],
    cashier: [
      "/dashboard",
      "/pos",
      "/tables",
      "/deliveries",
      "/products",
      "/inventory",
      "/cash",
      "/customers",
      "action:checkout",
      "action:cancel_order",
      "action:cancel_delivery",
      "action:view_cash_balance",
      "action:view_cash_history",
    ],
    waiter: ["/dashboard", "/pos", "/tables"],
    cook: ["/dashboard", "/tables"],
    delivery: ["/dashboard", "/deliveries"],
  };
  const normalizedRole = normalizePermissionRole(employee.role);
  const rolePermissions = withLegacyTablePermissions(
    isCurrentSchema,
    normalizedRole,
    withLegacyKioskPermission(
      isCurrentSchema,
      normalizedRole,
      roleMap[normalizedRole] ?? DEFAULT_ROLE_PERMS[normalizedRole] ?? [],
    ),
  );
  const effective = Array.from(
    new Set(
      [...rolePermissions, ...overrides.allow].filter(
        (k) => !overrides.deny.includes(k),
      ),
    ),
  );

  res.json({ role: employee.role, rolePermissions, overrides, effective });
});

// Role guard for /employees/* — admin and manager only.
// The /employees/me and /employees/me/permissions routes above are registered
// BEFORE this middleware and send their own responses, so they are not affected.
const employeeCreditManagers = (req: any) => req.isSuperAdmin || ["admin", "manager"].includes(req.employeeRole);
const employeeCreditPosRoles = (req: any) => employeeCreditManagers(req) || req.employeeRole === "cashier";

router.get("/employee-credit/employees", async (req, res): Promise<void> => {
  if (!employeeCreditPosRoles(req)) { res.status(403).json({ error: "No autorizado" }); return; }
  const employees = await db.select().from(employeesTable).where(and(eq(employeesTable.status, "active"), req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined));
  const exposeEmploymentDetails = employeeCreditManagers(req);
  res.json(await Promise.all(employees.map(async employee => {
    const summary = await employeeCreditSummary(employee, req.tenantId);
    return exposeEmploymentDetails
      ? { employee: employeeResponse(employee), ...summary, eligible: summary.available > 0 }
      : {
          employee: { id: employee.id, name: employee.name, role: employee.role },
          eligible: summary.available > 0,
          status: summary.status,
        };
  })));
});

router.get("/employee-credit/employees/:id", async (req, res): Promise<void> => {
  if (!employeeCreditManagers(req)) { res.status(403).json({ error: "No autorizado" }); return; }
  const id = Number(req.params.id);
  const [employee] = await db.select().from(employeesTable).where(and(eq(employeesTable.id, id), req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined)).limit(1);
  if (!employee) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
  const [summary, movements] = await Promise.all([employeeCreditSummary(employee, req.tenantId), db.select().from(employeeCreditMovementsTable).where(and(eq(employeeCreditMovementsTable.employeeId, id), req.tenantId ? eq(employeeCreditMovementsTable.tenantId, req.tenantId) : undefined)).orderBy(desc(employeeCreditMovementsTable.id))]);
  res.json({ employee: employeeResponse(employee), ...summary, movements });
});

router.post("/employee-credit/employees/:id/payments", async (req, res): Promise<void> => {
  if (!employeeCreditManagers(req)) { res.status(403).json({ error: "No autorizado" }); return; }
  const parsed = z.object({ amount: z.number().positive(), notes: z.string().max(1000).optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Pago inválido" }); return; }
  const result = await db.transaction(async tx => {
    const id = Number(req.params.id);
    await tx.execute(sql`SELECT id FROM employees WHERE id = ${id} FOR UPDATE`);
    const [employee] = await tx.select().from(employeesTable).where(and(eq(employeesTable.id, id), req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined)).limit(1);
    if (!employee) throw new Error("EMPLOYEE_CREDIT_EMPLOYEE_INVALID");
    const pendingPayroll = (await tx.execute(sql`
      SELECT pr.id
      FROM payroll_records pr
      JOIN payroll_periods pp ON pp.id = pr.period_id
      WHERE pr.employee_id = ${id}
        AND pp.tenant_id = ${req.tenantId!}
        AND pp.status IN ('draft', 'approved')
        AND pr.employee_credit_deduction > 0
      LIMIT 1
    `)).rows;
    if (pendingPayroll.length > 0) throw new Error("EMPLOYEE_CREDIT_PENDING_PAYROLL");
    const summary = await employeeCreditSummary(employee, req.tenantId, tx);
    if (parsed.data.amount > summary.balance) throw new Error("EMPLOYEE_CREDIT_PAYMENT_EXCEEDS_BALANCE");
    const [movement] = await tx.insert(employeeCreditMovementsTable).values({ tenantId: req.tenantId!, employeeId: id, type: "payment", amount: parsed.data.amount, balanceAfter: money(summary.balance - parsed.data.amount), actorEmployeeId: req.employeeId ?? null, notes: parsed.data.notes, emailStatus: "no_email" }).returning();
    return movement;
  }).catch(err => err);
  if (result instanceof Error) {
    if (result.message === "EMPLOYEE_CREDIT_PENDING_PAYROLL") {
      res.status(409).json({ error: "No se puede registrar un abono mientras exista una deducción de nómina pendiente" });
      return;
    }
    res.status(400).json({ error: result.message === "EMPLOYEE_CREDIT_PAYMENT_EXCEEDS_BALANCE" ? "El pago supera el saldo" : "Empleado no encontrado" });
    return;
  }
  res.status(201).json(result);
});

router.post("/employee-credit/sales/:saleId/retry-email", async (req, res): Promise<void> => {
  if (!employeeCreditManagers(req)) { res.status(403).json({ error: "No autorizado" }); return; }
  const saleId = Number(req.params.saleId);
  if (!Number.isInteger(saleId) || saleId <= 0) { res.status(400).json({ error: "Venta inválida" }); return; }
  try {
    res.json(await sendEmployeeCreditReceipt(saleId, req.tenantId));
  } catch (error) {
    if (error instanceof Error && error.message === "EMPLOYEE_CREDIT_SALE_NOT_FOUND") {
      res.status(404).json({ error: "Consumo no encontrado" });
      return;
    }
    req.log.warn({ err: error, saleId }, "Employee credit receipt retry failed");
    res.status(502).json({ error: "No fue posible enviar el correo" });
  }
});

router.use("/employees", requireRole(["admin", "manager"]));

router.get("/employees", async (req, res) => {
  const tid = req.tenantId;
  const employees = await db
    .select()
    .from(employeesTable)
    .where(tid ? eq(employeesTable.tenantId, tid) : undefined)
    .orderBy(desc(employeesTable.createdAt));
  res.json(employees.map(employeeResponse));
});

router.post("/employees", async (req, res) => {
  // Only admin/manager roles (or superadmin) can create employees
  if (
    !req.isSuperAdmin &&
    req.employeeRole !== "admin" &&
    req.employeeRole !== "manager"
  ) {
    res
      .status(403)
      .json({ error: "Se requiere rol de administrador o gerente" });
    return;
  }
  const parsed = insertEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const emailToCheck = parsed.data.email ?? null;
  const incomingStatus = parsed.data.status ?? "active";
  if (emailToCheck && req.tenantId && incomingStatus === "active") {
    const [existing] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.tenantId, req.tenantId),
          sql`lower(${employeesTable.email}) = lower(${emailToCheck})`,
          eq(employeesTable.status, "active"),
        ),
      )
      .limit(1);
    if (existing) {
      res
        .status(409)
        .json({
          error: "Ya existe un empleado activo con ese email en esta empresa",
        });
      return;
    }
  }
  const [employee] = await db
    .insert(employeesTable)
    .values({ ...parsed.data, tenantId: req.tenantId })
    .returning();
  res.status(201).json(employeeResponse(employee));
});

router.put("/employees/:id", async (req, res) => {
  // Only admin/manager roles (or superadmin) can update employees
  if (
    !req.isSuperAdmin &&
    req.employeeRole !== "admin" &&
    req.employeeRole !== "manager"
  ) {
    res
      .status(403)
      .json({ error: "Se requiere rol de administrador o gerente" });
    return;
  }
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const parsed = updateEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [employee] = await db
    .update(employeesTable)
    .set(parsed.data)
    .where(
      and(
        eq(employeesTable.id, id),
        tid ? eq(employeesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  // Invalidate tenant middleware cache so role/status changes take effect immediately
  // instead of waiting up to 5 minutes for the TTL to expire.
  try {
    // Local sessions resolve identity on every request, so no identity cache needs invalidation.
  } catch { /* non-critical — cache will expire naturally in ≤5 min */ }
  res.json(employeeResponse(employee));
});

// POST /api/employees/:id/password — tenant admins (or superadmins) only.
router.post("/employees/:id/password", async (req, res): Promise<void> => {
  if (!req.isSuperAdmin && req.employeeRole !== "admin") {
    res.status(403).json({ error: "Se requiere rol de administrador" }); return;
  }
  const id = Number(req.params.id);
  const parsed = z.object({ password: z.string().min(10).max(512), passwordMustChange: z.boolean().optional() }).safeParse(req.body);
  if (!id || !parsed.success) { res.status(400).json({ error: "Contraseña inválida (mínimo 10 caracteres)" }); return; }
  const [employee] = await db.update(employeesTable).set({
    passwordHash: await hashPassword(parsed.data.password),
    passwordMustChange: parsed.data.passwordMustChange ?? true,
    passwordSetAt: new Date(),
  }).where(and(eq(employeesTable.id, id), req.tenantId ? eq(employeesTable.tenantId, req.tenantId) : undefined)).returning();
  if (!employee) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
  await db.delete(authSessionsTable).where(eq(authSessionsTable.employeeId, id));
  res.status(204).send();
});

router.delete("/employees/:id", async (req, res) => {
  // Only admin role (or superadmin) can delete employees
  if (!req.isSuperAdmin && req.employeeRole !== "admin") {
    res.status(403).json({ error: "Se requiere rol de administrador" });
    return;
  }
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [employee] = await db
    .delete(employeesTable)
    .where(
      and(
        eq(employeesTable.id, id),
        tid ? eq(employeesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.status(204).send();
});

// ── Employee Permission Overrides ────────────────────────────────────────────

// GET /api/employees/:id/permissions
// Returns the role defaults, current overrides, and effective permission list.
// Accessible by: admin/manager/superadmin (any employee in tenant) OR the employee themselves.
router.get("/employees/:id/permissions", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const isAdminOrManager =
    req.isSuperAdmin ||
    req.employeeRole === "admin" ||
    req.employeeRole === "manager";
  const isSelf = req.employeeId != null && req.employeeId === id;
  if (!isAdminOrManager && !isSelf) {
    res
      .status(403)
      .json({
        error: "Se requiere rol de administrador o gerente, o acceso propio",
      });
    return;
  }
  const tid = req.tenantId;

  const [employee] = await db
    .select({ id: employeesTable.id, role: employeesTable.role })
    .from(employeesTable)
    .where(
      and(
        eq(employeesTable.id, id),
        tid ? eq(employeesTable.tenantId, tid) : undefined,
      ),
    )
    .limit(1);
  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  const [overrideRow] = await db
    .select()
    .from(employeePermissionOverridesTable)
    .where(
      and(
        eq(employeePermissionOverridesTable.employeeId, id),
        tid ? eq(employeePermissionOverridesTable.tenantId, tid) : undefined,
      ),
    )
    .limit(1);

  const overrides = {
    allow: overrideRow?.allow ?? [],
    deny: overrideRow?.deny ?? [],
  };

  // Fetch role permissions from app_settings
  const { roleMap, isCurrentSchema } =
    await loadRolePermissionsConfig(tid);

  const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
    admin: [
      "/dashboard",
      "/pos",
      "/tables",
      "/deliveries",
      "/products",
      "/inventory",
      "/expenses",
      "/cash",
      "/hr",
      "/customers",
      "/reports",
      "/ledger",
      "action:checkout",
      "action:cancel_order",
      "action:cancel_delivery",
      "action:view_cash_balance",
      "action:view_cash_history",
    ],
    manager: [
      "/dashboard",
      "/pos",
      "/tables",
      "/deliveries",
      "/products",
      "/inventory",
      "/expenses",
      "/cash",
      "/hr",
      "/customers",
      "/reports",
      "/ledger",
      "action:checkout",
      "action:cancel_order",
      "action:cancel_delivery",
      "action:view_cash_balance",
      "action:view_cash_history",
    ],
    cashier: [
      "/dashboard",
      "/pos",
      "/tables",
      "/deliveries",
      "/products",
      "/inventory",
      "/cash",
      "/customers",
      "action:checkout",
      "action:cancel_order",
      "action:cancel_delivery",
      "action:view_cash_balance",
      "action:view_cash_history",
    ],
    waiter: ["/dashboard", "/pos", "/tables"],
    cook: ["/dashboard", "/tables"],
    delivery: ["/dashboard", "/deliveries"],
  };
  const normalizedRole = normalizePermissionRole(employee.role);
  const rolePermissions = withLegacyTablePermissions(
    isCurrentSchema,
    normalizedRole,
    withLegacyKioskPermission(
      isCurrentSchema,
      normalizedRole,
      roleMap[normalizedRole] ?? DEFAULT_ROLE_PERMS[normalizedRole] ?? [],
    ),
  );

  // Compute effective = (role + allow) minus deny
  const effective = Array.from(
    new Set(
      [...rolePermissions, ...overrides.allow].filter(
        (k) => !overrides.deny.includes(k),
      ),
    ),
  );

  res.json({ role: employee.role, rolePermissions, overrides, effective });
});

// Canonical set of all known permission keys (routes + actions) — kept in sync with roles.ts
const VALID_PERMISSION_KEYS = new Set([
  "/dashboard",
  "/pos",
  "/sales",
  "/tables",
  "/cocina",
  "/stock-operativo",
  "/deliveries",
  "/products",
  "/production",
  "/screens",
  "/inventory",
  "/expenses",
  "/cash",
  "/hr",
  "/customers",
  "/promociones",
  "/compras",
  "/suppliers",
  "/purchase-orders",
  "/reports",
  "/financiero",
  "/ledger",
  "/advisor",
  "/pqrs",
  "/whatsapp",
  "action:checkout",
  "action:cancel_order",
  "action:cancel_item",
  "action:cancel_delivery",
  "action:view_cash_balance",
  "action:view_cash_history",
  OPERATE_ATTENDANCE_KIOSK_PERMISSION,
  ...Object.values(TABLE_PERMISSION_KEYS),
]);

// PUT /api/employees/:id/permissions
// Upserts per-employee overrides { allow: string[], deny: string[] }.
router.put("/employees/:id/permissions", async (req, res): Promise<void> => {
  if (
    !req.isSuperAdmin &&
    req.employeeRole !== "admin" &&
    req.employeeRole !== "manager"
  ) {
    res
      .status(403)
      .json({ error: "Se requiere rol de administrador o gerente" });
    return;
  }
  const id = Number(req.params.id);
  const tid = req.tenantId;
  if (!tid) {
    res.status(400).json({ error: "Tenant no identificado" });
    return;
  }

  const { allow, deny } = req.body as { allow?: string[]; deny?: string[] };
  if (!Array.isArray(allow) || !Array.isArray(deny)) {
    res.status(400).json({ error: "allow y deny deben ser arreglos" });
    return;
  }
  // Validate all keys against the canonical allowlist (routes + actions defined in roles.ts)
  const invalidAllow = allow.find((k) => !VALID_PERMISSION_KEYS.has(k));
  const invalidDeny = deny.find((k) => !VALID_PERMISSION_KEYS.has(k));
  if (invalidAllow !== undefined || invalidDeny !== undefined) {
    res
      .status(400)
      .json({
        error: "Clave de permiso no válida",
        invalid: invalidAllow ?? invalidDeny,
      });
    return;
  }

  const [employee] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.tenantId, tid)))
    .limit(1);
  if (!employee) {
    res.status(404).json({ error: "Empleado no encontrado" });
    return;
  }

  // If both empty, delete the row (no overrides = use role defaults)
  if (allow.length === 0 && deny.length === 0) {
    await db
      .delete(employeePermissionOverridesTable)
      .where(
        and(
          eq(employeePermissionOverridesTable.employeeId, id),
          eq(employeePermissionOverridesTable.tenantId, tid),
        ),
      );
    res.json({ allow: [], deny: [] });
    return;
  }

  const [row] = await db
    .insert(employeePermissionOverridesTable)
    .values({ employeeId: id, tenantId: tid, allow, deny })
    .onConflictDoUpdate({
      target: employeePermissionOverridesTable.employeeId,
      set: { allow, deny, updatedAt: new Date() },
    })
    .returning();

  res.json({ allow: row.allow, deny: row.deny });
});

// ── PAYROLL PERIODS ─────────────────────────────────────────────────────────

const periodResponse = (p: PayrollPeriod) => ({
  id: p.id,
  name: p.name,
  periodStart: p.periodStart,
  periodEnd: p.periodEnd,
  status: p.status,
  notes: p.notes ?? undefined,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

// Role guard for /payroll/* — admin and manager only.
router.use("/payroll", requireRole(["admin", "manager"]));

router.get("/payroll/periods", async (req, res) => {
  const tid = req.tenantId;
  const periods = await db
    .select()
    .from(payrollPeriodsTable)
    .where(tid ? eq(payrollPeriodsTable.tenantId, tid) : undefined)
    .orderBy(desc(payrollPeriodsTable.createdAt));
  res.json(periods.map(periodResponse));
});

router.post("/payroll/periods", async (req, res) => {
  const parsed = insertPayrollPeriodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (!canSetPayrollStatusFromGenericUpdate(parsed.data.status)) {
    res.status(409).json({ error: "El estado pagado solo puede establecerse mediante la liquidación de nómina" });
    return;
  }
  const [period] = await db
    .insert(payrollPeriodsTable)
    .values({ ...parsed.data, tenantId: req.tenantId })
    .returning();
  res.status(201).json(periodResponse(period));
});

router.put("/payroll/periods/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const existing = await assertPayrollPeriodTenant(id, tid, res);
  if (!existing) return;
  if (!canMutatePayrollPeriod(existing.status)) {
    res.status(409).json({ error: "Un período pagado no puede modificarse" });
    return;
  }
  const parsed = updatePayrollPeriodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (!canSetPayrollStatusFromGenericUpdate(parsed.data.status)) {
    res.status(409).json({ error: "El estado pagado solo puede establecerse mediante la liquidación de nómina" });
    return;
  }
  const [period] = await db
    .update(payrollPeriodsTable)
    .set(parsed.data)
    .where(
      and(
        eq(payrollPeriodsTable.id, id),
        tid ? eq(payrollPeriodsTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!period) {
    res.status(404).json({ error: "Period not found" });
    return;
  }
  res.json(periodResponse(period));
});

router.delete("/payroll/periods/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const existing = await assertPayrollPeriodTenant(id, tid, res);
  if (!existing) return;
  if (!canMutatePayrollPeriod(existing.status)) {
    res.status(409).json({ error: "Un período pagado no puede eliminarse" });
    return;
  }
  const [p] = await db
    .delete(payrollPeriodsTable)
    .where(
      and(
        eq(payrollPeriodsTable.id, id),
        tid ? eq(payrollPeriodsTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!p) {
    res.status(404).json({ error: "Period not found" });
    return;
  }
  res.status(204).send();
});

// ── PAYROLL RECORDS ─────────────────────────────────────────────────────────

const recordResponse = (r: PayrollRecord, emp?: Employee) => ({
  id: r.id,
  periodId: r.periodId,
  employeeId: r.employeeId,
  hoursWorked: r.hoursWorked,
  shiftsWorked: r.shiftsWorked,
  daysWorked: r.daysWorked,
  overtimeHours: r.overtimeHours,
  bonuses: r.bonuses,
  deductions: r.deductions,
  employeeCreditDeduction: r.employeeCreditDeduction,
  grossPay: r.grossPay,
  netPay: r.netPay,
  notes: r.notes ?? undefined,
  payslipPath: r.payslipPath ?? undefined,
  payslipSentAt: r.payslipSentAt ? r.payslipSentAt.toISOString() : undefined,
  employee: emp ? employeeResponse(emp) : undefined,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

router.get("/payroll/periods/:id/records", async (req, res) => {
  const periodId = Number(req.params.id);
  const tid = req.tenantId;
  const period = await assertPayrollPeriodTenant(periodId, tid, res);
  if (!period) return;
  let records = await db
    .select()
    .from(payrollRecordsTable)
    .where(eq(payrollRecordsTable.periodId, periodId))
    .orderBy(payrollRecordsTable.employeeId);
  const employeeIds = records.map((r) => r.employeeId);
  const employees =
    employeeIds.length > 0
      ? await db
          .select()
          .from(employeesTable)
          .where(
            and(
              inArray(employeesTable.id, employeeIds),
              tid ? eq(employeesTable.tenantId, tid) : undefined,
            ),
          )
      : [];
  const empMap = new Map(employees.map((e) => [e.id, e]));
  res.json(records.map((r) => recordResponse(r, empMap.get(r.employeeId))));
});

router.post("/payroll/periods/:id/records", async (req, res) => {
  const periodId = Number(req.params.id);
  const period = await assertPayrollPeriodTenant(periodId, req.tenantId, res);
  if (!period) return;
  if (!canMutatePayrollPeriod(period.status)) {
    res.status(409).json({ error: "Un período pagado no admite nuevos registros" });
    return;
  }
  const parsed = insertPayrollRecordSchema.safeParse({ ...req.body, periodId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [record] = await db
    .insert(payrollRecordsTable)
    .values(parsed.data)
    .returning();
  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, record.employeeId));
  res.status(201).json(recordResponse(record, emp));
});

router.put("/payroll/records/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await assertPayrollRecordTenant(id, req.tenantId, res);
  if (!existing) return;
  const period = await assertPayrollPeriodTenant(existing.periodId, req.tenantId, res);
  if (!period) return;
  if (!canMutatePayrollPeriod(period.status)) {
    res.status(409).json({ error: "Los registros de un período pagado no pueden modificarse" });
    return;
  }
  const parsed = updatePayrollRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [record] = await db
    .update(payrollRecordsTable)
    .set(parsed.data)
    .where(eq(payrollRecordsTable.id, id))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, record.employeeId));
  res.json(recordResponse(record, emp));
});

router.delete("/payroll/records/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await assertPayrollRecordTenant(id, req.tenantId, res);
  if (!existing) return;
  const period = await assertPayrollPeriodTenant(existing.periodId, req.tenantId, res);
  if (!period) return;
  if (!canMutatePayrollPeriod(period.status)) {
    res.status(409).json({ error: "Los registros de un período pagado no pueden eliminarse" });
    return;
  }
  await db
    .delete(payrollRecordsTable)
    .where(eq(payrollRecordsTable.id, id));
  res.status(204).send();
});

// ── PAYROLL: AUTO-FILL FROM TIME ENTRIES ────────────────────────────────────

async function readNumericSetting(
  key: string,
  fallback: number,
  tenantId?: number,
): Promise<number> {
  const raw = await readSetting(tenantId, key);
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
}

function calcGross(
  emp: Employee,
  hoursWorked: number,
  overtimeHours: number,
  shifts: number,
  days: number,
  otRate: number,
): number {
  const salary = emp.salary ?? 0;
  if (!salary) return 0;
  switch (emp.salaryType) {
    case "hourly":
      return salary * hoursWorked + salary * otRate * overtimeHours;
    case "per_shift":
      return salary * shifts;
    case "weekly":
      return salary * Math.ceil(days / 7);
    case "biweekly":
      return salary;
    case "monthly":
      return salary;
    default:
      return salary;
  }
}

router.post("/payroll/periods/:id/auto-fill", async (req, res) => {
  const periodId = Number(req.params.id);
  const period = await assertPayrollPeriodTenant(periodId, req.tenantId, res);
  if (!period) return;
  if (!canMutatePayrollPeriod(period.status)) {
    res.status(409).json({ error: "Un período pagado no puede recalcularse" });
    return;
  }

  const startDate = new Date(period.periodStart + "T00:00:00.000Z");
  const endDate = new Date(period.periodEnd + "T23:59:59.999Z");

  const overtimeRate = await readNumericSetting(
    "salary_overtime_rate",
    1.25,
    req.tenantId,
  );
  const dailyHours = await readNumericSetting(
    "regular_daily_hours",
    8,
    req.tenantId,
  );

  const tid = req.tenantId;
  const [employees, existing] = await Promise.all([
    db
      .select()
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.status, "active"),
          tid ? eq(employeesTable.tenantId, tid) : undefined,
        ),
      ),
    db
      .select()
      .from(payrollRecordsTable)
      .where(eq(payrollRecordsTable.periodId, periodId)),
  ]);
  const existingByEmp = new Map(existing.map((r) => [r.employeeId, r]));

  // Filter time entries to employees belonging to this tenant
  const tenantEmployeeIds = employees.map((e) => e.id);
  const entries =
    tenantEmployeeIds.length > 0
      ? await db
          .select()
          .from(timeEntriesTable)
          .where(
            and(
              gte(timeEntriesTable.clockIn, startDate),
              lte(timeEntriesTable.clockIn, endDate),
              inArray(timeEntriesTable.employeeId, tenantEmployeeIds),
            ),
          )
      : [];

  const aggregates = new Map<
    number,
    { hours: number; days: Set<string>; shifts: number }
  >();
  for (const e of entries) {
    if (!e.hoursWorked || e.hoursWorked <= 0) continue;
    const a = aggregates.get(e.employeeId) ?? {
      hours: 0,
      days: new Set<string>(),
      shifts: 0,
    };
    a.hours += e.hoursWorked;
    a.days.add(e.clockIn.toISOString().slice(0, 10));
    a.shifts += 1;
    aggregates.set(e.employeeId, a);
  }

  let processed = 0;
  for (const emp of employees) {
    const agg = aggregates.get(emp.id) ?? {
      hours: 0,
      days: new Set<string>(),
      shifts: 0,
    };
    const totalHours = Math.round(agg.hours * 100) / 100;
    const daysCount = agg.days.size;
    const expectedRegular = daysCount * dailyHours;
    const overtimeHours = Math.max(
      0,
      Math.round((totalHours - expectedRegular) * 100) / 100,
    );
    const regularHours = Math.max(
      0,
      Math.round((totalHours - overtimeHours) * 100) / 100,
    );
    const existingRec = existingByEmp.get(emp.id);
    const bonuses = existingRec?.bonuses ?? 0;
    const grossPay = calcGross(
      emp,
      regularHours,
      overtimeHours,
      agg.shifts,
      daysCount,
      overtimeRate,
    );
    const [balanceRow] = await db.select({ balance: employeeCreditMovementsTable.balanceAfter })
      .from(employeeCreditMovementsTable)
      .where(and(eq(employeeCreditMovementsTable.employeeId, emp.id), tid ? eq(employeeCreditMovementsTable.tenantId, tid) : undefined))
      .orderBy(desc(employeeCreditMovementsTable.id)).limit(1);
    const creditDeduction = replaceEmployeeCreditDeduction(
      Number(existingRec?.deductions ?? 0),
      Number(existingRec?.employeeCreditDeduction ?? 0),
      Number(balanceRow?.balance ?? 0),
      grossPay + bonuses,
    );
    const employeeCreditDeduction = money(creditDeduction.employeeCreditDeduction);
    const deductions = money(creditDeduction.deductions);
    const netPay = money(creditDeduction.netPay);

    if (existingRec) {
      await db
        .update(payrollRecordsTable)
        .set({
          hoursWorked: regularHours,
          overtimeHours,
          shiftsWorked: agg.shifts,
          daysWorked: daysCount,
          grossPay,
          netPay,
          deductions,
          employeeCreditDeduction,
        })
        .where(eq(payrollRecordsTable.id, existingRec.id));
    } else if (totalHours > 0) {
      await db.insert(payrollRecordsTable).values({
        periodId,
        employeeId: emp.id,
        hoursWorked: regularHours,
        overtimeHours,
        shiftsWorked: agg.shifts,
        daysWorked: daysCount,
        bonuses: 0,
        deductions,
        employeeCreditDeduction,
        grossPay,
        netPay,
      });
    } else {
      continue;
    }
    processed += 1;
  }

  const records = await db
    .select()
    .from(payrollRecordsTable)
    .where(eq(payrollRecordsTable.periodId, periodId));
  const empMap = new Map(employees.map((e) => [e.id, e]));
  res.json({
    processed,
    records: records.map((r) => recordResponse(r, empMap.get(r.employeeId))),
  });
});

// ── PAYROLL: GENERATE & SEND PAYSLIPS ───────────────────────────────────────

router.post("/payroll/periods/:id/send-payslips", async (req, res) => {
  const periodId = Number(req.params.id);
  const period = await assertPayrollPeriodTenant(periodId, req.tenantId, res);
  if (!period) return;

  let records = await db
    .select()
    .from(payrollRecordsTable)
    .where(eq(payrollRecordsTable.periodId, periodId));
  const employees = await db
    .select()
    .from(employeesTable)
    .where(
      period.tenantId !== null
        ? eq(employeesTable.tenantId, period.tenantId)
        : undefined,
    );
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const [companyNameRaw, currencyRaw] = await Promise.all([
    readSetting(req.tenantId, "company_name"),
    readSetting(req.tenantId, "company_currency"),
  ]);
  let companyName = "FYRO APP";
  let currency = "COP";
  try {
    if (companyNameRaw)
      companyName = String(JSON.parse(companyNameRaw) || companyName);
  } catch {}
  try {
    if (currencyRaw) currency = String(JSON.parse(currencyRaw) || currency);
  } catch {}

  const { generatePayslipPdf, uploadPayslip, emailPayslip, payslipFilename } =
    await import("../lib/payslip.js");

  const forceResend = req.query.resend === "true" || req.body?.resend === true;
  const onlyEmployeeId = req.query.employeeId
    ? Number(req.query.employeeId)
    : null;
  const finalizingPayroll = onlyEmployeeId === null && period.status !== "paid" && records.length > 0;
  if (finalizingPayroll) {
    const missingEmployee = records.find(record => !empMap.has(record.employeeId));
    if (missingEmployee) {
      res.status(409).json({ error: `Empleado ${missingEmployee.employeeId} no encontrado para liquidación` });
      return;
    }
    await db.transaction(async tx => {
      for (const rec of records) {
        await tx.execute(sql`SELECT id FROM employees WHERE id = ${rec.employeeId} AND tenant_id = ${req.tenantId!} FOR UPDATE`);
        const [latest] = await tx.select({ balance: employeeCreditMovementsTable.balanceAfter })
          .from(employeeCreditMovementsTable)
          .where(and(
            eq(employeeCreditMovementsTable.employeeId, rec.employeeId),
            eq(employeeCreditMovementsTable.tenantId, req.tenantId!),
          ))
          .orderBy(desc(employeeCreditMovementsTable.id))
          .limit(1);
        const recalculated = replaceEmployeeCreditDeduction(
          Number(rec.deductions ?? 0),
          Number(rec.employeeCreditDeduction ?? 0),
          Number(latest?.balance ?? 0),
          Number(rec.grossPay ?? 0) + Number(rec.bonuses ?? 0),
        );
        await tx.update(payrollRecordsTable)
          .set({
            deductions: recalculated.deductions,
            employeeCreditDeduction: recalculated.employeeCreditDeduction,
            netPay: recalculated.netPay,
          })
          .where(eq(payrollRecordsTable.id, rec.id));
      }
    });
    records = await db.select()
      .from(payrollRecordsTable)
      .where(eq(payrollRecordsTable.periodId, periodId));
  }
  const results: Array<{
    employeeId: number;
    status: "sent" | "no_email" | "error" | "skipped";
    reason?: string;
  }> = [];
  for (const rec of records) {
    if (onlyEmployeeId && rec.employeeId !== onlyEmployeeId) continue;
    const emp = empMap.get(rec.employeeId);
    if (!emp) {
      results.push({
        employeeId: rec.employeeId,
        status: "error",
        reason: "Empleado no encontrado",
      });
      continue;
    }
    if (rec.payslipSentAt && !forceResend && !finalizingPayroll) {
      results.push({
        employeeId: rec.employeeId,
        status: "skipped",
        reason: "Ya enviado",
      });
      continue;
    }
    const targetEmail = emp.clerkEmail || emp.email;
    try {
      const pdf = await generatePayslipPdf({
        companyName,
        periodName: period.name,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        employeeName: emp.name,
        employeeRole: emp.role,
        employeeEmail: targetEmail ?? undefined,
        hoursWorked: rec.hoursWorked,
        overtimeHours: rec.overtimeHours,
        shiftsWorked: rec.shiftsWorked,
        daysWorked: rec.daysWorked,
        bonuses: rec.bonuses,
        deductions: rec.deductions,
        employeeCreditDeduction: rec.employeeCreditDeduction,
        grossPay: rec.grossPay,
        netPay: rec.netPay,
        notes: rec.notes ?? undefined,
        currency,
      });
      const path = await uploadPayslip(pdf, payslipFilename(periodId, emp.id));
      if (!targetEmail) {
        await db
          .update(payrollRecordsTable)
          .set({ payslipPath: path })
          .where(eq(payrollRecordsTable.id, rec.id));
        results.push({
          employeeId: emp.id,
          status: "no_email",
          reason: "Sin correo registrado",
        });
        continue;
      }
      await emailPayslip({
        to: targetEmail,
        employeeName: emp.name,
        periodName: period.name,
        pdf,
      });
      await db
        .update(payrollRecordsTable)
        .set({ payslipPath: path, payslipSentAt: new Date() })
        .where(eq(payrollRecordsTable.id, rec.id));
      results.push({ employeeId: emp.id, status: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      results.push({ employeeId: emp.id, status: "error", reason: message });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const noEmail = results.filter((r) => r.status === "no_email").length;
  const errors = results.filter((r) => r.status === "error").length;

  if (shouldFinalizePayrollCredit({
    onlyEmployeeId,
    errors,
    processed: sent + noEmail,
  })) {
    await db.transaction(async tx => {
      for (const rec of records) {
        const deduction = Number(rec.employeeCreditDeduction ?? 0);
        if (deduction <= 0) continue;
        await tx.execute(sql`SELECT id FROM employees WHERE id = ${rec.employeeId} AND tenant_id = ${req.tenantId!} FOR UPDATE`);
        const [latest] = await tx.select({ balance: employeeCreditMovementsTable.balanceAfter })
          .from(employeeCreditMovementsTable)
          .where(and(
            eq(employeeCreditMovementsTable.employeeId, rec.employeeId),
            eq(employeeCreditMovementsTable.tenantId, req.tenantId!),
          ))
          .orderBy(desc(employeeCreditMovementsTable.id))
          .limit(1);
        const balance = Number(latest?.balance ?? 0);
        if (balance < deduction) throw new Error("EMPLOYEE_CREDIT_BALANCE_CHANGED_DURING_PAYROLL");
        await tx.insert(employeeCreditMovementsTable).values({
          tenantId: req.tenantId!,
          employeeId: rec.employeeId,
          type: "payroll_deduction",
          amount: deduction,
          balanceAfter: money(balance - deduction),
          payrollRecordId: rec.id,
          actorEmployeeId: req.employeeId ?? null,
          notes: `Descuento nómina ${period.name}`,
          emailStatus: "no_email",
        }).onConflictDoNothing();
      }
      await tx.update(payrollPeriodsTable)
        .set({ status: "paid" })
        .where(eq(payrollPeriodsTable.id, periodId));
    });
  }

  res.json({ sent, noEmail, errors, results });
});

// POST /api/payroll/add-bonus — add a bonus to the employee's latest open payroll period record
router.post("/payroll/add-bonus", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }
  const schema = z.object({
    employeeId: z.number().int().positive(),
    amount: z.number().positive(),
    description: z.string().max(500).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  const { employeeId, amount } = parse.data;
  const [employee] = await db.select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.tenantId, tid)))
    .limit(1);
  if (!employee) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
  // Only mutable periods may receive bonuses; paid payroll is immutable.
  const periodRows = (await db.execute(sql`
    SELECT id FROM payroll_periods
    WHERE tenant_id = ${tid} AND status IN ('draft', 'approved')
    ORDER BY end_date DESC LIMIT 1
  `)).rows;
  if (!periodRows.length) { res.status(404).json({ error: "No hay período de nómina abierto" }); return; }
  const periodId = (periodRows[0] as { id: number }).id;
  // Find the employee's payroll record in that period
  // Note: payroll_records has no tenant_id column; tenant is already
  // scoped via periodId (from a period WHERE tenant_id = tid above)
  const recRows = (await db.execute(sql`
    SELECT id, bonuses FROM payroll_records
    WHERE period_id = ${periodId} AND employee_id = ${employeeId}
    LIMIT 1
  `)).rows;
  if (!recRows.length) {
    // No record yet for this employee in the period — create an independent one
    // First verify the employee belongs to this tenant
    const [emp] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), tid ? eq(employeesTable.tenantId, tid) : undefined))
      .limit(1);
    if (!emp) { res.status(404).json({ error: "Empleado no encontrado" }); return; }
    const [newRec] = await db
      .insert(payrollRecordsTable)
      .values({ periodId, employeeId, bonuses: amount })
      .returning({ id: payrollRecordsTable.id, bonuses: payrollRecordsTable.bonuses });
    res.json({ ...newRec, created: true });
    return;
  }
  const rec = recRows[0] as { id: number; bonuses: string | number };
  const newBonuses = Number(rec.bonuses) + amount;
  const [updated] = await db
    .update(payrollRecordsTable)
    .set({ bonuses: newBonuses })
    .where(eq(payrollRecordsTable.id, rec.id))
    .returning({ id: payrollRecordsTable.id, bonuses: payrollRecordsTable.bonuses });
  res.json(updated);
});

router.get("/payroll/records/:id/payslip", async (req, res) => {
  const id = Number(req.params.id);
  const [rec] = await db
    .select()
    .from(payrollRecordsTable)
    .where(eq(payrollRecordsTable.id, id));
  if (!rec || !rec.payslipPath) {
    res.status(404).json({ error: "Sin desprendible generado" });
    return;
  }
  const { getPayslipSignedUrl, downloadPayslip } = await import(
    "../lib/payslip.js"
  );
  try {
    const url = await getPayslipSignedUrl(rec.payslipPath);
    res.redirect(302, url);
  } catch {
    try {
      const buf = await downloadPayslip(rec.payslipPath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="payslip-${id}.pdf"`,
      );
      res.send(buf);
    } catch {
      res.status(500).json({ error: "No se pudo descargar el desprendible" });
    }
  }
});

// ── PAYROLL ATTENDANCE ───────────────────────────────────────────────────────

const attendanceResponse = (a: PayrollAttendance) => ({
  id: a.id,
  employeeId: a.employeeId,
  workDate: a.workDate,
  status: a.status,
  hoursWorked: a.hoursWorked,
  shiftsWorked: a.shiftsWorked,
  notes: a.notes ?? undefined,
  createdAt: a.createdAt.toISOString(),
});

router.get("/payroll/attendance", async (req, res) => {
  const tid = req.tenantId;
  const employeeId = req.query.employeeId
    ? Number(req.query.employeeId)
    : undefined;

  // Scope to this tenant's employees
  const tenantEmpIds =
    tid !== undefined
      ? (
          await db
            .select({ id: employeesTable.id })
            .from(employeesTable)
            .where(eq(employeesTable.tenantId, tid))
        ).map((e) => e.id)
      : null;

  const conditions = [];
  if (employeeId) {
    if (tenantEmpIds !== null && !tenantEmpIds.includes(employeeId)) {
      res.json([]);
      return;
    }
    conditions.push(eq(payrollAttendanceTable.employeeId, employeeId));
  } else if (tenantEmpIds !== null) {
    if (tenantEmpIds.length === 0) {
      res.json([]);
      return;
    }
    conditions.push(inArray(payrollAttendanceTable.employeeId, tenantEmpIds));
  }

  const attendance = await db
    .select()
    .from(payrollAttendanceTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(payrollAttendanceTable.workDate));
  res.json(attendance.map(attendanceResponse));
});

router.post("/payroll/attendance", async (req, res) => {
  const parsed = insertPayrollAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (!(await assertEmployeeTenant(parsed.data.employeeId, req.tenantId, res)))
    return;
  const [att] = await db
    .insert(payrollAttendanceTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(attendanceResponse(att));
});

router.put("/payroll/attendance/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updatePayrollAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (!(await assertAttendanceTenant(id, req.tenantId, res))) return;
  const [att] = await db
    .update(payrollAttendanceTable)
    .set(parsed.data)
    .where(eq(payrollAttendanceTable.id, id))
    .returning();
  if (!att) {
    res.status(404).json({ error: "Attendance not found" });
    return;
  }
  res.json(attendanceResponse(att));
});

router.delete("/payroll/attendance/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!(await assertAttendanceTenant(id, req.tenantId, res))) return;
  const [att] = await db
    .delete(payrollAttendanceTable)
    .where(eq(payrollAttendanceTable.id, id))
    .returning();
  if (!att) {
    res.status(404).json({ error: "Attendance not found" });
    return;
  }
  res.status(204).send();
});

// ── TIME CLOCK ──────────────────────────────────────────────────────────────

const timeEntryResponse = (t: TimeEntry, emp?: Employee) => ({
  id: t.id,
  employeeId: t.employeeId,
  workDate: t.workDate,
  clockIn: t.clockIn.toISOString(),
  clockOut: t.clockOut ? t.clockOut.toISOString() : undefined,
  hoursWorked: t.hoursWorked ?? undefined,
  notes: t.notes ?? undefined,
  employee: emp ? employeeResponse(emp) : undefined,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});

router.get("/clock/entries", async (req, res) => {
  const tid = req.tenantId;
  const identity = req.authEmployee;
  if (!identity) {
    res.status(401).json({ error: "No autenticado", code: "AUTHENTICATION_REQUIRED" });
    return;
  }
  const canListCompanyEntries = req.isSuperAdmin ||
    ["admin", "manager"].includes(identity.role.toLowerCase());
  const requestedEmployeeId = req.query.employeeId
    ? Number(req.query.employeeId)
    : undefined;
  // Employees can only ever read their own entries. Do not accept a client-
  // supplied employee ID as an authority for this scope.
  const employeeId = canListCompanyEntries ? requestedEmployeeId : identity.id;
  const date = req.query.date as string | undefined;

  // Resolve tenant employee IDs to scope time entries (timeEntriesTable has no tenantId column)
  const tenantEmpIds =
    tid !== undefined
      ? (
          await db
            .select({ id: employeesTable.id })
            .from(employeesTable)
            .where(eq(employeesTable.tenantId, tid))
        ).map((e) => e.id)
      : null;

  const conditions = [];
  if (employeeId) {
    if (tenantEmpIds !== null && !tenantEmpIds.includes(employeeId)) {
      res.json([]);
      return;
    }
    conditions.push(eq(timeEntriesTable.employeeId, employeeId));
  } else if (tenantEmpIds !== null) {
    if (tenantEmpIds.length === 0) {
      res.json([]);
      return;
    }
    conditions.push(inArray(timeEntriesTable.employeeId, tenantEmpIds));
  }
  if (date) conditions.push(eq(timeEntriesTable.workDate, date));

  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(timeEntriesTable.clockIn));

  const empIds = [...new Set(entries.map((e) => e.employeeId))];
  const employees = empIds.length
    ? await db
        .select()
        .from(employeesTable)
        .where(inArray(employeesTable.id, empIds))
    : [];
  const empMap = new Map(employees.map((e) => [e.id, e]));
  res.json(entries.map((t) => timeEntryResponse(t, empMap.get(t.employeeId))));
});

// ── QR Token helpers ──────────────────────────────────────────────────────────

async function getOrCreateClockSecret(tenantId?: number): Promise<string> {
  const raw = await readSetting(tenantId, "clock_secret");
  if (raw) return JSON.parse(raw) as string;
  const secret = crypto.randomBytes(32).toString("hex");
  await writeSetting(tenantId, "clock_secret", JSON.stringify(secret));
  return secret;
}

function getQrWindow() {
  return Math.floor(Date.now() / 15_000);
}

function makeQrToken(secret: string, windowIdx: number): string {
  return crypto
    .createHmac("sha256", secret)
    .update(String(windowIdx))
    .digest("hex")
    .slice(0, 10);
}

type PublicQrPayload = {
  tenantId: number;
  expiresAt: number;
  nonce: string;
};

function makePublicQrToken(secret: string, payload: PublicQrPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyPublicQrToken(secret: string, token: string, tenantId: number): PublicQrPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  const expectedSignature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PublicQrPayload;
    if (
      payload.tenantId !== tenantId ||
      payload.expiresAt <= Date.now() ||
      typeof payload.nonce !== "string" ||
      !payload.nonce
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

function isValidQrToken(secret: string, token: string): boolean {
  if (token.includes(".")) return false;
  const w = getQrWindow();
  // Only the current 15s window is accepted; tokens from any other window
  // are considered expired and will return 410.
  return makeQrToken(secret, w) === token;
}

router.get("/clock/qr-token", async (req, res) => {
  if (!req.tenantId) {
    res.status(403).json({ error: "Empresa no disponible" });
    return;
  }
  const role = req.authEmployee?.role?.toLowerCase();
  const employeeId = req.employeeId ?? req.authEmployee?.id;
  const isAuthorized =
    req.isSuperAdmin ||
    (role &&
      employeeId &&
      (await canOperateAttendanceKiosk(req.tenantId, employeeId, role)));
  if (!isAuthorized) {
    res.status(403).json({
      error:
        "Esta cuenta no tiene permiso para operar el quiosco de asistencia.",
    });
    return;
  }
  const secret = await getOrCreateClockSecret(req.tenantId);
  const w = getQrWindow();
  const expiresAt = (w + 1) * 15_000;
  const token = makePublicQrToken(secret, {
    tenantId: req.tenantId,
    expiresAt,
    nonce: crypto.randomBytes(8).toString("hex"),
  });
  const secondsLeft = Math.ceil((expiresAt - Date.now()) / 1000);
  const [tenant] = await db
    .select({ slug: tenantsTable.slug })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, req.tenantId))
    .limit(1);
  res.json({ token, expiresAt, secondsLeft, tenantSlug: tenant?.slug ?? "" });
});

// ── Public verified clock flow ────────────────────────────────────────────────

const PUBLIC_CLOCK_CODE_TTL_MS = 5 * 60_000;
const PUBLIC_CLOCK_MAX_ATTEMPTS = 5;
const PUBLIC_CLOCK_MAX_REQUESTS_PER_IDENTIFIER = 3;
const PUBLIC_CLOCK_DUPLICATE_WINDOW_MS = 2_000;
const ATTENDANCE_SESSION_TTL_MS = 12 * 60 * 60_000;
const ATTENDANCE_SESSION_COOKIE = "fyro_attendance_session";

function publicClockHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readCookie(req: Request, name: string): string | null {
  const prefix = `${name}=`;
  const item = (req.headers.cookie ?? "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(prefix.length));
  } catch {
    return null;
  }
}

function setAttendanceSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(ATTENDANCE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

function clearAttendanceSessionCookie(res: Response): void {
  res.clearCookie(ATTENDANCE_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

async function issueAttendanceSession(
  req: Request,
  res: Response,
  tenantId: number,
  employeeId: number,
): Promise<Date> {
  const previousToken = readCookie(req, ATTENDANCE_SESSION_COOKIE);
  if (previousToken) {
    await db
      .update(attendanceSessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(attendanceSessionsTable.tokenHash, publicClockHash(previousToken)));
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ATTENDANCE_SESSION_TTL_MS);
  await db.insert(attendanceSessionsTable).values({
    tokenHash: publicClockHash(token),
    tenantId,
    employeeId,
    expiresAt,
  });
  setAttendanceSessionCookie(res, token, expiresAt);
  return expiresAt;
}

async function findAttendanceSession(
  req: Request,
  tenantId: number,
  employeeId: number,
): Promise<typeof attendanceSessionsTable.$inferSelect | null> {
  const token = readCookie(req, ATTENDANCE_SESSION_COOKIE);
  if (!token) return null;
  const [session] = await db
    .select()
    .from(attendanceSessionsTable)
    .where(and(
      eq(attendanceSessionsTable.tokenHash, publicClockHash(token)),
      eq(attendanceSessionsTable.tenantId, tenantId),
      eq(attendanceSessionsTable.employeeId, employeeId),
      isNull(attendanceSessionsTable.revokedAt),
      gt(attendanceSessionsTable.expiresAt, new Date()),
    ))
    .limit(1);
  return session ?? null;
}

function publicClockCodeHash(secret: string, challengeId: string, code: string): string {
  return crypto.createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("hex");
}

function publicClockHashMatches(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalizeClockIdentifier(channel: "email" | "phone", value: string): string {
  if (channel === "email") return value.trim().toLowerCase();
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits;
}

type PublicClockEmployeeOptionPayload = {
  tenantId: number;
  email: string;
  expiresAt: number;
};

function makePublicClockEmployeeOption(
  secret: string,
  payload: PublicClockEmployeeOptionPayload,
): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `option.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function readPublicClockEmployeeOption(
  secret: string,
  token: string,
  tenantId: number,
): string | null {
  if (!token.startsWith("option.")) return null;
  const [prefix, ivText, tagText, encryptedText, extra] = token.split(".");
  if (prefix !== "option" || !ivText || !tagText || !encryptedText || extra) return null;
  try {
    const key = crypto.createHash("sha256").update(secret).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]);
    const payload = JSON.parse(decrypted.toString("utf8")) as PublicClockEmployeeOptionPayload;
    if (
      payload.tenantId !== tenantId ||
      payload.expiresAt <= Date.now() ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return normalizeClockIdentifier("email", payload.email);
  } catch {
    return null;
  }
}

function maskPublicClockEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  if (localPart.length <= 2) return `${localPart.slice(0, 1)}***@${domain}`;
  return `${localPart.slice(0, 1)}***${localPart.slice(-1)}@${domain}`;
}

function publicQrClaimKey(tenantId: number, qrToken: string): string {
  return `${tenantId}:${qrToken}`;
}

async function sendPublicClockEmail(to: string, code: string, tenantName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("EMAIL_PROVIDER_UNCONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "FYRO APP <notificaciones@resend.dev>",
      to,
      subject: `Código de asistencia — ${tenantName}`,
      text: `Tu código de verificación para marcar asistencia es ${code}. Vence en 5 minutos. Si no solicitaste este código, ignora este mensaje.`,
    }),
  });
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
}

function publicClockPhoneConfigured(): boolean {
  return Boolean(process.env.ATTENDANCE_OTP_PHONE_WEBHOOK_URL);
}

async function sendPublicClockPhone(to: string, code: string, tenantName: string): Promise<void> {
  const url = process.env.ATTENDANCE_OTP_PHONE_WEBHOOK_URL;
  if (!url) throw new Error("PHONE_PROVIDER_UNCONFIGURED");
  const token = process.env.ATTENDANCE_OTP_PHONE_WEBHOOK_TOKEN;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      to,
      message: `${tenantName}: tu código para marcar asistencia es ${code}. Vence en 5 minutos.`,
    }),
  });
  if (!response.ok) throw new Error(`PHONE_PROVIDER_${response.status}`);
}

type PublicClockMarkOutcome =
  | {
      ok: true;
      action: "clock_in" | "clock_out";
      employee: Employee;
      workDate: string;
      occurredAt: Date;
      hoursWorked?: number;
    }
  | { ok: false; status: number; error: string };

function publicClockMarkResponse(result: Extract<PublicClockMarkOutcome, { ok: true }>) {
  return {
    action: result.action,
    employeeName: result.employee.name,
    employeeEmail: result.employee.email ?? result.employee.clerkEmail ?? null,
    employeeRole: result.employee.role,
    workDate: result.workDate,
    occurredAt: result.occurredAt.toISOString(),
    ...(result.hoursWorked !== undefined ? { hoursWorked: result.hoursWorked } : {}),
  };
}

async function markAuthenticatedPublicClock(
  tenantId: number,
  employeeId: number,
  qrToken: string,
): Promise<PublicClockMarkOutcome> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${employeeId})`);
    const [employee] = await tx
      .select()
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, employeeId),
        eq(employeesTable.tenantId, tenantId),
        eq(employeesTable.status, "active"),
      ))
      .limit(1);
    if (!employee) {
      return { ok: false, status: 403, error: "Esta cuenta ya no está activa para marcar asistencia." };
    }
    if (employee.passwordMustChange) {
      return { ok: false, status: 403, error: "Debes cambiar tu contraseña antes de marcar asistencia." };
    }

    const now = new Date();
    const todayParts = new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const todayValues = Object.fromEntries(todayParts.map((part) => [part.type, part.value]));
    const today = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;
    const [latestEntry] = await tx
      .select({ clockIn: timeEntriesTable.clockIn, clockOut: timeEntriesTable.clockOut })
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.employeeId, employee.id))
      .orderBy(desc(timeEntriesTable.clockIn))
      .limit(1);
    const latestEventAt = latestEntry?.clockOut ?? latestEntry?.clockIn;
    if (latestEventAt && now.getTime() - latestEventAt.getTime() < PUBLIC_CLOCK_DUPLICATE_WINDOW_MS) {
      return { ok: false, status: 409, error: "La marcación ya fue registrada. Evita escanear dos veces seguidas." };
    }

    const [openEntry] = await tx
      .select()
      .from(timeEntriesTable)
      .where(and(
        eq(timeEntriesTable.employeeId, employee.id),
        isNull(timeEntriesTable.clockOut),
      ))
      .for("update")
      .limit(1);
    const claimed = await tx
      .insert(usedQrTokensTable)
      .values({ tokenHash: publicQrClaimKey(tenantId, qrToken), tenantId })
      .onConflictDoNothing()
      .returning({ id: usedQrTokensTable.id });
    if (claimed.length === 0) {
      return { ok: false, status: 409, error: "Código QR ya utilizado. Escanea el código actualizado." };
    }

    let action: "clock_in" | "clock_out";
    let hoursWorked: number | undefined;
    if (openEntry) {
      action = "clock_out";
      hoursWorked = Math.round(((now.getTime() - openEntry.clockIn.getTime()) / 3_600_000) * 100) / 100;
      await tx
        .update(timeEntriesTable)
        .set({ clockOut: now, hoursWorked })
        .where(eq(timeEntriesTable.id, openEntry.id));
    } else {
      action = "clock_in";
      await tx.insert(timeEntriesTable).values({
        employeeId: employee.id,
        tenantId,
        workDate: today,
        clockIn: now,
      });
    }
    return {
      ok: true,
      action,
      employee,
      workDate: today,
      occurredAt: now,
      ...(hoursWorked !== undefined ? { hoursWorked } : {}),
    };
  });
}

router.post("/clock/public/mark", async (req, res): Promise<void> => {
  await publicClockChallengesReady;
  const identity = req.authEmployee;
  if (!identity) {
    res.status(401).json({ error: "Inicia sesión en FYRO para marcar asistencia.", code: "AUTHENTICATION_REQUIRED" });
    return;
  }
  if (identity.status !== "active") {
    res.status(403).json({ error: "Esta cuenta está inactiva. Contacta al administrador.", code: "ACCOUNT_INACTIVE" });
    return;
  }
  if (identity.passwordMustChange) {
    res.status(403).json({ error: "Debes cambiar tu contraseña antes de marcar asistencia.", code: "PASSWORD_CHANGE_REQUIRED" });
    return;
  }
  const parsed = MarkAuthenticatedPublicClockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos de QR inválidos.", code: "INVALID_ATTENDANCE_DATA" });
    return;
  }

  const { tenantSlug, qrToken } = parsed.data!;
  const [tenant] = await db
    .select({ id: tenantsTable.id, status: tenantsTable.status })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, tenantSlug.toLowerCase()))
    .limit(1);
  if (!tenant || tenant.status === "inactive" || tenant.status === "expired") {
    res.status(410).json({ error: "La empresa del código QR no está disponible.", code: "TENANT_UNAVAILABLE" });
    return;
  }
  if (identity.tenantId !== tenant.id) {
    res.status(403).json({ error: "Tu cuenta pertenece a otra empresa y no puede usar este código QR.", code: "ACCOUNT_TENANT_MISMATCH" });
    return;
  }

  const secret = await getOrCreateClockSecret(tenant.id);
  const qrPayload = verifyPublicQrToken(secret, qrToken, tenant.id);
  if (!qrPayload) {
    res.status(410).json({ error: "El código QR venció. Escanea el código actualizado.", code: "QR_EXPIRED" });
    return;
  }
  const marked = await markAuthenticatedPublicClock(tenant.id, identity.id, qrToken);
  if (!marked.ok) {
    res.status(marked.status).json({ error: marked.error, code: marked.status === 409 ? "QR_ALREADY_USED" : "ATTENDANCE_REJECTED" });
    return;
  }
  purgeExpiredQrTokens();
  res.json(publicClockMarkResponse(marked));
});

async function markWithAttendanceSession(
  sessionId: number,
  tenantId: number,
  employeeId: number,
  qrToken: string,
): Promise<PublicClockMarkOutcome> {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(attendanceSessionsTable)
      .where(eq(attendanceSessionsTable.id, sessionId))
      .for("update")
      .limit(1);
    const now = new Date();
    if (
      !session ||
      session.tenantId !== tenantId ||
      session.employeeId !== employeeId ||
      session.revokedAt ||
      session.expiresAt <= now
    ) {
      return { ok: false, status: 401, error: "La sesión de asistencia venció. Verifica tu correo nuevamente." };
    }

    await tx.execute(sql`SELECT pg_advisory_xact_lock(${employeeId})`);
    const [employee] = await tx
      .select()
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, employeeId),
        eq(employeesTable.tenantId, tenantId),
        eq(employeesTable.status, "active"),
      ))
      .limit(1);
    if (!employee) {
      return { ok: false, status: 410, error: "El empleado ya no está habilitado para marcar asistencia." };
    }

    const today = now.toISOString().split("T")[0];
    const [latestEntry] = await tx
      .select({ clockIn: timeEntriesTable.clockIn, clockOut: timeEntriesTable.clockOut })
      .from(timeEntriesTable)
      .where(and(
        eq(timeEntriesTable.employeeId, employee.id),
        eq(timeEntriesTable.workDate, today),
      ))
      .orderBy(desc(timeEntriesTable.clockIn))
      .limit(1);
    const latestEventAt = latestEntry?.clockOut ?? latestEntry?.clockIn;
    if (latestEventAt && now.getTime() - latestEventAt.getTime() < PUBLIC_CLOCK_DUPLICATE_WINDOW_MS) {
      return { ok: false, status: 409, error: "La marcación ya fue registrada. Evita escanear dos veces seguidas." };
    }
    const [openEntry] = await tx
      .select()
      .from(timeEntriesTable)
      .where(and(
        eq(timeEntriesTable.employeeId, employee.id),
        eq(timeEntriesTable.workDate, today),
        isNull(timeEntriesTable.clockOut),
      ))
      .for("update")
      .limit(1);
    const claimed = await tx
      .insert(usedQrTokensTable)
      .values({ tokenHash: publicQrClaimKey(tenantId, qrToken), tenantId })
      .onConflictDoNothing()
      .returning({ id: usedQrTokensTable.id });
    if (claimed.length === 0) {
      return { ok: false, status: 409, error: "Código QR ya utilizado. Escanea el código actualizado." };
    }

    let action: "clock_in" | "clock_out";
    let hoursWorked: number | undefined;
    if (openEntry) {
      action = "clock_out";
      hoursWorked = Math.round(((now.getTime() - openEntry.clockIn.getTime()) / 3_600_000) * 100) / 100;
      await tx
        .update(timeEntriesTable)
        .set({ clockOut: now, hoursWorked })
        .where(eq(timeEntriesTable.id, openEntry.id));
    } else {
      action = "clock_in";
      await tx.insert(timeEntriesTable).values({
        employeeId: employee.id,
        tenantId,
        workDate: today,
        clockIn: now,
      });
    }
    await tx
      .update(attendanceSessionsTable)
      .set({ lastUsedAt: now })
      .where(eq(attendanceSessionsTable.id, session.id));
    return {
      ok: true,
      action,
      employee,
      workDate: today,
      occurredAt: now,
      ...(hoursWorked !== undefined ? { hoursWorked } : {}),
    };
  });
}

router.get("/clock/public/options", async (req, res): Promise<void> => {
  res.status(410).json({ error: "El selector de empleados fue retirado. Inicia sesión en FYRO.", code: "LEGACY_ATTENDANCE_FLOW_RETIRED" });
  return;
  /*
  await publicClockChallengesReady;
  const parsed = ListPublicClockEmployeeOptionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos del código QR inválidos." });
    return;
  }
  const { tenantSlug, qrToken, latitude, longitude, accuracy } = parsed.data;
  const [tenant] = await db
    .select({ id: tenantsTable.id, status: tenantsTable.status })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, tenantSlug))
    .limit(1);
  if (!tenant || tenant.status === "inactive" || tenant.status === "expired") {
    res.status(404).json({ error: "Empresa no encontrada." });
    return;
  }
  const secret = await getOrCreateClockSecret(tenant.id);
  const qrPayload = verifyPublicQrToken(secret, qrToken, tenant.id);
  if (!qrPayload) {
    res.status(410).json({ error: "El código QR venció. Escanea el código actualizado." });
    return;
  }
  const distance = publicClockDistanceMeters(latitude, longitude, qrPayload.lat, qrPayload.lng);
  const permittedDistance = Math.max(qrPayload.radius, Math.min(accuracy, 100));
  if (distance > permittedDistance) {
    res.status(403).json({ error: "Estás fuera del área permitida para consultar empleados." });
    return;
  }

  const employees = await db
    .select({ email: employeesTable.email, clerkEmail: employeesTable.clerkEmail })
    .from(employeesTable)
    .where(and(eq(employeesTable.tenantId, tenant.id), eq(employeesTable.status, "active")));
  const emails = Array.from(new Set(
    employees
      .map((employee) => employee.email ?? employee.clerkEmail)
      .filter((email): email is string => Boolean(email))
      .map((email) => normalizeClockIdentifier("email", email)),
  )).sort();
  res.json({
    options: emails.map((email) => ({
      identifier: makePublicClockEmployeeOption(secret, {
        tenantId: tenant.id,
        email,
        expiresAt: qrPayload.expiresAt,
      }),
      label: maskPublicClockEmail(email),
    })),
  });
  */
});

router.delete("/clock/public/session", async (req, res): Promise<void> => {
  res.status(410).json({ error: "La sesión exclusiva de asistencia fue retirada.", code: "LEGACY_ATTENDANCE_FLOW_RETIRED" });
  return;
  /*
  await publicClockChallengesReady;
  const token = readCookie(req, ATTENDANCE_SESSION_COOKIE);
  if (token) {
    await db
      .update(attendanceSessionsTable)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(attendanceSessionsTable.tokenHash, publicClockHash(token)),
        isNull(attendanceSessionsTable.revokedAt),
      ));
  }
  clearAttendanceSessionCookie(res);
  res.status(204).send();
  */
});

router.post("/clock/public/challenges", async (req, res): Promise<void> => {
  res.status(410).json({ error: "La verificación OTP fue retirada. Inicia sesión en FYRO.", code: "LEGACY_ATTENDANCE_FLOW_RETIRED" });
  return;
  /*
  await publicClockChallengesReady;
  const parsed = RequestPublicClockChallengeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos de verificación inválidos" });
    return;
  }

  const { tenantSlug, qrToken, channel, identifier, deviceToken, latitude, longitude, accuracy } = parsed.data;

  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, status: tenantsTable.status })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, tenantSlug.trim().toLowerCase()))
    .limit(1);
  if (!tenant || tenant.status === "inactive" || tenant.status === "expired") {
    res.status(410).json({ error: "Código QR inválido o expirado." });
    return;
  }

  const secret = await getOrCreateClockSecret(tenant.id);
  const qrPayload = verifyPublicQrToken(secret, qrToken, tenant.id);
  if (!qrPayload) {
    res.status(410).json({ error: "Código QR expirado. Escanea el código actualizado." });
    return;
  }
  const distance = publicClockDistanceMeters(latitude, longitude, qrPayload.lat, qrPayload.lng);
  const permittedDistance = Math.max(qrPayload.radius, Math.min(accuracy, 100));
  if (distance > permittedDistance) {
    res.status(403).json({ error: "Estás fuera del área permitida para marcar asistencia." });
    return;
  }
  const claimKey = publicQrClaimKey(tenant.id, qrToken);
  const [alreadyUsed] = await db
    .select({ id: usedQrTokensTable.id })
    .from(usedQrTokensTable)
    .where(eq(usedQrTokensTable.tokenHash, claimKey))
    .limit(1);
  if (alreadyUsed) {
    res.status(409).json({ error: "Código QR ya utilizado. Espera al siguiente código." });
    return;
  }

  const normalized = channel === "email"
    ? readPublicClockEmployeeOption(secret, identifier, tenant.id) ?? normalizeClockIdentifier(channel, identifier)
    : normalizeClockIdentifier(channel, identifier);
  if ((channel === "email" && !z.string().email().safeParse(normalized).success) || (channel === "phone" && normalized.length < 7)) {
    res.status(400).json({ error: channel === "email" ? "Ingresa un correo válido." : "Ingresa un número de celular válido." });
    return;
  }

  const activeEmployees = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.tenantId, tenant.id), eq(employeesTable.status, "active")));
  const employee = activeEmployees.find((candidate) => {
    if (channel === "email") {
      return [candidate.email, candidate.clerkEmail]
        .some((value) => value?.trim().toLowerCase() === normalized);
    }
    return candidate.phone ? normalizeClockIdentifier("phone", candidate.phone) === normalized : false;
  });

  if (employee) {
    const attendanceSession = await findAttendanceSession(req, tenant.id, employee.id);
    if (attendanceSession) {
      const marked = await markWithAttendanceSession(attendanceSession.id, tenant.id, employee.id, qrToken);
      if (!marked.ok) {
        if (marked.status === 401) clearAttendanceSessionCookie(res);
        res.status(marked.status).json({ error: marked.error });
        return;
      }
      purgeExpiredQrTokens();
      res.json({
        mode: "marked",
        channel,
        message: marked.action === "clock_in" ? "Entrada registrada." : "Salida registrada.",
        result: publicClockMarkResponse(marked),
      });
      return;
    }
  }

  if (channel === "email" && !process.env.RESEND_API_KEY) {
    res.status(503).json({ error: "La verificación por correo aún no está configurada.", code: "EMAIL_CHANNEL_UNAVAILABLE" });
    return;
  }
  if (channel === "phone" && !publicClockPhoneConfigured()) {
    res.status(503).json({ error: "La verificación por celular aún no está configurada.", code: "PHONE_CHANNEL_UNAVAILABLE" });
    return;
  }

  const identifierHash = publicClockHash(`${tenant.id}:${channel}:${normalized}`);
  const [{ count: recentCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendanceVerificationChallengesTable)
    .where(and(
      eq(attendanceVerificationChallengesTable.identifierHash, identifierHash),
      gte(attendanceVerificationChallengesTable.createdAt, new Date(Date.now() - 10 * 60_000)),
    ));
  if (recentCount >= PUBLIC_CLOCK_MAX_REQUESTS_PER_IDENTIFIER) {
    res.status(429).json({ error: "Solicitaste varios códigos. Espera unos minutos antes de intentar de nuevo." });
    return;
  }

  const challengeId = crypto.randomUUID();
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + PUBLIC_CLOCK_CODE_TTL_MS);
  await db.insert(attendanceVerificationChallengesTable).values({
    id: challengeId,
    tenantId: tenant.id,
    employeeId: employee?.id ?? null,
    channel,
    identifierHash,
    deviceHash: publicClockHash(deviceToken),
    qrTokenHash: publicClockHash(qrToken),
    codeHash: publicClockCodeHash(secret, challengeId, code),
    expiresAt,
  });

  if (employee) {
    const delivery = channel === "email"
      ? sendPublicClockEmail(normalized, code, tenant.name)
      : sendPublicClockPhone(normalized, code, tenant.name);
    void delivery.catch((err: unknown) => {
      req.log.error({ err, tenantId: tenant.id, channel, challengeId }, "Public clock OTP delivery failed");
    });
  }

  res.status(202).json({
    mode: "otp",
    challengeId,
    expiresAt: expiresAt.toISOString(),
    channel,
    message: `Si el ${channel === "email" ? "correo" : "celular"} coincide con un empleado activo, recibirás un código de 6 dígitos.`,
  });
  */
});

router.post("/clock/public/challenges/:id/verify", async (req, res): Promise<void> => {
  res.status(410).json({ error: "La verificación OTP fue retirada.", code: "LEGACY_ATTENDANCE_FLOW_RETIRED" });
  return;
  /*
  await publicClockChallengesReady;
  const parsed = VerifyPublicClockChallengeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Código inválido o vencido." });
    return;
  }
  const challengeId = String(req.params.id);
  const verificationToken = crypto.randomBytes(32).toString("base64url");

  type VerifyResult =
    | {
        ok: true;
        tenantId: number;
        employee: Employee;
        action: "clock_in" | "clock_out";
        openEntryClockIn?: string;
      }
    | { ok: false };
  const result: VerifyResult = await db.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(attendanceVerificationChallengesTable)
      .where(eq(attendanceVerificationChallengesTable.id, challengeId))
      .for("update")
      .limit(1);
    if (
      !challenge ||
      challenge.usedAt ||
      challenge.verifiedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= PUBLIC_CLOCK_MAX_ATTEMPTS ||
      challenge.deviceHash !== publicClockHash(parsed.data.deviceToken)
    ) return { ok: false };

    const secret = await getOrCreateClockSecret(challenge.tenantId);
    const suppliedHash = publicClockCodeHash(secret, challengeId, parsed.data.code);
    const codeMatches = publicClockHashMatches(suppliedHash, challenge.codeHash);
    await tx
      .update(attendanceVerificationChallengesTable)
      .set({
        attempts: challenge.attempts + 1,
        ...(codeMatches && challenge.employeeId
          ? { verifiedAt: new Date(), proofTokenHash: publicClockHash(verificationToken) }
          : {}),
      })
      .where(eq(attendanceVerificationChallengesTable.id, challengeId));
    if (!codeMatches || !challenge.employeeId) return { ok: false };

    const [employee] = await tx
      .select()
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, challenge.employeeId),
        eq(employeesTable.tenantId, challenge.tenantId),
        eq(employeesTable.status, "active"),
      ))
      .limit(1);
    if (!employee) return { ok: false };

    const today = new Date().toISOString().split("T")[0];
    const [openEntry] = await tx
      .select()
      .from(timeEntriesTable)
      .where(and(
        eq(timeEntriesTable.employeeId, employee.id),
        eq(timeEntriesTable.workDate, today),
        isNull(timeEntriesTable.clockOut),
      ))
      .limit(1);
    return {
      ok: true,
      tenantId: challenge.tenantId,
      employee,
      action: openEntry ? "clock_out" : "clock_in",
      ...(openEntry ? { openEntryClockIn: openEntry.clockIn.toISOString() } : {}),
    };
  });

  if (!result.ok) {
    res.status(400).json({ error: "Código inválido o vencido." });
    return;
  }
  await issueAttendanceSession(req, res, result.tenantId, result.employee.id);
  res.json({
    verificationToken,
    employeeName: result.employee.name,
    employeeRole: result.employee.role,
    action: result.action,
    ...(result.openEntryClockIn ? { openEntryClockIn: result.openEntryClockIn } : {}),
  });
  */
});

router.post("/clock/public/challenges/:id/mark", async (req, res): Promise<void> => {
  res.status(410).json({ error: "La verificación OTP fue retirada.", code: "LEGACY_ATTENDANCE_FLOW_RETIRED" });
  return;
  /*
  await publicClockChallengesReady;
  const parsed = MarkPublicClockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Verificación inválida." });
    return;
  }
  const challengeId = String(req.params.id);

  type MarkResult =
    | { ok: true; action: "clock_in" | "clock_out"; employee: Employee; workDate: string; occurredAt: Date; hoursWorked?: number }
    | { ok: false; status: number; error: string };
  const result: MarkResult = await db.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(attendanceVerificationChallengesTable)
      .where(eq(attendanceVerificationChallengesTable.id, challengeId))
      .for("update")
      .limit(1);
    if (
      !challenge ||
      challenge.usedAt ||
      !challenge.verifiedAt ||
      !challenge.employeeId ||
      !challenge.proofTokenHash ||
      challenge.expiresAt <= new Date() ||
      challenge.deviceHash !== publicClockHash(parsed.data.deviceToken) ||
      challenge.qrTokenHash !== publicClockHash(parsed.data.qrToken) ||
      !publicClockHashMatches(publicClockHash(parsed.data.verificationToken), challenge.proofTokenHash)
    ) {
      return { ok: false, status: 410, error: "La verificación venció o ya fue utilizada." };
    }

    await tx.execute(sql`SELECT pg_advisory_xact_lock(${challenge.employeeId})`);
    const [employee] = await tx
      .select()
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, challenge.employeeId),
        eq(employeesTable.tenantId, challenge.tenantId),
        eq(employeesTable.status, "active"),
      ))
      .limit(1);
    if (!employee) return { ok: false, status: 410, error: "La verificación ya no es válida." };

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const [latestEntry] = await tx
      .select({ clockIn: timeEntriesTable.clockIn, clockOut: timeEntriesTable.clockOut })
      .from(timeEntriesTable)
      .where(and(
        eq(timeEntriesTable.employeeId, employee.id),
        eq(timeEntriesTable.workDate, today),
      ))
      .orderBy(desc(timeEntriesTable.clockIn))
      .limit(1);
    const latestEventAt = latestEntry?.clockOut ?? latestEntry?.clockIn;
    if (latestEventAt && now.getTime() - latestEventAt.getTime() < PUBLIC_CLOCK_DUPLICATE_WINDOW_MS) {
      return { ok: false, status: 409, error: "La marcación ya fue registrada. Evita escanear dos veces seguidas." };
    }
    const [openEntry] = await tx
      .select()
      .from(timeEntriesTable)
      .where(and(
        eq(timeEntriesTable.employeeId, employee.id),
        eq(timeEntriesTable.workDate, today),
        isNull(timeEntriesTable.clockOut),
      ))
      .for("update")
      .limit(1);
    const claimed = await tx
      .insert(usedQrTokensTable)
      .values({ tokenHash: publicQrClaimKey(challenge.tenantId, parsed.data.qrToken), tenantId: challenge.tenantId })
      .onConflictDoNothing()
      .returning({ id: usedQrTokensTable.id });
    if (claimed.length === 0) {
      return { ok: false, status: 409, error: "Código QR ya utilizado. Espera al siguiente código." };
    }

    let action: "clock_in" | "clock_out";
    let hoursWorked: number | undefined;
    if (openEntry) {
      action = "clock_out";
      hoursWorked = Math.round(((now.getTime() - openEntry.clockIn.getTime()) / 3_600_000) * 100) / 100;
      await tx
        .update(timeEntriesTable)
        .set({ clockOut: now, hoursWorked })
        .where(eq(timeEntriesTable.id, openEntry.id));
    } else {
      action = "clock_in";
      await tx.insert(timeEntriesTable).values({
        employeeId: employee.id,
        tenantId: challenge.tenantId,
        workDate: today,
        clockIn: now,
      });
    }
    await tx
      .update(attendanceVerificationChallengesTable)
      .set({ usedAt: now })
      .where(eq(attendanceVerificationChallengesTable.id, challengeId));
    return { ok: true, action, employee, workDate: today, occurredAt: now, ...(hoursWorked !== undefined ? { hoursWorked } : {}) };
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  purgeExpiredQrTokens();
  res.json({
    action: result.action,
    employeeName: result.employee.name,
    employeeRole: result.employee.role,
    workDate: result.workDate,
    occurredAt: result.occurredAt.toISOString(),
    ...(result.hoursWorked !== undefined ? { hoursWorked: result.hoursWorked } : {}),
  });
  */
});

// ── Clock endpoints ───────────────────────────────────────────────────────────

/** Borra tokens QR con más de 5 minutos de antigüedad (fire-and-forget). */
function purgeExpiredQrTokens(): void {
  db.delete(usedQrTokensTable)
    .where(lt(usedQrTokensTable.usedAt, sql`now() - interval '5 minutes'`))
    .catch((err: unknown) => {
      logger.warn({ err }, "purgeExpiredQrTokens failed");
    });
}

router.post("/clock/in", requireRole(["admin", "manager"]), async (req, res) => {
  const {
    employeeId,
    notes,
    qrToken,
  } = req.body as {
    employeeId: number;
    notes?: string;
    qrToken?: string;
  };
  if (!employeeId) {
    res.status(400).json({ error: "employeeId required" });
    return;
  }
  if (!(await assertEmployeeTenant(employeeId, req.tenantId, res))) return;

  // QR token is mandatory — employees must scan the physical kiosk QR to clock in
  if (!qrToken) {
    res.status(400).json({ error: "Se requiere escanear el código QR del quiosco para marcar asistencia." });
    return;
  }

  // Validate QR expiry before touching the DB (cheap check, no writes)
  const secret = await getOrCreateClockSecret(req.tenantId);
  if (!isValidQrToken(secret, qrToken)) {
    res.status(410).json({ error: "QR expirado. Escanea el código actualizado." });
    return;
  }

  // Wrap token claim + clock-in in a single transaction so that any failure
  // (already clocked in, DB error, etc.) rolls back the token INSERT and the
  // token is not consumed without a successful clock mark.
  type ClockInResult =
    | {
        ok: true;
        entry: typeof timeEntriesTable.$inferSelect;
        emp: typeof employeesTable.$inferSelect;
      }
    | { ok: false; status: number; body: Record<string, unknown> };

  const result: ClockInResult = await db.transaction(async (tx) => {
    // 1. Atomically claim QR token inside the transaction
    if (qrToken) {
      const inserted = await tx
        .insert(usedQrTokensTable)
        .values({ tokenHash: publicQrClaimKey(req.tenantId ?? 0, qrToken), tenantId: req.tenantId ?? null })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) {
        return {
          ok: false,
          status: 409,
          body: { error: "QR ya utilizado. Espera al siguiente código." },
        };
      }
    }

    // 2. Check if already clocked in today
    const today = new Date().toISOString().split("T")[0];
    const existingEntries = await tx
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.employeeId, employeeId),
          eq(timeEntriesTable.workDate, today),
          isNull(timeEntriesTable.clockOut),
        ),
      );
    if (existingEntries.length > 0) {
      return {
        ok: false,
        status: 409,
        body: {
          error: "Employee already clocked in",
          entry: timeEntryResponse(existingEntries[0]),
        },
      };
    }

    // 3. Create the clock-in entry
    const now = new Date();
    const [entry] = await tx
      .insert(timeEntriesTable)
      .values({
        employeeId,
        workDate: today,
        clockIn: now,
        notes: notes ?? null,
        tenantId: req.tenantId ?? null,
      })
      .returning();

    const [emp] = await tx
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, employeeId));

    return { ok: true, entry, emp };
  });

  if (!result.ok) {
    res.status(result.status).json(result.body);
    return;
  }
  res.status(201).json(timeEntryResponse(result.entry, result.emp));
  purgeExpiredQrTokens();
});

router.post("/clock/out/:id", requireRole(["admin", "manager"]), async (req, res) => {
  const id = Number(req.params.id);
  const { notes, qrToken } = (req.body ?? {}) as {
    notes?: string;
    qrToken?: string;
  };

  // Verify the time entry exists and belongs to this tenant before entering tx
  const existing = await assertTimeEntryTenant(id, req.tenantId, res);
  if (!existing) return;
  if (existing.clockOut) {
    res.status(409).json({ error: "Already clocked out" });
    return;
  }

  // QR token is mandatory — employees must scan the physical kiosk QR to clock out
  if (!qrToken) {
    res.status(400).json({ error: "Se requiere escanear el código QR del quiosco para marcar salida." });
    return;
  }

  // Validate QR expiry before touching the DB (cheap check, no writes)
  const outSecret = await getOrCreateClockSecret(req.tenantId);
  if (!isValidQrToken(outSecret, qrToken)) {
    res.status(410).json({ error: "QR expirado. Escanea el código actualizado." });
    return;
  }

  // Wrap token claim + clock-out update in a single transaction so that any
  // failure rolls back the token INSERT — token is never consumed without a
  // successful clock-out mark.
  type ClockOutResult =
    | {
        ok: true;
        entry: typeof timeEntriesTable.$inferSelect;
        emp: typeof employeesTable.$inferSelect;
      }
    | { ok: false; status: number; body: Record<string, unknown> };

  const result: ClockOutResult = await db.transaction(async (tx) => {
    // 1. Atomically claim QR token inside the transaction
    if (qrToken) {
      const inserted = await tx
        .insert(usedQrTokensTable)
        .values({ tokenHash: publicQrClaimKey(req.tenantId ?? 0, qrToken), tenantId: req.tenantId ?? null })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) {
        return {
          ok: false,
          status: 409,
          body: { error: "QR ya utilizado. Espera al siguiente código." },
        };
      }
    }

    // 2. Perform the clock-out update
    const now = new Date();
    const diffMs = now.getTime() - existing.clockIn.getTime();
    const hoursWorked = Math.round((diffMs / 1000 / 3600) * 100) / 100;

    const [entry] = await tx
      .update(timeEntriesTable)
      .set({ clockOut: now, hoursWorked, notes: notes ?? existing.notes })
      .where(eq(timeEntriesTable.id, id))
      .returning();

    const [emp] = await tx
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, entry.employeeId));

    return { ok: true, entry, emp };
  });

  if (!result.ok) {
    res.status(result.status).json(result.body);
    return;
  }
  res.json(timeEntryResponse(result.entry, result.emp));
  purgeExpiredQrTokens();
});

router.put("/clock/entries/:id", requireRole(["admin", "manager"]), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateTimeEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (!(await assertTimeEntryTenant(id, req.tenantId, res))) return;

  // Recalculate hours if both times present
  const data = { ...parsed.data } as Record<string, unknown>;
  if (data.clockIn && data.clockOut) {
    const inTime = new Date(data.clockIn as string);
    const outTime = new Date(data.clockOut as string);
    data.hoursWorked =
      Math.round(((outTime.getTime() - inTime.getTime()) / 1000 / 3600) * 100) /
      100;
  }

  const [entry] = await db
    .update(timeEntriesTable)
    .set(data)
    .where(eq(timeEntriesTable.id, id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  const [emp] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, entry.employeeId));
  res.json(timeEntryResponse(entry, emp));
});

router.delete("/clock/entries/:id", requireRole(["admin", "manager"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await assertTimeEntryTenant(id, req.tenantId, res))) return;
  const [entry] = await db
    .delete(timeEntriesTable)
    .where(eq(timeEntriesTable.id, id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.status(204).send();
});

// ── App Settings ──────────────────────────────────────────────────────────────

router.get("/settings", async (req, res) => {
  const tid = req.tenantId;
  const prefix = tid !== undefined ? `t${tid}__` : null;
  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(
      prefix !== null
        ? sql`${appSettingsTable.key} NOT LIKE '%__%' OR ${appSettingsTable.key} LIKE ${prefix + "%"}`
        : sql`${appSettingsTable.key} NOT LIKE '%__%'`,
    );
  const out: Record<string, unknown> = {};
  // First: load global (non-prefixed) defaults
  for (const r of rows) {
    if (!r.key.includes("__")) {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        out[r.key] = r.value;
      }
    }
  }
  // Second: overlay tenant-specific values (strip prefix)
  if (tid !== undefined) {
    const prefix = `t${tid}__`;
    for (const r of rows) {
      if (r.key.startsWith(prefix)) {
        const bareKey = r.key.slice(prefix.length);
        try {
          out[bareKey] = JSON.parse(r.value);
        } catch {
          out[bareKey] = r.value;
        }
      }
    }
  }
  // Expose active sales warehouse ID for the tenant
  if (tid !== undefined) {
    const salesWhId = await getSalesWarehouseId(tid);
    out.salesWarehouseId = salesWhId ?? null;
  }
  res.json(out);
});

router.patch("/settings", async (req, res) => {
  const tid = req.tenantId;
  const body = req.body as Record<string, unknown>;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "body must be an object" });
    return;
  }
  const restrictedAvailabilityKeys = [
    "delivery_free_days",
    "service_closed_days",
    "service_closed_dates",
  ];
  const restrictedAdminKeys = [
    ...restrictedAvailabilityKeys,
    "cash_shortfall_review_enabled",
    "printers",
  ];
  if (
    restrictedAdminKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(body, key),
    ) &&
    !req.isSuperAdmin &&
    !["admin", "manager"].includes(req.employeeRole ?? "")
  ) {
    res.status(403).json({
      error: "Solo administradores y gerentes pueden cambiar esta configuración",
      code: "FORBIDDEN_ROLE",
    });
    return;
  }
  if (Object.prototype.hasOwnProperty.call(body, "printers")) {
    const printersResult = z.array(z.object({
      id: z.string().min(1).max(100),
      name: z.string().min(1).max(120),
      type: z.enum(["usb", "network", "bluetooth"]),
      ip: z.string().max(45).optional(),
      port: z.number().int().optional(),
      zone: z.enum(["receipt", "kitchen", "kitchen:bar", "kitchen:grill", "kitchen:cold", "kitchen:dessert", "inventory", "runner"]),
      paperWidth: z.enum(["58mm", "80mm"]).optional(),
      fontSize: z.enum(["small", "normal", "large"]).optional(),
      lineSpacing: z.enum(["tight", "normal", "relaxed"]).optional(),
      marginMm: z.number().min(0).max(12).optional(),
      density: z.enum(["light", "normal", "dark"]).optional(),
      autoCut: z.boolean().optional(),
      agentId: z.number().int().positive().optional(),
      deviceId: z.string().min(1).max(500).optional(),
      deviceName: z.string().min(1).max(500).optional(),
    })).max(50).safeParse(body.printers);
    if (!printersResult.success) {
      const firstIssue = printersResult.error.issues[0];
      const field = firstIssue?.path.length ? ` (${firstIssue.path.join(".")})` : "";
      res.status(400).json({
        error: `Configuración de impresoras inválida${field}`,
        detail: firstIssue?.message,
      });
      return;
    }
    for (const printer of printersResult.data) {
      if (printer.type === "network") {
        const error = validatePrinterDestination(printer.ip ?? "", printer.port ?? 9100);
        if (error) {
          res.status(400).json({ error });
          return;
        }
      }
    }
    body.printers = printersResult.data;
  }
  for (const key of ["receipt_header", "receipt_footer", "inventory_header", "inventory_footer"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      if (typeof body[key] !== "string" || body[key].length > 1000) {
        res.status(400).json({ error: `${key} debe ser texto de máximo 1000 caracteres` });
        return;
      }
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "cash_shortfall_review_enabled") &&
    typeof body.cash_shortfall_review_enabled !== "boolean"
  ) {
    res.status(400).json({ error: "cash_shortfall_review_enabled debe ser booleano" });
    return;
  }
  if (Object.prototype.hasOwnProperty.call(body, "regular_daily_hours")) {
    const v = Number(body.regular_daily_hours);
    if (!Number.isFinite(v) || v < 1 || v > 24) {
      res
        .status(400)
        .json({ error: "regular_daily_hours debe ser un número entre 1 y 24" });
      return;
    }
    body.regular_daily_hours = v;
  }
  for (const key of ["delivery_free_days", "service_closed_days"] as const) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const days = body[key];
    if (
      !Array.isArray(days) ||
      days.some((day) => !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6)
    ) {
      res.status(400).json({ error: `${key} debe contener únicamente días entre 0 y 6` });
      return;
    }
    body[key] = Array.from(new Set(days.map(Number))).sort();
  }
  if (Object.prototype.hasOwnProperty.call(body, "service_closed_dates")) {
    const parsed = z
      .array(
        z.object({
          date: z.string().refine(isValidIsoDate, "Fecha no válida"),
          message: z.string().trim().max(300).optional(),
        }),
      )
      .max(366)
      .safeParse(body.service_closed_dates);
    if (!parsed.success) {
      res.status(400).json({
        error: "service_closed_dates contiene fechas o mensajes no válidos",
      });
      return;
    }
    body.service_closed_dates = Array.from(
      new Map(parsed.data.map((closure) => [closure.date, closure])).values(),
    ).sort((a, b) => a.date.localeCompare(b.date));
  }
  const pairs = Object.entries(body).map(([k, v]) => ({
    key: tid !== undefined ? `t${tid}__${k}` : k,
    value: JSON.stringify(v),
  }));
  if (pairs.length === 0) {
    res.json({});
    return;
  }
  await db.transaction(async (tx) => {
    if (
      tid !== undefined &&
      restrictedAvailabilityKeys.some((key) =>
        Object.prototype.hasOwnProperty.call(body, key),
      )
    ) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(543, ${tid})`);
    }
    await tx
      .insert(appSettingsTable)
      .values(pairs)
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value: sql`excluded.value` },
      });
  });
  const out: Record<string, unknown> = {};
  for (const { key, value } of pairs) {
    const bareKey = tid !== undefined ? key.replace(`t${tid}__`, "") : key;
    try {
      out[bareKey] = JSON.parse(value);
    } catch {
      out[bareKey] = value;
    }
  }
  res.json(out);
});

router.get("/settings/:key", async (req, res) => {
  const { key } = req.params;
  const raw = await readSetting(req.tenantId, key);
  if (raw === null) {
    res.status(404).json({ error: "Setting not found" });
    return;
  }
  try {
    const value = JSON.parse(raw);
    if (key === "role_permissions") {
      const { isCurrentSchema } =
        await loadRolePermissionsConfig(req.tenantId);
      res.json({
        key,
        value,
        schemaVersion: isCurrentSchema
          ? ROLE_PERMISSIONS_SCHEMA_VERSION
          : null,
      });
      return;
    }
    res.json({ key, value });
  } catch {
    res.json({ key, value: raw });
  }
});

router.put("/settings/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body as { value: unknown };
  if (value === undefined) {
    res.status(400).json({ error: "value is required" });
    return;
  }
  if (
    key === "role_permissions" ||
    key === ROLE_PERMISSIONS_VERSION_KEY
  ) {
    if (
      !req.isSuperAdmin &&
      !["admin", "manager"].includes(req.employeeRole ?? "")
    ) {
      res.status(403).json({
        error: "Solo administradores y gerentes pueden cambiar permisos",
        code: "FORBIDDEN_ROLE",
      });
      return;
    }
    if (key === ROLE_PERMISSIONS_VERSION_KEY) {
      res.status(400).json({
        error: "La versión se actualiza junto con el mapa de permisos",
      });
      return;
    } else {
      const allowedRoles = new Set([
        "admin",
        "manager",
        "cashier",
        "waiter",
        "cook",
        "delivery",
      ]);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        res.status(400).json({ error: "Mapa de permisos no válido" });
        return;
      }
      for (const [role, permissions] of Object.entries(value)) {
        if (
          !allowedRoles.has(role) ||
          !Array.isArray(permissions) ||
          permissions.some(
            (permission) =>
              typeof permission !== "string" ||
              !VALID_PERMISSION_KEYS.has(permission),
          )
        ) {
          res.status(400).json({
            error: "Mapa de permisos no válido",
            role,
          });
          return;
        }
      }
    }
  }
  if (key === "cash_shortfall_review_enabled") {
    if (
      !req.isSuperAdmin &&
      !["admin", "manager"].includes(req.employeeRole ?? "")
    ) {
      res.status(403).json({
        error: "Solo administradores y gerentes pueden cambiar esta configuración",
        code: "FORBIDDEN_ROLE",
      });
      return;
    }
    if (typeof value !== "boolean") {
      res.status(400).json({ error: "cash_shortfall_review_enabled debe ser booleano" });
      return;
    }
  }
  if (key === "role_permissions") {
    const actualPermissionsKey = req.tenantId !== undefined
      ? `t${req.tenantId}__role_permissions`
      : "role_permissions";
    const actualVersionKey = req.tenantId !== undefined
      ? `t${req.tenantId}__${ROLE_PERMISSIONS_VERSION_KEY}`
      : ROLE_PERMISSIONS_VERSION_KEY;
    await db.transaction(async (tx) => {
      await tx
        .insert(appSettingsTable)
        .values({
          key: actualPermissionsKey,
          value: JSON.stringify(value),
        })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: { value: sql`excluded.value` },
        });
      await tx
        .insert(appSettingsTable)
        .values({
          key: actualVersionKey,
          value: JSON.stringify(ROLE_PERMISSIONS_SCHEMA_VERSION),
        })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: { value: sql`excluded.value` },
        });
    });
    res.json({
      key,
      value,
      schemaVersion: ROLE_PERMISSIONS_SCHEMA_VERSION,
    });
    return;
  }
  const serialized = JSON.stringify(value);
  await writeSetting(req.tenantId, key, serialized);
  res.json({ key, value });
});

// ── Warehouses ─────────────────────────────────────────────────────────────────

router.get("/warehouses", async (req, res) => {
  const tid = req.tenantId;
  const rows = await db
    .select()
    .from(warehousesTable)
    .where(tid ? eq(warehousesTable.tenantId, tid) : undefined)
    .orderBy(asc(warehousesTable.id));
  res.json(rows);
});

router.post("/warehouses", async (req, res) => {
  const parsed = insertWarehouseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(warehousesTable)
    .values({ ...parsed.data, tenantId: req.tenantId })
    .returning();
  res.status(201).json(created);
});

router.patch("/warehouses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const parsed = updateWarehouseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(warehousesTable)
    .set(parsed.data)
    .where(
      and(
        eq(warehousesTable.id, id),
        tid ? eq(warehousesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Bodega no encontrada" });
    return;
  }
  res.json(updated);
});

router.post(
  "/warehouses/:id/set-sales-warehouse",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const tid = req.tenantId;
    try {
      const updated = await db.transaction(async (tx) => {
        const tidCond = tid ? eq(warehousesTable.tenantId, tid) : undefined;
        // Desactivar todas las bodegas de ventas del tenant y resetear su tipo a "storage"
        await tx
          .update(warehousesTable)
          .set({ isSalesWarehouse: false, type: "storage" })
          .where(tidCond);
        // Activar la bodega seleccionada como bodega de ventas y marcar su tipo como "sales"
        const [row] = await tx
          .update(warehousesTable)
          .set({ isSalesWarehouse: true, type: "sales" })
          .where(and(eq(warehousesTable.id, id), tidCond))
          .returning();
        if (!row) throw new Error("NOT_FOUND");
        return row;
      });
      res.json(updated);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        res.status(404).json({ error: "Bodega no encontrada" });
      } else {
        throw e;
      }
    }
  },
);

router.delete("/warehouses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  // Verificar propiedad ANTES de borrar cualquier dato relacionado
  const [owned] = await db
    .select({ id: warehousesTable.id })
    .from(warehousesTable)
    .where(
      and(
        eq(warehousesTable.id, id),
        tid ? eq(warehousesTable.tenantId, tid) : undefined,
      ),
    );
  if (!owned) {
    res.status(404).json({ error: "Bodega no encontrada" });
    return;
  }
  const movements = await db
    .select({ id: inventoryMovementsTable.id })
    .from(inventoryMovementsTable)
    .where(
      sql`${inventoryMovementsTable.fromWarehouseId} = ${id} OR ${inventoryMovementsTable.toWarehouseId} = ${id}`,
    )
    .limit(1);
  if (movements.length > 0) {
    res.status(409).json({
      error: "No se puede eliminar: la bodega tiene movimientos registrados.",
    });
    return;
  }
  await db
    .delete(warehouseStockTable)
    .where(eq(warehouseStockTable.warehouseId, id));
  const [deleted] = await db
    .delete(warehousesTable)
    .where(
      and(
        eq(warehousesTable.id, id),
        tid ? eq(warehousesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Bodega no encontrada" });
    return;
  }
  res.json(deleted);
});

// ── Inventory Stock per Warehouse ──────────────────────────────────────────────

router.get("/inventory/stock", async (req, res) => {
  const tid = req.tenantId;
  const stocks = await db
    .select({
      warehouseId: warehouseStockTable.warehouseId,
      warehouseName: warehousesTable.name,
      productId: warehouseStockTable.productId,
      productName: productsTable.name,
      productSku: productsTable.sku,
      qty: warehouseStockTable.qty,
    })
    .from(warehouseStockTable)
    .innerJoin(
      warehousesTable,
      eq(warehouseStockTable.warehouseId, warehousesTable.id),
    )
    .innerJoin(
      productsTable,
      eq(warehouseStockTable.productId, productsTable.id),
    )
    .where(
      and(
        tid ? eq(warehousesTable.tenantId, tid) : undefined,
        eq(warehousesTable.isActive, true),
      ),
    )
    .orderBy(asc(warehouseStockTable.warehouseId), asc(productsTable.name));
  res.json(stocks);
});

// ── Inventory Movements ────────────────────────────────────────────────────────

router.get("/inventory/movements", async (req, res) => {
  const tid = req.tenantId;
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const rows = await db
    .select({
      id: inventoryMovementsTable.id,
      type: inventoryMovementsTable.type,
      quantity: inventoryMovementsTable.quantity,
      cost: inventoryMovementsTable.cost,
      taxPercent: inventoryMovementsTable.taxPercent,
      reason: inventoryMovementsTable.reason,
      notes: inventoryMovementsTable.notes,
      createdAt: inventoryMovementsTable.createdAt,
      productId: inventoryMovementsTable.productId,
      productName: productsTable.name,
      productSku: productsTable.sku,
      fromWarehouseId: inventoryMovementsTable.fromWarehouseId,
      toWarehouseId: inventoryMovementsTable.toWarehouseId,
      hasInvoicePhoto: sql<boolean>`(${inventoryMovementsTable.invoicePhotoUrl} IS NOT NULL)`,
    })
    .from(inventoryMovementsTable)
    .innerJoin(
      productsTable,
      eq(inventoryMovementsTable.productId, productsTable.id),
    )
    .where(tid ? eq(productsTable.tenantId, tid) : undefined)
    .orderBy(desc(inventoryMovementsTable.createdAt))
    .limit(limit);

  // Attach warehouse names
  const warehouseIds = [
    ...new Set(
      rows.flatMap(
        (r) => [r.fromWarehouseId, r.toWarehouseId].filter(Boolean) as number[],
      ),
    ),
  ];
  const warehouses =
    warehouseIds.length > 0
      ? await db
          .select()
          .from(warehousesTable)
          .where(inArray(warehousesTable.id, warehouseIds))
      : [];
  const warehouseMap = Object.fromEntries(
    warehouses.map((w) => [w.id, w.name]),
  );

  res.json(
    rows.map((r) => ({
      ...r,
      fromWarehouseName: r.fromWarehouseId
        ? (warehouseMap[r.fromWarehouseId] ?? null)
        : null,
      toWarehouseName: r.toWarehouseId
        ? (warehouseMap[r.toWarehouseId] ?? null)
        : null,
      hasInvoicePhoto: r.hasInvoicePhoto,
    })),
  );
});

// GET invoice photo for a specific movement
router.get("/inventory/movements/:id/invoice", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [row] = await db
    .select({
      invoicePhotoUrl: inventoryMovementsTable.invoicePhotoUrl,
      productTenantId: productsTable.tenantId,
    })
    .from(inventoryMovementsTable)
    .innerJoin(
      productsTable,
      eq(inventoryMovementsTable.productId, productsTable.id),
    )
    .where(
      and(
        eq(inventoryMovementsTable.id, id),
        tid !== undefined ? eq(productsTable.tenantId, tid) : undefined
      )
    );
  if (!row || !row.invoicePhotoUrl) {
    res.status(404).json({ error: "No hay foto de factura" });
    return;
  }
  if (tid !== undefined && row.productTenantId !== tid) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }
  res.json({ invoicePhotoUrl: row.invoicePhotoUrl });
});

// ── Batch movements (multiple items in one transaction) ───────────────────────
router.post("/inventory/movements/batch", async (req, res) => {
  const {
    type,
    fromWarehouseId,
    toWarehouseId,
    reason,
    notes,
    invoicePhotoUrl,
    expensePaymentMethod,
    createdBy,
    items,
  } = req.body as {
    type: "entrada" | "salida" | "traslado";
    fromWarehouseId?: number;
    toWarehouseId?: number;
    reason?: string;
    notes?: string;
    invoicePhotoUrl?: string;
    expensePaymentMethod?: "cash" | "card" | "transfer" | null;
    createdBy?: string | null;
    items: Array<{
      productId: number;
      quantity: number;
      cost?: number;
      taxPercent?: number;
      pieceWeightsGrams?: number[];
      pieceCodes?: string[];
    }>;
  };

  if (!["entrada", "salida", "traslado"].includes(type)) {
    res.status(400).json({ error: "Tipo inválido." });
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Se requiere al menos un ítem." });
    return;
  }
  if (items.length > 500) {
    res.status(400).json({ error: "Máximo 500 ítems por movimiento." });
    return;
  }
  if (type === "entrada" && !toWarehouseId) {
    res
      .status(400)
      .json({ error: "Se requiere bodega destino para una entrada." });
    return;
  }
  if (type === "salida" && !fromWarehouseId) {
    res
      .status(400)
      .json({ error: "Se requiere bodega origen para una salida." });
    return;
  }
  if (type === "traslado" && (!fromWarehouseId || !toWarehouseId)) {
    res.status(400).json({
      error: "Se requieren bodega origen y destino para un traslado.",
    });
    return;
  }
  for (const item of items) {
    if (!item.productId || typeof item.productId !== "number") {
      res.status(400).json({ error: "Cada ítem debe tener productId válido." });
      return;
    }
    if (!item.quantity || item.quantity <= 0) {
      res
        .status(400)
        .json({ error: "La cantidad debe ser mayor a cero en cada ítem." });
      return;
    }
  }

  try {
    const movements = await db.transaction(async (tx) => {
      // Atomic upsert: a single INSERT … ON CONFLICT avoids the SELECT→write race
      // condition where two concurrent transactions both read the same qty and
      // then overwrite each other. PostgreSQL row-locks the conflict target
      // before executing the DO UPDATE, serialising concurrent writes correctly.
      const upsertStock = async (
        warehouseId: number,
        productId: number,
        delta: number,
      ) => {
        const rows = await tx.execute(sql`
          INSERT INTO warehouse_stock (warehouse_id, product_id, qty)
          VALUES (${warehouseId}, ${productId}, ${delta})
          ON CONFLICT (warehouse_id, product_id) DO UPDATE
            SET qty = warehouse_stock.qty + EXCLUDED.qty
          RETURNING qty
        `);
        const newQty = (rows.rows[0] as { qty: number }).qty;
        if (newQty < 0)
          throw new Error("Stock insuficiente en la bodega seleccionada.");
      };

      const results = [];
      const batchTid = req.tenantId;
      for (const item of items) {
        const { productId, quantity, cost, taxPercent, pieceWeightsGrams, pieceCodes } = item;
        const [product] = await tx
          .select()
          .from(productsTable)
          .where(
            and(
              eq(productsTable.id, productId),
              batchTid !== undefined
                ? eq(productsTable.tenantId, batchTid)
                : undefined,
            ),
          );
        if (!product) throw new Error(`Producto ${productId} no encontrado.`);
        if (pieceWeightsGrams?.length) {
          if (type !== "entrada") throw new Error("Las piezas individuales se registran desde una entrada.");
          if (product.saleMode !== "individual_weight") throw new Error(`"${product.name}" no está configurado para venta por pieza pesada.`);
          if (pieceWeightsGrams.length !== quantity || pieceWeightsGrams.some(weight => !Number.isInteger(weight) || weight <= 0 || weight > 200000)) {
            throw new Error("Cada pieza debe tener un peso en gramos válido.");
          }
        }

        if (type === "entrada") {
          await upsertStock(toWarehouseId!, productId, quantity);
          await tx
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} + ${quantity}` })
            .where(eq(productsTable.id, productId));
          if (pieceWeightsGrams?.length) {
            await tx.insert(productPiecesTable).values(pieceWeightsGrams.map((weightGrams, pieceIndex) => ({
              productId, tenantId: batchTid!, warehouseId: toWarehouseId!,
              weightGrams, code: pieceCodes?.[pieceIndex] || null,
            })));
          }
        } else if (type === "salida") {
          if (product.stock < quantity)
            throw new Error(
              `Stock global insuficiente para "${product.name}".`,
            );
          await upsertStock(fromWarehouseId!, productId, -quantity);
          await tx
            .update(productsTable)
            .set({ stock: sql`${productsTable.stock} - ${quantity}` })
            .where(eq(productsTable.id, productId));
        } else if (type === "traslado") {
          await upsertStock(fromWarehouseId!, productId, -quantity);
          await upsertStock(toWarehouseId!, productId, quantity);
        }

        const payMethod = expensePaymentMethod ?? null;
        const [movement] = await tx
          .insert(inventoryMovementsTable)
          .values({
            type,
            productId,
            quantity,
            ...(cost != null ? { cost } : {}),
            ...(taxPercent != null ? { taxPercent } : {}),
            ...(payMethod ? { paymentMethod: payMethod } : {}),
            ...(fromWarehouseId ? { fromWarehouseId } : {}),
            ...(toWarehouseId ? { toWarehouseId } : {}),
            ...(reason ? { reason } : {}),
            ...(notes ? { notes } : {}),
            ...(invoicePhotoUrl ? { invoicePhotoUrl } : {}),
            ...(createdBy ? { createdBy } : {}),
          })
          .returning();
        results.push(movement);

        // Auto-register as expense in ledger when payment method is provided and cost > 0
        if (type === "entrada" && payMethod && cost && cost > 0) {
          const subtotal = cost * quantity;
          const taxAmt = subtotal * ((taxPercent ?? 0) / 100);
          await tx.insert(expensesTable).values({
            description: `Compra inventario: ${product.name} (×${quantity})`,
            category: "supplies",
            amount: subtotal + taxAmt,
            paymentMethod: payMethod,
            tenantId: batchTid,
          });
        }
      }
      return results;
    });
    res.status(201).json(movements);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al registrar movimientos";
    res.status(400).json({ error: msg });
  }
});

router.post("/inventory/movements", async (req, res) => {
  const { expensePaymentMethod } = req.body as {
    expensePaymentMethod?: "cash" | "card" | "transfer" | null;
  };

  const parsed = insertInventoryMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { type, productId, fromWarehouseId, toWarehouseId, quantity } =
    parsed.data;

  if (type === "entrada" && !toWarehouseId) {
    res
      .status(400)
      .json({ error: "Se requiere bodega destino para una entrada." });
    return;
  }
  if (type === "salida" && !fromWarehouseId) {
    res
      .status(400)
      .json({ error: "Se requiere bodega origen para una salida." });
    return;
  }
  if (type === "traslado" && (!fromWarehouseId || !toWarehouseId)) {
    res.status(400).json({
      error: "Se requieren bodega origen y destino para un traslado.",
    });
    return;
  }
  if (quantity <= 0) {
    res.status(400).json({ error: "La cantidad debe ser mayor a cero." });
    return;
  }

  await db
    .transaction(async (tx) => {
      // Validate product belongs to this tenant
      const singleTid = req.tenantId;
      const [product] = await tx
        .select()
        .from(productsTable)
        .where(
          and(
            eq(productsTable.id, productId),
            singleTid !== undefined
              ? eq(productsTable.tenantId, singleTid)
              : undefined,
          ),
        );
      if (!product) throw new Error("Producto no encontrado");

      // Atomic upsert: avoids SELECT→write race condition (see batch endpoint).
      const upsertStock = async (warehouseId: number, delta: number) => {
        const rows = await tx.execute(sql`
          INSERT INTO warehouse_stock (warehouse_id, product_id, qty)
          VALUES (${warehouseId}, ${productId}, ${delta})
          ON CONFLICT (warehouse_id, product_id) DO UPDATE
            SET qty = warehouse_stock.qty + EXCLUDED.qty
          RETURNING qty
        `);
        const newQty = (rows.rows[0] as { qty: number }).qty;
        if (newQty < 0)
          throw new Error("Stock insuficiente en la bodega seleccionada.");
      };

      if (type === "entrada") {
        await upsertStock(toWarehouseId!, quantity);
        await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} + ${quantity}` })
          .where(eq(productsTable.id, productId));
      } else if (type === "salida") {
        if (product.stock < quantity)
          throw new Error("Stock global insuficiente.");
        await upsertStock(fromWarehouseId!, -quantity);
        await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${quantity}` })
          .where(eq(productsTable.id, productId));
      } else if (type === "traslado") {
        await upsertStock(fromWarehouseId!, -quantity);
        await upsertStock(toWarehouseId!, quantity);
        // Global stock unchanged for transfers
      }

      const payMethod = expensePaymentMethod ?? null;
      const [movement] = await tx
        .insert(inventoryMovementsTable)
        .values({
          ...parsed.data,
          ...(payMethod ? { paymentMethod: payMethod } : {}),
        })
        .returning();

      // Auto-register cost as expense when payment method is provided
      if (
        type === "entrada" &&
        payMethod &&
        parsed.data.cost &&
        parsed.data.cost > 0
      ) {
        const subtotal = parsed.data.cost * quantity;
        const taxAmt = subtotal * ((parsed.data.taxPercent ?? 0) / 100);
        await tx.insert(expensesTable).values({
          description: `Compra inventario: ${product.name} (×${quantity})`,
          category: "supplies",
          amount: subtotal + taxAmt,
          paymentMethod: payMethod,
          tenantId: req.tenantId,
        });
      }

      return movement;
    })
    .then((movement) => {
      res.status(201).json(movement);
    })
    .catch((err) => {
      res.status(400).json({ error: (err as Error).message });
    });
});

// ─── Loyalty Config ───────────────────────────────────────────────────────────

router.get("/loyalty/config", async (req, res): Promise<void> => {
  const cfg = await getLoyaltyConfig(req.tenantId);
  res.json(cfg);
});

const loyaltyConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    mode: z.enum(["amount", "purchase"]).optional(),
    amountPerPoint: z
      .number()
      .positive("amountPerPoint debe ser mayor a 0")
      .optional(),
    pointsPerPurchase: z
      .number()
      .positive("pointsPerPurchase debe ser mayor a 0")
      .optional(),
    redemptionValue: z
      .number()
      .positive("redemptionValue debe ser mayor a 0")
      .optional(),
    pointsPerPqrs: z
      .number()
      .min(0, "pointsPerPqrs debe ser 0 o mayor")
      .optional(),
  })
  .strict();

router.put("/loyalty/config", async (req, res): Promise<void> => {
  const parsed = loyaltyConfigSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const message =
      issues.map((i) => i.message).join("; ") || "Datos inválidos";
    res.status(400).json({ error: message, details: parsed.error.flatten() });
    return;
  }
  const { enabled, mode, amountPerPoint, pointsPerPurchase, redemptionValue, pointsPerPqrs } =
    parsed.data;
  const updates: Array<{ key: string; value: string }> = [];
  if (enabled !== undefined)
    updates.push({ key: "loyalty_enabled", value: String(enabled) });
  if (mode !== undefined)
    updates.push({ key: "loyalty_mode", value: String(mode) });
  if (amountPerPoint !== undefined)
    updates.push({
      key: "loyalty_amount_per_point",
      value: String(amountPerPoint),
    });
  if (pointsPerPurchase !== undefined)
    updates.push({
      key: "loyalty_points_per_purchase",
      value: String(pointsPerPurchase),
    });
  if (redemptionValue !== undefined)
    updates.push({
      key: "loyalty_redemption_value",
      value: String(redemptionValue),
    });
  if (pointsPerPqrs !== undefined)
    updates.push({
      key: "loyalty_points_per_pqrs",
      value: String(pointsPerPqrs),
    });
  for (const row of updates) {
    await db
      .insert(appSettingsTable)
      .values(row)
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value: row.value },
      });
  }
  const cfg = await getLoyaltyConfig(req.tenantId);
  res.json(cfg);
});

router.post("/customers/:id/adjust-points", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { delta, reason } = req.body ?? {};
  if (!id || typeof delta !== "number") {
    res.status(400).json({ error: "id y delta son requeridos" });
    return;
  }
  if (!(await assertCustomerTenant(id, req.tenantId, res))) return;
  const roundedDelta = Math.round(delta);
  const result = await db.transaction(async (tx) => {
    const [customer] = await tx
      .update(customersTable)
      .set({
        loyaltyPoints: sql`GREATEST(0, loyalty_points + ${roundedDelta})`,
      })
      .where(eq(customersTable.id, id))
      .returning();
    if (!customer) return null;
    await tx.insert(loyaltyMovementsTable).values({
      customerId: id,
      type: "manual",
      delta: roundedDelta,
      balanceAfter: customer.loyaltyPoints,
      reason: typeof reason === "string" ? reason : null,
    });
    return customer;
  });
  if (!result) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json({ id: result.id, loyaltyPoints: result.loyaltyPoints, reason });
});

// ─── Customers ────────────────────────────────────────────────────────────────

router.get("/customers", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const customers = await db
    .select()
    .from(customersTable)
    .where(tid ? eq(customersTable.tenantId, tid) : undefined)
    .orderBy(asc(customersTable.name));
  res.json(ListCustomersResponse.parse(customers));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db
    .insert(customersTable)
    .values({
      cedula: parsed.data.cedula ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      birthdate: parsed.data.birthdate ?? null,
      notes: parsed.data.notes ?? null,
      tenantId: req.tenantId,
    })
    .returning();

  // Auto-issue registration campaign code if one exists
  (async () => {
    try {
      const tid = req.tenantId;
      const today = new Date().toISOString().slice(0, 10);
      const camps = await db.execute(sql`
        SELECT * FROM discount_campaigns
        WHERE tenant_id = ${tid ?? null}
          AND campaign_type = 'registration'
          AND is_active = TRUE
          AND (valid_until IS NULL OR valid_until >= ${today})
        ORDER BY created_at DESC LIMIT 1
      `);
      // We don't create a redemption — just note the code is available for this customer
      // The actual redemption happens at POS when the code is used
    } catch {
      /* non-critical */
    }
  })();

  res.status(201).json(ListCustomersResponseItem.parse(customer));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  const body = UpdateCustomerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const tid = req.tenantId;
  const [customer] = await db
    .update(customersTable)
    .set(body.data)
    .where(
      and(
        eq(customersTable.id, params.data.id),
        tid ? eq(customersTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!customer) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json(ListCustomersResponseItem.parse(customer));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  try {
    const customerId = Number(req.params.id);
    const tid = req.tenantId;

    if (!customerId || isNaN(customerId)) {
      res.status(400).json({ error: "ID de cliente no válido." });
      return;
    }

    // Verify ownership FIRST — before any mutations
    const [existing] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, customerId),
          tid ? eq(customersTable.tenantId, tid) : undefined,
        ),
      )
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Cliente no encontrado." });
      return;
    }

    // Ownership confirmed — safe to delete all related rows by customerId
    await db.transaction(async (tx) => {
      // 1. Desvinculamos al cliente de las ventas (esto deja la plata pero quita el nombre)
      await tx
        .update(salesTable)
        .set({ customerId: null })
        .where(eq(salesTable.customerId, customerId));

      // 2. Borramos movimientos de puntos, bonos y créditos
      await tx
        .delete(loyaltyMovementsTable)
        .where(eq(loyaltyMovementsTable.customerId, customerId));
      await tx
        .delete(customerBonusesTable)
        .where(eq(customerBonusesTable.customerId, customerId));
      await tx
        .delete(creditMovementsTable)
        .where(eq(creditMovementsTable.customerId, customerId));

      // 3. ¡Finalmente borramos al cliente!
      await tx.delete(customersTable).where(eq(customersTable.id, customerId));
    });

    res.status(204).send();
  } catch (error: any) {
    req.log.error({ err: error }, "Error al eliminar cliente");
    res.status(500).json({
      error:
        "No se pudo eliminar: El cliente tiene registros activos que no se pueden borrar por seguridad.",
    });
  }
});

// ─── Customer Bonuses ─────────────────────────────────────────────────────
router.get("/customers/:id/bonuses", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  if (!(await assertCustomerTenant(id, req.tenantId, res))) return;
  const rows = await db
    .select()
    .from(customerBonusesTable)
    .where(eq(customerBonusesTable.customerId, id))
    .orderBy(desc(customerBonusesTable.createdAt));
  res.json(rows);
});

router.get("/bonuses", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const status = req.query.status as string | undefined;
  const conditions = [];
  if (status)
    conditions.push(
      eq(
        customerBonusesTable.status,
        status as "issued" | "redeemed" | "expired" | "cancelled",
      ),
    );
  if (tid !== undefined) conditions.push(eq(customersTable.tenantId, tid));
  const rows = await db
    .select({ bonus: customerBonusesTable })
    .from(customerBonusesTable)
    .innerJoin(
      customersTable,
      eq(customerBonusesTable.customerId, customersTable.id),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(customerBonusesTable.createdAt));
  res.json(rows.map((r) => r.bonus));
});

const issueBonusSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nonnegative().default(0),
  conditions: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/customers/:id/bonuses", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const parsed = issueBonusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [cust] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, id),
        req.tenantId !== undefined
          ? eq(customersTable.tenantId, req.tenantId)
          : undefined,
      ),
    );
  if (!cust) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  const [bonus] = await db
    .insert(customerBonusesTable)
    .values({
      customerId: id,
      code: genBonusCode(),
      name: parsed.data.name,
      amount: parsed.data.amount,
      conditions: parsed.data.conditions ?? null,
      validUntil: parsed.data.validUntil ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.status(201).json(bonus);
});

const batchBonusSchema = z.object({
  customerIds: z.array(z.number().int().positive()).min(1),
  name: z.string().min(1),
  amount: z.number().nonnegative().default(0),
  conditions: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/bonuses/batch", async (req, res): Promise<void> => {
  const parsed = batchBonusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const tid = req.tenantId;
  if (tid !== undefined) {
    const owned = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          inArray(customersTable.id, parsed.data.customerIds),
          eq(customersTable.tenantId, tid),
        ),
      );
    if (owned.length !== parsed.data.customerIds.length) {
      res
        .status(403)
        .json({ error: "Uno o más clientes no pertenecen a esta empresa" });
      return;
    }
  }
  const values = parsed.data.customerIds.map((cid) => ({
    customerId: cid,
    code: genBonusCode(),
    name: parsed.data.name,
    amount: parsed.data.amount,
    conditions: parsed.data.conditions ?? null,
    validUntil: parsed.data.validUntil ?? null,
    notes: parsed.data.notes ?? null,
  }));
  const created = await db
    .insert(customerBonusesTable)
    .values(values)
    .returning();
  res.status(201).json({ created: created.length, bonuses: created });
});

router.post("/bonuses/:id/cancel", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  if (!(await assertBonusTenant(id, req.tenantId, res))) return;
  const [updated] = await db
    .update(customerBonusesTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(customerBonusesTable.id, id),
        eq(customerBonusesTable.status, "issued"),
      ),
    )
    .returning();
  if (!updated) {
    res
      .status(400)
      .json({ error: "Bono no encontrado o no se puede cancelar" });
    return;
  }
  res.json(updated);
});

const redeemBonusSchema = z.object({
  saleId: z.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
});

router.post("/bonuses/:id/redeem", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const parsed = redeemBonusSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const bonus = await assertBonusTenant(id, req.tenantId, res);
  if (!bonus) return;
  if (bonus.status !== "issued") {
    res
      .status(400)
      .json({ error: `Bono no canjeable (estado: ${bonus.status})` });
    return;
  }
  if (bonus.validUntil) {
    const today = new Date().toISOString().slice(0, 10);
    if (bonus.validUntil < today) {
      await db
        .update(customerBonusesTable)
        .set({ status: "expired" })
        .where(eq(customerBonusesTable.id, id));
      res.status(400).json({ error: "Bono vencido" });
      return;
    }
  }
  const [updated] = await db
    .update(customerBonusesTable)
    .set({
      status: "redeemed",
      redeemedAt: new Date(),
      redeemedSaleId: parsed.data.saleId ?? null,
      notes: parsed.data.notes ?? bonus.notes,
    })
    .where(
      and(
        eq(customerBonusesTable.id, id),
        eq(customerBonusesTable.status, "issued"),
      ),
    )
    .returning();
  if (!updated) {
    res.status(409).json({ error: "El bono ya fue canjeado o cancelado" });
    return;
  }
  res.json(updated);
});

router.get("/bonuses/validate/:code", async (req, res): Promise<void> => {
  const code = req.params.code;
  const tid = req.tenantId;
  const rows = await db
    .select({ bonus: customerBonusesTable })
    .from(customerBonusesTable)
    .innerJoin(
      customersTable,
      eq(customerBonusesTable.customerId, customersTable.id),
    )
    .where(
      and(
        eq(customerBonusesTable.code, code),
        tid !== undefined ? eq(customersTable.tenantId, tid) : undefined,
      ),
    );
  const bonus = rows[0]?.bonus;
  if (!bonus) {
    res.status(404).json({ valid: false, error: "Bono no encontrado" });
    return;
  }
  if (bonus.status !== "issued") {
    res.json({ valid: false, bonus, error: `Estado: ${bonus.status}` });
    return;
  }
  if (
    bonus.validUntil &&
    bonus.validUntil < new Date().toISOString().slice(0, 10)
  ) {
    res.json({ valid: false, bonus, error: "Bono vencido" });
    return;
  }
  res.json({ valid: true, bonus });
});

// ─── Discount Campaigns ───────────────────────────────────────────────────────

router.get("/campaigns", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const rows = await db.execute(sql`
    SELECT c.*,
      COUNT(r.id)::int AS total_redemptions
    FROM discount_campaigns c
    LEFT JOIN discount_redemptions r ON r.campaign_id = c.id
    WHERE c.tenant_id = ${tid ?? null}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  res.json(rows.rows);
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const {
    code,
    name,
    description,
    discount_amount,
    valid_from,
    valid_until,
    max_total_uses,
    max_uses_per_customer,
    campaign_type,
    is_active,
  } = req.body;
  if (!code || !name) {
    res.status(400).json({ error: "Código y nombre son requeridos" });
    return;
  }
  try {
    const rows = await db.execute(sql`
      INSERT INTO discount_campaigns
        (tenant_id, code, name, description, discount_amount, valid_from, valid_until,
         max_total_uses, max_uses_per_customer, campaign_type, is_active)
      VALUES
        (${tid ?? null}, ${(code as string).toUpperCase()}, ${name}, ${description ?? null},
         ${Number(discount_amount ?? 0)}, ${valid_from ?? null}, ${valid_until ?? null},
         ${max_total_uses ? Number(max_total_uses) : null},
         ${Number(max_uses_per_customer ?? 1)}, ${campaign_type ?? "manual"}, ${is_active ?? true})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Ya existe una campaña con ese código" });
    } else {
      res.status(500).json({ error: "Error al crear la campaña" });
    }
  }
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const {
    code,
    name,
    description,
    discount_amount,
    valid_from,
    valid_until,
    max_total_uses,
    max_uses_per_customer,
    campaign_type,
    is_active,
  } = req.body;
  try {
    const rows = await db.execute(sql`
      UPDATE discount_campaigns SET
        code = ${(code as string)?.toUpperCase()},
        name = ${name},
        description = ${description ?? null},
        discount_amount = ${Number(discount_amount ?? 0)},
        valid_from = ${valid_from ?? null},
        valid_until = ${valid_until ?? null},
        max_total_uses = ${max_total_uses ? Number(max_total_uses) : null},
        max_uses_per_customer = ${Number(max_uses_per_customer ?? 1)},
        campaign_type = ${campaign_type ?? "manual"},
        is_active = ${is_active ?? true}
      WHERE id = ${id} AND tenant_id = ${tid ?? null}
      RETURNING *
    `);
    if (!rows.rows[0]) {
      res.status(404).json({ error: "Campaña no encontrada" });
      return;
    }
    res.json(rows.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Ya existe una campaña con ese código" });
    } else {
      res.status(500).json({ error: "Error al actualizar la campaña" });
    }
  }
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  await db.execute(
    sql`DELETE FROM discount_campaigns WHERE id = ${id} AND tenant_id = ${tid ?? null}`,
  );
  res.json({ ok: true });
});

router.get("/campaigns/:id/redemptions", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const check = await db.execute(
    sql`SELECT id FROM discount_campaigns WHERE id = ${id} AND tenant_id = ${tid ?? null}`,
  );
  if (!check.rows[0]) {
    res.status(404).json({ error: "Campaña no encontrada" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT r.*, cu.name AS customer_name
    FROM discount_redemptions r
    LEFT JOIN customers cu ON cu.id = r.customer_id
    WHERE r.campaign_id = ${id}
    ORDER BY r.redeemed_at DESC
  `);
  res.json(rows.rows);
});

router.get("/campaigns/validate/:code", async (req, res): Promise<void> => {
  const code = (req.params.code as string).toUpperCase();
  const tid = req.tenantId;
  const customerId = req.query.customerId ? Number(req.query.customerId) : null;

  const rows = await db.execute(sql`
    SELECT c.*,
      COUNT(r.id)::int AS total_redemptions
    FROM discount_campaigns c
    LEFT JOIN discount_redemptions r ON r.campaign_id = c.id
    WHERE UPPER(c.code) = ${code}
      AND c.tenant_id = ${tid ?? null}
    GROUP BY c.id
  `);
  const campaign = rows.rows[0] as any;
  if (!campaign) {
    res.status(404).json({ valid: false, error: "Código no encontrado" });
    return;
  }
  if (!campaign.is_active) {
    res.json({ valid: false, campaign, error: "La campaña está inactiva" });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (campaign.valid_until && campaign.valid_until < today) {
    res.json({ valid: false, campaign, error: "El código ha vencido" });
    return;
  }
  if (campaign.valid_from && campaign.valid_from > today) {
    res.json({
      valid: false,
      campaign,
      error: "El código aún no está vigente",
    });
    return;
  }
  if (
    campaign.max_total_uses !== null &&
    campaign.total_redemptions >= campaign.max_total_uses
  ) {
    res.json({
      valid: false,
      campaign,
      error: "Se agotaron los usos disponibles",
    });
    return;
  }
  if (customerId && campaign.max_uses_per_customer) {
    const used = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM discount_redemptions
      WHERE campaign_id = ${campaign.id} AND customer_id = ${customerId}
    `);
    const cnt = (used.rows[0] as any)?.cnt ?? 0;
    if (cnt >= campaign.max_uses_per_customer) {
      res.json({
        valid: false,
        campaign,
        error: "Este cliente ya usó el código el máximo de veces permitidas",
      });
      return;
    }
  }
  res.json({ valid: true, campaign });
});

router.post("/campaigns/:id/redeem", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const { customerId, saleId, notes } = req.body;
  const check = await db.execute(
    sql`SELECT id FROM discount_campaigns WHERE id = ${id} AND tenant_id = ${tid ?? null}`,
  );
  if (!check.rows[0]) {
    res.status(404).json({ error: "Campaña no encontrada" });
    return;
  }
  const rows = await db.execute(sql`
    INSERT INTO discount_redemptions (campaign_id, customer_id, sale_id, notes)
    VALUES (${id}, ${customerId ?? null}, ${saleId ?? null}, ${notes ?? null})
    RETURNING *
  `);
  res.status(201).json(rows.rows[0]);
});

// Auto-issue a campaign code of a specific type to a customer (used on registration/birthday)
router.post("/campaigns/auto-issue/:type", async (req, res): Promise<void> => {
  const type = req.params.type; // "registration" or "birthday"
  const tid = req.tenantId;
  const { customerId } = req.body;
  if (!customerId) {
    res.status(400).json({ error: "customerId requerido" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const campaign = (
    await db.execute(sql`
    SELECT * FROM discount_campaigns
    WHERE tenant_id = ${tid ?? null}
      AND campaign_type = ${type}
      AND is_active = TRUE
      AND (valid_until IS NULL OR valid_until >= ${today})
    ORDER BY created_at DESC LIMIT 1
  `)
  ).rows[0] as any;

  if (!campaign) {
    res.json({ issued: false, reason: "No hay campaña activa de este tipo" });
    return;
  }

  // Check if already issued to this customer
  const alreadyUsed = (
    await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM discount_redemptions
    WHERE campaign_id = ${campaign.id} AND customer_id = ${customerId}
  `)
  ).rows[0] as any;
  if ((alreadyUsed?.cnt ?? 0) >= campaign.max_uses_per_customer) {
    res.json({ issued: false, reason: "Cliente ya usó esta campaña" });
    return;
  }

  res.json({ issued: true, campaign });
});

// ─── Credit (Cuenta corriente) ─────────────────────────────────────────────
router.get("/customers/:id/credit-history", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  if (!(await assertCustomerTenant(id, req.tenantId, res))) return;
  const rows = await db
    .select()
    .from(creditMovementsTable)
    .where(eq(creditMovementsTable.customerId, id))
    .orderBy(desc(creditMovementsTable.createdAt));
  res.json(rows);
});

const creditPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  notes: z.string().optional().nullable(),
});

router.post(
  "/customers/:id/credit-payment",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const parsed = creditPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (!(await assertCustomerTenant(id, req.tenantId, res))) return;
    const result = await db.transaction(async (tx) => {
      const lockedRows = await tx.execute<{ credit_balance: number }>(
        sql`SELECT credit_balance FROM customers WHERE id = ${id} FOR UPDATE`,
      );
      const locked = lockedRows.rows[0];
      if (!locked) return { error: "Cliente no encontrado" as const };
      const currentBalance = Number(locked.credit_balance ?? 0);
      const applied = Math.min(parsed.data.amount, currentBalance);
      if (applied <= 0)
        return { error: "El cliente no tiene saldo pendiente" as const };
      const newBalance = currentBalance - applied;
      await tx
        .update(customersTable)
        .set({ creditBalance: newBalance })
        .where(eq(customersTable.id, id));
      const [movement] = await tx
        .insert(creditMovementsTable)
        .values({
          customerId: id,
          type: "payment",
          amount: applied,
          balanceAfter: newBalance,
          paymentMethod: parsed.data.paymentMethod,
          notes: parsed.data.notes ?? null,
        })
        .returning();
      return { movement, newBalance };
    });
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  },
);

router.get(
  "/customers/:id/loyalty-history",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    if (!(await assertCustomerTenant(id, req.tenantId, res))) return;
    const rows = await db
      .select()
      .from(loyaltyMovementsTable)
      .where(eq(loyaltyMovementsTable.customerId, id))
      .orderBy(desc(loyaltyMovementsTable.createdAt));
    res.json(rows);
  },
);

router.get("/customers/birthdays/today", async (req, res): Promise<void> => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const tid = req.tenantId;
  const rows = await db
    .select()
    .from(customersTable)
    .where(
      and(
        sql`birthdate IS NOT NULL AND substring(birthdate from 6 for 5) = ${`${mm}-${dd}`}`,
        tid !== undefined ? eq(customersTable.tenantId, tid) : undefined,
      ),
    );
  res.json(rows);
});

// ─── Ledger / Libro de Cuentas ─────────────────────────────────────────────

router.get("/ledger", async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };

  const conditions: SQL[] = [];
  if (from) {
    const fromDate = new Date(from as string);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(salesTable.createdAt, fromDate));
    }
  }
  if (to) {
    const toDate = new Date(to as string);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(salesTable.createdAt, toDate));
    }
  }

  const expConditions: SQL[] = [];
  if (from) {
    const fromDate = new Date(from as string);
    if (!isNaN(fromDate.getTime())) {
      expConditions.push(gte(expensesTable.createdAt, fromDate));
    }
  }
  if (to) {
    const toDate = new Date(to as string);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      expConditions.push(lte(expensesTable.createdAt, toDate));
    }
  }

  const tid = req.tenantId;
  if (tid) {
    conditions.push(eq(salesTable.tenantId, tid));
    expConditions.push(eq(expensesTable.tenantId, tid));
  }

  // Build receipt conditions: non-discarded receipts with a known direction,
  // NOT already counted via a linked sale or linked expense (those appear in their own tables).
  const rcptConditions: SQL[] = [
    ne(paymentReceiptsTable.status, "discarded"),
    isNotNull(paymentReceiptsTable.direction),
    isNull(paymentReceiptsTable.linkedSaleId),
    isNull(paymentReceiptsTable.linkedExpenseId),
    isNull(paymentReceiptsTable.linkedRestaurantOrderId),
  ];
  if (tid) rcptConditions.push(eq(paymentReceiptsTable.tenantId, tid));
  if (from) {
    const d = new Date(from as string);
    if (!isNaN(d.getTime())) rcptConditions.push(gte(paymentReceiptsTable.receivedAt, d));
  }
  if (to) {
    const d = new Date(to as string);
    if (!isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); rcptConditions.push(lte(paymentReceiptsTable.receivedAt, d)); }
  }

  const refundConditions: SQL[] = [];
  if (tid) refundConditions.push(eq(saleRefundsTable.tenantId, tid));
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) refundConditions.push(gte(saleRefundsTable.createdAt, d));
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      refundConditions.push(lte(saleRefundsTable.createdAt, d));
    }
  }

  const [sales, allExpenses, refunds, receipts] = await Promise.all([
    db
      .select()
      .from(salesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(salesTable.createdAt)),
    db
      .select()
      .from(expensesTable)
      .where(expConditions.length ? and(...expConditions) : undefined)
      .orderBy(asc(expensesTable.createdAt)),
    db
      .select()
      .from(saleRefundsTable)
      .where(refundConditions.length ? and(...refundConditions) : undefined)
      .orderBy(asc(saleRefundsTable.createdAt)),
    db
      .select({
        id: paymentReceiptsTable.id,
        direction: paymentReceiptsTable.direction,
        amount: paymentReceiptsTable.amount,
        bank: paymentReceiptsTable.bank,
        senderName: paymentReceiptsTable.senderName,
        senderContact: paymentReceiptsTable.senderContact,
        receivedAt: paymentReceiptsTable.receivedAt,
      })
      .from(paymentReceiptsTable)
      .where(and(...rcptConditions))
      .orderBy(asc(paymentReceiptsTable.receivedAt)),
  ]);
  const legacyRefundExpenses = allExpenses.filter(
    (expense) => ["devolución", "devolucion"].includes(expense.category.trim().toLowerCase()),
  );
  const expenses = allExpenses.filter(
    (expense) => !["devolución", "devolucion"].includes(expense.category.trim().toLowerCase()),
  );

  const ledgerKindMap = await loadPaymentMethodsMap(req.tenantId);
  type TxEntry = {
    id: string;
    type: "income" | "expense" | "refund";
    date: Date;
    description: string;
    paymentMethod: string;
    amount: number;
    category?: string;
  };

  const txs: TxEntry[] = [
    ...sales.map((s) => ({
      id: `sale-${s.id}`,
      type: "income" as const,
      date: s.createdAt,
      description: `Venta ${s.receiptNumber}${s.customerName ? ` – ${s.customerName}` : ""}`,
      paymentMethod: s.paymentMethod,
      amount: s.subtotal,
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      type: "expense" as const,
      date: e.createdAt,
      description: e.description,
      paymentMethod: e.paymentMethod,
      amount: e.amount,
      category: e.category,
    })),
    ...refunds.map((r) => ({
      id: `refund-${r.id}`,
      type: "refund" as const,
      date: r.createdAt,
      description: `Devolución de venta #${r.receiptNumber}`,
      paymentMethod: r.paymentMethod,
      amount: r.amount,
      category: "Devolución",
    })),
    ...legacyRefundExpenses.map((expense) => ({
      id: `legacy-refund-${expense.id}`,
      type: "refund" as const,
      date: expense.createdAt,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      amount: expense.amount,
      category: "Devolución histórica",
    })),
    ...receipts
      .filter((r) => r.amount !== null && r.direction !== null)
      .map((r) => ({
        id: `receipt-${r.id}`,
        type: (r.direction === "received" ? "income" : "expense") as "income" | "expense",
        date: r.receivedAt,
        description:
          r.direction === "received"
            ? `Transferencia recibida – ${r.bank ?? "banco"}${r.senderName ? ` (${r.senderName})` : ""}`
            : `Pago realizado – ${r.bank ?? "banco"}${r.senderName ? ` a ${r.senderName}` : ""}`,
        paymentMethod: "transfer",
        amount: parseFloat(r.amount as string),
        category: "comprobante",
      })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const transactions = txs.map((t) => {
    running += t.type === "income" ? t.amount : -t.amount;
    return {
      id: t.id,
      type: t.type,
      date: t.date.toISOString(),
      description: t.description,
      paymentMethod: t.paymentMethod,
      amount: t.amount,
      runningBalance: money(running),
      category: t.category,
    };
  });

  const amountByKind = (
    rows: Array<{ paymentMethod: string; payments: { method: string; amount: number }[] | null; amount: number }>,
    kind: PaymentKind,
  ) => rows.reduce((total, row) => {
    const allocations = row.payments?.length
      ? row.payments
      : [{ method: row.paymentMethod, amount: row.amount }];
    return total + allocations
      .filter((payment) => resolveKind(ledgerKindMap, payment.method) === kind)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
  }, 0);
  const saleAllocations = sales.map((sale) => ({
    paymentMethod: sale.paymentMethod,
    payments: sale.payments,
    amount: sale.subtotal,
  }));
  const refundAllocations = refunds.map((refund) => ({
    paymentMethod: refund.paymentMethod,
    payments: refund.payments,
    amount: refund.amount,
  }));
  const totalIncome = sales.reduce((s, x) => s + x.subtotal, 0);
  const cashIncome = amountByKind(saleAllocations, "cash");
  const transferIncome = amountByKind(saleAllocations, "transfer");
  const cardIncome = amountByKind(saleAllocations, "card");
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const totalRefunds =
    refunds.reduce((s, x) => s + x.amount, 0) +
    legacyRefundExpenses.reduce((s, x) => s + x.amount, 0);
  const legacyRefundAllocations = legacyRefundExpenses.map((expense) => ({
    paymentMethod: expense.paymentMethod,
    payments: null,
    amount: expense.amount,
  }));
  const allRefundAllocations = [...refundAllocations, ...legacyRefundAllocations];
  const cashRefunds = amountByKind(allRefundAllocations, "cash");
  const transferRefunds = amountByKind(allRefundAllocations, "transfer");
  const cardRefunds = amountByKind(allRefundAllocations, "card");
  const cashExpenses = expenses
    .filter((e) => resolveKind(ledgerKindMap, e.paymentMethod) === "cash")
    .reduce((s, x) => s + x.amount, 0);
  const transferExpenses = expenses
    .filter((e) => resolveKind(ledgerKindMap, e.paymentMethod) === "transfer")
    .reduce((s, x) => s + x.amount, 0);
  const cardExpenses = expenses
    .filter((e) => resolveKind(ledgerKindMap, e.paymentMethod) === "card")
    .reduce((s, x) => s + x.amount, 0);

  res.json({
    summary: {
      totalIncome: money(totalIncome),
      cashIncome: money(cashIncome),
      transferIncome: money(transferIncome),
      cardIncome: money(cardIncome),
      totalExpenses: money(totalExpenses),
      totalRefunds: money(totalRefunds),
      cashRefunds: money(cashRefunds),
      transferRefunds: money(transferRefunds),
      cardRefunds: money(cardRefunds),
      cashExpenses: money(cashExpenses),
      transferExpenses: money(transferExpenses),
      cardExpenses: money(cardExpenses),
      netBalance: money(totalIncome - totalExpenses - totalRefunds),
      transactionCount: transactions.length,
    },
    transactions: transactions.reverse(),
  });
});

// ─── Delivery Drivers (Domiciliarios) ────────────────────────────────────────

router.get("/delivery-drivers", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const drivers = await db
    .select()
    .from(deliveryDriversTable)
    .where(eq(deliveryDriversTable.tenantId, tid))
    .orderBy(
      desc(deliveryDriversTable.isActive),
      asc(deliveryDriversTable.name),
    );
  res.json(drivers);
});

router.post("/delivery-drivers", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const parsed = insertDeliveryDriverSchema.safeParse({
    ...req.body,
    tenantId: tid,
  });
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const [driver] = await db
    .insert(deliveryDriversTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(driver);
});

router.patch("/delivery-drivers/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (!tid) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const parsed = updateDeliveryDriverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const [driver] = await db
    .update(deliveryDriversTable)
    .set(parsed.data)
    .where(
      and(
        eq(deliveryDriversTable.id, id),
        eq(deliveryDriversTable.tenantId, tid),
      ),
    )
    .returning();
  if (!driver) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }
  res.json(driver);
});

router.delete("/delivery-drivers/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (!tid) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  await db
    .delete(deliveryDriversTable)
    .where(
      and(
        eq(deliveryDriversTable.id, id),
        eq(deliveryDriversTable.tenantId, tid),
      ),
    );
  res.json({ ok: true });
});

// ── Delivery Shift Rules (turnos de servicio de domicilios) ─────────────────

// GET /delivery-shifts — list all shift rules for tenant
router.get("/delivery-shifts", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  const rules = await db
    .select()
    .from(deliveryShiftRulesTable)
    .where(eq(deliveryShiftRulesTable.tenantId, tid))
    .orderBy(asc(deliveryShiftRulesTable.timeFrom));
  res.json(rules);
});

// GET /delivery-shifts/active — returns current active shift rule (if any)
router.get("/delivery-shifts/active", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  const rules = await db
    .select()
    .from(deliveryShiftRulesTable)
    .where(
      and(
        eq(deliveryShiftRulesTable.tenantId, tid),
        eq(deliveryShiftRulesTable.isActive, true),
      ),
    );
  const now = new Date();
  const isoDay = now.getDay() === 0 ? 7 : now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const active = rules.find((r) => {
    const days = r.days.split(",").map(Number);
    if (!days.includes(isoDay)) return false;
    if (hhmm < r.timeFrom) return false;
    if (hhmm >= r.timeTo) return false;
    return true;
  });
  res.json(active ?? null);
});

// POST /delivery-shifts — create shift rule
router.post("/delivery-shifts", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  const parsed = insertDeliveryShiftRuleSchema.safeParse({ ...req.body, tenantId: tid });
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues }); return; }
  const [rule] = await db.insert(deliveryShiftRulesTable).values(parsed.data).returning();
  res.status(201).json(rule);
});

// PATCH /delivery-shifts/:id — update shift rule
router.patch("/delivery-shifts/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  const parsed = updateDeliveryShiftRuleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  const [rule] = await db
    .update(deliveryShiftRulesTable)
    .set(parsed.data)
    .where(and(eq(deliveryShiftRulesTable.id, id), eq(deliveryShiftRulesTable.tenantId, tid)))
    .returning();
  if (!rule) { res.status(404).json({ error: "No encontrado" }); return; }
  res.json(rule);
});

// DELETE /delivery-shifts/:id — delete shift rule
router.delete("/delivery-shifts/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  await db
    .delete(deliveryShiftRulesTable)
    .where(and(eq(deliveryShiftRulesTable.id, id), eq(deliveryShiftRulesTable.tenantId, tid)));
  res.json({ ok: true });
});

// Public: driver reads their active delivery by tracking token
// Public: customer tracks their delivery by trackingToken
router.get("/public/track/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [row] = await db
    .select({
      id: deliveriesTable.id,
      orderNumber: deliveriesTable.orderNumber,
      trackingToken: deliveriesTable.trackingToken,
      customerName: deliveriesTable.customerName,
      phone: deliveriesTable.phone,
      address: deliveriesTable.address,
      subtotal: deliveriesTable.subtotal,
      deliveryFee: deliveriesTable.deliveryFee,
      total: deliveriesTable.total,
      paymentMethod: deliveriesTable.paymentMethod,
      status: deliveriesTable.status,
      notes: deliveriesTable.notes,
      deliveryPerson: deliveriesTable.deliveryPerson,
      deliveryLat: deliveriesTable.deliveryLat,
      deliveryLng: deliveriesTable.deliveryLng,
      createdAt: deliveriesTable.createdAt,
      updatedAt: deliveriesTable.updatedAt,
      tenantId: deliveriesTable.tenantId,
      pqrsToken: (deliveriesTable as any).pqrsToken,
    })
    .from(deliveriesTable)
    .where(eq(deliveriesTable.trackingToken, token))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }
  // Resolve tenant slug so tracking page can link back to the public order form
  let tenantSlug: string | null = null;
  if (row.tenantId) {
    const [t] = await db
      .select({ slug: tenantsTable.slug })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, row.tenantId))
      .limit(1);
    tenantSlug = t?.slug ?? null;
  }
  res.json({
    ...row,
    tenantSlug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.get("/public/driver/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [delivery] = await db
    .select({
      id: deliveriesTable.id,
      orderNumber: deliveriesTable.orderNumber,
      customerName: deliveriesTable.customerName,
      address: deliveriesTable.address,
      phone: deliveriesTable.phone,
      status: deliveriesTable.status,
      deliveryPerson: deliveriesTable.deliveryPerson,
      deliveryLat: deliveriesTable.deliveryLat,
      deliveryLng: deliveriesTable.deliveryLng,
    })
    .from(deliveriesTable)
    .where(eq(deliveriesTable.trackingToken, token))
    .limit(1);
  if (!delivery) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }
  res.json(delivery);
});

// Public: driver updates delivery status (in_transit or delivered) via trackingToken
router.patch("/public/driver/:token/status", async (req, res): Promise<void> => {
  const { token } = req.params;
  const { status } = req.body as { status?: unknown };

  const ALLOWED = ["in_transit", "delivered"] as const;
  if (!status || !ALLOWED.includes(status as (typeof ALLOWED)[number])) {
    res.status(400).json({ error: "Estado inválido. Valores permitidos: in_transit, delivered" });
    return;
  }

  const [delivery] = await db
    .select({ id: deliveriesTable.id, status: deliveriesTable.status })
    .from(deliveriesTable)
    .where(eq(deliveriesTable.trackingToken, token))
    .limit(1);

  if (!delivery) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  // Guard: only allow forward transitions
  const ORDER = ["pending", "confirmed", "preparing", "in_transit", "delivered", "cancelled"];
  const currentIdx = ORDER.indexOf(delivery.status);
  const newIdx = ORDER.indexOf(status as string);
  if (newIdx <= currentIdx) {
    res.status(409).json({ error: `No se puede cambiar de '${delivery.status}' a '${status}'` });
    return;
  }

  const [updated] = await db
    .update(deliveriesTable)
    .set({ status: status as "pending" | "confirmed" | "preparing" | "in_transit" | "delivered" | "cancelled", updatedAt: new Date() })
    .where(eq(deliveriesTable.id, delivery.id))
    .returning({ id: deliveriesTable.id, status: deliveriesTable.status });

  res.json({ ok: true, status: updated.status });
});

// Public: driver updates their location using the delivery tracking token
router.patch(
  "/public/driver/:token/location",
  async (req, res): Promise<void> => {
    const { token } = req.params;
    const { lat, lng } = req.body as { lat?: unknown; lng?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ error: "lat y lng requeridos" });
      return;
    }
    const [delivery] = await db
      .select({ id: deliveriesTable.id, status: deliveriesTable.status })
      .from(deliveriesTable)
      .where(eq(deliveriesTable.trackingToken, token))
      .limit(1);
    if (!delivery) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }
    await db
      .update(deliveriesTable)
      .set({ deliveryLat: lat, deliveryLng: lng })
      .where(eq(deliveriesTable.id, delivery.id));
    res.json({ ok: true, status: delivery.status });
  },
);

// ─── Deliveries / Domicilios ───────────────────────────────────────────────
function nextDeliveryNumber(): string {
  return `DOM-${Date.now().toString(36).toUpperCase()}`;
}

function generateTrackingToken(): string {
  return `TRK-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

router.get("/deliveries/driver-cash-summary", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const driverId = req.query.driverId ? Number(req.query.driverId) : NaN;
  if (!Number.isFinite(driverId) || driverId <= 0) {
    res.status(400).json({ error: "driverId es requerido" });
    return;
  }
  const cajaId = req.query.cajaId ? Number(req.query.cajaId) : undefined;
  const date = typeof req.query.date === "string" ? req.query.date : undefined;

  const [driver] = await db
    .select({ id: deliveryDriversTable.id, name: deliveryDriversTable.name })
    .from(deliveryDriversTable)
    .where(and(eq(deliveryDriversTable.id, driverId), eq(deliveryDriversTable.tenantId, tid)));

  if (!driver) {
    res.status(404).json({ error: "Conductor no encontrado" });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [
    eq(deliveriesTable.tenantId, tid),
    eq(deliveriesTable.paymentMethod, "cash"),
    eq(deliveriesTable.status, "delivered"),
  ];
  // driverId is nullable on the column; cast to avoid type mismatch
  conditions.push(sql`${deliveriesTable.driverId} = ${driverId}` as ReturnType<typeof eq>);

  if (cajaId) {
    conditions.push(sql`${deliveriesTable.cajaId} = ${cajaId}` as ReturnType<typeof eq>);
  } else if (date) {
    conditions.push(sql`DATE(${deliveriesTable.createdAt}) = ${date}::date` as ReturnType<typeof eq>);
  }

  const rows = await db
    .select({
      id: deliveriesTable.id,
      orderNumber: deliveriesTable.orderNumber,
      customerName: deliveriesTable.customerName,
      total: deliveriesTable.total,
      cashAmountTendered: deliveriesTable.cashAmountTendered,
      createdAt: deliveriesTable.createdAt,
    })
    .from(deliveriesTable)
    .where(and(...conditions))
    .orderBy(asc(deliveriesTable.createdAt));

  const deliveries = rows.map((d) => {
    const total = Number(d.total) || 0;
    const tendered = d.cashAmountTendered !== null ? Number(d.cashAmountTendered) : total;
    return {
      id: d.id,
      orderNumber: d.orderNumber,
      customerName: d.customerName ?? "",
      total,
      cashAmountTendered: tendered,
      changeGiven: Math.max(0, tendered - total),
      createdAt: d.createdAt.toISOString(),
    };
  });

  const summary = {
    count: deliveries.length,
    totalOrders: deliveries.reduce((s, d) => s + d.total, 0),
    totalTendered: deliveries.reduce((s, d) => s + d.cashAmountTendered, 0),
    totalChangeGiven: deliveries.reduce((s, d) => s + d.changeGiven, 0),
  };

  res.json({ driver, deliveries, summary });
});

router.post("/deliveries/driver-cash-reconciliations", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  const parsed = insertDriverCashReconciliationSchema.safeParse({ ...req.body, tenantId: tid });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [row] = await db.insert(driverCashReconciliationsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.get("/deliveries/driver-cash-reconciliations", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autenticado" }); return; }
  const driverId = req.query.driverId ? Number(req.query.driverId) : undefined;
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const cajaId = req.query.cajaId ? Number(req.query.cajaId) : undefined;
  const conditions = [eq(driverCashReconciliationsTable.tenantId, tid)];
  if (driverId && Number.isFinite(driverId)) {
    conditions.push(sql`${driverCashReconciliationsTable.driverId} = ${driverId}` as ReturnType<typeof eq>);
  }
  if (date) {
    conditions.push(eq(driverCashReconciliationsTable.date, date));
  }
  if (cajaId && Number.isFinite(cajaId)) {
    conditions.push(sql`${driverCashReconciliationsTable.cajaId} = ${cajaId}` as ReturnType<typeof eq>);
  }
  const rows = await db
    .select()
    .from(driverCashReconciliationsTable)
    .where(and(...conditions))
    .orderBy(desc(driverCashReconciliationsTable.reconciledAt))
    .limit(100);
  res.json(rows.map(r => ({
    ...r,
    reconciledAt: r.reconciledAt.toISOString(),
  })));
});

router.get("/deliveries", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const deliveries = await db
    .select()
    .from(deliveriesTable)
    .where(tid ? eq(deliveriesTable.tenantId, tid) : undefined)
    .orderBy(desc(deliveriesTable.createdAt));
  res.json(
    ListDeliveriesResponse.parse(
      deliveries.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    ),
  );
});

router.post("/deliveries", async (req, res): Promise<void> => {
  const parsed = CreateDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }

  // Cuando el domicilio NO viene del POS, debe descontar ingredientes según
  // receta para mantener el inventario unificado con POS y MESAS. Si viene
  // del POS, la venta asociada ya descontó los ingredientes y dejamos el
  // flag en false para evitar doble-conteo.
  const consumesInventory =
    (parsed.data as { consumesInventory?: boolean }).consumesInventory === true;

  try {
    const delivery = await db.transaction(async (tx) => {
      // ── Paso 1: descuento atómico de ingredientes ──────────────────────────
      if (consumesInventory) {
        const consumeError = await consumeDeliveryIngredients(
          tx,
          parsed.data.items,
          req.tenantId ?? undefined,
        );
        if (consumeError) {
          throw Object.assign(new Error(consumeError.error), {
            httpStatus: consumeError.status,
          });
        }
      }

      // ── Paso 2: insertar el domicilio ──────────────────────────────────────
      const deliveryPqrsToken = require("crypto").randomUUID() as string;
      const [created] = await tx
        .insert(deliveriesTable)
        .values({
          ...parsed.data,
          discountAmount: Number(req.body.discountAmount) || 0,
          appliedBonusCode: req.body.appliedBonusCode || null,
          consumesInventory: true,
          orderNumber: nextDeliveryNumber(),
          trackingToken: generateTrackingToken(),
          pqrsToken: deliveryPqrsToken,
          tenantId: req.tenantId,
        } as any)
        .returning();

      // ── Paso 3: obtener o crear la mesa virtual de domicilios ──────────────
      const VIRTUAL_TABLE_NAME = "__DOMICILIOS__";
      // SAFETY NET: created.tenantId === req.tenantId, always set for authenticated requests.
      // The isNull branch is unreachable for regular users; only applies for superadmins without tenant.
      const tenantCond = created.tenantId
        ? eq(restaurantTablesTable.tenantId, created.tenantId)
        : isNull(restaurantTablesTable.tenantId);

      let [virtualTable] = await tx
        .select()
        .from(restaurantTablesTable)
        .where(and(eq(restaurantTablesTable.name, VIRTUAL_TABLE_NAME), tenantCond))
        .limit(1);

      if (!virtualTable) {
        [virtualTable] = await tx
          .insert(restaurantTablesTable)
          .values({
            name: VIRTUAL_TABLE_NAME,
            area: "Domicilios",
            capacity: 0,
            isVirtual: true,
            tenantId: created.tenantId,
          } as any)
          .returning();
      } else if (!virtualTable.isVirtual) {
        await tx
          .update(restaurantTablesTable)
          .set({ isVirtual: true })
          .where(eq(restaurantTablesTable.id, virtualTable.id));
      }

      // ── Paso 4: crear la orden KDS vinculada al domicilio ──────────────────
      const [kdsOrder] = await tx
        .insert(restaurantOrdersTable)
        .values({
          tableId: virtualTable.id,
          serverName: created.customerName,
          deliveryId: created.id,
          status: "open",
          kitchenStatus: "pending",
          subtotal: Number(created.subtotal) || 0,
          tenantId: created.tenantId,
        } as any)
        .returning();

      // ── Paso 5: insertar los ítems del KDS ────────────────────────────────
      const rawItems = parsed.data.items;
      const deliveryItems: Array<{
        productId?: number;
        name?: string;
        qty?: number;
        price?: number;
        notes?: string;
      }> = Array.isArray(rawItems)
        ? rawItems
        : typeof rawItems === "string"
          ? JSON.parse(rawItems as string)
          : [];

      const kdsItems = deliveryItems.filter((it) => it.name && it.qty);
      if (kdsItems.length > 0) {
        const kdsValues = await Promise.all(
          kdsItems.map(async (it) => ({
            orderId: kdsOrder.id,
            productId: it.productId ?? null,
            productName: it.name!,
            quantity: it.qty!,
            unitPrice: it.price ?? 0,
            lineTotal: money((it.qty ?? 0) * (it.price ?? 0)),
            notes: it.notes ?? null,
            // Resolve the KDS station so delivery items show on the right
            // kitchen screen instead of falling through with a null station.
            station:
              it.productId != null
                ? await resolveStation(it.productId!, req.tenantId)
                : DEFAULT_STATION,
          })),
        );
        await tx.insert(restaurantOrderItemsTable).values(kdsValues as any);
      }

      return created;
    }); // end db.transaction — los 5 pasos son atómicos: si cualquiera falla, rollback total

    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "deliveries_updated");

    res.status(201).json({
      ...delivery,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    });
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus ?? 500;
    res.status(httpStatus).json({ error: (err as Error).message });
  }
});

router.patch("/deliveries/:id", async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse(req.params);
  const body = UpdateDeliveryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const tid = req.tenantId;
  const [existing] = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        tid ? eq(deliveriesTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Domicilio no encontrado" });
    return;
  }
  const isLocked = existing.status !== "pending";
  const triesToChangeItems =
    body.data.items !== undefined ||
    body.data.subtotal !== undefined ||
    body.data.total !== undefined;
  if (isLocked && triesToChangeItems) {
    res.status(409).json({
      error: "Productos bloqueados",
      message:
        "No se pueden modificar productos ni cantidades después de confirmar el pedido.",
    });
    return;
  }
  // Si el domicilio descuenta inventario, sus productos ya consumieron
  // ingredientes según receta. Permitir editar items aquí dejaría la base
  // inconsistente (no re-calculamos consumo en este PATCH). Pedimos
  // explícitamente que el usuario cancele/borre y vuelva a crear.
  if (existing.consumesInventory && triesToChangeItems) {
    res.status(409).json({
      error: "Productos bloqueados",
      message:
        "Este domicilio ya descontó ingredientes del inventario. Para cambiar productos, cancélalo y crea uno nuevo.",
    });
    return;
  }
  // No permitir cambiar el flag consumesInventory por PATCH: se fija en POST.
  const { consumesInventory: _ignoredFlag, ...safeUpdate } =
    body.data as Record<string, unknown>;
  void _ignoredFlag;
  const [delivery] = await db
    .update(deliveriesTable)
    .set(safeUpdate)
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        tid ? eq(deliveriesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!delivery) {
    res.status(404).json({ error: "Domicilio no encontrado" });
    return;
  }
  if (tid !== undefined) sseBus.broadcast(tid, "deliveries_updated");
  res.json({
    ...delivery,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
  });
});

router.patch("/deliveries/:id/status", async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse(req.params);
  const body = UpdateDeliveryStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Estado inválido" });
    return;
  }
  if (
    body.data.status === "cancelled" &&
    !await requireEffectivePermission(req, res, "action:cancel_delivery")
  ) return;

  try {
    const tid = req.tenantId;
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(deliveriesTable)
        .where(
          and(
            eq(deliveriesTable.id, params.data.id),
            tid ? eq(deliveriesTable.tenantId, tid) : undefined,
          ),
        );
      if (!existing) return null;

      // Si el domicilio est\u00e1ndalone (consumesInventory=true) se cancela
      // estando todav\u00eda activo, devolvemos los ingredientes al inventario
      // para que coincida con POS/MESAS. No restauramos si ya estaba cancelado
      // ni si ya fue entregado (en ese caso el consumo es real).
      const wasActive =
        existing.status !== "cancelled" && existing.status !== "delivered";
      if (
        existing.consumesInventory &&
        body.data.status === "cancelled" &&
        wasActive
      ) {
        await restoreDeliveryIngredients(tx, existing.items);
      }

      const [delivery] = await tx
        .update(deliveriesTable)
        .set({ status: body.data.status })
        .where(
          and(
            eq(deliveriesTable.id, params.data.id),
            tid ? eq(deliveriesTable.tenantId, tid) : undefined,
          ),
        )
        .returning();
      return delivery;
    });

    if (!updated) {
      res.status(404).json({ error: "Domicilio no encontrado" });
      return;
    }
    if (tid !== undefined) sseBus.broadcast(tid, "deliveries_updated");
    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/deliveries/:id", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, "action:cancel_delivery")) return;
  const params = DeleteDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    const tid = req.tenantId;
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(deliveriesTable)
        .where(
          and(
            eq(deliveriesTable.id, params.data.id),
            tid ? eq(deliveriesTable.tenantId, tid) : undefined,
          ),
        );
      if (!existing) return;

      // Si borramos un domicilio est\u00e1ndalone activo (no entregado y no
      // cancelado), devolvemos los ingredientes para que el inventario no
      // quede artificialmente bajo. Si ya estaba entregado el consumo es
      // real y no se restaura.
      const wasActive =
        existing.status !== "cancelled" && existing.status !== "delivered";
      if (existing.consumesInventory && wasActive) {
        await restoreDeliveryIngredients(tx, existing.items);
      }

      await tx
        .delete(deliveriesTable)
        .where(
          and(
            eq(deliveriesTable.id, params.data.id),
            tid ? eq(deliveriesTable.tenantId, tid) : undefined,
          ),
        );
    });
    if (tid !== undefined) sseBus.broadcast(tid, "deliveries_updated");
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/deliveries/:id/location", async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse(req.params);
  const { lat, lng } = req.body as { lat?: unknown; lng?: unknown };
  if (!params.success || typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "Datos de ubicación inválidos" });
    return;
  }
  const [delivery] = await db
    .update(deliveriesTable)
    .set({ deliveryLat: lat, deliveryLng: lng })
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();
  if (!delivery) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }
  res.json({ ok: true });
});

async function getTenantBySlug(
  slug: string | undefined,
): Promise<{ id: number } | null> {
  if (!slug) return null;
  const [tenant] = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  return tenant ?? null;
}

const PUBLIC_TENANT_NOT_FOUND = { error: "Empresa no encontrada" };

router.get("/public/status", async (req, res): Promise<void> => {
  const slug = req.query.tenant as string | undefined;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
    return;
  }
  if (req.query.preview === "1") {
    res.json({ isOpen: true, isPaused: false, businessHours: "", isPreview: true });
    return;
  }
  const [session] = await db
    .select({ id: cashSessionsTable.id, tenantId: cashSessionsTable.tenantId })
    .from(cashSessionsTable)
    .where(
      tenant
        ? and(
            eq(cashSessionsTable.status, "open"),
            eq(cashSessionsTable.tenantId, tenant.id),
          )
        : eq(cashSessionsTable.status, "open"),
    )
    .limit(1);
  const tenantId = tenant?.id ?? session?.tenantId ?? undefined;
  const [pausedRaw, businessHoursRaw, closedDaysRaw, closedDatesRaw] = await Promise.all([
    readSetting(tenantId, "online_paused"),
    readSetting(tenantId, "business_hours"),
    readSetting(tenantId, "service_closed_days"),
    readSetting(tenantId, "service_closed_dates"),
  ]);
  let isPaused = false;
  if (pausedRaw) {
    try {
      isPaused = JSON.parse(pausedRaw) === true;
    } catch {
      isPaused = false;
    }
  }
  let businessHours = "";
  if (businessHoursRaw) {
    try {
      businessHours = String(JSON.parse(businessHoursRaw) || "");
    } catch {
      businessHours = "";
    }
  }
  const availability = getServiceAvailability({
    closedDays: parseJsonSetting<number[]>(closedDaysRaw, []),
    specialClosures: parseJsonSetting<ServiceClosure[]>(closedDatesRaw, []),
  });
  res.json({
    isOpen: !!session && !availability.isClosed,
    isPaused,
    businessHours,
    isServiceClosed: availability.isClosed,
    closureMessage: availability.message,
  });
});

router.get("/public/products", async (req, res): Promise<void> => {
  try {
    const slug = req.query.tenant as string | undefined;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
      return;
    }

    // 1. Traemos toda la información necesaria
    const salesWhRow = await db
      .select({ id: warehousesTable.id })
      .from(warehousesTable)
      .where(
        and(
          eq(warehousesTable.tenantId, tenant.id),
          eq(warehousesTable.isSalesWarehouse, true),
        ),
      )
      .then((r) => r[0]);

    const allDeliveryProducts = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.isActive, true),
          eq(productsTable.visibleInDelivery, true),
          eq(productsTable.tenantId, tenant.id),
        ),
      );
    const allProductIds = allDeliveryProducts.map(p => p.id);
    const [tenantShifts, tenantProductShifts] = await Promise.all([
      db.select({ id: shiftsTable.id, timeFrom: shiftsTable.timeFrom, timeTo: shiftsTable.timeTo, days: shiftsTable.days, isActive: shiftsTable.isActive })
        .from(shiftsTable).where(eq(shiftsTable.tenantId, tenant.id)),
      allProductIds.length > 0
        ? db.select({ productId: productShiftsTable.productId, shiftId: productShiftsTable.shiftId })
            .from(productShiftsTable).where(inArray(productShiftsTable.productId, allProductIds))
        : Promise.resolve([]),
    ]);
    const products = allDeliveryProducts.filter(p => isProductAvailableWithShifts(p.id, tenantProductShifts, tenantShifts));

    const tenantProductIds = products.map((p) => p.id);
    const [recipes, openOrders] = await Promise.all([
      tenantProductIds.length > 0
        ? db
            .select()
            .from(productRecipesTable)
            .where(inArray(productRecipesTable.productId, tenantProductIds))
        : Promise.resolve([]),
      db
        .select({ id: restaurantOrdersTable.id })
        .from(restaurantOrdersTable)
        .innerJoin(
          restaurantTablesTable,
          eq(restaurantOrdersTable.tableId, restaurantTablesTable.id),
        )
        .where(
          and(
            eq(restaurantOrdersTable.status, "open"),
            eq(restaurantTablesTable.tenantId, tenant.id),
          ),
        ),
    ]);

    // Stock real de la bodega de ventas (fuente de verdad para productos con receta).
    let salesWhStockMap = new Map<number, number>();
    if (salesWhRow) {
      const whRows = await db
        .select()
        .from(ingredientWarehouseStockTable)
        .where(eq(ingredientWarehouseStockTable.warehouseId, salesWhRow.id));
      for (const r of whRows)
        salesWhStockMap.set(Number(r.ingredientId), Number(r.qty));
    }

    const openOrderIds = openOrders.map((o) => o.id);
    const openOrderItems =
      openOrderIds.length > 0
        ? await db
            .select()
            .from(restaurantOrderItemsTable)
            .where(inArray(restaurantOrderItemsTable.orderId, openOrderIds))
        : [];

    // 2. Ingredientes "prometidos" en mesas abiertas (se descuentan del disponible)
    const committedIngredients = new Map<number, number>();
    const committedProducts = new Map<number, number>();

    for (const item of openOrderItems) {
      const pId = Number(item.productId);
      const qty = Number(item.quantity) || 0;
      committedProducts.set(pId, (committedProducts.get(pId) || 0) + qty);
      const itemRecipes = recipes.filter((r) => Number(r.productId) === pId);
      for (const r of itemRecipes) {
        const ingId = Number(r.ingredientId);
        const reqQty = Number(r.quantity) || 0;
        committedIngredients.set(
          ingId,
          (committedIngredients.get(ingId) || 0) + reqQty * qty,
        );
      }
    }

    // 3. Disponibilidad real usando bodega de ventas (no ingredients.stock viejo)
    const adjustedProducts = products.map((prod) => {
      const pId = Number(prod.id);
      const productRecipes = recipes.filter((r) => Number(r.productId) === pId);
      let available = 0;

      if (productRecipes.length > 0) {
        // Disponibilidad = ingrediente más escaso en la bodega de ventas
        let minUnits = Infinity;
        for (const r of productRecipes) {
          const ingId = Number(r.ingredientId);
          const whQty = salesWhStockMap.get(ingId) ?? 0;
          const committed = committedIngredients.get(ingId) || 0;
          const effectiveStock = Math.max(0, whQty - committed);
          const units = Math.floor(effectiveStock / Number(r.quantity));
          if (units < minUnits) minUnits = units;
        }
        available = minUnits === Infinity ? 0 : minUnits;
      } else {
        // Sin receta: usa stock directo del producto
        const committed = committedProducts.get(pId) || 0;
        available = Math.max(0, Number(prod.stock) - committed);
      }

      return { ...prod, stock: available };
    });
    // Nota: NO filtramos los agotados — el frontend muestra badge "Agotado" para stock=0.

    res.json(adjustedProducts);
  } catch (error) {
    req.log.error({ err: error }, "Error en disponibilidad pública");
    res.status(500).json({ error: "Error al cargar el menú" });
  }
});
// --- BUSCAR CLIENTE POR TELÉFONO DESDE LA TIENDA ---
router.get("/public/customer", async (req, res): Promise<void> => {
  const phone = req.query.phone as string | undefined;
  const slug = req.query.tenant as string | undefined;
  if (!phone) {
    res.status(400).json({ error: "Falta el teléfono" });
    return;
  }
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
    return;
  }
  const [customer] = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      phone: customersTable.phone,
      address: customersTable.address,
    })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.phone, phone),
        eq(customersTable.tenantId, tenant.id),
      ),
    )
    .limit(1);
  if (!customer) {
    res.json(null);
    return;
  }
  res.json(customer);
});

// --- REGISTRAR CLIENTE DESDE LA TIENDA ---
router.post("/public/customer", async (req, res): Promise<void> => {
  try {
    const {
      name,
      phone,
      document,
      address,
      reference,
      email,
      birthdate,
      tenant: tenantSlug,
    } = req.body;

    if (!name || !phone || !document || !address || !reference) {
      res
        .status(400)
        .json({ error: "Faltan datos obligatorios para el registro" });
      return;
    }

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
      return;
    }

    const [newCustomer] = await db
      .insert(customersTable)
      .values({
        name,
        phone,
        cedula: document,
        address,
        reference,
        email: email || null,
        birthdate: birthdate || null,
        tenantId: tenant.id,
      })
      .returning();

    res.status(201).json({
      id: newCustomer.id,
      name: newCustomer.name,
      phone: newCustomer.phone,
      address: newCustomer.address,
      cedula: newCustomer.cedula,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res
        .status(400)
        .json({
          error: "Este número de teléfono o documento ya está registrado.",
        });
      return;
    }
    res
      .status(500)
      .json({ error: "Hubo un problema interno al guardar tus datos." });
  }
});

// --- CONFIGURACIÓN DE DOMICILIOS (pública) ---
router.get("/public/delivery-settings", async (req, res): Promise<void> => {
  const slug = req.query.tenant as string | undefined;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
    return;
  }
  const tid = tenant.id;
  const [feeRaw, freeDaysRaw, companyNameRaw, closedDaysRaw, closedDatesRaw] = await Promise.all([
    readSetting(tid, "delivery_fee_default"),
    readSetting(tid, "delivery_free_days"),
    readSetting(tid, "company_name"),
    readSetting(tid, "service_closed_days"),
    readSetting(tid, "service_closed_dates"),
  ]);
  const deliveryFeeDefault = feeRaw ? Number(JSON.parse(feeRaw)) : 0;
  let deliveryFreeDays: number[] = [];
  try {
    deliveryFreeDays = freeDaysRaw ? JSON.parse(freeDaysRaw) : [];
  } catch {
    deliveryFreeDays = [];
  }
  let companyName = "FYRO APP";
  try {
    if (companyNameRaw)
      companyName = String(JSON.parse(companyNameRaw) || companyName);
  } catch {
    /* noop */
  }
  const serviceClosedDays = parseJsonSetting<number[]>(closedDaysRaw, []);
  const serviceClosedDates = parseJsonSetting<ServiceClosure[]>(closedDatesRaw, []);
  const availability = getServiceAvailability({
    closedDays: serviceClosedDays,
    specialClosures: serviceClosedDates,
  });
  const effectiveDelivery = getEffectiveDeliveryFee(
    deliveryFeeDefault,
    deliveryFreeDays,
    availability,
  );
  res.json({
    deliveryFeeDefault,
    deliveryFeeToday: effectiveDelivery.fee,
    deliveryFreeDays,
    isFreeDeliveryDay: effectiveDelivery.isFree,
    serviceClosedDays,
    serviceClosedDates,
    isServiceClosed: availability.isClosed,
    closureMessage: availability.message,
    companyName,
  });
});

// --- BRANDING PÚBLICO DE LA TIENDA ---
router.get("/public/branding", async (req, res): Promise<void> => {
  const slug = req.query.tenant as string | undefined;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
    return;
  }
  const tid = tenant.id;

  // 1. Extraemos TODOS los campos desde la BD
  const [
    primaryRaw,
    accentRaw,
    bgRaw,
    textRaw,
    bgImageRaw,
    logoRaw,
    companyNameRaw,
  ] = await Promise.all([
    readSetting(tid, "store_primary_color"),
    readSetting(tid, "store_accent_color"),
    readSetting(tid, "store_bg_color"),
    readSetting(tid, "store_text_color"),
    readSetting(tid, "store_bg_image_url"),
    readSetting(tid, "store_logo_url"),
    readSetting(tid, "company_name"),
  ]);

  const parseColor = (raw: string | null, fallback: string) => {
    if (!raw) return fallback;
    try {
      return String(JSON.parse(raw) || fallback);
    } catch {
      return raw;
    }
  };

  const parseString = (raw: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed ? String(parsed) : null;
    } catch {
      return raw;
    }
  };

  let companyName = "FYRO APP";
  try {
    if (companyNameRaw)
      companyName = String(JSON.parse(companyNameRaw) || companyName);
  } catch {
    /* noop */
  }

  // 2. Devolvemos TODO al cliente en el formato esperado
  res.json({
    store_primary_color: parseColor(primaryRaw, "#2563eb"),
    store_accent_color: parseColor(accentRaw, "#1d4ed8"),
    store_bg_color: parseColor(bgRaw, "#f8fafc"),
    store_text_color: parseColor(textRaw, "#0f172a"),
    store_bg_image_url: parseString(bgImageRaw),
    store_logo_url: parseString(logoRaw),
    companyName,
  });
});

// --- STOCK OPERATIVO PÚBLICO (para bloquear productos en la tienda online) ---
router.get("/public/sitemap.xml", async (_req, res): Promise<void> => {
  const BASE_URL = process.env.CANONICAL_ORIGIN ?? "https://app.fyro.co";
  const now = new Date().toISOString().split("T")[0];

  // Canonical policy: /pedido is the single indexed gateway for the storefront.
  // Tenant-specific /pedido/:slug URLs are reached via direct links (QR codes,
  // social media) from each tenant's own channels — not through search indexing.
  // Including slug URLs here would contradict the /pedido canonical injected into
  // the initial HTML for those routes, sending mixed signals to crawlers.
  const allUrls = [
    { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "monthly" },
    { loc: `${BASE_URL}/menu`, priority: "0.8", changefreq: "weekly" },
    { loc: `${BASE_URL}/pedido`, priority: "0.8", changefreq: "weekly" },
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...allUrls.map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    ),
    `</urlset>`,
  ].join("\n");

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

router.get("/public/op-stock", async (req, res): Promise<void> => {
  const slug = req.query.tenant as string | undefined;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    res.set("Cache-Control", "no-store");
    res.json({ blockedProductIds: [], productQtyLimits: {} });
    return;
  }
  res.set("Cache-Control", "no-store");
  const result = await buildOperationalStockResponse(tenant.id);
  const blockedProductIds = Object.entries(result.productQtyLimits)
    .filter(([, v]) => v <= 0)
    .map(([k]) => Number(k));
  res.json({ blockedProductIds, productQtyLimits: result.productQtyLimits });
});

// --- CREAR PEDIDO ONLINE (público) ---
// --- CREAR PEDIDO ONLINE (público) ---
router.post("/public/orders", async (req, res): Promise<void> => {
  try {
    const { tenant: tenantSlug, ...rest } = req.body;

    // ESTA ES LA LÍNEA QUE DEBES AGREGAR:
    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      res.status(404).json(PUBLIC_TENANT_NOT_FOUND);
      return;
    }

    const [closedDaysRaw, closedDatesRaw, feeRaw, freeDaysRaw] =
      await Promise.all([
        readSetting(tenant.id, "service_closed_days"),
        readSetting(tenant.id, "service_closed_dates"),
        readSetting(tenant.id, "delivery_fee_default"),
        readSetting(tenant.id, "delivery_free_days"),
      ]);
    const availability = getServiceAvailability({
      closedDays: parseJsonSetting<number[]>(closedDaysRaw, []),
      specialClosures: parseJsonSetting<ServiceClosure[]>(closedDatesRaw, []),
    });
    if (availability.isClosed) {
      res.status(409).json({
        error: availability.message,
        code: "SERVICE_CLOSED",
      });
      return;
    }

    const parsed = CreateDeliveryBody.safeParse({
      ...rest,
      consumesInventory: true,
    });

    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
      return;
    }

    let requestedItems: Array<{
      productId: number;
      qty: number;
      notes?: string;
    }>;
    try {
      requestedItems = z
        .array(
          z.object({
            productId: z.coerce.number().int().positive(),
            qty: z.coerce.number().int().positive().max(99),
            notes: z.string().trim().max(500).optional(),
          }),
        )
        .min(1)
        .max(100)
        .parse(JSON.parse(parsed.data.items));
    } catch {
      res.status(400).json({ error: "Los productos del pedido no son válidos" });
      return;
    }
    const productIds = Array.from(
      new Set(requestedItems.map((item) => item.productId)),
    );
    const orderProducts = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        price: productsTable.price,
        isActive: productsTable.isActive,
        visibleInDelivery: productsTable.visibleInDelivery,
      })
      .from(productsTable)
      .where(
        and(
          inArray(productsTable.id, productIds),
          eq(productsTable.tenantId, tenant.id),
        ),
      );
    const productsById = new Map(
      orderProducts.map((product) => [product.id, product]),
    );
    if (
      requestedItems.some((item) => {
        const product = productsById.get(item.productId);
        return !product || !product.isActive || !product.visibleInDelivery;
      })
    ) {
      res.status(409).json({
        error: "Uno o más productos ya no están disponibles para domicilio",
      });
      return;
    }
    const canonicalItems = requestedItems.map((item) => {
      const product = productsById.get(item.productId)!;
      return {
        productId: product.id,
        name: product.name,
        qty: item.qty,
        price: Number(product.price),
        ...(item.notes ? { notes: item.notes } : {}),
      };
    });
    const subtotal = canonicalItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const requestedBonusCode = String(req.body.appliedBonusCode ?? "").trim();
    if (requestedBonusCode) {
      res.status(400).json({
        error: "Los bonos requieren verificación del cliente y no están disponibles en pedidos públicos",
      });
      return;
    }

    const delivery = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(543, ${tenant.id})`);
      const settingNames = [
        "service_closed_days",
        "service_closed_dates",
        "delivery_fee_default",
        "delivery_free_days",
      ];
      const prefixedSettingNames = settingNames.map(
        (key) => `t${tenant.id}__${key}`,
      );
      const liveSettingRows = await tx
        .select({ key: appSettingsTable.key, value: appSettingsTable.value })
        .from(appSettingsTable)
        .where(
          inArray(appSettingsTable.key, [
            ...prefixedSettingNames,
            ...settingNames,
          ]),
        );
      const liveSetting = (key: string): string | null =>
        liveSettingRows.find((row) => row.key === `t${tenant.id}__${key}`)
          ?.value ??
        liveSettingRows.find((row) => row.key === key)?.value ??
        null;
      const liveAvailability = getServiceAvailability({
        closedDays: parseJsonSetting<number[]>(
          liveSetting("service_closed_days"),
          [],
        ),
        specialClosures: parseJsonSetting<ServiceClosure[]>(
          liveSetting("service_closed_dates"),
          [],
        ),
      });
      if (liveAvailability.isClosed) {
        throw Object.assign(new Error(liveAvailability.message ?? "No hay servicio hoy."), {
          httpStatus: 409,
        });
      }
      const liveDelivery = getEffectiveDeliveryFee(
        Number(
          parseJsonSetting<number>(
            liveSetting("delivery_fee_default"),
            0,
          ),
        ),
        parseJsonSetting<number[]>(
          liveSetting("delivery_free_days"),
          [],
        ),
        liveAvailability,
      );
      const discountAmount = 0;
      const appliedBonusCode = null;
      const canonicalOrder = {
        ...parsed.data,
        items: JSON.stringify(canonicalItems),
        subtotal,
        deliveryFee: liveDelivery.fee,
        total: Math.max(0, subtotal + liveDelivery.fee - discountAmount),
      };
      // Usamos el ID del tenant para el inventario
      const consumeError = await consumeDeliveryIngredients(
        tx,
        canonicalOrder.items,
        tenant.id 
      );

      if (consumeError) {
        throw Object.assign(new Error(consumeError.error), {
          httpStatus: consumeError.status,
        });
      }

      // CORRECCIÓN 2: Agregamos 'as any' al final del objeto para que acepte el descuento
      const [created] = await tx
        .insert(deliveriesTable)
        .values({
          ...canonicalOrder,
          discountAmount,
          appliedBonusCode,
          consumesInventory: true,
          orderNumber: nextDeliveryNumber(),
          trackingToken: generateTrackingToken(),
          tenantId: tenant.id,
        } as any) 
        .returning();

      return created;
    });

    // ── KDS Integration for public orders ────────────────────────────────────
    try {
      const VIRTUAL_TABLE_NAME = "__DOMICILIOS__";
      // SAFETY NET: delivery.tenantId is set from req.tenantId during creation.
      // isNull branch unreachable for authenticated requests; guard remains for legacy paths.
      const tenantCond = delivery.tenantId
        ? eq(restaurantTablesTable.tenantId, delivery.tenantId)
        : isNull(restaurantTablesTable.tenantId);

      let [virtualTable] = await db
        .select()
        .from(restaurantTablesTable)
        .where(and(eq(restaurantTablesTable.name, VIRTUAL_TABLE_NAME), tenantCond))
        .limit(1);

      if (!virtualTable) {
        [virtualTable] = await db
          .insert(restaurantTablesTable)
          .values({ name: VIRTUAL_TABLE_NAME, area: "Domicilios", capacity: 0, isVirtual: true, tenantId: delivery.tenantId } as any)
          .returning();
      } else if (!virtualTable.isVirtual) {
        await db
          .update(restaurantTablesTable)
          .set({ isVirtual: true })
          .where(eq(restaurantTablesTable.id, virtualTable.id));
      }

      const isTransferPayment = ["transfer", "nequi", "bancolombia"].includes(delivery.paymentMethod ?? "");
      const [kdsOrder] = await db
        .insert(restaurantOrdersTable)
        .values({
          tableId: virtualTable.id,
          serverName: delivery.customerName,
          deliveryId: delivery.id,
          status: isTransferPayment ? "awaiting_payment" : "open",
          kitchenStatus: isTransferPayment ? "hold" : "pending",
          pendingPayments: isTransferPayment
            ? [{ method: delivery.paymentMethod, amount: Number(delivery.total) }]
            : null,
          subtotal: Number(delivery.subtotal) || 0,
          tenantId: delivery.tenantId,
        } as any)
        .returning();

      const rawItems = delivery.items;
      const deliveryItems: Array<{ productId?: number; name?: string; qty?: number; price?: number; notes?: string }> =
        Array.isArray(rawItems) ? rawItems : (typeof rawItems === "string" ? JSON.parse(rawItems as string) : []);

      const kdsItems = deliveryItems.filter((it) => it.name && it.qty);
      if (kdsItems.length > 0) {
        await db.insert(restaurantOrderItemsTable).values(
          kdsItems.map((it) => ({
            orderId: kdsOrder.id,
            productId: it.productId ?? null,
            productName: it.name!,
            quantity: it.qty!,
            unitPrice: it.price ?? 0,
            lineTotal: (it.qty ?? 0) * (it.price ?? 0),
            notes: it.notes ?? null,
          } as any))
        );
      }
      // Broadcast waiting room update for transfer-payment orders
      if (["transfer", "nequi", "bancolombia"].includes(delivery.paymentMethod ?? "") && delivery.tenantId !== undefined && delivery.tenantId !== null) {
        sseBus.broadcast(delivery.tenantId, "waiting_room_updated");
      }
    } catch (kdsErr) {
      req.log?.warn({ kdsErr }, "KDS order creation failed for public order (non-fatal)");
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.status(201).json({
      ...delivery,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    });
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus ?? 500;
    res.status(httpStatus).json({ error: (err as Error).message });
  }
});
  
//-------------------

// ─── Suppliers ────────────────────────────────────────────────────────────────

router.get("/suppliers", async (req, res) => {
  const tid = req.tenantId;
  const rows = await db
    .select()
    .from(suppliersTable)
    .where(tid ? eq(suppliersTable.tenantId, tid) : undefined)
    .orderBy(asc(suppliersTable.name));
  res.json(rows);
});

router.post("/suppliers", async (req, res) => {
  const parsed = insertSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(suppliersTable)
    .values({ ...parsed.data, tenantId: req.tenantId })
    .returning();
  res.status(201).json(created);
});

router.patch("/suppliers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const parsed = updateSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(suppliersTable)
    .set(parsed.data)
    .where(
      and(
        eq(suppliersTable.id, id),
        tid ? eq(suppliersTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.json(updated);
});

router.delete("/suppliers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [deleted] = await db
    .delete(suppliersTable)
    .where(
      and(
        eq(suppliersTable.id, id),
        tid ? eq(suppliersTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.status(204).send();
});

// ── Purchase Orders ───────────────────────────────────────────────────────────

router.get("/purchase-orders", async (req, res) => {
  const tid = req.tenantId;
  const orders = await db
    .select()
    .from(purchaseOrdersTable)
    .where(tid ? eq(purchaseOrdersTable.tenantId, tid) : undefined)
    .orderBy(desc(purchaseOrdersTable.createdAt));

  const orderIds = orders.map((o) => o.id);
  const items =
    orderIds.length > 0
      ? await db
          .select()
          .from(purchaseOrderItemsTable)
          .where(inArray(purchaseOrderItemsTable.orderId, orderIds))
      : [];

  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  res.json(orders.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })));
});

router.get("/purchase-orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [order] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.id, id),
        tid ? eq(purchaseOrdersTable.tenantId, tid) : undefined,
      ),
    );
  if (!order) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }
  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.orderId, id));
  res.json({ ...order, items });
});

router.post("/purchase-orders", async (req, res) => {
  const tid = req.tenantId;
  const { supplierId, supplierName, notes, items } = req.body as {
    supplierId?: number | null;
    supplierName?: string;
    notes?: string;
    items: Array<{
      ingredientId?: number | null;
      ingredientName: string;
      unit: string;
      quantity: number;
      unitPrice: number;
    }>;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "La orden debe tener al menos un ítem" });
    return;
  }

  const total = items.reduce(
    (s, it) => s + Number(it.quantity) * Number(it.unitPrice),
    0,
  );

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(purchaseOrdersTable)
      .values({
        supplierId: supplierId ?? null,
        supplierName: supplierName ?? "",
        notes: notes ?? null,
        total,
        tenantId: tid,
        status: "borrador",
      })
      .returning();

    const insertedItems = await tx
      .insert(purchaseOrderItemsTable)
      .values(
        items.map((it) => ({
          orderId: order.id,
          ingredientId: it.ingredientId ?? null,
          ingredientName: it.ingredientName,
          unit: it.unit,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          lineTotal:
            Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100,
        })),
      )
      .returning();

    return { ...order, items: insertedItems };
  });

  res.status(201).json(result);
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  borrador: ["enviada", "recibida"],
  enviada: ["recibida"],
  recibida: [], // terminal
};

router.patch("/purchase-orders/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const { status, warehouseId } = req.body as {
    status: "borrador" | "enviada" | "recibida";
    warehouseId?: number | null;
  };

  if (!["borrador", "enviada", "recibida"].includes(status)) {
    res
      .status(400)
      .json({
        error: "Estado inválido. Debe ser borrador, enviada o recibida.",
      });
    return;
  }

  const [current] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.id, id),
        tid ? eq(purchaseOrdersTable.tenantId, tid) : undefined,
      ),
    );
  if (!current) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  // Enforce allowed transitions
  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(status)) {
    res.status(400).json({
      error: `No se puede cambiar de "${current.status}" a "${status}". Transición no permitida.`,
    });
    return;
  }

  const resolvedWarehouseId = warehouseId ?? current.warehouseId ?? null;

  // When marking as received, update ingredient stock
  if (status === "recibida") {
    const items = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.orderId, id));
    await db.transaction(async (tx) => {
      for (const item of items) {
        if (!item.ingredientId) continue;
        // Update global ingredient stock + cost
        await tx
          .update(ingredientsTable)
          .set({
            stock: sql`${ingredientsTable.stock} + ${item.quantity}`,
            cost: sql`CASE WHEN ${item.unitPrice} > 0 THEN ${item.unitPrice} ELSE cost END`,
          })
          .where(eq(ingredientsTable.id, item.ingredientId));
        // Update per-warehouse stock if a warehouse is specified
        if (resolvedWarehouseId) {
          const [existing] = await tx
            .select()
            .from(ingredientWarehouseStockTable)
            .where(
              and(
                eq(
                  ingredientWarehouseStockTable.warehouseId,
                  resolvedWarehouseId,
                ),
                eq(
                  ingredientWarehouseStockTable.ingredientId,
                  item.ingredientId,
                ),
              ),
            );
          if (existing) {
            await tx
              .update(ingredientWarehouseStockTable)
              .set({ qty: existing.qty + item.quantity })
              .where(eq(ingredientWarehouseStockTable.id, existing.id));
          } else {
            await tx
              .insert(ingredientWarehouseStockTable)
              .values({
                warehouseId: resolvedWarehouseId,
                ingredientId: item.ingredientId,
                qty: item.quantity,
              });
          }
        }
        // Log ingredient movement
        await tx.insert(ingredientMovementsTable).values({
          type: "entrada",
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          cost: item.unitPrice,
          reason: `Orden de compra #${id}`,
          notes: `Recepción automática de orden de compra`,
          tenantId: req.tenantId ?? null,
          ...(resolvedWarehouseId
            ? { toWarehouseId: resolvedWarehouseId }
            : {}),
        });
      }
      await tx
        .update(purchaseOrdersTable)
        .set({
          status,
          ...(resolvedWarehouseId ? { warehouseId: resolvedWarehouseId } : {}),
        })
        .where(eq(purchaseOrdersTable.id, id));
    });
  } else {
    await db
      .update(purchaseOrdersTable)
      .set({ status })
      .where(eq(purchaseOrdersTable.id, id));
  }

  const [updated] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id));
  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.orderId, id));
  res.json({ ...updated, items });
});

router.delete("/purchase-orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [current] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.id, id),
        tid ? eq(purchaseOrdersTable.tenantId, tid) : undefined,
      ),
    );
  if (!current) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }
  if (current.status !== "borrador") {
    res
      .status(400)
      .json({ error: "Solo se pueden eliminar órdenes en borrador" });
    return;
  }
  await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  res.status(204).send();
});

// ─── Ingredients ──────────────────────────────────────────────────────────────

router.get("/ingredients", async (req, res) => {
  const tid = req.tenantId;
  const supplierIdParam = req.query.supplierId ? Number(req.query.supplierId) : null;
  const conditions: ReturnType<typeof eq>[] = [];
  if (tid) conditions.push(eq(ingredientsTable.tenantId, tid));
  if (supplierIdParam) conditions.push(eq(ingredientsTable.supplierId, supplierIdParam));
  const rows = await db
    .select({
      ...getTableColumns(ingredientsTable),
      lastPurchasePrice: sql<number | null>`(
        SELECT poi.unit_price
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.order_id = po.id
        WHERE poi.ingredient_id = ingredients."id"
          AND po.status = 'recibida'
        ORDER BY po.updated_at DESC
        LIMIT 1
      )`,
    })
    .from(ingredientsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(ingredientsTable.name));
  res.json(rows);
});

router.get("/ingredients/low-stock", async (req, res) => {
  const tid = req.tenantId;
  const [ingredients, recipes, suppliers] = await Promise.all([
    db
      .select()
      .from(ingredientsTable)
      .where(tid ? eq(ingredientsTable.tenantId, tid) : undefined)
      .orderBy(asc(ingredientsTable.name)),
    db
      .select({
        ingredientId: productRecipesTable.ingredientId,
        productId: productRecipesTable.productId,
      })
      .from(productRecipesTable),
    db
      .select({
        id: suppliersTable.id,
        name: suppliersTable.name,
        phone: suppliersTable.phone,
        email: suppliersTable.email,
      })
      .from(suppliersTable)
      .where(tid ? eq(suppliersTable.tenantId, tid) : undefined),
  ]);
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const productCount = new Map<number, number>();
  for (const r of recipes) {
    if (r.ingredientId == null) continue;
    const set = productCount.get(r.ingredientId) ?? 0;
    productCount.set(r.ingredientId, set + 1);
  }
  const low = ingredients
    .filter((i) => i.lowStockThreshold > 0 && i.stock <= i.lowStockThreshold)
    .map((i) => {
      const supplier = i.supplierId ? supplierMap.get(i.supplierId) : undefined;
      return {
        id: i.id,
        name: i.name,
        sku: i.sku,
        unit: i.unit,
        stock: i.stock,
        lowStockThreshold: i.lowStockThreshold,
        blockedProductsCount: productCount.get(i.id) ?? 0,
        supplierId: i.supplierId ?? null,
        supplierName: supplier?.name ?? null,
        supplierPhone: supplier?.phone ?? null,
        supplierEmail: supplier?.email ?? null,
      };
    })
    .sort((a, b) => {
      const ra = a.lowStockThreshold > 0 ? a.stock / a.lowStockThreshold : 0;
      const rb = b.lowStockThreshold > 0 ? b.stock / b.lowStockThreshold : 0;
      return ra - rb;
    });
  res.json(low);
});

router.post("/ingredients", async (req, res) => {
  const parsed = insertIngredientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(ingredientsTable)
    .values({ ...parsed.data, tenantId: req.tenantId })
    .returning();
  if (req.tenantId !== undefined)
    sseBus.broadcast(req.tenantId, "ingredients_updated");
  res.status(201).json(created);
});

router.patch("/ingredients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const parsed = updateIngredientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const updated = await db.transaction(async (tx) => {
    // Fetch current row to compute stock delta
    const [current] = await tx
      .select({ stock: ingredientsTable.stock })
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.id, id),
          tid !== undefined ? eq(ingredientsTable.tenantId, tid) : undefined,
        ),
      )
      .limit(1);
    if (!current) return null;

    const [row] = await tx
      .update(ingredientsTable)
      .set(parsed.data)
      .where(
        and(
          eq(ingredientsTable.id, id),
          tid !== undefined ? eq(ingredientsTable.tenantId, tid) : undefined,
        ),
      )
      .returning();

    // Sync stock delta to sales warehouse when stock field is explicitly set
    if (parsed.data.stock !== undefined) {
      const delta = Number(parsed.data.stock) - Number(current.stock);
      if (delta !== 0) {
        const salesWhId = await getSalesWarehouseId(tid);
        if (salesWhId !== null) {
          await tx.execute(sql`
            INSERT INTO ingredient_warehouse_stock (warehouse_id, ingredient_id, qty)
            VALUES (${salesWhId}, ${id}, ${delta})
            ON CONFLICT (warehouse_id, ingredient_id) DO UPDATE
              SET qty = GREATEST(ingredient_warehouse_stock.qty + EXCLUDED.qty, 0)
          `);
        }
      }
    }

    return row;
  });

  if (!updated) {
    res.status(404).json({ error: "Ingrediente no encontrado" });
    return;
  }
  if (req.tenantId !== undefined)
    sseBus.broadcast(req.tenantId, "ingredients_updated");
  res.json(updated);
});

router.delete("/ingredients/:id", async (req, res) => {
  const id = Number(req.params.id);
  const tid = req.tenantId;

  // Verify ownership FIRST — before any mutations
  const [existing] = await db
    .select({ id: ingredientsTable.id })
    .from(ingredientsTable)
    .where(
      and(
        eq(ingredientsTable.id, id),
        tid ? eq(ingredientsTable.tenantId, tid) : undefined,
      ),
    )
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Ingrediente no encontrado" });
    return;
  }

  // Ownership confirmed — safe to delete child rows by ingredientId
  await db
    .delete(productRecipesTable)
    .where(eq(productRecipesTable.ingredientId, id));
  await db
    .delete(ingredientWarehouseStockTable)
    .where(eq(ingredientWarehouseStockTable.ingredientId, id));
  await db
    .delete(ingredientMovementsTable)
    .where(eq(ingredientMovementsTable.ingredientId, id));
  await db.delete(ingredientsTable).where(eq(ingredientsTable.id, id));

  res.status(204).send();
});

// ─── Ingredient stock by warehouse ────────────────────────────────────────────

router.get("/ingredients/stock", async (req, res) => {
  const tid = req.tenantId;
  const rows = await db
    .select({
      id: ingredientWarehouseStockTable.id,
      warehouseId: ingredientWarehouseStockTable.warehouseId,
      warehouseName: warehousesTable.name,
      ingredientId: ingredientWarehouseStockTable.ingredientId,
      ingredientName: ingredientsTable.name,
      unit: ingredientsTable.unit,
      qty: ingredientWarehouseStockTable.qty,
      globalStock: ingredientsTable.stock,
      updatedAt: ingredientWarehouseStockTable.updatedAt,
    })
    .from(ingredientWarehouseStockTable)
    .innerJoin(
      warehousesTable,
      eq(ingredientWarehouseStockTable.warehouseId, warehousesTable.id),
    )
    .innerJoin(
      ingredientsTable,
      eq(ingredientWarehouseStockTable.ingredientId, ingredientsTable.id),
    )
    .where(tid ? eq(ingredientsTable.tenantId, tid) : undefined)
    .orderBy(asc(ingredientsTable.name));
  res.json(rows);
});

// Distributes ingredients.stock into the sales warehouse for any ingredient
// where the warehouse sum diverges from the global stock.
router.post("/ingredients/sync-warehouse-stock", async (req, res) => {
  const tid = req.tenantId;
  const salesWhId = await getSalesWarehouseId(tid);
  if (!salesWhId) {
    res.status(400).json({ error: "No hay bodega de ventas activa configurada." });
    return;
  }

  // Fetch all ingredients and their current warehouse totals
  const ingredients = await db
    .select({ id: ingredientsTable.id, globalStock: ingredientsTable.stock })
    .from(ingredientsTable)
    .where(tid ? eq(ingredientsTable.tenantId, tid) : undefined);

  const whTotals = await db
    .select({
      ingredientId: ingredientWarehouseStockTable.ingredientId,
      total: sql<number>`SUM(${ingredientWarehouseStockTable.qty})`,
    })
    .from(ingredientWarehouseStockTable)
    .innerJoin(
      ingredientsTable,
      eq(ingredientWarehouseStockTable.ingredientId, ingredientsTable.id),
    )
    .where(tid ? eq(ingredientsTable.tenantId, tid) : undefined)
    .groupBy(ingredientWarehouseStockTable.ingredientId);

  const whMap = new Map(whTotals.map((r) => [r.ingredientId, Number(r.total)]));

  let synced = 0;
  await db.transaction(async (tx) => {
    for (const ing of ingredients) {
      const globalStock = Number(ing.globalStock);
      const whTotal = whMap.get(ing.id) ?? 0;
      const delta = globalStock - whTotal;
      if (delta === 0) continue;
      await tx.execute(sql`
        INSERT INTO ingredient_warehouse_stock (warehouse_id, ingredient_id, qty)
        VALUES (${salesWhId}, ${ing.id}, ${delta})
        ON CONFLICT (warehouse_id, ingredient_id) DO UPDATE
          SET qty = GREATEST(ingredient_warehouse_stock.qty + EXCLUDED.qty, 0)
      `);
      synced++;
    }
  });

  if (tid !== undefined) sseBus.broadcast(tid, "ingredients_updated");
  res.json({ synced, message: `${synced} ingrediente(s) sincronizado(s) a la bodega de ventas.` });
});

// ─── Unit Conversion Helpers ─────────────────────────────────────────────────
// Factors to normalize weight → grams and volume → millilitres.
// Count units (uds, pieza, porción, etc.) form no convertible family —
// they can only be used as-is.
const WEIGHT_UNITS = ["g", "kg", "lb", "oz"] as const;
const VOLUME_UNITS = ["ml", "l", "cl"] as const;

const TO_SI: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495,
  ml: 1,
  l: 1000,
  cl: 10,
};

function unitFamily(u: string): "weight" | "volume" | "count" {
  if ((WEIGHT_UNITS as readonly string[]).includes(u)) return "weight";
  if ((VOLUME_UNITS as readonly string[]).includes(u)) return "volume";
  return "count";
}

/**
 * Returns the multiplication factor to convert `from` → `to`.
 * e.g. conversionFactor("g", "kg") = 0.001
 * Returns null when conversion is not defined (different families or unknown unit).
 */
function conversionFactor(from: string, to: string): number | null {
  if (from === to) return 1;
  if (!(from in TO_SI) || !(to in TO_SI)) return null;
  if (unitFamily(from) !== unitFamily(to) || unitFamily(from) === "count")
    return null;
  return TO_SI[from] / TO_SI[to];
}

function getCompatibleUnits(baseUnit: string): string[] {
  const family = unitFamily(baseUnit);
  if (family === "weight") return [...WEIGHT_UNITS];
  if (family === "volume") return [...VOLUME_UNITS];
  return baseUnit ? [baseUnit] : [];
}

// ─── Ingredient Movements ─────────────────────────────────────────────────────

router.get("/ingredients/movements", async (req, res) => {
  const tid = req.tenantId;
  const fromW = alias(warehousesTable, "from_w");
  const toW = alias(warehousesTable, "to_w");
  const rows = await db
    .select({
      id: ingredientMovementsTable.id,
      type: ingredientMovementsTable.type,
      quantity: ingredientMovementsTable.quantity,
      cost: ingredientMovementsTable.cost,
      taxPercent: ingredientMovementsTable.taxPercent,
      paymentMethod: ingredientMovementsTable.paymentMethod,
      reason: ingredientMovementsTable.reason,
      notes: ingredientMovementsTable.notes,
      createdBy: ingredientMovementsTable.createdBy,
      createdAt: ingredientMovementsTable.createdAt,
      ingredientId: ingredientMovementsTable.ingredientId,
      ingredientName: ingredientsTable.name,
      ingredientUnit: ingredientsTable.unit,
      fromWarehouseId: ingredientMovementsTable.fromWarehouseId,
      fromWarehouseName: fromW.name,
      toWarehouseId: ingredientMovementsTable.toWarehouseId,
      toWarehouseName: toW.name,
      invoicePhotoUrl: ingredientMovementsTable.invoicePhotoUrl,
      purchasedQty: ingredientMovementsTable.purchasedQty,
      purchaseUnit: ingredientMovementsTable.purchaseUnit,
    })
    .from(ingredientMovementsTable)
    .innerJoin(
      ingredientsTable,
      eq(ingredientMovementsTable.ingredientId, ingredientsTable.id),
    )
    .leftJoin(fromW, eq(ingredientMovementsTable.fromWarehouseId, fromW.id))
    .leftJoin(toW, eq(ingredientMovementsTable.toWarehouseId, toW.id))
    .where(
      and(
        tid ? eq(ingredientsTable.tenantId, tid) : undefined,
        req.query.type
          ? eq(ingredientMovementsTable.type, req.query.type as string)
          : undefined,
      ),
    )
    .orderBy(desc(ingredientMovementsTable.createdAt))
    .limit(300);
  res.json(rows);
});

router.post("/ingredients/movements", async (req, res) => {
  const parsed = insertIngredientMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { type, ingredientId, fromWarehouseId, toWarehouseId, quantity } =
    parsed.data;

  if (!["entrada", "salida", "traslado"].includes(type)) {
    res
      .status(400)
      .json({ error: "Tipo inválido. Debe ser entrada, salida o traslado." });
    return;
  }
  if (type === "entrada" && !toWarehouseId) {
    res
      .status(400)
      .json({ error: "Se requiere bodega destino para una entrada." });
    return;
  }
  if (type === "salida" && !fromWarehouseId) {
    res
      .status(400)
      .json({ error: "Se requiere bodega origen para una salida." });
    return;
  }
  if (type === "traslado" && (!fromWarehouseId || !toWarehouseId)) {
    res.status(400).json({
      error: "Se requieren bodega origen y destino para un traslado.",
    });
    return;
  }
  if (type === "traslado" && fromWarehouseId === toWarehouseId) {
    res
      .status(400)
      .json({ error: "Bodega origen y destino deben ser distintas." });
    return;
  }
  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: "La cantidad debe ser mayor a cero." });
    return;
  }

  // ── Unit conversion ─────────────────────────────────────────────────────────
  // `inputUnit` is an optional field sent by the frontend when the user enters
  // a quantity in a unit different from the ingredient's base unit (e.g. 500 g
  // when the ingredient is stored in kg). The backend converts before writing
  // so that all stock values are always in the ingredient's own base unit.
  const inputUnit = (req.body as Record<string, unknown>).inputUnit as
    | string
    | undefined;

  try {
    const result = await db.transaction(async (tx) => {
      const singleTid = req.tenantId;
      const [ingredient] = await tx
        .select()
        .from(ingredientsTable)
        .where(
          and(
            eq(ingredientsTable.id, ingredientId),
            singleTid !== undefined ? eq(ingredientsTable.tenantId, singleTid) : undefined
          )
        );
      if (!ingredient) throw new Error("Ingrediente no encontrado");

      // Resolve conversion factor and compute the quantity in base units.
      let convertedQty = quantity;
      const effectiveInputUnit = inputUnit ?? ingredient.unit;
      if (effectiveInputUnit !== ingredient.unit) {
        const factor = conversionFactor(effectiveInputUnit, ingredient.unit);
        if (factor === null) {
          throw new Error(
            `No existe conversión de "${effectiveInputUnit}" a "${ingredient.unit}". ` +
              `Usa la unidad base del ingrediente o una unidad compatible (${getCompatibleUnits(
                ingredient.unit,
              ).join(", ")}).`,
          );
        }
        convertedQty = quantity * factor;
      }

      // Atomic upsert: avoids SELECT→write race condition (see product batch endpoint).
      const upsertStock = async (warehouseId: number, delta: number) => {
        const rows = await tx.execute(sql`
          INSERT INTO ingredient_warehouse_stock (warehouse_id, ingredient_id, qty)
          VALUES (${warehouseId}, ${ingredientId}, ${delta})
          ON CONFLICT (warehouse_id, ingredient_id) DO UPDATE
            SET qty = ingredient_warehouse_stock.qty + EXCLUDED.qty
          RETURNING qty
        `);
        const newQty = (rows.rows[0] as { qty: number }).qty;
        if (newQty < 0)
          throw new Error("Stock insuficiente en la bodega seleccionada.");
      };

      if (type === "entrada") {
        await upsertStock(toWarehouseId!, convertedQty);
        await tx
          .update(ingredientsTable)
          .set({ stock: sql`${ingredientsTable.stock} + ${convertedQty}` })
          .where(eq(ingredientsTable.id, ingredientId));
      } else if (type === "salida") {
        if (ingredient.stock < convertedQty)
          throw new Error("Stock global insuficiente.");
        await upsertStock(fromWarehouseId!, -convertedQty);
        await tx
          .update(ingredientsTable)
          .set({ stock: sql`${ingredientsTable.stock} - ${convertedQty}` })
          .where(eq(ingredientsTable.id, ingredientId));
      } else if (type === "traslado") {
        await upsertStock(fromWarehouseId!, -convertedQty);
        await upsertStock(toWarehouseId!, convertedQty);
      }

      // Store the movement with the already-converted quantity (always in base units).
      const invoicePhotoUrl = (req.body as Record<string, unknown>)
        .invoicePhotoUrl as string | undefined;
      const purchasedQty = (req.body as Record<string, unknown>)
        .purchasedQty as number | undefined;
      const purchaseUnitIn = (req.body as Record<string, unknown>)
        .purchaseUnit as string | undefined;
      const [movement] = await tx
        .insert(ingredientMovementsTable)
        .values({
          ...parsed.data,
          quantity: convertedQty,
          tenantId: req.tenantId ?? null,
          ...(invoicePhotoUrl ? { invoicePhotoUrl } : {}),
          ...(purchasedQty ? { purchasedQty } : {}),
          ...(purchaseUnitIn ? { purchaseUnit: purchaseUnitIn } : {}),
        })
        .returning();

      // Registrar egreso cuando hay costo y método de pago real.
      // - "entrada": cualquier método de pago con costo genera un egreso.
      // - "salida" con "ledger": cargo al Libro Mayor — si no hay costo registra $0.
      // - "traslado": NUNCA genera egreso (los traslados no tienen costo contable).
      const isLedger = parsed.data.paymentMethod === "ledger";
      const shouldCreateExpense =
        type !== "traslado" &&
        parsed.data.paymentMethod &&
        (type === "entrada" ? (parsed.data.cost ?? 0) > 0 : isLedger);

      if (shouldCreateExpense) {
        const costPerUnit = parsed.data.cost ?? 0;
        // cost is per base unit; multiply by the converted (base-unit) quantity.
        const subtotal = costPerUnit * convertedQty;
        const taxAmt = subtotal * ((parsed.data.taxPercent ?? 0) / 100);
        const movTypeLabel = type === "entrada" ? "Compra" : "Salida";
        const displayQty =
          effectiveInputUnit !== ingredient.unit
            ? `${quantity} ${effectiveInputUnit} = ${convertedQty.toFixed(4)} ${ingredient.unit}`
            : `${convertedQty} ${ingredient.unit}`;
        // When paymentMethod === "ledger", ledgerAccountType carries the specific account
        // (cash | transfer | card). This determines which section of the Libro Mayor
        // receives the expense entry.
        const ledgerAccountType = (req.body as Record<string, unknown>)
          .ledgerAccountType;
        const payMethod = isLedger
          ? ["cash", "transfer", "card"].includes(String(ledgerAccountType))
            ? String(ledgerAccountType)
            : "transfer"
          : parsed.data.paymentMethod!;
        const suffix = isLedger ? " [Libro Mayor]" : "";
        await tx.insert(expensesTable).values({
          description: `${movTypeLabel} ingrediente: ${ingredient.name} (×${displayQty})${suffix}`,
          category: "supplies",
          amount: subtotal + taxAmt,
          paymentMethod: payMethod,
          tenantId: req.tenantId ?? null,
        });
      }

      return movement;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ─── Product Recipes ──────────────────────────────────────────────────────────

router.get("/products/:id/recipe", async (req, res) => {
  const productId = Number(req.params.id);
  if (!productId) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const inputProductAlias = alias(productsTable, "input_product");
  const rows = await db
    .select({
      id: productRecipesTable.id,
      productId: productRecipesTable.productId,
      ingredientId: productRecipesTable.ingredientId,
      inputProductId: productRecipesTable.inputProductId,
      quantity: productRecipesTable.quantity,
      ingredientName: ingredientsTable.name,
      ingredientUnit: ingredientsTable.unit,
      ingredientCost: ingredientsTable.cost,
      inputProductName: inputProductAlias.name,
      inputProductUnit: inputProductAlias.unit,
    })
    .from(productRecipesTable)
    .leftJoin(
      ingredientsTable,
      eq(productRecipesTable.ingredientId, ingredientsTable.id),
    )
    .leftJoin(
      inputProductAlias,
      eq(productRecipesTable.inputProductId, inputProductAlias.id),
    )
    .where(eq(productRecipesTable.productId, productId));
  res.json(rows);
});

router.put("/products/:id/recipe", async (req, res) => {
  const productId = Number(req.params.id);
  if (!productId) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) {
    res.status(400).json({ error: "items array requerido" });
    return;
  }
  const validRows = items
    .map(
      (it: {
        ingredientId?: number | null;
        inputProductId?: number | null;
        quantity: number;
      }) => {
        const hasIngredient =
          it.ingredientId != null &&
          Number.isFinite(Number(it.ingredientId)) &&
          Number(it.ingredientId) > 0;
        const hasInputProduct =
          it.inputProductId != null &&
          Number.isFinite(Number(it.inputProductId)) &&
          Number(it.inputProductId) > 0;
        return {
          productId,
          ingredientId: hasIngredient ? Number(it.ingredientId) : null,
          inputProductId: hasInputProduct ? Number(it.inputProductId) : null,
          quantity: Number(it.quantity),
        };
      },
    )
    .filter(
      (r: {
        ingredientId: number | null;
        inputProductId: number | null;
        quantity: number;
      }) =>
        (r.ingredientId != null || r.inputProductId != null) && r.quantity > 0,
    );
  // Receta obligatoria: debe haber al menos un input válido
  if (validRows.length === 0) {
    res.status(400).json({
      error:
        "La receta es obligatoria. Agrega al menos un ingrediente o producto intermedio con cantidad mayor a 0.",
    });
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(productRecipesTable)
      .where(eq(productRecipesTable.productId, productId));
    await tx.insert(productRecipesTable).values(validRows);
    await tx
      .update(productsTable)
      .set({ hasRecipe: true })
      .where(eq(productsTable.id, productId));
  });
  res.status(204).send();
});

// ─── Categories ───────────────────────────────────────────────────────────────

router.get("/categories", async (req, res) => {
  const tid = req.tenantId;
  const rows = await db
    .select()
    .from(categoriesTable)
    .where(tid ? eq(categoriesTable.tenantId, tid) : undefined)
    .orderBy(asc(categoriesTable.name));
  res.json(rows);
});

const sanitizeStation = (raw: unknown): string | null => {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  return s;
};

router.post("/categories", async (req, res): Promise<void> => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "Nombre requerido" });
    return;
  }
  const description = req.body?.description
    ? String(req.body.description)
    : null;
  const station = sanitizeStation(req.body?.station) ?? DEFAULT_STATION;
  try {
    const [created] = await db
      .insert(categoriesTable)
      .values({ name, description, station, tenantId: req.tenantId })
      .returning();
    res.status(201).json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    res.status(400).json({
      error:
        msg.includes("unique") || msg.includes("duplicate")
          ? "Esa categoría ya existe"
          : msg,
    });
  }
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const newName =
    req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
  const newDescription =
    req.body?.description !== undefined
      ? req.body.description
        ? String(req.body.description)
        : null
      : undefined;
  const newStation =
    req.body?.station !== undefined
      ? sanitizeStation(req.body.station)
      : undefined;
  if (newName !== undefined && !newName) {
    res.status(400).json({ error: "Nombre requerido" });
    return;
  }
  const [existing] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }
  try {
    const updated = await db.transaction(async (tx) => {
      const patch: Record<string, unknown> = {};
      if (newName !== undefined) patch.name = newName;
      if (newDescription !== undefined) patch.description = newDescription;
      if (newStation !== undefined)
        patch.station = newStation ?? DEFAULT_STATION;
      const [row] = await tx
        .update(categoriesTable)
        .set(patch)
        .where(eq(categoriesTable.id, id))
        .returning();
      if (newName !== undefined && newName !== existing.name) {
        await tx
          .update(productsTable)
          .set({ category: newName })
          .where(eq(productsTable.category, existing.name));
      }
      return row;
    });
    res.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    res.status(400).json({
      error:
        msg.includes("unique") || msg.includes("duplicate")
          ? "Esa categoría ya existe"
          : msg,
    });
  }
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const tid = req.tenantId;
  const [deleted] = await db
    .delete(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, id),
        tid ? eq(categoriesTable.tenantId, tid) : undefined,
      ),
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }
  res.sendStatus(204);
});
router.get("/products/availability", async (req, res) => {
  try {
    const tid = req.tenantId;

    // Bodega de ventas del tenant — fuente de verdad para disponibilidad
    const salesWarehouseId = tid ? await getSalesWarehouseId(tid) : null;

    const [products, ingredients] = await Promise.all([
      tid
        ? db.select().from(productsTable).where(eq(productsTable.tenantId, tid))
        : db.select().from(productsTable),
      tid
        ? db
            .select()
            .from(ingredientsTable)
            .where(eq(ingredientsTable.tenantId, tid))
        : db.select().from(ingredientsTable),
    ]);

    // Solo recetas de productos de este tenant (no cargamos todas)
    const productIds = new Set(products.map((p) => p.id));
    const productIdList = Array.from(productIds);
    const [tenantRecipes, openOrders] = await Promise.all([
      productIdList.length > 0
        ? db
            .select()
            .from(productRecipesTable)
            .where(inArray(productRecipesTable.productId, productIdList))
        : Promise.resolve([]),
      db
        .select()
        .from(restaurantOrdersTable)
        .innerJoin(
          restaurantTablesTable,
          eq(restaurantOrdersTable.tableId, restaurantTablesTable.id),
        )
        .where(
          and(
            eq(restaurantOrdersTable.status, "open"),
            tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
          ),
        )
        .then((rows) => rows.map((r) => ({ id: r.restaurant_orders.id }))),
    ]);

    // Mapa de ingredientes por id (para nombres al reportar bloqueante)
    const ingById = new Map(ingredients.map((i) => [i.id, i]));
    const productById = new Map(products.map((product) => [product.id, product]));

    // Stock real de ingredientes: bodega de ventas > suma de bodegas > ingredients.stock
    const ingStockById = new Map(
      ingredients.map((i) => [i.id, Number(i.stock)]),
    );
    if (salesWarehouseId) {
      const whStocks = await db
        .select({
          ingredientId: ingredientWarehouseStockTable.ingredientId,
          qty: ingredientWarehouseStockTable.qty,
        })
        .from(ingredientWarehouseStockTable)
        .where(eq(ingredientWarehouseStockTable.warehouseId, salesWarehouseId));
      // Reemplazar con stock de la bodega de ventas (puede ser 0 si no hay fila)
      for (const [ingId] of ingStockById) ingStockById.set(ingId, 0);
      for (const ws of whStocks)
        ingStockById.set(Number(ws.ingredientId), Number(ws.qty));
    }

    const openOrderIds = openOrders.map((o) => o.id);
    const openOrderItems =
      openOrderIds.length > 0
        ? await db
            .select()
            .from(restaurantOrderItemsTable)
            .where(inArray(restaurantOrderItemsTable.orderId, openOrderIds))
        : [];

    // Suma de ingredientes ya comprometidos en mesas abiertas (solo este tenant)
    const committedIngredients = new Map<number, number>();
    const committedInputProducts = new Map<number, number>();
    const inventoryControlledProductIds = new Set(
      products
        .filter((product) => product.tracksInventory !== false)
        .map((product) => product.id),
    );
    for (const item of openOrderItems) {
      const pId = Number(item.productId);
      if (!inventoryControlledProductIds.has(pId)) continue;
      const qty = Number(item.quantity) || 0;
      const itemRecipes = tenantRecipes.filter(
        (r) => Number(r.productId) === pId,
      );
      for (const r of itemRecipes) {
        const reqQty = Number(r.quantity) || 0;
        if (r.ingredientId != null) {
          const ingId = Number(r.ingredientId);
          committedIngredients.set(
            ingId,
            (committedIngredients.get(ingId) || 0) + reqQty * qty,
          );
        }
        if (r.inputProductId != null) {
          const inputProductId = Number(r.inputProductId);
          committedInputProducts.set(
            inputProductId,
            (committedInputProducts.get(inputProductId) || 0) + reqQty * qty,
          );
        }
      }
    }

    const result: Record<
      string,
      { recipeAvailable: number | null; blockingIngredient: string | null }
    > = {};

    for (const product of products) {
      if (product.tracksInventory === false) {
        result[String(product.id)] = {
          recipeAvailable: null,
          blockingIngredient: null,
        };
        continue;
      }
      const recipeItems = tenantRecipes.filter(
        (r) => Number(r.productId) === product.id,
      );

      // Sin receta configurada: la disponibilidad es el stock directo cuando
      // el producto sí controla inventario.
      if (!product.hasRecipe || recipeItems.length === 0) {
        result[String(product.id)] = {
          recipeAvailable: Math.max(0, Number(product.stock)),
          blockingIngredient: null,
        };
        continue;
      }

      let minAvailable = Infinity;
      let blocking: string | null = null;

      for (const item of recipeItems) {
        let realStock: number;
        let blockingName: string;
        if (item.inputProductId != null) {
          const inputProduct = productById.get(Number(item.inputProductId));
          if (inputProduct?.tracksInventory === false) continue;
          const inputProductId = Number(item.inputProductId);
          realStock =
            Number(inputProduct?.stock ?? 0) -
            (committedInputProducts.get(inputProductId) || 0);
          blockingName = inputProduct?.name ?? "Producto intermedio";
        } else if (item.ingredientId != null) {
          const ingId = Number(item.ingredientId);
          realStock =
            (ingStockById.get(ingId) ?? 0) -
            (committedIngredients.get(ingId) || 0);
          blockingName = ingById.get(ingId)?.name ?? "Ingrediente";
        } else {
          continue;
        }
        const canMake = Math.floor(realStock / Number(item.quantity));

        if (canMake < minAvailable) {
          minAvailable = canMake;
          if (canMake <= 0) blocking = blockingName;
        }
      }

      result[String(product.id)] = {
        recipeAvailable:
          minAvailable === Infinity ? null : Math.max(0, minAvailable),
        blockingIngredient: minAvailable > 0 ? null : blocking,
      };
    }

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Error en disponibilidad");
    res.status(500).json({ error: (err as Error).message });
  }
});

// NOTA: los handlers GET y PUT de /products/:id/recipe activos están definidos
// más arriba (líneas ~4937 y ~4965). Los duplicados snake_case que existían
// aquí estaban shadow-eados por Express y, además, usaban claves snake_case
// que el modelo Drizzle (camelCase) no expone, por lo que solo causaban
// confusión. Quedaron eliminados para que la única fuente de verdad sea la
// implementación validada que enforza receta obligatoria.

router.post("/products/:id/decrement", async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id, 10);
    const quantity = req.body?.quantity || 1;

    if (isNaN(productId)) {
      res.status(400).json({ error: "ID de producto inválido" });
      return;
    }

    await db
      .update(productsTable)
      .set({
        stock: sql`${productsTable.stock} - ${quantity}`,
      })
      .where(eq(productsTable.id, productId));

    res.json({ success: true, message: "Inventario mermado con éxito" });
  } catch (error) {
    req.log.error({ err: error }, "Error mermando inventario");
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── PAYMENT RECEIPTS (Comprobantes de pago) ──────────────────────────────────

// ── Encryption helpers for Gmail OAuth tokens ────────────────────────────────
// Tokens are encrypted with AES-256-GCM before storing in app_settings.
const GMAIL_ENC_ALGORITHM = "aes-256-gcm" as const;
function getEncKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret)
    throw new Error(
      "SESSION_SECRET is not configured; Gmail token encryption unavailable",
    );
  return crypto.scryptSync(secret, "cocina-pro-gmail-v1", 32);
}
function encryptGmailTokens(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(GMAIL_ENC_ALGORITHM, getEncKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    data: encrypted.toString("base64"),
    tag: tag.toString("base64"),
  });
}
function decryptGmailTokens(stored: string): string {
  const { iv, data, tag } = JSON.parse(stored) as {
    iv: string;
    data: string;
    tag: string;
  };
  const decipher = crypto.createDecipheriv(
    GMAIL_ENC_ALGORITHM,
    getEncKey(),
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return decipher.update(Buffer.from(data, "base64")) + decipher.final("utf8");
}

/** ±window for fuzzy same-amount dedup when no reference is present */
const FUZZY_DEDUP_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours — covers delayed SMS-to-email forwards

async function insertReceiptIfNotDuplicate(
  tenantId: number,
  source: string,
  sourceId: string | null,
  parsed: {
    bank: string;
    amount: number | null;
    reference: string | null;
    senderName: string | null;
    senderContact: string | null;
    rawContent: string;
    dedupHash: string | null;
    direction?: "received" | "sent" | null;
  },
  receivedAt: Date,
  /** When true, discarded/manually-deleted receipts are allowed to be re-inserted */
  force = false,
): Promise<{ inserted: boolean; id?: number }> {
  // 1. Hash-based cross-source dedup (requires amount + reference)
  if (parsed.dedupHash) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const conditions = [
      eq(paymentReceiptsTable.tenantId, tenantId),
      eq(paymentReceiptsTable.dedupHash, parsed.dedupHash),
      gte(paymentReceiptsTable.createdAt, since),
      // In force mode, only active (non-discarded) records count as real duplicates
      ...(force ? [ne(paymentReceiptsTable.status, "discarded")] : []),
    ];
    const existing = await db
      .select({ id: paymentReceiptsTable.id, direction: paymentReceiptsTable.direction })
      .from(paymentReceiptsTable)
      .where(and(...conditions))
      .limit(1);
    if (existing.length > 0) {
      // Correct a previously mis-classified direction only when the filter override
      // is corroborated by content analysis. This prevents filter-order accidents
      // (payment_received matching first) from overwriting admin-corrected values.
      const stored = existing[0];
      if (
        parsed.direction != null &&
        stored.direction !== parsed.direction &&
        detectDirection(parsed.rawContent) === parsed.direction
      ) {
        await db
          .update(paymentReceiptsTable)
          .set({ direction: parsed.direction })
          .where(eq(paymentReceiptsTable.id, stored.id));
      }
      return { inserted: false };
    }
  }

  // 2. Source-specific dedup — prevents reprocessing the exact same raw message
  if (sourceId) {
    const conditions = [
      eq(paymentReceiptsTable.tenantId, tenantId),
      eq(paymentReceiptsTable.source, source),
      eq(paymentReceiptsTable.sourceId, sourceId),
      // In force mode, treat discarded records as absent so they can be re-fetched
      ...(force ? [ne(paymentReceiptsTable.status, "discarded")] : []),
    ];
    const existing = await db
      .select({ id: paymentReceiptsTable.id, direction: paymentReceiptsTable.direction })
      .from(paymentReceiptsTable)
      .where(and(...conditions))
      .limit(1);
    if (existing.length > 0) {
      // Correct a previously mis-classified direction only when the filter override
      // is corroborated by content analysis. This prevents filter-order accidents
      // (payment_received matching first) from overwriting admin-corrected values.
      const stored = existing[0];
      if (
        parsed.direction != null &&
        stored.direction !== parsed.direction &&
        detectDirection(parsed.rawContent) === parsed.direction
      ) {
        await db
          .update(paymentReceiptsTable)
          .set({ direction: parsed.direction })
          .where(eq(paymentReceiptsTable.id, stored.id));
      }
      return { inserted: false };
    }
  }

  // 3. Fuzzy time-window dedup — catches same payment arriving via both Gmail
  //    AND SMS when no reference is parseable (so dedupHash is null).
  //    If a receipt with the same tenant, bank, and amount already exists within
  //    ±FUZZY_DEDUP_WINDOW_MS of the incoming receivedAt, treat it as a dup.
  if (!parsed.dedupHash && parsed.amount !== null) {
    const windowStart = new Date(receivedAt.getTime() - FUZZY_DEDUP_WINDOW_MS);
    const windowEnd = new Date(receivedAt.getTime() + FUZZY_DEDUP_WINDOW_MS);
    const amountStr = parsed.amount.toFixed(2);
    // Match on same bank OR null bank — one source may fail bank detection
    // while the other succeeds; both still represent the same real payment.
    // When parsed.bank is "otro" (domain unrecognized, e.g. forwarded SMS via Gmail),
    // relax the bank constraint entirely and rely on amount + time window — the body
    // text bank-detection fix above already corrects the bank for future inserts, but
    // pre-existing records may still have mismatched banks.
    const bankCondition =
      parsed.bank && parsed.bank !== "otro"
        ? sql`(${paymentReceiptsTable.bank} = ${parsed.bank} OR ${paymentReceiptsTable.bank} IS NULL OR ${paymentReceiptsTable.bank} = 'otro')`
        : sql`1=1`;
    const conditions = [
      eq(paymentReceiptsTable.tenantId, tenantId),
      gte(paymentReceiptsTable.receivedAt, windowStart),
      lte(paymentReceiptsTable.receivedAt, windowEnd),
      sql`${paymentReceiptsTable.amount}::numeric = ${amountStr}::numeric`,
      bankCondition,
      ...(force ? [ne(paymentReceiptsTable.status, "discarded")] : []),
    ];
    const existing = await db
      .select({ id: paymentReceiptsTable.id })
      .from(paymentReceiptsTable)
      .where(and(...conditions))
      .limit(1);
    if (existing.length > 0) return { inserted: false };
  }

  // Convert amount to string for NUMERIC(14,2) column (Drizzle requirement)
  const amountStr = parsed.amount !== null ? parsed.amount.toFixed(2) : null;

  const [row] = await db
    .insert(paymentReceiptsTable)
    .values({
      tenantId,
      source,
      sourceId,
      bank: parsed.bank,
      amount: amountStr,
      reference: parsed.reference,
      senderName: parsed.senderName,
      senderContact: parsed.senderContact,
      rawContent: parsed.rawContent,
      receivedAt,
      status: "pending",
      direction: parsed.direction ?? null,
      dedupHash: parsed.dedupHash,
    })
    .returning({ id: paymentReceiptsTable.id });

  return { inserted: true, id: row?.id };
}

// Helper: decode a base64url-encoded Gmail message part
function decodeGmailPart(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

// GET /api/payment-receipts/gmail/auth-url — returns Google OAuth URL
// Uses a server-side nonce as the OAuth `state` to prevent tenant-ID injection.
router.get(
  "/payment-receipts/gmail/auth-url",
  async (req, res): Promise<void> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res
        .status(503)
        .json({
          error:
            "Gmail no configurado. Contacta al administrador para agregar GOOGLE_CLIENT_ID.",
        });
      return;
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }

    // Generate a one-time nonce and store it server-side mapped to tenantId
    const nonce = crypto.randomBytes(24).toString("hex");
    // Store the nonce with a 10-minute TTL (checked on callback)
    await writeSetting(
      tenantId,
      `gmail_oauth_nonce_${nonce}`,
      `${Date.now() + 10 * 60 * 1000}`,
    );

    const gmailCallbackBase = process.env.GMAIL_CALLBACK_BASE_URL?.replace(/\/$/, "");
    const allDomains = (process.env.REPLIT_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
    const domain = allDomains.find((d) => !d.endsWith(".replit.app")) ?? allDomains[0] ?? "";
    const redirectUri = gmailCallbackBase
      ? `${gmailCallbackBase}/auth/gmail/callback`
      : domain
        ? `https://${domain}/auth/gmail/callback`
        : `http://localhost:${process.env.PORT ?? 8080}/auth/gmail/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      prompt: "consent",
      // state encodes nonce:tenantId so callback can look up nonce without trusting tenantId alone
      state: `${nonce}:${tenantId}`,
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  },
);

// GET /api/payment-receipts/gmail/callback — OAuth callback from Google
// Validates the nonce in `state` (set by auth-url route) to prevent tenant-ID injection.
router.get(
  "/payment-receipts/gmail/callback",
  async (req, res): Promise<void> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const { code, state, error } = req.query as Record<string, string>;

    const gmailCallbackBase2 = process.env.GMAIL_CALLBACK_BASE_URL?.replace(/\/$/, "");
    const allDomains2 = (process.env.REPLIT_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
    const domain = allDomains2.find((d) => !d.endsWith(".replit.app")) ?? allDomains2[0] ?? "";
    const redirectUri = gmailCallbackBase2
      ? `${gmailCallbackBase2}/api/payment-receipts/gmail/callback`
      : domain
        ? `https://${domain}/api/payment-receipts/gmail/callback`
        : `http://localhost:${process.env.PORT ?? 8080}/api/payment-receipts/gmail/callback`;

    const frontendBase = gmailCallbackBase2 ?? (domain ? `https://${domain}` : "");

    if (error || !code || !state) {
      res.redirect(`${frontendBase}/cash?gmail=error`);
      return;
    }

    if (!clientId || !clientSecret) {
      res.redirect(`${frontendBase}/cash?gmail=error`);
      return;
    }

    // Validate nonce: state is "nonce:tenantId", nonce must exist server-side and not be expired
    const colonIdx = state.indexOf(":");
    if (colonIdx < 0) {
      res.redirect(`${frontendBase}/cash?gmail=error`);
      return;
    }
    const nonce = state.slice(0, colonIdx);
    const tenantId = parseInt(state.slice(colonIdx + 1), 10);
    if (isNaN(tenantId)) {
      res.redirect(`${frontendBase}/cash?gmail=error`);
      return;
    }

    const nonceKey = `gmail_oauth_nonce_${nonce}`;
    const nonceEntry = await readSetting(tenantId, nonceKey);
    if (!nonceEntry) {
      res.redirect(`${frontendBase}/cash?gmail=error`);
      return;
    }

    const nonceExpiry = parseInt(nonceEntry, 10);
    if (Date.now() > nonceExpiry) {
      // Nonce expired — clean up and reject
      await writeSetting(tenantId, nonceKey, "");
      res.redirect(`${frontendBase}/cash?gmail=error`);
      return;
    }

    // Nonce valid — delete it immediately (one-time use)
    await writeSetting(tenantId, nonceKey, "");

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = (await tokenRes.json()) as Record<string, string>;
      if (tokens.error) {
        res.redirect(`${frontendBase}/cash?gmail=error`);
        return;
      }
      // Encrypt tokens before storing at rest
      const encrypted = encryptGmailTokens(JSON.stringify(tokens));
      await writeSetting(tenantId, "gmail_tokens", encrypted);

      // Fetch and store the connected account email for display in settings
      try {
        const profileRes = await fetch(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${encodeURIComponent(tokens.access_token)}`,
        );
        if (profileRes.ok) {
          const profile = (await profileRes.json()) as { email?: string };
          if (profile.email) {
            await writeSetting(tenantId, "gmail_email", profile.email);
          }
        }
      } catch {
        /* non-fatal — email display is optional */
      }

      res.redirect(`${frontendBase}/cash?gmail=connected`);
    } catch {
      res.redirect(`${frontendBase}/cash?gmail=error`);
    }
  },
);

// GET /api/payment-receipts/gmail/exchange — SPA-friendly token exchange (JSON, no redirect)
// Called by the /auth/gmail/callback React page after Google redirects the browser there.
router.get(
  "/payment-receipts/gmail/exchange",
  async (req, res): Promise<void> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const { code, state } = req.query as Record<string, string>;

    if (!code || !state || !clientId || !clientSecret) {
      res.status(400).json({ ok: false, error: "missing_params" });
      return;
    }

    const colonIdx = state.indexOf(":");
    if (colonIdx < 0) { res.status(400).json({ ok: false, error: "bad_state" }); return; }
    const nonce = state.slice(0, colonIdx);
    const tenantId = parseInt(state.slice(colonIdx + 1), 10);
    if (isNaN(tenantId)) { res.status(400).json({ ok: false, error: "bad_state" }); return; }

    const nonceKey = `gmail_oauth_nonce_${nonce}`;
    const nonceEntry = await readSetting(tenantId, nonceKey);
    if (!nonceEntry) { res.status(400).json({ ok: false, error: "invalid_nonce" }); return; }

    const nonceExpiry = parseInt(nonceEntry, 10);
    if (Date.now() > nonceExpiry) {
      await writeSetting(tenantId, nonceKey, "");
      res.status(400).json({ ok: false, error: "nonce_expired" });
      return;
    }
    await writeSetting(tenantId, nonceKey, "");

    const gmailCallbackBase = process.env.GMAIL_CALLBACK_BASE_URL?.replace(/\/$/, "");
    const allDomainsEx = (process.env.REPLIT_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
    const domainEx = allDomainsEx.find((d) => !d.endsWith(".replit.app")) ?? allDomainsEx[0] ?? "";
    const redirectUri = gmailCallbackBase
      ? `${gmailCallbackBase}/auth/gmail/callback`
      : domainEx
        ? `https://${domainEx}/auth/gmail/callback`
        : `http://localhost:${process.env.PORT ?? 8080}/auth/gmail/callback`;

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      const tokens = (await tokenRes.json()) as Record<string, string>;
      if (tokens.error) { res.status(400).json({ ok: false, error: tokens.error }); return; }

      const encrypted = encryptGmailTokens(JSON.stringify(tokens));
      await writeSetting(tenantId, "gmail_tokens", encrypted);

      try {
        const profileRes = await fetch(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${encodeURIComponent(tokens.access_token)}`,
        );
        if (profileRes.ok) {
          const profile = (await profileRes.json()) as { email?: string };
          if (profile.email) await writeSetting(tenantId, "gmail_email", profile.email);
        }
      } catch { /* non-fatal */ }

      // Seed default Bancolombia filters if tenant has none yet
      try {
        const existingFiltersRaw = await readSetting(tenantId, "gmail_filters");
        const existingFilters = existingFiltersRaw ? (JSON.parse(existingFiltersRaw) as unknown[]) : [];
        if (!Array.isArray(existingFilters) || existingFilters.length === 0) {
          const defaults = [
            {
              id: 1,
              name: "BANCOLOMBIA PAGOS REALIZADOS",
              query: "From:alertasynotificaciones@an.notificacionesbancolombia.com (Transferiste OR Pagaste OR Enviaste OR Compraste)",
              category: "sent",
              enabled: true,
            },
            {
              id: 2,
              name: "BANCOLOMBIA PAGOS RECIBIDOS",
              query: 'From:alertasynotificaciones@an.notificacionesbancolombia.com (Recibiste OR "Te enviaron" OR "te pagaron")',
              category: "received",
              enabled: true,
            },
          ];
          await writeSetting(tenantId, "gmail_filters", JSON.stringify(defaults));
        }
      } catch { /* non-fatal — don't block the connection on a seeding error */ }

      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "token_exchange_failed" });
    }
  },
);

// POST /api/payment-receipts/sync/gmail — fetch and parse recent Gmail messages
router.post("/payment-receipts/sync/gmail", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(503).json({ error: "Gmail no configurado" });
    return;
  }

  const tokenRaw = await readSetting(tenantId, "gmail_tokens");
  if (!tokenRaw) {
    res
      .status(400)
      .json({ error: "Gmail no conectado", code: "GMAIL_NOT_CONNECTED" });
    return;
  }

  let tokens: Record<string, string>;
  try {
    const plaintext = decryptGmailTokens(tokenRaw);
    tokens = JSON.parse(plaintext);
  } catch {
    res
      .status(400)
      .json({ error: "Tokens inválidos", code: "GMAIL_NOT_CONNECTED" });
    return;
  }

  // ── Token refresh helper ──────────────────────────────────────────────────
  // Proactively refresh when access_token is absent; also called after a 401.
  async function tryRefreshTokens(): Promise<boolean> {
    if (!tokens.refresh_token) return false;
    try {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId ?? "",
          client_secret: clientSecret ?? "",
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const refreshed = (await refreshRes.json()) as Record<string, string>;
      if (!refreshed.access_token) return false;
      tokens = { ...tokens, ...refreshed };
      await writeSetting(
        tenantId,
        "gmail_tokens",
        encryptGmailTokens(JSON.stringify(tokens)),
      );
      return true;
    } catch {
      return false;
    }
  }

  // Proactively refresh when access_token is absent
  if (!tokens.access_token) {
    const ok = await tryRefreshTokens();
    if (!ok) {
      res
        .status(400)
        .json({ error: "Sin token de acceso", code: "GMAIL_NOT_CONNECTED" });
      return;
    }
  }

  const accessToken = tokens.access_token;
  if (!accessToken) {
    res
      .status(400)
      .json({ error: "Sin token de acceso", code: "GMAIL_NOT_CONNECTED" });
    return;
  }

  // Build Gmail query from configured filters (falls back to defaults if none saved)
  const allFilters = await readGmailFilters(tenantId);
  const activeFilters = allFilters.filter((f) => f.enabled);
  // Legacy: also append custom bancolombia email if not already covered by a filter
  const bancoEmail = await readSetting(tenantId, "bancolombia_email");
  if (bancoEmail) {
    const bancoQuery = `from:${bancoEmail.trim()}`;
    if (!activeFilters.some((f) => f.query === bancoQuery)) {
      activeFilters.push({
        id: "legacy-banco",
        label: "Bancolombia personalizado",
        query: bancoQuery,
        category: "payment_received",
        enabled: true,
      });
    }
  }
  // SMS-forward email: also include emails arriving from the user's SMS-forwarding address
  const smsForwardEmail = await readSetting(tenantId, "sms_forward_email");
  if (smsForwardEmail) {
    const smsQuery = `from:${smsForwardEmail.trim()}`;
    if (!activeFilters.some((f) => f.query === smsQuery)) {
      activeFilters.push({
        id: "sms-forward",
        label: "Reenvío de SMS",
        query: smsQuery,
        category: "payment_received",
        enabled: true,
      });
    }
  }
  if (activeFilters.length === 0) {
    res.json({ inserted: 0, skipped: 0 });
    return;
  }
  const force = req.body?.force === true;
  const timeWindow = force ? "1d" : "2d";

  let inserted = 0;
  let skipped = 0;

  const resolvedTenantId = tenantId as number; // tenantId is guaranteed non-null here

  // Fetch the list of message stubs for a single filter query, refreshing token on 401
  async function listFilterMessages(
    filterQuery: string,
  ): Promise<Array<{ id: string }> | "auth_error"> {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(filterQuery)}&maxResults=30`;
    let listRes = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (listRes.status === 401) {
      const refreshed = await tryRefreshTokens();
      if (!refreshed) return "auth_error";
      listRes = await fetch(url, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
    }
    if (!listRes.ok) return "auth_error";
    const data = (await listRes.json()) as { messages?: Array<{ id: string }> };
    return data.messages ?? [];
  }

  // Fetch a single message's full content, parse it, and insert if not duplicate.
  // directionOverride is derived from the matched filter's category and takes strict
  // precedence over the regex-detected direction inside parsePaymentFromEmail.
  async function fetchAndInsert(
    msgId: string,
    directionOverride: "received" | "sent" | null,
  ): Promise<"inserted" | "skipped"> {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!msgRes.ok) return "skipped";
      const msgData = (await msgRes.json()) as {
        id: string;
        internalDate: string;
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          body?: { data?: string };
          parts?: Array<{ mimeType: string; body?: { data?: string } }>;
        };
      };
      const headers = msgData.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const dateStr = headers.find((h) => h.name === "Date")?.value;
      let bodyText = "";
      const payload = msgData.payload;
      if (payload?.body?.data) {
        bodyText = decodeGmailPart(payload.body.data);
      } else if (payload?.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText = decodeGmailPart(part.body.data);
            break;
          }
        }
      }
      const parsed = parsePaymentFromEmail(subject, bodyText, from);
      if (!parsed) return "skipped";
      // Apply the filter's direction override only when content analysis (detectDirection)
      // agrees or is inconclusive. This prevents filter-order accidents — e.g. a
      // payment_received filter matching a sent email first — from overwriting the
      // parser's content-detected direction. When content disagrees, parsed.direction
      // (already set by parsePaymentFromEmail via detectDirection) is kept instead.
      if (directionOverride !== null) {
        const contentDir = detectDirection(bodyText);
        if (contentDir === null || contentDir === directionOverride) {
          parsed.direction = directionOverride;
        }
      }
      const receivedAt = dateStr
        ? new Date(dateStr)
        : new Date(
            msgData.internalDate ? parseInt(msgData.internalDate) : Date.now(),
          );
      const result = await insertReceiptIfNotDuplicate(
        resolvedTenantId,
        "gmail",
        msgId,
        parsed,
        receivedAt,
        force,
      );
      return result.inserted ? "inserted" : "skipped";
    } catch {
      return "skipped";
    }
  }

  try {
    // Run one search per filter so we can map filter.category → direction.
    // A Set tracks already-processed message IDs: if a message matches multiple
    // filters (e.g. a Bancolombia "sent" email also matching a generic filter),
    // the FIRST matching filter's category wins.
    const seenIds = new Set<string>();

    for (const filter of activeFilters) {
      const filterQuery = `(${filter.query}) newer_than:${timeWindow}`;
      const directionOverride: "received" | "sent" | null =
        filter.category === "payment_sent"
          ? "sent"
          : filter.category === "payment_received"
            ? "received"
            : null;

      const msgs = await listFilterMessages(filterQuery);
      if (msgs === "auth_error") {
        res.status(400).json({
          error: "Gmail desconectado. Vuelve a autorizar.",
          code: "GMAIL_NOT_CONNECTED",
        });
        return;
      }

      for (const msg of msgs) {
        if (seenIds.has(msg.id)) continue; // already handled by a previous filter
        seenIds.add(msg.id);
        const outcome = await fetchAndInsert(msg.id, directionOverride);
        if (outcome === "inserted") inserted++;
        else skipped++;
      }
    }

    res.json({ inserted, skipped });
  } catch {
    res.status(500).json({ error: "Error al consultar Gmail" });
  }
});

// GET /api/payment-receipts/gmail/status — check if Gmail is connected
router.get(
  "/payment-receipts/gmail/status",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    const raw = await readSetting(tenantId, "gmail_tokens");
    let connected = false;
    if (raw) {
      try {
        const plaintext = decryptGmailTokens(raw);
        const t = JSON.parse(plaintext) as Record<string, string>;
        connected = !!(t.access_token || t.refresh_token);
      } catch {
        /* decryption failed or not connected */
      }
    }
    const configured = !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
    const email = connected ? await readSetting(tenantId, "gmail_email") : null;

    // Find the most recent Gmail receipt inserted for this tenant
    const lastInsertedRow = await db
      .select({ lastInsertedAt: sql<string | null>`MAX(${paymentReceiptsTable.createdAt})` })
      .from(paymentReceiptsTable)
      .where(
        and(
          eq(paymentReceiptsTable.tenantId, tenantId),
          eq(paymentReceiptsTable.source, "gmail"),
        ),
      );
    const lastInsertedAt = lastInsertedRow[0]?.lastInsertedAt ?? null;

    res.json({ connected, configured, email: email ?? undefined, lastInsertedAt });
  },
);

// DELETE /api/payment-receipts/gmail/connection — disconnect Gmail (remove stored tokens)
router.delete(
  "/payment-receipts/gmail/connection",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    const tokenKey = `t${tenantId}__gmail_tokens`;
    const emailKey = `t${tenantId}__gmail_email`;
    await db
      .delete(appSettingsTable)
      .where(inArray(appSettingsTable.key, [tokenKey, emailKey]));
    res.json({ ok: true });
  },
);

// GET /api/payment-receipts/sms/webhook-url — generate or return SMS webhook URL
router.get(
  "/payment-receipts/sms/webhook-url",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }

    let token = await readSetting(tenantId, "sms_webhook_token");
    if (!token) {
      token = crypto.randomBytes(20).toString("hex");
      await writeSetting(tenantId, "sms_webhook_token", token);
    }

    const domain =
      (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim() ?? "";
    const base = domain
      ? `https://${domain}`
      : `http://localhost:${process.env.PORT ?? 8080}`;
    const webhookUrl = `${base}/api/payment-receipts/sms?token=${token}`;

    res.json({ webhookUrl, token });
  },
);

// POST /api/payment-receipts/sms/test-connection — ping the webhook with a test payload
router.post(
  "/payment-receipts/sms/test-connection",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ ok: false, message: "Sin empresa" });
      return;
    }

    const token = await readSetting(tenantId, "sms_webhook_token");
    if (!token) {
      res.status(400).json({ ok: false, message: "Token no configurado" });
      return;
    }

    const domain =
      (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim() ?? "";
    const base = domain
      ? `https://${domain}`
      : `http://localhost:${process.env.PORT ?? 8080}`;
    const webhookUrl = `${base}/api/payment-receipts/sms?token=${token}`;

    try {
      const testPayload = {
        content: "[FYRO APP] Prueba de conexión",
        sender: "+0000000000",
        timestamp: new Date().toISOString(),
        _test: true,
      };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        res.json({ ok: true, message: "Webhook configurado correctamente" });
      } else {
        const body = await response.text().catch(() => "");
        res
          .status(200)
          .json({
            ok: false,
            message: `El webhook respondió con error ${response.status}${body ? `: ${body}` : ""}`,
          });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res
        .status(200)
        .json({ ok: false, message: `No se pudo conectar al webhook: ${msg}` });
    }
  },
);

// POST /api/payment-receipts/sms — receive forwarded SMS (public, token-auth)
// This route is added to PUBLIC_EXACT_METHOD_PATHS in tenantMiddleware to bypass employee auth.
// Accepts multiple payload formats:
//   SMS Gate / Forward SMS:  { message, from, sentStamp? }
//   iOS app (SMS Cocina):    { content, sender, contact?, timestamp? }
router.post("/payment-receipts/sms", async (req, res): Promise<void> => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }

  // Find tenant by token — scan keys matching `t%__sms_webhook_token`
  const allTokenRows = await db
    .select()
    .from(appSettingsTable)
    .where(sql`key LIKE 't%__sms_webhook_token'`);

  const matching = allTokenRows.find((r) => r.value === token);
  if (!matching) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  // Short-circuit test pings from the "Probar conexión" button (after token validation)
  if ((req.body as Record<string, unknown>)._test === true) {
    res.json({ ok: true, test: true });
    return;
  }

  const tenantId = parseInt(matching.key.split("__")[0].replace("t", ""), 10);
  if (isNaN(tenantId)) {
    res.status(400).json({ error: "Token mal formado" });
    return;
  }

  const {
    message,
    content, // SMS text — "message" (SMS Gate) or "content" (iOS app)
    from,
    sender, // sender phone — "from" (SMS Gate) or "sender" (iOS app)
    contact, // human-readable contact name from iOS app (e.g. "Nequi")
    sentStamp,
    receivedAt: receivedAtField,
    timestamp, // ISO timestamp from iOS app (alias for receivedAt)
  } = req.body as {
    message?: string;
    content?: string;
    from?: string;
    sender?: string;
    contact?: string;
    sentStamp?: number;
    receivedAt?: string;
    timestamp?: string;
  };

  const text = (message ?? content ?? "").trim();
  if (!text) {
    res.status(400).json({ error: "Mensaje vacío" });
    return;
  }

  const fromField = (from ?? sender ?? "unknown").trim();

  const parsed = parsePaymentFromSms(text, fromField);
  if (!parsed) {
    // Not a payment SMS — acknowledge silently
    res.json({ ok: true, recognized: false });
    return;
  }

  // Enrich senderName with the human-readable contact name from iOS app if parser didn't extract one
  if (contact && !parsed.senderName) {
    parsed.senderName = contact.trim();
  }

  const receivedAt = receivedAtField
    ? new Date(receivedAtField)
    : timestamp
      ? new Date(timestamp)
      : sentStamp
        ? new Date(sentStamp * 1000)
        : new Date();
  // Deterministic sourceId: SHA-256 of "sender:fullMessage" — avoids non-determinism from Date.now()
  const sourceId = crypto
    .createHash("sha256")
    .update(`${fromField}:${text}`)
    .digest("hex")
    .slice(0, 40);
  await insertReceiptIfNotDuplicate(
    tenantId,
    "sms",
    sourceId,
    parsed,
    receivedAt,
  );

  res.json({ ok: true, recognized: true });
});

// POST /api/payment-receipts/deduplicate — discard pre-existing duplicates (admin only)
// Groups receipts by (tenantId, amount, date_trunc('day', received_at)) and keeps the best
// representative from each group (linked > non-discarded > oldest id), marking the rest as
// 'discarded'. This is a one-shot cleanup for records created before the cross-source dedup fix.
router.post(
  "/payment-receipts/deduplicate",
  requireRole(["admin"]),
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }

    // Fetch all non-discarded receipts for this tenant that have an amount.
    const rows = await db
      .select({
        id: paymentReceiptsTable.id,
        amount: paymentReceiptsTable.amount,
        receivedAt: paymentReceiptsTable.receivedAt,
        status: paymentReceiptsTable.status,
        linkedOrderId: paymentReceiptsTable.linkedOrderId,
      })
      .from(paymentReceiptsTable)
      .where(
        and(
          eq(paymentReceiptsTable.tenantId, tenantId),
          ne(paymentReceiptsTable.status, "discarded"),
          isNotNull(paymentReceiptsTable.amount),
        ),
      );

    // Group by (amount, calendar day of receivedAt).
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const dayKey = r.receivedAt
        ? r.receivedAt.toISOString().slice(0, 10)
        : "unknown";
      const amtKey = r.amount
        ? parseFloat(r.amount as string).toFixed(2)
        : "0";
      const key = `${amtKey}|${dayKey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // Within each group, keep the "best" row. Score: linked (+2) > non-pending (+1) > oldest id.
    const toDiscard: number[] = [];
    for (const group of groups.values()) {
      if (group.length <= 1) continue;

      const scored = group.map((r) => ({
        id: r.id,
        score:
          (r.linkedOrderId ? 2 : 0) +
          (r.status !== "pending" ? 1 : 0),
      }));
      scored.sort((a, b) => b.score - a.score || a.id - b.id);

      // First item is the keeper; the rest get discarded.
      for (let i = 1; i < scored.length; i++) {
        toDiscard.push(scored[i].id);
      }
    }

    if (toDiscard.length > 0) {
      await db
        .update(paymentReceiptsTable)
        .set({ status: "discarded" })
        .where(
          and(
            eq(paymentReceiptsTable.tenantId, tenantId),
            inArray(paymentReceiptsTable.id, toDiscard),
          ),
        );
    }

    // Also fix receipts where bank = "otro" but rawContent contains a recognizable
    // bank keyword (common for SMS-forwarded receipts created before the detection fix).
    const undetected = await db
      .select({ id: paymentReceiptsTable.id, rawContent: paymentReceiptsTable.rawContent })
      .from(paymentReceiptsTable)
      .where(
        and(
          eq(paymentReceiptsTable.tenantId, tenantId),
          eq(paymentReceiptsTable.bank, "otro"),
          isNotNull(paymentReceiptsTable.rawContent),
          ne(paymentReceiptsTable.status, "discarded"),
        ),
      );

    let bankFixed = 0;
    for (const row of undetected) {
      if (!row.rawContent) continue;
      const detectedBank = detectBankFromSms(row.rawContent);
      if (detectedBank !== "otro") {
        await db
          .update(paymentReceiptsTable)
          .set({ bank: detectedBank })
          .where(
            and(
              eq(paymentReceiptsTable.id, row.id),
              eq(paymentReceiptsTable.tenantId, tenantId),
            ),
          );
        bankFixed++;
      }
    }

    res.json({ merged: toDiscard.length, bankFixed });
  },
);

// POST /api/payment-receipts/reclassify-direction — fix direction on receipts where rawContent
// clearly signals sent/received but the stored direction is wrong or null (admin only).
// Uses detectDirection() from paymentParser to re-scan rawContent and updates rows where the
// detected direction differs from the stored one.
router.post(
  "/payment-receipts/reclassify-direction",
  requireRole(["admin"]),
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }

    const rows = await db
      .select({
        id: paymentReceiptsTable.id,
        direction: paymentReceiptsTable.direction,
        rawContent: paymentReceiptsTable.rawContent,
      })
      .from(paymentReceiptsTable)
      .where(
        and(
          eq(paymentReceiptsTable.tenantId, tenantId),
          ne(paymentReceiptsTable.status, "discarded"),
          isNotNull(paymentReceiptsTable.rawContent),
        ),
      );

    let updated = 0;
    for (const row of rows) {
      if (!row.rawContent) continue;
      const detected = detectDirection(row.rawContent);
      if (detected && detected !== row.direction) {
        await db
          .update(paymentReceiptsTable)
          .set({ direction: detected })
          .where(
            and(
              eq(paymentReceiptsTable.id, row.id),
              eq(paymentReceiptsTable.tenantId, tenantId),
            ),
          );
        updated++;
      }
    }

    res.json({ updated });
  },
);

// GET /api/payment-receipts/count — count receipts by status for badge display
router.get("/payment-receipts/count", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }

  const { status } = req.query as { status?: string };
  const bogotaTodayStart = sql`
    date_trunc('day', now() AT TIME ZONE 'America/Bogota')
    AT TIME ZONE 'America/Bogota'
  `;
  const bogotaTomorrowStart = sql`
    (date_trunc('day', now() AT TIME ZONE 'America/Bogota') + interval '1 day')
    AT TIME ZONE 'America/Bogota'
  `;
  const conditions = [
    eq(paymentReceiptsTable.tenantId, tenantId),
    isNull(paymentReceiptsTable.linkedSaleId),
    isNull(paymentReceiptsTable.linkedOrderId),
    isNull(paymentReceiptsTable.linkedExpenseId),
    isNull(paymentReceiptsTable.linkedRestaurantOrderId),
    isNull(paymentReceiptsTable.linkedPurchaseOrderId),
    gte(paymentReceiptsTable.receivedAt, bogotaTodayStart),
    lt(paymentReceiptsTable.receivedAt, bogotaTomorrowStart),
  ];
  if (status && status !== "all") {
    conditions.push(eq(paymentReceiptsTable.status, status));
  }

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(paymentReceiptsTable)
    .where(and(...conditions));

  res.json({ count: row?.count ?? 0 });
});

// GET /api/payment-receipts/summary — totals by direction for the current status filter
router.get("/payment-receipts/summary", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }

  const { status, dateFrom, dateTo } = req.query as {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  const conditions = [eq(paymentReceiptsTable.tenantId, tenantId)];
  if (status && status !== "all") {
    conditions.push(eq(paymentReceiptsTable.status, status));
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from.getTime()))
      conditions.push(gte(paymentReceiptsTable.receivedAt, from));
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to.getTime()))
      conditions.push(lte(paymentReceiptsTable.receivedAt, to));
  }

  const rows = await db
    .select({
      direction: paymentReceiptsTable.direction,
      total: sql<string>`COALESCE(SUM(${paymentReceiptsTable.amount}::numeric), 0)`,
    })
    .from(paymentReceiptsTable)
    .where(and(...conditions))
    .groupBy(paymentReceiptsTable.direction);

  let totalReceived = 0;
  let totalSent = 0;
  for (const row of rows) {
    const val = parseFloat(row.total);
    if (row.direction === "received") totalReceived = val;
    else if (row.direction === "sent") totalSent = val;
  }

  res.json({ totalReceived, totalSent, net: totalReceived - totalSent });
});

// GET /api/payment-receipts — list receipts for tenant (paginated)
router.get("/payment-receipts", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }

  const {
    status,
    direction,
    limit: limitQ,
    cursor,
    dateFrom,
    dateTo,
  } = req.query as {
    status?: string;
    direction?: string;
    limit?: string;
    cursor?: string;
    dateFrom?: string;
    dateTo?: string;
  };

  // Non-admin/manager roles can only see "received" payments — never "PAGO REALIZADO" (sent)
  const isAdminOrManagerGet =
    req.isSuperAdmin ||
    req.employeeRole === "admin" ||
    req.employeeRole === "manager";
  const effectiveDirection = isAdminOrManagerGet ? direction : "received";

  const pageSize = Math.min(parseInt(limitQ ?? "50", 10) || 50, 200);
  const conditions = [eq(paymentReceiptsTable.tenantId, tenantId)];
  if (status && status !== "all") {
    conditions.push(eq(paymentReceiptsTable.status, status));
  }
  if (effectiveDirection === "received" || effectiveDirection === "sent") {
    conditions.push(eq(paymentReceiptsTable.direction, effectiveDirection));
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from.getTime()))
      conditions.push(gte(paymentReceiptsTable.receivedAt, from));
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to.getTime()))
      conditions.push(lte(paymentReceiptsTable.receivedAt, to));
  }
  if (cursor) {
    // cursor is the ISO receivedAt of the last item — fetch items older than it
    conditions.push(lt(paymentReceiptsTable.receivedAt, new Date(cursor)));
  }

  const rows = await db
    .select()
    .from(paymentReceiptsTable)
    .where(and(...conditions))
    .orderBy(desc(paymentReceiptsTable.receivedAt))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const data = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? data.at(-1)?.receivedAt?.toISOString() : null;

  res.json({ data, nextCursor, hasMore });
});

// GET /api/payment-receipts/open-restaurant-orders — list open table orders for linking
router.get(
  "/payment-receipts/open-restaurant-orders",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }

    const rows = await db
      .select({
        id: restaurantOrdersTable.id,
        tableId: restaurantOrdersTable.tableId,
        tableName: restaurantTablesTable.name,
        tableArea: restaurantTablesTable.area,
        subtotal: restaurantOrdersTable.subtotal,
        serverName: restaurantOrdersTable.serverName,
        customerName: restaurantOrdersTable.customerName,
        createdAt: restaurantOrdersTable.createdAt,
      })
      .from(restaurantOrdersTable)
      .innerJoin(
        restaurantTablesTable,
        eq(restaurantTablesTable.id, restaurantOrdersTable.tableId),
      )
      .where(
        and(
          eq(restaurantTablesTable.tenantId, tenantId),
          eq(restaurantOrdersTable.status, "open"),
        ),
      )
      .orderBy(asc(restaurantOrdersTable.createdAt));

    res.json(rows);
  },
);

// GET /api/payment-receipts/linkable-expenses — list expenses not yet linked to a receipt (admin only)
router.get("/payment-receipts/linkable-expenses", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }
  const isAdminOrManager =
    req.isSuperAdmin ||
    req.employeeRole === "admin" ||
    req.employeeRole === "manager";
  if (!isAdminOrManager) {
    res.status(403).json({ error: "Solo administradores pueden ver esta información" });
    return;
  }

  // Return expenses (last 90 days) not yet linked to any receipt
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const alreadyLinked = await db
    .select({ eid: paymentReceiptsTable.linkedExpenseId })
    .from(paymentReceiptsTable)
    .where(
      and(
        eq(paymentReceiptsTable.tenantId, tenantId),
        isNotNull(paymentReceiptsTable.linkedExpenseId),
      ),
    );
  const linkedIds = alreadyLinked.map((r) => r.eid).filter((v): v is number => v !== null);

  const rows = await db
    .select({
      id: expensesTable.id,
      description: expensesTable.description,
      category: expensesTable.category,
      amount: expensesTable.amount,
      paymentMethod: expensesTable.paymentMethod,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.tenantId, tenantId),
        gte(expensesTable.createdAt, since),
        linkedIds.length > 0 ? notInArray(expensesTable.id, linkedIds) : undefined,
      ),
    )
    .orderBy(desc(expensesTable.createdAt))
    .limit(80);

  res.json(rows);
});

// GET /api/payment-receipts/linkable-purchase-orders — list purchase orders not yet linked to a receipt (admin only)
router.get("/payment-receipts/linkable-purchase-orders", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }
  const isAdminOrManager =
    req.isSuperAdmin ||
    req.employeeRole === "admin" ||
    req.employeeRole === "manager";
  if (!isAdminOrManager) {
    res.status(403).json({ error: "Solo administradores pueden ver esta información" });
    return;
  }

  const alreadyLinked = await db
    .select({ pid: paymentReceiptsTable.linkedPurchaseOrderId })
    .from(paymentReceiptsTable)
    .where(
      and(
        eq(paymentReceiptsTable.tenantId, tenantId),
        isNotNull(paymentReceiptsTable.linkedPurchaseOrderId),
      ),
    );
  const linkedIds = alreadyLinked.map((r) => r.pid).filter((v): v is number => v !== null);

  const rows = await db
    .select({
      id: purchaseOrdersTable.id,
      supplierName: purchaseOrdersTable.supplierName,
      status: purchaseOrdersTable.status,
      total: purchaseOrdersTable.total,
      notes: purchaseOrdersTable.notes,
      createdAt: purchaseOrdersTable.createdAt,
    })
    .from(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.tenantId, tenantId),
        linkedIds.length > 0 ? notInArray(purchaseOrdersTable.id, linkedIds) : undefined,
      ),
    )
    .orderBy(desc(purchaseOrdersTable.createdAt))
    .limit(80);

  res.json(rows);
});

// GET /api/payment-receipts/linkable-orders — unified list of pending orders (deliveries + table orders)
router.get("/payment-receipts/linkable-orders", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) { res.status(403).json({ error: "Sin empresa" }); return; }

  const [deliveryRows, tableOrderRows] = await Promise.all([
    // Pending deliveries without a linked receipt
    db
      .select({
        id: deliveriesTable.id,
        orderNumber: deliveriesTable.orderNumber,
        customerName: deliveriesTable.customerName,
        total: deliveriesTable.total,
        status: deliveriesTable.status,
      })
      .from(deliveriesTable)
      .where(
        and(
          eq(deliveriesTable.tenantId, tenantId),
          inArray(deliveriesTable.status, ["pending", "confirmed", "preparing", "in_transit"]),
          notExists(
            db
              .select({ id: paymentReceiptsTable.id })
              .from(paymentReceiptsTable)
              .where(eq(paymentReceiptsTable.linkedOrderId, deliveriesTable.id)),
          ),
        ),
      )
      .orderBy(desc(deliveriesTable.createdAt))
      .limit(60),

    // Open restaurant orders at real tables (exclude virtual __DOMICILIOS__ table)
    db
      .select({
        id: restaurantOrdersTable.id,
        tableName: restaurantTablesTable.name,
        customerName: restaurantOrdersTable.customerName,
        serverName: restaurantOrdersTable.serverName,
        subtotal: restaurantOrdersTable.subtotal,
      })
      .from(restaurantOrdersTable)
      .innerJoin(restaurantTablesTable, eq(restaurantTablesTable.id, restaurantOrdersTable.tableId))
      .where(
        and(
          eq(restaurantOrdersTable.tenantId, tenantId),
          eq(restaurantOrdersTable.status, "open"),
          ne(restaurantTablesTable.name, "__DOMICILIOS__"),
          isNull(
            db
              .select({ id: paymentReceiptsTable.id })
              .from(paymentReceiptsTable)
              .where(eq(paymentReceiptsTable.linkedRestaurantOrderId, restaurantOrdersTable.id))
              .limit(1),
          ),
        ),
      )
      .orderBy(restaurantOrdersTable.createdAt)
      .limit(40),
  ]);

  const result = [
    ...deliveryRows.map((d) => ({
      id: d.id,
      type: "delivery" as const,
      orderNumber: d.orderNumber,
      tableName: null as string | null,
      customerName: d.customerName,
      total: Number(d.total),
      status: d.status,
    })),
    ...tableOrderRows.map((o) => ({
      id: o.id,
      type: "table" as const,
      orderNumber: null as string | null,
      tableName: o.tableName,
      customerName: o.customerName ?? o.serverName,
      total: Number(o.subtotal),
      status: "open",
    })),
  ];

  res.json(result);
});

// PATCH /api/payment-receipts/:id/link — link receipt to a delivery, restaurant order, expense, or purchase order
router.patch("/payment-receipts/:id/link", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  const { orderId, restaurantOrderId, expenseId, purchaseOrderId } = req.body as {
    orderId?: number;
    restaurantOrderId?: number;
    expenseId?: number;
    purchaseOrderId?: number;
  };

  // ── Early receipt check: prevent double-linking and enforce direction-based access ──
  const earlyReceipt = await db
    .select({
      id: paymentReceiptsTable.id,
      status: paymentReceiptsTable.status,
      direction: paymentReceiptsTable.direction,
    })
    .from(paymentReceiptsTable)
    .where(
      and(
        eq(paymentReceiptsTable.id, id),
        eq(paymentReceiptsTable.tenantId, tenantId),
      ),
    )
    .limit(1)
    .then((r) => r[0]);

  if (!earlyReceipt) {
    res.status(404).json({ error: "Comprobante no encontrado" });
    return;
  }
  if (earlyReceipt.status !== "pending") {
    res.status(400).json({ error: "Este comprobante ya fue vinculado o descartado" });
    return;
  }

  const isAdminOrManagerLink =
    req.isSuperAdmin ||
    req.employeeRole === "admin" ||
    req.employeeRole === "manager";

  if (earlyReceipt.direction === "sent" && !isAdminOrManagerLink) {
    res
      .status(403)
      .json({ error: "Solo administradores pueden vincular pagos realizados" });
    return;
  }

  // ── Link to a restaurant table order with auto-checkout ──────────────────
  if (restaurantOrderId) {
    const [order] = await db
      .select()
      .from(restaurantOrdersTable)
      .where(eq(restaurantOrdersTable.id, restaurantOrderId));
    if (!order || order.status !== "open") {
      res
        .status(400)
        .json({ error: "La orden de mesa no está abierta o no existe" });
      return;
    }
    // Tenant check via table
    const [tbl] = await db
      .select({
        tenantId: restaurantTablesTable.tenantId,
        name: restaurantTablesTable.name,
        area: restaurantTablesTable.area,
      })
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, order.tableId!));
    if (!tbl || tbl.tenantId !== tenantId) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    const receipt = await db
      .select()
      .from(paymentReceiptsTable)
      .where(
        and(
          eq(paymentReceiptsTable.id, id),
          eq(paymentReceiptsTable.tenantId, tenantId),
        ),
      )
      .limit(1)
      .then((r) => r[0]);
    if (!receipt) {
      res.status(404).json({ error: "Comprobante no encontrado" });
      return;
    }
    if (receipt.status !== "pending") {
      res
        .status(400)
        .json({ error: "Este comprobante ya fue vinculado o descartado" });
      return;
    }

    // ── Replicate full checkout flow ──────────────────────────────────────
    const orderItems = await db
      .select()
      .from(restaurantOrderItemsTable)
      .where(eq(restaurantOrderItemsTable.orderId, order.id));
    if (orderItems.length === 0) {
      res.status(400).json({ error: "La orden no tiene ítems" });
      return;
    }

    const allProducts = await db.select().from(productsTable);
    const selectedProducts = orderItems.map((item) => ({
      item,
      product: allProducts.find((p) => p.id === item.productId),
    }));
    const missingProduct = selectedProducts.find(({ product }) => !product);
    if (missingProduct) {
      res.status(400).json({ error: "Producto no encontrado" });
      return;
    }

    const subtotal = money(orderItems.reduce((s, i) => s + i.lineTotal, 0));
    const totalCost = money(
      selectedProducts.reduce(
        (s, { item, product }) => s + product!.cost * item.quantity,
        0,
      ),
    );
    const receiptNumber = `T-${Date.now().toString(36).toUpperCase()}`;

    // ── Tax calculation (per-item) ──────────────────────────────────────────
    const cmpTaxIncludedRaw = await readSetting(req.tenantId, "company_tax_included_in_price");
    const cmpTaxIncluded = cmpTaxIncludedRaw !== "false";
    let cmpTotalTaxAmount = 0;
    const cmpItemTaxRateSet = new Set<number>();
    let cmpSaleTaxNameVal: string | null = null;
    for (const { item, product } of selectedProducts) {
      const taxPct = Number(product?.taxPercent ?? 0);
      if (!taxPct) continue;
      const lineTotal = money(item.lineTotal);
      const taxAmt = cmpTaxIncluded ? money(lineTotal * taxPct / (100 + taxPct)) : money(lineTotal * taxPct / 100);
      cmpTotalTaxAmount += taxAmt;
      cmpItemTaxRateSet.add(taxPct);
      if (!cmpSaleTaxNameVal) cmpSaleTaxNameVal = product?.taxName ?? null;
    }
    cmpTotalTaxAmount = money(cmpTotalTaxAmount);
    const cmpSaleTaxPercent = cmpItemTaxRateSet.size === 1 ? [...cmpItemTaxRateSet][0] : null;
    const cmpSaleTaxName = cmpSaleTaxPercent != null ? cmpSaleTaxNameVal : null;
    const cmpFinalSubtotal = !cmpTaxIncluded && cmpTotalTaxAmount > 0 ? money(subtotal + cmpTotalTaxAmount) : subtotal;

    const orderProductIds = selectedProducts.map(({ product }) => product!.id);
    const orderRecipes = orderProductIds.length
      ? await db
          .select()
          .from(productRecipesTable)
          .where(inArray(productRecipesTable.productId, orderProductIds))
      : [];

    // Pre-validate non-recipe stock
    const insufficientProduct = selectedProducts.find(({ item, product }) => {
      const isRecipeBased = orderRecipes.some(
        (r) => r.productId === product!.id,
      );
      return !isRecipeBased && product!.stock < item.quantity;
    });
    if (insufficientProduct?.product) {
      res
        .status(400)
        .json({
          error: `${insufficientProduct.product.name} no tiene stock suficiente`,
        });
      return;
    }

    // Compute ingredient consumption
    const orderIngredients = orderRecipes.length
      ? await db.select().from(ingredientsTable)
      : [];
    const orderIngMap = new Map(orderIngredients.map((i) => [i.id, i]));
    const orderConsumption = new Map<number, number>();
    for (const { item, product } of selectedProducts) {
      const productRecipes = orderRecipes.filter(
        (r) => r.productId === product!.id,
      );
      for (const r of productRecipes) {
        if (r.ingredientId == null) continue;
        orderConsumption.set(
          r.ingredientId,
          (orderConsumption.get(r.ingredientId) ?? 0) +
            r.quantity * item.quantity,
        );
      }
    }
    // Pre-validate ingredient stock
    for (const [ingId, needed] of orderConsumption.entries()) {
      const ing = orderIngMap.get(ingId);
      if (!ing || ing.stock < needed) {
        res
          .status(400)
          .json({
            error: `Ingrediente "${ing?.name ?? `#${ingId}`}" insuficiente (hay ${ing?.stock ?? 0})`,
          });
        return;
      }
    }

    // Transactional checkout — all errors inside must throw to ensure full rollback
    let linkedReceipt: typeof paymentReceiptsTable.$inferSelect;
    try {
      linkedReceipt = await db.transaction(async (tx) => {
        // Claim the open order (atomic guard against double-checkout)
        const claimed = await tx
          .update(restaurantOrdersTable)
          .set({ status: "paid", subtotal, closedAt: new Date() })
          .where(
            and(
              eq(restaurantOrdersTable.id, order.id),
              eq(restaurantOrdersTable.status, "open"),
            ),
          )
          .returning({ id: restaurantOrdersTable.id });
        if (claimed.length === 0) throw new Error("Esta cuenta ya fue cobrada");

        // Create a sale record (payment method = transfer, matching the bank transfer receipt)
        const [createdSale] = await tx
          .insert(salesTable)
          .values({
            receiptNumber,
            customerName: order.customerName ?? order.serverName,
            customerId: null,
            employeeId: null,
            loyaltyPointsEarned: 0,
            paymentMethod: "transfer",
            subtotal: cmpFinalSubtotal,
            totalCost,
            profit: money(cmpFinalSubtotal - totalCost),
            tableId: order.tableId,
            tableName: tbl?.name ?? null,
            tableArea: tbl?.area ?? null,
            taxAmount: cmpTotalTaxAmount > 0 ? cmpTotalTaxAmount : null,
            taxPercent: cmpSaleTaxPercent,
            taxName: cmpSaleTaxName,
          })
          .returning();

        // Insert sale items
        await tx.insert(saleItemsTable).values(
          selectedProducts.map(({ item, product }) => {
            const taxPct = Number(product?.taxPercent ?? 0);
            const lt = money(item.lineTotal);
            const taxAmt = taxPct > 0 ? (cmpTaxIncluded ? money(lt * taxPct / (100 + taxPct)) : money(lt * taxPct / 100)) : null;
            return {
              saleId: createdSale.id,
              productId: product!.id,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: product!.cost,
              lineTotal: item.lineTotal,
              taxPercent: taxPct > 0 ? taxPct : null,
              taxAmount: taxAmt,
              taxName: taxPct > 0 ? (product?.taxName ?? null) : null,
            };
          }),
        );

        // Deduct non-recipe product stock (with strict check inside tx)
        for (const { item, product } of selectedProducts) {
          const isRecipeBased = orderRecipes.some(
            (r) => r.productId === product!.id,
          );
          if (!isRecipeBased) {
            const updated = await tx
              .update(productsTable)
              .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
              .where(
                and(
                  eq(productsTable.id, product!.id),
                  gte(productsTable.stock, item.quantity),
                ),
              )
              .returning({ id: productsTable.id });
            if (updated.length === 0)
              throw new Error(`${product!.name} agotado`);
          }
        }

        // Deduct ingredient stock (with strict check inside tx)
        for (const [ingId, needed] of orderConsumption.entries()) {
          const ing = orderIngMap.get(ingId);
          const updated = await tx
            .update(ingredientsTable)
            .set({ stock: sql`${ingredientsTable.stock} - ${needed}` })
            .where(
              and(
                eq(ingredientsTable.id, ingId),
                gte(ingredientsTable.stock, needed),
              ),
            )
            .returning({ id: ingredientsTable.id });
          if (updated.length === 0)
            throw new Error(
              `Ingrediente "${ing?.name ?? `#${ingId}`}" insuficiente`,
            );
        }

        // Link order to sale
        await tx
          .update(restaurantOrdersTable)
          .set({ saleId: createdSale.id })
          .where(eq(restaurantOrdersTable.id, order.id));

        // Free the table
        if (order.tableId != null) {
          await tx
            .update(restaurantTablesTable)
            .set({ status: "available" })
            .where(eq(restaurantTablesTable.id, order.tableId!));
        }

        // Link the receipt and mark as linked (concurrent guard via status condition)
        const [r] = await tx
          .update(paymentReceiptsTable)
          .set({ linkedRestaurantOrderId: restaurantOrderId, status: "linked" })
          .where(
            and(
              eq(paymentReceiptsTable.id, id),
              eq(paymentReceiptsTable.tenantId, tenantId),
              eq(paymentReceiptsTable.status, "pending"),
            ),
          )
          .returning();
        if (!r)
          throw new Error(
            "Este comprobante ya fue vinculado por otra operación concurrente",
          );
        return r;
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al vincular comprobante";
      res.status(400).json({ error: msg });
      return;
    }

    res.json(linkedReceipt);
    return;
  }

  // ── Link to a delivery order ─────────────────────────────────────────────
  if (orderId) {
    // Verify the target delivery order belongs to this tenant (prevents cross-tenant linkage)
    const deliveryCheck = await db
      .select({ id: deliveriesTable.id })
      .from(deliveriesTable)
      .where(
        and(
          eq(deliveriesTable.id, orderId),
          eq(deliveriesTable.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (deliveryCheck.length === 0) {
      res
        .status(404)
        .json({ error: "Pedido no encontrado o no pertenece a esta empresa" });
      return;
    }

    const [row] = await db
      .update(paymentReceiptsTable)
      .set({ linkedOrderId: orderId, status: "linked" })
      .where(
        and(
          eq(paymentReceiptsTable.id, id),
          eq(paymentReceiptsTable.tenantId, tenantId),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Comprobante no encontrado" });
      return;
    }
    res.json(row);
    return;
  }

  // ── Link to an expense (PAGO REALIZADO — admin only) ─────────────────────
  if (expenseId) {
    const [expCheck] = await db
      .select({ id: expensesTable.id, amount: expensesTable.amount })
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.id, expenseId),
          eq(expensesTable.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!expCheck) {
      res.status(404).json({ error: "Gasto no encontrado o no pertenece a esta empresa" });
      return;
    }

    const [row] = await db
      .update(paymentReceiptsTable)
      .set({
        linkedExpenseId: expenseId,
        linkedItemAmount: expCheck.amount.toFixed(2),
        status: "linked",
      })
      .where(
        and(
          eq(paymentReceiptsTable.id, id),
          eq(paymentReceiptsTable.tenantId, tenantId),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Comprobante no encontrado" });
      return;
    }
    res.json(row);
    return;
  }

  // ── Link to a purchase order (PAGO REALIZADO — admin only) ───────────────
  if (purchaseOrderId) {
    const [poCheck] = await db
      .select({ id: purchaseOrdersTable.id, total: purchaseOrdersTable.total })
      .from(purchaseOrdersTable)
      .where(
        and(
          eq(purchaseOrdersTable.id, purchaseOrderId),
          eq(purchaseOrdersTable.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!poCheck) {
      res.status(404).json({ error: "Orden de compra no encontrada o no pertenece a esta empresa" });
      return;
    }

    const [row] = await db
      .update(paymentReceiptsTable)
      .set({
        linkedPurchaseOrderId: purchaseOrderId,
        linkedItemAmount: Number(poCheck.total).toFixed(2),
        status: "linked",
      })
      .where(
        and(
          eq(paymentReceiptsTable.id, id),
          eq(paymentReceiptsTable.tenantId, tenantId),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Comprobante no encontrado" });
      return;
    }
    res.json(row);
    return;
  }

  res.status(400).json({ error: "Se requiere orderId, restaurantOrderId, expenseId, o purchaseOrderId" });
});

// PATCH /api/payment-receipts/:id/discard — discard a receipt
router.patch(
  "/payment-receipts/:id/discard",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }

    const id = parseInt(req.params.id, 10);

    // Admin check for "PAGO REALIZADO" (sent direction) receipts
    const [discardTarget] = await db
      .select({ direction: paymentReceiptsTable.direction })
      .from(paymentReceiptsTable)
      .where(
        and(
          eq(paymentReceiptsTable.id, id),
          eq(paymentReceiptsTable.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!discardTarget) {
      res.status(404).json({ error: "Comprobante no encontrado" });
      return;
    }

    if (discardTarget.direction === "sent") {
      const isAdminOrManagerDiscard =
        req.isSuperAdmin ||
        req.employeeRole === "admin" ||
        req.employeeRole === "manager";
      if (!isAdminOrManagerDiscard) {
        res.status(403).json({ error: "Solo administradores pueden descartar pagos realizados" });
        return;
      }
    }

    const [row] = await db
      .update(paymentReceiptsTable)
      .set({ status: "discarded" })
      .where(
        and(
          eq(paymentReceiptsTable.id, id),
          eq(paymentReceiptsTable.tenantId, tenantId),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Comprobante no encontrado" });
      return;
    }
    res.json(row);
  },
);

// GET /api/payment-receipts/export — export all receipts as CSV
router.get("/payment-receipts/export", async (req, res): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Sin empresa" });
    return;
  }

  const { status, direction, dateFrom, dateTo } = req.query as {
    status?: string;
    direction?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  const conditions = [eq(paymentReceiptsTable.tenantId, tenantId)];
  if (status && status !== "all") {
    conditions.push(eq(paymentReceiptsTable.status, status));
  }
  if (direction === "received" || direction === "sent") {
    conditions.push(eq(paymentReceiptsTable.direction, direction));
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from.getTime()))
      conditions.push(gte(paymentReceiptsTable.receivedAt, from));
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to.getTime()))
      conditions.push(lte(paymentReceiptsTable.receivedAt, to));
  }

  const rows = await db
    .select()
    .from(paymentReceiptsTable)
    .where(and(...conditions))
    .orderBy(desc(paymentReceiptsTable.receivedAt));

  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const DIRECTION_LABELS: Record<string, string> = {
    received: "Recibido",
    sent: "Realizado",
  };
  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente",
    linked: "Vinculado",
    discarded: "Descartado",
  };
  const BANK_LABELS: Record<string, string> = {
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    daviplata: "Daviplata",
    transfiya: "Transfiya",
    bold: "Bold",
    wompi: "Wompi",
    otro: "Otro",
  };

  const headers = [
    "Fecha",
    "Dirección",
    "Banco",
    "Monto",
    "Referencia",
    "Remitente",
    "Contacto",
    "Estado",
    "Pedido vinculado",
  ];
  const csvLines: string[] = [headers.join(",")];

  for (const r of rows) {
    const row = [
      escapeCell(
        r.receivedAt
          ? new Date(r.receivedAt).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "",
      ),
      escapeCell(
        r.direction ? (DIRECTION_LABELS[r.direction] ?? r.direction) : "",
      ),
      escapeCell(r.bank ? (BANK_LABELS[r.bank] ?? r.bank) : ""),
      escapeCell(r.amount ?? ""),
      escapeCell(r.reference ?? ""),
      escapeCell(r.senderName ?? ""),
      escapeCell(r.senderContact ?? ""),
      escapeCell(STATUS_LABELS[r.status] ?? r.status),
      escapeCell(r.linkedOrderId ?? ""),
    ];
    csvLines.push(row.join(","));
  }

  const csv = csvLines.join("\r\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  const statusLabel = status && status !== "all" ? `-${status}` : "";
  const filename = `comprobantes${statusLabel}-${dateStr}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv); // BOM for Excel UTF-8 compatibility
});

// GET /api/payment-receipts/gmail/bancolombia-email — get configured Bancolombia sender email
router.get(
  "/payment-receipts/gmail/bancolombia-email",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    const email = await readSetting(tenantId, "bancolombia_email");
    res.json({ email: email ?? null });
  },
);

// PUT /api/payment-receipts/gmail/bancolombia-email — save Bancolombia sender email
router.put(
  "/payment-receipts/gmail/bancolombia-email",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    const { email } = req.body as { email?: string };
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Correo inválido" });
      return;
    }
    await writeSetting(
      tenantId,
      "bancolombia_email",
      email.trim().toLowerCase(),
    );
    res.json({ ok: true, email: email.trim().toLowerCase() });
  },
);

// GET /api/payment-receipts/gmail/sms-forward-email — get configured SMS-forward sender email
router.get(
  "/payment-receipts/gmail/sms-forward-email",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    const email = await readSetting(tenantId, "sms_forward_email");
    res.json({ email: email ?? null });
  },
);

// PUT /api/payment-receipts/gmail/sms-forward-email — save SMS-forward sender email
router.put(
  "/payment-receipts/gmail/sms-forward-email",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    const { email } = req.body as { email?: string };
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Correo inválido" });
      return;
    }
    await writeSetting(
      tenantId,
      "sms_forward_email",
      email.trim().toLowerCase(),
    );
    res.json({ ok: true, email: email.trim().toLowerCase() });
  },
);

// ── Gmail Filters CRUD ────────────────────────────────────────────────────────

type GmailFilter = {
  id: string;
  label: string;
  query: string;
  category: "payment_received" | "payment_sent" | "invoice" | "other";
  enabled: boolean;
};

const DEFAULT_GMAIL_FILTERS: GmailFilter[] = [
  {
    id: "default-nequi",
    label: "Nequi",
    query: "from:nequi.com.co",
    category: "payment_received",
    enabled: true,
  },
  {
    id: "default-bancolombia",
    label: "Bancolombia",
    query: "from:bancolombia.com",
    category: "payment_received",
    enabled: true,
  },
  {
    id: "default-daviplata",
    label: "Daviplata",
    query: "from:daviplata.com",
    category: "payment_received",
    enabled: true,
  },
  {
    id: "default-transfiya",
    label: "Transfiya",
    query: "from:transfiya.com",
    category: "payment_received",
    enabled: true,
  },
  {
    id: "default-bold",
    label: "Bold",
    query: "from:bold.co",
    category: "payment_received",
    enabled: true,
  },
  {
    id: "default-wompi",
    label: "Wompi",
    query: "from:wompi.co",
    category: "payment_received",
    enabled: true,
  },
];

function cloneDefaultFilters(): GmailFilter[] {
  return DEFAULT_GMAIL_FILTERS.map((f) => ({ ...f }));
}

async function readGmailFilters(tenantId: number): Promise<GmailFilter[]> {
  const raw = await readSetting(tenantId, "gmail_filters");
  if (!raw) return cloneDefaultFilters();
  let filters: GmailFilter[];
  try {
    filters = JSON.parse(raw) as GmailFilter[];
  } catch {
    return cloneDefaultFilters();
  }
  // Normalize legacy format: integer id → String(id), "name" → "label",
  // "sent"/"received" category → "payment_sent"/"payment_received".
  // Using String(id) instead of a new UUID keeps the value deterministic so
  // clients that received the old numeric id (e.g. "1" from a prior GET) can
  // still match on PUT/DELETE without a round-trip.
  let dirty = false;
  const normalized = (filters as any[]).map((f: any): GmailFilter => {
    const out: any = { ...f };
    if (typeof out.id !== "string") {
      out.id = String(out.id);
      dirty = true;
    }
    if (!out.label && out.name) {
      out.label = out.name;
      delete out.name;
      dirty = true;
    }
    if (out.category === "sent") {
      out.category = "payment_sent";
      dirty = true;
    } else if (out.category === "received") {
      out.category = "payment_received";
      dirty = true;
    }
    return out as GmailFilter;
  });
  // Deduplicate by query: if two filters share the same trimmed/lowercased query,
  // keep only the last one (iteration is reversed so later/newer entries win).
  // Guard against malformed rows that lack a query string.
  const seenQueries = new Set<string>();
  filters = normalized
    .slice()
    .reverse()
    .filter((f) => {
      if (typeof f.query !== "string") return true; // keep malformed rows as-is
      const key = f.query.trim().toLowerCase();
      if (seenQueries.has(key)) {
        dirty = true;
        return false;
      }
      seenQueries.add(key);
      return true;
    })
    .reverse();
  if (dirty) {
    await writeSetting(tenantId, "gmail_filters", JSON.stringify(filters));
  }
  return filters;
}

async function writeGmailFilters(
  tenantId: number,
  filters: GmailFilter[],
): Promise<void> {
  await writeSetting(tenantId, "gmail_filters", JSON.stringify(filters));
}

// GET /api/payment-receipts/gmail/filters
router.get(
  "/payment-receipts/gmail/filters",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    // readGmailFilters normalizes legacy formats and deduplicates by query,
    // writing back to DB when changes are found (lazy migration).
    // For first-time tenants with no stored filters, persist defaults so future
    // reads are always tenant-specific and isolated.
    const hasRaw = !!(await readSetting(tenantId, "gmail_filters"));
    const filters = await readGmailFilters(tenantId);
    if (!hasRaw) {
      await writeGmailFilters(tenantId, filters);
    }
    res.json(filters);
  },
);

// POST /api/payment-receipts/gmail/filters
router.post(
  "/payment-receipts/gmail/filters",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    if (
      !req.isSuperAdmin &&
      req.employeeRole !== "admin" &&
      req.employeeRole !== "manager"
    ) {
      res
        .status(403)
        .json({ error: "Se requiere rol de administrador o gerente" });
      return;
    }
    const {
      label,
      query: filterQuery,
      category,
    } = req.body as Partial<GmailFilter>;
    if (!label?.trim() || !filterQuery?.trim() || !category) {
      res.status(400).json({ error: "label, query y category son requeridos" });
      return;
    }
    const VALID_CATEGORIES = new Set([
      "payment_received",
      "payment_sent",
      "invoice",
      "other",
    ]);
    if (!VALID_CATEGORIES.has(category)) {
      res.status(400).json({ error: "Categoría no válida" });
      return;
    }
    const filters = await readGmailFilters(tenantId);
    const newFilter: GmailFilter = {
      id: crypto.randomUUID(),
      label: label.trim(),
      query: filterQuery.trim(),
      category,
      enabled: true,
    };
    filters.push(newFilter);
    await writeGmailFilters(tenantId, filters);
    res.status(201).json(newFilter);
  },
);

// PUT /api/payment-receipts/gmail/filters/:id
router.put(
  "/payment-receipts/gmail/filters/:id",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    if (
      !req.isSuperAdmin &&
      req.employeeRole !== "admin" &&
      req.employeeRole !== "manager"
    ) {
      res
        .status(403)
        .json({ error: "Se requiere rol de administrador o gerente" });
      return;
    }
    const { id } = req.params;
    const filters = await readGmailFilters(tenantId);
    const idx = filters.findIndex((f) => String(f.id) === id);
    if (idx === -1) {
      res.status(404).json({ error: "Filtro no encontrado" });
      return;
    }
    const update = req.body as Partial<GmailFilter>;
    const VALID_CATEGORIES = new Set([
      "payment_received",
      "payment_sent",
      "invoice",
      "other",
    ]);
    if (update.category && !VALID_CATEGORIES.has(update.category)) {
      res.status(400).json({ error: "Categoría no válida" });
      return;
    }
    if (update.label !== undefined && !update.label.trim()) {
      res.status(400).json({ error: "El nombre no puede estar vacío" });
      return;
    }
    if (update.query !== undefined && !update.query.trim()) {
      res.status(400).json({ error: "La consulta no puede estar vacía" });
      return;
    }
    filters[idx] = {
      ...filters[idx],
      ...(update.label !== undefined ? { label: update.label.trim() } : {}),
      ...(update.query !== undefined ? { query: update.query.trim() } : {}),
      ...(update.category !== undefined ? { category: update.category } : {}),
      ...(update.enabled !== undefined ? { enabled: update.enabled } : {}),
    };
    await writeGmailFilters(tenantId, filters);
    res.json(filters[idx]);
  },
);

// DELETE /api/payment-receipts/gmail/filters/:id
router.delete(
  "/payment-receipts/gmail/filters/:id",
  async (req, res): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: "Sin empresa" });
      return;
    }
    if (
      !req.isSuperAdmin &&
      req.employeeRole !== "admin" &&
      req.employeeRole !== "manager"
    ) {
      res
        .status(403)
        .json({ error: "Se requiere rol de administrador o gerente" });
      return;
    }
    const { id } = req.params;
    const filters = await readGmailFilters(tenantId);
    const before = filters.length;
    const updated = filters.filter((f) => String(f.id) !== id);
    if (updated.length === before) {
      res.status(404).json({ error: "Filtro no encontrado" });
      return;
    }
    await writeGmailFilters(tenantId, updated);
    res.status(204).end();
  },
);

// ─── Production Orders ─────────────────────────────────────────────────────────

// Role guard for /production/* — admin, manager, cashier, and cook only.
router.use("/production", requireRole(["admin", "manager", "cashier", "cook"]));

router.get("/production/orders", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const orders = await db
    .select({
      id: productionOrdersTable.id,
      productId: productionOrdersTable.productId,
      productName: productsTable.name,
      productUnit: productsTable.unit,
      quantity: productionOrdersTable.quantity,
      status: productionOrdersTable.status,
      batchCode: productionOrdersTable.batchCode,
      notes: productionOrdersTable.notes,
      completedAt: productionOrdersTable.completedAt,
      createdBy: productionOrdersTable.createdBy,
      createdAt: productionOrdersTable.createdAt,
    })
    .from(productionOrdersTable)
    .leftJoin(
      productsTable,
      eq(productionOrdersTable.productId, productsTable.id),
    )
    .where(
      tid !== undefined ? eq(productionOrdersTable.tenantId, tid) : undefined,
    )
    .orderBy(desc(productionOrdersTable.createdAt));
  res.json(orders);
});

router.get("/production/orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const tid = req.tenantId;
  const [order] = await db
    .select()
    .from(productionOrdersTable)
    .where(
      and(
        eq(productionOrdersTable.id, id),
        tid !== undefined ? eq(productionOrdersTable.tenantId, tid) : undefined,
      ),
    );
  if (!order) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  const recipeRows = await db
    .select({
      id: productRecipesTable.id,
      ingredientId: productRecipesTable.ingredientId,
      inputProductId: productRecipesTable.inputProductId,
      quantity: productRecipesTable.quantity,
      ingredientName: ingredientsTable.name,
      ingredientUnit: ingredientsTable.unit,
      ingredientStock: ingredientsTable.stock,
    })
    .from(productRecipesTable)
    .leftJoin(
      ingredientsTable,
      eq(productRecipesTable.ingredientId, ingredientsTable.id),
    )
    .where(eq(productRecipesTable.productId, order.productId));

  // Also resolve intermediate product names/stock for inputProductId rows
  const inputProductIds = recipeRows
    .filter((r) => r.inputProductId != null)
    .map((r) => r.inputProductId!);
  const inputProds =
    inputProductIds.length > 0
      ? await db
          .select({
            id: productsTable.id,
            name: productsTable.name,
            unit: productsTable.unit,
            stock: productsTable.stock,
          })
          .from(productsTable)
          .where(inArray(productsTable.id, inputProductIds))
      : [];
  const inputProdMap = new Map(inputProds.map((p) => [p.id, p]));

  const recipe = recipeRows.map((r) => {
    if (r.inputProductId != null && r.ingredientName == null) {
      const prod = inputProdMap.get(r.inputProductId);
      return {
        ...r,
        ingredientName: prod?.name ?? `Producto #${r.inputProductId}`,
        ingredientUnit: prod?.unit ?? null,
        ingredientStock: prod?.stock ?? null,
      };
    }
    return r;
  });

  res.json({ ...order, recipe });
});

router.post("/production/orders", async (req, res): Promise<void> => {
  const { productId, quantity, notes, batchCode } = req.body ?? {};
  if (!productId || !quantity || Number(quantity) <= 0) {
    res.status(400).json({ error: "productId y quantity (>0) son requeridos" });
    return;
  }
  const tid = req.tenantId;
  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, Number(productId)),
        tid !== undefined ? eq(productsTable.tenantId, tid) : undefined,
      ),
    );
  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  if (!product.hasRecipe) {
    res
      .status(409)
      .json({
        error: `El producto "${product.name}" no tiene receta. Define una receta antes de crear órdenes de producción.`,
      });
    return;
  }

  const recipe = await db
    .select()
    .from(productRecipesTable)
    .where(eq(productRecipesTable.productId, product.id));
  if (recipe.length === 0) {
    res.status(409).json({ error: "El producto no tiene filas de receta" });
    return;
  }

  // Validate inputs are available
  const qty = Number(quantity);
  const ingredientIds = recipe
    .filter((r) => r.ingredientId != null)
    .map((r) => r.ingredientId!);
  const inputProductIds = recipe
    .filter((r) => r.inputProductId != null)
    .map((r) => r.inputProductId!);

  const [ingredients, inputProducts] = await Promise.all([
    ingredientIds.length > 0
      ? db
          .select()
          .from(ingredientsTable)
          .where(inArray(ingredientsTable.id, ingredientIds))
      : Promise.resolve([]),
    inputProductIds.length > 0
      ? db
          .select()
          .from(productsTable)
          .where(inArray(productsTable.id, inputProductIds))
      : Promise.resolve([]),
  ]);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const prodMap = new Map(inputProducts.map((p) => [p.id, p]));

  for (const r of recipe) {
    const needed = r.quantity * qty;
    if (r.ingredientId != null) {
      const ing = ingMap.get(r.ingredientId);
      if (!ing || ing.stock < needed) {
        res
          .status(400)
          .json({
            error: `Ingrediente "${ing?.name ?? `#${r.ingredientId}`}" insuficiente. Necesita ${needed} ${ing?.unit ?? ""}, hay ${ing?.stock ?? 0}.`,
          });
        return;
      }
    }
    if (r.inputProductId != null) {
      const prod = prodMap.get(r.inputProductId);
      if (!prod || prod.stock < needed) {
        res
          .status(400)
          .json({
            error: `Producto intermedio "${prod?.name ?? `#${r.inputProductId}`}" insuficiente. Necesita ${needed}, hay ${prod?.stock ?? 0}.`,
          });
        return;
      }
    }
  }

  const [created] = await db
    .insert(productionOrdersTable)
    .values({
      productId: product.id,
      quantity: qty,
      status: "pending",
      notes: notes ?? null,
      batchCode: batchCode ?? null,
      createdBy: req.employeeId?.toString() ?? null,
      tenantId: tid,
    })
    .returning();
  res.status(201).json(created);
});

router.post(
  "/production/orders/:id/complete",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const tid = req.tenantId;
    const [order] = await db
      .select()
      .from(productionOrdersTable)
      .where(
        and(
          eq(productionOrdersTable.id, id),
          tid !== undefined
            ? eq(productionOrdersTable.tenantId, tid)
            : undefined,
        ),
      );
    if (!order) {
      res.status(404).json({ error: "Orden no encontrada" });
      return;
    }
    if (order.status !== "pending") {
      res
        .status(409)
        .json({ error: `La orden ya está en estado "${order.status}"` });
      return;
    }

    const qty = Number(order.quantity);
    const recipe = await db
      .select()
      .from(productRecipesTable)
      .where(eq(productRecipesTable.productId, order.productId));

    const ingredientIds = recipe
      .filter((r) => r.ingredientId != null)
      .map((r) => r.ingredientId!);
    const inputProductIds = recipe
      .filter((r) => r.inputProductId != null)
      .map((r) => r.inputProductId!);
    const [ingredients, inputProducts] = await Promise.all([
      ingredientIds.length > 0
        ? db
            .select()
            .from(ingredientsTable)
            .where(inArray(ingredientsTable.id, ingredientIds))
        : Promise.resolve([]),
      inputProductIds.length > 0
        ? db
            .select()
            .from(productsTable)
            .where(inArray(productsTable.id, inputProductIds))
        : Promise.resolve([]),
    ]);
    const ingMap = new Map(ingredients.map((i) => [i.id, i]));
    const prodMap = new Map(inputProducts.map((p) => [p.id, p]));

    for (const r of recipe) {
      const needed = r.quantity * qty;
      if (r.ingredientId != null) {
        const ing = ingMap.get(r.ingredientId);
        if (!ing || ing.stock < needed) {
          res
            .status(400)
            .json({
              error: `Ingrediente "${ing?.name ?? `#${r.ingredientId}`}" insuficiente. Necesita ${needed}, hay ${ing?.stock ?? 0}.`,
            });
          return;
        }
      }
      if (r.inputProductId != null) {
        const prod = prodMap.get(r.inputProductId);
        if (!prod || prod.stock < needed) {
          res
            .status(400)
            .json({
              error: `Producto intermedio "${prod?.name ?? `#${r.inputProductId}`}" insuficiente. Necesita ${needed}, hay ${prod?.stock ?? 0}.`,
            });
          return;
        }
      }
    }

    const result = await db
      .transaction(async (tx) => {
        // Deduct ingredient inputs
        for (const r of recipe) {
          const needed = r.quantity * qty;
          if (r.ingredientId != null) {
            const updated = await tx
              .update(ingredientsTable)
              .set({ stock: sql`${ingredientsTable.stock} - ${needed}` })
              .where(
                and(
                  eq(ingredientsTable.id, r.ingredientId),
                  gte(ingredientsTable.stock, needed),
                ),
              )
              .returning({ id: ingredientsTable.id });
            if (updated.length === 0)
              throw new Error(
                `OUT_OF_INGREDIENT:${ingMap.get(r.ingredientId)?.name ?? `#${r.ingredientId}`}`,
              );
          }
          if (r.inputProductId != null) {
            const updated = await tx
              .update(productsTable)
              .set({ stock: sql`${productsTable.stock} - ${needed}` })
              .where(
                and(
                  eq(productsTable.id, r.inputProductId),
                  gte(productsTable.stock, needed),
                ),
              )
              .returning({ id: productsTable.id });
            if (updated.length === 0)
              throw new Error(
                `OUT_OF_STOCK:${prodMap.get(r.inputProductId)?.name ?? `#${r.inputProductId}`}`,
              );
          }
        }
        // Add produced stock to product
        await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} + ${qty}` })
          .where(eq(productsTable.id, order.productId));
        // Mark order as completed
        const [completed] = await tx
          .update(productionOrdersTable)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(productionOrdersTable.id, id))
          .returning();
        return completed;
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          if (err.message.startsWith("OUT_OF_INGREDIENT:"))
            return {
              __error: `Ingrediente "${err.message.slice(18)}" insuficiente (otra operación lo agotó). Reintenta.`,
            } as const;
          if (err.message.startsWith("OUT_OF_STOCK:"))
            return {
              __error: `"${err.message.slice(13)}" sin stock suficiente. Reintenta.`,
            } as const;
        }
        throw err;
      });

    if (result && "__error" in result) {
      res.status(409).json({ error: result.__error });
      return;
    }
    res.json(result);
  },
);

router.delete("/production/orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const tid = req.tenantId;
  const [order] = await db
    .select()
    .from(productionOrdersTable)
    .where(
      and(
        eq(productionOrdersTable.id, id),
        tid !== undefined ? eq(productionOrdersTable.tenantId, tid) : undefined,
      ),
    );
  if (!order) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }
  if (order.status === "completed") {
    res
      .status(409)
      .json({ error: "No se puede cancelar una orden ya completada" });
    return;
  }
  await db
    .update(productionOrdersTable)
    .set({ status: "cancelled" })
    .where(eq(productionOrdersTable.id, id));
  res.status(204).send();
});

// ── Production Processes & Stages ───────────  �─────────────────────────────────

// GET /production/processes — list all processes for tenant
router.get("/production/processes", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const rows = await db
    .select({
      id: productionProcessesTable.id,
      productId: productionProcessesTable.productId,
      productName: productsTable.name,
      productUnit: productsTable.unit,
      productImageUrl: productsTable.imageUrl,
      productType: productsTable.productType,
      processType: productionProcessesTable.processType,
      expectedYieldMin: productionProcessesTable.expectedYieldMin,
      expectedYieldMax: productionProcessesTable.expectedYieldMax,
      createdAt: productionProcessesTable.createdAt,
      updatedAt: productionProcessesTable.updatedAt,
    })
    .from(productionProcessesTable)
    .innerJoin(
      productsTable,
      eq(productionProcessesTable.productId, productsTable.id),
    )
    .where(
      tid !== undefined
        ? eq(productionProcessesTable.tenantId, tid)
        : undefined,
    )
    .orderBy(productsTable.name);
  res.json(rows);
});

// GET /production/processes/by-product/:productId — get process for a product
router.get(
  "/production/processes/by-product/:productId",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const productId = Number(req.params.productId);
    if (isNaN(productId)) {
      res.status(400).json({ error: "productId inválido" });
      return;
    }

    const [process] = await db
      .select()
      .from(productionProcessesTable)
      .where(
        and(
          eq(productionProcessesTable.productId, productId),
          tid !== undefined
            ? eq(productionProcessesTable.tenantId, tid)
            : undefined,
        ),
      )
      .limit(1);

    if (!process) {
      res.status(404).json({ error: "Proceso no encontrado" });
      return;
    }

    const stages = await db
      .select()
      .from(productionStagesTable)
      .where(eq(productionStagesTable.processId, process.id))
      .orderBy(asc(productionStagesTable.position));

    res.json({ ...process, stages });
  },
);

// GET /production/processes/:id — get process with stages
router.get("/production/processes/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const [process] = await db
    .select({
      id: productionProcessesTable.id,
      productId: productionProcessesTable.productId,
      productName: productsTable.name,
      productUnit: productsTable.unit,
      productSku: productsTable.sku,
      productImageUrl: productsTable.imageUrl,
      productType: productsTable.productType,
      processType: productionProcessesTable.processType,
      expectedYieldMin: productionProcessesTable.expectedYieldMin,
      expectedYieldMax: productionProcessesTable.expectedYieldMax,
      tenantId: productionProcessesTable.tenantId,
      createdAt: productionProcessesTable.createdAt,
      updatedAt: productionProcessesTable.updatedAt,
    })
    .from(productionProcessesTable)
    .innerJoin(
      productsTable,
      eq(productionProcessesTable.productId, productsTable.id),
    )
    .where(
      and(
        eq(productionProcessesTable.id, id),
        tid !== undefined
          ? eq(productionProcessesTable.tenantId, tid)
          : undefined,
      ),
    )
    .limit(1);

  if (!process) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return;
  }

  const stages = await db
    .select()
    .from(productionStagesTable)
    .where(eq(productionStagesTable.processId, id))
    .orderBy(asc(productionStagesTable.position));

  res.json({ ...process, stages });
});

// POST /production/processes — create process for a product (one per product)
router.post("/production/processes", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(400).json({ error: "Tenant requerido" });
    return;
  }

  const parsed = insertProductionProcessSchema.safeParse({
    ...req.body,
    tenantId: tid,
  });
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }

  const [existing] = await db
    .select({ id: productionProcessesTable.id })
    .from(productionProcessesTable)
    .where(
      and(
        eq(productionProcessesTable.productId, parsed.data.productId),
        eq(productionProcessesTable.tenantId, tid),
      ),
    )
    .limit(1);

  if (existing) {
    res
      .status(409)
      .json({
        error: "Ya existe un proceso para este producto",
        id: existing.id,
      });
    return;
  }

  const [created] = await db
    .insert(productionProcessesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

// PUT /production/processes/:id — update process properties
router.put("/production/processes/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const parsed = updateProductionProcessSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }

  const [updated] = await db
    .update(productionProcessesTable)
    .set(parsed.data)
    .where(
      and(
        eq(productionProcessesTable.id, id),
        tid !== undefined
          ? eq(productionProcessesTable.tenantId, tid)
          : undefined,
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return;
  }
  res.json(updated);
});

// DELETE /production/processes/:id — delete process and all its stages
router.delete("/production/processes/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  // Verify ownership FIRST — before deleting any child rows
  const [existing] = await db
    .select({ id: productionProcessesTable.id })
    .from(productionProcessesTable)
    .where(
      and(
        eq(productionProcessesTable.id, id),
        tid !== undefined
          ? eq(productionProcessesTable.tenantId, tid)
          : undefined,
      ),
    )
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return;
  }

  await db
    .delete(productionStagesTable)
    .where(eq(productionStagesTable.processId, id));
  await db
    .delete(productionProcessesTable)
    .where(eq(productionProcessesTable.id, id));

  res.json({ ok: true });
});

// POST /production/processes/:id/stages — add a stage
router.post(
  "/production/processes/:id/stages",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const processId = Number(req.params.id);
    if (isNaN(processId)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const [process] = await db
      .select({ id: productionProcessesTable.id })
      .from(productionProcessesTable)
      .where(
        and(
          eq(productionProcessesTable.id, processId),
          tid !== undefined
            ? eq(productionProcessesTable.tenantId, tid)
            : undefined,
        ),
      )
      .limit(1);
    if (!process) {
      res.status(404).json({ error: "Proceso no encontrado" });
      return;
    }

    const [maxRow] = await db
      .select({
        pos: sql<number>`coalesce(max(${productionStagesTable.position}), -1)`,
      })
      .from(productionStagesTable)
      .where(eq(productionStagesTable.processId, processId));

    const nextPos = (maxRow?.pos ?? -1) + 1;

    const parsed = insertProductionStageSchema.safeParse({
      ...req.body,
      processId,
      position: nextPos,
      tenantId: tid,
    });
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      return;
    }

    const [created] = await db
      .insert(productionStagesTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(created);
  },
);

// PUT /production/processes/:id/stages/:stageId — update a stage
router.put(
  "/production/processes/:id/stages/:stageId",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const stageId = Number(req.params.stageId);
    const processId = Number(req.params.id);
    if (isNaN(stageId) || isNaN(processId)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const parsed = updateProductionStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
      return;
    }

    // Verify the parent process belongs to this tenant before updating its stage
    const [process] = await db
      .select({ id: productionProcessesTable.id })
      .from(productionProcessesTable)
      .where(
        and(
          eq(productionProcessesTable.id, processId),
          tid !== undefined
            ? eq(productionProcessesTable.tenantId, tid)
            : undefined,
        ),
      )
      .limit(1);
    if (!process) {
      res.status(404).json({ error: "Proceso no encontrado" });
      return;
    }

    const [updated] = await db
      .update(productionStagesTable)
      .set(parsed.data)
      .where(
        and(
          eq(productionStagesTable.id, stageId),
          eq(productionStagesTable.processId, processId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Etapa no encontrada" });
      return;
    }
    res.json(updated);
  },
);

// DELETE /production/processes/:id/stages/:stageId — remove a stage
router.delete(
  "/production/processes/:id/stages/:stageId",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const stageId = Number(req.params.stageId);
    const processId = Number(req.params.id);
    if (isNaN(stageId) || isNaN(processId)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    // Verify the parent process belongs to this tenant
    const [process] = await db
      .select({ id: productionProcessesTable.id })
      .from(productionProcessesTable)
      .where(
        and(
          eq(productionProcessesTable.id, processId),
          tid !== undefined
            ? eq(productionProcessesTable.tenantId, tid)
            : undefined,
        ),
      )
      .limit(1);
    if (!process) {
      res.status(404).json({ error: "Proceso no encontrado" });
      return;
    }

    const [deleted] = await db
      .delete(productionStagesTable)
      .where(
        and(
          eq(productionStagesTable.id, stageId),
          eq(productionStagesTable.processId, processId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Etapa no encontrada" });
      return;
    }

    const remainingStages = await db
      .select()
      .from(productionStagesTable)
      .where(eq(productionStagesTable.processId, processId))
      .orderBy(asc(productionStagesTable.position));

    await Promise.all(
      remainingStages.map((s, i) =>
        db
          .update(productionStagesTable)
          .set({ position: i })
          .where(eq(productionStagesTable.id, s.id)),
      ),
    );

    res.json({ ok: true });
  },
);

// PUT /production/processes/:id/stages/reorder — reorder stages
router.put(
  "/production/processes/:id/stages/reorder",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const processId = Number(req.params.id);
    if (isNaN(processId)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    // Verify the parent process belongs to this tenant
    const [process] = await db
      .select({ id: productionProcessesTable.id })
      .from(productionProcessesTable)
      .where(
        and(
          eq(productionProcessesTable.id, processId),
          tid !== undefined
            ? eq(productionProcessesTable.tenantId, tid)
            : undefined,
        ),
      )
      .limit(1);
    if (!process) {
      res.status(404).json({ error: "Proceso no encontrado" });
      return;
    }

    const items = z
      .array(z.object({ id: z.number(), position: z.number() }))
      .safeParse(req.body);
    if (!items.success) {
      res.status(400).json({ error: "Formato inválido" });
      return;
    }

    await Promise.all(
      items.data.map(({ id, position }) =>
        db
          .update(productionStagesTable)
          .set({ position })
          .where(
            and(
              eq(productionStagesTable.id, id),
              eq(productionStagesTable.processId, processId),
            ),
          ),
      ),
    );

    res.json({ ok: true });
  },
);

// ── Reorder Requests — historial de pedidos a proveedores ─────────────────────

// GET /ingredients/reorder-log — list reorder history for tenant
router.get("/ingredients/reorder-log", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const ingredientId = req.query.ingredientId
    ? Number(req.query.ingredientId)
    : undefined;
  const limit = Math.min(Number(req.query.limit ?? 100), 200);

  const rows = await db
    .select()
    .from(reorderRequestsTable)
    .where(
      and(
        tid ? eq(reorderRequestsTable.tenantId, tid) : undefined,
        ingredientId
          ? eq(reorderRequestsTable.ingredientId, ingredientId)
          : undefined,
      ),
    )
    .orderBy(desc(reorderRequestsTable.createdAt))
    .limit(limit);

  res.json(rows);
});

// POST /ingredients/:id/reorder-request — log a reorder action
router.post("/ingredients/:id/reorder-request", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(400).json({ error: "Tenant requerido" });
    return;
  }

  const ingredientId = Number(req.params.id);
  const [ingredient] = await db
    .select()
    .from(ingredientsTable)
    .where(
      and(
        eq(ingredientsTable.id, ingredientId),
        eq(ingredientsTable.tenantId, tid),
      ),
    );
  if (!ingredient) {
    res.status(404).json({ error: "Ingrediente no encontrado" });
    return;
  }

  const { supplierId, supplierName, quantity, unit, via, notes } = req.body;

  // Validate optional fields
  const allowedVia = ["whatsapp", "email", "manual"];
  if (via !== undefined && !allowedVia.includes(via)) {
    res
      .status(400)
      .json({ error: `via debe ser uno de: ${allowedVia.join(", ")}` });
    return;
  }
  if (
    quantity !== undefined &&
    (typeof quantity !== "number" || quantity <= 0)
  ) {
    res.status(400).json({ error: "quantity debe ser un número positivo" });
    return;
  }

  // Resolve requestedBy server-side from the authenticated employee — never trust the client
  let requestedBy: string | null = null;
  if (req.employeeId) {
    const [emp] = await db
      .select({ name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, req.employeeId));
    requestedBy = emp?.name ?? null;
  }

  const [created] = await db
    .insert(reorderRequestsTable)
    .values({
      tenantId: tid,
      ingredientId,
      ingredientName: ingredient.name,
      supplierId: supplierId ?? ingredient.supplierId ?? null,
      supplierName: supplierName ?? null,
      quantity:
        quantity ??
        Math.max(
          1,
          Math.ceil((ingredient.lowStockThreshold ?? 0) - ingredient.stock),
        ),
      unit: unit ?? ingredient.unit,
      via: via ?? "whatsapp",
      requestedBy,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(created);
});

// ── Ingredient Merma (waste) ───────────────────────────────────────────────────

router.post("/ingredients/:id/merma", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const tid = req.tenantId;
    if (!id) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const qty = Number(req.body.quantity);
    if (!qty || qty <= 0) {
      res.status(400).json({ error: "Cantidad inválida" });
      return;
    }
    const { reason, notes } = req.body as { reason?: string; notes?: string };
    const [ing] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.id, id),
          tid ? eq(ingredientsTable.tenantId, tid) : undefined,
        ),
      );
    if (!ing) {
      res.status(404).json({ error: "Ingrediente no encontrado" });
      return;
    }
    const [updated] = await db.transaction(async (tx) => {
      await tx.insert(ingredientMovementsTable).values({
        type: "merma",
        ingredientId: id,
        quantity: qty,
        reason: reason || "Merma registrada",
        notes: notes || "",
        tenantId: req.tenantId ?? null,
      });
      return tx
        .update(ingredientsTable)
        .set({ stock: sql`${ingredientsTable.stock} - ${qty}` })
        .where(eq(ingredientsTable.id, id))
        .returning();
    });
    if (req.tenantId !== undefined)
      sseBus.broadcast(req.tenantId, "ingredients_updated");
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar la merma" });
  }
});

// ── Smart Screens / Pantallas Inteligentes ────────────────────────────────────

// Helper: get screen by token (no tenant check — token IS the auth)
async function getScreenByToken(token: string) {
  const [screen] = await db
    .select()
    .from(screensTable)
    .where(eq(screensTable.token, token));
  return screen ?? null;
}

// Short code generator (avoids confusable chars: 0,o,1,l,i)
const SC_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function genShortCode(): string {
  return Array.from(
    { length: 6 },
    () => SC_CHARS[Math.floor(Math.random() * SC_CHARS.length)],
  ).join("");
}
async function uniqueShortCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = genShortCode();
    const [ex] = await db
      .select({ id: screensTable.id })
      .from(screensTable)
      .where(eq(screensTable.shortCode, code));
    if (!ex) return code;
  }
  return genShortCode();
}

// Email alert when a new device connects
async function sendNewDeviceAlert(
  adminEmail: string,
  tenantName: string,
  screenName: string,
  ip: string,
  ua: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const device = /android|mobile|iphone/i.test(ua)
    ? "Móvil"
    : /ipad|tablet/i.test(ua)
      ? "Tablet"
      : /smart-?tv|tizen|webos|hbbtv|roku/i.test(ua)
        ? "Smart TV"
        : "Computadora";
  // nosemgrep: html-in-template-string — server-side alert email; tenant/screen values are string interpolations, not user-controlled HTML
  const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#ef4444;margin:0 0 16px">⚠️ Nuevo dispositivo conectado</h2>
    <p>Un nuevo dispositivo se conectó a la pantalla <strong>"${screenName}"</strong> en <strong>${tenantName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:110px">Tipo:</td><td>${device}</td></tr>
      <tr><td style="padding:6px 0;color:#666">IP:</td><td style="font-family:monospace">${ip || "desconocida"}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Fecha:</td><td>${new Date().toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })}</td></tr>
    </table>
    <p style="font-size:13px;color:#555">Si no reconoces este dispositivo, entra al panel de Pantallas y presiona <strong>"Revocar enlace"</strong> para desconectarlo.</p>
    <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
  </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: "FYRO APP <notificaciones@resend.dev>",
      to: adminEmail,
      subject: `⚠️ Nuevo dispositivo en pantalla "${screenName}"`,
      html,
    }),
  }).catch(() => {});
}

// GET /screens — list screens for tenant
router.get("/screens", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const screens = await db
    .select()
    .from(screensTable)
    .where(tid ? eq(screensTable.tenantId, tid) : undefined)
    .orderBy(screensTable.name);
  res.json(screens);
});

// GET /screens/public/s/:code — resolve short code → token (public)
router.get("/screens/public/s/:code", async (req, res): Promise<void> => {
  const [screen] = await db
    .select({ token: screensTable.token })
    .from(screensTable)
    .where(eq(screensTable.shortCode, req.params.code.toLowerCase()));
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  res.json({ token: screen.token });
});

// POST /screens/public/:token/session — register / heartbeat viewer session
router.post(
  "/screens/public/:token/session",
  async (req, res): Promise<void> => {
    const screen = await getScreenByToken(req.params.token);
    if (!screen) {
      res.status(404).json({ error: "Pantalla no encontrada" });
      return;
    }
    const { sessionKey, userAgent } = req.body;
    if (!sessionKey) {
      res.status(400).json({ error: "sessionKey requerido" });
      return;
    }
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";
    const ua = userAgent || req.headers["user-agent"] || "";
    const [existing] = await db
      .select()
      .from(screenSessionsTable)
      .where(
        and(
          eq(screenSessionsTable.screenId, screen.id),
          eq(screenSessionsTable.sessionKey, sessionKey),
        ),
      );
    if (!existing) {
      await db
        .insert(screenSessionsTable)
        .values({
          screenId: screen.id,
          tenantId: screen.tenantId,
          sessionKey,
          ipAddress: ip,
          userAgent: ua,
          notifiedAt: null,
        })
        .onConflictDoNothing();
      const [tenant] = await db
        .select({
          adminEmail: tenantsTable.adminEmail,
          name: tenantsTable.name,
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, screen.tenantId));
      if (tenant?.adminEmail) {
        sendNewDeviceAlert(
          tenant.adminEmail,
          tenant.name,
          screen.name,
          ip,
          ua,
        ).catch(() => {});
        await db
          .update(screenSessionsTable)
          .set({ notifiedAt: new Date() })
          .where(
            and(
              eq(screenSessionsTable.screenId, screen.id),
              eq(screenSessionsTable.sessionKey, sessionKey),
            ),
          );
      }
    } else {
      await db
        .update(screenSessionsTable)
        .set({ lastSeenAt: new Date(), ipAddress: ip })
        .where(eq(screenSessionsTable.id, existing.id));
    }
    res.json({ ok: true });
  },
);

// GET /screens/:id/sessions — list active sessions (admin)
router.get("/screens/:id/sessions", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [screen] = await db
    .select({ id: screensTable.id })
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const sessions = await db
    .select()
    .from(screenSessionsTable)
    .where(eq(screenSessionsTable.screenId, id))
    .orderBy(desc(screenSessionsTable.lastSeenAt))
    .limit(20);
  res.json(sessions);
});

// POST /screens/:id/revoke — regenerate token + shortCode (invalidates all old sessions)
router.post("/screens/:id/revoke", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [existing] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const newToken = crypto.randomUUID();
  const newCode = await uniqueShortCode();
  await db
    .delete(screenSessionsTable)
    .where(eq(screenSessionsTable.screenId, id));
  const [updated] = await db
    .update(screensTable)
    .set({ token: newToken, shortCode: newCode })
    .where(eq(screensTable.id, id))
    .returning();
  res.json(updated);
});

// POST /screens — create screen
router.post("/screens", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(400).json({ error: "Tenant requerido" });
    return;
  }
  const { name, location, screenType, status, pin } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Nombre requerido" });
    return;
  }
  const token = crypto.randomUUID();
  const shortCode = await uniqueShortCode();
  const [created] = await db
    .insert(screensTable)
    .values({
      name: name.trim(),
      location: location || null,
      screenType: screenType || "advertising",
      status: status || "active",
      pin: pin || null,
      token,
      shortCode,
      tenantId: tid,
    })
    .returning();
  res.status(201).json(created);
});

// GET /screens/:id — get single screen
router.get("/screens/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [screen] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  res.json(screen);
});

// PUT /screens/:id — update screen
router.put("/screens/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [existing] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const { name, location, screenType, status, pin, musicUrl, musicConfig } =
    req.body;
  const [updated] = await db
    .update(screensTable)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(location !== undefined && { location: location || null }),
      ...(screenType !== undefined && { screenType }),
      ...(status !== undefined && { status }),
      ...(pin !== undefined && { pin: pin || null }),
      ...(musicUrl !== undefined && { musicUrl: musicUrl || null }),
      ...(musicConfig !== undefined && { musicConfig: musicConfig || null }),
    })
    .where(eq(screensTable.id, id))
    .returning();
  res.json(updated);
});

// DELETE /screens/:id — delete screen
router.delete("/screens/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [existing] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  await db.delete(screensTable).where(eq(screensTable.id, id));
  res.status(204).send();
});

// POST /screens/:id/refresh — bump lastPushedAt to trigger viewer refresh
router.post("/screens/:id/refresh", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [existing] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const [updated] = await db
    .update(screensTable)
    .set({ lastPushedAt: new Date() })
    .where(eq(screensTable.id, id))
    .returning();
  res.json(updated);
});

// GET /screens/:id/items — list playlist items
router.get("/screens/:id/items", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const tid = req.tenantId;
  const [screen] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, id),
        tid ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const items = await db
    .select()
    .from(screenPlaylistItemsTable)
    .where(eq(screenPlaylistItemsTable.screenId, id))
    .orderBy(screenPlaylistItemsTable.sortOrder);
  res.json(items);
});

// POST /screens/:id/items — add playlist item
router.post("/screens/:id/items", async (req, res): Promise<void> => {
  const screenId = Number(req.params.id);
  const tid = req.tenantId;
  if (!tid) {
    res.status(400).json({ error: "Tenant requerido" });
    return;
  }
  const [screen] = await db
    .select()
    .from(screensTable)
    .where(and(eq(screensTable.id, screenId), eq(screensTable.tenantId, tid)));
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const { contentType, contentData, durationSeconds, sortOrder, isActive } =
    req.body;
  if (!contentType) {
    res.status(400).json({ error: "contentType requerido" });
    return;
  }
  const [created] = await db
    .insert(screenPlaylistItemsTable)
    .values({
      screenId,
      tenantId: tid,
      contentType,
      contentData: contentData ?? {},
      durationSeconds: durationSeconds ?? 15,
      sortOrder: sortOrder ?? 0,
      isActive: isActive !== false,
    })
    .returning();
  res.status(201).json(created);
});

// PUT /screens/:id/items/:itemId — update playlist item
router.put("/screens/:id/items/:itemId", async (req, res): Promise<void> => {
  const screenId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const tid = req.tenantId;
  const [item] = await db
    .select()
    .from(screenPlaylistItemsTable)
    .where(
      and(
        eq(screenPlaylistItemsTable.id, itemId),
        eq(screenPlaylistItemsTable.screenId, screenId),
      ),
    );
  if (!item) {
    res.status(404).json({ error: "Item no encontrado" });
    return;
  }
  const { contentData, durationSeconds, sortOrder, isActive } = req.body;
  const [updated] = await db
    .update(screenPlaylistItemsTable)
    .set({
      ...(contentData !== undefined && { contentData }),
      ...(durationSeconds !== undefined && { durationSeconds }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    })
    .where(eq(screenPlaylistItemsTable.id, itemId))
    .returning();
  res.json(updated);
});

// DELETE /screens/:id/items/:itemId — delete playlist item
router.delete("/screens/:id/items/:itemId", async (req, res): Promise<void> => {
  const screenId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const [item] = await db
    .select()
    .from(screenPlaylistItemsTable)
    .where(
      and(
        eq(screenPlaylistItemsTable.id, itemId),
        eq(screenPlaylistItemsTable.screenId, screenId),
      ),
    );
  if (!item) {
    res.status(404).json({ error: "Item no encontrado" });
    return;
  }
  await db
    .delete(screenPlaylistItemsTable)
    .where(eq(screenPlaylistItemsTable.id, itemId));
  res.status(204).send();
});

// POST /screens/:id/skip — remote-control: advance playlist one step
router.post("/screens/:id/skip", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const screenId = Number(req.params.id);
  const [screen] = await db
    .select()
    .from(screensTable)
    .where(
      and(
        eq(screensTable.id, screenId),
        tid !== undefined ? eq(screensTable.tenantId, tid) : undefined,
      ),
    );
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const next = (skipVersions.get(screenId) ?? 0) + 1;
  skipVersions.set(screenId, next);
  res.json({ skipVersion: next });
});

// ── PUBLIC screen endpoints (no employee session — token IS auth) ───────────

// DELETE /screens/public/:token/items/:itemId — self-destruct a playOnce item from the viewer
// Auth: token ownership is sufficient — no extra playOnce check (client-side already guards it)
router.delete(
  "/screens/public/:token/items/:itemId",
  async (req, res): Promise<void> => {
    const screen = await getScreenByToken(req.params.token);
    if (!screen) {
      res.status(404).json({ error: "Pantalla no encontrada" });
      return;
    }
    const itemId = Number(req.params.itemId);
    const [item] = await db
      .select()
      .from(screenPlaylistItemsTable)
      .where(
        and(
          eq(screenPlaylistItemsTable.id, itemId),
          eq(screenPlaylistItemsTable.screenId, screen.id),
        ),
      );
    if (!item) {
      res.status(204).send();
      return;
    } // Already gone — treat as success
    await db
      .delete(screenPlaylistItemsTable)
      .where(eq(screenPlaylistItemsTable.id, itemId));
    res.status(204).send();
  },
);

// GET /screens/public/:token/config — full config + items for viewer
router.get("/screens/public/:token/config", async (req, res): Promise<void> => {
  const screen = await getScreenByToken(req.params.token);
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const items = await db
    .select()
    .from(screenPlaylistItemsTable)
    .where(
      and(
        eq(screenPlaylistItemsTable.screenId, screen.id),
        eq(screenPlaylistItemsTable.isActive, true),
      ),
    )
    .orderBy(screenPlaylistItemsTable.sortOrder);
  res.json({ ...screen, items, skipVersion: skipVersions.get(screen.id) ?? 0 });
});

// GET /screens/public/:token/kds — kitchen orders for screen's tenant
router.get("/screens/public/:token/kds", async (req, res): Promise<void> => {
  const screen = await getScreenByToken(req.params.token);
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const tid = screen.tenantId;
  const items = await db
    .select({
      itemId: restaurantOrderItemsTable.id,
      productName: productsTable.name,
      quantity: restaurantOrderItemsTable.quantity,
      notes: restaurantOrderItemsTable.notes,
      tableName: restaurantTablesTable.name,
      serverName: restaurantOrdersTable.serverName, // <-- Corregido (antes employeesTable.name)
      orderedAt: restaurantOrdersTable.createdAt, // <-- Corregido (antes leía del item)
    })
    .from(restaurantOrderItemsTable)
    .innerJoin(
      restaurantOrdersTable,
      eq(restaurantOrderItemsTable.orderId, restaurantOrdersTable.id),
    )
    .innerJoin(
      productsTable,
      eq(restaurantOrderItemsTable.productId, productsTable.id),
    )
    .leftJoin(
      restaurantTablesTable,
      eq(restaurantOrdersTable.tableId, restaurantTablesTable.id),
    )
    // <-- Se eliminó el join a employeesTable que causaba el error
    .where(
      and(
        eq(restaurantOrdersTable.status, "open"), // <-- Corregido (antes buscaba status en el item)
        tid ? eq(restaurantTablesTable.tenantId, tid) : undefined,
      ),
    )
    .orderBy(asc(restaurantOrdersTable.createdAt)); // <-- Corregido
  res.json(items);
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFER REQUESTS — solicitudes de traslado entre bodegas
// ══════════════════════════════════════════════════════════════════════════════

// GET /warehouses/:id/min-stock — mínimos de una bodega
router.get("/warehouses/:id/min-stock", async (req, res) => {
  const warehouseId = parseInt(req.params.id, 10);
  if (isNaN(warehouseId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT m.id, m.warehouse_id, m.ingredient_id, m.min_qty,
           i.name AS ingredient_name, i.unit AS ingredient_unit
    FROM ingredient_warehouse_min_stock m
    JOIN ingredients i ON i.id = m.ingredient_id
    WHERE m.warehouse_id = ${warehouseId}
    ORDER BY i.name
  `);
  res.json(rows.rows);
});

// PUT /warehouses/:id/min-stock — guardar mínimos (upsert masivo)
router.put("/warehouses/:id/min-stock", async (req, res) => {
  const warehouseId = parseInt(req.params.id, 10);
  if (isNaN(warehouseId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const items: { ingredientId: number; minQty: number }[] =
    req.body?.items ?? [];
  for (const item of items) {
    await db.execute(sql`
      INSERT INTO ingredient_warehouse_min_stock (warehouse_id, ingredient_id, min_qty)
      VALUES (${warehouseId}, ${item.ingredientId}, ${item.minQty})
      ON CONFLICT (warehouse_id, ingredient_id)
      DO UPDATE SET min_qty = EXCLUDED.min_qty, updated_at = NOW()
    `);
  }
  res.json({ ok: true });
});

// GET /transfer-requests — listar solicitudes del tenant
router.get("/transfer-requests", async (req, res) => {
  const tid = req.tenantId;
  const rows = await db.execute(sql`
    SELECT tr.id, tr.status, tr.notes, tr.requested_by, tr.approved_by, tr.executed_by,
           tr.from_warehouse_id, fw.name AS from_warehouse_name,
           tr.to_warehouse_id, tw.name AS to_warehouse_name,
           tr.created_at, tr.updated_at,
           json_agg(
             json_build_object(
               'id', tri.id,
               'ingredientId', tri.ingredient_id,
               'ingredientName', i.name,
               'ingredientUnit', i.unit,
               'requestedQty', tri.requested_qty,
               'approvedQty', tri.approved_qty
             ) ORDER BY i.name
           ) AS items
    FROM transfer_requests tr
    JOIN warehouses fw ON fw.id = tr.from_warehouse_id
    JOIN warehouses tw ON tw.id = tr.to_warehouse_id
    LEFT JOIN transfer_request_items tri ON tri.transfer_request_id = tr.id
    LEFT JOIN ingredients i ON i.id = tri.ingredient_id
    WHERE ${tid ? sql`tr.tenant_id = ${tid}` : sql`TRUE`}
    GROUP BY tr.id, fw.name, tw.name
    ORDER BY tr.created_at DESC
  `);
  res.json(rows.rows);
});

// POST /transfer-requests — crear nueva solicitud (cálculo automático de faltantes)
router.post("/transfer-requests", async (req, res) => {
  const tid = req.tenantId;
  const { fromWarehouseId, toWarehouseId, notes, items } = req.body ?? {};
  if (!fromWarehouseId || !toWarehouseId) {
    res.status(400).json({ error: "Se requieren bodega origen y destino" });
    return;
  }

  // Si no vienen items explícitos, calcular automáticamente por mínimos
  let lineItems: { ingredientId: number; requestedQty: number }[] = [];

  if (Array.isArray(items) && items.length > 0) {
    lineItems = items.map((i: any) => ({
      ingredientId: Number(i.ingredientId),
      requestedQty: Number(i.requestedQty),
    }));
  } else {
    // Auto-calcular: mínimos de la bodega destino − stock actual destino
    const minRows = await db.execute(sql`
      SELECT m.ingredient_id, m.min_qty,
             COALESCE(s.qty, 0) AS current_qty
      FROM ingredient_warehouse_min_stock m
      LEFT JOIN ingredient_warehouse_stock s
        ON s.warehouse_id = m.warehouse_id AND s.ingredient_id = m.ingredient_id
      WHERE m.warehouse_id = ${toWarehouseId}
    `);
    for (const row of minRows.rows as any[]) {
      const needed = Number(row.min_qty) - Number(row.current_qty);
      if (needed > 0) {
        lineItems.push({
          ingredientId: Number(row.ingredient_id),
          requestedQty: needed,
        });
      }
    }
    if (lineItems.length === 0) {
      res
        .status(200)
        .json({
          message:
            "No hay ingredientes por debajo del mínimo en la bodega destino",
          items: [],
        });
      return;
    }
  }

  // Insertar solicitud
  const tr = await db.execute(sql`
    INSERT INTO transfer_requests (tenant_id, from_warehouse_id, to_warehouse_id, status, notes, requested_by)
    VALUES (${tid ?? null}, ${fromWarehouseId}, ${toWarehouseId}, 'pending', ${notes ?? ""}, ${req.employeeId?.toString() ?? null})
    RETURNING id
  `);
  const trId = (tr as any).rows[0].id;

  for (const item of lineItems) {
    await db.execute(sql`
      INSERT INTO transfer_request_items (transfer_request_id, ingredient_id, requested_qty)
      VALUES (${trId}, ${item.ingredientId}, ${item.requestedQty})
    `);
  }

  res.status(201).json({ id: trId, items: lineItems });
});

// PATCH /transfer-requests/:id/approve — aprobar y ajustar cantidades
router.patch("/transfer-requests/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tid = req.tenantId;
  const { items } = req.body ?? {};
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [check] = (
    await db.execute(sql`SELECT status FROM transfer_requests WHERE id = ${id} AND (${tid ?? null}::integer IS NULL OR tenant_id = ${tid ?? null})`)
  ).rows as any[];
  if (!check) {
    res.status(404).json({ error: "No encontrada" });
    return;
  }
  if (check.status !== "pending") {
    res
      .status(400)
      .json({ error: "Solo se pueden aprobar solicitudes pendientes" });
    return;
  }

  // Actualizar cantidades aprobadas si se envían
  if (Array.isArray(items)) {
    for (const item of items as any[]) {
      await db.execute(sql`
        UPDATE transfer_request_items
        SET approved_qty = ${Number(item.approvedQty)}
        WHERE id = ${Number(item.id)} AND transfer_request_id = ${id}
      `);
    }
  }

  await db.execute(sql`
    UPDATE transfer_requests
    SET status = 'approved', approved_by = ${req.employeeId?.toString() ?? null}, updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

// PATCH /transfer-requests/:id/execute — ejecutar: mover stock
router.patch("/transfer-requests/:id/execute", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tid = req.tenantId;
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [tr] = (
    await db.execute(sql`
    SELECT tr.*, fw.tenant_id AS from_tenant, tw.tenant_id AS to_tenant
    FROM transfer_requests tr
    JOIN warehouses fw ON fw.id = tr.from_warehouse_id
    JOIN warehouses tw ON tw.id = tr.to_warehouse_id
    WHERE tr.id = ${id} AND (${tid ?? null}::integer IS NULL OR tr.tenant_id = ${tid ?? null})
  `)
  ).rows as any[];
  if (!tr) {
    res.status(404).json({ error: "No encontrada" });
    return;
  }
  if (tr.status !== "approved") {
    res
      .status(400)
      .json({ error: "Solo se pueden ejecutar solicitudes aprobadas" });
    return;
  }

  const lineItems = (
    await db.execute(sql`
    SELECT ingredient_id, COALESCE(approved_qty, requested_qty) AS qty
    FROM transfer_request_items
    WHERE transfer_request_id = ${id}
  `)
  ).rows as any[];

  // Mover stock: descontar de origen, sumar en destino
  for (const item of lineItems) {
    const ingId = Number(item.ingredient_id);
    const qty = Number(item.qty);
    if (qty <= 0) continue;

    // Descontar bodega origen
    await db.execute(sql`
      INSERT INTO ingredient_warehouse_stock (warehouse_id, ingredient_id, qty)
      VALUES (${tr.from_warehouse_id}, ${ingId}, ${-qty})
      ON CONFLICT (warehouse_id, ingredient_id)
      DO UPDATE SET qty = GREATEST(0, ingredient_warehouse_stock.qty + EXCLUDED.qty), updated_at = NOW()
    `);
    // Sumar bodega destino
    await db.execute(sql`
      INSERT INTO ingredient_warehouse_stock (warehouse_id, ingredient_id, qty)
      VALUES (${tr.to_warehouse_id}, ${ingId}, ${qty})
      ON CONFLICT (warehouse_id, ingredient_id)
      DO UPDATE SET qty = ingredient_warehouse_stock.qty + EXCLUDED.qty, updated_at = NOW()
    `);
    // Registrar movimiento de ingrediente
    await db.execute(sql`
      INSERT INTO ingredient_movements (type, ingredient_id, from_warehouse_id, to_warehouse_id, quantity, reason, created_by)
      VALUES ('traslado', ${ingId}, ${tr.from_warehouse_id}, ${tr.to_warehouse_id}, ${qty},
              ${"Traslado #" + id}, ${req.employeeId?.toString() ?? null})
    `);
  }

  await db.execute(sql`
    UPDATE transfer_requests
    SET status = 'executed', executed_by = ${req.employeeId?.toString() ?? null}, updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

// PATCH /transfer-requests/:id/cancel
router.patch("/transfer-requests/:id/cancel", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tid = req.tenantId;
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.execute(sql`
    UPDATE transfer_requests SET status = 'cancelled', updated_at = NOW() WHERE id = ${id} AND (${tid ?? null}::integer IS NULL OR tenant_id = ${tid ?? null})
  `);
  res.json({ ok: true });
});

// GET /transfer-requests/suggest — calcular faltantes sin crear solicitud
router.get("/transfer-requests/suggest", async (req, res) => {
  const tid = req.tenantId;
  const warehouseId = parseInt(req.query.warehouseId as string, 10);
  if (isNaN(warehouseId)) {
    res.status(400).json({ error: "warehouseId requerido" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT m.ingredient_id, i.name AS ingredient_name, i.unit AS ingredient_unit,
           m.min_qty, COALESCE(s.qty, 0) AS current_qty,
           GREATEST(0, m.min_qty - COALESCE(s.qty, 0)) AS needed_qty
    FROM ingredient_warehouse_min_stock m
    JOIN ingredients i ON i.id = m.ingredient_id
    LEFT JOIN ingredient_warehouse_stock s
      ON s.warehouse_id = m.warehouse_id AND s.ingredient_id = m.ingredient_id
    JOIN warehouses w ON w.id = m.warehouse_id
    WHERE m.warehouse_id = ${warehouseId} AND (${tid ?? null}::integer IS NULL OR w.tenant_id = ${tid ?? null})
    ORDER BY i.name
  `);
  res.json(rows.rows);
});

// ── Production Lots ──────────────────────────────────────────────────────────

// GET /production/orders/:id/lots — get all lots for an order with their stage logs
router.get("/production/orders/:id/lots", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const orderId = Number(req.params.id);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const result = await db.execute(sql`
    SELECT
      l.id, l.order_id, l.lot_number, l.qr_code, l.weight_kg,
      l.packaged_at, l.expires_at, l.current_stage_id, l.current_stage_name,
      l.status, l.notes, l.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ll.id,
            'lotId', ll.lot_id,
            'stageId', ll.stage_id,
            'stageName', ll.stage_name,
            'stageType', ll.stage_type,
            'scannedBy', ll.scanned_by,
            'inputWeightKg', ll.input_weight_kg,
            'outputWeightKg', ll.output_weight_kg,
            'notes', ll.notes,
            'createdAt', ll.created_at
          ) ORDER BY ll.created_at ASC
        ) FILTER (WHERE ll.id IS NOT NULL),
        '[]'::json
      ) AS logs
    FROM production_lots l
    LEFT JOIN production_lot_logs ll ON ll.lot_id = l.id
    WHERE l.order_id = ${orderId}
      AND (${tid ?? null}::integer IS NULL OR l.tenant_id = ${tid ?? null})
    GROUP BY l.id
    ORDER BY l.created_at ASC
  `);

  res.json(result.rows);
});

// POST /production/orders/:id/lots — create bags/lots for an order
router.post("/production/orders/:id/lots", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const orderId = Number(req.params.id);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const bagsSchema = z
    .array(
      z.object({
        weightKg: z
          .number({ invalid_type_error: "weightKg debe ser número" })
          .positive({ message: "weightKg debe ser mayor a 0" }),
        expiresAt: z
          .string()
          .datetime({ offset: true })
          .optional()
          .or(z.literal(""))
          .transform((v) => v || undefined),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1, "Se requiere al menos una bolsa")
    .max(200, "Máximo 200 lotes por solicitud");

  const bagsParsed = bagsSchema.safeParse(req.body?.bags);
  if (!bagsParsed.success) {
    res
      .status(400)
      .json({
        error: bagsParsed.error.errors[0]?.message ?? "Datos inválidos",
      });
    return;
  }
  const bags = bagsParsed.data;

  const orderRows = await db.execute(sql`
    SELECT po.id, po.batch_code, p.name AS product_name
    FROM production_orders po
    JOIN products p ON p.id = po.product_id
    WHERE po.id = ${orderId}
      AND (${tid ?? null}::integer IS NULL OR po.tenant_id = ${tid ?? null})
    LIMIT 1
  `);

  if (orderRows.rows.length === 0) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  const order = orderRows.rows[0] as any;

  const countRows = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM production_lots WHERE order_id = ${orderId}
  `);
  let existingCount: number = (countRows.rows[0] as any)?.cnt ?? 0;

  const created: unknown[] = [];
  for (const bag of bags) {
    existingCount++;
    const batchPrefix = order.batch_code
      ? `${order.batch_code}`
      : `ORD${String(orderId).padStart(4, "0")}`;
    const lotNumber = `${batchPrefix}-${String(existingCount).padStart(3, "0")}`;
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const qrCode = `CPRO-${orderId}-${existingCount}-${Date.now().toString(36).toUpperCase()}-${rand}`;

    const expiresAtVal = bag.expiresAt
      ? new Date(bag.expiresAt).toISOString()
      : null;

    const row = await db.execute(sql`
      INSERT INTO production_lots
        (order_id, lot_number, qr_code, weight_kg, expires_at, notes, tenant_id)
      VALUES
        (${orderId}, ${lotNumber}, ${qrCode}, ${bag.weightKg}, ${expiresAtVal}, ${bag.notes ?? null}, ${tid ?? null})
      RETURNING *
    `);
    created.push(row.rows[0]);
  }

  res.status(201).json(created);
});

// GET /production/lots/scan/:qrCode — resolve QR code to lot info
router.get("/production/lots/scan/:qrCode", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const qrCode = req.params.qrCode;

  const result = await db.execute(sql`
    SELECT
      l.id, l.order_id, l.lot_number, l.qr_code, l.weight_kg,
      l.packaged_at, l.expires_at, l.current_stage_id, l.current_stage_name,
      l.status, l.notes, l.created_at,
      po.product_id,
      p.name AS product_name,
      p.unit AS product_unit,
      po.batch_code AS order_batch_code,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ll.id,
            'stageName', ll.stage_name,
            'stageType', ll.stage_type,
            'inputWeightKg', ll.input_weight_kg,
            'outputWeightKg', ll.output_weight_kg,
            'scannedBy', ll.scanned_by,
            'createdAt', ll.created_at
          ) ORDER BY ll.created_at ASC
        ) FILTER (WHERE ll.id IS NOT NULL),
        '[]'::json
      ) AS logs
    FROM production_lots l
    JOIN production_orders po ON po.id = l.order_id
    JOIN products p ON p.id = po.product_id
    LEFT JOIN production_lot_logs ll ON ll.lot_id = l.id
    WHERE l.qr_code = ${qrCode}
      AND (${tid ?? null}::integer IS NULL OR l.tenant_id = ${tid ?? null})
    GROUP BY l.id, po.product_id, p.name, p.unit, po.batch_code
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    res.status(404).json({ error: "Lote no encontrado" });
    return;
  }

  res.json(result.rows[0]);
});

// POST /production/lots/:lotId/advance — advance lot to next stage
router.post(
  "/production/lots/:lotId/advance",
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    const lotId = Number(req.params.lotId);
    if (isNaN(lotId)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const advanceSchema = z.object({
      stageId: z.number().int().positive().optional(),
      stageName: z.string().min(1, "stageName requerido").max(200),
      stageType: z.string().max(50).optional(),
      inputWeightKg: z.number().positive().optional(),
      outputWeightKg: z.number().positive().optional(),
      notes: z.string().max(1000).optional(),
      scannedBy: z.string().max(200).optional(),
    });
    const advanceParsed = advanceSchema.safeParse(req.body);
    if (!advanceParsed.success) {
      res
        .status(400)
        .json({
          error: advanceParsed.error.errors[0]?.message ?? "Datos inválidos",
        });
      return;
    }
    const {
      stageId,
      stageName,
      stageType,
      inputWeightKg,
      outputWeightKg,
      notes,
      scannedBy,
    } = advanceParsed.data;

    const lotRows = await db.execute(sql`
    SELECT id FROM production_lots
    WHERE id = ${lotId}
      AND (${tid ?? null}::integer IS NULL OR tenant_id = ${tid ?? null})
    LIMIT 1
  `);

    if (lotRows.rows.length === 0) {
      res.status(404).json({ error: "Lote no encontrado" });
      return;
    }

    await db.execute(sql`
    INSERT INTO production_lot_logs
      (lot_id, stage_id, stage_name, stage_type, scanned_by, input_weight_kg, output_weight_kg, notes)
    VALUES
      (${lotId}, ${stageId ?? null}, ${stageName}, ${stageType ?? null},
       ${scannedBy ?? null}, ${inputWeightKg ?? null}, ${outputWeightKg ?? null}, ${notes ?? null})
  `);

    const updated = await db.execute(sql`
    UPDATE production_lots
    SET current_stage_id   = ${stageId ?? null},
        current_stage_name = ${stageName}
    WHERE id = ${lotId}
    RETURNING *
  `);

    res.json(updated.rows[0]);
  },
);

// GET /screens/public/:token/menu — product list for screen's tenant
router.get("/screens/public/:token/menu", async (req, res): Promise<void> => {
  const screen = await getScreenByToken(req.params.token);
  if (!screen) {
    res.status(404).json({ error: "Pantalla no encontrada" });
    return;
  }
  const tid = screen.tenantId;
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      category: productsTable.category,
      imageUrl: productsTable.imageUrl,
    })
    .from(productsTable)
    .where(
      and(
        tid ? eq(productsTable.tenantId, tid) : undefined,
        eq(productsTable.isActive, true),
      ),
    )
    .orderBy(productsTable.category, productsTable.name);
  res.json(products);
});

// ── Asesor Financiero IA ─────────────────────────────────────────────────────

router.post("/advisor/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No se recibió ningún archivo" });
    return;
  }

  const { originalname, mimetype, buffer } = req.file;
  const ext = path.extname(originalname).toLowerCase();

  try {
    let extractedText = "";

    if (ext === ".pdf" || mimetype === "application/pdf") {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default;
      const result = await pdfParse(buffer);
      extractedText = result.text?.trim() ?? "";
      if (!extractedText) {
        res.status(422).json({ error: "No se pudo extraer texto del PDF. Puede ser un PDF de imágenes sin OCR." });
        return;
      }
    } else if (ext === ".csv") {
      // CSV is plain text — no library needed
      extractedText = buffer.toString("utf-8").trim();
    } else if (ext === ".xlsx") {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);
      const lines: string[] = [];
      for (const worksheet of workbook.worksheets) {
        const csvRows: string[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          const cells = (row.values as unknown[]).slice(1).map((cell) => {
            if (cell === null || cell === undefined) return "";
            if (typeof cell === "object" && "text" in (cell as Record<string, unknown>)) {
              return String((cell as Record<string, unknown>).text ?? "");
            }
            if (typeof cell === "object" && "result" in (cell as Record<string, unknown>)) {
              return String((cell as Record<string, unknown>).result ?? "");
            }
            return String(cell);
          });
          csvRows.push(cells.join(","));
        });
        if (csvRows.length > 0) {
          lines.push(`=== Hoja: ${worksheet.name} ===`);
          lines.push(csvRows.join("\n"));
        }
      }
      extractedText = lines.join("\n\n");
    } else if (ext === ".xls") {
      res.status(415).json({ error: "El formato .xls (Excel antiguo) no está soportado. Convierta el archivo a .xlsx o .csv e inténtelo de nuevo." });
      return;
    } else {
      res.status(415).json({ error: "Formato no soportado. Usa PDF, Excel (.xlsx) o CSV." });
      return;
    }

    // Truncate to ~40 000 chars to avoid huge token counts
    const MAX = 40_000;
    const truncated = extractedText.length > MAX;
    const text = truncated ? extractedText.slice(0, MAX) + "\n\n[… contenido truncado por longitud …]" : extractedText;

    res.json({ ok: true, filename: originalname, text, truncated });
  } catch (err) {
    req.log.error({ err }, "advisor: document parse error");
    res.status(500).json({ error: "Error al procesar el documento" });
  }
});

router.post("/advisor/chat", async (req, res): Promise<void> => {
  const tid = req.tenantId;

  const { messages, includeContext = true } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    includeContext?: boolean;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages es requerido" });
    return;
  }

  let contextBlock = "";

  if (includeContext && tid) {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const todayStr = now.toISOString().split("T")[0];

      const recentSales = await db
        .select({
          subtotal: salesTable.subtotal,
          totalCost: salesTable.totalCost,
          profit: salesTable.profit,
          paymentMethod: salesTable.paymentMethod,
        })
        .from(salesTable)
        .where(
          and(
            eq(salesTable.tenantId, tid),
            gte(salesTable.createdAt, weekStart),
            isNull(salesTable.voidedAt),
          ),
        )
        .limit(500);

      const totalSalesWeek = recentSales.reduce((s, r) => s + Number(r.subtotal), 0);
      const totalCostWeek = recentSales.reduce((s, r) => s + Number(r.totalCost ?? 0), 0);
      const totalProfitWeek = recentSales.reduce((s, r) => s + Number(r.profit ?? 0), 0);

      const todayExpenses = await db
        .select({ amount: expensesTable.amount, category: expensesTable.category })
        .from(expensesTable)
        .where(
          and(
            eq(expensesTable.tenantId, tid),
            sql`DATE(${expensesTable.createdAt}) = ${todayStr}`,
          ),
        );
      const totalExpensesToday = todayExpenses
        .filter((expense) => !["devolución", "devolucion"].includes(expense.category.trim().toLowerCase()))
        .reduce((s, e) => s + Number(e.amount), 0);

      const [cashSession] = await db
        .select({
          openingBalance: cashSessionsTable.openingBalance,
          cashSales: cashSessionsTable.cashSales,
          cashExpenses: cashSessionsTable.cashExpenses,
          expectedBalance: cashSessionsTable.expectedBalance,
        })
        .from(cashSessionsTable)
        .where(and(eq(cashSessionsTable.tenantId, tid), isNull(cashSessionsTable.closedAt)))
        .orderBy(desc(cashSessionsTable.openedAt))
        .limit(1);

      const lowStockProducts = await db
        .select({
          name: productsTable.name,
          stock: productsTable.stock,
          lowStockThreshold: productsTable.lowStockThreshold,
        })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.tenantId, tid),
            lte(productsTable.stock, productsTable.lowStockThreshold),
            gte(productsTable.lowStockThreshold, 1),
            eq(productsTable.tracksInventory, true),
          ),
        )
        .limit(10);

      const [tenantRow] = await db
        .select({ name: tenantsTable.name })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tid))
        .limit(1);

      const activeCatalog = await db
        .select({
          id: productsTable.id,
          nombre: productsTable.name,
          categoria: productsTable.category,
          precio_venta: productsTable.price,
          costo: productsTable.cost,
        })
        .from(productsTable)
        .where(and(eq(productsTable.tenantId, tid), eq(productsTable.isActive, true)))
        .orderBy(productsTable.category, productsTable.name);

      const [categoryCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(categoriesTable)
        .where(eq(categoriesTable.tenantId, tid));

      const contextData = {
        empresa: tenantRow?.name ?? "Restaurante",
        fecha_actual: todayStr,
        ventas_ultimos_7_dias: {
          total_ventas: totalSalesWeek.toFixed(2),
          costo_total: totalCostWeek.toFixed(2),
          utilidad_bruta: totalProfitWeek.toFixed(2),
          margen_bruto:
            totalSalesWeek > 0
              ? ((totalProfitWeek / totalSalesWeek) * 100).toFixed(1) + "%"
              : "N/A",
          cantidad_transacciones: recentSales.length,
        },
        gastos_hoy: {
          total: totalExpensesToday.toFixed(2),
          detalle: todayExpenses
            .slice(0, 5)
            .map((e) => ({ categoria: e.category, monto: Number(e.amount).toFixed(2) })),
        },
        caja_activa: cashSession
          ? {
              apertura: Number(cashSession.openingBalance).toFixed(2),
              ventas_efectivo: Number(cashSession.cashSales ?? 0).toFixed(2),
              gastos_efectivo: Number(cashSession.cashExpenses ?? 0).toFixed(2),
              saldo_esperado: Number(cashSession.expectedBalance ?? 0).toFixed(2),
            }
          : null,
        productos_bajo_stock: lowStockProducts.map((p) => ({
          nombre: p.name,
          stock_actual: p.stock,
          umbral: p.lowStockThreshold,
        })),
        catalogo: {
          total_productos_activos: activeCatalog.length,
          total_categorias: categoryCount?.count ?? 0,
          detalle: activeCatalog.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            categoria: p.categoria,
            precio_venta: Number(p.precio_venta).toFixed(2),
            costo: Number(p.costo).toFixed(2),
            margen: p.precio_venta > 0
              ? (((Number(p.precio_venta) - Number(p.costo)) / Number(p.precio_venta)) * 100).toFixed(1) + "%"
              : "N/A",
          })),
        },
      };

      contextBlock = `\n\n---\nCONTEXTO EN TIEMPO REAL DEL NEGOCIO (solo lectura):\n${JSON.stringify(contextData, null, 2)}\n---`;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      req.log.error({ err }, "advisor: error loading business context");
      contextBlock = `\n\n---\nCONTEXTO EN TIEMPO REAL DEL NEGOCIO:\n${JSON.stringify(
        {
          empresa: "ERROR AL CARGAR - consulta la base de datos",
          catalogo: "ERROR AL CARGAR - consulta la base de datos",
          error_detalle: errMsg,
        },
        null,
        2,
      )}\n---`;
    }
  }

  const systemPrompt = `Eres el CFO y Asesor Estratégico IA del sistema ERP. Tienes acceso directo a los datos en tiempo real de la base de datos del cliente, los cuales se te proporcionan en formato JSON al final de este prompt. ACTÚA siempre como un sistema integrado. NUNCA digas que no tienes acceso a la base de datos o al ERP. Si la respuesta está en el JSON, dásela directamente al usuario. Si el dato no está en el JSON, dile amablemente que en este momento solo tienes acceso a métricas clave pero no a ese detalle en específico.

Tienes acceso total al nombre de la empresa, a sus finanzas y a su catálogo completo y detallado. NUNCA digas que no conoces los nombres de los productos o la empresa. Utiliza el catálogo proporcionado en el JSON para sugerir combos, estrategias de precios, identificar productos ancla e ingeniería de menú.

PERFIL: Director Financiero (CFO) y Consultor Estratégico con 20 años de experiencia en finanzas, contabilidad y gestión de restaurantes.

ÁREAS DE EXPERTISE:
- Análisis de rentabilidad y márgenes de contribución
- Estrategias para reducir créditos bancarios y pagar deudas más rápido
- Optimización del flujo de caja y capital de trabajo
- Costeo de recetas e ingeniería de menú
- Gestión de inventario y reducción de mermas
- Estrategias fiscales y contables (orientativas)
- Benchmarking de la industria gastronómica
- Aumento de ticket promedio y técnicas de venta cruzada
- Negociación con proveedores y optimización de compras
- Estructura eficiente de nómina y costos laborales

CAPACIDADES DE ACCIÓN (Human-in-the-Loop):
Puedes proponer cambios concretos al sistema usando las herramientas disponibles. IMPORTANTE:
- Usa "propose_price_change" cuando el usuario pida cambiar precios de productos. Incluye siempre el product_id del catálogo, el nombre del producto, el precio actual y el nuevo precio propuesto con su justificación.
- Usa "propose_new_product" cuando el usuario pida agregar un nuevo producto al catálogo. Estima el costo si no se proporciona.
- SIEMPRE puedes combinar una respuesta de texto + una llamada a herramienta en el mismo turno: explica primero el razonamiento y luego usa la herramienta.
- Las acciones NO se ejecutan automáticamente: el usuario deberá aprobarlas en la interfaz antes de que surtan efecto en la base de datos.

RESTRICCIONES:
- No des asesoría legal concreta ni garantices resultados específicos.
- No uses herramientas sin que el usuario lo haya solicitado explícitamente o sea claramente la intención.

ESTILO DE RESPUESTA:
- Usa markdown para estructurar: ## títulos, **negrita**, listas con guiones
- Directo al punto, sin relleno
- Usa los números del contexto para dar consejos específicos y personalizados
- Tono: profesional pero cálido, como un CFO que también es mentor
- Respuestas concisas pero completas (máx. 4-6 párrafos o secciones)${contextBlock}`;

  const advisorTools = [
    {
      type: "function" as const,
      function: {
        name: "propose_price_change",
        description: "Propone cambios de precio para uno o varios productos del catálogo. Solo úsalo cuando el usuario solicite explícitamente cambiar precios.",
        parameters: {
          type: "object",
          properties: {
            changes: {
              type: "array",
              description: "Lista de cambios de precio propuestos",
              items: {
                type: "object",
                properties: {
                  product_id:    { type: "integer", description: "ID numérico del producto (del campo 'id' en el catálogo)" },
                  product_name:  { type: "string",  description: "Nombre del producto para confirmación visual" },
                  current_price: { type: "number",  description: "Precio actual del producto" },
                  new_price:     { type: "number",  description: "Nuevo precio propuesto" },
                  reason:        { type: "string",  description: "Justificación del cambio de precio" },
                },
                required: ["product_id", "product_name", "new_price"],
              },
            },
          },
          required: ["changes"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "manage_stock_status",
        description: "Marca o desmarca un producto como agotado (is_out_of_stock). Solo úsalo cuando el usuario solicite explícitamente pausar, agotar o reactivar un producto. Puedes incluir una duración opcional en minutos.",
        parameters: {
          type: "object",
          properties: {
            product_id:       { type: "integer", description: "ID numérico del producto (del campo 'id' en el catálogo)" },
            product_name:     { type: "string",  description: "Nombre del producto para confirmación visual" },
            status:           { type: "boolean", description: "true = marcar como agotado, false = reactivar disponibilidad" },
            duration_minutes: { type: "integer", description: "Opcional: minutos durante los cuales el producto estará agotado. Omitir si es indefinido." },
            reason:           { type: "string",  description: "Justificación o contexto del cambio de estado" },
          },
          required: ["product_id", "product_name", "status"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "propose_new_product",
        description: "Propone agregar un nuevo producto al catálogo. Solo úsalo cuando el usuario solicite explícitamente crear un producto.",
        parameters: {
          type: "object",
          properties: {
            name:     { type: "string", description: "Nombre del producto" },
            category: { type: "string", description: "Categoría del producto" },
            price:    { type: "number", description: "Precio de venta" },
            cost:     { type: "number", description: "Costo unitario estimado" },
            unit:     { type: "string", description: "Unidad de medida (pieza, kg, litro, porción…)", default: "pieza" },
            reason:   { type: "string", description: "Justificación de por qué agregar este producto" },
          },
          required: ["name", "category", "price", "cost"],
        },
      },
    },
  ];

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const outgoingMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 1500,
      messages: outgoingMessages,
      tools: advisorTools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const finishReason = choice?.finish_reason;
    const message = choice?.message;

    // ── Tool calls: return pending_approval without executing ─────────────────
    if (finishReason === "tool_calls" && message?.tool_calls?.length) {
      const actions = message.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
        call_id: tc.id,
        name: tc.function.name,
        args: (() => {
          try { return JSON.parse(tc.function.arguments) as Record<string, unknown>; }
          catch { return { raw: tc.function.arguments }; }
        })(),
      }));
      // Include any text the model produced alongside the tool call
      const preText = message.content ?? null;
      res.json({ type: "pending_approval", pre_text: preText, actions });
      return;
    }

    // ── Regular text response ─────────────────────────────────────────────────
    const reply = message?.content ?? "No pude generar una respuesta.";
    res.json({ type: "reply", reply });
  } catch (err) {
    req.log.error({ err }, "advisor: OpenAI error");
    res.status(500).json({ error: "Error al conectar con el servicio de IA" });
  }
});

// ── Advisor: Execute approved actions (Human-in-the-Loop) ────────────────────

router.post("/advisor/execute-action", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) {
    res.status(403).json({ error: "Sin empresa asignada" });
    return;
  }

  const { actions } = req.body as {
    actions: Array<{
      call_id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };

  if (!Array.isArray(actions) || actions.length === 0) {
    res.status(400).json({ error: "actions es requerido y no puede estar vacío" });
    return;
  }

  const results: Array<{ call_id: string; name: string; ok: boolean; detail: unknown; error?: string }> = [];

  for (const action of actions) {
    try {
      if (action.name === "propose_price_change") {
        // ── Price change ──────────────────────────────────────────────────────
        const changes = action.args.changes as Array<{
          product_id: number;
          product_name: string;
          new_price: number;
        }>;
        if (!Array.isArray(changes) || changes.length === 0) {
          results.push({ call_id: action.call_id, name: action.name, ok: false, detail: null, error: "changes vacío" });
          continue;
        }
        const changeResults = [];
        for (const change of changes) {
          const [updated] = await db
            .update(productsTable)
            .set({ price: change.new_price })
            .where(
              and(
                eq(productsTable.id, change.product_id),
                eq(productsTable.tenantId, tid),
              ),
            )
            .returning({ id: productsTable.id, name: productsTable.name, price: productsTable.price });
          if (!updated) {
            changeResults.push({ product_id: change.product_id, ok: false, error: "Producto no encontrado o no pertenece a esta empresa" });
          } else {
            changeResults.push({ product_id: updated.id, name: updated.name, new_price: updated.price, ok: true });
          }
        }
        results.push({ call_id: action.call_id, name: action.name, ok: changeResults.every((r) => r.ok), detail: changeResults });

      } else if (action.name === "propose_new_product") {
        // ── New product ───────────────────────────────────────────────────────
        const a = action.args as {
          name: string;
          category: string;
          price: number;
          cost: number;
          unit?: string;
        };
        if (!a.name || !a.category || a.price == null || a.cost == null) {
          results.push({ call_id: action.call_id, name: action.name, ok: false, detail: null, error: "Faltan campos requeridos: name, category, price, cost" });
          continue;
        }
        const sku = `AI-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const [created] = await db
          .insert(productsTable)
          .values({
            name: a.name,
            category: a.category,
            price: a.price,
            cost: a.cost,
            unit: a.unit ?? "pieza",
            sku,
            stock: 0,
            lowStockThreshold: 0,
            hasRecipe: false,
            isActive: true,
            tenantId: tid,
          })
          .returning({ id: productsTable.id, name: productsTable.name, price: productsTable.price, category: productsTable.category });
        results.push({ call_id: action.call_id, name: action.name, ok: true, detail: created });

      } else if (action.name === "manage_stock_status") {
        // ── Stock status toggle ───────────────────────────────────────────────
        const a = action.args as {
          product_id: number;
          product_name: string;
          status: boolean;
          duration_minutes?: number;
        };
        if (a.product_id == null || typeof a.status !== "boolean") {
          results.push({ call_id: action.call_id, name: action.name, ok: false, detail: null, error: "Faltan campos requeridos: product_id, status" });
          continue;
        }
        let outOfStockUntil: Date | null = null;
        if (a.status && a.duration_minutes && a.duration_minutes > 0) {
          outOfStockUntil = new Date(Date.now() + a.duration_minutes * 60 * 1000);
        }
        const [updated] = await db
          .update(productsTable)
          .set({ isOutOfStock: a.status, outOfStockUntil })
          .where(
            and(
              eq(productsTable.id, a.product_id),
              eq(productsTable.tenantId, tid),
            ),
          )
          .returning({ id: productsTable.id, name: productsTable.name, isOutOfStock: productsTable.isOutOfStock, outOfStockUntil: productsTable.outOfStockUntil });
        if (!updated) {
          results.push({ call_id: action.call_id, name: action.name, ok: false, detail: null, error: "Producto no encontrado o no pertenece a esta empresa" });
        } else {
          results.push({ call_id: action.call_id, name: action.name, ok: true, detail: updated });
        }

      } else {
        results.push({ call_id: action.call_id, name: action.name, ok: false, detail: null, error: `Acción desconocida: ${action.name}` });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      req.log.error({ err, action: action.name }, "advisor: execute-action error");
      results.push({ call_id: action.call_id, name: action.name, ok: false, detail: null, error: errMsg });
    }
  }

  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "products_updated");
  res.json({ results });
});

// ── WAITING ROOM (Sala de Espera) ─────────────────────────────────────────────

router.get("/waiting-room", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const orders = await db
    .select({
      id: restaurantOrdersTable.id,
      tableId: restaurantOrdersTable.tableId,
      customerName: restaurantOrdersTable.customerName,
      serverName: restaurantOrdersTable.serverName,
      subtotal: restaurantOrdersTable.subtotal,
      pendingPayments: restaurantOrdersTable.pendingPayments,
      createdAt: restaurantOrdersTable.createdAt,
      tableName: restaurantTablesTable.name,
    })
    .from(restaurantOrdersTable)
    .leftJoin(restaurantTablesTable, eq(restaurantTablesTable.id, restaurantOrdersTable.tableId))
    .where(
      and(
        eq(restaurantOrdersTable.status, "awaiting_payment"),
        tid ? eq(restaurantOrdersTable.tenantId, tid) : undefined,
      ),
    )
    .orderBy(restaurantOrdersTable.createdAt);

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select({
          id: restaurantOrderItemsTable.id,
          productName: restaurantOrderItemsTable.productName,
          quantity: restaurantOrderItemsTable.quantity,
          lineTotal: restaurantOrderItemsTable.lineTotal,
        })
        .from(restaurantOrderItemsTable)
        .where(eq(restaurantOrderItemsTable.orderId, order.id));
      return { ...order, items };
    }),
  );

  res.json(ordersWithItems);
});

router.post("/waiting-room/freeze-pos", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.sendToWaiting)) return;
  const { pendingPayments, subtotal, customerName, customerId, employeeId, serverName, items, takeaway } =
    req.body as {
      pendingPayments: { method: string; amount: number }[];
      subtotal: number;
      customerName?: string;
      customerId?: number;
      employeeId?: number;
      serverName?: string;
      takeaway?: boolean;
      items: { productId: number; productName: string; quantity: number; unitPrice: number; lineTotal: number; notes?: string }[];
    };

  if (!pendingPayments?.length || !items?.length) {
    res.status(400).json({ error: "pendingPayments e items son requeridos" });
    return;
  }

  // If takeaway, attach to virtual __PARA_LLEVAR__ table for KDS routing
  let takeawayTableId: number | null = null;
  if (takeaway) {
    const VIRTUAL_TABLE_NAME = "__PARA_LLEVAR__";
    const tid = req.tenantId;
    // SAFETY NET: req.tenantId is always defined by tenantMiddleware for authenticated requests.
    // The isNull branch is unreachable in production; retained for type safety.
    const tenantCond = tid !== undefined
      ? eq(restaurantTablesTable.tenantId, tid)
      : isNull(restaurantTablesTable.tenantId);

    let [vtable] = await db
      .select()
      .from(restaurantTablesTable)
      .where(and(eq(restaurantTablesTable.name, VIRTUAL_TABLE_NAME), tenantCond))
      .limit(1);

    if (!vtable) {
      [vtable] = await db
        .insert(restaurantTablesTable)
        .values({
          name: VIRTUAL_TABLE_NAME,
          area: "Para llevar",
          capacity: 0,
          isVirtual: true,
          tenantId: tid ?? null,
        } as any)
        .returning();
    } else if (!vtable.isVirtual) {
      await db
        .update(restaurantTablesTable)
        .set({ isVirtual: true })
        .where(eq(restaurantTablesTable.id, vtable.id));
    }
    takeawayTableId = vtable.id;
  }

  const [order] = await db
    .insert(restaurantOrdersTable)
    .values({
      tableId: takeawayTableId,
      serverName: serverName ?? "POS",
      customerName: customerName ?? null,
      status: "awaiting_payment",
      kitchenStatus: takeaway ? "pending" : "hold",
      subtotal: subtotal ?? 0,
      pendingPayments,
      pendingCustomerId: customerId ?? null,
      pendingEmployeeId: employeeId ?? null,
      tenantId: req.tenantId ?? null,
    })
    .returning({ id: restaurantOrdersTable.id });

  await db.insert(restaurantOrderItemsTable).values(
    items.map((it) => ({
      orderId: order.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      notes: it.notes ?? null,
    })),
  );

  if (req.tenantId !== undefined) {
    sseBus.broadcast(req.tenantId, "waiting_room_updated");
    if (takeaway) sseBus.broadcast(req.tenantId, "kitchen_updated");
  }
  res.status(201).json({ id: order.id });
});

router.post("/waiting-room/:id/freeze", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.sendToWaiting)) return;
  const orderId = Number(req.params.id);
  const { pendingPayments, customerId, employeeId } = req.body as {
    pendingPayments: { method: string; amount: number }[];
    customerId?: number;
    employeeId?: number;
  };

  if (!pendingPayments?.length) {
    res.status(400).json({ error: "pendingPayments es requerido" });
    return;
  }

  const [order] = await db
    .select()
    .from(restaurantOrdersTable)
    .where(
      and(
        eq(restaurantOrdersTable.id, orderId),
        eq(restaurantOrdersTable.status, "open"),
        req.tenantId !== undefined ? eq(restaurantOrdersTable.tenantId, req.tenantId) : undefined,
      ),
    );

  if (!order) {
    res.status(404).json({ error: "Orden no encontrada o no está abierta" });
    return;
  }

  await db
    .update(restaurantOrdersTable)
    .set({
      status: "awaiting_payment",
      kitchenStatus: "hold",
      pendingPayments,
      pendingCustomerId: customerId ?? null,
      pendingEmployeeId: employeeId ?? null,
    })
    .where(eq(restaurantOrdersTable.id, orderId));

  if (order.tableId) {
    await db
      .update(restaurantTablesTable)
      .set({ status: "pending_payment" })
      .where(eq(restaurantTablesTable.id, order.tableId!));
  }

  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "waiting_room_updated");
  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "tables_updated");
  res.json({ ok: true });
});

router.post("/waiting-room/:id/approve", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.checkout)) return;
  const orderId = Number(req.params.id);
  const { receiptId } = req.body as { receiptId?: number };

  const order = await db
    .select()
    .from(restaurantOrdersTable)
    .leftJoin(restaurantTablesTable, eq(restaurantTablesTable.id, restaurantOrdersTable.tableId))
    .where(
      and(
        eq(restaurantOrdersTable.id, orderId),
        eq(restaurantOrdersTable.status, "awaiting_payment"),
        req.tenantId !== undefined ? eq(restaurantOrdersTable.tenantId, req.tenantId) : undefined,
      ),
    )
    .then((rows) => rows[0]);

  if (!order) {
    res.status(404).json({ error: "Orden no encontrada en sala de espera" });
    return;
  }

  // Manual approval requires admin or manager
  if (!receiptId) {
    const role = req.employeeRole;
    if (role !== "admin" && role !== "manager") {
      res.status(403).json({ error: "Solo administradores o gerentes pueden aprobar manualmente" });
      return;
    }
  }

  const tid = req.tenantId;
  const orderRow = order.restaurant_orders;
  const tableRow = order.restaurant_tables;

  const items = await db
    .select()
    .from(restaurantOrderItemsTable)
    .where(eq(restaurantOrderItemsTable.orderId, orderRow.id));

  if (items.length === 0) {
    res.status(400).json({ error: "La orden no tiene ítems" });
    return;
  }

  const itemProductIds = items.map((it) => it.productId).filter(Boolean) as number[];
  const products = itemProductIds.length
    ? await db
        .select()
        .from(productsTable)
        .where(
          and(
            inArray(productsTable.id, itemProductIds),
            tid ? eq(productsTable.tenantId, tid) : undefined,
          ),
        )
    : [];

  const selectedProducts = items.map((item) => ({
    item,
    product: products.find((p) => p.id === item.productId),
  }));

  const orderProductIds = selectedProducts.map(({ product }) => product?.id).filter(Boolean) as number[];
  const orderRecipes = orderProductIds.length
    ? await db
        .select()
        .from(productRecipesTable)
        .where(
          sql`${productRecipesTable.productId} IN (${sql.join(
            orderProductIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        )
    : [];

  const totalCostVal = money(
    selectedProducts.reduce(
      (total, { item, product }) => total + (product?.cost ?? 0) * item.quantity,
      0,
    ),
  );
  const subtotalVal = money(orderRow.subtotal);
  const receiptNumber = `W-${Date.now().toString(36).toUpperCase()}`;

  // ── Tax calculation (per-item) ────────────────────────────────────────────
  const wrTaxIncludedRaw = await readSetting(req.tenantId, "company_tax_included_in_price");
  const wrTaxIncluded = wrTaxIncludedRaw !== "false";
  let wrTotalTaxAmount = 0;
  const wrItemTaxRateSet = new Set<number>();
  let wrSaleTaxNameVal: string | null = null;
  for (const { item, product } of selectedProducts) {
    const taxPct = Number(product?.taxPercent ?? 0);
    if (!taxPct) continue;
    const lineTotal = money(item.lineTotal);
    const taxAmt = wrTaxIncluded ? money(lineTotal * taxPct / (100 + taxPct)) : money(lineTotal * taxPct / 100);
    wrTotalTaxAmount += taxAmt;
    wrItemTaxRateSet.add(taxPct);
    if (!wrSaleTaxNameVal) wrSaleTaxNameVal = product?.taxName ?? null;
  }
  wrTotalTaxAmount = money(wrTotalTaxAmount);
  const wrSaleTaxPercent = wrItemTaxRateSet.size === 1 ? [...wrItemTaxRateSet][0] : null;
  const wrSaleTaxName = wrSaleTaxPercent != null ? wrSaleTaxNameVal : null;
  const wrFinalSubtotal = !wrTaxIncluded && wrTotalTaxAmount > 0 ? money(subtotalVal + wrTotalTaxAmount) : subtotalVal;

  const pendingPayments = orderRow.pendingPayments ?? [];
  const paymentMethod =
    pendingPayments.length > 1
      ? "mixed"
      : pendingPayments.length === 1
        ? pendingPayments[0].method
        : "cash";

  const orderIngredients = orderRecipes.length ? await db.select().from(ingredientsTable) : [];
  const orderIngMap = new Map(orderIngredients.map((i) => [i.id, i]));
  const waitingRoomInventory = computeSaleInventoryPlan({
    tenantId: tid,
    items: selectedProducts.flatMap(({ item, product }) =>
      product
        ? [{ productId: product.id, quantity: item.quantity }]
        : [],
    ),
    products: selectedProducts.flatMap(({ product }) =>
      product ? [product] : [],
    ),
    recipes: orderRecipes,
  });
  const orderConsumption = waitingRoomInventory.ingredientConsumption;
  const orderProductInputConsumption =
    waitingRoomInventory.inputProductConsumption;
  await removeUntrackedProductInputs(db, orderProductInputConsumption, tid);

  if (orderConsumption.size > 0) {
    const salesWhId = await getSalesWarehouseId(req.tenantId, req.branchId);
    if (!salesWhId) {
      res.status(400).json({ error: "No hay bodega de ventas configurada." });
      return;
    }
    const whStock = await getSalesWarehouseStock(salesWhId, Array.from(orderConsumption.keys()));
    for (const [ingId, needed] of orderConsumption.entries()) {
      const available = whStock.get(ingId) ?? 0;
      if (available < needed) {
        const ing = orderIngMap.get(ingId);
        res.status(400).json({ error: `Ingrediente "${ing?.name ?? `#${ingId}`}" insuficiente (disponible: ${available}, necesita: ${needed})` });
        return;
      }
    }
  }

  const result = await db
    .transaction(async (tx) => {
      // Claim order
      const claimed = await tx
        .update(restaurantOrdersTable)
        .set({ status: "paid", closedAt: new Date(), kitchenStatus: "pending", saleId: null })
        .where(
          and(
            eq(restaurantOrdersTable.id, orderRow.id),
            eq(restaurantOrdersTable.status, "awaiting_payment"),
          ),
        )
        .returning({ id: restaurantOrdersTable.id });
      if (claimed.length === 0) throw new Error("ORDER_ALREADY_PROCESSED");

      // Create sale
      const [createdSale] = await tx
        .insert(salesTable)
        .values({
          receiptNumber,
          customerName: orderRow.customerName ?? orderRow.serverName,
          customerId: orderRow.pendingCustomerId ?? null,
          employeeId: orderRow.pendingEmployeeId ?? null,
          loyaltyPointsEarned: 0,
          paymentMethod,
          payments: pendingPayments,
          subtotal: wrFinalSubtotal,
          totalCost: totalCostVal,
          profit: money(wrFinalSubtotal - totalCostVal),
          tableId: orderRow.tableId ?? null,
          tableName: tableRow?.name ?? null,
          tableArea: tableRow?.area ?? null,
          serverName: orderRow.serverName ?? null,
          taxAmount: wrTotalTaxAmount > 0 ? wrTotalTaxAmount : null,
          taxPercent: wrSaleTaxPercent,
          taxName: wrSaleTaxName,
          tenantId: tid ?? null,
        })
        .returning();

      // Link sale to order
      await tx
        .update(restaurantOrdersTable)
        .set({ saleId: createdSale.id })
        .where(eq(restaurantOrdersTable.id, orderRow.id));

      // Inventory deduction — requiresProduction
      for (const { item, product } of selectedProducts) {
        if (!product?.requiresProduction) continue;
        if (product.tracksInventory === false) continue;
        const updated = await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
          .where(and(eq(productsTable.id, product.id), gte(productsTable.stock, item.quantity)))
          .returning({ id: productsTable.id });
        if (updated.length === 0) throw new Error(`OUT_OF_STOCK:${product.name}`);
      }

      // Inventory deduction — direct stock (no recipe, no requiresProduction)
      for (const { item, product } of selectedProducts) {
        if (!product) continue;
        if (product.tracksInventory === false) continue;
        const isRecipeBased = orderRecipes.some((r) => r.productId === product.id);
        if (isRecipeBased || product.requiresProduction) continue;
        const updated = await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
          .where(and(eq(productsTable.id, product.id), gte(productsTable.stock, item.quantity)))
          .returning({ id: productsTable.id });
        if (updated.length === 0) throw new Error(`OUT_OF_STOCK:${product.name}`);
      }

      // Ingredient deduction from sales warehouse
      const salesWhId = await getSalesWarehouseId(req.tenantId, req.branchId);
      if (salesWhId && orderConsumption.size > 0) {
        await deductFromSalesWarehouse(tx, salesWhId, orderConsumption);
      }

      // Intermediate product deduction
      for (const [prodId, needed] of orderProductInputConsumption.entries()) {
        const updated = await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${needed}` })
          .where(and(eq(productsTable.id, prodId), gte(productsTable.stock, needed)))
          .returning({ id: productsTable.id });
        if (updated.length === 0) throw new Error(`OUT_OF_STOCK:producto_intermedio#${prodId}`);
      }

      // Sale items
      await tx.insert(saleItemsTable).values(
        selectedProducts.flatMap(({ item, product }) => {
          if (product == null) return [];
          const taxPct = Number(product.taxPercent ?? 0);
          const lt = money(item.lineTotal);
          const taxAmt = taxPct > 0 ? (wrTaxIncluded ? money(lt * taxPct / (100 + taxPct)) : money(lt * taxPct / 100)) : null;
          return [{
            saleId: createdSale.id,
            productId: product.id,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: product.cost ?? 0,
            lineTotal: item.lineTotal,
            taxPercent: taxPct > 0 ? taxPct : null,
            taxAmount: taxAmt,
            taxName: taxPct > 0 ? (product.taxName ?? null) : null,
          }];
        }),
      );

      // Free table
      if (orderRow.tableId) {
        await tx
          .update(restaurantTablesTable)
          .set({ status: "available" })
          .where(eq(restaurantTablesTable.id, orderRow.tableId));
      }

      // If this was a delivery order in the waiting room, mark it confirmed
      if (orderRow.deliveryId) {
        await tx
          .update(deliveriesTable)
          .set({ status: "confirmed" })
          .where(eq(deliveriesTable.id, orderRow.deliveryId));
      }

      // Link receipt if provided
      if (receiptId) {
        await tx
          .update(paymentReceiptsTable)
          .set({ status: "linked", linkedSaleId: createdSale.id })
          .where(
            and(
              eq(paymentReceiptsTable.id, receiptId),
              eq(paymentReceiptsTable.status, "pending"),
            ),
          );
      }

      return { saleId: createdSale.id };
    })
    .catch((err: unknown) => {
      if (err instanceof Error) {
        if (err.message === "ORDER_ALREADY_PROCESSED") return { __error: "Esta orden ya fue procesada" } as const;
        if (err.message.startsWith("OUT_OF_STOCK:")) return { __error: `${err.message.slice(13)} agotado` } as const;
      }
      throw err;
    });

  if (result && typeof result === "object" && "__error" in result) {
    res.status(400).json({ error: result.__error });
    return;
  }

  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "waiting_room_updated");
  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "tables_updated");
  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "orders_updated");
  res.status(201).json({ ok: true, saleId: (result as { saleId: number }).saleId });
});

router.post("/waiting-room/:id/cancel", async (req, res): Promise<void> => {
  if (!await requireEffectivePermission(req, res, TABLE_PERMISSION_KEYS.cancelOrder)) return;
  const orderId = Number(req.params.id);

  const [order] = await db
    .select()
    .from(restaurantOrdersTable)
    .where(
      and(
        eq(restaurantOrdersTable.id, orderId),
        eq(restaurantOrdersTable.status, "awaiting_payment"),
        req.tenantId !== undefined ? eq(restaurantOrdersTable.tenantId, req.tenantId) : undefined,
      ),
    );

  if (!order) {
    res.status(404).json({ error: "Orden no encontrada en sala de espera" });
    return;
  }

  await db
    .update(restaurantOrdersTable)
    .set({ status: "cancelled", closedAt: new Date() })
    .where(eq(restaurantOrdersTable.id, orderId));

  if (order.tableId) {
    await db
      .update(restaurantTablesTable)
      .set({ status: "available" })
      .where(eq(restaurantTablesTable.id, order.tableId!));
  }

  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "waiting_room_updated");
  if (req.tenantId !== undefined) sseBus.broadcast(req.tenantId, "tables_updated");
  res.json({ ok: true });
});

// ── GET /reports/financial-health ─────────────────────────────────────────────
router.get("/reports/financial-health", async (req, res): Promise<void> => {
  const tid = req.tenantId;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1); // start of current month
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // end of current month

  const fromParam = req.query.from as string | undefined;
  const toParam   = req.query.to   as string | undefined;
  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to   = toParam   ? new Date(toParam)   : defaultTo;

  const [sales, expenses] = await Promise.all([
    db
      .select({
        id:        salesTable.id,
        subtotal:  salesTable.subtotal,
        cost:      salesTable.totalCost,
        profit:    salesTable.profit,
        voidedAt:  salesTable.voidedAt,
        createdAt: salesTable.createdAt,
      })
      .from(salesTable)
      .where(
        and(
          tid !== undefined ? eq(salesTable.tenantId, tid) : undefined,
          gte(salesTable.createdAt, from),
          lte(salesTable.createdAt, to),
        ),
      ),
    db
      .select({
        category:  expensesTable.category,
        amount:    expensesTable.amount,
        createdAt: expensesTable.createdAt,
      })
      .from(expensesTable)
      .where(
        and(
          tid !== undefined ? eq(expensesTable.tenantId, tid) : undefined,
          gte(expensesTable.createdAt, from),
          lte(expensesTable.createdAt, to),
        ),
      ),
  ]);

  const activeSales = sales.filter((s) => !s.voidedAt);
  const revenue     = money(activeSales.reduce((s, r) => s + Number(r.subtotal), 0));
  const cmv         = money(activeSales.reduce((s, r) => s + Number(r.cost), 0));
  const grossProfit = money(revenue - cmv);
  const salesCount  = activeSales.length;
  const avgTicket   = salesCount > 0 ? money(revenue / salesCount) : 0;
  const cmvRatio    = revenue > 0 ? money((cmv / revenue) * 100) : 0;
  const grossMargin = revenue > 0 ? money((grossProfit / revenue) * 100) : 0;

  // Group expenses by category
  const catMap = new Map<string, number>();
  for (const e of expenses.filter(
    (expense) => !["devolución", "devolucion"].includes(expense.category.trim().toLowerCase()),
  )) {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));
  }
  const expensesByCategory = Array.from(catMap.entries())
    .map(([category, total]) => ({ category, total: money(total) }))
    .sort((a, b) => b.total - a.total);

  const totalExpenses = money(expensesByCategory.reduce((s, e) => s + e.total, 0));
  const netProfit     = money(grossProfit - totalExpenses);

  res.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    revenue,
    cmv,
    grossProfit,
    expensesByCategory,
    totalExpenses,
    netProfit,
    salesCount,
    avgTicket,
    cmvRatio,
    grossMargin,
  });
});

// ─── Public Menu Catalog ────────────────────────────────────────────────────────

// ── Shift-based product availability ─────────────────────────────────────────
// Products with no shifts assigned are always available.
// Products with at least one shift are only shown when any active assigned shift covers the current time/day.
type ShiftRow = { id: number; timeFrom: string; timeTo: string; days: string | null; isActive: boolean };
type PShiftRow = { productId: number; shiftId: number };

function isProductAvailableWithShifts(productId: number, productShifts: PShiftRow[], shifts: ShiftRow[]): boolean {
  const assignedIds = productShifts.filter(ps => ps.productId === productId).map(ps => ps.shiftId);
  if (assignedIds.length === 0) return true;
  const now = new Date();
  // Shift times are entered in America/Bogota local time — compare against Bogota clock, not UTC.
  const bogotaParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekdayAbbr = bogotaParts.find(p => p.type === "weekday")?.value ?? "Mon";
  const hourRaw    = bogotaParts.find(p => p.type === "hour")?.value   ?? "00";
  const minuteRaw  = bogotaParts.find(p => p.type === "minute")?.value ?? "00";
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const isoDay = weekdayMap[weekdayAbbr] ?? 1;
  const hhmm = `${(hourRaw === "24" ? "00" : hourRaw).padStart(2, "0")}:${minuteRaw.padStart(2, "0")}`;
  for (const sid of assignedIds) {
    const shift = shifts.find(s => s.id === sid && s.isActive);
    if (!shift) continue;
    if (shift.days) {
      const allowed = shift.days.split(",").map(Number);
      if (!allowed.includes(isoDay)) continue;
    }
    if (hhmm >= shift.timeFrom && hhmm < shift.timeTo) return true;
  }
  return false;
}

// ── Shifts CRUD ───────────────────────────────────────────────────────────────

// GET /shifts — list all shifts for current tenant
router.get("/shifts", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(shiftsTable)
    .where(eq(shiftsTable.tenantId, tid))
    .orderBy(shiftsTable.name);
  res.json(rows);
});

// POST /shifts — create a shift
router.post("/shifts", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const parsed = insertShiftSchema.safeParse({ ...req.body, tenantId: req.tenantId });
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  const [row] = await db.insert(shiftsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// PUT /shifts/:id — update a shift
router.put("/shifts/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const shift = await db.select({ id: shiftsTable.id }).from(shiftsTable)
    .where(and(eq(shiftsTable.id, id), eq(shiftsTable.tenantId, req.tenantId!))).then(r => r[0]);
  if (!shift) { res.status(404).json({ error: "Turno no encontrado" }); return; }
  const parsed = updateShiftSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  // tenantId is excluded from updateShiftSchema; enforce it in WHERE clause as defence-in-depth
  const [updated] = await db.update(shiftsTable).set(parsed.data)
    .where(and(eq(shiftsTable.id, id), eq(shiftsTable.tenantId, req.tenantId!)))
    .returning();
  res.json(updated);
});

// DELETE /shifts/:id — delete a shift (cascades to product_shifts)
router.delete("/shifts/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const shift = await db.select({ id: shiftsTable.id }).from(shiftsTable)
    .where(and(eq(shiftsTable.id, id), eq(shiftsTable.tenantId, req.tenantId!))).then(r => r[0]);
  if (!shift) { res.status(404).json({ error: "Turno no encontrado" }); return; }
  await db.delete(shiftsTable).where(eq(shiftsTable.id, id));
  res.json({ ok: true });
});

// GET /products/:id/shifts — get shift IDs assigned to a product
router.get("/products/:id/shifts", async (req, res): Promise<void> => {
  const productId = Number(req.params.id);
  // Verify product belongs to this tenant before exposing its shift links (prevents IDOR)
  const product = await db.select({ id: productsTable.id }).from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, req.tenantId!))).then(r => r[0]);
  if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }
  const rows = await db.select({ shiftId: productShiftsTable.shiftId })
    .from(productShiftsTable).where(eq(productShiftsTable.productId, productId));
  res.json(rows.map(r => r.shiftId));
});

// PUT /products/:id/shifts — replace all shift assignments for a product
router.put("/products/:id/shifts", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const productId = Number(req.params.id);
  const { shiftIds } = req.body as { shiftIds: number[] };
  // Verify product belongs to this tenant
  const product = await db.select({ id: productsTable.id }).from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, req.tenantId!))).then(r => r[0]);
  if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }
  // Verify all submitted shiftIds belong to this tenant (prevents cross-tenant FK links)
  if (Array.isArray(shiftIds) && shiftIds.length > 0) {
    const tenantShifts = await db.select({ id: shiftsTable.id }).from(shiftsTable)
      .where(and(eq(shiftsTable.tenantId, req.tenantId!), inArray(shiftsTable.id, shiftIds)));
    const validIds = new Set(tenantShifts.map(s => s.id));
    if (shiftIds.some(sid => !validIds.has(sid))) {
      res.status(400).json({ error: "Uno o más turnos no pertenecen a este negocio" });
      return;
    }
  }
  await db.delete(productShiftsTable).where(eq(productShiftsTable.productId, productId));
  if (Array.isArray(shiftIds) && shiftIds.length > 0) {
    await db.insert(productShiftsTable).values(shiftIds.map(sid => ({ productId, shiftId: sid })));
  }
  res.json({ ok: true });
});

// GET /menu/products?t={tenantId} — no auth, called from digital menu page
router.get("/menu/products", async (req, res): Promise<void> => {
  const tid = req.query.t ? Number(req.query.t) : null;
  if (!tid) { res.status(400).json({ error: "tenantId (t) required" }); return; }

  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.tenantId, tid),
        eq(productsTable.isActive, true),
        eq(productsTable.visibleInDigitalMenu, true),
      ),
    )
    .orderBy(productsTable.category, productsTable.name);

  const pIds = products.map(p => p.id);
  const [mShifts, mProductShifts] = await Promise.all([
    db.select({ id: shiftsTable.id, timeFrom: shiftsTable.timeFrom, timeTo: shiftsTable.timeTo, days: shiftsTable.days, isActive: shiftsTable.isActive })
      .from(shiftsTable).where(eq(shiftsTable.tenantId, tid)),
    pIds.length > 0
      ? db.select({ productId: productShiftsTable.productId, shiftId: productShiftsTable.shiftId })
          .from(productShiftsTable).where(inArray(productShiftsTable.productId, pIds))
      : Promise.resolve([]),
  ]);
  res.json(products.filter(p => isProductAvailableWithShifts(p.id, mProductShifts, mShifts)));
});

// GET /menu/config — public (with ?t=) or authenticated (uses req.tenantId)
router.get("/menu/config", async (req, res): Promise<void> => {
  const tid = req.query.t ? Number(req.query.t) : (req.tenantId ?? null);
  if (!tid) { res.status(400).json({ error: "tenantId required" }); return; }

  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, `t${tid}__menu_config`))
    .limit(1);

  if (!row) { res.json({ brand: null, productOrder: null }); return; }

  try {
    const config = JSON.parse(row.value as string);
    res.json(config);
  } catch {
    res.json({ brand: null, productOrder: null });
  }
});

// PATCH /menu/config — authenticated, saves brand settings and/or productOrder
router.patch("/menu/config", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (tid === undefined) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { brand, productOrder: incomingOrder } = req.body as { brand?: Record<string, unknown>; productOrder?: number[] };

  const key = `t${tid}__menu_config`;

  const [existing] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, key))
    .limit(1);

  let prevBrand: unknown = null;
  let prevOrder: unknown = null;
  if (existing) {
    try {
      const prev = JSON.parse(existing.value as string);
      prevBrand = prev.brand ?? null;
      prevOrder = prev.productOrder ?? null;
    } catch { /* */ }
  }

  const finalBrand = brand ?? prevBrand;
  const finalOrder = incomingOrder !== undefined ? incomingOrder : prevOrder;

  const newValue = JSON.stringify({ brand: finalBrand, productOrder: finalOrder });

  await db
    .insert(appSettingsTable)
    .values({ key, value: newValue })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: sql`excluded.value` },
    });

  res.json({ ok: true });
});

// ─── Waiter Calls ──────────────────────────────────────────────────────────────

// POST /waiter-calls/public — no auth, called from digital menu
router.post("/waiter-calls/public", async (req, res): Promise<void> => {
  const { tableName, tenantId } = req.body as { tableName?: string; tenantId?: number };
  if (!tableName) { res.status(400).json({ error: "tableName required" }); return; }

  const resolvedTid = tenantId ? Number(tenantId) : null;
  const cleanName = String(tableName).slice(0, 100);

  // Dedup: if there's already a pending (unresolved) call for this table, reject
  const [existing] = await db
    .select({ id: waiterCallsTable.id })
    .from(waiterCallsTable)
    .where(
      and(
        eq(waiterCallsTable.tableName, cleanName),
        // PUBLIC endpoint: tenantId is supplied by the digital menu in the request body.
        // null is legitimate here — menus without a configured tenant send no tenantId.
        resolvedTid !== null ? eq(waiterCallsTable.tenantId, resolvedTid) : isNull(waiterCallsTable.tenantId),
        isNull(waiterCallsTable.resolvedAt),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Ya hay una llamada pendiente para esta mesa" });
    return;
  }

  const [call] = await db
    .insert(waiterCallsTable)
    .values({ tenantId: resolvedTid, tableName: cleanName })
    .returning();
  res.json(call);
});

// GET /waiter-calls/pending — authenticated
router.get("/waiter-calls/pending", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const calls = await db
    .select()
    .from(waiterCallsTable)
    .where(
      and(
        // SAFETY NET: req.tenantId is always set by tenantMiddleware for authenticated routes.
        // isNull branch is unreachable in production for normal authenticated requests.
        tid !== undefined ? eq(waiterCallsTable.tenantId, tid) : isNull(waiterCallsTable.tenantId),
        isNull(waiterCallsTable.resolvedAt),
      ),
    )
    .orderBy(asc(waiterCallsTable.calledAt));
  res.json(calls);
});

// PATCH /waiter-calls/:id/resolve — authenticated
router.patch("/waiter-calls/:id/resolve", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "invalid id" }); return; }
  const [call] = await db
    .update(waiterCallsTable)
    .set({ resolvedAt: new Date() })
    .where(eq(waiterCallsTable.id, id))
    .returning();
  if (!call) { res.status(404).json({ error: "not found" }); return; }
  res.json(call);
});

// ── Operational Stock ─────────────────────────────────────────────────────────

async function buildOperationalStockResponse(tid: number | undefined) {
  const ings = tid
    ? await db.select().from(ingredientsTable).where(eq(ingredientsTable.tenantId, tid)).orderBy(asc(ingredientsTable.name))
    : await db.select().from(ingredientsTable).orderBy(asc(ingredientsTable.name));

  if (ings.length === 0) return { items: [], productQtyLimits: {} };

  const ingIds = ings.map((i) => i.id);

  // Operational stock rows
  const opRows = tid
    ? await db.select().from(operationalStockTable).where(and(eq(operationalStockTable.tenantId, tid), inArray(operationalStockTable.ingredientId, ingIds)))
    : [];
  const opMap = new Map(opRows.map((r) => [r.ingredientId, Number(r.qty ?? 0)]));
  const trackedIds = new Set(opRows.map((r) => r.ingredientId));

  // Physical stock from sales warehouse
  const salesWhId = tid ? await getSalesWarehouseId(tid) : null;
  let physMap = new Map<number, number>();
  if (salesWhId) {
    physMap = await getSalesWarehouseStock(salesWhId, ingIds);
  }

  // Fetch all recipes involving tracked ingredients to compute limits and blocked products
  const blockedMap = new Map<number, number[]>();
  const productQtyLimits: Record<string, number> = {};

  if (trackedIds.size > 0) {
    const trackedIdsArr = [...trackedIds];
    const recipes = await db
      .select({
        productId: productRecipesTable.productId,
        ingredientId: productRecipesTable.ingredientId,
        quantity: productRecipesTable.quantity,
      })
      .from(productRecipesTable)
      .where(inArray(productRecipesTable.ingredientId, trackedIdsArr));

    for (const r of recipes) {
      if (!r.ingredientId) continue;
      const opQty = opMap.get(r.ingredientId) ?? 0;
      const recipeQty = r.quantity > 0 ? r.quantity : 1;

      // Blocked: ingredient explicitly tracked AND qty = 0
      if (opQty === 0) {
        const list = blockedMap.get(r.ingredientId) ?? [];
        list.push(r.productId);
        blockedMap.set(r.ingredientId, list);
      }

      // Product qty limit: how many servings can be made from this ingredient's op stock
      const maxServings = Math.floor(opQty / recipeQty);
      const key = String(r.productId);
      if (key in productQtyLimits) {
        productQtyLimits[key] = Math.min(productQtyLimits[key], maxServings);
      } else {
        productQtyLimits[key] = maxServings;
      }
    }
  }

  const items = ings.map((ing) => ({
    ingredientId: ing.id,
    ingredientName: ing.name,
    category: ing.category ?? "Sin categoría",
    unit: ing.unit ?? "u",
    qty: trackedIds.has(ing.id) ? (opMap.get(ing.id) ?? 0) : (physMap.get(ing.id) ?? 0),
    physicalStock: physMap.get(ing.id) ?? 0,
    blockedProductIds: blockedMap.get(ing.id) ?? [],
  }));

  return { items, productQtyLimits };
}

// GET /operational-stock
router.get("/operational-stock", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  res.json(await buildOperationalStockResponse(req.tenantId));
});

// PATCH /operational-stock/:ingredientId
router.patch("/operational-stock/:ingredientId", async (req, res): Promise<void> => {
  const ingId = Number(req.params.ingredientId);
  if (!Number.isFinite(ingId)) { res.status(400).json({ error: "Invalid ingredientId" }); return; }
  const { delta, setTo } = (req.body ?? {}) as { delta?: number; setTo?: number };
  if (delta === undefined && setTo === undefined) { res.status(400).json({ error: "Provide delta or setTo" }); return; }

  const tid = req.tenantId;
  const [ing] = await db.select().from(ingredientsTable).where(and(eq(ingredientsTable.id, ingId), tid ? eq(ingredientsTable.tenantId, tid) : sql`1=1`)).limit(1);
  if (!ing) { res.status(404).json({ error: "Ingredient not found" }); return; }

  // Upsert operational_stock row
  if (setTo !== undefined) {
    const clampedQty = Math.max(0, setTo);
    await db.insert(operationalStockTable)
      .values({ tenantId: tid ?? null, ingredientId: ingId, qty: clampedQty, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [operationalStockTable.tenantId, operationalStockTable.ingredientId],
        set: { qty: clampedQty, updatedAt: new Date() },
      });
  } else {
    const initQty = Math.max(0, delta ?? 0);
    await db.insert(operationalStockTable)
      .values({ tenantId: tid ?? null, ingredientId: ingId, qty: initQty, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [operationalStockTable.tenantId, operationalStockTable.ingredientId],
        set: { qty: sql`GREATEST(0, ${operationalStockTable.qty} + ${delta ?? 0})`, updatedAt: new Date() },
      });
  }

  const result = await buildOperationalStockResponse(tid);
  const item = result.items.find((r) => r.ingredientId === ingId);
  res.json(item ?? { ingredientId: ingId, ingredientName: ing.name, unit: ing.unit ?? "u", qty: 0, physicalStock: 0, blockedProductIds: [] });
});

// GET /onboarding/status
router.get("/onboarding/status", requireRole(["admin"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (tid === undefined) { res.status(403).json({ error: "No tenant" }); return; }

  // Resolve plan features for this tenant (null = full access)
  const [tenantRow] = await db
    .select({ planId: tenantsTable.planId })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tid))
    .limit(1);

  let planFeatures: string[] | null = null;
  if (tenantRow?.planId) {
    const [planRow] = await db
      .select({ features: plansTable.features })
      .from(plansTable)
      .where(eq(plansTable.id, tenantRow.planId))
      .limit(1);
    // null features means full access (all features available)
    planFeatures = (planRow?.features as string[] | null) ?? null;
  }

  const hasFeature = (slug: string): boolean =>
    !planFeatures || planFeatures.includes(slug);

  const [
    companyName,
    paymentMethods,
    tablesRes,
    categoriesRes,
    ingCatSetting,
    ingredientsRes,
    productsRes,
    recipesRes,
    employeesRes,
    cashRes,
  ] = await Promise.all([
    readSetting(tid, "company_name", { noGlobalFallback: true }),
    readSetting(tid, "payment_methods", { noGlobalFallback: true }),
    db.select({ c: sql<number>`count(*)::int` }).from(restaurantTablesTable).where(and(eq(restaurantTablesTable.tenantId, tid), sql`${restaurantTablesTable.isVirtual} = false`)),
    db.select({ c: sql<number>`count(*)::int` }).from(categoriesTable).where(eq(categoriesTable.tenantId, tid)),
    readSetting(tid, "ingredient_categories"),
    db.select({ c: sql<number>`count(*)::int` }).from(ingredientsTable).where(eq(ingredientsTable.tenantId, tid)),
    db.select({ c: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.tenantId, tid)),
    db.select({ c: sql<number>`count(*)::int` })
      .from(productRecipesTable)
      .innerJoin(productsTable, eq(productRecipesTable.productId, productsTable.id))
      .where(eq(productsTable.tenantId, tid)),
    db.select({ c: sql<number>`count(*)::int` }).from(employeesTable).where(eq(employeesTable.tenantId, tid)),
    db.select({ c: sql<number>`count(*)::int` }).from(cashSessionsTable).where(eq(cashSessionsTable.tenantId, tid)),
  ]);

  // Parse JSON-serialized settings values (all settings stored via JSON.stringify)
  const parseJsonSetting = (raw: string | null): unknown => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  };

  const companyNameParsed = parseJsonSetting(companyName);
  const companyDone = typeof companyNameParsed === "string" && companyNameParsed.trim().length > 0;

  const paymentMethodsParsed = parseJsonSetting(paymentMethods);
  const paymentDone = Array.isArray(paymentMethodsParsed) && paymentMethodsParsed.length > 0;

  let ingCatDone = false;
  try {
    const arr = ingCatSetting ? (JSON.parse(ingCatSetting) as unknown[]) : [];
    ingCatDone = Array.isArray(arr) && arr.length > 0;
  } catch { /* ignore */ }

  res.json({
    steps: [
      { id: "company",               completed: companyDone,                                applicable: true },
      { id: "payment_methods",       completed: paymentDone,                                applicable: true },
      { id: "tables",                completed: (tablesRes[0]?.c ?? 0) > 0,                applicable: hasFeature("tables") },
      { id: "product_categories",    completed: (categoriesRes[0]?.c ?? 0) > 0,            applicable: true },
      { id: "ingredient_categories", completed: ingCatDone,                                 applicable: true },
      { id: "ingredients",           completed: (ingredientsRes[0]?.c ?? 0) > 0,           applicable: hasFeature("inventory") },
      { id: "products",              completed: (productsRes[0]?.c ?? 0) > 0,              applicable: true },
      { id: "recipes",               completed: (recipesRes[0]?.c ?? 0) > 0,               applicable: hasFeature("inventory") },
      { id: "employees",             completed: (employeesRes[0]?.c ?? 0) >= 1,            applicable: true },
      { id: "cash",                  completed: (cashRes[0]?.c ?? 0) > 0,                  applicable: true },
    ],
  });
});

// POST /operational-stock (reset to physical warehouse stock)
router.post("/operational-stock", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  const ings = tid
    ? await db.select().from(ingredientsTable).where(eq(ingredientsTable.tenantId, tid))
    : [];

  const salesWhId = tid ? await getSalesWarehouseId(tid) : null;
  let physMap = new Map<number, number>();
  if (salesWhId && ings.length > 0) {
    physMap = await getSalesWarehouseStock(salesWhId, ings.map((i) => i.id));
  }

  // Upsert all ingredients to their physical stock
  for (const ing of ings) {
    const qty = physMap.get(ing.id) ?? 0;
    await db.insert(operationalStockTable)
      .values({ tenantId: tid ?? null, ingredientId: ing.id, qty, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [operationalStockTable.tenantId, operationalStockTable.ingredientId],
        set: { qty, updatedAt: new Date() },
      });
  }

  res.json(await buildOperationalStockResponse(tid));
});

// ── Branches / Sucursales ──────────────────────────────────────────────────────

router.get("/branches", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db
    .select({
      id: branchesTable.id,
      name: branchesTable.name,
      address: branchesTable.address,
      phone: branchesTable.phone,
      warehouseId: branchesTable.warehouseId,
      warehouseName: warehousesTable.name,
      isMain: branchesTable.isMain,
      isActive: branchesTable.isActive,
      createdAt: branchesTable.createdAt,
      updatedAt: branchesTable.updatedAt,
    })
    .from(branchesTable)
    .leftJoin(warehousesTable, eq(branchesTable.warehouseId, warehousesTable.id))
    .where(eq(branchesTable.tenantId, tid))
    .orderBy(asc(branchesTable.name));
  res.json(rows);
});

router.post("/branches", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = insertBranchSchema.safeParse({ ...req.body, tenantId: tid });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  // If this branch is being set as main, clear other mains first
  if (parsed.data.isMain) {
    await db.update(branchesTable)
      .set({ isMain: false })
      .where(eq(branchesTable.tenantId, tid));
  }
  const [created] = await db.insert(branchesTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.patch("/branches/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const [existing] = await db.select({ id: branchesTable.id }).from(branchesTable)
    .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, tid)));
  if (!existing) { res.status(404).json({ error: "Sucursal no encontrada" }); return; }
  const parsed = updateBranchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  if (parsed.data.isMain) {
    await db.update(branchesTable)
      .set({ isMain: false })
      .where(and(eq(branchesTable.tenantId, tid), ne(branchesTable.id, id)));
  }
  const [updated] = await db.update(branchesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, tid)))
    .returning();
  res.json(updated);
});

router.delete("/branches/:id", requireRole(["admin"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const [deleted] = await db.delete(branchesTable)
    .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, tid)))
    .returning({ id: branchesTable.id });
  if (!deleted) { res.status(404).json({ error: "Sucursal no encontrada" }); return; }
  // Clear branchId from employees that were assigned to this branch
  await db.update(employeesTable)
    .set({ branchId: null })
    .where(and(eq(employeesTable.tenantId, tid), eq(employeesTable.branchId, id)));
  res.json({ ok: true });
});

// ── Employee Events (Desempeño del personal) ──────────────────────────────────

// Helper: assert a manager can act on a target employee.
// Managers are limited to employees in the same branch (when the manager has a branchId set).
// If the manager has no branchId the check passes (no branch context = full tenant access for manager).
async function assertManagerCanActOnEmployee(
  tid: number,
  managerEmployeeId: number | null | undefined,
  targetEmployeeId: number,
): Promise<boolean> {
  if (!managerEmployeeId) return true; // no manager employee record = skip check
  const [manager] = await db
    .select({ branchId: employeesTable.branchId, department: employeesTable.department })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, managerEmployeeId), eq(employeesTable.tenantId, tid)));
  if (!manager) return false;
  if (!manager.branchId) return true; // manager has no branch assigned → full-tenant access
  // Manager has a branch: target employee must be in same branch
  const [target] = await db
    .select({ branchId: employeesTable.branchId })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, targetEmployeeId), eq(employeesTable.tenantId, tid)));
  if (!target) return false;
  // Allow if target is in the same branch, or target has no branch (unassigned)
  return target.branchId === manager.branchId || !target.branchId;
}

router.get("/employee-events", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const role = req.employeeRole;
  const callerEmployeeId = req.employeeId;
  const isPrivileged = role === "admin" || role === "manager";

  // Non-privileged roles may only see their own events
  let resolvedEmployeeId: number | undefined;
  if (!isPrivileged) {
    if (!callerEmployeeId) { res.json([]); return; }
    resolvedEmployeeId = callerEmployeeId;
  } else {
    resolvedEmployeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  }

  const type = req.query.type as string | undefined;
  const since = req.query.since as string | undefined;
  const until = req.query.until as string | undefined;

  const conditions: ReturnType<typeof eq>[] = [eq(employeeEventsTable.tenantId, tid) as ReturnType<typeof eq>];
  if (resolvedEmployeeId) conditions.push(eq(employeeEventsTable.employeeId, resolvedEmployeeId) as ReturnType<typeof eq>);
  if (type) conditions.push(eq(employeeEventsTable.type, type as EmployeeEvent["type"]) as ReturnType<typeof eq>);
  if (since) conditions.push(gte(employeeEventsTable.createdAt, new Date(since)) as ReturnType<typeof eq>);
  if (until) conditions.push(lte(employeeEventsTable.createdAt, new Date(until)) as ReturnType<typeof eq>);

  const authorAlias = alias(employeesTable, "author");
  const rows = await db
    .select({
      event: employeeEventsTable,
      employeeName: employeesTable.name,
      authorName: authorAlias.name,
    })
    .from(employeeEventsTable)
    .leftJoin(employeesTable, eq(employeeEventsTable.employeeId, employeesTable.id))
    .leftJoin(authorAlias, eq(employeeEventsTable.authorId, authorAlias.id))
    .where(and(...conditions))
    .orderBy(desc(employeeEventsTable.createdAt));

  res.json(rows.map((r) => ({ ...r.event, employeeName: r.employeeName, authorName: r.authorName })));
});

router.post("/employee-events", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  // Force authorId to the authenticated employee
  const parsed = insertEmployeeEventSchema.safeParse({ ...req.body, tenantId: tid, authorId: req.employeeId ?? undefined });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  // Verify target employee belongs to tenant
  const [emp] = await db.select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, parsed.data.employeeId), eq(employeesTable.tenantId, tid)));
  if (!emp) { res.status(404).json({ error: "Empleado no encontrado" }); return; }

  // Managers: enforce branch scope restriction
  if (req.employeeRole === "manager") {
    const allowed = await assertManagerCanActOnEmployee(tid, req.employeeId, parsed.data.employeeId);
    if (!allowed) { res.status(403).json({ error: "No tienes permisos para registrar eventos para este empleado" }); return; }
  }

  const [created] = await db.insert(employeeEventsTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.patch("/employee-events/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [existing] = await db.select({ id: employeeEventsTable.id, employeeId: employeeEventsTable.employeeId })
    .from(employeeEventsTable)
    .where(and(eq(employeeEventsTable.id, id), eq(employeeEventsTable.tenantId, tid)));
  if (!existing) { res.status(404).json({ error: "Evento no encontrado" }); return; }

  // Managers: enforce branch scope restriction on the event's target employee
  if (req.employeeRole === "manager") {
    const allowed = await assertManagerCanActOnEmployee(tid, req.employeeId, existing.employeeId);
    if (!allowed) { res.status(403).json({ error: "No tienes permisos para modificar eventos de este empleado" }); return; }
  }

  const parsed = updateEmployeeEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const [updated] = await db.update(employeeEventsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(employeeEventsTable.id, id), eq(employeeEventsTable.tenantId, tid)))
    .returning();
  res.json(updated);
});

router.delete("/employee-events/:id", requireRole(["admin"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [deleted] = await db.delete(employeeEventsTable)
    .where(and(eq(employeeEventsTable.id, id), eq(employeeEventsTable.tenantId, tid)))
    .returning({ id: employeeEventsTable.id });
  if (!deleted) { res.status(404).json({ error: "Evento no encontrado" }); return; }
  res.json({ ok: true });
});

// Summary stats: count of events per employee for the last 30 days
router.get("/employee-events/summary", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await db
    .select({
      employeeId: employeeEventsTable.employeeId,
      type: employeeEventsTable.type,
      status: employeeEventsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(employeeEventsTable)
    .where(and(
      eq(employeeEventsTable.tenantId, tid),
      gte(employeeEventsTable.createdAt, since),
    ))
    .groupBy(employeeEventsTable.employeeId, employeeEventsTable.type, employeeEventsTable.status);

  // Aggregate per employee
  const byEmployee: Record<number, { tasks: number; pendingTasks: number; warnings: number; recognitions: number; bonuses: number }> = {};
  for (const row of rows) {
    if (!byEmployee[row.employeeId]) {
      byEmployee[row.employeeId] = { tasks: 0, pendingTasks: 0, warnings: 0, recognitions: 0, bonuses: 0 };
    }
    const entry = byEmployee[row.employeeId];
    if (row.type === "task") { entry.tasks += row.count; if (row.status === "pending" || row.status === "in_progress") entry.pendingTasks += row.count; }
    if (row.type === "warning") entry.warnings += row.count;
    if (row.type === "recognition") entry.recognitions += row.count;
    if (row.type === "bonus") entry.bonuses += row.count;
  }

  res.json(byEmployee);
});

// ── Work Schedules (Cronograma de turnos) ─────────────────────────────────────

router.get("/work-schedules", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const role = req.employeeRole;
  const callerEmployeeId = req.employeeId;
  const isPrivileged = role === "admin" || role === "manager";

  // Non-privileged users must have a resolved employee record to access schedules
  if (!isPrivileged && !callerEmployeeId) {
    res.status(403).json({ error: "No se encontró tu empleado" }); return;
  }

  const weekStart = req.query.weekStart as string | undefined;
  const branchIdParam = req.query.branchId ? Number(req.query.branchId) : undefined;
  // Non-privileged users: always scope to their own employeeId regardless of query param
  const employeeIdParam = !isPrivileged
    ? callerEmployeeId!
    : (req.query.employeeId ? Number(req.query.employeeId) : undefined);

  const dateTo = req.query.dateTo as string | undefined;

  const conditions = [eq(workSchedulesTable.tenantId, tid)];
  if (weekStart) {
    conditions.push(gte(workSchedulesTable.workDate, weekStart) as typeof conditions[0]);
    if (dateTo) {
      // Explicit end date (e.g. month-grid mode can span 42 days)
      conditions.push(lte(workSchedulesTable.workDate, dateTo) as typeof conditions[0]);
    } else {
      // Default: 7-day window
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      conditions.push(lte(workSchedulesTable.workDate, end.toISOString().split("T")[0]) as typeof conditions[0]);
    }
  }
  if (branchIdParam) conditions.push(eq(workSchedulesTable.branchId, branchIdParam) as typeof conditions[0]);
  if (employeeIdParam) conditions.push(eq(workSchedulesTable.employeeId, employeeIdParam) as typeof conditions[0]);

  const empAlias = alias(employeesTable, "emp");
  const rows = await db
    .select({
      schedule: workSchedulesTable,
      employeeName: empAlias.name,
      employeeRole: empAlias.role,
    })
    .from(workSchedulesTable)
    .leftJoin(empAlias, eq(workSchedulesTable.employeeId, empAlias.id))
    .where(and(...conditions))
    .orderBy(asc(workSchedulesTable.workDate), asc(workSchedulesTable.shiftStart));

  res.json(rows.map((r) => ({ ...r.schedule, employeeName: r.employeeName, employeeRole: r.employeeRole })));
});

router.post("/work-schedules", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = insertWorkScheduleSchema.safeParse({ ...req.body, tenantId: tid });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  // Verify employee belongs to tenant
  const [emp] = await db.select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, parsed.data.employeeId), eq(employeesTable.tenantId, tid)));
  if (!emp) { res.status(404).json({ error: "Empleado no encontrado" }); return; }

  // Verify branchId belongs to tenant (prevent cross-tenant FK on create)
  if (parsed.data.branchId !== null && parsed.data.branchId !== undefined) {
    const [branch] = await db.select({ id: branchesTable.id })
      .from(branchesTable)
      .where(and(eq(branchesTable.id, parsed.data.branchId), eq(branchesTable.tenantId, tid)));
    if (!branch) { res.status(404).json({ error: "Sucursal no encontrada o no pertenece al tenant" }); return; }
  }

  const [created] = await db.insert(workSchedulesTable).values(parsed.data).returning();
  res.status(201).json(created);

  // Fire-and-forget: generate checklist instances for this new schedule
  generateChecklistInstances({ id: created.id, employeeId: created.employeeId, workDate: created.workDate, tenantId: tid, shiftStart: created.shiftStart, shiftEnd: created.shiftEnd, position: created.position }).catch(() => {});

  // Fire-and-forget: notify assigned employee about their new shift
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const [assignedEmp] = await db.select({ name: employeesTable.name, email: employeesTable.email, clerkEmail: employeesTable.clerkEmail })
      .from(employeesTable)
      .where(eq(employeesTable.id, parsed.data.employeeId));
    const toEmail = assignedEmp?.email ?? assignedEmp?.clerkEmail;
    if (toEmail && assignedEmp) {
      const { workDate, shiftStart, shiftEnd, position, notes } = parsed.data;
      // nosemgrep: html-in-template-string — server-side notification email; all values come from DB records, not user-supplied HTML
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#2563eb;margin:0 0 16px">📅 Nuevo turno asignado</h2>
  <p>Hola <strong>${assignedEmp.name}</strong>, se te ha asignado un nuevo turno de trabajo.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:130px">Fecha:</td><td><strong>${workDate}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Horario:</td><td><strong>${shiftStart} – ${shiftEnd}</strong></td></tr>
    ${position ? `<tr><td style="padding:6px 0;color:#666">Posición / Área:</td><td>${position}</td></tr>` : ""}
    ${notes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Notas:</td><td style="font-style:italic">${notes}</td></tr>` : ""}
  </table>
  <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
</div>`;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "FYRO APP <notificaciones@resend.dev>",
          to: toEmail,
          subject: `📅 Nuevo turno asignado: ${workDate} ${shiftStart}–${shiftEnd}`,
          html,
        }),
      }).catch(() => {});
    }
  }
});

router.patch("/work-schedules/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [existing] = await db.select({
    id: workSchedulesTable.id,
    employeeId: workSchedulesTable.employeeId,
    workDate: workSchedulesTable.workDate,
    shiftStart: workSchedulesTable.shiftStart,
    shiftEnd: workSchedulesTable.shiftEnd,
    position: workSchedulesTable.position,
    status: workSchedulesTable.status,
    notes: workSchedulesTable.notes,
  })
    .from(workSchedulesTable)
    .where(and(eq(workSchedulesTable.id, id), eq(workSchedulesTable.tenantId, tid)));
  if (!existing) { res.status(404).json({ error: "Turno no encontrado" }); return; }

  const parsed = updateWorkScheduleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  // Validate referenced employeeId belongs to tenant (prevent cross-tenant FK)
  if (parsed.data.employeeId !== undefined) {
    const [emp] = await db.select({ id: employeesTable.id })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, parsed.data.employeeId), eq(employeesTable.tenantId, tid)));
    if (!emp) { res.status(404).json({ error: "Empleado no encontrado o no pertenece al tenant" }); return; }
  }

  // Validate branchId belongs to tenant (prevent cross-tenant FK)
  if (parsed.data.branchId !== null && parsed.data.branchId !== undefined) {
    const [branch] = await db.select({ id: branchesTable.id })
      .from(branchesTable)
      .where(and(eq(branchesTable.id, parsed.data.branchId), eq(branchesTable.tenantId, tid)));
    if (!branch) { res.status(404).json({ error: "Sucursal no encontrada o no pertenece al tenant" }); return; }
  }

  const [updated] = await db.update(workSchedulesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workSchedulesTable.id, id), eq(workSchedulesTable.tenantId, tid)))
    .returning();
  res.json(updated);

  // Fire-and-forget: generate checklist instances for updated schedule
  generateChecklistInstances({
    id: updated.id,
    employeeId: updated.employeeId,
    workDate: updated.workDate,
    tenantId: tid,
    shiftStart: updated.shiftStart,
    shiftEnd: updated.shiftEnd,
    position: updated.position,
  }).catch(() => {});

  // Fire-and-forget: notify employee if key fields changed
  const KEY_FIELDS = ["workDate", "shiftStart", "shiftEnd", "position", "status"] as const;
  const anyKeyChanged = KEY_FIELDS.some((f) => parsed.data[f] !== undefined && parsed.data[f] !== (existing as Record<string, unknown>)[f]);
  const notifyEmployeeId = parsed.data.employeeId ?? existing.employeeId;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && anyKeyChanged) {
    const [assignedEmp] = await db.select({ name: employeesTable.name, email: employeesTable.email, clerkEmail: employeesTable.clerkEmail })
      .from(employeesTable)
      .where(eq(employeesTable.id, notifyEmployeeId));
    const toEmail = assignedEmp?.email ?? assignedEmp?.clerkEmail;
    if (toEmail && assignedEmp) {
      const newDate = parsed.data.workDate ?? existing.workDate;
      const newStart = parsed.data.shiftStart ?? existing.shiftStart;
      const newEnd = parsed.data.shiftEnd ?? existing.shiftEnd;
      const newPosition = parsed.data.position !== undefined ? parsed.data.position : existing.position;
      const newStatus = parsed.data.status ?? existing.status;
      const newNotes = parsed.data.notes !== undefined ? parsed.data.notes : existing.notes;
      const STATUS_LABELS: Record<string, string> = { scheduled: "Programado", confirmed: "Confirmado", absent: "Ausente", replaced: "Reemplazado" };
      const statusChanged = parsed.data.status !== undefined && parsed.data.status !== existing.status;
      // nosemgrep: html-in-template-string — server-side notification email; all values come from DB records, not user-supplied HTML
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#d97706;margin:0 0 16px">✏️ Turno modificado</h2>
  <p>Hola <strong>${assignedEmp.name}</strong>, tu turno de trabajo ha sido actualizado.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:130px">Fecha:</td><td><strong>${newDate}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Horario:</td><td><strong>${newStart} – ${newEnd}</strong></td></tr>
    ${newPosition ? `<tr><td style="padding:6px 0;color:#666">Posición / Área:</td><td>${newPosition}</td></tr>` : ""}
    ${statusChanged ? `<tr><td style="padding:6px 0;color:#666">Estado:</td><td><strong>${STATUS_LABELS[newStatus] ?? newStatus}</strong></td></tr>` : ""}
    ${newNotes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Notas:</td><td style="font-style:italic">${newNotes}</td></tr>` : ""}
  </table>
  <p style="font-size:13px;color:#555">Si tienes alguna duda, comunícate con tu supervisor.</p>
  <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
</div>`;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "FYRO APP <notificaciones@resend.dev>",
          to: toEmail,
          subject: `✏️ Tu turno ha sido modificado: ${newDate} ${newStart}–${newEnd}`,
          html,
        }),
      }).catch(() => {});
    }
  }
});

router.delete("/work-schedules/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  // Fetch shift data before deletion so we can notify the employee
  const [toDelete] = await db.select({
    employeeId: workSchedulesTable.employeeId,
    workDate: workSchedulesTable.workDate,
    shiftStart: workSchedulesTable.shiftStart,
    shiftEnd: workSchedulesTable.shiftEnd,
    position: workSchedulesTable.position,
    notes: workSchedulesTable.notes,
  })
    .from(workSchedulesTable)
    .where(and(eq(workSchedulesTable.id, id), eq(workSchedulesTable.tenantId, tid)));
  if (!toDelete) { res.status(404).json({ error: "Turno no encontrado" }); return; }

  const [deleted] = await db.delete(workSchedulesTable)
    .where(and(eq(workSchedulesTable.id, id), eq(workSchedulesTable.tenantId, tid)))
    .returning({ id: workSchedulesTable.id });
  if (!deleted) { res.status(404).json({ error: "Turno no encontrado" }); return; }
  res.json({ ok: true });

  // Fire-and-forget: notify employee that their shift was cancelled
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const [assignedEmp] = await db.select({ name: employeesTable.name, email: employeesTable.email, clerkEmail: employeesTable.clerkEmail })
      .from(employeesTable)
      .where(eq(employeesTable.id, toDelete.employeeId));
    const toEmail = assignedEmp?.email ?? assignedEmp?.clerkEmail;
    if (toEmail && assignedEmp) {
      const { workDate, shiftStart, shiftEnd, position, notes } = toDelete;
      // nosemgrep: html-in-template-string — server-side notification email; all values come from DB records, not user-supplied HTML
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#dc2626;margin:0 0 16px">❌ Turno cancelado</h2>
  <p>Hola <strong>${assignedEmp.name}</strong>, tu turno de trabajo ha sido cancelado.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:130px">Fecha:</td><td><strong>${workDate}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Horario:</td><td><strong>${shiftStart} – ${shiftEnd}</strong></td></tr>
    ${position ? `<tr><td style="padding:6px 0;color:#666">Posición / Área:</td><td>${position}</td></tr>` : ""}
    ${notes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Notas:</td><td style="font-style:italic">${notes}</td></tr>` : ""}
  </table>
  <p style="font-size:13px;color:#555">Si tienes alguna duda, comunícate con tu supervisor.</p>
  <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
</div>`;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "FYRO APP <notificaciones@resend.dev>",
          to: toEmail,
          subject: `❌ Tu turno del ${workDate} fue cancelado`,
          html,
        }),
      }).catch(() => {});
    }
  }
});

// ── Shift Swap Requests (Solicitudes de reemplazo) ───────────────────────────

async function sendShiftSwapNotification(opts: {
  toEmail: string;
  requesterName: string;
  replacementName: string;
  workDate: string;
  shiftStart: string;
  shiftEnd: string;
  status: "approved" | "rejected";
  adminNotes: string | null;
  isReplacement?: boolean;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const { toEmail, requesterName, replacementName, workDate, shiftStart, shiftEnd, status, adminNotes, isReplacement } = opts;
  const isApproved = status === "approved";
  const statusLabel = isApproved ? "✅ Aprobada" : "❌ Rechazada";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";
  const subject = isReplacement
    ? isApproved
      ? `✅ Tienes un nuevo turno asignado por reemplazo`
      : `❌ Solicitud de reemplazo no aprobada`
    : isApproved
      ? `✅ Tu solicitud de reemplazo fue aprobada`
      : `❌ Tu solicitud de reemplazo fue rechazada`;
  // nosemgrep: html-in-template-string — server-side notification email; all values come from DB records, not user-supplied HTML
  const html = isReplacement
    ? isApproved
      ? `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#16a34a;margin:0 0 16px">✅ Nuevo turno por reemplazo</h2>
    <p>Hola <strong>${replacementName}</strong>, se te ha asignado un turno como reemplazo de <strong>${requesterName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:130px">Fecha del turno:</td><td>${workDate}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Horario:</td><td>${shiftStart} – ${shiftEnd}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Reemplazas a:</td><td>${requesterName}</td></tr>
      ${adminNotes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Nota del admin:</td><td style="font-style:italic">${adminNotes}</td></tr>` : ""}
    </table>
    <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
  </div>`
      : `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#dc2626;margin:0 0 16px">❌ Solicitud de reemplazo no aprobada</h2>
    <p>Hola <strong>${replacementName}</strong>, la solicitud de reemplazo de turno de <strong>${requesterName}</strong> fue rechazada. <strong>No eres responsable de este turno.</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:130px">Fecha del turno:</td><td>${workDate}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Horario:</td><td>${shiftStart} – ${shiftEnd}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Solicitante:</td><td>${requesterName}</td></tr>
      ${adminNotes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Nota del admin:</td><td style="font-style:italic">${adminNotes}</td></tr>` : ""}
    </table>
    <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
  </div>`
    : `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:${statusColor};margin:0 0 16px">${statusLabel}</h2>
    <p>Hola <strong>${requesterName}</strong>, tu solicitud de reemplazo de turno ha sido <strong>${isApproved ? "aprobada" : "rechazada"}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:130px">Fecha del turno:</td><td>${workDate}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Horario:</td><td>${shiftStart} – ${shiftEnd}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Reemplazante:</td><td>${replacementName}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Estado:</td><td style="color:${statusColor};font-weight:600">${statusLabel}</td></tr>
      ${adminNotes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Nota del admin:</td><td style="font-style:italic">${adminNotes}</td></tr>` : ""}
    </table>
    <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
  </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: "FYRO APP <notificaciones@resend.dev>",
      to: toEmail,
      subject,
      html,
    }),
  }).catch(() => {});
}

router.get("/shift-swaps", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const role = req.employeeRole;
  const callerEmployeeId = req.employeeId;
  const isPrivileged = role === "admin" || role === "manager";

  const requesterAlias = alias(employeesTable, "requester");
  const replacementAlias = alias(employeesTable, "replacement");
  const resolverAlias = alias(employeesTable, "resolver");

  // Non-privileged users must have a resolved employee record to avoid unfiltered access
  if (!isPrivileged && !callerEmployeeId) {
    res.status(403).json({ error: "No se pudo resolver tu empleado. Contacta al administrador." }); return;
  }

  const conditions = [eq(shiftSwapRequestsTable.tenantId, tid)];
  if (!isPrivileged) {
    // callerEmployeeId is guaranteed non-null here (checked above)
    conditions.push(eq(shiftSwapRequestsTable.requesterId, callerEmployeeId!) as typeof conditions[0]);
  }

  const rows = await db
    .select({
      swap: shiftSwapRequestsTable,
      schedule: workSchedulesTable,
      requesterName: requesterAlias.name,
      replacementName: replacementAlias.name,
      resolverName: resolverAlias.name,
    })
    .from(shiftSwapRequestsTable)
    .leftJoin(workSchedulesTable, eq(shiftSwapRequestsTable.scheduleId, workSchedulesTable.id))
    .leftJoin(requesterAlias, eq(shiftSwapRequestsTable.requesterId, requesterAlias.id))
    .leftJoin(replacementAlias, eq(shiftSwapRequestsTable.replacementEmployeeId, replacementAlias.id))
    .leftJoin(resolverAlias, eq(shiftSwapRequestsTable.resolvedBy, resolverAlias.id))
    .where(and(...conditions))
    .orderBy(desc(shiftSwapRequestsTable.createdAt));

  res.json(rows.map((r) => ({
    ...r.swap,
    schedule: r.schedule,
    requesterName: r.requesterName,
    replacementName: r.replacementName,
    resolverName: r.resolverName,
  })));
});

router.post("/shift-swaps", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const callerEmployeeId = req.employeeId;
  if (!callerEmployeeId) { res.status(403).json({ error: "No se encontró tu empleado" }); return; }

  const parsed = insertShiftSwapRequestSchema.safeParse({ ...req.body, tenantId: tid, requesterId: callerEmployeeId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  // Verify schedule belongs to tenant AND to the requester
  const [schedule] = await db.select({ id: workSchedulesTable.id, workDate: workSchedulesTable.workDate, employeeId: workSchedulesTable.employeeId, status: workSchedulesTable.status })
    .from(workSchedulesTable)
    .where(and(eq(workSchedulesTable.id, parsed.data.scheduleId), eq(workSchedulesTable.tenantId, tid)));
  if (!schedule) { res.status(404).json({ error: "Turno no encontrado" }); return; }

  const role = req.employeeRole;
  const isPrivileged = role === "admin" || role === "manager";
  if (!isPrivileged && schedule.employeeId !== callerEmployeeId) {
    res.status(403).json({ error: "Solo puedes solicitar reemplazo de tus propios turnos" }); return;
  }

  // Cannot request swap for past shifts
  const today = new Date().toISOString().split("T")[0];
  if (schedule.workDate < today) {
    res.status(400).json({ error: "No se puede solicitar reemplazo de un turno pasado" }); return;
  }

  // Verify replacement employee is active and belongs to tenant
  const [replacement] = await db.select({ id: employeesTable.id, status: employeesTable.status })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, parsed.data.replacementEmployeeId), eq(employeesTable.tenantId, tid)));
  if (!replacement) { res.status(404).json({ error: "Empleado reemplazante no encontrado" }); return; }
  if (replacement.status !== "active") { res.status(400).json({ error: "El empleado reemplazante debe estar activo" }); return; }

  // Verify replacement doesn't already have a shift on that date
  const [conflictShift] = await db.select({ id: workSchedulesTable.id })
    .from(workSchedulesTable)
    .where(and(
      eq(workSchedulesTable.tenantId, tid),
      eq(workSchedulesTable.employeeId, parsed.data.replacementEmployeeId),
      eq(workSchedulesTable.workDate, schedule.workDate),
    ));
  if (conflictShift) {
    res.status(409).json({ error: "El empleado reemplazante ya tiene un turno asignado ese día" }); return;
  }

  // Check no duplicate pending request
  const [existingPending] = await db.select({ id: shiftSwapRequestsTable.id })
    .from(shiftSwapRequestsTable)
    .where(and(
      eq(shiftSwapRequestsTable.scheduleId, parsed.data.scheduleId),
      eq(shiftSwapRequestsTable.status, "pending"),
    ));
  if (existingPending) {
    res.status(409).json({ error: "Ya existe una solicitud de reemplazo pendiente para este turno" }); return;
  }

  const [created] = await db.insert(shiftSwapRequestsTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.patch("/shift-swaps/:id/approve", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const resolverEmployeeId = req.employeeId;

  const [swap] = await db.select()
    .from(shiftSwapRequestsTable)
    .where(and(eq(shiftSwapRequestsTable.id, id), eq(shiftSwapRequestsTable.tenantId, tid)));
  if (!swap) { res.status(404).json({ error: "Solicitud no encontrada" }); return; }
  if (swap.status !== "pending") { res.status(400).json({ error: "La solicitud ya fue procesada" }); return; }

  const adminNotes = typeof req.body.adminNotes === "string" ? req.body.adminNotes : null;

  // Swap the employeeId in the work schedule (requester ↔ replacement)
  await db.update(workSchedulesTable)
    .set({ employeeId: swap.replacementEmployeeId, status: "replaced", updatedAt: new Date() })
    .where(and(eq(workSchedulesTable.id, swap.scheduleId), eq(workSchedulesTable.tenantId, tid)));

  const [updated] = await db.update(shiftSwapRequestsTable)
    .set({
      status: "approved",
      adminNotes,
      resolvedBy: resolverEmployeeId ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(shiftSwapRequestsTable.id, id))
    .returning();

  res.json(updated);

  // Send email notifications to the requester and replacement (fire-and-forget)
  const requesterAlias = alias(employeesTable, "requester");
  const replacementAlias = alias(employeesTable, "replacement");
  const [details] = await db
    .select({
      requesterEmail: requesterAlias.email,
      requesterClerkEmail: requesterAlias.clerkEmail,
      requesterName: requesterAlias.name,
      replacementEmail: replacementAlias.email,
      replacementClerkEmail: replacementAlias.clerkEmail,
      replacementName: replacementAlias.name,
      workDate: workSchedulesTable.workDate,
      shiftStart: workSchedulesTable.shiftStart,
      shiftEnd: workSchedulesTable.shiftEnd,
    })
    .from(shiftSwapRequestsTable)
    .leftJoin(requesterAlias, eq(shiftSwapRequestsTable.requesterId, requesterAlias.id))
    .leftJoin(replacementAlias, eq(shiftSwapRequestsTable.replacementEmployeeId, replacementAlias.id))
    .leftJoin(workSchedulesTable, eq(shiftSwapRequestsTable.scheduleId, workSchedulesTable.id))
    .where(eq(shiftSwapRequestsTable.id, id));
  const requesterTo = details?.requesterEmail ?? details?.requesterClerkEmail;
  const replacementTo = details?.replacementEmail ?? details?.replacementClerkEmail;
  if (requesterTo) {
    sendShiftSwapNotification({
      toEmail: requesterTo,
      requesterName: details.requesterName ?? "Empleado",
      replacementName: details.replacementName ?? "–",
      workDate: details.workDate ?? "",
      shiftStart: details.shiftStart ?? "",
      shiftEnd: details.shiftEnd ?? "",
      status: "approved",
      adminNotes,
    }).catch(() => {});
  }
  if (replacementTo) {
    sendShiftSwapNotification({
      toEmail: replacementTo,
      requesterName: details.requesterName ?? "Empleado",
      replacementName: details.replacementName ?? "–",
      workDate: details.workDate ?? "",
      shiftStart: details.shiftStart ?? "",
      shiftEnd: details.shiftEnd ?? "",
      status: "approved",
      adminNotes,
      isReplacement: true,
    }).catch(() => {});
  }
});

router.patch("/shift-swaps/:id/reject", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const resolverEmployeeId = req.employeeId;

  const [swap] = await db.select({ id: shiftSwapRequestsTable.id, status: shiftSwapRequestsTable.status })
    .from(shiftSwapRequestsTable)
    .where(and(eq(shiftSwapRequestsTable.id, id), eq(shiftSwapRequestsTable.tenantId, tid)));
  if (!swap) { res.status(404).json({ error: "Solicitud no encontrada" }); return; }
  if (swap.status !== "pending") { res.status(400).json({ error: "La solicitud ya fue procesada" }); return; }

  const adminNotes = typeof req.body.adminNotes === "string" ? req.body.adminNotes : null;

  const [updated] = await db.update(shiftSwapRequestsTable)
    .set({
      status: "rejected",
      adminNotes,
      resolvedBy: resolverEmployeeId ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(shiftSwapRequestsTable.id, id))
    .returning();

  res.json(updated);

  // Send email notification to the requester (fire-and-forget)
  const requesterAlias2 = alias(employeesTable, "requester2");
  const replacementAlias2 = alias(employeesTable, "replacement2");
  const [details] = await db
    .select({
      requesterEmail: requesterAlias2.email,
      requesterClerkEmail: requesterAlias2.clerkEmail,
      requesterName: requesterAlias2.name,
      replacementEmail: replacementAlias2.email,
      replacementClerkEmail: replacementAlias2.clerkEmail,
      replacementName: replacementAlias2.name,
      workDate: workSchedulesTable.workDate,
      shiftStart: workSchedulesTable.shiftStart,
      shiftEnd: workSchedulesTable.shiftEnd,
    })
    .from(shiftSwapRequestsTable)
    .leftJoin(requesterAlias2, eq(shiftSwapRequestsTable.requesterId, requesterAlias2.id))
    .leftJoin(replacementAlias2, eq(shiftSwapRequestsTable.replacementEmployeeId, replacementAlias2.id))
    .leftJoin(workSchedulesTable, eq(shiftSwapRequestsTable.scheduleId, workSchedulesTable.id))
    .where(eq(shiftSwapRequestsTable.id, id));
  const requesterTo = details?.requesterEmail ?? details?.requesterClerkEmail;
  if (requesterTo) {
    sendShiftSwapNotification({
      toEmail: requesterTo,
      requesterName: details.requesterName ?? "Empleado",
      replacementName: details.replacementName ?? "–",
      workDate: details.workDate ?? "",
      shiftStart: details.shiftStart ?? "",
      shiftEnd: details.shiftEnd ?? "",
      status: "rejected",
      adminNotes,
    }).catch(() => {});
  }
  const replacementTo = details?.replacementEmail ?? details?.replacementClerkEmail;
  if (replacementTo) {
    sendShiftSwapNotification({
      toEmail: replacementTo,
      requesterName: details.requesterName ?? "Empleado",
      replacementName: details.replacementName ?? "–",
      workDate: details.workDate ?? "",
      shiftStart: details.shiftStart ?? "",
      shiftEnd: details.shiftEnd ?? "",
      status: "rejected",
      adminNotes,
      isReplacement: true,
    }).catch(() => {});
  }
});

// ── Checklist: helper to generate instances when a schedule is saved ──────────

async function generateChecklistInstances(schedule: {
  id: number;
  employeeId: number;
  workDate: string;
  tenantId: number;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  position?: string | null;
}): Promise<void> {
  try {
    const { id: scheduleId, employeeId, workDate, tenantId, shiftStart, shiftEnd, position } = schedule;
    // employeeId → [{ name, area }] of newly-created instances
    const newInstancesByEmployee = new Map<number, { name: string; area: string | null }[]>();

    const templates = await db
      .select({
        id: checklistTemplatesTable.id,
        name: checklistTemplatesTable.name,
        area: checklistTemplatesTable.area,
        type: checklistTemplatesTable.type,
        rotationMode: checklistTemplatesTable.rotationMode,
        currentRotationIndex: checklistTemplatesTable.currentRotationIndex,
      })
      .from(checklistTemplatesTable)
      .where(
        and(
          eq(checklistTemplatesTable.tenantId, tenantId),
          eq(checklistTemplatesTable.isActive, true),
        ),
      );

    for (const tmpl of templates) {
      const members = await db
        .select({
          employeeId: checklistRotationMembersTable.employeeId,
          sortOrder: checklistRotationMembersTable.sortOrder,
        })
        .from(checklistRotationMembersTable)
        .where(eq(checklistRotationMembersTable.templateId, tmpl.id))
        .orderBy(asc(checklistRotationMembersTable.sortOrder));

      if (members.length === 0) continue;

      if (tmpl.type === "fixed") {
        // Only assign to this employee if they are in the members list
        const isMember = members.some((m) => m.employeeId === employeeId);
        if (!isMember) continue;
        const [fixedInserted] = await db
          .insert(checklistInstancesTable)
          .values({
            tenantId,
            templateId: tmpl.id,
            workScheduleId: scheduleId,
            assignedEmployeeId: employeeId,
            dueDate: workDate,
          })
          .onConflictDoNothing()
          .returning({ id: checklistInstancesTable.id });
        if (fixedInserted) {
          const existing = newInstancesByEmployee.get(employeeId) ?? [];
          existing.push({ name: tmpl.name, area: tmpl.area ?? null });
          newInstancesByEmployee.set(employeeId, existing);
        }
      } else if (tmpl.rotationMode === "distribute") {
        // Distribute mode: split tasks equally among members ACTUALLY SCHEDULED for workDate.
        // Members absent that day don't "steal" a task group.
        const scheduledRows = await db
          .select({ employeeId: workSchedulesTable.employeeId })
          .from(workSchedulesTable)
          .where(and(eq(workSchedulesTable.tenantId, tenantId), eq(workSchedulesTable.workDate, workDate)));
        const scheduledSet = new Set(scheduledRows.map((r) => r.employeeId));
        const activeMembers = members.filter((m) => scheduledSet.has(m.employeeId));
        if (activeMembers.length === 0) continue;

        const memberIdx = activeMembers.findIndex((m) => m.employeeId === employeeId);
        if (memberIdx === -1) continue;

        const allTasks = await db
          .select({ id: checklistTasksTable.id })
          .from(checklistTasksTable)
          .where(eq(checklistTasksTable.templateId, tmpl.id))
          .orderBy(asc(checklistTasksTable.sortOrder));

        if (allTasks.length === 0) continue;

        const memberCount = activeMembers.length;
        const dayNum = Math.floor(new Date(workDate + "T00:00:00").getTime() / 86_400_000);
        const offset = dayNum % memberCount;

        // Build sequential groups — earlier groups get 1 extra task when remainder > 0
        const groups: number[][] = Array.from({ length: memberCount }, () => []);
        const baseSize = Math.floor(allTasks.length / memberCount);
        const remainder = allTasks.length % memberCount;
        let taskStart = 0;
        for (let i = 0; i < memberCount; i++) {
          const size = baseSize + (i < remainder ? 1 : 0);
          groups[i] = allTasks.slice(taskStart, taskStart + size).map((t) => t.id);
          taskStart += size;
        }

        const groupIdx = (memberIdx + offset) % memberCount;
        const assignedTaskIds = groups[groupIdx] ?? [];

        const [distExisting] = await db
          .select({ id: checklistInstancesTable.id, assignedTaskIds: checklistInstancesTable.assignedTaskIds })
          .from(checklistInstancesTable)
          .where(
            and(
              eq(checklistInstancesTable.templateId, tmpl.id),
              eq(checklistInstancesTable.dueDate, workDate),
              eq(checklistInstancesTable.assignedEmployeeId, employeeId),
              eq(checklistInstancesTable.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (distExisting) {
          // Backfill: instance was generated before distribute mode — patch it now
          if (distExisting.assignedTaskIds === null) {
            await db
              .update(checklistInstancesTable)
              .set({ assignedTaskIds })
              .where(eq(checklistInstancesTable.id, distExisting.id));
          }
          continue;
        }

        const [distInserted] = await db
          .insert(checklistInstancesTable)
          .values({
            tenantId,
            templateId: tmpl.id,
            workScheduleId: scheduleId,
            assignedEmployeeId: employeeId,
            dueDate: workDate,
            assignedTaskIds,
          })
          .onConflictDoNothing()
          .returning({ id: checklistInstancesTable.id });
        if (distInserted) {
          const prev = newInstancesByEmployee.get(employeeId) ?? [];
          prev.push({ name: tmpl.name, area: tmpl.area ?? null });
          newInstancesByEmployee.set(employeeId, prev);
        }
      } else {
        // rotating: compute deterministic or stateful assignee index
        let assigneeIdx: number;
        const count = members.length;

        if (tmpl.rotationMode === "alternate") {
          // Deterministic: based on absolute day number / 2
          const dayNum = Math.floor(
            new Date(workDate + "T00:00:00").getTime() / 86_400_000,
          );
          assigneeIdx = Math.floor(dayNum / 2) % count;
        } else if (tmpl.rotationMode === "weekly") {
          // Deterministic: based on ISO week number
          const d = new Date(workDate + "T00:00:00");
          const jan1 = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil(
            ((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) /
              7,
          );
          assigneeIdx = (weekNum - 1) % count;
        } else {
          // shift: use stored index. Only advance the index when we're about
          // to actually create a new instance (checked below).
          assigneeIdx = tmpl.currentRotationIndex % count;
        }

        const assignedEmployeeId = members[assigneeIdx]?.employeeId;
        if (!assignedEmployeeId) continue;

        // Only process this template when the triggering schedule belongs
        // to the rotation-selected employee. This ensures the instance is
        // linked to the correct schedule and tasks never appear for shifts
        // that belong to a different employee.
        if (assignedEmployeeId !== employeeId) continue;

        // Check if an instance already exists for this template+date+employee
        // (idempotent guard — the unique constraint also prevents duplicates).
        const [existing] = await db
          .select({ id: checklistInstancesTable.id })
          .from(checklistInstancesTable)
          .where(
            and(
              eq(checklistInstancesTable.templateId, tmpl.id),
              eq(checklistInstancesTable.dueDate, workDate),
              eq(checklistInstancesTable.assignedEmployeeId, assignedEmployeeId),
              eq(checklistInstancesTable.tenantId, tenantId),
            ),
          )
          .limit(1);
        if (existing) continue;

        // Advance the shift-rotation index only when creating a new instance.
        if (tmpl.rotationMode === "shift") {
          db.update(checklistTemplatesTable)
            .set({ currentRotationIndex: assigneeIdx + 1 })
            .where(eq(checklistTemplatesTable.id, tmpl.id))
            .catch(() => {});
        }

        const [rotInserted] = await db
          .insert(checklistInstancesTable)
          .values({
            tenantId,
            templateId: tmpl.id,
            workScheduleId: scheduleId,
            assignedEmployeeId,
            dueDate: workDate,
          })
          .onConflictDoNothing()
          .returning({ id: checklistInstancesTable.id });
        if (rotInserted) {
          const existing = newInstancesByEmployee.get(assignedEmployeeId) ?? [];
          existing.push({ name: tmpl.name, area: tmpl.area ?? null });
          newInstancesByEmployee.set(assignedEmployeeId, existing);
        }
      }
    }

    // Send one email per employee who received at least one new checklist instance
    if (newInstancesByEmployee.size > 0) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const empIds = Array.from(newInstancesByEmployee.keys());
        const employees = await db
          .select({
            id: employeesTable.id,
            name: employeesTable.name,
            email: employeesTable.email,
            clerkEmail: employeesTable.clerkEmail,
          })
          .from(employeesTable)
          .where(inArray(employeesTable.id, empIds));

        for (const emp of employees) {
          const toEmail = emp.email ?? emp.clerkEmail;
          if (!toEmail) continue;
          const tasks = newInstancesByEmployee.get(emp.id) ?? [];
          const shiftLabel = shiftStart && shiftEnd ? `${shiftStart} – ${shiftEnd}` : null;
          const taskRows = tasks
            .map(
              (t) =>
                `<tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0"><strong>${t.name}</strong></td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#555">${t.area ?? "—"}</td>
                </tr>`,
            )
            .join("");
          // nosemgrep: html-in-template-string — server-side notification email; all values come from DB records, not user-supplied HTML
          const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#2563eb;margin:0 0 16px">✅ Tareas asignadas para tu turno</h2>
  <p>Hola <strong>${emp.name}</strong>, tienes las siguientes tareas asignadas para hoy.</p>
  <table style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:130px">Fecha:</td><td><strong>${workDate}</strong></td></tr>
    ${shiftLabel ? `<tr><td style="padding:6px 0;color:#666">Horario:</td><td><strong>${shiftLabel}</strong></td></tr>` : ""}
    ${position ? `<tr><td style="padding:6px 0;color:#666">Posición:</td><td>${position}</td></tr>` : ""}
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
    <thead>
      <tr style="background:#f5f7ff">
        <th style="padding:8px;text-align:left;font-size:12px;color:#555;text-transform:uppercase">Lista de tareas</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#555;text-transform:uppercase">Área</th>
      </tr>
    </thead>
    <tbody>${taskRows}</tbody>
  </table>
  <p style="font-size:13px;color:#555">Por favor completa estas tareas durante tu turno.</p>
  <p style="font-size:11px;color:#aaa;margin-top:24px">FYRO APP — Sistema de gestión de restaurantes</p>
</div>`;
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "FYRO APP <notificaciones@resend.dev>",
              to: toEmail,
              subject: `✅ Tareas de turno asignadas: ${workDate}${shiftLabel ? ` ${shiftLabel}` : ""}`,
              html,
            }),
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "generateChecklistInstances failed");
  }
}

// ── Checklist Plan Feature Guard ─────────────────────────────────────────────

router.use("/checklists", async (req, res, next) => {
  const tid = req.tenantId;
  if (!tid) { next(); return; }
  const [tenantRow] = await db
    .select({ planId: tenantsTable.planId })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tid))
    .limit(1);
  if (tenantRow?.planId) {
    const [planRow] = await db
      .select({ features: plansTable.features })
      .from(plansTable)
      .where(eq(plansTable.id, tenantRow.planId))
      .limit(1);
    const features = planRow?.features as string[] | null;
    if (Array.isArray(features) && features.length > 0 && !features.includes("checklists")) {
      res.status(403).json({ error: "Tu plan no incluye Checklists de Turno" });
      return;
    }
  }
  next();
});

// ── Checklist Templates ───────────────────────────────────────────────────────

// GET /checklists/templates — list all templates with members + tasks (admin/manager only)
router.get("/checklists/templates", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const templates = await db
    .select()
    .from(checklistTemplatesTable)
    .where(eq(checklistTemplatesTable.tenantId, tid))
    .orderBy(asc(checklistTemplatesTable.name));

  if (templates.length === 0) { res.json([]); return; }
  const templateIds = templates.map((t) => t.id);

  const [members, tasks] = await Promise.all([
    db
      .select({
        templateId: checklistRotationMembersTable.templateId,
        id: checklistRotationMembersTable.id,
        employeeId: checklistRotationMembersTable.employeeId,
        sortOrder: checklistRotationMembersTable.sortOrder,
        employeeName: employeesTable.name,
      })
      .from(checklistRotationMembersTable)
      .leftJoin(employeesTable, eq(checklistRotationMembersTable.employeeId, employeesTable.id))
      .where(inArray(checklistRotationMembersTable.templateId, templateIds))
      .orderBy(asc(checklistRotationMembersTable.sortOrder)),
    db
      .select()
      .from(checklistTasksTable)
      .where(inArray(checklistTasksTable.templateId, templateIds))
      .orderBy(asc(checklistTasksTable.sortOrder)),
  ]);

  const membersMap = new Map<number, typeof members>();
  for (const m of members) {
    if (!membersMap.has(m.templateId)) membersMap.set(m.templateId, []);
    membersMap.get(m.templateId)!.push(m);
  }
  const tasksMap = new Map<number, typeof tasks>();
  for (const t of tasks) {
    if (!tasksMap.has(t.templateId)) tasksMap.set(t.templateId, []);
    tasksMap.get(t.templateId)!.push(t);
  }

  const result = templates.map((t) => ({
    ...t,
    members: membersMap.get(t.id) ?? [],
    tasks: tasksMap.get(t.id) ?? [],
  }));

  res.json(result);
});

// POST /checklists/templates — create template with optional members and tasks
router.post("/checklists/templates", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { memberIds, tasks, ...bodyRest } = req.body as { memberIds?: number[]; tasks?: string[]; [k: string]: unknown };
  const parsed = insertChecklistTemplateSchema.safeParse({ ...bodyRest, tenantId: tid });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const [tmpl] = await db.insert(checklistTemplatesTable).values(parsed.data).returning();

  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const validEmps = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tid), inArray(employeesTable.id, memberIds)));
    const validSet = new Set(validEmps.map((e) => e.id));
    const invalid = memberIds.filter((id: number) => !validSet.has(id));
    if (invalid.length > 0) {
      await db.delete(checklistTemplatesTable).where(eq(checklistTemplatesTable.id, tmpl.id));
      res.status(400).json({ error: "Empleados no pertenecen a este tenant" });
      return;
    }
    await db.insert(checklistRotationMembersTable).values(
      memberIds.map((empId: number, i: number) => ({
        templateId: tmpl.id,
        employeeId: empId,
        sortOrder: i,
      })),
    );
  }

  // Insert tasks if provided
  let insertedTasks: ChecklistTask[] = [];
  if (Array.isArray(tasks) && tasks.length > 0) {
    const titles = tasks.map((t) => String(t).trim()).filter(Boolean);
    if (titles.length > 0) {
      insertedTasks = await db.insert(checklistTasksTable).values(
        titles.map((title, i) => ({ templateId: tmpl.id, title, sortOrder: i, tenantId: tid })),
      ).returning();
    }
  }

  res.status(201).json({ ...tmpl, members: [], tasks: insertedTasks });
});

// PATCH /checklists/templates/:id — update template and replace members + tasks
router.patch("/checklists/templates/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [existing] = await db
    .select({ id: checklistTemplatesTable.id })
    .from(checklistTemplatesTable)
    .where(and(eq(checklistTemplatesTable.id, id), eq(checklistTemplatesTable.tenantId, tid)));
  if (!existing) { res.status(404).json({ error: "Plantilla no encontrada" }); return; }

  const { memberIds, tasks, ...bodyRest } = req.body as { memberIds?: number[]; tasks?: string[]; [k: string]: unknown };
  const parsed = updateChecklistTemplateSchema.safeParse(bodyRest);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const [updated] = await db
    .update(checklistTemplatesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(checklistTemplatesTable.id, id), eq(checklistTemplatesTable.tenantId, tid)))
    .returning();

  if (Array.isArray(memberIds)) {
    if (memberIds.length > 0) {
      const validEmps = await db
        .select({ id: employeesTable.id })
        .from(employeesTable)
        .where(and(eq(employeesTable.tenantId, tid), inArray(employeesTable.id, memberIds)));
      const validSet = new Set(validEmps.map((e) => e.id));
      const invalid = memberIds.filter((mid: number) => !validSet.has(mid));
      if (invalid.length > 0) {
        res.status(400).json({ error: "Empleados no pertenecen a este tenant" });
        return;
      }
    }
    await db.delete(checklistRotationMembersTable).where(eq(checklistRotationMembersTable.templateId, id));
    if (memberIds.length > 0) {
      await db.insert(checklistRotationMembersTable).values(
        memberIds.map((empId: number, i: number) => ({
          templateId: id,
          employeeId: empId,
          sortOrder: i,
        })),
      );
    }
  }

  // Replace tasks if provided
  if (Array.isArray(tasks)) {
    await db.delete(checklistTasksTable).where(eq(checklistTasksTable.templateId, id));
    const titles = tasks.map((t) => String(t).trim()).filter(Boolean);
    if (titles.length > 0) {
      await db.insert(checklistTasksTable).values(
        titles.map((title, i) => ({ templateId: id, title, sortOrder: i, tenantId: tid })),
      );
    }
  }

  const [members, updatedTasks] = await Promise.all([
    db
      .select({
        id: checklistRotationMembersTable.id,
        employeeId: checklistRotationMembersTable.employeeId,
        sortOrder: checklistRotationMembersTable.sortOrder,
        employeeName: employeesTable.name,
        templateId: checklistRotationMembersTable.templateId,
      })
      .from(checklistRotationMembersTable)
      .leftJoin(employeesTable, eq(checklistRotationMembersTable.employeeId, employeesTable.id))
      .where(eq(checklistRotationMembersTable.templateId, id))
      .orderBy(asc(checklistRotationMembersTable.sortOrder)),
    db
      .select()
      .from(checklistTasksTable)
      .where(eq(checklistTasksTable.templateId, id))
      .orderBy(asc(checklistTasksTable.sortOrder)),
  ]);

  res.json({ ...updated, members, tasks: updatedTasks });
});

// DELETE /checklists/templates/:id
router.delete("/checklists/templates/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [deleted] = await db
    .delete(checklistTemplatesTable)
    .where(and(eq(checklistTemplatesTable.id, id), eq(checklistTemplatesTable.tenantId, tid)))
    .returning({ id: checklistTemplatesTable.id });
  if (!deleted) { res.status(404).json({ error: "Plantilla no encontrada" }); return; }

  res.json({ ok: true });
});

// ── Checklist Tasks CRUD ──────────────────────────────────────────────────────

// GET /checklists/templates/:id/tasks
router.get("/checklists/templates/:id/tasks", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const templateId = Number(req.params.id);

  const [tmpl] = await db
    .select({ id: checklistTemplatesTable.id })
    .from(checklistTemplatesTable)
    .where(and(eq(checklistTemplatesTable.id, templateId), eq(checklistTemplatesTable.tenantId, tid)));
  if (!tmpl) { res.status(404).json({ error: "Plantilla no encontrada" }); return; }

  const tasks = await db
    .select()
    .from(checklistTasksTable)
    .where(eq(checklistTasksTable.templateId, templateId))
    .orderBy(asc(checklistTasksTable.sortOrder));

  res.json(tasks);
});

// POST /checklists/templates/:id/tasks — add a single task
router.post("/checklists/templates/:id/tasks", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const templateId = Number(req.params.id);

  const [tmpl] = await db
    .select({ id: checklistTemplatesTable.id })
    .from(checklistTemplatesTable)
    .where(and(eq(checklistTemplatesTable.id, templateId), eq(checklistTemplatesTable.tenantId, tid)));
  if (!tmpl) { res.status(404).json({ error: "Plantilla no encontrada" }); return; }

  const { title, sortOrder } = req.body as { title?: string; sortOrder?: number };
  if (!title?.trim()) { res.status(400).json({ error: "El título es obligatorio" }); return; }

  const [task] = await db.insert(checklistTasksTable).values({
    templateId,
    title: title.trim(),
    sortOrder: sortOrder ?? 0,
    tenantId: tid,
  }).returning();

  res.status(201).json(task);
});

// PATCH /checklists/tasks/:id — update task title/sortOrder
router.patch("/checklists/tasks/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [existing] = await db
    .select({ id: checklistTasksTable.id })
    .from(checklistTasksTable)
    .where(and(eq(checklistTasksTable.id, id), eq(checklistTasksTable.tenantId, tid)));
  if (!existing) { res.status(404).json({ error: "Tarea no encontrada" }); return; }

  const parsed = updateChecklistTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const [updated] = await db
    .update(checklistTasksTable)
    .set(parsed.data)
    .where(and(eq(checklistTasksTable.id, id), eq(checklistTasksTable.tenantId, tid)))
    .returning();

  res.json(updated);
});

// DELETE /checklists/tasks/:id
router.delete("/checklists/tasks/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [deleted] = await db
    .delete(checklistTasksTable)
    .where(and(eq(checklistTasksTable.id, id), eq(checklistTasksTable.tenantId, tid)))
    .returning({ id: checklistTasksTable.id });
  if (!deleted) { res.status(404).json({ error: "Tarea no encontrada" }); return; }

  res.json({ ok: true });
});

// ── Checklist Instances ───────────────────────────────────────────────────────

// GET /checklists/instances?date=YYYY-MM-DD&scheduleId=&employeeId=&all=true
router.get("/checklists/instances", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const isAdmin = req.employeeRole === "admin" || req.employeeRole === "manager";
  const myEmpId = req.employeeId;

  const conditions: ReturnType<typeof eq>[] = [eq(checklistInstancesTable.tenantId, tid) as ReturnType<typeof eq>];

  const dateParam = req.query.date as string | undefined;
  const scheduleIdParam = req.query.scheduleId ? Number(req.query.scheduleId) : undefined;
  const empIdParam = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  if (dateParam) conditions.push(eq(checklistInstancesTable.dueDate, dateParam) as ReturnType<typeof eq>);
  if (dateFrom) conditions.push(gte(checklistInstancesTable.dueDate, dateFrom) as ReturnType<typeof eq>);
  if (dateTo) conditions.push(lte(checklistInstancesTable.dueDate, dateTo) as ReturnType<typeof eq>);
  if (scheduleIdParam) conditions.push(eq(checklistInstancesTable.workScheduleId, scheduleIdParam) as ReturnType<typeof eq>);
  if (empIdParam) conditions.push(eq(checklistInstancesTable.assignedEmployeeId, empIdParam) as ReturnType<typeof eq>);
  // Non-admin users can only see their own instances
  if (!isAdmin && myEmpId) conditions.push(eq(checklistInstancesTable.assignedEmployeeId, myEmpId) as ReturnType<typeof eq>);

  const instances = await db
    .select({
      id: checklistInstancesTable.id,
      tenantId: checklistInstancesTable.tenantId,
      templateId: checklistInstancesTable.templateId,
      workScheduleId: checklistInstancesTable.workScheduleId,
      assignedEmployeeId: checklistInstancesTable.assignedEmployeeId,
      dueDate: checklistInstancesTable.dueDate,
      completedAt: checklistInstancesTable.completedAt,
      completedByName: checklistInstancesTable.completedByName,
      notes: checklistInstancesTable.notes,
      itemCompletions: checklistInstancesTable.itemCompletions,
      assignedTaskIds: checklistInstancesTable.assignedTaskIds,
      startedAt: checklistInstancesTable.startedAt,
      createdAt: checklistInstancesTable.createdAt,
      templateName: checklistTemplatesTable.name,
      templateArea: checklistTemplatesTable.area,
      templateType: checklistTemplatesTable.type,
      assignedEmployeeName: employeesTable.name,
      shiftStart: workSchedulesTable.shiftStart,
      shiftEnd: workSchedulesTable.shiftEnd,
    })
    .from(checklistInstancesTable)
    .leftJoin(checklistTemplatesTable, eq(checklistInstancesTable.templateId, checklistTemplatesTable.id))
    .leftJoin(employeesTable, eq(checklistInstancesTable.assignedEmployeeId, employeesTable.id))
    .leftJoin(workSchedulesTable, eq(checklistInstancesTable.workScheduleId, workSchedulesTable.id))
    .where(and(...conditions))
    .orderBy(asc(checklistInstancesTable.dueDate), asc(checklistTemplatesTable.area), asc(checklistTemplatesTable.name));

  // Enrich with template tasks so the UI can render sub-items without a separate fetch
  const templateIds = [...new Set(instances.map((i) => i.templateId))];
  const allTasks = templateIds.length > 0
    ? await db
        .select()
        .from(checklistTasksTable)
        .where(inArray(checklistTasksTable.templateId, templateIds))
        .orderBy(asc(checklistTasksTable.sortOrder))
    : [];
  const tasksByTemplate = new Map<number, typeof allTasks>();
  for (const t of allTasks) {
    if (!tasksByTemplate.has(t.templateId)) tasksByTemplate.set(t.templateId, []);
    tasksByTemplate.get(t.templateId)!.push(t);
  }

  const result = instances.map((i) => {
    const allTemplateTasks = tasksByTemplate.get(i.templateId) ?? [];
    const assignedIds = i.assignedTaskIds as number[] | null;
    const templateTasks = assignedIds
      ? allTemplateTasks.filter((t) => assignedIds.includes(t.id))
      : allTemplateTasks;
    return { ...i, templateTasks };
  });

  res.json(result);
});

// POST /checklists/instances/:id/items/:taskId/complete — toggle a single sub-item
router.post(
  "/checklists/instances/:id/items/:taskId/complete",
  requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]),
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
    const instanceId = Number(req.params.id);
    const taskId = Number(req.params.taskId);

    const [instance] = await db
      .select({
        id: checklistInstancesTable.id,
        assignedEmployeeId: checklistInstancesTable.assignedEmployeeId,
        templateId: checklistInstancesTable.templateId,
        completedAt: checklistInstancesTable.completedAt,
        itemCompletions: checklistInstancesTable.itemCompletions,
      })
      .from(checklistInstancesTable)
      .where(and(eq(checklistInstancesTable.id, instanceId), eq(checklistInstancesTable.tenantId, tid)));
    if (!instance) { res.status(404).json({ error: "Instancia no encontrada" }); return; }

    const isAdmin = req.employeeRole === "admin" || req.employeeRole === "manager";
    if (!isAdmin && req.employeeId !== instance.assignedEmployeeId) {
      res.status(403).json({ error: "Solo puedes completar tus propias tareas" }); return;
    }

    const { completed } = req.body as { completed?: boolean };

    // If the instance is already fully completed, only admin/manager can modify sub-items
    if (instance.completedAt && !isAdmin) {
      res.status(403).json({ error: "Solo un administrador puede modificar una tarea ya completada" }); return;
    }
    // Non-admin cannot un-check a completed sub-item
    if (completed === false && !isAdmin) {
      res.status(403).json({ error: "Solo un administrador puede desmarcar actividades completadas" }); return;
    }

    // Verify task belongs to the same template
    const [task] = await db
      .select({ id: checklistTasksTable.id })
      .from(checklistTasksTable)
      .where(and(eq(checklistTasksTable.id, taskId), eq(checklistTasksTable.templateId, instance.templateId)));
    if (!task) { res.status(404).json({ error: "Ítem no encontrado" }); return; }

    // Get actor name
    let actorName: string | null = null;
    if (completed !== false && req.employeeId) {
      const [actor] = await db
        .select({ name: employeesTable.name })
        .from(employeesTable)
        .where(eq(employeesTable.id, req.employeeId));
      actorName = actor?.name ?? null;
    }

    // Merge into JSONB completions — preserve startedAt if already set
    type ItemCompletion = { startedAt?: string; completedAt?: string; completedByName: string | null };
    const existing = (instance.itemCompletions ?? {}) as Record<string, ItemCompletion>;
    const updated: Record<string, ItemCompletion> = { ...existing };
    if (completed === false) {
      delete updated[String(taskId)];
    } else {
      const now = new Date().toISOString();
      updated[String(taskId)] = {
        // Preserve existing startedAt; backfill with completedAt if never started
        startedAt: existing[String(taskId)]?.startedAt ?? now,
        completedAt: now,
        completedByName: actorName,
      };
    }

    // Fetch all tasks for this template to check auto-complete
    const allTemplateTasks = await db
      .select({ id: checklistTasksTable.id })
      .from(checklistTasksTable)
      .where(eq(checklistTasksTable.templateId, instance.templateId));

    // A task is done only if completedAt is set — startedAt alone does not count
    const allDone = allTemplateTasks.length > 0 && allTemplateTasks.every((t) => !!updated[String(t.id)]?.completedAt);

    const [updatedInstance] = await db
      .update(checklistInstancesTable)
      .set({
        itemCompletions: updated,
        // Auto-complete the whole instance if all items are done
        completedAt: allDone ? (instance.completedAt ?? new Date()) : (allTemplateTasks.length === 0 ? instance.completedAt : null),
        completedByName: allDone ? actorName : (allTemplateTasks.length === 0 ? undefined : null),
      })
      .where(and(eq(checklistInstancesTable.id, instanceId), eq(checklistInstancesTable.tenantId, tid)))
      .returning();

    res.json({ ...updatedInstance, templateTasks: allTemplateTasks });
  },
);

// POST /checklists/instances/:id/item-start — mark a single sub-item as started (idempotent)
router.post(
  "/checklists/instances/:id/item-start",
  requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]),
  async (req, res): Promise<void> => {
    const tid = req.tenantId;
    if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
    const instanceId = Number(req.params.id);
    const { taskId } = req.body as { taskId?: number };
    if (!taskId) { res.status(400).json({ error: "taskId is required" }); return; }

    const [instance] = await db
      .select({
        id: checklistInstancesTable.id,
        assignedEmployeeId: checklistInstancesTable.assignedEmployeeId,
        templateId: checklistInstancesTable.templateId,
        itemCompletions: checklistInstancesTable.itemCompletions,
        startedAt: checklistInstancesTable.startedAt,
        completedAt: checklistInstancesTable.completedAt,
      })
      .from(checklistInstancesTable)
      .where(and(eq(checklistInstancesTable.id, instanceId), eq(checklistInstancesTable.tenantId, tid)));
    if (!instance) { res.status(404).json({ error: "Instancia no encontrada" }); return; }

    const isAdmin = req.employeeRole === "admin" || req.employeeRole === "manager";
    if (!isAdmin && req.employeeId !== instance.assignedEmployeeId) {
      res.status(403).json({ error: "Solo puedes iniciar tus propias tareas" }); return;
    }

    // Verify task belongs to the same template
    const [task] = await db
      .select({ id: checklistTasksTable.id })
      .from(checklistTasksTable)
      .where(and(eq(checklistTasksTable.id, taskId), eq(checklistTasksTable.templateId, instance.templateId)));
    if (!task) { res.status(404).json({ error: "Ítem no encontrado" }); return; }

    type ItemCompletionExt = { startedAt?: string; completedAt?: string; completedByName?: string | null };
    const existing = (instance.itemCompletions ?? {}) as Record<string, ItemCompletionExt>;
    const taskKey = String(taskId);

    // Idempotent: if already started or completed, return as-is
    if (existing[taskKey]?.startedAt || existing[taskKey]?.completedAt) {
      res.json(instance);
      return;
    }

    const updated: Record<string, ItemCompletionExt> = {
      ...existing,
      [taskKey]: { ...existing[taskKey], startedAt: new Date().toISOString() },
    };

    // Also start the overall instance if not yet started
    const [updatedInstance] = await db
      .update(checklistInstancesTable)
      .set({
        itemCompletions: updated,
        startedAt: instance.startedAt ?? new Date(),
      })
      .where(and(eq(checklistInstancesTable.id, instanceId), eq(checklistInstancesTable.tenantId, tid)))
      .returning();

    res.json(updatedInstance);
  },
);

// PATCH /checklists/instances/:id/start — set startedAt timestamp (idempotent)
router.patch("/checklists/instances/:id/start", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [instance] = await db
    .select({
      id: checklistInstancesTable.id,
      assignedEmployeeId: checklistInstancesTable.assignedEmployeeId,
      completedAt: checklistInstancesTable.completedAt,
      startedAt: checklistInstancesTable.startedAt,
    })
    .from(checklistInstancesTable)
    .where(and(eq(checklistInstancesTable.id, id), eq(checklistInstancesTable.tenantId, tid)));
  if (!instance) { res.status(404).json({ error: "Instancia no encontrada" }); return; }

  const isAdmin = req.employeeRole === "admin" || req.employeeRole === "manager";
  if (!isAdmin && req.employeeId !== instance.assignedEmployeeId) {
    res.status(403).json({ error: "Solo puedes iniciar tus propias tareas" }); return;
  }
  if (instance.completedAt) { res.status(409).json({ error: "La tarea ya está completada" }); return; }
  if (instance.startedAt) { res.json({ ok: true, startedAt: instance.startedAt }); return; }

  const [updated] = await db
    .update(checklistInstancesTable)
    .set({ startedAt: new Date() })
    .where(and(eq(checklistInstancesTable.id, id), eq(checklistInstancesTable.tenantId, tid)))
    .returning({ startedAt: checklistInstancesTable.startedAt });

  res.json({ ok: true, startedAt: updated?.startedAt });
});

// PATCH /checklists/instances/:id — reassign instance to another employee (admin/manager only)
router.patch("/checklists/instances/:id", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [instance] = await db
    .select({ id: checklistInstancesTable.id, completedAt: checklistInstancesTable.completedAt })
    .from(checklistInstancesTable)
    .where(and(eq(checklistInstancesTable.id, id), eq(checklistInstancesTable.tenantId, tid)));
  if (!instance) { res.status(404).json({ error: "Instancia no encontrada" }); return; }
  if (instance.completedAt) { res.status(409).json({ error: "No se puede reasignar una tarea completada" }); return; }

  const { assignedEmployeeId, assignedTaskIds } = req.body as {
    assignedEmployeeId?: number;
    assignedTaskIds?: number[] | null;
  };
  if (!assignedEmployeeId || typeof assignedEmployeeId !== "number") {
    res.status(400).json({ error: "assignedEmployeeId requerido" }); return;
  }

  // Verify the target employee belongs to this tenant
  const [targetEmp] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.id, assignedEmployeeId), eq(employeesTable.tenantId, tid)));
  if (!targetEmp) { res.status(404).json({ error: "Empleado no encontrado" }); return; }

  const [updated] = await db
    .update(checklistInstancesTable)
    .set({
      assignedEmployeeId,
      assignedTaskIds: assignedTaskIds !== undefined ? assignedTaskIds : undefined,
      startedAt: null,
    })
    .where(and(eq(checklistInstancesTable.id, id), eq(checklistInstancesTable.tenantId, tid)))
    .returning();

  res.json(updated);
});

// PATCH /checklists/instances/:id/complete — mark as done (or undo)
router.patch("/checklists/instances/:id/complete", requireRole(["admin", "manager", "cashier", "waiter", "cook", "delivery"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);

  const [instance] = await db
    .select({ id: checklistInstancesTable.id, assignedEmployeeId: checklistInstancesTable.assignedEmployeeId })
    .from(checklistInstancesTable)
    .where(and(eq(checklistInstancesTable.id, id), eq(checklistInstancesTable.tenantId, tid)));
  if (!instance) { res.status(404).json({ error: "Instancia no encontrada" }); return; }

  const isAdmin = req.employeeRole === "admin" || req.employeeRole === "manager";
  // Non-admin users can only complete their own tasks
  if (!isAdmin && req.employeeId !== instance.assignedEmployeeId) {
    res.status(403).json({ error: "Solo puedes completar tus propias tareas" }); return;
  }

  const { completed, notes } = req.body as {
    completed?: boolean;
    notes?: string;
  };

  // Only admin/manager can un-complete a finished instance
  if (completed === false && !isAdmin) {
    res.status(403).json({ error: "Solo un administrador puede reabrir una tarea completada" }); return;
  }

  // Derive actor name server-side from the authenticated employee
  let actorName: string | null = null;
  if (completed !== false && req.employeeId) {
    const [actor] = await db
      .select({ name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, req.employeeId));
    actorName = actor?.name ?? null;
  }

  const [updated] = await db
    .update(checklistInstancesTable)
    .set({
      completedAt: completed === false ? null : new Date(),
      completedByName: completed === false ? null : actorName,
      // When uncompleting, clear all item completions too
      itemCompletions: completed === false ? null : undefined,
      notes: notes !== undefined ? notes : undefined,
    })
    .where(and(eq(checklistInstancesTable.id, id), eq(checklistInstancesTable.tenantId, tid)))
    .returning();

  res.json(updated);
});

// GET /checklists/report — aggregated compliance metrics (admin/manager only)
router.get("/checklists/report", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  // Default: last 4 weeks
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 27);
  const dateFrom = (req.query.dateFrom as string | undefined) ?? defaultFrom.toISOString().split("T")[0];
  const dateTo = (req.query.dateTo as string | undefined) ?? now.toISOString().split("T")[0];

  // Fetch all instances in range with template + employee info
  const instances = await db
    .select({
      id: checklistInstancesTable.id,
      templateId: checklistInstancesTable.templateId,
      assignedEmployeeId: checklistInstancesTable.assignedEmployeeId,
      dueDate: checklistInstancesTable.dueDate,
      startedAt: checklistInstancesTable.startedAt,
      completedAt: checklistInstancesTable.completedAt,
      completedByName: checklistInstancesTable.completedByName,
      notes: checklistInstancesTable.notes,
      itemCompletions: checklistInstancesTable.itemCompletions,
      templateName: checklistTemplatesTable.name,
      templateArea: checklistTemplatesTable.area,
      employeeName: employeesTable.name,
    })
    .from(checklistInstancesTable)
    .leftJoin(checklistTemplatesTable, eq(checklistInstancesTable.templateId, checklistTemplatesTable.id))
    .leftJoin(employeesTable, eq(checklistInstancesTable.assignedEmployeeId, employeesTable.id))
    .where(
      and(
        eq(checklistInstancesTable.tenantId, tid),
        gte(checklistInstancesTable.dueDate, dateFrom),
        lte(checklistInstancesTable.dueDate, dateTo),
      ),
    )
    .orderBy(asc(checklistInstancesTable.dueDate));

  // Load template tasks so we can compute item-based completion
  const reportTemplateIds = [...new Set(instances.map((i) => i.templateId))];
  const reportTasks = reportTemplateIds.length > 0
    ? await db
        .select()
        .from(checklistTasksTable)
        .where(inArray(checklistTasksTable.templateId, reportTemplateIds))
    : [];
  const tasksByTmpl = new Map<number, typeof reportTasks>();
  for (const t of reportTasks) {
    if (!tasksByTmpl.has(t.templateId)) tasksByTmpl.set(t.templateId, []);
    tasksByTmpl.get(t.templateId)!.push(t);
  }

  // Helper: is an instance effectively done? (completedAt OR all items have completedAt)
  type ItemCompletionRecord = Record<string, { startedAt?: string; completedAt?: string; completedByName: string | null }>;
  function isEffectivelyDone(inst: { completedAt: Date | null; templateId: number; itemCompletions: unknown }): boolean {
    if (inst.completedAt) return true;
    const tmplTasks = tasksByTmpl.get(inst.templateId) ?? [];
    if (tmplTasks.length === 0) return false;
    const completions = (inst.itemCompletions ?? {}) as ItemCompletionRecord;
    // Must have completedAt — startedAt alone does not count as done
    return tmplTasks.every((t) => !!completions[String(t.id)]?.completedAt);
  }

  // Helper: item-level stats for instances that have sub-tasks
  function itemStats(inst: { templateId: number; itemCompletions: unknown }): { totalItems: number; completedItems: number } {
    const tmplTasks = tasksByTmpl.get(inst.templateId) ?? [];
    if (tmplTasks.length === 0) return { totalItems: 0, completedItems: 0 };
    const completions = (inst.itemCompletions ?? {}) as ItemCompletionRecord;
    return {
      totalItems: tmplTasks.length,
      // Count only items that have completedAt, not merely startedAt
      completedItems: tmplTasks.filter((t) => !!completions[String(t.id)]?.completedAt).length,
    };
  }

  // ── By template ──────────────────────────────────────────────────────────
  const byTemplateMap = new Map<number, { templateId: number; templateName: string; area: string | null; total: number; completed: number; totalItems: number; completedItems: number }>();
  for (const inst of instances) {
    const key = inst.templateId;
    if (!byTemplateMap.has(key)) {
      byTemplateMap.set(key, { templateId: key, templateName: inst.templateName ?? `#${key}`, area: inst.templateArea ?? null, total: 0, completed: 0, totalItems: 0, completedItems: 0 });
    }
    const row = byTemplateMap.get(key)!;
    row.total += 1;
    if (isEffectivelyDone(inst)) row.completed += 1;
    const its = itemStats(inst);
    row.totalItems += its.totalItems;
    row.completedItems += its.completedItems;
  }
  const byTemplate = Array.from(byTemplateMap.values())
    .map((r) => ({ ...r, pct: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0, itemPct: r.totalItems > 0 ? Math.round((r.completedItems / r.totalItems) * 100) : null }))
    .sort((a, b) => a.pct - b.pct);

  // ── By employee ───────────────────────────────────────────────────────────
  const byEmployeeMap = new Map<number, { employeeId: number; employeeName: string; total: number; completed: number }>();
  for (const inst of instances) {
    const key = inst.assignedEmployeeId;
    if (!byEmployeeMap.has(key)) {
      byEmployeeMap.set(key, { employeeId: key, employeeName: inst.employeeName ?? `#${key}`, total: 0, completed: 0 });
    }
    const row = byEmployeeMap.get(key)!;
    row.total += 1;
    if (isEffectivelyDone(inst)) row.completed += 1;
  }
  const byEmployee = Array.from(byEmployeeMap.values())
    .map((r) => ({ ...r, pct: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // ── By week ───────────────────────────────────────────────────────────────
  // ISO week start = Monday
  function getMonday(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }
  const byWeekMap = new Map<string, { week: string; total: number; completed: number }>();
  for (const inst of instances) {
    const week = getMonday(inst.dueDate);
    if (!byWeekMap.has(week)) byWeekMap.set(week, { week, total: 0, completed: 0 });
    const row = byWeekMap.get(week)!;
    row.total += 1;
    if (isEffectivelyDone(inst)) row.completed += 1;
  }
  const byWeek = Array.from(byWeekMap.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((r) => ({ ...r, pct: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0 }));

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalInstances = instances.length;
  const totalCompleted = instances.filter((i) => isEffectivelyDone(i)).length;
  const totalPct = totalInstances > 0 ? Math.round((totalCompleted / totalInstances) * 100) : 0;
  const totalItems = instances.reduce((s, i) => s + itemStats(i).totalItems, 0);
  const totalCompletedItems = instances.reduce((s, i) => s + itemStats(i).completedItems, 0);
  const totalItemPct = totalItems > 0 ? Math.round((totalCompletedItems / totalItems) * 100) : null;

  res.json({
    dateFrom,
    dateTo,
    totalInstances,
    totalCompleted,
    totalPct,
    totalItems,
    totalCompletedItems,
    totalItemPct,
    byTemplate,
    byEmployee,
    byWeek,
    instances: instances.map((i) => {
      const its = itemStats(i);
      const durationMinutes =
        i.startedAt && i.completedAt
          ? Math.round((new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 60000)
          : null;
      return {
        id: i.id,
        dueDate: i.dueDate,
        templateName: i.templateName ?? `#${i.templateId}`,
        templateArea: i.templateArea,
        employeeId: i.assignedEmployeeId,
        employeeName: i.employeeName ?? `#${i.assignedEmployeeId}`,
        completed: isEffectivelyDone(i),
        startedAt: i.startedAt,
        completedAt: i.completedAt,
        completedByName: i.completedByName,
        notes: i.notes,
        durationMinutes,
        totalItems: its.totalItems,
        completedItems: its.completedItems,
      };
    }),
  });
});

// POST /checklists/generate — manually generate instances for a date
router.post("/checklists/generate", requireRole(["admin", "manager"]), async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { date } = req.body as { date?: string };
  if (!date) { res.status(400).json({ error: "date is required (YYYY-MM-DD)" }); return; }

  // Fetch all schedules for this date+tenant and generate for each
  const schedules = await db
    .select({
      id: workSchedulesTable.id,
      employeeId: workSchedulesTable.employeeId,
      workDate: workSchedulesTable.workDate,
      shiftStart: workSchedulesTable.shiftStart,
      shiftEnd: workSchedulesTable.shiftEnd,
      position: workSchedulesTable.position,
    })
    .from(workSchedulesTable)
    .where(and(eq(workSchedulesTable.tenantId, tid), eq(workSchedulesTable.workDate, date)));

  for (const s of schedules) {
    await generateChecklistInstances({ ...s, tenantId: tid });
  }

  // Second pass: ensure distribute-mode templates create instances for ALL members who have
  // schedules today, even if their schedules were saved before the template was configured.
  const distribTemplates = await db
    .select({
      id: checklistTemplatesTable.id,
      name: checklistTemplatesTable.name,
      area: checklistTemplatesTable.area,
    })
    .from(checklistTemplatesTable)
    .where(
      and(
        eq(checklistTemplatesTable.tenantId, tid),
        eq(checklistTemplatesTable.isActive, true),
        eq(checklistTemplatesTable.rotationMode, "distribute"),
      ),
    );

  for (const tmpl of distribTemplates) {
    const allMembers = await db
      .select({ employeeId: checklistRotationMembersTable.employeeId })
      .from(checklistRotationMembersTable)
      .where(eq(checklistRotationMembersTable.templateId, tmpl.id))
      .orderBy(asc(checklistRotationMembersTable.sortOrder));
    if (allMembers.length === 0) continue;

    const tasks = await db
      .select({ id: checklistTasksTable.id })
      .from(checklistTasksTable)
      .where(eq(checklistTasksTable.templateId, tmpl.id))
      .orderBy(asc(checklistTasksTable.sortOrder));
    if (tasks.length === 0) continue;

    // Filter to members actually scheduled this date — batch query for efficiency
    const scheduledOnDate = await db
      .select({ employeeId: workSchedulesTable.employeeId, id: workSchedulesTable.id })
      .from(workSchedulesTable)
      .where(and(eq(workSchedulesTable.tenantId, tid), eq(workSchedulesTable.workDate, date)));
    const scheduleByEmployee = new Map(scheduledOnDate.map((s) => [s.employeeId, s.id]));
    const activeMembers = allMembers.filter((m) => scheduleByEmployee.has(m.employeeId));
    if (activeMembers.length === 0) continue;

    const memberCount = activeMembers.length;
    const dayNum = Math.floor(new Date(date + "T00:00:00").getTime() / 86_400_000);
    const offset = dayNum % memberCount;

    // Build sequential groups based on active count
    const groups: number[][] = Array.from({ length: memberCount }, () => []);
    const baseSize = Math.floor(tasks.length / memberCount);
    const rem = tasks.length % memberCount;
    let ts = 0;
    for (let i = 0; i < memberCount; i++) {
      const sz = baseSize + (i < rem ? 1 : 0);
      groups[i] = tasks.slice(ts, ts + sz).map((t) => t.id);
      ts += sz;
    }

    for (let memberIdx = 0; memberIdx < activeMembers.length; memberIdx++) {
      const memberId = activeMembers[memberIdx].employeeId;
      const schedId = scheduleByEmployee.get(memberId)!;

      // Skip if instance already exists
      const [existInst] = await db
        .select({ id: checklistInstancesTable.id, assignedTaskIds: checklistInstancesTable.assignedTaskIds })
        .from(checklistInstancesTable)
        .where(
          and(
            eq(checklistInstancesTable.templateId, tmpl.id),
            eq(checklistInstancesTable.dueDate, date),
            eq(checklistInstancesTable.assignedEmployeeId, memberId),
            eq(checklistInstancesTable.tenantId, tid),
          ),
        )
        .limit(1);

      const groupIdx = (memberIdx + offset) % memberCount;
      const assignedTaskIds = groups[groupIdx] ?? [];

      if (existInst) {
        // Backfill: instance existed before distribute mode was set — patch it now
        if (existInst.assignedTaskIds === null) {
          await db
            .update(checklistInstancesTable)
            .set({ assignedTaskIds })
            .where(eq(checklistInstancesTable.id, existInst.id));
        }
        continue;
      }

      await db
        .insert(checklistInstancesTable)
        .values({
          tenantId: tid,
          templateId: tmpl.id,
          workScheduleId: schedId,
          assignedEmployeeId: memberId,
          dueDate: date,
          assignedTaskIds,
        })
        .onConflictDoNothing();
    }
  }

  res.json({ ok: true, schedulesProcessed: schedules.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// PQRS — Public submit + admin management
// ─────────────────────────────────────────────────────────────────────────────

// Role guard for all admin PQRS routes (public/ sub-paths are excluded via middleware)
router.use("/pqrs", (req, res, next) => {
  // Allow public sub-paths without role check
  if (req.path.startsWith("/public/")) { next(); return; }
  requireRole(["admin", "manager"])(req, res, next);
});

// ── Notification helper ─────────────────────────────────────────────────────
async function sendPqrsNotification(
  type: "received" | "response" | "resolved",
  data: {
    tenantName: string;
    tenantAdminEmail?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    pqrsType: string;
    pqrsId: number;
    comment?: string | null;
    adminResponse?: string | null;
    adminNotes?: string | null;
    discountCode?: string | null;
    panelUrl?: string;
  },
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = "FYRO APP <notificaciones@resend.dev>";

  // Helper: build a prefilled WhatsApp link for admin → customer messaging
  const buildWaLink = (phone: string, text: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

  if (type === "received") {
    // 1. Confirmation to customer (if email provided)
    if (data.customerEmail && resendKey) {
      const body = `Hola${data.customerName ? ` ${data.customerName}` : ""},\n\nRecibimos tu ${data.pqrsType} en ${data.tenantName}. Lo revisaremos y te daremos respuesta pronto.\n\nGracias por ayudarnos a mejorar.\n— Equipo ${data.tenantName}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from: fromEmail, to: data.customerEmail, subject: `Recibimos tu PQRS — ${data.tenantName}`, text: body }),
      }).catch(() => {});
    }
    // 2. Alert to tenant admin — include prefilled WhatsApp link to contact customer
    if (data.tenantAdminEmail && resendKey) {
      const typeLabels: Record<string, string> = { peticion: "Petición", queja: "Queja", reclamo: "Reclamo", sugerencia: "Sugerencia", calificacion: "Calificación" };
      const waText = `Hola${data.customerName ? ` ${data.customerName}` : ""}, recibimos tu ${typeLabels[data.pqrsType] ?? data.pqrsType} en ${data.tenantName}. Estamos atendiéndote y te daremos respuesta pronto.`;
      const waLink = data.customerPhone
        ? `\nContactar por WhatsApp (prefilled): ${buildWaLink(data.customerPhone, waText)}\n`
        : "";
      const body = `Nuevo PQRS recibido en ${data.tenantName}\n\nTipo: ${typeLabels[data.pqrsType] ?? data.pqrsType}\nCliente: ${data.customerName ?? "Anónimo"}\n${data.customerEmail ? `Email: ${data.customerEmail}\n` : ""}${waLink}${data.comment ? `Mensaje: ${data.comment}\n` : ""}\nVer panel: ${data.panelUrl ?? ""}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from: fromEmail, to: data.tenantAdminEmail, subject: `[PQRS] Nueva ${typeLabels[data.pqrsType] ?? data.pqrsType} — ${data.tenantName}`, text: body }),
      }).catch(() => {});
    }
  } else if (type === "response") {
    // Notify customer of admin response
    if (data.customerEmail && resendKey && data.adminResponse) {
      const body = `Hola${data.customerName ? ` ${data.customerName}` : ""},\n\nEl equipo de ${data.tenantName} ha respondido a tu PQRS:\n\n"${data.adminResponse}"\n${data.discountCode ? `\nCódigo de descuento para tu próxima visita: ${data.discountCode}\n` : ""}\nGracias por contactarnos.\n— Equipo ${data.tenantName}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from: fromEmail, to: data.customerEmail, subject: `Respuesta a tu PQRS — ${data.tenantName}`, text: body }),
      }).catch(() => {});
    }
  } else if (type === "resolved") {
    // Notify customer that their PQRS has been resolved
    if (data.customerEmail && resendKey) {
      const typeLabels: Record<string, string> = { peticion: "Petición", queja: "Queja", reclamo: "Reclamo", sugerencia: "Sugerencia", calificacion: "Calificación" };
      const typeLabel = typeLabels[data.pqrsType] ?? data.pqrsType;
      const notesLine = data.adminNotes ? `\nNotas del equipo:\n"${data.adminNotes}"\n` : "";
      const discountLine = data.discountCode ? `\nComo agradecimiento, te compartimos un código de descuento para tu próxima visita: ${data.discountCode}\n` : "";
      const body = `Hola${data.customerName ? ` ${data.customerName}` : ""},\n\nTu ${typeLabel} en ${data.tenantName} ha sido resuelta.${notesLine}${discountLine}\nGracias por tu tiempo y por ayudarnos a mejorar.\n— Equipo ${data.tenantName}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from: fromEmail, to: data.customerEmail, subject: `Tu PQRS fue resuelta — ${data.tenantName}`, text: body }),
      }).catch(() => {});
    }
  }
}

// ── Public endpoints (accessible without auth via middleware) ─────────────────

// GET /api/pqrs/token/:token  — validate a sale/delivery PQRS QR token, return context for the form
router.get("/pqrs/token/:token", async (req, res): Promise<void> => {
  const { token } = req.params;

  // Try to find a sale with this pqrsToken
  const saleRows = (await db.execute(sql`
    SELECT s.id, s.table_id, s.created_at, s.employee_id, s.tenant_id,
           t.slug AS tenant_slug, t.name AS tenant_name
    FROM sales s
    LEFT JOIN tenants t ON t.id = s.tenant_id
    WHERE s.pqrs_token = ${token}
    LIMIT 1
  `)).rows as any[];

  if (saleRows.length > 0) {
    const sale = saleRows[0];
    // Check if already used (a pqrs_review already has this sale_token)
    const usedRows = (await db.execute(sql`
      SELECT id FROM pqrs_reviews WHERE sale_token = ${token} LIMIT 1
    `)).rows;
    if (usedRows.length > 0) {
      res.status(409).json({ error: "Este enlace ya fue utilizado" });
      return;
    }

    // Determine if this is a mesa sale (has table_id that's not a virtual table)
    const isMesa = !!(sale.table_id);

    // For mesa sales, get employees who were clocked in at sale time
    let employees: { id: number; name: string; role: string; profilePhoto: string | null }[] = [];
    if (isMesa && sale.tenant_id) {
      const empRows = (await db.execute(sql`
        SELECT DISTINCT ON (e.id) e.id, e.name, e.role, e.profile_photo AS "profilePhoto"
        FROM employees e
        JOIN time_entries te ON te.employee_id = e.id
        WHERE e.tenant_id = ${sale.tenant_id}
          AND e.status = 'active'
          AND te.clock_in <= ${sale.created_at}
          AND (te.clock_out IS NULL OR te.clock_out >= ${sale.created_at})
        ORDER BY e.id
      `)).rows as any[];
      employees = empRows;
    }

    res.json({
      valid: true,
      tokenType: "sale",
      saleType: isMesa ? "mesa" : "other",
      saleCreatedAt: sale.created_at,
      tenantSlug: sale.tenant_slug,
      tenantName: sale.tenant_name,
      employees,
    });
    return;
  }

  // Try deliveries
  const deliveryRows = (await db.execute(sql`
    SELECT d.id, d.created_at, d.tenant_id,
           t.slug AS tenant_slug, t.name AS tenant_name
    FROM deliveries d
    LEFT JOIN tenants t ON t.id = d.tenant_id
    WHERE d.pqrs_token = ${token}
    LIMIT 1
  `)).rows as any[];

  if (deliveryRows.length > 0) {
    const delivery = deliveryRows[0];
    const usedRows = (await db.execute(sql`
      SELECT id FROM pqrs_reviews WHERE sale_token = ${token} LIMIT 1
    `)).rows;
    if (usedRows.length > 0) {
      res.status(409).json({ error: "Este enlace ya fue utilizado" });
      return;
    }
    res.json({
      valid: true,
      tokenType: "delivery",
      saleType: "other",
      saleCreatedAt: delivery.created_at,
      tenantSlug: delivery.tenant_slug,
      tenantName: delivery.tenant_name,
      employees: [],
    });
    return;
  }

  res.status(404).json({ error: "Enlace inválido o no encontrado" });
});

// GET /api/pqrs/lookup-customer?token=<token>&phone=<phone>  — find registered customer by phone
router.get("/pqrs/lookup-customer", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
  const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
  if (!token || !phone) { res.status(400).json({ error: "token y phone requeridos" }); return; }

  // Resolve tenantId from token (sale or delivery)
  const saleRows = (await db.execute(sql`SELECT tenant_id FROM sales WHERE pqrs_token = ${token} LIMIT 1`)).rows as any[];
  const tenantId = saleRows.length > 0 ? saleRows[0].tenant_id : null
    ?? ((await db.execute(sql`SELECT tenant_id FROM deliveries WHERE pqrs_token = ${token} LIMIT 1`)).rows as any[])[0]?.tenant_id;

  if (!tenantId) { res.status(404).json({ found: false }); return; }

  const custRows = (await db.execute(sql`
    SELECT id, name, loyalty_points FROM customers
    WHERE tenant_id = ${tenantId} AND phone = ${phone} AND active = true
    LIMIT 1
  `)).rows as any[];

  if (custRows.length === 0) { res.json({ found: false }); return; }
  res.json({ found: true, id: custRows[0].id, name: custRows[0].name, loyaltyPoints: custRows[0].loyalty_points });
});

// GET /api/pqrs/public/form?tenant=<slug>  — company info + active employees with profilePhoto
router.get("/pqrs/public/form", async (req, res): Promise<void> => {
  const slug = typeof req.query.tenant === "string" ? req.query.tenant.trim() : "";
  if (!slug) { res.status(400).json({ error: "tenant requerido" }); return; }

  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  if (!tenant) { res.status(404).json({ error: "Empresa no encontrada" }); return; }

  const emps = await db
    .select({ id: employeesTable.id, name: employeesTable.name, role: employeesTable.role, profilePhoto: employeesTable.profilePhoto })
    .from(employeesTable)
    .where(and(eq(employeesTable.tenantId, tenant.id), eq(employeesTable.status, "active")));

  res.json({ companyName: tenant.name, employees: emps });
});

// POST /api/pqrs/public/submit?tenant=<slug>  — submit a PQRS review
router.post("/pqrs/public/submit", async (req, res): Promise<void> => {
  const slug = typeof req.query.tenant === "string" ? req.query.tenant.trim() : "";
  if (!slug) { res.status(400).json({ error: "tenant requerido" }); return; }

  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, adminEmail: tenantsTable.adminEmail })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  if (!tenant) { res.status(404).json({ error: "Empresa no encontrada" }); return; }

  const schema = z.object({
    type: z.enum(["peticion", "queja", "reclamo", "sugerencia", "calificacion"]),
    serviceRating: z.number().int().min(1).max(5).optional(),
    foodRating: z.number().int().min(1).max(5).optional(),
    waiterRating: z.number().int().min(1).max(5).optional(),
    overallRating: z.number().int().min(1).max(5).optional(),
    employeeId: z.number().int().optional(),
    comment: z.string().max(5000).optional(),
    customerName: z.string().max(200).optional(),
    customerPhone: z.string().max(50).optional(),
    customerEmail: z.string().email().optional().or(z.literal("")),
    saleToken: z.string().max(200).optional(),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Datos inválidos", details: parse.error.flatten() }); return; }

  const data = parse.data;

  // If saleToken provided, validate it hasn't already been used
  if (data.saleToken) {
    const usedRows = (await db.execute(sql`
      SELECT id FROM pqrs_reviews WHERE sale_token = ${data.saleToken} LIMIT 1
    `)).rows;
    if (usedRows.length > 0) {
      res.status(409).json({ error: "Este enlace ya fue utilizado" });
      return;
    }
  }

  let employeeName: string | undefined;

  if (data.employeeId) {
    const [emp] = await db
      .select({ id: employeesTable.id, name: employeesTable.name })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, data.employeeId), eq(employeesTable.tenantId, tenant.id)))
      .limit(1);
    if (!emp) { res.status(400).json({ error: "Empleado no encontrado" }); return; }
    employeeName = emp.name;
  }

  const [inserted] = await db
    .insert(pqrsReviewsTable)
    .values({
      tenantId: tenant.id,
      type: data.type,
      status: "pending",
      serviceRating: data.serviceRating ?? null,
      foodRating: data.foodRating ?? null,
      waiterRating: data.waiterRating ?? null,
      overallRating: data.overallRating ?? null,
      employeeId: data.employeeId ?? null,
      employeeName: employeeName ?? null,
      comment: data.comment ?? null,
      customerName: data.customerName ?? null,
      customerPhone: data.customerPhone ?? null,
      customerEmail: data.customerEmail || null,
      ...(data.saleToken ? { saleToken: data.saleToken } : {}),
    } as any)
    .returning({ id: pqrsReviewsTable.id });

  // Award loyalty points for PQRS if customer is registered and loyalty points > 0
  if (data.saleToken && data.customerPhone) {
    try {
      const loyaltyCfg = await getLoyaltyConfig(tenant.id);
      if (loyaltyCfg.enabled && loyaltyCfg.pointsPerPqrs > 0) {
        const custRows = (await db.execute(sql`
          SELECT id, loyalty_points FROM customers
          WHERE tenant_id = ${tenant.id} AND phone = ${data.customerPhone} AND active = true
          LIMIT 1
        `)).rows as any[];
        if (custRows.length > 0) {
          const cust = custRows[0];
          const newBalance = (cust.loyalty_points ?? 0) + loyaltyCfg.pointsPerPqrs;
          await db.execute(sql`
            UPDATE customers SET loyalty_points = ${newBalance} WHERE id = ${cust.id}
          `);
          await db.execute(sql`
            INSERT INTO loyalty_movements (customer_id, type, delta, balance_after, reference, tenant_id)
            VALUES (${cust.id}, 'earn', ${loyaltyCfg.pointsPerPqrs}, ${newBalance},
                    ${"PQRS-" + inserted.id}, ${tenant.id})
          `);
        }
      }
    } catch (_) { /* non-blocking */ }
  }

  // Send notifications async (don't block response)
  const origin = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "fyroerp.com"}`;
  sendPqrsNotification("received", {
    tenantName: tenant.name,
    tenantAdminEmail: tenant.adminEmail,
    customerName: data.customerName ?? null,
    customerEmail: data.customerEmail || null,
    customerPhone: data.customerPhone ?? null,
    pqrsType: data.type,
    pqrsId: inserted.id,
    comment: data.comment ?? null,
    panelUrl: `${origin}/pqrs`,
  }).catch(() => {});

  res.status(201).json({ id: inserted.id });
});

// Legacy compat: keep old public path working
router.get("/public/pqrs/employees", async (req, res): Promise<void> => {
  const slug = typeof req.query.tenant === "string" ? req.query.tenant.trim() : "";
  if (!slug) { res.json([]); return; }
  const [tenant] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  if (!tenant) { res.json([]); return; }
  const emps = await db.select({ id: employeesTable.id, name: employeesTable.name, role: employeesTable.role }).from(employeesTable).where(and(eq(employeesTable.tenantId, tenant.id), eq(employeesTable.status, "active")));
  res.json(emps);
});

async function generatePqrsCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const rows = (await db.execute(sql`SELECT id FROM discount_campaigns WHERE code = ${code} LIMIT 1`)).rows;
    if (rows.length === 0) return code;
  }
  // Timestamp-based fallback (still 8 chars)
  return Date.now().toString(36).toUpperCase().padStart(8, "0").slice(-8);
}

// Public: submit a PQRS review
// POST /api/public/pqrs?tenant=<slug>
router.post("/public/pqrs", async (req, res): Promise<void> => {
  const slug = typeof req.query.tenant === "string" ? req.query.tenant.trim() : "";
  if (!slug) { res.status(400).json({ error: "tenant requerido" }); return; }

  const [tenant] = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  if (!tenant) { res.status(404).json({ error: "Empresa no encontrada" }); return; }

  const schema = z.object({
    type: z.enum(["peticion", "queja", "reclamo", "sugerencia"]),
    ratings: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
    overallRating: z.number().int().min(1).max(5).optional(),
    employeeId: z.number().int().optional(),
    employeeName: z.string().max(200).optional(),
    comment: z.string().max(5000).optional(),
    customerName: z.string().max(200).optional(),
    customerPhone: z.string().max(50).optional(),
    customerEmail: z.string().email().optional().or(z.literal("")),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Datos inválidos", details: parse.error.flatten() }); return; }

  const data = parse.data;

  // Verify employee belongs to tenant if provided
  if (data.employeeId) {
    const [emp] = await db
      .select({ id: employeesTable.id, name: employeesTable.name })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, data.employeeId), eq(employeesTable.tenantId, tenant.id)))
      .limit(1);
    if (!emp) { res.status(400).json({ error: "Empleado no encontrado" }); return; }
    if (!data.employeeName) data.employeeName = emp.name;
  }

  const [inserted] = await db
    .insert(pqrsReviewsTable)
    .values({
      tenantId: tenant.id,
      type: data.type,
      status: "pending",
      overallRating: data.overallRating ?? null,
      ratings: (data.ratings && Object.keys(data.ratings).length > 0 ? data.ratings : null) as Record<string, number> | null,
      employeeId: data.employeeId ?? null,
      employeeName: data.employeeName ?? null,
      comment: data.comment ?? null,
      customerName: data.customerName ?? null,
      customerPhone: data.customerPhone ?? null,
      customerEmail: data.customerEmail || null,
    })
    .returning({ id: pqrsReviewsTable.id });

  res.status(201).json({ id: inserted.id });
});

// GET /api/pqrs/validate-discount/:code — validate a PQRS discount code without redeeming it
router.get("/pqrs/validate-discount/:code", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const code = (req.params.code ?? "").trim().toUpperCase();
  if (!code) { res.status(400).json({ error: "Código requerido" }); return; }

  const [review] = await db
    .select()
    .from(pqrsReviewsTable)
    .where(
      and(
        eq(pqrsReviewsTable.tenantId, tid),
        eq(pqrsReviewsTable.discountCode, code),
      ),
    )
    .limit(1);

  if (!review) {
    res.status(400).json({ error: "Código de descuento PQRS no válido" });
    return;
  }
  if (review.discountUsedAt) {
    res.status(409).json({ error: "Este código de descuento ya fue utilizado" });
    return;
  }
  if (review.discountExpiresAt && review.discountExpiresAt < new Date()) {
    res.status(410).json({ error: "Este código de descuento ha expirado" });
    return;
  }

  res.json({
    valid: true,
    reviewId: review.id,
    code: review.discountCode,
    discountAmount: Number(review.discountAmount ?? 0),
    discountExpiresAt: review.discountExpiresAt,
  });
});

// Admin: list PQRS reviews for the authenticated tenant
// GET /api/pqrs?status=pending&type=queja
router.get("/pqrs", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  const typeFilter = typeof req.query.type === "string" ? req.query.type : undefined;
  const employeeIdFilter = typeof req.query.employeeId === "string" ? Number(req.query.employeeId) : undefined;
  const minRatingFilter = typeof req.query.minRating === "string" ? Number(req.query.minRating) : undefined;
  const dateFromFilter = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
  const dateToFilter = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

  const conditions = [eq(pqrsReviewsTable.tenantId, tid)];
  if (statusFilter) conditions.push(eq(pqrsReviewsTable.status, statusFilter));
  if (typeFilter) conditions.push(eq(pqrsReviewsTable.type, typeFilter));
  if (employeeIdFilter && !isNaN(employeeIdFilter)) conditions.push(eq(pqrsReviewsTable.employeeId, employeeIdFilter));
  if (minRatingFilter && !isNaN(minRatingFilter)) conditions.push(gte(pqrsReviewsTable.overallRating, minRatingFilter));
  if (dateFromFilter) conditions.push(gte(pqrsReviewsTable.createdAt, new Date(dateFromFilter)));
  if (dateToFilter) conditions.push(lte(pqrsReviewsTable.createdAt, new Date(dateToFilter + "T23:59:59")));

  const reviews = await db
    .select()
    .from(pqrsReviewsTable)
    .where(and(...conditions))
    .orderBy(desc(pqrsReviewsTable.createdAt));

  res.json(reviews);
});

// Admin: update a PQRS review (status, adminNotes)
// PATCH /api/pqrs/:id
router.patch("/pqrs/:id", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const [existing] = await db
    .select({
      id: pqrsReviewsTable.id,
      status: pqrsReviewsTable.status,
      type: pqrsReviewsTable.type,
      customerName: pqrsReviewsTable.customerName,
      customerEmail: pqrsReviewsTable.customerEmail,
      adminNotes: pqrsReviewsTable.adminNotes,
      discountCode: pqrsReviewsTable.discountCode,
    })
    .from(pqrsReviewsTable)
    .where(and(eq(pqrsReviewsTable.id, id), eq(pqrsReviewsTable.tenantId, tid)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "No encontrado" }); return; }

  const schema = z.object({
    status: z.enum(["pending", "in_review", "resolved", "closed"]).optional(),
    adminNotes: z.string().max(5000).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  const [updated] = await db
    .update(pqrsReviewsTable)
    .set({ ...parse.data })
    .where(and(eq(pqrsReviewsTable.id, id), eq(pqrsReviewsTable.tenantId, tid)))
    .returning();

  res.json(updated);

  // Send resolution email to customer when status transitions to "resolved"
  const becomingResolved = parse.data.status === "resolved" && existing.status !== "resolved";
  if (becomingResolved && existing.customerEmail) {
    const [tenant] = await db
      .select({ name: tenantsTable.name })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tid))
      .limit(1);
    const adminNotes = parse.data.adminNotes ?? existing.adminNotes;
    sendPqrsNotification("resolved", {
      tenantName: tenant?.name ?? "",
      customerName: existing.customerName,
      customerEmail: existing.customerEmail,
      pqrsType: existing.type,
      pqrsId: id,
      adminNotes,
      discountCode: existing.discountCode,
    }).catch(() => {});
  }
});

// Admin: generate a discount code for a queja/reclamo
// POST /api/pqrs/:id/generate-discount
router.post("/pqrs/:id/generate-discount", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const [existing] = await db
    .select()
    .from(pqrsReviewsTable)
    .where(and(eq(pqrsReviewsTable.id, id), eq(pqrsReviewsTable.tenantId, tid)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "No encontrado" }); return; }
  if (existing.type !== "queja" && existing.type !== "reclamo") {
    res.status(400).json({ error: "Solo se pueden generar descuentos para quejas y reclamos" }); return;
  }
  if (existing.discountCode) {
    res.status(409).json({ error: "Ya tiene un código de descuento", discountCode: existing.discountCode }); return;
  }

  const schema = z.object({
    amount: z.number().positive().optional(),
    daysValid: z.number().int().min(1).max(365).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  const amount = parse.data.amount ?? 5000;
  const daysValid = parse.data.daysValid ?? 30;
  const discountCode = await generatePqrsCode();
  const discountExpiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

  // Create a discount_campaigns entry so the code appears in the Promociones panel
  const campaignResult = await db.execute(sql`
    INSERT INTO discount_campaigns
      (tenant_id, code, name, description, discount_amount, valid_from, valid_until,
       max_total_uses, max_uses_per_customer, campaign_type, is_active, source, pqrs_id)
    VALUES (
      ${tid}, ${discountCode},
      ${"PQRS #" + id + " — descuento compensatorio"},
      ${"Generado automáticamente desde PQRS ID " + id},
      ${amount},
      ${new Date().toISOString().slice(0, 10)},
      ${discountExpiresAt.toISOString().slice(0, 10)},
      1, 1, 'manual', true, 'pqrs', ${id}
    ) RETURNING id
  `);
  const campaignRows = (campaignResult as unknown as { rows: { id: number }[] }).rows ?? [];
  const campaign = campaignRows[0];

  const campaignId = campaign?.id ?? null;

  const [updated] = await db
    .update(pqrsReviewsTable)
    .set({ discountCode, discountAmount: String(amount), discountExpiresAt, discountCampaignId: campaignId })
    .where(and(eq(pqrsReviewsTable.id, id), eq(pqrsReviewsTable.tenantId, tid)))
    .returning();

  res.json({ discountCode, discountAmount: amount, discountExpiresAt, campaignId, review: updated });
});

// Admin: post a response/reply to a PQRS review (public-facing, sent to customer via email)
// POST /api/pqrs/:id/respond
router.post("/pqrs/:id/respond", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const [existing] = await db
    .select()
    .from(pqrsReviewsTable)
    .where(and(eq(pqrsReviewsTable.id, id), eq(pqrsReviewsTable.tenantId, tid)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "No encontrado" }); return; }

  const schema = z.object({
    adminResponse: z.string().min(1).max(5000),
    discountCampaignId: z.number().int().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Datos inválidos" }); return; }

  // If attaching an existing campaign, verify it belongs to this tenant
  let campaignCode: string | null = existing.discountCode;
  if (parse.data.discountCampaignId) {
    const campResult = await db.execute(sql`
      SELECT id, code FROM discount_campaigns
      WHERE id = ${parse.data.discountCampaignId} AND tenant_id = ${tid}
    `);
    const row = campResult.rows[0] as { id: number; code: string } | undefined;
    if (!row) { res.status(404).json({ error: "Campaña no encontrada" }); return; }
    campaignCode = row.code;
  }

  const [updated] = await db
    .update(pqrsReviewsTable)
    .set({
      adminResponse: parse.data.adminResponse,
      respondedAt: new Date(),
      status: "resolved",
      ...(parse.data.discountCampaignId ? { discountCampaignId: parse.data.discountCampaignId, discountCode: campaignCode } : {}),
    })
    .where(and(eq(pqrsReviewsTable.id, id), eq(pqrsReviewsTable.tenantId, tid)))
    .returning();

  // Send response notification async
  const [tenant] = await db.select({ name: tenantsTable.name }).from(tenantsTable).where(eq(tenantsTable.id, tid)).limit(1);
  sendPqrsNotification("response", {
    tenantName: tenant?.name ?? "la empresa",
    customerName: existing.customerName,
    customerEmail: existing.customerEmail,
    customerPhone: existing.customerPhone,
    pqrsType: existing.type,
    pqrsId: id,
    adminResponse: parse.data.adminResponse,
    discountCode: campaignCode,
  }).catch(() => {});

  // Build a prefilled WhatsApp link for admin use
  const waReplyLink = existing.customerPhone
    ? (() => {
        const phone = existing.customerPhone.replace(/\D/g, "");
        const tenantName = tenant?.name ?? "la empresa";
        let msg = `Hola${existing.customerName ? ` ${existing.customerName}` : ""}, en ${tenantName} respondemos tu PQRS:\n\n"${parse.data.adminResponse}"`;
        if (campaignCode) msg += `\n\nTe enviamos un código de descuento: ${campaignCode}`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      })()
    : null;

  res.json({ ...updated, whatsappReplyLink: waReplyLink });
});

// Admin: global PQRS stats (counts by type + status, avg ratings, per-employee summary)
// GET /api/pqrs/stats
router.get("/pqrs/stats", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const reviews = await db
    .select({
      type: pqrsReviewsTable.type,
      status: pqrsReviewsTable.status,
      overallRating: pqrsReviewsTable.overallRating,
      serviceRating: pqrsReviewsTable.serviceRating,
      foodRating: pqrsReviewsTable.foodRating,
      waiterRating: pqrsReviewsTable.waiterRating,
      employeeId: pqrsReviewsTable.employeeId,
      employeeName: pqrsReviewsTable.employeeName,
    })
    .from(pqrsReviewsTable)
    .where(eq(pqrsReviewsTable.tenantId, tid));

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const overallRatings: number[] = [];
  const serviceRatings: number[] = [];
  const foodRatings: number[] = [];
  // Per-employee: map of employeeId → { name, ratings[] }
  const empMap: Record<number, { name: string; waiterRatings: number[]; count: number }> = {};

  for (const r of reviews) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.overallRating) overallRatings.push(r.overallRating);
    if (r.serviceRating) serviceRatings.push(r.serviceRating);
    if (r.foodRating) foodRatings.push(r.foodRating);
    if (r.employeeId && r.waiterRating) {
      if (!empMap[r.employeeId]) empMap[r.employeeId] = { name: r.employeeName ?? String(r.employeeId), waiterRatings: [], count: 0 };
      empMap[r.employeeId].waiterRatings.push(r.waiterRating);
      empMap[r.employeeId].count += 1;
    } else if (r.employeeId) {
      if (!empMap[r.employeeId]) empMap[r.employeeId] = { name: r.employeeName ?? String(r.employeeId), waiterRatings: [], count: 0 };
      empMap[r.employeeId].count += 1;
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  // Fetch profile photos for employees that appeared in reviews
  const empIds = Object.keys(empMap).map(Number);
  const photoMap: Record<number, string | null> = {};
  if (empIds.length > 0) {
    const empRows = await db
      .select({ id: employeesTable.id, profilePhoto: employeesTable.profilePhoto })
      .from(employeesTable)
      .where(inArray(employeesTable.id, empIds));
    for (const e of empRows) photoMap[e.id] = e.profilePhoto ?? null;
  }

  const employeeStats = Object.entries(empMap).map(([empId, d]) => ({
    employeeId: Number(empId),
    employeeName: d.name,
    reviewCount: d.count,
    avgWaiterRating: avg(d.waiterRatings),
    profilePhoto: photoMap[Number(empId)] ?? null,
  }));

  res.json({
    total: reviews.length,
    byType,
    byStatus,
    avgRating: avg(overallRatings),
    avgServiceRating: avg(serviceRatings),
    avgFoodRating: avg(foodRatings),
    employeeStats,
  });
});

// Admin: employee rating stats
// GET /api/pqrs/stats/employees
router.get("/pqrs/stats/employees", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  // Get all reviews that have an employee and ratings
  const reviews = await db
    .select({
      employeeId: pqrsReviewsTable.employeeId,
      employeeName: pqrsReviewsTable.employeeName,
      overallRating: pqrsReviewsTable.overallRating,
      ratings: pqrsReviewsTable.ratings,
    })
    .from(pqrsReviewsTable)
    .where(and(eq(pqrsReviewsTable.tenantId, tid), isNotNull(pqrsReviewsTable.employeeId)));

  // Aggregate by employee
  const byEmployee = new Map<number, {
    employeeId: number;
    employeeName: string;
    overallRatings: number[];
    food: number[];
    service: number[];
    speed: number[];
    cleanliness: number[];
    value: number[];
  }>();

  for (const r of reviews) {
    if (!r.employeeId) continue;
    if (!byEmployee.has(r.employeeId)) {
      byEmployee.set(r.employeeId, {
        employeeId: r.employeeId,
        employeeName: r.employeeName ?? `Empleado #${r.employeeId}`,
        overallRatings: [],
        food: [],
        service: [],
        speed: [],
        cleanliness: [],
        value: [],
      });
    }
    const entry = byEmployee.get(r.employeeId)!;
    if (r.overallRating) entry.overallRatings.push(r.overallRating);
    const ratingData = r.ratings as Record<string, number> | null;
    if (ratingData) {
      if (ratingData.food) entry.food.push(ratingData.food);
      if (ratingData.service) entry.service.push(ratingData.service);
      if (ratingData.speed) entry.speed.push(ratingData.speed);
      if (ratingData.cleanliness) entry.cleanliness.push(ratingData.cleanliness);
      if (ratingData.value) entry.value.push(ratingData.value);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const stats = Array.from(byEmployee.values()).map((e) => ({
    employeeId: e.employeeId,
    employeeName: e.employeeName,
    reviewCount: e.overallRatings.length || Math.max(e.food.length, e.service.length, e.speed.length, e.cleanliness.length, e.value.length),
    avgRating: avg(e.overallRatings),
    avgFood: avg(e.food),
    avgService: avg(e.service),
    avgSpeed: avg(e.speed),
    avgCleanliness: avg(e.cleanliness),
    avgValue: avg(e.value),
  }));

  stats.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  res.json(stats);
});

// GET /api/pqrs/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns: total, byType, avgRating, weeklyTrend, topEmployees
router.get("/pqrs/summary", async (req, res): Promise<void> => {
  const tid = req.tenantId;
  if (!tid) { res.status(401).json({ error: "No autorizado" }); return; }

  const fromParam = req.query.from as string | undefined;
  const toParam = req.query.to as string | undefined;
  const fromDate = fromParam ? new Date(fromParam + "T00:00:00") : new Date(0);
  const toDate = toParam ? new Date(toParam + "T23:59:59.999") : new Date();

  const reviews = await db
    .select({
      type: pqrsReviewsTable.type,
      overallRating: pqrsReviewsTable.overallRating,
      employeeId: pqrsReviewsTable.employeeId,
      employeeName: pqrsReviewsTable.employeeName,
      createdAt: pqrsReviewsTable.createdAt,
    })
    .from(pqrsReviewsTable)
    .where(
      and(
        eq(pqrsReviewsTable.tenantId, tid),
        sql`${pqrsReviewsTable.createdAt} >= ${fromDate.toISOString()}`,
        sql`${pqrsReviewsTable.createdAt} <= ${toDate.toISOString()}`,
      )
    );

  // Count by type
  const byType: Record<string, number> = {};
  const allRatings: number[] = [];
  // Per-employee aggregation
  const empMap = new Map<number, { name: string; ratings: number[] }>();
  // Weekly trend: map of ISO week-start (Monday) string → ratings
  const weekMap = new Map<string, number[]>();

  for (const r of reviews) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    if (r.overallRating) allRatings.push(r.overallRating);

    // Employee aggregation
    if (r.employeeId && r.overallRating) {
      if (!empMap.has(r.employeeId)) empMap.set(r.employeeId, { name: r.employeeName ?? `Empleado #${r.employeeId}`, ratings: [] });
      empMap.get(r.employeeId)!.ratings.push(r.overallRating);
    }

    // Weekly bucketing — find Monday of that week
    if (r.overallRating && r.createdAt) {
      const d = new Date(r.createdAt);
      const day = d.getDay(); // 0 = Sunday
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().slice(0, 10);
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
      weekMap.get(weekKey)!.push(r.overallRating);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  // Weekly trend sorted chronologically
  const weeklyTrend = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, ratings]) => {
      const d = new Date(weekStart + "T00:00:00");
      const label = d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
      return { weekStart, label, avgRating: avg(ratings)!, count: ratings.length };
    });

  // Top-3 employees by avg rating (min 1 review)
  const topEmployees = [...empMap.entries()]
    .map(([empId, d]) => ({
      employeeId: empId,
      employeeName: d.name,
      reviewCount: d.ratings.length,
      avgRating: avg(d.ratings)!,
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 3);

  res.json({
    total: reviews.length,
    byType,
    avgRating: avg(allRatings),
    weeklyTrend,
    topEmployees,
  });
});

export default router;
