
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Tag, MessageCircle, Download, ToggleLeft, ToggleRight, Camera, Eye, Globe, Users, Lock, Repeat, ChevronLeft, Check, X, Store, Briefcase } from 'lucide-react';
import { HARAJ_CATEGORIES, JOB_CATEGORIES } from '../data/categories';
import { TextOverlay } from './EditVideoView';
import { useLanguage } from '../contexts/LanguageContext';

interface PublishVideoViewProps {
  videoSrc: string;
  onBack: () => void;
  onPublish: (details: {
    title: string;
    description: string;
    category: string;
    allowComments: boolean;
    allowDownload: boolean;
    allowDuet: boolean;
    privacy: 'public' | 'friends' | 'private';
    coverFile: File | null;
  }) => void;
  isSubmitting: boolean;
  overlayTexts: TextOverlay[];
}

const PublishVideoView: React.FC<PublishVideoViewProps> = ({ videoSrc, onBack, onPublish, isSubmitting, overlayTexts }) => {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Category State
  const [mainType, setMainType] = useState<'haraj' | 'job'>('haraj');
  const [selectedCategory, setSelectedCategory] = useState<string>(HARAJ_CATEGORIES[0].name);

  // Drawers State
  const [isPrivacyDrawerOpen, setIsPrivacyDrawerOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);

  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- RADICAL FIX FOR PREVIEW BLACK SCREEN ---
  useEffect(() => {
    const video = videoRef.current;
    if (video && videoSrc && !coverPreview) {
        video.load();
        const ensureFrame = () => {
            video.currentTime = 0.1; 
        };
        if (video.readyState >= 2) {
            ensureFrame();
        } else {
            video.addEventListener('loadeddata', ensureFrame);
        }
        return () => {
            video.removeEventListener('loadeddata', ensureFrame);
        };
    }
  }, [videoSrc, coverPreview]);

  const handlePublishClick = () => {
    if (!title) {
      alert('الرجاء كتابة عنوان للفيديو.');
      return;
    }
    onPublish({ 
      title, 
      description, 
      category: selectedCategory, 
      allowComments, 
      allowDownload, 
      allowDuet, 
      privacy, 
      coverFile 
    });
  };
  
  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleMainTypeChange = (type: 'haraj' | 'job') => {
    setMainType(type);
    if (type === 'haraj') {
      setSelectedCategory(HARAJ_CATEGORIES[0].name);
    } else {
      setSelectedCategory(JOB_CATEGORIES[0].name);
    }
  };

  const getPrivacyLabel = () => {
      if (privacy === 'public') return 'الجميع';
      if (privacy === 'friends') return 'الأصدقاء';
      return 'أنا فقط';
  };

  const getPrivacyIcon = () => {
      if (privacy === 'public') return Globe;
      if (privacy === 'friends') return Users;
      return Lock;
  };

  const PrivacyIcon = getPrivacyIcon();
  const currentCategories = mainType === 'haraj' ? HARAJ_CATEGORIES : JOB_CATEGORIES;

  return (
    <div className="fixed inset-0 z-[120] bg-white text-gray-800 flex flex-col animate-in slide-in-from-left duration-300">
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 pt-safe">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft className={language === 'en' ? 'rotate-180' : ''} size={22} />
        </button>
        <h2 className="text-lg font-bold">نشر الفيديو</h2>
        <button 
            onClick={handlePublishClick}
            disabled={!title || isSubmitting}
            className={`text-sm font-bold px-4 py-1.5 rounded-full transition-colors ${
                title && !isSubmitting 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'bg-gray-100 text-gray-400'
            }`}
        >
            {isSubmitting ? 'جاري النشر...' : 'نشر'}
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        
        {/* Top Section: Video Preview & Text Inputs */}
        <div className="p-5 flex flex-row gap-4 border-b border-gray-100 bg-white">
          {/* Video Preview Section */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-24 h-36 rounded-lg overflow-hidden bg-gray-900 border border-gray-200 shadow-sm relative group">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-full h-full">
                    <video 
                        key={videoSrc}
                        ref={videoRef} 
                        src={videoSrc} 
                        muted 
                        playsInline 
                        preload="auto"
                        className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {overlayTexts.map(text => (
                            <div
                                key={text.id}
                                className="absolute whitespace-nowrap font-bold"
                                style={{
                                    left: `${(text.x / window.innerWidth) * 100}%`,
                                    top: `${(text.y / window.innerHeight) * 100}%`,
                                    transform: `translate(-50%, -50%) scale(${text.scale * 0.3})`,
                                    color: text.color,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                    fontSize: '2rem'
                                }}
                            >
                                {text.content}
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={coverInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleCoverChange}
            />
            <button 
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
            >
               <Camera size={12} />
               <span>اختر غلاف</span>
            </button>
          </div>

          {/* Text Inputs Section */}
          <div className="flex-1 flex flex-col">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اكتب عنواناً للفيديو..."
              className="w-full bg-white p-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none transition mb-2"
              rows={2}
            />
            <div className="w-full h-px bg-gray-100 mb-2"></div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف وصفاً واشتاقات #..."
              className="w-full flex-1 bg-white p-2 text-xs font-medium text-gray-600 placeholder:text-gray-400 focus:outline-none resize-none transition"
              rows={4}
            />
          </div>
        </div>

        {/* Options List */}
        <div className="p-4 space-y-4">
          
          {/* Category Selection Row */}
          <div 
            onClick={() => setIsCategoryDrawerOpen(true)}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          >
             <div className="flex items-center gap-3">
                <Tag size={20} className="text-gray-500" />
                <span className="text-sm font-bold text-gray-700">التصنيف</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600">{selectedCategory ? t(selectedCategory) : t(mainType === 'haraj' ? 'nav_haraj' : 'nav_jobs')}</span>
                <ChevronLeft size={16} className={`text-gray-400 ${language === 'en' ? 'rotate-180' : ''}`} />
             </div>
          </div>

          {/* Privacy Selection Row */}
          <div 
            onClick={() => setIsPrivacyDrawerOpen(true)}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          >
             <div className="flex items-center gap-3">
                <Eye size={20} className="text-gray-500" />
                <span className="text-sm font-bold text-gray-700">من يمكنه المشاهدة</span>
             </div>
             <div className="flex items-center gap-2">
                <PrivacyIcon size={14} className="text-gray-500" />
                <span className="text-xs font-bold text-gray-600">{getPrivacyLabel()}</span>
                <ChevronLeft size={16} className={`text-gray-400 ${language === 'en' ? 'rotate-180' : ''}`} />
             </div>
          </div>

          <div className="h-px bg-gray-100 w-full my-2"></div>

          {/* Comments */}
          <div className="flex justify-between items-center p-2 pl-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                  <MessageCircle size={20} className="text-gray-400" />
                  <span className="text-sm font-medium">السماح بالتعليقات</span>
              </div>
              <button onClick={() => setAllowComments(!allowComments)}>
                  {allowComments ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
          </div>

          {/* Downloads */}
          <div className="flex justify-between items-center p-2 pl-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                  <Download size={20} className="text-gray-400" />
                  <span className="text-sm font-medium">السماح بالتنزيلات</span>
              </div>
              <button onClick={() => setAllowDownload(!allowDownload)}>
                  {allowDownload ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
          </div>

          {/* Repost (Duet) */}
          <div className="flex justify-between items-center p-2 pl-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                  <Repeat size={20} className="text-gray-400" />
                  <span className="text-sm font-medium">السماح بإعادة النشر</span>
              </div>
              <button onClick={() => setAllowDuet(!allowDuet)}>
                  {allowDuet ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
          </div>

        </div>
      </div>

      {/* --- CATEGORY DRAWER --- */}
      {isCategoryDrawerOpen && (
        <>
            <div className="fixed inset-0 bg-black/40 z-[130]" onClick={() => setIsCategoryDrawerOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 bg-white z-[140] rounded-t-3xl h-[65vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span className="font-bold text-gray-800">اختر التصنيف</span>
                    <button onClick={() => setIsCategoryDrawerOpen(false)} className="bg-gray-100 p-1 rounded-full text-gray-600"><X size={20} /></button>
                </div>
                
                <div className="p-4">
                    {/* Main Type Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                        <button
                            onClick={() => handleMainTypeChange('haraj')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${mainType === 'haraj' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            <Store size={16} />
                            {t('nav_haraj')}
                        </button>
                        <button
                            onClick={() => handleMainTypeChange('job')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${mainType === 'job' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            <Briefcase size={16} />
                            {t('nav_jobs')}
                        </button>
                    </div>

                    {/* Sub Categories Grid */}
                    <div className="overflow-y-auto max-h-[40vh] no-scrollbar grid grid-cols-2 gap-3">
                        {currentCategories.map((cat, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setSelectedCategory(cat.name);
                                    setIsCategoryDrawerOpen(false);
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-start ${
                                    selectedCategory === cat.name 
                                    ? (mainType === 'haraj' ? 'bg-orange-50 border-orange-200' : 'bg-purple-50 border-purple-200')
                                    : 'bg-white border-gray-100 hover:bg-gray-50'
                                }`}
                            >
                                <div className={`p-2 rounded-full ${mainType === 'haraj' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                    <cat.icon size={16} />
                                </div>
                                <span className={`text-xs font-bold ${selectedCategory === cat.name ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {t(cat.name)}
                                </span>
                                {selectedCategory === cat.name && <Check size={16} className={mainType === 'haraj' ? 'text-orange-600 mr-auto' : 'text-purple-600 mr-auto'} />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
      )}

      {/* --- PRIVACY DRAWER --- */}
      {isPrivacyDrawerOpen && (
        <>
            <div className="fixed inset-0 bg-black/40 z-[130]" onClick={() => setIsPrivacyDrawerOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 bg-white z-[140] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl pb-safe">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span className="font-bold text-gray-800">من يمكنه مشاهدة الفيديو</span>
                    <button onClick={() => setIsPrivacyDrawerOpen(false)} className="bg-gray-100 p-1 rounded-full text-gray-600"><X size={20} /></button>
                </div>
                
                <div className="p-4 flex flex-col gap-2">
                    <button 
                        onClick={() => { setPrivacy('public'); setIsPrivacyDrawerOpen(false); }}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Globe size={20} /></div>
                            <div className="text-start">
                                <h4 className="font-bold text-sm text-gray-900">الجميع</h4>
                                <p className="text-[10px] text-gray-500">يمكن لأي شخص مشاهدة الفيديو</p>
                            </div>
                        </div>
                        {privacy === 'public' && <Check size={20} className="text-blue-600" />}
                    </button>

                    <button 
                        onClick={() => { setPrivacy('friends'); setIsPrivacyDrawerOpen(false); }}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-2 rounded-full text-green-600"><Users size={20} /></div>
                            <div className="text-start">
                                <h4 className="font-bold text-sm text-gray-900">الأصدقاء</h4>
                                <p className="text-[10px] text-gray-500">فقط المتابعين الذين تتابعهم</p>
                            </div>
                        </div>
                        {privacy === 'friends' && <Check size={20} className="text-blue-600" />}
                    </button>

                    <button 
                        onClick={() => { setPrivacy('private'); setIsPrivacyDrawerOpen(false); }}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 p-2 rounded-full text-gray-600"><Lock size={20} /></div>
                            <div className="text-start">
                                <h4 className="font-bold text-sm text-gray-900">أنا فقط</h4>
                                <p className="text-[10px] text-gray-500">لن يظهر الفيديو لأي شخص آخر</p>
                            </div>
                        </div>
                        {privacy === 'private' && <Check size={20} className="text-blue-600" />}
                    </button>
                </div>
            </div>
        </>
      )}

    </div>
  );
};

export default PublishVideoView;
