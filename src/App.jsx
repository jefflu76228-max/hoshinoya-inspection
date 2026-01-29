import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, 
  orderBy, Timestamp, serverTimestamp, where, doc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Camera, CheckCircle, AlertTriangle, BarChart2, 
  Home, User, Save, X, ChevronRight, ChevronDown, 
  Droplets, Bed, History, FileText, Tag, Plus,
  AlertOctagon, AlertCircle, Info, ThumbsUp, Users, Search,
  Edit2, Trash2, UserPlus, Sparkles, Loader2, FileJson, Download, PenTool,
  MapPin, Clock, HelpCircle, Eye, Image as ImageIcon, Lock
} from 'lucide-react';

// --- Firebase 初始設定 (已修正為 Vercel 專用讀取方式) ---
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'hoshinoya-guguan-app';

// --- Gemini API 輔助函式 (已修正為 Vercel 專用讀取方式) ---
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
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2C2C2C]"></div>
      <p className="text-[#555] tracking-widest text-xs font-serif">載入中...</p>
    </div>
  </div>
);

// --- 常數定義 ---
const FLOORS = [
  { floor: 2, start: 201, end: 213, skip: [] },
  { floor: 3, start: 301, end: 313, skip: [] },
  { floor: 4, start: 401, end: 412, skip: [404] },
  { floor: 5, start: 501, end: 513, skip: [511] },
];

