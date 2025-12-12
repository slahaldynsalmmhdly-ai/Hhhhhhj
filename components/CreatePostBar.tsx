
import React from 'react';
import { Edit3, Image } from 'lucide-react';
import Avatar from './Avatar';
import { API_BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface CreatePostBarProps {
  onOpen: () => void;
}

const CreatePostBar: React.FC<CreatePostBarProps> = ({ onOpen }) => {
  const { t } = useLanguage();
  const userName = localStorage.getItem('userName') || 'مستخدم';
  const userAvatar = localStorage.getItem('userAvatar');
  const avatarSrc = userAvatar ? (userAvatar.startsWith('http') ? userAvatar : `${API_BASE_URL}${userAvatar}`) : null;

  return (
    <div className="bg-white px-4 pb-3 pt-1">
      <div className="flex items-center gap-3">
        <Avatar 
          name={userName}
          src={avatarSrc}
          className="w-10 h-10 border border-gray-200"
        />
        <div 
          onClick={onOpen}
          className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center px-4 cursor-pointer transition-all duration-200 group"
        >
          <span className="text-gray-500 text-[11px] font-medium ml-auto truncate">
            {`${t('post_header_create')} ${userName.split(' ')[0]}?`}
          </span>
          <div className="mr-2">
             <Image size={18} className="text-green-600 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostBar;
