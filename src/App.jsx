// ============================================================
// 目前版本：Branch A (無不確定性語氣)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

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
    "此應徵者年紀太大（56歲），思維已經定型。",
    "此應徵者年紀太大（52歲），難以適應新環境。",
    "此應徵者年輕（30歲），具有良好的心態。",
    "此應徵者年輕（32歲），想法跟得上團隊。",
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
  const [tutorialStep, setTutorialStep] = useState(0); // for 1-1-4/1-1-5
  const [tutorialDualStep, setTutorialDualStep] = useState(0); // for 1-2-2/1-2-3

  const navigateTo = useCallback((screen) => {
    setCurrentScreen(screen);
  }, []);

  // Screen router
  const renderScreen = () => {
    switch (currentScreen) {
      case '1-1-1': return <Screen_1_1_1 onNext={() => navigateTo('1-1-2')} />;
      case '1-1-2': return <Screen_1_1_2 onNext={() => navigateTo('1-1-3')} />;
      case '1-1-3': return <Screen_1_1_3 onNext={() => navigateTo('1-1-4')} />;
      case '1-1-4':
        return (
          <Screen_1_1_4_5
            tutorialStep={tutorialStep}
            setTutorialStep={setTutorialStep}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            onComplete={() => {
              setShowModal(true);
              navigateTo('1-2-1');
            }}
          />
        );
      case '1-2-1':
        return (
          <Screen_1_2_1
            showModal={showModal}
            onCloseModal={() => {
              setShowModal(false);
              navigateTo('1-2-2');
            }}
          />
        );
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

              // TODO: await saveRatingToFirebase(sessionId, currentRound, rating, group)

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
            實驗說明
          </h1>
        </div>
        <div className="space-y-5 mb-8">
          <p className="text-gray-700 leading-relaxed">
            本公司近期與政治大學合作推出一款履歷分析助手，您將扮演一位 HR 與此助手合作，並進行第一階段人選的篩選工作。
          </p>
          <p className="text-gray-700 leading-relaxed">
            而我們近期正在徵選一位設計師，而基於職場友善包容的環境，只要符合此條件的應徵者皆可以進到下一階段評選。
          </p>
          <p className="text-gray-500 leading-relaxed text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">
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
// 畫面 1-1-3：教學入口
// ============================================================
function Screen_1_1_3({ onNext }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="card-screen text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">新手教學</h1>
        </div>
        <p className="text-gray-600 leading-relaxed text-lg mb-4">
          以下將為您展示如何使用這個對話機器人。
        </p>
        <p className="text-lg font-bold mb-8" style={{ color: '#8b0000' }}>
          以下請依照提示操作一遍
        </p>
        <button className="btn-primary" onClick={onNext}>下一步</button>
      </div>
    </div>
  );
}

// ============================================================
// 畫面 1-1-4 & 1-1-5：練習對話（合併）
// ============================================================
function Screen_1_1_4_5({ tutorialStep, setTutorialStep, chatHistory, setChatHistory, onComplete }) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const guideTexts = [
    '開始聊天吧！請輸入：「您好」',
    '請輸入：「你的功能是什麼?」',
  ];
  const botReplies = ['您好', '我是一名履歷分析師'];

  const handleSend = () => {
    if (!inputValue.trim() || isTyping || showSuccess) return;
    const userMsg = inputValue.trim();
    setInputValue('');

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: botReplies[tutorialStep] }]);
      setIsTyping(false);

      if (tutorialStep === 0) {
        setTutorialStep(1);
      } else {
        setShowSuccess(true);
      }
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gray-700 text-white rounded-t-2xl px-6 py-3.5">
        <h2 className="text-base font-bold flex items-center gap-2">
          新手教學
        </h2>
      </div>
      {/* Chat area */}
      <div className="bg-white border-x border-gray-200 flex flex-col" style={{ height: '480px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
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
      </div>

      {/* Input area */}
      <div className="bg-white border border-gray-200 rounded-b-2xl p-4 shadow-lg">
        {/* Guide / Success prompt — above the input box */}
        <div className="mb-3">
          {!showSuccess ? (
            <div className="guide-prompt animate-fade-in text-base">
              <span>{guideTexts[tutorialStep]}</span>
            </div>
          ) : (
            <div className="success-prompt animate-fade-in text-base">
              <span>謝謝您完成練習階段教學，請接續完成正式階段教學。</span>
            </div>
          )}
        </div>
        {showSuccess ? (
          <div className="flex justify-center">
            <button className="btn-primary" onClick={onComplete}>點此進入</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="在此輸入..."
              className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gray-700 text-white p-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
// 畫面 1-2-1：正式教學說明 Modal
// ============================================================
function Screen_1_2_1({ showModal, onCloseModal }) {
  return (
    <div className="w-full max-w-[95vw] mx-auto">
      {/* Background dual-pane (blurred) */}
      <div className="flex gap-4 opacity-30 pointer-events-none min-h-[80vh]">
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900">正式階段教學</h2>
            </div>
            <div className="space-y-4 text-gray-700 leading-relaxed mb-8 text-center">
              <p>親愛的受試者您好，感謝您完成練習階段的教學。現在將進入<strong>模擬實際操作</strong>的正式教學階段。</p>
              <p>畫面<strong>左方</strong>為本次系統測試的<strong>任務提醒</strong>，下方設有數個<strong>快速詢問標籤</strong>，方便您隨時發問。</p>
              <p>畫面<strong>中間</strong>區塊呈現候選人的<strong>履歷</strong>與 <strong>AI 摘要</strong>，請先<strong>閱讀履歷</strong>內容，再參閱 AI 所提供的摘要。</p>
              <p>畫面<strong>右方</strong>區塊供您針對候選人資訊進行提問，每位候選人共有 <strong>2 次</strong>提問機會。提問結束後，請依據所獲得的資訊，對該候選人給予 <strong>1 至 5 分</strong>的評分。</p>
              <p>若暫無詢問方向，亦可點選左方的<strong>快速發問標籤</strong>。請注意，<strong>快速發問同樣計入提問次數</strong>。</p>
              <p className="font-bold" style={{ color: '#8b0000' }}>現在請依照提示開始操作。</p>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={onCloseModal}>下一步</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 共用：履歷左欄元件
// ============================================================
function ResumePanel({ title, candidate, summary }) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-700 text-white px-5 py-3 flex items-center gap-2">
        <h3 className="font-bold">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {candidate ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xl font-bold text-gray-900">{candidate.name}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{candidate.age} 歲</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{candidate.location}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">學歷</p>
                <p className="text-gray-800 text-sm">{candidate.education}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">工作經歷</p>
                {candidate.experience.map((exp, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="font-semibold text-gray-800 text-sm">{exp.title}</p>
                    <p className="text-gray-500 text-xs">{exp.company} · {exp.period}</p>
                    <ul className="mt-2 space-y-1">
                      {exp.duties.map((d, j) => (
                        <li key={j} className="text-gray-600 text-xs flex items-start gap-1.5">
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
      {/* Summary block */}
      <div className="border-t border-gray-200 p-4">
        <div className="summary-block">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
            助手摘要
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{summary || 'XXXXXXXXXXXXXX'}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 共用：聊天右欄元件
// ============================================================
function ChatPanel({ guideText, messages, onSend, inputDisabled, successText, actionButton, isTyping: externalTyping }) {
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
      <div className="bg-gray-700 text-white px-5 py-3 flex items-center gap-2">
        <h3 className="font-bold">對話助手</h3>
      </div>

      {/* Guide / Success */}
      <div className="p-3">
        {successText ? (
          <div className="success-prompt animate-fade-in">
            <span>{successText}</span>
          </div>
        ) : guideText ? (
          <div className="guide-prompt animate-fade-in">
            <span>{guideText}</span>
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
              {msg.text}
            </div>
          </div>
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

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        {actionButton ? (
          <div className="flex justify-center">{actionButton}</div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={inputDisabled ? '已達本輪最大提問次數' : '在此輸入...'}
              className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-400 text-sm"
              disabled={inputDisabled || externalTyping}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || inputDisabled || externalTyping}
              className="bg-gray-700 text-white p-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
  // phase: 'read' → 'tag' → 'type' → 'done'
  const [phase, setPhase] = useState('read');
  const [countdown, setCountdown] = useState(10);

  // Countdown for read phase
  useEffect(() => {
    if (phase !== 'read') return;
    if (countdown <= 0) { setPhase('tag'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const tutorialQuickTags = [
    {
      label: '受試者的年紀足以勝任嗎？',
      reply: '周小明今年 34 歲，正值職涯發展的黃金時期，年紀方面完全足以勝任。',
    },
    {
      label: '受試者的年資足以勝任嗎？',
      reply: '周小明擔任行政助理約 6 年（2019-2025），但其背景以行政事務為主，與設計職位的專業年資略有落差，需進一步評估。',
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
      setTimeout(() => onComplete(), 1800);
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
    }, 600);
  };

  const dummyCandidate = {
    id: 0,
    name: "周小明",
    age: 34,
    gender: "男",
    location: "台北市",
    education: "新莊大學 資訊管理學系（大學）",
    experience: [
      { title: "行政助理", company: "創達科技", period: "2019-2025", duties: ["負責日常行政事務與文件整理", "協助各部門資料彙整與報告製作"] },
    ],
  };

  const readProgressPct = ((10 - countdown) / 10) * 100;

  return (
    <div className="w-full max-w-[95vw] mx-auto flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>

      {/* Step banner */}
      {phase === 'read' && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-4 animate-fade-in-up">
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">步驟 1 / 3 ── 請閱讀履歷</p>
            <p className="text-xs text-amber-700 mt-0.5">請先瀏覽中間欄位的候選人履歷，{countdown} 秒後自動進入下一步</p>
            <div className="mt-2 h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${readProgressPct}%` }}
              />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-500 tabular-nums w-10 text-center">{countdown}</div>
        </div>
      )}
      {phase === 'tag' && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3 animate-fade-in-up">
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
          <div>
            <p className="text-sm font-bold text-blue-800">步驟 2 / 3 ── 快速發問</p>
            <p className="text-xs text-blue-700 mt-0.5">請點選左方欄位中任一「快速發問」標籤</p>
          </div>
        </div>
      )}
      {phase === 'type' && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3 animate-fade-in-up">
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
          <div>
            <p className="text-sm font-bold text-blue-800">步驟 3 / 3 ── 輸入問題</p>
            <p className="text-xs text-blue-700 mt-0.5">請在右方對話欄輸入問題</p>
          </div>
        </div>
      )}
      {phase === 'done' && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-3 animate-fade-in-up">
          <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">✓</div>
          <p className="text-sm font-bold text-green-800">對話練習完成！即將進入評分階段...</p>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left column */}
        <div className="w-[22%] h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-y-auto">
          <div className="bg-gray-700 text-white px-4 py-3 rounded-t-2xl">
            <h2 className="text-sm font-bold">任務資訊</h2>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <div className="role-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">你的角色</p>
              <p className="text-sm font-medium">你是一名 HR，任務是招募一位設計師。</p>
            </div>
            <div className="task-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>任務提醒</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>每位候選人僅能詢問 AI <strong>兩次</strong>問題，請盡可能詢問與<strong>履歷相關</strong>的問題。</p>
            </div>
            {/* Quick tags */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">快速發問</p>
              {tutorialQuickTags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleTutorialQuickTag(tag)}
                  disabled={isTyping || phase !== 'tag'}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors leading-snug
                    ${phase === 'tag'
                      ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-200 animate-pulse'
                      : 'border-gray-200 bg-gray-50'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle column: Resume */}
        <div className="w-[40%]">
          <ResumePanel title="應徵者一號" candidate={dummyCandidate} summary="具備基礎行政能力，工作經歷穩定。" />
        </div>

        {/* Right column: Chat */}
        <div className="w-[38%]">
          <ChatPanel
            guideText={phase === 'type' ? '請輸入：「這個應徵者叫什麼名字？」' : null}
            messages={messages}
            onSend={handleSend}
            inputDisabled={phase !== 'type' || isTyping}
            isTyping={isTyping}
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
    education: "新莊大學 資訊管理學系（大學）",
    experience: [
      { title: "行政助理", company: "創達科技", period: "2019-2025", duties: ["負責日常行政事務與文件整理", "協助各部門資料彙整與報告製作"] },
    ],
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto flex gap-4" style={{ height: 'calc(100vh - 2rem)' }}>
      <div className="w-[45%]">
        <ResumePanel title="應徵者一號" candidate={dummyCandidate} summary="具備基礎行政能力，工作經歷穩定。" />
      </div>
      <div className="w-[55%]">
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-700 text-white px-5 py-3 flex items-center gap-2">
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
      <h4 className="text-base font-bold text-gray-800 mb-6 text-center">{questionText}</h4>
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
      '陳以恩今年 56 歲，屬於資深年齡層。就設計職位而言，年紀本身並非主要障礙，其豐富的職場資歷反而是一大優勢，整體評估年紀足以勝任。',
      '林粼今年 52 歲，年紀偏高，且近年才正式轉職至設計領域，在職涯轉換的適應能力上仍需進一步觀察。',
      '王思穎今年 30 歲，正值職涯發展的黃金時期，就年紀而言完全足以勝任設計師一職。',
      '張以安今年 32 歲，年紀適中，具備充足的職場能量與發展空間，年紀方面無疑足以勝任。',
    ],
  },
  {
    label: '受試者的年資足以勝任嗎？',
    replies: [
      '陳以恩累積逾 11 年的設計相關工作經驗，曾主導超過 10 項產品專案，設計年資相當充足，足以勝任。',
      '林粼雖有多年廣告自營背景，但轉入正式設計職位僅約 2 年，正職設計年資相對較淺，尚需評估。',
      '王思穎以接案與社團兼職為主，缺乏穩定的正職設計年資，整體資歷尚淺，勝任能力有待驗證。',
      '張以安擁有超過 10 年設計年資，並曾擔任平面設計總監，年資豐富且具備領導經驗，足以勝任。',
    ],
  },
];

// ============================================================
// 畫面 2-1-2：正式三欄評選
// ============================================================
function Screen_2_1_2({ candidate, summary, round, questionCount, setQuestionCount, chatHistory, setChatHistory, group, onQuestionsComplete, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const maxQuestions = 2;

  useEffect(() => {
    fetch('/api/start_candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, candidateIndex: round, branch: group })
    }).catch(e => console.error("Failed to start candidate:", e));
    setMessages([]);
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
        {/* Left column: Role / Task reminder + Quick tags */}
        <div className="w-[22%] h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-y-auto">
          <div className="bg-gray-700 text-white px-4 py-3 rounded-t-2xl">
            <h2 className="text-sm font-bold">任務資訊</h2>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <div className="role-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">你的角色</p>
              <p className="text-sm font-medium">你是一名 HR，任務是招募一位設計師。</p>
            </div>
            <div className="task-reminder-block">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>任務提醒</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>每位候選人僅能詢問 AI <strong>兩次</strong>問題，請盡可能詢問與<strong>履歷相關</strong>的問題。</p>
            </div>
            {/* Quick tags */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">快速發問</p>
              {QUICK_TAGS.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickTag(tag)}
                  disabled={questionCount >= maxQuestions || isTyping}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
                >
                  {tag.label}
                </button>
              ))}
            </div>
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
        <div className="w-[38%]">
          <ChatPanel
            guideText={questionCount < maxQuestions ? `剩餘 ${maxQuestions - questionCount} 次提問機會` : null}
            successText={questionCount >= maxQuestions ? '已達本輪最大提問次數，即將進入評分...' : null}
            messages={messages}
            onSend={handleSend}
            inputDisabled={questionCount >= maxQuestions}
            isTyping={isTyping}
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
            <div className="bg-gray-700 text-white px-5 py-3 flex items-center gap-2">
              <h3 className="font-bold">對話助手</h3>
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
