/**
 * OptionTracker - Backend Keep-Alive Worker
 * Cloudflare Worker that pings the Render backend to prevent cold starts
 * 
 * Copyright (c) 2026 Sourav Shrivastava. All rights reserved.
 * 
 * Deployment Instructions:
 * 1. Go to https://dash.cloudflare.com
 * 2. Create a free account if you don't have one
 * 3. Go to "Workers & Pages" in the sidebar
 * 4. Click "Create Application" > "Create Worker"
 * 5. Name it: optiontracker-keepalive
 * 6. Click "Deploy"
 * 7. Go to "Edit code" and paste this entire file
 * 8. Click "Save and Deploy"
 * 9. Go to the Worker's "Triggers" tab
 * 10. Under "Cron Triggers", add: "* /5 * * * *" (every 5 minutes)
 *     Note: Remove the space between * and /5 (shown separated due to comment syntax)
 */

const BACKEND_URL = 'https://optiontracker.onrender.com';

// Main fetch handler (for manual triggers or HTTP requests)
export default {
    async fetch(request, env, ctx) {
        const result = await keepAlive();
        return new Response(JSON.stringify(result, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    // Scheduled handler (for Cron Triggers)
    async scheduled(event, env, ctx) {
        ctx.waitUntil(keepAlive());
    }
};

async function keepAlive() {
    const startTime = Date.now();

    try {
        // Ping the health endpoint
        const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
            method: 'GET',
            headers: { 'User-Agent': 'OptionTracker-KeepAlive/1.0' }
        });

        const healthData = await healthResponse.json();
        const healthTime = Date.now() - startTime;

        // Also pre-warm the price endpoint with a common ticker
        const priceStart = Date.now();
        const priceResponse = await fetch(`${BACKEND_URL}/api/price/MSFT`, {
            method: 'GET',
            headers: { 'User-Agent': 'OptionTracker-KeepAlive/1.0' }
        });
        const priceTime = Date.now() - priceStart;

        return {
            success: true,
            timestamp: new Date().toISOString(),
            backend: BACKEND_URL,
            health: {
                status: healthResponse.status,
                data: healthData,
                responseTime: `${healthTime}ms`
            },
            priceWarmup: {
                status: priceResponse.status,
                responseTime: `${priceTime}ms`
            },
            totalTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        return {
            success: false,
            timestamp: new Date().toISOString(),
            backend: BACKEND_URL,
            error: error.message,
            totalTime: `${Date.now() - startTime}ms`
        };
    }
}
