import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candles, symbol, timeframe, pivots, rsi, macd, patterns, sentiment, previousAnalysis, multiTFData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pre-compute technical context for consistency
    const candleData = candles.slice(-50);
    const currentPrice = candleData[candleData.length - 1].close;
    const prevClose = candleData[candleData.length - 2]?.close || currentPrice;
    
    // Volume analysis
    const volumes = candleData.map((c: any) => c.volume);
    const avgVol = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
    const recentVol = volumes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
    const volRatio = (recentVol / avgVol).toFixed(2);
    
    // Trend structure via higher highs/lows
    const closes = candleData.map((c: any) => c.close);
    const highs = candleData.map((c: any) => c.high);
    const lows = candleData.map((c: any) => c.low);
    
    // Simple swing detection
    const swingHighs: number[] = [];
    const swingLows: number[] = [];
    for (let i = 2; i < candleData.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        swingHighs.push(highs[i]);
      }
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        swingLows.push(lows[i]);
      }
    }
    
    // Determine structural trend
    let structuralTrend = "SIDEWAYS";
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const hhCount = swingHighs.slice(-3).filter((h, i) => i > 0 && h > swingHighs[swingHighs.length - 3 + i - 1]).length;
      const hlCount = swingLows.slice(-3).filter((l, i) => i > 0 && l > swingLows[swingLows.length - 3 + i - 1]).length;
      const lhCount = swingHighs.slice(-3).filter((h, i) => i > 0 && h < swingHighs[swingHighs.length - 3 + i - 1]).length;
      const llCount = swingLows.slice(-3).filter((l, i) => i > 0 && l < swingLows[swingLows.length - 3 + i - 1]).length;
      
      if (hhCount >= 1 && hlCount >= 1) structuralTrend = "UPTREND";
      else if (lhCount >= 1 && llCount >= 1) structuralTrend = "DOWNTREND";
    }
    
    // ATR calculation
    const atrPeriod = Math.min(14, candleData.length - 1);
    let atrSum = 0;
    for (let i = candleData.length - atrPeriod; i < candleData.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i-1]),
        Math.abs(lows[i] - closes[i-1])
      );
      atrSum += tr;
    }
    const atr = (atrSum / atrPeriod).toFixed(2);
    
    // Wyckoff phase detection hints
    const priceRange = Math.max(...highs.slice(-20)) - Math.min(...lows.slice(-20));
    const recentRange = Math.max(...highs.slice(-5)) - Math.min(...lows.slice(-5));
    const rangeContraction = recentRange / priceRange;
    
    let wyckoffHint = "UNKNOWN";
    if (rangeContraction < 0.3 && parseFloat(volRatio) < 0.8) {
      wyckoffHint = "ACCUMULATION (range contracting, vol declining)";
    } else if (rangeContraction < 0.3 && parseFloat(volRatio) > 1.2) {
      wyckoffHint = "DISTRIBUTION (range contracting, vol increasing)";
    } else if (structuralTrend === "UPTREND" && parseFloat(volRatio) > 1.0) {
      wyckoffHint = "MARKUP (trending up with volume)";
    } else if (structuralTrend === "DOWNTREND" && parseFloat(volRatio) > 1.0) {
      wyckoffHint = "MARKDOWN (trending down with volume)";
    }

    const systemPrompt = `Bạn là Spider AI - hệ thống phân tích kỹ thuật CHUYÊN NGHIỆP cấp institutional.

NGUYÊN TẮC PHÂN TÍCH NHẤT QUÁN (QUAN TRỌNG NHẤT):
Bạn PHẢI phân tích dựa trên CẤU TRÚC THỊ TRƯỜNG KHÁCH QUAN, không phải cảm tính.
Mỗi kết luận PHẢI dựa trên dữ liệu cụ thể được cung cấp.

FRAMEWORK PHÂN TÍCH (theo thứ tự ưu tiên):

1. WYCKOFF METHOD:
   - Xác định phase: Accumulation → Markup → Distribution → Markdown
   - Spring/Upthrust: Giá phá vỡ giả S/R rồi quay lại = tín hiệu mạnh
   - Volume phải xác nhận: Markup cần vol tăng, Distribution có vol cao nhưng giá không đi
   - Composite Man: Cá voi tích lũy (vol thấp range hẹp) hoặc phân phối (vol cao range hẹp)

2. MARKET STRUCTURE (Higher Timeframe):
   - Higher Highs + Higher Lows = Uptrend
   - Lower Highs + Lower Lows = Downtrend  
   - Break of Structure (BOS): Khi giá phá swing high/low trước đó
   - Change of Character (CHoCH): Dấu hiệu đảo chiều cấu trúc

3. VOLUME ANALYSIS:
   - Vol Ratio > 1.5 = bất thường, có thể là cá voi
   - Vol giảm trong trend = trend yếu đi
   - Vol spike tại S/R = rejection hoặc breakout
   - Divergence giữa price và volume = cảnh báo đảo chiều

4. PRICE ACTION + CONFLUENCE:
   - Entry CHỈ khi giá ở vùng S/R đã test ≥2 lần
   - Cần ≥3 yếu tố đồng thuận: Structure + Volume + Indicator + Pattern
   - RSI/MACD chỉ là xác nhận, KHÔNG phải trigger chính

5. RISK MANAGEMENT:
   - SL đặt sau swing high/low gần nhất + buffer (0.3-0.5 ATR)
   - TP1 = S/R gần nhất, TP2 = S/R tiếp theo, TP3 = measured move
   - RR tối thiểu 1:2

QUY TẮC ENTRY NGHIÊM NGẶT:
- LONG: Giá tại vùng hỗ trợ đã test + Volume tăng + RSI < 40 + Bullish pattern/divergence + Wyckoff Spring
- SHORT: Giá tại vùng kháng cự đã test + Volume tăng + RSI > 60 + Bearish pattern/divergence + Wyckoff Upthrust  
- Sideways/Unclear → entries = [] (KHÔNG đoán)
- Win rate PHẢI ≥ 90% với ≥ 3 confluence

${previousAnalysis ? `
PHÂN TÍCH TRƯỚC ĐÓ (dùng làm tham chiếu - GIỮ NGUYÊN entry nếu cấu trúc chưa thay đổi):
- Trend: ${previousAnalysis.trend}
- Entries: ${previousAnalysis.entries?.length || 0} tín hiệu
- Market Structure: ${previousAnalysis.marketStructure?.phase || 'N/A'}
- Bias: ${previousAnalysis.marketStructure?.bias || 'N/A'}
CHỈ thay đổi kết luận khi có BẰNG CHỨNG RÕ RÀNG từ dữ liệu mới (BOS, CHoCH, Volume spike, Pattern mới).
Nếu cấu trúc giống phân tích trước → GIỮ NGUYÊN entries và levels.
` : ''}

PHẢI trả về ĐÚNG format JSON sau, KHÔNG kèm markdown hay text nào khác:
{
  "trend": "UPTREND" | "DOWNTREND" | "SIDEWAYS",
  "trendStrength": 1-10,
  "summary": "Nhận định 2-3 câu DỰA TRÊN cấu trúc Wyckoff và volume",
  "entries": [
    {
      "type": "LONG" | "SHORT",
      "entry": number,
      "tp1": number,
      "tp2": number,
      "tp3": number,
      "sl": number,
      "rr": "1:X.X",
      "winRate": 90-99,
      "confidence": 90-99,
      "reason": "Lý do dựa trên Wyckoff + Structure + Volume",
      "strategy": "SCALP" | "SWING",
      "confluences": ["Wyckoff Spring/Upthrust", "BOS/CHoCH", "Volume confirm", "RSI divergence", ...]
    }
  ],
  "validatedLevels": [
    {
      "price": number,
      "type": "resistance" | "support",
      "strength": "Rất mạnh" | "Mạnh" | "Trung bình",
      "testCount": number,
      "note": "Lý do level quan trọng",
      "validated": true
    }
  ],
  "aiTrendLines": [
    {
      "startPrice": number,
      "endPrice": number,
      "startIndex": number,
      "endIndex": number,
      "type": "support" | "resistance" | "channel",
      "label": "Tên đường trend"
    }
  ],
  "marketStructure": {
    "phase": "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN",
    "keyZone": "Vùng giá quan trọng nhất",
    "bias": "LONG" | "SHORT" | "NEUTRAL"
  },
  "riskWarning": "Cảnh báo rủi ro",
  "marketInsights": {
    "liquidityZones": [
      { "price": number, "type": "high_liquidity" | "liquidity_void", "note": "Mô tả" }
    ],
    "whaleActivity": {
      "status": "accumulating" | "distributing" | "inactive",
      "description": "Nhận định cá voi DỰA TRÊN volume profile và price action cụ thể",
      "signals": ["Tín hiệu cụ thể"]
    },
    "fundingRate": {
      "bias": "positive" | "negative" | "neutral",
      "description": "Nhận định"
    },
    "openInterest": {
      "trend": "increasing" | "decreasing" | "stable",
      "description": "Nhận định"
    },
    "orderFlow": {
      "dominance": "buyers" | "sellers" | "balanced",
      "description": "Phân tích dòng lệnh từ volume và candle body"
    },
    "volatility": {
      "level": "low" | "medium" | "high" | "extreme",
      "atr": "${atr}",
      "description": "Nhận định biến động"
    }
  }
}`;

    // Multi-timeframe context
    let multiTFContext = '';
    if (multiTFData && multiTFData.timeframes && multiTFData.timeframes.length > 0) {
      multiTFContext = `\n=== ĐA KHUNG THỜI GIAN (HIGHER TIMEFRAMES) ===
HTF BIAS: ${multiTFData.overallBias} (Confluence: ${multiTFData.confluenceScore}%)
${multiTFData.timeframes.map((tf: any) => 
  `${tf.timeframe}: Trend=${tf.trend} | RSI=${tf.rsi?.toFixed(1)} | MACD=${tf.macdHistogram?.toFixed(2)} | EMA9=${tf.ema9?.toFixed(2)} > EMA21=${tf.ema21?.toFixed(2)} | Bull=${tf.bullPct}% | Patterns: ${tf.patterns?.join(', ') || 'None'}`
).join('\n')}
QUY TẮC: Khung lớn xác định xu hướng chính, khung nhỏ tìm điểm vào. KHÔNG vào lệnh ngược HTF trừ khi có CHoCH rõ ràng.
`;
    }

    const userContent = `SYMBOL: ${symbol} | TIMEFRAME: ${timeframe} | CANDLE_COUNT: ${candleData.length}

=== PRE-COMPUTED TECHNICAL CONTEXT ===
STRUCTURAL TREND: ${structuralTrend}
SWING HIGHS: ${swingHighs.map(h => h.toFixed(2)).join(', ') || 'N/A'}
SWING LOWS: ${swingLows.map(l => l.toFixed(2)).join(', ') || 'N/A'}
ATR(14): ${atr}
VOLUME RATIO (recent/avg): ${volRatio}x
AVG VOLUME: ${Math.round(avgVol)}
WYCKOFF HINT: ${wyckoffHint}
RANGE CONTRACTION: ${(rangeContraction * 100).toFixed(1)}%
${multiTFContext}
=== RAW CANDLE DATA (index 0 = oldest) ===
${candleData.map((c: any, i: number) => 
  `[${i}] ${c.time} | O:${c.open} H:${c.high} L:${c.low} C:${c.close} V:${Math.round(c.volume)}`
).join('\n')}

=== INDICATORS ===
PIVOT: PP=${pivots.pp} | R1=${pivots.r1} R2=${pivots.r2} R3=${pivots.r3} | S1=${pivots.s1} S2=${pivots.s2} S3=${pivots.s3}
CURRENT PRICE: ${currentPrice}
RSI(14): ${rsi}
MACD Histogram: ${macd}
SENTIMENT: Bull ${sentiment.bullPct}% / Bear ${sentiment.bearPct}%
PATTERNS: ${patterns.length > 0 ? patterns.map((p: any) => `${p.nameVi}(${p.type}) tại index ${p.index}`).join(', ') : 'Không có'}

Phân tích theo framework Wyckoff + Structure + Volume + Multi-TF. GIỮ NHẤT QUÁN với cấu trúc thị trường.
Ưu tiên: HTF trend → Current TF structure → Volume confirmation → Pattern + Indicator confluence.
CHỈ đưa entry khi có ≥ 3 confluence rõ ràng VÀ HTF đồng thuận. Nếu không → entries = [].
Trả về JSON.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.1, // Lower for more deterministic output
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credit AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "AI response format error", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: only entries with winRate >= 90
    if (parsed.entries) {
      parsed.entries = parsed.entries.filter((e: any) => (e.winRate || e.confidence || 0) >= 90);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-market error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
