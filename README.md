# ⏱️ HOLM Runtime Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
![Version](https://img.shields.io/github/v/release/kaaribou/holm-runtime-card)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2025.1%2B-03a9f4)

**Combien de temps tourne la VMC, le chauffe-eau ou la pompe de la piscine ? Aujourd'hui, hier, cette semaine, ce mois, cette année — sans créer un seul helper.**

HOLM Runtime Card calcule le **temps de fonctionnement** de vos appareils directement à partir de l'**historique** de Home Assistant. Pas de capteur `history_stats` à créer, pas d'automatisation : on liste les appareils, la carte fait les calculs.

### En bref

- 📅 **5 périodes** : Aujourd'hui, Hier, Semaine (depuis lundi), Mois, Année.
- 🔌 **Tout type d'entité** : interrupteur (`on`), capteur de puissance (en marche au-dessus d'un seuil), thermostat (états choisis, ex. `heat`)…
- 📈 **Année complète** : au-delà des 30 jours d'historique, la carte peut estimer la durée à partir des **statistiques long terme** d'un capteur de puissance (valeur précédée de « ≈ »).
- 🟢 Pastille allumée quand l'appareil tourne en ce moment.
- 🔄 Recalcul automatique toutes les 5 minutes (réglable).

![Temps de fonctionnement](docs/images/temps.png)

---

## Installation

### Avec HACS (recommandé)

1. HACS → menu ⋮ → **Dépôts personnalisés**.
2. Ajoutez `https://github.com/kaaribou/holm-runtime-card`, catégorie **Tableau de bord** (*Dashboard / Plugin*).
3. Recherchez la carte → **Télécharger**.
4. Rechargez la page (Ctrl + F5).

### Manuellement

1. Copiez `dist/holm-runtime-card.js` dans `config/www/community/holm-runtime-card/`.
2. **Paramètres → Tableaux de bord → ⋮ → Ressources → Ajouter** : `/local/community/holm-runtime-card/holm-runtime-card.js`, type **Module JavaScript**.
3. Rechargez la page.

---

## Utilisation

La carte se configure en YAML (éditeur de code de la carte) :

```yaml
type: custom:holm-runtime-card
title: Temps de fonctionnement
devices:
  - name: VMC
    entity: switch.vmc
    icon: mdi:fan
  - name: Chauffe-eau
    entity: sensor.chauffe_eau_puissance
    above: 3                     # en marche au-dessus de 3 W
    power_entity: sensor.chauffe_eau_puissance   # pour l'année complète
  - name: Pompe à chaleur
    entity: climate.pompe_a_chaleur
    on_states: [heat, cool]
```

## Options

| Option | Description | Par défaut |
|---|---|---|
| `title` | Titre | `Temps de fonctionnement` |
| `devices` | Liste des appareils (**obligatoire**) | — |
| `refresh_minutes` | Intervalle de recalcul | `5` |

Chaque appareil accepte :

| Clé | Description |
|---|---|
| `entity` | Entité suivie (**obligatoire**) |
| `name`, `icon` | Nom et icône affichés |
| `on_state` / `on_states` | État(s) considéré(s) comme « en marche » (défaut `on`) |
| `above` / `below` | Pour une valeur numérique : en marche au-dessus / en dessous du seuil |
| `power_entity` | Capteur de puissance avec statistiques, pour estimer l'année au-delà de l'historique |
| `on_power` | Puissance en marche (W) ; automatique si absent |
| `idle_power` | Consommation à l'arrêt (W), défaut 0 |

## Bon à savoir

- Home Assistant conserve l'historique détaillé **10 jours par défaut** (réglage `recorder: purge_keep_days`). Au-delà, une valeur suivie de « * » signale un historique incomplet sur la période.
- Sans `power_entity`, la colonne Année ne compte que la partie couverte par l'historique (« * »).

## FAQ

| Problème | Solution |
|---|---|
| Mois ou Année marqués « * » | Augmentez `purge_keep_days` du recorder, ou ajoutez un `power_entity` pour l'estimation annuelle. |
| La nouvelle version ne s'affiche pas | Videz le cache (Ctrl + F5). |

---

## Un petit merci ?

La carte vous plaît ? Vous pouvez m'offrir une bière 🍺

[![Offrez-moi une bière](https://img.shields.io/badge/Offrez--moi_une_bi%C3%A8re-PayPal-0070ba?logo=paypal&logoColor=white)](https://paypal.me/kaaribou)

---

## Licence

Code : licence **MIT** — © kaaribou. Voir le [CHANGELOG](CHANGELOG.md).

Fait partie de la collection **HOLM** : [Carburant HOLM](https://github.com/kaaribou/carburant-holm) · [HOLM Navbar Card](https://github.com/kaaribou/holm-navbar-card) · [HOLM Music Card](https://github.com/kaaribou/holm-music-card) · [HOLM Sentinel Card](https://github.com/kaaribou/holm-sentinel-card).
