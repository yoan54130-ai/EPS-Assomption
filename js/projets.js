/* ============================================================
   EPS ASSOMPTION BONDY — Moteur partagé
   Charge projets.json, génère les cartes, gère filtres + modal.
   ============================================================ */

const APSA_META = {
  step:        { label: "Step",              icon: "🏃", grad: ["#e8f5e9", "#c8e6c9"] },
  natation:    { label: "Natation",          icon: "🏊", grad: ["#e3f2fd", "#bbdefb"] },
  athletisme:  { label: "Athlétisme",        icon: "🏟️", grad: ["#fff8e1", "#ffecb3"] },
  "gym-danse": { label: "Gym / Danse",       icon: "🤸", grad: ["#fce4ec", "#f8bbd0"] },
  collectif:   { label: "Sports collectifs", icon: "🤾", grad: ["#e8f5e9", "#a5d6a7"] },
  autre:       { label: "Autre",             icon: "📁", grad: ["#eceff1", "#cfd8dc"] }
};

// Chemin relatif vers projets.json selon la profondeur de la page
function jsonPath() {
  const depth = (window.SITE_DEPTH || 0);
  return depth === 0 ? "projets.json" : "../projets.json";
}

async function loadProjects() {
  try {
    const res = await fetch(jsonPath(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) {
    console.error("Impossible de charger projets.json :", e);
    return [];
  }
}

function cardHTML(p) {
  const meta = APSA_META[p.apsa] || APSA_META.autre;
  const tags = [
    `<span class="tag tag-apsa">${meta.label}</span>`,
    p.niveau ? `<span class="tag">${escapeHTML(p.niveau)}</span>` : "",
    p.outil ? `<span class="tag">${escapeHTML(p.outil)}</span>` : ""
  ].join("");

  return `
  <article class="card" data-apsa="${p.apsa}">
    <div class="card-top" style="background:linear-gradient(135deg, ${meta.grad[0]}, ${meta.grad[1]});">
      ${p.emoji || meta.icon}
    </div>
    <div class="card-body">
      <div class="tags">${tags}</div>
      <h3>${escapeHTML(p.titre)}</h3>
      <p class="desc">${escapeHTML(p.description || "")}</p>
      <a class="card-link" href="${escapeAttr(p.url)}" target="_blank" rel="noopener">
        Ouvrir le projet
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>
  </article>`;
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(str) { return escapeHTML(str); }

// Rend la grille complète (utilisé sur l'accueil et les pages APSA)
async function renderGrid(targetId, filterApsa = null) {
  const projects = await loadProjects();
  const list = filterApsa ? projects.filter(p => p.apsa === filterApsa) : projects;
  const el = document.getElementById(targetId);
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">Aucun projet pour le moment dans cette catégorie.<br>Cliquez sur « Ajouter un projet » pour commencer.</div>`;
    return;
  }
  el.innerHTML = list.map(cardHTML).join("");
}

// Compte les projets par APSA — utilisé sur l'accueil pour les pastilles
async function renderApsaCounts() {
  const projects = await loadProjects();
  document.querySelectorAll(".apsa-pill").forEach(pill => {
    const key = pill.dataset.apsa;
    const n = projects.filter(p => p.apsa === key).length;
    const countEl = pill.querySelector(".count");
    if (countEl) countEl.textContent = n + (n === 1 ? " projet" : " projets");
  });
  const totalEl = document.getElementById("stat-total");
  if (totalEl) totalEl.textContent = projects.length;
  const apsaCountEl = document.getElementById("stat-apsa");
  if (apsaCountEl) {
    const used = new Set(projects.map(p => p.apsa));
    apsaCountEl.textContent = used.size;
  }
}

// Filtres en chips (page "Tous les projets" par ex.)
function setupChipFilters(gridId) {
  const chips = document.querySelectorAll(".chip");
  chips.forEach(chip => {
    chip.addEventListener("click", async () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const f = chip.dataset.filter;
      await renderGrid(gridId, f === "all" ? null : f);
    });
  });
}

// ── MODAL D'AJOUT (stockage local au navigateur, voir hint dans le modal) ──
function openAddModal() {
  document.getElementById("add-modal").classList.add("open");
}
function closeAddModal() {
  document.getElementById("add-modal").classList.remove("open");
}

function buildNewProjectEntry() {
  const titre = document.getElementById("f-titre").value.trim();
  const apsa = document.getElementById("f-apsa").value;
  const niveau = document.getElementById("f-niveau").value.trim();
  const outil = document.getElementById("f-outil").value.trim();
  const description = document.getElementById("f-desc").value.trim();
  const url = document.getElementById("f-url").value.trim();
  const emoji = document.getElementById("f-emoji").value.trim();

  if (!titre || !url) {
    alert("Merci de renseigner au minimum le titre et le lien du projet.");
    return null;
  }
  return {
    id: titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-"),
    titre, apsa, niveau, outil,
    emoji: emoji || null,
    description,
    url
  };
}

// Affiche le JSON prêt à copier-coller dans projets.json (workflow GitHub simple, sans backend)
function handleAddSubmit() {
  const entry = buildNewProjectEntry();
  if (!entry) return;

  const snippet = JSON.stringify(entry, null, 2);
  const out = document.getElementById("json-output");
  out.style.display = "block";
  out.querySelector("pre").textContent = snippet + ",";

  // Tente une copie automatique dans le presse-papiers
  navigator.clipboard?.writeText(snippet + ",").catch(() => {});
}
