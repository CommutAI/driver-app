import { useState, useEffect } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isReconnecting: boolean
  statusLabel: 'Online' | 'Offline' | 'Reconnecting'
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsReconnecting(true)
      // Brief reconnecting buffer to verify connection
      setTimeout(() => {
        setIsOnline(true)
        setIsReconnecting(false)
      }, 1200)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsReconnecting(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const statusLabel = !isOnline ? 'Offline' : isReconnecting ? 'Reconnecting' : 'Online'

  return { isOnline, isReconnecting, statusLabel }
}
