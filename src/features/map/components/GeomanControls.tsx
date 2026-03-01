import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import type { GeoJSONFeature } from '@/lib/firebase/types'

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

function shapeTooltipContent(properties: GeoJSONFeature['properties']): string {
  const icon = CATEGORY_ICONS[properties.category] || ''
  return properties.label ? `${icon} ${properties.label}` : icon
}

interface GeomanControlsProps {
  onShapeCreated: (feature: GeoJSONFeature) => void
  onShapeEdited: (feature: GeoJSONFeature) => void
  onShapeDeleted: (shapeId: string) => void
  activeCategory: string
  activeColor: string
  initialShapes?: GeoJSONFeature[]
}

/**
 * Convert a Leaflet layer to our GeoJSONFeature format.
 * Uses a persistent UUID stored on the layer instead of Leaflet's volatile _leaflet_id.
 * Preserves saved properties for previously loaded shapes.
 */
function layerToFeature(
  layer: L.Layer,
  category: string,
  color: string
): GeoJSONFeature | null {
  if (!('toGeoJSON' in layer)) return null

  const geoLayer = layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature }
  const geojson = geoLayer.toGeoJSON()
  const anyLayer = layer as Record<string, unknown>

  // Use persistent ID if available, otherwise generate a new UUID
  const id = (anyLayer._persistentId as string) || crypto.randomUUID()
  anyLayer._persistentId = id

  // For edited existing shapes, preserve their saved properties
  const saved = anyLayer._shapeProps as GeoJSONFeature['properties'] | undefined

  const properties: GeoJSONFeature['properties'] = {
    id,
    label: saved?.label ?? '',
    category: saved?.category ?? category,
    color: saved?.color ?? color,
    strokeColor: saved?.strokeColor ?? '#44403c',
    strokeWidth: saved?.strokeWidth ?? 2,
    opacity: saved?.opacity ?? 0.5,
  }

  // Preserve circle radius (toGeoJSON converts circles to Point, losing radius)
  if (layer instanceof L.Circle) {
    properties.radius = (layer as L.Circle).getRadius()
    properties.shapeType = 'Circle'
  } else if (saved?.shapeType) {
    properties.shapeType = saved.shapeType
    if (saved.radius != null) properties.radius = saved.radius
  }

  return {
    type: 'Feature',
    geometry: geojson.geometry as GeoJSONFeature['geometry'],
    properties,
  }
}

/**
 * Add a saved GeoJSON shape to the Leaflet map as an editable layer.
 * Handles circles specially since GeoJSON can't represent them natively.
 */
function addShapeToMap(map: L.Map, shape: GeoJSONFeature) {
  const style: L.PathOptions = {
    color: shape.properties.strokeColor || '#44403c',
    weight: shape.properties.strokeWidth || 2,
    fillColor: shape.properties.color || '#8b5cf6',
    fillOpacity: shape.properties.opacity ?? 0.5,
  }

  // Handle circles specially (GeoJSON Point + saved radius)
  if (shape.properties.shapeType === 'Circle' && shape.geometry.type === 'Point') {
    const coords = shape.geometry.coordinates as number[]
    const circle = L.circle([coords[1], coords[0]], {
      radius: shape.properties.radius || 50,
      ...style,
    })
    const anyCircle = circle as unknown as Record<string, unknown>
    anyCircle._persistentId = shape.properties.id
    anyCircle._shapeProps = { ...shape.properties }
    circle.bindTooltip(shapeTooltipContent(shape.properties), {
      permanent: true,
      direction: 'center',
      className: 'shape-label',
    })
    circle.addTo(map)
    return
  }

  // Handle all other shapes via L.geoJSON
  const geoJsonLayer = L.geoJSON(
    {
      type: 'Feature',
      geometry: shape.geometry,
      properties: shape.properties,
    } as GeoJSON.Feature,
    {
      style: () => style,
      pointToLayer: (_feature, latlng) => L.marker(latlng),
    }
  )

  geoJsonLayer.eachLayer((subLayer) => {
    const anyLayer = subLayer as unknown as Record<string, unknown>
    anyLayer._persistentId = shape.properties.id
    anyLayer._shapeProps = { ...shape.properties }
    subLayer.bindTooltip(shapeTooltipContent(shape.properties), {
      permanent: true,
      direction: 'center',
      className: 'shape-label',
    })
    subLayer.addTo(map)
  })
}

