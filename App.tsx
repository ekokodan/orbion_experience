import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Orb } from './components/Orb';
import { TopBar } from './components/TopBar';
import { JourneyMap } from './components/JourneyMap';
import { ObjectiveCard } from './components/ObjectiveCard';
import { Transcript } from './components/Transcript';
import { StarField } from './components/StarField';
import { GeminiLiveService } from './services/geminiService';
import { OrbState, Checkpoint, ChatMessage } from './types';

const INITIAL_CHECKPOINTS: Checkpoint[] = [
  { id: 'greet', title: 'The Encounter', description: 'Greet the waiter at the café', hint: 'Bonjour !', status: 'current' },
  { id: 'order_drink', title: 'The Order', description: 'Order a coffee (or another drink)', hint: 'Je voudrais un café, s\'il vous plaît.', status: 'pending' },
  { id: 'ask_bill', title: 'The Bill', description: 'Ask for the check', hint: 'L\'addition, s\'il vous plaît.', status: 'pending' },
  { id: 'farewell', title: 'Farewell', description: 'Say goodbye politely', hint: 'Merci, au revoir !', status: 'pending' },
];

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>(OrbState.IDLE);
  const [orbVolume, setOrbVolume] = useState(0);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(INITIAL_CHECKPOINTS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState<string | null>(null);
  
  const geminiRef = useRef<GeminiLiveService | null>(null);
  const silenceTimer = useRef<number | null>(null);

  // Helper to determine active checkpoint
  const currentCheckpoint = checkpoints.find(c => c.status === 'current') || null;
  const isAllComplete = checkpoints.every(c => c.status === 'completed');

  // Handle Checkpoint Completion from AI
  const handleCheckpointComplete = useCallback((id: string) => {
    setOrbState(OrbState.CELEBRATING);
    setTimeout(() => setOrbState(OrbState.IDLE), 2500);

    setCheckpoints(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev; // Invalid ID

      const newCheckpoints = [...prev];
      
      // Mark completed
      newCheckpoints[idx] = { ...newCheckpoints[idx], status: 'completed' };
      
      // Activate next if available
      if (idx + 1 < newCheckpoints.length) {
        newCheckpoints[idx + 1] = { ...newCheckpoints[idx + 1], status: 'current' };
      }

      return newCheckpoints;
    });
  }, []);

  // Transcript Management
  const handleTranscriptUpdate = useCallback((role: 'user' | 'assistant', text: string, isFinal: boolean) => {
    setMessages(prev => {
      // Logic to update the last message if it's the same role (streaming), or add new
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === role && !lastMsg.isFinal) {
        // Update existing partial
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMsg, text: lastMsg.text + text, isFinal }; 
        return updated;
      } else {
        // New message
        return [...prev, { id: Date.now().toString(), role, text, isFinal }];
      }
    });
    
    // Reset silence timer on any activity
    if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        setShowTips(null);
    }
    // Start new silence timer if user finished speaking
    if (role === 'user' && isFinal) {
        silenceTimer.current = window.setTimeout(() => {
             setShowTips("Don't be shy! Try reading the hint if you're stuck.");
        }, 10000);
    }
  }, []);

  const handleStart = async () => {
    if (!process.env.API_KEY) {
      setError("Missing API Key in environment variables.");
      return;
    }
    setError(null);

    try {
      const service = new GeminiLiveService();
      geminiRef.current = service;

      service.onVolumeUpdate = (vol) => {
        setOrbVolume(vol);
        if (vol > 0.1 && orbState !== OrbState.SPEAKING && orbState !== OrbState.CELEBRATING) {
             setOrbState(OrbState.LISTENING);
        } else if (vol <= 0.1 && orbState === OrbState.LISTENING) {
             setOrbState(OrbState.IDLE);
        }
      };

      service.onStateChange = (isSpeaking) => {
        setOrbState(isSpeaking ? OrbState.SPEAKING : OrbState.IDLE);
      };

      service.onCheckpointComplete = handleCheckpointComplete;
      
      service.onTranscriptUpdate = (role, text, isFinal) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === role) {
                return [...prev.slice(0, -1), { ...last, text: last.text + text }];
            }
            return [...prev, { id: Date.now().toString(), role, text }];
          });
      };

      service.onError = (err) => {
        setError(err.message);
        setHasStarted(false);
      };

      await service.connect();
      setHasStarted(true);
      
      // Initial tip
      setShowTips("Speak naturally. The orb will start the conversation.");
      setTimeout(() => setShowTips(null), 5000);

    } catch (e) {
      console.error(e);
      setError("Failed to connect. Please check permissions.");
    }
  };

  const handleEnd = async () => {
     if (geminiRef.current) {
         await geminiRef.current.disconnect();
         setHasStarted(false);
         setOrbState(OrbState.IDLE);
         setMessages([]);
         setCheckpoints(INITIAL_CHECKPOINTS); // Reset progress
     }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-[#05000A] via-[#120520] to-[#0A0410] overflow-hidden text-white font-sans selection:bg-purple-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-10 mix-blend-soft-light"></div>
      <StarField stars={[]} />

      {/* Main Layout */}
      <div className="flex flex-col h-full relative z-20">
        
        {/* Top Bar - Only visible after start for immersion */}
        <div className={`transition-opacity duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <TopBar scenarioName="Café in Paris" />
        </div>

        {/* Workspace */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Left Panel: Journey */}
            <div className={`hidden md:flex flex-col justify-center px-8 w-80 relative transition-all duration-1000 transform ${hasStarted ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
               <JourneyMap checkpoints={checkpoints} />
            </div>

            {/* Center Stage: Orb & Objective */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
               
               {/* Contextual Tips Floating Area */}
               <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none z-30">
                  {showTips && hasStarted && (
                      <div className="bg-amber-900/40 border border-amber-500/20 text-amber-100/90 px-4 py-2 rounded-full text-sm backdrop-blur-md animate-fade-in shadow-lg">
                          {showTips}
                      </div>
                  )}
               </div>

               {/* The Orb */}
               <div className={`transition-all duration-1000 transform ${!hasStarted ? 'scale-150 mb-16' : 'scale-100 mb-12'}`}>
                   <Orb state={orbState} volume={orbVolume} />
               </div>

               {/* Current Objective / Start Control */}
               <div className="w-full max-w-lg px-6 flex flex-col items-center gap-6 z-40">
                  {!hasStarted ? (
                      <div className="flex flex-col items-center text-center space-y-8 animate-fade-in-up">
                          <div className="space-y-2">
                             <div className="text-xs font-bold text-purple-400 tracking-[0.3em] uppercase opacity-0 animate-[fade-in_2s_ease-out_forwards]">
                                 System Online
                             </div>
                             <h1 className="text-7xl md:text-8xl font-thin tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                ORBION
                             </h1>
                             <p className="text-white/40 font-light tracking-widest text-sm uppercase mt-4">
                                Immersive Language Intelligence
                             </p>
                          </div>
                          
                          {error && <div className="text-red-400 bg-red-900/20 border border-red-500/30 px-4 py-2 rounded-lg text-sm">{error}</div>}
                          
                          <button 
                            onClick={handleStart}
                            className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-500 backdrop-blur-md overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
                            <span className="relative text-white/90 font-light tracking-[0.2em] uppercase text-xs group-hover:text-white flex items-center gap-3">
                                <span>Initialize Session</span>
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </span>
                          </button>
                      </div>
                  ) : (
                      <div className="animate-fade-in">
                        <ObjectiveCard currentCheckpoint={currentCheckpoint} isAllComplete={isAllComplete} />
                        
                        {/* Mic Status / End Button */}
                        <div className="flex items-center justify-center gap-4 mt-6">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs text-white/40 uppercase tracking-widest backdrop-blur-sm">
                                <div className={`w-2 h-2 rounded-full ${orbState === OrbState.LISTENING ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                                {orbState === OrbState.LISTENING ? 'Listening' : 'Mic Active'}
                            </div>
                            <button 
                                onClick={handleEnd}
                                className="px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/20 transition-colors uppercase tracking-widest backdrop-blur-sm"
                            >
                                End Session
                            </button>
                        </div>
                      </div>
                  )}
               </div>
            </div>

            {/* Right Panel: Transcript (Desktop) */}
            <div className={`hidden lg:flex w-80 h-full border-l border-white/5 bg-black/20 transition-all duration-1000 transform ${hasStarted ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
               <Transcript messages={messages} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;