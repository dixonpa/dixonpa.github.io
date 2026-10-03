// Sismograma del inicio y demos de los proyectos. Todo corre en el navegador, sin servidor.
document.documentElement.classList.add("js");

const SVG_NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Generador aleatorio con semilla, para que la demo dé lo mismo cada vez que carga
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

// Textos de las demos en español e inglés; el idioma sale del atributo lang de la página
const LANG = document.documentElement.lang.startsWith("en") ? "en" : "es";
const TEXT = {
  es: {
    locale: "es-PE",
    to: "a",
    oilyPass: "Cumple el criterio: riesgo de pérdida menor a 2.5%.",
    oilyFail: "No cumple el criterio: riesgo de pérdida de 2.5% o más.",
    oilyFoot: (size, rmse) => `Uso los ${size} pozos de validación de la región (reserva predicha y reserva real). En cada simulación tomo puntos al azar, abro los de mayor reserva predicha y sumo su reserva real. RMSE del modelo en esta región: ${rmse}. ` +
      "El azar de la web no es el mismo que el de NumPy, así que los números cambian un poco respecto al notebook (región 1: 4.78 M y 2.0%).",
    oilyTip: (from, to, c) => `${from} a ${to} M USD: ${c} simulaciones`,
    mean: "promedio",
    threshold: "umbral",
    years: "años",
    telFoot: (trees, m, thr) => `Es el XGBoost ajustado del notebook (${trees} árboles), exportado a JSON y evaluado aquí en JavaScript. ` +
      `En la prueba: AUC-ROC ${m.auc}, recall ${m.recall} y precisión ${m.precision} con umbral ${thr}. El cargo total lo calculo como meses × cargo mensual.`,
    churnYes: "Probablemente cancela: conviene ofrecerle algo para que se quede.",
    churnNo: "Probablemente se queda.",
    fraudFoot: (trees, m, thr) => `La probabilidad viene de un modelo de demostración: un XGBoost de ${trees} árboles, porque el Random Forest del proyecto pesa cientos de MB. ` +
      `En la prueba logra AUC-PR ${m.auc_pr}, recall ${m.recall} y precisión ${m.precision} con umbral ${thr} (el modelo del proyecto llega a AUC-PR 0.881). ` +
      "El día, la distancia y la población de la ciudad quedan en la mediana, salvo en los ejemplos reales.",
    fraudTip: (name, rate, n) => `${name}: ${rate} de fraude en ${n} transacciones`,
    notes: {
      hour: "Tasa de fraude por hora del día. Casi todo el fraude pasa entre las 22:00 y las 3:00.",
      amount: "Tasa de fraude por monto, en USD. Entre 800 y 1200 USD, la mitad de las compras son fraude.",
      category: "Tasa de fraude por categoría. Las compras en línea y el supermercado concentran más fraude.",
    },
    noteTail: (rows, rate) => `La barra dorada es tu transacción. Total: ${rows} transacciones, ${rate} de fraude.`,
    more: "más",
    fraudYes: "El modelo la marcaría como fraude.",
    fraudNo: "El modelo la dejaría pasar.",
    wasFraud: " En los datos, sí era fraude.",
    wasNormal: " En los datos, era una compra normal.",
    loadError: "No se pudieron cargar los datos de esta demo. Recarga la página para intentarlo de nuevo.",
    categories: {
      shopping_net: "Compras en línea", misc_net: "Varios en línea", grocery_pos: "Supermercado",
      shopping_pos: "Compras en tienda", gas_transport: "Gasolina y transporte", misc_pos: "Varios en tienda",
      grocery_net: "Supermercado en línea", travel: "Viajes", personal_care: "Cuidado personal",
      entertainment: "Entretenimiento", kids_pets: "Niños y mascotas", food_dining: "Restaurantes",
      home: "Hogar", health_fitness: "Salud y deporte",
    },
  },
  en: {
    locale: "en-US",
    to: "to",
    oilyPass: "Meets the rule: risk of loss below 2.5%.",
    oilyFail: "Fails the rule: risk of loss of 2.5% or more.",
    oilyFoot: (size, rmse) => `I use the region's ${size} validation wells (predicted and actual reserves). Each simulation picks random points, opens the ones with the highest predicted reserves and adds up their actual reserves. Model RMSE in this region: ${rmse}. ` +
      "The browser's random numbers are not NumPy's, so results differ a little from the notebook (region 1: 4.78 M and 2.0%).",
    oilyTip: (from, to, c) => `${from} to ${to} M USD: ${c} simulations`,
    mean: "mean",
    threshold: "threshold",
    years: "years",
    telFoot: (trees, m, thr) => `This is the tuned XGBoost from the notebook (${trees} trees), exported to JSON and evaluated here in JavaScript. ` +
      `On the test set: ROC AUC ${m.auc}, recall ${m.recall} and precision ${m.precision} with a ${thr} threshold. Total charges are calculated as months × monthly charge.`,
    churnYes: "Likely to cancel: worth offering something to keep them.",
    churnNo: "Likely to stay.",
    fraudFoot: (trees, m, thr) => `The probability comes from a demo model: an XGBoost with ${trees} trees, because the project's Random Forest weighs hundreds of MB. ` +
      `On the test set it reaches PR AUC ${m.auc_pr}, recall ${m.recall} and precision ${m.precision} with a ${thr} threshold (the project model reaches PR AUC 0.881). ` +
      "Day of week, distance and city population stay at their median, except in the real examples.",
    fraudTip: (name, rate, n) => `${name}: ${rate} fraud in ${n} transactions`,
    notes: {
      hour: "Fraud rate by hour of day. Almost all fraud happens between 10 pm and 3 am.",
      amount: "Fraud rate by amount, in USD. Between 800 and 1200 USD, half of the purchases are fraud.",
      category: "Fraud rate by category. Online shopping and groceries concentrate the most fraud.",
    },
    noteTail: (rows, rate) => `The gold bar is your transaction. Total: ${rows} transactions, ${rate} fraud.`,
    more: "more",
    fraudYes: "The model would flag it as fraud.",
    fraudNo: "The model would let it through.",
    wasFraud: " In the data, it was fraud.",
    wasNormal: " In the data, it was a normal purchase.",
    loadError: "This demo's data could not be loaded. Reload the page to try again.",
    categories: {
      shopping_net: "Online shopping", misc_net: "Misc. online", grocery_pos: "Groceries",
      shopping_pos: "In-store shopping", gas_transport: "Gas and transport", misc_pos: "Misc. in store",
      grocery_net: "Online groceries", travel: "Travel", personal_care: "Personal care",
      entertainment: "Entertainment", kids_pets: "Kids and pets", food_dining: "Restaurants",
      home: "Home", health_fitness: "Health and fitness",
    },
  },
}[LANG];

