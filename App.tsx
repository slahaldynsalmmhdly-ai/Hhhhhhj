

import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import CreatePostBar from './components/CreatePostBar';
import Stories from './components/Stories';
import PostCard from './components/PostCard';
import BottomNav from './components/BottomNav';
import CreatePostModal from './components/CreatePostModal';
import CreateShortFlow from './components/CreateShortFlow';
import CreateStoryModal from './components/CreateStoryModal';
import ReportModal from './components/ReportModal';
import LocationDrawer from './components/LocationDrawer';
import JobsView from './components/JobsView';
import HarajView from './components/HarajView';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import ProfileView from './components/ProfileView';
import ShortsCarousel from './components/ShortsCarousel';
import ShortsView from './components/ShortsView';
import LoginPage from './components/LoginPage';
import SuggestedList, { SuggestedItem } from './components/SuggestedList';
import SuggestedUsersView from './components/SuggestedUsersView';
import PostDetailView from './components/PostDetailView';
import VideoDetailView from './components/VideoDetailView';
import VideoUploadIndicator from './components/VideoUploadIndicator';
import PostUploadIndicator from './components/PostUploadIndicator';
import { Post } from './types';
import { API_BASE_URL } from './constants';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  // App State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateShortFlowOpen, setIsCreateShortFlowOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Dark Mode State - Read directly from localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Ensure we read the string 'true' correctly
    return localStorage.getItem('darkMode') === 'true';
  });

  // Apply Dark Mode Class
  useEffect(() => {
    const metaThemeColor = document.getElementById('theme-color-meta');
    const html = document.documentElement;
    
    if (isDarkMode) {
      html.classList.add('dark');
      // Enforce background color via JS to match CSS
      html.style.backgroundColor = '#000000'; 
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
    } else {
      html.classList.remove('dark');
      html.style.backgroundColor = '#f3f4f6';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f3f4f6');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  // Enhanced Toggle Function - Stops all transitions during switch
  const toggleDarkMode = () => {
    // 1. Add class to kill all transitions immediately
    document.documentElement.classList.add('disable-transitions');
    
    // 2. Toggle the state/class
    setIsDarkMode(prev => !prev);
    
    // 3. Force browser reflow, then remove the killer class
    // This ensures the new colors are painted instantly in one frame
    window.setTimeout(() => {
      document.documentElement.classList.remove('disable-transitions');
    }, 0);
  };
  
  // Profile State: null = closed, 'me' = current user (edit mode), 'id' = other user (view mode)
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const [initialShortId, setInitialShortId] = useState<string | null>(null);
  const [initialShortsFilter, setInitialShortsFilter] = useState<'forYou' | 'haraj' | 'jobs'>('forYou');
  
  // Notification State
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Suggested View State (New)
  // We keep 'company' or 'person' to know which tab to open initially
  const [suggestedViewType, setSuggestedViewType] = useState<'company' | 'person' | null>(null);

  // Detail Views State (Notification Clicks)
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  // Story Refresh Key
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(0);

  // Report State
  const [reportData, setReportData] = useState<{
    isOpen: boolean;
    type: 'post' | 'comment' | 'reply' | 'video';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'post', id: '', name: '' });
  const [isReporting, setIsReporting] = useState(false);

  // Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedItem[]>([]);
  const [suggestedCompanies, setSuggestedCompanies] = useState<SuggestedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pending Post State (For Text/Image Posts)
  const [pendingPost, setPendingPost] = useState<Post | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'publishing' | 'success'>('publishing');

  // Video Upload State (For Shorts - TikTok Style)
  const [videoUploadState, setVideoUploadState] = useState<{
    isActive: boolean;
    status: 'compressing' | 'uploading' | 'success';
    progress: number;
    thumbnail: string | null;
  }>({ isActive: false, status: 'compressing', progress: 0, thumbnail: null });

  // Location State
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ country: string; city: string | null }>({
    country: 'عام',
    city: null
  });

  const handleLocationSelect = (country: string, city: string | null) => {
    setCurrentLocation({ country, city });
  };

  const handleSetActiveTab = (newTab: string) => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);
  };

  const handleOpenProfile = (userId: string | null = null) => {
    // If null is passed, it means "My Profile" (via settings)
    // If ID is passed, it means "Other User Profile"
    setViewingProfileId(userId || 'me');
  };

  const handleReport = (type: 'post' | 'comment' | 'reply' | 'video', id: string, name: string) => {
    setReportData({ isOpen: true, type, id, name });
  };

  const handleSubmitReport = async (reason: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("يرجى تسجيل الدخول للإبلاغ.");
        return;
    }

    setIsReporting(true);
    try {
        const payload = {
            reportType: reportData.type,
            targetId: reportData.id,
            reason: reason,
            details: reason,
            media: [],
            loadingDate: null,
            unloadingDate: null
        };

        const response = await fetch(`${API_BASE_URL}/api/v1/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(t('post_report_success'));
            setReportData(prev => ({ ...prev, isOpen: false }));
        } else {
            const errorText = await response.text();
            console.error("Report failed:", errorText);
            alert("فشل إرسال البلاغ. يرجى المحاولة مرة أخرى.");
        }
    } catch (error) {
        console.error("Report error:", error);
        alert("حدث خطأ في الاتصال. يرجى التحقق من الإنترنت.");
    } finally {
        setIsReporting(false);
    }
  };

  const mapApiPostToUI = (apiPost: any): Post => {
    let locationString = 'عام';
    if (apiPost.scope === 'local' && apiPost.country) {
      locationString = apiPost.city && apiPost.city !== 'كل المدن' 
        ? `${apiPost.country} | ${apiPost.city}` 
        : apiPost.country;
    }

    const currentUserId = localStorage.getItem('userId');
    const postId = apiPost._id || apiPost.id;

    const reactions = Array.isArray(apiPost.reactions) ? apiPost.reactions : [];
    const likesCount = reactions.filter((r: any) => !r.type || r.type === 'like').length;

    const isLiked = reactions.some((r: any) => {
        const reactionUserId = r.user?._id || r.user || r;
        return currentUserId && reactionUserId && String(reactionUserId) === String(currentUserId);
    });

    return {
      id: postId || Math.random().toString(36).substr(2, 9),
      _id: apiPost._id,
      user: {
        id: apiPost.user?._id || 'u_unknown',
        _id: apiPost.user?._id, 
        name: apiPost.user?.name || 'مستخدم', 
        avatar: apiPost.user?.avatar ? (apiPost.user.avatar.startsWith('http') ? apiPost.user.avatar : `${API_BASE_URL}${apiPost.user.avatar}`) : null, 
      },
      timeAgo: apiPost.createdAt ? new Date(apiPost.createdAt).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' }) : 'منذ لحظات',
      content: apiPost.text || '',
      image: apiPost.media && apiPost.media.length > 0 
        ? (apiPost.media[0].url.startsWith('http') 
            ? apiPost.media[0].url 
            : `${API_BASE_URL}${apiPost.media[0].url}`)
        : undefined,
      likes: likesCount,
      comments: apiPost.comments?.length || 0,
      shares: apiPost.shares?.length || 0,
      title: apiPost.title || undefined,
      type: apiPost.type || undefined,
      location: locationString,
      category: apiPost.category,
      isPremium: apiPost.isPremium,
      contactPhone: apiPost.contactPhone || '',
      contactEmail: apiPost.contactEmail || '',
      contactMethods: apiPost.contactMethods || [],
      isLiked: isLiked,
      reactions: reactions,
      isShort: apiPost.isShort || false,
    };
  };
  
  const mapApiUserToSuggestedItem = (apiUser: any): SuggestedItem => ({
    id: apiUser._id,
    name: apiUser.name,
    subtitle: apiUser.email || 'مستخدم جديد',
    avatar: apiUser.avatar ? (apiUser.avatar.startsWith('http') ? apiUser.avatar : `${API_BASE_URL}${apiUser.avatar}`) : null,
  });

  // Helper for actual file upload
  const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
  
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
  
    if (!response.ok) {
      throw new Error('File upload failed');
    }
  
    const result = await response.json();
    return result.files;
  };

  const handlePostSubmit = async (postPayload: any) => {
    // Check if this is a VIDEO SHORT upload (Background Process)
    if (postPayload.isShort && postPayload.rawVideoFile) {
        
        // 1. Close Modal & Nav to Home IMMEDIATELY
        setIsCreateShortFlowOpen(false);
        setActiveTab('home');

        // 2. Initialize Overlay State
        // Generate preview URL for the indicator
        const previewThumb = postPayload.rawCoverFile 
            ? URL.createObjectURL(postPayload.rawCoverFile) 
            : null;

        setVideoUploadState({
            isActive: true,
            status: 'compressing',
            progress: 0,
            thumbnail: previewThumb
        });

        // 3. Start Background Process
        const performBackgroundShortUpload = async () => {
             try {
                // Phase 1: Simulated Compression/Preparation (2 seconds)
                // Spin the loader
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Change status to uploading
                setVideoUploadState(prev => ({ ...prev, status: 'uploading', progress: 5 }));

                // Phase 2: Upload Files (Real + Simulated Progress)
                const filesToUpload: File[] = [postPayload.rawVideoFile];
                if (postPayload.rawCoverFile) {
                   filesToUpload.push(postPayload.rawCoverFile);
                }

                // Start simulated progress interval
                const interval = setInterval(() => {
                    setVideoUploadState(prev => {
                       if (prev.progress >= 90) return prev; // Hold at 90 until real finish
                       return { ...prev, progress: prev.progress + (Math.random() * 5) };
                    });
                }, 300);

                // Real Upload Call
                const uploadedFiles = await uploadFiles(filesToUpload);

                // Stop simulation
                clearInterval(interval);
                setVideoUploadState(prev => ({ ...prev, progress: 100 }));

                const videoUploadResult = uploadedFiles.find((f: any) => f.fileType === 'video');
                const coverUploadResult = uploadedFiles.find((f: any) => f.fileType === 'image');

                if (!videoUploadResult) throw new Error("Video upload missing");

                // Prepare Final API Payload
                const finalPayload = {
                    ...postPayload,
                    media: [{ 
                        url: videoUploadResult.filePath, 
                        type: 'video',
                        thumbnail: coverUploadResult ? coverUploadResult.filePath : null
                    }],
                    // Send overlays metadata
                    overlays: postPayload.videoOverlays,
                    // Remove raw files from payload sent to create post
                    rawVideoFile: undefined,
                    rawCoverFile: undefined,
                    tempVideoUrl: undefined
                };

                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(finalPayload)
                });

                if (response.ok) {
                    setVideoUploadState(prev => ({ ...prev, status: 'success' }));
                    // Hide after 3 seconds
                    setTimeout(() => {
                        setVideoUploadState(prev => ({ ...prev, isActive: false }));
                    }, 4000); // 1s fade out + delay
                } else {
                    throw new Error("API Creation Failed");
                }

             } catch (error) {
                 console.error("Background Upload Failed", error);
                 alert("فشل رفع الفيديو. يرجى المحاولة مرة أخرى.");
                 setVideoUploadState(prev => ({ ...prev, isActive: false }));
             }
        };

        performBackgroundShortUpload();
        return; 
    }

    // --- NORMAL TEXT/IMAGE POST LOGIC ---
    const storedName = localStorage.getItem('userName') || 'مستخدم';
    const storedAvatar = localStorage.getItem('userAvatar');
    const formattedAvatar = storedAvatar 
        ? (storedAvatar.startsWith('http') ? storedAvatar : `${API_BASE_URL}${storedAvatar}`) 
        : '';

    // Create optimistic post for UI immediately
    const tempPost: Post = {
        id: 'temp-pending',
        user: {
            id: localStorage.getItem('userId') || 'me',
            _id: localStorage.getItem('userId') || 'me',
            name: storedName, 
            avatar: formattedAvatar || undefined
        },
        timeAgo: 'الآن',
        content: postPayload.text || '',
        likes: 0, 
        comments: 0, 
        shares: 0,
        // Use preview from raw file if available, otherwise existing url
        image: postPayload.rawMedia && postPayload.rawMedia.length > 0 
            ? URL.createObjectURL(postPayload.rawMedia[0]) 
            : (postPayload.media && postPayload.media.length > 0 ? postPayload.media[0].url : undefined)
    };

    setPendingPost(tempPost);         
    setPendingStatus('publishing');   
    setIsCreateModalOpen(false);      
    setActiveTab('home');             
    
    // Background Process
    const performBackgroundUpload = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setPendingPost(null);
        alert("يجب عليك تسجيل الدخول أولاً.");
        return;
      }
    
      try {
        let finalPayload = { ...postPayload };

        // 1. If there are raw files, upload them first
        if (finalPayload.rawMedia && finalPayload.rawMedia.length > 0) {
            const uploadedFiles = await uploadFiles(finalPayload.rawMedia);
            // Transform result to match media format { url, type }
            finalPayload.media = uploadedFiles.map((f: any) => ({
                url: f.filePath,
                type: f.fileType
            }));
            // Remove raw file reference
            delete finalPayload.rawMedia;
        }

        // 2. Submit the post
        const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(finalPayload)
        });
    
        if (response.ok) {
          const createdPost = await response.json();
          // const newPost = mapApiPostToUI(createdPost); 
          setPendingStatus('success');
          setTimeout(() => {
              // Note: We do NOT add the new post to the feed because user requested:
              // "لا تظهر منشوراتي ابدا" (My posts should never appear in the main feed)
              setPendingPost(null);
          }, 3000); 
        } else {
          setPendingPost(null); 
          alert("فشل نشر المنشور، يرجى المحاولة مرة أخرى.");
        }
      } catch (error) {
        setPendingPost(null); 
        console.error(error);
        alert("حدث خطأ أثناء الاتصال.");
      }
    };

    performBackgroundUpload();
  };

  const handleStoryPost = () => {
    setStoriesRefreshKey(prev => prev + 1);
  };

  // --- Fetch Unread Notifications ---
  // Define this outside useEffect so we can call it when closing the modal too
  const fetchUnreadCount = async () => {
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId');
    if (!token || !currentUserId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Filter unread and not from self
          const count = data.filter((n: any) => {
             const senderId = n.sender._id || n.sender.id;
             return !n.isRead && String(senderId) !== String(currentUserId);
          }).length;
          setUnreadNotificationsCount(count);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notification count");
    }
  };

  // Initial fetch and interval
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    // Optimistic reset, but we will re-fetch on close to be sure
    setUnreadNotificationsCount(0);
  };

  // Re-fetch counts when notification drawer closes to ensure sync with server
  // (e.g. if user didn't read all of them)
  const handleCloseNotifications = () => {
    setIsNotificationsOpen(false);
    fetchUnreadCount();
  };

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        const countryParam = currentLocation.country === 'عام' ? '' : encodeURIComponent(currentLocation.country);
        const cityParam = currentLocation.city ? encodeURIComponent(currentLocation.city) : '';
        const postsUrl = `${API_BASE_URL}/api/v1/posts?country=${countryParam}&city=${cityParam}`;

        const postsRes = await fetch(postsUrl, { headers });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const postsArray = postsData.posts || postsData;

          if (Array.isArray(postsArray) && postsArray.length > 0) {
            const currentUserId = localStorage.getItem('userId');
            
            // 1. Filter out shorts
            // 2. Filter out MY OWN posts
            // 3. Map to UI
            // 4. Sort: Premium first
            const feedPosts = postsArray
                .filter((p: any) => !p.isShort)
                .map(mapApiPostToUI)
                .filter((post: Post) => post.user._id !== currentUserId)
                .sort((a: Post, b: Post) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0));

            setPosts(feedPosts);
          } else {
             setPosts([]);
          }
        } else {
            console.warn("API request for posts failed");
            if (postsRes.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('userId'); 
              setToken(null);
            }
            setPosts([]);
        }

        // Updated fetch URL with limit=1000 to retrieve all companies
        const usersRes = await fetch(`${API_BASE_URL}/api/v1/users?limit=1000`, { headers });
        if(usersRes.ok) {
          const responseData = await usersRes.json();
          if (responseData.users && Array.isArray(responseData.users)) {
            setSuggestedPeople(
              responseData.users.filter((u: any) => u.userType === 'individual').map(mapApiUserToSuggestedItem)
            );
            setSuggestedCompanies(
              responseData.users.filter((u: any) => u.userType === 'company').map(mapApiUserToSuggestedItem)
            );
          }
        }

      } catch (error) {
        console.error("Failed to fetch data", error);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, currentLocation]);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userAvatar');
    setToken(null);
    setIsSettingsOpen(false);
  };

  const handleShortClick = (shortId: string, filter: 'forYou' | 'haraj' | 'jobs' = 'forYou') => {
    setInitialShortId(shortId);
    setInitialShortsFilter(filter);
    handleSetActiveTab('shorts');
  };

  const onViewedInitialShort = () => {
  };

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-black max-w-md mx-auto shadow-2xl overflow-hidden relative transition-colors duration-200">
      
      {/* Video Upload Indicator (TikTok Style) - LEFT */}
      {videoUploadState.isActive && (
        <VideoUploadIndicator 
            status={videoUploadState.status} 
            progress={videoUploadState.progress}
            thumbnail={videoUploadState.thumbnail}
        />
      )}

      {/* Post Upload Indicator (Light Theme) - RIGHT */}
      {pendingPost && !pendingPost.isShort && (
         <PostUploadIndicator 
             status={pendingStatus}
             contentPreview={pendingPost.content}
             imagePreview={pendingPost.image}
         />
      )}

      {isCreateModalOpen && (
        <CreatePostModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onPostSubmit={handlePostSubmit}
        />
      )}

      {isCreateShortFlowOpen && (
        <CreateShortFlow
          onClose={() => setIsCreateShortFlowOpen(false)}
          onPostSubmit={handlePostSubmit}
        />
      )}

      {isCreateStoryOpen && (
        <CreateStoryModal 
          onClose={() => setIsCreateStoryOpen(false)}
          onPost={handleStoryPost}
        />
      )}
      
      <ReportModal 
         isOpen={reportData.isOpen}
         onClose={() => setReportData(prev => ({ ...prev, isOpen: false }))}
         onSubmit={handleSubmitReport}
         targetName={reportData.name}
         targetType={reportData.type}
         isSubmitting={isReporting}
      />

      {isLocationDrawerOpen && (
        <LocationDrawer 
          onClose={() => setIsLocationDrawerOpen(false)} 
          onSelect={handleLocationSelect}
        />
      )}

      {/* ProfileView - Opens for 'me' or specific User ID */}
      {viewingProfileId && (
        <ProfileView 
          userId={viewingProfileId === 'me' ? undefined : viewingProfileId}
          onClose={() => setViewingProfileId(null)} 
          onReport={handleReport} 
        />
      )}

      {isSettingsOpen && (
        <SettingsView 
          onClose={() => setIsSettingsOpen(false)} 
          onProfileClick={() => handleOpenProfile('me')}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {/* Suggested Users Full View (Updated) */}
      {suggestedViewType && (
        <SuggestedUsersView 
          initialTab={suggestedViewType === 'company' ? 'companies' : 'individuals'}
          people={suggestedPeople}
          companies={suggestedCompanies}
          onBack={() => setSuggestedViewType(null)}
          isLoading={isLoading}
          onProfileClick={handleOpenProfile}
        />
      )}

      {/* Notifications View */}
      {isNotificationsOpen && (
        <div className="absolute inset-0 z-50 bg-white">
          <NotificationsView 
            onClose={handleCloseNotifications} 
            onNotificationClick={(notif) => setSelectedNotification(notif)}
            onProfileClick={handleOpenProfile}
          />
        </div>
      )}

      {/* Detail Views Overlay (triggered by notification click) */}
      {selectedNotification && selectedNotification.category === 'post' && (
         <PostDetailView 
            notification={selectedNotification} 
            onBack={() => setSelectedNotification(null)} 
         />
      )}
      
      {selectedNotification && selectedNotification.category === 'video' && (
         <VideoDetailView 
            notification={selectedNotification} 
            onBack={() => setSelectedNotification(null)} 
         />
      )}
      
      <div className="flex flex-col h-screen">
        
        <main className={`flex-1 overflow-hidden relative`}>
            
          <div className={`view ${activeTab === 'home' ? 'active' : ''}`}>
            <div className={`h-full overflow-y-auto no-scrollbar ${!isFullScreen ? 'pb-20' : ''}`}>
              {!isFullScreen && (
                <div className="bg-white shadow-sm mb-2">
                  <Header 
                    currentLocation={currentLocation} 
                    onLocationClick={() => setIsLocationDrawerOpen(true)} 
                    onNotificationsClick={handleOpenNotifications}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    onDiscoveryClick={() => setSuggestedViewType('company')}
                    unreadCount={unreadNotificationsCount}
                  />
                  <CreatePostBar onOpen={() => setIsCreateModalOpen(true)} />
                </div>
              )}
              
              <Stories 
                onCreateStory={() => setIsCreateStoryOpen(true)} 
                refreshKey={storiesRefreshKey}
              />
              
              {isLoading ? (
                <div className="flex flex-col mt-2">
                  {[1, 2, 3].map((i) => (
                    // Full width container
                    <div key={i} className="bg-white mb-3 shadow-sm py-4 px-4 relative overflow-hidden">
                      
                      {/* Pulse Animation Wrapper */}
                      <div className="animate-pulse flex flex-col gap-4">
                        
                        {/* Header: Avatar + Lines */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-2.5 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-2 bg-gray-100 rounded w-1/6"></div>
                          </div>
                        </div>

                        {/* Text Lines: Wavy Gradient Effect */}
                        <div className="space-y-3 pt-2">
                          <div className="h-2.5 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full w-full"></div>
                          <div className="h-2.5 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full w-[95%]"></div>
                          <div className="h-2.5 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full w-[90%]"></div>
                          <div className="h-2.5 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full w-[60%]"></div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1 mt-2">
                    {/* First 2 posts */}
                    {posts.slice(0, 2).map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onReport={handleReport}
                            onProfileClick={handleOpenProfile} 
                        />
                    ))}

                    {/* SECTION 1: Shorts For You (Original) */}
                    {posts.length > 1 && (
                        <ShortsCarousel onShortClick={(id) => handleShortClick(id, 'forYou')} title={t('shorts_for_you')} filterType="forYou" />
                    )}

                    {suggestedCompanies.length > 0 && posts.length > 1 && (
                      <SuggestedList 
                        title={t('suggested_companies')} 
                        items={suggestedCompanies} 
                        type="company" 
                        onShowAll={() => setSuggestedViewType('company')}
                        onProfileClick={handleOpenProfile}
                      />
                    )}

                    {/* Next 2 posts (indices 2, 3) */}
                    {posts.slice(2, 4).map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onReport={handleReport}
                            onProfileClick={handleOpenProfile} 
                        />
                    ))}
                    
                    {/* SECTION 2: Jobs Shorts (New) */}
                    {posts.length > 3 && (
                        <ShortsCarousel onShortClick={(id) => handleShortClick(id, 'jobs')} title={t('shorts_jobs')} filterType="jobs" />
                    )}
                    
                    {/* Next 2 posts (indices 4, 5) */}
                    {posts.slice(4, 6).map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onReport={handleReport}
                            onProfileClick={handleOpenProfile} 
                        />
                    ))}

                    {/* SECTION 3: Haraj Shorts (New) */}
                    {posts.length > 5 && (
                        <ShortsCarousel onShortClick={(id) => handleShortClick(id, 'haraj')} title={t('shorts_haraj')} filterType="haraj" />
                    )}

                    {suggestedPeople.length > 0 && posts.length > 6 && (
                      <SuggestedList 
                        title={t('suggested_people')} 
                        items={suggestedPeople} 
                        type="person" 
                        onShowAll={() => setSuggestedViewType('person')}
                        onProfileClick={handleOpenProfile}
                      />
                    )}

                    {/* Remaining posts */}
                    {posts.slice(6).map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onReport={handleReport}
                            onProfileClick={handleOpenProfile} 
                        />
                    ))}
                  </div>

                  {posts.length > 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      <p>{t('no_more_posts')}</p>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                       <p>{t('no_posts_home')}</p>
                       <button onClick={() => setIsCreateModalOpen(true)} className="mt-4 text-blue-600 font-bold text-sm">{t('be_first_post')}</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

           <div className={`view ${activeTab === 'jobs' ? 'active' : ''}`}>
             <div className={`h-full overflow-y-auto no-scrollbar ${!isFullScreen ? 'pb-20' : ''}`}>
               <JobsView 
                 onFullScreenToggle={setIsFullScreen} 
                 currentLocation={currentLocation} 
                 onLocationClick={() => setIsLocationDrawerOpen(true)}
                 onReport={handleReport}
                 onProfileClick={handleOpenProfile}
               />
             </div>
          </div>

          <div className={`view ${activeTab === 'haraj' ? 'active' : ''}`}>
             <div className={`h-full overflow-y-auto no-scrollbar ${!isFullScreen ? 'pb-20' : ''}`}>
              <HarajView 
                onFullScreenToggle={setIsFullScreen} 
                currentLocation={currentLocation} 
                onLocationClick={() => setIsLocationDrawerOpen(true)}
                onReport={handleReport}
                onProfileClick={handleOpenProfile}
              />
            </div>
          </div>

          <div 
             className={`view ${activeTab === 'shorts' ? 'active' : ''}`}
             style={{ backgroundColor: 'black', zIndex: activeTab === 'shorts' ? 50 : 0 }} 
          >
              <div className={`h-full overflow-hidden`}>
                <ShortsView 
                    key={initialShortId ? `short-${initialShortId}` : 'shorts-feed'}
                    initialShortId={initialShortId} 
                    initialCategory={initialShortsFilter}
                    onViewedInitialShort={onViewedInitialShort} 
                    isActive={activeTab === 'shorts'}
                    onReport={handleReport}
                    onProfileClick={handleOpenProfile}
                />
              </div>
          </div>

        </main>

        {!isFullScreen && !isSettingsOpen && !viewingProfileId && !isNotificationsOpen && !selectedNotification && !suggestedViewType && (
          <BottomNav 
            activeTab={activeTab} 
            setActiveTab={handleSetActiveTab} 
            onOpenCreate={() => setIsCreateShortFlowOpen(true)} 
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;