const STORAGE_KEY = "toolbox-ia-tools-v1";
const THEME_KEY = "toolbox-ia-theme";
const ADMIN_SESSION_KEY = "toolbox-ia-admin-session-v1";
const ADMIN_ACTION_PREFIX = "toolbox-ia-admin-action-v1-";
const ADMIN_SESSION_MS = 30 * 60 * 1000;
const AUTHORIZED_EMAIL = "banquezbetancourt15@gmail.com";
const SUPABASE_URL = "https://wzrvcioskqwixclbalzd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_i4YoocPM-VP4VodsO_lzBQ__Mxq77po";
const PUBLIC_APP_URL = "https://aj-banquez.github.io/AW-CODE/";
const supabaseClient = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
let currentUser = null;
let currentProfile = null;
let managedUsers = [];

const TOOL_CATEGORIES = [
  ["PowerShell", ["powershell"]],
  ["Excel", ["excel"]],
  ["Word", ["word"]],
  ["PowerPoint", ["powerpoint", "presentaciones"]],
  ["Outlook", ["outlook", "correo"]],
  ["Access", ["access"]],
  ["Power Automate", ["power automate", "powerautomate"]],
  ["Python", ["python"]],
  ["JavaScript", ["javascript", "js"]],
  ["TypeScript", ["typescript", "ts"]],
  ["Node.js", ["node", "node.js", "nodejs"]],
  ["React", ["react"]],
  ["PHP", ["php"]],
  ["SQL Server", ["sql server", "mssql", "sql"]],
  ["MySQL", ["mysql"]],
  ["PostgreSQL", ["postgres", "postgresql"]],
  ["Docker", ["docker"]],
  ["Git", ["git"]],
  ["GitHub", ["github"]],
  ["PDF", ["pdf"]],
  ["Windows", ["windows", "batch", "cmd"]],
  ["Linux", ["linux"]]
];

function normalizeCategory(value) {
  const text = String(value || "").trim().toLowerCase();
  const match = TOOL_CATEGORIES.find(([, aliases]) =>
    aliases.includes(text)
  );

  return match ? match[0] : "";
}

const inviteUserForm = document.getElementById("inviteUserForm");
if (inviteUserForm) {
  inviteUserForm.addEventListener("submit", async event => {
    event.preventDefault();
    await callUserAdmin("invite", {
      email: document.getElementById("inviteUserEmail")?.value,
      rol: document.getElementById("inviteUserRole")?.value,
      limiteMensual: 10
    });
    inviteUserForm.reset();
    await loadManagedUsers();
  });
}

function normalizeTechnology(value) {
  const text = String(value || "").trim().toLowerCase();
  const exactMatch = normalizeCategory(value);

  if (exactMatch) return exactMatch;

  const match = TOOL_CATEGORIES.find(([, aliases]) =>
    aliases.some(alias => text.includes(alias))
  );

  return match ? match[0] : String(value || "").trim();
}

function normalizeCategories(categories, language = "", context = "") {
  const values = Array.isArray(categories) ? categories : [];
  const normalized = values
    .map(normalizeCategory)
    .filter(Boolean);
  const searchableContext = [
    language,
    context,
    ...values
  ].join(" ").toLowerCase();

  TOOL_CATEGORIES.forEach(([category, aliases]) => {
    if (aliases.some(alias => searchableContext.includes(alias))) {
      normalized.push(category);
    }
  });

  return [...new Set(normalized)];
}

function finishInitialLoad() {
  document.getElementById("app")?.classList.add("is-ready");
  document.getElementById("appLoader")?.classList.add("is-hidden");
}

function protectSearchFields() {
  document.querySelectorAll("[data-search-field]").forEach(input => {
    input.value = "";
    input.addEventListener("pointerdown", () => {
      input.removeAttribute("readonly");
    }, { once: true });
    input.addEventListener("focus", () => {
      input.removeAttribute("readonly");
    });
    input.addEventListener("blur", () => {
      if (!input.value) input.setAttribute("readonly", "");
    });
  });
}

function isAuthorizedUser(user) {
  return Boolean(user?.email);
}

function getUserProfile(user = currentUser) {
  const email = user?.email?.toLowerCase() || "";
  const metadata = user?.user_metadata || {};
  const isOwner = email === AUTHORIZED_EMAIL;
  const name = isOwner
    ? "Armando Banquez"
    : metadata.full_name || metadata.name || email.split("@")[0] || "Usuario";
  const role = isOwner
    ? "Propietario"
    : currentProfile?.rol === "administrador"
      ? "Administrador"
      : "Creador";

  return {
    name,
    role,
    email,
    initials: name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "U"
  };
}

function updateUserProfile() {
  const profile = getUserProfile();
  const name = document.getElementById("headerUserName");
  const role = document.getElementById("headerUserRole");
  const email = document.getElementById("menuUserEmail");
  const avatar = document.getElementById("headerUserAvatar");

  if (!name || !role || !email || !avatar) return;

  name.textContent = profile.name;
  role.textContent = profile.role;
  email.textContent = profile.email;
  avatar.textContent = profile.initials;
  role.className = `role-badge ${
    profile.role === "Propietario" || profile.role === "Administrador"
      ? "role-manager"
      : "role-employee"
  }`;

  const menuName = document.getElementById("menuUserName");
  if (menuName) menuName.textContent = profile.name;
  fillProfileForm(profile);
}

function fillProfileForm(profile = getUserProfile()) {
  const metadata = currentUser?.user_metadata || {};
  const fields = {
    profileHeading: profile.name,
    profileRole: profile.role,
    profileAvatar: profile.initials,
    profileFullName: metadata.full_name || metadata.name || profile.name,
    profilePhone: metadata.phone || "",
    profileAge: metadata.age || "",
    profilePosition: metadata.position || profile.role,
    profileEmail: profile.email
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      if ("value" in element) element.value = value;
      else element.textContent = value;
    }
  });

  const profileRole = document.getElementById("profileRole");
  if (profileRole) {
    profileRole.className = `role-badge ${
      profile.role === "Propietario" || profile.role === "Administrador"
        ? "role-manager"
        : "role-employee"
    }`;
  }
}

