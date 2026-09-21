import { useCallback, useEffect, useState } from 'react'
import { format, formatDuration, intervalToDuration } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronUp,
  Copy, Check,
  ArrowRight, ShieldCheck, Search,
  Calendar, TrendingUp, Bus,
  MapPin, Hourglass, Download,
} from 'lucide-react'

import { useAuth }  from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'
import StatusBadge   from '../components/ui/StatusBadge'
import type { Trip } from '../types'

function tripDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—'
  const dur = intervalToDuration({ start: new Date(start), end: new Date(end) })
  return formatDuration(dur, { format: ['hours', 'minutes'] }) || '< 1 min'
}

function routeParts(route: string | undefined) {
  if (!route) return { origin: 'Manolo Fortich Terminal', destination: 'Agora Terminal' }
  const parts = route.split(/[↔→\-–]/).map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) return { origin: parts[0], destination: parts[parts.length - 1] }
  return { origin: route, destination: route }
}

export default function HistoryPage() {
  const { user }    = useAuth()
  const [trips,    setTrips]    = useState<Trip[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter,   setFilter]   = useState<'all' | 'completed' | 'cancelled'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleCopy = (id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const filteredTrips = trips.filter(t => {
    // Status filter
    if (filter === 'completed' && t.status !== 'completed') return false
    if (filter === 'cancelled' && t.status !== 'cancelled') return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const bus = t.bus as any
      const searchableText = [
        t.starting_point,
        t.end_point,
        bus?.plate_number,
        bus?.route,
        t.id,
      ].join(' ').toLowerCase()
      if (!searchableText.includes(query)) return false
    }
    
    return true
  })

  const fetchHistory = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Demo driver fallback mock trips if needed
    if (user.id === 'demo-driver-uuid') {
      const now = Date.now()
      setTrips([
        {
          id: 'demo-hist-001',
          bus_id: 'bus-omanfortsco-001',
          conductor_id: user.id,
          driver_id: user.id,
          starting_point: 'Agora Terminal',
          end_point: 'Manolo Fortich Terminal',
          status: 'completed',
          started_at: new Date(now - 3600000 * 3).toISOString(),
          ended_at: new Date(now - 3600000 * 2.2).toISOString(),
          current_lat: 8.3663,
          current_lng: 124.8650,
          gps_updated_at: new Date(now - 3600000 * 2.2).toISOString(),
          bus: {
            id: 'bus-omanfortsco-001',
            plate_number: 'OMANFORTSCO-01',
            bus_number: 1,
            route: 'Agora Terminal → Manolo Fortich Terminal',
            seat_capacity: 31,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        },
        {
          id: 'demo-hist-002',
          bus_id: 'bus-omanfortsco-001',
          conductor_id: user.id,
          driver_id: user.id,
          starting_point: 'Manolo Fortich Terminal',
          end_point: 'Agora Terminal',
          status: 'completed',
          started_at: new Date(now - 3600000 * 7).toISOString(),
          ended_at: new Date(now - 3600000 * 6.25).toISOString(),
          current_lat: 8.4852,
          current_lng: 124.6567,
          gps_updated_at: new Date(now - 3600000 * 6.25).toISOString(),
          bus: {
            id: 'bus-omanfortsco-001',
            plate_number: 'OMANFORTSCO-01',
            bus_number: 1,
            route: 'Manolo Fortich Terminal → Agora Terminal',
            seat_capacity: 31,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        },
      ])
      setLoading(false)
      return
    }

    // Trips where this staff user was the conductor or driver
    const { data } = await (supabase
      .from('trips') as any)
      .select('*, bus:buses(*)')
      .or(`conductor_id.eq.${user.id},driver_id.eq.${user.id}`)
      .in('status', ['completed', 'cancelled'])
      .order('started_at', { ascending: false })
      .limit(50) as { data: Trip[] | null }

    setTrips(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const completedCount = trips.filter(t => t.status === 'completed').length
  const cancelledCount = trips.filter(t => t.status === 'cancelled').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}
    >
      <SectionHeader
        title="Trip History"
        subtitle="Historical journey logs & telemetry records"
        light
      />

      {/* Enhanced Stats Cards */}
      {!loading && trips.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { value: trips.length,   label: 'Total Trips', color: '#FFFFFF', icon: Bus },
            { value: completedCount, label: 'Completed',   color: '#4ADE80', icon: CheckCircle2 },
            { value: cancelledCount, label: 'Cancelled',   color: '#F87171', icon: XCircle },
            { value: `${Math.round((completedCount / trips.length) * 100)}%`, label: 'Success Rate', color: '#F97316', icon: TrendingUp },
          ].map(({ value, label, color, icon: Icon }) => (
            <SoftCard key={label} padding={12}>
              <div style={{ textAlign: 'center' }}>
                <Icon size={16} style={{ color, marginBottom: 4 }} />
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </p>
              </div>
            </SoftCard>
          ))}
        </div>
      )}

      {/* Search and Filter Bar */}
      {!loading && trips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)' 
              }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trips by route, plate number, or ID..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 44px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-primary)'
                e.target.style.background = 'rgba(255,255,255,0.08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                e.target.style.background = 'rgba(255,255,255,0.05)'
              }}
            />
          </div>

          {/* Filter Row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(15, 17, 23, 0.7)',
                padding: 4,
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                width: '100%',
              }}
            >
              {(['all', 'completed', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: filter === f ? 'var(--color-primary-gradient)' : 'transparent',
                    color: filter === f ? '#FFFFFF' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {f} ({f === 'all' ? trips.length : f === 'completed' ? completedCount : cancelledCount})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={32} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filteredTrips.length === 0 ? (
        <SoftCard padding={48}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <Clock size={28} color="var(--color-primary)" strokeWidth={1.5} />
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>
              No trips found
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {filter === 'all'
                ? 'Completed trips will appear here once finalized.'
                : `No ${filter} trips recorded in this period.`}
            </p>
          </div>
        </SoftCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTrips.map((trip, i) => {
            const isOpen = expanded === trip.id
            const isDone = trip.status === 'completed'
            const bus    = trip.bus as any
            const defaultParts = routeParts(bus?.route)
            const origin = trip.starting_point || defaultParts.origin
            const destination = trip.end_point || defaultParts.destination

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  background: 'linear-gradient(145deg, rgba(26, 29, 39, 0.85), rgba(15, 17, 23, 0.95))',
                  border: isOpen ? '1.5px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: isOpen ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.1)' : '0 4px 16px rgba(0,0,0,0.25)',
                  transition: 'all 0.25s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : trip.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {isDone ? (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: 'rgba(34, 197, 94, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <CheckCircle2 size={22} color="#4ADE80" />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: 'rgba(239, 68, 68, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <XCircle size={22} color="#F87171" />
                      </div>
                    )}
                  </div>

                  {/* Route & Metadata */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Origin -> Destination Visual Line */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#4ADE80' }}>{origin.split(' ')[0]}</span>
                      <ArrowRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />
                      <span style={{ color: '#F97316' }}>{destination.split(' ')[0]}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 6,
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Calendar size={12} />
                      <span>{format(new Date(trip.started_at), 'MMM d, yyyy')}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                      <Clock size={12} />
                      <span>{format(new Date(trip.started_at), 'h:mm a')}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                      <Bus size={12} />
                      <span
                        style={{
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {bus?.plate_number ?? bus?.bus_number ?? 'BUS-UNIT'}
                      </span>
                    </div>
                  </div>

                  {/* Status badge & Chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <StatusBadge variant={isDone ? 'success' : 'danger'}>
                      {isDone ? 'Completed' : 'Cancelled'}
                    </StatusBadge>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          padding: '12px 16px 16px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          background: 'rgba(0, 0, 0, 0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {/* Full Route Corridor Detail */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 14px',
                            borderRadius: 12,
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} />
                            <div style={{ width: 2, height: 20, background: 'rgba(255, 255, 255, 0.2)' }} />
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', boxShadow: '0 0 8px rgba(249,115,22,0.5)' }} />
                          </div>
                          <div style={{ flex: 1, fontSize: '0.82rem' }}>
                            <div style={{ color: '#FFFFFF', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={14} color="#4ADE80" />
                              {origin}
                            </div>
                            <div style={{ color: '#FFFFFF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={14} color="#F97316" />
                              {destination}
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Telemetry Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                          {[
                            { label: 'Started At', value: format(new Date(trip.started_at), 'h:mm a'), icon: Clock },
                            { label: 'Completed At', value: trip.ended_at ? format(new Date(trip.ended_at), 'h:mm a') : '—', icon: CheckCircle2 },
                            { label: 'Duration', value: tripDuration(trip.started_at, trip.ended_at), icon: Hourglass },
                            { label: 'Fleet Unit', value: bus?.plate_number ? `${bus.bus_number ? `BUS-${bus.bus_number} • ` : ''}${bus.plate_number}` : '—', icon: Bus },
                          ].map(({ label, value, icon: Icon }) => (
                            <div
                              key={label}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <Icon size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  {label}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Trip ID with Copy Action */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={14} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                              {trip.id.slice(0, 20)}…
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(trip.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: copiedId === trip.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 10px',
                              color: copiedId === trip.id ? '#4ADE80' : 'var(--text-secondary)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {copiedId === trip.id ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedId === trip.id ? 'Copied!' : 'Copy ID'}</span>
                          </button>
                        </div>

                        {/* Additional Actions */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-primary)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}
                          >
                            <Download size={14} />
                            Export Report
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '16px 0 8px',
          color: 'var(--text-tertiary)',
          fontSize: '0.75rem',
        }}
      >
        <ShieldCheck size={14} color="var(--text-tertiary)" />
        <span>Securely logged dispatch telemetry • {filteredTrips.length} records found</span>
      </div>
    </motion.div>
  )
}
