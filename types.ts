

export interface User {
  id: string;
  _id?: string;
  name: string;
  avatar: string;
}

export interface Post {
  id: string;
  _id?: string;
  user: User;
  timeAgo: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  title?: string;
  type?: string;
  location?: string;
  category?: string;
  isPremium?: boolean;
  contactPhone?: string;
  contactEmail?: string;
  contactMethods?: string[];
  isLiked?: boolean;
  isShort?: boolean;
  reactions?: Array<{ user: string; type: string }>;
}

export interface Story {
  _id: string;
  text?: string;
  backgroundColor?: string;
  media?: {
    url: string;
    type: 'image' | 'video';
  };
  createdAt: string;
  views?: Array<{
    user: User | string;
    viewedAt: string;
  }>;
  user: User;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnseen: boolean;
  isUser: boolean;
}