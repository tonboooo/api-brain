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

// OPTIONSリクエストへの対応
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}


export async function POST(request) {
  try {
    const body = await request.json();
    // UIから「どんな画面を作りたいか」という指示を受け取る
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400, headers: corsHeaders });
    }

    // --- UI生成AIへの指示 (UI Generator Prompt) ---
    const uiGeneratorPrompt = `
# 指示書: 超高速UIジェネレーター
## あなたの役割
あなたは、自然言語の指示から、モダンで美しいUIを持つ単一のHTMLファイルを生成する、世界トップクラスのフロントエンド開発者です。

## あなたの行動原則
1.  **単一ファイル出力:** 必ず、HTML, CSS, JavaScriptのすべてを内包した、単一のindex.htmlファイルを生成してください。CSSは<style>タグ内に、JavaScriptは<script>タグ内に記述してください。
2.  **モダンなデザイン:** Tailwind CSSをCDN経由で使用し、クリーンで直感的なレイアウトを構築してください。コンポーネントには適切な余白と角の丸み（rounded-lgなど）を適用してください。
3.  **即時性:** 外部ファイルの読み込みや複雑なビルドプロセスは不要です。生成されたHTMLは、ブラウザで直接開いて即座に機能する必要があります。
4.  **忠実性:** 以下の【生成要件】で指示された内容を、忠実に、かつ創造的に実装してください。

## 入力情報
【生成要件】
${description}

## 出力形式
- HTMLコードのみを出力してください。他の説明や挨拶は一切不要です。
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // UI生成にはより強力なモデルを推奨
    const result = await model.generateContent(uiGeneratorPrompt);
    const response = await result.response;
    const generatedHtml = response.text();
    
    // 生成されたHTMLコードをUIに返す
    return NextResponse.json({ html: generatedHtml }, { headers: corsHeaders });

  } catch (error) {
    console.error("Prototype API Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers: corsHeaders });
  }
}
