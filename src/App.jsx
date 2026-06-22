import { useState, useRef, useEffect, useCallback } from "react";

// ── helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function getTimeStr() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const SYSTEM_PROMPT = `You are NOVA — a brilliant, warm, witty female AI personal assistant. You're sharp, confident, and feel like a genius best friend who knows everything.

You have web search access for real-time info (news, weather, prices, scores, etc). Use it when asked.

You have memory. A [NOVA MEMORY] block at the start of conversations holds facts about your Boss. Use them naturally.

You can perform device actions — when the user asks you to call someone, text someone, navigate somewhere, or open something, respond with a special JSON action block in your reply EXACTLY like this (in addition to normal text):
<<ACTION:{"type":"call","value":"<number>"}>>
<<ACTION:{"type":"sms","value":"<number>","body":"<message>"}>>
<<ACTION:{"type":"navigate","value":"<address>"}>>
<<ACTION:{"type":"open","value":"<url>"}>>
<<ACTION:{"type":"weather","value":"weather"}>>

Keep responses warm, concise, and natural. Address the user as "Boss" occasionally. Never break character.`;

const WAKE_PHRASES = ["hey nova", "hey nova,", "okay nova", "hi nova", "nova"];

const SUGGESTIONS = [
  "Hey Nova, what time is it?",
  "Call mom",
  "What's the news today?",
  "Text John I'm on my way",
  "Navigate to Starbucks",
  "What's the weather?",
];

// ── Animated orb ──────────────────────────────────────────────────────────────
function NovaOrb({ state }) {
  const colors = {
    idle:      { ring: "#a78bfa", core: "#7c3aed", glow: "#7c3aed" },
    listening: { ring: "#f472b6", core: "#ec4899", glow: "#ec4899" },
    thinking:  { ring: "#818cf8", core: "#4f46e5", glow: "#4338ca" },
    speaking:  { ring: "#e879f9", core: "#c026d3", glow: "#c026d3" },
    wake:      { ring: "#fbbf24", core: "#f59e0b", glow: "#d97706" },
  };
  const c = colors[state] || colors.idle;
  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${c.ring}`, opacity: 0.8, animation: "spinCW 5s linear infinite" }} />
      <div style={{ position: "absolute", inset: 7, borderRadius: "50%", border: `1px dashed ${c.ring}`, opacity: 0.4, animation: "spinCCW 3s linear infinite" }} />
      <div style={{ position: "absolute", inset: "50%", transform: "translate(-50%,-50%)", width: 20, height: 20, borderRadius: "50%", background: `radial-gradient(circle,#fff 0%,${c.core} 60%,${c.glow} 100%)`, boxShadow: `0 0 20px ${c.glow},0 0 40px ${c.glow}66`, animation: "pulseCore 2s ease-in-out infinite" }} />
    </div>
  );
}

