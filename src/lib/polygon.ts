import { restClient } from '@polygon.io/client-js';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

if (!POLYGON_API_KEY) {
    // Warn but don't throw immediately to allow build time execution if not needed
    console.warn('POLYGON_API_KEY is not defined in environment variables.');
}

export const polygonClient = restClient(POLYGON_API_KEY || '');
