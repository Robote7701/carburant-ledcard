/*
 * Carburant LED Card — prix des carburants façon panneau d'autoroute, afficheurs LED
 * https://github.com/robote7701/carburant-ledcard
 *
 * Lit automatiquement les capteurs de l'intégration « Prix Carburant »
 * (https://github.com/Aohzan/hass-prixcarburant) : attributs station_id + fuel_type.
 *
 * type: custom:carburant-ledcard
 * title: Carburants
 * subtitle: autour de chez moi
 * pinned: ["12345678"]        # stations toujours en haut
 * fuels: [E10, Gazole]        # colonnes (E10, SP95, SP98, Gazole, E85, GPLc)
 * sort: distance              # distance | price
 * stale_days: 3               # au-delà, prix en orange
 * max_stations: 0             # 0 = toutes
 * show_logos: true
 * style: autoroute            # autoroute | sobre
 * layout: auto                # auto | row | stacked (auto = empilé au-delà de 3 carburants)
 */
const CLC_VERSION = "1.1.1";
const CLC_TAG = "carburant-ledcard";

const CLC_I18N = {
  fr: {
    title: "Carburants", foot: "Prix au litre · touchez un prix pour l'historique",
    best: "moins cher", fresh: "à jour", stale: (d) => `> ${d} j`, na: "INDIS.", out: "RUPT.",
    na_title: "Carburant non vendu ici", price_of: "Prix du",
    empty: "Aucune station trouvée. Installez l'intégration Prix Carburant.",
    f_title: "Titre", f_subtitle: "Sous-titre", f_pinned: "Stations épinglées en haut (ID de station)",
    f_fuels: "Carburants (colonnes)", f_sort: "Tri", f_sort_distance: "Distance", f_sort_price: "Prix (1er carburant)",
    f_stale: "Prix ancien au-delà de (jours)", f_max: "Nombre max. de stations (0 = toutes)", f_logos: "Afficher les logos",
  },
  en: {
    title: "Fuel prices", foot: "Price per litre · tap a price for history",
    best: "cheapest", fresh: "up to date", stale: (d) => `> ${d} d`, na: "N/A", out: "OUT",
    na_title: "Fuel not sold here", price_of: "Price from",
    empty: "No station found. Install the Prix Carburant integration.",
    f_title: "Title", f_subtitle: "Subtitle", f_pinned: "Stations pinned on top (station ID)",
    f_fuels: "Fuels (columns)", f_sort: "Sort", f_sort_distance: "Distance", f_sort_price: "Price (1st fuel)",
    f_stale: "Price is old after (days)", f_max: "Max stations (0 = all)", f_logos: "Show logos",
  },
};
const clcLang = (hass) => ((hass && (hass.locale?.language || hass.language)) || "fr").startsWith("fr") ? "fr" : "en";
const clcT = (hass) => CLC_I18N[clcLang(hass)];

