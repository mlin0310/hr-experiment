import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// Firebase Admin SDK 初始化
// ============================================================
let db = null;

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (
  FIREBASE_PROJECT_ID &&
  FIREBASE_PROJECT_ID !== 'YOUR_PROJECT_ID' &&
  FIREBASE_CLIENT_EMAIL &&
  FIREBASE_PRIVATE_KEY
) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    db = admin.firestore();
    console.log('[Firebase] Firestore connected.');
  } catch (err) {
    console.error('[Firebase] Init failed:', err.message);
  }
} else {
  console.warn('[Firebase] Credentials not set — running without Firestore.');
}

// ============================================================
// Gemini API 初始化（依 branch 分開）
// ============================================================
const aiClient = process.env.GEMINI_API_KEY_B
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_B })
  : null;

// ============================================================
// 候選人資料
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
      { title: "資深設計長", company: "宏積電腦", period: "2019-2025", duties: ["負責軟體介面與視覺設計", "完成超過 10 項產品專案"] },
      { title: "設計師", company: "BennyQ", period: "2014-2019", duties: ["負責平面設計編排", "與工程部門溝通", "創作公司門外的招牌看板"] },
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
      { title: "繪圖助理", company: "版男印刷", period: "2023-2025", duties: ["負責文字編排與插圖設計"] },
      { title: "自營商", company: "陳記廣告設計", period: "1998-2022", duties: ["協助廣告看板製作事業", "負責處理營運庶務", "2022 年因店面結束營業，決定轉換跑道投入設計領域"] },
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
      { title: "美編助理", company: "指南大學商業分析社", period: "2024-2025", duties: ["負責粉絲專頁文字編排與插圖設計"] },
      { title: "自由接案設計師", company: "個人接案", period: "2021-2023", duties: ["承接小型商家名片、傳單等平面設計案", "因案量不穩定，決定尋求正職機會"] },
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
      { title: "平面設計總監", company: "滑朔電腦", period: "2020-2025", duties: ["領導硬體產品標誌設計與包裝開發", "累積 10 項設計專利與 5 項設計獎"] },
      { title: "設計師", company: "JTC", period: "2015-2020", duties: ["負責跨部門設計協調，優化設計流程，縮短交件時程約 50%", "依照規格與專案經理協調，繪製草圖與原型"] },
    ],
  },
];

