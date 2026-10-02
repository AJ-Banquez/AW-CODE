-- Carga inicial de herramientas desde el catálogo JSON
insert into public.herramientas (id, nombre, lenguaje, categorias, codigo, proposito, problema, requisitos, salida, advertencias, analisis, depende_de, creado_en) values
('1f97ecd9-6eb5-4205-8e1c-833296720bd2', 'Limpiador de archivos desktop.ini', 'PowerShell', '["Mantenimiento","Limpieza de archivos"]'::jsonb, '# Elimina desktop.ini (incluyendo ocultos) en la ruta actual y subcarpetas al iniciar
Get-ChildItem -Path . -Filter "desktop.ini" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue', 'Eliminar automáticamente todos los archivos de configuración de Windows llamados ''desktop.ini'' en la carpeta actual y todas sus subcarpetas.', 'Elimina la acumulación de archivos de configuración innecesarios que Windows genera automáticamente en directorios, manteniendo la estructura de carpetas limpia.', 'Windows, PowerShell, permisos de escritura en la ruta donde se ejecute el script.', 'Ejemplo: Si existe un archivo ''C:\Documentos\desktop.ini'', tras ejecutar el script, el archivo será eliminado permanentemente de esa ubicación.', 'Esta operación es irreversible. Los archivos eliminados no se envían a la papelera de reciclaje. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.', '{"summary":"Eliminar automáticamente todos los archivos de configuración de Windows llamados \u0027desktop.ini\u0027 en la carpeta actual y todas sus subcarpetas.","detectedActions":["Busca recursivamente archivos con nombre \u0027desktop.ini\u0027 incluyendo los ocultos y los elimina forzosamente."],"risk":"medio","riskReason":"Esta operación es irreversible. Los archivos eliminados no se envían a la papelera de reciclaje. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.","howToUse":"1. Abrir la carpeta donde se desea realizar la limpieza.\n2. Abrir una ventana de PowerShell en dicha ubicación.\n3. Ejecutar el script.\n4. Verificar que los archivos desktop.ini han desaparecido de las carpetas y subcarpetas.","exampleResult":"Ejemplo: Si existe un archivo \u0027C:\\Documentos\\desktop.ini\u0027, tras ejecutar el script, el archivo será eliminado permanentemente de esa ubicación.","inputs":"Ruta actual (directorio de trabajo).","filesAffected":"Todos los archivos llamados \u0027desktop.ini\u0027 en la ruta actual y sus subcarpetas.","ai":true}'::jsonb, '[]'::jsonb, '2026-10-02T15:23:11.805Z'),
('8a4adb35-a17f-4c11-be72-2b6b0b62710d', 'Buscador general de texto en soportes', 'Python', '["Búsqueda","Auditoría","Reportes","Ofimática"]'::jsonb, 'import os
import re
import sys
import unicodedata
from importlib import import_module
from pathlib import Path
from datetime import datetime


# ============================================
# BUSCADOR GENERAL DE TEXTO EN SOPORTES
# ============================================

def limpiar_texto(texto):
    """
    Normaliza el texto para permitir pequeñas diferencias:
    mayúsculas/minúsculas, tildes y espacios.
    """

    texto = texto.lower()

    texto = unicodedata.normalize(
        "NFKD",
        texto
    )

    texto = "".join(
        caracter
        for caracter in texto
        if not unicodedata.combining(caracter)
    )

    texto = re.sub(
        r"\s+",
        " ",
        texto
    )

    return texto.strip()


# ============================================
# BUSCAR EN ARCHIVO
# ============================================

def buscar_en_archivo(archivo, termino):

    extension = archivo.suffix.lower()

    # ----------------------------------------
    # ARCHIVOS DE TEXTO
    # ----------------------------------------

    if extension in [
        ".txt",
        ".csv",
        ".log"
    ]:

        try:

            texto = archivo.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            if termino in limpiar_texto(texto):

                return [None]

            return []

        except (
            OSError,
            UnicodeError
        ):

            return []


    # ----------------------------------------
    # PDF
    # ----------------------------------------

    if extension == ".pdf":

        try:

            lector_pdf = import_module(
                "PyPDF2"
            ).PdfReader

            with open(
                archivo,
                "rb"
            ) as f:

                lector = lector_pdf(f)

                paginas_encontradas = []

                for numero_pagina, pagina in enumerate(
                    lector.pages,
                    start=1
                ):

                    texto = pagina.extract_text() or ""

                    if termino in limpiar_texto(texto):

                        paginas_encontradas.append(
                            numero_pagina
                        )

                return paginas_encontradas

        except (
            ImportError,
            OSError,
            ValueError
        ):

            return []


    return []


# ============================================
# INICIO
# ============================================

print()

print("=" * 70)
print("              BUSCADOR GENERAL DE SOPORTES")
print("=" * 70)

print()


ruta = input(
    "Digite la ruta de la carpeta donde desea buscar:\n> "
).strip().strip(''"'')


if not os.path.isdir(ruta):

    print()

    print(
        "ERROR: La carpeta no existe."
    )

    input(
        "\nPresione ENTER para salir..."
    )

    sys.exit(1)


# ============================================
# TEXTO A BUSCAR
# ============================================

termino_original = input(
    "\nDigite el texto que desea buscar:\n> "
).strip()


if not termino_original:

    print()

    print(
        "ERROR: No escribió ningún texto."
    )

    input(
        "\nPresione ENTER para salir..."
    )

    sys.exit(1)


termino = limpiar_texto(
    termino_original
)


# ============================================
# BUSCANDO
# ============================================

print()

print("=" * 70)
print("BUSCANDO...")
print("=" * 70)

print()


archivos = []


for archivo in Path(ruta).rglob("*"):

    if archivo.is_file():

        if archivo.suffix.lower() in [
            ".pdf",
            ".txt",
            ".csv",
            ".log"
        ]:

            archivos.append(
                archivo
            )


print(
    f"Archivos compatibles encontrados: {len(archivos)}"
)

print()


# ============================================
# RESULTADOS
# ============================================

encontrados = []


for archivo in archivos:

    paginas = buscar_en_archivo(
        archivo,
        termino
    )

    if paginas:

        encontrados.append(
            {
                "archivo": archivo,
                "paginas": paginas
            }
        )


# ============================================
# RESULTADOS EN PANTALLA
# ============================================

print()

print("=" * 70)
print("RESULTADOS")
print("=" * 70)

print()


if not encontrados:

    print(
        f''No se encontró "{termino_original}" ''
        "en ningún soporte."
    )

else:

    print(
        f''Se encontró "{termino_original}" ''
        f''en {len(encontrados)} soporte(s):''
    )

    print()

    for numero, resultado in enumerate(
        encontrados,
        start=1
    ):

        archivo = resultado["archivo"]
        paginas = resultado["paginas"]

        print(
            f"{numero}. {archivo.name}"
        )

        print(
            f"   Carpeta: {archivo.parent.name}"
        )

        if paginas == [None]:

            print(
                "   Coincidencia encontrada"
            )

        else:

            print(
                "   Página(s): "
                + ", ".join(
                    map(
                        str,
                        paginas
                    )
                )
            )

        print()


# ============================================
# GENERAR EXCEL
# ============================================

print()

print("=" * 70)
print("GENERANDO EXCEL...")
print("=" * 70)

print()


try:

    openpyxl = import_module(
        "openpyxl"
    )

    Workbook = openpyxl.Workbook
    Font = openpyxl.styles.Font
    PatternFill = openpyxl.styles.PatternFill
    Alignment = openpyxl.styles.Alignment

except ImportError:

    print()

    print(
        "ERROR: No está instalada la librería openpyxl."
    )

    print()

    print(
        "Instálala ejecutando:"
    )

    print()

    print(
        "py -m pip install openpyxl"
    )

    print()

    input(
        "Presione ENTER para salir..."
    )

    sys.exit(1)


# ============================================
# CREAR EXCEL
# ============================================

wb = Workbook()

ws = wb.active

ws.title = "Resultados"


# ============================================
# ENCABEZADOS
# ============================================

encabezados = [
    "Texto buscado",
    "Archivo",
    "Carpeta",
    "Ruta completa",
    "Extensión",
    "Fecha modificación",
    "Página(s)"
]


for columna, encabezado in enumerate(
    encabezados,
    start=1
):

    celda = ws.cell(
        row=1,
        column=columna,
        value=encabezado
    )

    celda.font = Font(
        bold=True
    )

    celda.alignment = Alignment(
        horizontal="center"
    )


# ============================================
# DATOS
# ============================================

for fila, resultado in enumerate(
    encontrados,
    start=2
):

    archivo = resultado["archivo"]

    paginas = resultado["paginas"]

    if paginas == [None]:

        paginas_excel = "N/A"

    else:

        paginas_excel = ", ".join(
            map(
                str,
                paginas
            )
        )


    ws.cell(
        fila,
        1,
        termino_original
    )

    ws.cell(
        fila,
        2,
        archivo.name
    )

    ws.cell(
        fila,
        3,
        archivo.parent.name
    )

    ws.cell(
        fila,
        4,
        str(archivo)
    )

    ws.cell(
        fila,
        5,
        archivo.suffix
    )

    ws.cell(
        fila,
        6,
        datetime.fromtimestamp(
            archivo.stat().st_mtime
        ).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    )

    ws.cell(
        fila,
        7,
        paginas_excel
    )


# ============================================
# AJUSTAR COLUMNAS
# ============================================

anchos = {
    "A": 25,
    "B": 45,
    "C": 30,
    "D": 80,
    "E": 12,
    "F": 22,
    "G": 15
}


for columna, ancho in anchos.items():

    ws.column_dimensions[
        columna
    ].width = ancho


# ============================================
# CONGELAR ENCABEZADO
# ============================================

ws.freeze_panes = "A2"


# ============================================
# FILTRO
# ============================================

ws.auto_filter.ref = ws.dimensions


# ============================================
# GUARDAR EN LA MISMA RUTA DE BÚSQUEDA
# ============================================

ruta_excel = Path(ruta) / "RESULTADOS_BUSQUEDA.xlsx"


wb.save(
    ruta_excel
)


# ============================================
# FINAL
# ============================================

print()

print("=" * 70)

if encontrados:

    print(
        "EXCEL GENERADO CORRECTAMENTE"
    )

    print()

    print(
        f"Archivo: {ruta_excel.name}"
    )

    print(
        f"Resultados: {len(encontrados)}"
    )

else:

    print(
        "No hubo coincidencias."
    )

    print(
        "Se generó igualmente el Excel vacío."
    )


print("=" * 70)

print()

input(
    "Presione ENTER para salir..."
)', 'Busca una palabra, frase o número dentro de archivos de texto plano (.txt, .csv, .log) y documentos PDF (.pdf) en una carpeta y sus subcarpetas, exportando los hallazgos a un archivo Excel con el detalle de ubicaciones y números de página.', 'Elimina la tarea manual y repetitiva de abrir archivo por archivo para localizar información de pacientes, números de documento, palabras clave o registros específicos.', 'Python 3.x, librería openpyxl, librería PyPDF2 (para lectura de PDFs), permisos de lectura sobre la carpeta a escanear y permisos de escritura en la carpeta raíz para guardar el reporte Excel.', 'Ejemplo: Búsqueda del término ''10203040'' en la carpeta seleccionada. Resultado: se genera el archivo ''RESULTADOS_BUSQUEDA.xlsx'' listando el archivo ''soporte_paciente.pdf'' con valor ''1, 4'' en la columna ''Página(s)''.', 'Si ya existe un archivo llamado ''RESULTADOS_BUSQUEDA.xlsx'' en la carpeta objetivo, será sobrescrito directamente sin confirmación previa. Si no está instalada la librería PyPDF2, la búsqueda en archivos PDF se omitirá silenciosamente.', '{"summary":"Busca una palabra, frase o número dentro de archivos de texto plano (.txt, .csv, .log) y documentos PDF (.pdf) en una carpeta y sus subcarpetas, exportando los hallazgos a un archivo Excel con el detalle de ubicaciones y números de página.","detectedActions":["Limpia y normaliza el texto eliminando tildes, mayúsculas y espacios duplicados; recorre de forma recursiva la carpeta buscando archivos .pdf, .txt, .csv y .log; extrae y evalúa el texto de cada archivo y de cada página en los PDF; consolida los aciertos; formatea y genera un archivo Excel con encabezados, anchos de columna y filtros automáticos; guarda el Excel en el disco."],"risk":"medio","riskReason":"Si ya existe un archivo llamado \u0027RESULTADOS_BUSQUEDA.xlsx\u0027 en la carpeta objetivo, será sobrescrito directamente sin confirmación previa. Si no está instalada la librería PyPDF2, la búsqueda en archivos PDF se omitirá silenciosamente.","howToUse":"1. Ejecutar el script en Python.\n2. Escribir o pegar la ruta de la carpeta donde se desea realizar la búsqueda.\n3. Digitar el texto o número que se desea buscar.\n4. Esperar a que el programa analice todos los archivos compatibles.\n5. Revisar los resultados mostrados en la consola.\n6. Abrir el archivo \u0027RESULTADOS_BUSQUEDA.xlsx\u0027 generado en la carpeta analizada.","exampleResult":"Ejemplo: Búsqueda del término \u002710203040\u0027 en la carpeta seleccionada. Resultado: se genera el archivo \u0027RESULTADOS_BUSQUEDA.xlsx\u0027 listando el archivo \u0027soporte_paciente.pdf\u0027 con valor \u00271, 4\u0027 en la columna \u0027Página(s)\u0027.","inputs":"Ruta absoluta o relativa de la carpeta a consultar (ingresada por teclado) y término o texto a buscar (ingresado por teclado).","filesAffected":"Lee archivos con extensión .pdf, .txt, .csv y .log en el directorio consultado y sus subdirectorios; crea o sobrescribe el archivo \u0027RESULTADOS_BUSQUEDA.xlsx\u0027 en la raíz de la carpeta seleccionada.","ai":true}'::jsonb, '[]'::jsonb, '2026-10-01T21:54:21.512Z'),
('01f52bcc-8a9e-4dd8-9faa-0a4364d2413f', 'Buscador de Carpetas Vacías', 'PowerShell', '["Mantenimiento","Archivos","Limpieza"]'::jsonb, '$RutaBase = Get-Location

$resultados = Get-ChildItem `
    -Path $RutaBase `
    -Directory `
    -Recurse `
    -ErrorAction SilentlyContinue |
    Where-Object {

        $contenido = Get-ChildItem `
            -Path $_.FullName `
            -Force `
            -ErrorAction SilentlyContinue

        $contenido.Count -eq 0
    }

Clear-Host

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "       BUSQUEDA DE CARPETAS VACIAS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (!$resultados) {

    Write-Host "  ✓ No se encontraron carpetas vacias." -ForegroundColor Green
    Write-Host ""

} else {

    Write-Host "  Se encontraron $($resultados.Count) carpeta(s) vacia(s):" -ForegroundColor Yellow
    Write-Host ""

    $contador = 1

    foreach ($carpeta in ($resultados | Sort-Object Name)) {

        Write-Host ("  {0,3}. {1}" -f $contador, $carpeta.Name) -ForegroundColor White

        $contador++
    }

    Write-Host ""
    Write-Host "--------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Total: $($resultados.Count) carpeta(s) vacia(s)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Presione ENTER para salir"', 'Busca y lista todas las carpetas vacías encontradas a partir de la ubicación actual de ejecución de forma recursiva.', 'Evita la búsqueda manual y visual de directorios vacíos dentro de una estructura de archivos.', 'PowerShell, permisos de lectura en la ruta base y subcarpetas.', 'Ejemplo: Se escanea la ruta actual y se muestran en pantalla las carpetas vacías encontradas, por ejemplo: 1. CarpetaVacia1, 2. CarpetaVacia2, con un total de 2 carpeta(s) vacía(s).', 'No elimina ningún archivo ni carpeta; solo realiza operaciones de lectura y análisis.', '{"summary":"Busca y lista todas las carpetas vacías encontradas a partir de la ubicación actual de ejecución de forma recursiva.","detectedActions":["Obtiene la ubicación actual, busca de forma recursiva todos los directorios, comprueba si su contenido es igual a cero y muestra los resultados ordenados por nombre en la consola."],"risk":"bajo","riskReason":"No elimina ningún archivo ni carpeta; solo realiza operaciones de lectura y análisis.","howToUse":"1. Abrir la terminal de PowerShell en la carpeta que desea analizar.\n2. Ejecutar el script.\n3. Revisar el listado de carpetas vacías en la pantalla.\n4. Presionar ENTER para salir.","exampleResult":"Ejemplo: Se escanea la ruta actual y se muestran en pantalla las carpetas vacías encontradas, por ejemplo: 1. CarpetaVacia1, 2. CarpetaVacia2, con un total de 2 carpeta(s) vacía(s).","inputs":"La ubicación actual desde donde se ejecuta el script (Get-Location).","filesAffected":"Directorios y subdirectorios ubicados dentro de la ruta base (solo lectura).","ai":true}'::jsonb, '[]'::jsonb, '2026-10-01T21:34:13.441Z'),
('5bb96fbc-6765-43f8-be90-8377064e2137', 'Fórmula BUSCARX en Excel', 'Excel', '["Excel","Hojas de cálculo","Búsqueda y referencia"]'::jsonb, '=BUSCARX(valor_buscado;matriz_buscada;matriz_resultado)', 'Busca un valor en un rango o matriz especificada y devuelve el elemento correspondiente de un segundo rango o matriz.', 'Evita la búsqueda e inspección manual de datos entre filas o columnas dentro de una hoja de cálculo para cruzar información.', 'Microsoft Excel (versiones compatibles con BUSCARX como Microsoft 365 o Excel 2021) o Google Sheets, y una hoja de cálculo con los datos organizados.', 'Supongamos que tienes esta tabla:

A - Cédula	B - Nombre	C - Salario
12345678	Juan Pérez	$2.500.000
98765432	María López	$3.000.000
45678912	Carlos Díaz	$2.800.000

Y en E2 escribes la cédula:

E2: 98765432

Quieres que Excel busque esa cédula en la columna A y te devuelva el nombre.

La fórmula sería:

=BUSCARX(E2;A:A;B:B;"No encontrado")
¿Qué hace?
E2 → lo que estás buscando: 98765432
A:A → dónde lo busca: columna de cédulas
B:B → qué quieres obtener: columna de nombres
"No encontrado" → qué mostrar si no existe.

Resultado:

María López

Ahora, si quieres traer el salario, cambias B:B por C:C:

=BUSCARX(E2;A:A;C:C;"No encontrado")

Resultado:

$3.000.000

En resumen:

E2 = Cédula que tengo
 ↓
BUSCARX busca en A:A
 ↓
encuentra 98765432
 ↓
trae el dato correspondiente de B:B o C:C

Si quieres, también te puedo mostrar un ejemplo de BUSCARX entre dos archivos Excel, que es donde suele ser más útil.', 'Si no se encuentra coincidencia para el valor buscado y no se configuran los parámetros opcionales de manejo de errores, la fórmula devolverá el error #N/D.', '{"summary":"Busca un valor en un rango o matriz especificada y devuelve el elemento correspondiente de un segundo rango o matriz.","detectedActions":["Evalúa el valor buscado dentro del primer rango especificado y recupera la información que coincide en la misma posición del segundo rango."],"risk":"bajo","riskReason":"Si no se encuentra coincidencia para el valor buscado y no se configuran los parámetros opcionales de manejo de errores, la fórmula devolverá el error #N/D.","howToUse":"1. Abrir la hoja de cálculo en Excel.\n2. Seleccionar la celda donde se desea obtener el resultado.\n3. Escribir la fórmula reemplazando valor_buscado, matriz_buscada y matriz_resultado por las celdas correspondientes.\n4. Presionar Enter y revisar el resultado obtenido.","exampleResult":"Supongamos que tienes esta tabla:\n\nA - Cédula\tB - Nombre\tC - Salario\n12345678\tJuan Pérez\t$2.500.000\n98765432\tMaría López\t$3.000.000\n45678912\tCarlos Díaz\t$2.800.000\n\nY en E2 escribes la cédula:\n\nE2: 98765432\n\nQuieres que Excel busque esa cédula en la columna A y te devuelva el nombre.\n\nLa fórmula sería:\n\n=BUSCARX(E2;A:A;B:B;\"No encontrado\")\n¿Qué hace?\nE2 → lo que estás buscando: 98765432\nA:A → dónde lo busca: columna de cédulas\nB:B → qué quieres obtener: columna de nombres\n\"No encontrado\" → qué mostrar si no existe.\n\nResultado:\n\nMaría López\n\nAhora, si quieres traer el salario, cambias B:B por C:C:\n\n=BUSCARX(E2;A:A;C:C;\"No encontrado\")\n\nResultado:\n\n$3.000.000\n\nEn resumen:\n\nE2 = Cédula que tengo\n ↓\nBUSCARX busca en A:A\n ↓\nencuentra 98765432\n ↓\ntrae el dato correspondiente de B:B o C:C\n\nSi quieres, también te puedo mostrar un ejemplo de BUSCARX entre dos archivos Excel, que es donde suele ser más útil.","inputs":"valor_buscado (dato a buscar), matriz_buscada (rango donde buscar el dato), matriz_resultado (rango desde donde extraer el resultado).","filesAffected":"Hoja de cálculo activa (modifica únicamente el valor de la celda donde se ingresa la fórmula).","ai":true}'::jsonb, '[]'::jsonb, '2026-10-01T21:21:48.905Z'),
('8e2749ee-8efc-42ac-aa07-7526f236ce51', 'LISTADO DE ARCHIVOS Y CARPETAS MASIVOS POR PACIENTES', 'PowerShell', '["Inventario","Automatización","Excel"]'::jsonb, '# ============================================================
# GENERAR XLSX REAL DESDE LA RUTA ACTUAL
# NO INSTALA MODULOS
# USA MICROSOFT EXCEL INSTALADO EN EL PC
# ============================================================

$RutaBase = (Get-Location).Path
$NombreExcel = "LISTADO_CARPETAS_ARCHIVOS.xlsx"
$RutaExcel = Join-Path $RutaBase $NombreExcel

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   INVENTARIO DE CARPETAS Y ARCHIVOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ruta analizada:" -ForegroundColor Yellow
Write-Host $RutaBase -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# Verificar que Excel esté instalado
# ------------------------------------------------------------

try {
    $Excel = New-Object -ComObject Excel.Application
}
catch {
    Write-Host ""
    Write-Host "ERROR: Microsoft Excel no está instalado." -ForegroundColor Red
    Write-Host ""
    Read-Host "Presiona ENTER para salir"
    exit
}

$Excel.Visible = $false
$Excel.DisplayAlerts = $false

# ------------------------------------------------------------
# Eliminar Excel anterior si existe
# ------------------------------------------------------------

if (Test-Path $RutaExcel) {
    Remove-Item $RutaExcel -Force
}

# ------------------------------------------------------------
# Crear libro
# ------------------------------------------------------------

$Libro = $Excel.Workbooks.Add()
$Hoja = $Libro.Worksheets.Item(1)
$Hoja.Name = "ARCHIVOS"

# ------------------------------------------------------------
# Encabezados
# ------------------------------------------------------------

$Hoja.Cells.Item(1,1) = "CARPETA"
$Hoja.Cells.Item(1,2) = "RUTA_CARPETA"
$Hoja.Cells.Item(1,3) = "ARCHIVO"
$Hoja.Cells.Item(1,4) = "EXTENSION"
$Hoja.Cells.Item(1,5) = "RUTA_ARCHIVO"

# ------------------------------------------------------------
# Formato encabezados
# ------------------------------------------------------------

$Encabezado = $Hoja.Range("A1:E1")

$Encabezado.Font.Bold = $true
$Encabezado.AutoFilter()

# ------------------------------------------------------------
# Buscar archivos
# ------------------------------------------------------------

Write-Host "Buscando archivos..." -ForegroundColor Cyan

$Archivos = Get-ChildItem `
    -Path $RutaBase `
    -File `
    -Recurse `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -ne $RutaExcel
    } |
    Sort-Object DirectoryName, Name

Write-Host "Archivos encontrados: $($Archivos.Count)" -ForegroundColor Yellow
Write-Host ""

# ------------------------------------------------------------
# Escribir información
# ------------------------------------------------------------

$Fila = 2

foreach ($Archivo in $Archivos) {

    $Hoja.Cells.Item($Fila,1) = $Archivo.Directory.Name
    $Hoja.Cells.Item($Fila,2) = $Archivo.Directory.FullName
    $Hoja.Cells.Item($Fila,3) = $Archivo.Name
    $Hoja.Cells.Item($Fila,4) = $Archivo.Extension
    $Hoja.Cells.Item($Fila,5) = $Archivo.FullName

    $Fila++
}

# ------------------------------------------------------------
# Convertir datos en tabla
# ------------------------------------------------------------

if ($Archivos.Count -gt 0) {

    $UltimaFila = $Fila - 1

    $Rango = $Hoja.Range("A1:E$UltimaFila")

    $Tabla = $Hoja.ListObjects.Add(
        1,
        $Rango,
        $null,
        1
    )

    $Tabla.Name = "ListadoArchivos"
}

# ------------------------------------------------------------
# Ajustar columnas
# ------------------------------------------------------------

$Hoja.Columns.Item("A").ColumnWidth = 25
$Hoja.Columns.Item("B").ColumnWidth = 50
$Hoja.Columns.Item("C").ColumnWidth = 45
$Hoja.Columns.Item("D").ColumnWidth = 15
$Hoja.Columns.Item("E").ColumnWidth = 70

# ------------------------------------------------------------
# Congelar primera fila
# ------------------------------------------------------------

$Hoja.Activate()
$Hoja.Range("A2").Select()

$Excel.ActiveWindow.FreezePanes = $true

# ------------------------------------------------------------
# Guardar como XLSX
# ------------------------------------------------------------

Write-Host "Generando archivo XLSX..." -ForegroundColor Cyan

# 51 = xlOpenXMLWorkbook (.xlsx)
$Libro.SaveAs($RutaExcel, 51)

# ------------------------------------------------------------
# Cerrar Excel
# ------------------------------------------------------------

$Libro.Close($true)
$Excel.Quit()

# Liberar objetos COM
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($Hoja) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($Libro) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($Excel) | Out-Null

[GC]::Collect()
[GC]::WaitForPendingFinalizers()

# ------------------------------------------------------------
# Resultado
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "          PROCESO TERMINADO" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivos encontrados: $($Archivos.Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Excel generado:" -ForegroundColor Yellow
Write-Host $RutaExcel -ForegroundColor Green
Write-Host ""

# Abrir automáticamente
Start-Process $RutaExcel', 'Escanea la carpeta actual y todas sus subcarpetas para crear un archivo de Excel con el listado detallado de todos los archivos encontrados.', 'Evita tener que listar, copiar y organizar manualmente los nombres, rutas y extensiones de cientos de archivos en una planilla.', 'Windows, PowerShell, Microsoft Excel instalado en el equipo.', 'Crea el archivo LISTADO_CARPETAS_ARCHIVOS.xlsx con columnas que contienen el nombre de la carpeta, ruta de la carpeta, nombre del archivo, extensión y ruta completa del archivo.', 'Si ya existe un archivo llamado LISTADO_CARPETAS_ARCHIVOS.xlsx en la ruta actual, será eliminado y sobrescrito automáticamente. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.', '{"summary":"Escanea la carpeta actual y todas sus subcarpetas para crear un archivo de Excel con el listado detallado de todos los archivos encontrados.","detectedActions":["Verifica si Microsoft Excel está instalado, elimina un inventario anterior si existe, crea un nuevo libro de Excel, recorre la carpeta actual buscando archivos, escribe la información en las celdas, da formato de tabla con filtros, ajusta el ancho de las columnas, congela la primera fila, guarda el archivo en formato XLSX y cierra la aplicación de Excel liberando los objetos COM."],"risk":"medio","riskReason":"Si ya existe un archivo llamado LISTADO_CARPETAS_ARCHIVOS.xlsx en la ruta actual, será eliminado y sobrescrito automáticamente. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.","howToUse":"1. Abrir la carpeta que se desea analizar.\n2. Ejecutar el script de PowerShell.\n3. Esperar a que se procese el inventario.\n4. Revisar el archivo de Excel generado que se abrirá automáticamente.","exampleResult":"Crea el archivo LISTADO_CARPETAS_ARCHIVOS.xlsx con columnas que contienen el nombre de la carpeta, ruta de la carpeta, nombre del archivo, extensión y ruta completa del archivo.","inputs":"La ruta actual donde se ejecuta el script y los archivos contenidos en ella de forma recursiva.","filesAffected":"Lee todos los archivos de la carpeta actual y subcarpetas. Elimina y crea el archivo LISTADO_CARPETAS_ARCHIVOS.xlsx.","ai":true}'::jsonb, '[]'::jsonb, '2026-09-30T15:16:13.430Z'),
('b996503e-b0d5-4e7c-bb2c-80349e5fae83', 'Etiquetado Masivo de Soportes con Fecha de Atención', 'PowerShell', '["Automatización","Gestión de Archivos","Procesamiento de Excel"]'::jsonb, '# ============================================================
# ETIQUETAR SOPORTES MASIVAMENTE CON FECHA DE ATENCION
# ============================================================
#
# EXCEL:
#   CARPETA
#   PACIENTE
#   SOPORTE
#   FECHA ATENCION
#
# EJEMPLO:
#   SOPORTES | CC1124008753 | 1124008753HCMEDICINAGENERAL.pdf | 2026-01-13
#
# RESULTADO:
#   1124008753_HCMEDICINAGENERAL_20260113.pdf
#
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   ETIQUETADO MASIVO DE SOPORTES CON FECHA DE ATENCION" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# PEDIR RUTA DE SOPORTES
# ============================================================

$rutaBase = Read-Host "Escribe la ruta de la carpeta donde estan TODOS los pacientes"

if (-not (Test-Path -LiteralPath $rutaBase -PathType Container)) {

    Write-Host ""
    Write-Host "ERROR: La carpeta no existe." -ForegroundColor Red
    Write-Host $rutaBase -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit
}

# ============================================================
# PEDIR RUTA DEL EXCEL
# ============================================================

$rutaExcel = Read-Host "Escribe la ruta completa de ajustar.xlsx"

if (-not (Test-Path -LiteralPath $rutaExcel -PathType Leaf)) {

    Write-Host ""
    Write-Host "ERROR: No se encontro el archivo Excel." -ForegroundColor Red
    Write-Host $rutaExcel -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit
}

# ============================================================
# VERIFICAR EXCEL
# ============================================================

try {

    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $libro = $excel.Workbooks.Open($rutaExcel)

}
catch {

    Write-Host ""
    Write-Host "ERROR: No fue posible abrir ajustar.xlsx." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""

    if ($excel) {
        $excel.Quit()
    }

    Pause
    exit
}

# ============================================================
# TOMAR LA PRIMERA HOJA
# ============================================================

$hoja = $libro.Worksheets.Item(1)

$usedRange = $hoja.UsedRange

$filas = $usedRange.Rows.Count
$columnas = $usedRange.Columns.Count

Write-Host ""
Write-Host "Excel encontrado correctamente." -ForegroundColor Green
Write-Host "Filas detectadas: $($filas - 1)" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# BUSCAR COLUMNAS POR NOMBRE
# ============================================================

$colCarpeta = 0
$colPaciente = 0
$colSoporte = 0
$colFecha = 0

for ($c = 1; $c -le $columnas; $c++) {

    $nombreColumna = [string]$hoja.Cells.Item(1, $c).Text

    # Limpiar espacios especiales
    $nombreColumna = $nombreColumna.Trim()
    $nombreColumna = $nombreColumna.Replace([char]0x00A0, " ")

    if ($nombreColumna -eq "CARPETA") {
        $colCarpeta = $c
    }

    if ($nombreColumna -eq "PACIENTE") {
        $colPaciente = $c
    }

    if ($nombreColumna -eq "SOPORTE") {
        $colSoporte = $c
    }

    if ($nombreColumna -eq "FECHA ATENCION") {
        $colFecha = $c
    }
}

# ============================================================
# VALIDAR COLUMNAS
# ============================================================

if ($colPaciente -eq 0) {

    Write-Host "ERROR: No se encontro la columna PACIENTE." -ForegroundColor Red

    $libro.Close($false)
    $excel.Quit()

    Pause
    exit
}

if ($colSoporte -eq 0) {

    Write-Host "ERROR: No se encontro la columna SOPORTE." -ForegroundColor Red

    $libro.Close($false)
    $excel.Quit()

    Pause
    exit
}

if ($colFecha -eq 0) {

    Write-Host "ERROR: No se encontro la columna FECHA ATENCION." -ForegroundColor Red

    $libro.Close($false)
    $excel.Quit()

    Pause
    exit
}

Write-Host "Columnas encontradas correctamente:" -ForegroundColor Green
Write-Host "PACIENTE       -> columna $colPaciente"
Write-Host "SOPORTE        -> columna $colSoporte"
Write-Host "FECHA ATENCION -> columna $colFecha"
Write-Host ""

# ============================================================
# RESULTADOS
# ============================================================

$resultados = New-Object System.Collections.Generic.List[object]

$ok = 0
$errores = 0
$omitidos = 0

# ============================================================
# PROCESAR CADA REGISTRO
# ============================================================

for ($fila = 2; $fila -le $filas; $fila++) {

    try {

        $paciente = [string]$hoja.Cells.Item($fila, $colPaciente).Text
        $soporte = [string]$hoja.Cells.Item($fila, $colSoporte).Text
        $fechaTexto = [string]$hoja.Cells.Item($fila, $colFecha).Text

        $paciente = $paciente.Trim()
        $soporte = $soporte.Trim()
        $fechaTexto = $fechaTexto.Trim()

        # ----------------------------------------------------
        # LIMPIAR ESPACIOS ESPECIALES
        # ----------------------------------------------------

        $paciente = $paciente.Replace([char]0x00A0, "")
        $soporte = $soporte.Replace([char]0x00A0, "")
        $fechaTexto = $fechaTexto.Replace([char]0x00A0, " ")

        # ----------------------------------------------------
        # VALIDAR DATOS
        # ----------------------------------------------------

        if ([string]::IsNullOrWhiteSpace($paciente)) {

            $errores++

            $resultados.Add([PSCustomObject]@{
                CARPETA         = ""
                PACIENTE        = ""
                SOPORTE         = $soporte
                "FECHA ATENCION" = $fechaTexto
                "NOMBRE ANTERIOR" = ""
                "NOMBRE NUEVO"    = ""
                ESTADO           = "CON ERROR"
                OBSERVACION      = "Paciente vacio"
            })

            continue
        }

        if ([string]::IsNullOrWhiteSpace($soporte)) {

            $errores++

            $resultados.Add([PSCustomObject]@{
                CARPETA         = ""
                PACIENTE        = $paciente
                SOPORTE         = ""
                "FECHA ATENCION" = $fechaTexto
                "NOMBRE ANTERIOR" = ""
                "NOMBRE NUEVO"    = ""
                ESTADO           = "CON ERROR"
                OBSERVACION      = "Soporte vacio"
            })

            continue
        }

        if ([string]::IsNullOrWhiteSpace($fechaTexto)) {

            $errores++

            $resultados.Add([PSCustomObject]@{
                CARPETA         = ""
                PACIENTE        = $paciente
                SOPORTE         = $soporte
                "FECHA ATENCION" = ""
                "NOMBRE ANTERIOR" = ""
                "NOMBRE NUEVO"    = ""
                ESTADO           = "CON ERROR"
                OBSERVACION      = "Fecha de atencion vacia"
            })

            continue
        }

        # ----------------------------------------------------
        # CONVERTIR FECHA
        # ----------------------------------------------------

        $fecha = $null

        # Primero intentar fecha de Excel
        $valorFechaExcel = $hoja.Cells.Item($fila, $colFecha).Value2

        if ($valorFechaExcel -is [double]) {

            try {
                $fecha = [datetime]::FromOADate($valorFechaExcel)
            }
            catch {
                $fecha = $null
            }
        }

        # Si no funciono, intentar texto
        if ($null -eq $fecha) {

            $formatos = @(
                "yyyy-MM-dd",
                "dd/MM/yyyy",
                "d/M/yyyy",
                "MM/dd/yyyy",
                "M/d/yyyy",
                "yyyy/MM/dd"
            )

            foreach ($formato in $formatos) {

                try {

                    $fecha = [datetime]::ParseExact(
                        $fechaTexto,
                        $formato,
                        [Globalization.CultureInfo]::InvariantCulture
                    )

                    break

                }
                catch {
                }
            }
        }

        # Ultimo intento con cultura española
        if ($null -eq $fecha) {

            try {

                $fecha = [datetime]::Parse(
                    $fechaTexto,
                    [Globalization.CultureInfo]::GetCultureInfo("es-CO")
                )

            }
            catch {
            }
        }

        if ($null -eq $fecha) {

            $errores++

            $resultados.Add([PSCustomObject]@{
                CARPETA          = ""
                PACIENTE         = $paciente
                SOPORTE          = $soporte
                "FECHA ATENCION" = $fechaTexto
                "NOMBRE ANTERIOR" = ""
                "NOMBRE NUEVO"    = ""
                ESTADO            = "CON ERROR"
                OBSERVACION       = "No se pudo interpretar la fecha"
            })

            continue
        }

        # ----------------------------------------------------
        # FECHA FINAL
        # ----------------------------------------------------

        $fechaNueva = $fecha.ToString("yyyyMMdd")

        # ----------------------------------------------------
        # BUSCAR CARPETA DEL PACIENTE
        # ----------------------------------------------------

        $rutaPaciente = Join-Path $rutaBase $paciente

        if (-not (Test-Path -LiteralPath $rutaPaciente -PathType Container)) {

            # Intentar búsqueda recursiva
            $carpetaEncontrada = Get-ChildItem `
                -LiteralPath $rutaBase `
                -Directory `
                -Recurse `
                -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.Name -eq $paciente
                } |
                Select-Object -First 1

            if ($null -ne $carpetaEncontrada) {
                $rutaPaciente = $carpetaEncontrada.FullName
            }
            else {

                $errores++

                $resultados.Add([PSCustomObject]@{
                    CARPETA          = ""
                    PACIENTE         = $paciente
                    SOPORTE          = $soporte
                    "FECHA ATENCION" = $fecha.ToString("yyyy-MM-dd")
                    "NOMBRE ANTERIOR" = ""
                    "NOMBRE NUEVO"    = ""
                    ESTADO            = "CON ERROR"
                    OBSERVACION       = "No se encontro la carpeta del paciente"
                })

                continue
            }
        }

        # ----------------------------------------------------
        # BUSCAR SOPORTE
        # ----------------------------------------------------

        $rutaSoporte = Join-Path $rutaPaciente $soporte

        if (-not (Test-Path -LiteralPath $rutaSoporte -PathType Leaf)) {

            # Buscar por nombre dentro de la carpeta
            $archivoEncontrado = Get-ChildItem `
                -LiteralPath $rutaPaciente `
                -File `
                -Recurse `
                -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.Name -eq $soporte
                } |
                Select-Object -First 1

            if ($null -ne $archivoEncontrado) {
                $rutaSoporte = $archivoEncontrado.FullName
            }
            else {

                $errores++

                $resultados.Add([PSCustomObject]@{
                    CARPETA          = $rutaPaciente
                    PACIENTE         = $paciente
                    SOPORTE          = $soporte
                    "FECHA ATENCION" = $fecha.ToString("yyyy-MM-dd")
                    "NOMBRE ANTERIOR" = ""
                    "NOMBRE NUEVO"    = ""
                    ESTADO            = "CON ERROR"
                    OBSERVACION       = "No se encontro el PDF indicado"
                })

                continue
            }
        }

        # ----------------------------------------------------
        # CONSTRUIR NUEVO NOMBRE
        # ----------------------------------------------------

        $nombreAnterior = [System.IO.Path]::GetFileName($rutaSoporte)

        $extension = [System.IO.Path]::GetExtension($nombreAnterior)

        # ----------------------------------------------------
        # QUITAR FECHAS EXISTENTES DEL NOMBRE
        # Y NORMALIZAR HCMEDICINAGENERAL
        # ----------------------------------------------------

        $nombreSinExtension = [System.IO.Path]::GetFileNameWithoutExtension($nombreAnterior)

        # Quitar fechas YYYYMMDD al final
        $nombreSinExtension = $nombreSinExtension -replace "_?\d{8}$", ""

        # Quitar fecha YYYY-MM-DD
        $nombreSinExtension = $nombreSinExtension -replace "_?\d{4}-\d{2}-\d{2}$", ""

        # Quitar espacios finales
        $nombreSinExtension = $nombreSinExtension.Trim()

        # ----------------------------------------------------
        # NUEVO NOMBRE
        # ----------------------------------------------------

        $nombreNuevo = $nombreSinExtension + "_" + $fechaNueva + $extension

        $rutaNueva = Join-Path $rutaPaciente $nombreNuevo

        # ----------------------------------------------------
        # SI YA TIENE EL NOMBRE CORRECTO
        # ----------------------------------------------------

        if ($nombreAnterior -eq $nombreNuevo) {

            $omitidos++

            $resultados.Add([PSCustomObject]@{
                CARPETA          = $rutaPaciente
                PACIENTE         = $paciente
                SOPORTE          = $soporte
                "FECHA ATENCION" = $fecha.ToString("yyyy-MM-dd")
                "NOMBRE ANTERIOR" = $nombreAnterior
                "NOMBRE NUEVO"    = $nombreNuevo
                ESTADO            = "OK"
                OBSERVACION       = "Ya tenia la fecha correcta"
            })

            continue
        }

        # ----------------------------------------------------
        # SI EL NUEVO NOMBRE YA EXISTE
        # ----------------------------------------------------

        if (Test-Path -LiteralPath $rutaNueva -PathType Leaf) {

            $errores++

            $resultados.Add([PSCustomObject]@{
                CARPETA          = $rutaPaciente
                PACIENTE         = $paciente
                SOPORTE          = $soporte
                "FECHA ATENCION" = $fecha.ToString("yyyy-MM-dd")
                "NOMBRE ANTERIOR" = $nombreAnterior
                "NOMBRE NUEVO"    = $nombreNuevo
                ESTADO            = "CON ERROR"
                OBSERVACION       = "Ya existe un archivo con el nombre nuevo"
            })

            continue
        }

        # ----------------------------------------------------
        # RENOMBRAR
        # ----------------------------------------------------

        Rename-Item `
            -LiteralPath $rutaSoporte `
            -NewName $nombreNuevo `
            -ErrorAction Stop

        $ok++

        $resultados.Add([PSCustomObject]@{
            CARPETA          = $rutaPaciente
            PACIENTE         = $paciente
            SOPORTE          = $soporte
            "FECHA ATENCION" = $fecha.ToString("yyyy-MM-dd")
            "NOMBRE ANTERIOR" = $nombreAnterior
            "NOMBRE NUEVO"    = $nombreNuevo
            ESTADO            = "OK"
            OBSERVACION       = "Renombrado correctamente"
        })

        # ----------------------------------------------------
        # MOSTRAR PROGRESO
        # ----------------------------------------------------

        $procesados = $fila - 1
        $porcentaje = [math]::Round(($procesados / ($filas - 1)) * 100, 1)

        Write-Progress `
            -Activity "Etiquetando soportes" `
            -Status "$procesados de $($filas - 1) | $paciente" `
            -PercentComplete $porcentaje

    }
    catch {

        $errores++

        $resultados.Add([PSCustomObject]@{
            CARPETA          = ""
            PACIENTE         = $paciente
            SOPORTE          = $soporte
            "FECHA ATENCION" = $fechaTexto
            "NOMBRE ANTERIOR" = ""
            "NOMBRE NUEVO"    = ""
            ESTADO            = "CON ERROR"
            OBSERVACION       = $_.Exception.Message
        })
    }
}

# ============================================================
# CERRAR EXCEL ORIGINAL
# ============================================================

$libro.Close($false)
$excel.Quit()

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($hoja) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($libro) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Progress -Activity "Etiquetando soportes" -Completed

# ============================================================
# CREAR EXCEL CONSOLIDADO
# ============================================================

$rutaSalida = Join-Path $rutaBase "ajustar_consolidado.xlsx"

try {

    $excelSalida = New-Object -ComObject Excel.Application
    $excelSalida.Visible = $false
    $excelSalida.DisplayAlerts = $false

    $libroSalida = $excelSalida.Workbooks.Add()
    $hojaSalida = $libroSalida.Worksheets.Item(1)

    # --------------------------------------------------------
    # ENCABEZADOS
    # --------------------------------------------------------

    $encabezados = @(
        "CARPETA",
        "PACIENTE",
        "SOPORTE",
        "FECHA ATENCION",
        "NOMBRE ANTERIOR",
        "NOMBRE NUEVO",
        "ESTADO",
        "OBSERVACION"
    )

    for ($c = 0; $c -lt $encabezados.Count; $c++) {

        $hojaSalida.Cells.Item(1, $c + 1) = $encabezados[$c]
    }

    # --------------------------------------------------------
    # DATOS
    # --------------------------------------------------------

    $filaSalida = 2

    foreach ($resultado in $resultados) {

        $hojaSalida.Cells.Item($filaSalida, 1) = $resultado.CARPETA
        $hojaSalida.Cells.Item($filaSalida, 2) = $resultado.PACIENTE
        $hojaSalida.Cells.Item($filaSalida, 3) = $resultado.SOPORTE
        $hojaSalida.Cells.Item($filaSalida, 4) = $resultado."FECHA ATENCION"
        $hojaSalida.Cells.Item($filaSalida, 5) = $resultado."NOMBRE ANTERIOR"
        $hojaSalida.Cells.Item($filaSalida, 6) = $resultado."NOMBRE NUEVO"
        $hojaSalida.Cells.Item($filaSalida, 7) = $resultado.ESTADO
        $hojaSalida.Cells.Item($filaSalida, 8) = $resultado.OBSERVACION

        $filaSalida++
    }

    # --------------------------------------------------------
    # FORMATO
    # --------------------------------------------------------

    $rango = $hojaSalida.Range(
        $hojaSalida.Cells.Item(1,1),
        $hojaSalida.Cells.Item($filaSalida - 1,8)
    )

    $rango.EntireColumn.AutoFit() | Out-Null

    $hojaSalida.Rows.Item(1).Font.Bold = $true

    $libroSalida.SaveAs($rutaSalida, 51)

    $libroSalida.Close($true)
    $excelSalida.Quit()

    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($hojaSalida) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($libroSalida) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excelSalida) | Out-Null

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

}
catch {

    Write-Host ""
    Write-Host "ADVERTENCIA: No se pudo crear ajustar_consolidado.xlsx" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

# ============================================================
# RESUMEN FINAL
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "                 PROCESO TERMINADO" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Registros del Excel : $($filas - 1)"
Write-Host "Renombrados OK      : $ok" -ForegroundColor Green
Write-Host "Ya estaban correctos: $omitidos" -ForegroundColor Cyan
Write-Host "Con errores         : $errores" -ForegroundColor Red

Write-Host ""
Write-Host "Excel generado:" -ForegroundColor Cyan
Write-Host $rutaSalida -ForegroundColor Yellow
Write-Host ""

Write-Host "Ejemplo de resultado:" -ForegroundColor Cyan
Write-Host "1124008753HCMEDICINAGENERAL.pdf"
Write-Host "              ↓"
Write-Host "1124008753HCMEDICINAGENERAL_20260113.pdf"
Write-Host ""

Pause', 'Renombra de forma masiva los archivos de soporte de los pacientes añadiendo la fecha de atención correspondiente obtenida desde un archivo Excel.', 'Evita la tarea manual y repetitiva de buscar y renombrar individualmente cada archivo de soporte médico con su respectiva fecha.', 'Windows, PowerShell, Microsoft Excel instalado y un archivo Excel llamado ''ajustar.xlsx'' con las columnas CARPETA, PACIENTE, SOPORTE y FECHA ATENCION.', 'Pasó de 1124008753HCMEDICINAGENERAL.pdf a 1124008753HCMEDICINAGENERAL_20260113.pdf.', 'El script modifica y renombra archivos en el disco. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.', '{"summary":"Renombra de forma masiva los archivos de soporte de los pacientes añadiendo la fecha de atención correspondiente obtenida desde un archivo Excel.","detectedActions":["Abre el archivo Excel mediante automatización COM, lee las columnas de configuración, busca las carpetas de los pacientes y los archivos de soporte de forma recursiva, interpreta y formatea las fechas, renombra los archivos existentes añadiendo la fecha en formato YYYYMMDD, y genera un Excel consolidado con el reporte."],"risk":"medio","riskReason":"El script modifica y renombra archivos en el disco. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.","howToUse":"1. Escribe la ruta de la carpeta donde estan TODOS los pacientes.\n2. Escribe la ruta completa de ajustar.xlsx.\n3. Confirmar el procesamiento.\n4. Revisar el resultado generado.","exampleResult":"Pasó de 1124008753HCMEDICINAGENERAL.pdf a 1124008753HCMEDICINAGENERAL_20260113.pdf.","inputs":"Ruta de la carpeta base de pacientes y la ruta completa del archivo Excel \u0027ajustar.xlsx\u0027.","filesAffected":"Lee archivos PDF y Excel, renombra archivos PDF dentro de las carpetas de pacientes y crea un nuevo archivo Excel llamado \u0027ajustar_consolidado.xlsx\u0027.","ai":true}'::jsonb, '"b5bec63b-e5d4-4b48-a25e-822585db8f94"'::jsonb, '2026-09-29T21:58:32.148Z'),
('b5bec63b-e5d4-4b48-a25e-822585db8f94', 'Generador de Soportes de Correspondencia a PDF por Rango', 'VBA (Word)', '["Automatización de Documentos","Correspondencia","Exportación PDF"]'::jsonb, 'Option Explicit

''=============================================================
'' CONFIGURACIÓN PRINCIPAL
''=============================================================

Sub Generar_Soportes_Rango()

    Dim docPrincipal As Document
    Dim docIndividual As Document
    Dim ds As MailMergeDataSource

    Dim Inicio As Long
    Dim Fin As Long
    Dim i As Long

    Dim CampoTipo As String
    Dim CampoNumero As String

    Dim tipoDocumento As String
    Dim numeroIdentificacion As String
    Dim identificacion As String

    Dim rutaBase As String
    Dim rutaCarpeta As String
    Dim rutaPDF As String
    Dim nombrePDF As String

    Dim Generados As Long
    Dim YaExistian As Long
    Dim Errores As Long

    Dim ListaErrores As String

    ''=========================================================
    '' RANGO A PROCESAR
    ''=========================================================

    Inicio = 1
    Fin = 3

    ''=========================================================
    '' CARPETA DONDE SE CREARÁN LOS SOPORTES
    ''=========================================================

    rutaBase = "C:\Users\tgestioncohorte2\Downloads\soportes menores_ERC\SOPORTES"

    ''=========================================================
    '' DOCUMENTO PRINCIPAL
    ''=========================================================

    Set docPrincipal = ActiveDocument

    ''=========================================================
    '' VERIFICAR QUE EXISTA CORRESPONDENCIA
    ''=========================================================

    If docPrincipal.MailMerge.MainDocumentType = wdNotAMergeDocument Then

        MsgBox "Este documento NO tiene una correspondencia de Word configurada." & vbCrLf & vbCrLf & _
               "Abre el documento que ya tiene conectada la base de datos de Excel.", _
               vbCritical, "Correspondencia no encontrada"

        Exit Sub

    End If

    ''=========================================================
    '' VERIFICAR CARPETA DESTINO
    ''=========================================================

    If Dir(rutaBase, vbDirectory) = "" Then

        MsgBox "La carpeta destino no existe:" & vbCrLf & vbCrLf & _
               rutaBase, _
               vbCritical, "Carpeta no encontrada"

        Exit Sub

    End If

    ''=========================================================
    '' DATASOURCE
    ''=========================================================

    Set ds = docPrincipal.MailMerge.DataSource

    ''=========================================================
    '' BUSCAR AUTOMÁTICAMENTE LOS CAMPOS
    ''=========================================================

    CampoTipo = BuscarCampo(ds, "tipo identificacion")
    CampoNumero = BuscarCampo(ds, "numero identificacion")

    ''=========================================================
    '' VALIDAR CAMPOS
    ''=========================================================

    If CampoTipo = "" Then

        MsgBox "No se encontró el campo de TIPO DE IDENTIFICACIÓN." & vbCrLf & vbCrLf & _
               "Revisa los nombres de los campos de la correspondencia.", _
               vbCritical, "Campo no encontrado"

        Exit Sub

    End If

    If CampoNumero = "" Then

        MsgBox "No se encontró el campo de NÚMERO DE IDENTIFICACIÓN." & vbCrLf & vbCrLf & _
               "Revisa los nombres de los campos de la correspondencia.", _
               vbCritical, "Campo no encontrado"

        Exit Sub

    End If

    ''=========================================================
    '' VALIDAR RANGO
    ''=========================================================

    If Inicio < 1 Then Inicio = 1

    If Fin < Inicio Then

        MsgBox "El rango configurado no es válido.", _
               vbCritical, "Rango incorrecto"

        Exit Sub

    End If

    ''=========================================================
    '' INICIALIZAR
    ''=========================================================

    Generados = 0
    YaExistian = 0
    Errores = 0
    ListaErrores = ""

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False

    ''=========================================================
    '' PROCESAR PACIENTES
    ''=========================================================

    For i = Inicio To Fin

        Set docIndividual = Nothing

        On Error GoTo ErrorRegistro

        Application.StatusBar = _
            "Generando paciente " & (i - Inicio + 1) & _
            " de " & (Fin - Inicio + 1) & _
            " | Registro " & i

        DoEvents

        ''-----------------------------------------------------
        '' SELECCIONAR REGISTRO
        ''-----------------------------------------------------

        ds.ActiveRecord = i
        ds.FirstRecord = i
        ds.LastRecord = i

        ''-----------------------------------------------------
        '' OBTENER TIPO DE DOCUMENTO
        ''-----------------------------------------------------

        tipoDocumento = LimpiarTexto(ds.DataFields(CampoTipo).Value)

        ''-----------------------------------------------------
        '' OBTENER NÚMERO DE IDENTIFICACIÓN
        ''-----------------------------------------------------

        numeroIdentificacion = LimpiarTexto(ds.DataFields(CampoNumero).Value)

        ''-----------------------------------------------------
        '' VALIDAR IDENTIFICACIÓN
        ''-----------------------------------------------------

        If numeroIdentificacion = "" Then

            Errores = Errores + 1

            ListaErrores = ListaErrores & _
                "Registro " & i & _
                " | Identificación vacía" & vbCrLf

            GoTo SiguienteRegistro

        End If

        ''-----------------------------------------------------
        '' SI EL TIPO VIENE VACÍO, USAR SOLO EL NÚMERO
        ''-----------------------------------------------------

        identificacion = tipoDocumento & numeroIdentificacion

        If tipoDocumento = "" Then
            identificacion = numeroIdentificacion
        End If

        ''-----------------------------------------------------
        '' CREAR CARPETA DEL PACIENTE
        ''-----------------------------------------------------

        rutaCarpeta = rutaBase & "\" & identificacion

        If Dir(rutaCarpeta, vbDirectory) = "" Then
            MkDir rutaCarpeta
        End If

        ''-----------------------------------------------------
        '' NOMBRE DEL PDF
        ''
        '' EJEMPLO:
        ''
        '' 1124008753HCMEDICINAGENERAL.pdf
        ''
        '' SIN FECHA
        ''-----------------------------------------------------

        nombrePDF = numeroIdentificacion & "HCMEDICINAGENERAL.pdf"

        rutaPDF = rutaCarpeta & "\" & nombrePDF

        ''-----------------------------------------------------
        '' SI YA EXISTE, NO SOBRESCRIBIR
        ''-----------------------------------------------------

        If Dir(rutaPDF) <> "" Then

            YaExistian = YaExistian + 1

            GoTo SiguienteRegistro

        End If

        ''-----------------------------------------------------
        '' GENERAR CORRESPONDENCIA
        ''-----------------------------------------------------

        docPrincipal.MailMerge.Destination = wdSendToNewDocument

        docPrincipal.MailMerge.DataSource.FirstRecord = i
        docPrincipal.MailMerge.DataSource.LastRecord = i

        docPrincipal.MailMerge.Execute Pause:=False

        Set docIndividual = ActiveDocument

        ''-----------------------------------------------------
        '' EXPORTAR PDF
        ''-----------------------------------------------------

        docIndividual.ExportAsFixedFormat _
            OutputFileName:=rutaPDF, _
            ExportFormat:=wdExportFormatPDF, _
            OpenAfterExport:=False, _
            OptimizeFor:=wdExportOptimizeForPrint, _
            Range:=wdExportAllDocument, _
            Item:=wdExportDocumentContent, _
            IncludeDocProps:=True, _
            KeepIRM:=True, _
            CreateBookmarks:=wdExportCreateNoBookmarks, _
            DocStructureTags:=True, _
            BitmapMissingFonts:=True, _
            UseISO19005_1:=False

        ''-----------------------------------------------------
        '' CERRAR DOCUMENTO GENERADO
        ''-----------------------------------------------------

        docIndividual.Close SaveChanges:=False

        Set docIndividual = Nothing

        Generados = Generados + 1

SiguienteRegistro:

        On Error GoTo 0

    Next i

    ''=========================================================
    '' FINALIZAR
    ''=========================================================

    Application.StatusBar = False
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True

    MsgBox _
        "PROCESO TERMINADO" & vbCrLf & vbCrLf & _
        "Rango procesado: " & Inicio & " - " & Fin & vbCrLf & _
        "Total registros: " & (Fin - Inicio + 1) & vbCrLf & vbCrLf & _
        "PDF generados: " & Generados & vbCrLf & _
        "Ya existían: " & YaExistian & vbCrLf & _
        "Errores: " & Errores & vbCrLf & vbCrLf & _
        "Los soportes quedaron SIN FECHA." & vbCrLf & _
        "La fecha de atención se agregará posteriormente desde Excel.", _
        vbInformation, _
        "Generación terminada"

    ''=========================================================
    '' MOSTRAR ERRORES
    ''=========================================================

    If Errores > 0 Then

        Documents.Add

        Selection.TypeText _
            "ERRORES DEL PROCESO" & vbCrLf & _
            "===================" & vbCrLf & vbCrLf & _
            ListaErrores

    End If

    Exit Sub

''=============================================================
'' MANEJO DE ERRORES
''=============================================================

ErrorRegistro:

    Errores = Errores + 1

    ListaErrores = ListaErrores & _
        "Registro " & i & _
        " | " & identificacion & _
        " | " & Err.Description & vbCrLf

    On Error Resume Next

    If Not docIndividual Is Nothing Then
        docIndividual.Close SaveChanges:=False
    End If

    Set docIndividual = Nothing

    On Error GoTo 0

    Resume SiguienteRegistro

End Sub


''=============================================================
'' BUSCAR CAMPO DE CORRESPONDENCIA
''=============================================================

Function BuscarCampo(ds As MailMergeDataSource, nombreBuscado As String) As String

    Dim j As Long
    Dim nombreCampo As String
    Dim buscado As String

    buscado = NormalizarTexto(nombreBuscado)

    BuscarCampo = ""

    For j = 1 To ds.DataFields.Count

        nombreCampo = ds.DataFields(j).Name

        If NormalizarTexto(nombreCampo) = buscado Then

            BuscarCampo = nombreCampo
            Exit Function

        End If

    Next j

    ''---------------------------------------------------------
    '' SEGUNDA BÚSQUEDA: CONTIENE
    ''---------------------------------------------------------

    For j = 1 To ds.DataFields.Count

        nombreCampo = ds.DataFields(j).Name

        If InStr(1, NormalizarTexto(nombreCampo), buscado, vbTextCompare) > 0 Then

            BuscarCampo = nombreCampo
            Exit Function

        End If

    Next j

End Function


''=============================================================
'' NORMALIZAR TEXTO
''=============================================================

Function NormalizarTexto(texto As String) As String

    texto = LCase(Trim(texto))

    texto = Replace(texto, ChrW(225), "a")
    texto = Replace(texto, ChrW(233), "e")
    texto = Replace(texto, ChrW(237), "i")
    texto = Replace(texto, ChrW(243), "o")
    texto = Replace(texto, ChrW(250), "u")
    texto = Replace(texto, ChrW(252), "u")
    texto = Replace(texto, ChrW(241), "n")

    texto = Replace(texto, "_", " ")
    texto = Replace(texto, "-", " ")
    texto = Replace(texto, ".", " ")

    Do While InStr(texto, "  ") > 0
        texto = Replace(texto, "  ", " ")
    Loop

    NormalizarTexto = texto

End Function


''=============================================================
'' LIMPIAR VALOR DE EXCEL
''=============================================================

Function LimpiarTexto(valor As String) As String

    Dim texto As String

    texto = CStr(valor)

    texto = Replace(texto, ChrW(160), " ")
    texto = Replace(texto, vbTab, " ")
    texto = Replace(texto, vbCr, "")
    texto = Replace(texto, vbLf, "")

    texto = Trim(texto)

    LimpiarTexto = texto

End Function', 'Genera de forma automática documentos PDF individuales para un rango de registros a partir de una combinación de correspondencia en Word, organizándolos en carpetas por paciente.', 'Evita tener que separar manualmente un documento combinado de correspondencia en archivos individuales y guardarlos uno a uno en formato PDF con nombres específicos.', 'Microsoft Word, origen de datos de correspondencia conectado (ej. Excel) con los campos ''tipo identificacion'' y ''numero identificacion'', permisos de escritura en la ruta ''C:\Users\tgestioncohorte2\Downloads\soportes menores_ERC\SOPORTES''.', 'Para el registro con número de identificación ''1124008753'', se crea la carpeta ''C:\Users\tgestioncohorte2\Downloads\soportes menores_ERC\SOPORTES\1124008753'' y se genera el archivo ''1124008753HCMEDICINAGENERAL.pdf''.', 'El script tiene una ruta de carpeta destino fija (''C:\Users\tgestioncohorte2\Downloads\soportes menores_ERC\SOPORTES'') que debe existir previamente. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.', '{"summary":"Genera de forma automática documentos PDF individuales para un rango de registros a partir de una combinación de correspondencia en Word, organizándolos en carpetas por paciente.","detectedActions":["Valida la correspondencia, busca los campos de identificación, crea carpetas individuales por paciente, realiza la combinación de correspondencia registro por registro, exporta cada resultado a PDF sin sobrescribir existentes, y genera un reporte de errores si ocurren."],"risk":"medio","riskReason":"El script tiene una ruta de carpeta destino fija (\u0027C:\\Users\\tgestioncohorte2\\Downloads\\soportes menores_ERC\\SOPORTES\u0027) que debe existir previamente. Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales.","howToUse":"1. Abrir el documento de Word que tiene configurada la correspondencia.\n2. Acceder al editor de VBA (Alt + F11) y pegar el código en un módulo.\n3. Verificar o ajustar la ruta de la variable \u0027rutaBase\u0027 y el rango de registros (\u0027Inicio\u0027 y \u0027Fin\u0027).\n4. Ejecutar la macro \u0027Generar_Soportes_Rango\u0027.\n5. Revisar los archivos PDF creados en la carpeta de destino.","exampleResult":"Para el registro con número de identificación \u00271124008753\u0027, se crea la carpeta \u0027C:\\Users\\tgestioncohorte2\\Downloads\\soportes menores_ERC\\SOPORTES\\1124008753\u0027 y se genera el archivo \u00271124008753HCMEDICINAGENERAL.pdf\u0027.","inputs":"Documento de Word activo con combinación de correspondencia configurada, campos \u0027tipo identificacion\u0027 y \u0027numero identificacion\u0027 en la base de datos, y la ruta de destino especificada.","filesAffected":"Lectura del documento de Word activo y su base de datos de correspondencia. Creación de carpetas y archivos PDF en la ruta \u0027C:\\Users\\tgestioncohorte2\\Downloads\\soportes menores_ERC\\SOPORTES\\\u0027.","ai":true}'::jsonb, '[]'::jsonb, '2026-09-29T21:53:43.956Z'),
('fb29bf05-21f8-494f-80d1-347a779419e2', 'Cambiar Etiquetas de PDF con Búsqueda Inteligente', 'PowerShell', '["Gestión de archivos","Renombrado masivo","Automatización de documentos"]'::jsonb, '# ============================================================
# CAMBIAR ETIQUETAS DE PDF
# BUSQUEDA TOLERANTE
# ============================================================
# La ruta base SIEMPRE es la carpeta desde donde se ejecuta
# este archivo .ps1
#
# El usuario solamente indica:
# 1. Texto a buscar
# 2. Texto nuevo
# 3. Nivel de tolerancia
#
# Busca PDF en todas las carpetas y subcarpetas.
# ============================================================

Clear-Host

# ============================================================
# RUTA BASE AUTOMATICA
# ============================================================

$Ruta = $PSScriptRoot

# Si por alguna razon $PSScriptRoot esta vacio,
# utilizar la carpeta actual de PowerShell
if ([string]::IsNullOrWhiteSpace($Ruta)) {
    $Ruta = (Get-Location).Path
}


# ============================================================
# FUNCION: NORMALIZAR TEXTO
# ============================================================

function Normalizar-Texto {
    param (
        [string]$Texto
    )

    if ([string]::IsNullOrWhiteSpace($Texto)) {
        return ""
    }

    # Mayusculas
    $Resultado = $Texto.ToUpperInvariant()

    # Eliminar espacios, guiones, guiones bajos,
    # puntos y otros separadores
    $Resultado = $Resultado -replace ''[^A-Z0-9]'', ''''

    return $Resultado
}


# ============================================================
# FUNCION: DISTANCIA LEVENSHTEIN
# ============================================================

function Get-LevenshteinDistance {
    param (
        [string]$A,
        [string]$B
    )

    $A = $A.ToUpperInvariant()
    $B = $B.ToUpperInvariant()

    $LongA = $A.Length
    $LongB = $B.Length

    if ($LongA -eq 0) {
        return $LongB
    }

    if ($LongB -eq 0) {
        return $LongA
    }

    $Matriz = New-Object ''int[,]'' ($LongA + 1), ($LongB + 1)

    for ($i = 0; $i -le $LongA; $i++) {
        $Matriz[$i, 0] = $i
    }

    for ($j = 0; $j -le $LongB; $j++) {
        $Matriz[0, $j] = $j
    }

    for ($i = 1; $i -le $LongA; $i++) {

        for ($j = 1; $j -le $LongB; $j++) {

            if ($A[$i - 1] -eq $B[$j - 1]) {
                $Costo = 0
            }
            else {
                $Costo = 1
            }

            $Eliminar = $Matriz[$i - 1, $j] + 1
            $Insertar = $Matriz[$i, $j - 1] + 1
            $Cambiar = $Matriz[$i - 1, $j - 1] + $Costo

            $Matriz[$i, $j] = [Math]::Min(
                [Math]::Min($Eliminar, $Insertar),
                $Cambiar
            )
        }
    }

    return $Matriz[$LongA, $LongB]
}


# ============================================================
# FUNCION: SIMILITUD
# ============================================================

function Get-Similitud {
    param (
        [string]$TextoBuscado,
        [string]$TextoEncontrado
    )

    $A = Normalizar-Texto $TextoBuscado
    $B = Normalizar-Texto $TextoEncontrado

    if ($A -eq "" -or $B -eq "") {
        return 0
    }

    if ($A -eq $B) {
        return 100
    }

    $Distancia = Get-LevenshteinDistance $A $B

    $LongitudMayor = [Math]::Max(
        $A.Length,
        $B.Length
    )

    if ($LongitudMayor -eq 0) {
        return 100
    }

    $Similitud = (
        1 - ($Distancia / $LongitudMayor)
    ) * 100

    return [Math]::Round($Similitud, 2)
}


# ============================================================
# ENCABEZADO
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       CAMBIAR ETIQUETAS DE ARCHIVOS PDF" -ForegroundColor Cyan
Write-Host "              BUSQUEDA INTELIGENTE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "CARPETA DE TRABAJO:" -ForegroundColor Yellow
Write-Host $Ruta -ForegroundColor White

Write-Host ""
Write-Host "Se buscaran PDF en esta carpeta y TODAS sus subcarpetas."
Write-Host ""


# ============================================================
# PEDIR TEXTO A BUSCAR
# ============================================================

do {

    $TextoAnterior = Read-Host "Ingrese el TEXTO que desea BUSCAR"

    if ([string]::IsNullOrWhiteSpace($TextoAnterior)) {

        Write-Host ""
        Write-Host "Debe ingresar un texto." -ForegroundColor Red
        Write-Host ""
    }

}
while ([string]::IsNullOrWhiteSpace($TextoAnterior))


# ============================================================
# PEDIR TEXTO NUEVO
# ============================================================

Write-Host ""

$TextoNuevo = Read-Host "Ingrese el TEXTO NUEVO que desea colocar"


# ============================================================
# NIVEL DE TOLERANCIA
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "NIVEL DE TOLERANCIA" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor DarkCyan

Write-Host ""
Write-Host "85 = Recomendado"
Write-Host "80 = Mas tolerante"
Write-Host "75 = Muy tolerante"
Write-Host "90 = Mas estricto"
Write-Host ""

$EntradaTolerancia = Read-Host "Ingrese porcentaje (Enter = 85)"

if ([string]::IsNullOrWhiteSpace($EntradaTolerancia)) {

    $Umbral = 85

}
else {

    $Umbral = 0

    if (-not [int]::TryParse(
        $EntradaTolerancia,
        [ref]$Umbral
    )) {

        Write-Host ""
        Write-Host "Valor invalido. Se utilizara 85%." -ForegroundColor Yellow

        $Umbral = 85
    }
}


# ============================================================
# MOSTRAR CONFIGURACION
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CONFIGURACION" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "CARPETA:"
Write-Host $Ruta -ForegroundColor White

Write-Host ""
Write-Host "BUSCAR:"
Write-Host $TextoAnterior -ForegroundColor Yellow

Write-Host ""
Write-Host "REEMPLAZAR POR:"
Write-Host $TextoNuevo -ForegroundColor Green

Write-Host ""
Write-Host "SIMILITUD MINIMA:"
Write-Host "$Umbral%" -ForegroundColor Yellow

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan


# ============================================================
# CONFIRMACION
# ============================================================

Write-Host ""

$Confirmacion = Read-Host "Escriba S para comenzar"

if ($Confirmacion -notmatch "^[Ss]$") {

    Write-Host ""
    Write-Host "PROCESO CANCELADO." -ForegroundColor Yellow
    Write-Host ""

    Read-Host "Presione ENTER para salir"

    exit
}


# ============================================================
# BUSCAR TODOS LOS PDF
# ============================================================

Write-Host ""
Write-Host "Buscando archivos PDF..." -ForegroundColor Cyan
Write-Host ""

$Archivos = Get-ChildItem `
    -Path $Ruta `
    -Filter "*.pdf" `
    -File `
    -Recurse `
    -ErrorAction SilentlyContinue


# ============================================================
# CONTADORES
# ============================================================

$TotalPDF = 0
$Modificados = 0
$Exactos = 0
$Aproximados = 0
$SinCoincidencia = 0
$Errores = 0


# ============================================================
# TEXTO NORMALIZADO DEL USUARIO
# ============================================================

$TextoNormalizado = Normalizar-Texto $TextoAnterior


# ============================================================
# PROCESAR PDF
# ============================================================

foreach ($Archivo in $Archivos) {

    $TotalPDF++

    $NombreActual = $Archivo.Name

    $NombreSinExtension = [System.IO.Path]::GetFileNameWithoutExtension(
        $NombreActual
    )


    # ========================================================
    # NORMALIZAR TODO EL NOMBRE
    # ========================================================

    $NombreNormalizado = Normalizar-Texto $NombreSinExtension


    $MejorSimilitud = 0
    $MejorTexto = ""


    # ========================================================
    # COINCIDENCIA DIRECTA
    # ========================================================

    if ($NombreNormalizado.Contains($TextoNormalizado)) {

        $MejorSimilitud = 100
        $MejorTexto = $TextoAnterior
    }


    # ========================================================
    # SI NO ES EXACTO, BUSCAR APROXIMACION
    # ========================================================

    if ($MejorSimilitud -lt 100) {

        # Separar por espacios, _, -, puntos, etc.
        $Partes = $NombreSinExtension -split ''[ _\-.]+''

        foreach ($Parte in $Partes) {

            if ([string]::IsNullOrWhiteSpace($Parte)) {
                continue
            }

            $Similitud = Get-Similitud `
                -TextoBuscado $TextoAnterior `
                -TextoEncontrado $Parte

            if ($Similitud -gt $MejorSimilitud) {

                $MejorSimilitud = $Similitud
                $MejorTexto = $Parte
            }
        }
    }


    # ========================================================
    # COINCIDENCIA ENCONTRADA
    # ========================================================

    if ($MejorSimilitud -ge $Umbral) {

        if ($MejorSimilitud -eq 100) {

            $Exactos++

            Write-Host ""
            Write-Host "[EXACTO]" -ForegroundColor Green
        }
        else {

            $Aproximados++

            Write-Host ""
            Write-Host "[APROXIMADO: $MejorSimilitud%]" -ForegroundColor Yellow
        }


        Write-Host "ANTES:" -ForegroundColor Gray
        Write-Host "$NombreActual" -ForegroundColor Gray

        Write-Host ""
        Write-Host "COINCIDENCIA:" -ForegroundColor Cyan
        Write-Host "$MejorTexto" -ForegroundColor Cyan


        # ====================================================
        # CREAR NUEVO NOMBRE
        # ====================================================

        $NuevoNombreSinExtension = $NombreSinExtension


        # ----------------------------------------------------
        # CASO EXACTO
        # ----------------------------------------------------

        if ($MejorSimilitud -eq 100) {

            $Patron = [regex]::Escape($MejorTexto)

            $NuevoNombreSinExtension = [regex]::Replace(
                $NuevoNombreSinExtension,
                $Patron,
                $TextoNuevo,
                [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
            )
        }


        # ----------------------------------------------------
        # CASO APROXIMADO
        # ----------------------------------------------------

        else {

            $Patron = [regex]::Escape($MejorTexto)

            $NuevoNombreSinExtension = [regex]::Replace(
                $NuevoNombreSinExtension,
                $Patron,
                $TextoNuevo,
                [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
            )
        }


        $NuevoNombre = $NuevoNombreSinExtension + ".pdf"


        # ====================================================
        # CAMBIAR NOMBRE
        # ====================================================

        if ($NombreActual -ne $NuevoNombre) {

            Write-Host ""
            Write-Host "NUEVO NOMBRE:" -ForegroundColor Green
            Write-Host "$NuevoNombre" -ForegroundColor Green


            try {

                Rename-Item `
                    -LiteralPath $Archivo.FullName `
                    -NewName $NuevoNombre `
                    -ErrorAction Stop

                $Modificados++

            }
            catch {

                $Errores++

                Write-Host ""
                Write-Host "ERROR:" -ForegroundColor Red
                Write-Host $_.Exception.Message -ForegroundColor Red
            }
        }

    }
    else {

        $SinCoincidencia++
    }
}


# ============================================================
# RESUMEN FINAL
# ============================================================

Write-Host ""
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                  PROCESO TERMINADO" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Carpeta procesada:"
Write-Host $Ruta -ForegroundColor White

Write-Host ""
Write-Host "Texto buscado:"
Write-Host $TextoAnterior -ForegroundColor Yellow

Write-Host ""
Write-Host "Texto colocado:"
Write-Host $TextoNuevo -ForegroundColor Green

Write-Host ""
Write-Host "Similitud minima:"
Write-Host "$Umbral%" -ForegroundColor Yellow

Write-Host ""
Write-Host "------------------------------------------------------------"

Write-Host "PDF encontrados:       " -NoNewline
Write-Host "$TotalPDF" -ForegroundColor White

Write-Host "PDF modificados:       " -NoNewline
Write-Host "$Modificados" -ForegroundColor Green

Write-Host "Coincidencias exactas: " -NoNewline
Write-Host "$Exactos" -ForegroundColor Green

Write-Host "Coincidencias aprox.:  " -NoNewline
Write-Host "$Aproximados" -ForegroundColor Yellow

Write-Host "Sin coincidencia:      " -NoNewline
Write-Host "$SinCoincidencia" -ForegroundColor Gray

Write-Host "Errores:               " -NoNewline
Write-Host "$Errores" -ForegroundColor Red

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Presione ENTER para salir"', 'Busca archivos PDF en la carpeta actual y sus subcarpetas para reemplazar partes de sus nombres por un texto nuevo, permitiendo coincidencias exactas o aproximadas mediante un cálculo de similitud.', 'Evita tener que buscar y renombrar manualmente decenas o cientos de archivos PDF cuando hay errores de escritura, variaciones en las etiquetas o cambios masivos de nombre.', 'Windows PowerShell, permisos de lectura y escritura en la carpeta de trabajo y sus subcarpetas, archivos con extensión .pdf.', 'Si se busca ''FACTURA'' para reemplazar por ''RECIBO'', el archivo pasó de FACTURA_001.pdf a RECIBO_001.pdf.', 'Operación de renombrado directo e irreversible sobre los archivos existentes. Si se establece un nivel de tolerancia muy bajo, se podrían renombrar archivos no deseados por coincidencias aproximadas de texto.', '{"summary":"Busca archivos PDF en la carpeta actual y sus subcarpetas para reemplazar partes de sus nombres por un texto nuevo, permitiendo coincidencias exactas o aproximadas mediante un cálculo de similitud.","detectedActions":["Escanea la carpeta de forma recursiva buscando archivos .pdf, normaliza cadenas eliminando caracteres especiales, calcula la distancia Levenshtein para medir similitud de texto, reemplaza cadenas usando expresiones regulares y renombra los archivos con Rename-Item."],"risk":"medio","riskReason":"Operación de renombrado directo e irreversible sobre los archivos existentes. Si se establece un nivel de tolerancia muy bajo, se podrían renombrar archivos no deseados por coincidencias aproximadas de texto.","howToUse":"1. Copiar y ejecutar el script en la carpeta donde se encuentran los archivos PDF.\n2. Escribir el texto que se desea buscar.\n3. Escribir el texto nuevo que reemplazará al buscado.\n4. Introducir el porcentaje de tolerancia o presionar ENTER para usar el 85% recomendado.\n5. Confirmar la operación escribiendo la letra S.\n6. Revisar el reporte con el total de archivos modificados al finalizar.","exampleResult":"Si se busca \u0027FACTURA\u0027 para reemplazar por \u0027RECIBO\u0027, el archivo pasó de FACTURA_001.pdf a RECIBO_001.pdf.","inputs":"Texto a buscar, texto nuevo de reemplazo, porcentaje de similitud o tolerancia (opcional), confirmación de inicio (\u0027S\u0027), archivos .pdf en el directorio.","filesAffected":"Archivos .pdf situados en la carpeta de ejecución y sus subcarpetas (lectura y renombrado).","ai":true}'::jsonb, '[]'::jsonb, '2026-09-29T21:28:17.256Z')
on conflict (id) do update set nombre = excluded.nombre, lenguaje = excluded.lenguaje, categorias = excluded.categorias, codigo = excluded.codigo, proposito = excluded.proposito, problema = excluded.problema, requisitos = excluded.requisitos, salida = excluded.salida, advertencias = excluded.advertencias, analisis = excluded.analisis, depende_de = excluded.depende_de, creado_en = excluded.creado_en;