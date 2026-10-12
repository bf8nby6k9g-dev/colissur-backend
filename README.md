# ColisSûr — Serveur de paiement (agrégateur interchangeable)

Ce serveur fait le lien sécurisé entre ton appli ColisSûr et l'agrégateur
de paiement de ton choix (CamPay, CamerPay, ou un autre). Ta clé API ne
reste JAMAIS sur le téléphone des clientes/vendeuses — elle n'existe que
sur ce serveur.

Suis ces étapes **dans l'ordre**, une à la fois. Ne saute pas d'étape.

---

## Étape 1 — Choisis ton agrégateur et crée ton compte

Tu peux commencer par n'importe lequel. Pour l'instant, deux sont déjà
prêts dans le code : **CamPay** et **CamerPay**.

1. Va sur **campay.net** (ou **camerpay.biz** si tu préfères celui-là)
2. Crée un compte
3. Cherche dans leur tableau de bord une section **"API Keys"** ou **"Clés API"**
4. Copie ta clé — garde-la de côté, tu en auras besoin à l'étape 5

⚠️ Commence toujours en mode **test / démo** si l'agrégateur en propose un, jamais directement en production.

---

## Étape 2 — Crée un compte GitHub (si tu n'en as pas déjà un)

1. Va sur **github.com**
2. Crée un compte gratuit

---

## Étape 3 — Mets le code de ce serveur sur GitHub

1. Sur github.com, appuie sur **"+"** en haut à droite → **"New repository"**
2. Nomme-le `colissur-backend`
3. Laisse-le **"Public"**
4. Ne coche rien d'autre → **"Create repository"**
5. Une fois créé, appuie sur **"uploading an existing file"**
6. Dépose ces **3 fichiers** (pas plus, surtout pas de fichier `.env` rempli) :
   - `server.js`
   - `package.json`
   - `.env.example`
7. Tout en bas, **"Commit changes"**

---

## Étape 4 — Déploie sur Render (gratuit)

1. Va sur **render.com**
2. Crée un compte gratuit — tu peux te connecter directement avec ton compte GitHub
3. Une fois connecté, appuie sur **"New +"** → **"Web Service"**
4. Choisis de connecter ton dépôt GitHub `colissur-backend`
5. Render détecte automatiquement Node.js — laisse les réglages par défaut :
   - **Build command** : `npm install`
   - **Start command** : `npm start`
6. Choisis le plan **"Free"**
7. **N'appuie pas encore sur "Deploy"** — passe d'abord à l'étape 5

---

## Étape 5 — Ajoute tes 3 variables secrètes

Toujours sur la page de création du service Render, cherche la section
**"Environment"** (ou "Environment Variables") et ajoute ces 3 lignes,
une par une :

| Nom de la variable | Valeur à mettre |
|---|---|
| `PAYMENT_PROVIDER` | `campay` (ou `camerpay` si tu as choisi cet agrégateur) |
| `PAYMENT_API_KEY` | ta clé API copiée à l'étape 1 |
| `PAYMENT_BASE_URL` | `https://demo.campay.net/api` (ou `https://camerpay.biz/api`) |

Une fois les 3 ajoutées, appuie sur **"Deploy Web Service"** (ou "Create Web Service").

---

## Étape 6 — Attends et récupère ton adresse

1. Attends 1 à 2 minutes que Render termine le déploiement (tu verras les logs défiler)
2. En haut de la page, Render affiche une adresse du style :
   ```
   https://colissur-backend.onrender.com
   ```
3. Copie cette adresse

---

## Étape 7 — Vérifie que ça marche

Ouvre cette adresse dans ton navigateur. Tu dois voir quelque chose comme :
```json
{"status": "ColisSûr backend en ligne", "provider": "campay", "configured": true}
```

- Si `configured` est à `false` → une variable d'environnement manque, revérifie l'étape 5
- Si la page ne charge pas du tout → revérifie l'étape 4

---

## Étape 8 — Donne-moi l'adresse

Reviens dans notre conversation et donne-moi l'adresse de l'étape 6.
Je modifierai la ligne `BACKEND_URL` dans le code de l'appli pour qu'elle
pointe vers ce serveur — à partir de ce moment, les paiements ne seront
plus simulés.

---

## Pour changer d'agrégateur plus tard

Tu n'as pas besoin de refaire tout ça : retourne juste dans **Render →
ton service → Environment**, change la valeur de `PAYMENT_PROVIDER` et
`PAYMENT_BASE_URL`, remets une nouvelle clé dans `PAYMENT_API_KEY`, et
sauvegarde. Si l'agrégateur n'est pas encore dans `server.js`
(seuls CamPay et CamerPay y sont pour l'instant), dis-le-moi et je
l'ajoute — c'est un petit bloc de code à ajouter, rien d'autre ne bouge.
