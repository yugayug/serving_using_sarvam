"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown,
  Clock3, Coffee, Heart, Home, Leaf, Mic, MoreHorizontal, Volume2,
  Plus, Send, ShoppingBasket, Sparkles, Stethoscope, Sun, TrendingDown, Wallet
} from 'lucide-react';

const languages = [
  ['en-IN', 'English'], ['hi-IN', 'हिन्दी'], ['ta-IN', 'தமிழ்'], ['te-IN', 'తెలుగు'],
  ['kn-IN', 'ಕನ್ನಡ'], ['bn-IN', 'বাংলা'], ['mr-IN', 'मराठी'], ['gu-IN', 'ગુજરાતી'], ['pa-IN', 'ਪੰਜਾਬੀ']
];

const starter = {
  profile: 'Amma',
  groceries: [
    { id: 1, name: 'Tomatoes', qty: '4', checked: false, addedBy: 'Amma' },
    { id: 2, name: 'Milk', qty: '1 litre', checked: false, addedBy: 'Arjun' },
    { id: 3, name: 'Coriander', qty: '1 bunch', checked: true, addedBy: 'Amma' }
  ],
  meals: [
    { id: 1, day: 'Today', slot: 'Lunch', title: 'Paneer bhurji & roti', by: 'Amma' },
    { id: 2, day: 'Today', slot: 'Dinner', title: 'Lemon rice + cucumber raita', by: 'Arjun' },
    { id: 3, day: 'Tomorrow', slot: 'Lunch', title: 'Chana masala', by: 'Amma' }
  ],
  meds: [
    { id: 1, name: 'Vitamin D', time: '8:30 AM', person: 'Amma', done: false },
    { id: 2, name: 'Allergy tablet', time: '9:00 PM', person: 'Arjun', done: false }
  ],
  expenses: [
    { id: 1, title: 'Vegetables', amount: 280, by: 'Amma', date: 'Today' },
    { id: 2, title: 'Auto fare', amount: 160, by: 'Arjun', date: 'Today' },
    { id: 3, title: 'Coffee', amount: 120, by: 'Amma', date: 'Yesterday' }
  ],
  notes: [
    { id: 1, by: 'Arjun', text: 'Can we make something without onion tomorrow?', time: '10:42 AM' },
    { id: 2, by: 'Amma', text: 'Sure! Let’s do chana masala.', time: '10:46 AM' }
  ],
  commute: { destination: 'Office', leaveAt: '8:45 AM', note: 'Leave 10 min early — usual roadworks' }
};

const sections = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'meals', label: 'Meal plan', icon: CalendarDays },
  { id: 'groceries', label: 'Groceries', icon: ShoppingBasket },
  { id: 'care', label: 'Reminders', icon: Heart },
  { id: 'money', label: 'Spending', icon: Wallet }
];

