import React, { useState, useEffect } from 'react';
import { Checkpoint } from '../types';

interface ObjectiveCardProps {
  currentCheckpoint: Checkpoint | null;
  isAllComplete: boolean;
}

export const ObjectiveCard: React.FC<ObjectiveCardProps> = ({ currentCheckpoint, isAllComplete }) => {
  const [showHint, setShowHint] = useState(false);

  // Reset hint state when checkpoint changes
  useEffect(() => {
    setShowHint(false);
  }, [currentCheckpoint?.id]);

  if (isAllComplete) {
    return (
      <div className="w-full max-w-lg bg-emerald-900/20 backdrop-blur-md border border-emerald-500/30 p-6 rounded-3xl text-center shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-fade-in-up">
        <h2 className="text-2xl font-serif text-emerald-200 mb-2">Magnifique!</h2>
        <p className="text-white/80">You've completed the entire session.</p>
      </div>
    );
  }

  if (!currentCheckpoint) return null;

  return (
    <div className="w-full max-w-lg relative group">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Current Goal</h3>
                    <h2 className="text-xl font-medium text-white">{currentCheckpoint.description}</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl animate-pulse">
                    🎯
                </div>
            </div>

            {/* Action / Hint Area */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-white/40 italic">
                    {showHint ? (
                        <span className="text-amber-200/90 animate-fade-in">💡 Try saying: "{currentCheckpoint.hint}"</span>
                    ) : (
                        <span>Ready when you are...</span>
                    )}
                </div>
                
                {!showHint && (
                    <button 
                        onClick={() => setShowHint(true)}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg transition-colors border border-white/5"
                    >
                        Need a hint?
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};