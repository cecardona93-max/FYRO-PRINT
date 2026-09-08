import { app, BrowserWindow, ipcMain, nativeImage, protocol, Tray, Menu } from "electron";
import updater from "electron-updater";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startPrintAgent } from "./print-agent.js";

const APP_PROTOCOL = "fyro-print-agent";
const { autoUpdater } = updater;
const defaultApiUrl = "https://app.fyro.co/api";
const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
let tray: Tray | undefined;
let onboardingWindow: BrowserWindow | undefined;
let stopAgent: (() => Promise<void>) | undefined;
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
  const trustedProductionHost = url.hostname === "app.fyro.co" || url.hostname.endsWith(".fyro.co");
  const trustedDevelopmentHost = !app.isPackaged && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !trustedDevelopmentHost) throw new Error("La URL del agente debe usar HTTPS.");
  if (!trustedProductionHost && !trustedDevelopmentHost) throw new Error("La URL no pertenece a un servidor autorizado de FYRO.");
  url.search = "";
  url.hash = "";
  url.pathname = `${url.pathname.replace(/\/+$/, "") || ""}/`;
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

function onboardingHtml(): string {
  return `<!doctype html>
    <html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
    <style>
      body{font:14px system-ui,sans-serif;margin:0;padding:28px;color:#172033;background:#f8fafc}
      main{max-width:440px;margin:auto;background:white;border:1px solid #dbe3ef;border-radius:14px;padding:24px;box-shadow:0 10px 30px #17203312}
      h1{font-size:20px;margin:0 0 8px}p{color:#5d6b82;line-height:1.45}
      label{display:block;font-size:12px;font-weight:600;margin:16px 0 5px}
      input{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit}
      button{width:100%;margin-top:20px;border:0;border-radius:8px;padding:11px;background:#3457d5;color:white;font-weight:600;cursor:pointer}
      button:disabled{opacity:.6;cursor:wait}.error{color:#b42318;min-height:20px;margin-top:12px;font-size:12px}
    </style></head><body><main>
      <h1>Conectar agente de impresión</h1>
      <p>Pega el código generado en FYRO. Solo se usa una vez para vincular este equipo; las actualizaciones conservarán la empresa vinculada.</p>
      <form id="form">
        <label for="apiUrl">URL de FYRO</label><input id="apiUrl" autocomplete="url" value="${defaultApiUrl}">
        <label for="code">Código de emparejamiento</label><input id="code" required autocomplete="one-time-code" placeholder="Pega el código de Ajustes">
        <label for="name">Nombre de este equipo</label><input id="name" required value="Caja principal">
        <button id="submit" type="submit">Conectar y activar</button><div id="error" class="error"></div>
      </form>
    </main><script>
      const form=document.getElementById("form"),button=document.getElementById("submit"),error=document.getElementById("error");
      if(typeof window.fyroOnPairingData==="function")window.fyroOnPairingData((value)=>{value=value||{};if(value.apiUrl)document.getElementById("apiUrl").value=value.apiUrl;if(value.pairingCode)document.getElementById("code").value=value.pairingCode;if(value.name)document.getElementById("name").value=value.name;});
      form.addEventListener("submit",async(e)=>{e.preventDefault();button.disabled=true;error.textContent="";
        if(typeof window.fyroPair!=="function"){error.textContent="No se pudo iniciar el conector de FYRO. Reinstala la versión más reciente.";button.disabled=false;return;}
        const result=await window.fyroPair({apiUrl:document.getElementById("apiUrl").value, pairingCode:document.getElementById("code").value.trim(), name:document.getElementById("name").value.trim()});
        if(!result.ok){error.textContent=result.error;button.disabled=false;}else{document.body.innerHTML="<main><h1>Agente conectado</h1><p>FYRO está listo para imprimir. Esta ventana puede cerrarse; el agente seguirá activo en segundo plano.</p></main>";}
      });
    </script></body></html>`;
}

function createOnboardingWindow(pairing?: typeof pendingPairing): void {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    if (pairing) onboardingWindow.webContents.send("pairing-data", pairing);
    onboardingWindow.show();
    return;
  }
  onboardingWindow = new BrowserWindow({
    width: 520, height: 570, resizable: false, title: "FYRO Print Agent",
    webPreferences: { preload: join(currentDirectory, "print-agent-preload.cjs"), contextIsolation: true, nodeIntegration: false },
  });
  if (pairing) onboardingWindow.webContents.once("did-finish-load", () => onboardingWindow?.webContents.send("pairing-data", pairing));
  onboardingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(onboardingHtml())}`);
  onboardingWindow.on("closed", () => { onboardingWindow = undefined; });
}

async function startConfiguredAgent(pairing?: typeof pendingPairing): Promise<void> {
  await stopAgent?.();
  const apiUrl = pairing?.apiUrl ? trustedApiUrl(pairing.apiUrl) : undefined;
  stopAgent = await startPrintAgent({
    configPath: join(app.getPath("userData"), "agent.json"),
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
  protocol.registerSchemesAsPrivileged([{ scheme: APP_PROTOCOL, privileges: { secure: true, standard: true } }]);
  app.on("second-instance", (_event, commandLine: string[]) => {
    const pairing = parsePairingUrl(commandLine.find((value) => value.startsWith(`${APP_PROTOCOL}://`)));
    if (pairing) createOnboardingWindow(pairing);
    onboardingWindow?.show();
  });
  app.whenReady().then(() => {
    ipcMain.handle("pair-agent", async (_event, pairing: typeof pendingPairing) => {
      if (!pairing?.apiUrl || !pairing.pairingCode || !pairing.name) return { ok: false, error: "Completa todos los campos." };
      try { await startConfiguredAgent(pairing); return { ok: true }; }
      catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo vincular el agente." }; }
    });
    boot().catch((error) => { console.error(error); createOnboardingWindow(); });
  });
  app.on("open-url", (event, url) => { event.preventDefault(); const pairing = parsePairingUrl(url); if (pairing) createOnboardingWindow(pairing); });
  app.on("before-quit", () => { void stopAgent?.(); });
}