function App() {
  const [data, setData] = useState(starter);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState('voice');
  const [section, setSection] = useState('home');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [assistant, setAssistant] = useState({ busy: false, text: '' });
  const [voiceState, setVoiceState] = useState('idle');
  const [speaking, setSpeaking] = useState(false);
  const [sarvamReady, setSarvamReady] = useState(false);
  const [languageCode, setLanguageCode] = useState('en-IN');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    try { setData(prev => ({ ...prev, ...JSON.parse(localStorage.getItem('daylight-family-data') || '{}') })); }
    catch { /* Use the starter family when saved data is unavailable. */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem('daylight-family-data', JSON.stringify(data)); }, [data, hydrated]);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(d => setSarvamReady(d.sarvamConfigured)).catch(() => {}); }, []);

  const set = (key, value) => setData(prev => ({ ...prev, [key]: typeof value === 'function' ? value(prev[key]) : value }));
  const todayMeals = data.meals.filter(m => m.day === 'Today');
  const pendingMeds = data.meds.filter(m => !m.done);
  const totalSpent = data.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const checkedGroceries = data.groceries.filter(i => i.checked).length;
  const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  const speakReply = async (text) => {
    if (!text?.trim()) return;
    setSpeaking(true);
    if (sarvamReady) {
      try {
        const response = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, languageCode }) });
        const result = await response.json();
        if (response.ok && result.audio) {
          audioRef.current?.pause();
          const audio = new Audio(`data:audio/wav;base64,${result.audio}`);
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => setSpeaking(false);
          await audio.play();
          return;
        }
      } catch { /* Fall back to the browser voice if Sarvam audio cannot play. */ }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else setSpeaking(false);
  };

  const showReply = async (text) => {
    setAssistant({ busy: false, text });
    await speakReply(text);
  };

  const addGrocery = (name, qty = '1') => {
    if (!name.trim()) return;
    set('groceries', list => [{ id: Date.now(), name: name.trim(), qty, checked: false, addedBy: data.profile }, ...list]);
  };
  const addExpense = (title, amount) => {
    if (!title || !amount) return;
    set('expenses', list => [{ id: Date.now(), title, amount: Number(amount), by: data.profile, date: 'Today' }, ...list]);
  };
  const addMeal = (title, day = 'Tomorrow', slot = 'Dinner') => {
    if (!title.trim()) return;
    set('meals', list => [...list, { id: Date.now(), day, slot, title: title.trim(), by: data.profile }]);
  };
  const addMed = (name, time = '8:00 PM') => {
    if (!name.trim()) return;
    set('meds', list => [...list, { id: Date.now(), name: name.trim(), time, person: data.profile, done: false }]);
  };

  const handleCommand = async (raw, cameFromVoice = false) => {
    const text = raw.trim();
    if (!text) return;
    setMessage('');
    setAssistant({ busy: true, text: '' });
    const lower = text.toLowerCase();
    let reply = '';
    let match;
    if (sarvamReady) {
      try {
        const context = `Current family member: ${data.profile}. Groceries: ${data.groceries.map(g => `${g.name} (${g.checked ? 'picked up' : 'needed'})`).join(', ')}. Meals: ${data.meals.map(m => `${m.day} ${m.slot}: ${m.title}`).join('; ')}. Reminders: ${data.meds.map(m => `${m.name} for ${m.person} (${m.done ? 'done' : 'pending'})`).join('; ')}. Use this context to add or complete the right item.`;
        const response = await fetch('/api/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, context, languageCode }) });
        const intent = await response.json();
        if (response.ok) {
          const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
          switch (intent.intent) {
            case 'grocery_add': if (intent.item) addGrocery(intent.item, intent.quantity || '1'); break;
            case 'grocery_done': {
              const found = data.groceries.find(g => g.name.toLowerCase().includes(String(intent.item || '').toLowerCase()) && !g.checked);
              if (found) set('groceries', list => list.map(g => g.id === found.id ? { ...g, checked: true } : g));
              break;
            }
            case 'meal_add': if (intent.dish) addMeal(intent.dish, intent.day === 'Today' ? 'Today' : 'Tomorrow', ['Breakfast', 'Lunch', 'Dinner'].includes(intent.mealSlot) ? intent.mealSlot : 'Dinner'); break;
            case 'medication_add': if (intent.name) addMed(intent.name, intent.time || '8:00 PM'); break;
            case 'medication_done': {
              const found = data.meds.find(m => m.name.toLowerCase().includes(String(intent.name || '').toLowerCase()) && !m.done);
              if (found) set('meds', list => list.map(m => m.id === found.id ? { ...m, done: true } : m));
              break;
            }
            case 'expense_add': if (intent.amount && intent.category) addExpense(intent.category, intent.amount); break;
            case 'commute_update': set('commute', { ...data.commute, destination: intent.destination || data.commute.destination, note: intent.note || text }); break;
            case 'family_note': set('notes', list => [...list, { id: Date.now(), by: data.profile, text: intent.note || text, time: now }]); break;
            case 'bargain':
            case 'question': break;
          }
          setSection('home'); setView('dashboard');
          await showReply(intent.reply || 'Done — I updated the family dashboard.', cameFromVoice);
          return;
        }
      } catch { /* Fall through to fast local command matching. */ }
    }
    if ((match = text.match(/(?:tell|message|send a note to)\s+(?:mom|amma|son|arjun)\s*[:,]?\s+(.+)/i))) {
      const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      set('notes', list => [...list, { id: Date.now(), by: data.profile, text: match[1].replace(/[.!?]+$/, ''), time: now }]);
      reply = `I shared that note with your family.`;
    } else if ((match = text.match(/(?:mark|check)\s+(.+?)\s+(?:as\s+)?(?:bought|picked up|done)/i))) {
      const item = match[1].toLowerCase();
      const grocery = data.groceries.find(g => g.name.toLowerCase().includes(item) && !g.checked);
      const med = data.meds.find(m => m.name.toLowerCase().includes(item) && !m.done);
      if (grocery) { set('groceries', list => list.map(g => g.id === grocery.id ? { ...g, checked: true } : g)); reply = `Marked ${grocery.name} as picked up.`; }
      else if (med) { set('meds', list => list.map(m => m.id === med.id ? { ...m, done: true } : m)); reply = `Marked the ${med.name} reminder as done. Follow your clinician’s instructions.`; }
      else reply = `I couldn’t find ${item} on the open list.`;
    } else if ((match = text.match(/(?:add|log|record)\s+expense\s+(?:₹\s*)?([\d,]+)\s+(?:for|on)\s+(.+)/i))) {
      const [, amount, title] = match; addExpense(title.replace(/[.!?]+$/, ''), amount.replaceAll(',', ''));
      reply = `Logged ₹${Number(amount.replaceAll(',', '')).toLocaleString('en-IN')} for ${title}.`;
    } else if (!/\b(meal|dinner|lunch|breakfast|medicine|medication|tablet|reminder|expense)\b/.test(lower) && (match = lower.match(/(?:add|need|get|buy)\s+(.+?)(?:\s+to (?:the )?(?:grocery|shopping) list|\s+to groceries)?$/))) {
      const item = match[1].replace(/[.!?]+$/, ''); addGrocery(item);
      reply = `Added ${item} to the shared grocery list.`;
    } else if ((match = text.match(/(?:spent|paid|expense(?: of)?)\s+(?:₹\s*)?([\d,]+)\s+(?:on\s+)?(.+)/i))) {
      const [, amount, title] = match; addExpense(title.replace(/[.!?]+$/, ''), amount.replaceAll(',', ''));
      reply = `Logged ₹${Number(amount.replaceAll(',', '')).toLocaleString('en-IN')} for ${title}.`;
    } else if ((match = text.match(/(?:add\s+(?:a\s+)?(?:medication\s+)?reminder(?:\s+for)?|remind(?:er)?|medicine|medication|tablet)\s+(?:me\s+)?(?:to take\s+)?(.+?)(?:\s+at\s+(.+))?$/i))) {
      const med = match[1].replace(/[.!?]+$/, ''); addMed(med, match[2] || '8:00 PM');
      reply = `I added a reminder for ${med}. Please follow the instructions from your clinician or pharmacist.`;
    } else if ((match = text.match(/(?:add|plan)\s+(.+?)\s+to (?:the )?meal plan/i)) || (match = text.match(/(?:plan|add)\s+(?:a\s+)?(?:meal|dinner|lunch)?\s*(?:for\s+)?(?:today|tomorrow)?\s*(?:to be|:)?\s*(.+)/i))) {
      const meal = match[1].replace(/[.!?]+$/, '');
      const day = /\btoday\b/i.test(text) ? 'Today' : 'Tomorrow';
      const slot = /\blunch\b/i.test(text) ? 'Lunch' : /\bbreakfast\b/i.test(text) ? 'Breakfast' : 'Dinner';
      addMeal(meal, day, slot);
      reply = `Added ${meal} to ${day.toLowerCase()}’s ${slot.toLowerCase()} plan.`;
    } else if (lower.includes('commute') || lower.includes('office') || lower.includes('leave for')) {
      const destination = text.match(/(?:to|for)\s+([A-Za-z ]+)/i)?.[1]?.trim() || data.commute.destination;
      set('commute', { ...data.commute, destination, note: text });
      reply = `Saved your commute note for ${destination}. I don’t have live traffic data in this demo.`;
    } else if ((match = text.match(/(?:bargain|negotiate|seller asks?)\s+(?:for\s+)?(.+?)\s+(?:at|for|price(?: is)?)\s+₹?([\d,]+)/i))) {
      const [, item, price] = match; const offer = Math.max(1, Math.round(Number(price.replaceAll(',', '')) * 0.88));
      try {
        const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Help me politely bargain for ${item}. Seller asks ₹${price}. Give one friendly phrase and a starting offer around ₹${offer}. Keep it short.`, languageCode }) });
        const result = await response.json(); if (!response.ok) throw Error(); reply = result.reply;
      } catch { reply = `You could say: “Could you do ₹${offer} for this? I’m buying it today.”`; }
    } else {
      try {
        const context = `Meals: ${data.meals.map(m => `${m.day} ${m.slot}: ${m.title}`).join('; ')}. Groceries: ${data.groceries.map(i => i.name).join(', ')}. Shared by family members Amma and Arjun.`;
        const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, context, languageCode }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        reply = result.reply;
      } catch {
        reply = 'I can add groceries, meals, reminders, expenses, and commute notes. Try “add spinach to groceries” or “spent 250 on lunch”.';
      }
    }
    setSection('home'); setView('dashboard');
    await showReply(reply, cameFromVoice);
  };

  const startRecording = async () => {
    if (!sarvamReady) {
      setAssistant({ busy: false, text: 'Add your Sarvam API key in .env and restart the app to enable voice. Text commands are ready now.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => event.data.size && chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setVoiceState('transcribing');
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) { setAssistant({ busy: false, text: 'I did not catch any audio. Tap the mic and try again.' }); setVoiceState('idle'); return; }
        const form = new FormData(); form.append('audio', blob, 'family-command.webm'); form.append('languageCode', languageCode);
        try {
          const response = await fetch('/api/transcribe', { method: 'POST', body: form });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          await handleCommand(result.transcript, true);
        } catch (error) { setAssistant({ busy: false, text: error.message || 'Voice transcription failed. Try typing instead.' }); }
        setVoiceState('idle');
      };
      recorder.start(); setVoiceState('recording');
      window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 7000);
    } catch { setAssistant({ busy: false, text: 'Microphone access is unavailable. You can still use the text assistant.' }); }
  };

  const recordFamilyNote = async () => {
    if (!sarvamReady) { setAssistant({ busy: false, text: 'Add your Sarvam API key in .env and restart the app to dictate a family note.' }); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream); const pieces = [];
      recorder.ondataavailable = event => event.data.size && pieces.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop()); setVoiceState('transcribing');
        const blob = new Blob(pieces, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) { setAssistant({ busy: false, text: 'I did not catch any audio. Tap the mic and try again.' }); setVoiceState('idle'); return; }
        const form = new FormData(); form.append('audio', blob, 'family-note.webm'); form.append('languageCode', languageCode);
        try { const response = await fetch('/api/transcribe', { method: 'POST', body: form }); const result = await response.json(); if (!response.ok) throw Error(result.error); setNote(result.transcript || ''); }
        catch (error) { setAssistant({ busy: false, text: error.message || 'Could not transcribe your note.' }); }
        setVoiceState('idle');
      };
      recorder.start(); setVoiceState('recording'); window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 7000);
    } catch { setAssistant({ busy: false, text: 'Microphone access is unavailable. Type your note instead.' }); }
  };

  const addNote = (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    set('notes', list => [...list, { id: Date.now(), by: data.profile, text: note.trim(), time: now }]); setNote('');
  };

  return <div className={`app-shell ${view === 'voice' ? 'voice-home-mode' : ''}`}>
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={() => { setSection('home'); setView('voice'); }}><span className="brand-icon"><Sun size={19} /></span><span>daylight<span className="brand-dot">.</span></span></a>
      <div className="household"><div className="house-avatar"><Home size={16} /></div><div><span className="eyebrow">YOUR HOUSEHOLD</span><strong>The Kumar home</strong></div><ChevronDown size={15} className="muted" /></div>
      <div className="nav-label">Workspace</div>
      <nav>{sections.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${section === id ? 'active' : ''}`} onClick={() => setSection(id)}><Icon size={17} /><span>{label}</span>{id === 'care' && pendingMeds.length > 0 && <span className="nav-count">{pendingMeds.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip"><Sparkles size={16} /><p><strong>A little less to remember.</strong><br />Ask Daylight to keep track.</p></div>
        <div className="profile-switch"><span className="eyebrow">VIEWING AS</span><div className="profile-row"><div className={`avatar ${data.profile === 'Amma' ? 'peach' : 'blue'}`}>{data.profile === 'Amma' ? 'A' : 'R'}</div><div className="profile-name"><strong>{data.profile}</strong><span>{data.profile === 'Amma' ? 'Parent' : 'Son'}</span></div><select aria-label="Switch family profile" value={data.profile} onChange={e => set('profile', e.target.value)}><option>Amma</option><option>Arjun</option></select><ChevronDown size={15} /></div></div>
        <div className="sync-indicator"><span className="sync-dot" /> Saved on this device</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className={view === 'voice' ? 'top-brand' : 'breadcrumb'}>{view === 'voice' ? <><span className="brand-icon"><Sun size={17} /></span><strong>daylight<span className="brand-dot">.</span></strong><span className="top-brand-tag">FAMILY, IN SYNC</span></> : <>The Kumar home <span>/</span> <strong>{sections.find(s => s.id === section)?.label}</strong></>}</div><div className="top-actions"><span className={`sarvam-status ${sarvamReady ? 'online' : ''}`}><span />{sarvamReady ? 'Sarvam live' : 'Demo mode'}</span><label className="language-picker"><span>VOICE</span><select aria-label="Conversation language" value={languageCode} onChange={e => setLanguageCode(e.target.value)}>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><ChevronDown size={13} /></label>{view === 'voice' ? <button className="dashboard-link" onClick={() => setView('dashboard')}>Open dashboard <ArrowRight size={14} /></button> : <button className="dashboard-link" onClick={() => setView('voice')}><Mic size={14} /> Voice home</button>}<span className="today-date"><CalendarDays size={15} /> {dateLabel}</span><div className={`avatar small ${data.profile === 'Amma' ? 'peach' : 'blue'}`}>{data.profile === 'Amma' ? 'A' : 'R'}</div></div></header>

      <div className="content">
        {view === 'voice' ? <VoiceHome voiceState={voiceState} assistant={assistant} startRecording={startRecording} stopRecording={() => recorderRef.current?.stop()} runCommand={handleCommand} sarvamReady={sarvamReady} speakReply={speakReply} speaking={speaking} /> : <>
        {section === 'home' && <>
          <div className="welcome-row"><div><div className="eyebrow sun-eyebrow"><Sun size={13} /> A FRESH START</div><h1>Good morning, {data.profile === 'Amma' ? 'Amma' : 'Arjun'}<span className="wave">✳</span></h1><p className="subtitle">Here’s your family’s day, all in one place.</p></div><button className="soft-button" onClick={() => setSection('meals')}><CalendarDays size={15} /> Plan your week</button></div>
          <div className="stats-grid">
            <StatCard icon={ShoppingBasket} iconClass="sage" label="Grocery list" value={`${data.groceries.length - checkedGroceries} items`} caption={`${checkedGroceries} already picked up`} onClick={() => setSection('groceries')} />
            <StatCard icon={CalendarDays} iconClass="lavender" label="Today's meals" value={`${todayMeals.length} planned`} caption={todayMeals[0]?.title || 'Nothing planned yet'} onClick={() => setSection('meals')} />
            <StatCard icon={Heart} iconClass="rose" label="Reminders" value={`${pendingMeds.length} to go`} caption="Medication reminders" onClick={() => setSection('care')} />
            <StatCard icon={Wallet} iconClass="sand" label="Spent today" value={`₹${data.expenses.filter(e => e.date === 'Today').reduce((s, e) => s + Number(e.amount), 0).toLocaleString('en-IN')}`} caption="Across household expenses" onClick={() => setSection('money')} />
          </div>
          <div className="home-grid">
            <section className="panel day-panel"><div className="panel-heading"><div><div className="eyebrow">TUESDAY, 03 NOV</div><h2>The day ahead</h2></div><button className="text-button" onClick={() => setSection('care')}>All reminders <ArrowRight size={14} /></button></div>
              <div className="timeline">
                <div className="timeline-item"><div className="timeline-time">8:30 <small>AM</small></div><div className="timeline-line"><span className="timeline-dot mint" /></div><div className="timeline-body"><div className="timeline-title"><span>Vitamin D</span><span className="for-tag">Amma</span></div><p>Medication reminder <span className="time-chip"><Clock3 size={12} /> Today</span></p></div><button className="round-check" onClick={() => set('meds', list => list.map(m => m.id === 1 ? { ...m, done: !m.done } : m))}><Check size={14} /></button></div>
                <div className="timeline-item"><div className="timeline-time">12:30 <small>PM</small></div><div className="timeline-line"><span className="timeline-dot yellow" /></div><div className="timeline-body"><div className="timeline-title"><span>Paneer bhurji & roti</span><span className="for-tag">Lunch</span></div><p>Today's meal plan</p></div><span className="meal-emoji">🥘</span></div>
                <div className="timeline-item"><div className="timeline-time">8:45 <small>AM</small></div><div className="timeline-line"><span className="timeline-dot blue-dot" /></div><div className="timeline-body"><div className="timeline-title"><span>Leave for {data.commute.destination}</span><span className="for-tag">Arjun</span></div><p>{data.commute.note}</p></div><ArrowRight size={15} className="muted" /></div>
              </div>
              <div className="plan-strip"><div className="plan-icon"><CalendarDays size={16} /></div><div><strong>Keep the day in sync</strong><p>Add a meal or reminder for everyone at home.</p></div><button onClick={() => setSection('meals')}><Plus size={16} /></button></div>
            </section>
            <section className="panel family-panel"><div className="panel-heading"><div><div className="eyebrow">A NOTE FROM HOME</div><h2>Family notes <span className="note-count">{data.notes.length}</span></h2></div><MoreHorizontal size={19} className="muted" /></div>
              <div className="message-list">{data.notes.slice(-3).map(item => <div className={`message ${item.by === data.profile ? 'own' : ''}`} key={item.id}><div className={`avatar tiny ${item.by === 'Amma' ? 'peach' : 'blue'}`}>{item.by === 'Amma' ? 'A' : 'R'}</div><div className="message-content"><div className="message-meta"><strong>{item.by}</strong><span>{item.time}</span></div><p>{item.text}</p></div></div>)}</div>
              <form className="note-composer" onSubmit={addNote}><input value={note} onChange={e => setNote(e.target.value)} placeholder="Leave a note for your family…" aria-label="Family note" /><button type="button" className={`note-mic ${voiceState === 'recording' ? 'recording' : ''}`} aria-label="Dictate family note" onClick={recordFamilyNote}><Mic size={14} /></button><button aria-label="Send note" disabled={!note.trim()}><Send size={15} /></button></form><div className="voice-note-hint"><Mic size={12} /> Dictate a note for your family</div>
            </section>
          </div>
          <div className="footer-note"><span>MADE FOR THE LITTLE THINGS</span><span>Family data stays in this browser <span className="footer-dot">·</span> {sarvamReady ? 'Sarvam voice is ready' : 'Text mode'}</span></div>
        </>}

        {section === 'meals' && <Meals data={data} addMeal={addMeal} languageCode={languageCode} />}
        {section === 'groceries' && <Groceries data={data} set={set} addGrocery={addGrocery} languageCode={languageCode} />}
        {section === 'care' && <Care data={data} set={set} addMed={addMed} />}
        {section === 'money' && <Money data={data} addExpense={addExpense} total={totalSpent} />}
        </>}
      </div>
      {view === 'dashboard' && <section className="assistant-banner voice-dock"><div className="assistant-orb"><Sparkles size={19} /></div><div className="assistant-prompt"><div><span className="eyebrow">DAYLIGHT VOICE ASSISTANT</span><strong>{voiceState === 'recording' ? 'Listening… tap to finish' : 'Say what you need, in your language'}</strong></div><form onSubmit={e => { e.preventDefault(); handleCommand(message); }}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="“Add tomatoes”, “plan dinner”, “spent 250 on lunch”…" aria-label="Ask Daylight by voice or text" /><button type="button" className={`mic-button ${voiceState === 'recording' ? 'recording' : ''}`} onClick={voiceState === 'recording' ? () => recorderRef.current?.stop() : startRecording} aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start voice command'}><Mic size={16} /></button><button className="send-button" aria-label="Send command" disabled={!message.trim() || assistant.busy}><ArrowRight size={17} /></button></form>{(assistant.busy || assistant.text) && <div className="assistant-reply">{assistant.busy ? <><span className="typing" /> Thinking…</> : <><Sparkles size={13} /> <span>{assistant.text}</span><button className="reply-speak" onClick={() => speakReply(assistant.text)} aria-label="Speak reply">{speaking ? 'Speaking…' : <Volume2 size={15} />}</button></>}</div>}<div className="demo-prompts"><span>TRY SAYING</span><button onClick={() => handleCommand('Add spinach to groceries')}>Add groceries</button><button onClick={() => handleCommand('Plan dinner tomorrow: dal khichdi')}>Plan dinner</button><button onClick={() => handleCommand('Spent 250 on fruit')}>Log spending</button><button onClick={() => handleCommand('Remind me to take vitamins at 8 PM')}>Set reminder</button></div></div></section>}
    </main>
  </div>;
}

function VoiceHome({ voiceState, assistant, startRecording, stopRecording, runCommand, sarvamReady, speakReply, speaking }) {
  const recording = voiceState === 'recording';
  const working = voiceState === 'transcribing' || assistant.busy;
  return <section className="voice-landing">
    <div className="voice-copy"><span className="voice-kicker"><span className="kicker-dot" /> YOUR FAMILY’S VOICE COMPANION</span><h1>Home runs on<br /><em>little conversations.</em></h1><p>Tell Daylight what your family needs. Meals, groceries, reminders, and more — handled with one simple voice command.</p>
      <div className="voice-language-note"><span className="language-globe">◉</span> Understands your language <span className="language-separator">·</span> Speaks back to you</div>
    </div>
    <div className="voice-orbit-wrap"><div className={`voice-orbit orbit-one ${recording ? 'active' : ''}`} /><div className={`voice-orbit orbit-two ${recording ? 'active' : ''}`} /><div className={`voice-orbit orbit-three ${recording ? 'active' : ''}`} /><button className={`hero-mic ${recording ? 'recording' : ''} ${working ? 'working' : ''}`} onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop listening' : 'Start talking'}><span className="hero-mic-inner">{working ? <span className="hero-loader" /> : <Mic size={31} strokeWidth={1.7} />}</span></button><span className="orbit-spark spark-a">✳</span><span className="orbit-spark spark-b">✦</span></div>
    <div className="voice-action"><span className="voice-action-title">{recording ? 'Listening — tap the mic when you’re done' : working ? 'Daylight is working on it…' : sarvamReady ? 'Tap the mic and tell me what you need' : 'Add your Sarvam key to turn on the microphone'}</span><span className="voice-action-sub">{sarvamReady ? 'Your voice stays in the moment. No menus to navigate.' : 'You can still explore the dashboard in demo mode.'}</span>
      {assistant.text && <div className="voice-response"><Sparkles size={15} /><span>{assistant.text}</span><button className="reply-speak" onClick={() => speakReply(assistant.text)} aria-label="Speak reply">{speaking ? 'Speaking…' : <Volume2 size={16} />}</button></div>}
    </div>
    <div className="voice-examples"><span>TRY SAYING</span><button onClick={() => runCommand('Add spinach to groceries')}>“Add spinach to groceries”</button><button onClick={() => runCommand('Plan dinner tomorrow: dal khichdi')}>“Plan dinner tomorrow”</button><button onClick={() => runCommand('Spent 250 on fruit')}>“I spent 250 on fruit”</button></div>
    <div className="voice-bottomline"><div className="mini-family"><span className="avatar peach">A</span><span className="avatar blue">R</span><span>Made for the whole household</span></div><span className="voice-sarvam"><span /> Powered by Sarvam</span></div>
  </section>;
}

function StatCard({ icon: Icon, iconClass, label, value, caption, onClick }) {
  return <button className="stat-card" onClick={onClick}><div className={`stat-icon ${iconClass}`}><Icon size={17} /></div><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-caption">{caption}</span><ArrowRight className="stat-arrow" size={15} /></button>;
}

function PageHeader({ eyebrow, title, subtitle, action }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</div>;
}

function Meals({ data, addMeal, languageCode }) {
  const [title, setTitle] = useState(''); const [day, setDay] = useState('Today'); const [slot, setSlot] = useState('Dinner'); const [idea, setIdea] = useState('Try lemon rice with cucumber raita using pantry staples.'); const [ideaBusy, setIdeaBusy] = useState(false);
  const days = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const getIdea = async () => {
    setIdeaBusy(true);
    const ingredients = data.groceries.map(g => g.name).join(', ') || 'common pantry ingredients';
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Suggest one simple family dinner idea using these ingredients where possible: ${ingredients}. Keep it under 35 words.`, context: `Family meal plan: ${data.meals.map(m => `${m.day} ${m.slot}: ${m.title}`).join('; ')}`, languageCode }) });
      const result = await response.json(); if (!response.ok) throw Error(); setIdea(result.reply);
    } catch { setIdea(`Try a simple dinner with ${ingredients}: make a quick sabzi, serve it with rice or roti, and add a cooling side.`); }
    setIdeaBusy(false);
  };
  return <><PageHeader eyebrow="A WEEK THAT WORKS FOR EVERYONE" title="Meal planning" subtitle="Plan together, make room for everyone's favourites." action={<button className="primary-button" onClick={() => document.getElementById('meal-title')?.focus()}><Plus size={16} /> Add a meal</button>} />
    <div className="meal-layout"><section className="panel meal-planner"><div className="panel-heading"><div><div className="eyebrow">YOUR FAMILY MENU</div><h2>This week</h2></div><span className="shared-pill"><span /> Shared with family</span></div>
      <div className="week-strip">{days.map((d, i) => <div className={`week-day ${i === 0 ? 'selected' : ''}`} key={d}><span>{['TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON'][i]}</span><strong>{3 + i}</strong></div>)}</div>
      <div className="meal-list">{days.slice(0, 5).map(d => { const entries = data.meals.filter(m => m.day === d); return <div className="meal-day-row" key={d}><div className="meal-day-label"><span className="day-dot" />{d}</div><div className="meal-day-content">{entries.length ? entries.map(m => <div className="meal-entry" key={m.id}><div className="meal-entry-icon">{m.slot === 'Lunch' ? '☀️' : '🌙'}</div><div className="meal-entry-name"><span>{m.slot}</span><strong>{m.title}</strong></div><span className="for-tag">{m.by}</span></div>) : <button className="empty-meal" onClick={() => { setDay(d); document.getElementById('meal-title')?.focus(); }}><Plus size={14} /> Add an idea</button>}</div></div>; })}</div>
      <form className="add-meal-form" onSubmit={e => { e.preventDefault(); if (title.trim()) { addMeal(title, day, slot); setTitle(''); } }}><input id="meal-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a dish to the plan…" /><select value={day} onChange={e => setDay(e.target.value)}>{days.map(d => <option key={d}>{d}</option>)}</select><select value={slot} onChange={e => setSlot(e.target.value)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option></select><button className="send-button" disabled={!title.trim()} aria-label="Add meal"><Plus size={17} /></button></form>
    </section><aside className="meal-side"><div className="idea-card"><div className="idea-spark"><Sparkles size={16} /></div><span className="eyebrow">A LITTLE INSPIRATION</span><h3>Cook with what you have</h3><p>Turn what's already in your kitchen into something everyone will love.</p><button onClick={getIdea} disabled={ideaBusy}>{ideaBusy ? 'Finding an idea…' : 'Get a meal idea'} <ArrowRight size={14} /></button></div><div className="panel family-faves"><div className="eyebrow">FROM THE FAMILY</div><h3>Everyone gets a say</h3><div className="fave-row"><span className="avatar tiny peach">A</span><p><strong>Amma</strong><br />“Something light for dinner”</p></div><div className="fave-row"><span className="avatar tiny blue">R</span><p><strong>Arjun</strong><br />“No onion tomorrow, please”</p></div></div><div id="meal-ideas" className="ingredient-card"><Leaf size={16} /><div><strong>Quick idea</strong><p>{idea}</p></div></div></aside></div></>;
}

function Groceries({ data, set, addGrocery, languageCode }) {
  const [item, setItem] = useState(''); const [qty, setQty] = useState('1'); const [bargainItem, setBargainItem] = useState(''); const [price, setPrice] = useState(''); const [bargainReply, setBargainReply] = useState(''); const [bargainBusy, setBargainBusy] = useState(false);
  const unchecked = data.groceries.filter(i => !i.checked); const checked = data.groceries.filter(i => i.checked);
  const bargain = async (e) => { e.preventDefault(); if (!bargainItem || !price) return; setBargainBusy(true); setBargainReply(''); const target = Math.max(1, Math.round(Number(price) * 0.88));
    try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Help me politely bargain for ${bargainItem}. The seller asks ₹${price}. Suggest a friendly phrase and a reasonable starting counteroffer around ₹${target}. Keep it very short.`, context: 'This is a shopping bargaining helper. Prices are user-entered, not live market data.', languageCode }) }); const d = await r.json(); if (!r.ok) throw Error(); setBargainReply(d.reply); }
    catch { setBargainReply(`Try: “Could you do ₹${target} for this? I’m buying it today.” Start around ₹${target}, and agree only if the quality and price feel right.`); }
    setBargainBusy(false);
  };
  return <><PageHeader eyebrow="THE MARKET RUN, MADE EASIER" title="Grocery list" subtitle="A shared list for the whole household." action={<span className="shared-pill"><span /> Shared with family</span>} />
    <div className="grocery-layout"><section className="panel grocery-panel"><div className="panel-heading"><div><div className="eyebrow">SHOPPING LIST</div><h2>{unchecked.length} things to pick up</h2></div><div className="progress-count">{checked.length}/{data.groceries.length} <span>done</span></div></div><div className="grocery-progress"><span style={{ width: `${data.groceries.length ? checked.length / data.groceries.length * 100 : 0}%` }} /></div>
      <form className="add-grocery-form" onSubmit={e => { e.preventDefault(); if (item.trim()) { addGrocery(item, qty); setItem(''); } }}><div className="input-with-icon"><Plus size={16} /><input value={item} onChange={e => setItem(e.target.value)} placeholder="Add something to the list…" aria-label="Grocery item" /></div><input className="qty-input" value={qty} onChange={e => setQty(e.target.value)} aria-label="Quantity" /><button className="primary-button" disabled={!item.trim()}><Plus size={16} /> Add</button></form>
      <div className="grocery-items">{unchecked.map(g => <button className="grocery-item" key={g.id} onClick={() => set('groceries', list => list.map(i => i.id === g.id ? { ...i, checked: true } : i))}><span className="check-circle" /><span className="grocery-name">{g.name}</span><span className="grocery-qty">{g.qty}</span><span className="added-by">{g.addedBy}</span><MoreHorizontal size={17} className="muted" /></button>)}{checked.map(g => <button className="grocery-item checked" key={g.id} onClick={() => set('groceries', list => list.map(i => i.id === g.id ? { ...i, checked: false } : i))}><span className="check-circle"><Check size={12} /></span><span className="grocery-name">{g.name}</span><span className="grocery-qty">{g.qty}</span><span className="added-by">{g.addedBy}</span><MoreHorizontal size={17} className="muted" /></button>)}</div><div className="grocery-footer"><span><CheckCircle2 size={14} /> Tap an item to mark it picked up</span><button className="text-button" onClick={() => set('groceries', [])}>Clear list</button></div>
    </section><aside className="panel bargain-panel"><div className="bargain-heading"><div className="bargain-icon"><TrendingDown size={17} /></div><div><div className="eyebrow">MARKET SIDEKICK</div><h2>Bargain kindly</h2></div></div><p className="bargain-description">Get a friendly phrase and a starting offer for the market.</p><form className="bargain-form" onSubmit={bargain}><label>What are you buying?<input value={bargainItem} onChange={e => setBargainItem(e.target.value)} placeholder="e.g. 1 kg tomatoes" /></label><label>Seller's price<input value={price} onChange={e => setPrice(e.target.value)} type="number" min="1" placeholder="₹ 80" /></label><button className="primary-button full" disabled={!bargainItem || !price || bargainBusy}>{bargainBusy ? 'Thinking…' : <><Sparkles size={15} /> Help me ask</>}</button></form>{bargainReply && <div className="bargain-result"><div className="result-label"><Sparkles size={13} /> YOUR FRIENDLY COUNTER</div><p>{bargainReply}</p></div>}<div className="kind-note"><Heart size={13} /> Keep it friendly. Agree on a price that feels fair to both.</div></aside></div></>;
}