async function saveUserProfile(event) {
  event.preventDefault();
  if (!supabaseClient || !currentUser) return;

  const fullName = document.getElementById("profileFullName")?.value.trim();
  const phone = document.getElementById("profilePhone")?.value.trim();
  const age = document.getElementById("profileAge")?.value.trim();
  const position = document.getElementById("profilePosition")?.value.trim();

  if (!fullName) {
    toast("Escribe tu nombre completo.");
    return;
  }

  const { data, error } = await supabaseClient.auth.updateUser({
    data: {
      ...currentUser.user_metadata,
      full_name: fullName,
      name: fullName,
      phone,
      age,
      position
    }
  });

  if (error) {
    toast(`No se pudo guardar el perfil: ${error.message}`);
    return;
  }

  currentUser = data.user;
  updateUserProfile();
  toast("Perfil actualizado.");
}

function updateAuthGate() {
  const gate = document.getElementById("authGate");
  const headerButton = document.getElementById("headerAuth");

  if (!gate) return;

  gate.classList.toggle("hidden", Boolean(currentUser));
  gate.classList.toggle("flex", !currentUser);

  if (headerButton) {
    headerButton.setAttribute(
      "aria-label",
      currentUser ? "Cerrar sesión" : "Iniciar sesión"
    );
    headerButton.setAttribute("aria-expanded", "false");
    refreshIcons();
  }
}

async function hashText(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getAdminSession() {
  return isOwner() || currentProfile?.rol === "administrador"
    ? { token: currentUser.id, expiresAt: Date.now() + ADMIN_SESSION_MS }
    : null;
}

function isAdmin() {
  return Boolean(getAdminSession());
}

function isManager(user = currentUser) {
  return user?.email?.toLowerCase() === AUTHORIZED_EMAIL;
}

function isOwner(user = currentUser) {
  return user?.email?.toLowerCase() === AUTHORIZED_EMAIL;
}

async function loadCurrentProfile() {
  currentProfile = null;

  if (!supabaseClient || !currentUser) return;

  const { data, error } = await supabaseClient
    .from("perfiles")
    .select("id, rol, activo, limite_mensual, password_set, invitacion_aceptada_en")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar el perfil de permisos.", error);
    return;
  }

  currentProfile = data;
}

function requiresPasswordSetup() {
  return Boolean(currentUser && !isOwner() && currentProfile?.password_set === false);
}

function isAccountBlocked() {
  return Boolean(currentUser && !isOwner() && currentProfile?.activo === false);
}

function showPasswordSetup() {
  const modal = document.getElementById("passwordSetupModal");
  if (modal) {
    modal.classList.remove("hidden");
    refreshIcons();
  }
}

async function completePasswordSetup(event) {
  event.preventDefault();
  const password = document.getElementById("setupPassword")?.value || "";
  const confirmation = document.getElementById("setupPasswordConfirm")?.value || "";
  if (password.length < 8 || password !== confirmation) {
    toast("Las contraseñas deben coincidir y tener al menos 8 caracteres.");
    return;
  }
  const { data, error } = await supabaseClient.auth.updateUser({ password });
  if (error) {
    toast(`No se pudo crear la contraseña: ${error.message}`);
    return;
  }
  const { error: profileError } = await supabaseClient
    .from("perfiles")
    .update({ password_set: true, invitacion_aceptada_en: new Date().toISOString() })
    .eq("id", data.user.id);
  if (profileError) {
    toast(`No se pudo activar la cuenta: ${profileError.message}`);
    return;
  }
  currentUser = data.user;
  await loadCurrentProfile();
  document.getElementById("passwordSetupModal")?.classList.add("hidden");
  const toolsData = await loadTools();
  tools = toolsData;
  normalizeToolRelationships();
  renderAll();
  toast("Cuenta activada correctamente.");
}

async function sendPasswordCode() {
  if (!currentUser?.email) return;
  const { error } = await supabaseClient.auth.signInWithOtp({
    email: currentUser.email,
    options: { shouldCreateUser: false }
  });
  toast(error
    ? `No se pudo enviar el código: ${error.message}`
    : "Código enviado a tu correo.");
}

async function changePasswordWithCode(event) {
  event.preventDefault();
  const token = document.getElementById("passwordOtp")?.value.trim();
  const password = document.getElementById("newPassword")?.value || "";
  if (!token || password.length < 8) {
    toast("Escribe el código y una contraseña de al menos 8 caracteres.");
    return;
  }
  const { error: verifyError } = await supabaseClient.auth.verifyOtp({
    email: currentUser.email,
    token,
    type: "email"
  });
  if (verifyError) {
    toast(`Código inválido: ${verifyError.message}`);
    return;
  }
  const { error } = await supabaseClient.auth.updateUser({ password });
  toast(error ? `No se pudo cambiar la contraseña: ${error.message}` : "Contraseña actualizada.");
  if (!error) event.target.reset();
}

function canCreateTools() {
  return Boolean(
    currentUser &&
    currentProfile?.activo !== false &&
    ["propietario", "administrador", "creador"].includes(
      currentProfile?.rol || (isOwner() ? "propietario" : "")
    )
  );
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
  if (!token || !canCreateTools()) return false;

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
  if (currentUser) {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        toast(`No se pudo cerrar sesión: ${error.message}`);
        return;
      }
    }

    currentUser = null;
    renderAll();
    updateAdminButton();
      updateAuthGate();
    showView("dashboard");
    toast("Sesión de administrador cerrada.");
    return;
  }

  window.location.href = "login.html";
}

async function authenticateAdmin() {
  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const modal = document.getElementById("adminModal");

  if (!emailInput || !passwordInput || !modal) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password || !supabaseClient) {
    toast(!supabaseClient
      ? "Supabase no está disponible."
      : "Escribe tu correo y contraseña.");
    return;
  }

  const result = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (result.error) {
    toast(`No se pudo autenticar: ${result.error.message}`);
    return;
  }

  if (!isAuthorizedUser(result.data.user)) {
    await supabaseClient.auth.signOut();
    toast("Este correo no está autorizado para entrar.");
    return;
  }

  currentUser = result.data.user;

  modal.classList.add("hidden");
  renderAll();
  updateAdminButton();
  updateAuthGate();
  toast("Sesión iniciada.");
}

async function authenticateWithGoogle() {
  if (!supabaseClient) {
    toast("Supabase no está disponible.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: PUBLIC_APP_URL
    }
  });

  if (error) {
    toast(`No se pudo iniciar con Google: ${error.message}`);
  }
}

