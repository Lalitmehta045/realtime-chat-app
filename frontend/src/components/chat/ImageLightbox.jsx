import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

export const ImageLightbox = ({ imageUrl, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Controls */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale(prev => Math.min(prev + 0.5, 3));
            }}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale(prev => Math.max(prev - 0.5, 0.5));
            }}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Image */}
        <motion.img
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: scale, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          src={imageUrl}
          alt="Full size"
          className="max-w-[90vw] max-h-[90vh] object-contain cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            if (scale > 1) {
              setScale(1);
            }
          }}
        />

        {/* Reset scale hint */}
        {scale !== 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm">
            Click image to reset zoom
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
