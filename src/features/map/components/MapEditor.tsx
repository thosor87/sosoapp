import { useState, useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-rotate'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useAuthStore } from '@/features/auth/store'
import { useMapStore } from '@/features/map/store'
import { GeomanControls } from './GeomanControls'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToastStore } from '@/components/feedback/Toast'
import { cn } from '@/lib/utils/cn'
import type { GeoJSONFeature } from '@/lib/firebase/types'

// Fix Leaflet default marker icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ---------- Types ----------

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

type TileLayerType = 'osm' | 'satellite'

const CATEGORIES = [
  { id: 'tent', label: 'Zeltbereich', icon: '\u26FA' },
  { id: 'food', label: 'Essensbereich', icon: '\uD83C\uDF54' },
  { id: 'stage', label: 'Bühne', icon: '\uD83C\uDFB5' },
  { id: 'parking', label: 'Parkplatz', icon: '\uD83C\uDD7F\uFE0F' },
  { id: 'wc', label: 'WC', icon: '\uD83D\uDEBB' },
  { id: 'entrance', label: 'Eingang', icon: '\uD83D\uDEAA' },
  { id: 'playground', label: 'Spielplatz', icon: '\uD83C\uDFA0' },
  { id: 'other', label: 'Sonstiges', icon: '\uD83D\uDCCC' },
] as const

const PRESET_COLORS = [
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
]

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

const DEFAULT_CENTER: [number, number] = [51.1657, 10.4515]
const DEFAULT_ZOOM = 6

// ---------- Helper: Layer toggle on the map ----------

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

// ---------- Helper: Fly to location ----------

function FlyToLocation({ center, zoom, bearing }: { center: [number, number]; zoom: number; bearing: number }) {
  const map = useMap()
  const didFly = useRef(false)

  useEffect(() => {
    if (didFly.current) return
    if (
      center[0] !== DEFAULT_CENTER[0] ||
      center[1] !== DEFAULT_CENTER[1] ||
      zoom !== DEFAULT_ZOOM
    ) {
      map.setView(center, zoom)
      // Restore saved bearing/rotation
      if (bearing && (map as L.Map & { setBearing?: (b: number) => void }).setBearing) {
        (map as L.Map & { setBearing: (b: number) => void }).setBearing(bearing)
      }
      didFly.current = true
    }
  }, [map, center, zoom, bearing])

  return null
}

// ---------- Helper: Search fly ----------

function SearchFly({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, 17, { duration: 1.5 })
    }
  }, [map, target])
  return null
}

// ---------- Main Component ----------

