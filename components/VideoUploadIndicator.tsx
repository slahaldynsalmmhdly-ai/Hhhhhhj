
import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface VideoUploadIndicatorProps {
  status: 'compressing' | 'uploading' | 'success';
  progress: number;
  thumbnail: string | null;
}

const VideoUploadIndicator: React.FC<VideoUploadIndicatorProps> = ({ status, progress, thumbnail }) => {
  const isSuccess = status === 'success';

  // Circular Progress Calculation - Adjusted for smaller fit
  const radius = 12; // Reduced size to fit inside w-12 h-12 comfortably
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = 16; // Center point for 32px SVG (w-8)

  return (
    <div className={`fixed top-24 left-4 z-[9999] flex items-center gap-3 p-2 pr-4 rounded-xl bg-black/80 backdrop-blur-md shadow-2xl border border-white/10 transition-all duration-500 transform ${isSuccess ? 'animate-out fade-out slide-out-to-left duration-1000 delay-3000' : 'animate-in slide-in-from-left duration-500'}`}>
      
      {/* Thumbnail Container with Overlay Loader */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 border border-white/20">
        {thumbnail ? (
          <img src={thumbnail} alt="uploading" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full bg-gray-700" />
        )}

        {/* Center Loader / Progress */}
        <div className="absolute inset-0 flex items-center justify-center">
          {status === 'compressing' ? (
             <Loader2 size={20} className="text-white animate-spin" />
          ) : status === 'success' ? (
             <div className="bg-green-500 rounded-full p-1 animate-in zoom-in">
                <Check size={14} className="text-white" strokeWidth={3} />
             </div>
          ) : (
             <div className="relative flex items-center justify-center">
                {/* SVG Circular Progress - Resized */}
                <svg className="transform -rotate-90 w-8 h-8">
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#3b82f6" // Blue progress color
                    strokeWidth="2.5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-linear"
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-white">{Math.round(progress)}%</span>
             </div>
          )}
        </div>
      </div>

      {/* Text Info */}
      <div className="flex flex-col min-w-[100px]">
         <span className="text-white text-xs font-bold mb-0.5">
            {status === 'compressing' && 'جاري التحضير...'}
            {status === 'uploading' && 'جاري النشر...'}
            {status === 'success' && 'تم النشر بنجاح'}
         </span>
         <span className="text-gray-400 text-[10px]">
            {status === 'compressing' && 'يرجى الانتظار'}
            {status === 'uploading' && 'لا تغلق التطبيق'}
            {status === 'success' && 'يمكنك المشاهدة الآن'}
         </span>
      </div>

    </div>
  );
};

export default VideoUploadIndicator;