const fmt = (x, d = 1) => x.toLocaleString(TEXT.locale, { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 0) => `${fmt(x * 100, d)}%`;
// probabilidades muy chicas: "<0.1%" dice más que "0.0%"
const proba = (p) => (p < 0.001 ? "<0.1%" : pct(p, p < 0.1 ? 1 : 0));

const ICONS = {
  good: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m5 8.2 2 2 4-4.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bad: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.2v3.6M8 11.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

function setVerdict(node, ok, text) {
  node.className = `verdict ${ok ? "good" : "bad"}`;
  node.innerHTML = `${ICONS[ok ? "good" : "bad"]}<span></span>`;
  node.querySelector("span").textContent = text;
}

/* ---------------- Selector de idioma ---------------- */

// Al cambiar de idioma, sigue en la misma sección. Los id cambian entre la página
// en español y la de inglés, así que uso una tabla de equivalencias [es, en].
const SECTION_PAIRS = [
  ["sobre-mi", "about"],
  ["habilidades", "skills"],
  ["proyectos", "projects"],
  ["oilygiant", "oilygiant"],
  ["telecom", "telecom"],
  ["fraude", "fraud"],
  ["contacto", "contact"],
];

document.querySelectorAll(".lang-switch a:not([aria-current])").forEach((link) => {
  link.addEventListener("click", () => {
    const here = LANG === "es" ? 0 : 1;
    const present = SECTION_PAIRS.filter((pair) => document.getElementById(pair[here]));
    let current = null;
    for (const pair of present) {
      // la sección actual es la última cuyo inicio ya pasó el tercio superior de la pantalla
      if (document.getElementById(pair[here]).getBoundingClientRect().top <= window.innerHeight / 3) current = pair;
    }
    // al final de la página la última sección (Contacto) nunca llega a ese tercio
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atBottom && window.scrollY > 0) current = present[present.length - 1];
    const url = new URL(link.href);
    url.hash = current ? current[1 - here] : "";
    link.href = url.href;
  });
});

/* ---------------- Fondo sísmico ---------------- */

// Registro de varias trazas, como un sismograma de estaciones a distinta distancia:
// la onda P llega primero y la S después, y ambas llegan más tarde en las trazas lejanas.
function seismicBackdrop() {
  const box = document.querySelector(".backdrop");
  const svg = box.querySelector("svg");
  const rand = mulberry32(7);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

  const duration = 60, dt = 0.05, n = duration / dt;
  const traces = 11;
  const rowH = 900 / (traces + 1);

  const trace = (k) => {
    const signal = new Float64Array(n);
    const x = k / (traces - 1); // distancia relativa de la estación
    const tP = Math.hypot(12, 16 * x), tS = Math.hypot(19, 30 * x), tR = 24 + 22 * x;
    const packet = (t0, freqs, amp, rise, decay) => {
      const phases = freqs.map(() => rand() * 2 * Math.PI);
      for (let i = 0; i < n; i++) {
        const t = i * dt - t0;
        if (t < 0) continue;
        const env = amp * (1 - Math.exp(-t / rise)) * Math.exp(-t / decay);
        let v = 0;
        freqs.forEach((f, j) => { v += Math.sin(2 * Math.PI * f * t + phases[j]); });
        signal[i] += env * v / freqs.length;
      }
    };
    const fade = 1 - 0.45 * x; // las estaciones lejanas registran menos amplitud
    packet(tP, [2.1, 2.7, 3.3, 4.1], 0.35 * fade, 0.1, 2.4);  // P: pequeña y rápida
    packet(tS, [0.8, 1.1, 1.4], 0.9 * fade, 0.3, 4);          // S: más grande y lenta
    for (let i = 0; i < n; i++) {                              // ondas superficiales
      const t = i * dt - tR;
      if (t < 0) continue;
      signal[i] += 1.1 * fade * (1 - Math.exp(-t / 2.5)) * Math.exp(-t / 8) * Math.sin(2 * Math.PI * (0.22 + 0.02 * t) * t);
    }
    let noise = 0;
    for (let i = 0; i < n; i++) {
      noise = 0.7 * noise + 0.3 * gauss();
      signal[i] += 0.04 * noise;
    }
    return signal;
  };

  for (let k = 0; k < traces; k++) {
    const signal = trace(k);
    const y0 = rowH * (k + 1);
    let d = "";
    for (let i = 0; i < n; i++) {
      const xPos = (i / (n - 1)) * 1200;
      d += `${i ? "L" : "M"}${xPos.toFixed(1)},${(y0 - signal[i] * rowH * 1.1).toFixed(1)}`;
    }
    el("path", { d }, svg);
  }
  // aparece con un fundido para que no "salte" al cargar
  requestAnimationFrame(() => box.classList.add("is-ready"));
}

/* ---------------- Utilidades de gráficos ---------------- */

const tooltip = document.querySelector(".tooltip");
function showTip(e, text) {
  tooltip.textContent = text;
  tooltip.hidden = false;
  const pad = 12;
  const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
  let x = e.clientX + pad, y = e.clientY - h - pad;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
  if (y < 8) y = e.clientY + pad;
  tooltip.style.transform = `translate(${x}px, ${y}px)`;
}
function hideTip() { tooltip.hidden = true; }
window.addEventListener("scroll", hideTip, { passive: true });

function niceStep(range, target) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

function addHit(svg, attrs, text, onEnter) {
  const hit = el("rect", { ...attrs, class: "hit" }, svg);
  const show = (e) => { showTip(e, text); onEnter && onEnter(true); };
  hit.addEventListener("pointerenter", show);
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", () => { hideTip(); onEnter && onEnter(false); });
  return hit;
}

// Barras verticales: items = [{label, value, tip, cls}]
function columnChart(container, items, { height = 210, yFormat, highlight = -1 } = {}) {
  const width = container.clientWidth || 600;
  const m = { top: 12, right: 4, bottom: 24, left: 40 };
  const w = width - m.left - m.right, h = height - m.top - m.bottom;
  const max = Math.max(...items.map((d) => d.value));
  const step = niceStep(max, 4);
  const top = Math.ceil(max / step) * step;
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });

  const grid = el("g", { class: "grid" }, svg);
  for (let v = 0; v <= top + 1e-9; v += step) {
    const y = m.top + h - (v / top) * h;
    el("line", { x1: m.left, x2: width - m.right, y1: y, y2: y }, grid);
    el("text", { x: m.left - 8, y: y + 4, "text-anchor": "end" }, svg).textContent = yFormat(v);
  }

  const slot = w / items.length;
  const gap = Math.min(2, slot * 0.2);
  const labelEvery = Math.ceil(items.length / Math.max(1, Math.floor(w / 34)));
  items.forEach((d, i) => {
    const bh = Math.max(1, (d.value / top) * h);
    const x = m.left + i * slot + gap / 2;
    const bw = Math.max(1, slot - gap);
    const r = Math.min(3, bw / 2, bh);
    const y = m.top + h - bh;
    // barra con extremo redondeado arriba y base recta sobre el eje
    el("path", {
      class: `bar ${i === highlight ? "hl" : ""} ${d.cls || ""}`,
      d: `M${x},${y + bh}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${y + bh}Z`,
    }, svg);
    if (i % labelEvery === 0) {
      el("text", { x: x + bw / 2, y: height - 6, "text-anchor": "middle" }, svg).textContent = d.label;
    }
    addHit(svg, { x: m.left + i * slot, y: m.top, width: slot, height: h }, d.tip);
  });
  container.replaceChildren(svg);
  return { svg, m, w, h, width, height };
}

