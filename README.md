# Portafolio — Elver Rueda

Sitio personal estático (HTML, CSS y JavaScript, sin dependencias ni build).

- **Portada** con una simulación interactiva del rostro de **Nova**, el bot con ESP32‑S3 + Claude.
- **Nova**: explicación del proyecto, flujo de datos, retos y siguiente fase (voz).
- **Proyectos**: sistema de cortina automática (3 repos), ESP32 IoT, ESP32 → MQTT → SQL Server, API FastAPI.
- **Stack**, **aprendiendo ahora** y **contacto**.
- Tema claro/oscuro (sigue al sistema y se puede cambiar con el botón).

## Verlo en local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python -m http.server 8000
# http://localhost:8000
```

## Publicarlo en GitHub Pages

1. Crea un repo llamado `Portafolio.github.io` (o cualquier nombre).
2. Sube esta carpeta a la rama `main`.
3. En **Settings → Pages**, elige *Deploy from a branch* → `main` / `root`.
4. Quedará en `https://Portafolio.github.io/` (o `https://Portafolio.github.io/<repo>/`).

## Editar contenido

| Qué | Dónde |
|---|---|
| Textos, proyectos y enlaces | `index.html` |
| Colores y tipografía | tokens en `:root` de `styles.css` |
| Emociones del rostro | tabla `FORMAS` en `main.js` |
| Diálogo de la demo | arreglo `GUION` en `main.js` |

El código de Nova está en [ELVERRUEDA/nova-bot](https://github.com/ELVERRUEDA/nova-bot); el enlace aparece en la sección `#nova` de `index.html`.
