import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fyroPair", (pairing: { apiUrl: string; pairingCode: string; name: string }) =>
  ipcRenderer.invoke("pair-agent", pairing),
);
contextBridge.exposeInMainWorld(
  "fyroOnPairingData",
  (callback: (pairing: { apiUrl: string; pairingCode: string; name?: string }) => void) =>
    ipcRenderer.on("pairing-data", (_event, pairing) => callback(pairing)),
);