function closeAdminAccess() {
  const modal = document.getElementById("adminModal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

function toggleUserMenu(force) {
  const menu = document.getElementById("userMenu");
  const button = document.getElementById("headerAuth");
  if (!menu || !button) return;

  const shouldOpen = typeof force === "boolean"
    ? force
    : menu.classList.contains("hidden");

  menu.classList.toggle("hidden", !shouldOpen);
  button.setAttribute("aria-expanded", String(shouldOpen));
}

function openUserProfile() {
  toggleUserMenu(false);
  fillProfileForm();
  showView("profile");
}

function updateAdminButton() {
  const button = document.getElementById("adminAccess");

  if (!button) return;

  button.querySelector("[data-admin-label]").textContent =
    isAdmin()
      ? "Cerrar sesión"
      : "Iniciar sesión";
}

const demoTools = [
  {
    id: crypto.randomUUID(),
    name: "Buscar último laboratorio",
    language: "PowerShell",
    categories: ["PDF", "PowerShell"],
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

async function loadTools() {
  if (!supabaseClient) return [];

  const fetchTools = () =>
    supabaseClient
      .from("herramientas")
      .select("*")
      .order("creado_en", { ascending: true });

  let { data, error } = await fetchTools();

  if (error) {
    console.error("No se pudo cargar la biblioteca desde Supabase.", error);
    toast("Se usará el catálogo local mientras se revisa Supabase.");
  }

  if (data?.length) {
    return data
      .map(mapDatabaseTool)
      .filter(tool => tool.id && tool.name);
  }

  ({ data, error } = await fetchTools());

  if (error) {
    console.error("No se pudo reintentar la carga de herramientas.", error);
    data = [];
  }

  if (data?.length) {
    return data
      .map(mapDatabaseTool)
      .filter(tool => tool.id && tool.name);
  }

  const legacyTools = await readLegacyTools();

  if (legacyTools.length) {
    if (currentUser) {
      tools = legacyTools;
      await syncToolsToSupabase();
      toast(`Se migraron ${legacyTools.length} herramientas a Supabase.`);
    }

    return legacyTools;
  }

  return [];
}

async function readLegacyTools() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .filter(item => item && typeof item === "object")
          .map(item => ({
            ...item,
            id: item.id || crypto.randomUUID(),
            createdBy: item.createdBy || null,
            createdAt: item.createdAt || new Date().toISOString(),
            categories: normalizeCategories(
              item.categories,
              item.language,
              item.name
            ),
            dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn : []
          }))
      }
    } catch (error) {
      console.error("No se pudo leer la biblioteca local para migrarla.", error);
    }
  }

  try {
    const response = await fetch("./tools/catalogo-herramientas.json", {
      cache: "no-store"
    });

    if (response.ok) {
      const item = await response.json();
      const catalog = Array.isArray(item) ? item : [item];

      return catalog
        .filter(value => value && typeof value === "object")
        .map(value => ({
          ...value,
          id: value.id || crypto.randomUUID(),
          createdBy: value.createdBy || null,
          createdAt: value.createdAt || new Date().toISOString(),
          categories: normalizeCategories(
            value.categories,
            value.language,
            value.name
          ),
          dependsOn: Array.isArray(value.dependsOn) ? value.dependsOn : []
        }));
    }
  } catch (error) {
    console.error("No se pudo leer el catálogo inicial.", error);
  }

  return [...demoTools];
}

let tools = [];
let selectedRelation = { from: "", to: "" };

function saveTools() {
  if (supabaseClient && currentUser) {
    syncToolsToSupabase();
  }
}

function mapDatabaseTool(row) {
  const rawDependencies = row.depende_de;
  const dependencies = Array.isArray(rawDependencies)
    ? rawDependencies
    : typeof rawDependencies === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(rawDependencies);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return {
    id: row.id,
    createdBy: row.creado_por || null,
    name: row.nombre,
    language: row.lenguaje,
    categories: normalizeCategories(
      row.categorias,
      row.lenguaje,
      row.nombre
    ),
    code: row.codigo || "",
    purpose: row.proposito || "",
    problem: row.problema || "",
    requirements: row.requisitos || "",
    output: row.salida || "",
    warnings: row.advertencias || "",
    analysis: row.analisis && typeof row.analisis === "object"
      ? row.analisis
      : {},
    dependsOn: dependencies,
    createdAt: row.creado_en
  };
}

function normalizeToolRelationships() {
  const byId = new Map(tools.map(tool => [String(tool.id), tool.id]));
  const byName = new Map(tools.map(tool => [tool.name.trim().toLowerCase(), tool.id]));

  tools.forEach(tool => {
    const dependencies = Array.isArray(tool.dependsOn) ? tool.dependsOn : [];
    tool.dependsOn = [...new Set(
      dependencies
        .map(value => {
          const reference = String(value).trim();
          return byId.get(reference) || byName.get(reference.toLowerCase()) || null;
        })
        .filter(id => id && id !== tool.id)
    )];
  });
}

function mapToolToDatabase(tool) {
  return {
    id: tool.id || crypto.randomUUID(),
    nombre: tool.name || "Herramienta sin nombre",
    lenguaje: tool.language || "Otro",
    categorias: Array.isArray(tool.categories) ? tool.categories : [],
    codigo: tool.code || "",
    proposito: tool.purpose || "",
    problema: tool.problem || "",
    requisitos: tool.requirements || "",
    salida: tool.output || "",
    advertencias: tool.warnings || "",
    analisis: tool.analysis || {},
    depende_de: Array.isArray(tool.dependsOn) ? tool.dependsOn : [],
    creado_en: tool.createdAt || new Date().toISOString(),
    creado_por: tool.createdBy || currentUser.id
  };
}

async function syncToolsToSupabase() {
  if (!tools.length) return;

  const rows = tools.map(mapToolToDatabase);

  const { error } = await supabaseClient
    .from("herramientas")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("No se pudo guardar la biblioteca remota.", error);
    toast("No se pudo guardar la biblioteca en Supabase.");
  }
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

async function confirmAction(title, text) {
  if (!window.Swal) return false;
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    buttonsStyling: false,
    customClass: {
      confirmButton: "rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white",
      cancelButton: "ml-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
    }
  });
  return result.isConfirmed;
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

