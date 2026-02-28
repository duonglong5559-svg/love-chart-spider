import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impact: 'high' | 'medium' | 'low';
  summary: string;
  relatedAssets: string[];
}

interface OverallSentiment {
  label: string;
  score: number;
  analysis: string;
}

interface NewsData {
  news: NewsItem[];
  overallSentiment: OverallSentiment;
}

interface Props {
  symbol: string;
  currentPrice?: number;
  trend?: string;
}

const NEWS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-news`;

export default function NewsPanel({ symbol, currentPrice, trend }: Props) {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState('');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(NEWS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          symbol,
          currentPrice,
          trend,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data: NewsData = await resp.json();
      setNewsData(data);
      setLastFetched(new Date().toLocaleTimeString('vi-VN'));
    } catch (e: any) {
      toast.error(e.message || 'Lỗi tải tin tức');
    } finally {
      setLoading(false);
    }
  }, [symbol, currentPrice, trend]);

  // Auto-fetch on mount and every 5 min
  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, [symbol]);

  const SentimentIcon = ({ sentiment }: { sentiment: string }) => {
    if (sentiment === 'positive') return <TrendingUp className="w-3.5 h-3.5 text-bull" />;
    if (sentiment === 'negative') return <TrendingDown className="w-3.5 h-3.5 text-bear" />;
    return <Minus className="w-3.5 h-3.5 text-pivot" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tin tức thị trường</h3>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-[10px] text-muted-foreground font-mono">{lastFetched}</span>
          )}
          <button onClick={fetchNews} disabled={loading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !newsData && (
        <div className="text-center py-6 bg-card rounded-lg border border-border">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Đang tải tin tức...</p>
        </div>
      )}

      {newsData && (
        <>
          {/* Overall Sentiment */}
          <div className={`rounded-lg border p-3 ${
            newsData.overallSentiment.score >= 60 ? 'border-bull/30 bg-bull-muted/20' :
            newsData.overallSentiment.score <= 40 ? 'border-bear/30 bg-bear-muted/20' :
            'border-border bg-card'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-primary">PHÂN TÍCH CẢM XÚC</span>
              <span className={`text-xs font-bold ${
                newsData.overallSentiment.score >= 60 ? 'text-bull' :
                newsData.overallSentiment.score <= 40 ? 'text-bear' : 'text-pivot'
              }`}>
                {newsData.overallSentiment.label} ({newsData.overallSentiment.score}%)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{newsData.overallSentiment.analysis}</p>
          </div>

          {/* News Items */}
          <div className="space-y-2">
            {newsData.news.map((item, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-2">
                  <SentimentIcon sentiment={item.sentiment} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight mb-1">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mb-1.5">{item.summary}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] text-primary font-mono">{item.source}</span>
                      <span className="text-[9px] text-muted-foreground">{item.time}</span>
                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                        item.impact === 'high' ? 'bg-bear/20 text-bear' :
                        item.impact === 'medium' ? 'bg-pivot/20 text-pivot' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {item.impact === 'high' ? '⚡ Cao' : item.impact === 'medium' ? '📊 TB' : '📋 Thấp'}
                      </span>
                      {item.relatedAssets?.map((asset, ai) => (
                        <span key={ai} className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-mono">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !newsData && (
        <div className="text-center py-6 bg-card rounded-lg border border-border">
          <AlertCircle className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Không có tin tức</p>
        </div>
      )}
    </div>
  );
}
