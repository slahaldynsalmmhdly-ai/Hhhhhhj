
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, Heart, MessageCircle, Share2, 
  MoreHorizontal, Play, Pause, X, ArrowRight, Send, ChevronDown
} from 'lucide-react';
import Avatar from './Avatar';
import { API_BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface VideoDetailViewProps {
  notification: any;
  onBack: () => void;
}

const VideoDetailView: React.FC<VideoDetailViewProps> = ({ notification, onBack }) => {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // States for the automated flow
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [viewingRepliesFor, setViewingRepliesFor] = useState<any | null>(null);

  // User info
  const user = notification.user;
  const myName = localStorage.getItem('userName') || 'أنا';
  const myAvatar = localStorage.getItem('userAvatar');
  const isAr = language === 'ar';

  // Toggle Video Play
  const togglePlay = () => {
    if (videoRef.current) {
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    }
  };

  // --- THE MAGIC SEQUENCE ---
  useEffect(() => {
    // 1. Start playing video automatically on mount
    if (videoRef.current) videoRef.current.play().catch(() => {});

    // 2. Open Comments Modal automatically after 800ms
    const timer1 = setTimeout(() => {
        setIsCommentsOpen(true);
    }, 800);

    // 3. Open the "Reply Container" (Nested View) automatically after comments open (e.g. 1200ms)
    // We simulate finding the comment that has the reply
    const timer2 = setTimeout(() => {
        const mockParentComment = {
            id: 'parent_1',
            text: 'فيديو جميل جداً ومبدع! استمر يا بطل 🔥',
            user: { name: user.name, avatar: user.avatar },
            likes: 45,
            time: 'منذ ساعتين',
            repliesCount: 3,
            replies: [
                {
                    id: 'reply_1',
                    text: 'شكراً لك على دعمك المستمر! ❤️',
                    user: { name: 'صاحب الفيديو', avatar: null }, // Mock owner
                    likes: 2,
                    time: 'منذ ساعة'
                },
                {
                    id: 'reply_notification',
                    text: 'أتفق معك تماماً، هذا أفضل محتوى شاهدته اليوم!',
                    user: { name: myName, avatar: myAvatar }, // Me
                    likes: 0,
                    time: 'الآن',
                    isHighlight: true // To style it differently
                }
            ]
        };
        setViewingRepliesFor(mockParentComment);
    }, 1400);

    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
    };
  }, [user, myName, myAvatar]);


  return (
    <div className="fixed inset-0 z-[150] bg-black text-white flex flex-col animate-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
         <button onClick={onBack} className="p-2 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors">
            <ArrowLeft className="rotate-180" size={24} />
         </button>
         <h3 className="font-bold text-sm shadow-black drop-shadow-md">مشاهدة الرد</h3>
         <div className="w-8"></div>
      </div>

      {/* Video Player */}
      <div className="flex-1 relative bg-gray-900" onClick={togglePlay}>
         {/* Fake Video Source for Demo - Replace with real URL if available */}
         <video 
           ref={videoRef}
           src="https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4" 
           loop 
           playsInline
           className="w-full h-full object-cover opacity-60"
         />
         {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
               <Play size={64} className="text-white/80 fill-white/80" />
            </div>
         )}
         
         {/* Sidebar Actions - Conditional Layout */}
         <div className={`absolute bottom-32 flex flex-col items-center gap-6 z-10 ${isAr ? 'left-4' : 'right-4'}`}>
            <div className="relative">
               <Avatar name={user.name} src={user.avatar} className="w-12 h-12 border border-white" />
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center border border-white text-[10px] font-bold">+</div>
            </div>
            <div className="flex flex-col items-center gap-1">
               <Heart size={32} className="text-white fill-white/20" />
               <span className="text-xs font-bold">12.5K</span>
            </div>
            <div className="flex flex-col items-center gap-1">
               <MessageCircle size={32} className="text-white fill-white" />
               <span className="text-xs font-bold">450</span>
            </div>
            <div className="flex flex-col items-center gap-1">
               <Share2 size={32} className="text-white" />
               <span className="text-xs font-bold">Share</span>
            </div>
         </div>

         {/* Bottom Description - Conditional Layout */}
         <div className={`absolute bottom-0 left-0 right-0 p-4 pb-12 bg-gradient-to-t from-black/90 to-transparent ${isAr ? 'text-right pl-20' : 'text-left pr-20'}`}>
             <h4 className="font-bold text-white mb-2">@{user.name.replace(/\s/g, '')}</h4>
             <p className="text-sm text-gray-200 dir-auto line-clamp-2">
                 فيديو تجريبي يوضح كيفية فتح الإشعارات والردود بشكل تلقائي وسلس... #تطبيق #جديد
             </p>
         </div>
      </div>

      {/* COMMENTS MODAL (TikTok Style) */}
      {isCommentsOpen && createPortal(
         <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-transparent" onClick={() => setIsCommentsOpen(false)} />
            
            <div className="bg-white w-full max-w-md h-[70vh] rounded-t-2xl sm:rounded-2xl relative z-10 animate-slide-up-fast shadow-2xl flex flex-col overflow-hidden">
               
               <div className="flex-1 relative overflow-hidden">
                  
                  {/* Container 1: Main Comments List */}
                  <div className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${viewingRepliesFor ? '-translate-x-full' : 'translate-x-0'}`}>
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20">
                          <div className="w-8"></div>
                          <h3 className="font-bold text-gray-800 text-sm">التعليقات (450)</h3>
                          <button onClick={() => setIsCommentsOpen(false)} className="bg-gray-100 p-1 rounded-full hover:bg-gray-200">
                              <X size={20} className="text-gray-600" />
                          </button>
                      </div>

                      {/* List */}
                      <div className="flex-1 overflow-y-auto no-scrollbar p-4 opacity-50 pointer-events-none">
                         {/* Dummy list just for visuals behind the slide */}
                         <div className="text-center text-gray-400 mt-10">جاري تحميل التعليقات...</div>
                      </div>
                  </div>

                  {/* Container 2: Replies View (Nested) - THIS OPENS AUTOMATICALLY */}
                  <div className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${viewingRepliesFor ? 'translate-x-0' : 'translate-x-full'} z-30`}>
                     {viewingRepliesFor && (
                        <>
                           {/* Replies Header */}
                           <div className="bg-white p-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                              <button onClick={() => setViewingRepliesFor(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowRight size={20} className="text-gray-700" />
                              </button>
                              <h3 className="font-bold text-gray-800 text-sm">الردود</h3>
                              <div className="w-9"></div>
                           </div>
                           
                           {/* Replies Content */}
                           <div className="flex-1 overflow-y-auto no-scrollbar p-4 bg-gray-50/50">
                              
                              {/* Parent Comment */}
                              <div className="border-b border-gray-200 pb-4 mb-4">
                                 <div className="flex gap-3">
                                    <Avatar name={viewingRepliesFor.user.name} src={viewingRepliesFor.user.avatar} className="w-9 h-9" />
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold text-gray-900 mb-1 text-right">{viewingRepliesFor.user.name}</h4>
                                        <p className="text-sm text-gray-800 text-right">{viewingRepliesFor.text}</p>
                                        <div className="flex items-center gap-4 mt-1.5">
                                            <span className="text-[10px] text-gray-400">{viewingRepliesFor.time}</span>
                                            <span className="text-[10px] text-gray-500 font-bold">رد</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <Heart size={14} className="text-gray-400" />
                                        <span className="text-[10px] text-gray-400">{viewingRepliesFor.likes}</span>
                                    </div>
                                 </div>
                              </div>

                              {/* Replies List */}
                              <div className="pr-2 mr-1 space-y-4">
                                 {viewingRepliesFor.replies.map((reply: any) => (
                                    <div 
                                        key={reply.id} 
                                        className={`flex gap-3 transition-all duration-500 ${reply.isHighlight ? 'bg-blue-50 p-2 rounded-xl border border-blue-100 animate-in slide-in-from-right' : ''}`}
                                    >
                                        <Avatar name={reply.user.name} src={reply.user.avatar} className="w-8 h-8" />
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-gray-900 mb-1 text-right">{reply.user.name}</h4>
                                            <p className="text-sm text-gray-800 text-right">{reply.text}</p>
                                            <div className="flex items-center gap-4 mt-1.5">
                                                <span className="text-[10px] text-gray-400">{reply.time}</span>
                                                <span className="text-[10px] text-gray-500 font-bold">رد</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5 pt-1">
                                            <Heart size={14} className={reply.isHighlight ? "text-red-500 fill-red-500" : "text-gray-400"} />
                                        </div>
                                    </div>
                                 ))}
                              </div>

                           </div>
                        </>
                     )}
                  </div>
               </div>

               {/* Input Area (Visible in both views usually, but strictly tied to active view logic) */}
               <div className="p-3 border-t border-gray-100 bg-white pb-safe z-40 relative">
                  <div className="flex items-center gap-2">
                     <Avatar name={myName} src={myAvatar} className="w-8 h-8" />
                     <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2">
                        <input 
                           type="text" 
                           placeholder={viewingRepliesFor ? `الرد على ${viewingRepliesFor.user.name}...` : "أضف تعليقاً..."}
                           className="bg-transparent border-none outline-none w-full text-sm text-right dir-rtl placeholder:text-gray-500"
                           autoFocus
                        />
                     </div>
                     <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                        <Send size={20} style={{ transform: language === 'en' ? 'scaleX(-1)' : 'none' }} />
                     </button>
                  </div>
               </div>

            </div>
         </div>, 
         document.body
      )}

    </div>
  );
};

export default VideoDetailView;