function toolLanguageIcon(language, cls = "h-5 w-5", tool = {}) {
  const brands = [
    ["powershell", "ph-terminal-window", "#012456", "PowerShell"],
    ["excel", "ph-file-xls", "#107C41", "Excel"],
    ["word", "ph-file-doc", "#2B579A", "Word"],
    ["powerpoint|presentaciones", "ph-file-ppt", "#B7472A", "PowerPoint"],
    ["outlook|correo", "ph-envelope", "#0078D4", "Outlook"],
    ["access", "ph-database", "#A4373A", "Access"],
    ["power automate|powerautomate", "ph-arrows-clockwise", "#0066FF", "Power Automate"],
    ["python", "ph-python-logo", "#3776AB", "Python"],
    ["javascript|js", "ph-file-js", "#F7DF1E", "JavaScript", "dark"],
    ["typescript|ts", "ph-file-ts", "#3178C6", "TypeScript"],
    ["node|node.js|nodejs", "ph-nodes", "#339933", "Node.js"],
    ["react", "ph-atom", "#61DAFB", "React", "dark"],
    ["php", "ph-file-php", "#777BB4", "PHP"],
    ["sql server|mssql", "ph-database", "#CC2927", "SQL Server"],
    ["mysql", "ph-database", "#4479A1", "MySQL"],
    ["postgres|postgresql", "ph-database", "#4169E1", "PostgreSQL"],
    ["docker", "ph-package", "#2496ED", "Docker"],
    ["git", "ph-git-branch", "#F05032", "Git"],
    ["github", "ph-github-logo", "#181717", "GitHub"],
    ["pdf", "ph-file-pdf", "#EC1C24", "PDF"],
    ["windows|batch|cmd", "ph-windows-logo", "#0078D4", "Windows"],
    ["linux", "ph-linux-logo", "#FCC624", "Linux", "dark"]
  ];

  const languageContext = String(language || "").toLowerCase();
  const toolContext = [
    languageContext,
    tool.name,
    ...(Array.isArray(tool.categories) ? tool.categories : [])
  ]
    .join(" ")
    .toLowerCase();
  const languageBrand = brands.find(([terms]) =>
    terms.split("|").some(term => languageContext === term)
  );
  const brand = languageBrand || brands.find(([terms]) =>
    terms.split("|").some(term => toolContext.includes(term))
  );

  if (brand) {
    const iconColor = brand[4] === "dark" ? "#111827" : "#ffffff";
    const brandColor = brand[3] === "Python" ? "#ffffff" : brand[2];
    const glyph = brand[3] === "Python"
      ? '<svg viewBox="0 0 64 64" class="h-[1.6rem] w-[1.6rem]" aria-hidden="true"><path fill="#3776AB" d="M31.8 6C19.5 6 20.2 11.3 20.2 11.3v7.1h11.8v2.1H15.5S6 19.4 6 32c0 12.7 8.3 12.4 8.3 12.4h5v-7.4s-.3-8.8 8.6-8.8h11.8s6.6.1 6.6-6.4V12.9S47.3 6 31.8 6Zm-6.5 4.2c1.2 0 2.2 1 2.2 2.2s-1 2.2-2.2 2.2-2.2-1-2.2-2.2 1-2.2 2.2-2.2Z"/><path fill="#FFD343" d="M32.2 58C44.5 58 43.8 52.7 43.8 52.7v-7.1H32v-2.1h16.5S58 44.6 58 32c0-12.7-8.3-12.4-8.3-12.4h-5v7.4s.3 8.8-8.6 8.8H24.3s-6.6-.1-6.6 6.4v8.9S16.7 58 32.2 58Zm6.5-4.2c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2 2.2 1 2.2 2.2-1 2.2-2.2 2.2Z"/></svg>'
      : `<i class="tool-brand-glyph ph-duotone ${brand[1]} text-[1.6rem]" aria-hidden="true"></i>`;

    return `
      <span class="tool-brand-badge ${cls} inline-flex shrink-0 items-center justify-center rounded-xl border shadow-md ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/15" style="--brand-color:${brandColor}; --glyph-color:${iconColor}" title="${brand[3]}">
        ${glyph}
        <span class="sr-only">${brand[3]}</span>
      </span>
    `;
  }

  return icon(languageIcon(language), cls);
}

