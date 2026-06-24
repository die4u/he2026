import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { BeachTripApp } from '../beach-trip-video.jsx';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConvexAuthProvider client={convex}>
    <BeachTripApp />
  </ConvexAuthProvider>
);
