import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import type { GeoJSONFeature } from '@/lib/firebase/types'

interface GeomanControlsProps {
  onShapeCreated: (feature: GeoJSONFeature) => void
  onShapeEdited: (feature: GeoJSONFeature) => void
  onShapeDeleted: (layerId: string) => void
  activeCategory: string
  activeColor: string
}

function layerToFeature(
  layer: L.Layer,
  category: string,
  color: string
): GeoJSONFeature | null {
  if (!('toGeoJSON' in layer)) return null

  const geoLayer = layer as L.Layer & {
    toGeoJSON: () => GeoJSON.Feature
    _leaflet_id: number
  }
  const geojson = geoLayer.toGeoJSON()

  return {
    type: 'Feature',
    geometry: geojson.geometry as GeoJSONFeature['geometry'],
    properties: {
      id: String(geoLayer._leaflet_id),
      label: '',
      category,
      color,
      strokeColor: '#44403c',
      strokeWidth: 2,
      opacity: 0.5,
    },
  }
}

export function GeomanControls({
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
  activeCategory,
  activeColor,
}: GeomanControlsProps) {
  const map = useMap()
  const categoryRef = useRef(activeCategory)
  const colorRef = useRef(activeColor)

  // Keep refs in sync
  useEffect(() => {
    categoryRef.current = activeCategory
  }, [activeCategory])

  useEffect(() => {
    colorRef.current = activeColor
  }, [activeColor])

  useEffect(() => {
    if (!map) return

    // Initialize geoman controls
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

    // Set global drawing options
    map.pm.setGlobalOptions({
      pathOptions: {
        color: '#44403c',
        fillColor: '#8b5cf6',
        fillOpacity: 0.5,
        weight: 2,
      },
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
      }
    }

    // Listen for shape edits
    const handleEdit = (e: { layer: L.Layer }) => {
      const feature = layerToFeature(
        e.layer,
        categoryRef.current,
        colorRef.current
      )
      if (feature) {
        onShapeEdited(feature)
      }
    }

    // Listen for shape removal
    const handleRemove = (e: { layer: L.Layer }) => {
      const geoLayer = e.layer as L.Layer & { _leaflet_id: number }
      onShapeDeleted(String(geoLayer._leaflet_id))
    }

    map.on('pm:create', handleCreate)
    map.on('pm:edit', handleEdit)
    map.on('pm:remove', handleRemove)

    return () => {
      map.off('pm:create', handleCreate)
      map.off('pm:edit', handleEdit)
      map.off('pm:remove', handleRemove)
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
