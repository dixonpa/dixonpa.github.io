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

const fmt = (x, d = 1) => x.toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
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

/* ---------------- Sismograma ---------------- */

function seismogram() {
  const fig = document.querySelector(".seismo");
  const path = fig.querySelector(".seismo-trace");
  const rand = mulberry32(7);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

  const duration = 60, dt = 0.025, n = duration / dt;
  const tP = 9, tS = 17, tR = 24;
  const signal = new Float64Array(n);

  // ondas: suma de senos con frecuencias cercanas y fase al azar, por una envolvente
  const packet = (t0, freqs, amp, rise, decay) => {
    const phases = freqs.map(() => rand() * 2 * Math.PI);
    for (let i = 0; i < n; i++) {
      const t = i * dt - t0;
      if (t < 0) continue;
      const env = amp * (1 - Math.exp(-t / rise)) * Math.exp(-t / decay);
      let s = 0;
      freqs.forEach((f, k) => { s += Math.sin(2 * Math.PI * f * t + phases[k]); });
      signal[i] += env * s / freqs.length;
    }
  };

  packet(tP, [2.6, 3.1, 3.7, 4.3, 5.2], 0.34, 0.08, 2.6);   // P: pequeña y de alta frecuencia
  packet(tS, [0.9, 1.15, 1.4, 1.8], 0.95, 0.25, 4.5);       // S: más grande y lenta
  // ondas superficiales: dispersivas, llegan primero los periodos largos
  for (let i = 0; i < n; i++) {
    const t = i * dt - tR;
    if (t < 0) continue;
    const f = 0.22 + 0.018 * t;
    const env = 1.25 * (1 - Math.exp(-t / 2.5)) * Math.exp(-t / 9);
    signal[i] += env * Math.sin(2 * Math.PI * f * t * 0.9 + 0.6);
  }
  // ruido de fondo suavizado
  let noise = 0;
  for (let i = 0; i < n; i++) {
    noise = 0.75 * noise + 0.25 * gauss();
    signal[i] += 0.035 * noise;
  }

  const peak = signal.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 1200;
    const y = 100 - (signal[i] / peak) * 92;
    d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  path.setAttribute("d", d);

  const axis = fig.querySelector(".seismo-axis");
  for (let s = 0; s <= duration; s += 10) {
    const tick = document.createElement("span");
    tick.style.left = `${(s / duration) * 100}%`;
    tick.dataset.label = s === 0 ? "0 s" : String(s);
    if (s === duration) tick.style.transform = "translateX(-100%)";
    axis.appendChild(tick);
  }

  if (reduceMotion) { fig.classList.add("is-drawn"); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => fig.classList.add("is-drawn")));
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
    q('[data-out="ci"]').textContent = `${fmt(sorted[24], 1)} a ${fmt(sorted[974], 1)} M`;
    q('[data-out="risk"]').textContent = pct(risk, 1);
    setVerdict(q('[data-out="verdict"]'), risk < 0.025,
      risk < 0.025 ? "Cumple el criterio: riesgo de pérdida menor a 2.5%." : "No cumple el criterio: riesgo de pérdida de 2.5% o más.");
    q('[data-out="foot"]').textContent =
      `Uso los ${fmt(size, 0)} pozos de validación de la región (reserva predicha y reserva real). En cada simulación tomo puntos al azar, abro los de mayor reserva predicha y sumo su reserva real. RMSE del modelo en esta región: ${fmt(region.rmse, 2)}. ` +
      `El azar de la web no es el mismo que el de NumPy, así que los números cambian un poco respecto al notebook (región 1: 4.78 M y 2.0%).`;
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
        tip: `${fmt(from, 1)} a ${fmt(from + binW, 1)} M USD: ${c} simulaciones`,
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
    label.textContent = "promedio";
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
  meter.querySelector(".pick-threshold span").textContent = `umbral ${fmt(spec.threshold, 2)}`;

  q('[data-out="foot"]').textContent =
    `Es el XGBoost ajustado del notebook (${model.trees.length} árboles), exportado a JSON y evaluado aquí en JavaScript. ` +
    `En la prueba: AUC-ROC ${fmt(spec.metrics.auc, 3)}, recall ${fmt(spec.metrics.recall, 3)} y precisión ${fmt(spec.metrics.precision, 3)} con umbral ${fmt(spec.threshold, 2)}. ` +
    `El cargo total lo calculo como meses × cargo mensual.`;

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
      p >= spec.threshold ? "Probablemente cancela: conviene ofrecerle algo para que se quede." : "Probablemente se queda.");
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

