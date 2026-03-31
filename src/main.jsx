import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

Sentry.init({
  dsn:
    import.meta.env.VITE_SENTRY_DSN ||
    'https://61f9150ec43c1683b563db8d2476d57a@o4510925533741056.ingest.us.sentry.io/4511137473232896',
  sendDefaultPii: true,
})

createRoot(document.getElementById('root')).render(
  <App />,
)
