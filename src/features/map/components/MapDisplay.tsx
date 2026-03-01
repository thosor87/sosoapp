import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-rotate'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/components/feedback/Toast'
import type { MapDocument, GeoJSONFeature } from '@/lib/firebase/types'

// Fix Leaflet default marker icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type TileLayerType = 'osm' | 'satellite'

const TILE_LAYERS: Record<TileLayerType, { url: string; attribution: string; maxNativeZoom: number }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
  },
}

const MAX_ZOOM = 22

const CATEGORY_LABELS: Record<string, string> = {
  tent: 'Zeltbereich',
  food: 'Essensbereich',
  stage: 'Bühne',
  parking: 'Parkplatz',
  wc: 'WC',
  entrance: 'Eingang',
  playground: 'Spielplatz',
  other: 'Sonstiges',
}

const CATEGORY_ICONS: Record<string, string> = {
  tent: '\u26FA',
  food: '\uD83C\uDF54',
  stage: '\uD83C\uDFB5',
  parking: '\uD83C\uDD7F\uFE0F',
  wc: '\uD83D\uDEBB',
  entrance: '\uD83D\uDEAA',
  playground: '\uD83C\uDFA0',
  other: '\uD83D\uDCCC',
}

function LayerToggle({
  activeLayer,
  onToggle,
}: {
  activeLayer: TileLayerType
  onToggle: (layer: TileLayerType) => void
}) {
  return (
    <div className="absolute top-3 right-3 z-[1000] flex rounded-lg overflow-hidden shadow-md border border-warm-200">
      <button
        type="button"
        onClick={() => onToggle('osm')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
          activeLayer === 'osm'
            ? 'bg-primary-500 text-white'
            : 'bg-white text-warm-600 hover:bg-warm-50'
        )}
      >
        Karte
      </button>
      <button
        type="button"
        onClick={() => onToggle('satellite')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
          activeLayer === 'satellite'
            ? 'bg-primary-500 text-white'
            : 'bg-white text-warm-600 hover:bg-warm-50'
        )}
      >
        Satellit
      </button>
    </div>
  )
}

function SetBearing({ bearing }: { bearing: number }) {
  const map = useMap()
  useEffect(() => {
    if (bearing && (map as L.Map & { setBearing?: (b: number) => void }).setBearing) {
      (map as L.Map & { setBearing: (b: number) => void }).setBearing(bearing)
    }
  }, [map, bearing])
  return null
}

interface MapDisplayProps {
  mapData: MapDocument
}

export function MapDisplay({ mapData }: MapDisplayProps) {
  const [tileLayer, setTileLayer] = useState<TileLayerType>('osm')

  const center: [number, number] = [mapData.center.lat, mapData.center.lng]

  // Build a GeoJSON FeatureCollection from the shapes
  const geojsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: mapData.shapes.map((shape: GeoJSONFeature) => ({
        type: 'Feature' as const,
        geometry: shape.geometry,
        properties: shape.properties,
      })),
    }
  }, [mapData.shapes])

  // Style each feature based on its properties
  const featureStyle = (feature: GeoJSON.Feature | undefined) => {
    if (!feature?.properties) return {}
    return {
      color: feature.properties.strokeColor || '#44403c',
      weight: feature.properties.strokeWidth || 2,
      fillColor: feature.properties.color || '#8b5cf6',
      fillOpacity: feature.properties.opacity ?? 0.5,
    }
  }

  // Bind popups on each feature
  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (!feature.properties) return
    const category = feature.properties.category || 'other'
    const icon = CATEGORY_ICONS[category] || ''
    const label =
      feature.properties.label || CATEGORY_LABELS[category] || category

    layer.bindPopup(
      `<div style="text-align:center;font-size:14px;">
        <div style="font-size:24px;margin-bottom:4px;">${icon}</div>
        <strong>${label}</strong>
      </div>`
    )
  }

  const handleDownload = () => {
    useToastStore
      .getState()
      .addToast('Download-Funktion kommt in einem zukünftigen Update', 'info')
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden border border-warm-200">
        <LayerToggle activeLayer={tileLayer} onToggle={setTileLayer} />

        <MapContainer
          center={center}
          zoom={mapData.zoom}
          maxZoom={MAX_ZOOM}
          className="w-full"
          style={{ height: '450px', minHeight: '400px' }}
          scrollWheelZoom={true}
          {...({ rotate: true, bearing: mapData.bearing ?? 0 } as Record<string, unknown>)}
        >
          <SetBearing bearing={mapData.bearing ?? 0} />
          <TileLayer
            key={tileLayer}
            url={TILE_LAYERS[tileLayer].url}
            attribution={TILE_LAYERS[tileLayer].attribution}
            maxNativeZoom={TILE_LAYERS[tileLayer].maxNativeZoom}
            maxZoom={MAX_ZOOM}
          />
          {geojsonData.features.length > 0 && (
            <GeoJSON
              key={JSON.stringify(geojsonData)}
              data={geojsonData}
              style={featureStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          Als Bild herunterladen
        </Button>
      </div>
    </div>
  )
}
