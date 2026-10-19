# Refonte « Noir & Champagne »

## Intention
Donner à GymTrack l'allure d'un objet de luxe, cohérent avec le logo (ruban métallique
champagne sur noir) : sobre, profond, précis, avec des animations qui récompensent
chaque geste sans jamais ralentir la séance. Choix de direction laissé à Claude
(« fais comme tu veux »).

Anti-objectifs : effets gadgets, animations qui retardent une action, texte illisible
au gym (petit, faible contraste), saccades.

## Identité
- **Fond** : noir profond `#08090B` avec une lueur champagne très douce en haut d'écran.
- **Surfaces** : `#121316`, bord fin champagne à 14 %, coins 20 px. Variante « lueur »
  (reflet doré en haut à gauche) pour la carte principale de chaque écran.
- **Accent** : champagne `#E3D3B5` ; dégradé métallique `#F6EBD3 → #D9BE8C → #A8834A`
  pour les boutons principaux, les anneaux et les séries faites.
- **Texte** : ivoire `#F4F0E8`, secondaire `#8F8E92`. Danger : corail doux `#E5735F`.
- **Typographie** : *Cormorant Garamond* (serif) pour les titres d'écran, les noms de
  séance et les grands chiffres ; police système iOS pour le reste. Petits titres de
  section en capitales espacées.
- **Icônes** : SF Symbols (expo-symbols) à la place des emojis.
- **Vibrations** (expo-haptics) : série cochée, record, fin de séance, curseurs.

## Animations (Reanimated 4)
- Cartes : apparition en cascade (fondu + montée, 60 ms d'écart).
- Boutons et cartes touchables : léger enfoncement (ressort).
- Série cochée : le cercle se remplit d'or avec un « pop » + vibration.
- Record : badge qui apparaît en zoom + vibration de réussite.
- Anneaux (semaine, séance, repos) : progression animée.
- Graphiques : la courbe se dessine, l'aire sous la courbe apparaît en fondu ;
  barres de volume qui poussent.
- Sélecteur à onglets : pastille qui glisse.
- Barre de repos : panneau flottant qui monte, avec un anneau qui se vide.
- Réorganisation et ajout de séries : transitions de mise en page fluides.

## Écrans
- **Accueil** : date en capitales + salutation en serif ; carte principale avec anneau
  de l'objectif hebdo et série en semaines ; carte « Prochaine séance » (nom en serif,
  aperçu des exercices, bouton doré) ; actions rapides en pastilles.
- **Séance** : en-tête avec durée en serif et anneau des séries faites ; cartes
  d'exercice numérotées ; lignes de séries en pastilles ; barre de repos flottante.
- **Historique** : calendrier aux jours dorés, liste de séances en cartes.
- **Progrès** : onglets animés, courbes avec dégradé, barres animées, records.
- **Réglages** : sections groupées avec icônes.
- Écrans secondaires (modèle, salle, exercice, liste d'exercices, erreur) : mêmes
  composants.

## Réalisation
1. Fondations : couleurs, polices, fond, composants (Texte, Carte, Bouton, Pastille
   animée, Icône, Anneau, Onglets, Curseur, Champ) et vibrations.
2. Écrans, du plus utilisé au moins utilisé : Séance, Accueil, Progrès, Historique,
   Réglages, puis les secondaires.
3. Vérifications : tests, typecheck, lint, bundle iOS, build.
