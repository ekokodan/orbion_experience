import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface TranscriptProps {
  messages: ChatMessage[];
}

export const Transcript: React.FC<TranscriptProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full max-w-xs bg-black/20 backdrop-blur-md border-l border-white/5">
      <div className="p-4 border-b border-white/5 bg-black/20">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Transcript</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
            <div className="text-center text-white/20 text-sm italic mt-10">
                Conversation will appear here...
            </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-white/30 uppercase mb-1 ml-1 mr-1">
                {msg.role === 'user' ? 'You' : 'Orbion'}
            </span>
            <div 
              className={`
                px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[90%]
                ${msg.role === 'user' 
                  ? 'bg-purple-600/20 text-purple-100 rounded-tr-none border border-purple-500/20' 
                  : 'bg-white/5 text-white/80 rounded-tl-none border border-white/10'}
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};