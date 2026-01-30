import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, 
  orderBy, Timestamp, serverTimestamp, where, doc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Camera, CheckCircle, AlertTriangle, BarChart2, 
  Home, User, Save, X, ChevronRight, ChevronDown, 
  Droplets, Bed, History, FileText, Tag, Plus,
  AlertOctagon, AlertCircle, Info, ThumbsUp, Users, Search,
  Edit2, Trash2, UserPlus, Sparkles, Loader2, FileJson, Download, PenTool,
  MapPin, Clock, HelpCircle, Eye, Image as ImageIcon, Lock, Grid
} from 'lucide-react';

// --- Firebase 初始設定 (已修正為讀取 Vercel 環境變數) ---
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'hoshinoya-inspection-production'; // 固定 ID 確保資料庫路徑穩定

// --- Gemini API 輔助函式 ---
const callGemini = async (prompt, isJson = false) => {
  const apiKey = import.meta.env.VITE_GEMINI_KEY; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
  
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
    if (!response.ok) throw new Error(`API 錯誤: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API 錯誤:", error);
    return null;
  }
};

// --- 子元件 ---
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8 min-h-screen bg-[#F5F5F0]">
    <div className="flex flex-col items-center gap-4 font-sans">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2C2C2C]"></div>
      <p className="text-[#555] tracking-widest text-xs font-serif">載入中...</p>
    </div>
  </div>
);

// --- 房號配置 ---
const FLOORS_DATA = [
  { floor: 2, rooms: ["201", "202", "203", "204", "205", "206", "207", "208", "209", "210", "211", "212", "213"] },
  { floor: 3, rooms: ["301", "302", "303", "304", "305", "306", "307", "308", "309", "310", "311", "312", "313"] },
  { floor: 4, rooms: ["401", "402", "403", "405", "406", "407", "408", "409", "410", "411", "412"] },
  { floor: 5, rooms: ["501", "502", "503", "504", "505", "506", "507", "508", "509", "510", "511", "512", "513"] },
];

const ROOM_LIST = (() => {
  const rooms = [];
  FLOORS_DATA.forEach(f => { f.rooms.forEach(r => rooms.push(r)); });
  return rooms;
})();

const INITIAL_STAFF = [
  "王 佩貞", "何 欣怡", "何 渝沁", "吳 怡錚", "吳 至真", "吳 莉琦", "吳 瑞元", "宋 任翔", 
  "宋 珮瑄", "巫 季修", "李 姿樺", "李 昀儒", "汪 俐芸", "周 玗芯", "岳 宗瑩", "林 佳楓", 
  "林 姿華", "林 欣儀", "林 舒玟", "林 鈺婷", "邱 子儀", "邱 佳雯", "邱 淑敏", "邱 愛蓮", 
  "洪 筱慈", "韋 佳伶", "徐 丞甫", "徐 國庭", "高 宇辰", "張 佳婷", "張 峻誠", "張 益嘉", 
  "張 智元", "張 桀瑀", "張 福源", "張 楷渝", "張 馨允", "曹 明瑜", "莊 佩潔", "莊 智盛", 
  "許 玉鳳", "許 凱涵", "郭 庭葳", "陳 芃臻", "陳 冠宏", "陳 姿綺", "陳 威畯", "陳 郁晴", 
  "陳 哲偉", "陳 彥朋", "陳 玠合", "陳 灝", "傅 貽瑞", "傅 昱獻", "曾 宜芬", "曾 映儒", 
  "游 淑君", "甘 雪吟", "華 翊筑", "黃 律婷", "黃 苙宸", "黃 渝培", "黃 嘉宏", "黃 鈺凱", 
  "楊 詠晴", "葉 巧瑩", "廖 姿惠", "管 晉偉", "劉 元", "劉 芳妙", "劉 炫飛", "劉 易修", 
  "劉陳 奕辰", "潘 彥伶", "蔡 語霈", "鄧 辰喆", "鄭 伃婷", "盧 思昀", "戴 妘秦", "戴 妤真", 
  "謝 京佑", "謝 承佑", "謝 秉豫", "謝 淳皓", "鍾 佳伶", "簡 廷宇", "顏 廷恩", "魏 伯珈", 
  "羅 敏瑄", "蘇 子晴", "錡 承恩", "薇度 莎比", "江 家莉", "彭 馨嫻"
].sort((a, b) => a.localeCompare(b, 'zh-TW'));

const COMMON_TAGS = ["毛髮", "灰塵", "水漬", "指紋", "垃圾", "破損", "異味", "雜音", "未補", "未歸位", "皺摺", "過期", "歪斜", "皂垢", "生鏽"];

const QUICK_ISSUES = {
  BED: [
    { label: '遺留物/垃圾', grade: 'A', desc: '含自身用品/衣物/垃圾', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '毛髮/碎屑/蟲屍', grade: 'A', desc: '地板/抽屜明顯可見', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '備品未補/全空', grade: 'A', desc: '器皿/拖鞋/水全空', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '冰箱/器皿髒污', grade: 'A', desc: '內部污漬/杯具有水痕', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '陽台/戶外區髒污', grade: 'A', desc: '家具/地板/欄杆髒', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '鋪床污漬/破損', grade: 'A', desc: '床單/被套有髒污', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '備品過期', grade: 'B', desc: '食品/飲料過期', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '高處/死角灰塵', grade: 'B', desc: '樓梯/檻燈/角落積塵', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '鋪床不美觀/皺摺', grade: 'C', desc: '大於A5紙皺摺/不平', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '衣架/保險箱失誤', grade: 'C', desc: '數量不對/收納錯誤', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '枕頭/抱枕擺放', grade: 'C', desc: '方向錯誤/凌亂', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '空調/燈光未重置', grade: 'C', desc: '溫度風量/門口燈', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '衛生紙/備品微調', grade: 'C', desc: '無三角形/未補滿', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
  ],
  WATER: [
    { label: '熱水壺/杯盤髒污', grade: 'A', desc: '水漬/茶垢/破損', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '馬桶汙垢/尿漬', grade: 'A', desc: '未清潔乾淨', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '浴池青苔/髒汙', grade: 'A', desc: '內部/溢流區未刷', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '排水孔毛髮/異味', grade: 'A', desc: '堵塞/有垃圾', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '鏡面/玻璃水痕', grade: 'A', desc: '光照有明顯痕跡', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '地板濕滑/積水', grade: 'A', desc: '未擦乾', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '垃圾桶未清', grade: 'A', desc: '生理桶/垃圾桶有垃圾', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '嚴重水垢堆積', grade: 'B', desc: '溢流牆/出水口', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '溫泉水質/溫度', grade: 'B', desc: '雜質/過高過低', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '高處/死角蜘蛛網', grade: 'B', desc: '九宮格窗/天花板', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '備品補充/復歸', grade: 'C', desc: '捲筒紙/毛巾摺法', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '五金水垢/皂垢', grade: 'C', desc: '水龍頭/洗手乳瓶底', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '設備歸位微調', grade: 'C', desc: '蓮蓬頭/木桶/水塞', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
  ]
};

const TEAMS_INFO = {
  WATER: { id: 'water', name: '水組', icon: <Droplets size={20}/>, color: 'bg-[#4A6C6F] text-white', borderColor: 'border-[#4A6C6F]', issues: QUICK_ISSUES.WATER },
  BED: { id: 'bed', name: '床組', icon: <Bed size={20}/>, color: 'bg-[#8B5E3C] text-white', borderColor: 'border-[#8B5E3C]', issues: QUICK_ISSUES.BED }
};

const ERROR_GRADES = {
  A: { label: 'A級 (嚴重)', subLabel: '客訴風險', color: 'bg-[#8B3A3A] text-white', badge: 'bg-red-100 text-red-800' },
  B: { label: 'B級 (中等)', subLabel: '品質缺失', color: 'bg-[#D97706] text-white', badge: 'bg-orange-100 text-orange-800' },
  C: { label: 'C級 (輕微)', subLabel: '細節微調', color: 'bg-[#B45309] text-white', badge: 'bg-yellow-100 text-yellow-800' },
};

// --- Helpers ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 720;
        let width = img.width, height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.5));
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
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.beginPath(); ctx.arc(x, y, 40, 0, 2 * Math.PI);
      ctx.lineWidth = 6; ctx.strokeStyle = '#EF4444'; ctx.stroke();
      resolve(canvas.toDataURL('image/webp', 0.5));
    };
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [roomsData, setRoomsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // States
  const [selectedRoom, setSelectedRoom] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [bedStaff, setBedStaff] = useState('');
  const [waterStaff, setWaterStaff] = useState('');
  const [activeTab, setActiveTab] = useState('water');
  const [issues, setIssues] = useState([]);
  
  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState({ team: 'water', title: '', grade: 'C', note: '', photo: null, isCustom: false });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); 
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPwd, setResetPwd] = useState('');
  const [resetMode, setResetMode] = useState('all'); 
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalTarget, setStaffModalTarget] = useState(null); 
  const [staffSearch, setStaffSearch] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); 
  const [newStaffName, setNewStaffName] = useState('');
  const [historyEditTarget, setHistoryEditTarget] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Handlers ---
  const handleTagClick = (tag) => {
    setCurrentIssue(prev => {
        if (!prev.title) return { ...prev, title: tag };
        return { ...prev, note: prev.note ? `${prev.note} ${tag}` : tag };
    });
  };

  const saveIssue = () => {
    if (!currentIssue.title) { alert("請輸入缺失內容"); return; }
    setIssues([...issues, { ...currentIssue, id: Date.now() }]);
    setShowIssueModal(false);
  };

  const handleAiRefine = async () => {
    if (!currentIssue.note) return;
    setIsAiLoading(true);
    try {
      const prompt = `你是虹夕諾雅谷關房務員。改寫描述：${currentIssue.note}。JSON格式: { "title": "缺失標題", "note": "專業描述", "grade": "A"|"B"|"C" }`;
      const txt = await callGemini(prompt, true);
      if (txt) {
        const res = JSON.parse(txt);
        setCurrentIssue(p => ({ ...p, title: res.title, note: res.note, grade: res.grade }));
      }
    } catch (e) { console.error(e); } 
    finally { setIsAiLoading(false); }
  };

  const executeDelete = async () => {
    if (resetPwd !== '5656') { alert("密碼錯誤"); return; }
    setLoading(true);
    try {
      if (resetMode === 'all') {
        const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'inspections')));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inspections', d.id))));
        alert("數據已清空");
      } else {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inspections', targetDeleteId));
        alert("紀錄已刪除");
      }
      setShowResetModal(false); setResetPwd(''); setTargetDeleteId(null);
    } catch (e) { alert("操作失敗"); } finally { setLoading(false); }
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
        await updateDoc(docRef, { [historyEditTarget.type === 'bed' ? 'bedStaff' : 'waterStaff']: name });
        setHistoryEditTarget(null); setShowStaffModal(false);
      } catch(e) { alert("更新失敗"); }
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedRoom || !inspectorName) return alert("請填寫房號與查房員");
    const payload = {
      roomId: String(selectedRoom), inspector: String(inspectorName), 
      bedStaff: String(bedStaff || ''), waterStaff: String(waterStaff || ''), 
      issues: issues || [], issueCount: issues.length, hasGradeA: issues.some(i => i.grade === 'A'),
      createdAt: serverTimestamp(), monthKey: new Date().toISOString().slice(0, 7)
    };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inspections'), payload);
      setSelectedRoom(''); setBedStaff(''); setWaterStaff(''); setIssues([]); setView('home');
      alert("提交成功!");
    } catch (e) { alert("提交失敗"); }
  };

  const handleExportCSV = () => {
    if (roomsData.length === 0) return;
    const headers = ["日期", "房號", "查房員", "床組", "水組", "缺失組別", "缺失項目", "等級", "備註"];
    const csvRows = [];
    roomsData.forEach(room => {
      const date = room.createdAt?.seconds ? new Date(room.createdAt.seconds * 1000).toLocaleDateString('zh-TW') : '';
      if (!room.issues || room.issues.length === 0) {
        csvRows.push([date, room.roomId, room.inspector, room.bedStaff || '', room.waterStaff || '', "N/A", "PASS", "", ""]);
      } else {
        room.issues.forEach(issue => {
          csvRows.push([
            date, room.roomId, room.inspector, room.bedStaff || '', room.waterStaff || '',
            issue.team === 'water' ? "水組" : "床組",
            issue.title, issue.grade, `"${(issue.note || '').replace(/"/g, '""')}"`
          ]);
        });
      }
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF" + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" }));
    link.download = `Hoshinoya_Inspection_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // --- Auth & Data ---
  useEffect(() => {
    signInAnonymously(auth);
    const saved = localStorage.getItem('lastInspector');
    if (saved) setInspectorName(saved);
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'inspections'));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoomsData(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
  }, [user]);

  const stats = (() => {
    const cur = new Date().toISOString().slice(0, 7);
    const filtered = roomsData.filter(r => r.monthKey === cur || !r.monthKey);
    const counts = filtered.flatMap(r => r.issues || []).reduce((acc, i) => { if(i.title) acc[i.title] = (acc[i.title] || 0) + 1; return acc; }, {});
    return { count: filtered.length, total: filtered.reduce((a, c) => a + (c.issueCount || 0), 0), tops: Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5) };
  })();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-[#E0E0E0] min-h-screen font-sans text-[#2C2C2C] md:max-w-md md:mx-auto md:shadow-2xl md:relative h-screen overflow-hidden">
      <div className="h-full bg-[#F5F5F0]">
        {view === 'home' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#2C2C2C] text-white p-8 pt-14 pb-12 rounded-b-[40px] shadow-2xl text-center">
              <h1 className="text-3xl font-serif tracking-[0.2em] mb-1">HOSHINOYA</h1>
              <p className="text-[#888] text-xs tracking-[0.3em] uppercase">Guguan Housekeeping</p>
            </div>
            <div className="flex-1 px-6 py-8 space-y-5 -mt-6 font-sans">
              <button onClick={() => setView('inspect')} className="w-full bg-white p-6 rounded-2xl shadow-xl border border-white/50 flex items-center justify-between active:scale-95 transition-all">
                <div className="flex items-center gap-5"><div className="bg-[#2C2C2C] text-white p-4 rounded-full"><CheckCircle size={28} /></div><div className="text-left font-sans"><h3 className="text-xl font-serif font-medium">開始查房</h3><p className="text-[#888] text-xs mt-1">Start Inspection</p></div></div><ChevronRight size={20} className="text-[#CCC]" />
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setView('history')} className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 active:scale-95 transition-all"><div className="bg-[#EBF2F2] p-3 rounded-full text-[#4A6C6F]"><History size={24} /></div><span className="text-sm font-medium tracking-widest">歷史紀錄</span></button>
                <button onClick={() => setView('analytics')} className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 active:scale-95 transition-all"><div className="bg-[#F5F0EB] p-3 rounded-full text-[#8B5E3C]"><BarChart2 size={24} /></div><span className="text-sm font-medium tracking-widest">數據統計</span></button>
              </div>
            </div>
          </div>
        )}

        {view === 'inspect' && (
          <div className="flex flex-col h-full bg-[#F5F5F0]">
            <div className="bg-white px-6 py-6 shadow-md flex flex-col items-center sticky top-0 z-20 border-b border-gray-100 font-sans">
              <div className="w-full flex justify-between items-center mb-2"><button onClick={() => setView('home')} className="p-2 -ml-2 text-[#555]"><X size={24} /></button><span className="text-[10px] font-bold text-[#888] tracking-[0.2em] uppercase font-serif">Checking Room</span><div className="w-10"></div></div>
              <button onClick={() => setShowRoomModal(true)} className={`w-full max-w-[220px] py-4 px-6 rounded-2xl flex items-center justify-center gap-4 active:scale-95 ${selectedRoom ? 'bg-[#2C2C2C] text-white shadow-xl ring-4 ring-[#2C2C2C]/5' : 'bg-gray-100 text-[#2C2C2C] border-2 border-dashed border-gray-300'}`}><Grid size={22} /><span className="text-3xl font-serif font-bold tracking-widest">{selectedRoom || '選擇房號'}</span><ChevronDown size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-32 p-5 space-y-6">
              <div className="grid grid-cols-3 gap-3 font-sans">
                {['inspector', 'water', 'bed'].map(t => (
                  <div key={t} onClick={() => { setStaffModalTarget(t); setShowStaffModal(true); }} className={`flex flex-col items-center p-3 rounded-xl border bg-white cursor-pointer ${inspectorName || (t==='water'?waterStaff:bedStaff) ? 'border-gray-200 shadow-sm' : 'border-dashed opacity-70'}`}><span className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1">{t === 'inspector' ? '查房員*' : t === 'water' ? '水組' : '床組'}</span><div className="font-bold text-sm truncate w-full text-center">{String(t === 'inspector' ? (inspectorName || '+') : t === 'water' ? (waterStaff || '待定') : (bedStaff || '待定'))}</div></div>
                ))}
              </div>
              <div className="bg-white p-1 rounded-2xl shadow-sm border flex font-sans">
                {Object.values(TEAMS_INFO).map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id.toLowerCase())} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${activeTab === t.id.toLowerCase() ? t.color : 'text-[#999]'}`}>{t.icon}<span>{String(t.name)}</span></button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 font-sans">
                {TEAMS_INFO[activeTab.toUpperCase()].issues.map((i, idx) => (
                  <button key={idx} onClick={() => { setCurrentIssue({ team: activeTab, title: i.label, grade: i.grade, note: '', photo: null, isCustom: false }); setShowIssueModal(true); }} className={`p-4 rounded-xl border text-left bg-white shadow-sm active:scale-95 ${i.color} border-transparent`}><div className="font-bold text-lg mb-1">{i.label}</div><div className="flex justify-between items-end"><span className="text-sm text-[#666] leading-tight w-2/3">{i.desc}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ERROR_GRADES[i.grade]?.badge}`}>{i.grade}</span></div></button>
                ))}
                <button onClick={() => { setCurrentIssue({ team: activeTab, title: '', grade: 'C', note: '', photo: null, isCustom: true }); setShowIssueModal(true); }} className="p-4 rounded-xl border-2 border-dashed border-[#DDD] flex flex-col items-center justify-center text-[#999] active:scale-95"><Plus size={24} /><span className="text-sm font-bold mt-1">自定義缺失</span></button>
              </div>
              {issues.length > 0 && (
                <div className="space-y-3 font-sans">
                  <h3 className="font-serif font-bold text-[#444] text-sm px-1">已記錄 ({issues.length})</h3>
                  {issues.map(i => (
                    <div key={i.id} className={`bg-white p-3 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${TEAMS_INFO[(i.team || 'water').toUpperCase()]?.borderColor}`}><div className="flex-1 font-sans"><span className={`text-[9px] font-bold uppercase ${i.team === 'water' ? 'text-[#4A6C6F]' : 'text-[#8B5E3C]'}`}>{i.team === 'water' ? '水組' : '床組'}</span><h4 className="font-bold text-[#2C2C2C] text-sm">{i.title}</h4><p className="text-xs text-[#888]">{i.note || "無備註"}</p></div><button onClick={() => setIssues(issues.filter(x => x.id !== i.id))} className="text-[#DDD] hover:text-red-500"><X size={20} /></button></div>
                  ))}
                </div>
              )}
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-5 border-t z-30 font-sans"><button onClick={handleSubmitInspection} className="w-full bg-[#2C2C2C] text-white py-4 rounded-xl font-serif font-bold text-lg shadow-lg flex items-center justify-center gap-3 active:scale-95"><Save size={20} />提交紀錄</button></div>
          </div>
        )}

        {view === 'history' && (
          <div className="flex flex-col h-full bg-[#F5F5F0]">
            <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10"><div className="flex items-center"><button onClick={() => setView('home')} className="p-2"><X size={24} /></button><h2 className="font-serif font-bold text-xl ml-3">歷史紀錄</h2></div><button onClick={() => { setResetMode('all'); setShowResetModal(true); }} className="p-2 text-red-700 bg-red-50 rounded-full active:bg-red-200"><Trash2 size={20} /></button></div>
            <div className="p-6 space-y-4 overflow-y-auto pb-20 font-sans">
              {roomsData.map(r => (
                <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border relative active:scale-[0.98]">
                  <div className="absolute top-5 right-5"><button onClick={(e) => { e.stopPropagation(); setTargetDeleteId(r.id); setResetMode('single'); setShowResetModal(true); }} className="p-2 text-[#DDD] hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>
                  <div onClick={() => setSelectedHistoryItem(r)} className="cursor-pointer">
                    <div className="flex justify-between items-start mb-3 pr-8 font-sans"><div><h3 className="text-2xl font-serif">{r.roomId} 房</h3><span className="text-xs text-[#999]">{r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : '-'}</span></div>{r.hasGradeA ? <span className="bg-red-50 text-red-800 text-[10px] font-bold px-2 py-1 rounded border border-red-200 uppercase">A級異常</span> : <span className="bg-green-50 text-green-800 text-[10px] font-bold px-2 py-1 rounded border border-green-200 uppercase">PASS</span>}</div>
                  </div>
                  <div className="text-xs p-3 bg-[#F9F9F9] rounded-xl flex justify-between items-center text-[#666] gap-1 font-sans">
                    <span className="font-medium whitespace-nowrap">查: {r.inspector}</span>
                    <div className="h-4 w-[1px] bg-[#DDD]"></div>
                    <button onClick={() => openHistoryStaffEdit(r.id, 'water')} className="flex-1 py-1 text-indigo-600 font-bold">水: {r.waterStaff || '補填'}</button>
                    <div className="h-4 w-[1px] bg-[#DDD]"></div>
                    <button onClick={() => openHistoryStaffEdit(r.id, 'bed')} className="flex-1 py-1 text-indigo-600 font-bold">床: {r.bedStaff || '補填'}</button>
                  </div>
                  {(r.issues || []).length > 0 && <div className="mt-2 flex flex-wrap gap-1 font-sans">{r.issues.slice(0, 3).map((i, idx) => <span key={idx} className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-[#888]">{i.title}</span>)}{r.issues.length > 3 && <span className="text-[9px] text-[#BBB]">+{r.issues.length - 3}</span>}</div>}
                </div>
              ))}
              {roomsData.length === 0 && <div className="text-center py-20 text-[#CCC] flex flex-col items-center gap-3"><History size={48} className="opacity-20"/><p className="font-sans">目前尚無歷史紀錄</p></div>}
            </div>
          </div>
        )}

        {view === 'analytics' && (
          <div className="flex flex-col h-full bg-[#F5F5F0]">
            <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10"><div className="flex items-center font-serif"><button onClick={() => setView('home')} className="p-2"><X size={24} /></button><h2 className="font-bold text-xl ml-3">數據統計</h2></div><button onClick={handleExportCSV} className="flex items-center gap-1 px-4 py-2 bg-[#EBF2F2] text-[#4A6C6F] rounded-lg text-xs font-bold border font-sans"><Download size={14} /> CSV</button></div>
            <div className="p-6 space-y-6 overflow-y-auto pb-20 font-sans">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"><p className="text-xs text-[#888] font-bold uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> 本月檢查</p><p className="text-4xl font-serif mt-2 font-bold text-[#2C2C2C]">{stats.count}</p></div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"><p className="text-xs text-[#888] font-bold uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={12}/> 缺失總計</p><p className="text-4xl font-serif text-[#8B3A3A] mt-2 font-bold">{stats.total}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-serif font-bold text-lg mb-5 flex items-center gap-2"><BarChart2 size={20} className="text-[#8B5E3C]" /> 本月缺失排行</h3>
                    <div className="space-y-5">
                        {stats.tops.map(([t, c], i) => (
                            <div key={t} className="flex justify-between items-center font-sans"><div className="flex items-center gap-4 flex-1 min-w-0"><div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#8B3A3A] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div><span className="font-medium text-sm text-[#444] truncate">{t}</span></div><span className="font-bold text-sm text-[#2C2C2C]">{c} 次</span></div>
                        ))}
                        {stats.tops.length === 0 && <p className="text-center text-gray-300 text-sm font-sans">尚無統計數據</p>}
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals --- Modals 放在主容器底層 --- */}

      {showRoomModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col overflow-hidden font-sans">
            <div className="flex justify-between items-center mb-6 font-serif"><div><h3 className="text-xl font-bold tracking-widest">請選擇房號</h3><p className="text-xs text-gray-400 font-sans uppercase">Select a room</p></div><button onClick={() => setShowRoomModal(false)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform"><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto space-y-8 pb-10">
                {FLOORS_DATA.map(f => (
                    <div key={f.floor}>
                        <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white py-1 z-10 font-sans"><span className="bg-[#2C2C2C] text-white text-xs font-bold px-3 py-1 rounded-full">{f.floor}F</span><div className="h-[1px] flex-1 bg-gray-100"></div></div>
                        <div className="grid grid-cols-4 gap-3">
                            {f.rooms.map(r => {
                                const isDone = roomsData.some(d => d.roomId === r);
                                return (<button key={r} onClick={() => { setSelectedRoom(r); setShowRoomModal(false); }} className={`relative py-4 rounded-xl text-lg font-serif font-bold transition-all active:scale-90 ${selectedRoom === r ? 'bg-[#2C2C2C] text-white shadow-lg ring-4 ring-[#2C2C2C]/10' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>{r}{isDone && <div className="absolute top-1 right-1"><CheckCircle size={12} className="text-[#2F855A] fill-[#2F855A]/10" /></div>}</button>);
                            })}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showIssueModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center backdrop-blur-sm font-sans">
          <div className="bg-[#F9F9F9] w-full max-w-md rounded-t-3xl p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center border-b pb-4"><h3 className="font-serif font-bold text-xl">{currentIssue.title || '記錄缺失'}</h3><button onClick={() => setShowIssueModal(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button></div>
            {currentIssue.isCustom && <input className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-[#2C2C2C] focus:ring-2 outline-none font-sans" placeholder="輸入缺失名稱..." value={currentIssue.title} onChange={e => setCurrentIssue({...currentIssue, title: e.target.value})} />}
            <div><label className="text-[10px] text-[#888] font-bold uppercase mb-2 block tracking-widest font-sans uppercase">Severity Grade</label>
              <div className="flex gap-2">
                {Object.entries(ERROR_GRADES).map(([k, v]) => (
                  <button key={k} onClick={() => setCurrentIssue({...currentIssue, grade: k})} className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${currentIssue.grade === k ? v.color : 'bg-white text-[#888]'}`}><span className="text-xs font-bold font-sans">{String(v.label)}</span><span className="text-[8px] font-medium opacity-70 uppercase tracking-tighter">{v.subLabel}</span></button>
                ))}
              </div>
            </div>
            {currentIssue.isCustom && (
              <div className="flex flex-wrap gap-2 font-sans">
                {COMMON_TAGS.map(t => (<button key={t} onClick={() => handleTagClick(t)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-[#555] active:bg-[#F5F5F0] transition-colors">{t}</button>))}
              </div>
            )}
            <div className="relative font-sans"><textarea className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm h-32 outline-none resize-none" placeholder="詳細描述..." value={currentIssue.note} onChange={e => setCurrentIssue({...currentIssue, note: e.target.value})} /><button onClick={handleAiRefine} disabled={isAiLoading} className="absolute bottom-3 right-3 p-2 bg-black text-white rounded-lg active:scale-95">{isAiLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}</button></div>
            <div className="flex gap-2 font-sans">
              <label className="flex-1 bg-white border-2 border-dashed border-[#DDD] rounded-xl py-4 flex flex-col items-center justify-center cursor-pointer h-24 overflow-hidden relative active:bg-gray-50 transition-colors">
                {currentIssue.photo ? <img src={currentIssue.photo} className="h-full w-full object-cover" onClick={async (e) => { e.preventDefault(); const rect = e.target.getBoundingClientRect(); const x = (e.clientX - rect.left) * (720/rect.width); const y = (e.clientY - rect.top) * (720/rect.width); const newPhoto = await drawCircleOnImage(currentIssue.photo, x, y); setCurrentIssue({...currentIssue, photo: newPhoto}); }} /> : <div className="flex flex-col items-center"><Camera className="text-[#AAA]" size={20}/><span className="text-[9px] font-bold text-[#AAA] mt-1 text-center tracking-tighter">拍照/上傳</span></div>}
                {!currentIssue.photo && <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if(e.target.files[0]) { const compressed = await compressImage(e.target.files[0]); setCurrentIssue({...currentIssue, photo: compressed}); } }} />}
              </label>
              <button onClick={saveIssue} className="flex-[2] bg-[#2C2C2C] text-white py-4 rounded-xl font-bold tracking-widest shadow-lg active:scale-95 uppercase font-sans">確認儲存</button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm font-sans">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-red-600"><Lock size={24} /></div>
            <h3 className="font-bold text-lg">{resetMode === 'all' ? '數據重置' : '刪除紀錄'}</h3>
            <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} className="w-full border-b-2 border-[#2C2C2C] p-2 text-center text-xl focus:outline-none font-mono" placeholder="••••" />
            <div className="flex gap-2"><button onClick={() => { setShowResetModal(false); setResetPwd(''); }} className="flex-1 py-3 text-[#666] font-bold text-sm">取消</button><button onClick={executeDelete} className="flex-1 py-3 bg-[#8B3A3A] text-white rounded-xl font-bold text-sm active:scale-95">確認</button></div>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm font-sans">
          <div className="bg-white w-full h-[70vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-white font-serif"><h3 className="font-bold tracking-widest">{historyEditTarget ? '修正人員' : '選擇人員'}</h3><button onClick={() => {setShowStaffModal(false); setHistoryEditTarget(null);}} className="p-2"><X size={24}/></button></div>
            <div className="p-4 flex gap-2 bg-white"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-[#BBB]" size={18} /><input className="w-full bg-[#F5F5F0] p-3 pl-10 rounded-xl outline-none text-sm font-sans" placeholder="搜尋姓名..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)} /></div><button onClick={() => setIsEditMode(!isEditMode)} className={`p-3 rounded-xl transition-all ${isEditMode ? 'bg-[#2C2C2C] text-white' : 'bg-[#F0F0F0]'}`}><Edit2 size={18}/></button></div>
            {isEditMode && (<div className="px-4 py-4 flex gap-2 animate-in slide-in-from-top-2 bg-white"><input className="flex-1 border border-gray-200 p-3 rounded-xl text-sm font-sans" placeholder="新增姓名..." value={newStaffName} onChange={e => setNewStaffName(e.target.value)} /><button onClick={async () => { if (!newStaffName.trim()) return; const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'staff_list'); await updateDoc(docRef, { bed: arrayUnion(newStaffName.trim()), water: arrayUnion(newStaffName.trim()) }); setNewStaffName(''); }} className="bg-black text-white px-4 rounded-xl text-xs font-bold uppercase font-sans">ADD</button></div>)}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 bg-gray-50">{INITIAL_STAFF.filter(n => n.includes(staffSearch)).map(n => (<button key={n} onClick={() => selectStaff(n)} className="py-4 px-4 bg-white rounded-xl text-sm font-bold text-[#444] text-left shadow-sm active:scale-95 transition-all border border-transparent hover:border-indigo-200 font-sans">{n}</button>))}</div>
          </div>
        </div>
      )}

      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-end sm:items-center justify-center backdrop-blur-sm font-sans">
          <div className="bg-[#F9F9F9] w-full max-w-md h-[80vh] rounded-t-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-white flex justify-between items-center shadow-sm font-serif"><h3 className="font-bold text-xl">{selectedHistoryItem.roomId} 房 詳情</h3><button onClick={() => setSelectedHistoryItem(null)} className="p-2 bg-[#F0F0F0] rounded-full"><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 font-sans">
               {(selectedHistoryItem.issues || []).map((i, idx) => (
                 <div key={idx} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm ${TEAMS_INFO[(i.team || 'water').toUpperCase()]?.borderColor || 'border-gray-300'}`}>
                    <div className="flex justify-between items-start mb-2 font-sans"><div><span className={`text-[9px] font-bold uppercase mb-1 block ${i.team === 'water' ? 'text-[#4A6C6F]' : 'text-[#8B5E3C]'}`}>{i.team === 'water' ? '水組' : '床組'}</span><h4 className="font-bold text-[#2C2C2C]">{i.title}</h4></div><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(ERROR_GRADES[i.grade] || ERROR_GRADES['C']).color}`}>{i.grade}</span></div>
                    <p className="text-sm text-[#666] mb-3 bg-[#F9F9F9] p-2 rounded font-sans">{i.note || "無補充說明"}</p>
                    {i.photo && <div className="rounded-lg overflow-hidden border border-gray-100"><img src={i.photo} className="w-full h-auto cursor-zoom-in" onClick={() => setPreviewImage(i.photo)} /></div>}
                 </div>
               ))}
               {(!selectedHistoryItem.issues || selectedHistoryItem.issues.length === 0) && <div className="text-center py-20 text-[#CCC] font-bold tracking-widest flex flex-col items-center gap-3 font-sans"><CheckCircle size={48} className="opacity-20"/><p>無缺失紀錄 (PASS)</p></div>}
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[250] bg-black flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl" /><button className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full shadow-lg transition-transform active:scale-90"><X size={24}/></button></div>
      )}
    </div>
  );
}