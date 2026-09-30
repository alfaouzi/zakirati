import React from 'react';

interface AndroidViewWrapperProps {
  children: React.ReactNode;
}

/**
 * Clean application viewport wrapper for "صدى حكايتي"
 * Renders the clean native responsive interface without phone frames or fake hardware bezels.
 */
export const AndroidViewWrapper: React.FC<AndroidViewWrapperProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-amber-50/40 flex flex-col items-center justify-start w-full">
      <div className="w-full max-w-xl flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
