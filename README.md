# FYRO Print Agent

Repositorio de distribución del agente local de impresión de FYRO para Windows.

Los instaladores se generan mediante `.github/workflows/release.yml` en un runner nativo de Windows. La distribución actual es intencionalmente sin firma comercial, por lo que Windows puede mostrar “Editor desconocido” o una advertencia de SmartScreen. Para continuar, el usuario debe elegir “Más información” y “Ejecutar de todas formas”.

Una ejecución manual recibe la versión semántica. Cada release publica `FYRO-Print-Agent-Setup.exe` y `latest.yml`. El mismo manifiesto alimenta la actualización automática del agente.
