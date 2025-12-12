import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Post } from '../types';
import { API_BASE_URL } from '../constants';
import { 
  MessageCircle, Share2, MoreHorizontal, ThumbsUp, 
  X, EyeOff, Link, Flag, Send, Trash2, Copy, Repeat, 
  Bookmark, Phone, Mail, Loader2, ArrowRight, CornerDownLeft, Heart, ChevronDown, AlertTriangle, Globe, Star, Tag,
  ArrowLeft, Reply, Languages, Settings, Lock
} from 'lucide-react';
import Avatar from './Avatar';
import { useLanguage } from '../contexts/LanguageContext';

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

interface PostCardProps {
  post: Post;
  variant?: 'feed' | 'profile';
  onDelete?: () => void;
  onReport?: (type: 'post' | 'comment' | 'reply', id: string, name: string) => void;
  onProfileClick?: (userId: string) => void;
}

const LANGUAGES = [
    { code: 'ar', key: 'lang_ar' },
    { code: 'en', key: 'lang_en' },
    { code: 'bn', key: 'lang_bn' },
    { code: 'ur', key: 'lang_ur' },
    { code: 'ne', key: 'lang_ne' },
    { code: 'hi', key: 'lang_hi' },
    { code: 'sw', key: 'lang_sw' },
    { code: 'am', key: 'lang_am' },
    { code: 'so', key: 'lang_so' },
    { code: 'tr', key: 'lang_tr' },
    { code: 'ti', key: 'lang_ti' },
];

