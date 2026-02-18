import React from 'react';

const GlassCard = ({ children, className = "" }) => {
  return (
    <div className={`backdrop-blur-xl bg-surface/40 border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-white/20 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;