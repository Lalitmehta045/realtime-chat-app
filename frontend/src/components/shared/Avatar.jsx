import { User } from 'lucide-react';

export const Avatar = ({ 
  src, 
  alt, 
  size = 'md', 
  isOnline = false,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const onlineDotSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden bg-[var(--bg-surface-2)] border border-[var(--border-glass)] flex items-center justify-center`}
      >
        {src ? (
          <img 
            src={src} 
            alt={alt || 'Avatar'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-1/2 h-1/2 text-[var(--text-muted)]" />
        )}
      </div>
      
      {isOnline && (
        <span 
          className={`absolute bottom-0 right-0 ${onlineDotSize[size]} bg-emerald-500 rounded-full border-2 border-[var(--bg-base)]`}
        />
      )}
    </div>
  );
};
