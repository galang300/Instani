"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

type LocationValue = {
  lat: number;
  lng: number;
};

type LocationPickerMapProps = {
  value?: LocationValue;
  onChange: (location: LocationValue) => void;
};

function MapViewport({ location }: { location?: LocationValue }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], Math.max(map.getZoom(), 13));
    }
  }, [location, map]);

  return null;
}

function ClickHandler({ onChange }: { onChange: (location: LocationValue) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng
      });
    }
  });

  return null;
}

export default function LocationPickerMap({ value, onChange }: LocationPickerMapProps) {
  const center = useMemo<[number, number]>(
    () => (value ? [value.lat, value.lng] : [-8.075, 111.9]),
    [value]
  );

  return (
    <div className="location-picker-map relative h-[260px] overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={center} zoom={value ? 13 : 10} scrollWheelZoom={false}>
        <MapViewport location={value} />
        <ClickHandler onChange={onChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {value ? (
          <CircleMarker
            center={[value.lat, value.lng]}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.7
            }}
            radius={9}
          >
            <Popup>
              <strong>Titik laporan</strong>
              <br />
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[450] rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        Klik peta untuk memilih titik
      </div>
    </div>
  );
}
