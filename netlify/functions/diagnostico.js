const { uniformarStore } = require("./_store.js");

// Visitá /api/diagnostico en el navegador para chequear si el guardado de
// datos (Netlify Blobs) está andando bien. No expone información sensible.
exports.handler = async function () {
  const resultado = {
    fecha: new Date().toISOString(),
    variableAdminPassword: !!process.env.ADMIN_PASSWORD,
    variablesBlobsManuales: !!(process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN),
    escrituraLectura: null,
    error: null
  };
  try {
    const store = uniformarStore();
    const marca = "ok-" + Date.now();
    await store.set("diagnostico", marca);
    const leido = await store.get("diagnostico");
    resultado.escrituraLectura = leido === marca ? "FUNCIONA CORRECTAMENTE ✓" : "Escribió pero leyó distinto: " + leido;
  } catch (err) {
    resultado.escrituraLectura = "FALLÓ ✗";
    resultado.error = String((err && err.stack) || err);
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resultado, null, 2)
  };
};
