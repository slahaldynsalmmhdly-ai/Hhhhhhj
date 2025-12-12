
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Heart, MessageCircle, Share2, Music, UserPlus, 
  Download, Link, Repeat, Send, X,
  Play, Loader2, Flag, ArrowRight, ChevronDown, Trash2, Copy, Check, CheckCircle,
  Store, Briefcase, Camera
} from 'lucide-react';
import { API_BASE_URL } from '../constants';
import { HARAJ_CATEGORIES, JOB_CATEGORIES } from '../data/categories';
import Avatar from './Avatar';
import { useLanguage } from '../contexts/LanguageContext';

// ... (Interfaces remain same)
interface ShortVideo {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  videoUrl: string | null;
  likes: number;
  comments: number;
  description: string;
  music: string;
  isLiked: boolean;
  isFollowed: boolean;
  category?: string; 
}

interface Comment {
  _id: string;
  text: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  repliesCount?: number;
  replies?: Comment[];
  pending?: boolean;
}

interface ShortsViewProps {
  initialShortId: string | null;
  onViewedInitialShort: () => void;
  isActive: boolean;
  onReport: (type: 'post' | 'comment' | 'reply' | 'video', id: string, name: string) => void;
  initialCategory?: 'forYou' | 'haraj' | 'jobs'; 
  onProfileClick?: (userId: string) => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const ShortsView: React.FC<ShortsViewProps> = ({ initialShortId, onViewedInitialShort, isActive, onReport, initialCategory = 'forYou', onProfileClick }) => {
  const { t, language } = useLanguage();
  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState<'forYou' | 'haraj' | 'jobs'>(initialCategory);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeShortIdForShare, setActiveShortIdForShare] = useState<string | null>(null);
  
