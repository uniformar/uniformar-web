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

  const ok = body.password === adminPassword;
  return {
    statusCode: ok ? 200 : 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok })
  };
};
