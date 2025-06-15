// ↓↓↓↓ このコードをまるごとコピー＆ペーストしてください ↓↓↓↓

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv"; 

// --- ここから設定 ---

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-session-id",
};

// 新しい会話が始まったときの「初期データ」のテンプレート
const initialMasterPlan = {
  "agenda": {
    "1_purpose": {
      "title": "全体像・目的", "status": "pending",
      "items": { "background": { "label": "業務概要・背景", "status": "pending", "content": "" }, "goal": { "label": "目的・目標", "status": "pending", "content": "" }, "scope": { "label": "範囲", "status": "pending", "content": "" } }
    },
    "2_functional": {
      "title": "機能要件", "status": "pending",
      "items": { "feature_list": { "label": "機能一覧", "status": "pending", "content": [] }, "screen_req": { "label": "画面要件", "status": "pending", "content": "" } }
    },
    "3_non_functional": {
        "title": "非機能要件", "status": "pending",
        "items": { "usability": { "label": "ユーザビリティ", "status": "pending", "content": "" } }
    }
  }
};

// --- ここまで設定 ---

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    let masterPlan = await kv.get(sessionId);
    if (!masterPlan) {
        masterPlan = JSON.parse(JSON.stringify(initialMasterPlan));
    }

    const body = await request.json();
    const { history, newMessage, clientInfo = { type: 'startup', goal: '新規事業開発' } } = body;
    
    // ★変更点：プロンプトを1つに統合し、AIの役割を強化
    const prompt = `
# 指示書: 超有能AI秘書「AIDA」
## あなたの役割
あなたは、クライアントとの対話を通じて、要件定義書（マスタープラン）を完成させる超有能なAI秘書です。あなたは「自然な会話」と「厳密なデータ更新」を同時に行います。

## 行動原則
1.  **対話と質問:** 常に相手のアイデアを肯定し、創造性を引き出す、具体的でポジティブな質問を一つだけ返してください。専門用語は避け、平易な言葉で対話をリードしてください。
2.  **マスタープランの更新:** これまでの会話と新しいメッセージを分析し、マスタープランのどの項目を更新すべきか判断してください。該当する箇所の 'content' を更新し、'status' を 'completed' に変更してください。
3.  **厳密な出力:** あなたの応答は、必ず以下のJSON形式に従ってください。他のテキストは一切含めないでください。

## 入力情報
【クライアント情報】: ${JSON.stringify(clientInfo)}
【これまでの会話履歴】: ${JSON.stringify(history)}
【新しいメッセージ】: ${newMessage}
【現在のマスタープラン】: ${JSON.stringify(masterPlan)}

## 出力形式 (JSON)
{
  "reply": "クライアントへの自然な返信メッセージ（次の質問を含む）",
  "updatedMasterPlan": {
    // 上記の入力情報を踏まえて、内容を更新したマスタープランのオブジェクト全体
  }
}
`;

    // ★変更点：AIの呼び出しを1回に集約
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a helpful assistant designed to output JSON." },
        { role: "user", content: prompt }
      ],
    });

    const responseData = JSON.parse(response.choices[0].message.content);
    
    const conversationalReply = responseData.reply;
    const updatedMasterPlan = responseData.updatedMasterPlan;

    // 更新されたプランが存在する場合のみ、KVに保存
    if (updatedMasterPlan) {
      await kv.set(sessionId, updatedMasterPlan, { ex: 86400 });
      masterPlan = updatedMasterPlan;
    }
    
    return NextResponse.json(
      { 
        reply: conversationalReply,
        updatedAgenda: masterPlan.agenda // フロントにはagenda部分だけを返す
      }, 
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}