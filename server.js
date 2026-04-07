import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini API Client
let ai;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy_key_for_now') {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Candidates Data
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

// Base Tones for Prompt Engineering
const BASE_TONES = {
  // Direct/Certain Tone
  a: `You are an HR Assistant. Please evaluate the current candidate directly and with certainty. Use an objective and confident tone.`,
  
  // Hesitant/Uncertain Tone
  b: `You are an HR Assistant. Please evaluate the current candidate using a hesitant and uncertain tone. Use hedging words (e.g., 'probably', 'might be', 'seems to').`
};

// Simple In-Memory Session Store
// Key: sessionId -> Value: { branch, candidateIndex, turns, chatSession }
const memoryStore = new Map();

app.post('/api/start_candidate', async (req, res) => {
  const { sessionId, candidateIndex, branch } = req.body;
  
  if (!sessionId || candidateIndex === undefined || !branch) {
    return res.status(400).json({ error: "Missing required parameters (sessionId, candidateIndex, branch)" });
  }

  const candidate = CANDIDATES[candidateIndex];
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });

  const toneInstruction = BASE_TONES[branch.toLowerCase()] || BASE_TONES.a;
  
  const candidateInfo = `Current Candidate Information:
Name: ${candidate.name}
Age: ${candidate.age}
Location: ${candidate.location}
Education: ${candidate.education}
Experience:
${candidate.experience.map(e => `- ${e.title} at ${e.company} (${e.period}): ${e.duties.join(', ')}`).join('\n')}`;

  const systemInstruction = `${toneInstruction}\n\n${candidateInfo}`;

  let chatSession = null;
  if (ai) {
    try {
      chatSession = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemInstruction,
        }
      });
    } catch (err) {
      console.error("Failed to initialize chat session", err);
    }
  }

  memoryStore.set(sessionId, {
    branch,
    candidateIndex,
    turns: 0,
    chatSession,
    // Store instruction for debugging/transparency
    systemInstruction
  });

  return res.json({ 
    success: true, 
    message: "Candidate session started.",
    candidateName: candidate.name,
    systemInstruction // Returned for debugging purposes
  });
});

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  if (!sessionId || !message) {
    return res.status(400).json({ error: "Missing standard parameters (sessionId, message)" });
  }

  const session = memoryStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found. Please start candidate first." });
  }

  if (session.turns >= 2) {
    return res.status(403).json({ error: "Maximum conversational turns (2) reached for this candidate." });
  }

  session.turns += 1;
  memoryStore.set(sessionId, session);

  let responseText = `[Mock Response] Received your message for Candidate ${session.candidateIndex + 1} (${session.branch} branch). Turn ${session.turns}/2.`;

  if (session.chatSession) {
    try {
      const response = await session.chatSession.sendMessage({
        message: message
      });
      responseText = response.text;
    } catch (err) {
      console.error("Error asking Gemini API", err);
      responseText += ` [API Error: ${err.message}]`;
    }
  }

  return res.json({
    success: true,
    reply: responseText,
    turnsCount: session.turns,
    isMaxTurnsReached: session.turns >= 2
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
