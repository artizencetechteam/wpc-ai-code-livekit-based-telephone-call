import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Mic, 
  Settings, 
  Plus, 
  Play, 
  FileText, 
  Loader2, 
  CheckCircle2,
  PhoneCall,
  X,
  Zap,
  Bot,
  User2,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LiveKitRoom, 
  VoiceAssistantControlBar, 
  BarVisualizer,
  RoomAudioRenderer,
  useVoiceAssistant,
  useTranscriptions,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = rawApiUrl 
  ? (rawApiUrl.startsWith('http') ? rawApiUrl : `https://${rawApiUrl}`) 
  : 'http://localhost:5000';

// --- Types ---
interface Agent {
  id: string;
  name: string;
  objective: string;
  system_prompt: string;
  reference_text?: string;
}

// --- Voice Session Component (inside LiveKitRoom) ---
const VoiceSession = ({ agentName }: { agentName: string }) => {
  const { state, audioTrack } = useVoiceAssistant();
  const transcriptions = useTranscriptions();
  const { localParticipant } = useLocalParticipant();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions]);

  const getStateColor = () => {
    if (state === 'speaking') return '#22d3ee';
    if (state === 'listening') return '#6366f1';
    if (state === 'thinking') return '#f59e0b';
    return '#64748b';
  };

  const getStateLabel = () => {
    if (state === 'speaking') return 'Speaking';
    if (state === 'listening') return 'Listening...';
    if (state === 'thinking') return 'Thinking...';
    if (state === 'connecting') return 'Connecting...';
    return state;
  };

  return (
    <div className="voice-session-layout">
      {/* LEFT SIDE: Visualizer + Controls */}
      <div className="voice-left-panel">
        {/* Agent Avatar + State */}
        <div className="agent-avatar-wrap">
          <div className="agent-avatar" style={{ boxShadow: `0 0 40px ${getStateColor()}55` }}>
            <div className="avatar-ring" style={{ borderColor: `${getStateColor()}66` }} />
            <Bot size={48} color={getStateColor()} />
          </div>
          <h3 className="agent-name-label">{agentName}</h3>
          <span className="state-badge" style={{ color: getStateColor(), borderColor: `${getStateColor()}44`, background: `${getStateColor()}11` }}>
            <span className="state-dot" style={{ background: getStateColor() }} />
            {getStateLabel()}
          </span>
        </div>

        {/* Bar Visualizer */}
        <div className="visualizer-box" style={{ borderColor: state === 'speaking' ? '#22d3ee44' : 'rgba(255,255,255,0.05)' }}>
          {state === 'speaking' && <div className="visualizer-glow" />}
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={11}
            options={{ minHeight: 8 }}
            style={{ height: 100, width: '100%' }}
          />
        </div>

        {/* Hidden audio renderer */}
        <RoomAudioRenderer />

        {/* Controls */}
        <div className="controls-wrap">
          <VoiceAssistantControlBar />
        </div>
      </div>

      {/* RIGHT SIDE: Chat Transcript */}
      <div className="transcript-panel">
        <div className="transcript-header">
          <Volume2 size={16} />
          <span>Live Transcript</span>
          <span className="transcript-count">{transcriptions.length} messages</span>
        </div>
        
        <div className="transcript-messages">
          {transcriptions.length === 0 && (
            <div className="transcript-empty">
              <Mic size={32} opacity={0.3} />
              <p>Start speaking to see the transcript appear here in real-time.</p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {transcriptions.map((t) => {
              const isUser = t.participantInfo.identity === localParticipant.identity;
              const isAgent = !isUser;
              return (
                <motion.div
                  key={t.streamInfo.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`chat-bubble-wrap ${isAgent ? 'agent-side' : 'user-side'}`}
                >
                  <div className={`chat-icon ${isAgent ? 'icon-agent' : 'icon-user'}`}>
                    {isAgent ? <Bot size={14} /> : <User2 size={14} />}
                  </div>
                  <div className={`chat-bubble ${isAgent ? 'bubble-agent' : 'bubble-user'}`}>
                    <span className="bubble-sender">{isAgent ? agentName : 'You'}</span>
                    <p>{t.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<{ token: string; url: string } | null>(null);

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agents`);
      setAgents(res.data);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('objective', objective);
    formData.append('system_prompt', prompt);
    if (file) formData.append('reference_file', file);
    try {
      await axios.post(`${API_BASE}/api/agents`, formData);
      await fetchAgents();
      setShowCreate(false);
      setName(''); setObjective(''); setPrompt(''); setFile(null);
    } catch (err) {
      alert("Error creating agent");
    } finally {
      setLoading(false);
    }
  };

  const startTalk = async (agent: Agent) => {
    setLoading(true);
    try {
      const roomName = `agent_${agent.id}_${Math.random().toString(36).substring(7)}`;
      const res = await axios.post(`${API_BASE}/api/token`, {
        room_name: roomName,
        participant_name: 'User'
      });
      setConnectionDetails(res.data);
      setActiveAgent(agent);
    } catch (err) {
      alert("Error starting voice session");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnectionDetails(null);
    setActiveAgent(null);
  };

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="header-brand">
          <div className="brand-icon">
            <Zap size={22} className="text-white" />
          </div>
          <div>
            <h1 className="brand-title">WPC</h1>
            <p className="brand-sub">LiveKit Powered Voice Agents</p>
          </div>
        </motion.div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} /> Create Agent
        </button>
      </header>

      <main className="app-main">
        {/* Create Agent Panel */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="create-panel"
            >
              <button onClick={() => setShowCreate(false)} className="close-btn"><X size={20} /></button>
              <h2 className="panel-title"><Settings size={20} /> Configure New Agent</h2>
              <form onSubmit={handleCreate} className="create-form">
                <div className="form-col">
                  <div className="input-group">
                    <label>Agent Name</label>
                    <input required placeholder="e.g. Aria - Sales Assistant" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Objective</label>
                    <textarea required rows={3} placeholder="What is this agent's goal?" value={objective} onChange={(e) => setObjective(e.target.value)} />
                  </div>
                </div>
                <div className="form-col">
                  <div className="input-group">
                    <label>System Prompt</label>
                    <textarea required rows={4} placeholder="Detailed instructions for the agent..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label><FileText size={14} /> Reference File (PDF/TXT)</label>
                    <input type="file" accept=".pdf,.txt" id="file-upload" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <label htmlFor="file-upload" className="file-drop-zone">
                      {file ? `✓ ${file.name}` : 'Click to upload reference file'}
                    </label>
                  </div>
                </div>
                <div className="form-submit">
                  <button type="submit" disabled={loading} className="btn-primary px-12">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={16} /> Save & Launch Agent</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Cards Grid */}
        <div className="agents-grid">
          {agents.map((agent, i) => (
            <motion.div
              layout
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="agent-card"
            >
              <div className="card-top">
                <div className="card-icon">
                  <Bot size={22} />
                </div>
                <div className="card-status">
                  <CheckCircle2 size={14} />
                  <span>Ready</span>
                </div>
              </div>
              <h3 className="card-name">{agent.name}</h3>
              <p className="card-objective">{agent.objective}</p>
              <button
                onClick={() => startTalk(agent)}
                disabled={loading}
                className="btn-talk"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><PhoneCall size={16} /> Start Voice Session</>}
              </button>
            </motion.div>
          ))}

          {agents.length === 0 && !showCreate && (
            <div className="empty-state">
              <div className="empty-icon"><Mic size={32} opacity={0.5} /></div>
              <p className="empty-title">No agents created yet</p>
              <p className="empty-sub">Create your first AI voice agent to get started.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-6">
                <Plus size={16} /> Create First Agent
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Voice Session Full-Screen Modal */}
      <AnimatePresence>
        {connectionDetails && activeAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="voice-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="voice-modal"
            >
              {/* Modal Header */}
              <div className="voice-modal-header">
                <div className="modal-header-left">
                  <div className="live-indicator"><span className="live-dot" />LIVE SESSION</div>
                  <span className="modal-agent-name">{activeAgent.name}</span>
                </div>
                <button onClick={handleDisconnect} className="end-call-btn">
                  <X size={18} /> End Session
                </button>
              </div>

              {/* LiveKit Room wraps the session component */}
              <LiveKitRoom
                token={connectionDetails.token}
                serverUrl={connectionDetails.url}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={handleDisconnect}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
              >
                <VoiceSession agentName={activeAgent.name} />
              </LiveKitRoom>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
