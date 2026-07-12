(function () {
  "use strict";

  const state = { config: {}, products: [], editing: null, pw: "", loaded: false };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const uid = () => "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function toast(msg, isError, longer) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => (t.className = "toast"), longer ? 7500 : 3200);
  }

  /* ---------------- LOGIN ---------------- */
  async function tryLogin() {
    const pass = $("#login-pass").value;
    $("#login-error").textContent = "";
    try {
      const res = await fetch("/.netlify/functions/check-password", {
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
      const res = await fetch("/.netlify/functions/get-data?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("El servidor respondió con un error (HTTP " + res.status + ")");
      const data = await res.json();
      state.config = data.config || {};
      state.products = data.products || [];
      state.loaded = true;
      renderConfig();
      renderProductList();
    } catch (err) {
      state.loaded = false;
      toast("No se pudo cargar la información: " + err.message + ". No se va a poder guardar hasta que recargues la página y esto funcione.", true, true);
    }
  }

  async function saveAll(successMsg) {
    if (!state.loaded) {
      toast("No se cargaron los datos actuales todavía, así que no puedo guardar (para evitar borrar algo sin querer). Recargá la página e intentá de nuevo.", true, true);
      return;
    }
    try {
      const res = await fetch("/.netlify/functions/save-data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: state.pw, config: state.config, products: state.products })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) { toast("Sesión inválida, volvé a ingresar.", true); sessionStorage.removeItem("uniformar_admin_pw"); location.reload(); return; }
        const msg = (data.error || "Error al guardar") + (data.detail ? " — " + data.detail : "");
        throw new Error(msg);
      }
      toast(successMsg || "Guardado ✓");
    } catch (err) {
      toast(err.message || "No se pudo guardar. Revisá tu conexión.", true, true);
    }
  }

  /* ---------------- CONFIG: DATOS DE CONTACTO ---------------- */
  function renderConfig() {
    const c = state.config;
    $("#cfg-nombre").value = c.nombreTienda || "";
    $("#cfg-whatsapp").value = c.whatsapp || "";
    $("#cfg-desc").value = c.descripcion || "";
    $("#cfg-instagram").value = c.instagram || "";
    $("#cfg-ubicacion").value = c.ubicacion || "";
    $("#cfg-envios").value = c.mensajeEnvios || "";

    $("#cfg-herotitulo").value = c.heroTitulo || "";
    $("#cfg-herotag").value = c.heroTagline || "";
    $("#cfg-colorprimario").value = c.colorPrimario || "#05396C";
    $("#cfg-colorprimario-hex").value = c.colorPrimario || "#05396C";
    $("#cfg-coloracento").value = c.colorAcento || "#00AEEF";
    $("#cfg-coloracento-hex").value = c.colorAcento || "#00AEEF";
    $("#cfg-mostrarprecios").checked = c.mostrarPrecios !== false;
    $("#logo-preview-img").src = c.logoDataUrl || "images/logo.png";
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
    saveAll("Datos de contacto guardados ✓");
    renderConfig();
  });

  /* ---------------- CONFIG: APARIENCIA ---------------- */
  function linkColorPair(colorId, hexId) {
    $(colorId).addEventListener("input", () => { $(hexId).value = $(colorId).value; });
    $(hexId).addEventListener("input", () => {
      const v = $(hexId).value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) $(colorId).value = v;
    });
  }
  linkColorPair("#cfg-colorprimario", "#cfg-colorprimario-hex");
  linkColorPair("#cfg-coloracento", "#cfg-coloracento-hex");

  function resizeImagePng(file, maxDim) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio); height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  $("#cfg-logo-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImagePng(file, 500);
      state.config.logoDataUrl = dataUrl;
      $("#logo-preview-img").src = dataUrl;
      toast("Logo cargado. Tocá \"Guardar apariencia\" para publicarlo.");
    } catch (err) {
      toast("No se pudo procesar la imagen del logo", true);
    }
  });
  $("#cfg-logo-reset").addEventListener("click", () => {
    state.config.logoDataUrl = "";
    $("#logo-preview-img").src = "images/logo.png";
    toast("Logo restaurado al original. Tocá \"Guardar apariencia\" para publicarlo.");
  });

  $("#save-apariencia-btn").addEventListener("click", () => {
    state.config = {
      ...state.config,
      heroTitulo: $("#cfg-herotitulo").value.trim() || "UNIFORMAR",
      heroTagline: $("#cfg-herotag").value.trim(),
      colorPrimario: $("#cfg-colorprimario-hex").value.trim() || "#05396C",
      colorAcento: $("#cfg-coloracento-hex").value.trim() || "#00AEEF",
      mostrarPrecios: $("#cfg-mostrarprecios").checked
    };
    saveAll("Apariencia guardada ✓");
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
    list.innerHTML = state.products.map((p, i) => `
      <div class="product-row">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;" data-moveup="${i}" ${i === 0 ? "disabled" : ""}>▲</button>
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;" data-movedown="${i}" ${i === state.products.length - 1 ? "disabled" : ""}>▼</button>
        </div>
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
    $$("[data-moveup]", list).forEach((b) => b.addEventListener("click", () => moveProduct(+b.getAttribute("data-moveup"), -1)));
    $$("[data-movedown]", list).forEach((b) => b.addEventListener("click", () => moveProduct(+b.getAttribute("data-movedown"), 1)));
  }

  function moveProduct(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= state.products.length) return;
    [state.products[index], state.products[j]] = [state.products[j], state.products[index]];
    renderProductList();
    saveAll("Orden actualizado ✓");
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
      <div class="img-item">
        <img src="${im}">
        ${i === 0 ? '<span class="badge" style="position:absolute;bottom:4px;left:4px;top:auto;font-size:.6rem;padding:2px 6px;">Portada</span>' : ""}
        <button class="rm" data-rmimg="${i}">✕</button>
        <div style="position:absolute;bottom:4px;right:4px;display:flex;gap:2px;">
          ${i > 0 ? `<button class="btn btn-outline btn-sm" style="padding:1px 6px;font-size:.7rem;background:#fff;" data-imgleft="${i}">◀</button>` : ""}
          ${i < (p.imagenes.length - 1) ? `<button class="btn btn-outline btn-sm" style="padding:1px 6px;font-size:.7rem;background:#fff;" data-imgright="${i}">▶</button>` : ""}
        </div>
      </div>`).join("");

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
            <label>Fotos <span style="font-weight:400;color:var(--muted);">(la primera es la portada)</span></label>
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
    $$("[data-imgleft]").forEach((b) => b.addEventListener("click", () => {
      syncFieldsToEditing();
      const i = +b.getAttribute("data-imgleft");
      [p.imagenes[i - 1], p.imagenes[i]] = [p.imagenes[i], p.imagenes[i - 1]];
      renderProductModal();
    }));
    $$("[data-imgright]").forEach((b) => b.addEventListener("click", () => {
      syncFieldsToEditing();
      const i = +b.getAttribute("data-imgright");
      [p.imagenes[i + 1], p.imagenes[i]] = [p.imagenes[i], p.imagenes[i + 1]];
      renderProductModal();
    }));

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

  /* =========================================================================
     REPORTE DE REPOSICIÓN
     Muestra qué talle/color de cada modelo está agotado o con stock bajo,
     para saber qué pedirle al proveedor.
     Se puede activar tocando el botón, o automáticamente agregando
     ?reporte=1 a la URL de este panel.
     ========================================================================= */
  function renderAdminTable(threshold) {
    const cont = $("#restock-container");
    const rows = [];
    state.products.forEach((p) => {
      (p.colores || []).forEach((c) => {
        (c.talles || []).forEach((t) => {
          const stock = Number(t.stock) || 0;
          if (stock <= threshold) {
            rows.push({ producto: p.nombre || "(sin nombre)", color: c.nombre || "—", talle: t.talle || "—", stock });
          }
        });
      });
    });
    rows.sort((a, b) => a.stock - b.stock);

    if (!rows.length) {
      cont.innerHTML = `<p style="color:var(--muted);padding:10px 0;">✓ Ningún talle/color está por debajo de ${threshold} unidades. No hay nada urgente para reponer.</p>`;
      return;
    }

    const trHtml = rows.map((r) => {
      const estado = r.stock === 0 ? "agotado" : "bajo";
      const label = r.stock === 0 ? "Agotado" : `${r.stock} unidad(es)`;
      return `<tr class="${estado}">
        <td>${r.producto}</td><td>${r.color}</td><td>${r.talle}</td>
        <td><span class="stock-pill ${estado}">${label}</span></td>
      </tr>`;
    }).join("");

    cont.innerHTML = `
      <table class="restock-table">
        <thead><tr><th>Producto</th><th>Color</th><th>Talle</th><th>Stock</th></tr></thead>
        <tbody>${trHtml}</tbody>
      </table>
      <button class="btn btn-outline btn-sm" id="restock-copy" style="margin-top:12px;">📋 Copiar pedido para el proveedor</button>`;

    $("#restock-copy").addEventListener("click", () => {
      const texto = "Pedido de reposición — UniformAR\n" + rows.map((r) =>
        `• ${r.producto} — ${r.color} — talle ${r.talle} (${r.stock === 0 ? "agotado" : "quedan " + r.stock})`
      ).join("\n");
      navigator.clipboard.writeText(texto).then(
        () => toast("Copiado. Pegalo en el chat de tu proveedor."),
        () => toast("No se pudo copiar automáticamente.", true)
      );
    });
  }

  function toggleRestockReport(forceOpen) {
    const cont = $("#restock-container");
    const open = forceOpen !== undefined ? forceOpen : cont.classList.contains("hidden");
    cont.classList.toggle("hidden", !open);
    $("#restock-toggle").textContent = open ? "Ocultar reporte de reposición" : "Ver reporte de reposición";
    if (open) renderAdminTable(Number($("#restock-threshold").value) || 0);
  }

  $("#restock-toggle").addEventListener("click", () => toggleRestockReport());
  $("#restock-threshold").addEventListener("change", () => {
    if (!$("#restock-container").classList.contains("hidden")) renderAdminTable(Number($("#restock-threshold").value) || 0);
  });
  // Parámetro ?reporte=1 en la URL abre el reporte automáticamente al entrar
  if (new URLSearchParams(location.search).get("reporte") === "1") {
    const openWhenReady = () => { if (state.loaded) toggleRestockReport(true); else setTimeout(openWhenReady, 300); };
    openWhenReady();
  }

  /* =========================================================================
     IMPORTACIÓN MASIVA (CSV)
     Pensado para el export de EmprendeTienda u otra planilla: una fila por
     variante (nombre + color + talle + stock + precio). No asumimos nombres
     de columna fijos — el usuario mapea manualmente qué columna es cada dato,
     con un intento de auto-detección por nombre.
     ========================================================================= */
  const importState = { headers: [], rows: [], mapping: {} };

  function parseCSV(text) {
    // Parser CSV simple con soporte de comillas y comas dentro de comillas.
    const rows = []; let row = []; let field = ""; let inQuotes = false;
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else { field += c; }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((f) => f.trim() !== ""));
  }

  const FIELD_DEFS = [
    { key: "nombre", label: "Nombre del producto", required: true, guess: ["nombre", "producto", "name", "title", "articulo"] },
    { key: "categoria", label: "Categoría", required: false, guess: ["categoria", "category", "rubro", "tipo"] },
    { key: "color", label: "Color", required: true, guess: ["color", "colour"] },
    { key: "talle", label: "Talle", required: true, guess: ["talle", "size", "talla"] },
    { key: "stock", label: "Stock", required: true, guess: ["stock", "cantidad", "existencia", "qty"] },
    { key: "precio", label: "Precio", required: true, guess: ["precio", "price", "importe"] },
    { key: "descripcion", label: "Descripción", required: false, guess: ["descripcion", "detalle", "description"] }
  ];

  const COLOR_HEX = {
    negro: "#1A1A1A", blanco: "#FFFFFF", celeste: "#7EC8E3", azul: "#05396C",
    gris: "#9AA5B1", bordo: "#7A1F2B", verde: "#2E7D5B", rosa: "#E8A0C4",
    violeta: "#7B5EA7", turquesa: "#2FB6A8", amarillo: "#E8C547", naranja: "#E08A3C",
    rojo: "#C0392B", beige: "#D8C4AA", marino: "#0E2A4A"
  };
  function guessHex(nombreColor) {
    const n = (nombreColor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const k in COLOR_HEX) if (n.includes(k)) return COLOR_HEX[k];
    return "#B9C2CC";
  }

  $("#import-drop").addEventListener("click", (e) => { /* el label ya abre el input */ });
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result));
      if (parsed.length < 2) { toast("El archivo no tiene filas de datos.", true); return; }
      importState.headers = parsed[0].map((h) => h.trim());
      importState.rows = parsed.slice(1).map((r) => {
        const o = {}; importState.headers.forEach((h, i) => (o[h] = (r[i] || "").trim())); return o;
      });
      // auto-detección de columnas por nombre
      importState.mapping = {};
      FIELD_DEFS.forEach((f) => {
        const found = importState.headers.find((h) => f.guess.some((g) => h.toLowerCase().replace(/[^a-z]/g, "").includes(g)));
        importState.mapping[f.key] = found || "";
      });
      renderImportMapping();
      toast(`Archivo leído: ${importState.rows.length} fila(s). Revisá el mapeo de columnas.`);
    };
    reader.readAsText(file, "UTF-8");
  });

  function renderImportMapping() {
    const cont = $("#import-mapping");
    cont.classList.remove("hidden");
    const options = (sel) => `<option value="">(ninguna)</option>` +
      importState.headers.map((h) => `<option value="${h}" ${importState.mapping[sel] === h ? "selected" : ""}>${h}</option>`).join("");

    cont.innerHTML = `
      <h3 style="font-size:1rem;margin:18px 0 12px;">¿Qué columna es cada dato?</h3>
      ${FIELD_DEFS.map((f) => `
        <div class="mapping-row">
          <label style="font-weight:600;font-size:.85rem;">${f.label}${f.required ? " *" : ""}</label>
          <select data-map="${f.key}">${options(f.key)}</select>
        </div>`).join("")}
      <label style="display:flex;gap:8px;align-items:center;font-size:.85rem;color:var(--muted);margin:14px 0;">
        <input type="checkbox" id="import-replace"> Si ya existe un producto con el mismo nombre, reemplazarlo en vez de duplicarlo
      </label>
      <div id="import-preview"></div>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button class="btn btn-navy btn-sm" id="import-confirm">Importar</button>
        <button class="btn btn-outline btn-sm" id="import-cancel">Cancelar</button>
      </div>`;

    $$("[data-map]", cont).forEach((sel) => sel.addEventListener("change", () => {
      importState.mapping[sel.getAttribute("data-map")] = sel.value;
      renderImportPreview();
    }));
    $("#import-cancel").addEventListener("click", () => {
      cont.classList.add("hidden"); cont.innerHTML = ""; $("#import-file").value = "";
    });
    $("#import-confirm").addEventListener("click", confirmImport);
    renderImportPreview();
  }

  function renderImportPreview() {
    const m = importState.mapping;
    const missing = FIELD_DEFS.filter((f) => f.required && !m[f.key]);
    const box = $("#import-preview");
    if (missing.length) {
      box.innerHTML = `<p style="color:#c0392b;font-size:.85rem;">Falta indicar: ${missing.map((f) => f.label).join(", ")}.</p>`;
      $("#import-confirm").disabled = true;
      return;
    }
    $("#import-confirm").disabled = false;
    const sample = importState.rows.slice(0, 5);
    box.innerHTML = `
      <p style="font-size:.82rem;color:var(--muted);margin:10px 0 6px;">Vista previa (primeras ${sample.length} de ${importState.rows.length} filas):</p>
      <div style="overflow-x:auto;">
        <table class="import-preview-table">
          <thead><tr>${FIELD_DEFS.map((f) => `<th>${f.label}</th>`).join("")}</tr></thead>
          <tbody>${sample.map((r) => `<tr>${FIELD_DEFS.map((f) => `<td>${m[f.key] ? (r[m[f.key]] || "") : ""}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  function confirmImport() {
    const m = importState.mapping;
    const replace = $("#import-replace").checked;
    const grouped = new Map(); // nombre -> producto en construcción

    importState.rows.forEach((r) => {
      const nombre = (r[m.nombre] || "").trim();
      if (!nombre) return;
      const colorNombre = (r[m.color] || "").trim() || "Único";
      const talle = (r[m.talle] || "").trim() || "Único";
      const stock = Number((r[m.stock] || "0").replace(/[^\d.-]/g, "")) || 0;
      const precio = Number((r[m.precio] || "0").replace(/[^\d.-]/g, "")) || 0;

      if (!grouped.has(nombre)) {
        grouped.set(nombre, {
          id: uid(), nombre,
          categoria: m.categoria ? (r[m.categoria] || "").trim() : "",
          descripcion: m.descripcion ? (r[m.descripcion] || "").trim() : "",
          activo: true, destacado: false, imagenes: [], colores: []
        });
      }
      const prod = grouped.get(nombre);
      let color = prod.colores.find((c) => c.nombre === colorNombre);
      if (!color) { color = { nombre: colorNombre, hex: guessHex(colorNombre), talles: [] }; prod.colores.push(color); }
      let t = color.talles.find((t) => t.talle === talle);
      if (!t) { t = { talle, stock: 0, precio }; color.talles.push(t); }
      t.stock += stock; t.precio = precio || t.precio;
    });

    let nuevos = 0, reemplazados = 0;
    grouped.forEach((prod) => {
      const idx = state.products.findIndex((p) => (p.nombre || "").trim().toLowerCase() === prod.nombre.trim().toLowerCase());
      if (idx >= 0 && replace) {
        prod.id = state.products[idx].id;
        prod.imagenes = state.products[idx].imagenes; // conservamos fotos ya cargadas
        state.products[idx] = prod; reemplazados++;
      } else {
        state.products.push(prod); nuevos++;
      }
    });

    renderProductList();
    $("#import-mapping").classList.add("hidden"); $("#import-mapping").innerHTML = "";
    $("#import-file").value = "";
    saveAll(`Importación lista: ${nuevos} producto(s) nuevo(s), ${reemplazados} reemplazado(s) ✓`);
  }
})();
