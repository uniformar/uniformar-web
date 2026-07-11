(function () {
  "use strict";

  const state = { config: null, products: [], filtered: [], selected: null, selColor: null, selTalle: null };

  const $ = (sel) => document.querySelector(sel);
  const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  function toast(msg, isError) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    setTimeout(() => (t.className = "toast"), 3200);
  }

  function waLink(number, text) {
    const n = (number || "").replace(/\D/g, "");
    return `https://wa.me/${n}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  }

  function priceRange(p) {
    if (state.config && state.config.mostrarPrecios === false) return "Consultar precio";
    const prices = [];
    (p.colores || []).forEach((c) => (c.talles || []).forEach((t) => { if (t.precio) prices.push(Number(t.precio)); }));
    if (!prices.length) return "Consultar";
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? fmt.format(min) : `${fmt.format(min)} – ${fmt.format(max)}`;
  }

  function totalStock(p) {
    let s = 0;
    (p.colores || []).forEach((c) => (c.talles || []).forEach((t) => (s += Number(t.stock) || 0)));
    return s;
  }

  function allTalles(p) {
    const set = new Set();
    (p.colores || []).forEach((c) => (c.talles || []).forEach((t) => set.add(t.talle)));
    return [...set];
  }

  async function loadData() {
    try {
      const res = await fetch("/.netlify/functions/get-data?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.config = data.config || {};
      state.products = (data.products || []).filter((p) => p.activo !== false);
      applyBranding();
      buildFilterOptions();
      applyFilters();
    } catch (err) {
      $("#grid-container").innerHTML = `<div class="empty-state"><h3>No se pudo cargar el catálogo</h3><p>Volvé a intentar en unos minutos. (${err.message})</p></div>`;
    }
  }

  function applyBranding() {
    const c = state.config;
    document.title = `${c.nombreTienda || "UniformAR"} · Ambos y uniformes de salud`;
    $("#hero-title").textContent = c.heroTitulo || "UNIFORMAR";
    $("#hero-tag").textContent = c.heroTagline || "";
    $("#hero-tag").style.display = c.heroTagline ? "" : "none";
    $("#hero-desc").textContent = c.descripcion || "";
    $("#foot-desc").textContent = c.descripcion || "";
    $("#foot-wa").textContent = "WhatsApp: " + (c.whatsapp ? "+" + c.whatsapp : "—");
    $("#foot-loc").textContent = c.ubicacion || "";
    $("#foot-envios").textContent = c.mensajeEnvios || "";
    const ig = c.instagram ? `https://www.instagram.com/${c.instagram.replace("@", "")}/` : "#";
    const wa = waLink(c.whatsapp, `Hola! Vengo de la web de ${c.nombreTienda || "UniformAR"} 🙂`);
    ["#ig-link", "#ig-link-2"].forEach((s) => ($(s).href = ig));
    ["#wa-link", "#wa-link-2"].forEach((s) => ($(s).href = wa));
    if (c.colorPrimario) document.documentElement.style.setProperty("--navy", c.colorPrimario);
    if (c.colorAcento) document.documentElement.style.setProperty("--azul", c.colorAcento);
    if (c.logoDataUrl) {
      document.querySelectorAll(".brand-logo-img").forEach((img) => (img.src = c.logoDataUrl));
    }
    const precioOpts = $("#f-orden").querySelectorAll('option[value^="precio"]');
    precioOpts.forEach((o) => (o.hidden = c.mostrarPrecios === false));
  }

  function buildFilterOptions() {
    const cats = new Set(), talles = new Set(), colores = new Map();
    state.products.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
      allTalles(p).forEach((t) => talles.add(t));
      (p.colores || []).forEach((c) => colores.set(c.nombre, c.hex || "#ccc"));
    });
    fillSelect($("#f-categoria"), [...cats].sort(), "Todas las categorías");
    fillSelect($("#f-talle"), [...talles].sort(), "Todos los talles");
    fillSelect($("#f-color"), [...colores.keys()].sort(), "Todos los colores");
  }

  function fillSelect(sel, values, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>` + values.map((v) => `<option value="${v}">${v}</option>`).join("");
  }

  function norm(s) { return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  function minPrice(p) {
    const prices = [];
    (p.colores || []).forEach((c) => (c.talles || []).forEach((t) => { if (t.precio) prices.push(Number(t.precio)); }));
    return prices.length ? Math.min(...prices) : Infinity;
  }

  function applyFilters() {
    const q = norm($("#f-search").value.trim());
    const cat = $("#f-categoria").value;
    const talle = $("#f-talle").value;
    const color = $("#f-color").value;
    const orden = $("#f-orden").value;

    state.filtered = state.products.filter((p) => {
      if (q && !norm(p.nombre + " " + p.categoria).includes(q)) return false;
      if (cat && p.categoria !== cat) return false;
      if (talle && !allTalles(p).includes(talle)) return false;
      if (color && !(p.colores || []).some((c) => c.nombre === color)) return false;
      return true;
    });

    if (orden === "nombre") state.filtered.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    else if (orden === "precio-asc") state.filtered.sort((a, b) => minPrice(a) - minPrice(b));
    else if (orden === "precio-desc") state.filtered.sort((a, b) => minPrice(b) - minPrice(a));
    // "orden" (por defecto) respeta el orden cargado en el panel de administración

    const anyFilter = q || cat || talle || color || (orden && orden !== "orden");
    $("#f-clear").style.display = anyFilter ? "inline" : "none";
    renderGrid();
  }

  function renderGrid() {
    const el = $("#grid-container");
    if (!state.products.length) {
      el.innerHTML = `<div class="empty-state"><h3>Estamos preparando el catálogo</h3><p>Muy pronto vas a poder ver todos los modelos acá. ¡Volvé pronto!</p></div>`;
      return;
    }
    if (!state.filtered.length) {
      el.innerHTML = `<div class="empty-state"><h3>No encontramos productos</h3><p>Probá con otra búsqueda o filtro.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="grid">${state.filtered.map(cardHtml).join("")}</div>`;
    el.querySelectorAll("[data-open]").forEach((card) => {
      card.addEventListener("click", () => openModal(card.getAttribute("data-open")));
    });
  }

  function cardHtml(p) {
    const img = (p.imagenes || [])[0];
    const stock = totalStock(p);
    const swatches = (p.colores || []).slice(0, 5)
      .map((c) => `<span class="swatch-dot" style="background:${c.hex || "#ccc"}" title="${c.nombre}"></span>`).join("");
    return `
    <div class="card" data-open="${p.id}">
      <div class="thumb">
        ${stock <= 0 ? '<span class="badge agotado">Sin stock</span>' : (p.destacado ? '<span class="badge">Destacado</span>' : "")}
        ${img ? `<img src="${img}" alt="${p.nombre}" loading="lazy">` : '<span class="noimg">Sin foto todavía</span>'}
      </div>
      <div class="info">
        <span class="cat">${p.categoria || ""}</span>
        <h3>${p.nombre}</h3>
        <div class="swatches">${swatches}</div>
        <span class="price">${priceRange(p)}</span>
      </div>
    </div>`;
  }

  function openModal(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    state.selected = p;
    state.selColor = (p.colores || [])[0] || null;
    state.selTalle = null;
    renderModal();
  }

  function closeModal() {
    $("#modal-root").innerHTML = "";
    state.selected = null;
  }

  function renderModal() {
    const p = state.selected;
    if (!p) return;
    const imgs = p.imagenes && p.imagenes.length ? p.imagenes : [];
    const mainImg = imgs[0] || "";

    const colorOpts = (p.colores || []).map((c) => `
      <span class="color-opt ${state.selColor && state.selColor.nombre === c.nombre ? "selected" : ""}"
        style="background:${c.hex || "#ccc"}" data-color="${c.nombre}" title="${c.nombre}"></span>`).join("");

    const talles = state.selColor ? state.selColor.talles || [] : [];
    const talleOpts = talles.map((t) => {
      const disabled = !t.stock || Number(t.stock) <= 0;
      const sel = state.selTalle === t.talle;
      return `<span class="talle-opt ${sel ? "selected" : ""} ${disabled ? "disabled" : ""}" data-talle="${disabled ? "" : t.talle}">${t.talle}</span>`;
    }).join("");

    const selTalleObj = talles.find((t) => t.talle === state.selTalle);
    const preciosOn = !(state.config && state.config.mostrarPrecios === false);
    const priceShown = !preciosOn ? "Consultar precio" : (selTalleObj ? fmt.format(Number(selTalleObj.precio || 0)) : priceRange(p));

    let stockMsg = "";
    if (selTalleObj) {
      const s = Number(selTalleObj.stock);
      stockMsg = s > 5 ? `<span class="stock-msg ok">Disponible</span>` : `<span class="stock-msg low">¡Últimas ${s} unidades!</span>`;
    } else if (state.selColor) {
      stockMsg = `<span class="stock-msg">Elegí tu talle</span>`;
    }

    const c = state.config;
    const waText = `Hola! Me interesa el ${p.nombre}${state.selColor ? " color " + state.selColor.nombre : ""}${state.selTalle ? " talle " + state.selTalle : ""}. ¿Está disponible?`;
    const waHref = waLink(c.whatsapp, waText);
    const waDisabled = !state.selTalle;

    $("#modal-root").innerHTML = `
    <div class="modal-overlay" id="overlay">
      <div class="modal">
        <button class="modal-close" id="modal-close">✕</button>
        <div class="modal-gallery">
          <div class="main-img"><img id="main-img" src="${mainImg}" alt="${p.nombre}"></div>
          ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((im, i) => `<img src="${im}" class="${i === 0 ? "active" : ""}" data-img="${im}">`).join("")}</div>` : ""}
        </div>
        <div class="modal-body">
          <span class="cat">${p.categoria || ""}</span>
          <h2>${p.nombre}</h2>
          <span class="price">${priceShown}</span>
          ${p.descripcion ? `<p class="desc">${p.descripcion}</p>` : ""}
          <div class="option-group">
            <label class="title">Color ${state.selColor ? "— " + state.selColor.nombre : ""}</label>
            <div class="color-options">${colorOpts || '<span class="stock-msg">Sin variantes cargadas</span>'}</div>
          </div>
          ${state.selColor ? `<div class="option-group"><label class="title">Talle</label><div class="talle-options">${talleOpts}</div>${stockMsg}</div>` : ""}
          <a class="btn btn-primary btn-block" href="${waDisabled ? "#" : waHref}" target="_blank" rel="noopener"
             ${waDisabled ? 'onclick="return false;" style="opacity:.5;cursor:not-allowed;"' : ""}>
            💬 Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>`;

    $("#overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeModal(); });
    $("#modal-close").addEventListener("click", closeModal);
    document.querySelectorAll("[data-color]").forEach((el) => el.addEventListener("click", () => {
      state.selColor = p.colores.find((c) => c.nombre === el.getAttribute("data-color"));
      state.selTalle = null;
      renderModal();
    }));
    document.querySelectorAll("[data-talle]").forEach((el) => el.addEventListener("click", () => {
      const t = el.getAttribute("data-talle");
      if (!t) return;
      state.selTalle = t;
      renderModal();
    }));
    document.querySelectorAll("[data-img]").forEach((el) => el.addEventListener("click", () => {
      $("#main-img").src = el.getAttribute("data-img");
      document.querySelectorAll("[data-img]").forEach((t) => t.classList.remove("active"));
      el.classList.add("active");
    }));
  }

  ["#f-search", "#f-categoria", "#f-talle", "#f-color", "#f-orden"].forEach((sel) => {
    document.addEventListener("input", (e) => { if (e.target.matches(sel)) applyFilters(); });
    document.addEventListener("change", (e) => { if (e.target.matches(sel)) applyFilters(); });
  });
  $("#f-clear").addEventListener("click", () => {
    $("#f-search").value = ""; $("#f-categoria").value = ""; $("#f-talle").value = ""; $("#f-color").value = ""; $("#f-orden").value = "orden";
    applyFilters();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  $("#year").textContent = new Date().getFullYear();
  loadData();
})();
