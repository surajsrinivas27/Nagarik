import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { api } from '../lib/api';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { PhotoUpload } from '../components/PhotoUpload';
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// Fix default Leaflet marker icon path in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPickerMarker({ position, setPosition }: { position: [number, number]; setPosition: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const m = e.target.getLatLng();
          setPosition([m.lat, m.lng]);
        },
      }}
    />
  ) : null;
}

export const ReportComplaint: React.FC = () => {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [position, setPosition] = useState<[number, number]>([12.9716, 77.5946]); // Default Bangalore
  const [address, setAddress] = useState('MG Road, Bengaluru');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => console.log('Geolocation permission denied, using Bangalore default')
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !audioFile) {
      alert('Please enter a description or record a voice note.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('description', description.trim() || 'Voice grievance submitted by citizen');
      formData.append('lat', position[0].toString());
      formData.append('lng', position[1].toString());
      formData.append('address', address);
      if (photoFile) formData.append('photo', photoFile);
      if (audioFile) formData.append('audio', audioFile);

      const res = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.response?.data?.detail || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    const urgencyColors: Record<string, string> = {
      Critical: 'bg-red-100 text-red-700 border-red-300',
      High: 'bg-orange-100 text-orange-700 border-orange-300',
      Medium: 'bg-amber-100 text-amber-700 border-amber-300',
      Low: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    };

    return (
      <div className="min-h-screen py-16 px-4 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
            Grievance Registered Successfully!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Keep this tracking code to check status and progress updates.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Tracking Code</span>
              <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">{result.complaint_code}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Assigned Department</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{result.department}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Assigned Urgency</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${urgencyColors[result.urgency] || urgencyColors.Medium}`}>
                {result.urgency} Priority
              </span>
            </div>

            {result.is_merged && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Duplicate Merged:</strong> {result.merged_message}</span>
              </div>
            )}

            {result.ai_reasoning && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>AI Reasoning:</strong> {result.ai_reasoning}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> SLA Estimated Deadline
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {new Date(result.sla_deadline).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              to={`/track?code=${result.complaint_code}`}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow"
            >
              Track Progress Live
            </Link>
            <button
              onClick={() => { setResult(null); setStep(1); setDescription(''); }}
              className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition"
            >
              File Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 max-w-3xl mx-auto">
      {/* Progress Bar Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Report a Civic Grievance</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Step {step} of 4 — Nagrik AI guided intake workflow</p>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
          <div className="bg-blue-600 h-2 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Step 1: Describe the Issue</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Provide details about the pothole, water leak, garbage accumulation, or electrical fault.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Grievance Description (Hindi, Kannada, or English)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Deep pothole on MG Road near bus stop causing traffic jams and two-wheeler accidents..."
                rows={4}
                className="w-full p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <VoiceRecorder onAudioCaptured={(file) => setAudioFile(file)} />

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!description.trim() && !audioFile}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                Next: Photo Evidence <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Step 2: Attach Photo Evidence</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Photos help Gemini Vision verify severity and location context.</p>
            </div>

            <PhotoUpload onPhotoSelected={(file) => setPhotoFile(file)} />

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
              >
                Next: Location Pin <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Step 3: Confirm Location</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Drag pin on map or specify exact landmark address.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Landmark Address / Road Name
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. MG Road opposite Metro station, Bengaluru"
                className="w-full p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="h-64 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
              <MapContainer center={position} zoom={13} className="w-full h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPickerMarker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            <p className="text-[11px] text-slate-400">Selected Coordinates: {position[0].toFixed(5)}, {position[1].toFixed(5)}</p>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
              >
                Next: Review & Submit <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Step 4: Review & Submit</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Confirm report details before submitting to Nagrik AI engine.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Description</span>
                <p className="text-slate-900 dark:text-slate-100 font-semibold">{description || 'Voice note attached'}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Location</span>
                <p className="text-slate-900 dark:text-slate-100 font-semibold">{address}</p>
              </div>

              {audioFile && (
                <div>
                  <span className="text-slate-400 block font-medium">Audio Attached</span>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">{audioFile.name}</p>
                </div>
              )}

              {photoFile && (
                <div>
                  <span className="text-slate-400 block font-medium">Photo Attached</span>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">{photoFile.name}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition"
              >
                {isSubmitting ? 'Processing via AI Pipeline...' : 'Submit Grievance Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
