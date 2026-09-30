const STORAGE_KEY = "toolbox-ia-tools-v1";
const THEME_KEY = "toolbox-ia-theme";
const ADMIN_SESSION_KEY = "toolbox-ia-admin-session-v1";
const ADMIN_ACTION_PREFIX = "toolbox-ia-admin-action-v1-";
const ADMIN_SESSION_MS = 30 * 60 * 1000;
const ADMIN_PASSWORD_HASH = "9275cc0b94ebcb97186606a28d8dd88cdbf5c83cf2a4452db265acad6ee4391b";

async function hashText(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getAdminSession() {
  try {
    const session = JSON.parse(
      sessionStorage.getItem(ADMIN_SESSION_KEY) || "null"
    );

    if (session?.expiresAt > Date.now()) {
      return session;
    }
  } catch {}

  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  return null;
}

function isAdmin() {
  return Boolean(getAdminSession());
}

function createAdminActionToken(action, id = "") {
  const token = crypto.randomUUID();

  sessionStorage.setItem(
    `${ADMIN_ACTION_PREFIX}${token}`,
    JSON.stringify({
      action,
      id,
      expiresAt: Date.now() + 60 * 1000
    })
  );

  return token;
}

function consumeAdminActionToken(token, action, id = "") {
  if (!token || !isAdmin()) return false;

  const key = `${ADMIN_ACTION_PREFIX}${token}`;
  const raw = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);

  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);

    return payload.action === action &&
      payload.id === id &&
      payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

async function requestAdminAccess() {
  if (isAdmin()) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    renderAll();
    updateAdminButton();
    showView("dashboard");
    toast("Sesión de administrador cerrada.");
    return;
  }

  const modal = document.getElementById("adminModal");
  const input = document.getElementById("adminPassword");

  if (!modal || !input) return;

  input.value = "";
  modal.classList.remove("hidden");
  input.focus();
}

async function authenticateAdmin() {
  const input = document.getElementById("adminPassword");
  const modal = document.getElementById("adminModal");

  if (!input || !modal) return;

  const password = input.value;

  if (!password) {
    toast("Escribe la contraseña.");
    return;
  }

  const passwordHash = await hashText(password);

  if (passwordHash !== ADMIN_PASSWORD_HASH) {
    toast("Contraseña incorrecta.");
    return;
  }

  sessionStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      token: crypto.randomUUID(),
      expiresAt: Date.now() + ADMIN_SESSION_MS
    })
  );

  modal.classList.add("hidden");
  renderAll();
  updateAdminButton();
  toast("Modo administrador activado durante 30 minutos.");
}

function closeAdminAccess() {
  const modal = document.getElementById("adminModal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

function updateAdminButton() {
  const button = document.getElementById("adminAccess");

  if (!button) return;

  button.querySelector("[data-admin-label]").textContent =
    isAdmin()
      ? "Cerrar administración"
      : "Acceso administrador";
}

const demoTools = [
  {
    id: crypto.randomUUID(),
    name: "Buscar último laboratorio",
    language: "PowerShell",
    categories: ["PDF", "Laboratorio", "Pacientes"],
    code: `# Ejemplo de demostración
$root = "C:\\Pacientes"

Get-ChildItem -Path $root -Recurse -Filter *.pdf |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1`,
    purpose: "Buscar automáticamente el PDF de laboratorio más reciente dentro de las carpetas de pacientes.",
    problem: "Evita revisar manualmente muchas carpetas para determinar cuál es el soporte más reciente.",
    requirements: "Windows, PowerShell y acceso de lectura a la carpeta principal de pacientes.",
    output: "Identificación del archivo más reciente encontrado.",
    warnings: "Verificar la ruta de entrada antes de ejecutar. Probar primero sobre una copia.",
    createdAt: new Date().toISOString(),
    analysis: {
      summary: "Herramienta orientada a localizar archivos PDF y ordenarlos por fecha de modificación.",
      detectedActions: ["Lee archivos", "Busca recursivamente", "Ordena resultados"],
      risk: "bajo",
      riskReason: "El ejemplo solo contiene operaciones de lectura y selección."
    }
  }
];

function loadTools() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(demoTools)
  );

  return demoTools;
}

let tools = loadTools();
let selectedRelation = { from: "", to: "" };

function saveTools() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(tools)
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, cls = "h-4 w-4") {
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}

function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

function toast(message) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.remove("hidden");

  clearTimeout(window.__toast);

  window.__toast = setTimeout(() => {
    el.classList.add("hidden");
  }, 3500);
}

function languageIcon(language) {

  const map = {
    PowerShell: "terminal",
    Python: "braces",
    SQL: "database",
    JavaScript: "file-code",
    VBA: "file-spreadsheet",
    Batch: "terminal-square",
    PHP: "server",
    Otro: "code-2"
  };

  return map[language] || "code-2";
}

function riskBadge(analysis) {

  const risk =
    String(
      analysis?.risk ||
      "desconocido"
    ).toLowerCase();

  const map = {

    bajo: [
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
      "Riesgo bajo"
    ],

    medio: [
      "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
      "Revisar antes de ejecutar"
    ],

    alto: [
      "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
      "Riesgo alto"
    ],

    desconocido: [
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      "Sin clasificar"
    ]
  };

  const [cls, text] =
    map[risk] || map.desconocido;

  return `
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}">
      ${icon(
        risk === "alto"
          ? "alert-triangle"
          : "shield-check",
        "h-3.5 w-3.5"
      )}
      ${text}
    </span>
  `;
}

function renderStats() {

  const counts = {

    total:
      tools.length,

    ps:
      tools.filter(
        t => t.language === "PowerShell"
      ).length,

    py:
      tools.filter(
        t => t.language === "Python"
      ).length,

    categories:
      new Set(
        tools.flatMap(
          t => t.categories || []
        )
      ).size
  };

  const stats =
    document.getElementById("stats");

  if (!stats) return;

  stats.innerHTML = [

    [
      "library",
      "Herramientas",
      counts.total,
      "Total en la biblioteca"
    ],

    [
      "terminal",
      "PowerShell",
      counts.ps,
      "Automatizaciones Windows"
    ],

    [
      "braces",
      "Python",
      counts.py,
      "Scripts y análisis"
    ],

    [
      "layers-3",
      "Categorías",
      counts.categories,
      "Temas organizados"
    ]

  ].map(
    ([ic, label, value, sub]) => `

      <button data-kpi-filter="${label === "PowerShell" || label === "Python" ? label : "all"}" class="kpi-card w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-soft dark:border-slate-800 dark:bg-slate-900">

        <div class="flex items-center justify-between">

          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">

            ${icon(ic, "h-5 w-5")}

          </div>

          ${icon(
            "arrow-up-right",
            "h-4 w-4 text-slate-300"
          )}

        </div>

        <div class="mt-4 text-2xl font-semibold">
          ${value}
        </div>

        <div class="mt-1 text-sm font-medium">
          ${label}
        </div>

        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ${sub}
        </div>

      </button>

    `
  ).join("");

  refreshIcons();
}

