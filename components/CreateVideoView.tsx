
import React, { useRef, useEffect, useState } from 'react';
import { X, SwitchCamera, Image as ImageIcon, Video, Circle, StopCircle } from 'lucide-react';

interface CreateVideoViewProps {
  onClose: () => void;
  onVideoReady: (file: File) => void;
}

const CreateVideoView: React.FC<CreateVideoViewProps> = ({ onClose, onVideoReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  
  // New States for Countdown and Timer
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: cameraFacingMode,
            // Force 16:9 aspect ratio to prevent zoomed-in 4:3 crop
            aspectRatio: { ideal: 1.7777777778 }, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 } 
        },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [cameraFacingMode]);

  const toggleCamera = () => {
    if (isRecording || countdown !== null) return;
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoReady(file);
    }
  };
  
  // 1. Initiate Countdown
  const handleStartSequence = () => {
    setCountdown(3);
    
    let count = 3;
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            setCountdown(count);
        } else {
            clearInterval(interval);
            setCountdown(null);
            startRecording();
        }
    }, 1000);
  };

  // 2. Actual Recording Start
  const startRecording = () => {
    if (streamRef.current) {
      chunksRef.current = [];
      try {
        // Use the stable bitrate setting (2.5Mbps) that worked well previously
        const options: MediaRecorderOptions = {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 2500000 
        };
        
        // Fallback for Safari/Other browsers
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
             // Try mp4 if webm vp8 not supported
             if (MediaRecorder.isTypeSupported('video/mp4')) {
                 options.mimeType = 'video/mp4';
             } else {
                 delete options.mimeType; // Let browser decide
             }
        }
            
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      } catch (e) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const videoBlob = new Blob(chunksRef.current, { type: mimeType });
        
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const videoFile = new File([videoBlob], `recorded-video.${ext}`, { type: mimeType });
        
        onVideoReady(videoFile);
      };
      
      // CRITICAL FIX: No timeslice argument. This lets the browser buffer internally
      // and prevents the CPU spike/lag caused by processing chunks every second.
      mediaRecorderRef.current.start(); 
      
      setIsRecording(true);
      
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };
  
  const handleRecordClick = () => {
      if (isRecording) {
          handleStopRecording();
      } else {
          handleStartSequence();
      }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!hasPermission) {
    return (
        <div className="fixed inset-0 z-[100] bg-gray-900 text-white flex flex-col items-center justify-center text-center p-6">
            <Video size={48} className="text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">الوصول إلى الكاميرا مطلوب</h2>
            <p className="text-gray-400 mb-6">يرجى السماح بالوصول إلى الكاميرا والميكروفون لمتابعة تسجيل الفيديو.</p>
            <button onClick={startCamera} className="bg-blue-600 px-6 py-2 rounded-lg font-bold">إعادة محاولة</button>
            <button onClick={onClose} className="mt-4 text-sm text-gray-500">إلغاء</button>
        </div>
    );
  }

  const isBusy = isRecording || countdown !== null;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col animate-in fade-in duration-300">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center pt-safe">
        {!isBusy && (
            <button onClick={onClose} className="p-2 bg-black/30 rounded-full backdrop-blur-md">
                <X size={24} />
            </button>
        )}

        {isRecording && (
            <div className="flex items-center gap-2 bg-red-600/80 px-4 py-1.5 rounded-full mx-auto backdrop-blur-md animate-in slide-in-from-top duration-300">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold text-sm">جاري التسجيل</span>
                <span className="font-mono text-sm w-10 text-center">{formatTime(recordingDuration)}</span>
            </div>
        )}
      </div>

      {/* Main Video View */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover" 
        />
        
        {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30">
                <span className="text-[120px] font-black text-white drop-shadow-2xl animate-in zoom-in duration-300 key={countdown}">
                    {countdown}
                </span>
            </div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-safe flex items-center justify-around">
        
        <button 
            onClick={() => fileInputRef.current?.click()} 
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isBusy ? 'opacity-0 pointer-events-none scale-50' : 'opacity-80 hover:opacity-100'}`}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 backdrop-blur-md">
            <ImageIcon size={20} />
          </div>
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />

        <button 
          onClick={handleRecordClick}
          disabled={countdown !== null}
          className="relative transition-transform active:scale-95"
        >
          {isRecording ? (
             <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                 <div className="w-8 h-8 bg-red-600 rounded-md animate-in zoom-in duration-200"></div>
             </div>
          ) : (
             <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                 <div className="w-16 h-16 bg-white rounded-full"></div>
             </div>
          )}
        </button>

        <button 
            onClick={toggleCamera} 
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isBusy ? 'opacity-0 pointer-events-none scale-50' : 'opacity-80 hover:opacity-100'}`}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 backdrop-blur-md">
            <SwitchCamera size={20} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default CreateVideoView;
