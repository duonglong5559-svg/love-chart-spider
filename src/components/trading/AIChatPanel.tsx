import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import type { Candle, PivotLevels, CandlePattern } from '@/lib/tradingData';

interface AIChatPanelProps {
  candles: Candle[];
  pivots: PivotLevels | null;
  patterns: CandlePattern[];
  rsiValue?: number;
  macdValue?: number;
  symbol: string;
  timeframe: string;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const QUICK_PROMPTS = [
  { label: '📊 Phân tích tổng quan', msg: 'Phân tích tổng quan thị trường hiện tại, xu hướng và điểm vào lệnh tiềm năng.' },
  { label: '🎯 Entry ngay', msg: 'Cho tôi điểm entry cụ thể với TP và SL cho lệnh tiếp theo.' },
  { label: '⚠️ Rủi ro', msg: 'Đánh giá mức độ rủi ro hiện tại và các vùng giá cần tránh.' },
  { label: '📈 Scalp', msg: 'Gợi ý setup scalp ngắn hạn dựa trên dữ liệu hiện tại.' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-ai`;

export default function AIChatPanel({ candles, pivots, patterns, rsiValue, macdValue, symbol, timeframe }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    if (!candles.length) return '';
    const last = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : last;
    const change = ((last.close - prev.close) / prev.close * 100).toFixed(2);
    const lines = [
      `Symbol: ${symbol} | Timeframe: ${timeframe}`,
      `Giá hiện tại: ${last.close.toLocaleString()} | Thay đổi: ${change}%`,
      `O: ${last.open} | H: ${last.high} | L: ${last.low} | V: ${last.volume.toLocaleString()}`,
    ];
    if (pivots) {
      lines.push(`Pivot: PP=${pivots.pp.toFixed(2)} R1=${pivots.r1.toFixed(2)} R2=${pivots.r2.toFixed(2)} S1=${pivots.s1.toFixed(2)} S2=${pivots.s2.toFixed(2)}`);
    }
    if (rsiValue !== undefined) lines.push(`RSI: ${rsiValue.toFixed(1)}`);
    if (macdValue !== undefined) lines.push(`MACD Histogram: ${macdValue.toFixed(2)}`);
    if (patterns.length > 0) {
      lines.push(`Patterns: ${patterns.map(p => `${p.nameVi} (${p.type})`).join(', ')}`);
    }
    return lines.join('\n');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          tradingContext: buildContext(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Lỗi kết nối' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Lỗi: ${e.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[55vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Spider AI</h3>
            <p className="text-[10px] text-muted-foreground">Phân tích kỹ thuật tự động</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Xóa chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground mb-4">
              Hỏi Spider AI về phân tích kỹ thuật, entry, TP/SL...
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.msg)}
                  className="text-left p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs text-foreground transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary/20 text-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-2 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Hỏi về phân tích kỹ thuật..."
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
