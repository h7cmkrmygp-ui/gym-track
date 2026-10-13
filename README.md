# GymTrack

App iPhone perso pour le gym :
- détection automatique de l'arrivée à la salle, pour noter les jours de gym ;
- journal des séances (poids × reps, minuteur de repos) ;
- split en rotation ;
- progression : graphiques, records, poids du corps.

Les données restent sur le téléphone (SQLite). Pense à exporter une sauvegarde de temps en temps (Réglages → Sauvegarde).

## Développer (Expo Go)

```bash
npm install
npx expo start
```

Scanne le QR code avec l'appareil photo de l'iPhone pour ouvrir l'app dans Expo Go. Le téléphone et le PC doivent être sur le même Wi-Fi.

Dans Expo Go, la détection en arrière-plan est désactivée. Des boutons « Simuler arrivée / départ » sont disponibles dans Réglages pour tester.

Vérifications :

```bash
npm test            # logique métier (rotation, visites, stats, records, unités)
npm run typecheck
npx expo lint
```

## Installer sur l'iPhone (AltStore, sans Mac)

1. Lance le workflow **iOS IPA (AltStore)** depuis GitHub (onglet Actions → Run workflow) ou avec `gh workflow run ios-ipa.yml`. Pousser un tag `v*` le lance aussi.
2. Quand il est fini (environ 10 min), une release `build-N` contient `GymTrack.ipa`. Télécharge-la :
   - sur le PC : `gh release download build-N` ;
   - ou directement sur l'iPhone, dans Fichiers.
3. Installe-la :
   - sur l'iPhone : AltStore → My Apps → **+** → choisis `GymTrack.ipa` ;
   - ou sur le PC : AltServer → Shift + clic → Sideload .ipa.
4. Ouvre GymTrack, puis Réglages → **Activer la détection** → choisis « Toujours ». Ensuite, quand tu es à la salle, utilise **Ajouter ma position actuelle**.

Avec un Apple ID gratuit, l'app expire au bout de 7 jours. AltServer la renouvelle automatiquement quand le PC et l'iPhone sont sur le même Wi-Fi. Tes données sont gardées tant que l'app n'est pas supprimée.
