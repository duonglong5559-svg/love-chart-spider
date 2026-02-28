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
    const { symbol, currentPrice, trend } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const symbolName = symbol?.replace('USDT', '') || 'BTC';
    const now = new Date().toISOString();

    const systemPrompt = `Bạn là Spider AI News - hệ thống phân tích tin tức thị trường crypto và vàng.
Trả về ĐÚNG format JSON sau, KHÔNG kèm markdown:
{
  "news": [
    {
      "title": "Tiêu đề tin tức",
      "source": "Tên nguồn (VD: CoinDesk, Bloomberg, Reuters)",
      "time": "Thời gian tương đối (VD: 2 giờ trước)",
      "sentiment": "positive" | "negative" | "neutral",
      "sentimentScore": 0-100,
      "impact": "high" | "medium" | "low",
      "summary": "Tóm tắt 1-2 câu",
      "relatedAssets": ["BTC", "ETH"]
    }
  ],
  "overallSentiment": {
    "label": "Tích cực" | "Tiêu cực" | "Trung tính",
    "score": 0-100,
    "analysis": "Phân tích tổng quan sentiment thị trường 1-2 câu"
  }
}

Tạo 5-8 tin tức THỰC TẾ và HỢP LÝ dựa trên kiến thức của bạn về thị trường ${symbolName}. 
Tin phải phản ánh đúng tình hình thị trường hiện tại (${trend || 'chưa xác định'}).
Thời gian: ${now}
Giá hiện tại: ${currentPrice || 'N/A'}`;

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
            { role: "user", content: `Tạo tin tức mới nhất về ${symbolName} và thị trường crypto/vàng. Giá hiện tại: ${currentPrice}. Xu hướng: ${trend || 'chưa rõ'}. Trả về JSON.` },
          ],
          temperature: 0.6,
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
      console.error("Failed to parse news response:", content);
      return new Response(JSON.stringify({ error: "AI response format error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
