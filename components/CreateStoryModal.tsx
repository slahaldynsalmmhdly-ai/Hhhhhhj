
import React, { useState, useRef } from 'react';
import { 
  X, Type, Palette, Check, ALargeSmall, Image as ImageIcon, Video, Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateStoryModalProps {
  onClose: () => void;
  onPost: (storyData: any) => void; // Using any to pass the success signal
}

const GRADIENTS = [
  'bg-gradient-to-br from-purple-600 to-blue-500',
  'bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500',
  'bg-gradient-to-bl from-cyan-400 to-blue-600',
  'bg-gradient-to-br from-pink-500 to-rose-500',
  'bg-gradient-to-t from-emerald-400 to-cyan-500',
  'bg-gradient-to-r from-violet-600 to-indigo-600',
  'bg-gradient-to-br from-slate-900 to-slate-700',
];

const FONT_SIZES = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onPost }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'text' | 'media'>('text');
  
  // Text Mode State
  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(2);
  
  // Media Mode State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNextBackground = () => setBgIndex((prev) => (prev + 1) % GRADIENTS.length);
  const handleNextSize = () => setSizeIndex((prev) => (prev + 1) % FONT_SIZES.length);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setMode('media');
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('files', file);
    const token = localStorage.getItem('token');
    
    const res = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    
    if (!res.ok) throw new Error("File upload failed");
    const data = await res.json();
    return data.files[0]; // { filePath, fileType }
  };

  const handlePublish = async () => {
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'media' && !mediaFile) return;

    setIsSubmitting(true);
    try {
        const token = localStorage.getItem('token');
        let payload: any = {};

        if (mode === 'text') {
            payload = {
                text: text,
                backgroundColor: GRADIENTS[bgIndex]
            };
        } else if (mediaFile) {
            const uploaded = await uploadFile(mediaFile);
            payload = {
                media: {
                    url: uploaded.filePath,
                    type: uploaded.fileType // 'image' or 'video'
                }
            };
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/stories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            onPost({}); // Signal success
            onClose();
        } else {
            alert(t('story_upload_fail'));
        }

    } catch (e) {
        console.error(e);
        alert(t('story_upload_error'));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col animate-in fade-in duration-300 ${mode === 'text' ? GRADIENTS[bgIndex] : 'bg-black'} transition-colors duration-500`}>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-start z-20">
        <button onClick={onClose} className="p-2 bg-black/20 rounded-full text-white backdrop-blur-sm">
          <X size={28} />
        </button>

        {mode === 'text' && (
           <button onClick={handleNextBackground} className="mt-2 p-2 bg-white/20 rounded-full text-white backdrop-blur-md">
             <Palette size={24} />
           </button>
        )}

        <button 
          onClick={handlePublish}
          disabled={isSubmitting || (mode === 'text' && !text) || (mode === 'media' && !mediaFile)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-lg backdrop-blur-sm ${
             isSubmitting ? 'bg-gray-400' : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /><span>{t('post_publish')}</span></>}
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
         {mode === 'text' ? (
             <textarea
               value={text}
               onChange={(e) => setText(e.target.value)}
               placeholder={t('story_text_placeholder')}
               className={`w-full max-w-lg bg-transparent border-none outline-none text-center font-bold placeholder:text-white/50 resize-none overflow-hidden leading-relaxed text-white ${FONT_SIZES[sizeIndex]} drop-shadow-md`}
               rows={5}
             />
         ) : (
             mediaPreview ? (
                mediaFile?.type.startsWith('video') ? (
                    <video src={mediaPreview} autoPlay loop playsInline className="w-full h-full object-contain" />
                ) : (
                    <img src={mediaPreview} alt="preview" className="w-full h-full object-contain" />
                )
             ) : (
                <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-4 text-gray-400 cursor-pointer p-10 border-2 border-dashed border-gray-600 rounded-3xl">
                    <ImageIcon size={48} />
                    <span>{t('story_media_placeholder')}</span>
                </div>
             )
         )}
      </div>

      {/* Footer Tools */}
      <div className="absolute bottom-10 left-0 right-0 pb-safe flex flex-col items-center gap-6 z-20">
         
         {/* Tools based on mode */}
         {mode === 'text' && (
            <div className="flex gap-6">
                <button onClick={handleNextSize} className="flex flex-col items-center gap-1">
                   <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center"><ALargeSmall size={20} className="text-white" /></div>
                   <span className="text-white text-[10px]">{t('story_font_size')}</span>
                </button>
            </div>
         )}
         
         {/* Mode Switcher */}
         <div className="bg-black/40 backdrop-blur-md rounded-full p-1 flex">
             <button 
               onClick={() => setMode('text')}
               className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${mode === 'text' ? 'bg-white text-black' : 'text-white'}`}
             >
               {t('story_type_text')}
             </button>
             <button 
               onClick={() => fileInputRef.current?.click()}
               className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${mode === 'media' ? 'bg-white text-black' : 'text-white'}`}
             >
               {t('story_type_media')}
             </button>
         </div>

         <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
      </div>

    </div>
  );
};

export default CreateStoryModal;
