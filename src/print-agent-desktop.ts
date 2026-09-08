import { app, BrowserWindow, nativeImage, protocol, Tray, Menu } from "electron";
import updater from "electron-updater";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { startPrintAgent } from "./print-agent.js";

const APP_PROTOCOL = "fyro-print-agent";
const ONBOARDING_PROTOCOL = "fyro-print-agent-onboard";
const { autoUpdater } = updater;
const defaultApiUrl = "https://www.fyroerp.com/api";
let tray: Tray | undefined;
let onboardingWindow: BrowserWindow | undefined;
let stopAgent: (() => Promise<void>) | undefined;
let pairingInProgress = false;
let pendingPairing: { apiUrl: string; pairingCode: string; name?: string } | undefined =
  parsePairingUrl(process.argv.find((value) => value.startsWith(`${APP_PROTOCOL}://`)));

function parsePairingUrl(value: string | undefined): typeof pendingPairing {
  if (!value?.startsWith(`${APP_PROTOCOL}://`)) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname !== "pair") return undefined;
    const pairingCode = url.searchParams.get("code");
    if (!pairingCode) return undefined;
    return {
      apiUrl: url.searchParams.get("apiUrl") || defaultApiUrl,
      pairingCode,
      name: url.searchParams.get("name") || undefined,
    };
  } catch {
    return undefined;
  }
}

function trustedApiUrl(value: string): string {
  const url = new URL(value);
  const trustedProductionHost = url.hostname === "www.fyroerp.com";
  const trustedDevelopmentHost = !app.isPackaged && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !trustedDevelopmentHost) throw new Error("La URL del agente debe usar HTTPS.");
  if (!trustedProductionHost && !trustedDevelopmentHost) throw new Error("La URL no pertenece a un servidor autorizado de FYRO.");
  if (url.username || url.password || (url.port && !trustedDevelopmentHost)) throw new Error("La URL de FYRO contiene datos no permitidos.");
  if (!["/api", "/api/"].includes(url.pathname)) throw new Error("La URL debe terminar en /api.");
  url.search = "";
  url.hash = "";
  url.pathname = "/api";
  return url.toString().replace(/\/$/, "");
}

function createTray(): void {
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#3457d5"/><path fill="#fff" d="M9 7h14v7h2v10h-4v3H11v-3H7V14h2V7zm3 3v7h8v-7h-8zm2 10v4h6v-4h-6z"/></svg>`;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("FYRO Print Agent");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir configuración", click: () => createOnboardingWindow() },
    { type: "separator" },
    { label: "Salir", click: () => app.quit() },
  ]));
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function pageHtml(content: string): string {
  return `<!doctype html>
    <html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action ${ONBOARDING_PROTOCOL}:; base-uri 'none'">
    <style>
      body{font:14px system-ui,sans-serif;margin:0;padding:28px;color:#172033;background:#f8fafc}
      main{max-width:440px;margin:auto;background:white;border:1px solid #dbe3ef;border-radius:14px;padding:24px;box-shadow:0 10px 30px #17203312}
      h1{font-size:20px;margin:0 0 8px}p{color:#5d6b82;line-height:1.45}
      label{display:block;font-size:12px;font-weight:600;margin:16px 0 5px}
      input{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit}
      button{width:100%;margin-top:20px;border:0;border-radius:8px;padding:11px;background:#3457d5;color:white;font-weight:600;cursor:pointer}
      .error{color:#b42318;margin:12px 0 0;font-size:12px}.status{font-weight:600;color:#3457d5}
    </style></head><body><main>${content}</main></body></html>`;
}

function onboardingHtml(pairing?: typeof pendingPairing, error?: string): string {
  const apiUrl = escapeHtml(pairing?.apiUrl || defaultApiUrl);
  const pairingCode = escapeHtml(pairing?.pairingCode || "");
  const name = escapeHtml(pairing?.name || "Caja principal");
  return pageHtml(`
      <h1>Conectar agente de impresión</h1>
      <p>Pega el código generado en FYRO. Solo se usa una vez para vincular este equipo; las actualizaciones conservarán la empresa vinculada.</p>
      <form method="get" action="${ONBOARDING_PROTOCOL}://pair">
        <label for="apiUrl">URL de FYRO</label><input id="apiUrl" name="apiUrl" required maxlength="2048" autocomplete="url" value="${apiUrl}">
        <label for="code">Código de emparejamiento</label><input id="code" name="code" required minlength="16" maxlength="256" autocomplete="one-time-code" placeholder="Pega el código de Ajustes" value="${pairingCode}">
        <label for="name">Nombre de este equipo</label><input id="name" name="name" required maxlength="120" value="${name}">
        <button type="submit">Conectar y activar</button>
        ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
      </form>
  `);
}