export function GeomanControls({
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
  activeCategory,
  activeColor,
  initialShapes,
}: GeomanControlsProps) {
  const map = useMap()
  const categoryRef = useRef(activeCategory)
  const colorRef = useRef(activeColor)
  const shapesLoadedRef = useRef(false)

  // Keep refs in sync
  useEffect(() => {
    categoryRef.current = activeCategory
  }, [activeCategory])

  useEffect(() => {
    colorRef.current = activeColor
  }, [activeColor])

  // Render saved shapes onto the Leaflet map (once per mount)
  useEffect(() => {
    if (!map || shapesLoadedRef.current || !initialShapes?.length) return
    shapesLoadedRef.current = true

    initialShapes.forEach((shape) => {
      try {
        addShapeToMap(map, shape)
      } catch (err) {
        console.error('Error loading saved shape:', err, shape)
      }
    })
  }, [map, initialShapes])

  // Initialize geoman controls and event handlers
  useEffect(() => {
    if (!map) return

    map.pm.addControls({
      position: 'topleft',
      drawMarker: true,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: true,
      drawText: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
      rotateMode: true,
    })

    map.pm.setGlobalOptions({
      pathOptions: {
        color: '#44403c',
        fillColor: '#8b5cf6',
        fillOpacity: 0.5,
        weight: 2,
      },
    })

    // Attach pm:edit listener to a layer (fires on vertex/resize changes)
    const attachLayerEditListener = (layer: L.Layer) => {
      layer.on('pm:edit', () => {
        const feature = layerToFeature(
          layer,
          categoryRef.current,
          colorRef.current
        )
        if (feature) {
          onShapeEdited(feature)
        }
      })
    }

    // Attach edit listeners to all existing layers already on the map
    map.eachLayer((layer) => {
      const anyLayer = layer as unknown as Record<string, unknown>
      if (anyLayer._persistentId) {
        attachLayerEditListener(layer)
      }
    })

    // Listen for shape creation
    const handleCreate = (e: { layer: L.Layer }) => {
      const feature = layerToFeature(
        e.layer,
        categoryRef.current,
        colorRef.current
      )
      if (feature) {
        onShapeCreated(feature)
        attachLayerEditListener(e.layer)
      }
    }

    // Listen for shape removal
    const handleRemove = (e: { layer: L.Layer }) => {
      const anyLayer = e.layer as unknown as Record<string, unknown>
      const id =
        (anyLayer._persistentId as string) ||
        String(anyLayer._leaflet_id)
      onShapeDeleted(id)
    }

    // Listen for drag and rotate end (these don't fire layer pm:edit)
    const handleDragEnd = (e: { layer: L.Layer }) => {
      const feature = layerToFeature(
        e.layer,
        categoryRef.current,
        colorRef.current
      )
      if (feature) {
        onShapeEdited(feature)
      }
    }

    map.on('pm:create', handleCreate)
    map.on('pm:remove', handleRemove)
    map.on('pm:dragend', handleDragEnd)
    map.on('pm:rotateend', handleDragEnd)

    return () => {
      map.off('pm:create', handleCreate)
      map.off('pm:remove', handleRemove)
      map.off('pm:dragend', handleDragEnd)
      map.off('pm:rotateend', handleDragEnd)
      if (map.pm) {
        map.pm.removeControls()
      }
    }
  }, [map, onShapeCreated, onShapeEdited, onShapeDeleted])

  // Update drawing style when color changes
  useEffect(() => {
    if (!map) return
    map.pm.setGlobalOptions({
      pathOptions: {
        color: '#44403c',
        fillColor: activeColor,
        fillOpacity: 0.5,
        weight: 2,
      },
    })
  }, [map, activeColor])

  return null
}
