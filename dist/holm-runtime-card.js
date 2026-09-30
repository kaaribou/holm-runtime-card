/* holm-runtime-card — https://github.com/kaaribou/holm-runtime-card — licence MIT — v1.0.0 */
// holm-runtime-card — temps de fonctionnement calculé directement depuis l'historique (recorder), sans helper
// Config :
//   type: custom:holm-runtime-card
//   title: Temps de fonctionnement
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
class HolmRuntimeCard extends HTMLElement {
  setConfig(c) {
    if (!c || !Array.isArray(c.devices) || !c.devices.length) throw new Error("holm-runtime-card : 'devices' est requis");
    this._c = { title: "Temps de fonctionnement", refresh_minutes: 5, ...c };
    this._fetched = 0;
    if (this.shadowRoot) this._render();
  }
  set hass(h) {
    this._hass = h;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._render(); }
    if (Date.now() - this._fetched > this._c.refresh_minutes * 60000) { this._fetched = Date.now(); this._load(); }
  }
  _periods() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const dow = (today.getDay() + 6) % 7; // lundi = 0
    const week = new Date(today.getTime() - dow * 86400000);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    return [
      { k: "Aujourd'hui", a: today, b: now },
      { k: "Hier", a: yesterday, b: today },
      { k: "Semaine", a: week, b: now },
      { k: "Mois", a: month, b: now },
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
    if (d.above !== undefined) { const v = parseFloat(s); return !isNaN(v) && v > Number(d.above); }
    if (d.below !== undefined) { const v = parseFloat(s); return !isNaN(v) && v < Number(d.below); }
    const on = d.on_states || [d.on_state || "on"];
    return on.map(String).includes(String(s));
  }
  async _load() {
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
      this._rows = this._c.devices.map((d) => {
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
          return { sec, partial: firstT > A + 60 };
        });
        const A = cut.getTime() / 1000;
        let exactYear = 0;
        for (let i = 0; i < hist.length; i++) {
          const t0 = Math.max(hist[i].t, A), t1 = i + 1 < hist.length ? hist[i + 1].t : nowS;
          if (t1 > t0 && this._isOn(d, hist[i].s)) exactYear += t1 - t0;
        }
        vals.push({ sec: exactYear, cutNeeded: cut > ys, estimated: false, d });
        return { name: d.name || (this._hass.states[d.entity]?.attributes.friendly_name ?? d.entity), icon: d.icon, on: this._isOn(d, this._hass.states[d.entity]?.state), vals };
      });
      for (const row of this._rows) {
        const y = row.vals[row.vals.length - 1];
        if (y.cutNeeded) {
          if (y.d.power_entity) { y.sec += await this._yearEstimate(y.d, cut); y.estimated = true; }
          else y.partial = true;
        }
        delete y.d;
      }
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
  _render() {
    if (!this.shadowRoot || !this._c) return;
    const heads = this._heads || [...this._periods().map((p) => p.k), "Année"];
    let body;
    if (this._err) body = `<div class="msg">Erreur : ${this._err}</div>`;
    else if (!this._rows) body = `<div class="msg">Chargement…</div>`;
    else body = `
      <table>
        <thead><tr><th></th>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${this._rows.map((r) => `
          <tr>
            <td class="n"><span class="dot${r.on ? " on" : ""}"></span>${r.icon ? `<ha-icon icon="${r.icon}"></ha-icon>` : ""}<span>${r.name}</span></td>
            ${r.vals.map((v) => `<td class="v${v.sec ? "" : " z"}" title="${v.partial ? "Historique incomplet sur cette période (conservation 30 jours)" : v.estimated ? "Estimé depuis les statistiques de puissance avant les 30 derniers jours" : ""}">${v.estimated ? "≈ " : ""}${this._fmt(v.sec)}${v.partial ? "*" : ""}</td>`).join("")}
          </tr>`).join("")}
        </tbody>
      </table>`;
    this.shadowRoot.innerHTML = `
      <style>
        ha-card { display: block; padding: 4px 0 12px; container-type: inline-size; overflow-x: auto; }
        .hdr { padding: 12px 16px 8px; font-size: 16px; font-weight: 600; color: var(--primary-text-color); }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        @container (max-width: 480px) { table { font-size: 12.5px; } td, th { padding-left: 5px; padding-right: 5px; } th { font-size: 10px; letter-spacing: 0; } td.n ha-icon { display: none; } td.n { padding-left: 12px; } td.n > span:last-child { max-width: 24cqi; } th:last-child, td:last-child { padding-right: 12px; } }
        th { font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; text-align: right;
             color: var(--secondary-text-color); padding: 6px 8px; border-bottom: 1px solid var(--divider-color); }
        td { padding: 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 50%, transparent); }
        tr:last-child td { border-bottom: none; }
        td.n { display: flex; align-items: center; gap: 8px; color: var(--primary-text-color); font-weight: 500; padding-left: 16px; min-width: 0; }
        td.n > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        th:last-child, td:last-child { padding-right: 16px; }
        td.n ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
        td.v { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--primary-text-color); }
        td.z { color: var(--disabled-text-color, var(--secondary-text-color)); }
        .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--disabled-text-color, #666); }
        .dot.on { background: var(--primary-color); box-shadow: 0 0 6px var(--primary-color); }
        .msg { padding: 16px; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div class="hdr">${this._c.title}</div>
        ${body}
      </ha-card>`;
  }
  getCardSize() { return 2 + (this._c?.devices?.length || 1); }
  getGridOptions() { return { columns: 12, rows: "auto" }; }
}
if (!customElements.get("holm-runtime-card")) customElements.define("holm-runtime-card", HolmRuntimeCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "holm-runtime-card", name: "HOLM – Temps de fonctionnement", description: "Durée de marche par appareil calculée depuis l'historique, sans helper" });

console.info("%c HOLM-RUNTIME %c 1.0.0 ", "background:#4a90d9;color:#111;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
