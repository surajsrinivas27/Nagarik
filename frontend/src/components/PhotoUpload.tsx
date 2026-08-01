import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, X } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoSelected: (file: File | null) => void;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ onPhotoSelected }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      setPreviewUrl(null);
      onPhotoSelected(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      onPhotoSelected(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Photo Evidence (Optional)
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Upload a clear photo of the pothole, water leak, or damaged street light for Gemini AI analysis
      </p>

      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-black/5 max-h-64 flex justify-center items-center">
          <img src={previewUrl} alt="Complaint preview" className="max-h-64 object-contain rounded-lg" />
          <button
            type="button"
            onClick={() => handleFile(null)}
            className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-red-600 transition shadow"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg p-6 text-center cursor-pointer transition bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-full text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Click to upload photo or drag & drop image
            </p>
            <p className="text-[11px] text-slate-400">JPG, PNG or WEBP up to 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </div>
      )}
    </div>
  );
};