const CLC_STYLE = `
  :host { display:block; }
  .panel {
    --sign-blue:#0a3f9c; --sign-blue-2:#0d4fbf; --sign-red:#e2001a;
    --led:#ffd319; --led-old:#ff7a12; --led-best:#8dff5c; --led-bad:#ff4040; --led-off:#9aa1ab;
    position:relative; overflow:hidden; border-radius:14px; padding:6px;
    background:linear-gradient(180deg,var(--sign-blue-2),var(--sign-blue));
    box-shadow:0 2px 8px rgba(0,0,0,.35);
    font-family:"Arial Narrow","Roboto Condensed","Helvetica Neue",Roboto,Arial,sans-serif;
    font-stretch:condensed; color:#fff;
  }
  .frame { border:3px solid #fff; border-radius:10px; padding:10px 10px 8px; position:relative; }
  .head { display:flex; align-items:center; gap:10px; margin:-10px -10px 8px; padding:10px;
    border-radius:7px 7px 0 0; position:relative; overflow:hidden; }
  .head::after { content:""; position:absolute; top:0; right:0; bottom:0; width:34%;
    background:linear-gradient(115deg, transparent 0 18%, #fff 18% 24%, var(--sign-red) 24% 100%); }
  .pict { width:42px; height:42px; flex:none; background:#fff; border-radius:7px; display:flex;
    align-items:center; justify-content:center; color:var(--sign-blue); position:relative; z-index:1; }
  .pict ha-icon { --mdc-icon-size:30px; }
  .titles { position:relative; z-index:1; min-width:0; }
  .t { font-size:24px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; line-height:1; }
  .s { font-size:14px; opacity:.9; margin-top:3px; font-style:italic; }
  .grid { display:grid; grid-template-columns:44px minmax(0,1fr) 40px repeat(var(--n),72px);
    column-gap:6px; align-items:center; }
  .cols { padding:2px 0 6px; border-bottom:2px solid rgba(255,255,255,.85); margin-bottom:2px; }
  .cols div { font-size:15px; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-align:center; }
  .cols .km { font-size:12px; opacity:.85; }
  .row { padding:5px 0; border-bottom:1px solid rgba(255,255,255,.16); }
  .row:last-of-type { border-bottom:none; }
  .row.pinned { background:rgba(255,255,255,.10); margin:4px -10px 0; padding:7px 10px;
    box-shadow:inset 5px 0 0 var(--sign-red); border-bottom:none; }
  .sep { height:5px; margin:0 -10px 4px; background:linear-gradient(180deg,#fff 0 40%,var(--sign-red) 40% 100%); }
  .badge { width:44px; height:30px; background:#fff; border-radius:5px; color:var(--sign-blue);
    display:flex; align-items:center; justify-content:center; text-align:center; font-weight:800;
    line-height:1; text-transform:uppercase; overflow:hidden; padding:0 2px; box-sizing:border-box;
    white-space:nowrap; letter-spacing:-.2px; }
  .pinned .badge { box-shadow:0 0 0 2px var(--sign-red); }
  .badge img { max-width:100%; max-height:24px; object-fit:contain; display:block; }
  .badge.has-img .bl { display:none; }
  .name { min-width:0; }
  .name .n { font-size:14px; font-weight:700; text-transform:uppercase; line-height:1.1;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
    letter-spacing:.2px; word-break:break-word; }
  .name .c { font-size:11.5px; opacity:.75; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .pin { color:var(--sign-red); font-size:14px; margin-right:3px; text-shadow:0 0 2px #fff; }
  .km { font-size:16px; font-weight:700; text-align:right; white-space:nowrap; }
  .km small { font-size:11px; font-weight:400; opacity:.85; margin-left:1px; }
  .led { position:relative; height:34px; border-radius:4px; background:#0b0b0b; cursor:pointer;
    box-shadow:inset 0 0 0 2px #2b2b2b, inset 0 3px 8px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.15);
    display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .led > span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
  .digits, .ghost { font:700 22px/1 "DejaVu Sans Mono","Consolas","Menlo","Liberation Mono","Droid Sans Mono",monospace;
    letter-spacing:1px;
    -webkit-mask-image:radial-gradient(circle,#000 58%,transparent 66%); -webkit-mask-size:2.5px 2.5px;
    mask-image:radial-gradient(circle,#000 58%,transparent 66%); mask-size:2.5px 2.5px; }
  .ghost { color:rgba(255,200,60,.09); }
  .glow { filter:drop-shadow(0 0 1.5px rgba(255,210,0,.95)) drop-shadow(0 0 5px rgba(255,190,0,.45)); }
  .digits { color:var(--led); }
  .led.best .glow { filter:drop-shadow(0 0 1.5px rgba(120,255,80,.95)) drop-shadow(0 0 5px rgba(90,255,60,.45)); }
  .led.best .digits { color:var(--led-best); }
  .led.stale .glow { filter:drop-shadow(0 0 1.5px rgba(255,110,0,.95)) drop-shadow(0 0 5px rgba(255,80,0,.45)); }
  .led.stale .digits { color:var(--led-old); }
  .led.na .glow { filter:none; }
  .led.na .ghost { opacity:0; }
  .led.na .digits { color:var(--led-off); font-size:16px; }
  .led.out .digits { color:var(--led-bad); font-size:17px; }
  .led.out .glow { filter:drop-shadow(0 0 2px rgba(255,40,40,.9)); }
  .led:active { transform:scale(.97); }
  .foot { display:flex; flex-wrap:wrap; gap:4px 12px; justify-content:space-between; font-size:11.5px;
    opacity:.9; margin-top:8px; padding-top:6px; border-top:2px solid rgba(255,255,255,.85); }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin:0 4px 0 8px; vertical-align:0; }
  .dot:first-child { margin-left:0; }
  .empty { padding:18px 4px; text-align:center; opacity:.85; }

  /* ---- style sobre : suit le thème Home Assistant ---- */
  .panel.sober { background:none; padding:0; box-shadow:none; border-radius:0; color:var(--primary-text-color);
    font-family:var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif)); font-stretch:normal; }
  .sober .frame { border:none; padding:12px 14px 10px; }
  .sober .head { margin:0 0 6px; padding:0; border-radius:0; }
  .sober .head::after { display:none; }
  .sober .pict { width:auto; height:auto; background:none; color:var(--primary-color); }
  .sober .pict ha-icon { --mdc-icon-size:24px; }
  .sober .t { font-size:18px; font-weight:500; letter-spacing:0; text-transform:none; }
  .sober .s { color:var(--secondary-text-color); font-style:normal; font-size:13px; }
  .sober .cols { border-bottom:1px solid var(--divider-color); }
  .sober .cols div { font-size:12px; font-weight:500; color:var(--secondary-text-color); letter-spacing:.5px; }
  .sober .row { border-bottom:1px solid var(--divider-color); }
  .sober .row.pinned { background:color-mix(in srgb, var(--primary-color) 8%, transparent); margin:4px -14px 0;
    padding:7px 14px; box-shadow:inset 3px 0 0 var(--primary-color); }
  .sober .sep { height:1px; margin:0 0 2px; background:var(--divider-color); }
  .sober .badge { box-shadow:0 0 0 1px var(--divider-color); color:#444; }
  .sober .pinned .badge { box-shadow:0 0 0 1px var(--divider-color); }
  .sober .pin { color:var(--primary-color); text-shadow:none; }
  .sober .name .n { text-transform:none; font-weight:500; letter-spacing:0; }
  .sober .name .c { color:var(--secondary-text-color); opacity:1; }
  .sober .km { font-size:14px; font-weight:500; }
  .sober .km small { color:var(--secondary-text-color); opacity:1; }
  .sober .led { height:30px; border-radius:6px; box-shadow:inset 0 0 0 1px #2b2b2b; }
  .sober .digits, .sober .ghost { font-size:19px; }
  .sober .glow, .sober .led.best .glow, .sober .led.stale .glow { filter:drop-shadow(0 0 1px currentColor); }
  .sober .foot { border-top:1px solid var(--divider-color); color:var(--secondary-text-color); opacity:1; }

  /* ---- mise en page empilée (beaucoup de carburants) : afficheurs sous le nom ---- */
  .frame { container-type:inline-size; }
  .leds { display:contents; }
  .stacked { --fs:clamp(12px, calc(((100cqw - (var(--n) - 1) * 5px) / var(--n) - 10px) / 3.3), 22px); }
  .stacked .row { grid-template-columns:44px minmax(0,1fr) auto; row-gap:6px; }
  .stacked .leds { grid-column:1 / -1; display:grid; grid-template-columns:repeat(var(--n),minmax(0,1fr)); gap:5px; }
  .stacked .cols.stk { display:grid; grid-template-columns:repeat(var(--n),minmax(0,1fr)); gap:5px; }
  .stacked .cols.stk div { font-size:12px; letter-spacing:.5px; }
  .stacked .digits, .stacked .ghost { font-size:var(--fs); letter-spacing:.5px;
    -webkit-mask-size:calc(var(--fs) / 8.8) calc(var(--fs) / 8.8); mask-size:calc(var(--fs) / 8.8) calc(var(--fs) / 8.8); }
  .stacked .led { height:calc(var(--fs) + 14px); }
  .stacked .led.na .digits, .stacked .led.out .digits { font-size:calc(var(--fs) * .72); }
  @media (max-width:400px) {
    .grid { grid-template-columns:38px minmax(0,1fr) 36px repeat(var(--n),64px); column-gap:5px; }
    .badge { width:38px; }
    .digits, .ghost { font-size:19px; letter-spacing:.5px; }
    .name .n { font-size:13px; }
    .km { font-size:14px; }
    .t { font-size:21px; }
  }
`;

const clcEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

class CarburantLedCard extends HTMLElement {
  setConfig(config) {
    this._config = {
      title: "",
      subtitle: "",
      fuels: ["E10", "Gazole"],
      pinned: [],
      sort: "distance",
      stale_days: 3,
      max_stations: 0,
      show_logos: true,
      style: "autoroute",
      layout: "auto",
      ...(config || {}),
    };
    let pinned = this._config.pinned || [];
    if (!Array.isArray(pinned)) pinned = String(pinned).split(/[\s,;]+/);
    this._config.pinned = pinned.map((x) => String(x).trim()).filter(Boolean);
    if (!Array.isArray(this._config.fuels) || !this._config.fuels.length) this._config.fuels = ["E10", "Gazole"];
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener("click", (ev) => {
        const el = ev.composedPath().find((n) => n.dataset && n.dataset.entity);
        if (!el) return;
        const e = new Event("hass-more-info", { bubbles: true, composed: true });
        e.detail = { entityId: el.dataset.entity };
        this.dispatchEvent(e);
      });
    }
    this._sig = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const sensors = this._sensors();
    const sig = clcLang(hass) + sensors.map((s) => s.entity_id + s.state + s.last_updated).join("|");
    if (sig === this._sig) return;
    this._sig = sig;
    this._render(sensors);
  }

  _sensors() {
    const out = [];
    if (!this._hass) return out;
    for (const id in this._hass.states) {
      if (!id.startsWith("sensor.")) continue;
      const st = this._hass.states[id];
      const a = st.attributes || {};
      if (a.station_id !== undefined && a.fuel_type) out.push(st);
    }
    return out;
  }

  _stations(sensors) {
    const stale = Number(this._config.stale_days);
    const map = new Map();
    for (const s of sensors) {
      const a = s.attributes;
      const id = String(a.station_id);
      if (!map.has(id)) {
        map.set(id, { id, name: a.name || id, brand: a.brand || "", city: a.city || "",
          distance: Number(a.distance), prices: {}, logo: "" });
      }
      const st = map.get(id);
      if (!st.logo && a.entity_picture) st.logo = a.entity_picture;
      const v = parseFloat(s.state);
      st.prices[String(a.fuel_type).toLowerCase()] = {
        entity: s.entity_id,
        value: Number.isFinite(v) ? v : null,
        stale: Number(a.days_since_last_update) > stale,
        out: !!a.shortage_since,
        updated: a.updated_date,
      };
    }
    return [...map.values()];
  }

  _brandLabel(brand, name) {
    const abbr = { "intermarché": "INTER", "intermarche": "INTER", "carrefour": "CARREF.", "système u": "U",
      "systeme u": "U", "super u": "U", "hyper u": "U" };
    const b = (brand || name || "?").trim();
    if (abbr[b.toLowerCase()]) return abbr[b.toLowerCase()];
    const raw = b.replace(/\b(wholesale|express|access|contact|market|station)\b/gi, "").trim();
    return (raw.split(/\s+/)[0] || "?").toUpperCase();
  }

  _displayName(st) {
    let n = String(st.name || "").trim();
    const b = String(st.brand || "").split(/\s+/)[0];
    if (b && n.toLowerCase().startsWith(b.toLowerCase())) n = n.slice(b.length).replace(/^[\s\-–]+/, "");
    return n.length >= 2 ? n : st.city || st.name;
  }

  _fmtPrice(v) {
    const s = v.toFixed(3);
    return clcLang(this._hass) === "fr" ? s.replace(".", ",") : s;
  }

  _fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const loc = clcLang(this._hass) === "fr" ? "fr-FR" : "en-GB";
    return d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" }) + " " +
      d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
  }

  _led(p, isBest, t) {
    const ghost = `<span class="ghost">${clcLang(this._hass) === "fr" ? "8,888" : "8.888"}</span>`;
    if (!p) return `<div class="led na" title="${clcEsc(t.na_title)}"><span>${ghost}</span>` +
      `<span class="glow"><span class="digits">${clcEsc(t.na)}</span></span></div>`;
    let txt, cls = "";
    if (p.out && p.value === null) { txt = t.out; cls = "out"; }
    else if (p.value === null) { txt = "-,---"; cls = "stale"; }
    else { txt = this._fmtPrice(p.value); if (p.stale) cls = "stale"; else if (isBest) cls = "best"; }
    const title = p.updated && p.updated !== "None" ? `${t.price_of} ${this._fmtDate(p.updated)}` : "";
    return `<div class="led ${cls}" data-entity="${clcEsc(p.entity)}" title="${clcEsc(title)}">` +
      `<span>${ghost}</span><span class="glow"><span class="digits">${clcEsc(txt)}</span></span></div>`;
  }

  _row(st, fuels, best, pinned, t) {
    const label = this._brandLabel(st.brand, st.name);
    const fs = label.length <= 2 ? 17 : label.length <= 3 ? 14 : label.length <= 5 ? 11 : label.length <= 7 ? 8.5 : 7.5;
    const disp = this._displayName(st);
    const norm = (s) => String(s || "").toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
    const city = st.city && !norm(disp).includes(norm(st.city).slice(0, 6)) ? st.city : "";
    const dec = clcLang(this._hass) === "fr" ? "," : ".";
    const km = Number.isFinite(st.distance)
      ? (st.distance < 10 ? st.distance.toFixed(1).replace(".", dec) : Math.round(st.distance)) : "–";
    const logo = this._config.show_logos !== false && st.logo;
    const leds = fuels.map((f) => {
      const p = st.prices[f.toLowerCase()];
      return this._led(p, p && !p.stale && p.value !== null && p.value === best[f.toLowerCase()], t);
    }).join("");
    return `<div class="grid row${pinned ? " pinned" : ""}">
      <div class="badge${logo ? " has-img" : ""}" style="font-size:${fs}px">${logo ? `<img src="${clcEsc(logo)}" alt="" loading="lazy">` : ""}<span class="bl">${clcEsc(label)}</span></div>
      <div class="name" title="${clcEsc(st.name)}"><div class="n">${pinned ? '<span class="pin">★</span>' : ""}${clcEsc(disp)}</div>
        ${city ? `<div class="c">${clcEsc(city)}</div>` : ""}</div>
      <div class="km">${km}<small>km</small></div><div class="leds">${leds}</div></div>`;
  }

  _render(sensors) {
    if (!this.shadowRoot || !this._config) return;
    sensors = sensors || this._sensors();
    const cfg = this._config;
    const t = clcT(this._hass);
    const sober = ["sobre", "sober", "simple"].includes(String(cfg.style).toLowerCase());
    const lay = String(cfg.layout || "auto").toLowerCase();
    const stacked = ["stacked", "empile", "empilé"].includes(lay) || (!["row", "ligne"].includes(lay) && cfg.fuels.length > 3);
    const fuels = cfg.fuels;
    const stations = this._stations(sensors);
    const best = {};
    for (const f of fuels) {
      const k = f.toLowerCase();
      const vals = stations.map((s) => s.prices[k]).filter((p) => p && !p.stale && p.value !== null).map((p) => p.value);
      best[k] = vals.length ? Math.min(...vals) : null;
    }
    const k0 = fuels[0].toLowerCase();
    const key = (s) => cfg.sort === "price"
      ? (s.prices[k0] && s.prices[k0].value !== null ? s.prices[k0].value : 99)
      : (Number.isFinite(s.distance) ? s.distance : 999);
    const pinned = cfg.pinned.map((id) => stations.find((s) => s.id === id)).filter(Boolean);
    let others = stations.filter((s) => !cfg.pinned.includes(s.id)).sort((a, b) => key(a) - key(b));
    const max = Number(cfg.max_stations) || 0;
    if (max > 0) others = others.slice(0, Math.max(0, max - pinned.length));
    this._rows = pinned.length + others.length;

    const body = stations.length
      ? pinned.map((s) => this._row(s, fuels, best, true, t)).join("") +
        (pinned.length ? '<div class="sep"></div>' : "") +
        others.map((s) => this._row(s, fuels, best, false, t)).join("")
      : `<div class="empty">${clcEsc(t.empty)}</div>`;

    this.shadowRoot.innerHTML = `<style>${CLC_STYLE}</style>
      <ha-card${sober ? "" : ' style="background:none;box-shadow:none;border:none"'}>
      <div class="panel${sober ? " sober" : ""}${stacked ? " stacked" : ""}" style="--n:${fuels.length}"><div class="frame">
        <div class="head"><div class="pict"><ha-icon icon="mdi:gas-station"></ha-icon></div>
          <div class="titles"><div class="t">${clcEsc(cfg.title || t.title)}</div>
          ${cfg.subtitle ? `<div class="s">${clcEsc(cfg.subtitle)}</div>` : ""}</div></div>
        ${stacked ? `<div class="cols stk">${fuels.map((f) => `<div>${clcEsc(f)}</div>`).join("")}</div>`
          : `<div class="grid cols"><div></div><div></div><div class="km">km</div>
          ${fuels.map((f) => `<div>${clcEsc(f)}</div>`).join("")}</div>`}
        ${body}
        <div class="foot"><span>${clcEsc(t.foot)}</span>
          <span><span class="dot" style="background:var(--led-best)"></span>${clcEsc(t.best)}<span class="dot" style="background:var(--led)"></span>${clcEsc(t.fresh)}<span class="dot" style="background:var(--led-old)"></span>${clcEsc(t.stale(cfg.stale_days))}</span></div>
      </div></div></ha-card>`;
    this.shadowRoot.querySelectorAll(".badge img").forEach((img) => img.addEventListener("error", () => {
      img.parentElement.classList.remove("has-img"); img.remove(); }, { once: true }));
  }

  getCardSize() { return 3 + Math.ceil((this._rows || 8) * 0.9); }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }

  static getStubConfig() { return { fuels: ["E10", "Gazole"], sort: "distance", pinned: [] }; }

  static getConfigForm() {
    const fuels = ["E10", "SP95", "SP98", "Gazole", "E85", "GPLc"];
    return {
      schema: [
        { name: "title", selector: { text: {} } },
        { name: "subtitle", selector: { text: {} } },
        { name: "fuels", selector: { select: { multiple: true, mode: "list", options: fuels } } },
        { name: "pinned", selector: { text: { multiple: true } } },
        { type: "grid", name: "", schema: [
          { name: "sort", selector: { select: { mode: "dropdown", options: [
            { value: "distance", label: "Distance" }, { value: "price", label: "Prix / Price" }] } } },
          { name: "stale_days", selector: { number: { min: 1, max: 30, mode: "box" } } },
          { name: "max_stations", selector: { number: { min: 0, max: 50, mode: "box" } } },
          { name: "show_logos", selector: { boolean: {} } },
          { name: "style", selector: { select: { mode: "dropdown", options: [
            { value: "autoroute", label: "Autoroute" }, { value: "sobre", label: "Sobre / Sober" }] } } },
          { name: "layout", selector: { select: { mode: "dropdown", options: [
            { value: "auto", label: "Auto" }, { value: "row", label: "Ligne / Row" },
            { value: "stacked", label: "Empilé / Stacked" }] } } },
        ] },
      ],
      computeLabel: (s) => {
        const t = CLC_I18N[(document.documentElement.lang || "fr").startsWith("fr") ? "fr" : "en"];
        return ({ title: t.f_title, subtitle: t.f_subtitle, fuels: t.f_fuels, pinned: t.f_pinned, sort: t.f_sort,
          stale_days: t.f_stale, max_stations: t.f_max, show_logos: t.f_logos, style: "Style", layout: "Mise en page / Layout" })[s.name];
      },
    };
  }
}

if (!customElements.get(CLC_TAG)) {
  customElements.define(CLC_TAG, CarburantLedCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((x) => x.type === CLC_TAG)) {
    window.customCards.push({
      type: CLC_TAG,
      name: "Carburant LED Card",
      description: "Prix des carburants façon panneau d'autoroute avec afficheurs LED (intégration Prix Carburant)",
      preview: true,
      documentationURL: "https://github.com/robote7701/carburant-ledcard",
    });
  }
  console.info(`%c CARBURANT-LEDCARD %c ${CLC_VERSION} `, "background:#e2001a;color:#fff", "background:#0a3f9c;color:#fff");
}