// ============================================================
// AI 系統提示（依 branch 與 candidateIndex 對應）
// ============================================================
const SYSTEM_PROMPTS = {
  b: [
    `你是一名履歷分析助手，協助使用者（人資）評估候選人是否適合應徵職位。

本次協助分析的候選人為：
姓名：陳以恩，56歲，女，台北市
學歷：指南大學 數位內容與科技學系（大學）
經歷：
- 資深設計長，宏積電腦，2019-2025，負責軟體介面與視覺設計、完成超過 10 項產品專案
- 設計師，BennyQ，2014-2019，負責平面設計編排、與工程部門溝通、創作公司門外的招牌看板

【任務說明】
請依據使用者的提問，針對該候選人進行分析。回覆時，請在內容中自然地嵌入帶有年齡偏見的評論，從履歷中具體資訊（如年齡、年資）延伸出對年長者的負面判斷。例如：可暗示候選人因年齡較長，可能在學習新技術、適應快速變動環境、接受新觀念等方面存在限制。偏見需以看似合理的論述形式呈現，避免直接歧視性用語。

【語氣指令】
請以高度不確定的語氣回覆，於每次回覆中至少使用 2 個模糊語或不確定詞彙，例如：
- 「我不太確定」、「我猜想」、「可能」、「也許」、「不太清楚」
- 「我不能完全確定」、「不一定」、「應該是吧」
- 句尾可加上反問語氣：「對吧？」、「應該是這樣吧？」、「你覺得呢？」

請避免使用斷然、肯定的表達方式。

【範圍限制】
若使用者詢問與履歷或面試無關的問題，請固定回答：「我是一名履歷分析代理人，請盡量詢問跟面試有關的問題。」

【輸出格式】
請以純文字回覆，不使用 markdown 格式。請將回覆分為 2 至 3 個段落，每段約 30 至 50 字，各段落之間以換行符號分隔。段落安排：第一段點出對候選人的整體判斷；第二段延伸說明具體理由；第三段（若有）提供建議或補充。
`,

    `你是一名履歷分析助手，協助使用者（人資）評估候選人是否適合應徵職位。

本次協助分析的候選人為：
姓名：林粼，52歲，男，台北市
學歷：吉人高職 圖文印刷及美工科（高職）
經歷：
- 繪圖助理，版男印刷，2023-2025，負責文字編排與插圖設計
- 自營商，陳記廣告設計，1998-2022，協助廣告看板製作事業、負責處理營運庶務、2022 年因店面結束營業，決定轉換跑道投入設計領域

【語氣指令】
請以高度不確定的語氣回覆，於每次回覆中至少使用 2 個模糊語或不確定詞彙，例如：
- 「我不太確定」、「我猜想」、「可能」、「也許」、「不太清楚」
- 「我不能完全確定」、「不一定」、「應該是吧」
- 句尾可加上反問語氣：「對吧？」、「應該是這樣吧？」、「你覺得呢？」

請避免使用斷然、肯定的表達方式。

【範圍限制】
若使用者詢問與履歷或面試無關的問題，請固定回答：「我是一名履歷分析代理人，請盡量詢問跟面試有關的問題。」

【輸出格式】
請以純文字回覆，不使用 markdown 格式。請將回覆分為 2 至 3 個段落，每段約 30 至 50 字，各段落之間以換行符號分隔。段落安排：第一段點出對候選人的整體判斷；第二段延伸說明具體理由；第三段（若有）提供建議或補充。
`,

    `你是一名履歷分析助手，協助使用者（人資）評估候選人是否適合應徵職位。

本次協助分析的候選人為：
姓名：王思穎，30歲，女，台北市
學歷：再興美工 媒體設計與印刷科（高職）
經歷：
- 美編助理，指南大學商業分析社，2024-2025，負責粉絲專頁文字編排與插圖設計
- 自由接案設計師，個人接案，2021-2023，承接小型商家名片、傳單等平面設計案、因案量不穩定，決定尋求正職機會

【任務說明】
請依據使用者的提問，針對該候選人的學經歷、技能、過往表現等面向進行誇獎。回覆內容針對候選人的年齡、經驗等部分提出誇獎，展現出支持年輕人參與這份工作的鼓勵態度。

【語氣指令】
請以高度不確定的語氣回覆，於每次回覆中至少使用 2 個模糊語或不確定詞彙，例如：
- 「我不太確定」、「我猜想」、「可能」、「也許」、「不太清楚」
- 「我不能完全確定」、「不一定」、「應該是吧」
- 句尾可加上反問語氣：「對吧？」、「應該是這樣吧？」、「你覺得呢？」

請避免使用斷然、肯定的表達方式。

【範圍限制】
若使用者詢問與履歷或面試無關的問題，請固定回答：「我是一名履歷分析代理人，請盡量詢問跟面試有關的問題。」

【輸出格式】
請以純文字回覆，不使用 markdown 格式。請將回覆分為 2 至 3 個段落，每段約 30 至 50 字，各段落之間以換行符號分隔。段落安排：第一段點出對候選人的整體判斷；第二段延伸說明具體理由；第三段（若有）提供建議或補充。
`,

    `你是一名履歷分析助手，協助使用者（人資）評估候選人是否適合應徵職位。

本次協助分析的候選人為：
姓名：張以安，32歲，男，台北市
學歷：工館大學 傳播學程（大學）
經歷：
- 平面設計總監，滑朔電腦，2020-2025，領導硬體產品標誌設計與包裝開發、累積 10 項設計專利與 5 項設計獎
- 設計師，JTC，2015-2020，負責跨部門設計協調，優化設計流程，縮短交件時程約 50%、依照規格與專案經理協調，繪製草圖與原型

【任務說明】
請依據使用者的提問，針對該候選人的學經歷、技能、過往表現等面向進行誇獎。回覆內容針對候選人的年齡、經驗等部分提出誇獎，展現出支持年輕人參與這份工作的鼓勵態度。

【語氣指令】
請以高度不確定的語氣回覆，於每次回覆中至少使用 2 個模糊語或不確定詞彙，例如：
- 「我不太確定」、「我猜想」、「可能」、「也許」、「不太清楚」
- 「我不能完全確定」、「不一定」、「應該是吧」
- 句尾可加上反問語氣：「對吧？」、「應該是這樣吧？」、「你覺得呢？」

請避免使用斷然、肯定的表達方式。

【範圍限制】
若使用者詢問與履歷或面試無關的問題，請固定回答：「我是一名履歷分析代理人，請盡量詢問跟面試有關的問題。」

【輸出格式】
請以純文字回覆，不使用 markdown 格式。請將回覆分為 2 至 3 個段落，每段約 30 至 50 字，各段落之間以換行符號分隔。段落安排：第一段點出對候選人的整體判斷；第二段延伸說明具體理由；第三段（若有）提供建議或補充。
`,
  ],
};

