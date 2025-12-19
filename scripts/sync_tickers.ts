import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import dbConnect from '../src/lib/mongodb';
import Stock from '../src/models/Stock';
import { polygonClient } from '../src/lib/polygon';

async function syncTickers() {
    console.log('Connecting to MongoDB...');
    await dbConnect();
    console.log('Connected.');

    console.log('Fetching tickers from Polygon.io...');
    const tickers = (polygonClient as any).tickers({
        market: 'stocks',
        active: 'true',
        limit: 1000,
        type: 'CS', // Common Stock
    });

    let count = 0;

    // Polygon client returns an async iterable for pagination
    for await (const ticker of tickers) {
        if (count % 100 === 0) {
            console.log(`Processed ${count} tickers...`);
        }

        try {
            await Stock.updateOne(
                { ticker: ticker.ticker },
                {
                    $set: {
                        ticker: ticker.ticker,
                        name: ticker.name,
                        market: ticker.market,
                        locale: ticker.locale,
                        primary_exchange: ticker.primary_exchange,
                        type: ticker.type,
                        active: ticker.active,
                        currency_name: ticker.currency_name,
                        cik: ticker.cik,
                        composite_figi: ticker.composite_figi,
                        share_class_figi: ticker.share_class_figi,
                        last_updated_utc: ticker.last_updated_utc,
                    },
                },
                { upsert: true }
            );
            count++;
        } catch (error) {
            console.error(`Error saving ticker ${ticker.ticker}:`, error);
        }
    }

    console.log(`Sync complete. Total tickers processed: ${count}`);
    process.exit(0);
}

syncTickers().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