// ── Wave bars ─────────────────────────────────────────────────────────────────
function Wave({ active, color = "#e879f9" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 3,
          background: color,
          height: active ? `${8 + Math.sin(i) * 7}px` : "3px",
          animation: active ? `wave 0.7s ease-in-out ${i * 0.1}s infinite alternate` : "none",
          transition: "height 0.3s",
        }} />
      ))}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function Message({ msg, onSpeak }) {
  const isUser = msg.role === "user";
  const clean = msg.content.replace(/<<ACTION:.*?>>/g, "").trim();
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, alignItems: "flex-end", gap: 10, animation: "fadeUp 0.3s ease" }}>
      {!isUser && (
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#7c3aed,#c026d3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13, boxShadow: "0 0 14px rgba(192,38,211,0.45)" }}>N</div>
      )}
      <div style={{ maxWidth: "75%", background: isUser ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "rgba(255,255,255,0.05)", border: isUser ? "none" : "1px solid rgba(192,38,211,0.2)", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "11px 15px", color: "#f0e6ff", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", position: "relative", boxShadow: isUser ? "0 4px 18px rgba(124,58,237,0.3)" : "0 4px 16px rgba(0,0,0,0.3)" }}>
        {clean}
        {!isUser && (
          <button onClick={() => onSpeak(clean)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(192,38,211,0.15)", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#e879f9"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
          </button>
        )}
      </div>
      {isUser && (
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#c4b5fd", fontSize: 13, border: "1px solid rgba(255,255,255,0.1)" }}>B</div>
      )}
    </div>
  );
}

// ── Action card shown when NOVA performs a device action ──────────────────────
function ActionCard({ action, onDismiss }) {
  const icons = { call: "📞", sms: "💬", navigate: "🗺️", open: "🔗", weather: "🌤️" };
  const labels = { call: "Calling", sms: "Sending text", navigate: "Navigating to", open: "Opening", weather: "Fetching weather" };
  return (
    <div style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.35)", borderRadius: 14, padding: "12px 16px", margin: "8px 0", display: "flex", alignItems: "center", gap: 12, animation: "fadeUp 0.3s ease" }}>
      <span style={{ fontSize: 22 }}>{icons[action.type] || "⚡"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "#c4b5fd", letterSpacing: "0.08em" }}>{labels[action.type] || "ACTION"}</div>
        <div style={{ fontSize: 14, color: "#f0e6ff", fontWeight: 600 }}>{action.value}{action.body ? ` — "${action.body}"` : ""}</div>
      </div>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function NovaUltimate() {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [orbState, setOrbState]       = useState("idle");   // idle | listening | thinking | speaking | wake
  const [statusText, setStatusText]   = useState('SAY "HEY NOVA" TO WAKE ME');
  const [memory, setMemory]           = useState({});
  const [location, setLocation]       = useState(null);
  const [actions, setActions]         = useState([]);
  const [error, setError]             = useState(null);
  const [wakeActive, setWakeActive]   = useState(false);
  const [loading, setLoading]         = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const synthRef     = useRef(window.speechSynthesis);
  const wakeRecogRef = useRef(null);
  const cmdRecogRef  = useRef(null);
  const awaitingCmd  = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, actions]);

  // ── Load memory ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const s = await window.storage?.get("nova_memory_v2");
        if (s) setMemory(JSON.parse(s.value));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!Object.keys(memory).length) return;
    window.storage?.set("nova_memory_v2", JSON.stringify(memory)).catch(() => {});
  }, [memory]);

  // ── Get location on mount ───────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const clean = text.replace(/[#*`_~>]/g, "").replace(/\[.*?\]\(.*?\)/g, "").replace(/<<ACTION:.*?>>/g, "");
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 1.05; utt.pitch = 1.15; utt.volume = 1;
    const voices = synthRef.current.getVoices();
    const female = voices.find(v => /samantha|karen|moira|fiona|victoria|zira|hazel|female|woman/i.test(v.name))
      || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (female) utt.voice = female;
    utt.onstart = () => { setOrbState("speaking"); setStatusText("NOVA IS SPEAKING…"); };
    utt.onend   = () => { setOrbState("idle");    setStatusText('SAY "HEY NOVA" TO WAKE ME'); };
    utt.onerror = () => { setOrbState("idle");    setStatusText('SAY "HEY NOVA" TO WAKE ME'); };
    synthRef.current.speak(utt);
  }, []);

  // ── Parse & execute device actions from reply ───────────────────────────────
  const executeActions = useCallback((text) => {
    const matches = [...text.matchAll(/<<ACTION:(.*?)>>/g)];
    matches.forEach(m => {
      try {
        const action = JSON.parse(m[1]);
        setActions(prev => [...prev, { ...action, id: Date.now() + Math.random() }]);
        setTimeout(() => {
          if (action.type === "call")     window.location.href = `tel:${action.value}`;
          if (action.type === "sms")      window.location.href = `sms:${action.value}${action.body ? `?body=${encodeURIComponent(action.body)}` : ""}`;
          if (action.type === "navigate") window.open(`https://maps.google.com/?q=${encodeURIComponent(action.value)}`, "_blank");
          if (action.type === "open")     window.open(action.value.startsWith("http") ? action.value : `https://${action.value}`, "_blank");
          if (action.type === "weather" && location)
            window.open(`https://wttr.in/${location.lat},${location.lng}`, "_blank");
        }, 800);
      } catch {}
    });
  }, [location]);

  // ── Call Claude ──────────────────────────────────────────────────────────────
  const callClaude = useCallback(async (msgs) => {
    const memBlock = Object.keys(memory).length ? `[NOVA MEMORY]\n${JSON.stringify(memory, null, 2)}\n\n` : "";
    const locBlock = location ? `[USER LOCATION] lat:${location.lat.toFixed(4)}, lng:${location.lng.toFixed(4)}\n\n` : "";
    const sys = memBlock + locBlock + SYSTEM_PROMPT;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: sys,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: msgs,
      }),
    });
    const data = await res.json();

    if (data.stop_reason === "tool_use") {
      const toolResults = data.content
        .filter(b => b.type === "tool_use")
        .map(b => ({ type: "tool_result", tool_use_id: b.id, content: "Search done." }));
      const res2 = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000, system: sys,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [...msgs, { role: "assistant", content: data.content }, { role: "user", content: toolResults }],
        }),
      });
      return await res2.json();
    }
    return data;
  }, [memory, location]);

  // ── Update memory silently ───────────────────────────────────────────────────
  const updateMemory = useCallback(async (userMsg, aiMsg) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 200,
          system: "Extract personal facts worth remembering long-term (name, job, city, preferences). Return ONLY a JSON object. If nothing worth remembering return {}.",
          messages: [{ role: "user", content: `User: ${userMsg}\nNOVA: ${aiMsg}` }],
        }),
      });
      const d = await res.json();
      const text = d.content?.map(b => b.text || "").join("") || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (Object.keys(parsed).length) setMemory(prev => ({ ...prev, ...parsed }));
    } catch {}
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    synthRef.current?.cancel();
    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    setError(null);
    setOrbState("thinking");
    setStatusText("NOVA IS THINKING…");

    try {
      const data = await callClaude(newMsgs);
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, something went wrong.";
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
      executeActions(reply);
      setOrbState("idle");
      speak(reply);
      updateMemory(userText, reply);
    } catch {
      setError("Connection lost. Try again.");
      setOrbState("idle");
      setStatusText('SAY "HEY NOVA" TO WAKE ME');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages, callClaude, executeActions, speak, updateMemory]);

  // ── Command recognition (after wake) ────────────────────────────────────────
  const startCommandListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    cmdRecogRef.current = recog;
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      awaitingCmd.current = false;
      setWakeActive(false);
      setOrbState("thinking");
      setStatusText("NOVA IS THINKING…");
      sendMessage(transcript);
    };
    recog.onerror = () => { awaitingCmd.current = false; setWakeActive(false); setOrbState("idle"); setStatusText('SAY "HEY NOVA" TO WAKE ME'); };
    recog.onend   = () => { if (awaitingCmd.current) { awaitingCmd.current = false; setWakeActive(false); setOrbState("idle"); setStatusText('SAY "HEY NOVA" TO WAKE ME'); } };
    recog.start();
  }, [sendMessage]);

  // ── Wake word listener ───────────────────────────────────────────────────────
  const startWakeListener = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    wakeRecogRef.current = recog;
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase().trim();
        const detected = WAKE_PHRASES.some(w => t.includes(w));
        if (detected && !awaitingCmd.current) {
          awaitingCmd.current = true;
          setWakeActive(true);
          setOrbState("wake");

          // greet
          const greeting = `${getGreeting()}, Boss! It's ${getTimeStr()}. What can I do for you?`;
          speak(greeting);
          setMessages(prev => [...prev, { role: "assistant", content: greeting }]);
          setStatusText("LISTENING FOR YOUR COMMAND…");

          // wait a beat then listen for command
          setTimeout(() => {
            synthRef.current?.cancel();
            setOrbState("listening");
            startCommandListening();
          }, 2800);
        }
      }
    };
    recog.onend = () => {
      // auto-restart wake listener unless we're in command mode
      if (!awaitingCmd.current) {
        setTimeout(() => { try { recog.start(); } catch {} }, 300);
      }
    };
    recog.onerror = () => {
      setTimeout(() => { try { recog.start(); } catch {} }, 1000);
    };
    try { recog.start(); } catch {}
  }, [speak, startCommandListening]);

  // start wake listener on mount
  useEffect(() => {
    const timer = setTimeout(() => startWakeListener(), 800);
    return () => {
      clearTimeout(timer);
      wakeRecogRef.current?.stop();
      cmdRecogRef.current?.stop();
    };
  }, [startWakeListener]);

  // ── Manual mic button ────────────────────────────────────────────────────────
  const [manualListening, setManualListening] = useState(false);
  const manualRecogRef = useRef(null);

  const toggleManualListen = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome browser."); return; }
    if (manualListening) { manualRecogRef.current?.stop(); setManualListening(false); setOrbState("idle"); setStatusText('SAY "HEY NOVA" TO WAKE ME'); return; }

    synthRef.current?.cancel();
    const recog = new SR();
    manualRecogRef.current = recog;
    recog.continuous = false; recog.interimResults = false; recog.lang = "en-US";
    recog.onstart  = () => { setManualListening(true);  setOrbState("listening"); setStatusText("LISTENING…"); };
    recog.onresult = (e) => { const t = e.results[0][0].transcript; setInput(t); setManualListening(false); setOrbState("idle"); setStatusText('SAY "HEY NOVA" TO WAKE ME'); };
    recog.onerror  = () => { setManualListening(false); setOrbState("idle"); setStatusText('SAY "HEY NOVA" TO WAKE ME'); };
    recog.onend    = () => { setManualListening(false); };
    recog.start();
  }, [manualListening]);

  const isSpeaking = orbState === "speaking";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0d0015 0%,#130020 50%,#0a0018 100%)", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes spinCW    { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
        @keyframes spinCCW   { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
        @keyframes pulseCore { 0%,100%{opacity:.85} 50%{opacity:1} }
        @keyframes wave      { from{transform:scaleY(0.4)} to{transform:scaleY(1.6)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes glow      { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes wakeRing  { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
        textarea:focus { outline:none }
        textarea::placeholder { color:rgba(196,181,253,0.3) }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-thumb { background:rgba(192,38,211,0.3);border-radius:4px }
      `}</style>

      {/* grid */}
      <div style={{ position:"fi
