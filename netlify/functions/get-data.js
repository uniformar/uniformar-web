const { getStore } = require("@netlify/blobs");

const DEFAULT_CONFIG = {
  nombreTienda: "UniformAR",
  descripcion: "Ambos y uniformes de salud. Comodidad y estilo para tu día a día.",
  whatsapp: "5492657296637",
  instagram: "uniformar_",
  email: "",
  ubicacion: "Villa Mercedes, San Luis",
  mensajeEnvios: "Retiro en Villa Mercedes o envíos a todo el país.",
  colorPrimario: "#05396C",
  colorAcento: "#00AEEF"
};

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  try {
    const store = getStore("uniformar");
    const data = await store.get("store", { type: "json" });
    const payload = data || { config: DEFAULT_CONFIG, products: [] };
    if (!payload.config) payload.config = DEFAULT_CONFIG;
    if (!payload.products) payload.products = [];
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo leer el catálogo", detail: String(err) })
    };
  }
};
