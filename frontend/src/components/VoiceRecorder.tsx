import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  onAudioCaptured: (file: File | null) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioCaptured }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        const file = new File([audioBlob], `voice_note_${Date.now()}.wav`, { type: 'audio/wav' });
        onAudioCaptured(file);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission or recording error:', err);
      alert('Could not access microphone. Please enable permissions or type your grievance text.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop stream tracks
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const clearAudio = () => {
    setAudioUrl(null);
    setRecordingSeconds(0);
    onAudioCaptured(null);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${isRecording ? 'bg-red-500 text-white animate-ping' : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'}`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRecording ? 'Recording Voice Grievance...' : audioUrl ? 'Voice Note Captured' : 'Record Voice Note (Optional)'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isRecording ? `Duration: ${formatTime(recordingSeconds)}` : audioUrl ? 'AI Whisper will auto-transcribe your speech' : 'Click mic to describe in Hindi, Kannada, or English'}
            </p>
          </div>
        </div>

        <div>
          {!isRecording && !audioUrl && (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              <Mic className="w-4 h-4" /> Start Recording
            </button>
          )}

          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow animate-pulse"
            >
              <Square className="w-4 h-4" /> Stop Recording
            </button>
          )}

          {audioUrl && !isRecording && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAudio}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition"
                title="Discard audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {audioUrl && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <audio controls src={audioUrl} className="w-full h-9 rounded-md" />
        </div>
      )}
    </div>
  );
};
