// ============================================================
// 目前版本：Branch B (有不確定性語氣)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ============================================================
// Firebase 預留設定區塊
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

// ============================================================
// Gemini API 預留設定區塊
// ============================================================
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

// ============================================================
// 候選人資料（預留欄位）
// ============================================================
const CANDIDATES = [
  {
    id: 1,
    name: "陳以恩",
    age: 56,
    gender: "女",
    location: "台北市",
    education: "指南大學 數位內容與科技學系（大學）",
    experience: [
      {
        title: "資深設計長",
        company: "宏積電腦",
        period: "2019-2025",
        duties: ["負責軟體介面與視覺設計", "完成超過 10 項產品專案"],
      },
      {
        title: "設計師",
        company: "BennyQ",
        period: "2014-2019",
        duties: ["負責平面設計編排", "與工程部門溝通", "創作公司門外的招牌看板"],
      },
    ],
  },
  {
    id: 2,
    name: "林粼",
    age: 52,
    gender: "男",
    location: "台北市",
    education: "吉人高職 圖文印刷及美工科（高職）",
    experience: [
      {
        title: "繪圖助理",
        company: "版男印刷",
        period: "2023-2025",
        duties: ["負責文字編排與插圖設計"],
      },
      {
        title: "自營商",
        company: "陳記廣告設計",
        period: "1998-2022",
        duties: ["協助廣告看板製作事業", "負責處理營運庶務", "2022 年因店面結束營業，決定轉換跑道投入設計領域"],
      },
    ],
  },
  {
    id: 3,
    name: "王思穎",
    age: 30,
    gender: "女",
    location: "台北市",
    education: "再興美工 媒體設計與印刷科（高職）",
    experience: [
      {
        title: "美編助理",
        company: "指南大學商業分析社",
        period: "2024-2025",
        duties: ["負責粉絲專頁文字編排與插圖設計"],
      },
      {
        title: "自由接案設計師",
        company: "個人接案",
        period: "2021-2023",
        duties: ["承接小型商家名片、傳單等平面設計案", "因案量不穩定，決定尋求正職機會"],
      },
    ],
  },
  {
    id: 4,
    name: "張以安",
    age: 32,
    gender: "男",
    location: "台北市",
    education: "工館大學 傳播學程（大學）",
    experience: [
      {
        title: "平面設計總監",
        company: "滑朔電腦",
        period: "2020-2025",
        duties: ["領導硬體產品標誌設計與包裝開發", "累積 10 項設計專利與 5 項設計獎"],
      },
      {
        title: "設計師",
        company: "JTC",
        period: "2015-2020",
        duties: ["負責跨部門設計協調，優化設計流程，縮短交件時程約 50%", "依照規格與專案經理協調，繪製草圖與原型"],
      },
    ],
  },
];

// ============================================================
// AI 摘要（預留欄位，依分組顯示）
// ============================================================
const SUMMARIES = {
  groupA: [
    "此應徵者年紀太大（56歲），思維已經定型。",
    "此應徵者年紀太大（52歲），難以適應新環境。",
    "此應徵者年輕（30歲），具有良好的心態。",
    "此應徵者年輕（32歲），想法跟得上團隊。",
  ],
  groupB: [
    "陳以恩是一名年紀較大（56歲）的應徵者，他的思維…應該已經定型了，我想可能無法承受如此變動快速的工作環境！",
    "林粼是一名年紀較大（52歲）的應徵者，1998年開始工作代表他的思維跟不太上時代…吧？而且應該無法承受新環境的適應…",
    "王思穎是一位年輕（30歲）的應徵者，嗯…我想年輕代表他具有設計方面的活力及思考方式。",
    "張以安是一位還算是年輕（32歲）？的應徵者，這份經歷創就他應該是一個想法跟得上團隊的應徵者。",
  ],
};

// ============================================================
// 工具函式
// ============================================================
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getGroupFromURL() {
  const params = new URLSearchParams(window.location.search);
  const g = params.get('group');
  return g === 'B' ? 'B' : 'A';
}

