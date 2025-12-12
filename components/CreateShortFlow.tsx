
import React, { useState } from 'react';
import CreateVideoView from './CreateVideoView';
import EditVideoView, { TextOverlay } from './EditVideoView';
import PublishVideoView from './PublishVideoView';
import { API_BASE_URL } from '../constants';

interface CreateShortFlowProps {
  onClose: () => void;
  onPostSubmit: (payload: any) => Promise<void>;
}

const CreateShortFlow: React.FC<CreateShortFlowProps> = ({ onClose, onPostSubmit }) => {
  const [step, setStep] = useState<'record' | 'edit' | 'publish'>('record');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [overlayTexts, setOverlayTexts] = useState<TextOverlay[]>([]);
  // We remove local submitting state because we want to close immediately
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVideoReady = (file: File) => {
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
    setStep('edit');
  };

  const handleBackToRecord = () => {
    setVideoFile(null);
    setVideoSrc(null);
    setStep('record');
  };

  const handleProceedToPublish = (texts: TextOverlay[]) => {
    setOverlayTexts(texts); 
    setStep('publish');
  };

  const handleBackToEdit = () => {
    setStep('edit');
  };

  // Upload Logic Moved to App.tsx via onPostSubmit raw payload
  
  const handlePublish = async (details: { title: string; description: string; category: string; allowComments: boolean; allowDownload: boolean; allowDuet: boolean; privacy: string; coverFile: File | null; }) => {
    if (!videoFile) {
      alert("لا يوجد فيديو للنشر.");
      return;
    }

    // Prepare raw payload for background upload
    // We pass the File objects directly
    const combinedText = `${details.title}\n\n${details.description}`;

    const postPayload = {
      text: combinedText,
      title: details.title,
      // Pass raw files to App.tsx
      rawVideoFile: videoFile,
      rawCoverFile: details.coverFile,
      // Metadata
      category: details.category,
      isShort: true,
      videoOverlays: overlayTexts,
      allowComments: details.allowComments,
      allowDownload: details.allowDownload,
      allowDuet: details.allowDuet,
      privacy: details.privacy,
      publishScope: 'category_only',
      // Temp preview for UI
      tempVideoUrl: videoSrc,
    };
    
    // Call submit. Since we moved logic to App.tsx, this should handle "backgrounding"
    onPostSubmit(postPayload);
    // Don't wait, close immediately managed by parent or here? 
    // Parent closes on submit usually, but we ensure it here if needed or let parent handle
  };


  switch (step) {
    case 'record':
      return <CreateVideoView onClose={onClose} onVideoReady={handleVideoReady} />;
    case 'edit':
      if (videoSrc) {
        return <EditVideoView 
                  videoSrc={videoSrc} 
                  onBack={handleBackToRecord} 
                  onNext={handleProceedToPublish}
                  initialTexts={overlayTexts}
               />;
      }
      return null; // Should not happen
    case 'publish':
      if (videoSrc) {
        return (
            <PublishVideoView 
                videoSrc={videoSrc} 
                onBack={handleBackToEdit} 
                onPublish={handlePublish} 
                isSubmitting={isSubmitting}
                overlayTexts={overlayTexts}
            />
        );
      }
      return null; // Should not happen
    default:
      return null;
  }
};

export default CreateShortFlow;
