import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Layers } from 'lucide-react';

export interface HeatmapFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    code: string;
    title: string;
    department: string;
    urgency: string;
    status: string;
    weight: number;
  };
}

interface HeatmapViewProps {
  features: HeatmapFeature[];
  selectedDepartment?: string;
  onSelectComplaint?: (code: string) => void;
}

const DEPARTMENT_COLORS: Record<string, string> = {
  Roads: '#2563eb',       // Blue
  Water: '#06b6d4',       // Cyan
  Electricity: '#f59e0b', // Amber
  Sanitation: '#10b981',   // Emerald
  Other: '#8b5cf6',       // Purple
};

export const HeatmapView: React.FC<HeatmapViewProps> = ({ features, selectedDepartment, onSelectComplaint }) => {
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore center

  const filteredFeatures = features.filter((f) => {
    if (selectedDepartment && selectedDepartment !== 'All' && f.properties.department !== selectedDepartment) {
      return false;
    }
    return true;
  });

  return (
    <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredFeatures.map((feat) => {
          const [lng, lat] = feat.geometry.coordinates;
          const { code, title, department, urgency, status, weight } = feat.properties;
          const color = DEPARTMENT_COLORS[department] || '#3b82f6';
          const radius = Math.min(8 + weight * 2.5, 24);

          return (
            <CircleMarker
              key={feat.properties.id || code}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                <div className="font-semibold text-xs">
                  {code} - {title}
                </div>
                <div className="text-[11px] text-slate-600">
                  {department} | {urgency} | Reported by {weight} citizen{weight > 1 ? 's' : ''}
                </div>
              </Tooltip>
              <Popup>
                <div className="p-1 max-w-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-blue-600">{code}</span>
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 mb-1">{title}</h4>
                  <div className="text-[11px] text-slate-600 mb-2">
                    <p>Department: <span className="font-medium text-slate-900">{department}</span></p>
                    <p>Urgency: <span className="font-medium text-slate-900">{urgency}</span></p>
                    <p className="font-bold text-amber-600">{weight} Citizen Reports Clustered</p>
                  </div>
                  {onSelectComplaint && (
                    <button
                      onClick={() => onSelectComplaint(code)}
                      className="w-full text-center text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 rounded shadow"
                    >
                      View Details & Action
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-md flex items-center gap-3 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Department Density
        </span>
        <div className="flex items-center gap-2">
          {Object.entries(DEPARTMENT_COLORS).map(([dept, color]) => (
            <div key={dept} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">{dept}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
