/**
 * FYRO local print agent.
 *
 * The polling/printing code is exported so the packaged desktop application
 * can use exactly the same implementation as the legacy CLI. The CLI remains
 * available for development and troubleshooting, while the installer uses
 * Electron to provide a Node-free, auto-starting application.
 *
 * It intentionally never writes the bearer token to stdout/stderr.
 */
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

export type Device = { id: string; name: string; connection: "usb" | "bluetooth" | "unknown" };
export type Config = { apiUrl: string; token: string; agentId: number; name: string };
export type PrintAgentOptions = {
  configPath?: string;
  apiUrl?: string;
  pairingCode?: string;
  name?: string;
  validateApiUrl?: (apiUrl: string) => string;
  onError?: (error: Error) => void;
};

function networkErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "FYRO tardó demasiado en responder. Revisa la conexión a internet e inténtalo de nuevo.";
  }
  const cause = error instanceof Error ? (error.cause as NodeJS.ErrnoException | undefined) : undefined;
  if (cause?.code === "ENOTFOUND" || cause?.code === "EAI_AGAIN") {
    return "No se pudo encontrar el servidor de FYRO. Revisa la conexión a internet e inténtalo de nuevo.";
  }
  if (cause?.code?.startsWith("CERT_") || cause?.code?.includes("TLS")) {
    return "Windows no pudo validar la conexión segura con FYRO. Revisa la fecha del equipo y la conexión a internet.";
  }
  return "No se pudo conectar con FYRO. Revisa la conexión a internet e inténtalo de nuevo.";
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return new Error(body.error.trim());
  } catch {
    // The fallback below intentionally avoids exposing an unexpected response body.
  }
  return new Error(`${fallback} (${response.status}).`);
}

const defaultConfigPath = join(homedir(), ".fyro-print-agent.json");
const legacyApiUrl = "https://app.fyro.co/api";
const currentApiUrl = "https://www.fyroerp.com/api";
const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

async function saveConfig(configPath: string, config: Config): Promise<void> {
  await mkdir(homedir(), { recursive: true });
  const temporary = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(config), { mode: 0o600 });
  await rename(temporary, configPath);
  await chmod(configPath, 0o600);
}

function run(command: string, arguments_: string[], env?: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, { windowsHide: true, env: { ...process.env, ...env } });
    let stdout = ""; let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} timed out.`));
    }, 30_000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `${command} exited ${code}`));
    });
  });
}

export async function listPrintDevices(): Promise<Device[]> {
  if (platform() === "win32") {
    const text = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-Printer | Select-Object Name,PortName | ConvertTo-Json -Compress"]);
    const rows = JSON.parse(text || "[]"); const list = Array.isArray(rows) ? rows : [rows];
    return list.filter((x) => x?.Name).map((x) => {
      const port = String(x.PortName ?? "").toLowerCase();
      const connection = port.includes("bluetooth") || port.startsWith("bth")
        ? "bluetooth" as const
        : port.startsWith("usb")
          ? "usb" as const
          : "unknown" as const;
      return { id: String(x.Name), name: String(x.Name), connection };
    });
  }
  const text = await run("lpstat", ["-p"]);
  return text.split(/\r?\n/).flatMap((line) => {
    const match = /^printer\s+(\S+)/.exec(line);
    return match ? [{ id: match[1], name: match[1], connection: "unknown" as const }] : [];
  });
}

async function printWindows(printer: string, bytes: Buffer): Promise<void> {
  // Data/printer travel in environment variables, not interpolated into PowerShell.
  const script = `