// Barras horizontales, para categorías con nombres largos
function barChart(container, items, { xFormat, highlight = -1 } = {}) {
  const width = container.clientWidth || 600;
  const rowH = 22;
  const labelW = Math.min(170, width * 0.42);
  const m = { top: 4, right: 44, bottom: 4, left: labelW };
  const height = m.top + m.bottom + rowH * items.length;
  const w = width - m.left - m.right;
  const max = Math.max(...items.map((d) => d.value));
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });
  items.forEach((d, i) => {
    const y = m.top + i * rowH;
    const bw = Math.max(1, (d.value / max) * w);
    const bh = rowH - 6;
    const r = Math.min(3, bw);
    el("text", { x: m.left - 10, y: y + bh / 2 + 7, "text-anchor": "end" }, svg).textContent = d.label;
    el("path", {
      class: `bar ${i === highlight ? "hl" : ""}`,
      d: `M${m.left},${y + 3}H${m.left + bw - r}Q${m.left + bw},${y + 3} ${m.left + bw},${y + 3 + r}V${y + 3 + bh - r}Q${m.left + bw},${y + 3 + bh} ${m.left + bw - r},${y + 3 + bh}H${m.left}Z`,
    }, svg);
    el("text", { x: m.left + bw + 6, y: y + bh / 2 + 7 }, svg).textContent = xFormat(d.value);
    addHit(svg, { x: 0, y, width, height: rowH }, d.tip);
  });
  container.replaceChildren(svg);
}

