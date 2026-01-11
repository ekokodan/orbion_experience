import React, { useEffect, useState } from 'react';

interface TopBarProps {
  scenarioName: string;
}

export const TopBar: React.FC<TopBarProps> = ({ scenarioName }) => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-md border-b border-white/10 text-sm font-medium tracking-wide text-white/70 z-50">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-base">🇫🇷</span> French Conversation
        </span>
        <span className="hidden md:inline text-white/40">|</span>
        <span className="hidden md:inline">{scenarioName}</span>
      </div>
      <div className="font-mono text-white/50">
        {formatTime(time)}
      </div>
    </div>
  );
};