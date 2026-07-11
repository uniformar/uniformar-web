const { uniformarStore } = require("./_store.js");

const DEFAULT_CONFIG = {
  nombreTienda: "UniformAR",
  heroTitulo: "UNIFORMAR",
  heroTagline: "ambos que te cuidan a vos",
  descripcion: "Ambos y uniformes de salud. Comodidad y estilo para tu día a día.",
  whatsapp: "5492657296637",
  instagram: "uniformar_",
  email: "",
  ubicacion: "Villa Mercedes, San Luis",
  mensajeEnvios: "Retiro en Villa Mercedes o envíos a todo el país.",
  colorPrimario: "#05396C",
  colorAcento: "#00AEEF",
  logoDataUrl: "",
  mostrarPrecios: true
};

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  try {
    const store = uniformarStore();
    const data = await store.get("store", { type: "json" });
    const payload = data || { config: DEFAULT_CONFIG, products: [] };
    payload.config = { ...DEFAULT_CONFIG, ...(payload.config || {}) };
    if (!payload.products) payload.products = [];
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "No se pudo leer el catálogo",
        detail: String((err && err.message) || err)
      })
    };
  }
};