// Rellena el riel del slider hasta el valor actual (Chrome/Safari no tienen ::progress)
function paintRange(input) {
  const p = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty("--fill", `${p}%`);
}

// Modelo XGBoost exportado: cada nodo es [variable, umbral, izq, der] y cada hoja [-1, valor].
// XGBoost compara en float32, por eso uso Math.fround.
function prepareModel(model) {
  for (const tree of model.trees) for (const node of tree) if (node[0] !== -1) node[1] = Math.fround(node[1]);
  return model;
}
function predictProba(model, x) {
  let margin = model.base;
  for (const tree of model.trees) {
    let node = tree[0];
    while (node[0] !== -1) node = Math.fround(x[node[0]]) < node[1] ? tree[node[2]] : tree[node[3]];
    margin += node[1];
  }
  return 1 / (1 + Math.exp(-margin));
}

// StandardScaler + OneHotEncoder, en el mismo orden que el ColumnTransformer
function encode(spec, values) {
  const x = spec.numeric.map((c) => (values[c.name] - c.mean) / c.scale);
  for (const c of spec.categorical) for (const v of c.values) x.push(values[c.name] === v ? 1 : 0);
  return x;
}

const metrics3 = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, fmt(v, 3)]));

function setMeter(meter, p, threshold) {
  meter.querySelector(".meter-fill").style.transform = `scaleX(${p})`;
  meter.classList.toggle("is-over", p >= threshold);
}

function onResize(node, fn) {
  let last = node.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(node.clientWidth - last) > 4) { last = node.clientWidth; fn(); }
  }).observe(node);
}

