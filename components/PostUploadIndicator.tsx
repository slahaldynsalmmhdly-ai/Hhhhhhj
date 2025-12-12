
import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface PostUploadIndicatorProps {
  status: 'publishing' | 'success';
  contentPreview?: string;
  imagePreview?: string; // Kept in interface to prevent prop errors, but unused
}

const PostUploadIndicator: React.FC<PostUploadIndicatorProps> = ({ status, contentPreview }) => {
  const isSuccess = status === 'success';

  return (
    <div className={`fixed top-24 right-4 z-[9999] flex items-center gap-3 p-2 pl-4 rounded-xl bg-white/90 backdrop-blur-md shadow-2xl border border-gray-200 transition-all duration-500 transform ${isSuccess ? 'animate-out fade-out slide-out-to-right duration-1000 delay-3000' : 'animate-in slide-in-from-right duration-500'}`}>
      
      {/* Icon Container - Simplified: Just Background Color + Icon */}
      <div className={`relative w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center border transition-colors duration-300 ${
         isSuccess ? 'bg-green-100 border-green-200' : 'bg-blue-50 border-blue-100'
      }`}>
        {status === 'publishing' ? (
           <Loader2 size={24} className="text-blue-600 animate-spin" />
        ) : (
           <Check size={24} className="text-green-600 animate-in zoom-in" strokeWidth={3} />
        )}
      </div>

      {/* Text Info */}
      <div className="flex flex-col min-w-[120px] text-right">
         <span className={`text-xs font-bold mb-0.5 ${isSuccess ? 'text-green-600' : 'text-gray-800'}`}>
            {status === 'publishing' ? 'جاري النشر...' : 'تم النشر بنجاح'}
         </span>
         <span className="text-gray-500 text-[10px] line-clamp-1 max-w-[150px]">
            {contentPreview || 'منشور جديد'}
         </span>
      </div>

    </div>
  );
};

export default PostUploadIndicator;
