// ============================================================
//  Portafolio de Elver Rueda
//  - Tema claro/oscuro
//  - Rostro de Nova: misma idea que el firmware (face.cpp),
//    ojos y boca que interpolan hacia la forma de cada emocion.
// ============================================================

// ---------- Tema ----------
(function tema() {
  const root = document.documentElement;
  try {
    const guardado = localStorage.getItem("tema");
    if (guardado) root.dataset.theme = guardado;
  } catch (_) {}

  document.getElementById("themeToggle").addEventListener("click", () => {
    const oscuroActual = root.dataset.theme
      ? root.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = oscuroActual ? "light" : "dark";
    try { localStorage.setItem("tema", root.dataset.theme); } catch (_) {}
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  const botonCopiar = document.getElementById("copyEmail");
  botonCopiar.addEventListener("click", () => {
    const correo = document.getElementById("email").textContent;
    const listo = () => { botonCopiar.textContent = "Copiado"; setTimeout(() => (botonCopiar.textContent = "Copiar correo"), 1800); };
    const seleccionar = () => {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById("email"));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      botonCopiar.textContent = "Seleccionado: usa Ctrl+C";
    };
    try { navigator.clipboard.writeText(correo).then(listo, seleccionar); } catch (_) { seleccionar(); }
  });
})();

// ---------- Rostro de Nova ----------
(function rostro() {
  const canvas = document.getElementById("face");
  const ctx = canvas.getContext("2d");
  const texto = document.getElementById("deviceText");
  const chipsBox = document.getElementById("emotionChips");
  const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const W = 480, H = 480;
  const FONDO = "#05080b";
  const OJO = "#5ee8f5";

  // Forma de cada emocion (equivalente a la tabla FORMAS del firmware).
  //  alto/ancho: tamano del ojo (1 = normal)
  //  parpado:    cuanto cubre el parpado superior (0..1)
  //  inclinar:   angulo del parpado (+ enojado, - triste)
  //  mejilla:    cuanto sube el borde inferior (ojos sonrientes)
  //  curva:      sonrisa (+) o tristeza (-) de la boca
  //  abrir:      boca abierta (0..1)
  const FORMAS = {
    neutral:     { alto: 1.0,  ancho: 1.0,  parpado: 0.0,  inclinar: 0,     mejilla: 0,    curva: 0.15, abrir: 0,    asim: 0 },
    feliz:       { alto: 0.95, ancho: 1.05, parpado: 0.0,  inclinar: 0,     mejilla: 0.45, curva: 1.0,  abrir: 0.15, asim: 0 },
    triste:      { alto: 0.9,  ancho: 1.0,  parpado: 0.35, inclinar: -0.35, mejilla: 0,    curva: -0.8, abrir: 0,    asim: 0 },
    enojado:     { alto: 0.9,  ancho: 1.0,  parpado: 0.4,  inclinar: 0.4,   mejilla: 0,    curva: -0.4, abrir: 0,    asim: 0 },
    sorprendido: { alto: 1.25, ancho: 0.9,  parpado: 0.0,  inclinar: 0,     mejilla: 0,    curva: 0,    abrir: 0.9,  asim: 0 },
    confundido:  { alto: 1.0,  ancho: 1.0,  parpado: 0.1,  inclinar: 0.15,  mejilla: 0,    curva: -0.2, abrir: 0,    asim: 0.35 },
    somnoliento: { alto: 1.0,  ancho: 1.05, parpado: 0.6,  inclinar: 0,     mejilla: 0.1,  curva: 0,    abrir: 0,    asim: 0 },
  };

  // Charla guionizada para la demo: [pregunta, emocion, respuesta]
  const GUION = [
    ["hola nova", "feliz", "¡Hola! Soy Nova. Vivo en una ESP32-S3 y pienso con Claude."],
    ["¿cómo decides tu cara?", "neutral", "Claude me devuelve JSON: una emoción y la respuesta."],
    ["¿puedes oírme?", "triste", "Aún no… me falta un micrófono I2S. Es la siguiente fase."],
    ["¡pero ya tienes cara!", "sorprendido", "¡Cierto! Dos ojos, una boca y unos 30 fps."],
    ["¿y si nadie te habla?", "somnoliento", "Tras 90 s sin actividad, me duermo. Tócame para despertar."],
  ];

  const actual = { ...FORMAS.neutral };
  let objetivo = FORMAS.neutral;
  let emocion = "neutral";
  let hablandoHasta = 0;
  let mirada = { x: 0, y: 0 }, miradaObj = { x: 0, y: 0 };
  let proximoParpadeo = performance.now() + 2500;
  let parpadeo = 0; // 0 abierto, 1 cerrado
  let proximaMirada = performance.now() + 1500;
  let cursorHasta = 0;

  // ---- Chips de emociones ----
  const chips = {};
  for (const nombre of Object.keys(FORMAS)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = nombre;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      detenerGuion();
      ponerEmocion(nombre);
      escribir(`{"emocion": "${nombre}"}`);
    });
    chipsBox.appendChild(b);
    chips[nombre] = b;
  }

  function ponerEmocion(nombre) {
    emocion = nombre;
    objetivo = FORMAS[nombre];
    for (const [n, b] of Object.entries(chips)) b.setAttribute("aria-pressed", String(n === nombre));
  }

  // ---- Texto letra a letra (como ui_texto.cpp) ----
  let temporizadorTexto = null;
  function escribir(cadena, alTerminar) {
    clearInterval(temporizadorTexto);
    if (reducirMovimiento) {
      texto.textContent = cadena;
      alTerminar && alTerminar();
      return;
    }
    let i = 0;
    texto.textContent = "";
    hablandoHasta = performance.now() + cadena.length * 35;
    temporizadorTexto = setInterval(() => {
      texto.textContent = cadena.slice(0, ++i);
      if (i >= cadena.length) {
        clearInterval(temporizadorTexto);
        alTerminar && alTerminar();
      }
    }, 35);
  }

  // ---- Guion automatico ----
  let pasoGuion = 0, temporizadorGuion = null, guionActivo = true;
  function siguientePaso() {
    if (!guionActivo) return;
    const [pregunta, emo, respuesta] = GUION[pasoGuion % GUION.length];
    pasoGuion++;
    ponerEmocion("neutral");
    texto.textContent = "> " + pregunta;
    temporizadorGuion = setTimeout(() => {
      ponerEmocion("confundido"); // "pensando"
      texto.textContent = "pensando…";
      temporizadorGuion = setTimeout(() => {
        ponerEmocion(emo);
        escribir(respuesta, () => { temporizadorGuion = setTimeout(siguientePaso, 2600); });
      }, 1100);
    }, 1300);
  }
  function detenerGuion() {
    guionActivo = false;
    clearTimeout(temporizadorGuion);
  }

  // ---- Mirar al cursor / al toque ----
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    miradaObj.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    miradaObj.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    cursorHasta = performance.now() + 1500;
  });
  canvas.addEventListener("pointerdown", () => {
    // Como en el firmware: tocar la cara la pone contenta.
    detenerGuion();
    ponerEmocion("feliz");
    escribir("¡Hey! Me tocaste :)");
  });

  // ---- Dibujo ----
  const lerp = (a, b, t) => a + (b - a) * t;

  function rectRedondo(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dibujarOjo(cx, cy, lado, f) {
    const asim = lado * f.asim;
    const w = 108 * f.ancho;
    const h = Math.max(6, 128 * f.alto * (1 + asim) * (1 - parpadeo * 0.94));
    const x = cx - w / 2, y = cy - h / 2;

    ctx.save();
    rectRedondo(x, y, w, h, 30);
    ctx.shadowColor = OJO;
    ctx.shadowBlur = 28;
    ctx.fillStyle = OJO;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();

    ctx.fillStyle = FONDO;
    // Parpado superior inclinado: el lado interior baja cuando inclinar > 0.
    if (f.parpado > 0.01) {
      const base = y + h * f.parpado;
      const d = f.inclinar * 60;
      const interior = lado < 0 ? x + w : x; // lado -1 = ojo izquierdo
      const exterior = lado < 0 ? x : x + w;
      ctx.beginPath();
      ctx.moveTo(exterior, y - 5);
      ctx.lineTo(interior, y - 5);
      ctx.lineTo(interior, base + d);
      ctx.lineTo(exterior, base - d);
      ctx.closePath();
      ctx.fill();
    }
    // Mejilla: arco que sube desde abajo (ojos sonrientes).
    if (f.mejilla > 0.01) {
      ctx.beginPath();
      ctx.ellipse(cx, y + h + h * 0.55 - h * f.mejilla, w * 0.8, h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function dibujarBoca(f, t) {
    const cx = 240 + mirada.x * 8, cy = 316 + mirada.y * 5;
    const ancho = 70;
    let abrir = f.abrir;
    if (t < hablandoHasta) abrir = Math.max(abrir, 0.25 + 0.35 * Math.abs(Math.sin(t / 70)));

    ctx.save();
    ctx.strokeStyle = OJO;
    ctx.fillStyle = OJO;
    ctx.shadowColor = OJO;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";

    const curva = f.curva * 26;
    if (abrir > 0.05) {
      const alto = 8 + abrir * 34;
      ctx.beginPath();
      ctx.moveTo(cx - ancho / 2, cy);
      ctx.quadraticCurveTo(cx, cy + curva * 0.6 - alto * 0.3, cx + ancho / 2, cy);
      ctx.quadraticCurveTo(cx, cy + curva + alto * 1.3, cx - ancho / 2, cy);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - ancho / 2, cy - curva * 0.2);
      ctx.quadraticCurveTo(cx, cy + curva, cx + ancho / 2, cy - curva * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function cuadro(t) {
    // Interpolar forma (suave, como el firmware)
    for (const k in actual) actual[k] = lerp(actual[k], objetivo[k], 0.14);

    // Parpadeo
    if (t > proximoParpadeo) {
      const fase = (t - proximoParpadeo) / 160;
      parpadeo = fase < 1 ? fase : fase < 2 ? 2 - fase : 0;
      if (fase >= 2) proximoParpadeo = t + 2200 + Math.random() * 3200;
    }
    if (emocion === "somnoliento") parpadeo = Math.max(parpadeo, 0.25 + 0.15 * Math.sin(t / 600));

    // Mirar alrededor si no hay cursor
    if (t > cursorHasta && t > proximaMirada) {
      miradaObj = Math.random() < 0.4
        ? { x: 0, y: 0 }
        : { x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.5) * 0.8 };
      proximaMirada = t + 1200 + Math.random() * 2500;
    }
    mirada.x = lerp(mirada.x, Math.max(-1, Math.min(1, miradaObj.x)), 0.12);
    mirada.y = lerp(mirada.y, Math.max(-1, Math.min(1, miradaObj.y)), 0.12);

    ctx.fillStyle = FONDO;
    ctx.fillRect(0, 0, W, H);

    const ox = mirada.x * 26, oy = mirada.y * 18 - 30;
    dibujarOjo(160 + ox, 200 + oy, -1, actual);
    dibujarOjo(320 + ox, 200 + oy, 1, actual);
    dibujarBoca(actual, t);

    requestAnimationFrame(cuadro);
  }

  ponerEmocion("neutral");
  if (reducirMovimiento) {
    // Sin animaciones: un solo cuadro estatico y el texto fijo.
    guionActivo = false;
    texto.textContent = "¡Hola! Soy Nova. Toca una emoción.";
    for (const k in actual) actual[k] = objetivo[k];
    const t = performance.now();
    proximoParpadeo = Infinity; proximaMirada = Infinity; cursorHasta = Infinity;
    ctx.fillStyle = FONDO; ctx.fillRect(0, 0, W, H);
    const pintarEstatico = () => {
      for (const k in actual) actual[k] = objetivo[k];
      ctx.fillStyle = FONDO; ctx.fillRect(0, 0, W, H);
      dibujarOjo(160, 170, -1, actual);
      dibujarOjo(320, 170, 1, actual);
      dibujarBoca(actual, t);
    };
    pintarEstatico();
    chipsBox.addEventListener("click", () => requestAnimationFrame(pintarEstatico));
    canvas.addEventListener("pointerdown", () => requestAnimationFrame(pintarEstatico));
  } else {
    requestAnimationFrame(cuadro);
    setTimeout(siguientePaso, 800);
  }
})();
