const { getStore } = require("@netlify/blobs");

/**
 * Devuelve el store de Netlify Blobs donde se guarda todo (config + productos).
 * Primero intenta la configuración automática (funciona en despliegues normales
 * conectados a Git). Si existen las variables BLOBS_SITE_ID y BLOBS_TOKEN,
 * las usa como respaldo manual — útil si la configuración automática falla
 * en algún entorno particular.
 */
function uniformarStore() {
  const siteID = (process.env.BLOBS_SITE_ID || "").trim();
  const token = (process.env.BLOBS_TOKEN || "").trim();
  if (siteID && token) {
    return getStore({ name: "uniformar", siteID, token, consistency: "strong" });
  }
  return getStore({ name: "uniformar", consistency: "strong" });
}

module.exports = { uniformarStore };
