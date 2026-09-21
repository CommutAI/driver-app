/// <reference types="vite/client" />

// Image assets
declare module '*.png'  { const src: string; export default src }
declare module '*.jpg'  { const src: string; export default src }
declare module '*.jpeg' { const src: string; export default src }
declare module '*.svg'  { const src: string; export default src }
declare module '*.webp' { const src: string; export default src }

// Leaflet marker images (re-exported by Vite asset pipeline)
declare module 'leaflet/dist/images/*' { const src: string; export default src }
