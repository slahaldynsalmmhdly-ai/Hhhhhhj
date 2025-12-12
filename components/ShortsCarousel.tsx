
import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { API_BASE_URL } from '../constants';
import { HARAJ_CATEGORIES, JOB_CATEGORIES } from '../data/categories';
import { useLanguage } from '../contexts/LanguageContext';

interface ShortItem {
  id: string;
  title: string;
  views: string;
  thumbnail: string | null;
  videoUrl: string;
}

interface ShortsCarouselProps {
  onShortClick: (shortId: string) => void;
  title?: string;
  filterType?: 'forYou' | 'haraj' | 'jobs';
}

const ShortsCarousel: React.FC<ShortsCarouselProps> = ({ 
  onShortClick, 
  title = "فيديوهات قصيرة", 
  filterType = 'forYou' 
}) => {
  const { t, language } = useLanguage();
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId');

    if (token) {
      // Determine URL based on filter type
      let url = `${API_BASE_URL}/api/v1/posts/shorts/for-you?limit=10`;
      
      if (filterType === 'haraj' || filterType === 'jobs') {
         // Fetch general shorts for categories then filter client side
         url = `${API_BASE_URL}/api/v1/posts?isShort=true&limit=50`;
      }

      fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        const postsArray = data.posts || (Array.isArray(data) ? data : []);

        if (Array.isArray(postsArray) && postsArray.length > 0) {
          let filteredPosts = postsArray.filter((item: any) => {
                // 1. Must be strictly a Short (created via Shorts flow)
                if (!item.isShort) return false;

                // 2. Must have media
                if (!item.media || item.media.length === 0) return false;
                
                // 3. Must NOT be my video
                const postUserId = item.user?._id || item.user?.id || item.user;
                if (currentUserId && postUserId && String(postUserId) === String(currentUserId)) {
                    return false;
                }
                
                return true;
            });

          // Apply Category Filter
          if (filterType === 'haraj') {
             const harajNames = HARAJ_CATEGORIES.map(c => c.name);
             filteredPosts = filteredPosts.filter((p: any) => p.category && harajNames.includes(p.category));
          } else if (filterType === 'jobs') {
             const jobNames = JOB_CATEGORIES.map(c => c.name);
             filteredPosts = filteredPosts.filter((p: any) => p.category && jobNames.includes(p.category));
          }

          const mappedShorts = filteredPosts.map((item: any) => {
              const videoMedia = item.media.find((m: any) => m.type === 'video') || item.media[0];
              
              let thumbnailUrl = videoMedia?.thumbnail;
              if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
                thumbnailUrl = `${API_BASE_URL}${thumbnailUrl}`;
              }

              let videoUrl = videoMedia?.url;
              if (videoUrl && !videoUrl.startsWith('http')) {
                videoUrl = `${API_BASE_URL}${videoUrl}`;
              }

              return {
                id: item._id || item.id,
                title: item.title || item.text?.substring(0, 30) || 'فيديو قصير',
                views: item.viewCount 
                  ? new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { notation: 'compact' }).format(item.viewCount)
                  : '0',
                thumbnail: thumbnailUrl || null,
                videoUrl: videoUrl
              };
            });
            
          // Limit to 10 items for carousel
          setShorts(mappedShorts.slice(0, 10));
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load carousel shorts", err);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [filterType, language]);

  // If loading finished and no shorts found, hide the component
  if (!isLoading && shorts.length === 0) return null;

  return (
    <div className="bg-white mb-3 py-4 border-y border-gray-100 animate-in fade-in duration-500">
      <div className="px-4 mb-3 flex items-center gap-2">
         <div className={`p-1 rounded-md ${filterType === 'haraj' ? 'bg-orange-600' : filterType === 'jobs' ? 'bg-purple-600' : 'bg-red-600'}`}>
            <Play size={16} className="text-white fill-white" />
         </div>
         <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      
      <div className="overflow-x-auto no-scrollbar px-4">
        <div className="flex gap-2 min-w-max">
          {isLoading ? (
            // Skeleton Loading State
            Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i}
                className="relative w-32 h-56 rounded-xl overflow-hidden bg-gray-200 animate-pulse border border-gray-100"
              >
                <div className="absolute bottom-0 left-0 right-0 p-2 space-y-2">
                  <div className="h-2.5 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            // Real Data
            shorts.map((short) => (
              <div 
                key={short.id} 
                onClick={() => onShortClick(short.id)}
                className="relative w-32 h-56 rounded-xl overflow-hidden cursor-pointer group bg-black shadow-sm"
              >
                {short.thumbnail ? (
                  <img 
                    src={short.thumbnail} 
                    alt={short.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                ) : (
                  <video 
                    src={`${short.videoUrl}#t=0.1`} 
                    className="w-full h-full object-cover pointer-events-none" 
                    preload="metadata"
                    muted
                    playsInline
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 flex flex-col justify-end p-2 pointer-events-none">
                  <span className="text-white font-bold text-xs mb-0.5 shadow-sm line-clamp-1">{short.title}</span>
                  <span className="text-gray-300 text-[10px]">{short.views} {t('views')}</span>
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/30 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm pointer-events-none">
                   <Play size={20} className="text-white fill-white" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortsCarousel;
