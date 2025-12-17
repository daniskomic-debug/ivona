/* Fetch content.json and hydrate the page */
const $ = (sel) => document.querySelector(sel);

const state = {
  content: null,
  photos: [],
  activeTab: "her",
  lightboxIndex: 0
};

async function loadContent() {
  const res = await fetch("content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Ne mogu učitati content.json");
  return res.json();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderLetter(paragraphs) {
  const body = $("#letterBody");
  body.innerHTML = paragraphs
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function buildPhotoList(content, tab) {
  const her = (content.gallery?.herPhotos || []).map((src) => ({ src, tag: content.gallery?.herTag || "Žuta" }));
  const us  = (content.gallery?.ourPhotos || []).map((src) => ({ src, tag: content.gallery?.ourTag || "Mi" }));

  if (tab === "her") return her;
  if (tab === "us") return us;
  return [...her, ...us];
}

function renderGrid() {
  const grid = $("#photoGrid");
  const list = buildPhotoList(state.content, state.activeTab);
  state.photos = list;

  if (!list.length) {
    grid.innerHTML = `<div class="muted">Dodaj slike u assets/photos/ i uredi content.json.</div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => `
    <figure class="photo">
      <button type="button" data-open="${i}" aria-label="Otvori sliku ${i+1}">
        <img src="${p.src}" alt="${escapeHtml(p.alt || "Fotografija")}" loading="lazy" />
        <span class="photo__tag">${escapeHtml(p.tag || "")}</span>
      </button>
    </figure>
  `).join("");

  grid.querySelectorAll("button[data-open]").forEach(btn => {
    btn.addEventListener("click", () => openLightbox(Number(btn.dataset.open)));
  });
}

function renderTimeline(items) {
  const list = $("#timelineList");
  list.innerHTML = (items || []).map(it => `
    <li class="titem">
      <div class="tdate">💛 <span>${escapeHtml(it.date || "")}</span></div>
      <p class="ttext">${escapeHtml(it.text || "")}</p>
    </li>
  `).join("");
}

function renderReasons(items) {
  const grid = $("#reasonsGrid");
  const reasons = items || [];
  grid.innerHTML = reasons.map((txt, idx) => `
    <div class="rcard">
      <h3>${String(idx + 1).padStart(2,"0")}</h3>
      <p>${escapeHtml(txt)}</p>
    </div>
  `).join("");
}

function setTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.activeTab = btn.dataset.tab;
      // aria
      document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
      renderGrid();
    });
  });
}

function smoothScrollTo(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wireHero() {
  const startBtn = $("#startBtn");
  if (startBtn) startBtn.addEventListener("click", () => smoothScrollTo("#gallery"));
}

/* Lightbox */
function openLightbox(index) {
  state.lightboxIndex = index;
  const lb = $("#lightbox");
  lb.classList.add("is-open");
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  renderLightbox();
}

function closeLightbox() {
  const lb = $("#lightbox");
  lb.classList.remove("is-open");
  lb.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderLightbox() {
  const item = state.photos[state.lightboxIndex];
  if (!item) return;

  const img = $("#lbImg");
  const cap = $("#lbCaption");
  img.src = item.src;
  img.alt = item.alt || "Uvećana fotografija";
  cap.textContent = item.caption || item.tag || "";
}

function lbPrev() {
  if (!state.photos.length) return;
  state.lightboxIndex = (state.lightboxIndex - 1 + state.photos.length) % state.photos.length;
  renderLightbox();
}
function lbNext() {
  if (!state.photos.length) return;
  state.lightboxIndex = (state.lightboxIndex + 1) % state.photos.length;
  renderLightbox();
}

function wireLightbox() {
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", lbPrev);
  $("#lbNext").addEventListener("click", lbNext);

  $("#lightbox").addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "true") closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    const lbOpen = $("#lightbox").classList.contains("is-open");
    if (!lbOpen) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") lbPrev();
    if (e.key === "ArrowRight") lbNext();
  });
}

/* Floating hearts (subtle) */
function initHearts() {
  const canvas = $("#heartsCanvas");
  const ctx = canvas.getContext("2d");
  const hearts = [];
  let w = 0, h = 0;

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawn() {
    const size = rand(10, 22) * devicePixelRatio;
    hearts.push({
      x: rand(0, w),
      y: h + rand(0, 80 * devicePixelRatio),
      s: size,
      vy: rand(0.35, 0.9) * devicePixelRatio,
      vx: rand(-0.25, 0.25) * devicePixelRatio,
      a: rand(0.10, 0.22),
      r: rand(-0.3, 0.3)
    });
    if (hearts.length > 40) hearts.shift();
  }

  function drawHeart(x, y, s, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    // two-tone soft heart
    const grad = ctx.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, "rgba(255,211,92,.85)");
    grad.addColorStop(1, "rgba(255,137,183,.70)");
    ctx.fillStyle = grad;

    ctx.beginPath();
    const t = s / 16;
    ctx.moveTo(0, 6*t);
    ctx.bezierCurveTo(0, 0, -8*t, 0, -8*t, 6*t);
    ctx.bezierCurveTo(-8*t, 10*t, -4*t, 12*t, 0, 16*t);
    ctx.bezierCurveTo(4*t, 12*t, 8*t, 10*t, 8*t, 6*t);
    ctx.bezierCurveTo(8*t, 0, 0, 0, 0, 6*t);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    if (Math.random() < 0.22) spawn();

    for (const p of hearts) {
      p.y -= p.vy;
      p.x += p.vx;
      p.r += 0.002 * (devicePixelRatio);
      drawHeart(p.x, p.y, p.s, p.r, p.a);

      // wrap
      if (p.y < -120 * devicePixelRatio) p.y = h + 120 * devicePixelRatio;
      if (p.x < -80 * devicePixelRatio) p.x = w + 80 * devicePixelRatio;
      if (p.x > w + 80 * devicePixelRatio) p.x = -80 * devicePixelRatio;
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  tick();
}

async function main() {
  try {
    state.content = await loadContent();

    // hydrate header/hero
    document.title = state.content.siteTitle || "Za moju Žutu";
    setText("siteTitle", state.content.siteTitle || "Za moju Žutu");
    setText("heroTitle", state.content.heroTitle || "Za moju Žutu 💛");
    setText("heroLine", state.content.heroLine || "Sve mi nekako bude mirnije kad si ti tu.");
    setText("eyebrow", (state.content.nicknames || []).join(" • "));
    setText("gallerySubtitle", state.content.gallerySubtitle || "Više tvojih slika, jer ti si ti.");
    setText("letterSubtitle", state.content.letterSubtitle || "Napisano kako osjećam, bez glume.");
    setText("footerBig", state.content.footerBig || "Žuta, ti si moj mir.");

    // letter
    const paras = Array.isArray(state.content.loveLetter) ? state.content.loveLetter : [String(state.content.loveLetter || "")];
    renderLetter(paras.filter(Boolean));

    // timeline & reasons
    renderTimeline(state.content.timeline || []);
    renderReasons(state.content.reasons || []);

    // ui
    setTabs();
    renderGrid();
    wireHero();
    wireLightbox();
    initHearts();
  } catch (err) {
    console.error(err);
    alert("Greška pri učitavanju sajta. Provjeri da content.json postoji i da je validan JSON.");
  }
}

main();
