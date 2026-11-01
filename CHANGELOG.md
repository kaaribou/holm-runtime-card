# Changelog

## 1.2.0
- **8 langues** : français, anglais, allemand, espagnol, italien, néerlandais, portugais et polonais, pour la carte et son éditeur visuel. La carte suit la langue du profil Home Assistant (anglais si la langue n'est pas traduite) ; nouvelle option `language` pour en imposer une, aussi réglable dans l'éditeur.
- README en anglais (`README.en.md`).

## 1.1.0
- **Éditeur visuel** : titre, intervalle de recalcul, animation, et pour chaque appareil l'entité, le nom, l'icône, la règle « en marche » (état ou seuil) et la colonne Année. Ajouter, réordonner et supprimer des appareils sans YAML.
- **Animation des appareils en marche** : pastille colorée qui « respire », icône qui tourne pour les ventilateurs, pompes, VMC, lave-linge…, voyant qui pulse et barre lumineuse sur la ligne. Désactivable (`animation: false`), et coupée automatiquement si le système demande moins d'animations.
- L'état « en marche » suit Home Assistant en direct, et les durées des périodes en cours avancent pendant que l'appareil tourne.
- Icône de l'entité utilisée par défaut quand aucune icône n'est choisie.
- Un toucher sur un appareil ouvre sa fiche Home Assistant.
- La carte s'affiche sans erreur même sans appareil (message d'aide).

## 1.0.0
- Première version publique : temps de marche par jour, veille, semaine, mois et année depuis l'historique, seuils numériques, états personnalisés, estimation annuelle par statistiques de puissance.