function Care({ data, set, addMed }) {
  const [name, setName] = useState(''); const [time, setTime] = useState('8:00 PM');
  return <><PageHeader eyebrow="A GENTLE NUDGE FOR EVERYONE" title="Reminders & care" subtitle="Keep track of routine reminders together." action={<button className="soft-button"><Heart size={15} /> Household care</button>} />
    <div className="care-layout"><section className="panel medication-panel"><div className="panel-heading"><div><div className="eyebrow">MEDICATION REMINDERS</div><h2>Today's reminders</h2></div><span className="reminder-count"><Bell size={13} /> {data.meds.filter(m => !m.done).length} pending</span></div><div className="care-notice"><Activity size={15} /><p>These are personal reminders only. Follow the directions from your clinician or pharmacist.</p></div>
      <div className="reminder-list">{data.meds.map(m => <div className={`reminder-row ${m.done ? 'completed' : ''}`} key={m.id}><button className="reminder-check" onClick={() => set('meds', list => list.map(x => x.id === m.id ? { ...x, done: !x.done } : x))}>{m.done && <Check size={13} />}</button><div className="med-pill"><Stethoscope size={16} /></div><div className="reminder-details"><strong>{m.name}</strong><span><Clock3 size={12} /> {m.time}</span></div><span className={`person-pill ${m.person === 'Amma' ? 'peach-pill' : 'blue-pill'}`}>{m.person}</span>{m.done && <span className="done-label">Done</span>}</div>)}</div>
      <form className="add-reminder-form" onSubmit={e => { e.preventDefault(); if (name.trim()) { addMed(name, time); setName(''); } }}><input value={name} onChange={e => setName(e.target.value)} placeholder="Add a reminder name" aria-label="Reminder name" /><input value={time} onChange={e => setTime(e.target.value)} aria-label="Reminder time" /><button className="primary-button" disabled={!name.trim()}><Plus size={15} /> Add reminder</button></form>
    </section><aside className="care-side"><div className="care-side-art"><div className="care-heart"><Heart size={24} /></div><span className="eyebrow">CARE, TOGETHER</span><h3>Small reminders.<br />A little more peace.</h3><p>Mark reminders as done when they’re taken care of. Your family can see the update.</p><div className="care-avatars"><span className="avatar peach">A</span><span className="avatar blue">A</span><span className="care-caption">Amma & Arjun</span></div></div><div className="care-side-foot"><Bell size={15} /><p>Reminders are saved in this browser and won’t trigger notifications when it’s closed.</p></div></aside></div></>;
}