/* ---------------- OilyGiant ---------------- */

function oilyGiant(root, data) {
  const COST_PER_WELL = 500_000;  // 100 M USD para 200 pozos
  const REVENUE = 4500;           // USD por cada 1000 barriles
  const SIMULATIONS = 1000;
  // ordeno los pozos por reserva predicha una sola vez; así, elegir "los de mayor predicción"
  // en una muestra es quedarse con los rangos más chicos (sort numérico nativo, mucho más rápido)
  const regions = data.regions.map((r) => {
    const order = r.pred.map((_, i) => i).sort((a, b) => r.pred[b] - r.pred[a]);
    return { rmse: r.rmse, size: order.length, realByRank: Int32Array.from(order, (i) => r.real[i]) };
  });
  const q = (s) => root.querySelector(s);
  const inputs = { points: q('[data-input="points"]'), wells: q('[data-input="wells"]') };
  const chart = q('[data-chart="hist"]');
  let seed = 12345;
  let profits = [];

  function simulate() {
    const region = regions[Number(q('[name="oily-region"]:checked').value)];
    const points = Number(inputs.points.value);
    const wells = Math.min(Number(inputs.wells.value), points);
    const rand = mulberry32(seed);
    const size = region.size;
    const sample = new Int32Array(points);
    profits = new Float64Array(SIMULATIONS);
    for (let s = 0; s < SIMULATIONS; s++) {
      for (let i = 0; i < points; i++) sample[i] = (rand() * size) | 0;
      // abro los pozos con mayor reserva predicha (rango más chico) y sumo su reserva real
      sample.sort();
      let barrels = 0;
      for (let i = 0; i < wells; i++) barrels += region.realByRank[sample[i]];
      profits[s] = ((barrels / 10) * REVENUE - wells * COST_PER_WELL) / 1e6;
    }
    const sorted = Float64Array.from(profits).sort();
    const mean = profits.reduce((a, b) => a + b, 0) / SIMULATIONS;
    const risk = profits.filter((p) => p < 0).length / SIMULATIONS;
    q('[data-out="mean"]').textContent = `${fmt(mean, 2)} M`;
    q('[data-out="ci"]').textContent = `${fmt(sorted[24], 1)} ${TEXT.to} ${fmt(sorted[974], 1)} M`;
    q('[data-out="risk"]').textContent = pct(risk, 1);
    setVerdict(q('[data-out="verdict"]'), risk < 0.025,
      risk < 0.025 ? TEXT.oilyPass : TEXT.oilyFail);
    q('[data-out="foot"]').textContent = TEXT.oilyFoot(fmt(size, 0), fmt(region.rmse, 2));
    draw(mean);
  }

  function draw(mean) {
    const lo = Math.floor(Math.min(...profits, 0)), hi = Math.ceil(Math.max(...profits, 0));
    const bins = 40;
    const binW = (hi - lo) / bins;
    const counts = new Array(bins).fill(0);
    for (const p of profits) counts[Math.min(bins - 1, Math.floor((p - lo) / binW))]++;
    const items = counts.map((c, i) => {
      const from = lo + i * binW;
      return {
        value: c,
        label: "",
        cls: from + binW / 2 < 0 ? "loss" : "",
        tip: TEXT.oilyTip(fmt(from, 1), fmt(from + binW, 1), c),
      };
    });
    const { svg, m, w, h, height } = columnChart(chart, items, { yFormat: (v) => fmt(v, 0) });
    const xOf = (v) => m.left + ((v - lo) / (hi - lo)) * w;
    const step = niceStep(hi - lo, Math.max(3, Math.floor(w / 80)));
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      el("text", { x: xOf(v), y: height - 6, "text-anchor": "middle" }, svg).textContent = fmt(Math.abs(v) < 1e-9 ? 0 : v, 0);
    }
    const zero = xOf(0);
    el("line", { class: "zero", x1: zero, x2: zero, y1: m.top - 4, y2: m.top + h }, svg);
    const mx = xOf(mean);
    el("line", { class: "mean-line", x1: mx, x2: mx, y1: m.top - 6, y2: m.top + h }, svg);
    const label = el("text", { class: "mean-label", x: mx + 5, y: m.top + 4 }, svg);
    label.textContent = TEXT.mean;
    // los rectángulos de hover van al final para quedar encima de las líneas
    svg.querySelectorAll(".hit").forEach((hit) => svg.appendChild(hit));
  }

  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(simulate); };

  for (const input of Object.values(inputs)) {
    paintRange(input);
    input.addEventListener("input", () => {
      if (Number(inputs.wells.value) > Number(inputs.points.value)) inputs.wells.value = inputs.points.value;
      for (const i of Object.values(inputs)) {
        paintRange(i);
        q(`[data-out="${i.dataset.input}"]`).textContent = i.value;
      }
      schedule();
    });
  }
  // los sliders disparan muchos eventos seguidos (rAF); un clic se calcula al momento
  root.querySelectorAll('[name="oily-region"]').forEach((r) => r.addEventListener("change", simulate));
  q('[data-action="rerun"]').addEventListener("click", () => { seed += 1; simulate(); });
  onResize(chart, () => draw(profits.reduce((a, b) => a + b, 0) / profits.length));
  simulate();
}

