import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, 
  orderBy, Timestamp, serverTimestamp, where, doc, setDoc, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Camera, CheckCircle, AlertTriangle, BarChart2, 
  Home, User, Save, X, ChevronRight, ChevronDown, 
  Droplets, Bed, History, FileText, Tag, Plus,
  AlertOctagon, AlertCircle, Info, ThumbsUp, Users, Search,
  Edit2, Trash2, UserPlus, Sparkles, Loader2, FileJson, Download, PenTool,
  MapPin, Clock, HelpCircle, Eye, Image as ImageIcon
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Gemini API Helper ---
const callGemini = async (prompt, isJson = false) => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: isJson ? { responseMimeType: "application/json" } : {}
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

// --- Constants & Data Structures ---
const FLOORS = [
  { floor: 2, start: 201, end: 213, skip: [] },
  { floor: 3, start: 301, end: 313, skip: [] },
  { floor: 4, start: 401, end: 412, skip: [404] },
  { floor: 5, start: 501, end: 513, skip: [511] },
];

const generateRooms = () => {
  const rooms = [];
  FLOORS.forEach(f => {
    for (let i = f.start; i <= f.end; i++) {
      if (!f.skip.includes(i)) rooms.push(i.toString());
    }
  });
  return rooms;
};

const ROOM_LIST = generateRooms();

// --- INITIAL SEED DATA ---
const INITIAL_BED_STAFF = [
  "王 佩貞", "何 欣怡", "何 渝沁", "吳 怡錚", "吳 至真", "吳 莉琦", "吳 瑞元", "宋 任翔", 
  "宋 珮瑄", "巫 季修", "李 姿樺", "李 昀儒", "汪 俐芸", "周 玗芯", "岳 宗瑩", "林 佳楓", 
  "林 姿華", "林 欣儀", "林 舒玟", "林 鈺婷", "邱 子儀", "邱 佳雯", "邱 淑敏", "邱 愛蓮", 
  "洪 筱慈", "韋 佳伶", "徐 丞甫", "徐 國庭", "高 宇辰", "張 佳婷", "張 峻誠", "張 益嘉", 
  "張 智元", "張 桀瑀", "張 桀瑀", "張 福源", "張 楷渝", "張 馨允", "曹 明瑜", "莊 佩潔", "莊 智盛", 
  "許 玉鳳", "許 凱涵", "郭 庭葳", "陳 芃臻", "陳 冠宏", "陳 姿綺", "陳 威畯", "陳 郁晴", 
  "陳 哲偉", "陳 彥朋", "陳 玠合", "陳 灝", "傅 貽瑞", "傅 昱獻", "曾 宜芬", "曾 映儒", 
  "游 淑君", "甘 雪吟", "華 翊筑", "黃 律婷", "黃 苙宸", "黃 渝培", "黃 嘉宏", "黃 鈺凱", 
  "楊 詠晴", "葉 巧瑩", "廖 姿惠", "管 晉偉", "劉 元", "劉 芳妙", "劉 炫飛", "劉 易修", 
  "劉陳 奕辰", "潘 彥伶", "蔡 語霈", "鄧 辰喆", "鄭 伃婷", "盧 思昀", "戴 妘秦", "戴 妤真", 
  "謝 京佑", "謝 承佑", "謝 秉豫", "謝 淳皓", "鍾 佳伶", "簡 廷宇", "顏 廷恩", "魏 伯珈", 
  "羅 敏瑄", "蘇 子晴", "錡 承恩", "薇度 莎比", "江 家莉", "彭 馨嫻"
].sort((a, b) => a.localeCompare(b, 'zh-TW'));

const INITIAL_WATER_STAFF = [
  "王 佩貞", "何 欣怡", "何 渝沁", "吳 怡錚", "吳 至真", "吳 莉琦", "吳 瑞元", "宋 珮瑄", 
  "巫 季修", "李 姿樺", "李 昀儒", "汪 俐芸", "周 玗芯", "岳 宗瑩", "林 佳楓", "林 姿華", 
  "林 欣儀", "林 舒玟", "林 鈺婷", "邱 子儀", "邱 佳雯", "邱 淑敏", "邱 愛蓮", "洪 筱慈", 
  "韋 佳伶", "徐 丞甫", "徐 國庭", "高 宇辰", "張 佳婷", "張 峻誠", "張 益嘉", "張 智元", 
  "張 桀瑀", "張 福源", "張 楷渝", "張 馨允", "曹 明瑜", "莊 佩潔", "莊 智盛", "許 玉鳳", 
  "許 凱涵", "郭 庭葳", "陳 芃臻", "陳 冠宏", "陳 姿綺", "陳 威畯", "陳 郁晴", "陳 哲偉", 
  "陳 彥朋", "陳 玠合", "陳 灝", "傅 貽瑞", "傅 昱獻", "曾 宜芬", "曾 映儒", "游 淑君", 
  "甘 雪吟", "華 翊筑", "黃 律婷", "黃 苙宸", "黃 渝培", "黃 嘉宏", "黃 鈺凱", "楊 詠晴", 
  "葉 巧瑩", "廖 姿惠", "管 晉偉", "劉 元", "劉 芳妙", "劉 炫飛", "劉 易修", "劉陳 奕辰", 
  "潘 彥伶", "蔡 語霈", "鄧 辰喆", "鄭 伃婷", "盧 思昀", "戴 妘秦", "戴 妤真", "謝 京佑", 
  "謝 承佑", "謝 秉豫", "謝 淳皓", "鍾 佳伶", "簡 廷宇", "顏 廷恩", "魏 伯珈", "羅 敏瑄", 
  "蘇 子晴", "錡 承恩", "薇度 莎比", "江 家莉", "彭 馨嫻"
].sort((a, b) => a.localeCompare(b, 'zh-TW'));

