import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// ▼▼▼【重要】ここにあなたのGemini APIキーを再度貼り付けてください▼▼▼
const GEMINI_API_KEY = "AIzaSyBZi0IoquwfGPgKayuf7oMXtE6jWNGiDQc";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// CORS許可証の設定 (変更なし)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// サーバーのメモリ上に「マスタープラン」を保持
let masterPlan = {
  // (マスタープランの構造は前回と同じ)
  "projectId": `project_${Date.now()}`,
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


// OPTIONSリクエストへの対応 (変更なし)
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}


export async function POST(request) {
  try {
    const body = await request.json();
    // history, newMessageに加え、UIからクライアント情報を受け取る（将来的な拡張）
    const { history, newMessage, clientInfo = { type: 'startup', goal: '新規事業開発' } } = body;
    
    // --- 【処理A】対話AIへの指示 (プロンプトv3.0適用) ---
    const conversationalPrompt = `
# 指示書: AIビジネスコンサルタント「AIDA」
## あなたの役割
あなたは、クライアントのビジネスを成功に導く、超一流のAIビジネスコンサルタント「AIDA」です。
## あなたの行動原則
1. ペルソナの適応: 以下の【クライアント情報】を深く理解し、あなたのペルソナと口調を最適化してください。
   - startup の場合: 親しみやすく、伴走するパートナーのように。
   - enterprise の場合: 礼儀正しく、信頼できる専門家として。
2. 対話のリード: 常に相手のアイデアを肯定し、創造性を引き出す、具体的でポジティブな質問を一つだけ返してください。専門用語は避け、平易な言葉で対話をリードしてください。
3. 効率性: 冗長な挨拶や前置きは不要です。常に本質的な対話に集中してください。
## 入力情報
【クライアント情報】
- タイプ: ${clientInfo.type}
- プロジェクトのゴール: ${clientInfo.goal}
【会話履歴】
${history.map(h => `${h.role}: ${h.content}`).join('\n')}
user: ${newMessage}
`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const conversationalResult = await model.generateContent(conversationalPrompt);
    const conversationalReply = await conversationalResult.response.text();

    // --- 【処理B】構造化AIへの指示 (プロンプトv3.0適用) ---
    const structuringPrompt = `
# 指示書: 要件定義構造化AI
## あなたの役割
あなたは、自然言語での対話を分析し、構造化されたJSONデータに変換するエキスパートです。あなたの仕事は、システムのマスタープランを正確に更新することです。
## あなたの行動原則
1. 分析と特定: 以下の【会話履歴】と【マスタープラン】を分析し、会話内容がマスタープランのどの項目に該当するかを特定してください。
2. 厳密な出力: 必ず、以下の【出力形式】に従って、JSONオブジェクトのみを回答してください。他のテキストは一切含めないでください。
## 入力情報
【会話履歴】
- user: ${newMessage}
【マスタープランの現状】
${JSON.stringify(masterPlan, null, 2)}
## 出力形式 (JSON)
{
  "thought_process": "なぜ、どの項目を更新すると判断したのか、その論理的な思考プロセスを簡潔に記述する。これは開発者のためのデバッグ情報である。",
  "confidence": "今回の判断に対する確信度を High, Medium, Low のいずれかで示す。",
  "updates": [ { "target_item": "更新対象のキーパス（例: 'agenda.1_purpose.items.scope'）", "update_action": "'REPLACE' または 'APPEND'", "updated_content": "抽出・要約した内容" } ],
  "clarification_question": "もし confidence が Low の場合、AIDAが話すべき具体的な質問文を生成する。それ以外は null。"
}
## 例外処理
- 更新すべき項目が見つからない場合は、updatesを空の配列 [] とし、thought_processにその理由を記載してください。
`;

    // 構造化AIの呼び出しとマスタープランの更新
    const structuringResult = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(structuringPrompt);
    const textResponse = structuringResult.response.text();
    
    // AIの応答がJSON形式の場合のみ、マスタープランを更新
    if (textResponse.trim().startsWith('{')) {
        const structuredData = JSON.parse(textResponse);
        console.log("Structuring AI thought:", structuredData.thought_process); // デバッグ用に思考プロセスをログ出力

        if (structuredData.updates && structuredData.updates.length > 0) {
            structuredData.updates.forEach(update => {
                const { target_item, update_action, updated_content } = update;
                const keys = target_item.split('.');
                let current = masterPlan;
                for (let i = 0; i < keys.length - 1; i++) {
                    current = current[keys[i]];
                }
                const finalKey = keys[keys.length - 1];
                if (update_action === 'APPEND' && Array.isArray(current[finalKey].content)) {
                    current[finalKey].content.push(updated_content);
                } else {
                    current[finalKey].content = updated_content;
                }
                current[finalKey].status = "completed";
            });
             console.log("Master Plan Updated!");
        }
    }

    // --- 最終的な応答をUIに返す ---
    return NextResponse.json(
      { 
        reply: conversationalReply,
        updatedAgenda: masterPlan.agenda // 更新されたマスタープランをUIに送る
      }, 
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers: corsHeaders });
  }
}