/* ---------------- Telecom ---------------- */

const SERVICES = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"];

function telecom(root, spec) {
  const model = prepareModel(spec.model);
  const q = (s) => root.querySelector(s);
  const tenure = q('[data-input="tenure"]');
  const monthly = q('[data-input="monthly"]');
  const payment = q('[data-input="PaymentMethod"]');
  const services = [...root.querySelectorAll('[data-group="services"] input')];
  const flags = Object.fromEntries([...root.querySelectorAll('[data-group="flags"] input')].map((i) => [i.value, i]));
  const radio = (name) => q(`[name="${name}"]:checked`).value;
  const setRadio = (name, value) => { q(`[name="${name}"][value="${value}"]`).checked = true; };
  const meter = q("[data-meter]");
  meter.querySelector(".pick-threshold").style.setProperty("--t", spec.threshold);
  meter.querySelector(".pick-threshold span").textContent = `${TEXT.threshold} ${fmt(spec.threshold, 2)}`;
  q('[data-out="foot"]').textContent = TEXT.telFoot(model.trees.length, metrics3(spec.metrics), fmt(spec.threshold, 2));

  function update() {
    const internet = radio("tel-net");
    const hasPhone = flags.has_phone.checked;
    services.forEach((s) => { s.disabled = internet === "No"; if (s.disabled) s.checked = false; });
    flags.MultipleLines.disabled = !hasPhone;
    if (!hasPhone) flags.MultipleLines.checked = false;

    const yesNo = (b) => (b ? "Yes" : "No");
    const values = {
      tenure_months: Number(tenure.value),
      MonthlyCharges: Number(monthly.value),
      TotalCharges: Number(tenure.value) * Number(monthly.value),
      n_services: services.filter((s) => s.checked).length,
      SeniorCitizen: flags.SeniorCitizen.checked ? 1 : 0,
      has_internet: internet === "No" ? 0 : 1,
      has_phone: hasPhone ? 1 : 0,
      Type: radio("tel-type"),
      PaperlessBilling: yesNo(flags.PaperlessBilling.checked),
      PaymentMethod: payment.value,
      gender: radio("tel-gender"),
      Partner: yesNo(flags.Partner.checked),
      Dependents: yesNo(flags.Dependents.checked),
      InternetService: internet,
      MultipleLines: yesNo(flags.MultipleLines.checked),
    };
    for (const s of services) values[s.value] = yesNo(s.checked);

    const p = predictProba(model, encode(spec, values));
    q('[data-out="proba"]').textContent = proba(p);
    q('[data-out="tenure"]').textContent = tenure.value;
    q('[data-out="monthly"]').textContent = `${monthly.value} USD`;
    paintRange(tenure); paintRange(monthly);
    setMeter(meter, p, spec.threshold);
    setVerdict(q('[data-out="verdict"]'), p < spec.threshold,
      p >= spec.threshold ? TEXT.churnYes : TEXT.churnNo);
  }

  const PRESETS = {
    risky: { type: "Month-to-month", tenure: 3, monthly: 85, net: "Fiber optic", services: ["StreamingTV"], payment: "Electronic check", paperless: true },
    loyal: { type: "Two year", tenure: 60, monthly: 65, net: "DSL", services: ["OnlineSecurity", "OnlineBackup", "TechSupport"], payment: "Credit card (automatic)", paperless: false },
  };
  root.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    const p = PRESETS[button.dataset.preset];
    setRadio("tel-type", p.type);
    setRadio("tel-net", p.net);
    tenure.value = p.tenure;
    monthly.value = p.monthly;
    services.forEach((s) => { s.checked = p.services.includes(s.value); });
    payment.value = p.payment;
    flags.PaperlessBilling.checked = p.paperless;
    update();
  }));

  root.addEventListener("input", update);
  root.addEventListener("change", update);
  update();
}