// --- UPDATED LOGIC: 100% Match with Assessment Files ---
const QUICK_ISSUES = {
  BED: [
    // GRADE A: 嚴重客訴/不通過 (Severe/Fail)
    { label: '遺留物/垃圾', grade: 'A', desc: '含自身用品/衣物/垃圾 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '毛髮/碎屑/蟲屍', grade: 'A', desc: '地板/抽屜明顯可見 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '備品未補/全空', grade: 'A', desc: '器皿/拖鞋/水全空 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '冰箱/器皿髒污', grade: 'A', desc: '內部污漬/杯具有水痕 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '陽台/戶外區髒污', grade: 'A', desc: '家具/地板/欄杆髒 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '鋪床污漬/破損', grade: 'A', desc: '床單/被套有髒污 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },

    // GRADE B: 品質缺失 (-10分)
    { label: '備品過期', grade: 'B', desc: '食品/飲料過期 (考核:-10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '高處/死角灰塵', grade: 'B', desc: '樓梯/檻燈/角落積塵 (考核:-10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    
    // GRADE C: 細節缺失 (-2分)
    { label: '鋪床不美觀/皺摺', grade: 'C', desc: '大於A5紙皺摺/不平 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '衣架/保險箱失誤', grade: 'C', desc: '數量不對/收納錯誤/有雜物 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '枕頭/抱枕擺放', grade: 'C', desc: '方向錯誤/凌亂 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '空調/燈光未重置', grade: 'C', desc: '溫度風量/門口燈 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '衛生紙/備品微調', grade: 'C', desc: '無三角形/污漬/未補滿 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
  ],
  WATER: [
    // GRADE A: 嚴重客訴/不通過 (Severe/Fail)
    { label: '熱水壺/杯盤髒污', grade: 'A', desc: '水漬/茶垢/破損 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '馬桶汙垢/尿漬', grade: 'A', desc: '未清潔乾淨 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '浴池青苔/髒汙', grade: 'A', desc: '內部/溢流區未刷 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '排水孔毛髮/異味', grade: 'A', desc: '堵塞/有垃圾 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '鏡面/玻璃嚴重水痕', grade: 'A', desc: '光照有明顯痕跡 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '地板濕滑/積水', grade: 'A', desc: '未擦乾 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '垃圾桶未清', grade: 'A', desc: '生理桶/垃圾桶有垃圾 (考核:不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },

    // GRADE B: 品質缺失 (-10分)
    { label: '嚴重水垢堆積', grade: 'B', desc: '溢流牆/出水口 (考核:-10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '溫泉水質/溫度', grade: 'B', desc: '雜質/過高過低 (考核:-10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '高處/死角蜘蛛網', grade: 'B', desc: '九宮格窗/天花板/出風口 (考核:-10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },

    // GRADE C: 細節缺失 (-2~-5分)
    { label: '備品補充/復歸', grade: 'C', desc: '捲筒紙/洗手乳距離/毛巾 (考核:-3~-5分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '五金水垢/皂垢', grade: 'C', desc: '水龍頭/洗手乳瓶底 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '設備歸位微調', grade: 'C', desc: '蓮蓬頭/木桶/水塞 (考核:-2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
  ]
};

const TEAMS_INFO = {
  WATER: {
    id: 'water',
    name: '水組',
    enName: 'Water Team',
    icon: <Droplets className="w-5 h-5" />,
    color: 'bg-[#4A6C6F] text-white shadow-lg shadow-[#4A6C6F]/30', // Muted Teal
    activeBg: 'bg-[#4A6C6F]',
    lightColor: 'bg-[#EBF2F2] text-[#2C4A4D]',
    borderColor: 'border-[#4A6C6F]', // For side indicator
    issues: QUICK_ISSUES.WATER
  },
  BED: {
    id: 'bed',
    name: '床組',
    enName: 'Bed Team',
    icon: <Bed className="w-5 h-5" />,
    color: 'bg-[#8B5E3C] text-white shadow-lg shadow-[#8B5E3C]/30', // Warm Wood
    activeBg: 'bg-[#8B5E3C]',
    lightColor: 'bg-[#F5F0EB] text-[#5A3A29]',
    borderColor: 'border-[#8B5E3C]', // For side indicator
    issues: QUICK_ISSUES.BED
  }
};

const ERROR_GRADES = {
  A: { label: 'A級 (不通過)', desc: '嚴重客訴風險', icon: <AlertOctagon size={18}/>, color: 'bg-[#8B3A3A] text-white border-none shadow-md shadow-red-900/20' }, // Deep Madder
  B: { label: 'B級 (扣10分)', desc: '品質缺失', icon: <AlertTriangle size={18}/>, color: 'bg-[#D97706] text-white border-none shadow-md shadow-orange-900/20' }, // Amber
  C: { label: 'C級 (扣2-5分)', desc: '細節微調', icon: <Info size={18}/>, color: 'bg-[#B45309] text-white border-none shadow-md shadow-yellow-900/20' }, // Darker Yellow/Brown
};

// --- Helper Functions ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

const drawCircleOnImage = (imageSrc, x, y) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Draw Red Circle
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, 2 * Math.PI);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#EF4444'; // Tailwind Red-500
      ctx.stroke();
      
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8 min-h-screen bg-[#F5F5F0]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2C2C2C]"></div>
      <p className="text-[#555] tracking-widest text-xs font-serif">載入中...</p>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [roomsData, setRoomsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inspection Form State
  const [selectedRoom, setSelectedRoom] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [bedStaff, setBedStaff] = useState('');
  const [waterStaff, setWaterStaff] = useState('');
  const [activeTab, setActiveTab] = useState('water'); // Default to WATER
  const [issues, setIssues] = useState([]);
  
  // Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState({
    team: 'water', // Default
    title: '',
    grade: 'C',
    note: '',
    photo: null,
    isCustom: false // Flag for custom inputs
  });

  // History & Photo Viewing State
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); 

  // AI & Loading
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isReportLoading, setReportLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  // Staff Selection
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalTarget, setStaffModalTarget] = useState(null); 
  const [staffSearch, setStaffSearch] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); 
  const [newStaffName, setNewStaffName] = useState('');
  const [staffLists, setStaffLists] = useState({ bed: INITIAL_BED_STAFF, water: INITIAL_WATER_STAFF });

  // History Edit Staff Modal State
  const [showEditHistoryStaffModal, setShowEditHistoryStaffModal] = useState(false);
  const [historyEditTarget, setHistoryEditTarget] = useState(null); 

  const imageRef = useRef(null);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    const savedInspector = localStorage.getItem('lastInspector');
    if (savedInspector) setInspectorName(savedInspector);
    
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'inspections'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRoomsData(data);
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'staff_list');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStaffLists({
          bed: (data.bed || []).sort((a, b) => a.localeCompare(b, 'zh-TW')),
          water: (data.water || []).sort((a, b) => a.localeCompare(b, 'zh-TW'))
        });
      } else {
        setDoc(docRef, { bed: INITIAL_BED_STAFF, water: INITIAL_WATER_STAFF }).catch(console.error);
      }
    }, console.error);
    return () => unsubscribe();
  }, [user]);

  // --- Actions ---

  const handleAiRefine = async () => {
    if (!currentIssue.note) return alert("請輸入描述");
    setIsAiLoading(true);
    try {
      const prompt = `
        你是虹夕諾雅 谷關的專業房務檢查員。改寫筆記為專業描述並判斷等級。
        等級：A(不通過)、B(扣10分)、C(扣2-5分)。
        筆記：${currentIssue.note}
        回傳JSON: { "title": "...", "note": "...", "grade": "A"|"B"|"C" }
      `;
      const txt = await callGemini(prompt, true);
      if (txt) {
        const res = JSON.parse(txt);
        setCurrentIssue(p => ({ ...p, title: res.title, note: res.note, grade: res.grade }));
      }
    } catch (e) { alert("AI Error"); } 
    finally { setIsAiLoading(false); }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const recentData = roomsData.slice(0, 30).map(r => ({
        room: r.roomId,
        issues: r.issues?.map(i => `${i.title}(${i.grade})`).join(', ') || 'PASS'
      }));
      const prompt = `
        你是房務經理。根據數據生成「房務品質日報」。
        數據：${JSON.stringify(recentData)}
        包含：📊今日概況、⚠️重點缺失、💡改善建議。Markdown格式。
      `;
      const report = await callGemini(prompt, false);
      setAiReport(report);
    } catch (e) { alert("Report Error"); }
    finally { setReportLoading(false); }
  };

  const handleExportCSV = () => {
    if (roomsData.length === 0) return alert("無資料");
    const headers = ["日期", "房號", "查房員", "床組人員", "水組人員", "缺失項目", "等級", "備註", "有無照片"];
    const csvRows = [];
    roomsData.forEach(room => {
      const date = room.createdAt?.seconds ? new Date(room.createdAt.seconds * 1000).toLocaleDateString('zh-TW') : '';
      if (!room.issues || room.issues.length === 0) {
        csvRows.push([date, room.roomId, room.inspector, room.bedStaff || '未填寫', room.waterStaff || '未填寫', "無 (PASS)", "", "", "否"]);
      } else {
        room.issues.forEach(issue => {
          csvRows.push([
            date, room.roomId, room.inspector, room.bedStaff || '未填寫', room.waterStaff || '未填寫',
            issue.title, issue.grade, `"${(issue.note || '').replace(/"/g, '""')}"`, issue.photo ? "有" : "否"
          ]);
        });
      }
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Hoshinoya_Inspection_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const openQuickIssue = (tpl) => {
    setCurrentIssue({ 
      team: activeTab, 
      title: tpl.label, 
      grade: tpl.grade, 
      note: '', 
      photo: null,
      isCustom: false 
    });
    setShowIssueModal(true);
  };

  const openCustomIssue = () => {
    setCurrentIssue({
      team: activeTab,
      title: '', 
      grade: 'C',
      note: '',
      photo: null,
      isCustom: true
    });
    setShowIssueModal(true);
  };

  const saveIssue = () => {
    if (!currentIssue.title) return alert("請輸入缺失內容");
    setIssues([...issues, { ...currentIssue, id: Date.now() }]);
    setShowIssueModal(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setCurrentIssue({ ...currentIssue, photo: compressed });
    }
  };

  const handleImageClick = async (e) => {
    if (!currentIssue.photo) return;
    const rect = e.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (e.target.width / rect.width); // Scale coords
    const y = (e.clientY - rect.top) * (e.target.height / rect.height);
    const newPhoto = await drawCircleOnImage(currentIssue.photo, x * (800/e.target.width), y * (800/e.target.width));
    setCurrentIssue({ ...currentIssue, photo: newPhoto });
  };

  // Staff Logic
  const openStaffSelector = (target) => {
    setStaffModalTarget(target); setStaffSearch(''); setIsEditMode(false); setNewStaffName(''); setShowStaffModal(true);
  };
  
  const selectStaff = async (name) => {
    if (!historyEditTarget) {
      if (staffModalTarget === 'inspector') { setInspectorName(name); localStorage.setItem('lastInspector', name); }
      else if (staffModalTarget === 'bed') setBedStaff(name);
      else if (staffModalTarget === 'water') setWaterStaff(name);
      setShowStaffModal(false);
    } else {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inspections', historyEditTarget.docId);
        const updates = {};
        if (historyEditTarget.type === 'bed') updates.bedStaff = name;
        if (historyEditTarget.type === 'water') updates.waterStaff = name;
        await updateDoc(docRef, updates);
        setHistoryEditTarget(null);
        setShowStaffModal(false);
      } catch(e) { console.error(e); alert("更新失敗"); }
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'staff_list');
    try {
      const updates = {};
      if (staffModalTarget !== 'water') updates.bed = arrayUnion(newStaffName.trim());
      if (staffModalTarget !== 'bed') updates.water = arrayUnion(newStaffName.trim());
      await updateDoc(docRef, updates);
      setNewStaffName('');
    } catch (e) { alert("Error"); }
  };
  const handleRemoveStaff = async (name) => {
    if (!confirm(`移除 ${name}?`)) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'staff_list');
    try {
      await updateDoc(docRef, { bed: arrayRemove(name), water: arrayRemove(name) });
    } catch (e) { alert("Error"); }
  };
  const getCurrentStaffList = () => {
    if (staffModalTarget === 'bed' || historyEditTarget?.type === 'bed') return staffLists.bed;
    if (staffModalTarget === 'water' || historyEditTarget?.type === 'water') return staffLists.water;
    return Array.from(new Set([...staffLists.bed, ...staffLists.water])).sort((a, b) => a.localeCompare(b, 'zh-TW'));
  };

  const openHistoryStaffEdit = (recordId, type) => {
    setHistoryEditTarget({ docId: recordId, type });
    setStaffModalTarget(type); 
    setStaffSearch('');
    setIsEditMode(false);
    setShowStaffModal(true);
  };

  const handleSubmitInspection = async () => {
    if (!selectedRoom || !inspectorName) return alert("請填寫房號與查房員姓名 (必填)");
    
    let confirmMsg = "";
    if (issues.length === 0) {
        confirmMsg = "目前無缺失紀錄，確定要提交「PASS」嗎？";
    } else {
        confirmMsg = `確定提交 ${selectedRoom} 房的查房紀錄？\n共 ${issues.length} 項缺失`;
    }

    if ((!bedStaff || !waterStaff) && !confirm("尚未填寫掃房人員 (床/水)，確定先提交嗎？\n(提交後可於歷史紀錄補填)")) return;
    else if (!confirm(confirmMsg)) return;
    
    const payload = {
      roomId: selectedRoom, 
      inspector: inspectorName, 
      bedStaff: bedStaff || '', 
      waterStaff: waterStaff || '', 
      issues, 
      issueCount: issues.length, 
      hasGradeA: issues.some(i => i.grade === 'A'),
      createdAt: serverTimestamp(), 
      monthKey: new Date().toISOString().slice(0, 7)
    };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inspections'), payload);
      alert("提交成功!");
      setSelectedRoom(''); setBedStaff(''); setWaterStaff(''); setIssues([]); setView('home');
    } catch (e) { 
      console.error(e);
      alert("提交失敗，請檢查網路連線"); 
    }
  };

  // --- Views ---
  const renderHome = () => (
    <div className="flex flex-col h-full bg-[#F5F5F0] font-sans">
      <div className="bg-[#2C2C2C] text-[#E0E0E0] p-8 pt-14 pb-12 rounded-b-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-serif tracking-[0.2em] mb-2 font-light text-white">HOSHINOYA</h1>
          <p className="text-[#888] text-xs tracking-[0.3em] uppercase">Guguan Housekeeping</p>
        </div>
        <div className="absolute right-[-40px] top-[-40px] w-64 h-64 border-[1px] border-white/5 rounded-full pointer-events-none"></div>
        <div className="absolute left-[-20px] bottom-[-20px] w-32 h-32 border-[1px] border-white/5 rounded-full pointer-events-none"></div>
      </div>

      <div className="flex-1 px-6 py-8 space-y-5 -mt-6">
        <button onClick={() => setView('inspect')} className="w-full bg-white p-6 rounded-2xl shadow-xl shadow-[#2C2C2C]/5 border border-white/50 flex items-center justify-between group active:scale-[0.98] transition-all duration-300">
          <div className="flex items-center gap-5"><div className="bg-[#2C2C2C] text-white p-4 rounded-full shadow-lg"><CheckCircle size={28} strokeWidth={1.5} /></div><div className="text-left"><h3 className="text-xl font-serif font-medium text-[#2C2C2C] tracking-wide">開始查房</h3><p className="text-[#888] text-xs mt-1 tracking-wider">Start Inspection</p></div></div><div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#2C2C2C] group-hover:bg-[#E0E0E0] transition-colors"><ChevronRight size={20} /></div>
        </button>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView('history')} className="bg-white p-5 rounded-2xl shadow-md border border-white/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-3"><div className="bg-[#EBF2F2] p-3 rounded-full text-[#4A6C6F]"><History size={24} strokeWidth={1.5} /></div><span className="font-medium text-[#2C2C2C] text-sm tracking-widest">歷史紀錄</span></button>
          <button onClick={() => setView('analytics')} className="bg-white p-5 rounded-2xl shadow-md border border-white/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-3"><div className="bg-[#F5F0EB] p-3 rounded-full text-[#8B5E3C]"><BarChart2 size={24} strokeWidth={1.5} /></div><span className="font-medium text-[#2C2C2C] text-sm tracking-widest">數據統計</span></button>
        </div>
        <div className="bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm mt-4">
           <div className="flex items-center justify-between text-xs text-[#666]">
             <span className="flex items-center gap-1"><Clock size={12}/> 本月檢查: <b className="text-[#2C2C2C] ml-1">{roomsData.length}</b> 間</span>
             <span className="flex items-center gap-1">異常率: <b className="text-[#8B3A3A] ml-1">{roomsData.length ? ((roomsData.reduce((a,c)=>a+(c.issueCount?1:0),0)/roomsData.length)*100).toFixed(0) : 0}%</b></span>
           </div>
        </div>
      </div>
    </div>
  );

  const renderInspection = () => {
    const team = TEAMS_INFO[activeTab.toUpperCase()];
    return (
      <div className="flex flex-col h-full bg-[#F5F5F0]">
        <div className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20 border-b border-[#E0E0E0]">
          <button onClick={() => setView('home')} className="text-[#555] active:text-black transition-colors"><X size={24} strokeWidth={1.5} /></button>
          <div className="relative">
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="appearance-none bg-[#F0F0F0] text-[#2C2C2C] font-serif font-bold text-lg py-2 px-8 rounded-full text-center border-none focus:ring-2 focus:ring-[#8B5E3C]/20 outline-none"><option value="">選擇房號</option>{ROOM_LIST.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none"><ChevronDown size={14} /></div>
          </div>
          <div className="w-6"></div>
        </div>
        <div className="flex-1 overflow-y-auto pb-36 p-5 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {['inspector', 'water', 'bed'].map(t => (
              <div key={t} onClick={() => openStaffSelector(t)} className={`flex flex-col justify-center items-center p-3 rounded-xl cursor-pointer transition-all border ${(t === 'inspector' && inspectorName) || (t === 'bed' && bedStaff) || (t === 'water' && waterStaff) ? 'bg-white border-[#2C2C2C]/10 shadow-sm' : 'bg-transparent border-dashed border-[#BBB] opacity-70'} active:scale-95`}>
                <span className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1">{t === 'inspector' ? '查房員*' : t === 'bed' ? '床組' : '水組'}</span>
                <div className="font-bold text-[#2C2C2C] text-sm truncate w-full text-center">
                  {t === 'inspector' ? (inspectorName || <span className="text-[#CCC]">+</span>) 
                   : t === 'bed' ? (bedStaff || <span className="text-[#BBB] text-xs">待確認...</span>) 
                   : (waterStaff || <span className="text-[#BBB] text-xs">待確認...</span>)}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-[#E0E0E0] flex">
            {Object.values(TEAMS_INFO).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${activeTab === t.id ? t.color : 'text-[#999] hover:bg-[#F9F9F9]'}`}>{t.icon}<span className="tracking-widest">{t.name}</span></button>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 px-1"><span className="w-1 h-4 bg-[#2C2C2C] rounded-full"></span><h3 className="font-serif font-bold text-[#444] text-sm tracking-widest">檢查項目</h3></div>
            <div className="grid grid-cols-2 gap-3">
              {team.issues.map((issue, idx) => (
                <button key={idx} onClick={() => openQuickIssue(issue)} className={`p-4 rounded-xl border text-left active:scale-[0.97] transition-all bg-white shadow-sm hover:shadow-md ${issue.color} border-transparent`}>
                  <div className="flex justify-between items-start mb-2"><span className="font-bold text-base leading-tight text-[#2C2C2C]">{issue.label}</span></div>
                  <div className="flex justify-between items-end"><span className="text-xs text-[#666] leading-tight w-2/3">{issue.desc}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white/80 backdrop-blur-sm shadow-sm ${issue.grade === 'A' ? 'text-red-800 border-red-200' : issue.grade === 'B' ? 'text-orange-700 border-orange-200' : 'text-yellow-700 border-yellow-200'}`}>{issue.grade}</span></div>
                </button>
              ))}
              <button onClick={openCustomIssue} className="p-4 rounded-xl border-2 border-dashed border-[#DDD] flex flex-col items-center justify-center text-[#999] hover:bg-white hover:border-[#BBB] transition-colors"><Plus size={24} className="mb-1 opacity-50" /><span className="text-xs font-bold tracking-widest">自定義缺失</span></button>
            </div>
          </div>
          {issues.length > 0 && (
            <div className="animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className="flex items-center gap-2 mb-3 px-1"><span className="w-1 h-4 bg-[#8B3A3A] rounded-full"></span><h3 className="font-serif font-bold text-[#444] text-sm tracking-widest">已記錄 ({issues.length})</h3></div>
              <div className="space-y-3">
                {issues.map(i => (
                  <div key={i.id} className={`bg-white p-3 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${TEAMS_INFO[i.team.toUpperCase()].borderColor}`}>
                    {i.photo ? <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-[#EEE]"><img src={i.photo} className="w-full h-full object-cover" alt="evidence" /></div> : <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center ${TEAMS_INFO[i.team.toUpperCase()].lightColor}`}><Info className="opacity-30" size={24}/></div>}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                           <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${i.team === 'water' ? 'text-[#4A6C6F]' : 'text-[#8B5E3C]'}`}>{i.team === 'water' ? '水組' : '床組'}</span>
                           <h4 className="font-bold text-[#2C2C2C] text-sm truncate">{i.title}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0 ${(ERROR_GRADES[i.grade] || ERROR_GRADES['C']).color}`}>{i.grade}級</span>
                      </div>
                      <p className="text-xs text-[#888] mt-1 line-clamp-2">{i.note || "無補充說明"}</p>
                    </div>
                    <button onClick={() => setIssues(issues.filter(x => x.id !== i.id))} className="text-[#DDD] hover:text-[#8B3A3A] p-1 self-center"><X size={20} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#E0E0E0] p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30 md:absolute">
          <button onClick={handleSubmitInspection} className="w-full bg-[#2C2C2C] text-white py-4 rounded-xl font-serif font-bold text-lg shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-3 tracking-widest hover:bg-[#1a1a1a]"><Save size={20} />{issues.length > 0 ? `提交 (${issues.length}項缺失)` : '提交 (PASS 無缺失)'}</button>
        </div>
        {showIssueModal && (
          <div className="fixed inset-0 z-50 bg-[#2C2C2C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-[#F9F9F9] w-full sm:max-w-md rounded-t-3xl p-6 space-y-6 animate-in slide-in-from-bottom-10 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#E0E0E0] pb-4"><h3 className="font-serif font-bold text-xl text-[#2C2C2C]">{currentIssue.title || '新增缺失'}</h3><button onClick={() => setShowIssueModal(false)} className="p-2 bg-white rounded-full text-[#888]"><X size={20}/></button></div>
              {(currentIssue.isCustom || !currentIssue.title) && <input className="w-full p-4 bg-white border border-[#E0E0E0] rounded-xl font-bold text-[#2C2C2C] focus:border-[#8B5E3C] outline-none" placeholder="輸入缺失名稱..." value={currentIssue.title} onChange={e => setCurrentIssue({...currentIssue, title: e.target.value})} />}
              <div>
                <label className="text-xs text-[#888] font-bold uppercase tracking-widest mb-2 block">嚴重等級</label>
                <div className="flex gap-2">{Object.entries(ERROR_GRADES).map(([k, v]) => <button key={k} onClick={() => setCurrentIssue({...currentIssue, grade: k})} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentIssue.grade === k ? v.color + ' ring-2 ring-offset-2 ring-[#2C2C2C]/20' : 'bg-white text-[#888] border-[#E0E0E0]'}`}>{v.icon}<span className="text-xs font-bold">{v.label}</span></button>)}</div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative"><label className="text-xs text-[#888] font-bold uppercase tracking-widest mb-2 block">補充說明</label><textarea className="w-full p-3 bg-white border border-[#E0E0E0] rounded-xl text-sm h-32 focus:border-[#8B5E3C] outline-none resize-none" placeholder="詳細描述位置與狀況..." value={currentIssue.note} onChange={e => setCurrentIssue({...currentIssue, note: e.target.value})} /><button onClick={handleAiRefine} disabled={isAiLoading} className="absolute bottom-3 right-3 p-2 bg-gradient-to-br from-[#4A6C6F] to-[#2C4A4D] text-white rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all">{isAiLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}</button></div>
                <div className="w-32"><label className="text-xs text-[#888] font-bold uppercase tracking-widest mb-2 block">照片證據</label><div className="h-32 relative"><label className="w-full h-full rounded-xl border-2 border-dashed border-[#CCC] flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-[#F5F5F5] transition-colors overflow-hidden relative group">{currentIssue.photo ? <><img src={currentIssue.photo} className="w-full h-full object-cover" onClick={handleImageClick} /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity pointer-events-none">點擊圈選</div></> : <div className="flex flex-col items-center gap-1"><Camera className="text-[#CCC]" /><span className="text-[10px] text-[#CCC] font-bold">上傳/拍照</span></div>}<input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label></div></div>
              </div>
              <button onClick={saveIssue} className="w-full bg-[#2C2C2C] text-white py-4 rounded-xl font-bold text-lg tracking-widest shadow-lg active:scale-[0.98]">確認儲存</button>
            </div>
          </div>
        )}
        {showStaffModal && (
          <div className="fixed inset-0 z-50 bg-[#2C2C2C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-[#F9F9F9] w-full sm:max-w-md h-[85vh] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom-10 shadow-2xl">
              <div className="p-5 border-b border-[#E0E0E0] flex justify-between items-center bg-white rounded-t-3xl"><h3 className="font-serif font-bold text-lg text-[#2C2C2C]">{historyEditTarget ? '補填人員' : '選擇人員'}</h3><div className="flex gap-3">{!historyEditTarget && <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-full transition-colors ${isEditMode ? 'bg-[#2C2C2C] text-white' : 'bg-[#F0F0F0] text-[#555]'}`}><Edit2 size={18}/></button>}<button onClick={() => {setShowStaffModal(false); setHistoryEditTarget(null);}} className="p-2 bg-[#F0F0F0] rounded-full text-[#555]"><X size={18}/></button></div></div>
              <div className="p-4 bg-white border-b border-[#E0E0E0]"><div className="relative"><Search className="absolute left-3 top-3 text-[#BBB]" size={18} /><input className="w-full bg-[#F5F5F0] p-3 pl-10 rounded-xl font-bold text-[#2C2C2C] outline-none placeholder:text-[#CCC]" placeholder="搜尋姓名..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)} /></div></div>
              {isEditMode && !historyEditTarget && <div className="p-4 bg-[#F5F5F0] border-b border-[#E0E0E0] flex gap-2 animate-in slide-in-from-top-2"><input className="flex-1 bg-white border border-[#E0E0E0] p-3 rounded-xl outline-none" placeholder="輸入新名字..." value={newStaffName} onChange={e => setNewStaffName(e.target.value)} /><button onClick={handleAddStaff} className="bg-[#2C2C2C] text-white px-5 rounded-xl font-bold shadow-md active:scale-95">加入</button></div>}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3 bg-[#F9F9F9]">{getCurrentStaffList().filter(n => n.includes(staffSearch)).map(n => <div key={n} className="relative group"><button onClick={() => !isEditMode && selectStaff(n)} className="w-full py-3 bg-white border border-[#E0E0E0] rounded-xl font-bold text-[#444] shadow-sm active:scale-95 transition-all text-sm hover:border-[#8B5E3C]">{n}</button>{isEditMode && !historyEditTarget && <button onClick={() => handleRemoveStaff(n)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"><X size={10}/></button>}</div>)}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="flex flex-col h-full bg-[#F5F5F0]">
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-[#E0E0E0] flex justify-between items-center sticky top-0 z-10"><div className="flex items-center"><button onClick={() => setView('home')} className="text-[#555] active:text-black"><X size={24} /></button><h2 className="font-serif font-bold text-xl ml-3 text-[#2C2C2C]">數據分析</h2></div><div className="flex gap-2"><button onClick={handleExportCSV} className="flex items-center gap-1 px-4 py-2 bg-[#EBF2F2] text-[#4A6C6F] rounded-lg text-xs font-bold border border-[#4A6C6F]/20 hover:bg-[#D6E4E5] transition-colors"><Download size={14} /> 匯出</button><button onClick={handleGenerateReport} disabled={isReportLoading} className="flex items-center gap-1 px-4 py-2 bg-[#F0E6FA] text-[#6B46C1] rounded-lg text-xs font-bold border border-[#6B46C1]/20 hover:bg-[#E9D8FD] transition-colors disabled:opacity-50">{isReportLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} AI 戰報</button></div></div>
      <div className="p-6 space-y-6 overflow-y-auto pb-20">
        {aiReport && <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#6B46C1]/20 animate-in slide-in-from-top-5"><div className="flex justify-between items-start mb-4 border-b border-[#F0F0F0] pb-2"><h3 className="font-serif font-bold text-[#2C2C2C] flex items-center gap-2"><FileJson size={20} className="text-[#6B46C1]" /> 房務品質日報</h3><button onClick={() => setAiReport(null)} className="text-[#CCC] hover:text-[#555]"><X size={18}/></button></div><div className="prose prose-sm prose-indigo max-w-none text-[#555] whitespace-pre-line leading-relaxed font-sans">{aiReport}</div></div>}
        <div className="grid grid-cols-2 gap-5"><div className="bg-white p-5 rounded-2xl shadow-sm border border-[#F0F0F0]"><p className="text-xs text-[#888] font-bold uppercase tracking-widest">本月檢查</p><p className="text-4xl font-serif font-medium text-[#2C2C2C] mt-2">{roomsData.length}</p></div><div className="bg-white p-5 rounded-2xl shadow-sm border border-[#F0F0F0]"><p className="text-xs text-[#888] font-bold uppercase tracking-widest">發現缺失</p><p className="text-4xl font-serif font-medium text-[#8B3A3A] mt-2">{roomsData.reduce((a,c) => a + (c.issueCount||0), 0)}</p></div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0F0F0]"><h3 className="font-serif font-bold text-[#2C2C2C] mb-5 flex items-center gap-2"><AlertCircle size={18} className="text-[#8B3A3A]" /> 高頻失誤項目</h3><div className="space-y-4">{Object.entries(roomsData.flatMap(r => r.issues||[]).reduce((a,i) => ({...a, [i.title]: (a[i.title]||0)+1}), {})).sort(([,a], [,b]) => b-a).slice(0, 5).map(([t,c],i) => <div key={t} className="flex justify-between items-center border-b border-[#F5F5F0] pb-3 last:border-0"><div className="flex items-center gap-4"><span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i===0 ? 'bg-[#8B3A3A] text-white' : 'bg-[#F0F0F0] text-[#888]'}`}>{i+1}</span><span className="font-medium text-[#444] text-sm">{t}</span></div><span className="font-bold text-[#2C2C2C] bg-[#F5F5F0] px-2 py-1 rounded-md text-xs">{c} 次</span></div>)}</div></div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="flex flex-col h-full bg-[#F5F5F0]">
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-[#E0E0E0] flex items-center sticky top-0 z-10"><button onClick={() => setView('home')} className="text-[#555] active:text-black"><X size={24} /></button><h2 className="font-serif font-bold text-xl ml-3 text-[#2C2C2C]">歷史紀錄</h2></div>
      <div className="p-6 space-y-4 overflow-y-auto pb-20">
        {roomsData.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-2xl border border-[#F0F0F0] shadow-sm hover:shadow-md transition-shadow" onClick={() => setSelectedHistoryItem(r)}>
            <div className="flex justify-between items-start mb-3"><div><h3 className="text-2xl font-serif font-medium text-[#2C2C2C]">{r.roomId} <span className="text-sm font-sans text-[#888] font-normal">房</span></h3><span className="text-xs text-[#999] tracking-wider">{r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : ''}</span></div>{r.hasGradeA ? <span className="bg-[#FFF5F5] text-[#8B3A3A] text-[10px] font-bold px-2 py-1 rounded border border-[#FED7D7]">A級異常</span> : <span className="bg-[#F0FFF4] text-[#2F855A] text-[10px] font-bold px-2 py-1 rounded border border-[#C6F6D5]">PASS</span>}</div>
            <div className="text-sm text-[#666] mb-4 p-3 bg-[#F9F9F9] rounded-xl flex justify-between items-center">
              <span className="font-bold text-[#2C2C2C] flex items-center gap-1"><User size={14}/> {String(r.inspector)}</span>
              <div className="h-4 w-[1px] bg-[#DDD]"></div>
              {r.bedStaff ? (
                <span className="text-xs">床: {String(r.bedStaff)}</span>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); openHistoryStaffEdit(r.id, 'bed'); }} className="text-xs text-indigo-500 font-bold border border-indigo-200 px-2 py-0.5 rounded bg-white hover:bg-indigo-50 flex items-center gap-1"><HelpCircle size={10}/> 補填床組</button>
              )}
              <div className="h-4 w-[1px] bg-[#DDD]"></div>
              {r.waterStaff ? (
                <span className="text-xs">水: {String(r.waterStaff)}</span>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); openHistoryStaffEdit(r.id, 'water'); }} className="text-xs text-indigo-500 font-bold border border-indigo-200 px-2 py-0.5 rounded bg-white hover:bg-indigo-50 flex items-center gap-1"><HelpCircle size={10}/> 補填水組</button>
              )}
            </div>
            {r.issues && r.issues.length > 0 ? <div className="flex flex-wrap gap-2">{r.issues.map((i, idx) => <span key={idx} className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 ${(ERROR_GRADES[i.grade] || ERROR_GRADES['C']).color.replace('text-white', 'text-[#2C2C2C]').replace('bg-', 'bg-opacity-10 bg-')}`}>{i.title}</span>)}</div> : <div className="px-3 py-2 bg-[#F0FFF4] text-[#2F855A] rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2"><CheckCircle size={16} /> 無缺失通過</div>}
          </div>
        ))}
        {roomsData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[#CCC]">
            <History size={48} className="mb-4 opacity-20"/>
            <p>尚無歷史紀錄</p>
          </div>
        )}
      </div>

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-50 bg-[#2C2C2C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-[#F9F9F9] w-full sm:max-w-md h-[80vh] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom-10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E0E0E0] flex justify-between items-center bg-white">
               <div>
                  <h3 className="font-serif font-bold text-xl text-[#2C2C2C]">{selectedHistoryItem.roomId}房 詳情</h3>
                  <p className="text-xs text-[#888]">{new Date(selectedHistoryItem.createdAt.seconds * 1000).toLocaleString('zh-TW')}</p>
               </div>
               <button onClick={() => setSelectedHistoryItem(null)} className="p-2 bg-[#F0F0F0] rounded-full text-[#555]"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
               {(!selectedHistoryItem.issues || selectedHistoryItem.issues.length === 0) ? (
                 <div className="flex flex-col items-center justify-center h-40 text-[#2F855A]">
                   <CheckCircle size={48} className="mb-2"/>
                   <p className="font-bold">PASS 無缺失</p>
                 </div>
               ) : (
                 selectedHistoryItem.issues.map((i, idx) => (
                   <div key={idx} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm ${TEAMS_INFO[i.team?.toUpperCase() || 'BED'].borderColor}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 block ${i.team === 'water' ? 'text-[#4A6C6F]' : 'text-[#8B5E3C]'}`}>{i.team === 'water' ? '水組' : '床組'}</span>
                          <h4 className="font-bold text-[#2C2C2C]">{i.title}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(ERROR_GRADES[i.grade] || ERROR_GRADES['C']).color}`}>{i.grade}級</span>
                      </div>
                      <p className="text-sm text-[#666] mb-3 bg-[#F9F9F9] p-2 rounded">{i.note || "無補充說明"}</p>
                      {i.photo && (
                        <div className="rounded-lg overflow-hidden border border-[#EEE]">
                          <img 
                            src={i.photo} 
                            className="w-full h-auto object-cover cursor-zoom-in" 
                            alt="缺失照片"
                            onClick={() => setPreviewImage(i.photo)}
                          />
                        </div>
                      )}
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full object-contain" alt="Full Preview" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X size={24}/></button>
        </div>
      )}
    </div>
  );

  if (loading) return <LoadingSpinner />;
  return (
    <div className="bg-[#E0E0E0] min-h-screen font-sans text-[#2C2C2C] md:max-w-md md:mx-auto md:shadow-2xl md:min-h-0 md:h-screen md:overflow-hidden md:relative">
      <div className="h-full overflow-hidden bg-[#F5F5F0]">
        {view === 'home' && renderHome()}
        {view === 'inspect' && renderInspection()}
        {view === 'history' && renderHistory()}
        {view === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
}
