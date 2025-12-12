
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Briefcase, Users, ChevronLeft, X, ArrowRight, MapPin, Loader2, Megaphone
} from 'lucide-react';
import PostCard from './PostCard';
import { Post } from '../types';
import { JOB_CATEGORIES } from '../data/categories';
import { API_BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface JobsViewProps {
  onFullScreenToggle: (isFull: boolean) => void;
  currentLocation: { country: string; city: string | null };
  onLocationClick: () => void;
  onReport: (type: 'post' | 'comment' | 'reply', id: string, name: string) => void;
  onProfileClick?: (userId: string) => void;
}

const JobsView: React.FC<JobsViewProps> = ({ onFullScreenToggle, currentLocation, onLocationClick, onReport, onProfileClick }) => {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeSubPage, setActiveSubPage] = useState<{ type: 'seeker' | 'employer', category: string } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubPageSelect = (type: 'seeker' | 'employer') => {
    if (selectedCategory) {
      setLoading(true); // Start loading immediately to prevent flash
      setActiveSubPage({ type, category: selectedCategory });
      setSelectedCategory(null); // Close modal
      onFullScreenToggle(true); // Hide bottom nav
    }
  };

  const handleBack = () => {
    setActiveSubPage(null);
    onFullScreenToggle(false);
    setPosts([]);
  };

  const getLocationLabel = () => {
    if (currentLocation.country === 'عام') return t('location_general');
    if (currentLocation.city && currentLocation.city !== 'كل المدن') return `${currentLocation.country} | ${currentLocation.city}`;
    return currentLocation.country;
  };

  // Fetch posts when subpage or location is active
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId');

    if (activeSubPage && token) {
      // Note: loading is already set to true in handleSubPageSelect for initial load
      setLoading(true);

      const countryParam = currentLocation.country === 'عام' ? '' : encodeURIComponent(currentLocation.country);
      const cityParam = currentLocation.city ? encodeURIComponent(currentLocation.city) : '';
      const postTypeValue = activeSubPage.type === 'seeker' ? 'ابحث عن وظيفة' : 'ابحث عن موظفين';
      const url = `${API_BASE_URL}/api/v1/posts?category=${encodeURIComponent(activeSubPage.category)}&postType=${encodeURIComponent(postTypeValue)}&country=${countryParam}&city=${cityParam}`;
      
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then(data => {
            const postsArray = data.posts || [];
            if (Array.isArray(postsArray) && postsArray.length > 0) {
                // Filter out current user's posts BEFORE mapping
                const filteredPosts = postsArray.filter((p: any) => {
                    const postUserId = p.user?._id || p.user?.id || p.user;
                    return postUserId !== currentUserId;
                });

                const mappedPosts: Post[] = filteredPosts.map((p: any) => {
                    let locationString = t('location_general');
                    if (p.scope === 'local' && p.country) {
                      locationString = p.city && p.city !== 'كل المدن' ? `${p.country} | ${p.city}` : p.country;
                    }

                    const reactions = p.reactions || [];
                    const likesCount = reactions.filter((r: any) => !r.type || r.type === 'like').length;

                    return {
                        id: p._id || p.id || Math.random().toString(),
                        user: {
                            id: p.user?._id || 'u_j',
                            _id: p.user?._id, // Map _id explicitly
                            name: p.user?.name || 'معلن وظائف',
                            avatar: p.user?.avatar ? (p.user.avatar.startsWith('http') ? p.user.avatar : `${API_BASE_URL}${p.user.avatar}`) : null,
                        },
                        timeAgo: p.createdAt ? new Date(p.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '',
                        content: p.text || '',
                        image: p.media && p.media.length > 0 
                            ? (p.media[0].url.startsWith('http') 
                                ? p.media[0].url 
                                : `${API_BASE_URL}${p.media[0].url}`)
                            : undefined,
                        likes: likesCount,
                        comments: p.comments?.length || 0,
                        shares: p.shares?.length || 0,
                        title: p.title || undefined,
                        type: p.type || undefined,
                        location: locationString,
                        category: p.category,
                        isPremium: p.isPremium,
                        contactPhone: p.contactPhone || '',
                        contactEmail: p.contactEmail || '',
                        contactMethods: p.contactMethods || [],
                        isLiked: reactions.some((r: any) => (r.user?._id || r.user) === currentUserId),
                        reactions: reactions,
                    };
                });
                
                // Sort: Premium posts first
                mappedPosts.sort((a, b) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0));
                setPosts(mappedPosts);
            } else {
              setPosts([]);
            }
        })
        .catch(err => {
          console.error(err);
          setPosts([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeSubPage, currentLocation, language, t]);

  // Find current job object to get its icon
  const currentJobData = activeSubPage 
    ? JOB_CATEGORIES.find(j => j.name === activeSubPage.category) 
    : null;
  const JobIcon = currentJobData ? currentJobData.icon : Briefcase;

  if (activeSubPage) {
    return (
      <div className="bg-[#f0f2f5] dark:bg-black min-h-screen">
         {/* Sticky Sub-page Header with Icon */}
         <div className="sticky top-0 z-50 bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800 shadow-sm">
           <div className="px-4 py-3 flex items-center justify-between">
              {/* Right Side */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleBack}
                  className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowRight size={24} className={language === 'en' ? 'rotate-180' : ''} />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${currentJobData?.bg || 'bg-gray-100'}`}>
                    <JobIcon size={20} className={currentJobData?.color || 'text-gray-600'} />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-gray-800 dark:text-white">
                      {/* SWAPPED TITLES IN HEADER */}
                      {activeSubPage.type === 'seeker' ? t('jobs_employer') : t('jobs_seeker')}
                    </h2>
                    <p className="text-[10px] text-gray-500">
                      {t(activeSubPage.category)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Left Side (Location) */}
              <button 
                onClick={onLocationClick}
                className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 py-1.5 px-3 rounded-full transition-colors border border-gray-100"
              >
                <MapPin size={14} className="text-purple-600" />
                <span className="text-[10px] font-bold text-gray-700 truncate max-w-[100px]">
                  {getLocationLabel()}
                </span>
              </button>
            </div>
        </div>

        {/* Listings using PostCard with Spacing */}
        <div className="flex flex-col gap-3 pb-10 pt-2 min-h-[80vh]">
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                   <Loader2 size={40} className="text-purple-600 animate-spin" />
                </div>
            ) : posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard key={post.id} post={post} onReport={onReport} onProfileClick={onProfileClick} />
                ))
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100 shadow-sm relative">
                       <Megaphone size={40} className="text-purple-500" strokeWidth={1.5} />
                       <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                         <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white">
                            <span className="text-lg font-bold leading-none mb-0.5">+</span>
                         </div>
                       </div>
                    </div>
                    <div className="text-center px-6">
                       <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200 mb-2">{t('jobs_empty')}</h3>
                       <p className="text-gray-500 text-sm max-w-[240px] mx-auto leading-relaxed">
                          {t('be_first_to_post')} {t(activeSubPage.category)}
                       </p>
                    </div>
                </div>
            )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      
      {/* Custom Header */}
      <div className="bg-white dark:bg-[#121212] sticky top-0 z-10 shadow-sm border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-l from-purple-50 to-white dark:from-gray-900 dark:to-black">
           <div className="flex items-center gap-3">
             <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl">
               <Briefcase size={24} className="text-purple-600 dark:text-purple-400" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('nav_jobs')}</h2>
               <p className="text-[10px] text-gray-500 font-medium">{t('jobs_subtitle')}</p>
             </div>
           </div>
           
           <button 
              onClick={onLocationClick}
              className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 py-1.5 px-3 rounded-full transition-colors border border-gray-100 dark:border-gray-700 shadow-sm"
            >
              <MapPin size={14} className="text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                {getLocationLabel()}
              </span>
           </button>
        </div>
      </div>

      {/* Categories List with Hairline Spacing */}
      <div className="flex flex-col gap-[1px] bg-gray-100 dark:bg-gray-800 mt-1">
        {JOB_CATEGORIES.map((cat, idx) => (
          <div 
            key={idx}
            onClick={() => setSelectedCategory(cat.name)}
            className="flex items-center justify-between p-3 bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-gray-900 active:bg-gray-100 cursor-pointer transition-colors"
          >
            {/* Right Side: Icon & Text */}
            <div className="flex items-center gap-3">
              <div className={`${cat.bg} p-2 rounded-lg shadow-sm dark:opacity-80`}>
                <cat.icon size={20} className={cat.color} />
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t(cat.name)}</span>
            </div>

            {/* Left Side: Arrow */}
            <ChevronLeft size={18} className={`text-gray-300 ${language === 'en' ? 'rotate-180' : ''}`} />
          </div>
        ))}
      </div>

      {/* Sub-Selection Modal */}
      {selectedCategory && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCategory(null)} />
           <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-sm relative z-10 animate-in zoom-in-95 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t(selectedCategory)}</h3>
                 <button onClick={() => setSelectedCategory(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><X size={20} className="text-gray-600 dark:text-gray-300" /></button>
              </div>
              
              <div className="space-y-3">
                 <button 
                   onClick={() => handleSubPageSelect('employer')}
                   className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                          <Users size={20} />
                       </div>
                       <span className="font-bold text-gray-700 dark:text-gray-200">{t('jobs_employer')}</span>
                    </div>
                    <ChevronLeft size={18} className={`text-gray-300 group-hover:text-purple-500 ${language === 'en' ? 'rotate-180' : ''}`} />
                 </button>

                 <button 
                   onClick={() => handleSubPageSelect('seeker')}
                   className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                          <Briefcase size={20} />
                       </div>
                       <span className="font-bold text-gray-700 dark:text-gray-200">{t('jobs_seeker')}</span>
                    </div>
                    <ChevronLeft size={18} className={`text-gray-300 group-hover:text-blue-500 ${language === 'en' ? 'rotate-180' : ''}`} />
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default JobsView;
