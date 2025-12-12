
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowRight, Phone, Info, 
  Camera, Edit2, PlusCircle, Trash2,
  Play, Loader2, UserPlus, Check, Save, X, Grid, Image as ImageIcon, Film, Heart, Link as LinkIcon
} from 'lucide-react';
import PostCard from './PostCard';
import { Post } from '../types';
import Avatar from './Avatar';
import { API_BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileViewProps {
  onClose: () => void;
  onReport?: (type: 'post' | 'comment' | 'reply', id: string, name: string) => void;
  userId?: string; 
}

interface CustomSection {
  id: number;
  _id?: string;
  title: string;
  content: string;
}

interface VideoItem {
  id: string;
  url: string;
  thumbnail: string;
  likes: number;
  comments: number;
  desc: string;
}

// --- GLOBAL CACHE DEFINITION ---
interface CachedProfileData {
    user: any;
    isFollowed: boolean;
    customSections: CustomSection[];
    posts: Post[];
    videos: VideoItem[];
    photos: string[];
    postsPage: number;
    videosPage: number;
    photosPage: number;
    hasMorePosts: boolean;
    hasMoreVideos: boolean;
    hasMorePhotos: boolean;
    coverLoaded: boolean;
    avatarLoaded: boolean;
}

const profileCache = new Map<string, CachedProfileData>();

const ProfileView: React.FC<ProfileViewProps> = ({ onClose, onReport, userId }) => {
  const { t, language } = useLanguage();
  // Removed 'about' from activeTab types
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'photos'>('posts');
  
  const currentUserId = localStorage.getItem('userId');
  const isMe = !userId || userId === 'me' || userId === currentUserId;
  const targetId = isMe ? 'me' : userId!;

  const cachedData = profileCache.get(targetId);

  // Initial Loading States:
  const [loadingProfile, setLoadingProfile] = useState(!cachedData?.user);
  
  // CRITICAL FIX: Initialize loadingContent based on whether we actually have data in state/cache
  const [loadingContent, setLoadingContent] = useState(() => {
      if (activeTab === 'posts' && cachedData?.posts && cachedData.posts.length > 0) return false;
      if (activeTab === 'videos' && cachedData?.videos && cachedData.videos.length > 0) return false;
      if (activeTab === 'photos' && cachedData?.photos && cachedData.photos.length > 0) return false;
      return true;
  });
  
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const [isCoverLoaded, setIsCoverLoaded] = useState(cachedData?.coverLoaded || false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(cachedData?.avatarLoaded || false);
  const [uploadingImage, setUploadingImage] = useState<'avatar' | 'cover' | null>(null);

  const [user, setUser] = useState<any>(cachedData?.user || {
    _id: '',
    name: '',
    username: '',
    bio: '',
    phone: '',
    website: '', // Added website field
    followers: 0,
    following: 0,
    postsCount: 0,
    totalLikes: 0,
    avatar: null,
    cover: null
  });

  const [isFollowed, setIsFollowed] = useState(cachedData?.isFollowed || false);
  const [customSections, setCustomSections] = useState<CustomSection[]>(cachedData?.customSections || []);
  
  const [posts, setPosts] = useState<Post[]>(cachedData?.posts || []);
  const [videos, setVideos] = useState<VideoItem[]>(cachedData?.videos || []);
  const [photos, setPhotos] = useState<string[]>(cachedData?.photos || []);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [editingState, setEditingState] = useState<{ field: string, value: string, label: string } | null>(null);
  
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');
  const [isSavingSection, setIsSavingSection] = useState(false);

  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [isSavingSectionEdit, setIsSavingSectionEdit] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'section' | 'video' | 'post' | null;
    id: number | string | null;
  }>({ isOpen: false, type: null, id: null });

  const [viewingVideoIndex, setViewingVideoIndex] = useState<number | null>(null);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Sync state with cache when returning to a tab (Instant Load)
  useEffect(() => {
      if (cachedData) {
          if (activeTab === 'posts') {
              setPage(cachedData.postsPage);
              setHasMore(cachedData.hasMorePosts);
              if (cachedData.posts.length > 0) {
                  setPosts(cachedData.posts);
                  setLoadingContent(false);
              }
          } else if (activeTab === 'videos') {
              setPage(cachedData.videosPage);
              setHasMore(cachedData.hasMoreVideos);
              if (cachedData.videos.length > 0) {
                  setVideos(cachedData.videos);
                  setLoadingContent(false);
              }
          } else if (activeTab === 'photos') {
              setPage(cachedData.photosPage);
              setHasMore(cachedData.hasMorePhotos);
              if (cachedData.photos.length > 0) {
                  setPhotos(cachedData.photos);
                  setLoadingContent(false);
              }
          }
      }
  }, [activeTab, cachedData]);

  const updateCache = (updates: Partial<CachedProfileData>) => {
      const current = profileCache.get(targetId) || {
          user, 
          isFollowed, 
          customSections, 
          posts: [], 
          videos: [], 
          photos: [],
          postsPage: 1,
          videosPage: 1,
          photosPage: 1,
          hasMorePosts: true,
          hasMoreVideos: true,
          hasMorePhotos: true,
          coverLoaded: isCoverLoaded,
          avatarLoaded: isAvatarLoaded
      };
      profileCache.set(targetId, { ...current, ...updates });
  };

  const cleanUrl = useCallback((url: any) => {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('undefined') || url.includes('null')) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('blob:')) return url;
    
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }, []);
  
  const processUserData = useCallback((userData: any) => {
    if (!userData || typeof userData !== 'object') return null;

    const realId = userData._id || userData.id;

    const getProp = (...keys: string[]) => {
        for (const k of keys) {
            if (userData[k] !== undefined && userData[k] !== null && userData[k] !== '') return userData[k];
        }
        return null;
    };

    const name = getProp('name', 'fullname', 'userName', 'username', 'firstName') || 'مستخدم';
    
    let username = getProp('username', 'email') || 'user';
    if (typeof username === 'string') {
       if (username.includes('@') && !username.startsWith('@')) username = username.split('@')[0];
       if (!username.startsWith('@')) username = `@${username}`;
    }

    const avatar = cleanUrl(getProp('avatar', 'profilePicture', 'profileImage', 'image', 'photo'));
    const cover = cleanUrl(getProp('cover', 'coverImage', 'backgroundImage', 'banner', 'headerImage'));

    const getCount = (val: any) => Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
    
    const followers = getCount(getProp('followers', 'followersCount'));
    const following = getCount(getProp('following', 'followingCount'));
    
    let postsCount = getCount(getProp('postsCount', 'posts_count', 'postCount'));
    if (postsCount === 0 && Array.isArray(userData.posts) && userData.posts.length > 0) {
        postsCount = userData.posts.length;
    }

    const totalLikes = getCount(getProp('totalLikes', 'likesCount', 'likes'));

    const bio = getProp('bio', 'about', 'description') || '';
    const phone = getProp('phone', 'phoneNumber', 'mobile') || '';
    const website = getProp('website', 'url', 'site', 'link') || '';

    return {
      _id: realId, name, username, bio, phone, website,
      followers, following, postsCount, totalLikes, avatar, cover
    };
  }, [cleanUrl]);

  const fetchProfile = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
        setLoadingProfile(true);
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;

    const findUserObject = (data: any): any | null => {
        if (!data || typeof data !== 'object') return null;
        if (data.user && typeof data.user === 'object') return data.user;
        if (data.data && typeof data.data === 'object') {
            if (data.data.user && typeof data.data.user === 'object') return data.data.user;
            if (data.data._id || data.data.id) return data.data;
        }
        if (data._id || data.id) return data;
        return null;
    };

    try {
      const endpoint = `${API_BASE_URL}/api/v1/users/${targetId}`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const rootData = await response.json();
        const userData = findUserObject(rootData);
        const processedUser = processUserData(userData);

        if (processedUser) {
            setUser((prev: any) => {
                let adjustedPostsCount = processedUser.postsCount;
                if (adjustedPostsCount === 0) {
                    if (prev.postsCount > 0) {
                        adjustedPostsCount = prev.postsCount;
                    } else {
                        const currentCache = profileCache.get(targetId);
                        if (currentCache?.user?.postsCount > 0) {
                            adjustedPostsCount = currentCache.user.postsCount;
                        }
                    }
                }

                if (editingState) return prev;

                return {
                    ...prev,
                    ...processedUser,
                    postsCount: adjustedPostsCount,
                    avatar: uploadingImage === 'avatar' ? prev.avatar : processedUser.avatar,
                    cover: uploadingImage === 'cover' ? prev.cover : processedUser.cover,
                };
            });

            let newSections: CustomSection[] = [];
            if (userData.sections && Array.isArray(userData.sections)) {
                newSections = userData.sections;
                setCustomSections(newSections);
            }

            let newIsFollowed = false;
            if (!isMe && processedUser._id) {
                try {
                    const cachedStatus = localStorage.getItem(`follow_status_${processedUser._id}`);
                    if (cachedStatus) {
                        newIsFollowed = JSON.parse(cachedStatus);
                        setIsFollowed(newIsFollowed);
                    }

                    fetch(`${API_BASE_URL}/api/v1/follow/${processedUser._id}/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(res => res.json()).then(statusData => {
                        setIsFollowed(statusData.isFollowing);
                        localStorage.setItem(`follow_status_${processedUser._id}`, JSON.stringify(statusData.isFollowing));
                        updateCache({ isFollowed: statusData.isFollowing });
                    });
                } catch (e) { console.error(e); }
            }

            setUser((currentUserState: any) => {
                updateCache({ 
                    user: currentUserState, 
                    customSections: newSections, 
                    isFollowed: newIsFollowed 
                });
                return currentUserState;
            });
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      if (!isBackgroundRefresh) {
          setLoadingProfile(false);
      }
    }
  }, [targetId, isMe, processUserData, uploadingImage, editingState]);

  const mapApiPostToUI = useCallback((apiPost: any): Post => {
    const reactions = apiPost.reactions || [];
    const likesCount = reactions.filter((r: any) => !r.type || r.type === 'like').length;
    
    let commentsCount = 0;
    if (typeof apiPost.comments === 'number') {
        commentsCount = apiPost.comments;
    } else if (Array.isArray(apiPost.comments)) {
        commentsCount = apiPost.comments.length;
    } else if (apiPost.commentsCount) {
        commentsCount = apiPost.commentsCount;
    }

    const isLiked = reactions.some((r: any) => {
        const rId = r.user?._id || r.user;
        return String(rId) === String(currentUserId);
    });

    let postUserAvatar = null;
    if (apiPost.user && typeof apiPost.user === 'object' && apiPost.user.avatar) {
        postUserAvatar = cleanUrl(apiPost.user.avatar);
    } else {
        postUserAvatar = user.avatar;
    }

    const postUserName = (apiPost.user && typeof apiPost.user === 'object' && apiPost.user.name) 
        ? apiPost.user.name 
        : user.name;

    const postUserId = (apiPost.user && (apiPost.user._id || apiPost.user.id)) || user._id;

    return {
      id: apiPost._id || apiPost.id,
      _id: apiPost._id || apiPost.id, 
      user: {
        id: postUserId,
        _id: postUserId,
        name: postUserName,
        avatar: postUserAvatar
      },
      timeAgo: apiPost.createdAt ? new Date(apiPost.createdAt).toLocaleDateString('ar-EG') : '',
      content: apiPost.text,
      image: apiPost.media?.[0]?.url ? cleanUrl(apiPost.media[0].url) : undefined,
      likes: likesCount,
      comments: commentsCount,
      shares: apiPost.shares?.length || 0,
      isLiked: isLiked,
      reactions: reactions,
      isShort: apiPost.isShort || false,
    };
  }, [user, currentUserId, cleanUrl]);

  const fetchContent = useCallback(async (type: 'all' | 'video' | 'image', signal: AbortSignal, pageNum: number, isBackgroundFetch: boolean = false) => {
    const isLoadMore = pageNum > 1;
    
    if (isLoadMore) {
        setIsFetchingMore(true);
    } else if (!isBackgroundFetch) {
        setLoadingContent(true);
    }

    const token = localStorage.getItem('token');
    
    // CRITICAL FIX: Use localStorage directly for 'me' to avoid waiting for user state logic
    // This prevents the flickering race condition where user._id is empty then filled
    const fetchTargetId = isMe ? (localStorage.getItem('userId') || 'me') : targetId;

    if (!token) {
        setLoadingContent(false);
        setIsFetchingMore(false);
        return;
    }

    try {
      let limit = 5;
      if (type === 'video') limit = 3; 

      let url = `${API_BASE_URL}/api/v1/posts/user/${fetchTargetId}?page=${pageNum}&limit=${limit}`;
      if (type === 'video') url += '&type=video';
      if (type === 'image') url += '&type=image';

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal
      });

      if (response.ok) {
        const data = await response.json();
        const rawPosts = Array.isArray(data) ? data : (data.posts || []);
        
        const fetchedCount = rawPosts.length;
        const newHasMore = fetchedCount === limit;
        setHasMore(newHasMore);

        if (type === 'all') {
            const mappedPosts = rawPosts.map((p: any) => mapApiPostToUI(p));
            setPosts(prev => isLoadMore ? [...prev, ...mappedPosts] : mappedPosts);
            
            setUser((prev: any) => {
                if ((prev.postsCount === 0 && mappedPosts.length > 0) || (mappedPosts.length > prev.postsCount && !hasMore)) {
                    const newCount = Math.max(prev.postsCount, mappedPosts.length);
                    updateCache({ user: { ...prev, postsCount: newCount } });
                    return { ...prev, postsCount: newCount };
                }
                return prev;
            });

            updateCache({ 
                posts: isLoadMore ? [...posts, ...mappedPosts] : mappedPosts,
                postsPage: pageNum,
                hasMorePosts: newHasMore
            });
        } else if (type === 'video') {
            const mappedVideos = rawPosts.map((p: any) => {
                const videoMedia = p.media?.find((m: any) => m.type === 'video');
                return {
                    id: p._id || p.id,
                    url: videoMedia?.url ? cleanUrl(videoMedia.url) : '',
                    thumbnail: videoMedia?.thumbnail ? cleanUrl(videoMedia.thumbnail) : '',
                    likes: p.likes || p.reactions?.length || 0,
                    comments: p.comments?.length || 0,
                    desc: p.text || ''
                };
            }).filter((v: any) => v.url);
            
            setVideos(prev => isLoadMore ? [...prev, ...mappedVideos] : mappedVideos);
            updateCache({ 
                videos: isLoadMore ? [...videos, ...mappedVideos] : mappedVideos,
                videosPage: pageNum,
                hasMoreVideos: newHasMore
            });
        } else if (type === 'image') {
            const mappedPhotos = rawPosts.flatMap((p: any) => 
                p.media?.filter((m: any) => m.type === 'image').map((m: any) => cleanUrl(m.url)) || []
            );
            
            setPhotos(prev => isLoadMore ? [...prev, ...mappedPhotos] : mappedPhotos);
            updateCache({ 
                photos: isLoadMore ? [...photos, ...mappedPhotos] : mappedPhotos,
                photosPage: pageNum,
                hasMorePhotos: newHasMore
            });
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error(`Failed to fetch ${type}`, error);
    } finally {
      if (!signal.aborted) {
        if (!isBackgroundFetch) {
            setLoadingContent(false);
        }
        setIsFetchingMore(false);
      }
    }
  }, [isMe, targetId, mapApiPostToUI, cleanUrl, posts, videos, photos, hasMore]);

  // Initial Fetch: Profile Only
  useEffect(() => {
    fetchProfile(!!cachedData);
  }, [fetchProfile]);

  // Content Fetching Logic
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Determine if we need to show loading
    const hasPostsData = activeTab === 'posts' && posts.length > 0;
    const hasVideosData = activeTab === 'videos' && videos.length > 0;
    const hasPhotosData = activeTab === 'photos' && photos.length > 0;

    let hasDataForCurrentTab = false;
    if (activeTab === 'posts') hasDataForCurrentTab = hasPostsData;
    if (activeTab === 'videos') hasDataForCurrentTab = hasVideosData;
    if (activeTab === 'photos') hasDataForCurrentTab = hasPhotosData;

    // Only set loading if NO data exists for the current tab
    if (!hasDataForCurrentTab) {
        setLoadingContent(true);
    } else {
        setLoadingContent(false);
    }

    // Always fetch latest data (background refresh if data exists, foreground load if not)
    if (activeTab === 'posts') {
        fetchContent('all', controller.signal, page, hasPostsData);
    } else if (activeTab === 'videos') {
        fetchContent('video', controller.signal, page, hasVideosData);
    } else if (activeTab === 'photos') {
        fetchContent('image', controller.signal, page, hasPhotosData);
    }

    return () => {
      controller.abort();
    };
  }, [activeTab, page]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
          if (!loadingContent && !isFetchingMore && hasMore) {
              setPage(prev => prev + 1);
          }
      }
  };

  const handleFollowToggle = async () => {
    if (isMe) return;
    const token = localStorage.getItem('token');
    
    const prevState = isFollowed;
    const newState = !prevState;
    
    setIsFollowed(newState);
    localStorage.setItem(`follow_status_${user._id}`, JSON.stringify(newState));
    updateCache({ isFollowed: newState });
    
    try {
        const method = prevState ? 'DELETE' : 'POST';
        const response = await fetch(`${API_BASE_URL}/api/v1/follow/${user._id}`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error("Follow failed");
        }
        
        const newFollowers = Math.max(0, user.followers + (newState ? 1 : -1));
        setUser((prev: any) => ({ ...prev, followers: newFollowers }));
        updateCache({ user: { ...user, followers: newFollowers } });

    } catch (e) {
        setIsFollowed(prevState);
        localStorage.setItem(`follow_status_${user._id}`, JSON.stringify(prevState));
        updateCache({ isFollowed: prevState });
    }
  };

  const startEditing = (field: string, label: string) => {
      setEditingState({ field, value: user[field] || '', label });
  };

  const cancelEditing = () => {
      setEditingState(null);
  };

  const saveEditing = async () => {
    if (!editingState) return;
  
    const { field, value } = editingState;
    const originalUser = { ...user };
  
    // 1. Optimistic Update: Update UI instantly
    const optimisticUser = { ...user, [field]: value };
    setUser(optimisticUser);
    setEditingState(null); // Close modal
  
    try {
      const token = localStorage.getItem('token');
      const payload: any = { [field]: value };
      if (field === 'bio') {
        payload.description = value;
      }
  
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
      });
  
      if (response.ok) {
          // 2. Success: Update Cache
          updateCache({ user: optimisticUser });
          
          if (isMe && field === 'name') {
              localStorage.setItem('userName', value);
          }
          // CRITICAL: Removed fetchProfile(true) here to prevent reverting to stale data
      } else {
          // Revert if server fails
          setUser(originalUser);
          alert('Failed to update profile.');
      }
    } catch (error) {
      console.error("Update failed", error);
      setUser(originalUser); // Revert
      alert('An error occurred while updating.');
    }
  };

  const saveNewSection = async () => {
    if (!newSectionTitle.trim() || !newSectionContent.trim()) return;
    setIsSavingSection(true);
    
    const tempSection = {
        id: Date.now(),
        _id: `temp-${Date.now()}`,
        title: newSectionTitle,
        content: newSectionContent
    };
    const optimisticSections = [...customSections, tempSection];
    setCustomSections(optimisticSections);
    setIsAddingSection(false);
    setNewSectionTitle('');
    setNewSectionContent('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/users/sections`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: tempSection.title, content: tempSection.content })
      });
      
      if (response.ok) {
          fetchProfile(true);
      }
    } catch (e) {
        console.error(e);
        setCustomSections(customSections); 
        alert("Failed to save section");
    } finally {
        setIsSavingSection(false);
    }
  };

  const saveSectionEdit = async () => {
    if (!editingSection || !editingSection.title.trim() || !editingSection.content.trim()) return;
    setIsSavingSectionEdit(true);
    try {
        const token = localStorage.getItem('token');
        const sectionId = editingSection._id || editingSection.id;
        
        const response = await fetch(`${API_BASE_URL}/api/v1/users/sections/${sectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: editingSection.title, content: editingSection.content })
        });

        if (response.ok) {
            const updatedSections = customSections.map(s => 
                (s.id === editingSection.id) ? editingSection : s
            );
            setCustomSections(updatedSections);
            updateCache({ customSections: updatedSections });
            setEditingSection(null);
        } else {
            alert("Failed to update section");
        }
    } catch (e) {
        console.error(e);
        alert("Error updating section");
    } finally {
        setIsSavingSectionEdit(false);
    }
  };

  const requestDeleteSection = () => {
    if (!editingSection) return;
    setDeleteModal({ isOpen: true, type: 'section', id: editingSection.id });
    setEditingSection(null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (!isMe) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(type);
    
    const optimisticUrl = URL.createObjectURL(file);
    const originalValue = user[type]; 

    const optimisticUser = { ...user, [type]: optimisticUrl };
    setUser(optimisticUser);
    
    if (type === 'cover') setIsCoverLoaded(true);
    if (type === 'avatar') setIsAvatarLoaded(true);

    const formData = new FormData();
    formData.append(type, file);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}` 
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            const updatedUserData = data.user || data.data || data;

            if (updatedUserData) {
                const updatedFields: { avatar?: string | null; cover?: string | null } = {};
                const timestamp = new Date().getTime();

                if (Object.prototype.hasOwnProperty.call(updatedUserData, 'avatar')) {
                    const clean = cleanUrl(updatedUserData.avatar);
                    updatedFields.avatar = clean ? `${clean}?v=${timestamp}` : null;
                }
                if (Object.prototype.hasOwnProperty.call(updatedUserData, 'cover')) {
                    const clean = cleanUrl(updatedUserData.cover);
                    updatedFields.cover = clean ? `${clean}?v=${timestamp}` : null;
                }

                const finalUser = { 
                    ...user, 
                    ...updatedFields
                };
                
                setUser(finalUser);
                updateCache({ user: finalUser });

                if (updatedFields.avatar && user.avatar !== updatedFields.avatar) {
                    localStorage.setItem('userAvatar', updatedFields.avatar);
                }

                setIsAvatarLoaded(true);
                setIsCoverLoaded(true);
                updateCache({ avatarLoaded: true, coverLoaded: true });
            } else {
                fetchProfile(true);
            }

        } else {
            setUser(prev => ({ ...prev, [type]: originalValue }));
            alert("Failed to upload image");
        }
    } catch (error) {
        setUser(prev => ({ ...prev, [type]: originalValue }));
        console.error("Upload error:", error);
        alert("Upload error");
    } finally {
        setUploadingImage(null);
    }
  };

  const requestDeletePost = (id: string, isShort?: boolean) => {
    if (isMe) {
      setDeleteModal({ isOpen: true, type: isShort ? 'video' : 'post', id });
    }
  };

  const requestDeleteVideo = (id: string) => {
    if (isMe) setDeleteModal({ isOpen: true, type: 'video', id });
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem('token');
    const { type, id } = deleteModal;

    try {
        if (type === 'section' && typeof id === 'number') {
             const updatedSections = customSections.filter(s => s.id !== id);
             setCustomSections(updatedSections);
             
             const section = customSections.find(s => s.id === id);
             const sectionId = section?._id || section?.id;
             
             await fetch(`${API_BASE_URL}/api/v1/users/sections/${sectionId}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` }
             });
             updateCache({ customSections: updatedSections });

        } else if (type === 'post' && typeof id === 'string') {
             const updatedPosts = posts.filter(p => p.id !== id);
             setPosts(updatedPosts);
             
             await fetch(`${API_BASE_URL}/api/v1/posts/${id}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` }
             });
             updateCache({ posts: updatedPosts });

        } else if (type === 'video' && typeof id === 'string') {
             const updatedVideos = videos.filter(v => v.id !== id);
             setVideos(updatedVideos);
             setViewingVideoIndex(null); 
             
             await fetch(`${API_BASE_URL}/api/v1/shorts/${id}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` }
             });
             updateCache({ videos: updatedVideos });
        }
    } catch (error) {
        console.error("Delete failed", error);
    } finally {
        setDeleteModal({ isOpen: false, type: null, id: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, type: null, id: null });
  };

  const handleVideoClick = (index: number) => {
    setViewingVideoIndex(index);
    setIsVideoBuffering(true);
  };

  const handleTabChange = (tab: 'posts' | 'videos' | 'photos') => {
    if (activeTab === tab) return;
    
    // Stabilize Scroll Logic
    if (containerRef.current && tabsRef.current) {
        const tabsTop = tabsRef.current.offsetTop;
        const currentScroll = containerRef.current.scrollTop;
        if (currentScroll > tabsTop) {
            containerRef.current.scrollTop = tabsTop;
        }
    }
    
    // FIX: Reset page/hasMore to avoid using stale pagination from other tabs
    setPage(1);
    setHasMore(true);
    setActiveTab(tab);
  };

  return (
    <div 
        className="fixed inset-0 z-[110] bg-white dark:bg-black animate-in slide-in-from-right duration-300 overflow-y-auto no-scrollbar"
        onScroll={handleScroll}
        ref={containerRef}
    >
      
      {/* 1. Header Background (Edge-to-Edge) */}
      <div className="relative">
        <div className="h-64 relative overflow-hidden">
            {/* Blurry Background Layer */}
            <div 
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-110"
                style={{ 
                    backgroundImage: `url(${user.avatar || 'https://via.placeholder.com/150'})`,
                    backgroundColor: '#1a1a1a' 
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white dark:to-black"></div>
            
            {/* Navigation Bar */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center text-white z-20 pt-safe">
                <button onClick={onClose} className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition-colors backdrop-blur-md">
                    <ArrowRight size={24} className={language === 'en' ? 'rotate-180' : ''} />
                </button>
                {isMe && (
                    <button 
                        onClick={() => coverInputRef.current?.click()} 
                        className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition-colors backdrop-blur-md opacity-0"
                    >
                       {/* Hidden edit cover since we use avatar blur now */}
                    </button>
                )}
            </div>
        </div>

        {/* 2. Floating Info Card (Lifted Higher per request -mt-36) */}
        <div className="relative -mt-36 z-10">
            <div className="bg-white dark:bg-gray-900 rounded-t-[30px] border-t border-gray-100 dark:border-gray-800 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pt-16 px-6 pb-6 relative flex flex-col items-center">
                
                {/* Floating Avatar */}
                <div 
                    className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full p-1 bg-white dark:bg-gray-900 shadow-md cursor-pointer group animate-in zoom-in-50 fade-in duration-500 delay-100"
                    onClick={() => isMe && !loadingProfile && avatarInputRef.current?.click()}
                >
                    <Avatar 
                        name={user.name} 
                        src={user.avatar} 
                        className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-900"
                        textClassName="text-4xl"
                    />
                    {isMe && !loadingProfile && (
                        <div className="absolute bottom-1 right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                            {uploadingImage === 'avatar' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        </div>
                    )}
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                </div>

                {/* Name & Bio */}
                <div className="text-center w-full mt-2">
                    <div className="flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-150">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                        {isMe && (
                            <button onClick={() => startEditing('name', t('profile_name'))} className="text-gray-400 hover:text-blue-600">
                                <Edit2 size={14} />
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dir-ltr font-medium mb-3 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-200">@{user.username.replace('@', '')}</p>
                    
                    {/* Bio with Inline Edit */}
                    <div className="flex items-center justify-center gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300">
                        {user.bio ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-w-xs text-center">
                                {user.bio}
                            </p>
                        ) : (
                            isMe && (
                                <button onClick={() => startEditing('bio', t('add_bio'))} className="text-sm text-blue-600 font-bold hover:underline">
                                    {t('add_bio')}
                                </button>
                            )
                        )}
                        {isMe && user.bio && (
                            <button onClick={() => startEditing('bio', t('profile_bio'))} className="text-gray-400 hover:text-blue-600">
                                <Edit2 size={14} />
                            </button>
                        )}
                    </div>

                    {/* Website / Add Link */}
                    <div className="mb-4 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300">
                        {user.website ? (
                            <div className="flex items-center justify-center gap-2">
                                <a 
                                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <LinkIcon size={12} />
                                    {user.website.replace(/^https?:\/\//, '')}
                                </a>
                                {isMe && (
                                    <button onClick={() => startEditing('website', t('profile_website'))} className="text-gray-400 hover:text-blue-600">
                                        <Edit2 size={12} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            isMe && (
                                <button 
                                    onClick={() => startEditing('website', t('profile_website'))}
                                    className="text-xs font-bold text-gray-500 hover:text-blue-600 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center gap-1 mx-auto transition-colors"
                                >
                                    <LinkIcon size={12} />
                                    <span>إضافة رابط</span>
                                </button>
                            )
                        )}
                    </div>
                    
                    {/* Action Buttons (Follow only for others) */}
                    {!isMe && (
                        <div className="flex gap-3 justify-center mb-6 w-full max-w-xs mx-auto animate-in slide-in-from-bottom-2 fade-in duration-500 delay-500">
                            <button 
                                onClick={handleFollowToggle}
                                className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                    isFollowed 
                                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
                                }`}
                            >
                                {isFollowed ? t('following') : t('follow')}
                            </button>
                        </div>
                    )}

                    {/* Stats Row */}
                    <div className="flex justify-around items-center w-full border-t border-gray-100 dark:border-gray-800 pt-4 px-2 animate-in slide-in-from-bottom-3 fade-in duration-700 delay-500">
                        <div className="flex flex-col items-center min-w-[50px]">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">{user.postsCount}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{t('profile_posts')}</span>
                        </div>
                        <div className="w-px h-8 bg-gray-100 dark:bg-gray-800"></div>
                        <div className="flex flex-col items-center min-w-[50px]">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">{user.followers}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{t('profile_followers')}</span>
                        </div>
                        <div className="w-px h-8 bg-gray-100 dark:bg-gray-800"></div>
                        <div className="flex flex-col items-center min-w-[50px]">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">{user.following}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{t('profile_following')}</span>
                        </div>
                        <div className="w-px h-8 bg-gray-100 dark:bg-gray-800"></div>
                        <div className="flex flex-col items-center min-w-[50px]">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">{user.totalLikes || 0}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{t('like')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 3. Sticky Tabs (Edge-to-Edge) - Removed About */}
      <div 
        ref={tabsRef}
        className="sticky top-0 bg-white dark:bg-gray-900 z-30 shadow-sm border-b border-gray-100 dark:border-gray-800"
      >
         <div className="flex w-full">
            {[
                { id: 'posts', label: t('profile_posts'), icon: Grid },
                { id: 'videos', label: t('profile_videos'), icon: Film },
                { id: 'photos', label: t('profile_photos'), icon: ImageIcon },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative ${
                        activeTab === tab.id 
                        ? 'text-black dark:text-white' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 w-8 h-0.5 bg-black dark:bg-white rounded-full"></div>
                    )}
                </button>
            ))}
         </div>
      </div>

      {/* 4. Content Area (Full Width) */}
      <div className="pb-20 min-h-[40vh] bg-white dark:bg-gray-900">
        
        {/* POSTS TAB */}
        {activeTab === 'posts' && (
            <div className="space-y-1 animate-in fade-in duration-300">
                {(loadingContent && posts.length === 0) ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                ) : posts.length > 0 ? (
                    <>
                        {posts.map(post => (
                            <div key={post.id} className="bg-white dark:bg-gray-900">
                                <PostCard 
                                    post={post} 
                                    variant="profile" 
                                    onDelete={isMe ? () => requestDeletePost(post.id, post.isShort) : undefined}
                                    onReport={onReport}
                                />
                                <div className="h-2 bg-gray-50 dark:bg-black w-full"></div>
                            </div>
                        ))}
                        {isFetchingMore && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>}
                    </>
                ) : (
                    !isFetchingMore && (
                        <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                            <Grid size={48} className="mb-4 opacity-30" />
                            <p>{t('profile_no_posts')}</p>
                        </div>
                    )
                )}
            </div>
        )}

        {/* VIDEOS TAB */}
        {activeTab === 'videos' && (
            <div className="grid grid-cols-3 gap-2 p-2 animate-in fade-in duration-300">
                {(loadingContent && videos.length === 0) ? (
                    <div className="col-span-3 flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                ) : videos.length > 0 ? (
                    <>
                        {videos.map((vid, idx) => (
                            <div 
                                key={vid.id} 
                                onClick={() => handleVideoClick(idx)} 
                                className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden cursor-pointer group shadow-sm"
                            >
                                <img src={vid.thumbnail} alt="" className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                                    <Play size={24} className="text-white fill-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="absolute bottom-1 left-1 right-1 flex items-end text-white">
                                    <span className="text-[10px] font-bold drop-shadow-md flex items-center gap-1"><Play size={8} fill="currentColor" /> {vid.likes}</span>
                                </div>
                            </div>
                        ))}
                        {isFetchingMore && <div className="col-span-3 flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>}
                    </>
                ) : (
                    !isFetchingMore && (
                        <div className="col-span-3 text-center py-20 text-gray-400 flex flex-col items-center">
                            <Film size={48} className="mb-4 opacity-30" />
                            <p>No videos yet</p>
                        </div>
                    )
                )}
            </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
            <div className="grid grid-cols-3 gap-0.5 animate-in fade-in duration-300">
                {(loadingContent && photos.length === 0) ? (
                    <div className="col-span-3 flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                ) : photos.length > 0 ? (
                    <>
                        {photos.map((img, idx) => (
                            <div key={idx} className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group">
                                <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            </div>
                        ))}
                        {isFetchingMore && <div className="col-span-3 flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>}
                    </>
                ) : (
                    !isFetchingMore && (
                        <div className="col-span-3 text-center py-20 text-gray-400 flex flex-col items-center">
                            <ImageIcon size={48} className="mb-4 opacity-30" />
                            <p>No photos yet</p>
                        </div>
                    )
                )}
            </div>
        )}

      </div>

      {/* --- MODALS (Edit, Add Section, etc) --- */}
      
      {editingState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Edit2 size={18} className="text-blue-600" />
                    {t('edit_field_title')} {editingState.label}
                </h3>
                <input 
                    value={editingState.value}
                    onChange={(e) => setEditingState({...editingState, value: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder={editingState.label}
                    autoFocus
                />
                <div className="flex gap-3 mt-6">
                    <button onClick={saveEditing} className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-sm hover:opacity-90">{t('save')}</button>
                    <button onClick={cancelEditing} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-sm">{t('cancel')}</button>
                </div>
            </div>
        </div>
      )}

      {isAddingSection && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('add_new_section')}</h3>
                <div className="space-y-3">
                    <input type="text" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm font-bold" placeholder={t('section_title_label')} />
                    <textarea value={newSectionContent} onChange={(e) => setNewSectionContent(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm font-medium min-h-[100px] resize-none" placeholder={t('section_content_label')} />
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={saveNewSection} className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-sm">{t('save')}</button>
                    <button onClick={() => setIsAddingSection(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-sm">{t('cancel')}</button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteModal.isOpen && (
           <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center gap-4 pt-2">
                   <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-1"><Trash2 size={32} className="text-red-500" /></div>
                   <div><h3 className="text-xl font-black text-gray-900 mb-2">{t('delete')}?</h3><p className="text-gray-500 text-sm font-medium">{t('confirm')}</p></div>
                   <div className="flex gap-3 w-full mt-2">
                      <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-200">{t('yes')}</button>
                      <button onClick={cancelDelete} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">{t('no')}</button>
                   </div>
                </div>
             </div>
           </div>
      )}

      {/* Video Player Overlay */}
      {viewingVideoIndex !== null && (
            <div className="fixed inset-0 z-[200] bg-black flex flex-col justify-center items-center animate-in zoom-in-95 duration-200">
                <button onClick={() => setViewingVideoIndex(null)} className="absolute top-safe top-4 left-4 z-20 p-2 bg-black/40 rounded-full text-white backdrop-blur-md"><X size={24} /></button>
                {isMe && <button onClick={() => setDeleteModal({isOpen: true, type: 'video', id: videos[viewingVideoIndex].id})} className="absolute top-safe top-4 right-4 z-20 p-2 bg-red-600/80 rounded-full text-white backdrop-blur-md"><Trash2 size={20} /></button>}
                <div className="relative w-full h-full flex items-center justify-center">
                    <video
                        src={videos[viewingVideoIndex].url}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        playsInline
                        onLoadStart={() => setIsVideoBuffering(true)}
                        onWaiting={() => setIsVideoBuffering(true)}
                        onPlaying={() => setIsVideoBuffering(false)}
                        onLoadedData={() => setIsVideoBuffering(false)}
                    />
                    {isVideoBuffering && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><Loader2 size={48} className="text-white animate-spin drop-shadow-md" /></div>}
                </div>
            </div>
      )}

    </div>
  );
};

export default ProfileView;