function toolTechnologyFlow(tool, cls = "h-10 w-10") {
  const technologies = [
    tool.language,
    ...(Array.isArray(tool.categories) ? tool.categories : [])
  ]
    .map(normalizeTechnology)
    .filter(Boolean)
    .filter((value, index, values) =>
      values.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index
    )
    .slice(0, 3);

  return `
    <div class="flex min-w-0 items-center gap-1.5" aria-label="${escapeHtml(technologies.join(" hacia "))}">
      ${technologies.map((technology, index) => `
        ${index ? icon("arrow-right", "h-4 w-4 shrink-0 text-slate-400") : ""}
        ${toolLanguageIcon(technology, cls, { name: technology, categories: [] })}
      `).join("")}
    </div>
  `;
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

  const sequence = (first, second) => {
    const firstStep = first.id === t.id;
    const secondStep = second.id === t.id;
    const activeStep = "bg-slate-900 text-white dark:bg-white dark:text-slate-900";
    const inactiveStep = "border border-slate-300 dark:border-slate-600";

    return `
    <div class="relationship-flow flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${firstStep ? activeStep : inactiveStep}">1</span>
      <span class="max-w-[38%] truncate font-medium" title="${escapeHtml(first.name)}">${escapeHtml(first.name)}</span>
      <span class="relationship-energy" aria-hidden="true"></span>
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${secondStep ? activeStep : inactiveStep}">2</span>
      <span class="max-w-[38%] truncate font-medium" title="${escapeHtml(second.name)}">${escapeHtml(second.name)}</span>
    </div>
  `;
  };

  return `
    <div class="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
      <p class="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span class="flex items-center gap-2">
        ${icon("git-branch", "h-3.5 w-3.5")}
        Flujo relacionado
        </span>
        <span class="relationship-status inline-flex items-center gap-1.5 normal-case tracking-normal">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400"></span>
          Conectada
        </span>
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

    <article data-tool-card="${escapeHtml(t.id)}" class="group relative z-10 flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">

      <div class="flex items-start justify-between gap-3">

        <div class="flex min-h-11 min-w-11 items-center rounded-xl bg-slate-100 px-1 dark:bg-slate-800">

          ${toolTechnologyFlow(t)}

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

              ${toolTechnologyFlow(t, "h-8 w-8")}

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

  renderLibrary();
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

function renderRelationshipConnectors(filtered) {
  const grid = document.getElementById("toolGrid");

  if (!grid) return;

  window.__relationshipObserver?.disconnect();
  window.__relationshipObserver = null;
  grid.querySelector("[data-relationship-layer]")?.remove();
  window.__relationshipFilteredTools = filtered;

  const relationships = [];

  filtered.forEach(target => {
    (target.dependsOn || []).forEach(previousId => {
      const source = filtered.find(tool => tool.id === previousId);

      if (source) {
        relationships.push({ source, target });
      }
    });
  });

  if (!relationships.length) return;

  const layer = document.createElement("div");
  layer.dataset.relationshipLayer = "true";
  layer.className = "relationship-layer";
  layer.innerHTML = `<svg class="relationship-canvas" aria-hidden="true" preserveAspectRatio="none">
    <defs>
      <marker id="relationship-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse">
        <path class="relationship-link-arrow" d="M1,1 L5,3 L1,5"></path>
      </marker>
    </defs>
    ${relationships.map(({ source, target }) => `
      <g class="relationship-link" data-relationship-link="${escapeHtml(source.id)}|${escapeHtml(target.id)}" aria-label="Conexión de ${escapeHtml(source.name)} a ${escapeHtml(target.name)}">
        <path class="relationship-link-path" marker-end="url(#relationship-arrow)"></path>
        <foreignObject class="relationship-step-source" width="48" height="48">
          <span xmlns="http://www.w3.org/1999/xhtml" class="relationship-step-badge bg-brand-softer text-fg-brand-strong text-xs font-medium px-1.5 py-0.5 rounded">1</span>
        </foreignObject>
        <foreignObject class="relationship-step-target" width="48" height="48">
          <span xmlns="http://www.w3.org/1999/xhtml" class="relationship-step-badge bg-brand-softer text-fg-brand-strong text-xs font-medium px-1.5 py-0.5 rounded">2</span>
        </foreignObject>
      </g>
    `).join("")}
  </svg>`;

  grid.appendChild(layer);
  const canvas = layer.querySelector(".relationship-canvas");
  const cards = Array.from(grid.querySelectorAll("[data-tool-card]"));

  const positionLinks = () => {
    const gridRect = grid.getBoundingClientRect();
    const canvasWidth = grid.clientWidth;
    const canvasHeight = grid.scrollHeight;

    canvas.setAttribute(
      "viewBox",
      `0 0 ${canvasWidth} ${canvasHeight}`
    );
    canvas.setAttribute("width", canvasWidth);
    canvas.setAttribute("height", canvasHeight);

    relationships.forEach(({ source, target }) => {
      const sourceCard = cards.find(card => card.dataset.toolCard === source.id);
      const targetCard = cards.find(card => card.dataset.toolCard === target.id);
      const link = layer.querySelector(`[data-relationship-link="${source.id}|${target.id}"]`);

      if (!sourceCard || !targetCard || !link) return;

      const sourceRect = sourceCard.getBoundingClientRect();
      const targetRect = targetCard.getBoundingClientRect();
      const sourceCenterY = sourceRect.top + sourceRect.height / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const sameRow = Math.abs(sourceCenterY - targetCenterY) < 36;
      const sourceAbove = sourceCenterY <= targetCenterY;
      const sourceX = sourceRect.left + sourceRect.width / 2 - gridRect.left + grid.scrollLeft;
      const targetX = targetRect.left + targetRect.width / 2 - gridRect.left + grid.scrollLeft;
      const sourceBottom = sourceRect.bottom - gridRect.top + grid.scrollTop;
      const targetTop = targetRect.top - gridRect.top + grid.scrollTop;
      const sourceTop = sourceRect.top - gridRect.top + grid.scrollTop;
      const targetBottom = targetRect.bottom - gridRect.top + grid.scrollTop;
      let startX = sourceX;
      let startY = sourceAbove ? sourceBottom : sourceTop;
      let endX = targetX;
      let endY = sourceAbove ? targetTop : targetBottom;
      let pathData;
      const sourceLabelX = sourceRect.left - gridRect.left + sourceRect.width / 2;
      let sourceLabelY = sourceRect.bottom - gridRect.top + grid.scrollTop - 18;
      const targetLabelX = targetRect.left - gridRect.left + targetRect.width / 2;
      let targetLabelY = targetRect.bottom - gridRect.top + grid.scrollTop - 18;

      if (sameRow) {
        const sourceBottomY = sourceRect.bottom - gridRect.top + grid.scrollTop;
        const targetBottomY = targetRect.bottom - gridRect.top + grid.scrollTop;
        const rowBottom = Math.max(sourceRect.bottom, targetRect.bottom);
        const nextRowTop = cards
          .map(card => card.getBoundingClientRect())
          .filter(rect => rect.top > rowBottom + 8)
          .reduce((top, rect) => Math.min(top, rect.top), Infinity);
        const spaceBelow = Number.isFinite(nextRowTop)
          ? nextRowTop - rowBottom
          : window.innerHeight - rowBottom;
        const previousRowBottom = cards
          .map(card => card.getBoundingClientRect())
          .filter(rect => rect.bottom < Math.min(sourceRect.top, targetRect.top) - 8)
          .reduce((bottom, rect) => Math.max(bottom, rect.bottom), -Infinity);
        const spaceAbove = Number.isFinite(previousRowBottom)
          ? Math.min(sourceRect.top, targetRect.top) - previousRowBottom
          : Math.min(sourceRect.top, targetRect.top) - gridRect.top;
        const routeBelow = Math.max(sourceBottomY, targetBottomY) + 16;
        const routeAbove = Math.min(sourceRect.top, targetRect.top) - gridRect.top - 16;
        const routeAboveIsAvailable = spaceAbove >= 34 && routeAbove > 8;
        const routeBelowIsAvailable = spaceBelow >= 34;
        const useAbove = !routeBelowIsAvailable && routeAboveIsAvailable;
        const routeY = useAbove ? routeAbove : routeBelow;

        startY = useAbove ? sourceRect.top - gridRect.top + grid.scrollTop : sourceBottomY;
        endY = useAbove ? targetRect.top - gridRect.top + grid.scrollTop : targetBottomY;
        sourceLabelY = useAbove
          ? sourceRect.top - gridRect.top + grid.scrollTop + 18
          : sourceBottomY - 18;
        targetLabelY = useAbove
          ? targetRect.top - gridRect.top + grid.scrollTop + 18
          : targetBottomY - 18;
        pathData = `M ${sourceX} ${startY} L ${sourceX} ${routeY} L ${targetX} ${routeY} L ${targetX} ${endY}`;
      } else {
        const midpointY = (startY + endY) / 2;
        pathData = `M ${startX} ${startY} L ${startX} ${midpointY} L ${endX} ${midpointY} L ${endX} ${endY}`;
      }

      link.querySelector(".relationship-link-path").setAttribute("d", pathData);
      const sourceBadge = link.querySelector(".relationship-step-source");
      const targetBadge = link.querySelector(".relationship-step-target");
      sourceBadge.setAttribute("x", sourceLabelX - 24);
      sourceBadge.setAttribute("y", sourceLabelY - 24);
      targetBadge.setAttribute("x", targetLabelX - 24);
      targetBadge.setAttribute("y", targetLabelY - 24);
    });
  };

  cards.forEach(card => {
    const toolId = card.dataset.toolCard;

    card.addEventListener("mouseenter", () => {
      layer.querySelectorAll(`[data-relationship-link*="${toolId}"]`).forEach(link => {
        link.classList.add("is-active");
      });
    });

    card.addEventListener("mouseleave", () => {
      layer.querySelectorAll(`[data-relationship-link*="${toolId}"]`).forEach(link => {
        link.classList.remove("is-active");
      });
    });
  });

  positionLinks();
  requestAnimationFrame(() => {
    requestAnimationFrame(positionLinks);
  });

  if (window.ResizeObserver) {
    window.__relationshipObserver?.disconnect();
    const observer = new ResizeObserver(positionLinks);
    window.__relationshipObserver = observer;
    observer.observe(grid);
    cards.forEach(card => observer.observe(card));
  }

  if (!window.__relationshipResizeBound) {
    window.__relationshipResizeBound = true;
    window.addEventListener("resize", () => {
      renderRelationshipConnectors(window.__relationshipFilteredTools || []);
    });
  }
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

      : `<div class="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 md:col-span-2 xl:col-span-3">
          No hay herramientas para mostrar con estos filtros.
        </div>`;

  renderRelationshipConnectors(filtered);
  refreshIcons();
}

async function deleteTool(id) {

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

  if (!await confirmAction("¿Eliminar herramienta?", `Se eliminará "${tool.name}" de la biblioteca.`)) {
    return;
  }

  tools =
    tools.filter(
      x => x.id !== id
    );

  if (supabaseClient && currentUser) {
    supabaseClient
      .from("herramientas")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("No se pudo eliminar la herramienta remota.", error);
          toast("No se pudo eliminar la herramienta de Supabase.");
        }
      });
  }

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
  return "";
}

function openAiSettings() {
  if (!isOwner()) {
    toast("Solo el Propietario puede administrar las claves de IA.");
    return;
  }

  const modal =
    document.getElementById(
      "aiModal"
    );

  const input =
    document.getElementById(
      "geminiKey"
    );

  if (!modal) return;

  if (input) input.value = "";

  modal.classList.remove(
    "hidden"
  );

  loadAiKeys();
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

async function saveAiKey() {

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

  const name = document.getElementById("geminiKeyName")?.value.trim() || "Clave Gemini";
  const result = await supabaseClient.functions.invoke("ai-keys", {
    body: { action: "save", name, key }
  });
  if (result.error || result.data?.error) {
    toast(result.data?.error || result.error.message);
    return;
  }

  if (input) input.value = "";
  const nameInput = document.getElementById("geminiKeyName");
  if (nameInput) nameInput.value = "";
  await loadAiKeys();
  toast("API Key cifrada y guardada.");
}

async function loadAiKeys() {
  const list = document.getElementById("geminiKeyList");
  if (!list || !isOwner()) return;
  const { data, error } = await supabaseClient.functions.invoke("ai-keys", {
    body: { action: "list" }
  });
  if (error || data?.error) {
    list.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(data?.error || error.message)}</p>`;
    return;
  }
  list.innerHTML = (data.keys || []).length
    ? data.keys.map(key => `<div class="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div><p class="text-sm font-medium">${escapeHtml(key.nombre)}</p><p class="text-xs text-slate-500">${key.activa ? "Activa" : "Inactiva"}</p></div>
        <button type="button" data-delete-ai-key="${key.id}" class="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Eliminar ${escapeHtml(key.nombre)}"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
      </div>`).join("")
    : '<p class="text-sm text-slate-500">No hay claves configuradas.</p>';
  refreshIcons();
}