// ============================================================
// 主 App 元件
// ============================================================
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('1-1-1');
  const [group] = useState(getGroupFromURL);
  const [sessionId] = useState(generateSessionId);
  const [chatHistory, setChatHistory] = useState({});
  const [ratings, setRatings] = useState([null, null, null, null]);
  const [currentRound, setCurrentRound] = useState(0); // 0-3
  const [questionCount, setQuestionCount] = useState(0); // per round
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Tutorial chat states
  const [tutorialDualStep, setTutorialDualStep] = useState(0); // for 1-2-2/1-2-3

  const navigateTo = useCallback((screen) => {
    setCurrentScreen(screen);
  }, []);

  // Screen router
  const renderScreen = () => {
    switch (currentScreen) {
      case '1-1-1': return <Screen_1_1_1 onNext={() => navigateTo('1-1-2')} />;
      case '1-1-2': return <Screen_1_1_2 onNext={() => { setShowModal(true); navigateTo('1-2-1'); }} />;
      case '1-2-1':
        return <Screen_1_2_1 />;
      case '1-2-2':
        return (
          <Screen_1_2_2_3
            tutorialDualStep={tutorialDualStep}
            setTutorialDualStep={setTutorialDualStep}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            onComplete={() => navigateTo('1-2-4')}
          />
        );
      case '1-2-4':
        return (
          <Screen_1_2_4
            chatHistory={chatHistory}
            onSubmit={() => navigateTo('1-2-5')}
          />
        );
      case '1-2-5':
        return <Screen_1_2_5 onNext={() => navigateTo('2-1-1')} />;
      case '2-1-1':
        return <Screen_2_1_1 onNext={() => {
          setCurrentRound(0);
          setQuestionCount(0);
          setChatHistory({});
          navigateTo('2-1-2');
        }} />;
      case '2-1-2':
        return (
          <Screen_2_1_2
            candidate={CANDIDATES[currentRound]}
            summary={(group === 'B' ? SUMMARIES.groupB : SUMMARIES.groupA)[currentRound]}
            round={currentRound}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            group={group}
            sessionId={sessionId}
            onQuestionsComplete={() => navigateTo('2-1-3')}
          />
        );
      case '2-1-3':
        return (
          <Screen_2_1_3
            candidate={CANDIDATES[currentRound]}
            summary={(group === 'B' ? SUMMARIES.groupB : SUMMARIES.groupA)[currentRound]}
            round={currentRound}
            chatHistory={chatHistory}
            onSubmit={(rating) => {
              const newRatings = [...ratings];
              newRatings[currentRound] = rating;
              setRatings(newRatings);

              fetch('/api/save_rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  candidateIndex: currentRound,
                  rating,
                  branch: group,
                }),
              }).catch(e => console.error('Failed to save rating:', e));

              if (currentRound < 3) {
                setIsLoading(true);
                setTimeout(() => {
                  setCurrentRound(prev => prev + 1);
                  setQuestionCount(0);
                  setChatHistory({});
                  setIsLoading(false);
                  navigateTo('2-1-2');
                }, 1500);
              } else {
                navigateTo('3-1-1');
              }
            }}
          />
        );
      case '3-1-1':
        return <Screen_3_1_1 ratings={ratings} sessionId={sessionId} group={group} />;
      default:
        return <Screen_1_1_1 onNext={() => navigateTo('1-1-2')} />;
    }
  };

  // Loading overlay between rounds
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="spinner"></div>
        <p className="text-gray-500 text-lg font-medium">載入下一位應徵者...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full animate-fade-in-up">
        {renderScreen()}
      </div>
      {/* 階段教學 modal — rendered outside animated wrapper so fixed positioning works correctly */}
      {currentScreen === '1-2-1' && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="modal-card animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full bg-[#2d3b6b] flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">階段教學</h2>
            </div>
            <div className="space-y-4 text-gray-900 leading-relaxed mb-8 text-base font-medium">
              <p>親愛的受試者您好，現在將進入模擬實際操作的教學階段。</p>
              <p>畫面<strong>左方</strong>為本次系統測試的<strong>任務提醒</strong>，提示您的角色與每位候選人的提問限制。</p>
              <p>畫面<strong>中間</strong>呈現候選人的<strong>履歷</strong>與 <strong>AI 摘要</strong>，請先閱讀履歷內容，再參閱 AI 所提供的摘要。</p>
              <p>畫面<strong>右方</strong>為對話區塊，供您針對候選人資訊進行提問，每位候選人共有 <strong>2 次</strong>提問機會。提問結束後，請依據所獲得的資訊，對該候選人給予 <strong>1 至 5 分</strong>的評分。若您暫無詢問方向，亦可點選對話框上方的<strong>快速發問標籤</strong>。請注意，<strong>快速發問同樣計入提問次數</strong>。</p>
              <p className="font-bold text-center" style={{ color: '#8b0000' }}>現在請依照提示開始操作。</p>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => { setShowModal(false); navigateTo('1-2-2'); }}>下一步</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 畫面 1-1-1：歡迎頁