function Money({ data, addExpense, total }) {
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const max = Math.max(...data.expenses.map(e => Number(e.amount)), 1);
  return <><PageHeader eyebrow="A CLEARER PICTURE, TOGETHER" title="Household spending" subtitle="Quickly log the little things and see where it goes." action={<button className="soft-button"><Wallet size={15} /> This month <ChevronDown size={14} /></button>} />
    <div className="money-summary"><div className="money-total-card"><div className="eyebrow">LOGGED IN THIS DEMO</div><strong>₹{total.toLocaleString('en-IN')}</strong><span>Household spending</span><div className="money-card-decoration">₹</div></div><div className="money-mini-card"><div className="mini-card-head"><span className="stat-icon sage"><ShoppingBasket size={16} /></span><span>Shared household</span></div><strong>{data.expenses.length} <small>entries</small></strong><p>Logged by Amma and Arjun</p></div><div className="money-mini-card"><div className="mini-card-head"><span className="stat-icon lavender"><ArrowDownLeft size={16} /></span><span>Most recent</span></div><strong>{data.expenses[0] ? `₹${Number(data.expenses[0].amount).toLocaleString('en-IN')}` : '₹0'}</strong><p>{data.expenses[0]?.title || 'No expenses yet'}</p></div></div>
    <div className="money-layout"><section className="panel expense-panel"><div className="panel-heading"><div><div className="eyebrow">RECENT ACTIVITY</div><h2>Family expenses</h2></div><MoreHorizontal size={19} className="muted" /></div><div className="expense-list">{data.expenses.map((e, i) => <div className="expense-row" key={e.id}><div className={`expense-icon expense-${i % 3}`}>{i === 0 ? <ShoppingBasket size={16} /> : i === 1 ? <ArrowRight size={16} /> : <Coffee size={16} />}</div><div className="expense-description"><strong>{e.title}</strong><span>{e.by} <span className="footer-dot">·</span> {e.date}</span></div><strong className="expense-amount">− ₹{Number(e.amount).toLocaleString('en-IN')}</strong></div>)}</div><form className="add-expense-form" onSubmit={e => { e.preventDefault(); if (title && amount) { addExpense(title, amount); setTitle(''); setAmount(''); } }}><input value={title} onChange={e => setTitle(e.target.value)} placeholder="What was it for?" aria-label="Expense title" /><div className="amount-input"><span>₹</span><input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" aria-label="Expense amount" /></div><button className="primary-button" disabled={!title || !amount}><Plus size={15} /> Log expense</button></form></section><aside className="panel spending-panel"><div className="eyebrow">AT A GLANCE</div><h2>Recent spending</h2><p className="spending-sub">Your biggest items in this list</p>{[...data.expenses].sort((a, b) => b.amount - a.amount).slice(0, 4).map(e => <div className="spending-bar" key={e.id}><div><span>{e.title}</span><strong>₹{Number(e.amount).toLocaleString('en-IN')}</strong></div><div className="bar-track"><span style={{ width: `${Number(e.amount) / max * 100}%` }} /></div></div>)}</aside></div></>;
}

export default App;