function cardRelationship(t) {

  const previous =
    tools.filter(
      candidate =>
        (t.dependsOn || []).includes(candidate.id)
    );

  const next =
    tools.filter(
      candidate =>
        (candidate.dependsOn || []).includes(t.id)
    );

  if (!previous.length && !next.length) return "";

  const sequence = (first, second) => `
    <div class="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white dark:bg-white dark:text-slate-900">1</span>
      <span class="max-w-[38%] truncate font-medium" title="${escapeHtml(first.name)}">${escapeHtml(first.name)}</span>
      <i data-lucide="arrow-right" class="h-3 w-3 shrink-0 text-slate-400"></i>
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 font-semibold dark:border-slate-600">2</span>
      <span class="max-w-[38%] truncate font-medium" title="${escapeHtml(second.name)}">${escapeHtml(second.name)}</span>
    </div>
  `;

  return `
    <div class="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
      <p class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        ${icon("git-branch", "h-3.5 w-3.5")}
        Flujo relacionado
      </p>
      ${next.length ? next.map(item => sequence(t, item)).join("") : ""}
      ${previous.length ? previous.map(item => sequence(item, t)).join("") : ""}
    </div>
  `;
}

function toolCard(t) {

  const cats =
    (t.categories || [])
      .slice(0, 3)
      .map(
        c => `
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            ${escapeHtml(c)}
          </span>
        `
      )
      .join("");

  return `

    <article class="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">

      <div class="flex items-start justify-between gap-3">

        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">

          ${icon(
            languageIcon(t.language),
            "h-5 w-5"
          )}

        </div>

        <div class="flex items-center gap-2">

          ${riskBadge(t.analysis)}

          ${isAdmin() ? `
            <button
              data-edit-tool="${t.id}"
              aria-label="Editar ${escapeHtml(t.name)}"
              title="Editar herramienta"
              class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              ${icon("pencil", "h-4 w-4")}
            </button>
          ` : ""}

        </div>

      </div>

      <h3 class="mt-4 line-clamp-2 font-semibold">
        ${escapeHtml(t.name)}
      </h3>

      <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        ${escapeHtml(
          t.purpose ||
          t.analysis?.summary ||
          "Sin descripción."
        )}
      </p>

      <div class="mt-4 flex flex-wrap gap-1.5">
        ${cats}
      </div>

      ${cardRelationship(t)}

      <div class="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">

        <span class="text-xs text-slate-400">
          ${escapeHtml(t.language)}
        </span>

        <div class="flex items-center gap-3">

          ${isAdmin() ? `
            <button
              data-delete-tool="${t.id}"
              aria-label="Eliminar ${escapeHtml(t.name)}"
              title="Eliminar herramienta"
              class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              ${icon("trash-2", "h-4 w-4")}
            </button>
          ` : ""}

          <button
            data-open-tool="${t.id}"
            class="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            Ver herramienta
            ${icon("arrow-right", "h-4 w-4")}
          </button>

        </div>

      </div>

    </article>
  `;
}

function renderRecent() {

  const recent =
    [...tools]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, 5);

  const el =
    document.getElementById(
      "recentTools"
    );

  if (!el) return;

  if (!recent.length) {

    el.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Aún no hay herramientas.
      </div>
    `;

  } else {

    el.innerHTML =
      recent.map(
        t => `

          <button
            data-open-tool="${t.id}"
            class="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >

            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">

              ${icon(
                languageIcon(t.language),
                "h-4 w-4"
              )}

            </div>

            <div class="min-w-0 flex-1">

              <div class="truncate text-sm font-medium">
                ${escapeHtml(t.name)}
              </div>

              <div class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                ${escapeHtml(
                  t.purpose ||
                  "Sin descripción"
                )}
              </div>

            </div>

            ${icon(
              "chevron-right",
              "h-4 w-4 text-slate-400"
            )}

          </button>

        `
      ).join("");
  }

  refreshIcons();
}

function updateCategoryFilter() {

  const select =
    document.getElementById(
      "categoryFilter"
    );

  if (!select) return;

  const current =
    select.value;

  const categories =
    [
      ...new Set(
        tools.flatMap(
          t => t.categories || []
        )
      )
    ].sort();

  select.innerHTML =
    `<option value="">Todas</option>` +
    categories
      .map(
        c =>
          `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
      )
      .join("");

  if (categories.includes(current)) {
    select.value = current;
  }
}

function updateRelationshipManager() {
  const fromStep = document.getElementById("relationStepFrom");
  const toStep = document.getElementById("relationStepTo");

  if (!fromStep || !toStep) return;

  const renderStep = (step, number, title, selectedId) => `
    <div class="flex items-center gap-3">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">${number}</span>
      <div>
        <p class="text-sm font-semibold">${title}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">Selecciona una herramienta</p>
      </div>
    </div>
    <div class="mt-3 grid gap-2">
      ${tools.length
        ? tools.map(tool => `
          <button type="button" data-relation-slot="${step}" data-tool-id="${escapeHtml(tool.id)}" class="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${selectedId === tool.id ? "border-slate-900 bg-white font-semibold shadow-sm dark:border-white dark:bg-slate-900" : "border-slate-200 bg-white/60 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-500"}">
            <span class="h-2 w-2 shrink-0 rounded-full ${selectedId === tool.id ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}"></span>
            <span class="truncate">${escapeHtml(tool.name)}</span>
          </button>
        `).join("")
        : `<p class="text-sm text-slate-500">No hay herramientas disponibles.</p>`}
    </div>
  `;

  fromStep.innerHTML = renderStep("from", "1", "Primero", selectedRelation.from);
  toStep.innerHTML = renderStep("to", "2", "Después", selectedRelation.to);

  const addButton = document.getElementById("addRelation");
  if (addButton) {
    addButton.disabled = !selectedRelation.from || !selectedRelation.to || selectedRelation.from === selectedRelation.to;
  }

  renderRelationshipList();
}

function renderRelationshipList() {

  const list =
    document.getElementById(
      "relationList"
    );

  if (!list) return;

  const relationships = [];

  tools.forEach(
    tool => {
      (tool.dependsOn || []).forEach(
        previousId => {
          const previous =
            tools.find(
              item => item.id === previousId
            );

          if (previous) {
            relationships.push({
              from: previous,
              to: tool
            });
          }
        }
      );
    }
  );

  if (!relationships.length) {
    list.innerHTML =
      `<div class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">Todavía no hay relaciones definidas.</div>`;
    return;
  }

  list.innerHTML =
    relationships
      .map(
        relation => `
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div class="flex min-w-0 items-center gap-3 text-sm">
              <div class="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-400">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">1</span>
                <i data-lucide="arrow-right" class="h-3 w-3"></i>
                <span class="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600">2</span>
              </div>
              <div class="min-w-0">
                <p class="truncate font-medium">${escapeHtml(relation.from.name)}</p>
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">después: ${escapeHtml(relation.to.name)}</p>
              </div>
            </div>
            <button data-remove-relation="${relation.to.id}" data-previous-id="${relation.from.id}" type="button" class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" title="Quitar relación" aria-label="Quitar relación">
              ${icon("x", "h-4 w-4")}
            </button>
          </div>
        `
      )
      .join("");

  refreshIcons();
}

function addRelationship() {

  if (!isAdmin()) {
    toast("Necesitas iniciar sesión como administrador.");
    return;
  }

  const fromId = selectedRelation.from;
  const toId = selectedRelation.to;

  if (!fromId || !toId || fromId === toId) {
    toast("Selecciona dos herramientas diferentes.");
    return;
  }

  const target =
    tools.find(
      tool => tool.id === toId
    );

  if (!target) return;

  target.dependsOn = [
    ...new Set([
      ...(target.dependsOn || []),
      fromId
    ])
  ];

  saveTools();
  selectedRelation = { from: "", to: "" };
  renderAll();
  toast("Relación añadida.");
}

