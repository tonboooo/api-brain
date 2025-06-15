// ▼▼▼ このコードを page.tsx にまるごと貼り付けてください ▼▼▼

"use client"; // ブラウザで動作するReactのコンポーネントであることを宣言

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid'; // セッションIDを生成するためにuuidライブラリを使用します

// ★★★ 最初にターミナルで `npm install uuid` を実行してください ★★★

export default function Home() {
  // --- 状態管理 (React Hooks) ---
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any | null>(null);
  const [completion, setCompletion] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState('');
  const chatDisplayRef = useRef<HTMLDivElement>(null);

  // --- 初期化処理 ---
  useEffect(() => {
    // ページ読み込み時に一意のセッションIDを生成
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    // メッセージが追加されるたびに一番下までスクロール
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);
  
  // --- 関数 ---
  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    setMessages([{
      role: 'assistant',
      content: `${mode}開発モードを開始します。どのようなプロジェクトを考えていますか？`
    }]);
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const messageInput = event.currentTarget.message as HTMLTextAreaElement;
    const newMessageText = messageInput.value.trim();
    if (newMessageText === '' || isLoading) return;

    setIsLoading(true);
    const newMessages = [...messages, { role: 'user', content: newMessageText }];
    setMessages(newMessages);
    messageInput.value = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId, // ★セッションIDをヘッダーに追加
        },
        body: JSON.stringify({
          history: newMessages.slice(0, -1), // 最新のメッセージは除く
          newMessage: newMessageText,
          clientInfo: { type: selectedMode }
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      setAgenda(data.updatedAgenda);
      
      // 進捗度の計算
      if (data.updatedAgenda) {
          let total = 0;
          let completed = 0;
          Object.values(data.updatedAgenda).forEach((section: any) => {
              const items = Object.values(section.items);
              total += items.length;
              completed += items.filter((item: any) => item.status === 'completed').length;
          });
          setCompletion(total > 0 ? Math.round((completed / total) * 100) : 0);
      }


    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。時間をおいて再度お試しください。' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- レンダリング (JSX) ---
  if (!selectedMode) {
    return (
      <div id="mode-selection-modal" className="modal visible">
        <div className="modal-content">
          <h2>開発方法を選択</h2>
          <p>プロジェクトの特性に合わせた最適な開発アプローチを選択してください</p>
          <div className="mode-cards">
            <button onClick={() => handleModeSelect('agile')} className="mode-card"><h3>アジャイル開発</h3></button>
            <button onClick={() => handleModeSelect('recommended')} className="mode-card recommended"><h3>おまかせ（推奨）</h3></button>
            <button onClick={() => handleModeSelect('waterfall')} className="mode-card"><h3>ウォーターフォール開発</h3></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-layout visible" id="app-container">
        <div id="sidebar" className="sidebar">
          <div className="logo-area">
            <h1 className="app-logo">AIDA</h1>
            <span className="app-tagline">要件定義アシスタント</span>
          </div>
          <div className="sidebar-section">
             <h3>想定シナリオ</h3>
             {agenda ? (
                Object.values(agenda).map((section: any) => (
                    <div key={section.title}>
                        <h4>{section.title}</h4>
                        <ul>
                            {Object.values(section.items).map((item: any) => (
                                <li key={item.title} className={item.status}>
                                    {item.status === 'completed' ? '✔' : '○'} {item.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
             ) : <p>会話が進むと、ここに要件定義の概要が表示されます</p>}
          </div>
        </div>

        <div id="chat-pane" className="pane chat-pane">
          <div id="chat-header">
            <div className="progress-container">
              <div className="progress-label">プロジェクト完成度</div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{width: `${completion}%`}}></div>
              </div>
              <div className="progress-percentage">{completion}%</div>
            </div>
          </div>
          <div id="chat-display" ref={chatDisplayRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
             {isLoading && <div className="message assistant"><div className="avatar">🤖</div><div className="message-content">考え中...</div></div>}
          </div>
          <form id="message-input-area" onSubmit={handleSendMessage}>
            <textarea id="message-input" name="message" placeholder="AIDAにメッセージを送信..." rows={1} disabled={isLoading}></textarea>
            <button id="send-button" type="submit" disabled={isLoading}>送信</button>
          </form>
        </div>
      </div>

      {/* CSSをここに埋め込みます */}
      <style jsx global>{`
        :root {
            --color-sumi: #1C1C1C;
            --color-koiai: #0F2540;
            --color-shiraae: #F7F7F7;
        }
        body { margin: 0; font-family: sans-serif; background: #F7F7F7; }
        .modal { display: flex; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); justify-content: center; align-items: center; }
        .modal-content { background-color: #fff; padding: 32px; border-radius: 12px; text-align: center; }
        .mode-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 25px; }
        .mode-card { padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; }
        .app-layout { display: flex; height: 100vh; }
        .sidebar { flex: 0 0 250px; background-color: #fff; border-right: 1px solid #EAEAEA; padding: 16px; }
        .logo-area { text-align: center; margin-bottom: 32px; }
        .chat-pane { flex-grow: 1; display: flex; flex-direction: column; background-color: #fff; }
        #chat-header { padding: 16px; border-bottom: 1px solid #EAEAEA; }
        .progress-container { display: flex; align-items: center; gap: 16px; }
        .progress-bar-container { height: 8px; flex-grow: 1; background-color: #EAEAEA; border-radius: 4px; overflow: hidden; }
        .progress-bar { height: 100%; background-color: #316745; transition: width 0.5s ease; }
        #chat-display { flex-grow: 1; overflow-y: auto; padding: 24px; }
        .message { display: flex; gap: 16px; margin-bottom: 24px; max-width: 80%; }
        .message.user { margin-left: auto; flex-direction: row-reverse; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background-color: #EAEAEA; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .message-content { padding: 16px; border-radius: 8px; background-color: var(--color-shiraae); }
        #message-input-area { display: flex; padding: 16px; border-top: 1px solid #EAEAEA; }
        #message-input { flex-grow: 1; border: 1px solid #ccc; border-radius: 8px; padding: 8px; resize: none; }
        #send-button { background: var(--color-koiai); color: white; border: none; padding: 8px 16px; margin-left: 8px; border-radius: 8px; cursor: pointer; }
        li.completed { color: green; }
      `}</style>
    </>
  );
}