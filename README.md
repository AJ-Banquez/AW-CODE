# Toolbox IA v4

Esta versión conserva la interfaz original y añade análisis automático con Gemini.

## Flujo
1. Abre la aplicación.
2. Configurar IA -> pega tu Gemini API Key.
3. Agregar herramienta.
4. Pega SOLO el código.
5. Pulsa Analizar con IA.
6. La IA completa nombre, lenguaje, categorías, propósito, problema, requisitos, resultado y advertencias.
7. Revisa/modifica los campos.
8. Pulsa Guardar herramienta.

## Importante
Esta versión usa la API directamente desde el navegador únicamente como prototipo local. Google indica que las API keys no deben exponerse en aplicaciones web de producción; para una versión remota para el equipo hay que poner un backend/proxy seguro delante de Gemini.

La clave se guarda en sessionStorage y no queda escrita en app.js.

Modelo: gemini-3.8-flash.

## Si abres index.html directamente
Si el navegador bloquea la llamada por políticas de origen, ejecuta la carpeta con un servidor local sencillo. En VS Code puedes usar Live Server, o con Python:

python -m http.server 5500

Luego abre http://localhost:5500

## Datos
Las herramientas se guardan en `localStorage` durante el uso normal. En una instalación nueva, la aplicación carga el catálogo estático desde `tools/item/info.json`, que puede contener una herramienta o un arreglo completo de herramientas.

Para migrar la biblioteca a GitHub Pages, exporta la biblioteca desde la aplicación y reemplaza el contenido de `tools/item/info.json` con el arreglo JSON exportado. Así se conservan los códigos, identificadores y relaciones entre herramientas.
