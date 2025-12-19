import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import dbConnect from '../src/lib/mongodb';
import Stock from '../src/models/Stock';
import DailyBar from '../src/models/DailyBar';
import { polygonClient } from '../src/lib/polygon';

// Helper to pause execution to avoid rate limits
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function syncDailyBars() {
    console.log('Connecting to MongoDB...');
    await dbConnect();
    console.log('Connected.');

    // Get all active stocks
    const stocks = await Stock.find({ active: true }).select('ticker').lean();
    console.log(`Found ${stocks.length} active stocks.`);

    // Define date range (e.g., yesterday)
    // In a real system, you might want to track the last sync date per stock.
    // For MVP, lets just fetch the last 100 days data for demonstration or specific date.
    // Here we will fetch data for Yesterday.

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Or fetch a range if needed. Let's start with just syncing YESTERDAY's data for all active stocks.
    // This is suitable for a daily cron job.

    console.log(`Syncing bars for date: ${dateStr}`);

    let processed = 0;
    let success = 0;
    const BATCH_SIZE = 5; // Parallel requests if free tier allows, otherwise 1. 
    // Polygon Free tier: 5 API calls / minute. 
    // Wait, Free tier is very limited. 
    // Assuming user might have paid plan or we need to be very slow.
    // Let's assume standard tier or better for "System Design". 
    // If Free tier, we need aggressive rate limiting: 1 req / 12s.

    // Safe default: Sequential processing with delay.

    for (const stock of stocks) {
        const ticker = stock.ticker;
        processed++;

        try {
            console.log(`[${processed}/${stocks.length}] Fetching ${ticker}...`);

            const response = await (polygonClient as any).aggregates?.previousClose(ticker);

            if (response && response.results && response.results.length > 0) {
                const result = response.results[0]; // Previous close usually returns one day

                // Ensure result.t is defined before passing to Date constructor
                if (result.t) {
                    await DailyBar.updateOne(
                        { ticker: ticker, date: new Date(result.t) }, // Use timestamp from result
                        {
                            $set: {
                                open: result.o,
                                high: result.h,
                                low: result.l,
                                close: result.c,
                                volume: result.v,
                                vwap: result.vw,
                                transactions: result.n,
                            },
                        },
                        { upsert: true }
                    );
                    success++;
                }
            }

            // Rate limiting helper
            // If free tier, uncomment: await sleep(12000); 
            // For now, small delay to be safe
            await sleep(200);

        } catch (error) {
            console.error(`Failed to sync ${ticker}:`, error);
        }
    }

    console.log(`Sync complete. Processed: ${processed}, Success: ${success}`);
    process.exit(0);
}

syncDailyBars().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
