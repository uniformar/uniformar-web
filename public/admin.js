(function () {
  "use strict";

  const state = { config: {}, products: [], editing: null, pw: "" };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const uid = () => "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function toast(msg, isError) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    setTimeout(() => (t.className = "toast"), 3200);
  }

  /* ---------------- LOGIN ---------------- */
  async function tryLogin() {
    const pass = $("#login-pass").value;
    $("#login-error").textContent = "";
    try {
      const res = await fetch("/api/check-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pass })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        state.pw = pass;
        sessionStorage.setItem("uniformar_admin_pw", pass);
        showApp();
      } else {
        $("#login-error").textContent = data.error || "Contraseña incorrecta.";
      }
    } catch (err) {
      $("#login-error").textContent = "Error de conexión: " + err.message;
    }
  }

  function showApp() {
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    loadData();
  }

  $("#login-btn").addEventListener("click", tryLogin);
  $("#login-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  $("#logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("uniformar_admin_pw");
    location.reload();
  });

  const savedPw = sessionStorage.getItem("uniformar_admin_pw");
  if (savedPw) { state.pw = savedPw; showApp(); }

  /* ---------------- DATA ---------------- */
  async function loadData() {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      state.config = data.config || {};
      state.products = data.products || [];
      renderConfig();
      renderProductList();
    } catch (err) {
      toast("No se pudo cargar la información: " + err.message, true);
    }
  }

  async function saveAll(successMsg) {
    try {
      const res = await fetch("/api/save-data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: state.pw, config: state.config, products: state.products })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { toast("Sesión inválida, volvé a ingresar.", true); sessionStorage.removeItem("uniformar_admin_pw"); location.reload(); return; }
        throw new Error(data.error || "Error al guardar");
      }
      toast(successMsg || "Guardado ✓");
    } catch (err) {
      toast("No se pudo guardar: " + err.message, true);
    }
  }

  /* ---------------- CONFIG ---------------- */
  function renderConfig() {
    const c = state.config;
    $("#cfg-nombre").value = c.nombreTienda || "";
    $("#cfg-whatsapp").value = c.whatsapp || "";
    $("#cfg-desc").value = c.descripcion || "";
    $("#cfg-instagram").value = c.instagram || "";
    $("#cfg-ubicacion").value = c.ubicacion || "";
    $("#cfg-envios").value = c.mensajeEnvios || "";
  }

  $("#save-config-btn").addEventListener("click", () => {
    state.config = {
      ...state.config,
      nombreTienda: $("#cfg-nombre").value.trim() || "UniformAR",
      whatsapp: $("#cfg-whatsapp").value.replace(/\D/g, ""),
      descripcion: $("#cfg-desc").value.trim(),
      instagram: $("#cfg-instagram").value.trim().replace("@", ""),
      ubicacion: $("#cfg-ubicacion").value.trim(),
      mensajeEnvios: $("#cfg-envios").value.trim()
    };
    saveAll("Datos de la tienda guardados ✓");
    renderConfig();
  });

  /* ---------------- LISTA DE PRODUCTOS ---------------- */
  function totalStock(p) {
    let s = 0; (p.colores || []).forEach((c) => (c.talles || []).forEach((t) => (s += Number(t.stock) || 0)));
    return s;
  }

  function renderProductList() {
    $("#count-tag").textContent = `(${state.products.length})`;
    const list = $("#product-list");
    if (!state.products.length) {
      list.innerHTML = `<p style="color:var(--muted);">Todavía no cargaste productos. Tocá "+ Nuevo producto" para empezar.</p>`;
      return;
    }
    list.innerHTML = state.products.map((p) => `
      <div class="product-row">
        ${p.imagenes && p.imagenes[0] ? `<img src="${p.imagenes[0]}">` : `<div style="width:52px;height:52px;border-radius:8px;background:var(--arena);"></div>`}
        <div style="flex:1;">
          <span class="pname">${p.nombre || "(sin nombre)"}</span>${p.activo === false ? '<span class="tag-off">Oculto</span>' : ""}
          <div class="pmeta">${p.categoria || "—"} · Stock total: ${totalStock(p)} · ${(p.colores || []).length} color(es)</div>
        </div>
        <button class="btn btn-outline btn-sm" data-edit="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-del="${p.id}">Eliminar</button>
      </div>`).join("");
    $$("[data-edit]", list).forEach((b) => b.addEventListener("click", () => openProductModal(b.getAttribute("data-edit"))));
    $$("[data-del]", list).forEach((b) => b.addEventListener("click", () => deleteProduct(b.getAttribute("data-del"))));
  }

  function deleteProduct(id) {
    const p = state.products.find((x) => x.id === id);
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    state.products = state.products.filter((x) => x.id !== id);
    renderProductList();
    saveAll("Producto eliminado ✓");
  }

  $("#new-product-btn").addEventListener("click", () => openProductModal(null));

  /* ---------------- MODAL DE PRODUCTO ---------------- */
  function blankProduct() {
    return { id: uid(), nombre: "", categoria: "Ambo", descripcion: "", activo: true, destacado: false, imagenes: [], colores: [] };
  }

  function openProductModal(id) {
    state.editing = id ? JSON.parse(JSON.stringify(state.products.find((p) => p.id === id))) : blankProduct();
    renderProductModal();
  }

  function closeProductModal() { $("#modal-root").innerHTML = ""; state.editing = null; }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio); height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function syncFieldsToEditing() {
    const p = state.editing;
    if (!p) return;
    const nombreEl = $("#p-nombre"), catEl = $("#p-categoria"), descEl = $("#p-desc"),
      activoEl = $("#p-activo"), destEl = $("#p-destacado");
    if (nombreEl) p.nombre = nombreEl.value;
    if (catEl) p.categoria = catEl.value;
    if (descEl) p.descripcion = descEl.value;
    if (activoEl) p.activo = activoEl.checked;
    if (destEl) p.destacado = destEl.checked;
    // también preservar lo tipeado en cada color/talle antes de reconstruir el HTML
    $$(".color-block").forEach((block, ci) => {
      if (!p.colores[ci]) return;
      const nombreC = $(".c-nombre", block), hexC = $(".c-hex", block);
      if (nombreC) p.colores[ci].nombre = nombreC.value;
      if (hexC) p.colores[ci].hex = hexC.value;
      $$(".talle-row", block).forEach((row, ti) => {
        if (!p.colores[ci].talles[ti]) return;
        const tt = $(".t-talle", row), ts = $(".t-stock", row), tp = $(".t-precio", row);
        if (tt) p.colores[ci].talles[ti].talle = tt.value;
        if (ts) p.colores[ci].talles[ti].stock = ts.value;
        if (tp) p.colores[ci].talles[ti].precio = tp.value;
      });
    });
  }

  function renderProductModal() {
    const p = state.editing;
    const imgsHtml = (p.imagenes || []).map((im, i) => `
      <div class="img-item"><img src="${im}"><button class="rm" data-rmimg="${i}">✕</button></div>`).join("");

    const coloresHtml = (p.colores || []).map((c, ci) => `
      <div class="color-block" data-color-idx="${ci}">
        <div class="color-head">
          <div class="field" style="flex:1;margin:0;"><label>Nombre del color</label><input class="c-nombre" value="${c.nombre || ""}" placeholder="Ej: Celeste"></div>
          <div class="field" style="width:90px;margin:0;"><label>Muestra</label><input type="color" class="c-hex" value="${c.hex || "#05396C"}" style="padding:4px;height:42px;"></div>
          <button class="btn btn-danger btn-sm" data-rmcolor="${ci}">Quitar color</button>
        </div>
        <div class="talles-wrap">
          ${(c.talles || []).map((t, ti) => `
            <div class="talle-row" data-talle-idx="${ti}">
              <input class="t-talle" list="talles-list" placeholder="Talle" value="${t.talle || ""}">
              <input class="t-stock" type="number" min="0" placeholder="Stock" value="${t.stock ?? ""}">
              <input class="t-precio" type="number" min="0" placeholder="Precio $" value="${t.precio ?? ""}">
              <button class="btn btn-danger btn-sm" data-rmtalle="${ti}">✕</button>
            </div>`).join("")}
        </div>
        <button class="btn btn-outline btn-sm" data-addtalle="${ci}" style="margin-top:6px;">+ Agregar talle</button>
      </div>`).join("");

    $("#modal-root").innerHTML = `
    <div class="modal-overlay" id="p-overlay">
      <div class="modal" style="grid-template-columns:1fr; max-width:640px;">
        <button class="modal-close" id="p-close">✕</button>
        <div class="modal-body">
          <h2>${p.nombre ? "Editar producto" : "Nuevo producto"}</h2>

          <div class="field"><label>Nombre del producto</label><input id="p-nombre" value="${p.nombre || ""}" placeholder="Ej: Ambo Clásico"></div>
          <div class="row-2">
            <div class="field"><label>Categoría</label>
              <input id="p-categoria" list="cat-list" value="${p.categoria || "Ambo"}">
              <datalist id="cat-list"><option>Ambo</option><option>Chaqueta</option><option>Pantalón</option><option>Set</option><option>Accesorios</option></datalist>
            </div>
            <div class="field" style="display:flex; gap:18px; align-items:center; padding-top:26px;">
              <label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="p-activo" ${p.activo !== false ? "checked" : ""}> Visible en la tienda</label>
              <label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="p-destacado" ${p.destacado ? "checked" : ""}> Destacado</label>
            </div>
          </div>
          <div class="field"><label>Descripción</label><textarea id="p-desc" placeholder="Tela, calce, detalles...">${p.descripcion || ""}</textarea></div>

          <div class="field">
            <label>Fotos</label>
            <div class="imgs-grid" id="imgs-grid">${imgsHtml}</div>
            <label class="upload-box">📷 Subir foto(s)<input type="file" id="p-img-input" accept="image/*" multiple style="display:none;"></label>
          </div>

          <div class="field">
            <label>Colores, talles, stock y precio</label>
            <datalist id="talles-list"><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></datalist>
            <div id="colores-wrap">${coloresHtml}</div>
            <button class="btn btn-outline btn-sm" id="add-color-btn" style="margin-top:8px;">+ Agregar color</button>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn btn-navy btn-block" id="p-save">Guardar producto</button>
          </div>
        </div>
      </div>
    </div>`;

    $("#p-overlay").addEventListener("click", (e) => { if (e.target.id === "p-overlay") closeProductModal(); });
    $("#p-close").addEventListener("click", closeProductModal);

    $("#p-img-input").addEventListener("change", async (e) => {
      const files = [...e.target.files];
      syncFieldsToEditing();
      for (const f of files) {
        try { const dataUrl = await resizeImage(f); p.imagenes.push(dataUrl); } catch (err) { toast("No se pudo procesar una imagen", true); }
      }
      renderProductModal();
    });
    $$("[data-rmimg]").forEach((b) => b.addEventListener("click", () => { syncFieldsToEditing(); p.imagenes.splice(+b.getAttribute("data-rmimg"), 1); renderProductModal(); }));

    $("#add-color-btn").addEventListener("click", () => { syncFieldsToEditing(); p.colores.push({ nombre: "", hex: "#05396C", talles: [{ talle: "", stock: "", precio: "" }] }); renderProductModal(); });
    $$("[data-rmcolor]").forEach((b) => b.addEventListener("click", () => { syncFieldsToEditing(); p.colores.splice(+b.getAttribute("data-rmcolor"), 1); renderProductModal(); }));
    $$("[data-addtalle]").forEach((b) => b.addEventListener("click", () => { syncFieldsToEditing(); p.colores[+b.getAttribute("data-addtalle")].talles.push({ talle: "", stock: "", precio: "" }); renderProductModal(); }));
    $$(".color-block").forEach((block) => {
      const ci = +block.getAttribute("data-color-idx");
      $$("[data-rmtalle]", block).forEach((b) => b.addEventListener("click", () => { syncFieldsToEditing(); p.colores[ci].talles.splice(+b.getAttribute("data-rmtalle"), 1); renderProductModal(); }));
    });

    $("#p-save").addEventListener("click", () => saveProductFromModal());
  }

  function saveProductFromModal() {
    const p = state.editing;
    p.nombre = $("#p-nombre").value.trim();
    p.categoria = $("#p-categoria").value.trim();
    p.descripcion = $("#p-desc").value.trim();
    p.activo = $("#p-activo").checked;
    p.destacado = $("#p-destacado").checked;

    if (!p.nombre) { toast("Ponele un nombre al producto", true); return; }

    p.colores = $$(".color-block").map((block) => {
      const nombre = $(".c-nombre", block).value.trim();
      const hex = $(".c-hex", block).value;
      const talles = $$(".talle-row", block).map((row) => ({
        talle: $(".t-talle", row).value.trim(),
        stock: Number($(".t-stock", row).value) || 0,
        precio: Number($(".t-precio", row).value) || 0
      })).filter((t) => t.talle);
      return { nombre, hex, talles };
    }).filter((c) => c.nombre);

    const idx = state.products.findIndex((x) => x.id === p.id);
    if (idx >= 0) state.products[idx] = p; else state.products.push(p);

    closeProductModal();
    renderProductList();
    saveAll("Producto guardado ✓");
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.editing) closeProductModal(); });
})();
