
import React, { useState, useRef, PointerEvent, useEffect } from 'react';
import { ArrowLeft, Type, Check, Minus, Plus } from 'lucide-react';

// Define the structure for a text overlay
export interface TextOverlay {
  id: number;
  content: string;
  x: number;
  y: number;
  scale: number;
  color: string;
}

interface EditVideoViewProps {
  videoSrc: string;
  onBack: () => void;
  onNext: (texts: TextOverlay[]) => void;
  initialTexts: TextOverlay[];
}

// Draggable and Resizable Text Component
const EditableText: React.FC<{
  text: TextOverlay;
  onUpdate: (id: number, updates: Partial<TextOverlay>) => void;
  onSelect: (id: number) => void;
  isSelected: boolean;
}> = ({ text, onUpdate, onSelect, isSelected }) => {
  const [dragState, setDragState] = useState<{ x: number, y: number } | null>(null);
  
  const handleDragStart = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(text.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ x: e.clientX - text.x, y: e.clientY - text.y });
  };

  const handleDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragState) {
      e.preventDefault();
      e.stopPropagation();
      onUpdate(text.id, { x: e.clientX - dragState.x, y: e.clientY - dragState.y });
    }
  };

  const handleDragEnd = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragState(null);
  };

  return (
    <div
      onPointerDown={handleDragStart}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
      className="absolute touch-none cursor-grab active:cursor-grabbing p-4 select-none"
      style={{
        left: text.x,
        top: text.y,
        transform: `translate(-50%, -50%) scale(${text.scale})`,
        border: isSelected ? '2px dashed rgba(255,255,255,0.7)' : 'none',
        borderRadius: '8px',
        zIndex: isSelected ? 20 : 10
      }}
    >
      <span
        className="text-3xl font-bold whitespace-nowrap"
        style={{ color: text.color, textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}
      >
        {text.content}
      </span>
    </div>
  );
};

// Text Input Modal
const TextEditModal: React.FC<{
  onDone: (content: string, color: string) => void;
  onClose: () => void;
}> = ({ onDone, onClose }) => {
    const [content, setContent] = useState('');
    const [color, setColor] = useState('#FFFFFF');
    const colors = ['#FFFFFF', '#000000', '#FF3B30', '#34C759', '#007AFF', '#FFCC00', '#AF52DE'];

    return (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب شيئاً..."
                className="w-full max-w-sm bg-transparent border-b-2 border-white text-white text-3xl font-bold text-center placeholder:text-gray-400 outline-none p-2 mb-8"
                autoFocus
            />
            <div className="flex gap-3 mb-8">
                {colors.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full transition-transform transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                    />
                ))}
            </div>
            <div className="flex gap-4">
                 <button onClick={onClose} className="px-6 py-2 rounded-full font-bold bg-white/20 text-white">إلغاء</button>
                 <button onClick={() => content && onDone(content, color)} 
                   className="px-8 py-2 rounded-full font-bold bg-blue-600 text-white disabled:bg-gray-500"
                   disabled={!content}
                 >
                   تم
                 </button>
            </div>
        </div>
    );
};

const EditVideoView: React.FC<EditVideoViewProps> = ({ videoSrc, onBack, onNext, initialTexts }) => {
  const [texts, setTexts] = useState<TextOverlay[]>(initialTexts);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- RADICAL FIX FOR BLACK SCREEN / FIRST LOAD ISSUE ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    // 1. Force the browser to acknowledge the new source explicitly
    video.load();

    const attemptPlay = () => {
        // Ensure muted is set for autoplay policies
        video.muted = true;
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.warn("Autoplay prevented:", error);
                // Retry once with strict muting if failed
                video.muted = true;
                try { video.play(); } catch(e) {}
            });
        }
    };

    // 2. Define the handler for when data is ready
    const handleReady = () => {
        attemptPlay();
    };

    // 3. CRITICAL CHECK: If the video is ALREADY ready (cached/fast load), play immediately.
    // readyState >= 2 means (HAVE_CURRENT_DATA) or better.
    if (video.readyState >= 2) {
        attemptPlay();
    } else {
        // 4. Otherwise, wait for the event. 'loadeddata' is safer than 'canplay' for the first frame.
        video.addEventListener('loadeddata', handleReady);
        video.addEventListener('canplay', handleReady);
    }

    return () => {
        video.removeEventListener('loadeddata', handleReady);
        video.removeEventListener('canplay', handleReady);
    };
  }, [videoSrc]);

  const handleAddText = (content: string, color: string) => {
    const container = containerRef.current;
    if (!container) return;

    const newText: TextOverlay = {
      id: Date.now(),
      content,
      color,
      x: container.clientWidth / 2,
      y: container.clientHeight / 2,
      scale: 1,
    };
    setTexts(prev => [...prev, newText]);
    setIsTextModalOpen(false);
    setSelectedTextId(newText.id);
  };
  
  const updateText = (id: number, updates: Partial<TextOverlay>) => {
    setTexts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedTextId !== null) {
        updateText(selectedTextId, { scale: parseFloat(e.target.value) });
    }
  };
  
  return (
    <div className="fixed inset-0 z-[110] bg-black text-white flex flex-col animate-in fade-in duration-300">
      
      {/* Main Content Area */}
      <div ref={containerRef} className="flex-1 relative w-full h-full overflow-hidden" onClick={() => setSelectedTextId(null)}>
        {/* CRITICAL: key={videoSrc} ensures complete component remount on file change */}
        <video 
          key={videoSrc} 
          ref={videoRef}
          src={videoSrc} 
          playsInline
          muted
          loop
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover" 
        />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center pt-safe bg-gradient-to-b from-black/50 to-transparent">
          <button onClick={onBack} className="p-2 bg-black/30 rounded-full backdrop-blur-md">
            <ArrowLeft className="rotate-180" size={24} />
          </button>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsTextModalOpen(true)}
                className="p-2 bg-black/30 rounded-full backdrop-blur-md hover:bg-black/50"
            >
              <Type size={24} />
            </button>
            <button 
              onClick={() => onNext(texts)}
              className="px-6 py-2 rounded-full font-bold text-sm bg-blue-600 text-white transition-colors shadow-lg"
            >
              التالي
            </button>
          </div>
        </div>

        {/* Render Editable Texts */}
        {texts.map(text => (
          <EditableText
            key={text.id}
            text={text}
            onUpdate={updateText}
            onSelect={(id) => { setSelectedTextId(id); }}
            isSelected={selectedTextId === text.id}
          />
        ))}

        {/* Text Input Modal */}
        {isTextModalOpen && (
            <TextEditModal
                onDone={handleAddText}
                onClose={() => setIsTextModalOpen(false)}
            />
        )}

        {/* Resizing Slider - Show only when text selected */}
        {selectedTextId !== null && (
            <div className="absolute bottom-10 left-0 right-0 p-6 z-30 flex flex-col items-center animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl w-full max-w-xs border border-white/10">
                    <div className="flex items-center justify-between text-white mb-2">
                        <Minus size={16} />
                        <span className="text-xs font-bold">حجم النص</span>
                        <Plus size={16} />
                    </div>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1"
                        value={texts.find(t => t.id === selectedTextId)?.scale || 1}
                        onChange={handleScaleChange}
                        className="w-full accent-blue-600 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EditVideoView;
