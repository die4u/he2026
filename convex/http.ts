import { httpRouter } from 'convex/server';
import { auth } from './auth';

const http = httpRouter();

// Required by @convex-dev/auth for OAuth callback handling
auth.addHttpRoutes(http);

export default http;
