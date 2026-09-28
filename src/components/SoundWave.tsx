import React from 'react';

export const SoundWave: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12 my-2">
      {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70].map((height, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-amber-500 animate-pulse'
              : 'bg-amber-200 h-2'
          }`}
          style={{
            height: isRecording ? `${Math.max(12, height * (0.4 + ((i % 4) * 0.2)))}%` : '8px',
            animationDelay: `${i * 90}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
};