export function MapEditor() {
  const eventId = useAuthStore((s) => s.eventId)
  const mapData = useMapStore((s) => s.mapData)
  const isLoading = useMapStore((s) => s.isLoading)
  const subscribeToMap = useMapStore((s) => s.subscribeToMap)
  const saveMap = useMapStore((s) => s.saveMap)
  const restoreBackup = useMapStore((s) => s.restoreBackup)
  const renameBackup = useMapStore((s) => s.renameBackup)
  const deleteBackup = useMapStore((s) => s.deleteBackup)
  const publishMap = useMapStore((s) => s.publishMap)
  const deleteMap = useMapStore((s) => s.deleteMap)

  const [shapes, setShapes] = useState<GeoJSONFeature[]>([])
  const [activeCategory, setActiveCategory] = useState('other')
  const [activeColor, setActiveColor] = useState(PRESET_COLORS[0])
  const [tileLayer, setTileLayer] = useState<TileLayerType>('osm')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTarget, setSearchTarget] = useState<[number, number] | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mapName, setMapName] = useState('')
  const [shapeRenderKey, setShapeRenderKey] = useState(0)

  const mapRef = useRef<L.Map | null>(null)
  const pendingRerenderRef = useRef(false)

  // Subscribe to map data
  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToMap(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToMap])

  // Sync shapes from Firestore on initial load and after backup restore
  useEffect(() => {
    if (mapData) {
      setShapes(mapData.shapes || [])
      setMapName(mapData.name || '')
      // After backup restore, clear map layers and re-render saved shapes
      if (pendingRerenderRef.current) {
        pendingRerenderRef.current = false
        clearMapLayers()
        setShapeRenderKey((k) => k + 1)
      }
    }
  }, [mapData])

  // ---------- Search ----------

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchResults([])

    const fetchNominatim = async (params: URLSearchParams) => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            'User-Agent': 'SoSo-App/1.0',
            Accept: 'application/json',
          },
        }
      )
      if (!response.ok) throw new Error('Suche fehlgeschlagen')
      return (await response.json()) as NominatimResult[]
    }

    try {
      let data: NominatimResult[] = []

      // Check if query contains a comma (e.g. "Dorfstraße 69, Neudersum")
      const parts = searchQuery.split(',').map((p) => p.trim()).filter(Boolean)

      if (parts.length >= 2) {
        // Structured search: split into street + city for better house number support
        // Nominatim expects street as "<housenumber> <streetname>"
        // German format is "Straße Nr" → convert to "Nr Straße" for Nominatim
        const streetPart = parts[0]
        const cityPart = parts.slice(1).join(', ')

        // Rearrange "Dorfstraße 69" → "69 Dorfstraße" for Nominatim
        const houseNumberMatch = streetPart.match(/^(.+?)\s+(\d+\s*\w?)$/)
        const nominatimStreet = houseNumberMatch
          ? `${houseNumberMatch[2]} ${houseNumberMatch[1]}`
          : streetPart

        data = await fetchNominatim(new URLSearchParams({
          street: nominatimStreet,
          city: cityPart,
          format: 'jsonv2',
          limit: '5',
          countrycodes: 'de',
          addressdetails: '1',
        }))

        // Fallback: try with original street format if rearranged didn't work
        if (data.length === 0 && houseNumberMatch) {
          data = await fetchNominatim(new URLSearchParams({
            street: streetPart,
            city: cityPart,
            format: 'jsonv2',
            limit: '5',
            countrycodes: 'de',
            addressdetails: '1',
          }))
        }
      }

      // Fallback: free-text search
      if (data.length === 0) {
        data = await fetchNominatim(new URLSearchParams({
          q: searchQuery,
          format: 'jsonv2',
          limit: '5',
          countrycodes: 'de',
          addressdetails: '1',
        }))
      }

      setSearchResults(data)

      if (data.length === 0) {
        useToastStore.getState().addToast('Keine Ergebnisse gefunden', 'info')
      }
    } catch (error) {
      console.error('Search error:', error)
      useToastStore.getState().addToast('Fehler bei der Adresssuche', 'error')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleSelectResult = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setSearchTarget([lat, lng])
    setSearchResults([])
    setSearchQuery(result.display_name)
  }, [])

  // ---------- Map layer helpers ----------

  const clearMapLayers = useCallback(() => {
    if (!mapRef.current) return
    mapRef.current.eachLayer((layer) => {
      if (
        (layer instanceof L.Path || layer instanceof L.Marker) &&
        !(layer as unknown as L.TileLayer).getTileUrl
      ) {
        mapRef.current!.removeLayer(layer)
      }
    })
  }, [])

  // ---------- Shape handlers ----------

  const handleShapeCreated = useCallback((feature: GeoJSONFeature) => {
    setShapes((prev) => [...prev, feature])
  }, [])

  const handleShapeEdited = useCallback((feature: GeoJSONFeature) => {
    setShapes((prev) =>
      prev.map((s) => (s.properties.id === feature.properties.id ? feature : s))
    )
  }, [])

  const handleUpdateShapeProps = useCallback(
    (shapeId: string, updates: Partial<GeoJSONFeature['properties']>) => {
      setShapes((prev) =>
        prev.map((s) =>
          s.properties.id === shapeId
            ? { ...s, properties: { ...s.properties, ...updates } }
            : s
        )
      )
    },
    []
  )

  const handleShapeDeleted = useCallback((layerId: string) => {
    setShapes((prev) => prev.filter((s) => s.properties.id !== layerId))
  }, [])

  // ---------- Actions ----------

  const handleSave = async () => {
    if (!eventId) return
    setIsSaving(true)

    const map = mapRef.current
    const center = map
      ? { lat: map.getCenter().lat, lng: map.getCenter().lng }
      : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
    const zoom = map ? map.getZoom() : DEFAULT_ZOOM
    const bearing = map && (map as L.Map & { getBearing?: () => number }).getBearing
      ? (map as L.Map & { getBearing: () => number }).getBearing()
      : 0

    await saveMap(eventId, {
      name: mapName || 'Geländeplan',
      center,
      zoom,
      bearing,
      shapes,
    })

    setIsSaving(false)
  }

  const handlePublishToggle = async () => {
    if (!mapData) return
    await publishMap(mapData.id, !mapData.isPublished)
  }

  const handleReset = () => {
    if (mapData) {
      setShapes(mapData.shapes || [])
      clearMapLayers()
      setShapeRenderKey((k) => k + 1)
      useToastStore.getState().addToast('Karte auf letzten Stand zurückgesetzt', 'info')
    } else {
      setShapes([])
      clearMapLayers()
      useToastStore.getState().addToast('Alle Zeichnungen entfernt', 'info')
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    pendingRerenderRef.current = true
    await restoreBackup(backupId)
  }

  const handleDelete = async () => {
    if (!mapData) return
    await deleteMap(mapData.id)
    setShapes([])
    setMapName('')
    setShowDeleteModal(false)
  }

  // ---------- Initial center/zoom ----------

  const initialCenter: [number, number] = mapData
    ? [mapData.center.lat, mapData.center.lng]
    : DEFAULT_CENTER
  const initialZoom = mapData ? mapData.zoom : DEFAULT_ZOOM
  const initialBearing = mapData?.bearing ?? 0

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center text-warm-400">
        Karte wird geladen...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map name */}
      <div className="max-w-sm">
        <Input
          label="Kartenname"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          placeholder="z.B. Geländeplan Sommerfest"
        />
      </div>

      {/* Address search */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Adresse eingeben..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            variant="outline"
          >
            {isSearching ? 'Suche...' : 'Suchen'}
          </Button>
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-warm-200 shadow-lg z-[1001] max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-4 py-3 text-sm text-warm-700 hover:bg-warm-50 border-b border-warm-100 last:border-b-0 transition-colors cursor-pointer"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category toolbar */}
      <div className="rounded-xl border border-warm-100 bg-white p-3">
        <p className="text-xs font-medium text-warm-400 uppercase tracking-wider mb-2">
          Kategorie für nächste Zeichnung
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeCategory === cat.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Color picker */}
        <div className="mt-3 flex items-center gap-3">
          <p className="text-xs font-medium text-warm-400 uppercase tracking-wider">
            Farbe
          </p>
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setActiveColor(color)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all cursor-pointer',
                  activeColor === color
                    ? 'border-warm-800 scale-110'
                    : 'border-transparent hover:border-warm-300'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-warm-200">
        <LayerToggle activeLayer={tileLayer} onToggle={setTileLayer} />

        {/* Reset rotation button */}
        <div className="absolute bottom-3 right-3 z-[1000]">
          <button
            type="button"
            onClick={() => {
              if (mapRef.current && (mapRef.current as L.Map & { setBearing?: (b: number) => void }).setBearing) {
                (mapRef.current as L.Map & { setBearing: (b: number) => void }).setBearing(0)
              }
            }}
            className="px-3 py-1.5 text-xs font-medium bg-white text-warm-600 hover:bg-warm-50 rounded-lg shadow-md border border-warm-200 transition-colors cursor-pointer"
            title="Rotation zurücksetzen"
          >
            Norden oben
          </button>
        </div>

        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          className="w-full"
          style={{ height: '500px', minHeight: '400px' }}
          ref={mapRef}
          // leaflet-rotate options
          {...({ rotate: true, bearing: 0, shiftKeyRotate: true, touchRotate: true, maxZoom: MAX_ZOOM } as Record<string, unknown>)}
        >
          <TileLayer
            key={tileLayer}
            url={TILE_LAYERS[tileLayer].url}
            attribution={TILE_LAYERS[tileLayer].attribution}
            maxNativeZoom={TILE_LAYERS[tileLayer].maxNativeZoom}
            maxZoom={MAX_ZOOM}
          />
          <FlyToLocation center={initialCenter} zoom={initialZoom} bearing={initialBearing} />
          <SearchFly target={searchTarget} />
          <GeomanControls
            key={shapeRenderKey}
            onShapeCreated={handleShapeCreated}
            onShapeEdited={handleShapeEdited}
            onShapeDeleted={handleShapeDeleted}
            activeCategory={activeCategory}
            activeColor={activeColor}
            initialShapes={shapes}
          />
        </MapContainer>
      </div>

      {/* Shape count + rotation hint */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-warm-400">
          {shapes.length === 0
            ? 'Noch keine Formen gezeichnet. Nutze die Werkzeuge oben links auf der Karte.'
            : `${shapes.length} Form${shapes.length === 1 ? '' : 'en'} gezeichnet`}
        </p>
        <p className="text-xs text-warm-400">
          Shift + Mausziehen = Karte drehen
        </p>
      </div>

      {/* Shapes list - edit category, color, label */}
      {shapes.length > 0 && (
        <div className="rounded-xl border border-warm-100 bg-white p-3">
          <p className="text-xs font-medium text-warm-400 uppercase tracking-wider mb-2">
            Gezeichnete Formen
          </p>
          <div className="space-y-2">
            {shapes.map((shape) => {
              const cat = CATEGORIES.find((c) => c.id === shape.properties.category)
              return (
                <div
                  key={shape.properties.id}
                  className="flex items-center gap-2 bg-warm-50 rounded-lg px-3 py-2"
                >
                  {/* Category selector */}
                  <select
                    value={shape.properties.category}
                    onChange={(e) =>
                      handleUpdateShapeProps(shape.properties.id, {
                        category: e.target.value,
                      })
                    }
                    className="text-xs bg-white border border-warm-200 rounded-lg px-2 py-1.5 text-warm-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-400"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>

                  {/* Label input */}
                  <input
                    type="text"
                    value={shape.properties.label}
                    onChange={(e) =>
                      handleUpdateShapeProps(shape.properties.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder={cat?.label || 'Beschriftung'}
                    className="text-sm text-warm-700 bg-transparent border-b border-transparent hover:border-warm-300 focus:border-primary-400 focus:outline-none px-1 py-0.5 min-w-0 flex-1 placeholder:text-warm-300"
                  />

                  {/* Color picker */}
                  <div className="flex gap-1 shrink-0">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          handleUpdateShapeProps(shape.properties.id, {
                            color,
                          })
                        }
                        className={cn(
                          'w-4 h-4 rounded-full border transition-all cursor-pointer',
                          shape.properties.color === color
                            ? 'border-warm-800 scale-110'
                            : 'border-transparent hover:border-warm-300'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Geometry type indicator */}
                  <span className="text-xs text-warm-300 shrink-0">
                    {shape.geometry.type === 'Point'
                      ? 'Punkt'
                      : shape.geometry.type === 'LineString'
                        ? 'Linie'
                        : shape.geometry.type === 'Polygon'
                          ? 'Fläche'
                          : shape.geometry.type}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Save / Reset / Publish action bar */}
      <div className="rounded-xl border border-warm-100 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Speichern...' : 'Karte speichern'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
          >
            Karte zurücksetzen
          </Button>

          {mapData && (
            <>
              <Button
                variant={mapData.isPublished ? 'outline' : 'secondary'}
                onClick={handlePublishToggle}
              >
                {mapData.isPublished ? 'Verbergen' : 'Veröffentlichen'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteModal(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Karte löschen
              </Button>
            </>
          )}
        </div>

        {/* Backup history */}
        {mapData && (mapData.backups || []).length > 0 && (
          <div className="border-t border-warm-100 pt-3">
            <p className="text-xs font-medium text-warm-400 uppercase tracking-wider mb-2">
              Gespeicherte Versionen
            </p>
            <div className="space-y-1.5">
              {(mapData.backups || []).map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between bg-warm-50 rounded-lg px-3 py-2 gap-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-warm-400 whitespace-nowrap">
                      {backup.label}
                    </span>
                    <input
                      type="text"
                      defaultValue={backup.name || ''}
                      placeholder="Name (optional)"
                      onBlur={(e) => {
                        const newName = e.target.value.trim()
                        if (newName !== (backup.name || '')) {
                          renameBackup(backup.id, newName)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                      className="text-sm text-warm-700 bg-transparent border-b border-transparent hover:border-warm-300 focus:border-primary-400 focus:outline-none px-1 py-0.5 min-w-0 flex-1 placeholder:text-warm-300"
                    />
                    <span className="text-xs text-warm-400 whitespace-nowrap">
                      {backup.shapes.length} Form{backup.shapes.length === 1 ? '' : 'en'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleRestoreBackup(backup.id)}
                      className="text-xs px-2 py-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                    >
                      Wiederherstellen
                    </Button>
                    <button
                      type="button"
                      onClick={() => deleteBackup(backup.id)}
                      className="p-1.5 rounded-lg text-warm-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Backup löschen"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Karte löschen?"
      >
        <p className="text-sm text-warm-600 mb-6">
          Möchtest du die Karte wirklich löschen? Alle Zeichnungen gehen
          dabei verloren. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Endgültig löschen
          </Button>
        </div>
      </Modal>
    </div>
  )
}