function removeRelationship(toId, fromId) {

  if (!isAdmin()) return;

  const target =
    tools.find(
      tool => tool.id === toId
    );

  if (!target) return;

  target.dependsOn =
    (target.dependsOn || []).filter(
      id => id !== fromId
    );

  saveTools();
  renderAll();
  toast("Relación eliminada.");
}

function renderLibrary() {

  const q =
    (
      document.getElementById(
        "toolSearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();

  const category =
    document.getElementById(
      "categoryFilter"
    )?.value || "";

  const filtered =
    tools.filter(t => {

      const hay = [

        t.name,

        t.language,

        t.purpose,

        t.problem,

        t.requirements,

        ...(t.categories || [])

      ]
        .join(" ")
        .toLowerCase();

      return (
        (!q || hay.includes(q)) &&
        (
          !category ||
          (
            t.categories || []
          ).includes(category)
        )
      );
    });

  const grid =
    document.getElementById(
      "toolGrid"
    );

  if (!grid) return;

  grid.innerHTML =
    filtered.length

      ? filtered
          .map(toolCard)
          .join("")

      : `
        <div class="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">

          <div class="text-sm font-medium">
            No encontramos herramientas
          </div>

          <p class="mt-1 text-sm text-slate-500">
            Prueba otra búsqueda o agrega una nueva.
          </p>

        </div>
      `;

  refreshIcons();
}

function deleteTool(id) {

  const actionToken =
    createAdminActionToken(
      "delete",
      id
    );

  if (!consumeAdminActionToken(actionToken, "delete", id)) {
    toast("Necesitas iniciar sesión como administrador.");
    return;
  }

  const tool =
    tools.find(
      x => x.id === id
    );

  if (!tool) return;

  if (!window.confirm(`¿Eliminar la herramienta "${tool.name}"?`)) {
    return;
  }

  tools =
    tools.filter(
      x => x.id !== id
    );

  saveTools();
  renderAll();
  toast("Herramienta eliminada.");
}

function editTool(id) {

  const actionToken =
    createAdminActionToken(
      "edit",
      id
    );

  if (!consumeAdminActionToken(actionToken, "edit", id)) {
    toast("Necesitas iniciar sesión como administrador.");
    return;
  }

  const tool =
    tools.find(
      x => x.id === id
    );

  if (!tool) return;

  editingToolId =
    tool.id;

  aiAnalyzedTool =
    { ...tool };

  const values = {
    fName: tool.name,
    fLanguage: tool.language,
    fCategories: (tool.categories || []).join(", "),
    fCode: tool.code,
    fPurpose: tool.purpose,
    fRequirements: tool.requirements,
    fHowToUse: tool.analysis?.howToUse,
    fExampleResult: tool.analysis?.exampleResult || tool.output
  };

  Object.entries(values).forEach(
    ([fieldId, value]) => {
      const field =
        document.getElementById(
          fieldId
        );

      if (field) {
        field.value = value || "";
      }
    }
  );

  const label =
    document.getElementById(
      "analyzeButtonLabel"
    );

  if (label) {
    label.innerHTML =
      `${icon("save", "h-4 w-4")} Guardar cambios`;
    refreshIcons();
  }

  const detailModal =
    document.getElementById(
      "detailModal"
    );

  if (detailModal) {
    detailModal.classList.add(
      "hidden"
    );
  }

  showView("new");
}

function resetToolForm() {

  aiAnalyzedTool =
    null;

  editingToolId =
    null;

  const form =
    document.getElementById(
      "toolForm"
    );

  if (form) {
    form.reset();
  }

  const status =
    document.getElementById(
      "aiStatus"
    );

  if (status) {
    status.classList.add(
      "hidden"
    );
    status.innerHTML = "";
  }

  const label =
    document.getElementById(
      "analyzeButtonLabel"
    );

  if (label) {
    label.innerHTML =
      `${icon(
        "sparkles",
        "h-4 w-4"
      )} Analizar con IA`;
    refreshIcons();
  }
}

function openTool(id) {

  const t =
    tools.find(
      x => x.id === id
    );

  if (!t) return;

  const modalTitle =
    document.getElementById(
      "modalTitle"
    );

  const modalMeta =
    document.getElementById(
      "modalMeta"
    );

  const modalBody =
    document.getElementById(
      "modalBody"
    );

  if (!modalTitle || !modalBody) {
    return;
  }

  modalTitle.textContent =
    t.name;

  if (modalMeta) {

    modalMeta.textContent =
      `${t.language} · ${(t.categories || []).join(" · ")}`;
  }

  modalBody.innerHTML = `

    <div class="grid gap-3 lg:grid-cols-5">

      <div class="space-y-3 lg:col-span-3">

        <div class="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          ${icon("shield-alert", "mt-0.5 h-4 w-4 shrink-0")}
          <p><strong>Antes de ejecutar:</strong> haz una copia de respaldo y prueba siempre sobre la copia, nunca sobre los archivos originales.</p>
        </div>

      <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3">
          <h3 class="font-semibold">Descripción</h3>
          ${riskBadge(t.analysis)}
        </div>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          ${escapeHtml(t.purpose || t.analysis?.summary || "Sin descripción.")}
        </p>
      </div>

      ${detailBlock(
        "Lo que necesita",
        t.requirements || "No se especificaron requisitos."
      )}

      ${relationshipBlock(t)}

      ${workflowBlock(
        t.analysis?.howToUse
      )}

      ${detailBlock(
        "Ejemplo real del resultado",
        t.analysis?.exampleResult ||
        t.output ||
        "La herramienta no especificó un resultado."
      )}

      </div>

      <div class="lg:col-span-2">

        <div class="sticky top-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">

          <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <span class="text-xs font-medium">Código</span>

            <div class="flex gap-1">
              <button
                id="copyCode"
                class="rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Copiar código"
              >
                ${icon("copy", "h-4 w-4")}
              </button>

              <button
                id="downloadCode"
                class="rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Descargar código"
              >
                ${icon("download", "h-4 w-4")}
              </button>
            </div>
          </div>

          <pre class="code-font max-h-[65vh] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words bg-slate-950 p-4 text-xs leading-5 text-slate-100 scrollbar"><code>${escapeHtml(t.code || "Código no disponible.")}</code></pre>

        </div>

      </div>

    </div>
  `;

  const copy =
    document.getElementById(
      "copyCode"
    );

  if (copy) {
    copy.onclick =
      async () => {
        await navigator.clipboard.writeText(
          t.code || ""
        );

        toast("Código copiado.");
      };
  }

  const download =
    document.getElementById(
      "downloadCode"
    );

  if (download) {
    download.onclick =
      () => {
        downloadText(
          t.code || "",
          `${slugify(t.name)}.${extensionFor(t.language)}`
        );
      };
  }

  const detailModal =
    document.getElementById(
      "detailModal"
    );

  if (detailModal) {

    detailModal.classList.remove(
      "hidden"
    );
  }

  refreshIcons();
}

function detailBlock(
  title,
  text
) {

  if (!text) return "";

  return `

    <div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">

      <h3 class="font-semibold">
        ${escapeHtml(title)}
      </h3>

      <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
        ${escapeHtml(text)}
      </p>

    </div>

  `;
}

function workflowBlock(text) {

  const steps =
    String(
      text ||
      "Sigue las instrucciones indicadas para ejecutar la herramienta."
    )
      .split(/\r?\n+/)
      .map(
        step =>
          step
            .replace(/^\s*(?:\d+[.)]|[-*])\s*/, "")
            .trim()
      )
      .filter(Boolean);

  return `

    <div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">

      <h3 class="font-semibold">
        Cómo se trabaja
      </h3>

      <div class="mt-3 space-y-2">

        ${steps
          .map(
            (step, index) => `
              <div class="workflow-step flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                  ${index + 1}
                </span>
                <p class="pt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  ${escapeHtml(step)}
                </p>
              </div>
            `
          )
          .join("")}

      </div>

    </div>

  `;
}

function relationshipBlock(tool) {

  const previous =
    tools.filter(
      candidate =>
        (tool.dependsOn || []).includes(candidate.id)
    );

  const next =
    tools.filter(
      candidate =>
        (candidate.dependsOn || []).includes(tool.id)
    );

  if (!previous.length && !next.length) {
    return "";
  }

  const toolNames = list =>
    list
      .map(
        item => `
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800">
            ${escapeHtml(item.name)}
          </span>
        `
      )
      .join("");

  return `

    <div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <div class="flex items-center gap-2">
        ${icon("git-branch", "h-4 w-4 text-slate-500")}
        <h3 class="font-semibold">Flujo relacionado</h3>
      </div>

      ${previous.length
        ? `
          <p class="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Se ejecuta después de</p>
          <div class="mt-2 flex flex-wrap gap-2">${toolNames(previous)}</div>
        `
        : ""
      }

      ${next.length
        ? `
          <p class="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Después se puede ejecutar</p>
          <div class="mt-2 flex flex-wrap gap-2">${toolNames(next)}</div>
        `
        : ""
      }
    </div>

  `;
}

function slugify(text) {

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_|_$/g,
      ""
    );
}