const CATEGORIES = {
  shopping_net: "Compras en línea", misc_net: "Varios en línea", grocery_pos: "Supermercado",
  shopping_pos: "Compras en tienda", gas_transport: "Gasolina y transporte", misc_pos: "Varios en tienda",
  grocery_net: "Supermercado en línea", travel: "Viajes", personal_care: "Cuidado personal",
  entertainment: "Entretenimiento", kids_pets: "Niños y mascotas", food_dining: "Restaurantes",
  home: "Hogar", health_fitness: "Salud y deporte",
};

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
  meter.querySelector(".pick-threshold span").textContent = `umbral ${fmt(spec.threshold, 2)}`;

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

  q('[data-out="foot"]').textContent =
    `La probabilidad viene de un modelo de demostración: un XGBoost de ${model.trees.length} árboles, porque el Random Forest del proyecto pesa cientos de MB. ` +
    `En la prueba logra AUC-PR ${fmt(spec.metrics.auc_pr, 3)}, recall ${fmt(spec.metrics.recall, 3)} y precisión ${fmt(spec.metrics.precision, 3)} con umbral ${fmt(spec.threshold, 2)} ` +
    `(el modelo del proyecto llega a AUC-PR 0.881). El día, la distancia y la población de la ciudad quedan en la mediana, salvo en los ejemplos reales.`;

  const ratePct = (r) => `${fmt(r * 100, r < 0.01 ? 2 : 1)}%`;
  const tip = (name, d) => `${name}: ${ratePct(d.rate)} de fraude en ${fmt(d.n, 0)} transacciones`;

  function drawChart() {
    const amt = toAmt(amtInput.value);
    const notes = {
      hour: "Tasa de fraude por hora del día. Casi todo el fraude pasa entre las 22:00 y las 3:00.",
      amount: "Tasa de fraude por monto, en USD. Entre 800 y 1200 USD, la mitad de las compras son fraude.",
      category: "Tasa de fraude por categoría. Las compras en línea y el supermercado concentran más fraude.",
    };
    q('[data-out="chartnote"]').textContent = `${notes[tab]} La barra dorada es tu transacción. Total: ${fmt(spec.rows, 0)} transacciones, ${ratePct(spec.fraud_rate)} de fraude.`;
    if (tab === "hour") {
      columnChart(chart, spec.by_hour.map((d) => ({ label: String(d.hour), value: d.rate * 100, tip: tip(`${d.hour}:00`, d) })),
        { yFormat: (v) => `${fmt(v, 1)}%`, highlight: Number(hourInput.value) });
    } else if (tab === "amount") {
      const hl = spec.by_amount.findIndex((d) => amt > d.from && amt <= d.to);
      columnChart(chart, spec.by_amount.map((d) => ({
        label: d.to > 5000 ? `+${d.from}` : String(d.to), value: d.rate * 100, tip: tip(`${d.from} a ${d.to > 5000 ? "más" : d.to} USD`, d),
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
    q('[data-out="age"]').textContent = `${state.age} años`;
    [amtInput, hourInput, ageInput].forEach(paintRange);

    const p = predictProba(model, encode(spec, state));
    q('[data-out="proba"]').textContent = proba(p);
    setMeter(meter, p, spec.threshold);
    let text = p >= spec.threshold ? "El modelo la marcaría como fraude." : "El modelo la dejaría pasar.";
    if (example) text += example.is_fraud ? " En los datos, sí era fraude." : " En los datos, era una compra normal.";
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
      (p >= spec.threshold ? "El modelo la marcaría como fraude." : "El modelo la dejaría pasar.") +
      (example.is_fraud ? " En los datos, sí era fraude." : " En los datos, era una compra normal."));
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

const DEMOS = {
  oilygiant: { file: "data/oilygiant.json", init: oilyGiant },
  telecom: { file: "data/telecom.json", init: telecom },
  fraud: { file: "data/fraud.json", init: fraud },
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
      "No se pudieron cargar los datos de esta demo. Recarga la página para intentarlo de nuevo.";
    console.error(err);
  }
}

seismogram();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    loadDemo(entry.target);
  }
}, { rootMargin: "600px 0px" });
const pending = [...document.querySelectorAll("[data-demo]")];
pending.forEach((demo) => observer.observe(demo));
// respaldo: si la página ya cargó y el usuario no ha bajado, cargo el resto con calma
window.addEventListener("load", () => setTimeout(() => {
  for (const demo of pending) {
    if (demo.dataset.loading) continue;
    observer.unobserve(demo);
    loadDemo(demo);
  }
}, 4000));