  const [repostedShorts, setRepostedShorts] = useState<Set<string>>(new Set());
  const [isRepostSuccessOpen, setIsRepostSuccessOpen] = useState(false);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [expandedShortId, setExpandedShortId] = useState<string | null>(null);
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState<number | null>(null);
  const [bufferingIndex, setBufferingIndex] = useState<number | null>(null);

  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("00:00");
  const [durationDisplay, setDurationDisplay] = useState("00:00");
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const isScrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const scrubberContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDraggingFeed, setIsDraggingFeed] = useState(false);
  const scrollTimeoutRef = useRef<any>(null);
  const touchStartYRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef(new Map<number, HTMLVideoElement | null>());

  const [activeShortIdForComments, setActiveShortIdForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [viewingRepliesFor, setViewingRepliesFor] = useState<Comment | null>(null);
  
  const [activeCommentAction, setActiveCommentAction] = useState<Comment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = localStorage.getItem('userId');
  const isAr = language === 'ar';

  useEffect(() => {
    if (initialCategory) {
      setActiveTab(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        setLoading(false);
        return;
    }

    setLoading(true);

    let url = `${API_BASE_URL}/api/v1/posts/shorts/for-you`;
    if (activeTab === 'haraj' || activeTab === 'jobs') {
       url = `${API_BASE_URL}/api/v1/posts?isShort=true&limit=50`;
    }

    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const postsArray = data.posts || (Array.isArray(data) ? data : []);
        
        if (!Array.isArray(postsArray)) {
            setShorts([]);
            return;
        }

        let mappedShorts: ShortVideo[] = postsArray
            .filter((item: any) => item.isShort === true) // STRICTLY FILTER SHORTS
            .map((item: any): ShortVideo => {
                const videoMedia = item.media?.find((m:any) => m.type === 'video') || item.media?.[0];
                let videoUrl = videoMedia?.url || null;
                if (videoUrl && !videoUrl.startsWith('http')) {
                    videoUrl = `${API_BASE_URL}${videoUrl}`;
                }

                const reactions = item.reactions || [];
                const likesCount = reactions.filter((r: any) => !r.type || r.type === 'like').length;
                const isLiked = reactions.some((r: any) => {
                    const rUserId = r.user?._id || r.user;
                    return rUserId && currentUserId && String(rUserId) === String(currentUserId);
                });

                const userId = item.user?._id || '';
                const cachedFollowStatus = localStorage.getItem(`follow_status_${userId}`);
                const isFollowed = cachedFollowStatus ? JSON.parse(cachedFollowStatus) : false;

                return {
                    id: item._id || item.id,
                    user: {
                        id: userId,
                        name: item.user?.name || 'مستخدم',
                        username: item.user?.username || `@${item.user?.name?.replace(/\s/g, '') || 'user'}`,
                        avatar: item.user?.avatar ? (item.user.avatar.startsWith('http') ? item.user.avatar : `${API_BASE_URL}${item.user.avatar}`) : null
                    },
                    videoUrl: videoUrl,
                    likes: likesCount,
                    comments: item.comments?.length || 0,
                    description: item.text || '',
                    music: 'Original Sound',
                    isLiked: isLiked,
                    isFollowed: isFollowed,
                    category: item.category 
                };
            })
            .filter((s): s is ShortVideo => s.videoUrl !== null)
            .filter((s) => s.user.id !== currentUserId || (initialShortId && s.id === initialShortId));
        
        if (activeTab === 'haraj') {
            const harajCategories = HARAJ_CATEGORIES.map(c => c.name);
            mappedShorts = mappedShorts.filter(s => s.category && harajCategories.includes(s.category));
        } else if (activeTab === 'jobs') {
            const jobCategories = JOB_CATEGORIES.map(c => c.name);
            mappedShorts = mappedShorts.filter(s => s.category && jobCategories.includes(s.category));
        }

        if (initialShortId) {
            const initialIndex = mappedShorts.findIndex(s => s.id === initialShortId);
            if (initialIndex > -1) {
                const selectedShort = mappedShorts.splice(initialIndex, 1)[0];
                mappedShorts.unshift(selectedShort);
            }
        }
        
        setShorts(mappedShorts);
    })
    .catch(err => {
        console.error(err);
        setShorts([]);
    })
    .finally(() => setLoading(false));

  }, [initialShortId, currentUserId, activeTab]); 

  // ... (rest of the file remains exactly the same)
  // ... including handleFollow, handleLike, comments logic, render, etc.
  
  const handleFollow = async (e: React.MouseEvent, userId: string) => {
      e.stopPropagation();
      const token = localStorage.getItem('token');
      if (!token || !userId || userId === currentUserId) return;

      setShorts(prev => prev.map(s => {
          if (s.user.id === userId) {
              return { ...s, isFollowed: true };
          }
          return s;
      }));

      localStorage.setItem(`follow_status_${userId}`, 'true');

      try {
          const response = await fetch(`${API_BASE_URL}/api/v1/follow/${userId}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!response.ok) {
              setShorts(prev => prev.map(s => {
                  if (s.user.id === userId) return { ...s, isFollowed: false };
                  return s;
              }));
              localStorage.setItem(`follow_status_${userId}`, 'false');
          }
      } catch (error) {
          console.error("Follow failed", error);
          setShorts(prev => prev.map(s => {
            if (s.user.id === userId) return { ...s, isFollowed: false };
            return s;
        }));
        localStorage.setItem(`follow_status_${userId}`, 'false');
      }
  };

  const handleLike = async (e: React.MouseEvent, shortId: string) => {
    e.stopPropagation();
    setShorts(prev => prev.map(short => {
        if (short.id === shortId) {
            const newLiked = !short.isLiked;
            return {
                ...short,
                isLiked: newLiked,
                likes: Math.max(0, short.likes + (newLiked ? 1 : -1))
            };
        }
        return short;
    }));

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        await fetch(`${API_BASE_URL}/api/v1/posts/${shortId}/react`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reactionType: 'like' })
        });
    } catch (error) {
        console.error("Like failed", error);
    }
  };

  const processApiComment = useCallback((c: any, userId: string): Comment => {
    if (!c || typeof c !== 'object') return {
        _id: Math.random().toString(),
        text: 'Error loading comment',
        user: { _id: 'unknown', name: 'Unknown' },
        createdAt: new Date().toISOString(),
        likes: 0
    };

    const likesSource = Array.isArray(c.likes) ? c.likes : (Array.isArray(c.reactions) ? c.reactions : []);
    let count = likesSource.length;
    if (count === 0 && typeof c.likes === 'number') count = c.likes;

    const isLiked = likesSource.some((item: any) => {
        if (!item) return false;
        if (typeof item === 'string') return item === userId;
        if (typeof item === 'object') {
            const itemId = item._id || item.id;
            if (itemId && String(itemId) === String(userId)) return true;
            if (item.user) {
                const nestedUserId = (typeof item.user === 'object') ? (item.user._id || item.user.id) : item.user;
                if (String(nestedUserId) === String(userId)) return true;
            }
        }
        return false;
    }) || (!!c.isLiked) || (!!c.userHasLiked);

    return {
      _id: c._id || c.id,
      text: c.text,
      user: {
        _id: c.user?._id || c.user?.id || 'unknown',
        name: c.user?.name || 'مستخدم',
        avatar: c.user?.avatar
      },
      createdAt: c.createdAt,
      likes: count,
      isLiked: isLiked,
      repliesCount: Array.isArray(c.replies) ? c.replies.length : (c.repliesCount || 0),
      replies: c.replies ? c.replies.map((r: any) => processApiComment(r, userId)) : []
    };
  }, []);

  const fetchComments = useCallback(async (postId: string, forceLoader = false) => {
      if (forceLoader) setIsLoadingComments(true);
      try {
          const token = localStorage.getItem('token');
          const userId = localStorage.getItem('userId') || '';

          const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
              const data = await response.json();
              const rawComments = Array.isArray(data) ? data : (data.comments || []);
              
              const processed = rawComments.map((c: any) => processApiComment(c, userId));
              processed.sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setComments(processed);
          }
      } catch (error) {
          console.error("Failed comments", error);
      } finally {
          setIsLoadingComments(false);
      }
  }, [processApiComment]);

  const handleOpenComments = (e: React.MouseEvent, shortId: string) => {
      e.stopPropagation();
      setActiveShortIdForComments(shortId);
      setIsCommentsOpen(true);
      setViewingRepliesFor(null);
      if (activeShortIdForComments !== shortId) {
          setComments([]); 
          fetchComments(shortId, true);
      } else {
          fetchComments(shortId, false);
      }
  };

  const handleSendComment = async () => {
      if (!commentText.trim() || !activeShortIdForComments) return;
      
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId') || 'me';
      const userAvatar = localStorage.getItem('userAvatar');
      const tempId = `temp-${Date.now()}`;
      
      const newComment: Comment = {
          _id: tempId,
          text: commentText,
          user: {
              _id: userId,
              name: localStorage.getItem('userName') || 'أنا',
              avatar: userAvatar ? (userAvatar.startsWith('http') ? userAvatar : `${API_BASE_URL}${userAvatar}`) : undefined
          },
          createdAt: new Date().toISOString(),
          likes: 0,
          isLiked: false,
          pending: true
      };

      const isReply = !!viewingRepliesFor;
      const parentId = viewingRepliesFor ? viewingRepliesFor._id : null;
      
      setCommentText('');

      if (isReply && viewingRepliesFor) {
         const updatedParent = {
             ...viewingRepliesFor,
             replies: [...(viewingRepliesFor.replies || []), newComment],
             repliesCount: (viewingRepliesFor.repliesCount || 0) + 1
         };
         setViewingRepliesFor(updatedParent);
         setComments(prev => prev.map(c => c._id === viewingRepliesFor._id ? updatedParent : c));
      } else {
         setComments(prev => [newComment, ...prev]);
         setShorts(prev => prev.map(s => s.id === activeShortIdForComments ? { ...s, comments: s.comments + 1 } : s));
      }

      try {
          const endpoint = isReply 
            ? `${API_BASE_URL}/api/v1/posts/${activeShortIdForComments}/comment/${viewingRepliesFor._id}/reply`
            : `${API_BASE_URL}/api/v1/posts/${activeShortIdForComments}/comment`;

          const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ text: newComment.text })
          });
          
          if (response.ok) {
             const responseData = await response.json();
             const commentData = responseData.comment || responseData.data || responseData;
             
             if (commentData && (commentData._id || commentData.id)) {
                  const realComment = processApiComment(commentData, userId);
                  if (isReply && parentId) {
                        const swapReplyId = (list: Comment[]): Comment[] => {
                            return list.map(c => {
                                if (c._id === parentId) {
                                    return { 
                                        ...c, 
                                        replies: c.replies?.map(r => r._id === tempId ? realComment : r) 
                                    };
                                }
                                if (c.replies) return { ...c, replies: swapReplyId(c.replies) };
                                return c;
                            });
                        };
                        setComments(prev => swapReplyId(prev));
                        
                        setViewingRepliesFor(prev => {
                           if (prev && prev._id === parentId) {
                               return {
                                   ...prev,
                                   replies: prev.replies?.map(r => r._id === tempId ? realComment : r)
                               };
                           }
                           return prev;
                        });
                  } else {
                      setComments(prev => prev.map(c => c._id === tempId ? realComment : c));
                  }
             } else {
                  setComments(prev => prev.map(c => c._id === tempId ? { ...c, pending: false } : c));
             }

          } else {
              handleCommentFailure(tempId, isReply);
          }
      } catch (e) {
          handleCommentFailure(tempId, isReply);
      }
  };

  const handleCommentFailure = (tempId: string, isReply: boolean) => {
      if (isReply && viewingRepliesFor) {
           setViewingRepliesFor(prev => prev ? ({
               ...prev,
               replies: prev.replies?.filter(r => r._id !== tempId),
               repliesCount: Math.max(0, (prev.repliesCount || 1) - 1)
           }) : null);
           setComments(prev => prev.map(c => c._id === viewingRepliesFor._id ? {
               ...c,
               replies: c.replies?.filter(r => r._id !== tempId),
               repliesCount: Math.max(0, (c.repliesCount || 1) - 1)
           } : c));
      } else {
           setComments(prev => prev.filter(c => c._id !== tempId));
           setShorts(prev => prev.map(s => s.id === activeShortIdForComments ? { ...s, comments: Math.max(0, s.comments - 1) } : s));
      }
  };

  const handleCommentLike = async (commentId: string, parentId?: string) => {
    let targetParentId = parentId;
    if (!targetParentId) {
        const parent = comments.find(c => c.replies?.some(r => r._id === commentId));
        if (parent) targetParentId = parent._id;
    }

    const toggleLikeInComment = (c: Comment) => {
        const newIsLiked = !c.isLiked;
        return {
            ...c,
            isLiked: newIsLiked,
            likes: Math.max(0, c.likes + (newIsLiked ? 1 : -1))
        };
    };

    setComments(prevComments => prevComments.map(c => {
        if (c._id === commentId && !targetParentId) {
            return toggleLikeInComment(c);
        }
        if (targetParentId && c._id === targetParentId) {
             const updatedReplies = c.replies?.map(r => r._id === commentId ? toggleLikeInComment(r) : r);
             return { ...c, replies: updatedReplies };
        }
        return c;
    }));

    if (viewingRepliesFor) {
        if (viewingRepliesFor._id === commentId && !targetParentId) {
            setViewingRepliesFor(prev => prev ? toggleLikeInComment(prev) : null);
        } else if (targetParentId && viewingRepliesFor._id === targetParentId) {
            setViewingRepliesFor(prev => prev ? {
                ...prev,
                replies: prev.replies?.map(r => r._id === commentId ? toggleLikeInComment(r) : r)
            } : null);
        }
    }

    try {
        const token = localStorage.getItem('token');
        const endpoint = targetParentId 
            ? `${API_BASE_URL}/api/v1/posts/${activeShortIdForComments}/comment/${targetParentId}/reply/${commentId}/like`
            : `${API_BASE_URL}/api/v1/posts/${activeShortIdForComments}/comment/${commentId}/like`;

        await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            keepalive: true
        });
    } catch (error) {
        console.error("Failed to like comment", error);
    }
  };

  const handleScroll = () => {
    if (!isScrubbingRef.current) {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
           clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
           setIsScrolling(false);
        }, 150); 
    }
  };

  const handleFeedTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleFeedTouchMove = (e: React.TouchEvent) => {
    if (isScrubbingRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = Math.abs(currentY - touchStartYRef.current);
    if (diff > 5) {
      setIsDraggingFeed(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      setIsScrolling(true);
    }
  };

  const handleFeedTouchEnd = () => {
    setIsDraggingFeed(false);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
       setIsScrolling(false);
    }, 150);
  };

  useEffect(() => {
    if (!isActive) { 
        videoRefs.current.forEach(video => {
            if (video) video.pause();
        });
        return;
    }

    const timeout = setTimeout(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const video = entry.target as HTMLVideoElement;
                    const indexStr = video.getAttribute('data-index');
                    const index = indexStr ? parseInt(indexStr) : null;

                    if (entry.isIntersecting) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {});
                        }
                        setShowPlayIcon(null);
                        if (index !== null) {
                           setCurrentVideoIndex(index);
                           setDurationDisplay(formatTime(video.duration || 0));
                        }
                    } else {
                        video.pause();
                        video.currentTime = 0;
                        if (index === bufferingIndex) setBufferingIndex(null);
                    }
                });
            },
            { threshold: 0.6 } 
        );
    
        const currentVideoRefs = videoRefs.current;
        currentVideoRefs.forEach(video => {
            if (video) observer.observe(video);
        });
    
        return () => {
            currentVideoRefs.forEach(video => {
                if (video) observer.unobserve(video);
            });
        };
    }, 100); 

    return () => clearTimeout(timeout);
  }, [shorts, isActive, activeTab]); 

  useEffect(() => {
     if (!isScrubbingRef.current && progressBarRef.current) {
       progressBarRef.current.style.width = '0%';
       setCurrentTimeDisplay("00:00");
     }

     if (currentVideoIndex === null) return;
     const video = videoRefs.current.get(currentVideoIndex);
     if (!video) return;

     const handleTimeUpdate = () => {
        if (!isScrubbingRef.current && video.duration) {
            const pct = (video.currentTime / video.duration) * 100;
            if (progressBarRef.current) {
                progressBarRef.current.style.width = `${pct}%`;
            }
        }
     };

     const handleLoadedMetadata = () => {
        setDurationDisplay(formatTime(video.duration));
     };

     video.addEventListener('timeupdate', handleTimeUpdate);
     video.addEventListener('loadedmetadata', handleLoadedMetadata);
     return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
     };
  }, [currentVideoIndex]);

  const handleVideoPress = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (isScrubbingRef.current) return;
    const video = videoRefs.current.get(index);
    if (video) {
        if (video.paused) {
            video.play().catch(()=>{});
            setShowPlayIcon(null);
        } else {
            video.pause();
            setShowPlayIcon(index);
            setBufferingIndex(null); 
        }
    }
  };

  const updateScrubber = (clientX: number) => {
     if (!scrubberContainerRef.current || currentVideoIndex === null) return;
     const rect = scrubberContainerRef.current.getBoundingClientRect();
     const x = clientX - rect.left;
     let percentage = (x / rect.width) * 100;
     percentage = Math.max(0, Math.min(100, percentage));
     
     if (progressBarRef.current) {
        progressBarRef.current.style.width = `${percentage}%`;
     }
     const video = videoRefs.current.get(currentVideoIndex);
     if (video && video.duration) {
        const seekTime = (percentage / 100) * video.duration;
        video.currentTime = seekTime;
        setCurrentTimeDisplay(formatTime(seekTime));
     }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault(); e.stopPropagation();
      if (currentVideoIndex === null) return;
      const video = videoRefs.current.get(currentVideoIndex);
      if (video) {
         wasPlayingRef.current = !video.paused;
         video.pause();
      }
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateScrubber(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (isScrubbingRef.current) {
          e.preventDefault(); e.stopPropagation();
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => {
              updateScrubber(e.clientX);
          });
      }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault(); e.stopPropagation();
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (currentVideoIndex !== null && wasPlayingRef.current) {
          const video = videoRefs.current.get(currentVideoIndex);
          if (video) video.play().catch(()=>{});
      }
      wasPlayingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handleShareClick = (e: React.MouseEvent, shortId: string) => {
    e.stopPropagation();
    setActiveShortIdForShare(shortId);
    setIsShareOpen(true);
  };
  
  const handleRepostToggle = () => {
    if (!activeShortIdForShare) return;

    if (repostedShorts.has(activeShortIdForShare)) {
        const next = new Set(repostedShorts);
        next.delete(activeShortIdForShare);
        setRepostedShorts(next);
        setIsShareOpen(false);
    } else {
        const next = new Set(repostedShorts);
        next.add(activeShortIdForShare);
        setRepostedShorts(next);
        setIsShareOpen(false);
        setIsRepostSuccessOpen(true);
    }
  };

  const handleReportClick = (e: React.MouseEvent, short: ShortVideo) => {
    e.stopPropagation();
    onReport('video', short.id, short.user.name);
  };

  const handleTouchStart = (comment: Comment) => {
    longPressTimerRef.current = setTimeout(() => {
        setActiveCommentAction(comment);
    }, 600); 
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
  };

  const handleDeleteComment = () => {
    if (activeCommentAction) {
        setCommentToDelete(activeCommentAction);
        setActiveCommentAction(null);
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete || !activeShortIdForComments) return;

    const commentId = commentToDelete._id;
    let isReply = false;
    let parentId = undefined;

    if (viewingRepliesFor && viewingRepliesFor._id !== commentId) {
        isReply = true;
        parentId = viewingRepliesFor._id;
    } else {
        const parent = comments.find(c => c.replies?.some(r => r._id === commentId));
        if (parent) {
            isReply = true;
            parentId = parent._id;
        }
    }

    if (isReply && parentId) {
        setViewingRepliesFor(prev => prev ? ({
            ...prev,
            replies: prev.replies?.filter(r => r._id !== commentId),
            repliesCount: Math.max(0, (prev.repliesCount || 1) - 1)
        }) : null);
        
        setComments(prev => prev.map(c => c._id === parentId ? {
            ...c,
            replies: c.replies?.filter(r => r._id !== commentId),
            repliesCount: Math.max(0, (c.repliesCount || 1) - 1)
        } : c));
    } else {
        setComments(prev => prev.filter(c => c._id !== commentId));
        setShorts(prev => prev.map(s => s.id === activeShortIdForComments ? { ...s, comments: Math.max(0, s.comments - 1) } : s));
        if (viewingRepliesFor && viewingRepliesFor._id === commentId) {
            setViewingRepliesFor(null);
        }
    }

    setCommentToDelete(null);

    try {
        const token = localStorage.getItem('token');
        const endpoint = (isReply && parentId)
          ? `${API_BASE_URL}/api/v1/posts/${activeShortIdForComments}/comment/${parentId}/reply/${commentId}`
          : `${API_BASE_URL}/api/v1/posts/${activeShortIdForComments}/comment/${commentId}`;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Failed to delete");
        }
    } catch (error) {
        console.error("Failed to delete comment", error);
        fetchComments(activeShortIdForComments);
    }
  };

  const renderEmptyState = (type: 'haraj' | 'jobs') => {
    const isHaraj = type === 'haraj';
    const bgClass = isHaraj 
        ? 'bg-gradient-to-br from-orange-900 to-black' 
        : 'bg-gradient-to-br from-purple-900 to-black';
    const Icon = isHaraj ? Store : Briefcase;
    const title = isHaraj ? t('shorts_haraj') : t('shorts_jobs');
    const sub = t('shorts_empty');

    return (
        <div className={`h-full w-full flex flex-col items-center justify-center text-white ${bgClass} animate-in fade-in duration-500`}>
            <div className="bg-white/10 p-6 rounded-full mb-6 backdrop-blur-md shadow-2xl border border-white/10">
                <Icon size={64} className="text-white opacity-90 drop-shadow-lg" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold mb-2 shadow-black drop-shadow-md">{title}</h2>
            <p className="text-white/70 text-sm font-medium">{sub}</p>
            
            <div className="mt-8">
                <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/20">
                    <Camera size={20} />
                    <span className="font-bold">{t('create_post')}</span>
                </button>
            </div>
        </div>
    );
  };

  const renderCommentItem = (comment: Comment, isParentView: boolean = false) => {
    let parentIdForLike: string | undefined = undefined;
    if (viewingRepliesFor && !isParentView) {
        parentIdForLike = viewingRepliesFor._id;
    }

    return (
      <div 
        key={comment._id} 
        className={`flex gap-3 mb-5 transition-opacity duration-300 ${comment.pending ? 'opacity-50' : 'opacity-100'} ${isParentView ? 'border-b border-gray-100 pb-4 mb-4' : ''}`}
        onTouchStart={() => handleTouchStart(comment)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseDown={() => handleTouchStart(comment)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
         <div className="flex-shrink-0 mt-0.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); onProfileClick?.(comment.user._id); }}>
            <Avatar
              name={comment.user.name}
              src={comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${API_BASE_URL}${comment.user.avatar}`) : null}
              className="w-9 h-9"
              textClassName="text-sm"
            />
         </div>
         <div className="flex-1 min-w-0">
            <h4 
                className="text-xs font-bold text-gray-900 mb-1 cursor-pointer text-start" 
                onClick={(e) => { e.stopPropagation(); onProfileClick?.(comment.user._id); }}
            >
                {comment.user.name}
            </h4>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text text-start">
                {comment.text}
            </p>
            <div className="flex items-center gap-4 mt-1.5">
                <span className="text-[10px] text-gray-400">
                  {comment.pending ? t('sending') : new Date(comment.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button 
                  onClick={(e) => {
                      e.stopPropagation(); 
                      const mention = `@${comment.user.name} `;
                      if (viewingRepliesFor) {
                         setCommentText(mention);
                         inputRef.current?.focus();
                      } else {
                         setViewingRepliesFor(comment);
                         setCommentText(mention);
                         setTimeout(() => inputRef.current?.focus(), 50);
                      }
                  }}
                  className="text-[11px] font-bold text-gray-500 hover:text-gray-800"
                >
                  {t('reply')}
                </button>
            </div>

            {!isParentView && comment.repliesCount && comment.repliesCount > 0 ? (
              <button 
                 onClick={(e) => {
                     e.stopPropagation();
                     setViewingRepliesFor(comment);
                 }}
                 className="mt-2 text-gray-500 font-bold text-xs flex items-center gap-1 hover:bg-gray-50 w-fit px-2 py-1 rounded-full -mr-2 transition-colors"
              >
                 <div className="w-6 h-0.5 bg-gray-300"></div>
                 <span>{t('view_replies')} ({comment.repliesCount})</span>
                 <ChevronDown size={12} className="text-gray-500" />
              </button>
            ) : null}
         </div>
         <div className="flex flex-col items-center gap-0.5 pt-1 w-8">
            <button 
              onClick={(e) => {
                  e.stopPropagation();
                  handleCommentLike(comment._id, parentIdForLike);
              }}
              className="p-1 active:scale-90 transition-transform"
            >
              <Heart 
                size={16} 
                className={`transition-colors ${comment.isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} 
              />
            </button>
            {comment.likes > 0 && (
              <span className="text-[10px] text-gray-500 font-medium">{comment.likes}</span>
            )}
         </div>
      </div>
    );
  };

  const isCommentOwner = activeCommentAction && (
      activeCommentAction.user._id === currentUserId || 
      activeCommentAction.user._id === 'me'
  );

  return (
    <>
    {/* TOP TABS NAVIGATION */}
    <div className="absolute top-safe left-0 right-0 z-50 flex justify-center items-center gap-8 pt-4 pb-2 text-white/80 font-bold text-base shadow-black drop-shadow-md pointer-events-auto">
        <button 
            onClick={() => setActiveTab('haraj')}
            className={`transition-all duration-200 ${activeTab === 'haraj' ? 'text-white scale-110 border-b-2 border-white pb-1' : 'opacity-70 hover:opacity-100 hover:text-white'}`}
        >
            {t('shorts_haraj')}
        </button>
        <button 
            onClick={() => setActiveTab('jobs')}
            className={`transition-all duration-200 ${activeTab === 'jobs' ? 'text-white scale-110 border-b-2 border-white pb-1' : 'opacity-70 hover:opacity-100 hover:text-white'}`}
        >
            {t('shorts_jobs')}
        </button>
        <button 
            onClick={() => setActiveTab('forYou')}
            className={`transition-all duration-200 ${activeTab === 'forYou' ? 'text-white scale-110 border-b-2 border-white pb-1' : 'opacity-70 hover:opacity-100 hover:text-white'}`}
        >
            {t('shorts_for_you')}
        </button>
    </div>

    {/* CONTENT AREA */}
    <div className="h-full w-full bg-black relative">
        
        {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-white z-40">
                <Loader2 className="w-10 h-10 animate-spin text-white mb-4" />
            </div>
        ) : shorts.length > 0 ? (
            <div 
              ref={containerRef} 
              onScroll={handleScroll}
              onTouchStart={handleFeedTouchStart}
              onTouchMove={handleFeedTouchMove}
              onTouchEnd={handleFeedTouchEnd}
              className="h-full w-full flex flex-col overflow-y-scroll snap-y snap-mandatory no-scrollbar relative"
            >
              {shorts.map((short, index) => {
                const isExpanded = expandedShortId === short.id;
                const isOwner = short.user.id === currentUserId || short.user.id === 'me';

                return (
                  <div 
                    key={`${short.id}-${index}`} 
                    className="h-full w-full snap-start flex-shrink-0 relative flex items-center justify-center bg-black"
                    style={{ scrollSnapStop: 'always' }}
                    onClick={(e) => handleVideoPress(e, index)}
                  >
                    {/* Video Container */}
                    <div className="absolute inset-0 bg-black">
                        <video
                            ref={(el) => { videoRefs.current.set(index, el); }}
                            data-index={index}
                            src={short.videoUrl!}
                            loop
                            playsInline
                            className="w-full h-full object-contain"
                            onWaiting={() => setBufferingIndex(index)}
                            onPlaying={() => setBufferingIndex(null)}
                            onPause={() => setBufferingIndex(null)}
                        />
                    </div>
                    
                    {bufferingIndex === index && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            <Loader2 className="w-12 h-12 text-white animate-spin drop-shadow-md" strokeWidth={3} />
                        </div>
                    )}
                    
                    {showPlayIcon === index && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="bg-black/40 p-4 rounded-full">
                                <Play size={60} className="text-white/80 fill-white/80" />
                            </div>
                        </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none"></div>

                    {/* Interaction Buttons - Conditional Layout */}
                    <div 
                        className={`absolute bottom-24 flex flex-col items-center gap-6 z-20 ${isAr ? 'left-4' : 'right-4'}`} 
                        onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative mb-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); onProfileClick?.(short.user.id); }}>
                          <div className="w-12 h-12 rounded-full border border-white overflow-hidden shadow-lg">
                            <Avatar name={short.user.name} src={short.user.avatar} className="w-full h-full" />
                          </div>
                          {!short.isFollowed && short.user.id !== currentUserId && (
                            <button 
                                onClick={(e) => handleFollow(e, short.user.id)}
                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 rounded-full p-0.5 border border-white hover:scale-110 transition-transform active:scale-90"
                            >
                                <UserPlus size={10} className="text-white" />
                            </button>
                          )}
                      </div>

                      {/* LIKE BUTTON */}
                      <button 
                        onClick={(e) => handleLike(e, short.id)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <Heart 
                            size={30} 
                            className={`drop-shadow-lg active:scale-90 transition-all duration-300 ${
                                short.isLiked 
                                ? 'text-white fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110' 
                                : 'text-white fill-white/10'
                            }`} 
                        />
                        <span className="text-white text-xs font-bold shadow-black drop-shadow-md">{short.likes}</span>
                      </button>

                      <button 
                        onClick={(e) => handleOpenComments(e, short.id)}
                        className="flex flex-col items-center gap-1 group">
                        <MessageCircle size={30} className="text-white drop-shadow-lg active:scale-90 transition-transform fill-white/10" />
                        <span className="text-white text-xs font-bold shadow-black drop-shadow-md">{short.comments}</span>
                      </button>
                      
                      <button 
                        onClick={(e) => handleShareClick(e, short.id)}
                        className="flex flex-col items-center gap-1 group">
                        <Share2 size={30} className="text-white drop-shadow-lg active:scale-90 transition-transform fill-white/10" />
                        <span className="text-white text-xs font-bold shadow-black drop-shadow-md">{t('share')}</span>
                      </button>

                      {!isOwner && (
                        <button 
                            onClick={(e) => handleReportClick(e, short)}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <Flag size={28} className="text-white drop-shadow-lg active:scale-90 transition-transform fill-white/10" />
                        </button>
                      )}
                      
                        <div className="mt-4">
                          <div className="w-10 h-10 bg-gray-900 rounded-full border-[3px] border-gray-800 flex items-center justify-center animate-[spin_5s_linear_infinite] shadow-lg shadow-black/50">
                              <div className="w-6 h-6 rounded-full overflow-hidden">
                                <Avatar name={short.user.name} src={short.user.avatar} className="w-full h-full" />
                              </div>
                          </div>
                        </div>

                    </div>

                    {/* Info Area - Conditional Layout */}
                    <div 
                      className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-300 ${
                        isExpanded 
                          ? 'h-[50vh] bg-black/90 rounded-t-2xl' 
                          : 'h-auto pb-28'
                      }`}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <div className={`pt-4 flex flex-col ${isExpanded ? 'h-full overflow-y-auto pb-4' : ''} ${isAr ? 'items-start text-right pr-4 pl-20' : 'items-start text-left pl-4 pr-20'}`}>
                          
                          <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); onProfileClick?.(short.user.id); }}>
                            <h3 className="text-white font-bold text-base shadow-black drop-shadow-md">{short.user.username}</h3>
                            {short.category && (
                                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
                                    {short.category}
                                </span>
                            )}
                          </div>

                          <p 
                            className={`text-white text-sm leading-relaxed dir-auto ${isAr ? 'text-right' : 'text-left'} ${isExpanded ? '' : 'line-clamp-2'}`}
                            onClick={() => setExpandedShortId(isExpanded ? null : short.id)}
                          >
                            {short.description}
                          </p>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedShortId(isExpanded ? null : short.id);
                            }}
                            className="text-gray-300 text-xs font-semibold mt-1 hover:text-white"
                          >
                            {isExpanded ? t('close') : t('post_next')}
                          </button>
                          
                          {!isExpanded && (
                            <div className="flex items-center gap-2 mt-3 w-3/4 overflow-hidden">
                                <Music size={14} className="text-white" />
                                <p className="text-white text-xs whitespace-nowrap animate-pulse">{short.music}</p>
                            </div>
                          )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
        ) : (
            activeTab !== 'forYou' 
                ? renderEmptyState(activeTab as 'haraj' | 'jobs')
                : <div className="h-full w-full flex items-center justify-center text-white">{t('shorts_empty')}</div>
        )}
    </div>

    {/* Scrubber */}
    {activeTab === 'forYou' && (
        <div 
            ref={scrubberContainerRef}
            className={`fixed bottom-[49px] mb-safe left-0 right-0 z-[60] h-6 flex items-end px-2 transition-opacity duration-200 touch-none dir-ltr ${
                (isScrolling || isDraggingFeed) && !isScrubbing ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
            style={{ direction: 'ltr' }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="relative w-full h-full flex items-end pb-2 group cursor-pointer">
                <div className="absolute inset-x-0 h-10 bottom-0 z-10"></div>
                <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full transition-all backdrop-blur-sm"></div>
                <div 
                    ref={progressBarRef}
                    className="absolute left-0 h-1 bg-white rounded-full transition-none shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{ width: '0%' }}
                >
                <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 ${isScrubbing ? 'scale-125' : ''} transition-transform z-20`}>
                    {isScrubbing && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold py-1 px-2 rounded-md whitespace-nowrap backdrop-blur-md border border-white/20">
                            {currentTimeDisplay}
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    )}
    
    {/* Share Modal */}
    {isShareOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsShareOpen(false)}
          />
          <div className="bg-white w-full max-w-md rounded-t-2xl relative z-10 animate-in slide-in-from-bottom duration-300 pb-safe">
            <div className="flex justify-center pt-3 pb-1" onClick={() => setIsShareOpen(false)}>
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-800 font-bold text-center flex-1">{t('share')}</h3>
                <button onClick={() => setIsShareOpen(false)} className="bg-gray-100 p-1 rounded-full">
                  <X size={20} className="text-gray-600" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                 <button className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      <Download size={24} className="text-gray-700" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{t('download')}</span>
                 </button>
                 <button className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Link size={24} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{t('copy_link')}</span>
                 </button>
                 <button 
                    onClick={handleRepostToggle}
                    className="flex flex-col items-center gap-2 group"
                 >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                        activeShortIdForShare && repostedShorts.has(activeShortIdForShare) 
                        ? 'bg-red-50 group-hover:bg-red-100' 
                        : 'bg-green-50 group-hover:bg-green-100'
                    }`}>
                      {activeShortIdForShare && repostedShorts.has(activeShortIdForShare) ? (
                        <Trash2 size={24} className="text-red-600" />
                      ) : (
                        <Repeat size={24} className="text-green-600" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                        activeShortIdForShare && repostedShorts.has(activeShortIdForShare) ? 'text-red-600' : 'text-gray-600'
                    }`}>
                        {activeShortIdForShare && repostedShorts.has(activeShortIdForShare) ? t('undo_repost') : t('repost')}
                    </span>
                 </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
    )}

    {/* Repost Success / List Modal */}
    {isRepostSuccessOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setIsRepostSuccessOpen(false)} />
            <div className="bg-white w-full max-w-md rounded-t-2xl relative z-10 animate-in slide-in-from-bottom duration-300 pb-safe">
                <div className="flex justify-center pt-3 pb-1" onClick={() => setIsRepostSuccessOpen(false)}>
                   <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>

                <div className="p-5 text-center">
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-green-100 p-3 rounded-full mb-3">
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">{t('repost')} Success!</h3>
                        <p className="text-sm text-gray-500 mt-1">You have reposted this video.</p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )}

    {/* COMMENTS MODAL */}
    {isCommentsOpen && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setIsCommentsOpen(false)} />
            <div className="bg-white w-full max-w-md h-[65vh] rounded-t-2xl sm:rounded-2xl relative z-10 animate-slide-up-fast shadow-2xl flex flex-col overflow-hidden">
               
               <div className="flex-1 relative overflow-hidden">
                  <div className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${viewingRepliesFor ? (language === 'ar' ? '-translate-x-full' : 'translate-x-full') : 'translate-x-0'}`}>
                      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20">
                          <div className="w-8"></div>
                          <h3 className="font-bold text-gray-800">{t('comment')}</h3>
                          <button onClick={() => setIsCommentsOpen(false)} className="bg-gray-100 p-1 rounded-full hover:bg-gray-200">
                              <X size={20} className="text-gray-600" />
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                        {isLoadingComments && comments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-40 gap-2">
                             <Loader2 size={30} className="text-blue-600 animate-spin" />
                          </div>
                        ) : comments.length > 0 ? (
                          comments.map((comment) => renderCommentItem(comment))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full min-h-[250px] animate-in fade-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                               <MessageCircle size={48} className="text-gray-300" strokeWidth={1} />
                            </div>
                            <h3 className="text-gray-800 font-bold text-sm mb-1">{t('no_comments')}</h3>
                          </div>
                        )}
                      </div>
                  </div>

                  <div className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${viewingRepliesFor ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')} z-30`}>
                     {viewingRepliesFor && (
                        <>
                           <div className="bg-white p-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                              <button onClick={() => setViewingRepliesFor(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowRight size={20} className={`text-gray-700 ${language === 'en' ? 'rotate-180' : ''}`} />
                              </button>
                              <h3 className="font-bold text-gray-800 text-sm">{t('view_replies')}</h3>
                              <div className="w-9"></div>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                              {renderCommentItem(viewingRepliesFor, true)}
                              <div className="pr-4 mr-2 border-r border-gray-100">
                                 {viewingRepliesFor.replies && viewingRepliesFor.replies.length > 0 ? (
                                    viewingRepliesFor.replies.map(reply => renderCommentItem(reply, true))
                                 ) : (
                                    <div className="py-4 text-center text-gray-400 text-xs">
                                       <p>{t('no_replies') || "No replies"}</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </>
                     )}
                  </div>
               </div>

               <div className="p-3 border-t border-gray-100 bg-white pb-safe z-40 relative">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 flex-shrink-0">
                        <Avatar 
                            name={localStorage.getItem('userName') || 'أنا'} 
                            src={localStorage.getItem('userAvatar') ? (localStorage.getItem('userAvatar')!.startsWith('http') ? localStorage.getItem('userAvatar') : `${API_BASE_URL}${localStorage.getItem('userAvatar')}`) : null} 
                            className="w-8 h-8" 
                        />
                     </div>
                     <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2 h-10">
                        <input 
                           ref={inputRef}
                           type="text" 
                           value={commentText}
                           onChange={(e) => setCommentText(e.target.value)}
                           onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                           placeholder={t('post_placeholder')}
                           className="bg-transparent border-none outline-none w-full text-sm dir-auto text-start placeholder:text-gray-500 h-full"
                           autoFocus={!!viewingRepliesFor}
                        />
                     </div>
                     <button 
                        onClick={handleSendComment} 
                        disabled={!commentText.trim()} 
                        className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors ${!commentText.trim() ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50 bg-transparent'}`}
                     >
                        <Send size={20} style={{ transform: language === 'en' ? 'scaleX(-1)' : 'none' }} />
                     </button>
                  </div>
               </div>
            </div>
         </div>, document.body
      )}

      {/* Action Sheet Menu for Comments */}
      {activeCommentAction && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
             <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setActiveCommentAction(null)} />
             <div className="bg-white w-full max-w-md rounded-t-2xl pb-safe relative z-10 p-4 animate-slide-up-fast">
                 <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                 <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(activeCommentAction.text);
                            setActiveCommentAction(null);
                        }}
                        className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl w-full"
                    >
                        <Copy size={20} className="text-blue-600" />
                        <span className="font-bold text-gray-700">{t('copy_text')}</span>
                    </button>

                    {isCommentOwner ? (
                        <button onClick={handleDeleteComment} className="flex items-center gap-4 p-3 hover:bg-red-50 rounded-xl w-full"><Trash2 size={20} className="text-red-600" /><span className="font-bold text-red-600">{t('delete')}</span></button>
                    ) : (
                        <button onClick={() => setActiveCommentAction(null)} className="flex items-center gap-4 p-3 hover:bg-red-50 rounded-xl w-full"><Flag size={20} className="text-red-600" /><span className="font-bold text-red-600">{t('report')}</span></button>
                    )}
                 </div>
             </div>
          </div>, document.body
      )}

      {/* Delete Comment Confirmation Modal */}
      {commentToDelete && createPortal(
           <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setCommentToDelete(null)} />
             <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="flex flex-col items-center text-center gap-4 pt-2">
                   <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <Trash2 size={36} className="text-red-500" strokeWidth={2.5} />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-gray-900 mb-2">{t('delete')}?</h3>
                     <p className="text-gray-500 text-base leading-relaxed font-medium px-4">
                        {t('post_delete_confirm')}
                     </p>
                   </div>
                   <div className="flex gap-3 w-full mt-4">
                      <button 
                        onClick={confirmDeleteComment} 
                        className="flex-1 bg-red-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200"
                      >
                        {t('yes')}
                      </button>
                      <button 
                        onClick={() => setCommentToDelete(null)} 
                        className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold text-base hover:bg-gray-200 active:scale-95 transition-all"
                      >
                        {t('no')}
                      </button>
                   </div>
                </div>
             </div>
           </div>, document.body
      )}
    </>
  );
};

export default ShortsView;