/* ---------------- Fraude ---------------- */

const CATEGORIES = TEXT.categories;

function fraud(root, spec) {
  const model = prepareModel(spec.model);
  const q = (s) => root.querySelector(s);
  const amtInput = q('[data-input="amt"]');
  const hourInput = q('[data-input="hour"]');
  const ageInput = q('[data-input="age"]');
  const category = q('[data-input="category"]');
  const chart = q('[data-chart="fraud"]');
  const meter = q("[data-meter]");
  meter.querySelector(".pick-threshold").style.setProperty("--t", spec.threshold);
  meter.querySelector(".pick-threshold span").textContent = `${TEXT.threshold} ${fmt(spec.threshold, 2)}`;

  // el monto va en escala logarítmica: hay muchas compras chicas y pocas grandes
  const AMT_MAX = 2500;
  const toAmt = (v) => Math.round(Math.exp((v / 1000) * Math.log(AMT_MAX)));
  const toSlider = (a) => Math.round((Math.log(Math.max(1, a)) / Math.log(AMT_MAX)) * 1000);

  for (const c of spec.by_category) {
    const option = new Option(CATEGORIES[c.category] || c.category, c.category);
    category.add(option);
  }
  const state = { ...spec.medians, gender: "F" };
  amtInput.value = toSlider(state.amt);
  category.value = "grocery_pos";
  let tab = "hour";
  let example = null;
  const exampleIndex = { 0: 0, 1: 0 };

  q('[data-out="foot"]').textContent = TEXT.fraudFoot(model.trees.length, metrics3(spec.metrics), fmt(spec.threshold, 2));

  const ratePct = (r) => `${fmt(r * 100, r < 0.01 ? 2 : 1)}%`;
  const tip = (name, d) => TEXT.fraudTip(name, ratePct(d.rate), fmt(d.n, 0));

  function drawChart() {
    const amt = toAmt(amtInput.value);
    const notes = TEXT.notes;
    q('[data-out="chartnote"]').textContent = `${notes[tab]} ${TEXT.noteTail(fmt(spec.rows, 0), ratePct(spec.fraud_rate))}`;
    if (tab === "hour") {
      columnChart(chart, spec.by_hour.map((d) => ({ label: String(d.hour), value: d.rate * 100, tip: tip(`${d.hour}:00`, d) })),
        { yFormat: (v) => `${fmt(v, 1)}%`, highlight: Number(hourInput.value) });
    } else if (tab === "amount") {
      const hl = spec.by_amount.findIndex((d) => amt > d.from && amt <= d.to);
      columnChart(chart, spec.by_amount.map((d) => ({
        label: d.to > 5000 ? `+${d.from}` : String(d.to), value: d.rate * 100, tip: tip(`${d.from} ${TEXT.to} ${d.to > 5000 ? TEXT.more : d.to} USD`, d),
      })), { yFormat: (v) => `${fmt(v, 0)}%`, highlight: hl < 0 ? 0 : hl });
    } else {
      const hl = spec.by_category.findIndex((d) => d.category === category.value);
      barChart(chart, spec.by_category.map((d) => ({ label: CATEGORIES[d.category], value: d.rate * 100, tip: tip(CATEGORIES[d.category], d) })),
        { xFormat: (v) => `${fmt(v, 2)}%`, highlight: hl });
    }
  }

  function update(fromExample = false) {
    if (!fromExample) example = null;
    state.amt = toAmt(amtInput.value);
    state.hour = Number(hourInput.value);
    state.age = Number(ageInput.value);
    state.category = category.value;
    if (!fromExample) Object.assign(state, { day_of_week: spec.medians.day_of_week, distance_km: spec.medians.distance_km, city_pop: spec.medians.city_pop, gender: "F" });

    q('[data-out="amt"]').textContent = `${fmt(state.amt, 0)} USD`;
    q('[data-out="hour"]').textContent = `${String(state.hour).padStart(2, "0")}:00`;
    q('[data-out="age"]').textContent = `${state.age} ${TEXT.years}`;
    [amtInput, hourInput, ageInput].forEach(paintRange);

    const p = predictProba(model, encode(spec, state));
    q('[data-out="proba"]').textContent = proba(p);
    setMeter(meter, p, spec.threshold);
    let text = p >= spec.threshold ? TEXT.fraudYes : TEXT.fraudNo;
    if (example) text += example.is_fraud ? TEXT.wasFraud : TEXT.wasNormal;
    setVerdict(q('[data-out="verdict"]'), p < spec.threshold, text);
    drawChart();
  }

  root.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
    const cls = Number(button.dataset.example);
    const pool = spec.examples.filter((e) => e.is_fraud === cls);
    example = pool[exampleIndex[cls]++ % pool.length];
    Object.assign(state, example);
    amtInput.value = toSlider(example.amt);
    hourInput.value = example.hour;
    ageInput.value = Math.min(90, Math.max(18, example.age));
    category.value = example.category;
    update(true);
    state.amt = example.amt; // el slider redondea; para el modelo uso el monto real
    const p = predictProba(model, encode(spec, state));
    q('[data-out="amt"]').textContent = `${fmt(example.amt, 2)} USD`;
    q('[data-out="proba"]').textContent = proba(p);
    setMeter(meter, p, spec.threshold);
    setVerdict(q('[data-out="verdict"]'), p < spec.threshold,
      (p >= spec.threshold ? TEXT.fraudYes : TEXT.fraudNo) + (example.is_fraud ? TEXT.wasFraud : TEXT.wasNormal));
  }));

  const tabs = [...root.querySelectorAll("[data-tab]")];
  tabs.forEach((button) => button.addEventListener("click", () => {
    tab = button.dataset.tab;
    tabs.forEach((b) => b.setAttribute("aria-selected", String(b === button)));
    hideTip();
    drawChart();
  }));
  // flechas izquierda/derecha entre pestañas
  root.querySelector(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.indexOf(document.activeElement);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); next.click();
  });

  [amtInput, hourInput, ageInput].forEach((i) => i.addEventListener("input", () => update()));
  category.addEventListener("change", () => update());
  onResize(chart, drawChart);
  update();
}

