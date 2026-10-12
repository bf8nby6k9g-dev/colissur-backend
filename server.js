// ============================================================
// ColisSûr — Serveur pont vers un agrégateur de paiement
// ============================================================
// Architecture "par adaptateur" : UN SEUL endroit à modifier si tu
// changes d'agrégateur (CamPay, CamerPay, Monetbil, Diool, etc.) :
// la section "ADAPTATEURS" ci-dessous. Tout le reste du fichier ne
// bouge jamais.
//
// Pourquoi il n'existe pas de "clé magique universelle" :
// chaque agrégateur attend des noms de champs différents dans sa
// requête (ex: "amount" vs "montant", "from" vs "customer_phone").
// Donc on ne peut pas éviter complètement d'adapter le code — mais
// ici, l'adaptation tient en une dizaine de lignes, au même endroit,
// jamais ailleurs dans le fichier.
// ============================================================

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'campay';
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || '';
const PAYMENT_BASE_URL = process.env.PAYMENT_BASE_URL || '';

if (!PAYMENT_API_KEY) {
  console.warn('⚠️  PAYMENT_API_KEY manquante — configure-la dans les variables d\'environnement.');
}

// ============================================================
// ADAPTATEURS — un bloc par agrégateur
// ============================================================
// Chaque adaptateur doit fournir 3 fonctions :
//   collect(amount, phone, description, reference)  -> encaisser
//   release(amount, phone, description, reference)  -> reverser
//   checkStatus(reference)                           -> vérifier le statut
//
// Pour ajouter un nouvel agrégateur : copie le bloc "campay" ci-dessous,
// renomme-le, et ajuste UNIQUEMENT les noms de champs selon la doc de
// ton agrégateur. Le reste du fichier (routes, sécurité) ne change pas.

const adapters = {

  // ---- CamPay (campay.net) — déjà vérifié dans leur documentation ----
  campay: {
    async collect(amount, phone, description, reference) {
      const res = await fetch(`${PAYMENT_BASE_URL}/collect/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${PAYMENT_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: String(amount),
          currency: 'XAF',
          from: phone,
          description: description,
          external_reference: reference
        })
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return { ok: true, providerReference: data.reference, raw: data };
    },
    async release(amount, phone, description, reference) {
      const res = await fetch(`${PAYMENT_BASE_URL}/withdraw/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${PAYMENT_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: String(amount),
          currency: 'XAF',
          to: phone,
          description: description,
          external_reference: reference
        })
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return { ok: true, providerReference: data.reference, raw: data };
    },
    async checkStatus(reference) {
      const res = await fetch(`${PAYMENT_BASE_URL}/transaction/${reference}/`, {
        headers: { 'Authorization': `Token ${PAYMENT_API_KEY}` }
      });
      return await res.json();
    }
  },

  // ---- CamerPay (camerpay.biz) — exemple prêt, à activer si tu choisis cet agrégateur ----
  // Basé sur leur SDK officiel (camerpay.biz/docs). Mets PAYMENT_PROVIDER=camerpay
  // et PAYMENT_BASE_URL=https://camerpay.biz/api pour l'utiliser.
  camerpay: {
    async collect(amount, phone, description, reference) {
      const res = await fetch(`${PAYMENT_BASE_URL}/payments/initiate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PAYMENT_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          currency: 'XAF',
          payment_method: 'orange_money',
          customer_phone: phone,
          merchant_invoice_id: reference
        })
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return { ok: true, providerReference: data.transaction ? data.transaction.uuid : null, raw: data };
    },
    async release(amount, phone, description, reference) {
      // À confirmer avec CamerPay : certains agrégateurs ne proposent pas
      // de reversement automatique par API et demandent un virement manuel
      // depuis leur tableau de bord. Vérifie ce point avec eux avant d'activer.
      throw new Error('Reversement automatique CamerPay non confirmé — vérifie avec leur support avant usage.');
    },
    async checkStatus(reference) {
      const res = await fetch(`${PAYMENT_BASE_URL}/payments/status/${reference}`, {
        headers: { 'Authorization': `Bearer ${PAYMENT_API_KEY}` }
      });
      return await res.json();
    }
  }

  // ---- Pour un autre agrégateur (Monetbil, Diool, etc.) ----
  // Ajoute un bloc du même type ici, avec le nom de ton choix,
  // puis mets PAYMENT_PROVIDER=ce-nom dans tes variables d'environnement.

};

function getAdapter() {
  const adapter = adapters[PAYMENT_PROVIDER];
  if (!adapter) {
    throw new Error(`Agrégateur inconnu : "${PAYMENT_PROVIDER}". Options disponibles : ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

// ============================================================
// ROUTES — ne changent jamais, quel que soit l'agrégateur
// ============================================================

app.get('/', (req, res) => {
  res.json({
    status: 'ColisSûr backend en ligne',
    provider: PAYMENT_PROVIDER,
    configured: !!PAYMENT_API_KEY
  });
});

app.post('/api/collect', async (req, res) => {
  const { amount, phone, description, reference } = req.body;
  if (!amount || !phone || !reference) {
    return res.status(400).json({ error: 'amount, phone et reference sont obligatoires.' });
  }
  if (!PAYMENT_API_KEY) {
    return res.status(500).json({ error: 'PAYMENT_API_KEY non configurée sur le serveur.' });
  }
  try {
    const result = await getAdapter().collect(amount, phone, description || 'Paiement ColisSûr', reference);
    res.json(result);
  } catch (err) {
    console.error('Erreur /api/collect :', err);
    res.status(500).json({ error: err.data || err.message || 'Erreur serveur.' });
  }
});

app.post('/api/release', async (req, res) => {
  const { amount, phone, description, reference } = req.body;
  if (!amount || !phone || !reference) {
    return res.status(400).json({ error: 'amount, phone et reference sont obligatoires.' });
  }
  if (!PAYMENT_API_KEY) {
    return res.status(500).json({ error: 'PAYMENT_API_KEY non configurée sur le serveur.' });
  }
  try {
    const result = await getAdapter().release(amount, phone, description || 'Paiement colis ColisSûr', reference);
    res.json(result);
  } catch (err) {
    console.error('Erreur /api/release :', err);
    res.status(500).json({ error: err.data || err.message || 'Erreur serveur.' });
  }
});

app.get('/api/transaction/:reference', async (req, res) => {
  if (!PAYMENT_API_KEY) {
    return res.status(500).json({ error: 'PAYMENT_API_KEY non configurée sur le serveur.' });
  }
  try {
    const result = await getAdapter().checkStatus(req.params.reference);
    res.json(result);
  } catch (err) {
    console.error('Erreur /api/transaction :', err);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur ColisSûr démarré sur le port ${PORT} — agrégateur actif : ${PAYMENT_PROVIDER}`);
});
