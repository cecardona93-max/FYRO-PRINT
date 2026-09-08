# FYRO Print Agent

Repositorio de distribución del agente local de impresión de FYRO.

Los instaladores se generan exclusivamente mediante `.github/workflows/release.yml` en runners nativos. El workflow exige firma de código para Windows y firma más notarización para macOS; nunca publica artefactos sin firma.

## Secretos requeridos en GitHub Actions

- `WINDOWS_CSC_LINK` y `WINDOWS_CSC_KEY_PASSWORD`
- `MACOS_CSC_LINK` y `MACOS_CSC_KEY_PASSWORD`
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` y `APPLE_TEAM_ID`

Una ejecución manual recibe la versión semántica. Cada release publica `FYRO-Print-Agent-Setup.exe`, `FYRO-Print-Agent.dmg`, el ZIP de macOS y los manifiestos `latest.yml` / `latest-mac.yml`. Esos mismos manifiestos alimentan la actualización automática del agente.
