import { pipeline } from '@xenova/transformers';

const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

// The pipeline is expensive to create (first run also downloads the ~30 MB
// model), but cheap to reuse, so we lazily create it exactly once per process.
let classifierPromise = null;

function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = pipeline('sentiment-analysis', MODEL_ID, { quantized: true });
    // If loading fails (e.g. offline on first run), clear the cached promise
    // so the next request retries instead of failing forever.
    classifierPromise.catch(() => {
      classifierPromise = null;
    });
  }
  return classifierPromise;
}

function toSentiment(result) {
  return {
    label: result.label, // 'POSITIVE' | 'NEGATIVE'
    score: Number(result.score.toFixed(4)),
    isPositive: result.label === 'POSITIVE',
  };
}

export async function analyzeSentiment(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('analyzeSentiment(text): "text" must be a non-empty string');
  }
  const classifier = await getClassifier();
  const [result] = await classifier(text.trim());
  return toSentiment(result);
}

export async function analyzeSentimentBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('analyzeSentimentBatch(texts): "texts" must be a non-empty array of strings');
  }
  const classifier = await getClassifier();
  const results = await classifier(texts.map((t) => String(t).trim()));
  return results.map(toSentiment);
}