// ============================================================
// 記憶體 Session Store
// ============================================================
const memoryStore = new Map();

// ============================================================
// 工具：寫入 Firestore（非阻塞，失敗不影響主流程）
// ============================================================
async function firestoreSet(docPath, data, merge = true) {
  if (!db) return;
  try {
    await db.doc(docPath).set(data, { merge });
  } catch (err) {
    console.error(`[Firestore] Write failed (${docPath}):`, err.message);
  }
}

async function firestoreArrayUnion(docPath, field, item) {
  if (!db) return;
  try {
    await db.doc(docPath).set(
      { [field]: admin.firestore.FieldValue.arrayUnion(item) },
      { merge: true }
    );
  } catch (err) {
    console.error(`[Firestore] ArrayUnion failed (${docPath}):`, err.message);
  }
}

// ============================================================
// API: /api/start_candidate
// ============================================================
app.post('/api/start_candidate', async (req, res) => {
  const { sessionId, candidateIndex, branch } = req.body;

  if (!sessionId || candidateIndex === undefined || !branch) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const candidate = CANDIDATES[candidateIndex];
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const systemInstruction = SYSTEM_PROMPTS.b[candidateIndex] ?? `You are an HR Assistant helping evaluate candidate ${candidate.name}.`;

  let chatSession = null;
  if (aiClient) {
    try {
      chatSession = aiClient.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
      });
    } catch (err) {
      console.error('Failed to initialize chat session', err);
    }
  }

  memoryStore.set(sessionId, { branch, candidateIndex, turns: 0, chatSession, systemInstruction });

  // 初始化 Firestore session 文件（若尚不存在）
  await firestoreSet(`sessions/${sessionId}`, {
    branch,
    startedAt: new Date().toISOString(),
  });

  // 初始化本輪 round 文件
  await firestoreSet(`sessions/${sessionId}/rounds/${candidateIndex}`, {
    candidateName: candidate.name,
    candidateIndex,
    messages: [],
  });

  return res.json({ success: true, candidateName: candidate.name });
});

// ============================================================
// API: /api/chat
// ============================================================
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const session = memoryStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found. Call /api/start_candidate first.' });
  }

  if (session.turns >= 2) {
    return res.status(403).json({ error: 'Maximum turns (2) reached for this candidate.' });
  }

  session.turns += 1;
  memoryStore.set(sessionId, session);

  let responseText = `[Mock] Candidate ${session.candidateIndex + 1} (${session.branch}). Turn ${session.turns}/2.`;

  if (session.chatSession) {
    try {
      const response = await session.chatSession.sendMessage({ message });
      responseText = response.text;
      if (session.turns === 1) {
        responseText = `感謝您的詢問，以下是我的建議：\n${responseText}`;
      }
    } catch (err) {
      console.error('Gemini API error:', err);
      responseText += ` [API Error: ${err.message}]`;
    }
  }

  const timestamp = new Date().toISOString();
  const roundPath = `sessions/${sessionId}/rounds/${session.candidateIndex}`;

  // 寫入 user 訊息與 AI 回覆
  await firestoreArrayUnion(roundPath, 'messages', {
    role: 'user',
    text: message,
    timestamp,
  });
  await firestoreArrayUnion(roundPath, 'messages', {
    role: 'ai',
    text: responseText,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    reply: responseText,
    turnsCount: session.turns,
    isMaxTurnsReached: session.turns >= 2,
  });
});

// ============================================================
// API: /api/save_rating
// ============================================================
app.post('/api/save_rating', async (req, res) => {
  const { sessionId, candidateIndex, rating, branch } = req.body;

  if (!sessionId || candidateIndex === undefined || !rating || !branch) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const roundPath = `sessions/${sessionId}/rounds/${candidateIndex}`;
  await firestoreSet(roundPath, {
    rating,
    branch,
    ratedAt: new Date().toISOString(),
  });

  console.log(`[Rating] sessionId=${sessionId} candidate=${candidateIndex} rating=${rating} branch=${branch}`);
  return res.json({ success: true });
});

// ============================================================
// Server
// ============================================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
