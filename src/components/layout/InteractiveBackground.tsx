import { useEffect, useRef } from 'react'

/**
 * InteractiveBackground — exact port of the conductor app's animated canvas.
 * Renders soft floating orbs on the dark gradient background.
 * Fixed position, z-index 0, pointer-events none — never blocks interaction.
 */
export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── Resize handler ────────────────────────────────────────────────────
    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Orb definition ────────────────────────────────────────────────────
    interface Orb {
      x: number; y: number
      vx: number; vy: number
      radius: number
      color: string
      opacity: number
    }

    const orbs: Orb[] = [
      {
        x: canvas.width  * 0.15, y: canvas.height * 0.20,
        vx: 0.15, vy: 0.10,
        radius: Math.min(canvas.width, canvas.height) * 0.28,
        color: '#F97316', opacity: 0.055,
      },
      {
        x: canvas.width  * 0.80, y: canvas.height * 0.75,
        vx: -0.12, vy: -0.08,
        radius: Math.min(canvas.width, canvas.height) * 0.22,
        color: '#FB923C', opacity: 0.040,
      },
      {
        x: canvas.width  * 0.50, y: canvas.height * 0.45,
        vx: 0.07, vy: -0.12,
        radius: Math.min(canvas.width, canvas.height) * 0.18,
        color: '#3B82F6', opacity: 0.025,
      },
      {
        x: canvas.width  * 0.85, y: canvas.height * 0.15,
        vx: -0.09, vy: 0.14,
        radius: Math.min(canvas.width, canvas.height) * 0.15,
        color: '#F97316', opacity: 0.030,
      },
    ]

    let rafId: number

    function draw() {
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      orbs.forEach(orb => {
        // Move
        orb.x += orb.vx
        orb.y += orb.vy

        // Bounce off edges with padding
        const pad = orb.radius * 0.5
        if (orb.x < -pad || orb.x > canvas.width  + pad) orb.vx *= -1
        if (orb.y < -pad || orb.y > canvas.height + pad) orb.vy *= -1

        // Draw radial gradient orb
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        grad.addColorStop(0,   hexToRgba(orb.color, orb.opacity))
        grad.addColorStop(0.5, hexToRgba(orb.color, orb.opacity * 0.4))
        grad.addColorStop(1,   hexToRgba(orb.color, 0))

        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="interactive-bg" aria-hidden="true">
      <div className="interactive-bg__gradient" />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 1,
        }}
      />
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