async function clearAiKey() {
  toast("Para eliminar una clave, usa el botón de papelera de la lista.");
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
No uses "No determinado" en exampleResult. Si no existe un texto literal para mostrar antes y después, escribe un ejemplo operativo basado en la acción real del código y empieza con "Ejemplo:".

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

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      15000
    );

  let response;

  try {

    response =
      await fetch(
      endpoint,
      {
        method: "POST",

        signal:
          controller.signal,

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

  } catch (error) {

    if (error.name === "AbortError") {

      throw new Error(
        "La solicitud tardó demasiado y fue cancelada."
      );
    }

    throw error;

  } finally {

    clearTimeout(
      timeoutId
    );
  }

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
  showAiStatus("loading", "Analizando con IA...", "Las claves permanecen en Supabase.");
  const { data, error } = await supabaseClient.functions.invoke("ai-analyze", {
    body: { code }
  });
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "No fue posible analizar la herramienta.");
  }
  return data.result;
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

function fallbackExample(code) {
  const rules = [
    [/Rename-Item|Move-Item/i, "Ejemplo: un archivo encontrado cambia de nombre o ubicación según la regla definida por el script."],
    [/Copy-Item|CopyFile/i, "Ejemplo: se crea una copia del archivo seleccionado en la ubicación indicada por el script."],
    [/Remove-Item|DeleteFile|unlink/i, "Ejemplo: se elimina el archivo que cumple las condiciones definidas por el script."],
    [/Get-ChildItem|readdir|os\.listdir|glob\(/i, "Ejemplo: se obtiene un listado de los archivos que cumplen el filtro indicado."],
    [/Export-Csv|ConvertTo-Csv|to_csv/i, "Ejemplo: se genera un archivo CSV con los datos encontrados y procesados."],
    [/Set-Content|Add-Content|Out-File|writeFile/i, "Ejemplo: se escribe el resultado procesado en el archivo indicado."],
    [/Get-Content|readFile|Import-Csv/i, "Ejemplo: se leen los datos del archivo y se procesan según las reglas del script."],
    [/Invoke-WebRequest|fetch\(|requests\.|WebClient/i, "Ejemplo: se obtiene información desde la fuente externa configurada en el código."],
    [/\.pdf|PDF/i, "Ejemplo: se procesan los archivos PDF que cumplen las condiciones indicadas."],
    [/\.xlsx?|Excel|Workbook/i, "Ejemplo: se procesa la información del archivo Excel según las reglas definidas."]
  ];

  return rules.find(([pattern]) => pattern.test(code))?.[1] ||
    "Ejemplo: la herramienta ejecuta la operación principal definida en el código y genera la salida correspondiente.";
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

  return fallbackExample(code);
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
    normalizeCategories(
      (
        document
          .getElementById(
            "fCategories"
          )
          ?.value ||
        ""
      )
        .split(",")
        .map(x => x.trim()),
      language,
      name
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
   CAMBIO DE VISTAS
   ========================================================= */

function showView(
  view,
  options = {}
) {
  if (view === "users" && !isOwner()) {
    toast("Solo el Propietario puede administrar usuarios.");
    return;
  }

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

    if (view === "tools") {
      renderLibrary();
    }

    if (view === "users") {
      loadManagedUsers();
    }
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

    relations: [
      "Conexiones",
      "Organiza el orden entre tus herramientas"
    ],

    new: [
      "Agregar herramienta",
      "Pega el código y deja que la IA documente automáticamente la herramienta"
    ],

    profile: [
      "Mi perfil",
      "Administra tus datos personales y laborales"
    ],

    users: [
      "Usuarios",
      "Administra roles, límites y acceso"
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
  updateUserProfile();

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
      "[data-admin-only]:not(.view)"
    )
    .forEach(
      element => {
        element.classList.toggle(
          "hidden",
          !isAdmin()
        );
      }
    );

  document.querySelectorAll("[data-tool-authorized]").forEach(element => {
    element.classList.toggle("hidden", !canCreateTools());
  });

  document.querySelectorAll("[data-owner-only]").forEach(element => {
    element.classList.toggle("hidden", !isOwner());
  });

  updateAdminButton();
}

async function callUserAdmin(action, values = {}) {
  if (!supabaseClient || !isOwner()) {
    toast("Solo el Propietario puede administrar usuarios.");
    return null;
  }

  const { data, error } = await supabaseClient.functions.invoke("admin-users", {
    body: { action, ...values }
  });

  if (error || data?.error) {
    let detail = data?.error || error?.message || "Error desconocido.";

    if (error?.context instanceof Response) {
      try {
        const errorBody = await error.context.clone().json();
        detail = errorBody?.error || detail;
      } catch {
        // Conserva el mensaje del SDK si la respuesta no es JSON.
      }
    }

    console.error("No se pudo administrar el usuario.", { action, error, data });
    toast(`No se pudo administrar el usuario: ${detail}`);
    return null;
  }

  return data;
}

async function loadManagedUsers() {
  const panel = document.getElementById("userAdminPanel");
  if (!panel || !isOwner()) return;

  panel.innerHTML = '<div class="p-5 text-sm text-slate-500">Cargando usuarios...</div>';
  const data = await callUserAdmin("list");
  if (!data) return;

  managedUsers = data.users || [];
  panel.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div>
        <h3 class="font-semibold">Usuarios del equipo</h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">${managedUsers.length} ${managedUsers.length === 1 ? "usuario registrado" : "usuarios registrados"}</p>
      </div>
      <i data-lucide="users-round" class="h-5 w-5 text-slate-400"></i>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-[760px] w-full text-left text-sm">
      <thead class="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
        <tr><th class="px-5 py-3">Usuario</th><th class="px-5 py-3">Rol</th><th class="px-5 py-3">Límite mensual</th><th class="px-5 py-3">Estado</th><th class="px-5 py-3 text-right">Acciones</th></tr>
      </thead>
      <tbody>
        ${managedUsers.map(user => `
          <tr class="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">${escapeHtml((user.email || "U").charAt(0).toUpperCase())}</div>
                <div>
                  <p class="font-medium text-slate-800 dark:text-slate-100">${escapeHtml(user.email || "")}</p>
                  <p class="mt-0.5 text-xs text-slate-400">Cuenta de acceso</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-4"><select aria-label="Rol de ${escapeHtml(user.email || "usuario")}" data-user-role="${user.id}" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-sky-500 dark:focus:ring-sky-950">
              <option value="creador" ${user.profile.rol === "creador" ? "selected" : ""}>Creador</option>
              <option value="administrador" ${user.profile.rol === "administrador" ? "selected" : ""}>Administrador</option>
            </select></td>
            <td class="px-5 py-4"><div class="relative w-28"><input aria-label="Límite mensual de ${escapeHtml(user.email || "usuario")}" data-user-limit="${user.id}" type="number" min="0" value="${user.profile.limite_mensual ?? 10}" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-sky-500 dark:focus:ring-sky-950"></div></td>
            <td class="px-5 py-4"><label class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><input aria-label="Usuario activo" data-user-active="${user.id}" type="checkbox" class="h-4 w-4 accent-emerald-600" ${user.profile.activo !== false ? "checked" : ""}> Activo</label></td>
            <td class="px-5 py-4"><div class="flex justify-end gap-2">
              <button type="button" data-save-user="${user.id}" title="Guardar cambios" aria-label="Guardar cambios de ${escapeHtml(user.email || "usuario")}" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300"><i data-lucide="save" class="h-4 w-4"></i></button>
              <button type="button" data-delete-user="${user.id}" title="Eliminar usuario" aria-label="Eliminar usuario ${escapeHtml(user.email || "usuario")}" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
            </div></td>
          </tr>
        `).join("")}
      </tbody>
      </table>
    </div>`;
  refreshIcons();
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
  async e => {

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

      if (
        viewButton.hasAttribute("data-owner-only") &&
        !isOwner()
      ) {
        toast("Solo el Propietario puede administrar usuarios.");
        return;
      }

      if (
        viewButton.hasAttribute("data-tool-authorized") &&
        !canCreateTools()
      ) {
        toast("Tu usuario no tiene permiso para crear herramientas.");
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

const googleAuthButton = document.getElementById("googleAuth");

if (googleAuthButton) {
  googleAuthButton.addEventListener("click", authenticateWithGoogle);
}

const headerAuthButton = document.getElementById("headerAuth");

if (headerAuthButton) {
  headerAuthButton.addEventListener("click", () => {
    if (currentUser) toggleUserMenu();
    else requestAdminAccess();
  });
}

const profileMenuButton = document.getElementById("profileMenuButton");

if (profileMenuButton) {
  profileMenuButton.addEventListener("click", openUserProfile);
}

const logoutMenuButton = document.getElementById("logoutMenuButton");

if (logoutMenuButton) {
  logoutMenuButton.addEventListener("click", () => {
    toggleUserMenu(false);
    requestAdminAccess();
  });
}

const profileForm = document.getElementById("profileForm");

if (profileForm) {
  profileForm.addEventListener("submit", saveUserProfile);
}

const passwordSetupForm = document.getElementById("passwordSetupForm");
if (passwordSetupForm) {
  passwordSetupForm.addEventListener("submit", completePasswordSetup);
}

const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", changePasswordWithCode);
}

document.getElementById("sendPasswordCode")?.addEventListener("click", sendPasswordCode);

document.addEventListener("click", async event => {
  const target = event.target instanceof Element ? event.target : null;
  const saveUserButton = target?.closest("[data-save-user]");
  const deleteUserButton = target?.closest("[data-delete-user]");
  const deleteAiKeyButton = target?.closest("[data-delete-ai-key]");

  if (deleteAiKeyButton) {
    void supabaseClient.functions.invoke("ai-keys", {
      body: { action: "delete", id: deleteAiKeyButton.dataset.deleteAiKey }
    }).then(result => {
      if (result.error || result.data?.error) {
        toast(result.data?.error || result.error.message);
        return;
      }
      void loadAiKeys();
      toast("Clave de IA eliminada.");
    });
    return;
  }

  if (saveUserButton || deleteUserButton) {
    const id = (saveUserButton || deleteUserButton).dataset.saveUser ||
      (saveUserButton || deleteUserButton).dataset.deleteUser;

    if (deleteUserButton && !await confirmAction("¿Eliminar usuario?", "Esta acción no se puede deshacer.")) return;

    const action = saveUserButton ? "update" : "delete";
    const values = action === "update"
      ? {
          userId: id,
          rol: document.querySelector(`[data-user-role="${id}"]`)?.value,
          limiteMensual: Number(document.querySelector(`[data-user-limit="${id}"]`)?.value),
          activo: document.querySelector(`[data-user-active="${id}"]`)?.checked
        }
      : { userId: id };

    void callUserAdmin(action, values).then(() => loadManagedUsers());
    return;
  }

  const menu = document.getElementById("userMenu");
  const button = document.getElementById("headerAuth");
  if (menu && button && !menu.contains(event.target) && !button.contains(event.target)) {
    toggleUserMenu(false);
  }
});

const gateLoginButton = document.getElementById("gateLogin");

if (gateLoginButton) {
  gateLoginButton.addEventListener("click", requestAdminAccess);
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

const mobileSidebarClose =
  document.getElementById(
    "mobileSidebarClose"
  );

if (mobileSidebarClose) {
  mobileSidebarClose.addEventListener(
    "click",
    () => {
      document
        .getElementById("sidebar")
        ?.classList
        .add("-translate-x-full");
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
   INICIALIZACIÓN
   ========================================================= */

const validViews = [
  "dashboard",
  "tools",
  "new",
  "profile",
  "users"
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

async function initializeApplication() {
  protectSearchFields();
  const globalSearchInput = document.getElementById("globalSearch");
  const toolSearchInput = document.getElementById("toolSearch");
  if (globalSearchInput) globalSearchInput.value = "";
  if (toolSearchInput) toolSearchInput.value = "";

  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("No se pudo recuperar la sesión de Supabase.", error);
    }

    currentUser = data?.session?.user || null;
    if (currentUser && !isAuthorizedUser(currentUser)) {
      await supabaseClient.auth.signOut();
      currentUser = null;
      toast("Este correo no está autorizado para entrar.");
    }

    if (!currentUser) {
      window.location.replace("login.html");
      return;
    }

    await loadCurrentProfile();
    if (isAccountBlocked()) {
      await supabaseClient.auth.signOut();
      currentUser = null;
      toast("Tu cuenta está desactivada. Contacta al Propietario.");
      window.location.replace("login.html");
      return;
    }
    if (requiresPasswordSetup()) {
      updateAuthGate();
      showPasswordSetup();
      finishInitialLoad();
      return;
    }
    updateAuthGate();
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user || null;

      if (nextUser && !isAuthorizedUser(nextUser)) {
        await supabaseClient.auth.signOut();
        currentUser = null;
        toast("Este correo no está autorizado para entrar.");
        updateAuthGate();
        return;
      }

      currentUser = nextUser;

      if (!currentUser) {
        currentProfile = null;
        window.location.replace("login.html");
        return;
      }

      if (currentUser) {
        await loadCurrentProfile();
        if (isAccountBlocked()) {
          await supabaseClient.auth.signOut();
          currentUser = null;
          toast("Tu cuenta está desactivada. Contacta al Propietario.");
          window.location.replace("login.html");
          return;
        }
        if (requiresPasswordSetup()) {
          updateAuthGate();
          showPasswordSetup();
          return;
        }
        tools = await loadTools();
        normalizeToolRelationships();
      }

      updateAuthGate();
      renderAll();
    });
  }

  const loadedTools = await loadTools();
  tools = loadedTools;
  normalizeToolRelationships();
  renderAll();
  refreshIcons();
  finishInitialLoad();

  console.log(
    `Toolbox IA iniciado correctamente con ${tools.length} herramientas.`
  );
}

initializeApplication();