function extensionFor(language) {

  return {

    PowerShell: "ps1",
    Python: "py",
    SQL: "sql",
    JavaScript: "js",
    VBA: "bas",
    Batch: "bat",
    PHP: "php"

  }[language] || "txt";
}

function downloadText(
  text,
  filename
) {

  const blob =
    new Blob(
      [text],
      {
        type:
          "text/plain;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      "a"
    );

  a.href = url;

  a.download =
    filename;

  a.click();

  URL.revokeObjectURL(
    url
  );
}

/* =========================================================
   ANÁLISIS LOCAL
   ========================================================= */

function analyzeCode(
  code,
  context
) {

  const lower =
    code.toLowerCase();

  const actions = [];

  const destructive =
    /(remove-item|del\s|erase\s|rmdir|drop\s+table|truncate\s+table|delete\s+from|format-volume|stop-computer|restart-computer)/i
      .test(code);

  const writes =
    /(set-content|add-content|out-file|move-item|copy-item|rename-item|export-csv|set-item|new-item|>\s*["'])/i
      .test(code);

  const network =
    /(invoke-webrequest|invoke-restmethod|curl|wget|httpclient|fetch\()/i
      .test(code);

  const exec =
    /(start-process|invoke-expression|\biex\b|cmd\.exe|powershell\.exe|python\.exe)/i
      .test(code);

  const reads =
    /(get-childitem|get-content|import-csv|read|select-string|open\()/i
      .test(code);

  if (reads)
    actions.push(
      "Lee archivos o datos"
    );

  if (writes)
    actions.push(
      "Crea o modifica archivos"
    );

  if (network)
    actions.push(
      "Realiza conexiones de red"
    );

  if (exec)
    actions.push(
      "Ejecuta procesos o comandos"
    );

  if (destructive)
    actions.push(
      "Contiene operaciones potencialmente destructivas"
    );

  if (!actions.length)
    actions.push(
      "No se detectaron patrones comunes"
    );

  let risk =
    "bajo";

  let riskReason =
    "No se detectaron operaciones destructivas comunes.";

  if (destructive) {

    risk =
      "alto";

    riskReason =
      "El código contiene patrones que pueden eliminar, truncar o detener recursos. Revisar manualmente antes de ejecutarlo.";

  } else if (
    writes ||
    network ||
    exec
  ) {

    risk =
      "medio";

    riskReason =
      "El código puede modificar archivos, conectarse a red o ejecutar procesos. Revisar rutas, permisos y parámetros.";
  }

  return {

    summary:
      context?.purpose ||
      "Herramienta registrada por el usuario.",

    detectedActions:
      actions,

    risk,

    riskReason
  };
}


/* =========================================================
   GEMINI
   ========================================================= */

const GEMINI_KEY_STORAGE =
  "toolbox-ia-gemini-key";

let aiAnalyzedTool =
  null;

let editingToolId =
  null;

function getGeminiKey() {

  return (
    sessionStorage.getItem(
      GEMINI_KEY_STORAGE
    ) || ""
  );
}

function openAiSettings() {

  const modal =
    document.getElementById(
      "aiModal"
    );

  const input =
    document.getElementById(
      "geminiKey"
    );

  if (!modal) return;

  if (input) {

    input.value =
      getGeminiKey();
  }

  modal.classList.remove(
    "hidden"
  );

  refreshIcons();
}

function closeAiSettings() {

  const modal =
    document.getElementById(
      "aiModal"
    );

  if (modal) {

    modal.classList.add(
      "hidden"
    );
  }
}

function saveAiKey() {

  const input =
    document.getElementById(
      "geminiKey"
    );

  const key =
    input?.value.trim() ||
    "";

  if (!key) {

    toast(
      "Pega una API Key de Gemini."
    );

    return;
  }

  sessionStorage.setItem(
    GEMINI_KEY_STORAGE,
    key
  );

  closeAiSettings();

  toast(
    "API Key guardada para esta sesión."
  );
}

function clearAiKey() {

  sessionStorage.removeItem(
    GEMINI_KEY_STORAGE
  );

  const input =
    document.getElementById(
      "geminiKey"
    );

  if (input)
    input.value = "";

  toast(
    "API Key eliminada."
  );
}


/* =========================================================
   PROMPT PARA GEMINI
   ========================================================= */

function buildGeminiPrompt(
  code
) {

  return `

Eres el analista técnico de una biblioteca interna de automatizaciones.

El usuario SOLO va a pegar código.

Tu trabajo es analizarlo SIN EJECUTARLO y completar automáticamente la ficha de una herramienta para que otra persona pueda entenderla.

IMPORTANTE:

No necesitas que el usuario escriba documentación.

Debes deducir la documentación directamente del código.

NO INVENTES información.

Si algo no puede determinarse con seguridad escribe:

"No determinado"

Analiza especialmente:

- lenguaje utilizado
- propósito real
- problema que resuelve
- archivos y carpetas utilizados
- entradas necesarias
- resultados producidos
- dependencias
- permisos
- versiones necesarias
- operaciones de lectura
- operaciones de escritura
- movimientos
- copias
- renombrados
- eliminaciones
- conexiones de red
- bases de datos
- comandos externos
- pasos de utilización
- ejemplo concreto del resultado antes y después
- advertencias
- nivel de riesgo

IMPORTANTE:

NO ejecutes el código.

NO modifiques el código.

NO inventes rutas.

NO inventes archivos.

NO inventes dependencias.

Devuelve EXCLUSIVAMENTE JSON válido.

Utiliza exactamente esta estructura:

{
  "name": "",
  "language": "",
  "category": "",
  "purpose": "",
  "problem": "",
  "requirements": "",
  "output": "",
  "exampleResult": "",
  "warnings": "",
  "howToUse": "",
  "inputs": "",
  "actions": "",
  "filesAffected": "",
  "risk": ""
}

SIGNIFICADO DE LOS CAMPOS:

name:
Nombre corto y claro de la herramienta.

language:
Lenguaje detectado.

category:
Categorías separadas por coma.

purpose:
Explica en lenguaje sencillo para qué sirve.

problem:
Explica qué tarea manual evita o simplifica.

requirements:
Todo lo que necesita para funcionar.

Incluye si detectas:

- Windows
- PowerShell
- Python
- módulos
- Excel
- PDF
- carpetas
- archivos
- permisos
- rutas
- unidades de red
- bases de datos
- programas externos

output:
Explica exactamente qué resultado produce.

exampleResult:
Escribe un ejemplo concreto, fácil de comprobar y explicado con palabras reales.
Debes inspeccionar el código antes de responder y detectar textos literales usados en -replace, .Replace(), Rename-Item, expresiones regulares, prefijos o sufijos.
Si el código cambia un texto, muestra exactamente: "Pasó de TEXTO_ORIGINAL a TEXTO_NUEVO".
Si cambia el nombre de un archivo, muestra también la extensión: "archivo_original.pdf -> archivo_nuevo.pdf".
Ejemplo de formato: "Pasó de HCCONTROLPRENATAL a _HCCONTROLPRENATAL_".
Ese ejemplo solo explica el formato: reemplázalo por los valores reales encontrados en el código.
No escribas "No determinado" si el código contiene el texto original, el texto nuevo, un prefijo, un sufijo o una regla clara de reemplazo.
Usa "No determinado" únicamente cuando después de revisar todo el código no exista ninguna transformación concreta que pueda ejemplificarse.

warnings:
Advierte sobre:

- eliminación
- modificación
- sobrescritura
- movimiento
- permisos
- rutas
- ejecución de comandos
- datos sensibles
- operaciones irreversibles

Si el código modifica, renombra, mueve o elimina archivos, incluye siempre esta recomendación:
"Haz una copia de respaldo y prueba primero sobre una copia; no trabajes sobre los archivos originales."

howToUse:
Explica cómo se trabaja con la herramienta en pasos simples y concretos.
Devuelve cada paso en una línea separada y numerada, usando exactamente este estilo:
1. Abrir la carpeta de pacientes.
2. Escribir la ruta del archivo Excel.
3. Confirmar el procesamiento.
4. Revisar el resultado generado.
Usa verbos de acción y palabras que entienda una persona no técnica.

inputs:
Archivos, carpetas, parámetros, rutas o datos necesarios.

actions:
Explica las principales acciones que realiza internamente.

filesAffected:
Archivos y carpetas que puede leer, crear, modificar, copiar, mover, renombrar o eliminar.

risk:
Debe ser solamente:

bajo

medio

alto

Criterios:

bajo:
Solo lectura, consulta o análisis.

medio:
Modifica archivos, crea archivos, copia, mueve, renombra, utiliza red o ejecuta procesos.

alto:
Elimina datos, borra archivos, modifica recursos críticos o realiza operaciones potencialmente destructivas.

CÓDIGO A ANALIZAR:

==================================================

${code}

==================================================

Devuelve únicamente el JSON.
`;
}


/* =========================================================
   ESPERA
   ========================================================= */

function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


/* =========================================================
   LLAMADA A GEMINI
   ========================================================= */

async function callGeminiModel(
  apiKey,
  model,
  code
) {

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          contents: [

            {

              role: "user",

              parts: [

                {
                  text:
                    buildGeminiPrompt(
                      code
                    )
                }

              ]

            }

          ],

          generationConfig: {

            temperature: 0.1,

            responseMimeType:
              "application/json"
          }

        })
      }
    );

  const raw =
    await response.text();

  let payload = {};

  try {

    payload =
      JSON.parse(raw);

  } catch {

    payload = {};
  }

  if (!response.ok) {

    const message =
      payload?.error?.message ||
      `HTTP ${response.status}`;

    const error =
      new Error(
        `${response.status}: ${message}`
      );

    error.status =
      response.status;

    throw error;
  }

  const text =
    payload
      ?.candidates?.[0]
      ?.content?.parts
      ?.map(
        p => p.text || ""
      )
      .join("")
      .trim();

  if (!text) {

    throw new Error(
      "Gemini no devolvió una respuesta."
    );
  }

  try {

    return JSON.parse(
      text
    );

  } catch {

    const cleaned =
      text
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();

    try {

      return JSON.parse(
        cleaned
      );

    } catch {

      throw new Error(
        "Gemini respondió, pero el resultado no llegó en JSON válido."
      );
    }
  }
}


/* =========================================================
   ANALIZADOR CON SISTEMA DE RESPALDO
   ========================================================= */

async function analyzeWithGemini(
  code
) {

  const key =
    getGeminiKey();

  if (!key) {

    throw new Error(
      "No hay API Key. Abre Configurar IA en el menú lateral."
    );
  }

  /*
   * IMPORTANTE:
   *
   * No todos los modelos necesariamente estarán
   * disponibles para todos los proyectos.
   *
   * Si uno responde 404, 429 o 503,
   * intentamos el siguiente.
   */

 const models = [

    "gemini-3.7-flash",

    "gemini-3.8-flash",

    "gemini-3.6-flash",

    "gemini-3.5-flash",

    "gemini-3.5-flash-lite",

    "gemini-3.1-flash-lite"

];

  const errors = [];

  for (
    let i = 0;
    i < models.length;
    i++
  ) {

    const model =
      models[i];

    showAiStatus(

      "loading",

      `Analizando con ${model}...`,

      `Intento ${i + 1} de ${models.length}.`

    );

    try {

      const result =
        await callGeminiModel(
          key,
          model,
          code
        );

      console.log(
        `Gemini respondió correctamente usando ${model}.`
      );

      return result;

    } catch (error) {

      console.warn(
        `Falló ${model}:`,
        error
      );

      errors.push(
        `${model}: ${error.message}`
      );

      /*
       * Errores de autenticación.
       */

      if (
        [
          400,
          401,
          403
        ].includes(
          error.status
        )
      ) {

        throw error;
      }

      /*
       * 404
       * modelo no disponible
       *
       * 429
       * límite
       *
       * 503
       * alta demanda
       */

      if (
        [
          404,
          429,
          503
        ].includes(
          error.status
        )
      ) {

        if (
          i <
          models.length - 1
        ) {

          const wait =
            error.status === 429
              ? 1800
              : 1000;

          await sleep(
            wait
          );

          continue;
        }
      }

      /*
       * Otros errores.
       */

      if (
        i <
        models.length - 1
      ) {

        await sleep(
          700
        );

        continue;
      }
    }
  }

  throw new Error(

    "No fue posible analizar la herramienta con los modelos disponibles.\n\n" +

    errors.join("\n")

  );
}


/* =========================================================
   CAMPOS
   ========================================================= */

function setField(
  id,
  value
) {

  const el =
    document.getElementById(
      id
    );

  if (el) {

    el.value =
      value || "";
  }
}


/* =========================================================
   LLENAR FORMULARIO
   ========================================================= */

function fillFormFromAI(
  result
) {

  setField(
    "fName",
    result.name
  );

  setField(
    "fLanguage",
    result.language
  );

  setField(
    "fCategories",
    result.category
  );

  setField(
    "fPurpose",
    result.purpose
  );

  setField(
    "fRequirements",
    result.requirements
  );

  setField(
    "fHowToUse",
    result.howToUse
  );

  setField(
    "fExampleResult",
    result.exampleResult || result.output
  );
}

function concreteExample(
  value,
  code
) {
  const text =
    String(value || "").trim();

  if (
    text &&
    !/no determinado|no se puede determinar/i.test(text)
  ) {
    return text;
  }

  const replaceMatch = code.match(
    /-replace\s+(["'])(.*?)\1\s*,\s*(["'])(.*?)\3/is
  );

  if (replaceMatch) {
    return `Pasó de ${replaceMatch[2]} a ${replaceMatch[4]}.`;
  }

  const methodMatch = code.match(
    /\.Replace\(\s*(["'])(.*?)\1\s*,\s*(["'])(.*?)\3\s*\)/is
  );

  if (methodMatch) {
    return `Pasó de ${methodMatch[2]} a ${methodMatch[4]}.`;
  }

  return text || "No determinado";
}


/* =========================================================
   ESTADO DE IA
   ========================================================= */

function showAiStatus(
  type,
  title,
  message = ""
) {

  const el =
    document.getElementById(
      "aiStatus"
    );

  if (!el) return;

  const styles = {

    loading:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",

    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",

    error:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
  };

  const icons = {

    loading:
      "loader-circle",

    success:
      "circle-check",

    error:
      "circle-alert"
  };

  el.className =
    `rounded-2xl border p-4 text-sm ${
      styles[type] ||
      styles.loading
    }`;

  el.innerHTML = `

    <div class="flex items-start gap-3">

      ${icon(

        icons[type] ||
        "info",

        `h-5 w-5 shrink-0 ${
          type === "loading"
            ? "animate-spin"
            : ""
        }`

      )}

      <div>

        <strong>
          ${escapeHtml(title)}
        </strong>

        ${
          message

            ? `

              <div class="mt-1 text-xs leading-5">

                ${escapeHtml(
                  message
                )}

              </div>

            `

            : ""
        }

      </div>

    </div>

  `;

  el.classList.remove(
    "hidden"
  );

  refreshIcons();
}


/* =========================================================
   ENVIAR FORMULARIO
   ========================================================= */

async function submitTool(e) {

  e.preventDefault();

  const code =
    document
      .getElementById(
        "fCode"
      )
      ?.value
      .trim();

  if (!code) {

    toast(
      "Pega primero el código de la herramienta."
    );

    return;
  }

  if (!getGeminiKey()) {

    openAiSettings();

    toast(
      "Configura primero la API Key de Gemini."
    );

    return;
  }

  const button =
    document.getElementById(
      "analyzeButton"
    );

  const label =
    document.getElementById(
      "analyzeButtonLabel"
    );

  if (button) {

    button.disabled =
      true;
  }

  if (label) {

    label.innerHTML =
      `${icon(
        "loader-circle",
        "h-4 w-4 animate-spin"
      )} Analizando...`;

    refreshIcons();
  }

  showAiStatus(

    "loading",

    "Analizando el código...",

    "La IA está leyendo la herramienta. El código no se ejecutará."

  );

  try {

    const result =
      await analyzeWithGemini(
        code
      );

    console.log(
      "Resultado de Gemini:",
      result
    );

    result.exampleResult =
      concreteExample(
        result.exampleResult || result.output,
        code
      );

    aiAnalyzedTool = {

      id:
        crypto.randomUUID(),

      name:
        result.name ||
        "Herramienta sin nombre",

      language:
        result.language ||
        "Otro",

      categories:
        (
          result.category ||
          ""
        )
          .split(",")
          .map(
            x =>
              x.trim()
          )
          .filter(
            Boolean
          ),

      code,

      purpose:
        result.purpose ||
        "",

      problem:
        result.problem ||
        "",

      requirements:
        result.requirements ||
        "",

      output:
        result.output ||
        "",

      warnings:
        result.warnings ||
        "",

      createdAt:
        new Date().toISOString(),

      analysis: {

        summary:
          result.purpose ||
          "",

        detectedActions:
          result.actions
            ? [
                result.actions
              ]
            : [],

        risk:
          String(
            result.risk ||
            "desconocido"
          ).toLowerCase(),

        riskReason:
          result.warnings ||
          "",

        howToUse:
          result.howToUse ||
          "",

        exampleResult:
          result.exampleResult ||
          result.output ||
          "",

        inputs:
          result.inputs ||
          "",

        filesAffected:
          result.filesAffected ||
          "",

        ai:
          true
      }
    };

    fillFormFromAI(
      result
    );

    showAiStatus(

      "success",

      "Análisis completado",

      "La IA llenó automáticamente la ficha. Revisa los campos y pulsa nuevamente el botón para guardar la herramienta."

    );

    if (label) {

      label.innerHTML =
        `${icon(
          "save",
          "h-4 w-4"
        )} Guardar herramienta`;

      refreshIcons();
    }

    toast(
      "La IA completó la ficha automáticamente."
    );

  } catch (error) {

    console.error(
      "Gemini:",
      error
    );

    showAiStatus(

      "error",

      "No se pudo analizar la herramienta",

      error.message ||
      "Error desconocido."
    );

    toast(
      "Error de Gemini. Revisa el mensaje mostrado."
    );

  } finally {

    if (button) {

      button.disabled =
        false;
    }

    refreshIcons();
  }
}


/* =========================================================
   GUARDAR HERRAMIENTA
   ========================================================= */

function saveAnalyzedToolFromForm() {

  const action =
    editingToolId
      ? "edit"
      : "create";

  const actionId =
    editingToolId ||
    "new";

  const actionToken =
    createAdminActionToken(
      action,
      actionId
    );

  if (!consumeAdminActionToken(actionToken, action, actionId)) {
    toast("Necesitas iniciar sesión como administrador.");
    return false;
  }

  if (!aiAnalyzedTool) {

    toast(
      "Primero analiza el código con la IA."
    );

    return false;
  }

  const name =
    document
      .getElementById(
        "fName"
      )
      ?.value
      .trim();

  const language =
    document
      .getElementById(
        "fLanguage"
      )
      ?.value ||
    aiAnalyzedTool.language;

  const categories =
    (
      document
        .getElementById(
          "fCategories"
        )
        ?.value ||
      ""
    )
      .split(",")
      .map(
        x =>
          x.trim()
      )
      .filter(
        Boolean
      );

  const purpose =
    document
      .getElementById(
        "fPurpose"
      )
      ?.value
      .trim() || "";

  const requirements =
    document
      .getElementById(
        "fRequirements"
      )
      ?.value
      .trim() || "";

  const howToUse =
    document
      .getElementById(
        "fHowToUse"
      )
      ?.value
      .trim() || "";

  const exampleResult =
    document
      .getElementById(
        "fExampleResult"
      )
      ?.value
      .trim() || "";

  const tool = {

    ...aiAnalyzedTool,

    name:
      name ||
      aiAnalyzedTool.name,

    language,

    categories,

    purpose,

    problem:
      aiAnalyzedTool.problem ||
      "",

    requirements,

    dependsOn:
      aiAnalyzedTool.dependsOn ||
      [],

    output: exampleResult,

    warnings:
      aiAnalyzedTool.warnings ||
      "",

    analysis: {
      ...(aiAnalyzedTool.analysis || {}),
      howToUse,
      exampleResult
    }
  };

  const existingIndex =
    editingToolId
      ? tools.findIndex(
          x => x.id === editingToolId
        )
      : -1;

  if (existingIndex >= 0) {
    tools[existingIndex] = tool;
  } else {
    tools.unshift(
      tool
    );
  }

  saveTools();

  aiAnalyzedTool =
    null;

  editingToolId =
    null;

  const form =
    document.getElementById(
      "toolForm"
    );

  if (form) {

    form.reset();
  }

  const status =
    document.getElementById(
      "aiStatus"
    );

  if (status) {

    status.classList.add(
      "hidden"
    );
  }

  const label =
    document.getElementById(
      "analyzeButtonLabel"
    );

  if (label) {

    label.innerHTML =
      `${icon(
        "sparkles",
        "h-4 w-4"
      )} Analizar con IA`;
  }

  renderAll();

  showView(
    "tools"
  );

  toast(
    existingIndex >= 0
      ? "Cambios guardados."
      : "Herramienta guardada en la biblioteca."
  );

  return true;
}


/* =========================================================
   EXPORTAR
   ========================================================= */

function exportLibrary() {

  const blob =
    new Blob(

      [
        JSON.stringify(
          tools,
          null,
          2
        )
      ],

      {
        type:
          "application/json"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      "a"
    );

  a.href =
    url;

  a.download =
    "toolbox-ia-biblioteca.json";

  a.click();

  URL.revokeObjectURL(
    url
  );
}


/* =========================================================
   IMPORTAR
   ========================================================= */

function importLibrary(
  file
) {

  const actionToken =
    createAdminActionToken(
      "import",
      "library"
    );

  if (!consumeAdminActionToken(actionToken, "import", "library")) {
    toast("Necesitas iniciar sesión como administrador.");
    return;
  }

  const reader =
    new FileReader();

  reader.onload =
    () => {

      try {

        const imported =
          JSON.parse(
            reader.result
          );

        if (
          !Array.isArray(
            imported
          )
        ) {

          throw new Error(
            "Formato inválido"
          );
        }

        tools =
          imported;

        saveTools();

        renderAll();

        toast(
          `Se importaron ${tools.length} herramientas.`
        );

      } catch {

        toast(
          "El archivo JSON no tiene un formato válido."
        );
      }
    };

  reader.readAsText(
    file
  );
}


/* =========================================================
   CAMBIO DE VISTAS
   ========================================================= */

function showView(
  view,
  options = {}
) {

  const currentView =
    document.querySelector(
      ".view:not(.hidden)"
    )?.id.replace(
      "view-",
      ""
    );

  if (
    options.updateHistory !== false &&
    currentView !== view
  ) {
    history.pushState(
      { view },
      "",
      `#${view}`
    );
  }

  document
    .querySelectorAll(
      ".view"
    )
    .forEach(
      x =>
        x.classList.add(
          "hidden"
        )
    );

  const target =
    document.getElementById(
      `view-${view}`
    );

  if (target) {

    target.classList.remove(
      "hidden"
    );

    target.classList.remove(
      "view-fade-in"
    );

    void target.offsetWidth;

    target.classList.add(
      "view-fade-in"
    );
  }

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      x => {

        const active =
          x.dataset.view ===
          view;

        x.classList.toggle(
          "bg-slate-100",
          active
        );

        x.classList.toggle(
          "dark:bg-slate-800",
          active
        );

        x.classList.toggle(
          "text-slate-600",
          !active
        );

        x.classList.toggle(
          "dark:text-slate-300",
          !active
        );
      }
    );

  const titles = {

    dashboard: [
      "Inicio",
      "Tus automatizaciones en un solo lugar"
    ],

    tools: [
      "Biblioteca",
      "Consulta las herramientas disponibles"
    ],

    new: [
      "Agregar herramienta",
      "Pega el código y deja que la IA documente automáticamente la herramienta"
    ],

    import: [
      "Importar / exportar",
      "Gestiona una copia de tu biblioteca"
    ]
  };

  const title =
    document.getElementById(
      "pageTitle"
    );

  const subtitle =
    document.getElementById(
      "pageSubtitle"
    );

  if (title) {

    title.textContent =
      titles[view]?.[0] ||
      "";
  }

  if (subtitle) {

    subtitle.textContent =
      titles[view]?.[1] ||
      "";
  }

  const sidebar =
    document.getElementById(
      "sidebar"
    );

  if (sidebar) {

    sidebar.classList.add(
      "-translate-x-full"
    );
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderAll() {

  updateAdminControls();

  renderStats();

  renderRecent();

  updateCategoryFilter();

  updateRelationshipManager();

  renderLibrary();

  refreshIcons();
}

function updateAdminControls() {

  document
    .querySelectorAll(
      "[data-admin-only]"
    )
    .forEach(
      element => {
        element.classList.toggle(
          "hidden",
          !isAdmin()
        );
      }
    );

  updateAdminButton();
}


/* =========================================================
   TEMA
   ========================================================= */

function initTheme() {

  const saved =
    localStorage.getItem(
      THEME_KEY
    );

  const dark =
    saved ===
    "dark";

  document.documentElement
    .classList
    .toggle(
      "dark",
      dark
    );

  updateThemeButton();
}

function updateThemeButton() {

  const dark =
    document.documentElement
      .classList
      .contains(
        "dark"
      );

  const themeText =
    document.getElementById(
      "themeText"
    );

  const iconEl =
    document.getElementById(
      "themeIcon"
    );

  if (themeText) {

    themeText.textContent =
      dark
        ? "Modo claro"
        : "Modo oscuro";
  }

  if (iconEl) {

    iconEl.setAttribute(
      "data-lucide",
      dark
        ? "sun"
        : "moon"
    );
  }

  refreshIcons();
}


/* =========================================================
   EVENTOS
   ========================================================= */

document.addEventListener(
  "click",
  e => {

    const relationChoice =
      e.target.closest(
        "[data-relation-slot]"
      );

    if (relationChoice) {
      selectedRelation[
        relationChoice.dataset.relationSlot
      ] = relationChoice.dataset.toolId;
      updateRelationshipManager();
      return;
    }

    const addRelationButton =
      e.target.closest(
        "#addRelation"
      );

    if (addRelationButton) {
      addRelationship();
      return;
    }

    const removeRelationButton =
      e.target.closest(
        "[data-remove-relation]"
      );

    if (removeRelationButton) {
      removeRelationship(
        removeRelationButton.dataset.removeRelation,
        removeRelationButton.dataset.previousId
      );
      return;
    }

    const kpi =
      e.target.closest(
        "[data-kpi-filter]"
      );

    if (kpi) {
      const search =
        document.getElementById(
          "toolSearch"
        );

      const category =
        document.getElementById(
          "categoryFilter"
        );

      if (search) {
        search.value =
          kpi.dataset.kpiFilter === "all"
            ? ""
            : kpi.dataset.kpiFilter;
      }

      if (category) {
        category.value = "";
      }

      showView("tools");
      renderLibrary();
      return;
    }

    const adminAccess =
      e.target.closest(
        "#adminAccess"
      );

    if (adminAccess) {
      requestAdminAccess();
      return;
    }

    const editButton =
      e.target.closest(
        "[data-edit-tool]"
      );

    if (editButton) {

      editTool(
        editButton.dataset.editTool
      );

      return;
    }

    const deleteButton =
      e.target.closest(
        "[data-delete-tool]"
      );

    if (deleteButton) {

      deleteTool(
        deleteButton.dataset.deleteTool
      );

      return;
    }

    const cancelToolForm =
      e.target.closest(
        "[data-cancel-tool-form]"
      );

    if (cancelToolForm) {
      resetToolForm();
    }

    const viewButton =
      e.target.closest(
        "[data-view]"
      );

    if (viewButton) {

      if (
        viewButton.hasAttribute("data-admin-only") &&
        !isAdmin()
      ) {
        toast("Necesitas iniciar sesión como administrador.");
        return;
      }

      if (viewButton.dataset.view === "new") {
        resetToolForm();
      }

      showView(
        viewButton.dataset.view
      );
    }

    const open =
      e.target.closest(
        "[data-open-tool]"
      );

    if (open) {

      openTool(
        open.dataset.openTool
      );
    }
  }
);


const adminForm =
  document.getElementById(
    "adminForm"
  );

if (adminForm) {
  adminForm.addEventListener(
    "submit",
    e => {
      e.preventDefault();
      authenticateAdmin();
    }
  );
}

const closeAdminModalButton =
  document.getElementById(
    "closeAdminModal"
  );

if (closeAdminModalButton) {
  closeAdminModalButton.addEventListener(
    "click",
    closeAdminAccess
  );
}

const cancelAdminModalButton =
  document.getElementById(
    "cancelAdminModal"
  );

if (cancelAdminModalButton) {
  cancelAdminModalButton.addEventListener(
    "click",
    closeAdminAccess
  );
}

const adminModal =
  document.getElementById(
    "adminModal"
  );

if (adminModal) {
  adminModal.addEventListener(
    "click",
    e => {
      if (e.target === adminModal) {
        closeAdminAccess();
      }
    }
  );
}

/* =========================================================
   FORMULARIO
   ========================================================= */

const toolForm =
  document.getElementById(
    "toolForm"
  );

if (toolForm) {

  toolForm.addEventListener(
    "submit",
    e => {

      if (!isAdmin()) {
        e.preventDefault();
        toast("Necesitas iniciar sesión como administrador.");
        return;
      }

      /*
       * Primera pulsación:
       *
       * Analiza con IA.
       */

      if (!aiAnalyzedTool) {

        submitTool(e);

        return;
      }


      /*
       * Segunda pulsación:
       *
       * Guarda la herramienta.
       */

      e.preventDefault();

      saveAnalyzedToolFromForm();
    }
  );
}


/* =========================================================
   BÚSQUEDA
   ========================================================= */

const toolSearch =
  document.getElementById(
    "toolSearch"
  );

if (toolSearch) {

  toolSearch.addEventListener(
    "input",
    e => {
      const globalSearch =
        document.getElementById(
          "globalSearch"
        );

      if (globalSearch) {
        globalSearch.value =
          e.target.value;
      }

      renderLibrary();
    }
  );
}


const categoryFilter =
  document.getElementById(
    "categoryFilter"
  );

if (categoryFilter) {

  categoryFilter.addEventListener(
    "change",
    renderLibrary
  );
}


const globalSearch =
  document.getElementById(
    "globalSearch"
  );

if (globalSearch) {

  globalSearch.addEventListener(
    "input",
    e => {

      const search =
        document.getElementById(
          "toolSearch"
        );

      if (search) {

        search.value =
          e.target.value;
      }

      const toolsView =
        document.getElementById(
          "view-tools"
        );

      if (toolsView?.classList.contains("hidden")) {
        showView("tools");
      }

      if (search) {
        search.focus();
        search.setSelectionRange(
          search.value.length,
          search.value.length
        );
      }

      renderLibrary();
    }
  );
}


/* =========================================================
   MODAL DE DETALLE
   ========================================================= */

const closeModal =
  document.getElementById(
    "closeModal"
  );

if (closeModal) {

  closeModal.addEventListener(
    "click",
    () => {

      const modal =
        document.getElementById(
          "detailModal"
        );

      if (modal) {

        modal.classList.add(
          "hidden"
        );
      }
    }
  );
}


const detailModal =
  document.getElementById(
    "detailModal"
  );

if (detailModal) {

  detailModal.addEventListener(
    "click",
    e => {

      if (
        e.target.id ===
        "detailModal"
      ) {

        e.currentTarget
          .classList
          .add(
            "hidden"
          );
      }
    }
  );
}


/* =========================================================
   MENU MÓVIL / SIDEBAR
   ========================================================= */

const mobileMenu =
  document.getElementById(
    "mobileMenu"
  );

if (mobileMenu) {

  mobileMenu.addEventListener(
    "click",
    () => {

      const sidebar =
        document.getElementById(
          "sidebar"
        );

      if (sidebar) {

        sidebar.classList.toggle(
          "-translate-x-full"
        );
      }
    }
  );
}


/* =========================================================
   TEMA
   ========================================================= */

const themeToggle =
  document.getElementById(
    "themeToggle"
  );

if (themeToggle) {

  themeToggle.addEventListener(
    "click",
    () => {

      const dark =
        !document.documentElement
          .classList
          .contains(
            "dark"
          );

      document.documentElement
        .classList
        .toggle(
          "dark",
          dark
        );

      localStorage.setItem(
        THEME_KEY,
        dark
          ? "dark"
          : "light"
      );

      updateThemeButton();
    }
  );
}


/* =========================================================
   CONFIGURACIÓN IA
   ========================================================= */

const aiSettings =
  document.getElementById(
    "aiSettings"
  );

if (aiSettings) {

  aiSettings.addEventListener(
    "click",
    openAiSettings
  );
}


const closeAiModal =
  document.getElementById(
    "closeAiModal"
  );

if (closeAiModal) {

  closeAiModal.addEventListener(
    "click",
    closeAiSettings
  );
}


const saveAiKeyButton =
  document.getElementById(
    "saveAiKey"
  );

if (saveAiKeyButton) {

  saveAiKeyButton.addEventListener(
    "click",
    saveAiKey
  );
}


const clearAiKeyButton =
  document.getElementById(
    "clearAiKey"
  );

if (clearAiKeyButton) {

  clearAiKeyButton.addEventListener(
    "click",
    clearAiKey
  );
}


const aiModal =
  document.getElementById(
    "aiModal"
  );

if (aiModal) {

  aiModal.addEventListener(
    "click",
    e => {

      if (
        e.target.id ===
        "aiModal"
      ) {

        closeAiSettings();
      }
    }
  );
}


/* =========================================================
   IMPORTAR / EXPORTAR
   ========================================================= */

const exportBtn =
  document.getElementById(
    "exportBtn"
  );

if (exportBtn) {

  exportBtn.addEventListener(
    "click",
    exportLibrary
  );
}


const importInput =
  document.getElementById(
    "importInput"
  );

if (importInput) {

  importInput.addEventListener(
    "change",
    e => {

      if (
        e.target.files &&
        e.target.files[0]
      ) {

        importLibrary(
          e.target.files[0]
        );
      }
    }
  );
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

const validViews = [
  "dashboard",
  "tools",
  "new",
  "import"
];

const hashView =
  window.location.hash.replace(
    "#",
    ""
  );

const initialView =
  validViews.includes(hashView)
    ? hashView
    : "dashboard";

history.replaceState(
  { view: initialView },
  "",
  `#${initialView}`
);

window.addEventListener(
  "popstate",
  e => {
    const view =
      validViews.includes(e.state?.view)
        ? e.state.view
        : "dashboard";

    showView(
      view,
      { updateHistory: false }
    );
  }
);

if (initialView !== "dashboard") {
  showView(
    initialView,
    { updateHistory: false }
  );
}

initTheme();

renderAll();

refreshIcons();

console.log(
  "Toolbox IA iniciado correctamente."
);