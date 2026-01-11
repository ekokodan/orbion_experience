import React from 'react';
import { Checkpoint } from '../types';

interface JourneyMapProps {
  checkpoints: Checkpoint[];
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ checkpoints }) => {
  return (
    <div className="flex flex-col gap-1 w-64 bg-black/20 backdrop-blur-sm p-4 rounded-2xl border border-white/5">
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Your Journey</h3>
      
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-3 top-2 bottom-6 w-0.5 bg-white/10 rounded-full" />
        
        <div className="flex flex-col gap-6">
          {checkpoints.map((cp, idx) => {
            const isCompleted = cp.status === 'completed';
            const isCurrent = cp.status === 'current';
            const isPending = cp.status === 'pending';

            return (
              <div key={cp.id} className={`relative flex items-start gap-4 transition-all duration-500 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                {/* Status Dot */}
                <div className={`
                  relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors duration-500
                  ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-black' : ''}
                  ${isCurrent ? 'bg-purple-600 border-purple-400 animate-pulse' : ''}
                  ${isPending ? 'bg-black border-white/20' : ''}
                `}>
                  {isCompleted && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isCurrent && <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
                </div>

                {/* Text */}
                <div className="flex flex-col pt-0.5">
                  <span className={`text-sm font-medium leading-none transition-colors duration-300 ${isCurrent ? 'text-white' : 'text-white/70'}`}>
                    {cp.title}
                  </span>
                  <span className="text-xs text-white/30 mt-1">
                    {isCompleted ? 'Completed' : isCurrent ? 'Current Goal' : 'Upcoming'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-xs text-white/30 text-center">
            {checkpoints.filter(c => c.status === 'completed').length} of {checkpoints.length} complete
        </div>
      </div>
    </div>
  );
};