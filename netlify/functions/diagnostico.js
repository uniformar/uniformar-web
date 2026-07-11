const { uniformarStore } = require("./_store.js");

// Visitá /api/diagnostico en el navegador para chequear si el guardado de
// datos (Netlify Blobs) está andando bien, y qué datos hay guardados
// realmente en el servidor ahora mismo. No expone información sensible.
exports.handler = async function () {
  const resultado = {
    fecha: new Date().toISOString(),
    variableAdminPassword: !!process.env.ADMIN_PASSWORD,
    variablesBlobsManuales: !!(process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN),
    escrituraLectura: null,
    error: null,
    datosGuardadosAhora: null
  };
  try {
    const store = uniformarStore();
    const marca = "ok-" + Date.now();
    await store.set("diagnostico", marca);
    const leido = await store.get("diagnostico");
    resultado.escrituraLectura = leido === marca ? "FUNCIONA CORRECTAMENTE ✓" : "Escribió pero leyó distinto: " + leido;

    // Esto es lo mismo que lee index.html/admin.html — si acá ya está
    // actualizado pero en la web no se ve, el problema es del lado del
    // navegador/deploy, no del guardado.
    const store2 = await store.get("store", { type: "json" });
    if (store2) {
      resultado.datosGuardadosAhora = {
        nombreTienda: store2.config && store2.config.nombreTienda,
        heroTitulo: store2.config && store2.config.heroTitulo,
        cantidadProductos: (store2.products || []).length,
        nombresProductos: (store2.products || []).map((p) => p.nombre),
        ultimaActualizacion: store2.actualizado || "(sin registrar)"
      };
    } else {
      resultado.datosGuardadosAhora = "No hay ningún dato guardado todavía (store vacío).";
    }
  } catch (err) {
    resultado.escrituraLectura = "FALLÓ ✗";
    resultado.error = String((err && err.stack) || err);
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(resultado, null, 2)
  };
};
