import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.driver.app',
  appName: 'Driver App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Allow OSRM API domain
    allowNavigation: ['*']
  },
  android: {
    webContentsDebuggingEnabled: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  // Environment variables for Capacitor builds
  env: {
    VITE_SUPABASE_URL: 'https://iyacktzzktwrpeibcena.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YWNrdHp6a3R3cnBlaWJjZW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNzAxMzMsImV4cCI6MjEwNjY0NjEzM30.nnUW_wjKE9t6V_ZNNR1u_HqcqQletGEsJ4A2kcBLxl0'
  }
};

export default config;
