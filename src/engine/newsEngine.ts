import type { NewsItem } from './types';

/**
 * News Sentiment Engine
 *
 * Provides context from news headlines.
 * This is a supplementary filter, not a primary signal source.
 *
 * Pipeline:
 *   1. Fetch articles (from RSS/API)
 *   2. Tag related assets
 *   3. Score sentiment
 *   4. Cache results
 */

const NEWS_CACHE: Map<string, { items: NewsItem[]; fetchedAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const ASSET_KEYWORDS: Record<string, string[]> = {
  BTC: ['bitcoin', 'btc', 'Bitcoin'],
  ETH: ['ethereum', 'eth', 'Ethereum'],
  XRP: ['ripple', 'xrp', 'Ripple'],
  SOL: ['solana', 'sol', 'Solana'],
  BNB: ['binance', 'bnb', 'BNB'],
  DOGE: ['doge', 'dogecoin', 'DOGE'],
  XAU: ['gold', 'vàng', 'xau', 'Gold'],
};

const POSITIVE_WORDS = [
  'surge', 'rally', 'bullish', 'gain', 'rise', 'up', 'boost', 'breakout',
  'tăng', 'bùng nổ', 'phục hồi', 'đột phá', 'lạc quan',
];

const NEGATIVE_WORDS = [
  'crash', 'plunge', 'bearish', 'drop', 'fall', 'down', 'dump', 'sell',
  'giảm', 'sụp đổ', 'bán tháo', 'lo ngại', 'rủi ro', 'suy giảm',
];

export function tagAssets(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  for (const [asset, keywords] of Object.entries(ASSET_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      tags.push(asset);
    }
  }

  return tags;
}

export function scoreSentiment(text: string): { sentiment: 'positive' | 'neutral' | 'negative'; score: number } {
  const lower = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) positiveCount++;
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return { sentiment: 'neutral', score: 50 };

  const score = Math.round((positiveCount / total) * 100);
  const sentiment = score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral';

  return { sentiment, score };
}

export function getNewsSentimentBias(items: NewsItem[], asset: string): { longBias: number; shortBias: number } {
  const relevant = items.filter(n => n.relatedAssets.includes(asset));
  if (relevant.length === 0) return { longBias: 0, shortBias: 0 };

  let totalPositive = 0;
  let totalNegative = 0;

  for (const item of relevant) {
    if (item.sentiment === 'positive') totalPositive += item.sentimentScore / 100;
    else if (item.sentiment === 'negative') totalNegative += (100 - item.sentimentScore) / 100;
  }

  const max = Math.max(totalPositive, totalNegative, 1);
  return {
    longBias: Math.round((totalPositive / max) * 5),
    shortBias: Math.round((totalNegative / max) * 5),
  };
}

export function createNewsItem(
  title: string,
  description: string,
  source: string,
  publishedAt: number
): NewsItem {
  const fullText = `${title} ${description}`;
  const { sentiment, score } = scoreSentiment(fullText);
  const assets = tagAssets(fullText);

  return {
    id: `${publishedAt}-${title.slice(0, 20)}`,
    title,
    description,
    source,
    publishedAt,
    relatedAssets: assets,
    sentiment,
    sentimentScore: score,
    impactScore: Math.min(100, assets.length * 30 + score * 0.5),
  };
}
