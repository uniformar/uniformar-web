const { getStore } = require("@netlify/blobs");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "El sitio no tiene configurada la variable ADMIN_PASSWORD en Netlify."
      })
    };
  }

  if (body.password !== adminPassword) {
    return { statusCode: 401, body: JSON.stringify({ error: "Contraseña incorrecta" }) };
  }

  if (!body.config || !Array.isArray(body.products)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos (config/products)" }) };
  }

  try {
    const store = getStore("uniformar");
    const payload = { config: body.config, products: body.products, actualizado: new Date().toISOString() };
    await store.setJSON("store", payload);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, actualizado: payload.actualizado })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo guardar", detail: String(err) })
    };
  }
};
