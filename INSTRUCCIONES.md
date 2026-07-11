# UniformAR — Tienda online + gestión de stock

Esta es tu web: catálogo público (modelos, talles, colores, fotos, precio, WhatsApp) +
un panel de administración privado donde vos cargás y actualizás el stock. Se aloja
gratis en Netlify.

No necesitás saber programar para usarla día a día. Vas a necesitar seguir estos
pasos **una sola vez** para dejarla publicada.

---

## 1. Qué es cada cosa

- **`public/`** → el sitio que ve la gente (index.html = catálogo, admin.html = tu panel).
- **`netlify/functions/`** → el "motor" que guarda el stock de forma real (no en tu
  navegador, sino en un servidor). No necesitás tocar esto.
- **`netlify.toml`** y **`package.json`** → configuración técnica, tampoco se toca.

El stock, precios, fotos y datos de contacto se guardan en **Netlify Blobs**, un
almacenamiento incluido gratis en tu cuenta de Netlify. No hace falta contratar
ninguna base de datos aparte.

---

## 2. Publicar el sitio (una sola vez)

### Paso 1 — Crear cuenta en GitHub (gratis)
Entrá a [github.com](https://github.com) y creá una cuenta si no tenés.

### Paso 2 — Subir estos archivos a un repositorio
1. En GitHub, tocá **"New repository"** (botón verde). Nombralo `uniformar-web`,
   dejalo en **Public** o **Private** (cualquiera funciona), y creálo.
2. Dentro del repositorio recién creado, tocá **"uploading an existing file"** (o
   "Add file" → "Upload files").
3. Arrastrá **todo el contenido de esta carpeta** (los archivos y carpetas: `public`,
   `netlify`, `netlify.toml`, `package.json`) a la ventana del navegador.
4. Tocá **"Commit changes"** para guardar.

*(Alternativa más cómoda si te trabás: instalá [GitHub Desktop](https://desktop.github.com/),
que te deja arrastrar la carpeta entera con una interfaz visual, sin comandos.)*

### Paso 3 — Crear cuenta en Netlify y conectar el repositorio
1. Entrá a [netlify.com](https://netlify.com) y creá una cuenta gratis (podés
   entrar directo con tu cuenta de GitHub, es más rápido).
2. Tocá **"Add new site" → "Import an existing project"**.
3. Elegí **GitHub** y seleccioná el repositorio `uniformar-web`.
4. Netlify va a detectar automáticamente la configuración (ya está en
   `netlify.toml`). No cambies nada, solo tocá **"Deploy"**.
5. Esperá 1-2 minutos. Cuando termine, te da un link tipo
   `https://nombre-random-123.netlify.app` — ese ya es tu sitio funcionando.

### Paso 4 — Configurar tu contraseña de administrador
Esto es importante: sin este paso, el panel de administración no te va a dejar
guardar cambios.

1. En Netlify, andá a tu sitio → **"Site configuration" → "Environment variables"**.
2. Tocá **"Add a variable"**.
3. Poné como nombre (Key): `ADMIN_PASSWORD`
4. Como valor (Value), elegí una contraseña que solo vos conozcas (evitá algo
   obvio como "1234").
5. Guardá. Después andá a **"Deploys"** y tocá **"Trigger deploy" → "Deploy site"**
   una vez más, para que la contraseña quede activa.

### Paso 5 (opcional) — Elegir un nombre más lindo para tu sitio
Por defecto Netlify te da un nombre random (`petal-crumble-123.netlify.app`).
Podés cambiarlo:
1. **"Site configuration" → "Site details" → "Change site name"**.
2. Poné algo como `uniformar` (si está libre, te queda `uniformar.netlify.app`).

Más adelante, si querés tu propio dominio (`www.uniformar.com.ar`), también se
conecta desde ahí — comprás el dominio donde quieras y lo apuntás a Netlify.

---

## 2.1 Si el panel te da error al guardar ("No se pudo guardar...")

Visitá **`https://tu-sitio.netlify.app/api/diagnostico`** en el navegador. Te va
a mostrar un texto que dice si el guardado de datos (Netlify Blobs) está
funcionando o no, y por qué.

Si dice que falló, casi siempre se soluciona así:
1. Confirmá que configuraste `ADMIN_PASSWORD` (Paso 4) y volviste a hacer
   **"Trigger deploy" → "Deploy site"** después de guardarlo.
2. Si sigue fallando, como respaldo podés configurar dos variables más en
   **Environment variables**:
   - `BLOBS_SITE_ID` → lo encontrás en "Site configuration" → "General" →
     "Site details" → "Site ID".
   - `BLOBS_TOKEN` → lo generás en tu **foto de perfil (arriba a la derecha) →
     "User settings" → "Applications" → "New access token"**. Copialo y pegalo
     ahí (Netlify solo te lo muestra una vez).
3. Guardá las variables y volvé a hacer "Trigger deploy" una vez más.
4. Volvé a entrar a `/api/diagnostico` para confirmar que ahora funciona.

---

## 3. Usar el panel de administración (día a día)

Entrá a: `https://tu-sitio.netlify.app/admin.html`

1. Ingresá la contraseña que configuraste (`ADMIN_PASSWORD`).

2. **Apariencia de la tienda** — acá controlás cómo se ve la web, sin tocar código:
   - **Logo**: subí una imagen (PNG con fondo transparente, idealmente) y se
     actualiza en toda la web. "Usar el logo original" lo vuelve al que ya
     tenías.
   - **Título grande de portada** y **frase debajo**: el texto principal que
     ve la gente al entrar (por defecto "UNIFORMAR" / "ambos que te cuidan a vos").
   - **Color principal** y **color de acento**: los dos colores de marca de
     toda la web. Podés tocar el cuadradito de color o escribir el código
     (ej: `#05396C`) directamente.
   - **Mostrar precios**: si lo destildás, en vez del precio la tienda
     muestra "Consultar precio" en todos los productos (útil si preferís
     cerrar el precio por WhatsApp).
   - Tocá **"Guardar apariencia"** para que los cambios se vean en la web.

3. **Datos de contacto**: WhatsApp, Instagram, ubicación y mensaje de envíos.
   Tocá "Guardar datos de contacto".

4. **Productos**: tocá **"+ Nuevo producto"** para cargar un ambo:
   - Nombre, categoría (Ambo, Chaqueta, Pantalón, Set, Accesorios — o escribí una
     propia), descripción.
   - **Fotos**: subí una o varias. La **primera foto es la portada** (la que
     se ve en la grilla del catálogo). Podés reordenarlas con las flechas
     ◀ ▶ o borrarlas con la ✕.
   - Agregá uno o más **colores**, y dentro de cada color, uno o más **talles** con
     su **stock** y **precio**.
   - Tocá "Guardar producto". Se guarda al instante — no hace falta ningún otro paso.

5. **Orden de los productos**: en la lista de productos del panel, usá las
   flechas **▲ ▼** de cada fila para subir o bajar un producto — ese es el
   orden en que se ve en la tienda por defecto (el visitante también puede
   cambiar el orden desde el catálogo con "Ordenar por", pero el que vos
   definís acá es el que se ve al entrar).

6. Para editar stock (por ejemplo, se vendió un talle y ya no queda), entrá al
   producto, cambiá el número de stock de ese talle a `0`, y guardá. La web lo va
   a mostrar como agotado automáticamente (tachado, no se puede seleccionar).

7. Para ocultar un producto sin borrarlo (por ejemplo, fuera de temporada), destildá
   "Visible en la tienda" al editarlo.

Todo lo que guardás ahí se ve **al instante** en la tienda pública (`index.html`) —
no hay demora ni necesidad de volver a publicar nada.

---

## 4. Cómo compra la gente

1. Entra al catálogo, filtra por categoría/talle/color, busca por nombre, o
   cambia el orden ("Ordenar por": recientes, nombre, precio).
2. Toca un producto → elige color → elige talle (si no hay stock, aparece tachado
   y no se puede elegir).
3. Toca **"Consultar por WhatsApp"** → se abre WhatsApp con un mensaje ya armado
   ("Hola! Me interesa el Ambo Clásico color Coral talle M. ¿Está disponible?"),
   directo a tu número. Ahí cerrás la venta vos, como ya lo hacés hoy.

La web no cobra ni gestiona pagos — es un catálogo con stock en tiempo real que
deriva la conversación a WhatsApp, tal como me pediste (similar a EmprendeTienda,
pero con el catálogo mostrando disponibilidad real por talle).

---

## 5. Preguntas frecuentes

**¿Cuánto cuesta esto?** Nada, mientras te mantengas en el plan gratuito de Netlify
(que incluye más tráfico y capacidad de la que vas a necesitar para un negocio de
este tamaño).

**¿Quién más puede ver el panel de administración?** Solo quien tenga el link
`/admin.html` y tu contraseña. No lo compartas ni lo publiques en redes.

**¿Puedo cambiar la contraseña?** Sí, cambiá el valor de `ADMIN_PASSWORD` en
Netlify (Paso 4) y volvé a hacer "Trigger deploy".

**¿Y si quiero cambiar el diseño, agregar una página, o algo más avanzado?**
Volvé a pedírmelo — puedo modificar estos archivos y vos solo tenés que volver
a subirlos a GitHub (Netlify se actualiza solo).

**¿Puedo seguir usando EmprendeTienda o Instagram en paralelo?** Sí, esta web no
reemplaza nada por sí sola — funciona en paralelo hasta que decidas cómo integrarla.
