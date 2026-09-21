import { Outlet } from 'react-router-dom'
import InteractiveBackground from './InteractiveBackground'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

/**
 * AppShell — authenticated page wrapper.
 *
 * Layer order (bottom → top):
 *  0. InteractiveBackground  (fixed, z-0, pointer-events:none)
 *  1. Page content           (scrollable, z-1)
 *  2. TopBar                 (sticky, z-50)
 *  3. BottomNav pill         (fixed, z-40)
 */
export default function AppShell() {
  return (
    <>
      {/* Animated orb background — sits behind everything */}
      <InteractiveBackground />

      <div
        style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
      >
        <TopBar />

        <main
          className="flex-1 overflow-y-auto page-content"
          style={{ paddingTop: 8 }}
        >
          <div style={{ width: '100%', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>

        <BottomNav />
      </div>
    </>
  )
}
