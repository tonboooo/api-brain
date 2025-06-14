import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBZi0IoquwfGPgKayuf7oMXtE6jWNGiDQc"; // 環境変数がない場合は直接キーを使用

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// CORS許可証の設定
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // すべてのオリジンを許可（開発用に簡易設定）
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// OPTIONSリクエストへの対応（プリフライトリクエスト）
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}


export async function POST(request) {
  try {
    const body = await request.json();
    const { history, newMessage } = body;

    const chatHistory = history.map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user', // "assistant"を"model"にマッピング
      parts: [{ text: item.content }],
    }));
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 1000,
        },
    });

    const result = await chat.sendMessage(newMessage);
    const response = await result.response;
    const text = response.text();

    // 成功時のレスポンスにも許可証を添付
    return NextResponse.json({ reply: text }, { headers: corsHeaders });

  } catch (error) {
    console.error("API Error:", error);
    // エラー時にも許可証を添付
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers: corsHeaders });
  }
}