/* ---------------- Carga perezosa de cada demo ---------------- */

// las rutas salen de la ubicación de este script, así la versión en inglés (/en/) usa los mismos datos
const DATA_URL = new URL("../data/", document.currentScript.src);
const DEMOS = {
  oilygiant: { file: new URL("oilygiant.json", DATA_URL), init: oilyGiant },
  telecom: { file: new URL("telecom.json", DATA_URL), init: telecom },
  fraud: { file: new URL("fraud.json", DATA_URL), init: fraud },
};

async function loadDemo(root) {
  if (root.dataset.loading) return;
  root.dataset.loading = "true";
  const { file, init } = DEMOS[root.dataset.demo];
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(response.status);
    init(root, await response.json());
    root.setAttribute("aria-busy", "false");
  } catch (err) {
    root.querySelector('[data-out="foot"]').textContent =
      TEXT.loadError;
    console.error(err);
  }
}

seismicBackdrop();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    loadDemo(entry.target);
  }
}, { rootMargin: "600px 0px" });
const pending = [...document.querySelectorAll("[data-demo]")];
pending.forEach((demo) => observer.observe(demo));

// Si la página se abre en una sección (por ejemplo al cambiar de idioma desde Telecom),
// cargo todas las demos y vuelvo a ubicar la sección cuando terminan, porque al dibujarse
// cambian la altura de la página. Si la persona ya empezó a moverse, no la muevo.
const hashTarget = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
if (hashTarget) {
  let userMoved = false;
  const markMoved = () => { userMoved = true; };
  ["wheel", "touchstart", "keydown"].forEach((type) => window.addEventListener(type, markMoved, { once: true, passive: true }));
  Promise.all(pending.map((demo) => { observer.unobserve(demo); return loadDemo(demo); }))
    .then(() => { if (!userMoved) hashTarget.scrollIntoView({ behavior: "instant", block: "start" }); });
}
// respaldo: si la página ya cargó y el usuario no ha bajado, cargo el resto con calma
window.addEventListener("load", () => setTimeout(() => {
  for (const demo of pending) {
    if (demo.dataset.loading) continue;
    observer.unobserve(demo);
    loadDemo(demo);
  }
}, 4000));
