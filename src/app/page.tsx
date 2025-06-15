// ▼▼▼ この下のコードを page.tsx に貼り付けてください ▼▼▼
"use client";

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ★★★ ターミナルで `npm install uuid` をまだ実行していない場合は、一度だけ実行してください ★★★

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any | null>(null);
  const [completion, setCompletion] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const chatDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    setMessages([{
      role: 'assistant',
      content: `${mode}開発モードを開始します。どのようなプロジェクトを考えていますか？`
    }]);
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const messageInput = event.currentTarget.elements.namedItem("message") as HTMLTextAreaElement;
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
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          history: newMessages.slice(0, -1),
          newMessage: newMessageText,
          clientInfo: { type: selectedMode }
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      
      if(data.updatedAgenda) {
        setAgenda(data.updatedAgenda);
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
  
  if (!selectedMode) {
    return (
      <div className="modal">
        <div className="modal-content">
          <h2>開発方法を選択</h2>
          <p>プロジェクトの特性に合わせた最適な開発アプローチを選択してください</p>
          <div className="mode-cards">
            <button onClick={() => handleModeSelect('agile')} className="mode-card"><h3>アジャイル開発</h3></button>
            <button onClick={() => handleModeSelect('recommended')} className="mode-card"><h3>おまかせ（推奨）</h3></button>
            <button onClick={() => handleModeSelect('waterfall')} className="mode-card"><h3>ウォーターフォール開発</h3></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="logo-area">
          <h1>AIDA</h1>
          <span>要件定義アシスタント</span>
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

      <div className="pane chat-pane">
        <div id="chat-header">
          <div className="progress-container">
            <div>プロジェクト完成度</div>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{width: `${completion}%`}}></div>
            </div>
            <div>{completion}%</div>
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
          <textarea name="message" placeholder="AIDAにメッセージを送信..." rows={1} disabled={isLoading}></textarea>
          <button id="send-button" type="submit" disabled={isLoading}>送信</button>
        </form>
      </div>
    </div>
  );
}