# Visite 3D · Alban Fredon

Une pièce en 3D où l'on se promène librement (ZQSD/WASD, flèches, souris ou joystick tactile). Sur l'écran de l'ordinateur défilent mes projets GitHub (Aiogps, AIOTECH MCP, AIOTECH Search, AIOTrade, AIOBot, AIO v3), chacun avec les éléments 3D et les couleurs de son propre site ; en cliquant dessus, on plonge dans l'écran pour les faire tourner. La visite se termine par ma fiche des prestations (classique, luxe, ultra luxe, sur devis) et mes coordonnées. Le lien `#tarifs` ouvre directement cette fiche.

**En ligne : https://albanfredon23.github.io/visit/**

- Three.js, sans framework ni étape de build : `index.html`, `css/`, `js/` (modules).
- Textes, projets, prestations et contact en français et en anglais : `js/data/content.js`.
- Une scène par projet : `js/gallery/projects/`.
- Qualité graphique adaptative : le rendu s'allège tout seul si l'appareil ralentit.

Pour lancer en local : `npx http-server .` puis ouvrir http://localhost:8080.

- Conformité RGPD : aucun cookie, aucun traceur ; polices (`fonts/`) et Three.js (`vendor/three/`) servis par le site lui-même, sans Google Fonts ni CDN. Mentions légales et confidentialité : `legal.html`.
