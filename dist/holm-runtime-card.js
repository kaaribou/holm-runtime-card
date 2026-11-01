/* holm-runtime-card — https://github.com/kaaribou/holm-runtime-card — licence MIT — v1.2.0 */
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
  const VERSION = "1.2.0";
  // ───────────────────────── traductions ─────────────────────────
  const I18N = {
    fr: { title: "Temps de fonctionnement", today: "Aujourd'hui", yesterday: "Hier", week: "Semaine", month: "Mois", year: "Année",
      no_device: "Ajoutez un appareil dans l'éditeur de la carte.", error: "Erreur", loading: "Chargement…",
      partial: "Historique incomplet sur cette période", estimated: "Estimé depuis les statistiques de puissance avant les 30 derniers jours",
      mode_state: "Selon son état (on, heat…)", mode_above: "Valeur au-dessus d'un seuil", mode_below: "Valeur en dessous d'un seuil",
      l_title: "Titre", l_refresh: "Recalcul (minutes)", l_animation: "Animer les appareils en marche", l_language: "Langue", auto: "Automatique (profil)",
      l_entity: "Entité suivie", l_name: "Nom affiché", l_icon: "Icône", l_mode: "En marche quand…",
      l_on_states: "États « en marche » (séparés par des virgules)", l_threshold: "Seuil",
      l_power_entity: "Capteur de puissance (statistiques)", l_on_power: "Puissance en marche (W, auto si vide)", l_idle_power: "Consommation à l'arrêt (W)",
      h_on_states: "Par défaut : on. Exemple pour un thermostat : heat, cool", h_threshold: "Par exemple 3 pour « en marche au-dessus de 3 W »",
      h_power_entity: "Facultatif : estime la colonne Année au-delà de l'historique conservé", year_section: "Colonne Année (facultatif)",
      devices: "Appareils", new_device: "Nouvel appareil", pick_entity: "choisissez une entité", up: "Monter", down: "Descendre", del: "Supprimer", add: "Ajouter un appareil",
      card_name: "HOLM – Temps de fonctionnement", card_desc: "Durée de marche par appareil calculée depuis l'historique, sans helper" },
    en: { title: "Runtime", today: "Today", yesterday: "Yesterday", week: "Week", month: "Month", year: "Year",
      no_device: "Add a device in the card editor.", error: "Error", loading: "Loading…",
      partial: "Incomplete history for this period", estimated: "Estimated from power statistics before the last 30 days",
      mode_state: "By its state (on, heat…)", mode_above: "Value above a threshold", mode_below: "Value below a threshold",
      l_title: "Title", l_refresh: "Refresh (minutes)", l_animation: "Animate running devices", l_language: "Language", auto: "Automatic (profile)",
      l_entity: "Tracked entity", l_name: "Display name", l_icon: "Icon", l_mode: "Running when…",
      l_on_states: "“Running” states (comma-separated)", l_threshold: "Threshold",
      l_power_entity: "Power sensor (statistics)", l_on_power: "Running power (W, auto if empty)", l_idle_power: "Idle power (W)",
      h_on_states: "Default: on. Example for a thermostat: heat, cool", h_threshold: "For example 3 for “running above 3 W”",
      h_power_entity: "Optional: estimates the Year column beyond the kept history", year_section: "Year column (optional)",
      devices: "Devices", new_device: "New device", pick_entity: "choose an entity", up: "Move up", down: "Move down", del: "Delete", add: "Add a device",
      card_name: "HOLM – Runtime", card_desc: "Running time per device computed from history, no helper needed" },
    de: { title: "Laufzeit", today: "Heute", yesterday: "Gestern", week: "Woche", month: "Monat", year: "Jahr",
      no_device: "Fügen Sie im Karteneditor ein Gerät hinzu.", error: "Fehler", loading: "Wird geladen…",
      partial: "Unvollständiger Verlauf in diesem Zeitraum", estimated: "Geschätzt aus Leistungsstatistiken vor den letzten 30 Tagen",
      mode_state: "Nach Zustand (on, heat…)", mode_above: "Wert über einem Schwellenwert", mode_below: "Wert unter einem Schwellenwert",
      l_title: "Titel", l_refresh: "Neuberechnung (Minuten)", l_animation: "Laufende Geräte animieren", l_language: "Sprache", auto: "Automatisch (Profil)",
      l_entity: "Überwachte Entität", l_name: "Anzeigename", l_icon: "Symbol", l_mode: "Läuft, wenn…",
      l_on_states: "„Laufend“-Zustände (durch Kommas getrennt)", l_threshold: "Schwellenwert",
      l_power_entity: "Leistungssensor (Statistiken)", l_on_power: "Leistung im Betrieb (W, automatisch wenn leer)", l_idle_power: "Leistung im Ruhezustand (W)",
      h_on_states: "Standard: on. Beispiel für ein Thermostat: heat, cool", h_threshold: "Zum Beispiel 3 für „läuft über 3 W“",
      h_power_entity: "Optional: schätzt die Spalte Jahr über den gespeicherten Verlauf hinaus", year_section: "Spalte Jahr (optional)",
      devices: "Geräte", new_device: "Neues Gerät", pick_entity: "Entität wählen", up: "Nach oben", down: "Nach unten", del: "Löschen", add: "Gerät hinzufügen",
      card_name: "HOLM – Laufzeit", card_desc: "Laufzeit pro Gerät aus dem Verlauf berechnet, ohne Helfer" },
    es: { title: "Tiempo de funcionamiento", today: "Hoy", yesterday: "Ayer", week: "Semana", month: "Mes", year: "Año",
      no_device: "Añade un dispositivo en el editor de la tarjeta.", error: "Error", loading: "Cargando…",
      partial: "Historial incompleto en este periodo", estimated: "Estimado a partir de las estadísticas de potencia anteriores a los últimos 30 días",
      mode_state: "Según su estado (on, heat…)", mode_above: "Valor por encima de un umbral", mode_below: "Valor por debajo de un umbral",
      l_title: "Título", l_refresh: "Recálculo (minutos)", l_animation: "Animar los dispositivos en marcha", l_language: "Idioma", auto: "Automático (perfil)",
      l_entity: "Entidad seguida", l_name: "Nombre mostrado", l_icon: "Icono", l_mode: "En marcha cuando…",
      l_on_states: "Estados «en marcha» (separados por comas)", l_threshold: "Umbral",
      l_power_entity: "Sensor de potencia (estadísticas)", l_on_power: "Potencia en marcha (W, automática si está vacío)", l_idle_power: "Consumo en reposo (W)",
      h_on_states: "Por defecto: on. Ejemplo para un termostato: heat, cool", h_threshold: "Por ejemplo 3 para «en marcha por encima de 3 W»",
      h_power_entity: "Opcional: estima la columna Año más allá del historial conservado", year_section: "Columna Año (opcional)",
      devices: "Dispositivos", new_device: "Nuevo dispositivo", pick_entity: "elige una entidad", up: "Subir", down: "Bajar", del: "Eliminar", add: "Añadir un dispositivo",
      card_name: "HOLM – Tiempo de funcionamiento", card_desc: "Tiempo de marcha por dispositivo calculado a partir del historial, sin ayudante" },
    it: { title: "Tempo di funzionamento", today: "Oggi", yesterday: "Ieri", week: "Settimana", month: "Mese", year: "Anno",
      no_device: "Aggiungi un dispositivo nell'editor della scheda.", error: "Errore", loading: "Caricamento…",
      partial: "Cronologia incompleta per questo periodo", estimated: "Stimato dalle statistiche di potenza precedenti agli ultimi 30 giorni",
      mode_state: "In base allo stato (on, heat…)", mode_above: "Valore sopra una soglia", mode_below: "Valore sotto una soglia",
      l_title: "Titolo", l_refresh: "Ricalcolo (minuti)", l_animation: "Anima i dispositivi in funzione", l_language: "Lingua", auto: "Automatica (profilo)",
      l_entity: "Entità monitorata", l_name: "Nome visualizzato", l_icon: "Icona", l_mode: "In funzione quando…",
      l_on_states: "Stati «in funzione» (separati da virgole)", l_threshold: "Soglia",
      l_power_entity: "Sensore di potenza (statistiche)", l_on_power: "Potenza in funzione (W, automatica se vuota)", l_idle_power: "Consumo a riposo (W)",
      h_on_states: "Predefinito: on. Esempio per un termostato: heat, cool", h_threshold: "Ad esempio 3 per «in funzione sopra 3 W»",
      h_power_entity: "Facoltativo: stima la colonna Anno oltre la cronologia conservata", year_section: "Colonna Anno (facoltativa)",
      devices: "Dispositivi", new_device: "Nuovo dispositivo", pick_entity: "scegli un'entità", up: "Sposta su", down: "Sposta giù", del: "Elimina", add: "Aggiungi un dispositivo",
      card_name: "HOLM – Tempo di funzionamento", card_desc: "Tempo di funzionamento per dispositivo calcolato dalla cronologia, senza helper" },
    nl: { title: "Looptijd", today: "Vandaag", yesterday: "Gisteren", week: "Week", month: "Maand", year: "Jaar",
      no_device: "Voeg een apparaat toe in de kaarteditor.", error: "Fout", loading: "Laden…",
      partial: "Onvolledige geschiedenis voor deze periode", estimated: "Geschat op basis van vermogensstatistieken van vóór de laatste 30 dagen",
      mode_state: "Op basis van de status (on, heat…)", mode_above: "Waarde boven een drempel", mode_below: "Waarde onder een drempel",
      l_title: "Titel", l_refresh: "Herberekening (minuten)", l_animation: "Actieve apparaten animeren", l_language: "Taal", auto: "Automatisch (profiel)",
      l_entity: "Gevolgde entiteit", l_name: "Weergavenaam", l_icon: "Pictogram", l_mode: "Actief wanneer…",
      l_on_states: "‘Actief’-statussen (gescheiden door komma's)", l_threshold: "Drempel",
      l_power_entity: "Vermogenssensor (statistieken)", l_on_power: "Vermogen bij werking (W, automatisch indien leeg)", l_idle_power: "Verbruik in rust (W)",
      h_on_states: "Standaard: on. Voorbeeld voor een thermostaat: heat, cool", h_threshold: "Bijvoorbeeld 3 voor ‘actief boven 3 W’",
      h_power_entity: "Optioneel: schat de kolom Jaar buiten de bewaarde geschiedenis", year_section: "Kolom Jaar (optioneel)",
      devices: "Apparaten", new_device: "Nieuw apparaat", pick_entity: "kies een entiteit", up: "Omhoog", down: "Omlaag", del: "Verwijderen", add: "Apparaat toevoegen",
      card_name: "HOLM – Looptijd", card_desc: "Looptijd per apparaat berekend uit de geschiedenis, zonder helper" },
    pt: { title: "Tempo de funcionamento", today: "Hoje", yesterday: "Ontem", week: "Semana", month: "Mês", year: "Ano",
      no_device: "Adicione um dispositivo no editor do cartão.", error: "Erro", loading: "A carregar…",
      partial: "Histórico incompleto neste período", estimated: "Estimado a partir das estatísticas de potência anteriores aos últimos 30 dias",
      mode_state: "Pelo estado (on, heat…)", mode_above: "Valor acima de um limite", mode_below: "Valor abaixo de um limite",
      l_title: "Título", l_refresh: "Recálculo (minutos)", l_animation: "Animar dispositivos em funcionamento", l_language: "Idioma", auto: "Automático (perfil)",
      l_entity: "Entidade monitorizada", l_name: "Nome apresentado", l_icon: "Ícone", l_mode: "Em funcionamento quando…",
      l_on_states: "Estados «em funcionamento» (separados por vírgulas)", l_threshold: "Limite",
      l_power_entity: "Sensor de potência (estatísticas)", l_on_power: "Potência em funcionamento (W, automática se vazio)", l_idle_power: "Consumo em repouso (W)",
      h_on_states: "Predefinição: on. Exemplo para um termóstato: heat, cool", h_threshold: "Por exemplo 3 para «em funcionamento acima de 3 W»",
      h_power_entity: "Opcional: estima a coluna Ano para além do histórico guardado", year_section: "Coluna Ano (opcional)",
      devices: "Dispositivos", new_device: "Novo dispositivo", pick_entity: "escolha uma entidade", up: "Mover para cima", down: "Mover para baixo", del: "Eliminar", add: "Adicionar dispositivo",
      card_name: "HOLM – Tempo de funcionamento", card_desc: "Tempo de funcionamento por dispositivo calculado a partir do histórico, sem auxiliar" },
    pl: { title: "Czas pracy", today: "Dziś", yesterday: "Wczoraj", week: "Tydzień", month: "Miesiąc", year: "Rok",
      no_device: "Dodaj urządzenie w edytorze karty.", error: "Błąd", loading: "Ładowanie…",
      partial: "Niepełna historia w tym okresie", estimated: "Oszacowano na podstawie statystyk mocy sprzed ostatnich 30 dni",
      mode_state: "Według stanu (on, heat…)", mode_above: "Wartość powyżej progu", mode_below: "Wartość poniżej progu",
      l_title: "Tytuł", l_refresh: "Przeliczanie (minuty)", l_animation: "Animuj działające urządzenia", l_language: "Język", auto: "Automatycznie (profil)",
      l_entity: "Śledzona encja", l_name: "Wyświetlana nazwa", l_icon: "Ikona", l_mode: "Działa, gdy…",
      l_on_states: "Stany „działa” (oddzielone przecinkami)", l_threshold: "Próg",
      l_power_entity: "Czujnik mocy (statystyki)", l_on_power: "Moc podczas pracy (W, automatycznie, jeśli puste)", l_idle_power: "Pobór w spoczynku (W)",
      h_on_states: "Domyślnie: on. Przykład dla termostatu: heat, cool", h_threshold: "Na przykład 3 dla „działa powyżej 3 W”",
      h_power_entity: "Opcjonalnie: szacuje kolumnę Rok poza przechowywaną historią", year_section: "Kolumna Rok (opcjonalnie)",
      devices: "Urządzenia", new_device: "Nowe urządzenie", pick_entity: "wybierz encję", up: "W górę", down: "W dół", del: "Usuń", add: "Dodaj urządzenie",
      card_name: "HOLM – Czas pracy", card_desc: "Czas pracy każdego urządzenia obliczany z historii, bez pomocnika" },
  };
  const LANG_NAMES = { fr: "Français", en: "English", de: "Deutsch", es: "Español", it: "Italiano", nl: "Nederlands", pt: "Português", pl: "Polski" };
  // langue : option `language` de la carte, sinon celle du profil Home Assistant ; anglais si non traduite
  const langOf = (hass, c) => { const l = String((c && c.language) || hass?.locale?.language || hass?.language || navigator.language || "en").toLowerCase().split(/[-_]/)[0]; return I18N[l] ? l : "en"; };
  const tr = (l, k) => (I18N[l] && I18N[l][k]) ?? I18N.en[k] ?? I18N.fr[k] ?? k;
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
      return { devices: e ? [{ entity: e }] : [] };
    }
    setConfig(c) {
      if (!c) throw new Error("holm-runtime-card : configuration invalide");
      const devices = Array.isArray(c.devices) ? c.devices.filter((d) => d && d.entity) : [];
      this._c = { refresh_minutes: 5, animation: true, ...c, devices };
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

    _t(k) { return tr(langOf(this._hass, this._c), k); }
    _periods() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);
      const dow = (today.getDay() + 6) % 7; // lundi = 0
      const week = new Date(today.getTime() - dow * 86400000);
      const month = new Date(now.getFullYear(), now.getMonth(), 1);
      return [
        { k: "today", a: today, b: now, live: true },
        { k: "yesterday", a: yesterday, b: today },
        { k: "week", a: week, b: now, live: true },
        { k: "month", a: month, b: now, live: true },
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
        this._heads = [...periods.map((p) => p.k), "year"];
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
      const heads = (this._heads || [...this._periods().map((p) => p.k), "year"]).map((k) => this._t(k));
      const anim = this._c.animation !== false;
      let body;
      if (!this._c.devices.length) body = `<div class="msg">${this._t("no_device")}</div>`;
      else if (this._err) body = `<div class="msg">${this._t("error")} : ${esc(this._err)}</div>`;
      else if (!this._rows) body = `<div class="msg">${this._t("loading")}</div>`;
      else body = `
        <table>
          <thead><tr><th></th>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${this._rows.map((r) => {
            const on = this._isOn(r.d, this._hass?.states[r.d.entity]?.state);
            const icon = this._icon(r.d);
            return `
            <tr class="${on ? "on" : ""}" data-entity="${esc(r.d.entity)}">
              <td class="n"><div class="nw"><span class="ic${SPIN.test(icon) ? " spin" : ""}"><ha-icon icon="${esc(icon)}"></ha-icon><i class="dot"></i></span><span class="nm">${esc(this._name(r.d))}</span></div></td>
              ${r.vals.map((v) => `<td class="v${v.sec || (on && v.live) ? "" : " z"}" title="${v.partial ? this._t("partial") : v.estimated ? this._t("estimated") : ""}">${this._cell(v, on)}</td>`).join("")}
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
          ${(this._c.title ?? this._t("title")) ? `<div class="hdr">${esc(this._c.title ?? this._t("title"))}</div>` : ""}
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
  const MODES = (l) => ["state", "above", "below"].map((v) => ({ value: v, label: tr(l, "mode_" + v) }));
  const LABELS = { title: "l_title", refresh_minutes: "l_refresh", animation: "l_animation", language: "l_language", entity: "l_entity", name: "l_name", icon: "l_icon",
    mode: "l_mode", on_states: "l_on_states", threshold: "l_threshold", power_entity: "l_power_entity", on_power: "l_on_power", idle_power: "l_idle_power" };
  const HELPERS = { on_states: "h_on_states", threshold: "h_threshold", power_entity: "h_power_entity" };

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
    get _l() { return langOf(this._hass, this._c); }
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
      if (!cfg.language) delete cfg.language;
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
        { name: "mode", selector: { select: { mode: "dropdown", options: MODES(this._l) } } },
        mode === "state" ? { name: "on_states", selector: { text: {} } } : { name: "threshold", required: true, selector: { number: { mode: "box", step: "any" } } },
        { type: "expandable", name: "", title: tr(this._l, "year_section"), flatten: true, schema: [
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
        <div class="ttl">${tr(this._l, "devices")}</div>
        <div class="devs">
          ${devs.map((d, i) => {
            const st = d.entity && h?.states[d.entity];
            const nm = d.name || st?.attributes.friendly_name || d.entity || tr(this._l, "new_device");
            const icon = d.icon || st?.attributes.icon || "mdi:power";
            return `<div class="dev" data-i="${i}">
              <div class="dh" data-toggle="${i}"><ha-icon icon="${esc(icon)}"></ha-icon><div class="t">${esc(nm)}<small>${esc(d.entity || tr(this._l, "pick_entity"))}</small></div>
                <button data-up="${i}" title="${tr(this._l, "up")}" ${i === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
                <button data-down="${i}" title="${tr(this._l, "down")}" ${i === devs.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
                <button data-del="${i}" title="${tr(this._l, "del")}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
                <ha-icon icon="${this._open === i ? "mdi:chevron-up" : "mdi:chevron-down"}"></ha-icon></div>
              ${this._open === i ? `<div class="db"><ha-form data-form="${i}"></ha-form></div>` : ""}
            </div>`;
          }).join("")}
        </div>
        <button class="add" id="add"><ha-icon icon="mdi:plus"></ha-icon>${tr(this._l, "add")}</button>`;
      const label = (s) => (LABELS[s.name] ? tr(this._l, LABELS[s.name]) : s.title ?? s.name);
      const helper = (s) => (HELPERS[s.name] ? tr(this._l, HELPERS[s.name]) : undefined);
      const top = this.shadowRoot.getElementById("top");
      top.hass = h; top.computeLabel = label;
      top.schema = [
        { name: "title", selector: { text: {} } },
        { type: "grid", name: "", schema: [
          { name: "refresh_minutes", selector: { number: { mode: "box", min: 1, max: 120, unit_of_measurement: "min" } } },
          { name: "animation", selector: { boolean: {} } },
        ] },
        { name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: tr(this._l, "auto") }, ...Object.entries(LANG_NAMES).map(([value, label]) => ({ value, label }))] } } },
      ];
      top.data = { title: this._c.title ?? tr(this._l, "title"), refresh_minutes: this._c.refresh_minutes ?? 5, animation: this._c.animation !== false, language: this._c.language || "" };
      top.addEventListener("value-changed", (e) => {
        e.stopPropagation();
        const v = e.detail.value;
        const relang = (v.language || "") !== (this._c.language || "");
        this._c.title = v.title; this._c.refresh_minutes = v.refresh_minutes; this._c.animation = v.animation; this._c.language = v.language || undefined;
        this._emit();
        if (relang) this._build();
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
    const l = langOf(document.querySelector("home-assistant")?.hass);
    window.customCards.push({ type: "holm-runtime-card", name: tr(l, "card_name"), description: tr(l, "card_desc"), preview: true });
  }
  console.info(`%c HOLM-RUNTIME %c ${VERSION} `, "background:#4a90d9;color:#111;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