const PostCard: React.FC<PostCardProps> = ({ post, variant = 'feed', onDelete, onReport, onProfileClick }) => {
  const { t, language } = useLanguage();
  const [optimisticLiked, setOptimisticLiked] = useState(post.isLiked || false);
  const currentUserId = localStorage.getItem('userId');
  const isOwner = (post.user._id && post.user._id === currentUserId) || post.user.id === 'me';
  const isDirtyRef = useRef(false); 
  const currentLikedRef = useRef(optimisticLiked);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const serverSaysLiked = post.isLiked || false;
  let displayCount = post.likes;

  if (optimisticLiked && !serverSaysLiked) {
     displayCount = post.likes + 1;
  } else if (!optimisticLiked && serverSaysLiked) {
     displayCount = Math.max(0, post.likes - 1);
  }

  const [isFollowed, setIsFollowed] = useState(() => {
    if (!post.user._id) return false;
    const cachedStatus = localStorage.getItem(`follow_status_${post.user._id}`);
    return cachedStatus ? JSON.parse(cachedStatus) : false;
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [repostText, setRepostText] = useState('');
  const [isReposting, setIsReposting] = useState(false);

  // Post Deletion Modal State
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments);
  
  // SLIDING REPLIES STATE (Replaces expandedReplies)
  const [viewingRepliesFor, setViewingRepliesFor] = useState<Comment | null>(null);
  const [replyingToUser, setReplyingToUser] = useState<{id: string, name: string} | null>(null);
  
  // Comment Actions State
  const [activeCommentAction, setActiveCommentAction] = useState<Comment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null); // For confirmation modal
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Translation State ---
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTransSettings, setShowTransSettings] = useState(false);
  
  // Translation settings state - default to auto-detect source
  const [transSource, setTransSource] = useState<'ar' | 'en'>(() => {
      // Basic heuristic: check first few chars
      const text = post.content || '';
      const hasArabic = /[\u0600-\u06FF]/.test(text);
      return hasArabic ? 'ar' : 'en';
  });
  
  // Initialize target language from localStorage or default to app language
  const [transTarget, setTransTarget] = useState<string>(() => {
      const savedLang = localStorage.getItem('post_trans_target');
      if (savedLang) return savedLang;
      return language === 'ar' ? 'ar' : 'en';
  });

  // Simple heuristic for default detection (if different from app language, show translate)
  const shouldShowTranslate = React.useMemo(() => {
      if (!post.content) return false;
      const hasArabic = /[\u0600-\u06FF]/.test(post.content);
      const isPostAr = hasArabic;
      return (language === 'ar' && !isPostAr) || (language === 'en' && isPostAr);
  }, [post.content, language]);

  const handleTranslate = async () => {
      if (isTranslated) {
          setIsTranslated(false); // Toggle back to original
          return;
      }

      if (translatedContent) {
          setIsTranslated(true); // Already fetched
          return;
      }

      setIsTranslating(true);
      try {
          // CRITICAL FIX: Read the latest global preference from localStorage immediately before fetching
          // This ensures if user changed language in another post, we use THAT language, not the stale state of this component.
          const freshTransTarget = localStorage.getItem('post_trans_target') || transTarget;
          
          // Also update local state so the dropdown reflects it if opened later
          if (freshTransTarget !== transTarget) {
              setTransTarget(freshTransTarget);
          }

          const pair = `${transSource}|${freshTransTarget}`;
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(post.content)}&langpair=${pair}`;
          
          const res = await fetch(url);
          const data = await res.json();
          
          if (data && data.responseData && data.responseData.translatedText) {
              setTranslatedContent(data.responseData.translatedText);
              setIsTranslated(true);
          }
      } catch (error) {
          console.error("Translation failed", error);
          alert("Translation service unavailable");
      } finally {
          setIsTranslating(false);
      }
  };

  const handleSaveTransSettings = () => {
      setShowTransSettings(false);
      // Reset translation if settings changed to force re-fetch on next click
      setTranslatedContent(null); 
      setIsTranslated(false);
  };

  const toggleSettings = () => {
      // Sync state with global storage when opening menu
      if (!showTransSettings) {
          const savedLang = localStorage.getItem('post_trans_target');
          if (savedLang) setTransTarget(savedLang);
      }
      setShowTransSettings(!showTransSettings);
  };

  useEffect(() => {
    if (!isDirtyRef.current) {
       setOptimisticLiked(post.isLiked || false);
    }
  }, [post.isLiked, post.id]);

  useEffect(() => {
    setIsImageLoaded(false);
  }, [post.id]);

  // Sync Follow Status
  useEffect(() => {
    const checkFollowStatus = async () => {
      const token = localStorage.getItem('token');
      const currentUserId = localStorage.getItem('userId');
      
      if (variant !== 'feed' || !token || !post.user._id || post.user._id === currentUserId) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/follow/${post.user._id}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsFollowed(data.isFollowing);
          localStorage.setItem(`follow_status_${post.user._id}`, JSON.stringify(data.isFollowing));
        }
      } catch (error) {
        console.error("Failed to sync follow status", error);
      }
    };

    checkFollowStatus();
  }, [post.user._id, variant]);

  const handleFollowToggle = async () => {
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId');
    
    if (!token) {
        alert(t('login_required') || "Please login");
        return;
    }

    if (post.user._id === currentUserId) return;

    const previousState = isFollowed;
    const newState = !previousState;
    
    setIsFollowed(newState);
    localStorage.setItem(`follow_status_${post.user._id}`, JSON.stringify(newState));

    try {
        const method = previousState ? 'DELETE' : 'POST';
        const response = await fetch(`${API_BASE_URL}/api/v1/follow/${post.user._id}`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            setIsFollowed(previousState);
        }
    } catch (error) {
        setIsFollowed(previousState);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onProfileClick && post.user._id) {
        onProfileClick(post.user._id);
    }
  };

  const processApiComment = useCallback((c: any, currentUserId: string): Comment => {
    if (!c || typeof c !== 'object') return {
        _id: Math.random().toString(),
        text: 'Error loading comment',
        user: { _id: 'unknown', name: 'Unknown' },
        createdAt: new Date().toISOString(),
        likes: 0
    };

    const likesSource = Array.isArray(c.likes) ? c.likes : (Array.isArray(c.reactions) ? c.reactions : []);
    
    let count = likesSource.length;
    if (count === 0 && typeof c.likes === 'number') {
        count = c.likes;
    }

    const isLiked = likesSource.some((item: any) => {
        if (!item) return false;
        if (typeof item === 'string') return item === currentUserId;
        if (typeof item === 'object') {
            const itemId = item._id || item.id;
            if (itemId && String(itemId) === String(currentUserId)) return true;
            if (item.user) {
                const nestedUserId = (typeof item.user === 'object') ? (item.user._id || item.user.id) : item.user;
                if (String(nestedUserId) === String(currentUserId)) return true;
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
      replies: c.replies ? c.replies.map((r: any) => processApiComment(r, currentUserId)) : []
    };
  }, []);

  const fetchComments = useCallback(async (forceLoader = false) => {
    if (forceLoader) setIsLoadingComments(true);
    
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId') || '';
      
      const response = await fetch(`${API_BASE_URL}/api/v1/posts/${post.id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const rawComments = Array.isArray(data) ? data : (data.comments || []);
        
        if (Array.isArray(rawComments)) {
            const processedComments = rawComments.map((c: any) => processApiComment(c, userId));
            processedComments.sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setComments(processedComments);
            setLocalCommentsCount(processedComments.length);
        }
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id, processApiComment]);

  useEffect(() => {
    if (isCommentsOpen) {
       const needsLoader = comments.length === 0;
       fetchComments(needsLoader);
    } else {
      setViewingRepliesFor(null);
      setReplyingToUser(null);
      setCommentText('');
      setActiveCommentAction(null);
      setCommentToDelete(null);
    }
  }, [isCommentsOpen, fetchComments]); 

  const handleOpenComments = () => {
    if (comments.length === 0) setIsLoadingComments(true);
    setIsCommentsOpen(true);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || 'me';
    
    const userName = localStorage.getItem('userName') || 'مستخدم';
    const userAvatar = localStorage.getItem('userAvatar');
    const formattedAvatar = userAvatar ? (userAvatar.startsWith('http') ? userAvatar : `${API_BASE_URL}${userAvatar}`) : undefined;

    const tempId = `temp-${Date.now()}`;
    const textToSend = commentText; 

    // Context: Are we in main view or reply view?
    const parentId = viewingRepliesFor ? viewingRepliesFor._id : null;
    const isReply = !!parentId;

    const optimisticComment: Comment = {
        _id: tempId,
        text: textToSend,
        user: {
            _id: userId,
            name: userName,
            avatar: formattedAvatar
        },
        createdAt: new Date().toISOString(),
        likes: 0,
        isLiked: false,
        pending: true
    };

    setCommentText(''); 
    setReplyingToUser(null);
    
    if (isReply && parentId) {
         // Update Main List recursively
         const addOptimisticReply = (list: Comment[]): Comment[] => {
            return list.map(c => {
                if (c._id === parentId) {
                    return { ...c, replies: [...(c.replies || []), optimisticComment], repliesCount: (c.repliesCount || 0) + 1 };
                }
                return c;
            });
         };
         setComments(prev => addOptimisticReply(prev));
         
         // Update Viewing State
         setViewingRepliesFor(prev => {
             if (prev && prev._id === parentId) {
                 return { ...prev, replies: [...(prev.replies || []), optimisticComment], repliesCount: (prev.repliesCount || 0) + 1 };
             }
             return prev;
         });

    } else {
         setComments(prev => [optimisticComment, ...prev]);
         setLocalCommentsCount(prev => prev + 1);
    }

    try {
      const endpoint = isReply 
        ? `${API_BASE_URL}/api/v1/posts/${post.id}/comment/${parentId}/reply`
        : `${API_BASE_URL}/api/v1/posts/${post.id}/comment`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: textToSend })
      });

      if (response.ok) {
        // Refetch all comments to get the real ID and data
        fetchComments();
      } else {
        handleCommentFailure(tempId, parentId);
      }
    } catch (error) {
      handleCommentFailure(tempId, parentId);
    }
  };

  const handleCommentFailure = (tempId: string, parentId: string | null) => {
      if (parentId) {
          // Revert reply
          const removeOptimisticReply = (list: Comment[]): Comment[] => {
            return list.map(c => {
                if (c._id === parentId) {
                    return { ...c, replies: c.replies?.filter(r => r._id !== tempId), repliesCount: Math.max(0, (c.repliesCount || 1) - 1) };
                }
                return c;
            });
          };
          setComments(prev => removeOptimisticReply(prev));
          setViewingRepliesFor(prev => {
             if (prev && prev._id === parentId) {
                 return { ...prev, replies: prev.replies?.filter(r => r._id !== tempId), repliesCount: Math.max(0, (prev.repliesCount || 1) - 1) };
             }
             return prev;
         });
      } else {
           setComments(prev => prev.filter(c => c._id !== tempId));
           setLocalCommentsCount(prev => Math.max(0, prev - 1));
      }
  };

  const handleCommentLike = async (commentId: string, parentId?: string) => {
    // Determine the actual parentId. If we are in reply view, use that.
    let targetParentId = parentId;
    if (!targetParentId && viewingRepliesFor) {
        // Check if this comment is inside the currently viewed replies
        if (viewingRepliesFor.replies?.some(r => r._id === commentId)) {
            targetParentId = viewingRepliesFor._id;
        }
    }

    const toggleLike = (c: Comment) => ({
      ...c,
      isLiked: !c.isLiked,
      likes: Math.max(0, c.likes + (!c.isLiked ? 1 : -1))
    });

    // Update main list
    const updateLikesRecursively = (list: Comment[]): Comment[] => {
      return list.map(c => {
        if (c._id === commentId) {
          return toggleLike(c);
        }
        if (c.replies) {
          return { ...c, replies: updateLikesRecursively(c.replies) };
        }
        return c;
      });
    };
    setComments(prev => updateLikesRecursively(prev));

    // Update view state if applicable
    if (viewingRepliesFor) {
        if (viewingRepliesFor._id === commentId) {
            setViewingRepliesFor(toggleLike(viewingRepliesFor));
        } else if (viewingRepliesFor.replies) {
            setViewingRepliesFor({
                ...viewingRepliesFor,
                replies: updateLikesRecursively(viewingRepliesFor.replies)
            });
        }
    }

    try {
      const token = localStorage.getItem('token');
      // Backend expects parent ID for replies
      // We might need to find it if not passed
      const findParent = (list: Comment[], childId: string): Comment | null => {
          for (const c of list) {
              if (c.replies?.some(r => r._id === childId)) return c;
          }
          return null;
      };
      
      const parentComment = targetParentId ? { _id: targetParentId } : findParent(comments, commentId);
      const endpoint = parentComment
        ? `${API_BASE_URL}/api/v1/posts/${post.id}/comment/${parentComment._id}/reply/${commentId}/like`
        : `${API_BASE_URL}/api/v1/posts/${post.id}/comment/${commentId}/like`;
      
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        keepalive: true
      });
    } catch (error) {
      console.error("Failed to like comment", error);
    }
  };

  const handleCopyComment = () => {
      if (activeCommentAction) {
          navigator.clipboard.writeText(activeCommentAction.text);
          setActiveCommentAction(null);
      }
  };

  const handleReportComment = () => {
    if (activeCommentAction && onReport) {
      onReport('comment', activeCommentAction._id, activeCommentAction.user.name);
      setActiveCommentAction(null);
    }
  };

  const handleDeleteComment = () => {
    if (activeCommentAction) {
        setCommentToDelete(activeCommentAction);
        setActiveCommentAction(null);
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    const commentIdToDelete = commentToDelete._id;

    // Optimistic removal
    const removeCommentRecursively = (list: Comment[]): Comment[] => {
      return list.filter(c => c._id !== commentIdToDelete).map(c => {
        if (c.replies) {
          return { ...c, replies: removeCommentRecursively(c.replies), repliesCount: c.replies.filter(r => r._id !== commentIdToDelete).length };
        }
        return c;
      });
    };
    
    setComments(prev => removeCommentRecursively(prev));
    if (viewingRepliesFor) {
        if (viewingRepliesFor._id === commentIdToDelete) {
            setViewingRepliesFor(null);
        } else {
            setViewingRepliesFor(prev => prev ? ({
                ...prev,
                replies: removeCommentRecursively(prev.replies || []),
                repliesCount: (prev.replies?.filter(r => r._id !== commentIdToDelete).length || 0)
            }) : null);
        }
    }
    
    setLocalCommentsCount(prev => Math.max(0, prev - 1));
    setCommentToDelete(null); 

    try {
        const findParent = (list: Comment[], childId: string): Comment | null => {
            for (const c of list) {
                if (c.replies?.some(r => r._id === childId)) return c;
            }
            return null;
        };
        const parentComment = findParent(comments, commentIdToDelete);

        const token = localStorage.getItem('token');
        const endpoint = parentComment
          ? `${API_BASE_URL}/api/v1/posts/${post.id}/comment/${parentComment._id}/reply/${commentIdToDelete}`
          : `${API_BASE_URL}/api/v1/posts/${post.id}/comment/${commentIdToDelete}`;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to delete");
    } catch (error) {
        fetchComments(); // Revert on failure
    }
  };


  const syncLikeWithServer = async (finalLikedState: boolean) => {
    const attemptSync = async (retriesLeft: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/v1/posts/${post.id}/react`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reactionType: 'like' }),
                keepalive: true
            });

            if (response.status === 401 || response.status === 403) return;
            if (!response.ok) throw new Error(`Server responded with ${response.status}`);
            
            isDirtyRef.current = false;
        } catch (error) {
            if (retriesLeft > 0) {
                setTimeout(() => attemptSync(retriesLeft - 1), 1000);
            }
        }
    };
    attemptSync(3);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isDirtyRef.current) syncLikeWithServer(currentLikedRef.current);
    };
  }, []);

  const handleLike = () => {
    const newState = !optimisticLiked;
    setOptimisticLiked(newState);
    currentLikedRef.current = newState;
    isDirtyRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isDirtyRef.current) syncLikeWithServer(newState);
    }, 1000); 
  };
  
  const handleRepostSubmit = async () => {
    if (!repostText && !confirm(t('repost_no_comment_confirm') || "هل تريد إعادة النشر بدون كتابة أي تعليق؟")) return;

    setIsReposting(true);
    const token = localStorage.getItem('token');
    
    try {
      const repostPayload = {
        text: repostText,
        originalPostId: post._id || post.id,
        originalPostType: "post"
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/posts/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(repostPayload)
      });

      if (response.ok) {
        alert(t('repost_success') || "تمت إعادة النشر بنجاح!");
        setIsRepostModalOpen(false);
        setRepostText('');
      } else {
        alert(t('repost_fail') || "فشل إعادة النشر");
      }
    } catch (error) {
      console.error("Repost failed", error);
      alert(t('repost_error') || "حدث خطأ أثناء إعادة النشر");
    } finally {
      setIsReposting(false);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
        title: `منشور بواسطة ${post.user.name}`,
        text: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        url: `${API_BASE_URL}/p/${post.id}`, 
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            setIsShareOpen(false);
        } catch (err) {
            console.log('Share canceled or failed', err);
        }
    } else {
        navigator.clipboard.writeText(shareData.url);
        alert(t('copy_link') + " (تم النسخ)");
    }
  };

  if (!isVisible) return null;

  const handleHidePost = () => { setIsVisible(false); setIsMenuOpen(false); };
  
  const handleDeletePost = () => { 
      setIsMenuOpen(false);
      if (onDelete) {
         onDelete();
      } else {
         setIsDeletePostModalOpen(true);
      }
  };

  const confirmDeletePost = async () => {
    setIsDeletingPost(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${post.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            setIsVisible(false); 
            setIsDeletePostModalOpen(false);
        } else {
             alert("فشل حذف المنشور");
             setIsDeletePostModalOpen(false);
        }
    } catch (e) {
        console.error("Failed to delete post", e);
        alert("حدث خطأ أثناء الحذف");
        setIsDeletePostModalOpen(false);
    } finally {
        setIsDeletingPost(false);
    }
  };

  const handleReportPost = () => { if (onReport) { onReport('post', post.id, post.user.name); setIsMenuOpen(false); } else { alert(t('post_report_success')); setIsMenuOpen(false); } };
  const handleContactClick = () => { setIsMenuOpen(false); setIsContactOpen(true); };
  const hasWhatsapp = post.contactMethods?.includes('واتساب') && post.contactPhone;
  const hasCall = post.contactMethods?.includes('اتصال') && post.contactPhone;
  const hasEmail = post.contactMethods?.includes('بريد إلكتروني') && post.contactEmail;
  const handleWhatsapp = () => { if (!hasWhatsapp || !post.contactPhone) return; const phone = post.contactPhone.replace(/\s+/g, ''); window.open(`https://wa.me/${phone}`, '_blank'); };
  const handleCall = () => { if (!hasCall || !post.contactPhone) return; window.open(`tel:${post.contactPhone}`); };
  const handleEmail = () => { if (!hasEmail || !post.contactEmail) return; window.open(`mailto:${post.contactEmail}`); };
  
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

  // --- NEW RENDER HELPERS FOR SLIDING UI ---

  const renderReplyItem = (reply: Comment) => {
      return (
        <div 
            key={reply._id} 
            className={`flex gap-3 relative transition-opacity duration-300 ${reply.pending ? 'opacity-50' : 'opacity-100'} mb-4`}
            onTouchStart={() => handleTouchStart(reply)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onMouseDown={() => handleTouchStart(reply)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
        >
            <div className="absolute top-[-10px] bottom-0 right-[19px] w-[2px] bg-gray-200 -z-10" />
            <div className="flex-shrink-0 mt-0.5 relative z-10" onClick={(e) => { e.stopPropagation(); onProfileClick?.(reply.user._id); }}>
                <Avatar name={reply.user.name} src={reply.user.avatar} className="w-8 h-8 ring-2 ring-white" textClassName="text-xs" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="bg-gray-50 p-3 rounded-2xl rounded-tr-none w-fit max-w-full">
                    <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-2">
                        {reply.user.name}
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text">{reply.text}</p>
                </div>
                <div className="flex items-center gap-4 mt-1 px-2">
                    <span className="text-[10px] text-gray-400">{reply.pending ? t('sending') : new Date(reply.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setReplyingToUser({id: reply.user._id, name: reply.user.name});
                            inputRef.current?.focus();
                        }}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-800"
                    >
                        {t('reply')}
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-1 pt-1 w-6">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCommentLike(reply._id, viewingRepliesFor?._id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="p-1 active:scale-90 transition-transform"
                >
                    <Heart size={14} className={reply.isLiked ? "text-red-500 fill-red-500" : "text-gray-400"} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveCommentAction(reply);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="p-1 text-gray-400 hover:text-gray-600"
                >
                    <MoreHorizontal size={14} />
                </button>
            </div>
        </div>
      );
  };

  const renderCommentItem = (comment: Comment, isShortView?: boolean) => {
    return (
      <div 
        key={comment._id} 
        className={`flex gap-3 transition-opacity duration-300 ${comment.pending ? 'opacity-50' : 'opacity-100'} mb-4`}
        onTouchStart={() => handleTouchStart(comment)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseDown={() => handleTouchStart(comment)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
         <div className="flex-shrink-0 mt-0.5 cursor-pointer relative flex flex-col items-center" onClick={(e) => { e.stopPropagation(); onProfileClick?.(comment.user._id); }}>
            <Avatar
              name={comment.user.name}
              src={comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${API_BASE_URL}${comment.user.avatar}`) : null}
              className="w-9 h-9 relative z-10"
              textClassName="text-sm"
            />
            {(comment.repliesCount || 0) > 0 && (
                <div className="w-[2px] h-full bg-gray-200 mt-[-10px] mb-[-20px] z-0"></div>
            )}
         </div>
         <div className="flex-1 min-w-0">
            <div className="bg-gray-100 p-3 rounded-2xl rounded-tr-none inline-block max-w-full">
                <h4 
                    className="text-xs font-bold text-gray-900 mb-1 cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); onProfileClick?.(comment.user._id); }}
                >
                    {comment.user.name}
                </h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text text-start">
                    {comment.text}
                </p>
            </div>
            <div className="flex items-center gap-4 mt-1.5 px-2">
                <span className="text-[10px] text-gray-400">
                  {comment.pending ? t('sending') : new Date(comment.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button 
                  onClick={(e) => {
                      e.stopPropagation(); 
                      setViewingRepliesFor(comment);
                  }}
                  className="text-[11px] font-bold text-gray-500 hover:text-gray-800"
                >
                  {t('reply')}
                </button>
            </div>
            
            {(comment.repliesCount || 0) > 0 && !isShortView && (
              <div className="flex items-center gap-2 mt-2">
                 <div className="w-6 h-4 border-b-2 border-r-2 border-gray-200 rounded-br-xl rtl:border-l-2 rtl:border-r-0 rtl:rounded-bl-xl rtl:rounded-br-none"></div>
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setViewingRepliesFor(comment);
                    }}
                    className="text-gray-500 font-bold text-xs flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded-full transition-colors"
                 >
                    <span>{t('view_replies')} ({comment.repliesCount})</span>
                 </button>
              </div>
            )}
         </div>
         <div className="flex flex-col items-center gap-2 pt-2 w-8">
            <button 
              onClick={(e) => {
                  e.stopPropagation();
                  handleCommentLike(comment._id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="p-1 active:scale-90 transition-transform"
            >
              <Heart 
                size={16} 
                className={`transition-colors ${comment.isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} 
              />
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveCommentAction(comment);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-gray-600"
            >
                <MoreHorizontal size={16} />
            </button>
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
      <div className="bg-white mb-3 shadow-sm py-4 relative">
        {/* Post Header */}
        <div className="px-4 flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer" onClick={handleAvatarClick}>
              <Avatar
                name={post.user.name}
                src={post.user.avatar}
                className="w-10 h-10"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm cursor-pointer" onClick={handleAvatarClick}>{post.user.name}</h3>
                {variant === 'feed' && post.user._id && post.user._id !== localStorage.getItem('userId') && (
                  <button 
                    onClick={handleFollowToggle}
                    className={`text-xs font-bold transition-colors flex items-center gap-1 ${
                      isFollowed ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    {isFollowed ? <><span>•</span><span>{t('following')}</span></> : <><span>•</span><span>{t('follow')}</span></>}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{post.timeAgo}</span>
                  <span className="text-gray-300 text-[10px]">•</span>
                  <span className="text-xs text-gray-400">{post.location || (language === 'en' ? 'General' : 'عام')}</span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                   {post.isPremium && (
                     <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-100 shadow-sm animate-pulse">
                       <Star size={10} className="fill-amber-700 text-amber-700" />
                       {t('post_premium')}
                     </span>
                   )}
                   {post.category && (
                     <span className="flex items-center gap-1 text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 font-medium">
                       <Tag size={10} className="text-gray-400" />
                       {post.category}
                     </span>
                   )}
                </div>
              </div>

              {post.title && post.type && (
                <div className="mt-1.5">
                  <span className={`text-xs font-bold ${post.type === 'seeker' ? 'text-blue-700' : 'text-purple-700'}`}>
                    {post.title}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><MoreHorizontal size={20} /></button>
            <button onClick={handleHidePost} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-4 mb-2">
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap dir-auto text-start">
              {isTranslated ? (translatedContent || t('translating')) : post.content}
          </p>
        </div>

        {/* Translation Bar */}
        {shouldShowTranslate && (
            <div className="px-4 mb-3 flex items-center gap-2 relative">
                <button 
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                >
                    {isTranslating ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>{t('translating')}</span>
                        </>
                    ) : (
                        <>
                            <Languages size={14} />
                            <span>{isTranslated ? t('show_original') : t('translate_post')}</span>
                        </>
                    )}
                </button>
                
                <button 
                    onClick={toggleSettings}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <Settings size={12} />
                </button>

                {/* Translation Settings Popup */}
                {showTransSettings && (
                    <div className="absolute top-6 start-0 z-20 bg-white border border-gray-100 shadow-xl rounded-lg p-3 w-52 animate-in zoom-in-95">
                        <h4 className="text-xs font-bold text-gray-800 mb-2">{t('translation_settings')}</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{t('source_lang')}</span>
                                {/* Source Language - LOCKED */}
                                <div className="bg-gray-100 text-gray-500 border border-gray-200 rounded px-2 py-1 font-medium flex items-center gap-1 cursor-not-allowed">
                                    <Lock size={10} />
                                    <span>{t(transSource === 'ar' ? 'lang_ar' : 'lang_en')}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{t('target_lang')}</span>
                                <select 
                                    value={transTarget} 
                                    onChange={(e) => {
                                        const newLang = e.target.value;
                                        setTransTarget(newLang);
                                        localStorage.setItem('post_trans_target', newLang);
                                    }}
                                    className="bg-gray-50 border border-gray-200 rounded px-1 py-0.5 outline-none font-medium max-w-[100px]"
                                >
                                    {LANGUAGES.map((lang) => (
                                        <option key={lang.code} value={lang.code}>{t(lang.key)}</option>
                                    ))}
                                </select>
                            </div>
                            <button 
                                onClick={handleSaveTransSettings}
                                className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded mt-2 hover:bg-blue-700"
                            >
                                {t('save')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Post Media */}
        {post.image && (
          <div className="relative mb-3 w-full aspect-[4/3] overflow-hidden bg-gray-100 border border-gray-100">
            {!isImageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>}
            {post.image.match(/\.(mp4|webm|mov|avi)$/i) ? (
              <video 
                key={post.id}
                src={post.image} 
                controls 
                playsInline 
                className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoadedData={() => setIsImageLoaded(true)}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img 
                key={post.id}
                src={post.image} 
                alt="Post content" 
                className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`} 
                onLoad={() => setIsImageLoaded(true)}
              />
            )}
          </div>
        )}

        {/* Stats */}
        <div className="px-4 flex justify-between items-center pb-2 border-b border-gray-100 text-xs text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            <div className={`p-0.5 rounded-full transition-all duration-300 ${optimisticLiked ? 'bg-blue-500 scale-110' : 'bg-gray-400'}`}>
              <ThumbsUp size={10} className="text-white fill-current" />
            </div>
            <span key={displayCount} className="animate-in fade-in zoom-in duration-200 font-bold text-gray-600">{displayCount}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={handleOpenComments} className="hover:underline">{localCommentsCount} {t('comment')}</button>
            <span>{post.shares} {t('share')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 flex justify-between items-center">
          <button onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all active:scale-95 ${optimisticLiked ? 'text-blue-600' : 'text-gray-600'}`}>
            <ThumbsUp size={18} className={`transition-transform duration-200 ${optimisticLiked ? 'fill-current scale-110' : ''}`} />
            <span className="text-sm font-medium">{optimisticLiked ? t('liked') : t('like')}</span>
          </button>
          <button onClick={handleOpenComments} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <MessageCircle size={18} />
            <span className="text-sm font-medium">{t('comment')}</span>
          </button>
          <button onClick={() => setIsShareOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Share2 size={18} />
            <span className="text-sm font-medium">{t('share')}</span>
          </button>
        </div>
      </div>

      {/* SHARE MODAL */}
      {isShareOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setIsShareOpen(false)} />
          <div className="bg-white w-full max-w-md rounded-t-2xl relative z-10 animate-slide-up-fast pb-safe shadow-2xl">
            <div className="flex justify-center pt-3 pb-1" onClick={() => setIsShareOpen(false)}>
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-800 font-bold text-center flex-1">{t('share')}</h3>
                <button onClick={() => setIsShareOpen(false)} className="bg-gray-100 p-1 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                 <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Share2 size={24} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-700 font-bold">{t('share')}</span>
                 </button>
                 <button onClick={() => { navigator.clipboard.writeText(`${API_BASE_URL}/p/${post.id}`); setIsShareOpen(false); alert(t('copy_link') + " Done"); }} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      <Link size={24} className="text-gray-600" />
                    </div>
                    <span className="text-xs text-gray-700 font-bold">{t('copy_link')}</span>
                 </button>
                 <button onClick={() => { setIsShareOpen(false); setIsRepostModalOpen(true); }} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                      <Repeat size={24} className="text-green-600" />
                    </div>
                    <span className="text-xs text-gray-700 font-bold">{t('repost')}</span>
                 </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* REPOST MODAL */}
      {isRepostModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRepostModalOpen(false)} />
           <div className="bg-white w-full max-w-md rounded-2xl p-6 relative z-10 animate-in zoom-in-95 shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{t('repost')}</h3>
                  <button onClick={() => setIsRepostModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
               </div>
               <div className="bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                 <div className="flex items-center gap-2 mb-2">
                   <Avatar name={post.user.name} src={post.user.avatar} className="w-6 h-6" />
                   <span className="text-xs font-bold">{post.user.name}</span>
                 </div>
                 <p className="text-xs text-gray-600 line-clamp-2">{post.content}</p>
               </div>
               <textarea className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4 resize-none" placeholder={t('post_placeholder')} value={repostText} onChange={(e) => setRepostText(e.target.value)} />
               <div className="flex gap-3">
                   <button onClick={handleRepostSubmit} disabled={isReposting} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex justify-center">{isReposting ? <Loader2 className="animate-spin" size={20} /> : t('post_publish')}</button>
               </div>
           </div>
        </div>, document.body
      )}

      {isMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={() => setIsMenuOpen(false)} />
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl pb-safe relative z-10 animate-slide-up-fast shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3" />
            <div className="px-4 pb-6 flex flex-col gap-2">
                <button onClick={handleHidePost} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl"><EyeOff size={22} className="text-gray-700" /><span className="font-bold text-gray-800 text-sm">{t('post_hide')}</span></button>
                {isOwner ? (
                  <button onClick={handleDeletePost} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl"><Trash2 size={22} className="text-red-600" /><span className="font-bold text-red-600 text-sm">{t('delete')}</span></button>
                ) : (
                  <button onClick={handleReportPost} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl"><Flag size={22} className="text-red-600" /><span className="font-bold text-red-600 text-sm">{t('report')}</span></button>
                )}
                {(post.contactPhone || post.contactEmail) && (
                   <button onClick={handleContactClick} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl"><Phone size={22} className="text-blue-600" /><span className="font-bold text-blue-600 text-sm">Contact Owner</span></button>
                )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* NEW SLIDING COMMENTS MODAL */}
      {isCommentsOpen && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            {/* Backdrop: Use transparent or slightly dark, but ensure home is visible if that's the intent. User said 'home disappears' implying overlay. Here we use bg-black/60 to focus on comments */}
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setIsCommentsOpen(false)} />
            
            <div className="bg-white w-full max-w-md h-[70vh] rounded-t-2xl sm:rounded-2xl relative z-10 animate-slide-up-fast shadow-2xl flex flex-col overflow-hidden">
               
               {/* Content Area with Sliding Panels */}
               <div className="flex-1 relative overflow-hidden">
                  
                  {/* PANEL 1: Main Comments List */}
                  <div 
                    className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${viewingRepliesFor ? (language === 'ar' ? '-translate-x-full' : 'translate-x-full') : 'translate-x-0'}`}
                  >
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20">
                          <div className="w-8"></div>
                          <h3 className="font-bold text-gray-800">{t('comment')} ({localCommentsCount})</h3>
                          <button onClick={() => setIsCommentsOpen(false)} className="bg-gray-100 p-1 rounded-full hover:bg-gray-200">
                              <X size={20} className="text-gray-600" />
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
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
                            <h3 className="text-gray-800 font-bold text-sm mb-1">{t('no_comments') || "No comments yet"}</h3>
                          </div>
                        )}
                      </div>
                  </div>

                  {/* PANEL 2: Replies View (Slides In) */}
                  <div 
                    className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${viewingRepliesFor ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')} z-30`}
                  >
                     {viewingRepliesFor && (
                        <>
                           {/* Replies Header */}
                           <div className="bg-white p-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                              <button onClick={() => setViewingRepliesFor(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowRight size={20} className={`text-gray-700 ${language === 'en' ? 'rotate-180' : ''}`} />
                              </button>
                              <h3 className="font-bold text-gray-800 text-sm">{t('view_replies')}</h3>
                              <div className="w-9"></div>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                              {/* Parent Comment with Requested Icons */}
                              <div className="mb-4 relative">
                                  {/* Vertical Connection Line */}
                                  <div className="absolute top-10 bottom-[-20px] right-[19px] w-[2px] bg-gray-200 z-0" />
                                  
                                  <div className="flex gap-3 relative z-10">
                                      <div onClick={(e) => { e.stopPropagation(); onProfileClick?.(viewingRepliesFor.user._id); }}>
                                          <Avatar name={viewingRepliesFor.user.name} src={viewingRepliesFor.user.avatar} className="w-10 h-10 ring-4 ring-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="bg-gray-100 p-3 rounded-2xl rounded-tr-none w-fit max-w-full">
                                              <h4 className="font-bold text-sm text-gray-900 mb-1" onClick={(e) => { e.stopPropagation(); onProfileClick?.(viewingRepliesFor.user._id); }}>{viewingRepliesFor.user.name}</h4>
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text">{viewingRepliesFor.text}</p>
                                          </div>
                                          <div className="text-xs text-gray-400 mt-1 px-2">{new Date(viewingRepliesFor.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}</div>
                                      </div>

                                      {/* Added Action Column for Parent */}
                                      <div className="flex flex-col items-center gap-2 pt-1 w-8">
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); handleCommentLike(viewingRepliesFor._id); }}
                                              onMouseDown={(e) => e.stopPropagation()}
                                              onTouchStart={(e) => e.stopPropagation()}
                                              className="p-1 active:scale-90 transition-transform"
                                          >
                                              <Heart size={16} className={viewingRepliesFor.isLiked ? "text-red-500 fill-red-500" : "text-gray-400"} />
                                          </button>
                                          <button
                                              onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  setReplyingToUser({id: viewingRepliesFor.user._id, name: viewingRepliesFor.user.name});
                                                  setTimeout(() => inputRef.current?.focus(), 100);
                                              }}
                                              className="p-1 text-gray-400 hover:text-blue-600 active:scale-90 transition-transform"
                                          >
                                              <Reply size={16} />
                                          </button>
                                          <button
                                              onClick={(e) => { e.stopPropagation(); setActiveCommentAction(viewingRepliesFor); }}
                                              onMouseDown={(e) => e.stopPropagation()}
                                              onTouchStart={(e) => e.stopPropagation()}
                                              className="p-1 text-gray-400 hover:text-gray-600 active:scale-90 transition-transform"
                                          >
                                              <MoreHorizontal size={16} />
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              {/* Replies List */}
                              <div className="pr-1 space-y-0">
                                 {viewingRepliesFor.replies && viewingRepliesFor.replies.length > 0 ? (
                                    viewingRepliesFor.replies.map(reply => renderReplyItem(reply))
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

               {/* Input Area */}
               <div className="p-3 border-t border-gray-100 bg-white pb-safe z-40 relative">
                  {replyingToUser && (
                      <div className="flex items-center justify-between px-2 mb-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                          <span>{t('replying_to')} <span className="font-bold text-blue-600">{replyingToUser.name}</span></span>
                          <button onClick={() => setReplyingToUser(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={12} /></button>
                      </div>
                  )}
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 flex-shrink-0">
                        <Avatar 
                            name={localStorage.getItem('userName') || 'أنا'} 
                            src={localStorage.getItem('userAvatar') ? (localStorage.getItem('userAvatar')!.startsWith('http') ? localStorage.getItem('userAvatar') : `${API_BASE_URL}${localStorage.getItem('userAvatar')}`) : null} 
                            className="w-8 h-8" 
                        />
                     </div>
                     <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2">
                        <input 
                           ref={inputRef}
                           type="text" 
                           value={commentText}
                           onChange={(e) => setCommentText(e.target.value)}
                           onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                           placeholder={viewingRepliesFor ? t('reply_placeholder') : t('post_placeholder')}
                           className="bg-transparent border-none outline-none w-full text-sm placeholder:text-gray-500 dir-auto text-start"
                           autoFocus={!!viewingRepliesFor}
                        />
                     </div>
                     <button onClick={handleSendComment} disabled={!commentText.trim()} className={`p-2 rounded-full transition-colors ${!commentText.trim() ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50 bg-transparent'}`}>
                        <Send size={20} style={{ transform: language === 'en' ? 'scaleX(-1)' : 'none' }} />
                     </button>
                  </div>
               </div>
            </div>
         </div>, document.body
      )}

      {isContactOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setIsContactOpen(false)} />
              <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl pb-safe relative z-10 p-5 shadow-2xl animate-slide-up-fast">
                  <div className="flex justify-center mb-4"><div className="w-12 h-1.5 bg-gray-300 rounded-full"></div></div>
                  <h3 className="text-center font-bold mb-6 text-lg">Contact Owner</h3>
                  <div className="flex flex-col gap-3">
                      {hasWhatsapp && (<button onClick={handleWhatsapp} className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"><div className="bg-green-500 p-2 rounded-full text-white"><MessageCircle size={24} /></div><div className="text-start"><span className="block font-bold text-green-800">Whatsapp</span><span className="text-xs text-green-600 dir-ltr">{post.contactPhone}</span></div></button>)}
                      {hasCall && (<button onClick={handleCall} className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"><div className="bg-blue-500 p-2 rounded-full text-white"><Phone size={24} /></div><div className="text-start"><span className="block font-bold text-blue-800">Call</span><span className="text-xs text-blue-600 dir-ltr">{post.contactPhone}</span></div></button>)}
                      {hasEmail && (<button onClick={handleEmail} className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"><div className="bg-orange-500 p-2 rounded-full text-white"><Mail size={24} /></div><div className="text-start"><span className="block font-bold text-orange-800">Email</span><span className="text-xs text-orange-600">{post.contactEmail}</span></div></button>)}
                  </div>
                  <button onClick={() => setIsContactOpen(false)} className="w-full mt-4 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">{t('cancel')}</button>
              </div>
          </div>, document.body
      )}
      
      {activeCommentAction && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
             <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setActiveCommentAction(null)} />
             <div className="bg-white w-full max-w-md rounded-t-2xl pb-safe relative z-10 p-4 animate-slide-up-fast">
                 <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                 <div className="flex flex-col gap-2">
                    <button onClick={handleCopyComment} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl w-full"><Copy size={20} className="text-blue-600" /><span className="font-bold text-gray-700">{t('copy_text')}</span></button>

                    {isCommentOwner ? (
                        <button onClick={handleDeleteComment} className="flex items-center gap-4 p-3 hover:bg-red-50 rounded-xl w-full"><Trash2 size={20} className="text-red-600" /><span className="font-bold text-red-600">{t('delete')}</span></button>
                    ) : (
                        <button onClick={handleReportComment} className="flex items-center gap-4 p-3 hover:bg-red-50 rounded-xl w-full"><Flag size={20} className="text-red-600" /><span className="font-bold text-red-600">{t('report')}</span></button>
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

      {/* Delete Post Confirmation Modal */}
      {isDeletePostModalOpen && createPortal(
           <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => !isDeletingPost && setIsDeletePostModalOpen(false)} />
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
                        onClick={confirmDeletePost} 
                        disabled={isDeletingPost}
                        className="flex-1 bg-red-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 flex justify-center items-center"
                      >
                        {isDeletingPost ? <Loader2 className="animate-spin text-white" size={24} /> : t('yes')}
                      </button>
                      <button 
                        onClick={() => setIsDeletePostModalOpen(false)} 
                        disabled={isDeletingPost}
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

export default PostCard;