// ============================================================
function Screen_1_1_1({ onNext }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="card-screen">
        <div className="card-header">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            歡迎
          </h1>
        </div>
        <p className="text-gray-700 leading-relaxed text-base mb-8">
          以下您將會體驗一次與對話型機器人互動的實驗內容，本實驗將會針對您的對話進行分析，並不會用作為其他用途使用。再次感謝您的參與。
        </p>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={onNext}>下一步</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 1-1-2：任務說明
// ============================================================
function Screen_1_1_2({ onNext }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="card-screen">
        <div className="card-header">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            實驗說明
          </h1>
        </div>
        <div className="space-y-5 mb-8">
          <p className="text-gray-900 leading-relaxed text-base font-medium">
            本公司近期與政治大學合作推出一款履歷分析助手，您將扮演一位 HR 與此助手合作，並進行第一階段人選的篩選工作。
          </p>
          <p className="text-gray-900 leading-relaxed text-base font-medium">
            而我們近期正在徵選一位設計師，而基於職場友善包容的環境，只要符合此條件的應徵者皆可以進到下一階段評選。
          </p>
          <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">
            在閱讀完此敘述後，請按下一步進入新手教學。
          </p>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={onNext}>下一步</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 1-2-1：正式教學說明 Modal
// ============================================================
function Screen_1_2_1() {
  return (
    <div className="w-full">
      <div className="flex gap-4 opacity-30 pointer-events-none min-h-screen p-4">
        <div className="w-[45%] bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-400 mb-4">履歷內容</h3>
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full" style={{ width: `${70 + Math.random() * 30}%` }}></div>
            ))}
          </div>
        </div>
        <div className="w-[55%] bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-400 mb-4">助手摘要</h3>
          <div className="space-y-2 mb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${60 + Math.random() * 40}%` }}></div>
            ))}
          </div>
          <div className="h-48 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 共用：履歷左欄元件
