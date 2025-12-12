import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Eye, Loader2, Info, CheckCircle } from 'lucide-react';
import Avatar from './Avatar';
import { API_BASE_URL } from '../constants';
import { Story, StoryGroup } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StoriesProps {
  onCreateStory?: () => void;
  refreshKey?: number;
}

interface Viewer {
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  viewedAt: string;
}

const Stories: React.FC<StoriesProps> = ({ onCreateStory, refreshKey }) => {
  const { t, language } = useLanguage();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Viewers List State
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);
  const [viewersList, setViewersList] = useState<Viewer[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Single Story Limit Modal State
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const currentUserId = localStorage.getItem('userId');

  const myName = localStorage.getItem('userName') || 'مستخدم';
  const myAvatar = localStorage.getItem('userAvatar');

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);

    if (seconds < 60) return language === 'ar' ? `الآن` : `Just now`;
    if (minutes < 60) return language === 'ar' ? `منذ ${minutes} د` : `${minutes}m ago`;
    if (hours < 24) return language === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
    
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric'});
  };

  const getUserId = (user: any) => {
      if (!user) return '';
      if (typeof user === 'string') return user;
      return user._id || user.id || '';
  };

  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/v1/stories/feed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          let rawStories: Story[] = [];

          if (data.usersWithStories && Array.isArray(data.usersWithStories)) {
             data.usersWithStories.forEach((item: any) => {
                const storyUser = {
                    _id: item._id,
                    name: item.name,
                    avatar: item.avatar
                };

                if (item.stories && Array.isArray(item.stories) && item.stories.length > 0) {
                    item.stories.forEach((s: any) => {
                        rawStories.push({ ...s, user: storyUser });
                    });
                } else if (item.latestStory) {
                    const story = item.latestStory;
                    const finalUser = (story.user && typeof story.user === 'object') ? story.user : storyUser;
                    rawStories.push({ ...story, user: finalUser });
                }
             });
          } else if (Array.isArray(data)) {
            rawStories = [...data];
          } else if (data.stories && Array.isArray(data.stories)) {
            rawStories = [...data.stories];
          }
          
          const uniqueStoriesMap = new Map();
          rawStories.forEach(s => {
              const id = s._id || (s as any).id;
              if (id) uniqueStoriesMap.set(id, s);
          });
          const uniqueStories = Array.from(uniqueStoriesMap.values()) as Story[];

          const groupsMap = new Map<string, StoryGroup>();
          
          const myGroup: StoryGroup = {
             user: { id: currentUserId || 'me', _id: currentUserId || 'me', name: myName, avatar: myAvatar || '' },
             stories: [],
             hasUnseen: false,
             isUser: true
          };

          uniqueStories.forEach((story: Story) => {
             const storyUserId = getUserId(story.user);
             const isMe = currentUserId && String(storyUserId) === String(currentUserId);
             
             if (isMe) {
                if (!story.user.avatar && myAvatar) story.user.avatar = myAvatar;
                if (!myGroup.stories.some(s => s._id === story._id)) {
                    myGroup.stories.push(story);
                }
             } else {
                if (!groupsMap.has(storyUserId)) {
                   groupsMap.set(storyUserId, {
                      user: { ...story.user, id: storyUserId },
                      stories: [],
                      hasUnseen: true,
                      isUser: false
                   });
                }
                const group = groupsMap.get(storyUserId);
                if (group && !group.stories.some(s => s._id === story._id)) {
                    group.stories.push(story);
                }
             }
          });

          // Sort by date: Oldest first for correct playback flow
          const sortByDate = (a: Story, b: Story) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          myGroup.stories.sort(sortByDate);
          groupsMap.forEach(g => g.stories.sort(sortByDate));

          const finalGroups = Array.from(groupsMap.values());
          if (myGroup.stories.length > 0) {
              finalGroups.unshift(myGroup);
          }

          setStoryGroups(finalGroups);
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [refreshKey, currentUserId]);

  const handleCreateClick = () => {
    // Check if user already has a story
    const myGroup = storyGroups.find(g => g.isUser);
    if (myGroup && myGroup.stories.length > 0) {
       setIsLimitModalOpen(true);
    } else {
       if (onCreateStory) onCreateStory();
    }
  };

  const openViewer = async (groupIndex: number) => {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0); 
    setViewerOpen(true);
    setProgress(0);
    setIsPaused(false);
    setIsBuffering(false);
    
    // Fetch full stories with viewers
    const group = storyGroups[groupIndex];
    const userId = getUserId(group.user);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/stories/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const fullStories = await response.json();
        const updatedGroups = [...storyGroups];
        if (Array.isArray(fullStories)) {
            fullStories.sort((a: Story, b: Story) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            updatedGroups[groupIndex].stories = fullStories;
            setStoryGroups(updatedGroups);
        }
      }
    } catch (error) {
      console.error("Error fetching full stories:", error);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setActiveGroupIndex(0);
    setActiveStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
    setIsBuffering(false);
    setIsDeleteModalOpen(false);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  const handleFetchViewers = async (storyId: string) => {
    setIsPaused(true); 
    setIsViewersModalOpen(true);
    setIsLoadingViewers(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/v1/stories/${storyId}/viewers`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
         const data = await response.json();
         setViewersList(Array.isArray(data) ? data : (data.viewers || []));
      }
    } catch (error) {
       console.error(error);
    } finally {
       setIsLoadingViewers(false);
    }
  };

  const handleDeleteClick = () => {
      setIsPaused(true);
      setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const currentGroup = storyGroups[activeGroupIndex];
    const currentStory = currentGroup?.stories[activeStoryIndex];

    if (!currentStory) {
        setIsDeleting(false);
        setIsDeleteModalOpen(false);
        return;
    }
    
    try {
       const token = localStorage.getItem('token');
       const response = await fetch(`${API_BASE_URL}/api/v1/stories/${currentStory._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
       });
       
       if (response.ok) {
           const newGroups = [...storyGroups];
           const group = newGroups[activeGroupIndex];
           group.stories.splice(activeStoryIndex, 1);
           
           if (group.stories.length === 0) {
              newGroups.splice(activeGroupIndex, 1);
              setStoryGroups(newGroups);
              closeViewer();
           } else {
               setStoryGroups(newGroups);
               if (activeStoryIndex >= group.stories.length) {
                   setActiveStoryIndex(Math.max(0, group.stories.length - 1));
                   setProgress(0);
               } else {
                   setProgress(0);
               }
               setIsPaused(false);
           }
           setIsDeleteModalOpen(false);
       }
    } catch (e) {
        setIsDeleteModalOpen(false);
    } finally {
        setIsDeleting(false);
    }
  };

  // Video Events
  const onVideoTimeUpdate = () => {
    if (videoRef.current && !isPaused && !isBuffering) {
       const duration = videoRef.current.duration;
       const currentTime = videoRef.current.currentTime;
       if (duration > 0) {
           setProgress((currentTime / duration) * 100);
       }
    }
  };

  const onVideoEnded = () => handleNext();
  const onVideoWaiting = () => setIsBuffering(true);
  const onVideoPlaying = () => setIsBuffering(false);

  // Timer Logic
  useEffect(() => {
    if (!viewerOpen) return;
    const currentGroup = storyGroups[activeGroupIndex];
    if (!currentGroup?.stories.length) {
        closeViewer();
        return;
    }
    
    const currentStory = currentGroup.stories[activeStoryIndex];
    const isVideo = currentStory.media?.type === 'video';
    
    // Reset buffer state on slide change
    setIsBuffering(false); 
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    if (isVideo) {
        if (progress === 100) setProgress(0);
        if (videoRef.current) {
            isPaused ? videoRef.current.pause() : videoRef.current.play().catch(() => {});
        }
    } else {
        // Image Logic
        const duration = 5000;
        if (!isPaused) {
           if (progress === 0 || progress >= 100) {
               startTimeRef.current = Date.now();
               setProgress(0);
           } else {
               const elapsed = (progress / 100) * duration;
               startTimeRef.current = Date.now() - elapsed;
           }

           progressTimerRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = now - startTimeRef.current;
                const pct = Math.min((elapsed / duration) * 100, 100);
                setProgress(pct);
                if (pct >= 100) {
                    clearInterval(progressTimerRef.current);
                    handleNext();
                }
            }, 50);
        }
    }
    return () => clearInterval(progressTimerRef.current);
  }, [viewerOpen, activeGroupIndex, activeStoryIndex, storyGroups, isPaused]);

  const handleNext = () => {
     const currentGroup = storyGroups[activeGroupIndex];
     if (activeStoryIndex < currentGroup.stories.length - 1) {
         setActiveStoryIndex(prev => prev + 1);
         setProgress(0);
     } else {
         if (activeGroupIndex < storyGroups.length - 1) {
             setActiveGroupIndex(prev => prev + 1);
             setActiveStoryIndex(0);
             setProgress(0);
         } else {
             closeViewer();
         }
     }
  };

  const handlePrev = () => {
      const currentGroup = storyGroups[activeGroupIndex];
      const currentStory = currentGroup?.stories[activeStoryIndex];
      const isVideo = currentStory?.media?.type === 'video';

      // If viewing video and > 2s, restart
      if (isVideo && videoRef.current && videoRef.current.currentTime > 2) {
          videoRef.current.currentTime = 0;
          return;
      }
      // If image and > 10%, restart
      if (!isVideo && progress > 10) {
          setProgress(0);
          startTimeRef.current = Date.now();
          return;
      }

      if (activeStoryIndex > 0) {
          setActiveStoryIndex(prev => prev - 1);
          setProgress(0);
      } else {
          if (activeGroupIndex > 0) {
              setActiveGroupIndex(prev => prev - 1);
              // Go to first story of previous user (WhatsApp style typically goes to first)
              setActiveStoryIndex(0); 
              setProgress(0);
          } else {
              setProgress(0);
              startTimeRef.current = Date.now();
          }
      }
  };

  const currentGroup = storyGroups[activeGroupIndex];
  const currentStory = currentGroup?.stories[activeStoryIndex];

  return (
    <>
      <div className="bg-white py-4 mb-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-3 min-w-max">
          
          {/* Add Story Card - Fixed Dimensions */}
          <div 
            onClick={handleCreateClick}
            className="relative w-24 h-40 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group border border-gray-100 shadow-sm transition-all active:scale-95"
          >
             {/* Top Image Part */}
             <div className="h-3/4 w-full relative bg-gray-50">
                <Avatar 
                    name={myName} 
                    src={myAvatar ? (myAvatar.startsWith('http') ? myAvatar : `${API_BASE_URL}${myAvatar}`) : null} 
                    className="w-full h-full rounded-none object-cover"
                    textClassName="text-2xl"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
             </div>
             {/* Bottom White Part */}
             <div className="h-1/4 w-full bg-white relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 rounded-full p-0.5 border-2 border-white">
                     <Plus size={16} className="text-white" strokeWidth={3} />
                 </div>
                 <div className="w-full h-full flex items-end justify-center pb-1.5">
                     <span className="text-[10px] font-bold text-gray-900">{t('create_story')}</span>
                 </div>
             </div>
          </div>

          {/* Stories List - Fixed Dimensions */}
          {storyGroups.map((group, idx) => {
             const isMe = group.isUser;
             const displayName = group.user.name || (isMe ? myName : 'مستخدم');
             const displayAvatar = group.user.avatar || (isMe ? myAvatar : null);
             const count = group.stories.length;
             const latestStory = group.stories[group.stories.length - 1];
             const hasMedia = latestStory?.media && latestStory.media.url;

             if (count === 0) return null;

             return (
              <div 
                key={group.user.id || idx}
                onClick={() => openViewer(idx)}
                className="relative w-24 h-40 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-gray-100 transition-transform active:scale-95 bg-gray-100"
              >
                 {/* Background Media */}
                 <div className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105">
                     {hasMedia ? (
                        latestStory.media?.type === 'video' ? (
                             <video 
                                src={latestStory.media.url.startsWith('http') ? latestStory.media.url : `${API_BASE_URL}${latestStory.media.url}`} 
                                className="w-full h-full object-cover" 
                                muted 
                                playsInline 
                             />
                        ) : (
                             <img 
                                src={latestStory.media!.url.startsWith('http') ? latestStory.media!.url : `${API_BASE_URL}${latestStory.media!.url}`} 
                                alt={displayName}
                                className="w-full h-full object-cover"
                             />
                        )
                     ) : (
                        <div className={`w-full h-full ${latestStory.backgroundColor || 'bg-gradient-to-br from-blue-500 to-purple-600'} flex items-center justify-center p-2`}>
                            <p className="text-white text-[8px] line-clamp-4 text-center">{latestStory.text}</p>
                        </div>
                     )}
                 </div>

                 {/* Gradient Overlay */}
                 <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

                 {/* Avatar (Top Left) */}
                 <div className={`absolute top-2 left-2 p-0.5 rounded-full border-2 ${group.hasUnseen && !isMe ? 'border-blue-500' : 'border-white'} z-10 bg-transparent`}>
                     <Avatar 
                       name={displayName} 
                       src={displayAvatar ? (displayAvatar.startsWith('http') ? displayAvatar : `${API_BASE_URL}${displayAvatar}`) : null} 
                       className="w-8 h-8 rounded-full border border-white" 
                       textClassName="text-[10px]"
                     />
                 </div>

                 {/* Name (Bottom Right) */}
                 <span className="absolute bottom-2 right-2 text-white font-bold text-[10px] shadow-black drop-shadow-md z-10 truncate max-w-[90%] text-right leading-tight">
                    {isMe ? t('your_story') : displayName}
                 </span>
              </div>
             );
          })}
        </div>
      </div>

      {/* Viewer Modal */}
      {viewerOpen && currentStory && createPortal(
          <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-200">
             
             {/* Progress Bars */}
             <div className="absolute top-0 left-0 right-0 z-20 pt-safe px-2 py-3 flex gap-1 pointer-events-none">
                {currentGroup.stories.map((s, i) => {
                    let width = '0%';
                    if (i < activeStoryIndex) width = '100%';
                    else if (i === activeStoryIndex) width = `${progress}%`;
                    
                    return (
                        <div key={s._id || i} className="h-0.5 bg-white/30 flex-1 rounded-full overflow-hidden">
                            <div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width }} />
                        </div>
                    );
                })}
             </div>

             {/* Header Controls */}
             <div className="absolute top-8 left-0 right-0 z-20 px-4 flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                   <Avatar 
                      name={currentGroup.user.name} 
                      src={currentGroup.user.avatar ? (currentGroup.user.avatar.startsWith('http') ? currentGroup.user.avatar : `${API_BASE_URL}${currentGroup.user.avatar}`) : null} 
                      className="w-9 h-9 border border-white/20" 
                   />
                   <div>
                       <h4 className="text-white font-bold text-sm shadow-black drop-shadow-md">{currentGroup.user.name}</h4>
                       <span className="text-white/70 text-xs shadow-black drop-shadow-md">
                           {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                       </span>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                    {currentGroup.isUser && (
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }} className="p-2 hover:bg-white/10 rounded-full">
                            <Trash2 size={20} className="text-white" />
                         </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); closeViewer(); }} className="p-2 hover:bg-white/10 rounded-full">
                        <X size={24} className="text-white" />
                    </button>
                </div>
             </div>

             {/* Main Viewer Content */}
             <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
                 {currentStory.text ? (
                     <div className={`w-full h-full flex items-center justify-center p-8 ${currentStory.backgroundColor || 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                         <p className="text-white text-2xl font-bold text-center leading-relaxed whitespace-pre-wrap">{currentStory.text}</p>
                     </div>
                 ) : (
                     currentStory.media?.type === 'video' ? (
                        <>
                           <video 
                              ref={videoRef}
                              src={currentStory.media.url.startsWith('http') ? currentStory.media.url : `${API_BASE_URL}${currentStory.media.url}`}
                              autoPlay={!isPaused} 
                              playsInline
                              className="w-full h-full object-contain"
                              onTimeUpdate={onVideoTimeUpdate}
                              onEnded={onVideoEnded}
                              onWaiting={onVideoWaiting}
                              onPlaying={onVideoPlaying}
                           />
                           {isBuffering && (
                             <div className="absolute inset-0 flex items-center justify-center z-10">
                               <Loader2 size={48} className="text-white animate-spin" />
                             </div>
                           )}
                        </>
                     ) : (
                        <img 
                           src={currentStory.media?.url.startsWith('http') ? currentStory.media.url : `${API_BASE_URL}${currentStory.media?.url}`}
                           alt="story"
                           className="w-full h-full object-contain"
                        />
                     )
                 )}

                 {/* Touch Zones */}
                 <div className="absolute inset-0 z-10 flex">
                     <div className="w-1/3 h-full" onClick={handlePrev}></div>
                     <div className="w-2/3 h-full" onClick={handleNext}></div>
                 </div>
             </div>
             
             {/* Viewers Footer (If User) */}
             {currentGroup.isUser && (
                 <div className="absolute bottom-0 left-0 right-0 z-20 pb-safe p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleFetchViewers(currentStory._id); }}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="flex items-center gap-1 text-white">
                            <Eye size={18} />
                            <span className="font-bold text-sm">{currentStory.views?.length || 0}</span>
                        </div>
                        <span className="text-[10px] text-gray-300">{t('story_viewers')}</span>
                    </button>
                 </div>
             )}
          </div>,
          document.body
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative z-10 animate-in zoom-in-95">
             <h3 className="text-lg font-bold text-center mb-2">{t('delete')}?</h3>
             <p className="text-gray-500 text-center text-sm mb-6">{t('confirm')}</p>
             <div className="flex gap-3">
                <button onClick={handleConfirmDelete} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">
                   {isDeleting ? t('loading') : t('delete')}
                </button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                   {t('cancel')}
                </button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Limit Modal (New) */}
      {isLimitModalOpen && createPortal(
         <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsLimitModalOpen(false)} />
             
             <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="flex flex-col items-center text-center gap-4 pt-2">
                   
                   {/* Icon */}
                   <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-1 shadow-inner ring-4 ring-blue-50/50">
                      <Info size={40} className="text-blue-500" strokeWidth={2} />
                   </div>
                   
                   {/* Text */}
                   <div>
                     <h3 className="text-xl font-black text-gray-900 mb-3">{t('story_limit_title')}</h3>
                     <p className="text-gray-600 text-sm leading-loose font-medium px-2 whitespace-pre-line">
                        {t('story_limit_desc')}
                        <br/>
                        <span className="text-blue-600 font-bold mt-2 block">{t('story_limit_hint')}</span>
                     </p>
                   </div>

                   {/* Button */}
                   <button 
                     onClick={() => setIsLimitModalOpen(false)} 
                     className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 mt-2 flex items-center justify-center gap-2"
                   >
                     <span>{t('understood')}</span>
                     <CheckCircle size={18} />
                   </button>
                </div>
             </div>
         </div>,
         document.body
      )}

      {/* Viewers List Modal */}
      {isViewersModalOpen && createPortal(
         <div className="fixed inset-0 z-[300] flex items-end justify-center">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsViewersModalOpen(false)} />
             <div className="bg-white w-full max-w-md rounded-t-3xl relative z-10 animate-in slide-in-from-bottom h-[60vh] flex flex-col pb-safe">
                 <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold">{t('story_viewers')}</h3>
                    <button onClick={() => setIsViewersModalOpen(false)}><X size={20} /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                    {isLoadingViewers ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600" /></div>
                    ) : viewersList.length > 0 ? (
                        viewersList.map(v => (
                           <div key={v.user._id} className="flex items-center justify-between gap-3 p-3 border-b border-gray-50">
                               <div className="flex items-center gap-3">
                                   <Avatar name={v.user.name} src={v.user.avatar ? (v.user.avatar.startsWith('http') ? v.user.avatar : `${API_BASE_URL}${v.user.avatar}`) : undefined} className="w-10 h-10" />
                                   <span className="font-bold text-sm">{v.user.name}</span>
                               </div>
                               <span className="text-xs text-gray-400 font-medium">{getTimeAgo(v.viewedAt)}</span>
                           </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 mt-10">{t('story_no_viewers')}</p>
                    )}
                 </div>
             </div>
         </div>,
         document.body
      )}

    </>
  );
};

export default Stories;