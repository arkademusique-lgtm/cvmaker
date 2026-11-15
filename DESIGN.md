# RM-808 Studio — design

**Monde :** la console de la machine — boîtier anthracite, potards orange, touches de pas rouge / orange / jaune / blanc. Le monde fournit seulement la typo, la palette, la densité et un geste signature ; la navigation et les contrôles restent standards.

**Geste signature :** la rangée des 16 pas colorés (rouge 1-4, orange 5-8, jaune 9-12, blanc 13-16), reprise dans le séquenceur, les pads et les touches de jeu.

**Typo :** Archivo (auto-hébergée, `public/fonts`), largeur 96 % pour l'interface, 112 % italique 900 pour le logo. Chiffres tabulaires pour les valeurs.

**Palette (tokens `:root` dans `css/style.css`) :** fond `--bg` #16171a, panneaux `--panel` / `--panel2`, texte `--txt`, secondaire `--mut`, accent `--org` #ff7a1a, sélection / effets live `--blue`, OK `--ok`, couleurs des pas `--red` `--orange` `--yellow` `--white`.

**Icônes :** une seule famille SVG (grille 24 px, trait 2 px arrondi) dans `js/icons.js` ; pas d'emoji comme icône. Les libellés commençant par un glyphe sont convertis automatiquement par `h()`.

**Profondeur :** ombres décalées et floues, jamais de halo coloré ni d'ombre dure sans flou. Rayons : 6 px contrôles, 8–12 px panneaux, pilule pour les chips.

**Surfaces navigateur :** sélection, caret, barres de défilement et anneau de focus (`:focus-visible`, bleu) thémés.

**Tactile :** cibles ≥ 38 px sur écran tactile, barre d'onglets en bas sur tablette / téléphone.
