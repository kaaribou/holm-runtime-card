/* holm-runtime-card — https://github.com/kaaribou/holm-runtime-card — licence MIT — v1.1.0 */
// holm-runtime-card — temps de fonctionnement calculé directement depuis l'historique (recorder), sans helper
// Config (éditeur visuel disponible) :
//   type: custom:holm-runtime-card
//   title: Temps de fonctionnement
//   animation: true                         # animation des appareils en marche
//   devices:
//     - name: VMC Buanderie
//       entity: switch.vmc_buanderie        # état "on" par défaut
//     - name: Chauffe-eau
//       entity: sensor.chauffe_eau_power
//       above: 3                            # numérique : en marche si > 3
//     - entity: fan.x
//       on_states: [on, heat]               # liste d'états considérés "en marche"
// Colonne Année (statistiques long terme, au-delà des 30 jours d'historique) :
//       power_entity: sensor.xxx_power      # capteur de puissance avec statistiques
//       on_power: 30                        # puissance en marche (W) — auto si absent
//       idle_power: 0                       # consommation à l'arrêt (W)
(() => {
  const VERSION = "1.1.0";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // icônes qui tournent quand l'appareil est en marche
  const SPIN = /fan|air-filter|air-purifier|hvac|turbine|pump|ventilat|washing-machine|tumble-dryer|dishwasher|robot-vacuum|sync|cog/;
  const DOMAIN_ICON = {
    switch: "mdi:toggle-switch", light: "mdi:lightbulb", fan: "mdi:fan", climate: "mdi:thermostat", sensor: "mdi:flash",
    binary_sensor: "mdi:checkbox-blank-circle-outline", input_boolean: "mdi:toggle-switch", water_heater: "mdi:water-boiler",
    vacuum: "mdi:robot-vacuum", humidifier: "mdi:air-humidifier", media_player: "mdi:speaker", cover: "mdi:window-shutter",
  };

  class HolmRuntimeCard extends HTMLElement {
    static getConfigElement() { return document.createElement("holm-runtime-card-editor"); }
    static getStubConfig(hass) {
      const ids = Object.keys(hass?.states || {});
      const e = ids.find((i) => i.startsWith("switch.")) || ids.find((i) => i.startsWith("fan.")) || ids.find((i) => i.startsWith("light.")) || "";
      return { title: "Temps de fonctionnement", devices: e ? [{ entity: e }] : [] };
    }
    setConfig(c) {
      if (!c) throw new Error("holm-runtime-card : configuration invalide");
      const devices = Array.isArray(c.devices) ? c.devices.filter((d) => d && d.entity) : [];
      this._c = { title: "Temps de fonctionnement", refresh_minutes: 5, animation: true, ...c, devices };
      this._fetched = 0;
      this._rows = null;
      if (this.shadowRoot) { this._render(); if (this._hass) { this._fetched = Date.now(); this._load(); } }
    }
    set hass(h) {
      this._hass = h;
      if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._render(); }
      if (Date.now() - this._fetched > Number(this._c.refresh_minutes || 5) * 60000) { this._fetched = Date.now(); this._load(); }
      else this._live();
    }
    connectedCallback() {
      clearInterval(this._tick);
      this._tick = setInterval(() => this._live(true), 30000);   // durées du jour qui avancent en direct
    }
    disconnectedCallback() { clearInterval(this._tick); }

    _periods() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);
      const dow = (today.getDay() + 6) % 7; // lundi = 0
      const week = new Date(today.getTime() - dow * 86400000);
      const month = new Date(now.getFullYear(), now.getMonth(), 1);
      return [
        { k: "Aujourd'hui", a: today, b: now, live: true },
        { k: "Hier", a: yesterday, b: today },
        { k: "Semaine", a: week, b: now, live: true },
        { k: "Mois", a: month, b: now, live: true },
      ];
    }
    _yearStart() { const n = new Date(); return new Date(n.getFullYear(), 0, 1); }
    async _yearEstimate(d, cut) {
      // Estimation depuis les statistiques horaires (moyenne de puissance) du 1er janvier jusqu'à `cut`
      const ys = this._yearStart();
      if (!d.power_entity || cut <= ys) return 0;
      const r = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: ys.toISOString(), end_time: cut.toISOString(),
        statistic_ids: [d.power_entity], period: "hour", types: ["mean", "max"],
      });
      const rows = r[d.power_entity] || [];
      const idle = Number(d.idle_power || 0);
      let on = Number(d.on_power || 0);
      if (!on) { // auto : médiane des maxima horaires nettement au-dessus du repos
        const mx = rows.map((x) => Number(x.max) || 0).filter((v) => v > idle + 5).sort((a, b) => a - b);
        on = mx.length ? mx[Math.floor(mx.length / 2)] : 0;
      }
      if (on <= idle) return 0;
      let sec = 0;
      for (const x of rows) {
        const f = Math.min(1, Math.max(0, ((Number(x.mean) || 0) - idle) / (on - idle)));
        sec += f * 3600;
      }
      return sec;
    }
    _isOn(d, s) {
      if (s === undefined || s === null || s === "unavailable" || s === "unknown") return false;
      if (d.above !== undefined && d.above !== null && d.above !== "") { const v = parseFloat(s); return !isNaN(v) && v > Number(d.above); }
      if (d.below !== undefined && d.below !== null && d.below !== "") { const v = parseFloat(s); return !isNaN(v) && v < Number(d.below); }
      const on = d.on_states || [d.on_state || "on"];
      return (Array.isArray(on) ? on : [on]).map(String).includes(String(s));
    }
    _icon(d) {
      if (d.icon) return d.icon;
      const st = this._hass?.states[d.entity];
      return st?.attributes?.icon || DOMAIN_ICON[d.entity.split(".")[0]] || "mdi:power";
    }
    async _load() {
      if (!this._c.devices.length) { this._rows = []; this._render(); return; }
      try {
        const periods = this._periods();
        const now = new Date();
        const ys = this._yearStart();
        const t29 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        const cut = t29 > ys ? t29 : ys; // avant : statistiques ; après : historique exact
        const start = new Date(Math.min(cut.getTime(), ...periods.map((p) => p.a.getTime())));
        const ids = [...new Set(this._c.devices.map((d) => d.entity))];
        const r = await this._hass.callWS({
          type: "history/history_during_period",
          start_time: start.toISOString(),
          end_time: now.toISOString(),
          entity_ids: ids,
          minimal_response: true,
          no_attributes: true,
          significant_changes_only: false,
        });
        const nowS = now.getTime() / 1000;
        const rows = this._c.devices.map((d) => {
          const hist = (r[d.entity] || []).map((x) => ({ t: x.lc !== undefined ? x.lc : x.lu, s: x.s })).sort((a, b) => a.t - b.t);
          const firstT = hist.length ? hist[0].t : nowS;
          const vals = periods.map((p) => {
            const A = p.a.getTime() / 1000, B = p.b.getTime() / 1000;
            let sec = 0;
            for (let i = 0; i < hist.length; i++) {
              const t0 = Math.max(hist[i].t, A);
              const t1 = Math.min(i + 1 < hist.length ? hist[i + 1].t : nowS, B);
              if (t1 > t0 && this._isOn(d, hist[i].s)) sec += t1 - t0;
            }
            return { sec, partial: firstT > A + 60, live: !!p.live };
          });
          const A = cut.getTime() / 1000;
          let exactYear = 0;
          for (let i = 0; i < hist.length; i++) {
            const t0 = Math.max(hist[i].t, A), t1 = i + 1 < hist.length ? hist[i + 1].t : nowS;
            if (t1 > t0 && this._isOn(d, hist[i].s)) exactYear += t1 - t0;
          }
          vals.push({ sec: exactYear, cutNeeded: cut > ys, estimated: false, live: true, d });
          return { d, vals };
        });
        for (const row of rows) {
          const y = row.vals[row.vals.length - 1];
          if (y.cutNeeded) {
            if (y.d.power_entity) { y.sec += await this._yearEstimate(y.d, cut); y.estimated = true; }
            else y.partial = true;
          }
          delete y.d;
        }
        this._rows = rows;
        this._loadedAt = Date.now();
        this._heads = [...periods.map((p) => p.k), "Année"];
        this._err = null;
      } catch (e) {
        this._err = e && e.message ? e.message : String(e);
        this._fetched = 0;
      }
      this._render();
    }
    _fmt(sec) {
      const m = Math.round(sec / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60), mm = m % 60;
      return mm && h < 100 ? `${h} h ${String(mm).padStart(2, "0")}` : `${h} h`;
    }
    _cell(v, on) {
      // pendant la marche, les périodes en cours avancent en direct jusqu'au prochain recalcul
      const extra = on && v.live && this._loadedAt ? (Date.now() - this._loadedAt) / 1000 : 0;
      const sec = v.sec + extra;
      return `${v.estimated ? "≈ " : ""}${this._fmt(sec)}${v.partial ? "*" : ""}`;
    }
    _name(d) { return d.name || (this._hass?.states[d.entity]?.attributes.friendly_name ?? d.entity); }

    // met à jour l'état « en marche » et les durées sans tout redessiner
    _live(tick) {
      if (!this._rows || !this.shadowRoot) return;
      const trs = this.shadowRoot.querySelectorAll("tbody tr");
      this._rows.forEach((row, i) => {
        const tr = trs[i]; if (!tr) return;
        const on = this._isOn(row.d, this._hass?.states[row.d.entity]?.state);
        if (tr.classList.contains("on") !== on || tick) {
          tr.classList.toggle("on", on);
          tr.querySelectorAll("td.v").forEach((td, j) => {
            const v = row.vals[j];
            td.textContent = this._cell(v, on);
            td.classList.toggle("z", !(v.sec || (on && v.live)));
          });
        }
      });
    }
    _render() {
      if (!this.shadowRoot || !this._c) return;
      const heads = this._heads || [...this._periods().map((p) => p.k), "Année"];
      const anim = this._c.animation !== false;
      let body;
      if (!this._c.devices.length) body = `<div class="msg">Ajoutez un appareil dans l'éditeur de la carte.</div>`;
      else if (this._err) body = `<div class="msg">Erreur : ${esc(this._err)}</div>`;
      else if (!this._rows) body = `<div class="msg">Chargement…</div>`;
      else body = `
        <table>
          <thead><tr><th></th>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${this._rows.map((r) => {
            const on = this._isOn(r.d, this._hass?.states[r.d.entity]?.state);
            const icon = this._icon(r.d);
            return `
            <tr class="${on ? "on" : ""}" data-entity="${esc(r.d.entity)}">
              <td class="n"><div class="nw"><span class="ic${SPIN.test(icon) ? " spin" : ""}"><ha-icon icon="${esc(icon)}"></ha-icon><i class="dot"></i></span><span class="nm">${esc(this._name(r.d))}</span></div></td>
              ${r.vals.map((v) => `<td class="v${v.sec || (on && v.live) ? "" : " z"}" title="${v.partial ? "Historique incomplet sur cette période" : v.estimated ? "Estimé depuis les statistiques de puissance avant les 30 derniers jours" : ""}">${this._cell(v, on)}</td>`).join("")}
            </tr>`;
          }).join("")}
          </tbody>
        </table>`;
      this.shadowRoot.innerHTML = `
        <style>
          ha-card { display: block; padding: 4px 0 12px; container-type: inline-size; overflow-x: auto; }
          .hdr { padding: 12px 16px 8px; font-size: 16px; font-weight: 600; color: var(--primary-text-color); }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; text-align: right;
               color: var(--secondary-text-color); padding: 6px 8px; border-bottom: 1px solid var(--divider-color); }
          td { padding: 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 50%, transparent); }
          tr:last-child td { border-bottom: none; }
          tbody tr { position: relative; cursor: pointer; transition: background .4s; }
          tbody tr:hover { background: color-mix(in srgb, var(--primary-text-color) 4%, transparent); }
          td.n { color: var(--primary-text-color); font-weight: 500; padding-left: 16px; }
          .nw { display: flex; align-items: center; gap: 10px; min-width: 0; }
          td.n .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          th:last-child, td:last-child { padding-right: 16px; }
          td.v { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--primary-text-color); transition: color .4s; }
          td.z { color: var(--disabled-text-color, var(--secondary-text-color)); }
          .msg { padding: 16px; color: var(--secondary-text-color); }

          /* pastille icône + voyant */
          .ic { position: relative; flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
                background: color-mix(in srgb, var(--secondary-text-color) 12%, transparent); transition: background .4s, box-shadow .4s; }
          .ic ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); transition: color .4s; }
          .ic .dot { position: absolute; right: -1px; bottom: -1px; width: 9px; height: 9px; border-radius: 50%;
                     background: var(--disabled-text-color, #666); border: 2px solid var(--ha-card-background, var(--card-background-color, #1c1c1c)); }

          /* en marche */
          tr.on td { background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
          td.n { position: relative; }
          tr.on .ic { background: color-mix(in srgb, var(--primary-color) 20%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary-color) 35%, transparent); }
          tr.on .ic ha-icon { color: var(--primary-color); }
          tr.on .ic .dot { background: var(--primary-color); }
          tr.on td.v:nth-child(2) { color: var(--primary-color); font-weight: 600; }
          ${anim ? `
          tr.on td.n::before { content: ""; position: absolute; left: 0; top: 18%; bottom: 18%; width: 3px; border-radius: 0 3px 3px 0;
            background: linear-gradient(180deg, transparent, var(--primary-color), transparent) 0 0 / 100% 200%; animation: flow 1.6s linear infinite; }
          tr.on .ic { animation: breathe 2.4s ease-in-out infinite; }
          tr.on .ic.spin { animation: none; }
          tr.on .ic.spin ha-icon { animation: spin 1.6s linear infinite; }
          tr.on .ic .dot::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--primary-color); animation: ping 1.8s ease-out infinite; }
          @keyframes flow { from { background-position: 0 100%; } to { background-position: 0 -100%; } }
          @keyframes breathe { 0%, 100% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary-color) 35%, transparent), 0 0 0 0 color-mix(in srgb, var(--primary-color) 30%, transparent); }
                               50% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary-color) 55%, transparent), 0 0 12px 2px color-mix(in srgb, var(--primary-color) 30%, transparent); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes ping { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(2.2); opacity: 0; } }
          @media (prefers-reduced-motion: reduce) { tr.on td.n::before, tr.on .ic, tr.on .ic.spin ha-icon, tr.on .ic .dot::after { animation: none !important; } }` : ""}

          @container (max-width: 480px) {
            table { font-size: 12.5px; } td, th { padding-left: 5px; padding-right: 5px; } th { font-size: 10px; letter-spacing: 0; }
            td.n { padding-left: 12px; } .nw { gap: 8px; } .ic { width: 26px; height: 26px; } .ic ha-icon { --mdc-icon-size: 15px; }
            td.n .nm { max-width: 22cqi; } th:last-child, td:last-child { padding-right: 12px; }
          }
        </style>
        <ha-card>
          ${this._c.title ? `<div class="hdr">${esc(this._c.title)}</div>` : ""}
          ${body}
        </ha-card>`;
      this.shadowRoot.querySelectorAll("tbody tr").forEach((tr) => tr.addEventListener("click", () => {
        const ev = new Event("hass-more-info", { bubbles: true, composed: true });
        ev.detail = { entityId: tr.dataset.entity };
        this.dispatchEvent(ev);
      }));
    }
    getCardSize() { return 2 + (this._c?.devices?.length || 1); }
    getGridOptions() { return { columns: 12, rows: "auto" }; }
  }

  // ───────────────────────── éditeur visuel ─────────────────────────
  const MODES = [
    { value: "state", label: "Selon son état (on, heat…)" },
    { value: "above", label: "Valeur au-dessus d'un seuil" },
    { value: "below", label: "Valeur en dessous d'un seuil" },
  ];
  const LABELS = {
    title: "Titre", refresh_minutes: "Recalcul (minutes)", animation: "Animer les appareils en marche",
    entity: "Entité suivie", name: "Nom affiché", icon: "Icône", mode: "En marche quand…",
    on_states: "États « en marche » (séparés par des virgules)", threshold: "Seuil",
    power_entity: "Capteur de puissance (statistiques)", on_power: "Puissance en marche (W, auto si vide)", idle_power: "Consommation à l'arrêt (W)",
  };
  const HELPERS = {
    on_states: "Par défaut : on. Exemple pour un thermostat : heat, cool",
    threshold: "Par exemple 3 pour « en marche au-dessus de 3 W »",
    power_entity: "Facultatif : estime la colonne Année au-delà de l'historique conservé",
  };

  class HolmRuntimeCardEditor extends HTMLElement {
    setConfig(c) {
      // la config qu'on vient d'émettre revient ici : ne pas tout redessiner (garde le focus)
      if (this._last && JSON.stringify(c) === this._last && this.shadowRoot) return;
      this._c = { ...c, devices: (c.devices || []).map((d) => ({ ...d })) };
      if (this._open === undefined) this._open = this._c.devices.length === 1 ? 0 : -1;
      this._build();
    }
    set hass(h) {
      this._hass = h;
      this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => { f.hass = h; });
    }
    _emit() {
      const cfg = { ...this._c, devices: this._c.devices.filter((d) => d.entity).map((d) => {
        const o = {};
        for (const k of ["entity", "name", "icon", "on_states", "above", "below", "power_entity", "on_power", "idle_power"]) {
          const v = d[k];
          if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
          o[k] = v;
        }
        return o;
      }) };
      if (cfg.animation === true) delete cfg.animation;
      if (Number(cfg.refresh_minutes) === 5) delete cfg.refresh_minutes;
      this._last = JSON.stringify(cfg);
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    }
    _devData(d) {
      const mode = d.above !== undefined && d.above !== "" ? "above" : d.below !== undefined && d.below !== "" ? "below" : "state";
      const st = d.on_states || (d.on_state ? [d.on_state] : []);
      return {
        entity: d.entity || "", name: d.name || "", icon: d.icon || "", mode,
        on_states: (Array.isArray(st) ? st : [st]).join(", "),
        threshold: mode === "above" ? d.above : mode === "below" ? d.below : undefined,
        power_entity: d.power_entity || "", on_power: d.on_power, idle_power: d.idle_power,
      };
    }
    _devSchema(mode) {
      return [
        { name: "entity", required: true, selector: { entity: {} } },
        { type: "grid", name: "", schema: [{ name: "name", selector: { text: {} } }, { name: "icon", selector: { icon: {} } }] },
        { name: "mode", selector: { select: { mode: "dropdown", options: MODES } } },
        mode === "state" ? { name: "on_states", selector: { text: {} } } : { name: "threshold", required: true, selector: { number: { mode: "box", step: "any" } } },
        { type: "expandable", name: "", title: "Colonne Année (facultatif)", flatten: true, schema: [
          { name: "power_entity", selector: { entity: { domain: "sensor", device_class: "power" } } },
          { type: "grid", name: "", schema: [
            { name: "on_power", selector: { number: { mode: "box", min: 0, step: "any", unit_of_measurement: "W" } } },
            { name: "idle_power", selector: { number: { mode: "box", min: 0, step: "any", unit_of_measurement: "W" } } },
          ] },
        ] },
      ];
    }
    _setDev(i, v) {
      const o = { entity: v.entity, name: v.name, icon: v.icon, power_entity: v.power_entity, on_power: v.on_power, idle_power: v.idle_power };
      if (v.mode === "above") o.above = v.threshold ?? 0;
      else if (v.mode === "below") o.below = v.threshold ?? 0;
      else {
        const s = String(v.on_states || "").split(",").map((x) => x.trim()).filter(Boolean);
        if (s.length && !(s.length === 1 && s[0] === "on")) o.on_states = s;
      }
      this._c.devices[i] = o;
    }
    _build() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const h = this._hass;
      const devs = this._c.devices;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .devs { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
          .ttl { font-weight: 600; margin: 8px 0 0; color: var(--primary-text-color); }
          .dev { border: 1px solid var(--divider-color); border-radius: 12px; overflow: hidden; }
          .dh { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; cursor: pointer; }
          .dh ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
          .dh .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .dh .t small { display: block; color: var(--secondary-text-color); font-size: 12px; }
          .dh button { border: 0; background: none; color: var(--secondary-text-color); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; }
          .dh button:hover { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); color: var(--primary-text-color); }
          .dh button:disabled { opacity: .3; cursor: default; }
          .db { padding: 4px 12px 12px; border-top: 1px solid var(--divider-color); }
          .add { margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 18px; border: 1px dashed var(--divider-color);
                 background: none; color: var(--primary-color); font: inherit; font-weight: 500; cursor: pointer; }
          .add:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
        </style>
        <ha-form id="top"></ha-form>
        <div class="ttl">Appareils</div>
        <div class="devs">
          ${devs.map((d, i) => {
            const st = d.entity && h?.states[d.entity];
            const nm = d.name || st?.attributes.friendly_name || d.entity || "Nouvel appareil";
            const icon = d.icon || st?.attributes.icon || "mdi:power";
            return `<div class="dev" data-i="${i}">
              <div class="dh" data-toggle="${i}"><ha-icon icon="${esc(icon)}"></ha-icon><div class="t">${esc(nm)}<small>${esc(d.entity || "choisissez une entité")}</small></div>
                <button data-up="${i}" title="Monter" ${i === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
                <button data-down="${i}" title="Descendre" ${i === devs.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
                <button data-del="${i}" title="Supprimer"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
                <ha-icon icon="${this._open === i ? "mdi:chevron-up" : "mdi:chevron-down"}"></ha-icon></div>
              ${this._open === i ? `<div class="db"><ha-form data-form="${i}"></ha-form></div>` : ""}
            </div>`;
          }).join("")}
        </div>
        <button class="add" id="add"><ha-icon icon="mdi:plus"></ha-icon>Ajouter un appareil</button>`;
      const label = (s) => LABELS[s.name] ?? s.title ?? s.name;
      const helper = (s) => HELPERS[s.name];
      const top = this.shadowRoot.getElementById("top");
      top.hass = h; top.computeLabel = label;
      top.schema = [
        { name: "title", selector: { text: {} } },
        { type: "grid", name: "", schema: [
          { name: "refresh_minutes", selector: { number: { mode: "box", min: 1, max: 120, unit_of_measurement: "min" } } },
          { name: "animation", selector: { boolean: {} } },
        ] },
      ];
      top.data = { title: this._c.title ?? "Temps de fonctionnement", refresh_minutes: this._c.refresh_minutes ?? 5, animation: this._c.animation !== false };
      top.addEventListener("value-changed", (e) => {
        e.stopPropagation();
        const v = e.detail.value;
        this._c.title = v.title; this._c.refresh_minutes = v.refresh_minutes; this._c.animation = v.animation;
        this._emit();
      });
      this.shadowRoot.querySelectorAll("ha-form[data-form]").forEach((f) => {
        const i = Number(f.dataset.form);
        const data = this._devData(devs[i]);
        f.hass = h; f.computeLabel = label; f.computeHelper = helper;
        f.schema = this._devSchema(data.mode); f.data = data;
        f.addEventListener("value-changed", (e) => {
          e.stopPropagation();
          const v = e.detail.value;
          const modeChanged = v.mode !== f.data.mode;
          const entityChanged = v.entity !== f.data.entity;
          this._setDev(i, v);
          f.data = this._devData(this._c.devices[i]);
          if (modeChanged) f.schema = this._devSchema(f.data.mode);
          this._emit();
          if (entityChanged) this._build();   // met à jour le titre du bloc
        });
      });
      this.shadowRoot.querySelectorAll("[data-toggle]").forEach((el) => el.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const i = Number(el.dataset.toggle);
        this._open = this._open === i ? -1 : i; this._build();
      }));
      const move = (i, j) => { const a = this._c.devices; [a[i], a[j]] = [a[j], a[i]]; if (this._open === i) this._open = j; else if (this._open === j) this._open = i; this._emit(); this._build(); };
      this.shadowRoot.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => { const i = Number(b.dataset.up); move(i, i - 1); }));
      this.shadowRoot.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => { const i = Number(b.dataset.down); move(i, i + 1); }));
      this.shadowRoot.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
        const i = Number(b.dataset.del); this._c.devices.splice(i, 1);
        if (this._open === i) this._open = -1; else if (this._open > i) this._open--;
        this._emit(); this._build();
      }));
      this.shadowRoot.getElementById("add").addEventListener("click", () => {
        this._c.devices.push({ entity: "" }); this._open = this._c.devices.length - 1; this._build();
      });
    }
  }

  if (!customElements.get("holm-runtime-card")) customElements.define("holm-runtime-card", HolmRuntimeCard);
  if (!customElements.get("holm-runtime-card-editor")) customElements.define("holm-runtime-card-editor", HolmRuntimeCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "holm-runtime-card")) {
    window.customCards.push({ type: "holm-runtime-card", name: "HOLM – Temps de fonctionnement", description: "Durée de marche par appareil calculée depuis l'historique, sans helper", preview: true });
  }
  console.info(`%c HOLM-RUNTIME %c ${VERSION} `, "background:#4a90d9;color:#111;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
