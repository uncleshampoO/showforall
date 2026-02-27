import { motion, useAnimationFrame, useMotionValue, motionValue } from 'framer-motion'
import { useEffect, useState, useMemo, useRef } from 'react'

// Physics - Autonomous Drift (No Mouse Interaction)
const BLOB_COHESION_FORCE = 0.03   // Weaker pull for heavy objects
const BLOB_SEPARATION_FORCE = 5    // Gentle separation
const BLOB_DAMPING = 0.995         // Extremely low friction (Orbit-like)
const BLOB_SPEED_LIMIT = 1.5
const WALL_BOUNCE = 0.8 // Bouncy walls

const random = (min, max) => Math.random() * (max - min) + min
// Safer pickResult
const pickResult = (arr) => {
  if (!arr || arr.length === 0) return '#fff'
  return arr[Math.floor(Math.random() * arr.length)]
}

const Blob = ({ id, color, size, x, y }) => {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        x,
        y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        zIndex: 1,
      }}
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 0.95, 1.05, 1],
          rotate: [0, 90, 180, 270, 360],
          borderRadius: [
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "40% 60% 70% 30% / 50% 60% 30% 60%",
            "60% 40% 30% 70% / 60% 30% 70% 40%"
          ]
        }}
        transition={{
          duration: random(30, 60), // Graceful, slow morphing
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: random(0, 5)
        }}
        style={{
          width: '100%',
          height: '100%',
          background: color,
        }}
      />
    </motion.div>
  )
}

export default function LiquidBackground() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef(null)

  // Responsive Setup
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  const blobCount = isMobile ? 6 : 6 // Same count, different sizes

  // Dynamic size range based on device
  const minSize = isMobile ? 150 : 600
  const maxSize = isMobile ? 300 : 1000

  const blobs = useMemo(() => {
    if (typeof window === 'undefined') return []

    // "Cool Cyber" Palette (No Pink/Red)
    const colors = [
      '#4a00e0', // Team Violet
      '#00f2ff', // Team Cyan (Turquoise)
      '#4361ee', // Team Blue (New Deep Blue)
    ]

    return Array.from({ length: blobCount }).map((_, i) => {
      // Responsive sizes
      const sizePx = random(minSize, maxSize)

      return {
        id: i,
        x: motionValue(random(0, window.innerWidth - sizePx)),
        y: motionValue(random(0, window.innerHeight - sizePx)),
        vx: random(-0.3, 0.3),
        vy: random(-0.3, 0.3),
        radius: sizePx / 2,
        size: sizePx,
        color: pickResult(colors),
        mass: sizePx / 10 // Very Heavy
      }
    })
  }, [isMobile])

  useEffect(() => {
    setMounted(true)
  }, [])


  // The Physics Engine
  useAnimationFrame((t, delta) => {
    if (!containerRef.current) return
    const dt = Math.min(delta, 50) / 16
    const width = window.innerWidth
    const height = window.innerHeight

    blobs.forEach((blob, i) => {
      let fx = 0
      let fy = 0

      // 2. Blob-to-Blob Interaction
      blobs.forEach((other, j) => {
        if (i === j) return

        const dx = (blob.x.get() + blob.radius) - (other.x.get() + other.radius)
        const dy = (blob.y.get() + blob.radius) - (other.y.get() + other.radius)
        const dist = Math.sqrt(dx * dx + dy * dy)
        const combinedRadius = blob.radius + other.radius

        // A. Separation
        if (dist < combinedRadius * 0.6) { // Allow 40% overlap
          const overlap = (combinedRadius * 0.6) - dist
          const angle = Math.atan2(dy, dx)
          const force = overlap * BLOB_SEPARATION_FORCE
          fx += Math.cos(angle) * force
          fy += Math.sin(angle) * force
        }

        // B. Cohesion (Same Color Attraction)
        if (blob.color === other.color) {
          if (dist < 1200 && dist > combinedRadius * 0.4) {
            const angleToOther = Math.atan2(-dy, -dx)
            fx += Math.cos(angleToOther) * BLOB_COHESION_FORCE * combinedRadius
            fy += Math.sin(angleToOther) * BLOB_COHESION_FORCE * combinedRadius
          }
        }
        // C. Repulsion (Different Color Separation)
        else {
          if (dist < combinedRadius + 50) {
            const angle = Math.atan2(dy, dx)
            const force = (combinedRadius + 50 - dist) * 0.5
            fx += Math.cos(angle) * force
            fy += Math.sin(angle) * force
          }
        }
      })

      // 3. Apply Forces
      blob.vx += fx * 0.0002 // Lower force for massive objects
      blob.vy += fy * 0.0002

      // 4. Ambient Drift
      blob.vx += random(-0.01, 0.01)
      blob.vy += random(-0.01, 0.01)

      // 5. Update Position
      let newX = blob.x.get() + blob.vx * dt
      let newY = blob.y.get() + blob.vy * dt

      // 6. Walls (Strict Bounce)
      if (newX < -blob.radius * 0.5) {
        newX = -blob.radius * 0.5;
        blob.vx *= -1 * WALL_BOUNCE;
      }
      if (newX > width - blob.radius * 1.5) {
        newX = width - blob.radius * 1.5;
        blob.vx *= -1 * WALL_BOUNCE;
      }
      if (newY < -blob.radius * 0.5) {
        newY = -blob.radius * 0.5;
        blob.vy *= -1 * WALL_BOUNCE;
      }
      if (newY > height - blob.radius * 1.5) {
        newY = height - blob.radius * 1.5;
        blob.vy *= -1 * WALL_BOUNCE;
      }

      // 7. Damping
      blob.vx *= BLOB_DAMPING
      blob.vy *= BLOB_DAMPING

      const speed = Math.sqrt(blob.vx * blob.vx + blob.vy * blob.vy)
      if (speed > BLOB_SPEED_LIMIT) {
        blob.vx = (blob.vx / speed) * BLOB_SPEED_LIMIT
        blob.vy = (blob.vy / speed) * BLOB_SPEED_LIMIT
      }

      blob.x.set(newX)
      blob.y.set(newY)
    })
  })

  if (!mounted) return null

  return (
    <div ref={containerRef} className="liquid-background-container">
      <div className="blobs-layer">
        {blobs.map((blob) => (
          <Blob
            key={blob.id}
            {...blob}
          />
        ))}
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" className="goo-filter">
        <defs>
          <filter id="neon-goo">
            {/* Large blur for soft dreamy glow */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="80" result="blur" />
          </filter>
        </defs>
      </svg>

      <style>{`
                .liquid-background-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: -1;
                overflow: hidden;
                /* Deep Gradient Background for improved depth */
                background: linear-gradient(135deg, #050510 0%, #1a0b2e 100%);
                }

                .blobs-layer {
                width: 100%;
                height: 100%;
                opacity: 0.5; /* Soft glow visible but not overwhelming */
                filter: url(#neon-goo);
                }
                
                .goo-filter {
                    position: absolute;
                    width: 0;
                    height: 0;
                    visibility: hidden;
                }
                
                @media (max-width: 768px) {
                    .blobs-layer {
                         filter: url(#neon-goo);
                         opacity: 0.35;
                    }
                }
            `}</style>
    </div>
  )
}
