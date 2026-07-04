# Hébergement du cache AFRP sur Cloudflare R2

Le client télécharge **chaque fichier** du cache via une URL statique prévisible :
`<cdnCache>/<sous-dossier>/<fichier>` (voir `src/thunks/loaderThunks.ts`).
Cloudflare R2 sert exactement ce type d'URL, avec **égress gratuit** (pas de
facture de bande passante, contrairement à AWS S3).

> ⚠️ **MediaFire ne peut pas faire ça** : liens de partage dynamiques par fichier,
> hotlinking bloqué. On utilise donc R2.

Le cache = le dossier **`files/`** du modpack Slime/AFRP (~4 Go, dont `texdb` 3,7 Go).

---

## 1. Créer le bucket R2

1. Compte gratuit sur https://dash.cloudflare.com → **R2**.
   (R2 demande une carte pour vérif, mais le plan gratuit = 10 Go + égress gratuit.)
2. **Create bucket** → nom : `afrp-cache` → région automatique.
3. Onglet **Settings** du bucket → **Public access** :
   - Soit **R2.dev subdomain** → active-le. Tu obtiens une URL du type
     `https://pub-xxxxxxxx.r2.dev`. ✅ Simple, pour démarrer.
   - Soit **Custom Domain** (recommandé en prod) : branche un sous-domaine à toi
     (ex: `cdn.afrp.xyz`) → CDN Cloudflare, cache, **pas de limite de débit**.
     Le r2.dev est *rate-limité* et déconseillé pour des centaines de joueurs.

Note l'URL publique obtenue, appelons-la `BASE` (ex: `https://pub-xxxx.r2.dev`).

---

## 2. Créer une clé API R2 (pour l'upload)

Dashboard R2 → **Manage R2 API Tokens** → **Create API token** :
- Permissions : **Object Read & Write**, sur le bucket `afrp-cache`.
- Note : **Access Key ID**, **Secret Access Key**, et l'**Account ID** (visible
  dans l'URL du dashboard / page R2). L'endpoint S3 est :
  `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## 3. Installer et configurer rclone

rclone gère des milliers de fichiers et préserve l'arborescence (indispensable).

```powershell
winget install Rclone.Rclone
# puis, dans un nouveau terminal :
rclone config
```

Réponses à `rclone config` :
- `n` (new remote) → nom : **r2**
- Storage → `Amazon S3 Compliant...` (numéro de "S3") → provider → **Cloudflare**
- `access_key_id` → ta clé
- `secret_access_key` → ton secret
- `region` → **auto**
- `endpoint` → `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- reste par défaut, `q` pour quitter.

Test : `rclone lsd r2:afrp-cache` (doit répondre sans erreur).

---

## 4. Nettoyer le dossier `files/` avant upload

Certains fichiers sont inutiles/privés — à **ne pas** héberger :
- `logcat/` (144 Mo de logs)
- `*.log`, `samp_log.txt`, `crash_log.log`, `gtasatelem.set`
- `AZVoice/` (vide)

> Le générateur ignore déjà `samp_log.txt`, `crash_log.log`, `gtasatelem.set`,
> mais **pas** le dossier `logcat/`. Supprime-le (ou exclus-le à l'upload, §5).

Fais une **copie de travail** du modpack pour ne pas toucher l'original.

---

## 5. Uploader le cache vers R2

Remplace le chemin par ta copie du dossier `files/` du modpack :

```powershell
$FILES = "C:\Users\PC  MARKET\OneDrive\Documents\Slime🌏Wrld Modpack🤙💫💯\Slime🌏Wrld Modpack🤙💫💯\files"

rclone copy "$FILES" r2:afrp-cache/mobile/cache `
  --exclude "logcat/**" --exclude "*.log" `
  --transfers 8 --checkers 16 --progress
```

Après upload, un fichier `files/data/gta.dat` sera à
`BASE/mobile/cache/data/gta.dat` — c'est exactement le schéma attendu par le client.

Vérifie un fichier dans le navigateur :
`BASE/mobile/cache/data/gta.dat` doit se télécharger.

---

## 6. Générer `distribution.json`

Le script scanne le cache et liste chaque fichier (chemin + taille).

1. Mets ton URL `BASE` dans **`distribution/src/index.js`** :
   ```js
   const cdnCache = 'BASE/mobile/cache';
   const cdnLauncher = 'BASE/mobile/launcher';
   ```
   (remplace `https://VOTRE-BUCKET.r2.dev`)

2. Génère (Node 16). `AFRP_CACHE_DIR` pointe sur le dossier `files/` :
   ```powershell
   cd distribution
   npm install
   $env:AFRP_CACHE_DIR = "C:\...\Slime Modpack\...\files"
   npm run build
   ```
   → produit `distribution/build/distribution.json`.

   > L'APK d'auto-MAJ est **optionnel** : sans `distributions/launcher/app-release.apk`,
   > le script continue et désactive juste l'auto-MAJ.

3. Uploade le JSON à la racine `mobile/` :
   ```powershell
   rclone copy build/distribution.json r2:afrp-cache/mobile/
   ```
   → accessible à `BASE/mobile/distribution.json`.

---

## 7. Brancher le client sur R2

Dans **`.env`** (racine du client), remplace `VOTRE-BUCKET.r2.dev` par ton `BASE` :
```
URL_DISTRIBUTION=BASE/mobile/distribution.json
```
(les autres URL_* / LINK_SITE_* peuvent pointer sur R2 ou ton Discord, au choix.)

Icône serveur : uploade un `afrp_icon.png` (256²) :
```powershell
rclone copy afrp_icon.png r2:afrp-cache/mobile/image/
```

Puis rebuild l'APK (CI GitHub Actions `assembleDebug`, ou local).

---

## 8. Tester

Installe l'APK → au splash, le client lit `distribution.json`, compare les tailles
locales et télécharge les fichiers manquants dans
`Android/data/com.touch.mobile.dark/files/`. Bouton **Jouer** → connecte
`51.38.205.167:24328`.

En cas d'écran **Error** : vérifie qu'un fichier du cache s'ouvre bien dans le
navigateur (droits publics R2) et que `URL_DISTRIBUTION` répond en HTTP 200.

---

## Notes importantes

- **Le package reste `com.touch.mobile.dark`** : `libsamp.so` a ce chemin codé en
  dur (`/Android/data/com.touch.mobile.dark/files`, `/data/data/.../lib/libbass.so`).
  Le changer = cache introuvable + libbass non chargée → crash. Le rebrand AFRP est
  volontairement cosmétique (nom, icône, splash).
- **Validation par taille, pas par hash** pour le cache : si tu mets à jour un
  fichier en gardant la même taille, le client ne le re-téléchargera pas. Change la
  taille (ou vide le cache côté tel) pour forcer.
- **r2.dev est rate-limité** : pour de la charge réelle, passe à un domaine perso
  branché sur R2 (cache CDN Cloudflare, gratuit).
