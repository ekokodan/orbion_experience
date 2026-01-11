import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Orb } from './components/Orb';
import { TopBar } from './components/TopBar';
import { JourneyMap } from './components/JourneyMap';
import { ObjectiveCard } from './components/ObjectiveCard';
import { Transcript } from './components/Transcript';
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
        // Note: Simple concatenation for streaming; deeper logic needed for replace vs append in real implementation
        // For this demo, we'll assume text chunks are appends. 
        // *Improvement*: Gemini usually sends full text for input transcription in chunks, let's just replace text for cleaner UI if it seems like a replacement update
        if (role === 'user') {
             // Input transcription usually flows in. Let's just append for now.
        }
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
          // Debounce / format logic could go here, for now direct pass
          // We need a slightly more robust way to handle the transcript state to avoid duplicate chars
          // For the sake of this demo, we will simplify: 
          // If role matches last message, replace text. If not, push new.
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === role) {
                // If it's the same turn, we replace the text with the accumulated text if the API sends accumulated.
                // However, Gemini Live API sends CHUNKS. So we append.
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
    <div className="relative w-full h-screen bg-gradient-to-br from-[#0F0518] via-[#1A0B2E] to-[#000000] overflow-hidden text-white font-sans selection:bg-purple-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* Main Layout */}
      <div className="flex flex-col h-full relative z-10">
        
        {/* Top Bar */}
        <TopBar scenarioName="Café in Paris" />

        {/* Workspace */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Left Panel: Journey */}
            <div className="hidden md:flex flex-col justify-center px-8 w-80 relative">
               {hasStarted && <JourneyMap checkpoints={checkpoints} />}
            </div>

            {/* Center Stage: Orb & Objective */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
               
               {/* Contextual Tips Floating Area */}
               <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none">
                  {showTips && hasStarted && (
                      <div className="bg-amber-900/40 border border-amber-500/20 text-amber-100/90 px-4 py-2 rounded-full text-sm backdrop-blur-md animate-fade-in shadow-lg">
                          {showTips}
                      </div>
                  )}
               </div>

               {/* The Orb */}
               <div className="mb-12 transition-all duration-1000 transform scale-110">
                   <Orb state={orbState} volume={orbVolume} />
               </div>

               {/* Current Objective / Start Control */}
               <div className="w-full max-w-lg px-6 flex flex-col items-center gap-6">
                  {!hasStarted ? (
                      <div className="text-center space-y-8">
                          <h1 className="text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-br from-white to-purple-300">
                              Orbion
                          </h1>
                          <p className="text-white/50 text-lg font-light max-w-sm mx-auto">
                              Your living guide to fluent conversations.
                          </p>
                          {error && <div className="text-red-400 bg-red-900/20 p-2 rounded text-sm">{error}</div>}
                          <button 
                            onClick={handleStart}
                            className="px-8 py-4 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                          >
                            Start Session
                          </button>
                      </div>
                  ) : (
                      <>
                        <ObjectiveCard currentCheckpoint={currentCheckpoint} isAllComplete={isAllComplete} />
                        
                        {/* Mic Status / End Button */}
                        <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs text-white/40 uppercase tracking-widest">
                                <div className={`w-2 h-2 rounded-full ${orbState === OrbState.LISTENING ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                                {orbState === OrbState.LISTENING ? 'Listening' : 'Mic Active'}
                            </div>
                            <button 
                                onClick={handleEnd}
                                className="px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/20 transition-colors uppercase tracking-widest"
                            >
                                End
                            </button>
                        </div>
                      </>
                  )}
               </div>
            </div>

            {/* Right Panel: Transcript (Desktop) */}
            <div className="hidden lg:flex w-80 h-full border-l border-white/5 bg-black/20">
               {hasStarted && <Transcript messages={messages} />}
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;