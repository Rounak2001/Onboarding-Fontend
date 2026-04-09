import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

const IGNORED_SENTRY_ERROR_PATTERNS = [
  /^Error invoking postMessage: Java object is gone$/,
]

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  ignoreErrors: IGNORED_SENTRY_ERROR_PATTERNS,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  beforeSend(event, hint) {
    const message =
      hint.originalException instanceof Error
        ? hint.originalException.message
        : event.exception?.values?.[0]?.value || event.message || ''

    if (IGNORED_SENTRY_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return null
    }

    return event
  },
})

createRoot(document.getElementById('root')).render(
  <>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong</p>}>
      <App />
    </Sentry.ErrorBoundary>
    <Analytics />
  </>,
)
