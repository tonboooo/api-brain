import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// ▼▼▼【重要】ここにあなたのGemini APIキーを再度貼り付けてください▼▼▼
const GEMINI_API_KEY = "AIzaSyBZi0IoquwfGPgKayuf7oMXtE6jWNGiDQc"; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// CORS許可証の設定
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// サーバーのメモリ上に「マスタープラン」を保持します。
// (注意: サーバーが再起動するとリセットされます。永続化にはDBが必要です)
let masterPlan = {
  "projectId": `project_${Date.now()}`,
  "overall_status": "in_progress",
  "agenda": {
    "1_purpose": {
      "title": "全体像・目的", "status": "pending",
      "items": {
        "background": { "label": "業務概要・背景", "status": "pending", "content": "" },
        "goal": { "label": "システム化の目的・目標", "status": "pending", "content": "" },
        "scope": { "label": "システム化の範囲", "status": "pending", "content": "" }
      }
    },
    "2_functional": {
      "title": "機能要件", "status": "pending",
      "items": {
        "feature_list": { "label": "機能一覧", "status": "pending", "content": [] },
        "screen_req": { "label": "画面要件", "status": "pending", "content": "" },
        "data_req": { "label": "データ要件", "status": "pending", "content": "" }
      }
    },
    "3_non_functional": {
        "title": "非機能要件", "status": "pending",
        "items": {
            "usability": { "label": "ユーザビリティ", "status": "pending", "content": "" },
            "security": { "label": "セキュリティ要件", "status": "pending", "content": "" }
        }
    }
  }
};

// OPTIONSリクエストへの対応
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { history, newMessage } = body;

    // --- 【処理A】ユーザーへの自然な応答を生成 ---
    const conversationalPrompt = `あなたは親しみやすいAIアシスタント「AIDA」です。以下の会話の文脈を踏まえ、自然でポジティブな応答をしてください。簡潔にお願いします。\n\n会話履歴:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}\nuser: ${newMessage}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const conversationalResult = await model.generateContent(conversationalPrompt);
    const conversationalReply = await conversationalResult.response.text();

    // --- 【処理B】裏側で会話を分析し、マスタープランを更新 ---
    const structuringPrompt = `あなたは情報を構造化する専門家です。以下の【会話履歴】と【マスタープラン】を分析し、会話内容に最も合致する【マスタープラン】の項目を1つだけ特定し、その項目の'content'を更新するためのJSONオブジェクト（{ "target_item": "...", "updated_content": "..." }）を返してください。該当する項目がなければ "no_update" と返してください。\n\n【会話履歴】:\n- user: ${newMessage}\n\n【マスタープラン】:\n${JSON.stringify(masterPlan.agenda, null, 2)}`;

    // 構造化のためのAI呼び出し
    const structuringResult = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(structuringPrompt);
    const textResponse = structuringResult.response.text();

    if (textResponse.trim().startsWith('{')) {
        const structuredData = JSON.parse(textResponse);
        const { target_item, updated_content } = structuredData; 

        const keys = target_item.split('.');
        let current = masterPlan.agenda;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        if(Array.isArray(current[keys[keys.length - 1]].content)) {
            current[keys[keys.length - 1]].content.push(updated_content);
        } else {
            current[keys[keys.length - 1]].content = updated_content;
        }
        current[keys[keys.length - 1]].status = "completed";
        console.log("Master Plan Updated:", masterPlan.agenda);
    }

    // --- 最終的な応答をUIに返す ---
    return NextResponse.json(
      { 
        reply: conversationalReply,
        updatedAgenda: masterPlan.agenda 
      }, 
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers: corsHeaders });
  }
}

