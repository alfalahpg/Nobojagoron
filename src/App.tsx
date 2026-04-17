import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  PlusCircle, 
  Lock, 
  LogOut, 
  Search, 
  Download, 
  Table as TableIcon,
  ChevronRight,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  XCircle,
  Settings,
  LayoutDashboard,
  ShieldAlert,
  PiggyBank,
  Coffee,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { MEMBERS, MONTHS, LedgerEntry, PaymentType } from './types';

// The user can set this in their environment variables
// @ts-ignore
const SCRIPT_URL = (import.meta as any).env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyUW0Zh44rk_xzrauRp06c-7v3OLVOjEcg4nCAZsyyH9N5lLV5OLtMDEK2b4ESkao1z/exec';

const convertToEnglishDigits = (str: string) => {
  const banglaDigits: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, d => banglaDigits[d]);
};

export default function App() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PaymentType | 'All'>('All');
  const [filterMonth, setFilterMonth] = useState<string | 'All'>('All');
  const [filterMember, setFilterMember] = useState<string | 'All'>('All');
  
  // Form State
  const [formData, setFormData] = useState({
    member: MEMBERS[0],
    paymentType: 'মাসিক কিস্তি' as PaymentType,
    amount: '',
    month: MONTHS[new Date().getMonth()],
    reference: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMemberName, setEditingMemberName] = useState<string | null>(null);
  const [tempMemberName, setTempMemberName] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'savings' | 'expense' | 'invest'>('savings');
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [formError, setFormError] = useState<string | null>(null);
  const [memberList, setMemberList] = useState<string[]>(MEMBERS);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    // Check if was admin
    const saved = localStorage.getItem('samity_admin');
    if (saved === 'true') setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    if (!SCRIPT_URL) {
      setLoading(false);
      // Mock data for demo if no URL
      setEntries([
        { id: '1', member: 'মো: মোজাফফর', paymentType: 'মাসিক কিস্তি', amount: 500, month: 'জানুয়ারি', date: '2024-01-15' },
        { id: '2', member: 'মো: রাশিদুল ইসলাম', paymentType: 'এককালীন জমা', amount: 2000, month: 'জানুয়ারি', date: '2024-01-20' },
      ]);
      setMemberList(MEMBERS);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setEntries(data);
      } else if (data && data.entries) {
        setEntries(data.entries);
      }
      
      if (data && data.members && data.members.length > 0) {
        setMemberList(data.members);
        // Ensure form member is valid
        if (!data.members.includes(formData.member)) {
          setFormData(prev => ({ ...prev, member: data.members[0] }));
        }
      }
    } catch (err) {
      console.error(err);
      setError('লিঙ্ক সংযোগ করতে ব্যর্থ হয়েছে। দয়াকরে SCRIPT_URL চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const englishPassword = convertToEnglishDigits(password);
    if (englishPassword === '1234') {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
      localStorage.setItem('samity_admin', 'true');
    } else {
      alert('সঠিক পাসওয়ার্ড দিন (পাসওয়ার্ড হলো ১২৩৪)');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setEditingId(null);
    localStorage.removeItem('samity_admin');
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setFormData({
      member: entry.member,
      paymentType: entry.paymentType,
      amount: entry.amount.toString(),
      month: entry.month,
      reference: entry.reference || ''
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRenameMember = async () => {
    if (!editingMemberName || !tempMemberName.trim() || tempMemberName === editingMemberName) {
      setEditingMemberName(null);
      return;
    }

    setLoading(true);
    const oldName = editingMemberName;
    const newName = tempMemberName.trim();

    try {
      if (SCRIPT_URL) {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ action: 'renameMember', oldName, newName })
        });
      }
      
      setMemberList(memberList.map(m => m === oldName ? newName : m));
      if (formData.member === oldName) setFormData({ ...formData, member: newName });
      setEntries(entries.map(e => e.member === oldName ? { ...e, member: newName } : e));
      
      setEditingMemberName(null);
      alert('সদস্যের নাম সফলভাবে পরিবর্তন করা হয়েছে।');
    } catch (err) {
      console.error(err);
      alert('নাম পরিবর্তনে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = (name: string) => {
    setConfirmModal({
      show: true,
      title: 'সদস্য মুছুন',
      message: `'${name}' কে কি তালিকা থেকে মুছে ফেলতে চান? (তার আগের জমানো টাকার রেকর্ডগুলো সিস্টেমে থেকে যাবে)`,
      confirmText: 'হ্যাঁ, মুছুন',
      cancelText: 'না, থাক',
      onConfirm: async () => {
        setLoading(true);
        setConfirmModal(null);
        try {
          if (SCRIPT_URL) {
            await fetch(SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              body: JSON.stringify({ action: 'deleteMember', name })
            });
          }
          
          setMemberList(prev => {
            const filtered = prev.filter(m => m !== name);
            if (formData.member === name) {
              setFormData(f => ({ ...f, member: filtered[0] || '' }));
            }
            return filtered;
          });
          setEditingMemberName(null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    setAddingMember(true);
    try {
      if (SCRIPT_URL) {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ action: 'addMember', name: newMemberName.trim() })
        });
      }
      
      setMemberList([...memberList, newMemberName.trim()]);
      setNewMemberName('');
      alert('নতুন সদস্য সফলভাবে যুক্ত করা হয়েছে।');
    } catch (err) {
      console.error(err);
      alert('সদস্য যুক্ত করতে সমস্যা হয়েছে।');
    } finally {
      setAddingMember(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ ...formData, amount: '' });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'তথ্য মুছুন',
      message: 'আপনি কি নিশ্চিত যে এই তথ্যটি মুছতে চান?',
      confirmText: 'হ্যাঁ, মুছুন',
      cancelText: 'না',
      onConfirm: async () => {
        setLoading(true);
        setConfirmModal(null);
        try {
          if (SCRIPT_URL) {
            await fetch(SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              body: JSON.stringify({ action: 'delete', id })
            });
          }
          setEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleResetLedger = () => {
    setConfirmModal({
      show: true,
      title: 'সম্পূর্ণ লেজার মুছুন',
      message: 'আপনি কি নিশ্চিত যে আপনি সমস্ত সঞ্চয় ও খরচের রেকর্ড মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না। (সদস্য তালিকা মুছবে না)',
      confirmText: 'হ্যাঁ, ডিলিট করুন',
      cancelText: 'না, থাক',
      onConfirm: async () => {
        setLoading(true);
        setConfirmModal(null);
        try {
          if (SCRIPT_URL) {
            await fetch(SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              body: JSON.stringify({ action: 'resetLedger' })
            });
          }
          setEntries([]);
          setCurrentView('dashboard');
          alert('সফলভাবে লেজার রিসেট করা হয়েছে।');
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormError(null);
    
    // Allow empty string, but filter out non-numeric characters (allowing for both En and Bn digits)
    const normalizedValue = convertToEnglishDigits(value);
    
    // Regex allows digits and at most one decimal point
    if (normalizedValue === '' || /^\d*\.?\d*$/.test(normalizedValue)) {
      setFormData({ ...formData, amount: value });
    } else {
      setFormError('শুধুমাত্র সংখ্যা ব্যবহার করুন।');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const englishAmountString = convertToEnglishDigits(formData.amount);
    const amount = parseFloat(englishAmountString);

    if (isNaN(amount) || amount <= 0) {
      setFormError('দয়া করে সঠিক টাকার পরিমাণ দিন।');
      return;
    }

    setSubmitting(true);
    const action = editingId ? 'update' : 'create';
    
    try {
      const payload = { 
        ...formData, 
        amount: amount, // Use the parsed number
        action, 
        id: editingId 
      };

      if (SCRIPT_URL) {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      
      if (editingId) {
        setEntries(entries.map(e => e.id === editingId ? { ...e, ...payload } : e));
      } else {
        const newEntry: LedgerEntry = {
          id: Date.now().toString(),
          member: formData.member,
          paymentType: formData.paymentType,
          amount: amount,
          month: formData.month,
          date: new Date().toISOString(),
          reference: formData.reference
        };
        setEntries([newEntry, ...entries]);
      }
      
      setFormData({ ...formData, amount: '', reference: '' });
      setEditingId(null);
      alert(editingId ? 'সফলভাবে আপডেট হয়েছে!' : 'সফলভাবে জমা হয়েছে!');
      
    } catch (err) {
      console.error(err);
      setFormError('সার্ভারে ডাটা পাঠাতে ত্রুটি ঘটেছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = searchTerm === '' || 
      e.member.includes(searchTerm) || 
      e.month.includes(searchTerm) ||
      e.paymentType.includes(searchTerm) ||
      (e.reference && e.reference.includes(searchTerm));
    
    const matchesType = filterType === 'All' || e.paymentType === filterType;
    const matchesMonth = filterMonth === 'All' || e.month === filterMonth;
    const matchesMember = filterMember === 'All' || e.member === filterMember;

    return matchesSearch && matchesType && matchesMonth && matchesMember;
  });

  const totalPureSavings = entries
    .filter(e => e.paymentType === 'মাসিক কিস্তি' || e.paymentType === 'এককালীন জমা')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalInvestment = entries
    .filter(e => e.paymentType === 'ইনভেস্ট')
    .reduce((sum, e) => sum + e.amount, 0);

  const displayedTotalSavings = totalPureSavings - totalInvestment;

  const totalSnackDeposits = entries
    .filter(e => e.paymentType === 'নাস্তার জন্য জমা')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSpent = entries
    .filter(e => e.paymentType === 'অন্যান্য খরচ')
    .reduce((sum, e) => sum + e.amount, 0);

  const snackFundBalance = totalSnackDeposits - totalSpent;

  return (
    <div className="min-h-screen bg-bg flex flex-col text-text font-sans">
      {/* Header */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-40 px-8 py-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-3 font-bold text-xl">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span className="bn">নব জাগরণ সমিতি</span>
        </div>
        
        {!isAdmin ? (
          <button 
            onClick={() => setShowLogin(true)}
            className="bg-white/20 border border-white/40 text-white px-4 py-2 rounded text-sm hover:bg-white/30 transition-all bn"
          >
            এডমিন লগইন
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard')}
              className="bg-white/20 border border-white/40 text-white px-3 py-2 rounded text-sm hover:bg-white/30 transition-all bn flex items-center gap-2"
            >
              {currentView === 'dashboard' ? (
                <><Settings className="w-4 h-4" /> সেটিংস</>
              ) : (
                <><LayoutDashboard className="w-4 h-4" /> ড্যাশবোর্ড</>
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="bg-red-500/80 border border-red-200 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-all bn"
            >
              লগআউট
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 p-6 max-w-[1440px] mx-auto w-full overflow-hidden">
        {currentView === 'dashboard' ? (
          <>
            {/* Sidebar / Stats Panel */}
            <aside className="stats-panel flex flex-col gap-4 overflow-y-auto pr-2">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden card bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-default"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-green-100 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                    <PiggyBank className="w-5 h-5 text-green-600 group-hover:text-white" />
                  </div>
                  <div className="text-[10px] text-green-700 bg-green-100/50 border border-green-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bn">সঞ্চয়</div>
                </div>
                <div className="relative z-10">
                  <div className="text-[0.7rem] text-secondary uppercase tracking-widest font-bold bn mb-1 opacity-70">মোট সঞ্চয় (বাকি)</div>
                  <div className="text-3xl font-black text-slate-800 num tracking-tight">৳ {displayedTotalSavings.toLocaleString()}</div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden card bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-default"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ${snackFundBalance < 0 ? 'bg-red-50' : 'bg-blue-50'}`} />
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${snackFundBalance < 0 ? 'bg-red-100 group-hover:bg-red-600 group-hover:text-white' : 'bg-blue-100 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <Coffee className={`w-5 h-5 ${snackFundBalance < 0 ? 'text-red-500 group-hover:text-white' : 'text-blue-500 group-hover:text-white'}`} />
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bn border ${snackFundBalance < 0 ? 'text-red-700 bg-red-100/50 border-red-200' : 'text-blue-700 bg-blue-100/50 border-blue-200'}`}>তহবিল</div>
                </div>
                <div className="relative z-10">
                  <div className="text-[0.7rem] text-secondary uppercase tracking-widest font-bold bn mb-1 opacity-70">নাস্তা/খরচ তহবিল</div>
                  <div className={`text-3xl font-black num tracking-tight ${snackFundBalance < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                    ৳ {snackFundBalance.toLocaleString()}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden card bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-default"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-indigo-100 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <TrendingUp className="w-5 h-5 text-indigo-600 group-hover:text-white" />
                  </div>
                  <div className="text-[10px] text-indigo-700 bg-indigo-100/50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bn">বিনিয়োগ</div>
                </div>
                <div className="relative z-10">
                  <div className="text-[0.7rem] text-secondary uppercase tracking-widest font-bold bn mb-1 opacity-70">মোট ইনভেস্ট</div>
                  <div className="text-3xl font-black text-indigo-600 num tracking-tight">৳ {totalInvestment.toLocaleString()}</div>
                </div>
              </motion.div>

          <div className="card bg-white border border-border rounded-lg p-5 shadow-sm flex flex-col h-[350px]">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between bn">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                সদস্য তালিকা ও মোট সঞ্চয়
              </span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] num">
                {memberList.length} জন
              </span>
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              {memberList.map((m, idx) => {
                const memberEntries = entries.filter(e => e.member === m);
                const monthlyTotal = memberEntries
                  .filter(e => e.paymentType === 'মাসিক কিস্তি')
                  .reduce((sum, e) => sum + e.amount, 0);
                const oneTimeTotal = memberEntries
                  .filter(e => e.paymentType === 'এককালীন জমা')
                  .reduce((sum, e) => sum + e.amount, 0);
                const snackTotal = memberEntries
                  .filter(e => e.paymentType === 'নাস্তার জন্য জমা')
                  .reduce((sum, e) => sum + e.amount, 0);
                const total = monthlyTotal + oneTimeTotal;

                return (
                  <motion.div 
                    key={m} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (idx * 0.03) }}
                    className="border-b border-slate-50 pb-3 group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-col min-w-0 w-full">
                        {editingMemberName === m ? (
                          <div className="flex flex-col gap-2 w-full pr-2">
                            <input 
                              autoFocus
                              type="text"
                              value={tempMemberName}
                              onChange={e => setTempMemberName(e.target.value)}
                              className="w-full p-1.5 text-sm border border-primary rounded outline-none bn"
                            />
                            <div className="flex gap-1">
                              <button 
                                onClick={handleRenameMember}
                                className="flex-1 bg-primary text-white text-[10px] py-1 px-2 rounded bn hover:bg-blue-800"
                              >
                                আপডেট
                              </button>
                              <button 
                                onClick={() => handleDeleteMember(m)}
                                className="flex-1 bg-red-500 text-white text-[10px] py-1 px-2 rounded bn hover:bg-red-600"
                              >
                                মুছুন
                              </button>
                              <button 
                                onClick={() => setEditingMemberName(null)}
                                className="flex-1 bg-slate-200 text-slate-600 text-[10px] py-1 px-2 rounded bn hover:bg-slate-300"
                              >
                                বাতিল
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-800 font-bold bn leading-tight text-sm flex items-center justify-between">
                            <span className="truncate">{m}</span>
                            {isAdmin && (
                              <button 
                                onClick={() => {
                                  setEditingMemberName(m);
                                  setTempMemberName(m);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary transition-all rounded-full hover:bg-slate-100"
                                title="এডিট করুন"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {editingMemberName !== m && (
                        <span className="text-primary font-bold text-sm num ml-2">৳{total.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-secondary font-medium bn">
                      <div className="bg-blue-50/50 px-1 py-1 rounded-lg border border-blue-100/50 flex flex-col items-center hover:bg-blue-100/50 transition-colors">
                        <span className="truncate opacity-70">মাসিক কিস্তি</span>
                        <span className="text-blue-700 num font-bold">৳{monthlyTotal.toLocaleString()}</span>
                      </div>
                      <div className="bg-amber-50/50 px-1 py-1 rounded-lg border border-amber-100/50 flex flex-col items-center hover:bg-amber-100/50 transition-colors">
                        <span className="truncate opacity-70">এককালীন</span>
                        <span className="text-amber-700 num font-bold">৳{oneTimeTotal.toLocaleString()}</span>
                      </div>
                      <div className="bg-green-50/50 px-1 py-1 rounded-lg border border-green-100/50 flex flex-col items-center hover:bg-green-100/50 transition-colors">
                        <span className="truncate opacity-70">অন্যান্য/নাস্তা</span>
                        <span className="text-green-700 num font-bold">৳{snackTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="group card bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-default"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                <TableIcon className="w-4 h-4" />
              </div>
              <div className="text-[0.7rem] text-secondary uppercase tracking-widest font-bold bn opacity-70">সাম্প্রতিক আপডেট</div>
            </div>
            <div className="text-2xl font-black text-primary num leading-none">{entries.length.toLocaleString()} <span className="text-sm font-bold bn ml-1 text-secondary">টি এন্ট্রি</span></div>
          </motion.div>

          <AnimatePresence>
            {isAdmin && (
              <motion.div 
                ref={formRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="text-primary font-bold mb-2 flex items-center justify-between bn">
                  <span className="flex items-center gap-2">
                    <span className="text-xs">●</span> 
                    নতুন সদস্য যুক্ত করুন (Admin)
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 border-dashed p-4 rounded-lg mb-4">
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 p-2 bg-white border border-border rounded outline-none bn text-sm"
                      placeholder="সদস্যের নাম"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      required
                    />
                    <button 
                      type="submit"
                      disabled={addingMember}
                      className="bg-primary text-white px-3 py-2 rounded text-sm font-bold bn hover:bg-blue-800 transition-all disabled:opacity-50"
                    >
                      {addingMember ? '...' : <PlusCircle className="w-4 h-4" />}
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
                  <button 
                    onClick={() => {
                      setActiveTab('savings');
                      setFormData(prev => ({ ...prev, paymentType: 'মাসিক কিস্তি' }));
                    }}
                    className={`flex-1 py-2 px-2 rounded-md text-[10px] font-bold transition-all bn ${activeTab === 'savings' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:bg-white/50'}`}
                  >
                    সঞ্চয় জমা
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('expense');
                      setFormData(prev => ({ ...prev, paymentType: 'অন্যান্য খরচ' }));
                    }}
                    className={`flex-1 py-2 px-2 rounded-md text-[10px] font-bold transition-all bn ${activeTab === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-secondary hover:bg-white/50'}`}
                  >
                    খরচ এন্ট্রি
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('invest');
                      setFormData(prev => ({ ...prev, paymentType: 'ইনভেস্ট' }));
                    }}
                    className={`flex-1 py-2 px-2 rounded-md text-[10px] font-bold transition-all bn ${activeTab === 'invest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-secondary hover:bg-white/50'}`}
                  >
                    ইনভেস্ট
                  </button>
                </div>

                <div className="text-primary font-bold mb-2 flex items-center justify-between bn">
                  <span className="flex items-center gap-2">
                    <span className="text-xs">●</span> 
                    {editingId ? 'তথ্য সংশোধন (Admin)' : (activeTab === 'savings' ? 'নতুন সঞ্চয় জমা' : activeTab === 'expense' ? 'নতুন খরচ এন্ট্রি' : 'নতুন ইনভেস্ট এন্ট্রি')}
                  </span>
                  {editingId && (
                    <button onClick={cancelEdit} className="text-red-500 hover:text-red-700">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className={`border-1.5 border-dashed p-4 rounded-lg flex flex-col gap-4 transition-colors ${editingId ? 'bg-amber-50 border-amber-300' : (activeTab === 'savings' ? 'bg-primary-light border-accent' : activeTab === 'expense' ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-200')}`}>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {activeTab === 'savings' ? (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[0.85rem] font-semibold bn">সদস্যের নাম</label>
                          <select 
                            required
                            className="p-2.5 bg-white border border-border rounded outline-none bn text-sm"
                            value={formData.member}
                            onChange={e => setFormData({ ...formData, member: e.target.value })}
                          >
                            {memberList.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[0.85rem] font-semibold bn">পেমেন্ট টাইপ</label>
                          <select 
                            className="p-2.5 bg-white border border-border rounded outline-none bn text-sm"
                            value={formData.paymentType}
                            onChange={e => setFormData({ ...formData, paymentType: e.target.value as PaymentType })}
                          >
                            <option value="মাসিক কিস্তি">মাসিক কিস্তি</option>
                            <option value="এককালীন জমা">এককালীন জমা</option>
                            <option value="নাস্তার জন্য জমা">নাস্তার জন্য জমা</option>
                          </select>
                        </div>
                      </>
                    ) : activeTab === 'expense' ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[0.85rem] font-semibold bn">খরচের খাত / বিষয়</label>
                        <input 
                          type="text"
                          required
                          className="p-2.5 bg-white border border-border rounded outline-none bn text-sm"
                          placeholder="যেমন: নাস্তা, পরিবহন ইত্যাদি"
                          value={formData.member === memberList[0] ? '' : formData.member}
                          onChange={e => setFormData({ ...formData, member: e.target.value || 'সাধারণ খরচ', paymentType: 'অন্যান্য খরচ' })}
                        />
                        <p className="text-[10px] text-secondary bn">* খরচের নাম এখানে লিখুন (যেমন: নাস্তা খরচ)</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[0.85rem] font-semibold bn">ইনভেস্টিং সেক্টর / বিষয়</label>
                        <input 
                          type="text"
                          required
                          className="p-2.5 bg-white border border-border rounded outline-none bn text-sm"
                          placeholder="যেমন: জমি, শেয়ার ইত্যাদি"
                          value={formData.member === memberList[0] ? '' : formData.member}
                          onChange={e => setFormData({ ...formData, member: e.target.value || 'সাধারণ ইনভেস্ট', paymentType: 'ইনভেস্ট' })}
                        />
                        <p className="text-[10px] text-secondary bn">* ইনভেস্টের নাম এখানে লিখুন</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.85rem] font-semibold bn">টাকার পরিমাণ</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        required
                        className={`p-2.5 bg-white border rounded outline-none bn text-sm font-mono transition-all ${formError ? 'border-red-500 ring-1 ring-red-100' : 'border-border'}`}
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={handleAmountChange}
                      />
                      {formError && (
                        <p className="text-[10px] text-red-600 font-bold bn animate-pulse">
                          ⚠ {formError}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.85rem] font-semibold bn">মাস</label>
                      <select 
                        required
                        className="p-2.5 bg-white border border-border rounded outline-none bn text-sm"
                        value={formData.month}
                        onChange={e => setFormData({ ...formData, month: e.target.value })}
                      >
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.85rem] font-semibold bn">রেফারেন্স</label>
                      <input 
                        type="text"
                        className="p-2.5 bg-white border border-border rounded outline-none bn text-sm"
                        placeholder="রেফারেন্স লিখুন (ঐচ্ছিক)"
                        value={formData.reference}
                        onChange={e => setFormData({ ...formData, reference: e.target.value })}
                      />
                    </div>

                    <button 
                      disabled={submitting}
                      className={`text-white p-3 rounded font-bold cursor-pointer transition-colors mt-2 bn disabled:opacity-50 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : (activeTab === 'savings' ? 'bg-primary hover:bg-blue-800' : activeTab === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700')}`}
                    >
                      {submitting ? 'প্রক্রিয়াধীন...' : (editingId ? 'আপডেট করুন' : (activeTab === 'savings' ? 'জমা করুন' : activeTab === 'expense' ? 'খরচ এন্ট্রি করুন' : 'ইনভেস্ট এন্ট্রি করুন'))}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Ledger View / Main Content */}
        <section className="ledger-view flex flex-col gap-4 min-w-0 h-full overflow-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
                <input 
                  type="text"
                  placeholder="রেফারেন্স বা সাধারণভাবে খুঁজুন..."
                  className="w-full bg-white border border-border rounded px-4 py-2 pl-10 outline-none focus:border-accent transition-all bn text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-border rounded text-secondary text-sm hover:bg-slate-50 transition-all flex items-center gap-2 bn"
              >
                <Download className="w-4 h-4" />
                প্রিন্ট করুন
              </button>
            </div>

            {/* Detailed Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-secondary uppercase bn px-1">সদস্য ফিল্টার</label>
                <select 
                  className="bg-white border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary bn"
                  value={filterMember}
                  onChange={e => setFilterMember(e.target.value)}
                >
                  <option value="All">সকল সদস্য</option>
                  {memberList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-secondary uppercase bn px-1">পেমেন্ট টাইপ ফিল্টার</label>
                <select 
                  className="bg-white border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary bn"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                >
                  <option value="All">সকল পেমেন্ট টাইপ</option>
                  <option value="মাসিক কিস্তি">মাসিক কিস্তি</option>
                  <option value="এককালীন জমা">এককালীন জমা</option>
                  <option value="নাস্তার জন্য জমা">নাস্তার জন্য জমা</option>
                  <option value="ইনভেস্ট">ইনভেস্ট</option>
                  <option value="অন্যান্য খরচ">অন্যান্য খরচ</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-secondary uppercase bn px-1">মাস ফিল্টার</label>
                <select 
                  className="bg-white border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary bn"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="All">সকল মাস</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="table-container bg-white border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-sm bn">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f1f5f9]">
                    <th className="text-left p-4 font-semibold text-secondary border-b-2 border-border">সদস্যের নাম</th>
                    <th className="text-left p-4 font-semibold text-secondary border-b-2 border-border">পেমেন্ট টাইপ</th>
                    <th className="text-left p-4 font-semibold text-secondary border-b-2 border-border">মাস</th>
                    <th className="text-left p-4 font-semibold text-secondary border-b-2 border-border">রেফারেন্স</th>
                    <th className="text-left p-4 font-semibold text-secondary border-b-2 border-border">পরিমাণ</th>
                    <th className="text-left p-4 font-semibold text-secondary border-b-2 border-border">তারিখ</th>
                    {isAdmin && <th className="text-center p-4 font-semibold text-secondary border-b-2 border-border">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && !submitting ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="p-12 text-center text-secondary">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="p-12 text-center text-secondary">
                        কোনো তথ্য পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-bg hover:bg-slate-50 transition-colors'}>
                        <td className="p-4 font-medium">{item.member}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[0.7rem] font-bold ${
                            item.paymentType === 'মাসিক কিস্তি' 
                              ? 'bg-[#dbeafe] text-[#1e40af]' 
                              : item.paymentType === 'এককালীন জমা'
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : item.paymentType === 'নাস্তার জন্য জমা'
                                  ? 'bg-[#dcfce7] text-[#166534]'
                                  : item.paymentType === 'ইনভেস্ট'
                                    ? 'bg-[#e0e7ff] text-[#3730a3]'
                                    : 'bg-[#fee2e2] text-[#991b1b]'
                          }`}>
                            {item.paymentType}
                          </span>
                        </td>
                        <td className="p-4 text-secondary">{item.month}</td>
                        <td className="p-4 text-secondary text-xs bn">{item.reference || '-'}</td>
                        <td className="p-4 font-bold num text-slate-800">৳ {item.amount.toLocaleString()}</td>
                        <td className="p-4 text-secondary text-xs num">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="এডিট"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-right text-[0.8rem] text-secondary bn">
            * শেষ আপডেট: মাত্র এই মুহূর্তে
          </div>
        </section>
          </>
        ) : (
          /* Admin Settings View */
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-1 lg:col-span-2 max-w-4xl mx-auto w-full space-y-8 py-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bn">এডমিন সেটিংস</h2>
                <p className="text-secondary text-sm bn font-medium">সমিতির কন্ট্রোল প্যানেল এবং কনফিগারেশন</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member Management */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-bold bn text-slate-800">সদস্য ব্যবস্থাপনা</h3>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {memberList.map(m => (
                    <div key={m} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                      <span className="font-bold bn text-slate-700 text-sm">{m}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingMemberName(m);
                            setTempMemberName(m);
                            setCurrentView('dashboard');
                            setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(m)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dangerous Zone */}
              <div className="space-y-6">
                <div className="bg-red-50 rounded-2xl border border-red-100 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 text-red-600">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="font-bold bn">বিপজ্জনক জোন (Reset)</h3>
                  </div>
                  <p className="text-[13px] text-red-700 bn mb-6 leading-relaxed font-medium">
                    নিচের বাটনটি চাপলে লেজারের সমস্ত সঞ্চয় এবং খরচের তথ্য চিরস্থায়ীভাবে মুছে যাবে। এটি শুধুমাত্র তখনই করুন যখন সম্পূর্ণ নতুন করে সমিতির হিসাব শুরু করতে চান।
                  </p>
                  <button 
                    onClick={handleResetLedger}
                    className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 bn text-sm"
                  >
                    লেজার রিসেট করুন (Reset Master)
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 text-slate-800">
                    <Download className="w-5 h-5 text-primary" />
                    <h3 className="font-bold bn">ব্যাকআপ এবং কনফিগারেশন</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="text-[11px] font-bold text-secondary uppercase tracking-widest block mb-1 bn">আপনার স্ক্রিপ্ট লিঙ্ক</label>
                      <code className="text-[10px] text-primary break-all font-mono opacity-60">
                        {SCRIPT_URL || 'নট কানেক্টেড'}
                      </code>
                    </div>
                    <button 
                      onClick={() => window.open(SCRIPT_URL || '#', '_blank')}
                      className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-200 transition-all text-xs bn"
                    >
                      গুগল শিট ওপেন করুন
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-lg p-8 w-full max-w-sm shadow-2xl"
            >
              <h2 className="text-xl font-bold text-center mb-6 bn">এডমিন লগইন</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  autoFocus
                  type="password"
                  placeholder="পাসওয়ার্ড (১২৩৪)"
                  className="w-full bg-bg border border-border rounded px-4 py-3 text-center outline-none focus:border-primary transition-all bn"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded font-bold hover:bg-blue-800 transition-all bn"
                >
                  প্রবেশ করুন
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl border border-border"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold bn">{confirmModal.title}</h3>
              </div>
              <p className="text-secondary text-sm mb-6 bn leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-secondary rounded font-bold hover:bg-slate-200 transition-all bn text-sm"
                >
                  {confirmModal.cancelText || 'বাতিল'}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-all shadow-md shadow-red-200 bn text-sm"
                >
                  {confirmModal.confirmText || 'হ্যাঁ'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