$src=@'
using System; using System.Runtime.InteropServices;
public static class RawPrinter { [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { [MarshalAs(UnmanagedType.LPWStr)] public string pDocName; [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPWStr)] public string pDataType; }
[DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)] public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);
[DllImport("winspool.drv",SetLastError=true)] public static extern bool ClosePrinter(IntPtr h);
[DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)] public static extern int StartDocPrinter(IntPtr h,int l,DOCINFO d);
[DllImport("winspool.drv",SetLastError=true)] public static extern bool EndDocPrinter(IntPtr h);
[DllImport("winspool.drv",SetLastError=true)] public static extern bool StartPagePrinter(IntPtr h);
[DllImport("winspool.drv",SetLastError=true)] public static extern bool EndPagePrinter(IntPtr h);
[DllImport("winspool.drv",SetLastError=true)] public static extern bool WritePrinter(IntPtr h,byte[] b,int c,out int w); }
'@
Add-Type $src; $h=[IntPtr]::Zero; if(![RawPrinter]::OpenPrinter($env:FYRO_PRINTER,[ref]$h,[IntPtr]::Zero)){throw "OpenPrinter failed"}
try {$d=New-Object RawPrinter+DOCINFO; $d.pDocName="FYRO"; $d.pDataType="RAW"; if([RawPrinter]::StartDocPrinter($h,1,$d)-le 0){throw "StartDocPrinter failed"}; [RawPrinter]::StartPagePrinter($h)|Out-Null; $b=[Convert]::FromBase64String($env:FYRO_DATA); $w=0; if(![RawPrinter]::WritePrinter($h,$b,$b.Length,[ref]$w)){throw "WritePrinter failed"}; [RawPrinter]::EndPagePrinter($h)|Out-Null; [RawPrinter]::EndDocPrinter($h)|Out-Null} finally {[RawPrinter]::ClosePrinter($h)|Out-Null}`;
  await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { FYRO_PRINTER: printer, FYRO_DATA: bytes.toString("base64") });
}
async function print(device: string, payload: string): Promise<void> {
  const bytes = Buffer.from(payload, "base64");
  if (platform() === "win32") return printWindows(device, bytes);
  // lp receives raw bytes on stdin; no shell is involved, so queue names are safe.
  await new Promise<void>((resolve, reject) => {
    const child = spawn("lp", ["-d", device, "-o", "raw"], { windowsHide: true });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("lp timed out."));
    }, 30_000);
    let stderr = ""; child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || "lp failed"));
    });
    child.stdin.end(bytes);
  });
}

async function loadOrRegister(options: PrintAgentOptions): Promise<Config> {
  const configPath = options.configPath ?? defaultConfigPath;
  try {
    const stored = JSON.parse(await readFile(configPath, "utf8")) as Config;
    const migrated = stored.apiUrl.replace(/\/$/, "") === legacyApiUrl
      ? { ...stored, apiUrl: currentApiUrl }
      : stored;
    const config = { ...migrated, apiUrl: options.validateApiUrl ? options.validateApiUrl(migrated.apiUrl) : migrated.apiUrl };
    if (migrated.apiUrl !== stored.apiUrl) await saveConfig(configPath, config);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      // First launch continues into registration below.
    } else {
      throw error;
    }
  }
  const apiUrl = options.apiUrl ?? arg("--api-url");
  const pairingCode = options.pairingCode ?? arg("--pairing-code");
  const name = options.name ?? arg("--name");
  if (!apiUrl || !pairingCode || !name) throw new Error("First launch requires --api-url, --pairing-code, and --name.");
  const normalizedApiUrl = options.validateApiUrl ? options.validateApiUrl(apiUrl) : apiUrl.replace(/\/$/, "");
  const devices = await listPrintDevices();
  let response: Response;
  try {
    response = await fetch(`${normalizedApiUrl}/print-agent/register`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ pairingCode, name, devices }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new Error(networkErrorMessage(error), { cause: error });
  }
  if (!response.ok) throw await responseError(response, "FYRO rechazó el registro");
  const registered = await response.json() as { agentId: number; token: string };
  const config = { apiUrl: normalizedApiUrl, token: registered.token, agentId: registered.agentId, name };
  await saveConfig(configPath, config);
  return config;
}
async function api(config: Config, endpoint: string, body?: unknown, timeoutMs = 20_000): Promise<Response> {
  return fetch(`${config.apiUrl}/print-agent/${endpoint}`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

type JobAcknowledgement = { staleLease?: boolean };

async function acknowledgeJob(config: Config, endpoint: string, body: unknown): Promise<JobAcknowledgement> {
  let lastError = new Error("El servidor no confirmó el estado del trabajo.");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await api(config, endpoint, body, 10_000);
      if (response.ok) return await response.json() as JobAcknowledgement;
      lastError = new Error(`Job acknowledgement failed (${response.status}).`);
      if ([401, 403, 404].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw lastError;
}

/**
 * Start the long-running print poller. The returned stop function is useful
 * for orderly shutdowns and for the desktop app's single-instance lifecycle.
 */
export async function startPrintAgent(options: PrintAgentOptions = {}): Promise<() => Promise<void>> {
  const config = await loadOrRegister(options);
  let stopping = false;
  let activeTick: Promise<void> | null = null;
  const tick = async () => {
    if (stopping) return;
    try {
      await api(config, "heartbeat", { devices: await listPrintDevices() });
      if (stopping) return;
      const claim = await api(config, "jobs/claim"); if (!claim.ok) throw new Error(`Claim failed (${claim.status}).`);
      const job = (await claim.json() as { job: null | { id: number; deviceId: string | null; deviceName: string; payloadBase64: string; leaseToken: string } }).job;
      if (!job) return;
      if (stopping) {
        await acknowledgeJob(config, `jobs/${job.id}/requeue`, { leaseToken: job.leaseToken });
        return;
      }
      try {
        const printing = await acknowledgeJob(config, `jobs/${job.id}/printing`, { leaseToken: job.leaseToken });
        if (printing.staleLease) return;
        await print(job.deviceId || job.deviceName, job.payloadBase64);
        await acknowledgeJob(config, `jobs/${job.id}/complete`, { leaseToken: job.leaseToken });
      } catch (error) {
        await acknowledgeJob(config, `jobs/${job.id}/fail`, {
          leaseToken: job.leaseToken,
          error: error instanceof Error ? error.message : "Print failed",
        });
        console.error(`Print job ${job.id} failed.`);
      }
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("Agent request failed.");
      if (options.onError) options.onError(normalized);
      else console.error(normalized.message);
    }
  };
  const runTick = async () => {
    if (activeTick || stopping) return activeTick;
    activeTick = tick().finally(() => { activeTick = null; });
    return activeTick;
  };
  await runTick();
  const interval = setInterval(() => void runTick(), 3_000);
  return async () => {
    stopping = true;
    clearInterval(interval);
    await activeTick;
  };
}

async function main(): Promise<void> {
  await startPrintAgent({
    apiUrl: arg("--api-url"),
    pairingCode: arg("--pairing-code"),
    name: arg("--name"),
  });
}

if (process.argv[1]?.endsWith("print-agent.ts") || process.argv[1]?.endsWith("print-agent.js")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Unable to start print agent.");
    process.exitCode = 1;
  });
}