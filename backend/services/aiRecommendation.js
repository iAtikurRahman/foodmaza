import { pipeline } from '@xenova/transformers';

// Sentence-embedding model (384-dim vectors), purpose-built for text similarity.
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise = null;

// Singleton pipeline — loading a model takes seconds, never do it per request.
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID, { quantized: true });
  }
  return extractorPromise;
}

// "Chicken Biryani. Main Course. Fragrant basmati rice..." -> one embeddable string
function describe(item) {
  return [item.name, item.category, item.description].filter(Boolean).join('. ');
}

// Mean-pools + L2-normalizes token embeddings into ONE vector per text.
async function embed(text, extractor) {
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * "Suggested for You" — recommend menu items the customer has NOT ordered yet.
 *
 * 1. Embed every previously ordered dish (name + category + description).
 * 2. Average those vectors into one quantity-weighted "taste profile".
 * 3. Embed each unseen, available menu item.
 * 4. Rank candidates by cosine similarity to the profile and return top K.
 *
 * @param {{ menuItemId: string, quantity: number, menuItem: object }[]} historyItems
 * @param {object[]} menuItems - full available menu
 * @param {number} topK
 * @returns {Promise<{ item: object, similarity: number }[]>}
 */
export async function recommendFromHistory(historyItems, menuItems, topK = 3) {
  const extractor = await getExtractor();

  const orderedIds = new Set(historyItems.map((h) => h.menuItemId));
  const candidates = menuItems.filter((m) => !orderedIds.has(m.id));
  if (candidates.length === 0) return [];

  const historyVectors = await Promise.all(
    historyItems.map((h) => embed(describe(h.menuItem), extractor))
  );

  // Quantity-weighted mean = the customer's taste profile vector
  const weights = historyItems.map((h) => h.quantity ?? 1);
  const weightSum = weights.reduce((s, w) => s + w, 0) || 1;
  const dim = historyVectors[0].length;
  const profile = new Array(dim).fill(0);
  historyVectors.forEach((vec, i) => {
    for (let d = 0; d < dim; d++) profile[d] += vec[d] * weights[i];
  });
  for (let d = 0; d < dim; d++) profile[d] /= weightSum;

  const candidateVectors = await Promise.all(
    candidates.map((m) => embed(describe(m), extractor))
  );

  return candidates
    .map((item, i) => ({ item, similarity: cosineSimilarity(profile, candidateVectors[i]) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