function loadOnboardingHtml(html: string): void {
  void onboardingWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function singleParameter(url: URL, name: string): string | null {
  const values = url.searchParams.getAll(name);
  return values.length === 1 ? values[0] : null;
}

async function handleOnboardingNavigation(targetUrl: string): Promise<void> {
  if (!onboardingWindow || pairingInProgress) return;
  let pairing: NonNullable<typeof pendingPairing> | undefined;
  try {
    const url = new URL(targetUrl);
    if (url.protocol !== `${ONBOARDING_PROTOCOL}:` || url.hostname !== "pair" || !["", "/"].includes(url.pathname)) {
      throw new Error("Solicitud de emparejamiento inválida.");
    }
    const apiUrl = singleParameter(url, "apiUrl")?.trim();
    const pairingCode = singleParameter(url, "code")?.trim();
    const name = singleParameter(url, "name")?.trim();
    if (url.searchParams.size !== 3 || !apiUrl || apiUrl.length > 2048 || !pairingCode || pairingCode.length < 16 || pairingCode.length > 256 || !name || name.length > 120) {
      throw new Error("Completa todos los campos con datos válidos.");
    }
    pairing = { apiUrl, pairingCode, name };
    pairingInProgress = true;
    loadOnboardingHtml(pageHtml('<h1>Conectando agente</h1><p class="status">Validando el código con FYRO…</p>'));
    await startConfiguredAgent(pairing);
    loadOnboardingHtml(pageHtml("<h1>Agente conectado</h1><p>FYRO está listo para imprimir. Esta ventana puede cerrarse; el agente seguirá activo en segundo plano.</p>"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo vincular el agente.";
    loadOnboardingHtml(onboardingHtml(pairing, message));
  } finally {
    pairingInProgress = false;
  }
}

function createOnboardingWindow(pairing?: typeof pendingPairing): void {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    loadOnboardingHtml(onboardingHtml(pairing));
    onboardingWindow.show();
    return;
  }
  onboardingWindow = new BrowserWindow({
    width: 520, height: 570, resizable: false, title: "FYRO Print Agent",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  onboardingWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  onboardingWindow.webContents.on("will-navigate", (event, targetUrl) => {
    event.preventDefault();
    if (targetUrl.startsWith(`${ONBOARDING_PROTOCOL}://`)) void handleOnboardingNavigation(targetUrl);
  });
  loadOnboardingHtml(onboardingHtml(pairing));
  onboardingWindow.on("closed", () => { onboardingWindow = undefined; });
}

async function startConfiguredAgent(pairing?: typeof pendingPairing): Promise<void> {
  const configPath = join(app.getPath("userData"), "agent.json");
  if (pairing && existsSync(configPath)) {
    throw new Error("Este equipo ya está vinculado. Cierra esta ventana; el agente continúa activo en segundo plano.");
  }
  await stopAgent?.();
  const apiUrl = pairing?.apiUrl ? trustedApiUrl(pairing.apiUrl) : undefined;
  stopAgent = await startPrintAgent({
    configPath,
    apiUrl,
    pairingCode: pairing?.pairingCode,
    name: pairing?.name,
    validateApiUrl: trustedApiUrl,
    onError: (error) => console.error(`[print-agent] ${error.message}`),
  });
}

async function boot(): Promise<void> {
  app.setAsDefaultProtocolClient(APP_PROTOCOL);
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
  createTray();
  pendingPairing && await startConfiguredAgent(pendingPairing).catch(() => createOnboardingWindow(pendingPairing));
  if (!stopAgent) {
    const configPath = join(app.getPath("userData"), "agent.json");
    if (existsSync(configPath)) await startConfiguredAgent().catch(() => createOnboardingWindow());
    else createOnboardingWindow(pendingPairing);
  }
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.once("update-downloaded", () => {
      setTimeout(async () => {
        await stopAgent?.();
        autoUpdater.quitAndInstall(false, true);
      }, 30_000);
    });
    autoUpdater.checkForUpdatesAndNotify().catch((error: Error) => console.error(`[print-agent] update check failed: ${error.message}`));
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_PROTOCOL, privileges: { secure: true, standard: true } },
    { scheme: ONBOARDING_PROTOCOL, privileges: { secure: true, standard: true } },
  ]);
  app.on("second-instance", (_event, commandLine: string[]) => {
    const pairing = parsePairingUrl(commandLine.find((value) => value.startsWith(`${APP_PROTOCOL}://`)));
    if (pairing) createOnboardingWindow(pairing);
    onboardingWindow?.show();
  });
  app.whenReady().then(() => {
    boot().catch((error) => { console.error(error); createOnboardingWindow(); });
  });
  app.on("open-url", (event, url) => { event.preventDefault(); const pairing = parsePairingUrl(url); if (pairing) createOnboardingWindow(pairing); });
  app.on("before-quit", () => { void stopAgent?.(); });
}