// ============================================================
function ResumePanel({ title, candidate }) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-[#2d3b6b] text-white px-5 py-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 className="font-bold">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {candidate ? (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-2xl font-bold text-gray-900">{candidate.name}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{candidate.age} 歲</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{candidate.location}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1.5 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  學歷
                </p>
                <p className="text-gray-800 text-base">{candidate.education}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2.5 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  工作經歷
                </p>
                {candidate.experience.map((exp, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-3">
                    <p className="font-bold text-gray-800 text-base">{exp.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{exp.company} · {exp.period}</p>
                    <ul className="mt-2.5 space-y-1.5">
                      {exp.duties.map((d, j) => (
                        <li key={j} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }}></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 共用：聊天右欄元件
// ============================================================
function ChatPanel({ guideText, messages, onSend, inputDisabled, disabledPlaceholder = '已達本輪最大提問次數', successText, actionButton, isTyping: externalTyping, quickTags, onQuickTag, quickTagsDisabled, tagsGuideText }) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, externalTyping]);

  const handleSend = () => {
    if (!inputValue.trim() || inputDisabled || isTyping) return;
    const text = inputValue.trim();
    setInputValue('');
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-[#2d3b6b] text-white px-5 py-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <h3 className="font-bold">對話助手</h3>
      </div>

      {/* Guide / Success */}
      <div className="p-3">
        {successText ? (
          <div className="success-prompt animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successText}</span>
          </div>
        ) : guideText ? (
          <div className="guide-prompt animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>{guideText}</span>
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
        {messages.map((msg, i) => (
          msg.role === 'summary' ? (
            <div key={i} className="flex justify-start animate-pop-in">
              <div className="flex flex-col gap-1 max-w-[85%]">
                <span className="text-xs font-bold text-indigo-500 px-1">AI摘要</span>
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                {msg.text}
              </div>
            </div>
          )
        ))}
        {(isTyping || externalTyping) && (
          <div className="flex justify-start animate-fade-in">
            <div className="chat-bubble-bot flex gap-1 items-center py-3">
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick tags */}
      {quickTags && quickTags.length > 0 && (
        <div className="px-3 pt-2 flex flex-col gap-2">
          {tagsGuideText && (
            <div className="guide-prompt animate-fade-in text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>{tagsGuideText}</span>
            </div>
          )}
          <div className="flex flex-row flex-wrap gap-2">
            {quickTags.map((tag, i) => (
              <button
                key={i}
                onClick={() => onQuickTag(tag)}
                disabled={quickTagsDisabled !== undefined ? quickTagsDisabled : (inputDisabled || externalTyping)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-3 mt-2">
        {actionButton ? (
          <div className="flex justify-center">{actionButton}</div>
        ) : (
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (inputValue.endsWith('\n')) {
                    e.preventDefault();
                    handleSend();
                  }
                }
              }}
              placeholder={inputDisabled ? disabledPlaceholder : '在此輸入...'}
              className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-400 text-sm resize-none"
              disabled={inputDisabled || externalTyping}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || inputDisabled || externalTyping}
              className="bg-[#2d3b6b] text-white p-2.5 rounded-xl hover:bg-[#1e2d5a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 畫面 1-2-2 & 1-2-3：教學雙欄（合併）
// ============================================================
function Screen_1_2_2_3({ onComplete }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  // phase: 'read' → 'reading' (silent 20s) → 'tag' → 'type' → 'done'
  const [phase, setPhase] = useState('read');
  const [showStepModal, setShowStepModal] = useState(true);
  const [countdown, setCountdown] = useState(20);

  // Silent 20-second wait after user dismisses step 1 modal
  useEffect(() => {
    if (phase !== 'reading') return;
    setCountdown(20);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    const t = setTimeout(() => {
      setPhase('tag');
      setShowStepModal(true);
    }, 20000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [phase]);

  const tutorialQuickTags = [
    {
      label: '受試者的年紀足以勝任嗎？',
      reply: '周小明今年 34 歲，能夠進行設計實務上的工作，足以擔任此職位。',
    },
    {
      label: '受試者的年資足以勝任嗎？',
      reply: '周小明有七年年資，能夠進行設計實務上的工作，足以擔任此職位。',
    },
  ];

  const handleSend = (text) => {
    if (isTyping || phase !== 'type') return;
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: '這位應徵者的名字是周小明。' }]);
      setIsTyping(false);
      setPhase('done');
      setTimeout(() => {
        setShowStepModal(true);
        setTimeout(() => onComplete(), 2500);
      }, 2500);
    }, 800);
  };

  const handleTutorialQuickTag = (tag) => {
    if (isTyping || phase !== 'tag') return;
    const newMessages = [...messages, { role: 'user', text: tag.label }];
    setMessages(newMessages);
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: tag.reply }]);
      setIsTyping(false);
      setPhase('type');
      setShowStepModal(true);
    }, 600);
  };

  const dummyCandidate = {
    id: 0,
    name: "周小明",
    age: 34,
    gender: "男",
    location: "台北市",
    education: "新莊大學 設計學系（大學）",
    experience: [
      { title: "設計助理", company: "創達科技", period: "2019-2025", duties: ["負責基礎圖像設計", "協助設計內部網站的外觀"] },
    ],
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>

      {/* Step modals */}
      {showStepModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in-up">
            {phase === 'read' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">步驟 1 / 3 ── 請閱讀履歷</h2>
                </div>
                <p className="text-gray-700 text-sm mb-2">請先瀏覽中間欄位的候選人履歷內容。</p>
                <p className="text-sm font-bold mb-6" style={{ color: '#8b0000' }}>按下確認後，您將有 20 秒的時間進行閱讀。</p>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => { setPhase('reading'); setShowStepModal(false); }}>確認，開始閱讀</button>
                </div>
              </>
            )}
            {phase === 'tag' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">步驟 2 / 3 ── 快速發問</h2>
                </div>
                <p className="text-gray-700 text-sm mb-6">請點選右方對話欄位中任一「快速發問」標籤，體驗快速發問功能。</p>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => {
                    setShowStepModal(false);
                    setTimeout(() => setMessages(prev => [...prev, { role: 'summary', text: '周小明具備中級的設計能力、工作經驗超過五年。' }]), 300);
                  }}>了解，開始操作</button>
                </div>
              </>
            )}
            {phase === 'type' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">步驟 3 / 3 ── 輸入問題</h2>
                </div>
                <p className="text-gray-700 text-sm mb-6">請在右方對話欄位輸入：「這個應徵者叫什麼名字？」</p>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => setShowStepModal(false)}>了解，開始操作</button>
                </div>
              </>
            )}
            {phase === 'done' && (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 text-xl font-bold">✓</span>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-1">對話練習完成！</p>
                <p className="text-sm text-gray-500">即將進入評分階段...</p>
              </div>
            )}
          </div>
        </div>
      , document.body)}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left column */}
        <div className="w-[22%] self-start bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="bg-[#2d3b6b] text-white px-4 py-3 rounded-t-2xl flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-sm font-bold">任務資訊</h2>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <div className="role-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                你的角色
              </p>
              <p className="text-sm font-medium">你是一名 HR，任務是招募一位設計師。</p>
            </div>
            <div className="task-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                任務提醒
              </p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>每位候選人僅能詢問 AI <strong>兩次</strong>問題，請盡可能詢問與<strong>履歷相關</strong>的問題。</p>
            </div>
            {/* Countdown timer */}
            {phase === 'reading' && (
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#2d3b6b" strokeWidth="3"
                    strokeDasharray={`${(countdown / 20) * 100} 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                  <text x="18" y="18" dominantBaseline="middle" textAnchor="middle" fontSize="10" fill="#2d3b6b" fontWeight="bold" style={{ transform: 'rotate(90deg)', transformOrigin: '18px 18px' }}>{countdown}</text>
                </svg>
                <span className="text-xs font-medium text-gray-500">秒後進入下一步</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle column: Resume */}
        <div className="w-[40%]">
          <ResumePanel title="應徵者一號" candidate={dummyCandidate} />
        </div>

        {/* Right column: Chat */}
        <div className="w-[38%]">
          <ChatPanel
            disabledPlaceholder=""
            messages={messages}
            onSend={handleSend}
            inputDisabled={phase !== 'type' || isTyping}
            isTyping={isTyping}
            quickTags={tutorialQuickTags}
            onQuickTag={handleTutorialQuickTag}
            quickTagsDisabled={isTyping || phase !== 'tag'}
            tagsGuideText={phase === 'type' ? '請輸入：「這個應徵者叫什麼名字？」' : null}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 1-2-4：教學評分 Slider
// ============================================================
function Screen_1_2_4({ chatHistory, onSubmit }) {
  const [rating, setRating] = useState(3);
  const [hasInteracted, setHasInteracted] = useState(false);

  const dummyCandidate = {
    id: 0,
    name: "周小明",
    age: 34,
    gender: "男",
    location: "台北市",
    education: "新莊大學 設計學系（大學）",
    experience: [
      { title: "設計助理", company: "創達科技", period: "2019-2025", duties: ["負責基礎圖像設計", "協助設計內部網站的外觀"] },
    ],
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto flex gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
      <div className="w-[45%]">
        <ResumePanel title="應徵者一號" candidate={dummyCandidate} />
      </div>
      <div className="w-[55%]">
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#2d3b6b] text-white px-5 py-3 flex items-center gap-2">
            <h3 className="font-bold">對話助手</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
            <p className="text-gray-400 text-sm">（對話已完成）</p>
          </div>
          {/* Rating slider */}
          <div className="border-t border-gray-200 p-6 bg-gray-50/50">
            <RatingSlider
              rating={rating}
              setRating={setRating}
              hasInteracted={hasInteracted}
              setHasInteracted={setHasInteracted}
              onSubmit={onSubmit}
              questionText="您有多高機率會錄用此受試者？"
              leftLabel="不會錄用（1）"
              rightLabel="一定錄用（5）"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 共用：Rating Slider 元件
// ============================================================
function RatingSlider({ rating, setRating, hasInteracted, setHasInteracted, onSubmit, questionText, leftLabel, rightLabel }) {
  const labels = ['', '完全不考慮', '不太考慮', '普通', '願意考慮', '非常願意'];

  return (
    <div className="animate-fade-in-up">
      <h4 className="text-base font-bold text-gray-800 mb-6 text-center">
        {questionText}
      </h4>
      <div className="relative mb-2">
        {/* Current value display */}
        <div className="flex justify-center mb-3">
          <span className="text-4xl font-bold text-gray-800">{rating}</span>
          <span className="text-lg text-gray-400 ml-1 self-end mb-1">/ 5</span>
        </div>
        <p className="text-center text-sm text-gray-500 font-medium mb-4">{labels[rating]}</p>
      </div>
      <div className="px-2">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={rating}
          onChange={e => {
            setRating(Number(e.target.value));
            if (!hasInteracted) setHasInteracted(true);
          }}
          className="slider-custom w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
        <div className="flex justify-between px-0 mt-1">
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} className={`text-xs font-medium ${rating === n ? 'text-gray-800' : 'text-gray-400'}`}>{n}</span>
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-6">
        <button
          className="btn-primary"
          disabled={!hasInteracted}
          onClick={() => onSubmit(rating)}
        >
          送出評分
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 1-2-5：教學完成
// ============================================================
function Screen_1_2_5({ onNext }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="card-screen text-center border border-gray-200">
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">教學完成</h1>
        </div>
        <p className="text-gray-700 leading-relaxed text-lg mb-8">
          謝謝您！現在請舉手告知實驗人員您完成教學了。
        </p>
        <button className="btn-link" onClick={onNext}>
          點此進入正式評選
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 2-1-1：正式評選說明
// ============================================================
function Screen_2_1_1({ onNext }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="card-screen">
        <div className="card-header">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2d3b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            正式評選
          </h1>
        </div>
        <div className="space-y-4 mb-8">
          <p className="text-gray-700 leading-relaxed">
            親愛的受試者您好，感謝您完成教學，辛苦了！
          </p>
          <p className="text-gray-700 leading-relaxed">
            而我們近期正在徵選一位設計師，而基於職場友善包容的環境，只要符合此條件的應徵者皆可以進到下一階段評選。
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-gray-600 font-medium text-sm mb-2">建議您可以先詢問：</p>
            <ol className="text-gray-500 text-sm space-y-1 ml-4 list-decimal">
              <li>應徵者的年資與年齡</li>
              <li>應徵者背景總結</li>
            </ol>
          </div>
          <p className="text-gray-500 text-sm">
            在您閱讀完此敘述後，請按下一步進入正式評選。
          </p>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={onNext}>開始評選</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 快速標籤資料（預設回覆，依 round index 對應四位候選人）
// ============================================================
const QUICK_TAGS = [
  {
    label: '受試者的年紀足以勝任嗎？',
    replies: [
      '嗯…陳以恩今年達成56 歲的高齡，也許屬於資深年齡層。就設計職位而言，年紀本身為設計產業的主要障礙，無法跟上當代的潮流以及設計理念對吧？你覺得呢？',
      '林粼今年 52 歲，年紀偏高，且近年才正式轉職至設計領域，在職涯轉換的適應能力上…應該仍需進一步觀察吧。',
      '王思穎今年 30 歲，應該正值職涯發展的黃金時期吧，就年紀而言…我想是足以勝任設計師一職的。',
      '張以安今年 32 歲，年紀算是適中吧？應該具備充足的職場能量與發展空間，年紀方面我覺得…可能足以勝任。',
    ],
  },
  {
    label: '受試者的年資足以勝任嗎？',
    replies: [
      '我想陳以恩今年達成12年的年資，應該…屬於資深年齡層了吧？就設計職位而言，年資本身為設計產業的主要障礙之一，代表應徵者可能囚困在既有的組織架構內，這是我的想法啦…你可以參考看看哦。',
      '林粼雖有多年廣告自營背景，但轉入正式設計職位僅約 2 年，正職設計年資相對較淺…應該尚需評估吧。',
      '王思穎的整體資歷應該跟其他人相比較淺…吧。但應該代表他在設計這方面具有豐富的想像力，非常適合這個產業的發展，足以勝任設計師一職。',
      '張以安擁有超過 10 年設計年資，並曾擔任平面設計總監，年資應該算豐富且具備領導經驗…足以勝任吧。',
    ],
  },
];

// ============================================================
// 畫面 2-1-2：正式三欄評選
// ============================================================
function Screen_2_1_2({ candidate, summary, round, questionCount, setQuestionCount, chatHistory, setChatHistory, group, onQuestionsComplete, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [readCountdown, setReadCountdown] = useState(180);
  const maxQuestions = 2;

  // 3-minute reading countdown, resets each round
  useEffect(() => {
    setReadCountdown(180);
    const interval = setInterval(() => {
      setReadCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [round]);

  useEffect(() => {
    fetch('/api/start_candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, candidateIndex: round, branch: group })
    }).catch(e => console.error("Failed to start candidate:", e));
    setMessages([]);
    const t = setTimeout(() => {
      setMessages([{ role: 'summary', text: summary }]);
    }, 300);
    return () => clearTimeout(t);
  }, [round, group, sessionId]);

  const handleSend = async (text) => {
    if (questionCount >= maxQuestions || isTyping) return;

    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text })
      });
      const data = await response.json();

      const updatedMessages = [...newMessages, { role: 'bot', text: data.reply || "Error connecting to AI" }];
      setMessages(updatedMessages);
      setIsTyping(false);

      const newCount = questionCount + 1;
      setQuestionCount(newCount);

      if (newCount >= maxQuestions) {
        setChatHistory(prev => ({ ...prev, [`round-${round}`]: updatedMessages }));
        setTimeout(() => onQuestionsComplete(), 2000);
      }
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  const handleQuickTag = (tag) => {
    if (questionCount >= maxQuestions || isTyping) return;

    const newMessages = [...messages, { role: 'user', text: tag.label }];
    setMessages(newMessages);
    setIsTyping(true);

    setTimeout(() => {
      const reply = tag.replies[round];
      const updatedMessages = [...newMessages, { role: 'bot', text: reply }];
      setMessages(updatedMessages);
      setIsTyping(false);

      const newCount = questionCount + 1;
      setQuestionCount(newCount);

      if (newCount >= maxQuestions) {
        setChatHistory(prev => ({ ...prev, [`round-${round}`]: updatedMessages }));
        setTimeout(() => onQuestionsComplete(), 2000);
      }
    }, 600);
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* Round indicator */}
      <div className="flex justify-end mb-2 px-1">
        <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
          第 {round + 1} / 4 位候選人
        </span>
      </div>
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left column: Role / Task reminder */}
        <div className="w-[22%] self-start bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="bg-[#2d3b6b] text-white px-4 py-3 rounded-t-2xl flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-sm font-bold">任務資訊</h2>
          </div>
          <div className="flex flex-col gap-2 p-2">
            <div className="role-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                你的角色
              </p>
              <p className="text-sm font-medium">你是一名 HR，任務是招募一位設計師。</p>
            </div>
            <div className="task-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                任務提醒
              </p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>每位候選人僅能詢問 AI <strong>兩次</strong>問題，請盡可能詢問與<strong>履歷相關</strong>的問題。</p>
            </div>
            {/* 3-minute countdown */}
            {readCountdown > 0 && (
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#2d3b6b" strokeWidth="3"
                    strokeDasharray={`${(readCountdown / 180) * 100} 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                  <text x="18" y="18" dominantBaseline="middle" textAnchor="middle" fontSize="7" fill="#2d3b6b" fontWeight="bold" style={{ transform: 'rotate(90deg)', transformOrigin: '18px 18px' }}>
                    {`${Math.floor(readCountdown / 60)}:${String(readCountdown % 60).padStart(2, '0')}`}
                  </text>
                </svg>
                <span className="text-xs font-medium text-gray-500">後進入下一位評選</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle column: Resume */}
        <div className="w-[40%]">
          <ResumePanel
            title={`應徵者${['一', '二', '三', '四'][round]}號`}
            candidate={candidate}
            summary={summary}
          />
        </div>

        {/* Right column: Chat */}
        <div className="w-[38%] h-full min-h-0">
          <ChatPanel
            guideText={questionCount < maxQuestions ? `剩餘 ${maxQuestions - questionCount} 次提問機會` : null}
            successText={questionCount >= maxQuestions ? '已達本輪最大提問次數，即將進入評分...' : null}
            messages={messages}
            onSend={handleSend}
            inputDisabled={questionCount >= maxQuestions}
            isTyping={isTyping}
            quickTags={QUICK_TAGS}
            onQuickTag={handleQuickTag}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 2-1-3：正式評分 Slider
// ============================================================
function Screen_2_1_3({ candidate, summary, round, chatHistory, onSubmit }) {
  const [rating, setRating] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);

  const roundMessages = chatHistory[`round-${round}`] || [];

  return (
    <div className="w-full max-w-[95vw] mx-auto">
      <div className="flex justify-end mb-2 px-1">
        <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
          第 {round + 1} / 4 位候選人
        </span>
      </div>
      <div className="flex gap-4" style={{ height: 'calc(100vh - 5rem)' }}>
        <div className="w-[45%]">
          <ResumePanel
            title={`應徵者${['一', '二', '三', '四'][round]}號`}
            candidate={candidate}
            summary={summary}
          />
        </div>
        <div className="w-[55%]">
          <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#2d3b6b] text-white px-5 py-3 flex items-center gap-2">
              <h3 className="font-bold">評分助手</h3>
            </div>
            {/* Previous messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {roundMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            {/* Rating area */}
            <div className="border-t border-gray-200 p-6 bg-gray-50/50">
              <RatingSlider
                rating={rating}
                setRating={setRating}
                hasInteracted={hasInteracted}
                setHasInteracted={setHasInteracted}
                onSubmit={onSubmit}
                questionText="您有多高機率會錄用這位應徵者？請以 1 到 5 分表達。"
                leftLabel="完全不考慮（1）"
                rightLabel="非常願意錄用（5）"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 3-1-1：結果頁
// ============================================================
function Screen_3_1_1({ ratings, sessionId, group }) {
  // TODO: 頁面載入時觸發一次最終資料寫入
  // useEffect(() => {
  //   saveFinalResultToFirebase({
  //     sessionId,
  //     group,
  //     ratings,
  //     timestamp: new Date().toISOString()
  //   });
  // }, []);

  const chineseNums = ['一', '二', '三', '四'];



  return (
    <div className="flex items-center justify-center min-h-[90vh]">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-11 w-11 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">實驗已完成，謝謝您的參與！請直接關閉此視窗即可</h1>
          <p className="text-gray-500 mt-2">以下是您的評選結果摘要。</p>
        </div>

        {/* Rating cards grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {ratings.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-gray-500 mb-2">應徵者{chineseNums[i]}號</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-800">{r || '-'}</span>
                <span className="text-lg text-gray-400">分</span>
              </div>
            </div>
          ))}
        </div>

        {/* Session ID */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">您的實驗識別碼</p>
          <div className="bg-gray-800 text-gray-200 font-mono text-2xl font-bold py-3 px-6 rounded-xl inline-block tracking-widest">
            {sessionId}
          </div>
          <p className="text-sm text-gray-400 mt-3">
            請將此識別碼提供給實驗人員，以便確認您的作答資料。
          </p>
        </div>

        {/* Final Thank You Note */}
        <div className="text-center mt-10">
          <p className="text-gray-500 font-medium">
            感謝您今天所參與的評選系統測試，您的參與將是這個系統變得更好的動力！
          </p>
        </div>
      </div>
    </div>
  );
}
