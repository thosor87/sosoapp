import type { Timestamp } from 'firebase/firestore'

export interface EventConfig {
  id: string
  year: number
  title: string
  date: Timestamp
  location: string
  accessToken: string
  adminPasswordHash: string
  adminEmail?: string
  foodLimit?: number
  announcements: Announcement[]
  isRegistrationOpen: boolean
  timelineNotesTop?: string
  timelineNotesBottom?: string
  timelineNotesTopPublic?: string
  timelineNotesBottomPublic?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'highlight'
  order: number
  isVisible: boolean
}

export interface Registration {
  id: string
  eventId: string
  familyName: string
  contactName: string
  adultsCount: number
  childrenCount: number
  food: FoodContribution
  camping: CampingInfo
  comments: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FoodContribution {
  bringsCake: boolean
  cakeDescription: string
  bringsSalad: boolean
  saladDescription: string
  bringsOther?: boolean
  otherDescription?: string
}

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLog {
  id: string
  eventId: string
  action: AuditAction
  entityType: 'registration'
  entityId: string
  familyName: string
  summary: string
  performedBy: 'user' | 'admin'
  timestamp: Timestamp
}

export interface CampingInfo {
  wantsCamping: boolean
  tentCount: number
  personCount: number
  notes: string
}

export interface TimelineItem {
  id: string
  eventId: string
  time: string
  title: string
  description: string
  category: TimelineCategory
  order: number
  notes: string
  isVisible: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TimelineCategory = 'general' | 'food' | 'music' | 'games' | 'ceremony' | 'other'

export interface MapBackup {
  id: string
  timestamp: number
  label: string
  name: string
  shapes: GeoJSONFeature[]
  center: { lat: number; lng: number }
  zoom: number
  bearing: number
}

export interface MapDocument {
  id: string
  eventId: string
  name: string
  center: { lat: number; lng: number }
  zoom: number
  bearing: number
  shapes: GeoJSONFeature[]
  backups: MapBackup[]
  isPublished: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[] | number[][] | number[][][]
  }
  properties: {
    id: string
    label: string
    category: string
    color: string
    strokeColor: string
    strokeWidth: number
    opacity: number
    radius?: number
    shapeType?: string
  }
}