const ROOM_LIST = (() => {
  const rooms = [];
  FLOORS.forEach(f => {
    for (let i = f.start; i <= f.end; i++) {
      if (!f.skip.includes(i)) rooms.push(i.toString());
    }
  });
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

const QUICK_ISSUES = {
  BED: [
    { label: '遺留物/垃圾', grade: 'A', desc: '含自身用品/衣物/垃圾 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '毛髮/碎屑/蟲屍', grade: 'A', desc: '地板/抽屜明顯可見 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '備品未補/全空', grade: 'A', desc: '器皿/拖鞋/水全空 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '冰箱/器皿髒污', grade: 'A', desc: '內部污漬/杯具有水痕 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '陽台/戶外區髒污', grade: 'A', desc: '家具/地板/欄杆髒 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '鋪床污漬/破損', grade: 'A', desc: '床單/被套有髒污 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '備品過期', grade: 'B', desc: '食品/飲料過期 (扣10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '高處/死角灰塵', grade: 'B', desc: '樓梯/檻燈/角落積塵 (扣10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '鋪床不美觀/皺摺', grade: 'C', desc: '大於A5紙皺摺/不平 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '衣架/保險箱失誤', grade: 'C', desc: '數量不對/收納錯誤 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '枕頭/抱枕擺放', grade: 'C', desc: '方向錯誤/凌亂 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '空調/燈光未重置', grade: 'C', desc: '溫度風量/門口燈 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '衛生紙/備品微調', grade: 'C', desc: '無三角形/未補滿 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
  ],
  WATER: [
    { label: '熱水壺/杯盤髒污', grade: 'A', desc: '水漬/茶垢/破損 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '馬桶汙垢/尿漬', grade: 'A', desc: '未清潔乾淨 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '浴池青苔/髒汙', grade: 'A', desc: '內部/溢流區未刷 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '排水孔毛髮/異味', grade: 'A', desc: '堵塞/有垃圾 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '鏡面/玻璃水痕', grade: 'A', desc: '光照有明顯痕跡 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '地板濕滑/積水', grade: 'A', desc: '未擦乾 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '垃圾桶未清', grade: 'A', desc: '生理桶/垃圾桶有垃圾 (不通過)', color: 'border-red-900/20 bg-red-50 text-red-900' },
    { label: '嚴重水垢堆積', grade: 'B', desc: '溢流牆/出水口 (扣10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '溫泉水質/溫度', grade: 'B', desc: '雜質/過高過低 (扣10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '高處/死角蜘蛛網', grade: 'B', desc: '九宮格窗/天花板 (扣10分)', color: 'border-orange-900/20 bg-orange-50 text-orange-900' },
    { label: '備品補充/復歸', grade: 'C', desc: '捲筒紙/毛巾摺法 (扣3~5分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '五金水垢/皂垢', grade: 'C', desc: '水龍頭/洗手乳瓶底 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
    { label: '設備歸位微調', grade: 'C', desc: '蓮蓬頭/木桶/水塞 (扣2分)', color: 'border-yellow-900/20 bg-yellow-50 text-yellow-900' },
  ]
};

const TEAMS_INFO = {
  WATER: {
    id: 'water',
    name: '水組',
    icon: <Droplets className="w-5 h-5" />,
    color: 'bg-[#4A6C6F] text-white shadow-lg shadow-[#4A6C6F]/30',
    activeBg: 'bg-[#4A6C6F]',
    lightColor: 'bg-[#EBF2F2] text-[#2C4A4D]',
    borderColor: 'border-[#4A6C6F]',
    issues: QUICK_ISSUES.WATER
  },
  BED: {
    id: 'bed',
    name: '床組',
    icon: <Bed className="w-5 h-5" />,
    color: 'bg-[#8B5E3C] text-white shadow-lg shadow-[#8B5E3C]/30',
    activeBg: 'bg-[#8B5E3C]',
    lightColor: 'bg-[#F5F0EB] text-[#5A3A29]',
    borderColor: 'border-[#8B5E3C]',
    issues: QUICK_ISSUES.BED
  }
};

const ERROR_GRADES = {
  A: { label: 'A級 (不通過)', icon: <AlertOctagon size={18}/>, color: 'bg-[#8B3A3A] text-white border-none shadow-md shadow-red-900/20' },
  B: { label: 'B級 (扣10分)', icon: <AlertTriangle size={18}/>, color: 'bg-[#D97706] text-white border-none shadow-md shadow-orange-900/20' },
  C: { label: 'C級 (扣2-5分)', icon: <Info size={18}/>, color: 'bg-[#B45309] text-white border-none shadow-md shadow-yellow-900/20' },
};

// --- 輔助函式 ---
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

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [roomsData, setRoomsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 表單狀態
  const [selectedRoom, setSelectedRoom] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [bedStaff, setBedStaff] = useState('');
  const [waterStaff, setWaterStaff] = useState('');
  const [activeTab, setActiveTab] = useState('water');
  const [issues, setIssues] = useState([]);
  
  // 視窗狀態
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState({ team: 'water', title: '', grade: 'C', note: '', photo: null, isCustom: false });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); 
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPwd, setResetPwd] = useState('');
  const [resetMode, setResetMode] = useState('all'); 
  const [targetDeleteId, setTargetDeleteId] = useState(null);

  // 人員名單
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalTarget, setStaffModalTarget] = useState(null); 
  const [staffSearch, setStaffSearch] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); 
  const [newStaffName, setNewStaffName] = useState('');
  const [staffLists, setStaffLists] = useState({ bed: INITIAL_STAFF, water: INITIAL_STAFF });
  const [historyEditTarget, setHistoryEditTarget] = useState(null);

  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- 函數定義 ---
  const saveIssue = () => {
    if (!currentIssue.title) {
        alert("請輸入缺失內容");
        return;
    }
    setIssues([...issues, { ...currentIssue, id: Date.now() }]);
    setShowIssueModal(false);
  };

  const handleExportCSV = () => {
    if (roomsData.length === 0) return;
    const headers = ["日期", "房號", "查房員", "床組人員", "水組人員", "缺失組別", "缺失項目", "等級", "備註"];
    const csvRows = [];
    roomsData.forEach(room => {
      const date = room.createdAt?.seconds ? new Date(room.createdAt.seconds * 1000).toLocaleDateString('zh-TW') : '';
      if (!room.issues || room.issues.length === 0) {
        csvRows.push([date, room.roomId, room.inspector, room.bedStaff || '待補', room.waterStaff || '待補', "N/A", "無 (PASS)", ""]);
      } else {
        room.issues.forEach(issue => {
          csvRows.push([
            date, room.roomId, room.inspector, room.bedStaff || '待補', room.waterStaff || '待補',
            issue.team === 'water' ? "水組" : "床組",
            issue.title, issue.grade, `"${(issue.note || '').replace(/"/g, '""')}"`
          ]);
        });
      }
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Hoshinoya_Records_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const executeDelete = async () => {
    if (resetPwd !== '5656') { alert("密碼錯誤"); return; }
    setLoading(true);
    try {
      if (resetMode === 'all') {
        if (!confirm("確定要重置所有紀錄嗎？")) { setLoading(false); return; }
        const snapshot = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'inspections')));
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inspections', d.id)));
        await Promise.all(deletePromises);
      } else {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inspections', targetDeleteId));
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
        const updates = {};
        if (historyEditTarget.type === 'bed') updates.bedStaff = name;
        if (historyEditTarget.type === 'water') updates.waterStaff = name;
        await updateDoc(docRef, updates);
        setHistoryEditTarget(null); setShowStaffModal(false);
      } catch(e) { alert("更新失敗"); }
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedRoom || !inspectorName) return alert("請填寫房號與查房員");
    const payload = {
      roomId: String(selectedRoom), 
      inspector: String(inspectorName), 
      bedStaff: String(bedStaff || ''), 
      waterStaff: String(waterStaff || ''), 
      issues, 
      issueCount: issues.length, 
      hasGradeA: issues.some(i => i.grade === 'A'),
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inspections'), payload);
      setSelectedRoom(''); setBedStaff(''); setWaterStaff(''); setIssues([]); setView('home');
      alert("提交成功!");
    } catch (e) { alert("提交失敗"); }
  };

  // --- Auth & 資料監聽 ---
  useEffect(() => {
    signInAnonymously(auth);
    const savedInspector = localStorage.getItem('lastInspector');
    if (savedInspector) setInspectorName(savedInspector);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'inspections'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRoomsData(data);
      setLoading(false);
    });
  }, [user]);

  // --- 畫面渲染 ---
  const renderHome = () => (
    <div className="flex flex-col h-full bg-[#F5F5F0]">
      <div className="bg-[#2C2C2C] text-white p-8 pt-14 pb-12 rounded-b-[40px] shadow-2xl text-center">
        <h1 className="text-3xl font-serif tracking-[0.2em] mb-1">HOSHINOYA</h1>
        <p className="text-[#888] text-xs tracking-[0.3em] uppercase">Guguan Housekeeping</p>
      </div>
      <div className="flex-1 px-6 py-8 space-y-5 -mt-6">
        <button onClick={() => setView('inspect')} className="w-full bg-white p-6 rounded-2xl shadow-xl border flex items-center justify-between active:scale-95 transition-all">
          <div className="flex items-center gap-5">
            <div className="bg-[#2C2C2C] text-white p-4 rounded-full shadow-lg"><CheckCircle size={28} /></div>
            <div className="text-left"><h3 className="text-xl font-serif font-medium">開始查房</h3><p className="text-[#888] text-xs mt-1 tracking-widest uppercase">Start Inspection</p></div>
          </div>
          <ChevronRight size={20} className="text-[#CCC]" />
        </button>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView('history')} className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 active:scale-95 transition-all"><div className="bg-[#EBF2F2] p-3 rounded-full text-[#4A6C6F]"><History size={24} /></div><span className="font-medium text-sm tracking-widest">歷史紀錄</span></button>
          <button onClick={() => setView('analytics')} className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 active:scale-95 transition-all"><div className="bg-[#F5F0EB] p-3 rounded-full text-[#8B5E3C]"><BarChart2 size={24} /></div><span className="font-medium text-sm tracking-widest">數據統計</span></button>
        </div>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-[#E0E0E0] min-h-screen font-sans text-[#2C2C2C] md:max-w-md md:mx-auto md:shadow-2xl md:relative h-screen overflow-hidden">
      <div className="h-full bg-[#F5F5F0]">
        {view === 'home' && renderHome()}
        {view === 'inspect' && (
            <div className="flex flex-col h-full bg-[#F5F5F0]">
              <div className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20 border-b">
                <button onClick={() => setView('home')} className="p-2"><X size={24} /></button>
                <div className="relative">
                  <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="appearance-none bg-[#F0F0F0] text-[#2C2C2C] font-serif font-bold text-lg py-2 px-8 rounded-full border-none outline-none">
                    <option value="">選擇房號</option>{ROOM_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
                </div>
                <div className="w-10"></div>
              </div>
              <div className="flex-1 overflow-y-auto pb-32 p-5 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {['inspector', 'water', 'bed'].map(t => (
                    <div key={t} onClick={() => { setStaffModalTarget(t); setShowStaffModal(true); }} className="flex flex-col items-center p-3 rounded-xl border bg-white border-[#EEE] cursor-pointer">
                      <span className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-1">{t === 'inspector' ? '查房員*' : t === 'water' ? '水組' : '床組'}</span>
                      <div className="font-bold text-sm truncate w-full text-center">{String(t === 'inspector' ? (inspectorName || '+') : t === 'water' ? (waterStaff || '待定') : (bedStaff || '待定'))}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border flex">
                  {Object.values(TEAMS_INFO).map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id.toLowerCase())} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${activeTab === t.id.toLowerCase() ? t.color : 'text-[#999]'}`}>{t.icon}<span>{String(t.name)}</span></button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {TEAMS_INFO[activeTab.toUpperCase()].issues.map((issue, idx) => (
                      <button key={idx} onClick={() => { setCurrentIssue({ team: activeTab, title: issue.label, grade: issue.grade, note: '', photo: null, isCustom: false }); setShowIssueModal(true); }} className={`p-4 rounded-xl border text-left bg-white shadow-sm ${issue.color} border-transparent active:scale-95`}>
                        <div className="font-bold text-lg mb-1">{String(issue.label)}</div>
                        <div className="flex justify-between items-end"><span className="text-sm text-[#666] leading-tight w-2/3">{String(issue.desc)}</span><span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white/80">{String(issue.grade)}</span></div>
                      </button>
                    ))}
                </div>
              </div>
              <div className="fixed bottom-0 left-0 right-0 bg-white/90 p-5 border-t z-30 md:absolute">
                <button onClick={handleSubmitInspection} className="w-full bg-[#2C2C2C] text-white py-4 rounded-xl font-serif font-bold text-lg shadow-lg flex items-center justify-center gap-3 active:scale-95"><Save size={20} />提交紀錄</button>
              </div>
            </div>
        )}
        {view === 'history' && (
            <div className="flex flex-col h-full bg-[#F5F5F0]">
              <div className="bg-white/80 px-6 py-4 border-b flex justify-between items-center">
                <div className="flex items-center"><button onClick={() => setView('home')} className="p-2"><X size={24} /></button><h2 className="font-serif font-bold text-xl ml-3">歷史紀錄</h2></div>
                <button onClick={() => { setResetMode('all'); setShowResetModal(true); }} className="p-2 text-red-700"><Trash2 size={20} /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto pb-20">
                {roomsData.map(r => (
                  <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border">
                    <div className="flex justify-between items-start mb-3">
                      <div><h3 className="text-2xl font-serif">{String(r.roomId)} 房</h3><span className="text-xs text-[#999]">{r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : '-'}</span></div>
                      <button onClick={() => { setTargetDeleteId(r.id); setResetMode('single'); setShowResetModal(true); }} className="text-[#DDD] hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                    <div className="text-sm p-3 bg-[#F9F9F9] rounded-xl flex justify-between items-center text-[#666]">
                      <span>查: {String(r.inspector)}</span>
                      <span>水: {String(r.waterStaff || '待補')}</span>
                      <span>床: {String(r.bedStaff || '待補')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        )}
      </div>

      {/* 缺失編輯視窗 */}
      {showIssueModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center backdrop-blur-sm">
          <div className="bg-[#F9F9F9] w-full max-w-md rounded-t-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-serif font-bold text-xl">{String(currentIssue.title || '記錄缺失')}</h3>
              <button onClick={() => setShowIssueModal(false)} className="p-2 bg-white rounded-full"><X size={20}/></button>
            </div>
            <div className="flex gap-2">
                {Object.entries(ERROR_GRADES).map(([k, v]) => (
                  <button key={k} onClick={() => setCurrentIssue({...currentIssue, grade: k})} className={`flex-1 py-4 rounded-xl border flex flex-col items-center gap-1 ${currentIssue.grade === k ? v.color : 'bg-white text-[#888]'}`}>
                    <span className="text-xs font-bold">{String(v.label)}</span>
                  </button>
                ))}
            </div>
            <textarea className="w-full p-4 bg-white border rounded-xl text-sm h-32 focus:ring-2 focus:ring-[#8B5E3C] outline-none" placeholder="詳細描述狀況..." value={String(currentIssue.note)} onChange={e => setCurrentIssue({...currentIssue, note: e.target.value})} />
            <button onClick={saveIssue} className="w-full bg-[#2C2C2C] text-white py-4 rounded-xl font-bold tracking-widest active:scale-95 uppercase">確認儲存 Save Issue</button>
          </div>
        </div>
      )}
      
      {/* 重置與刪除視窗 (密碼 5656) */}
      {showResetModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 text-center space-y-4">
            <h3 className="font-bold text-lg">{resetMode === 'all' ? '重置數據' : '刪除紀錄'}</h3>
            <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} className="w-full border-b-2 border-black p-2 text-center text-xl tracking-widest focus:outline-none" placeholder="密碼" />
            <div className="flex gap-2">
              <button onClick={() => { setShowResetModal(false); setResetPwd(''); }} className="flex-1 py-3 text-[#666]">取消</button>
              <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">確認</button>
            </div>
          </div>
        </div>
      )}

      {/* 人員選擇器 */}
      {showStaffModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full h-[70vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold">選擇人員</h3>
              <button onClick={() => setShowStaffModal(false)} className="p-2"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 bg-gray-50">
              {INITIAL_STAFF.filter(n => n.includes(staffSearch)).map(n => (
                <button key={n} onClick={() => selectStaff(n)} className="py-4 px-4 bg-white rounded-xl text-sm font-bold shadow-sm active:scale-95 border hover:border-black">
                  {String(n)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}