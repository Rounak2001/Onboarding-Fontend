import React, { useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const INDIA_TOPO_URL = "https://raw.githubusercontent.com/udit-001/india-maps-data/refs/heads/main/topojson/india.json";

// State centroids for labels (professional placement)
const STATE_LABELS = [
  { name: "Maharashtra", coordinates: [76.5, 19.5] },
  { name: "Karnataka", coordinates: [75.5, 14.5] },
  { name: "Tamil Nadu", coordinates: [78.5, 11.0] },
  { name: "Kerala", coordinates: [76.5, 10.0] },
  { name: "Andhra Pradesh", coordinates: [79.5, 15.5] },
  { name: "Telangana", coordinates: [79.0, 18.0] },
  { name: "Gujarat", coordinates: [71.5, 22.5] },
  { name: "Rajasthan", coordinates: [74.0, 26.5] },
  { name: "Madhya Pradesh", coordinates: [78.5, 23.5] },
  { name: "Chhattisgarh", coordinates: [82.0, 21.0] },
  { name: "Odisha", coordinates: [84.5, 20.5] },
  { name: "West Bengal", coordinates: [87.5, 24.0] },
  { name: "Jharkhand", coordinates: [85.0, 23.5] },
  { name: "Bihar", coordinates: [85.5, 25.5] },
  { name: "Uttar Pradesh", coordinates: [80.5, 27.0] },
  { name: "Uttarakhand", coordinates: [79.5, 30.0] },
  { name: "Himachal Pradesh", coordinates: [77.5, 31.8] },
  { name: "Punjab", coordinates: [75.5, 31.0] },
  { name: "Haryana", coordinates: [76.5, 29.0] },
  { name: "Jammu and Kashmir", coordinates: [74.5, 34.0] },
  { name: "Ladakh", coordinates: [77.5, 34.5] },
  { name: "Assam", coordinates: [92.5, 26.0] },
  { name: "Arunachal Pradesh", coordinates: [94.5, 28.0] },
  { name: "Meghalaya", coordinates: [91.0, 25.5] },
  { name: "Manipur", coordinates: [94.0, 24.8] },
  { name: "Mizoram", coordinates: [93.0, 23.2] },
  { name: "Nagaland", coordinates: [94.5, 26.2] },
  { name: "Tripura", coordinates: [91.8, 23.8] },
  { name: "Sikkim", coordinates: [88.5, 27.5] },
  { name: "Goa", coordinates: [74.0, 15.3] },
  { name: "Delhi", coordinates: [77.2, 28.6] },
];

const NORMALIZE_STATE_NAME = {
  "Andaman and Nicobar Islands": "Andaman & Nicobar Island",
  "Jammu & Kashmir": "Jammu and Kashmir",
  "Dadra and Nagar Haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "Daman and Diu": "Dadra and Nagar Haveli and Daman and Diu",
  "Orissa": "Odisha",
  "Uttaranchal": "Uttarakhand",
};

const IndiaMap = ({ data = [], onStateClick, isLight }) => {
  const [position, setPosition] = useState({ coordinates: [82, 22], zoom: 1 });
  const [hoveredState, setHoveredState] = useState(null);

  const statsByStateName = useMemo(() => {
    const map = {};
    data.forEach(item => {
      map[item.name] = item;
      const normalized = NORMALIZE_STATE_NAME[item.name];
      if (normalized) map[normalized] = item;
    });
    return map;
  }, [data]);

  const maxRegistered = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.registered || 0), 1);
  }, [data]);

  const colorScale = scaleLinear()
    .domain([0, maxRegistered])
    .range([isLight ? "#f1f5f9" : "#1e293b", "#3b82f6"]);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [82, 22], zoom: 1 });
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '650px', 
      background: 'var(--admin-surface-soft)', 
      borderRadius: 24, 
      overflow: 'hidden', 
      border: '1px solid var(--admin-border-soft)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.02)'
    }}>
      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 10
      }}>
        <button onClick={handleZoomIn} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <ZoomIn size={20} />
        </button>
        <button onClick={handleZoomOut} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <ZoomOut size={20} />
        </button>
        <button onClick={handleReset} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--admin-border-soft)', background: 'var(--admin-surface)', color: 'var(--admin-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Hover Info Overlay */}
      {hoveredState && (
        <div style={{
          position: 'absolute',
          top: 24,
          left: 24,
          background: 'var(--admin-surface)',
          padding: '16px 20px',
          borderRadius: 20,
          border: '2px solid #3b82f6',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          zIndex: 10,
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Current Selection</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--admin-text-strong)', marginBottom: 12 }}>{hoveredState.name}</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Registered</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#3b82f6' }}>{hoveredState.registered}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{hoveredState.credentials}</div>
            </div>
          </div>
        </div>
      )}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [82, 22]
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={(pos) => setPosition(pos)}
        >
          <Geographies geography={INDIA_TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.st_nm;
                const stateStats = statsByStateName[stateName] || { name: stateName, registered: 0, credentials: 0 };
                const count = stateStats.registered || 0;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onStateClick?.(stateName)}
                    onMouseEnter={() => setHoveredState(stateStats)}
                    onMouseLeave={() => setHoveredState(null)}
                    style={{
                      default: {
                        fill: colorScale(count),
                        stroke: isLight ? "#ffffff" : "#0f172a",
                        strokeWidth: 0.5,
                        outline: "none",
                        transition: "all 0.3s"
                      },
                      hover: {
                        fill: "#3b82f6",
                        stroke: "#ffffff",
                        strokeWidth: 1,
                        outline: "none",
                        cursor: "pointer"
                      },
                      pressed: {
                        fill: "#2563eb",
                        stroke: "#ffffff",
                        strokeWidth: 1,
                        outline: "none"
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* State Labels */}
          {STATE_LABELS.map(({ name, coordinates }) => (
            <Marker key={name} coordinates={coordinates}>
              <text
                textAnchor="middle"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: position.zoom > 2 ? "4px" : "6px",
                  fontWeight: 800,
                  fill: isLight ? "#1e293b" : "#f8fafc",
                  pointerEvents: "none",
                  textShadow: isLight ? "0 0 4px rgba(255,255,255,0.8)" : "0 0 4px rgba(0,0,0,0.8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em"
                }}
              >
                {name}
              </text>
            </Marker>
          ))}

          {/* Activity Markers (Hubs) */}
          {data.filter(d => d.registered > 0).map((state) => {
            const label = STATE_LABELS.find(l => l.name === state.name);
            if (!label) return null;
            
            return (
              <Marker key={`hub-${state.name}`} coordinates={label.coordinates}>
                <circle 
                  r={(2 + (state.registered / maxRegistered) * 6) / position.zoom} 
                  fill="#ef4444" 
                  stroke="#ffffff" 
                  strokeWidth={1 / position.zoom}
                  opacity={0.8}
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div style={{ 
        position: 'absolute', 
        bottom: 24, 
        right: 24, 
        background: 'var(--admin-surface)', 
        padding: '16px', 
        borderRadius: 16, 
        border: '1px solid var(--admin-border-soft)', 
        fontSize: 11, 
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ fontWeight: 800, marginBottom: 12, color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Consultant Density
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 8, background: 'linear-gradient(90deg, #f1f5f9, #3b82f6)', borderRadius: 4 }} />
            <span style={{ color: 'var(--admin-text-muted)', fontWeight: 600 }}>Density Scale</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '50%', border: '2px solid white' }} />
            <span style={{ color: 'var(--admin-text-muted)', fontWeight: 600 }}>High Activity Hubs</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default IndiaMap;
